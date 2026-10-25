import { useMemo, useState } from 'react'
import { useSurahs, type Surah } from '../lib/api'
import { ar, normalize } from '../lib/arabic'
import { EDITIONS, TAJWEED_COLORS } from '../lib/quran'
import { setSettings, useSettings, type Script } from '../lib/settings'
import { Medallion } from './Icon'
import { Sheet } from './ui'

export const surahMeta = (s: Surah) => `${s.revelation_place === 'madinah' ? 'مەدینە' : 'مەککە'} · ${ar(s.ayah_count)} ئایەت`

/** A surah row with its number star. */
export function SurahRow({ surah, onClick }: { surah: Surah; onClick: () => void }) {
  return (
    <button className="surah-row" onClick={onClick}>
      <span className="star">
        <Medallion />
        <b>{ar(surah.number)}</b>
      </span>
      <span className="names">
        <strong>{surah.name_ar}</strong>
        <small className="muted">{surahMeta(surah)}</small>
      </span>
      <span className="en muted">{surah.name_en}</span>
    </button>
  )
}

export function SurahPicker({ open, onClose, onPick }: { open: boolean; onClose: () => void; onPick: (s: Surah) => void }) {
  const { data } = useSurahs()
  const [q, setQ] = useState('')
  const shown = useMemo(() => {
    const n = normalize(q.trim())
    if (!data || !n) return data ?? []
    return data.filter(
      (s) => String(s.number) === n || normalize(s.name_ar).includes(n) || s.name_en.toLowerCase().includes(n.toLowerCase()),
    )
  }, [data, q])
  return (
    <Sheet open={open} onClose={onClose} label="سورەت">
      <input className="field" autoFocus placeholder="ناڤ یان ژمارا سورەتێ…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="list">
        {shown.map((s) => (
          <SurahRow
            key={s.number}
            surah={s}
            onClick={() => {
              onPick(s)
              onClose()
            }}
          />
        ))}
      </div>
    </Sheet>
  )
}

export const PAPERS: [string, string, string | null, string | null][] = [
  ['auto', 'وەکی ڕەنگێ ئەپێ', null, null],
  ['white', 'سپی', '#ffffff', '#141414'],
  ['cream', 'کرێمی', '#f7efdc', '#3a2e1c'],
  ['green', 'کەسکێ ڕۆن', '#eaf4ec', '#10261c'],
  ['blue', 'شینێ ڕۆن', '#e9f1f8', '#14263a'],
  ['gray', 'خۆلەمێشی', '#ececec', '#1c1c1c'],
  ['night', 'شەڤ', '#1c201e', '#e8e3d7'],
  ['black', 'ڕەش', '#000000', '#d9d9d9'],
]

export function PaperPicker() {
  const paper = useSettings((s) => s.paper)
  return (
    <div className="papers" role="radiogroup" aria-label="ڕەنگێ لاپەرێ">
      {PAPERS.map(([id, label, bg, ink]) => (
        <button key={id} role="radio" aria-checked={paper === id} onClick={() => setSettings({ paper: id })}>
          <span
            className="swatch"
            style={{
              background: bg ?? 'linear-gradient(135deg, #fff 50%, #1c201e 50%)',
              color: ink ?? '#0b6b4e',
            }}
          >
            ب
          </span>
          <small>{label}</small>
        </button>
      ))}
    </div>
  )
}

const SCRIPTS: [Script, string, string][] = [
  ['uthmani', 'عوسمانی', 'وەکی مسحەفا چاپکری'],
  ['tajweed', 'تەجوید', 'پیتێن تەجویدێ ب ڕەنگان'],
  ['imlaei', 'ئاسایی', 'ڕێنڤیسا ئاسایی یا عەرەبی'],
]

export function ScriptPicker() {
  const script = useSettings((s) => s.script)
  return (
    <div className="segmented" role="radiogroup" aria-label="ڕێنڤیس">
      {SCRIPTS.map(([id, label, hint]) => (
        <button key={id} aria-pressed={script === id} title={hint} onClick={() => setSettings({ script: id })}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function TajweedLegend() {
  const seen = new Set<string>()
  return (
    <div className="legend">
      {Object.values(TAJWEED_COLORS)
        .filter(([, , name]) => !seen.has(name) && seen.add(name))
        .map(([color, , name]) => (
          <span key={name}>
            <i style={{ background: color }} />
            {name}
          </span>
        ))}
    </div>
  )
}

/** Edition, page colour and script — the Tт sheet. */
export function MushafOptions({ open, onClose }: { open: boolean; onClose: () => void }) {
  const settings = useSettings()
  return (
    <Sheet open={open} onClose={onClose} label="مسحەف و ڕێنڤیس">
      <div className="on-card options">
        <h3>مسحەف</h3>
        <div className="list editions">
          {EDITIONS.map((e) => (
            <button key={e.id} aria-pressed={settings.edition === e.id} onClick={() => setSettings({ edition: e.id })}>
              <strong>{e.name}</strong>
              <small className="muted">{e.details}</small>
            </button>
          ))}
        </div>
        <h3>ڕەنگێ لاپەرێ</h3>
        <PaperPicker />
        <h3>ڕێنڤیس</h3>
        <ScriptPicker />
        {settings.script === 'tajweed' && <TajweedLegend />}
      </div>
    </Sheet>
  )
}
