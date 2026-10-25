import { memo, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { ar } from '../lib/arabic'
import {
  TAJWEED_COLORS,
  ensureFont,
  fontFamilyFor,
  type AyahIndex,
  type Edition,
  type Layout,
  type LayoutLine,
  type Tajweed,
  type TajweedRun,
} from '../lib/quran'
import type { Script } from '../lib/settings'
import { Medallion } from './Icon'

export interface MushafPageProps {
  edition: Edition
  layout: Layout
  words: string[][]
  ayahs: AyahIndex
  surahNames: string[]
  page: number
  scale: number
  script: Script
  tajweed: Tajweed | null
  imlaei: string[][] | null
  /** Paper is dark: use the brighter Tajweed colours. */
  dark: boolean
  selectedKey: string | null
  playingKey: string | null
  /** `word`: the tapped word's index in its ayah (0-based), when known. */
  onWord: (key: string, kind: 'tap' | 'long', word?: number) => void
}

/** Measures an element's content box. */
function useSize<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [size, setSize] = useState({ w: 0, h: 0 })
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => setSize({ w: e.contentRect.width, h: e.contentRect.height }))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return [ref, size] as const
}

export const MushafPage = memo(function MushafPage(p: MushafPageProps) {
  const { edition, layout, page, scale, script } = p
  const data = layout.pages[page - 1]
  const [fontReady, setFontReady] = useState(false)
  const [innerRef, size] = useSize<HTMLDivElement>()
  const longTimer = useRef<number | null>(null)
  const longFired = useRef(false)

  // The page's font (and page 1's, for the basmala, in per-page editions).
  useEffect(() => {
    let live = true
    setFontReady(false)
    Promise.all([ensureFont(edition, page), ensureFont(edition, 1)]).then(() => live && setFontReady(true))
    return () => {
      live = false
    }
  }, [edition, page])

  if (!data) return null
  const first = data.l.flatMap((l) => l.w ?? [])[0]
  const meta = first ? p.ayahs.list[p.ayahs.indexOf.get(`${first[0]}:${first[1]}`) ?? 0] : null

  const textW = size.w
  const lineH = size.h / layout.linesPerPage
  // One size for every page so pages don't jump as you turn them.
  const fs = Math.max(8, Math.min(textW / layout.refEm, lineH / 1.7))
  const reflow = scale > 1.001 || script === 'imlaei'
  const opening = !reflow && !!edition.opening && page <= 2

  // ── Words ────────────────────────────────────────────────────────
  const wordClass = (key: string) =>
    'm-word' + (key === p.selectedKey ? ' sel' : '') + (key === p.playingKey ? ' play' : '')
  const glyphFont = fontFamilyFor(edition, page)

  // data-w: the word's index in its ayah (0-based), for word-by-word meanings.
  const glyph = (text: string, key: string | null, i: number, font = glyphFont, w?: number) => (
    <span key={i} data-key={key ?? undefined} data-w={w} className={key ? wordClass(key) : undefined} style={{ fontFamily: font }}>
      {text}
    </span>
  )

  const tajweedWord = (runs: TajweedRun[], key: string | null, i: number, w?: number) => (
    <span
      key={i}
      data-key={key ?? undefined}
      data-w={w}
      className={key ? wordClass(key) : undefined}
      style={{ fontFamily: 'UthmanicHafs', fontSize: '0.92em' }}
    >
      {runs.map((r, j) =>
        typeof r === 'string' ? (
          r
        ) : (
          <span key={j} style={{ color: TAJWEED_COLORS[p.tajweed!.rules[r[0]]]?.[p.dark ? 1 : 0] }}>
            {r[1]}
          </span>
        ),
      )}
    </span>
  )

  const glyphsOf = (s: number, a: number) => p.words[p.ayahs.indexOf.get(`${s}:${a}`) ?? -1] ?? []

  /** The words of one line segment in the chosen script. */
  function segment([s, a, from, to]: [number, number, number, number], out: ReactNode[]) {
    const key = `${s}:${a}`
    const glyphs = glyphsOf(s, a)
    if (script === 'tajweed' && p.tajweed) {
      const tj = p.tajweed.ayahs[key] ?? []
      const m = glyphs.length // Mushaf tokens, usually + the ayah number
      const n = tj.length
      for (let i = from; i <= to && i < m; i++) {
        let lo: number, hi: number, num: boolean
        if (m === n) [lo, hi, num] = [i, i + 1, i === n - 1]
        else if (i === m - 1) [lo, hi, num] = [n, n, true]
        else [lo, hi, num] = [Math.floor((i * n) / (m - 1)), Math.floor(((i + 1) * n) / (m - 1)), false]
        for (let k = lo; k < hi; k++) out.push(tajweedWord(tj[k], key, out.length, k))
        if (num) out.push(m > n ? glyph(glyphs[m - 1], key, out.length) : glyph(`﴿${ar(a)}﴾`, key, out.length, 'AmiriQuran'))
      }
      return
    }
    if (script === 'imlaei') {
      if (from !== 0) return // the whole ayah once, at its first segment
      for (const [j, w] of (p.imlaei?.[p.ayahs.indexOf.get(key) ?? -1] ?? []).entries()) out.push(glyph(w, key, out.length, 'Amiri', j))
      out.push(glyph(`﴿${ar(a)}﴾`, key, out.length, 'Amiri'))
      return
    }
    for (let i = from; i <= to && i < glyphs.length; i++) out.push(glyph(glyphs[i], key, out.length, glyphFont, i < glyphs.length - 1 ? i : undefined))
  }

  function basmala(): ReactNode[] {
    if (script === 'tajweed' && p.tajweed) return (p.tajweed.ayahs['1:1'] ?? []).map((w, i) => tajweedWord(w, null, i))
    if (script === 'imlaei') return 'بسم الله الرحمن الرحيم'.split(' ').map((w, i) => glyph(w, null, i, 'Amiri'))
    const w = glyphsOf(1, 1)
    return w.slice(0, -1).map((t, i) => glyph(t, null, i, fontFamilyFor(edition, 1)))
  }

  const banner = (surah: number, height: number) => (
    <div className="surah-banner" style={{ height, fontSize: fs * 0.95 }}>
      <Medallion className="medal" />
      <div className="name">
        <span>سورة {p.surahNames[surah - 1] ?? ''}</span>
      </div>
      <Medallion className="medal" />
    </div>
  )

  // ── Lines ────────────────────────────────────────────────────────
  function printedLine(line: LayoutLine, i: number) {
    if (line.t === 'h') return <div key={i} style={{ height: lineH, display: 'flex', alignItems: 'center' }}>{banner(line.s!, lineH * 0.82)}</div>
    if (line.t === 'b') return <div key={i} className="m-line center" style={{ height: lineH }}>{basmala()}</div>
    const words: ReactNode[] = []
    for (const seg of line.w ?? []) segment(seg, words)
    const em = line.em ?? layout.refEm
    // Short lines (end of a surah) sit centred instead of stretched.
    const short = line.c === 1 || em < layout.refEm * 0.72 || opening
    // A line wider than the page shrinks to fit.
    const base = opening ? fs * 1.2 : fs
    const lineFs = em * base > textW ? (base * textW) / (em * base * 1.04) : base
    return (
      <div key={i} className={`m-line ${short ? 'center' : 'justify'}`} style={{ height: opening ? fs * 2.3 : lineH, fontSize: lineFs }}>
        {words}
      </div>
    )
  }

  function reflowed() {
    const big = fs * scale
    const blocks: ReactNode[] = []
    let run: ReactNode[] = []
    const flush = () => {
      if (run.length) blocks.push(<div key={blocks.length} className="m-flow" style={{ fontSize: big }}>{run}</div>)
      run = []
    }
    for (const line of data.l) {
      if (line.t === 'h') {
        flush()
        blocks.push(<div key={blocks.length} style={{ height: lineH, margin: `${lineH * 0.15}px 0` }}>{banner(line.s!, lineH * 0.82)}</div>)
      } else if (line.t === 'b') {
        flush()
        blocks.push(<div key={blocks.length} className="m-line center" style={{ fontSize: big, whiteSpace: 'normal', flexWrap: 'wrap' }}>{basmala()}</div>)
      } else {
        for (const seg of line.w ?? []) segment(seg, run)
      }
    }
    flush()
    return blocks
  }

  // ── Taps: one handler for every word (delegated) ─────────────────
  const keyOf = (t: EventTarget | null) => (t as HTMLElement | null)?.closest<HTMLElement>('[data-key]')?.dataset.key ?? null

  return (
    <div className="mushaf-page" style={{ visibility: fontReady ? 'visible' : 'hidden' }}>
      <div className="running">
        <span>{meta ? p.surahNames[meta.surah - 1] : ''}</span>
        <span>{meta ? `الجزء ${ar(meta.juz)}` : ''}</span>
      </div>
      <div className="mushaf-frame">
        <div
          ref={innerRef}
          className={`mushaf-inner${reflow ? ' reflow' : ''}`}
          onClick={(e) => {
            const key = keyOf(e.target)
            const w = (e.target as HTMLElement).closest<HTMLElement>('[data-w]')?.dataset.w
            if (key && !longFired.current) p.onWord(key, 'tap', w == null ? undefined : Number(w))
            longFired.current = false
          }}
          onPointerDown={(e) => {
            const key = keyOf(e.target)
            if (!key || e.pointerType === 'mouse') return
            longTimer.current = window.setTimeout(() => {
              longFired.current = true
              p.onWord(key, 'long')
            }, 480)
          }}
          onPointerUp={() => longTimer.current && clearTimeout(longTimer.current)}
          onPointerLeave={() => longTimer.current && clearTimeout(longTimer.current)}
          onContextMenu={(e) => {
            const key = keyOf(e.target)
            if (key) {
              e.preventDefault()
              p.onWord(key, 'long')
            }
          }}
        >
          {size.w > 0 &&
            (reflow ? (
              reflowed()
            ) : opening ? (
              <div className="opening" style={{ width: Math.min(textW - fs * 1.4, layout.refEm * fs * 0.9), fontSize: fs * 1.2 }}>
                {data.l.map(printedLine)}
              </div>
            ) : (
              data.l.map(printedLine)
            ))}
        </div>
      </div>
      <div className="mushaf-number">{ar(page)}</div>
    </div>
  )
})
