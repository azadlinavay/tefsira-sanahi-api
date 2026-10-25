"""Copies the Quran data and fonts the web app renders from into public/.

Usage: python tool/build_data.py <path to the tefsira_sanahi Flutter repo>

Writes public/data/ (Mushaf layouts, per-ayah words for each script, ayah
meta, Tajweed colours, surahs, reciters) and public/fonts/. Tafsir text and
audio are not copied: the app reads them from the API at /api/v1.
"""
import datetime
import json
import pathlib
import shutil
import sys

app = pathlib.Path(sys.argv[1])
web = pathlib.Path(__file__).resolve().parent.parent / "public"
data = web / "data"
(data / "mushaf").mkdir(parents=True, exist_ok=True)
(web / "fonts" / "v1").mkdir(parents=True, exist_ok=True)


def dump(path: pathlib.Path, obj) -> None:
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


rows = json.load(open(app / "Data" / "hafs_smart_v8.json", encoding="utf-8"))
rows.sort(key=lambda r: (r["sura_no"], r["aya_no"]))

# Words in Mushaf order, one list per ayah (6,236), indexed like the layouts.
dump(data / "mushaf" / "words_v2.json", [[w for w in r["aya_text"].strip().split(" ") if w] for r in rows])
dump(data / "words_imlaei.json", [r["aya_text_emlaey"].split() for r in rows])

# Per-ayah [surah, ayah, juz, page in the Madinah 1421 print].
dump(data / "ayahs.json", [[r["sura_no"], r["aya_no"], r["jozz"], r["page"]] for r in rows])

# Editions converted from QUL by the app's tool/build_mushafs.py.
shutil.copyfile(app / "Data" / "mushaf_v2_layout.json", data / "mushaf" / "madinah1421.json")
for f in (app / "Data" / "mushaf").glob("*.json"):
    shutil.copyfile(f, data / "mushaf" / f.name)

shutil.copyfile(app / "Data" / "quran_tajweed.json", data / "quran_tajweed.json")
shutil.copyfile(app / "Data" / "reciters.json", data / "reciters.json")

fonts = ["HafsSmart_08.ttf", "UthmanicHafs_V22.ttf", "AmiriQuran-Regular.ttf", "DigitalKhattV2.otf", "KFGQPCNastaleeq-Regular.ttf",
         "IndopakNastaleeq.ttf", "Amiri-Regular.ttf", "Vazirmatn-Regular.ttf"]
for name in fonts:
    shutil.copyfile(app / "fonts" / name, web / "fonts" / name)
for f in (app / "fonts" / "v1").glob("*.ttf"):
    shutil.copyfile(f, web / "fonts" / "v1" / f.name)

# Sitemap: home, every surah, every ayah (each has its own tafsir page) and
# every Mushaf page. The server fills each one with its own title and text.
site = "https://tefsirasanahi.com"
today = datetime.date.today().isoformat()
urls = [(f"{site}/", "1.0"), (f"{site}/quran", "0.9"), (f"{site}/listen", "0.8"), (f"{site}/search", "0.6"), (f"{site}/about", "0.5"), (f"{site}/support", "0.7"), (f"{site}/privacy", "0.3")]
urls += [(f"{site}/surah/{n}", "0.9") for n in range(1, 115)]
urls += [(f"{site}/surah/{r['sura_no']}/{r['aya_no']}", "0.7") for r in rows]
urls += [(f"{site}/page/{n}", "0.5") for n in range(1, 605)]
(web / "sitemap.xml").write_text(
    '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + "".join(f"  <url><loc>{u}</loc><lastmod>{today}</lastmod><priority>{p}</priority></url>\n" for u, p in urls)
    + "</urlset>\n",
    encoding="utf-8",
)

print("ayahs:", len(rows), "· sitemap urls:", len(urls))
for f in sorted(data.rglob("*.json")):
    print(f"{f.relative_to(web)}  {f.stat().st_size // 1024} KB")
