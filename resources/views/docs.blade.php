<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Tefsira Sanahi API · Documentation</title>
<meta name="description" content="Free public API for the Quran (Madinah Mushaf) with Tefsira Sanahi, the Kurdish tafsir by Tehsin Ibrahim Duski: text and audio together.">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui.css">
<style>
  :root { --green: #0b6b4e; --deep: #064431; --ink: #10201a; --muted: #56665f; --line: #dde5e1; --soft: #eef6f2; }
  * { box-sizing: border-box; }
  body { margin: 0; font: 16px/1.6 system-ui, -apple-system, "Segoe UI", sans-serif; color: var(--ink); background: #fff; }
  a { color: var(--green); }
  header { background: radial-gradient(120% 120% at 50% 0%, #14875f 0%, var(--green) 45%, var(--deep) 100%); color: #fff; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 0 20px; }
  nav { display: flex; gap: 18px; align-items: center; flex-wrap: wrap; padding: 16px 0; }
  nav .brand { font-weight: 700; font-size: 18px; margin-inline-end: auto; color: #fff; text-decoration: none; }
  nav a { color: #fff; opacity: .9; text-decoration: none; }
  nav a:hover { opacity: 1; text-decoration: underline; }
  .hero { padding: 36px 0 44px; }
  .hero h1 { margin: 0 0 8px; font-size: clamp(28px, 4vw, 40px); line-height: 1.2; }
  .hero p { margin: 0; max-width: 720px; opacity: .92; font-size: 18px; }
  .hero .kurdish { direction: rtl; font-family: "Noto Naskh Arabic", "Segoe UI", serif; margin-top: 10px; }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 18px; }
  .chip { background: rgba(255,255,255,.14); border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 4px 12px; font-size: 14px; }
  main section { padding: 32px 0 8px; }
  h2 { margin: 0 0 12px; font-size: 24px; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 14px; }
  .card { border: 1px solid var(--line); border-radius: 14px; padding: 16px 18px; background: #fff; }
  .card h3 { margin: 0 0 6px; font-size: 16px; }
  .card p { margin: 0; color: var(--muted); font-size: 15px; }
  pre { margin: 0; background: #0f1a16; color: #e6f1ec; border-radius: 12px; padding: 14px 16px; overflow-x: auto; font-size: 13.5px; line-height: 1.55; }
  code { font-family: ui-monospace, "Cascadia Code", Consolas, monospace; }
  .tabs { display: flex; gap: 6px; margin-bottom: 8px; flex-wrap: wrap; }
  .tabs button { border: 1px solid var(--line); background: #fff; border-radius: 10px; padding: 6px 12px; cursor: pointer; font: inherit; font-size: 14px; }
  .tabs button[aria-selected="true"] { background: var(--green); border-color: var(--green); color: #fff; }
  .note { background: var(--soft); border-radius: 12px; padding: 12px 16px; font-size: 15px; }
  #reference { border-top: 1px solid var(--line); margin-top: 32px; }
  footer { border-top: 1px solid var(--line); padding: 24px 0 40px; color: var(--muted); font-size: 14px; }
  .swagger-ui .topbar { display: none; }
  .swagger-ui .info { margin: 24px 0; }
</style>
</head>
<body>
<header>
  <div class="wrap">
    <nav aria-label="Main">
      <a class="brand" href="{{ $website }}">Tefsira Sanahi</a>
      <a href="{{ $website }}">Website</a>
      <a href="#quick-start">Quick start</a>
      <a href="#reference">API reference</a>
      <a href="{{ url('/api/v1/openapi.yaml') }}">OpenAPI file</a>
      <a href="{{ $github }}">GitHub</a>
    </nav>
    <div class="hero">
      <h1>Tefsira Sanahi API</h1>
      <p>A free, public JSON API for the Holy Quran (Madinah Mushaf) together with Tefsira Sanahi, the Kurdish (Badini) tafsir by Tehsin Ibrahim Duski — text and audio side by side. No key, no sign-up.</p>
      <p class="kurdish">ئەپیئایەکا بێ بەرامبەر بۆ قورئانا پیروز و تەفسیرا ساناهی ب کوردی — نڤیسین و دەنگ پێکڤە.</p>
      <div class="chips">
        <span class="chip">v{{ $version }}</span>
        <span class="chip">Base URL: {{ url('/api/v1') }}</span>
        <span class="chip">6,236 ayahs</span>
        <span class="chip">604-page Mushaf layout</span>
        <span class="chip">Kurdish text + audio</span>
        <span class="chip">CORS open</span>
      </div>
    </div>
  </div>
</header>

<main class="wrap">
  <section id="quick-start">
    <h2>Quick start</h2>
    <div class="tabs" role="tablist">
      <button role="tab" aria-selected="true" data-tab="curl">curl</button>
      <button role="tab" aria-selected="false" data-tab="js">JavaScript</button>
      <button role="tab" aria-selected="false" data-tab="dart">Flutter / Dart</button>
    </div>
<pre data-panel="curl"><code># Al-Ikhlas with Kurdish tafsir text + audio and Alafasy's recitation
curl "{{ url('/api/v1/surahs/112') }}?tafsir=tehsin-duski-ku&amp;reciter=alafasy"

# One ayah, its tafsir text and tafsir audio
curl "{{ url('/api/v1/tafsirs/tehsin-duski-ku/ayahs/2/255') }}"

# Search (diacritics are ignored)
curl "{{ url('/api/v1/search') }}?q=الرحمن"</code></pre>
<pre data-panel="js" hidden><code>const res = await fetch('{{ url('/api/v1/tafsirs/tehsin-duski-ku/ayahs/2/255') }}')
const { data } = await res.json()
console.log(data.text.uthmani, data.tafsir.text)
new Audio(data.tafsir.audio.url).play()</code></pre>
<pre data-panel="dart" hidden><code>final res = await http.get(Uri.parse('{{ url('/api/v1/tafsirs/tehsin-duski-ku/surahs/1') }}'));
final data = jsonDecode(res.body)['data'];
// data['intros']: the a'udhu billah clip; data['ayahs'][i]['tafsir']: { text, audio }</code></pre>
  </section>

  <section>
    <h2>What you get</h2>
    <div class="grid">
      <div class="card"><h3>Quran</h3><p>Surahs, ayahs (Uthmani, plain and KFGQPC glyph text) and the 15-line Madinah Mushaf layout, page by page.</p></div>
      <div class="card"><h3>Tafsir text + audio</h3><p>Tefsira Sanahi for every ayah, with an audio clip per ayah. Edition: <code>tehsin-duski-ku</code>.</p></div>
      <div class="card"><h3>Offline packages</h3><p>Zip downloads per surah (MP3 + text + manifest) with SHA-256 checksums.</p></div>
      <div class="card"><h3>Search</h3><p>Quran and tafsir, ignoring diacritics and Arabic/Kurdish letter variants.</p></div>
      <div class="card"><h3>Reciters</h3><p>29 Arabic reciters with per-ayah recitation URLs.</p></div>
      <div class="card"><h3>Donation info</h3><p>How to support the app: FIB, QI Card, FastPay and ZainCash.</p></div>
    </div>
  </section>

  <section>
    <h2>Good to know</h2>
    <div class="note">
      Every response is JSON wrapped in <code>data</code>; errors have a <code>message</code>. Ayah keys look like <code>"2:255"</code>.
      Al-Fatiha's basmala is its ayah 1; every other surah except At-Tawbah opens with an unnumbered basmala (<code>has_basmala</code>).
      Limit: {{ $rateLimit }} requests per minute per IP. Download the full specification as <a href="{{ url('/api/v1/openapi.yaml') }}">OpenAPI 3.1 (YAML)</a> to generate a client or import it into Postman or Insomnia.
    </div>
  </section>

  <section id="reference">
    <div id="swagger"></div>
  </section>
</main>

<footer>
  <div class="wrap">
    Tefsira Sanahi API v{{ $version }} · <a href="{{ $website }}">{{ preg_replace('#^https?://#', '', $website) }}</a> ·
    <a href="{{ $github }}">Source on GitHub</a> (MIT) · Tafsir text and audio © their author and rights holders — please credit “Tefsira Sanahi, Tehsin Ibrahim Duski”.
  </div>
</footer>

<script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5.17.14/swagger-ui-bundle.js"></script>
<script>
  // Quick-start tabs.
  document.querySelectorAll('[data-tab]').forEach((tab) => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('[data-tab]').forEach((t) => t.setAttribute('aria-selected', t === tab));
      document.querySelectorAll('[data-panel]').forEach((p) => { p.hidden = p.dataset.panel !== tab.dataset.tab; });
    });
  });
  // Interactive reference: every endpoint can be tried from this page.
  SwaggerUIBundle({
    url: @json(url('/api/v1/openapi.yaml')),
    dom_id: '#swagger',
    deepLinking: true,
    tryItOutEnabled: true,
    docExpansion: 'list',
    defaultModelsExpandDepth: 0,
  });
</script>
</body>
</html>
