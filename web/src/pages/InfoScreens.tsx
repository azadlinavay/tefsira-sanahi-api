import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Icon } from '../components/Icon'
import { PaperPicker, ScriptPicker, TajweedLegend } from '../components/Pickers'
import { copyText, usePageMeta } from '../components/ui'
import { useDonation, useSurahs } from '../lib/api'
import { ar } from '../lib/arabic'
import { EDITIONS, loadReciters } from '../lib/quran'
import { WBW_LANGS } from '../lib/wbw'
import { StoreLinks } from '../components/StoreLinks'
import { setSettings, toggleBookmark, useSettings, type PlayMode, type Theme } from '../lib/settings'

function Page({ title, children }: { title: string; children: React.ReactNode }) {
  const navigate = useNavigate()
  usePageMeta(title)
  return (
    <div>
      <header className="topbar">
        <button className="icon-btn" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/quran'))} aria-label="زڤرین">
          <Icon name="back" />
        </button>
        <div className="title">
          <strong>{title}</strong>
        </div>
        {location.pathname !== '/support' && (
          <Link to="/support" className="icon-btn support-btn" aria-label="پشتەڤانی" title="پشتەڤانیا مە بکە">
            <Icon name="heart" />
          </Link>
        )}
      </header>
      <div className="container narrow">{children}</div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="settings-section">
      <h2 className="section-title">{title}</h2>
      <div className="card on-card">{children}</div>
    </section>
  )
}

// ── Bookmarks ────────────────────────────────────────────────────────
export function BookmarksScreen() {
  const bookmarks = useSettings((s) => s.bookmarks)
  const { data: surahs } = useSurahs()
  return (
    <Page title="نیشانکری">
      {bookmarks.length === 0 ? (
        <p className="hint">هێشتا چ نیشانکرن نینن. ل سەر ئایەتەکێ دوکمەیا نیشانکرنێ بکە.</p>
      ) : (
        <div className="card on-card list">
          {bookmarks.map((key) => {
            const [s, a] = key.split(':')
            return (
              <div className="row" key={key}>
                <Link to={`/surah/${s}/${a}`} className="row-main">
                  <Icon name="bookmark" />
                  <span>
                    <strong>{surahs?.[Number(s) - 1]?.name_ar}</strong>
                    <small className="muted"> · ئایەت {ar(a)}</small>
                  </span>
                </Link>
                <button className="icon-btn on-card" aria-label="ژێبرن" onClick={() => toggleBookmark(key)}>
                  <Icon name="close" />
                </button>
              </div>
            )
          })}
        </div>
      )}
    </Page>
  )
}

