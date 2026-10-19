# Tefsira Sanahi API · تەفسیرا ساناهی

A free, public JSON API for the Holy Quran (Madinah Mushaf) together with **Tefsira Sanahi**, the Kurdish (Badini) tafsir by **Tehsin Ibrahim Duski**. You get the text and the audio side by side, and anyone can use them in their own apps and websites.

- **Quran:** 114 surahs, 6,236 ayahs, the 604-page Madinah Mushaf layout (KFGQPC V2, 1421H, 15 lines per page) and search that ignores diacritics.
- **Tafsir:** the full Kurdish text of every ayah plus an audio clip for every ayah (6,237 clips, ~926 MB).
- **Offline packages:** zip downloads per surah, per juz or for the whole tafsir (MP3 + text + manifest), with SHA-256 checksums.
- **Reciters:** 29 Arabic reciters with per-ayah recitation URLs. You add more by editing a JSON file.
- **Donation info:** the app's donation details, as data.
- **Dashboard:** an optional React app for fixing text and uploading or replacing audio.

**API version 1.0.0** (for the Tefsira Sanahi app 2.0.0) · Laravel 13 · PHP 8.4 · MIT-licensed code (see [Licensing](#licensing))


> **Live:** website [tefsirasanahi.com](https://tefsirasanahi.com) · API `https://tefsirasanahi.com/api/v1` · interactive docs [tefsirasanahi.com/docs](https://tefsirasanahi.com/docs)
---

## Contents

- [Quick start (using the API)](#quick-start-using-the-api)
- [Endpoints](#endpoints)
- [Response shapes](#response-shapes)
- [Offline audio packages](#offline-audio-packages)
- [Donate](#donate)
- [Run it yourself (Laravel Herd)](#run-it-yourself-laravel-herd)
- [Importing the audio](#importing-the-audio)
- [Deploying (Laravel Forge + Cloudflare R2)](#deploying-laravel-forge--cloudflare-r2)
- [Dashboard](#dashboard)
- [Admin API](#admin-api)
- [Adding a reciter or another tafsir](#adding-a-reciter-or-another-tafsir)
- [Development](#development)
- [Credits](#credits) · [Licensing](#licensing)

---

## Quick start (using the API)

There's no API key or sign-up. All routes live under `/api/v1`.

```bash
# Al-Ikhlas: Quran text + Kurdish tafsir text + tafsir audio + Alafasy recitation
curl "https://tefsirasanahi.com/api/v1/surahs/112?tafsir=tehsin-duski-ku&reciter=alafasy"
```

```js
// JavaScript (browser or Node). CORS is open.
const res = await fetch('https://tefsirasanahi.com/api/v1/tafsirs/tehsin-duski-ku/ayahs/2/255')
const { data } = await res.json()
console.log(data.text.uthmani, data.tafsir.text)
new Audio(data.tafsir.audio.url).play()
```

```dart
// Flutter / Dart
final res = await http.get(Uri.parse('https://tefsirasanahi.com/api/v1/tafsirs/tehsin-duski-ku/surahs/1'));
final data = jsonDecode(res.body)['data'];
// data['intros'] = a'udhu billah clip, data['ayahs'][i]['tafsir'] = { text, audio: { url, duration_ms } }
```

**Interactive documentation:** [tefsirasanahi.com/docs](https://tefsirasanahi.com/docs) has a quick start and the full reference, and you can try every endpoint from that page. The machine-readable spec is [`docs/openapi.yaml`](docs/openapi.yaml), also served at `GET /api/v1/openapi.yaml`. You can paste it into [Swagger Editor](https://editor.swagger.io), Postman or Insomnia.

**Conventions**

- Successful responses wrap their payload in `data`. Errors look like `{"message": "..."}` and carry the right HTTP status (404, 422, 429 and so on).
- Ayah keys look like `"2:255"`.
- **Al-Fatiha's basmala is its ayah 1.** Every other surah except At-Tawbah (9) opens with an unnumbered basmala; the `has_basmala` field tells you which.
- Every response carries an `X-API-Version: 1.0.0` header.
- The limit is 120 requests per minute per IP. Past it you get `429` with a `Retry-After` header.
- Read responses are cacheable (`Cache-Control: public, max-age=3600`).

## Endpoints

| Method | Path | What you get |
| --- | --- | --- |
| GET | `/api/v1` | Name, version, counts, links |
| GET | `/api/v1/surahs` | All 114 surahs |
| GET | `/api/v1/surahs/{surah}` | A surah's ayahs. Add `?tafsir=` and/or `?reciter=` |
| GET | `/api/v1/ayahs/{surah}/{ayah}` | One ayah. Takes the same options |
| GET | `/api/v1/pages/{page}` | A Mushaf page (1–604): its 15-line layout + ayahs |
| GET | `/api/v1/search?q=` | Search the Quran and/or tafsir (`in=quran\|tafsir\|all`) |
| GET | `/api/v1/reciters` | Arabic reciters and their URL templates |
| GET | `/api/v1/reciters/{id}/surahs/{surah}` | Recitation URL of every ayah in a surah |
| GET | `/api/v1/tafsirs` | Tafsir editions |
| GET | `/api/v1/tafsirs/{edition}` | One edition, with text and clip counts |
| GET | `/api/v1/tafsirs/{edition}/surahs/{surah}` | **Text + audio together** for a whole surah, plus intro clips |
| GET | `/api/v1/tafsirs/{edition}/ayahs/{surah}/{ayah}` | Text + audio for one ayah |
| GET | `/api/v1/tafsirs/{edition}/packages` | Downloadable zips (`?scope=surah\|juz\|all`) |
| GET | `/api/v1/tafsirs/{edition}/packages/{name}` | One package (`surah-001`, `juz-30`, `all`) |
| GET | `/api/v1/tafsirs/{edition}/packages/{name}/download` | The zip itself |
| GET | `/api/v1/donation` | How to support the app |
| GET | `/api/v1/openapi.yaml` | OpenAPI 3.1 reference |

The edition slug for Tefsira Sanahi is **`tehsin-duski-ku`**.

## Response shapes

An ayah with `?tafsir=tehsin-duski-ku&reciter=alafasy`:

```json
{
  "id": 1,
  "key": "1:1",
  "surah": 1,
  "number": 1,
  "page": 1,
  "juz": 1,
  "text": {
    "uthmani": "بِسۡمِ ٱللَّهِ ٱلرَّحۡمَـٰنِ ٱلرَّحِیمِ",
    "simple": "بسم الله الرحمن الرحيم",
    "hafs_smart": "…glyphs for the KFGQPC HafsSmart font…"
  },
  "tafsir": {
    "edition": "tehsin-duski-ku",
    "text": "…Kurdish tafsir…",
    "audio": { "url": "https://…/tehsin-duski-ku/audio/001/001001.mp3", "duration_ms": 39620, "size_bytes": 317560, "needs_review": false }
  },
  "recitation": { "reciter": "alafasy", "url": "https://everyayah.com/data/Alafasy_128kbps/001001.mp3" }
}
```

`GET /tafsirs/{edition}/surahs/1` also returns `intros`: the isti'adha (أعوذ بالله) clip and its explanation, which is heard before Al-Fatiha's first ayah.

**Mushaf pages.** `GET /pages/{page}` returns `lines`. Each line is a surah title, the basmala, or runs of words written as `[surah, ayah, firstWord, lastWord]`. The word indexes point into the ayah's `text.hafs_smart` split on spaces. Render that text with the KFGQPC HafsSmart font and you get the printed Madinah Mushaf line for line. Pages 1 and 2 have 8 lines; every other page has 15.

## Offline audio packages

Apps can download a tafsir once and play it offline. Each zip contains:

```
audio/001/001000.mp3   intro (a'udhu billah) — only in packages that include Al-Fatiha
audio/001/001001.mp3   one clip per ayah: SSS = surah, AAA = ayah
tafsir.json            { "1:1": { "quran": "…", "tafsir": "…" }, … }
manifest.json          edition, scope, clip list with durations
```

Check `sha256` from `/packages/{name}` after downloading. MP3s are stored without recompression.

| Package | Typical size |
| --- | --- |
| `surah-001` | 2.2 MB |
| `juz-30` | 29 MB |
| `all` | ~930 MB |

## Donate

Tefsira Sanahi is free. If you'd like to support it, contact us on **+964 750 760 1194**. We accept:

- **FIB** (First Iraqi Bank)
- **QI Card**
- **FastPay**
- **ZainCash**

Apps can show these details from `GET /api/v1/donation`, which includes a message in Kurdish, English and Arabic. Edit them in [`config/tefsira.php`](config/tefsira.php).

---

## Run it yourself (Laravel Herd)

Requirements: [Laravel Herd](https://herd.laravel.com) (PHP 8.4+, Composer) on Windows or macOS. SQLite is enough locally.

```bash
git clone https://github.com/azadlinavay/tefsira-sanahi-api.git
cd tefsira-sanahi-api
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed      # creates database/database.sqlite and loads the Quran, the tafsir text and the reciters
php artisan storage:link
php artisan test                # optional
```

Then do one of the following:

- **Herd:** add the parent folder in *Herd → Sites → Add* (or run `herd link` inside the folder). The API is then at `http://tefsira-sanahi-api.test/api/v1`.
- **No Herd:** run `php artisan serve` and use `http://localhost:8000/api/v1` (set `APP_URL` to match).

Seeding loads everything except the audio. The text, layout and reciter data are in [`database/data/`](database/data).

## Importing the audio

The tafsir audio (6,237 MP3s, ~926 MB) is **not** in this repository. Put it in a folder laid out like this:

```
tefsira-audio/
  manifest.json            # included here as database/data/tehsin_duski_manifest.json
  audio/001/001000.mp3     # a'udhu billah + explanation
  audio/001/001001.mp3
  …
  audio/114/114006.mp3
```

**Keep the files on this server** (`TEFSIRA_AUDIO_DISK=public`):

```bash
php artisan tafsir:import-audio tehsin-duski-ku "D:\path\to\tefsira-audio" --copy
```

**Use Cloudflare R2 or S3** (`TEFSIRA_AUDIO_DISK=s3`). Either let the command upload the files:

```bash
php artisan tafsir:import-audio tehsin-duski-ku /path/to/tefsira-audio --copy
```

or upload them yourself first (usually faster), then record them in the database without copying:

```bash
rclone copy /path/to/tefsira-audio/audio r2:tefsira-sanahi/tehsin-duski-ku/audio --transfers 32
php artisan tafsir:import-audio tehsin-duski-ku /path/to/tefsira-audio
```

Either way the files end up at `{edition}/audio/SSS/SSSAAA.mp3`. Running the import again is safe: it updates the existing records. Add `--force` to overwrite files that are already on the disk.

**Build the download packages:**

```bash
php artisan tafsir:build-packages tehsin-duski-ku --by=surah,juz,all
php artisan tafsir:build-packages tehsin-duski-ku --by=surah --only=36   # just Ya-Sin
```

## Deploying (Laravel Forge + Cloudflare R2)

1. **Server:** create a server in Forge with PHP 8.4, MySQL and Nginx.
2. **Site:** create the site and connect this GitHub repository (branch `main`). Set the web directory to `/public`.
3. **Environment:** edit the site's environment in Forge:

   ```dotenv
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://api.your-domain.com

   DB_CONNECTION=mysql
   DB_DATABASE=forge
   DB_USERNAME=forge
   DB_PASSWORD=…              # Forge shows this

   TEFSIRA_ADMIN_TOKEN=…      # php -r "echo bin2hex(random_bytes(32));"
   TEFSIRA_AUDIO_DISK=s3
   TEFSIRA_PACKAGES_DISK=s3

   AWS_ACCESS_KEY_ID=…        # R2 API token (Object Read & Write)
   AWS_SECRET_ACCESS_KEY=…
   AWS_DEFAULT_REGION=auto
   AWS_BUCKET=tefsira-sanahi
   AWS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
   AWS_URL=https://audio.your-domain.com   # the bucket's public domain
   AWS_USE_PATH_STYLE_ENDPOINT=true
   ```

4. **Deploy script:** Forge's default script works. Make sure it includes:

   ```bash
   composer install --no-dev --no-interaction --prefer-dist --optimize-autoloader
   php artisan migrate --force
   php artisan config:cache && php artisan route:cache
   php artisan storage:link || true
   ```

5. **One-time setup:** in Forge → Commands, run `php artisan db:seed --force`, then the [audio import](#importing-the-audio) and the package build.
6. **SSL:** turn on Let's Encrypt.

**R2 setup.** Create a bucket and connect a custom domain such as `audio.your-domain.com` (or turn on the r2.dev URL). Then add this CORS policy under *Bucket → Settings → CORS* so web apps can play the audio:

```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedHeaders": ["Range"],
    "ExposeHeaders": ["Content-Length", "Content-Range", "Accept-Ranges"],
    "MaxAgeSeconds": 86400
  }
]
```

R2 has no egress fees, which matters for ~1 GB of audio.

**Keeping the audio on the Forge server instead** (`TEFSIRA_AUDIO_DISK=public`): add this to the site's Nginx config so browsers on other sites can play it:

```nginx
location /storage/ {
    add_header Access-Control-Allow-Origin "*" always;
    add_header Cache-Control "public, max-age=2592000, immutable";
}
```

## Dashboard

[`dashboard/`](dashboard) is a small React (Vite) app for editors. You can:

- browse surahs and read the Quran text, the tafsir and the audio for each ayah;
- correct tafsir text;
- upload, replace or delete MP3 clips;
- rebuild a surah's download package.

It is a separate static app, so Laravel stays API-only.

```bash
cd dashboard
npm install
npm run dev            # http://localhost:5173
npm run build          # static files in dashboard/dist — host anywhere (Forge static site, Cloudflare Pages…)
```

In the top bar, enter the API address and your `TEFSIRA_ADMIN_TOKEN`. Without a token the dashboard is read-only. The token is stored only in that browser.

## Admin API

All admin routes require `Authorization: Bearer <TEFSIRA_ADMIN_TOKEN>`. If the token isn't set on the server, the admin endpoints are off and return 404.

| Method | Path | Body |
| --- | --- | --- |
| PUT | `/api/v1/admin/tafsirs/{edition}/ayahs/{s}/{a}/text` | JSON `{ "text": "…" }` |
| POST | `/api/v1/admin/tafsirs/{edition}/ayahs/{s}/{a}/audio` | multipart: `audio` (MP3 ≤ 50 MB), optional `duration_ms` |
| DELETE | `/api/v1/admin/tafsirs/{edition}/ayahs/{s}/{a}/audio` | — |
| POST | `/api/v1/admin/tafsirs/{edition}/packages` | JSON `{ "scope": "surah"\|"juz", "number": 36 }` |

Use ayah `0` for an intro clip, such as the a'udhu billah before Al-Fatiha.

```bash
curl -X POST https://tefsirasanahi.com/api/v1/admin/tafsirs/tehsin-duski-ku/ayahs/2/255/audio \
  -H "Authorization: Bearer $TOKEN" -F audio=@002255.mp3
```

Public responses are cached for up to an hour (`TEFSIRA_CACHE_SECONDS`), so a correction can take that long to show up in apps that cache.

## Adding a reciter or another tafsir

- **Reciter:** add an entry to [`database/data/reciters.json`](database/data/reciters.json) and run `php artisan db:seed --class=ReciterSeeder --force`. URL placeholders: `{sss}` = surah and `{aaa}` = ayah, both 3 digits; `{id}` = ayah number 1–6236.
- **Tafsir:** create a `tafsir_editions` row (copy `TafsirSeeder`), load its text, then use `tafsir:import-audio` with the new slug. Every endpoint accepts any active edition.

## Development

```bash
php artisan test           # feature tests (in-memory SQLite)
vendor/bin/pint            # code style
```

Project layout:

```
app/Http/Controllers/Api/   endpoints
app/Support/Presenter.php   JSON shapes
app/Support/ArabicText.php  search normalisation (Arabic + Kurdish letters, diacritics)
app/Console/Commands/       tafsir:import-audio, tafsir:build-packages
config/tefsira.php          version, admin token, disks, rate limit, donation details
database/data/              source data (Quran, tafsir text, layout, reciters, audio manifest)
docs/openapi.yaml           API reference
dashboard/                  React admin dashboard
```

## Credits

- **Tefsira Sanahi** (text and audio): Tehsin Ibrahim Duski. The Arabic recitation inside the tafsir audio is by Saad Al-Ghamdi.
- **Madinah Mushaf** layout and HafsSmart text: King Fahd Glorious Quran Printing Complex (KFGQPC), via [QUL by Tarteel](https://qul.tarteel.ai).
- **Recitations:** [EveryAyah.com](https://everyayah.com).
- Built for the Tefsira Sanahi app (Android, iOS, web).

## Licensing

- **Code** (everything outside `database/data/`): [MIT](LICENSE).
- **Content** (the Quran text and layout, the tafsir text and audio, recitations): these belong to their authors and owners. They are shared so that people can read and listen to the Quran and its tafsir. Please credit **"Tefsira Sanahi, Tehsin Ibrahim Duski"**, keep the text unchanged, and don't sell it. Ask the rights holders before any other use.
