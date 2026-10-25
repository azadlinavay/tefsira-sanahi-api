import { useState } from 'react'
import { setSettings, useSettings } from '../lib/settings'
import { WBW_LANGS, playWord, useWbw } from '../lib/wbw'
import { Icon } from './Icon'

/**
 * The ayah word by word, as on quran.com: each word with its transliteration
 * and meaning. Tap a word to hear it.
 */
export function WordByWord({ ayahKey }: { ayahKey: string }) {
  const [s, a] = ayahKey.split(':').map(Number)
  const open = useSettings((x) => x.wbw)
  const lang = useSettings((x) => x.wbwLang)
  const { data } = useWbw(open ? s : null)
  const [playing, setPlaying] = useState<number | null>(null)
  const words = data?.ar[a - 1] ?? []

  return (
    <section className="wbw">
      <div className="wbw-head">
        <button className="wbw-toggle" aria-expanded={open} onClick={() => setSettings({ wbw: !open })}>
          <Icon name={open ? 'chevronLeft' : 'chevronRight'} />
          پەیڤ ب پەیڤ
        </button>
        {open && (
          <select value={lang} onChange={(e) => setSettings({ wbwLang: e.target.value })} aria-label="زمانێ واتایێ">
            {WBW_LANGS.filter(([id]) => !data || data[id]).map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        )}
      </div>
      {open && (
        <div className="wbw-grid" dir="rtl">
          {words.map((w, i) => (
            <button
              key={i}
              className={`wbw-word${playing === i ? ' on' : ''}`}
              onClick={() => {
                setPlaying(i)
                playWord(s, a, i + 1)
              }}
              title="گوهداریکرن"
            >
              <span className="ar">{w}</span>
              <span className="tl" dir="ltr">
                {data?.tl[a - 1]?.[i]}
              </span>
              <span className="mean" dir={lang === 'fa' || lang === 'ur' ? 'rtl' : 'ltr'}>
                {data?.[lang]?.[a - 1]?.[i]}
              </span>
            </button>
          ))}
          {open && !data && <span className="muted">...</span>}
        </div>
      )}
    </section>
  )
}

/** Meaning of one word for the hover card on the Mushaf page. */
export function useWordMeaning(key: string | null, w: number | null) {
  const lang = useSettings((x) => x.wbwLang)
  const on = useSettings((x) => x.wbw)
  const [s, a] = key ? key.split(':').map(Number) : [0, 0]
  const { data } = useWbw(on && key ? s : null)
  if (!data || w == null || !key) return null
  const ar = data.ar[a - 1]?.[w]
  if (!ar) return null
  return { ar, tr: data.tl[a - 1]?.[w] ?? '', mean: data[lang]?.[a - 1]?.[w] ?? '', rtl: lang === 'fa' || lang === 'ur' }
}
