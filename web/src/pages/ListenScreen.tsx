import { useEffect, useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePageMeta } from '../components/ui'
import { useSurahs } from '../lib/api'
import { ar } from '../lib/arabic'
import { currentTime, playAyah, seek, setSession, skip, stop, toggle, usePlayer, useSession } from '../lib/audio'
import { editionById, ensureFont, loadAyahs, loadReciters, loadWords } from '../lib/quran'
import { setSettings, useSettings, type PlayMode } from '../lib/settings'
import '../reader.css'

const forever = { staleTime: Infinity, gcTime: Infinity }
const HAFS = editionById('qatar')
type Range = 'surah' | 'juz' | 'from'
type Sleep = 0 | 15 | 30 | 60 | -1 // minutes; -1 = at the end of the surah / juz

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

/**
 * Listen only: the Quran with its Kurdish tafsir, the Quran alone or the
 * tafsir alone — a surah, a juz or from any ayah on — with a sleep timer.
 * Keeps playing with the screen off; the lock screen has the controls.
 */
export default function ListenScreen() {
  usePageMeta('گوهداریکرن', 'گوهداریا قورئانا پیروز و تەفسیرا ساناهی یا دەنگی ب کوردی بکە.')
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const settings = useSettings()
  const player = usePlayer()
  const session = useSession()
  const { data: surahs } = useSurahs()
  const ayahs = useQuery({ queryKey: ['ayahs'], queryFn: loadAyahs, ...forever })
  const words = useQuery({ queryKey: ['words', HAFS.words], queryFn: () => loadWords(HAFS.words), ...forever })
  const reciters = useQuery({ queryKey: ['reciters'], queryFn: loadReciters, ...forever })
  useEffect(() => void ensureFont(HAFS, 1), [])

  const [fs, fa] = (params.get('from') ?? player.key ?? settings.lastKey ?? '1:1').split(':').map(Number)
  const [range, setRange] = useState<Range>(params.get('from') ? 'from' : 'surah')
  const [surah, setSurah] = useState(fs || 1)
  const [ayah, setAyah] = useState(Math.max(1, fa || 1))
  const [juz, setJuz] = useState(1)
  const [sleep, setSleep] = useState<Sleep>(0)
  const [pos, setPos] = useState(0)
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    if (!player.playing && !session.sleepAt) return
    const t = window.setInterval(() => {
      setPos(currentTime())
      setNow(Date.now())
    }, 500)
    return () => clearInterval(t)
  }, [player.playing, session.sleepAt])

  const juzRange = useMemo(() => {
    const list = ayahs.data?.list ?? []
    const first = list.find((m) => m.juz === juz)
    const last = [...list].reverse().find((m) => m.juz === juz)
    return first && last ? [`${first.surah}:${first.ayah}`, `${last.surah}:${last.ayah}`] : null
  }, [ayahs.data, juz])

  const count = surahs?.[surah - 1]?.ayah_count ?? 7
  const start = () => {
    let from = `${surah}:1`
    let endKey: string | null = null
    if (range === 'surah') endKey = sleep === -1 ? `${surah}:${count}` : null
    if (range === 'juz' && juzRange) [from, endKey] = juzRange
    if (range === 'from') {
      from = `${surah}:${Math.min(ayah, count)}`
      endKey = sleep === -1 ? `${surah}:${count}` : null
    }
    setSession({ active: true, endKey, sleepAt: sleep > 0 ? Date.now() + sleep * 60_000 : null })
    playAyah(from)
  }

  const [ps, pa] = (player.key ?? '0:0').split(':').map(Number)
  const nowText = player.key && pa > 0 ? (words.data?.[ayahs.data?.indexOf.get(player.key) ?? -1] ?? []).slice(0, -1).join(' ') : ''
  const progress = player.duration ? Math.min(1, pos / player.duration) : 0
  const sleepLeft = session.sleepAt ? Math.max(0, Math.round((session.sleepAt - now) / 60_000)) : null

  return (
    <div className="listen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/quran'))} aria-label="زڤرین">
          <Icon name="back" />
        </button>
        <div className="title">
          <strong>گوهداریکرن</strong>
          <small>قورئان و تەفسیرا دەنگی — دگەل شاشا گرتی ژی</small>
        </div>
      </header>

      <div className="container narrow">
        {player.key && (
          <section className="card on-card now-playing">
            <span className="kicker">{player.track === 'tafsir' ? 'تەفسیرا ساناهی · تەحسین دۆسکی' : 'قورئانا پیروز'}</span>
            <h2>
              {pa === 0 ? 'أعوذ بالله' : surahs?.[ps - 1]?.name_ar} {pa > 0 && <small>· ئایەت {ar(pa)}</small>}
            </h2>
            {nowText && (
              <p className="np-ayah" dir="rtl">
                {nowText}
              </p>
            )}
            <div
              className="np-progress"
              onClick={(e) => {
                const r = e.currentTarget.getBoundingClientRect()
                seek(1 - (e.clientX - r.left) / r.width)
              }}
            >
              <div style={{ width: `${progress * 100}%` }} />
            </div>
            {/* Elapsed on the right, where the bar starts filling. */}
            <div className="np-time">
              <span dir="ltr">{fmt(pos)}</span>
              <span dir="ltr">{fmt(player.duration)}</span>
            </div>
            <div className="np-controls">
              <button className="icon-btn on-card" onClick={() => skip(1)} aria-label="ئایەتا پاشتر">
                <Icon name="prev" />
              </button>
              <button className="np-play" onClick={() => toggle()} aria-label={player.playing ? 'ڕاوەستاندن' : 'لێدان'}>
                <Icon name={player.playing ? 'pause' : 'play'} size={30} />
              </button>
              <button className="icon-btn on-card" onClick={() => skip(-1)} aria-label="ئایەتا پێشتر">
                <Icon name="next" />
              </button>
            </div>
            <div className="np-foot">
              {sleepLeft != null && <span>خەو: {ar(sleepLeft)} خولەک</span>}
              {session.endKey && <span>دێ ل {surahs?.[Number(session.endKey.split(':')[0]) - 1]?.name_ar} · {ar(session.endKey.split(':')[1])} ڕاوەستیت</span>}
              <button className="btn ghost small" onClick={() => stop()}>
                <Icon name="close" /> ڕاگرتن
              </button>
            </div>
          </section>
        )}

        <section className="card on-card listen-form">
          <h3>چ گوه لێ ببی</h3>
          <div className="segmented">
            {(
              [
                ['both', 'قورئان و تەفسیر'],
                ['recitation', 'قورئان بتنێ'],
                ['tafsir', 'تەفسیر بتنێ'],
              ] as [PlayMode, string][]
            ).map(([id, label]) => (
              <button key={id} aria-pressed={settings.playMode === id} onClick={() => setSettings({ playMode: id })}>
                {label}
              </button>
            ))}
          </div>

          <h3>ژ کیرێ</h3>
          <div className="segmented">
            {(
              [
                ['surah', 'سورەتەک'],
                ['juz', 'جوزئەک'],
                ['from', 'ژ ئایەتەکێ'],
              ] as [Range, string][]
            ).map(([id, label]) => (
              <button key={id} aria-pressed={range === id} onClick={() => setRange(id)}>
                {label}
              </button>
            ))}
          </div>
          <div className="opt-row" style={{ marginTop: 10 }}>
            {range !== 'juz' ? (
              <label>
                <span>سورەت</span>
                <select
                  value={surah}
                  onChange={(e) => {
                    setSurah(Number(e.target.value))
                    setAyah(1)
                  }}
                >
                  {surahs?.map((s) => (
                    <option key={s.number} value={s.number}>
                      {ar(s.number)}. {s.name_ar}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span>جوزء</span>
                <select value={juz} onChange={(e) => setJuz(Number(e.target.value))}>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i} value={i + 1}>
                      الجزء {ar(i + 1)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {range === 'from' && (
              <label>
                <span>ئایەت</span>
                <select value={ayah} onChange={(e) => setAyah(Number(e.target.value))}>
                  {Array.from({ length: count }, (_, i) => (
                    <option key={i} value={i + 1}>
                      {ar(i + 1)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              <span>قاری</span>
              <select value={settings.reciter} onChange={(e) => setSettings({ reciter: e.target.value })}>
                {reciters.data?.reciters.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h3>دەمژمێرا خەوێ</h3>
          <div className="segmented">
            {(
              [
                [0, 'نە'],
                [15, '١٥ خ'],
                [30, '٣٠ خ'],
                [60, '٦٠ خ'],
                [-1, range === 'juz' ? 'دویماهیا جوزئی' : 'دویماهیا سورەتێ'],
              ] as [Sleep, string][]
            ).map(([id, label]) => (
              <button key={id} aria-pressed={sleep === id} onClick={() => setSleep(id)}>
                {label}
              </button>
            ))}
          </div>
          {range === 'juz' && <p className="muted" style={{ fontSize: 13, margin: '8px 0 0' }}>جوزء ب دویماهی دهێت دێ ڕاوەستیت.</p>}

          <button className="btn listen-start" onClick={start} disabled={!surahs || !ayahs.data}>
            <Icon name="play" /> دەستپێبکە
          </button>
        </section>
        <p className="hint">دەمێ شاشە گرتی بیت ژی دەنگ بەردەوام دبیت؛ ژ شاشا قفلکری دشێی ڕاوەستینی، دەستپێبکەی و بچییە ئایەتا پاشتر یان پێشتر.</p>
      </div>
    </div>
  )
}
