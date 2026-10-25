import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { MushafPage } from '../components/MushafPage'
import { MushafOptions, SurahPicker } from '../components/Pickers'
import { ShortcutsDialog } from '../components/Shortcuts'
import { TafsirPanel } from '../components/TafsirPanel'
import { useWordMeaning } from '../components/WordByWord'
import { playWord } from '../lib/wbw'
import { ThemeToggle } from '../components/ThemeToggle'
import { Sheet, useMedia, usePageMeta } from '../components/ui'
import { ar } from '../lib/arabic'
import { neighbour, toggle, usePlayer } from '../lib/audio'
import { setSettings, useSettings } from '../lib/settings'
import { isDarkPaper, useMushaf } from '../lib/useMushaf'

const PAGE_RATIO = 0.64

export default function MushafScreen() {
  const params = useParams()
  const [search, setSearch] = useSearchParams()
  const navigate = useNavigate()
  const settings = useSettings()
  const player = usePlayer()
  const wide = useMedia('(min-width: 1000px)')
  const { data, error } = useMushaf(settings.edition, settings.script)
  const [picker, setPicker] = useState(false)
  const [options, setOptions] = useState(false)
  const [help, setHelp] = useState(false)
  const [immersive, setImmersive] = useState(false)
  const [sheetKey, setSheetKey] = useState<string | null>(null)
  // Word under the mouse, for its meaning card (word by word).
  const [hover, setHover] = useState<{ key: string; w: number; x: number; y: number; below: boolean } | null>(null)
  const meaning = useWordMeaning(hover?.key ?? null, hover?.w ?? null)

  const total = data?.layout.pages.length ?? 604
  // /surah/2/255 opens the page holding that ayah, with it selected.
  const surahKey = params.surah ? `${Number(params.surah) || 1}:${Number(params.ayah) || 1}` : null
  const surahPage = surahKey && data ? data.layout.pageOf.get(surahKey) : undefined
  const page = Math.min(Math.max(Number(params.page) || surahPage || settings.lastPage || 1, 1), total)
  const selected = search.get('ayah') ?? (params.ayah ? surahKey : null)

  // Spreads start on the odd (right-hand) page.
  const first = wide ? (page % 2 ? page : page - 1) : page
  const step = wide ? 2 : 1

  const goTo = useCallback(
    (p: number, ayah?: string) => {
      const target = Math.min(Math.max(p, 1), total)
      navigate(`/page/${target}${ayah ? `?ayah=${ayah}` : ''}`, { replace: !ayah })
    },
    [navigate, total],
  )

  useEffect(() => {
    if (!surahKey || surahPage) setSettings({ lastPage: page })
  }, [page, surahKey, surahPage])

  // The ayah that starts the open page(s), for titles and the default panel.
  const firstKey = (() => {
    if (!data) return null
    const seg = data.layout.pages[first - 1]?.l.flatMap((l) => l.w ?? [])[0]
    return seg ? `${seg[0]}:${seg[1]}` : null
  })()
  const panelKey = selected ?? firstKey
  const [ps] = (panelKey ?? '1:1').split(':').map(Number)
  const surahName = data?.surahNames[ps - 1] ?? ''
  const juz = data && firstKey ? data.ayahs.list[data.ayahs.indexOf.get(firstKey) ?? 0]?.juz : 1
  usePageMeta(`${surahName} · لاپەر ${page}`, `قورئانا پیروز، ${surahName}، لاپەر ${page} — دگەل تەفسیرا ساناهی ب کوردی.`)

  // Follow the recitation onto the next page.
  const followed = useRef<string | null>(null)
  useEffect(() => {
    if (!data || !player.key || !player.playing || player.key === followed.current) return
    followed.current = player.key
    const p = data.layout.pageOf.get(player.key)
    if (p && (p < first || p >= first + step)) goTo(p)
  }, [player.key, player.playing, data, first, step, goTo])

  const select = (key: string) => {
    const next = new URLSearchParams(search)
    next.set('ayah', key)
    setSearch(next, { replace: true })
  }

  const onWord = (key: string, kind: 'tap' | 'long', word?: number) => {
    if (wide) {
      // Desk: show the ayah's tafsir and say the clicked word (as on quran.com).
      select(key)
      if (settings.wbw && word != null) {
        const [s, a] = key.split(':').map(Number)
        playWord(s, a, word + 1)
      }
      return
    }
    // Phones: tap an ayah to hear it (again to pause); hold for its tafsir.
    if (kind === 'long') setSheetKey(key)
    else toggle(key)
  }

  const stepAyah = async (delta: 1 | -1) => {
    if (!panelKey || !data) return
    const n = await neighbour(panelKey, delta)
    if (!n) return
    const key = `${n.surah}:${n.ayah}`
    const p = data.layout.pageOf.get(key) ?? page
    if (wide) goTo(p, key)
    else setSheetKey(key)
  }

  // ── Keyboard ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).closest('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return
      const k = e.key
      if (k === 'ArrowLeft' || k === 'PageDown') goTo(first + step)
      else if (k === 'ArrowRight' || k === 'PageUp') goTo(first - step)
      else if (k === ' ') {
        e.preventDefault()
        toggle(player.key ? undefined : panelKey ?? undefined)
      } else if (k === 'ArrowDown' || k === 'j') void stepAyah(1)
      else if (k === 'ArrowUp' || k === 'k') void stepAyah(-1)
      else if (k === '+' || k === '=') setSettings({ mushafScale: Math.min(2.5, settings.mushafScale + 0.25) })
      else if (k === '-') setSettings({ mushafScale: Math.max(1, settings.mushafScale - 0.25) })
      else if (k === 'f') toggleFullscreen()
      else if (k === 't') setOptions(true)
      else if (k === 's') setPicker(true)
      else if (k === '/') {
        e.preventDefault()
        navigate('/search')
      } else if (k === '?') setHelp(true)
      else if (k === 'Escape' && selected) {
        const next = new URLSearchParams(search)
        next.delete('ayah')
        setSearch(next, { replace: true })
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void document.documentElement.requestFullscreen?.().catch(() => undefined)
    setImmersive((v) => !v)
  }

  // ── Swipe, pinch and Ctrl+wheel zoom ────────────────────────────
  const area = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const gesture = useRef<{ x: number; y: number; dist?: number; scale?: number } | null>(null)
  const [areaSize, setAreaSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = area.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setAreaSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return
      e.preventDefault()
      const s = Math.round((settingsRef.current.mushafScale - e.deltaY / 400) * 20) / 20
      setSettings({ mushafScale: Math.min(2.5, Math.max(1, s)) })
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => {
      ro.disconnect()
      el.removeEventListener('wheel', onWheel)
    }
  }, [])
  const settingsRef = useRef(settings)
  settingsRef.current = settings

  const dist = () => {
    const [a, b] = [...pointers.current.values()]
    return Math.hypot(a.x - b.x, a.y - b.y)
  }

  // Page size from the space available.
  const pages = wide ? 2 : 1
  const pageH = Math.max(0, Math.min(areaSize.h, (areaSize.w - 8 * pages) / pages / PAGE_RATIO))
  const pageW = pageH * PAGE_RATIO

  const paperClass = settings.paper === 'auto' ? '' : `paper-${settings.paper}`
  const dark = isDarkPaper(settings.paper)

  const pageView = (p: number) =>
    data && p <= total ? (
      <div key={p} className={paperClass} style={{ width: pageW, height: pageH }}>
        <MushafPage
          edition={data.edition}
          layout={data.layout}
          words={data.words}
          ayahs={data.ayahs}
          surahNames={data.surahNames}
          page={p}
          scale={settings.mushafScale}
          script={settings.script}
          tajweed={data.tajweed}
          imlaei={data.imlaei}
          dark={dark}
          selectedKey={wide ? panelKey : sheetKey}
          playingKey={player.key}
          onWord={onWord}
        />
      </div>
    ) : (
      <div key={p} style={{ width: pageW, height: pageH }} />
    )

  const topbar = (
    <header className="topbar mushaf-top no-print">
      <Link to="/quran" className="icon-btn" aria-label="سەرەکی">
        <Icon name="back" />
      </Link>
      <button className="title as-button" onClick={() => setPicker(true)} aria-label="هەلبژارتنا سورەتێ">
        <strong>{surahName}</strong>
        <small>
          لاپەر {ar(page)} · الجزء {ar(juz ?? 1)}
        </small>
      </button>
      {wide && (
        <div className="page-nav">
          <button className="icon-btn plain" onClick={() => goTo(first - step)} disabled={first <= 1} aria-label="لاپەرێن پێشتر">
            <Icon name="chevronRight" />
          </button>
          <span>
            {ar(first)}
            {step === 2 && first + 1 <= total ? `–${ar(first + 1)}` : ''} / {ar(total)}
          </span>
          <button className="icon-btn plain" onClick={() => goTo(first + step)} disabled={first + step > total} aria-label="لاپەرێن پاشتر">
            <Icon name="chevronLeft" />
          </button>
        </div>
      )}
      <div className="zoom">
        <button className="icon-btn plain" onClick={() => setSettings({ mushafScale: Math.max(1, settings.mushafScale - 0.25) })} disabled={settings.mushafScale <= 1} aria-label="بچووککرن">
          <Icon name="minus" />
        </button>
        <span>{ar(Math.round(settings.mushafScale * 100))}٪</span>
        <button className="icon-btn plain" onClick={() => setSettings({ mushafScale: Math.min(2.5, settings.mushafScale + 0.25) })} disabled={settings.mushafScale >= 2.5} aria-label="مەزنکرن">
          <Icon name="plus" />
        </button>
      </div>
      <button className="icon-btn" onClick={() => setOptions(true)} aria-label="مسحەف و ڕێنڤیس" title="مسحەف و ڕێنڤیس (T)">
        <Icon name="text" />
      </button>
      {wide && (
        <>
          <Link to="/search" className="icon-btn" aria-label="لێگەریان" title="لێگەریان (/)">
            <Icon name="search" />
          </Link>
          <button className="icon-btn" onClick={toggleFullscreen} aria-label="هەمی شاشە" title="هەمی شاشە (F)">
            <Icon name="fullscreen" />
          </button>
          <button className="icon-btn" onClick={() => setHelp(true)} aria-label="کورتەڕێکێن کیبۆردی" title="کورتەڕێکێن کیبۆردی (?)">
            <Icon name="keyboard" />
          </button>
        </>
      )}
      <button
        className="icon-btn"
        onClick={() => {
          setSettings({ readView: 'scroll' })
          navigate(`/surah/${(panelKey ?? firstKey ?? '1:1').replace(':', '/')}`)
        }}
        aria-label="خواندنا بەردەوام"
        title="خواندنا بەردەوام (وەکی پەرتووکێ ب سکرۆل)"
      >
        <Icon name="list" />
      </button>
      <ThemeToggle />
      <Link to="/support" className="icon-btn support-btn" aria-label="پشتەڤانی" title="پشتەڤانیا مە بکە">
        <Icon name="heart" />
      </Link>
    </header>
  )

  return (
    <div className={`mushaf-screen${wide ? ' desk' : ''}${immersive ? ' immersive' : ''}`}>
      {!immersive && topbar}
      <div className="mushaf-body">
        {wide && !immersive && (
          <nav className="rail no-print" aria-label="بەش">
            <Link to={`/page/${page}`} className="active">
              <Icon name="book" />
              قورئان
            </Link>
            <Link to={`/tafsir/${panelKey?.replace(':', '/') ?? '1'}`}>
              <Icon name="text" />
              تەفسیر بتنێ
            </Link>
            <Link to="/quran">
              <Icon name="list" />
              سوورەت
            </Link>
            <Link to="/search">
              <Icon name="search" />
              لێگەریان
            </Link>
            <Link to="/bookmarks">
              <Icon name="bookmarkOutline" />
              نیشانکری
            </Link>
            <Link to="/settings">
              <Icon name="settings" />
              ڕێکخستن
            </Link>
            <Link to="/support" className="support">
              <Icon name="heart" />
              پشتەڤانی
            </Link>
          </nav>
        )}
        <div
          ref={area}
          className="spread-area"
          onClick={(e) => {
            // Empty space (not a word or button) toggles full-screen reading.
            if (!(e.target as HTMLElement).closest('[data-key], button, a')) setImmersive((v) => !v)
          }}
          onPointerDown={(e) => {
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            if (pointers.current.size === 1) gesture.current = { x: e.clientX, y: e.clientY }
            if (pointers.current.size === 2) gesture.current = { x: 0, y: 0, dist: dist(), scale: settings.mushafScale }
          }}
          onPointerMove={(e) => {
            if (!pointers.current.has(e.pointerId)) return
            pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
            const g = gesture.current
            if (g?.dist && pointers.current.size === 2) {
              const s = Math.round(((g.scale! * dist()) / g.dist) * 20) / 20
              setSettings({ mushafScale: Math.min(2.5, Math.max(1, s)) })
            }
          }}
          onPointerUp={(e) => {
            const g = gesture.current
            pointers.current.delete(e.pointerId)
            if (g && !g.dist && pointers.current.size === 0 && e.pointerType !== 'mouse') {
              const dx = e.clientX - g.x
              const dy = e.clientY - g.y
              // Right-to-left book: swipe right for the next page.
              if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) goTo(dx > 0 ? first + step : first - step)
            }
            if (pointers.current.size === 0) gesture.current = null
          }}
          onPointerCancel={(e) => pointers.current.delete(e.pointerId)}
          onPointerOver={(e) => {
            if (e.pointerType !== 'mouse') return
            const el = (e.target as HTMLElement).closest<HTMLElement>('[data-w]')
            if (!el) return setHover(null)
            const r = el.getBoundingClientRect()
            // Above the word, or below it near the top of the window.
            const below = r.top < 110
            setHover({ key: el.dataset.key!, w: Number(el.dataset.w), x: r.left + r.width / 2, y: below ? r.bottom : r.top, below })
          }}
          onPointerLeave={() => setHover(null)}
        >
          {error && <p className="error">{(error as Error).message}</p>}
          {!data && !error && <div className="spinner" aria-label="بارکرن" />}
          {data && (
            <div className="spread" style={{ gap: 6 }}>
              {pageView(first)}
              {wide && pageView(first + 1)}
            </div>
          )}
        </div>
        {wide && !immersive && panelKey && (
          <aside className="side-panel card" aria-label="تەفسیر">
            <TafsirPanel ayahKey={panelKey} surahName={surahName} onStep={stepAyah} />
          </aside>
        )}
      </div>
      {!wide && !immersive && (
        <nav className="mushaf-bottom no-print">
          <button className="play-fab" onClick={() => toggle(player.key ? undefined : firstKey ?? undefined)} aria-label="خواندن">
            <Icon name={player.playing ? 'pause' : 'play'} />
          </button>
          <button className="icon-btn plain" onClick={() => goTo(page + 1)} aria-label="لاپەرێ پاشتر">
            <Icon name="chevronLeft" />
          </button>
          <span>
            {ar(page)} / {ar(total)}
          </span>
          <button className="icon-btn plain" onClick={() => goTo(page - 1)} aria-label="لاپەرێ پێشتر">
            <Icon name="chevronRight" />
          </button>
          <button className="icon-btn plain" onClick={() => firstKey && setSheetKey(firstKey)} aria-label="تەفسیر">
            <Icon name="tafsir" />
          </button>
        </nav>
      )}

      {hover && meaning && (
        <div className={`word-card${hover.below ? ' below' : ''}`} role="tooltip" style={{ left: Math.min(Math.max(hover.x, 120), innerWidth - 120), top: hover.y }}>
          <span className="ar">{meaning.ar}</span>
          <span className="tl">{meaning.tr}</span>
          <span className="mean" dir={meaning.rtl ? 'rtl' : 'ltr'}>
            {meaning.mean}
          </span>
        </div>
      )}

      <SurahPicker
        open={picker}
        onClose={() => setPicker(false)}
        onPick={(s) => data && goTo(data.layout.pageOf.get(`${s.number}:1`) ?? s.pages[0])}
      />
      <MushafOptions open={options} onClose={() => setOptions(false)} />
      <ShortcutsDialog open={help} onClose={() => setHelp(false)} />
      <Sheet open={!!sheetKey} onClose={() => setSheetKey(null)} label="تەفسیر">
        {sheetKey && data && (
          <TafsirPanel ayahKey={sheetKey} surahName={data.surahNames[Number(sheetKey.split(':')[0]) - 1]} onStep={stepAyah} />
        )}
      </Sheet>
    </div>
  )
}
