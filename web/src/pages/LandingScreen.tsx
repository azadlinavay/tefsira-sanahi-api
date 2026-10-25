import { Link } from 'react-router-dom'
import { Icon, type IconName } from '../components/Icon'
import { StoreLinks } from '../components/StoreLinks'
import { ThemeToggle } from '../components/ThemeToggle'
import { usePageMeta } from '../components/ui'
import { useSurahs } from '../lib/api'
import { ar } from '../lib/arabic'
import { useSettings } from '../lib/settings'
import '../landing.css'

const FEATURES: [IconName, string, string][] = [
  ['book', 'مسحەفا مەدینێ و ٩ چاپێن دی', 'لاپەر ب لاپەر، هێل ب هێل وەکی مسحەفا چاپکری. ڕێنڤیسا عوسمانی، تەجوید ب ڕەنگان یان ئیملائی.'],
  ['tafsir', 'تەفسیرا ساناهی ب کوردی', 'تەفسیرا تەحسین ئیبراهیم دۆسکی ب بادینی، ل تەنشت هەر ئایەتەکێ — یان هەمی تەفسیرا سورەتێ وەکی پەرتووکەکێ.'],
  ['headphones', 'دەنگ: خواندن و تەفسیر', 'خواندنا ٢٩ قاریان و تەفسیرا دەنگی یا مامۆستا تەحسین دۆسکی، ئایەت ل دویف ئایەتێ.'],
  ['text', 'پەیڤ ب پەیڤ', 'واتا و خواندنا هەر پەیڤەکێ ژ قورئانێ. ماوسێ ببە سەر پەیڤێ یان کلیک بکە دا گوه لێ ببی.'],
  ['search', 'لێگەریانا پێشکەفتی', 'ب عەرەبیا سادە یان کوردی، بێی حەرەکەت، د قورئان و تەفسیرێ دا — پەیڤ پێکڤە، د سورەتەکێ یان جوزئەکێ دا.'],
  ['repeat', 'بۆ ژبەرکرنێ', 'دووبارەکرنا هەر ئایەتەکێ، لەزا خواندنێ، و خواندنا خۆکار ژ سورەتەکێ بۆ یا دی.'],
]

const STATS: [string, string][] = [
  ['١١٤', 'سورەت'],
  ['٦٬٢٣٦', 'ئایەت'],
  ['١٠', 'مسحەف'],
  ['٢٩', 'قاری'],
]

