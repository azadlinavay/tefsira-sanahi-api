import { useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon, Medallion } from '../components/Icon'
import { SurahPicker } from '../components/Pickers'
import { TafsirPanel } from '../components/TafsirPanel'
import { ThemeToggle } from '../components/ThemeToggle'
import { useWordMeaning } from '../components/WordByWord'
import { Sheet, useMedia, usePageMeta } from '../components/ui'
import { useSurahs, useTafsirSurah, type Surah } from '../lib/api'
import { ar } from '../lib/arabic'
import { playAyah, toggle, usePlayer } from '../lib/audio'
import { TAJWEED_COLORS, editionById, ensureFont, loadAyahs, loadImlaei, loadReciters, loadTajweed, loadWords, type AyahIndex, type Tajweed } from '../lib/quran'
import { setSettings, useSettings } from '../lib/settings'
import { isDarkPaper } from '../lib/useMushaf'
import { playWord } from '../lib/wbw'
import '../reader.css'

const forever = { staleTime: Infinity, gcTime: Infinity }
const HAFS = editionById('qatar') // Uthmani Hafs words in the UthmanicHafs font

/** The ornamented ayah-end marker with its number. */
function AyahMark({ n }: { n: number }) {
  return (
    <span className="sr-mark" data-mark>
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <g fill="none" stroke="currentColor">
          <circle cx="24" cy="24" r="17" strokeWidth="1.6" />
          <circle cx="24" cy="24" r="13.5" strokeWidth="0.9" />
          {Array.from({ length: 8 }, (_, i) => (
            <path key={i} d="M24 2.5 L27 7 L24 9.5 L21 7 Z" strokeWidth="1" transform={`rotate(${i * 45} 24 24)`} />
          ))}
        </g>
      </svg>
      <b>{ar(n)}</b>
    </span>
  )
}

/**
 * The Quran as one long page, as in Quran Majeed: large Uthmani text that
 * flows on from surah to surah, with ornamented ayah markers. Tap a word to
 * hear it, the ayah number to hear the ayah; hold (or right-click) an ayah
 * for its tafsir. The tafsir can also show under every ayah.
 */
