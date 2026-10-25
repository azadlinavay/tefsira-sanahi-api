"""Downloads word-by-word data (meaning and transliteration of every Quran
word) from the quran.com API into public/data/wbw/<surah>.json.

Usage: python tool/build_wbw.py

One file per surah: {"ar": [[...]], "tl": [[...]], "en": [[...]], ...}, one
list per ayah with one entry per word (the ayah-number marker left out).
"ar" is the Uthmani word, "tl" the transliteration and the others are word
meanings by language.
Word audio is not copied: the app plays it from audio.qurancdn.com.
There is no Kurdish word-by-word translation yet; add it as "ku" when one
exists and the app will offer it.
"""
import json
import pathlib
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor

LANGS = ["en", "fa", "tr", "ur", "id"]
API = "https://api.quran.com/api/v4/verses/by_chapter/{s}?words=true&per_page=50&page={p}&language={l}&word_fields=text_uthmani"
out = pathlib.Path(__file__).resolve().parent.parent / "public" / "data" / "wbw"
out.mkdir(parents=True, exist_ok=True)


def fetch(url: str) -> dict:
    for attempt in range(5):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "tefsirasanahi.com build"})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.load(r)
        except Exception:
            time.sleep(2 + attempt * 3)
    raise RuntimeError(url)


def verses(surah: int, lang: str) -> list[dict]:
    page, rows = 1, []
    while page:
        d = fetch(API.format(s=surah, p=page, l=lang))
        rows += d["verses"]
        page = d["pagination"]["next_page"]
    return rows


def build(surah: int) -> int:
    data: dict[str, list[list[str]]] = {}
    for lang in LANGS:
        rows = verses(surah, lang)
        words = [[w for w in v["words"] if w["char_type_name"] == "word"] for v in rows]
        if "tl" not in data:
            data["ar"] = [[w["text_uthmani"] for w in ws] for ws in words]
            data["tl"] = [[(w["transliteration"] or {}).get("text") or "" for w in ws] for ws in words]
        data[lang] = [[(w["translation"] or {}).get("text") or "" for w in ws] for ws in words]
    (out / f"{surah}.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return sum(len(a) for a in data["ar"])


with ThreadPoolExecutor(6) as pool:
    total = sum(pool.map(build, range(1, 115)))
print("words:", total, "· languages:", LANGS)
