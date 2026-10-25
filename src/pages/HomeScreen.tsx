import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { SurahRow } from '../components/Pickers'
import { StoreLinks } from '../components/StoreLinks'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../components/ui'
import { useSurahs } from '../lib/api'
import { ar, normalize } from '../lib/arabic'
import { useSettings } from '../lib/settings'

const TILES: [IconName, string, string][] = [
  ['book', 'قورئان و تەفسیر', '/page'],
  ['text', 'تەفسیر بتنێ', '/tafsir/1'],
  ['headphones', 'گوهداریکرن', '/listen'],
  ['search', 'لێگەریان', '/search'],
  ['bookmark', 'نیشانکری', '/bookmarks'],
  ['settings', 'ڕێکخستن', '/settings'],
  ['heart', 'پشتەڤانی', '/support'],
]

export default function HomeScreen() {
  usePageMeta('قورئانا پیروز', 'هەمی سوورەتێن قورئانێ دگەل تەفسیرا ساناهی ب کوردی — مسحەف، تەفسیر بتنێ، لێگەریان و نیشانکری.')
  const { data: surahs, isLoading, error } = useSurahs()
  const settings = useSettings()
  const navigate = useNavigate()
  const [q, setQ] = useState('')

  const shown = useMemo(() => {
    const n = normalize(q.trim())
    if (!surahs || !n) return surahs ?? []
    return surahs.filter((s) => String(s.number) === n || normalize(s.name_ar).includes(n) || s.name_en.toLowerCase().includes(n.toLowerCase()))
  }, [surahs, q])

  return (
    <div className="home">
      <header className="topbar">
        <Link to="/settings" className="icon-btn" aria-label="ڕێکخستن">
          <Icon name="settings" />
        </Link>
        <Link to="/support" className="icon-btn support-btn" aria-label="پشتەڤانی" title="پشتەڤانیا مە بکە">
          <Icon name="heart" />
        </Link>
        <span style={{ flex: 1 }} />
        <Link to="/" className="icon-btn" aria-label="لاپەرێ سەرەکی" title="لاپەرێ سەرەکی">
          <img src="/icons/icon-192.png" alt="" width={26} height={26} style={{ borderRadius: 7 }} />
        </Link>
        <a className="icon-btn" href="/docs" aria-label="API بۆ گەشەپێدەران" title="API بۆ گەشەپێدەران">
          <Icon name="code" />
        </a>
        <ThemeToggle />
      </header>
      <div className="container">
        <h1 className="hero-title">تەفسیرا ساناهی</h1>
        <p className="hero-sub">قورئانا پیروز دگەل تەفسیرا تەحسین ئیبراهیم دۆسکی ب کوردی — نڤیسین و دەنگ پێکڤە</p>

        <form
          className="search-box"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            if (q.trim()) navigate(`/search?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <Icon name="search" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="سورەت، ئایەت (٢:٢٥٥) یان پەیڤەک ژ قورئان و تەفسیرێ…" aria-label="لێگەریان" />
          {q.trim() && <button className="btn" type="submit">لێگەریان د ئایەت و تەفسیرێ دا</button>}
        </form>

        {!q && (
          <>
            <Link className="card continue" to={settings.readView === 'page' ? `/page/${settings.lastPage || 1}` : `/surah/${settings.lastKey.replace(':', '/')}`}>
              <span className="play-dot">
                <Icon name="book" />
              </span>
              <span>
                <small className="kicker">{settings.lastPage > 1 ? 'بەردەوامبە ل خواندنێ' : 'دەستپێبکە'}</small>
                <strong>مسحەف و تەفسیر</strong>
                <small className="muted">{settings.readView === 'page' ? `لاپەر ${ar(settings.lastPage || 1)}` : `${surahs?.[Number(settings.lastKey.split(':')[0]) - 1]?.name_ar ?? ''} · ئایەت ${ar(settings.lastKey.split(':')[1])}`}</small>
              </span>
            </Link>
            <div className="card on-card get-app">
              <img src="/icons/icon-192.png" alt="" width={52} height={52} />
              <span className="get-app-text">
                <strong>ئەپلیکەیشنا تەفسیرا ساناهی</strong>
                <small className="muted">بۆ ئایفۆن، ئەندرۆید و ویندۆز</small>
              </span>
              <StoreLinks />
            </div>
            <div className="tiles">
              {TILES.map(([icon, label, to]) => (
                <Link key={label} className="card tile" to={to === '/page' ? (settings.readView === 'page' ? `/page/${settings.lastPage || 1}` : `/surah/${settings.lastKey.replace(':', '/')}`) : to}>
                  <span className="tile-icon">
                    <Icon name={icon} />
                  </span>
                  {label}
                </Link>
              ))}
            </div>
          </>
        )}

        <h2 className="section-title">سوورەت</h2>
        {isLoading && <div className="spinner" />}
        {error && <p className="error">{(error as Error).message}</p>}
        <div className="card surah-grid">
          {shown.map((s) => (
            <SurahRow key={s.number} surah={s} onClick={() => navigate(`/surah/${s.number}`)} />
          ))}
        </div>

        <Link to="/support" className="card support-card">
          <Icon name="heart" />
          <span>
            <strong>پشتەڤانیا ئەپلیکەیشنێ بکە</strong>
            <small className="muted">FIB · QI Card · FastPay · ZainCash</small>
          </span>
        </Link>
        <footer className="site-footer">
          <Link to="/about">دەربارەی مە</Link> · <a href="/docs">API</a> · <a href="https://github.com/azadlinavay/tefsira-sanahi-api">GitHub</a> ·{' '}
          <a href="https://azadlinavay.dev">azadlinavay.dev</a>
          <StoreLinks compact />
        </footer>
      </div>
    </div>
  )
}