// ── Settings ─────────────────────────────────────────────────────────
export function SettingsScreen() {
  const s = useSettings()
  const reciters = useQuery({ queryKey: ['reciters'], queryFn: loadReciters, staleTime: Infinity })
  const seg = <T extends string | number>(value: T, options: [T, string][], set: (v: T) => void) => (
    <div className="segmented">
      {options.map(([v, label]) => (
        <button key={String(v)} aria-pressed={value === v} onClick={() => set(v)}>
          {label}
        </button>
      ))}
    </div>
  )
  return (
    <Page title="ڕێکخستن">
      <Section title="خواندن">
        <label className="field-row">
          <span>مسحەف</span>
          <select value={s.edition} onChange={(e) => setSettings({ edition: e.target.value })}>
            {EDITIONS.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row col">
          <span>ڕێنڤیسا قورئانێ</span>
          <ScriptPicker />
          {s.script === 'tajweed' && <TajweedLegend />}
        </div>
        <div className="field-row col">
          <span>ڕەنگێ لاپەرێ</span>
          <PaperPicker />
        </div>
        <label className="field-row col">
          <span>مەزنکرنا نڤیسینا مسحەفێ · {ar(Math.round(s.mushafScale * 100))}٪</span>
          <input type="range" min={1} max={2.5} step={0.25} value={s.mushafScale} onChange={(e) => setSettings({ mushafScale: Number(e.target.value) })} />
        </label>
        <label className="field-row col">
          <span>قەبارێ تەفسیرێ · {ar(s.tafsirSize)}</span>
          <input type="range" min={13} max={30} step={1} value={s.tafsirSize} onChange={(e) => setSettings({ tafsirSize: Number(e.target.value) })} />
          <p style={{ fontSize: s.tafsirSize, margin: 0 }}>مەدح بۆ خودێ بن ب سالۆخەتێن وی کو هەمی سالۆخەتێن کەمالێنە</p>
        </label>
      </Section>

      <Section title="پەیڤ ب پەیڤ">
        <label className="field-row">
          <span>
            واتا و گوهداریکرنا هەر پەیڤەکێ
            <small className="muted"> — ل بن ئایەتێ و دەمێ ماوس ل سەر پەیڤێ</small>
          </span>
          <input type="checkbox" checked={s.wbw} onChange={(e) => setSettings({ wbw: e.target.checked })} />
        </label>
        <label className="field-row">
          <span>زمانێ واتایێ</span>
          <select value={s.wbwLang} onChange={(e) => setSettings({ wbwLang: e.target.value })}>
            {WBW_LANGS.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <p className="field-row muted" style={{ fontSize: 13, margin: 0 }}>
          هێشتا واتایا پەیڤ ب پەیڤ ب کوردی نینە؛ دەمێ هەبیت دێ ل ڤێرێ زێدە بیت. داتا: Quran.com
        </p>
      </Section>

      <Section title="دەنگ">
        <label className="field-row">
          <span>قاری</span>
          <select value={s.reciter} onChange={(e) => setSettings({ reciter: e.target.value })}>
            {reciters.data?.reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
        <div className="field-row col">
          <span>چ بهێتە خواندن</span>
          {seg<PlayMode>(s.playMode, [['recitation', 'قورئان'], ['tafsir', 'تەفسیر'], ['both', 'هەردوو']], (v) => setSettings({ playMode: v }))}
        </div>
        <label className="field-row">
          <span>
            خواندنا خۆکار
            <small className="muted"> — پشتی ئایەتێ، ئایەتا پاشتر</small>
          </span>
          <input type="checkbox" checked={s.autoplay} onChange={(e) => setSettings({ autoplay: e.target.checked })} />
        </label>
        <div className="field-row col">
          <span>دووبارەکرنا هەر ئایەتەکێ (بۆ ژبەرکرنێ)</span>
          {seg<number>(s.repeat, [[1, '١'], [2, '٢'], [3, '٣'], [5, '٥'], [10, '١٠']], (v) => setSettings({ repeat: v }))}
        </div>
        <div className="field-row col">
          <span>لەز</span>
          {seg<number>(s.rate, [[0.75, '0.75×'], [1, '1×'], [1.25, '1.25×'], [1.5, '1.5×']], (v) => setSettings({ rate: v }))}
        </div>
      </Section>

      <Section title="ڕووکار">
        <div className="field-row col">
          <span>ڕەنگ</span>
          {seg<Theme>(s.theme, [['light', 'ڕۆناهی'], ['dark', 'تاری'], ['system', 'وەکی ئامیرێ']], (v) => setSettings({ theme: v }))}
        </div>
      </Section>

      <Section title="دەربارە">
        <Link className="row-main" to="/support">
          <Icon name="heart" /> پشتەڤانی
        </Link>
        <Link className="row-main" to="/about">
          <Icon name="info" /> دەربارەی مە
        </Link>
        <a className="row-main" href="/docs">
          <Icon name="code" /> API بۆ گەشەپێدەران
        </a>
      </Section>
      <p className="hint">تەفسیرا ساناهی · وەشان 2.0.0 · ڕێکخستن ل سەر ڤی گەڕۆکی دهێنە پاراستن.</p>
    </Page>
  )
}

// ── About ────────────────────────────────────────────────────────────
const NOTE =
  'سوپاس بوو وی خودای یێ ب دەستویریا وی هەمی کار بدوماهی دهێن. ژبەرکو تەفسیرا بساناهی د سیستەمێ IOS دا نەیا بەردەست بوو، من ب فەر زانی ب کارێ بەرهەڤکرنا وێ ڕاببم داکو تێگەهشتنا مە بو پەرتوکا خۆدێ بەرفرەهتر لێ بهێت. ئەڤ بەرهەمە ژ لایێ چەند خێرخوازان ڤە هاتیە پالپشتی کرن بوو هەردو سیستەمێت ئای ئو ئێس و ئەندروێد. دخوازم وانان ژ دوعایێت خۆ بێ بەهر نەکەین. سوپاس بوو هەڤالێن هاریکاری پێشکێش کری و خودان خێر ببن. دیسان سوپاس بوو ئامەد تەحسین دوسکی بو هاریکاریا وی دگەل من دا . ب هێڤیا وێ چەندێ ژ خۆدێ، مە هەمیان بهێلتە د گزیرتێن خێران دا.'

const linkRow = (label: string, href: string, icon: 'globe' | 'code' | 'star' | 'info') => (
  <a className="row-main" href={href} target={href.startsWith('/') ? undefined : '_blank'} rel="noreferrer">
    <Icon name={icon} /> {label}
  </a>
)

export function AboutScreen() {
  return (
    <Page title="دەربارەی مە">
      <div className="about-hero">
        <img src="/icons/icon-192.png" alt="" width={96} height={96} />
        <h1>تەفسیرا ساناهی</h1>
      </div>
      <div className="card on-card prose">
        <p>{NOTE}</p>
        <p className="muted">٩/٤/٢٠٢٢ · Alind Jalal</p>
      </div>
      <Section title="ئەپلیکەیشن">
        <div style={{ padding: '14px 16px' }}>
          <StoreLinks />
        </div>
      </Section>
      <Section title="لینک">
        {linkRow('ماڵپەڕێ مە · tefsirasanahi.com', 'https://tefsirasanahi.com', 'globe')}
        {linkRow('API بۆ گەشەپێدەران · /docs', '/docs', 'code')}
        {linkRow('هژمارا مە ل ئینستاگرامی', 'https://www.instagram.com/kurdwest/', 'info')}
      </Section>
      <Section title="ئەڤ ئەپلیکەیشنە هاتیە گەشەپێدان ژ لایێ:">
        {linkRow('Azad Linavay', 'https://linktr.ee/azadlinavay', 'star')}
        {linkRow('azadlinavay.dev', 'https://azadlinavay.dev', 'globe')}
        {linkRow('Amad Basheer', 'https://linktr.ee/amad_a96', 'star')}
      </Section>
      <Section title="سوپاسیەکا تایبەت">
        <p className="prose" style={{ margin: 0 }}>
          سوپاسیەکا تایبەت بۆ Salar Pro بۆ بەلاڤکرنا ڤێ ئەپلیکەیشنێ، و بۆ هەمی ئەوێن هاریکاریا مە کری د ڤی پرۆژەی دا. خودێ خێرێ بدەتە هەمیان.
        </p>
        {linkRow('Salar Pro · salarpro.com', 'https://salarpro.com/', 'globe')}
      </Section>
      <p className="hint">
        مسحەف و فۆنت ژ QUL (Tarteel) · KFGQPC. دەنگێن قاریان ژ EveryAyah.com.
      </p>
    </Page>
  )
}

// ── Support ──────────────────────────────────────────────────────────
export function SupportScreen() {
  const { data } = useDonation()
  const phone = data?.phone ?? '+964 750 760 1194'
  const e164 = data?.phone_e164 ?? '+9647507601194'
  return (
    <Page title="پشتەڤانی">
      <div className="support-hero">
        <Icon name="heart" size={56} />
      </div>
      <div className="card on-card prose">
        <p>{data?.message.ku ?? 'ئەگەر تە دڤێت پشتەڤانیا ئەپلیکەیشنا تەفسیرا ساناهی بکەی، دشێی پەیوەندیێ ب مە بکەی ل سەر ڤی ژمارێ.'}</p>
      </div>
      <div className="card on-card donate">
        <p className="phone" dir="ltr">
          {phone}
        </p>
        <div className="methods">
          {(data?.methods ?? [{ id: 'fib', name: 'FIB' }, { id: 'qi', name: 'QI Card' }, { id: 'fp', name: 'FastPay' }, { id: 'zc', name: 'ZainCash' }]).map((m) => (
            <span key={m.id} className="chip">
              {m.name}
            </span>
          ))}
        </div>
        <div className="actions">
          <button className="btn" onClick={() => copyText(e164, 'ژمارە هاتە کۆپیکرن')}>
            <Icon name="copy" /> کۆپیکرنا ژمارێ
          </button>
          <a className="btn ghost" href={`tel:${e164}`}>
            پەیوەندی
          </a>
        </div>
      </div>
    </Page>
  )
}
