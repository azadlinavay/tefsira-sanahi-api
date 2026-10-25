import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSurahs } from '../lib/api'
import { ar } from '../lib/arabic'
import { currentTime, seek, setRate, setSurahNames, skip, stop, toggle, usePlayer } from '../lib/audio'
import { setSettings, useSettings } from '../lib/settings'
import { Icon } from './Icon'

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/** Floating player, shown only while something is loaded. */
export function PlayerBar() {
  const player = usePlayer()
  const { data: surahs } = useSurahs()
  const settings = useSettings()
  const navigate = useNavigate()
  const [pos, setPos] = useState(0)
  useEffect(() => {
    if (surahs) setSurahNames(surahs.map((x) => x.name_ar))
  }, [surahs])

  // Screens make room for the bar while it shows.
  useEffect(() => {
    document.body.classList.toggle('has-player', !!player.key)
  }, [player.key])

  // Progress ticks without re-rendering the rest of the app.
  useEffect(() => {
    if (!player.playing) return
    const t = window.setInterval(() => setPos(currentTime()), 250)
    return () => clearInterval(t)
  }, [player.playing])

  if (!player.key) return null
  const [s, a] = player.key.split(':').map(Number)
  const label = a === 0 ? 'أعوذ بالله' : `${surahs?.[s - 1]?.name_ar ?? ''} · ${ar(a)}`
  const progress = player.duration ? Math.min(1, pos / player.duration) : 0

  return (
    <div className="player no-print" role="region" aria-label="لێدەر">
      <div
        className="progress"
        onClick={(e) => {
          const r = e.currentTarget.getBoundingClientRect()
          seek(1 - (e.clientX - r.left) / r.width) // right-to-left bar
        }}
      >
        <div style={{ width: `${progress * 100}%`, marginInlineStart: 0 }} />
      </div>
      <div className="row">
        <button className="play" onClick={() => toggle()} aria-label={player.playing ? 'ڕاوەستاندن' : 'لێدان'}>
          <Icon name={player.loading ? 'history' : player.playing ? 'pause' : 'play'} />
        </button>
        <button className="icon-btn" onClick={() => skip(-1)} title="ئایەتا پێشتر">
          <Icon name="next" label="ئایەتا پێشتر" />
        </button>
        <button className="icon-btn" onClick={() => skip(1)} title="ئایەتا پاشتر">
          <Icon name="prev" label="ئایەتا پاشتر" />
        </button>
        <Icon name={player.track === 'tafsir' ? 'headphones' : 'book'} size={18} />
        <button className="label" style={{ background: 'none', border: 0, textAlign: 'start', cursor: 'pointer' }} onClick={() => navigate(`/surah/${s}/${Math.max(1, a)}`)}>
          {label}
          {player.error && <span className="muted"> · {player.error}</span>}
        </button>
        <span className="muted" dir="ltr" style={{ fontSize: 12 }}>
          {fmt(pos)} / {fmt(player.duration)}
        </span>
        <select
          aria-label="دووبارەکرن"
          title="دووبارەکرنا هەر ئایەتەکێ"
          value={settings.repeat}
          onChange={(e) => setSettings({ repeat: Number(e.target.value) })}
        >
          {[1, 2, 3, 5, 10].map((n) => (
            <option key={n} value={n}>
              {n === 1 ? '↻ ١' : `↻ ${ar(n)}`}
            </option>
          ))}
        </select>
        <select
          aria-label="لەز"
          value={settings.rate}
          onChange={(e) => {
            const rate = Number(e.target.value)
            setSettings({ rate })
            setRate(rate)
          }}
        >
          {[0.75, 1, 1.25, 1.5].map((r) => (
            <option key={r} value={r}>
              {r}×
            </option>
          ))}
        </select>
        <button className="icon-btn" onClick={stop} title="داخستن">
          <Icon name="close" label="داخستن" />
        </button>
      </div>
    </div>
  )
}