/** The front page: what Tefsira Sanahi is, with the way into the Quran and the app. */
export default function LandingScreen() {
  usePageMeta('', 'قورئانا پیروز (مسحەفا مەدینێ) دگەل تەفسیرا ساناهی ب کوردی (بادینی) ژ تەحسین ئیبراهیم دۆسکی — نڤیسین و دەنگ پێکڤە، ل سەر ماڵپەڕی و ئەپلیکەیشنا ئایفۆن، ئەندرۆید و ویندۆزێ.')
  const lastPage = useSettings((s) => s.lastPage)
  const lastKey = useSettings((s) => s.lastKey)
  const readView = useSettings((s) => s.readView)
  const { data: surahs } = useSurahs()

  return (
    <div className="landing">
      <header className="l-nav">
        <Link to="/" className="l-brand">
          <img src="/icons/icon-192.png" alt="" width={36} height={36} />
          <span>تەفسیرا ساناهی</span>
        </Link>
        <nav className="l-links">
          <Link to="/quran">قورئان</Link>
          <Link to="/tafsir/1">تەفسیر</Link>
          <Link to="/search">لێگەریان</Link>
          <Link to="/about">دەربارە</Link>
        </nav>
        <ThemeToggle />
        <Link to="/quran" className="btn l-cta-small">
          <Icon name="book" /> خواندن
        </Link>
      </header>

      <section className="l-hero">
        <div className="l-hero-text">
          <span className="l-kicker">قورئانا پیروز · تەفسیرا کوردی</span>
          <h1>تەفسیرا ساناهی</h1>
          <p>
            قورئانا پیروز ب مسحەفا مەدینێ دگەل تەفسیرا مامۆستا <b>تەحسین ئیبراهیم دۆسکی</b> ب کوردی (بادینی). بخوینە، گوهداری بکە و تێبگەهە — نڤیسین و دەنگ پێکڤە.
          </p>
          <div className="l-actions">
            <Link to="/quran" className="btn l-primary">
              <Icon name="book" /> خواندنا قورئانێ
            </Link>
            {lastPage > 1 ? (
              <Link to={readView === 'page' ? `/page/${lastPage}` : `/surah/${lastKey.replace(':', '/')}`} className="btn l-secondary">
                <Icon name="history" /> بەردەوامبە · لاپەر {ar(lastPage)}
              </Link>
            ) : (
              <Link to="/tafsir/1" className="btn l-secondary">
                <Icon name="tafsir" /> خواندنا تەفسیرێ
              </Link>
            )}
          </div>
          <div className="l-stores">
            <span>ئەپلیکەیشن ژی هەیە:</span>
            <StoreLinks />
          </div>
        </div>
        <div className="l-hero-art" aria-hidden="true">
          <img className="l-phone back" src="/landing/tafsir.webp" alt="" width={440} height={956} />
          <img className="l-phone front" src="/landing/mushaf.webp" alt="" width={440} height={956} />
        </div>
      </section>

      <section className="l-stats">
        {STATS.map(([n, label]) => (
          <div key={label}>
            <b>{n}</b>
            <span>{label}</span>
          </div>
        ))}
      </section>

      <section className="l-section">
        <h2>هەر تشتەکێ تو پێدڤی بۆ خواندن و تێگەهشتنێ</h2>
        <div className="l-features">
          {FEATURES.map(([icon, title, text]) => (
            <div key={title} className="l-feature">
              <span className="tile-icon">
                <Icon name={icon} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="l-section l-desk">
        <h2>ل سەر کۆمپیوتەرێ: دوو لاپەر و تەفسیر پێکڤە</h2>
        <p className="l-sub">کلیک ل سەر ئایەتەکێ بکە دا تەفسیرا وێ ل تەنشت بهێت؛ کلیک ل سەر پەیڤەکێ دا گوه لێ ببی.</p>
        <Link to="/page/1" className="l-browser">
          <span className="l-browser-bar">
            <i />
            <i />
            <i />
            <em>tefsirasanahi.com</em>
          </span>
          <img src="/landing/desk.webp" alt="مسحەف و تەفسیر ل سەر کۆمپیوتەرێ" width={1440} height={860} loading="lazy" />
        </Link>
      </section>

      <section className="l-section">
        <h2>ب ڕەنگ و ڕێنڤیسا تە دڤێت</h2>
        <div className="l-screens">
          {[
            ['mushaf', 'مسحەفا مەدینێ'],
            ['tajweed', 'تەجوید ب ڕەنگان'],
            ['tafsir', 'تەفسیر بتنێ'],
            ['night', 'خواندنا شەڤێ'],
          ].map(([img, label]) => (
            <figure key={img}>
              <img src={`/landing/${img}.webp`} alt={label} width={440} height={956} loading="lazy" />
              <figcaption>{label}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="l-section l-app">
        <div className="l-app-card">
          <img src="/icons/icon-192.png" alt="" width={72} height={72} />
          <div>
            <h2>ئەپلیکەیشنا تەفسیرا ساناهی</h2>
            <p>هەمان مسحەف و تەفسیر ل سەر ئایفۆن، ئایپاد، ئەندرۆید و کۆمپیوتەرا ویندۆزێ — دگەل داگرتنا دەنگێ تەفسیرێ بۆ گوهداریکرنێ بێ ئینتەرنێت.</p>
            <StoreLinks />
          </div>
        </div>
      </section>

      <section className="l-section">
        <h2>سوورەتێن قورئانێ</h2>
        <nav className="l-surahs" aria-label="سوورەت">
          {surahs?.map((s) => (
            <Link key={s.number} to={`/surah/${s.number}`}>
              <b>{ar(s.number)}</b> {s.name_ar}
            </Link>
          ))}
        </nav>
      </section>

      <section className="l-section">
        <Link to="/support" className="card support-card">
          <Icon name="heart" />
          <span>
            <strong>پشتەڤانیا تەفسیرا ساناهی بکە</strong>
            <small className="muted">FIB · QI Card · FastPay · ZainCash</small>
          </span>
        </Link>
      </section>

      <footer className="l-footer">
        <div>
          <Link to="/quran">قورئان</Link> · <Link to="/search">لێگەریان</Link> · <Link to="/about">دەربارەی مە</Link> · <Link to="/support">پشتەڤانی</Link> · <Link to="/privacy">Privacy</Link> · <a href="/docs">API</a> ·{' '}
          <a href="https://github.com/azadlinavay/tefsira-sanahi-api">GitHub</a>
        </div>
        <small>
          تەفسیر: تەحسین ئیبراهیم دۆسکی · مسحەف: KFGQPC / QUL · دەنگ: EveryAyah · پەیڤ ب پەیڤ: Quran.com · گەشەپێدان:{' '}
          <a href="https://azadlinavay.dev">Azad Linavay</a> · سوپاس بۆ <a href="https://salarpro.com/">Salar Pro</a>
        </small>
      </footer>
    </div>
  )
}
