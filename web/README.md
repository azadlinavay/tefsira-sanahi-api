# Tefsira Sanahi · Web · تەفسیرا ساناهی

The website at **[tefsirasanahi.com](https://tefsirasanahi.com)**: the Holy Quran (Madinah Mushaf and nine other printed editions) with **Tefsira Sanahi**, the Kurdish (Badini) tafsir by Tehsin Ibrahim Duski. It shows the text and plays the audio together.

It's built with React, TypeScript and Vite. Tafsir text, audio, search and donation details come from the [Tefsira Sanahi API](https://github.com/azadlinavay/tefsira-sanahi-api) at `/api/v1` on the same domain. The Mushaf layouts and fonts are served as static files.

## Features

**Front page** (`/`): what Tefsira Sanahi is, with "read the Quran" and "continue" buttons, the Google Play and App Store links, screenshots, features and links to all 114 surahs. The Quran index (surah list, tiles, continue reading) is at `/quran`.

**Reading**
- **Mushaf, page by page.** 10 editions: Madinah 1421 and 1405, Qatar, Digital Khatt, Nastaleeq, and IndoPak 15, 16, 13 (two prints) and 9 lines. Each edition is drawn line for line in its own script and font.
- **Reading desk** on wide screens (desktop, tablet in landscape): a two-page spread, the selected ayah's tafsir beside it, and a side rail. Phones get one page with swipe navigation.
- **Scripts:** Uthmani as printed, **Tajweed** with 17 coloured rules, or plain imla'i spelling.
- **Text-only zoom:** pinch, Ctrl + scroll or −/+ enlarges only the Quran words, which reflow on the page.
- **Page colours:** white, cream, light green, light blue, grey, night or black. The site is light by default; dark is one tap away.
- **One reading view everywhere:** every surah and ayah link (`/surah/2/255`) opens the Mushaf at that ayah with its tafsir beside it.
- **Word by word,** as on quran.com: hover a word for its meaning and transliteration, and see every word of the selected ayah with its meaning. Tap a word to hear it. Meanings in English, Persian, Turkish, Urdu or Indonesian (no Kurdish word-by-word data exists yet). Data: Quran.com.

**Listening**
- **Audio:** recitation from 29 reciters, Tehsin Duski's tafsir audio, or both one after the other.
- **Auto-advance** across surahs, **repeat each ayah** 1–10 times for memorisation, and speed from 0.75× to 1.5×.
- Lock-screen and media-key controls.

**Web-only features**
- **Links you can share** for every surah, ayah and page, for example `/surah/2/255` or `/page/42?ayah=2:255`. The browser's back and forward buttons work.
- **Keyboard shortcuts:** arrows turn pages, J/K move between ayahs, Space plays, F is full-screen, / opens search, T opens the options, and ? lists them all.
- **Advanced search** in the Quran (plain Arabic is fine) and the tafsir: every word in any order, the exact phrase, or any word; `"quoted words"` together and `-word` to leave a word out; limit to one surah or juz. Results are ranked and highlighted. Typing `2:255` jumps straight to the ayah.
- **Copy and share:** one ayah, or select a range (long-press or right-click) and copy the Quran, the tafsir or both, with a reference and a link.
- **Bookmarks** and "continue reading", kept in your browser.
- **Installable** as an app (web app manifest).
- **Search-engine friendly:** the server puts each page's own title, description, canonical link, link-preview tags, breadcrumbs and Quran/tafsir text into the HTML. The sitemap lists every surah, every ayah (6,236) and every Mushaf page.
- **Support** links on every screen (top bar, side rail, tafsir panel, search).

## Develop

```bash
npm install
python tool/build_data.py ../../tefsira_sanahi  # Mushaf layouts, words, Tajweed, fonts and sitemap from the app repo
python tool/build_wbw.py                      # word-by-word meanings (from the quran.com API)
npm run dev                                   # http://localhost:5173
```

In development, `/api` and `/storage` are proxied to the live server. Set `TEFSIRA_API=http://localhost:8000` to use a local API instead.

```bash
npm run typecheck
npm run build        # → dist/
```

## Deploy

```bash
powershell -File tool/deploy.ps1
```

The script builds the app, uploads `dist/` to the server (`~/tefsirasanahi-web`), and runs the API's `php artisan tefsira:link-web`. That command links the files into the Laravel site, so `/` serves the web app while `/api/v1`, `/docs` and `/storage` stay with the API. Paths such as `/surah/2/255` are answered by the API's fallback route, which returns `index.html`. Nothing needs changing in Nginx.

## Project layout

```
src/lib/          settings (localStorage), API client, Quran data and editions, audio engine, Arabic helpers
src/components/   Mushaf page renderer, tafsir panel, player bar, pickers, icons
src/pages/        Landing (/), Home (/quran), Mushaf (desk / phone; also serves /surah/…), Search, Bookmarks, Settings, About, Support
tool/             build_data.py (static data), build_wbw.py (word by word), deploy.ps1
```

## Credits

Tefsira Sanahi text and audio: Tehsin Ibrahim Duski. Mushaf layouts and fonts: King Fahd Complex (KFGQPC), via [QUL by Tarteel](https://qul.tarteel.ai). Recitations: [EveryAyah.com](https://everyayah.com). Word-by-word meanings and word audio: [Quran.com](https://quran.com). Built by [Azad Linavay](https://azadlinavay.dev). Special thanks to [Salar Pro](https://salarpro.com/).