export default function ScrollReaderScreen() {
  const params = useParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const player = usePlayer()
  const wide = useMedia('(min-width: 900px)')
  const startSurah = Math.min(114, Math.max(1, Number(params.surah) || 1))
  const startAyah = Number(params.ayah) || 0

  const { data: surahs } = useSurahs()
  const words = useQuery({ queryKey: ['words', HAFS.words], queryFn: () => loadWords(HAFS.words), ...forever })
  const ayahs = useQuery({ queryKey: ['ayahs'], queryFn: loadAyahs, ...forever })
  const tajweed = useQuery({ queryKey: ['tajweed'], queryFn: loadTajweed, enabled: settings.script === 'tajweed', ...forever })
  const imlaei = useQuery({ queryKey: ['imlaei'], queryFn: loadImlaei, enabled: settings.script === 'imlaei', ...forever })
  const reciters = useQuery({ queryKey: ['reciters'], queryFn: loadReciters, ...forever })
  const [fontReady, setFontReady] = useState(false)
  useEffect(() => void ensureFont(HAFS, 1).then(() => setFontReady(true)), [])

  // Surahs on the page: the one opened, then each next one as you reach the end.
  const [list, setList] = useState<number[]>([startSurah])
  const [current, setCurrent] = useState(`${startSurah}:${Math.max(1, startAyah)}`)
  const [sheetKey, setSheetKey] = useState<string | null>(null)
  const [picker, setPicker] = useState(false)
  const [juzPicker, setJuzPicker] = useState(false)
  const [barsHidden, setBarsHidden] = useState(false)
  const [hover, setHover] = useState<{ key: string; w: number; x: number; y: number; below: boolean } | null>(null)
  const meaning = useWordMeaning(hover?.key ?? null, hover?.w ?? null)

  // A new surah or ayah from a link or a picker: start the page there.
  const opened = useRef('')
  useEffect(() => {
    const id = `${startSurah}:${startAyah}`
    if (opened.current === id) return
    opened.current = id
    setList([startSurah])
    setCurrent(`${startSurah}:${Math.max(1, startAyah)}`)
  }, [startSurah, startAyah])

  const ready = !!(words.data && ayahs.data && surahs && fontReady)
  useLayoutEffect(() => {
    if (!ready) return
    const el = startAyah > 1 ? document.querySelector(`[data-ayah="${startSurah}:${startAyah}"]`) : null
    if (el) el.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [ready, startSurah, startAyah])

  const s0 = Number(current.split(':')[0])
  const surahName = surahs?.[s0 - 1]?.name_ar ?? ''
  const meta = ayahs.data?.list[ayahs.data.indexOf.get(current) ?? 0]
  usePageMeta(`${surahName} · قورئان و تەفسیر`, `${surahName} — قورئانا پیروز دگەل تەفسیرا ساناهی ب کوردی.`)

  // Track the ayah at the top of the screen; hide the bars while reading down.
  useEffect(() => {
    let lastY = window.scrollY
    let frame = 0
    const onScroll = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const y = window.scrollY
        if (Math.abs(y - lastY) > 12) {
          setBarsHidden(y > lastY && y > 160)
          lastY = y
        }
        const el = document.elementFromPoint(window.innerWidth / 2, 140)?.closest<HTMLElement>('[data-ayah]')
        const key = el?.dataset.ayah
        if (key) setCurrent((c) => (c === key ? c : key))
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Remember the place and keep the address bar on it (without re-routing).
  useEffect(() => {
    if (!ready) return
    const [s, a] = current.split(':')
    window.history.replaceState(window.history.state, '', `/surah/${s}/${a}`)
    const t = window.setTimeout(() => setSettings({ lastKey: current, ...(meta ? { lastPage: meta.page } : {}) }), 600)
    return () => clearTimeout(t)
  }, [current, ready, meta])

  // Load the next surah when the end comes into view.
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = end.current
    if (!el) return
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) setList((l) => (l[l.length - 1] < 114 ? [...l, l[l.length - 1] + 1] : l))
    }, { rootMargin: '1200px 0px' })
    io.observe(el)
    return () => io.disconnect()
  }, [ready])

  // Follow the recitation: load its surah if needed and keep it in view.
  useEffect(() => {
    if (!player.key || !player.playing) return
    const [s, a] = player.key.split(':').map(Number)
    if (a === 0) return
    if (!list.includes(s)) {
      if (s === list[list.length - 1] + 1) setList((l) => [...l, s])
      return
    }
    const el = document.querySelector<HTMLElement>(`[data-ayah="${player.key}"]`)
    if (!el) return
    const r = el.getBoundingClientRect()
    if (r.top < 90 || r.bottom > window.innerHeight - 110) el.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [player.key, player.playing, list])

  // ── Taps ─────────────────────────────────────────────────────────
  const longTimer = useRef<number | null>(null)
  const longFired = useRef(false)
  const ayahOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest<HTMLElement>('[data-ayah]')?.dataset.ayah ?? null

  const onClick = (e: React.MouseEvent) => {
    if (longFired.current) return void (longFired.current = false)
    const t = e.target as HTMLElement
    const key = ayahOf(t)
    if (!key) {
      if (!t.closest('button, a, select, input')) setBarsHidden((v) => !v)
      return
    }
    const [s, a] = key.split(':').map(Number)
    if (t.closest('[data-mark]')) return toggle(key)
    const w = t.closest<HTMLElement>('[data-w]')?.dataset.w
    if (settings.wbw && w != null) return playWord(s, a, Number(w) + 1)
    toggle(key)
  }

  const size = (d: number) => setSettings({ scrollSize: Math.min(64, Math.max(22, settings.scrollSize + d)) })
  const juzStarts = useMemo(() => {
    const out: string[] = []
    for (const m of ayahs.data?.list ?? []) if (!out[m.juz - 1]) out[m.juz - 1] = `${m.surah}:${m.ayah}`
    return out
  }, [ayahs.data])
  const go = (key: string) => navigate(`/surah/${key.replace(':', '/')}`)
  const reciter = reciters.data?.reciters.find((r) => r.id === settings.reciter)
  const paperClass = settings.paper === 'auto' ? '' : `paper-${settings.paper}`

  return (
    <div className={`sr ${paperClass}${barsHidden ? ' bars-hidden' : ''}`}>
      <header className="sr-top no-print">
        <div className="sr-top-row">
          <Link to="/quran" className="icon-btn on-card" aria-label="سەرەکی">
            <Icon name="back" />
          </Link>
          <div className="sr-title">
            <strong>{surahName}</strong>
            <small>
              ئایەت {ar(current.split(':')[1])}
              {meta ? ` · الجزء ${ar(meta.juz)} · لاپەر ${ar(meta.page)}` : ''}
            </small>
          </div>
          <ThemeToggle />
        </div>
        <div className="sr-pills">
          <button onClick={() => setJuzPicker(true)}>جوزء {meta ? ar(meta.juz) : ''}</button>
          <select value={settings.reciter} onChange={(e) => setSettings({ reciter: e.target.value })} aria-label="قاری">
            {reciters.data?.reciters.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            {!reciters.data && <option>{reciter?.name ?? '…'}</option>}
          </select>
          <button onClick={() => setPicker(true)}>سورەت</button>
        </div>
      </header>

      <main
        className="sr-page"
        style={{ fontSize: settings.scrollSize }}
        onClick={onClick}
        onContextMenu={(e) => {
          const key = ayahOf(e.target)
          if (key) {
            e.preventDefault()
            setSheetKey(key)
          }
        }}
        onPointerDown={(e) => {
          const key = ayahOf(e.target)
          if (!key || e.pointerType === 'mouse') return
          longTimer.current = window.setTimeout(() => {
            longFired.current = true
            setSheetKey(key)
          }, 480)
        }}
        onPointerUp={() => longTimer.current && clearTimeout(longTimer.current)}
        onPointerMove={() => longTimer.current && clearTimeout(longTimer.current)}
        onPointerOver={(e) => {
          if (e.pointerType !== 'mouse' || !settings.wbw) return
          const el = (e.target as HTMLElement).closest<HTMLElement>('[data-w]')
          if (!el) return setHover(null)
          const r = el.getBoundingClientRect()
          const below = r.top < 150
          setHover({ key: ayahOf(el)!, w: Number(el.dataset.w), x: r.left + r.width / 2, y: below ? r.bottom : r.top, below })
        }}
        onPointerLeave={() => setHover(null)}
      >
        {!ready && <div className="spinner" />}
        {ready && list[0] > 1 && (
          <button className="btn ghost sr-prev" onClick={() => go(`${list[0] - 1}:1`)}>
            <Icon name="chevronRight" /> سورەتا پێشتر · {surahs![list[0] - 2].name_ar}
          </button>
        )}
        {ready &&
          list.map((s) => (
            <SurahBlock
              key={s}
              surah={surahs![s - 1]}
              words={words.data!}
              ayahs={ayahs.data!}
              tajweed={settings.script === 'tajweed' ? tajweed.data ?? null : null}
              imlaei={settings.script === 'imlaei' ? imlaei.data ?? null : null}
              dark={isDarkPaper(settings.paper)}
              showTafsir={settings.scrollTafsir}
              playingKey={player.key}
              selectedKey={sheetKey}
              tafsirSize={settings.tafsirSize}
            />
          ))}
        <div ref={end} style={{ height: 1 }} />
        {ready && list[list.length - 1] === 114 && <p className="hint">صدق الله العظيم</p>}
      </main>

      <nav className="sr-bottom no-print" aria-label="ئامراز">
        <div className="sr-size">
          <button className="icon-btn plain" onClick={() => size(-2)} aria-label="بچووککرن">
            <Icon name="minus" />
          </button>
          <input type="range" min={22} max={64} step={1} value={settings.scrollSize} onChange={(e) => setSettings({ scrollSize: Number(e.target.value) })} aria-label="قەبارێ نڤیسینێ" />
          <button className="icon-btn plain" onClick={() => size(2)} aria-label="مەزنکرن">
            <Icon name="plus" />
          </button>
        </div>
        <button className="sr-play" onClick={() => (player.key ? toggle() : playAyah(current))} aria-label={player.playing ? 'ڕاوەستاندن' : 'خواندن'}>
          <Icon name={player.playing ? 'pause' : 'play'} />
        </button>
        <button className="sr-tool" aria-pressed={settings.scrollTafsir} onClick={() => setSettings({ scrollTafsir: !settings.scrollTafsir })} title="تەفسیرێ ل بن هەر ئایەتەکێ نیشان بدە">
          <Icon name="tafsir" />
          <span>تەفسیر</span>
        </button>
        <button
          className="sr-tool"
          onClick={() => {
            setSettings({ readView: 'page' })
            navigate(`/page/${meta?.page ?? 1}?ayah=${current}`)
          }}
          title="لاپەرێن مسحەفێ"
        >
          <Icon name="book" />
          <span>لاپەر</span>
        </button>
        <Link className="sr-tool" to={`/listen?from=${current}`} title="گوهداریکرن">
          <Icon name="headphones" />
          <span>گوهداری</span>
        </Link>
        {wide && (
          <Link className="sr-tool" to="/search" title="لێگەریان">
            <Icon name="search" />
            <span>لێگەریان</span>
          </Link>
        )}
      </nav>

      {hover && meaning && (
        <div className={`word-card${hover.below ? ' below' : ''}`} role="tooltip" style={{ left: Math.min(Math.max(hover.x, 120), innerWidth - 120), top: hover.y }}>
          <span className="ar">{meaning.ar}</span>
          <span className="tl">{meaning.tr}</span>
          <span className="mean" dir={meaning.rtl ? 'rtl' : 'ltr'}>
            {meaning.mean}
          </span>
        </div>
      )}

      <SurahPicker open={picker} onClose={() => setPicker(false)} onPick={(s) => go(`${s.number}:1`)} />
      <Sheet open={juzPicker} onClose={() => setJuzPicker(false)} label="جوزء">
        <h3 style={{ margin: '4px 4px 12px' }}>جوزء</h3>
        <div className="juz-grid">
          {juzStarts.map((key, i) => (
            <button
              key={i}
              aria-pressed={meta?.juz === i + 1}
              onClick={() => {
                setJuzPicker(false)
                go(key)
              }}
            >
              {ar(i + 1)}
            </button>
          ))}
        </div>
      </Sheet>
      <Sheet open={!!sheetKey} onClose={() => setSheetKey(null)} label="تەفسیر">
        {sheetKey && surahs && (
          <TafsirPanel
            ayahKey={sheetKey}
            surahName={surahs[Number(sheetKey.split(':')[0]) - 1].name_ar}
            onStep={async (d) => {
              const i = ayahs.data?.indexOf.get(sheetKey)
              const n = i == null ? null : ayahs.data!.list[i + d]
              if (n) setSheetKey(`${n.surah}:${n.ayah}`)
            }}
          />
        )}
      </Sheet>
    </div>
  )
}

/** One surah: header, basmala, then its ayahs (flowing, or each with its tafsir). */
function SurahBlock(p: {
  surah: Surah
  words: string[][]
  ayahs: AyahIndex
  tajweed: Tajweed | null
  imlaei: string[][] | null
  dark: boolean
  showTafsir: boolean
  playingKey: string | null
  selectedKey: string | null
  tafsirSize: number
}) {
  const { surah } = p
  const tafsir = useTafsirSurah(p.showTafsir ? surah.number : 0)
  const tafsirOf = (a: number) => (p.showTafsir ? tafsir.data?.ayahs[a - 1]?.tafsir?.text : null)

  const ayahWords = (a: number): ReactNode[] => {
    const key = `${surah.number}:${a}`
    const i = p.ayahs.indexOf.get(key) ?? -1
    if (p.imlaei) return (p.imlaei[i] ?? []).map((w, j) => <span key={j} data-w={j} className="w imla">{w} </span>)
    if (p.tajweed) {
      const runs = p.tajweed.ayahs[key] ?? []
      return runs.map((word, j) => (
        <span key={j} data-w={j} className="w">
          {word.map((r, k) =>
            typeof r === 'string' ? r : (
              <span key={k} style={{ color: TAJWEED_COLORS[p.tajweed!.rules[r[0]]]?.[p.dark ? 1 : 0] }}>
                {r[1]}
              </span>
            ),
          )}{' '}
        </span>
      ))
    }
    const ws = p.words[i] ?? []
    return ws.slice(0, -1).map((w, j) => (
      <span key={j} data-w={j} className="w">
        {w}{' '}
      </span>
    ))
  }

  const n = surah.ayah_count
  const ayahNodes: ReactNode[] = []
  for (let a = 1; a <= n; a++) {
    const key = `${surah.number}:${a}`
    const cls = `sr-ayah${key === p.playingKey ? ' play' : ''}${key === p.selectedKey ? ' sel' : ''}`
    const text = tafsirOf(a)
    ayahNodes.push(
      <span key={key} className={cls} data-ayah={key}>
        {ayahWords(a)}
        <AyahMark n={a} />{' '}
      </span>,
    )
    if (p.showTafsir) {
      ayahNodes.push(
        <span key={`${key}t`} className="sr-tafsir" style={{ fontSize: p.tafsirSize }}>
          {text ?? (tafsir.isLoading ? '…' : '')}
        </span>,
      )
    }
  }

  return (
    <section className="sr-surah" aria-label={surah.name_ar}>
      <div className="sr-banner">
        <Medallion className="medal" />
        <div className="name">
          <span>سورة {surah.name_ar}</span>
        </div>
        <Medallion className="medal" />
      </div>
      <div className="sr-meta">
        {surah.revelation_place === 'madinah' ? 'مەدەنی' : 'مەککی'} · {ar(n)} ئایەت
      </div>
      {surah.has_basmala && <p className="sr-basmala">بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ</p>}
      <p className={`sr-text${p.showTafsir ? ' with-tafsir' : ''}`} dir="rtl">
        {ayahNodes}
      </p>
    </section>
  )
}
