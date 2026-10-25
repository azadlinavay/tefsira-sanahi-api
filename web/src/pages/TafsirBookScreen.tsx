import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Icon, Medallion } from '../components/Icon'
import { SurahPicker, surahMeta } from '../components/Pickers'
import { ThemeToggle } from '../components/ThemeToggle'
import { copyText, share, usePageMeta } from '../components/ui'
import { useTafsirSurah } from '../lib/api'
import { ar } from '../lib/arabic'
import { toggle, usePlayer } from '../lib/audio'
import { setSettings, toggleBookmark, useSettings } from '../lib/settings'

/**
 * Tafsir only: a surah's tafsir read straight through, like a book, on the
 * same paper as the Mushaf. Click a passage to hear its tafsir audio.
 */
export default function TafsirBookScreen() {
  const { surah: sParam, ayah: aParam } = useParams()
  const navigate = useNavigate()
  const surahNo = Math.min(114, Math.max(1, Number(sParam) || 1))
  const settings = useSettings()
  const player = usePlayer()
  const { data, isLoading, error } = useTafsirSurah(surahNo)
  const [picker, setPicker] = useState(false)
  const [showAyah, setShowAyah] = useState(false)
  const surah = data?.surah
  usePageMeta(surah ? `${surah.name_ar} · تەفسیر بتنێ` : 'تەفسیر بتنێ', surah ? `تەفسیرا ساناهی یا سورەتا ${surah.name_ar} ب کوردی — نڤیسین و دەنگ.` : undefined)

  // Open on the linked ayah.
  useEffect(() => {
    if (!data) return
    const el = Number(aParam) > 1 ? document.getElementById(`t-${aParam}`) : null
    if (el) el.scrollIntoView({ block: 'start' })
    else window.scrollTo(0, 0)
  }, [data, aParam])

  // Keep the passage being read aloud in view.
  const followed = useRef<string | null>(null)
  useEffect(() => {
    if (!player.playing || !player.key || player.key === followed.current) return
    followed.current = player.key
    const [s, a] = player.key.split(':').map(Number)
    if (s === surahNo) document.getElementById(`t-${a}`)?.scrollIntoView({ block: 'start', behavior: 'smooth' })
  }, [player.key, player.playing, surahNo])

  const go = (n: number) => navigate(`/tafsir/${n}`)
  const paperClass = settings.paper === 'auto' ? '' : `paper-${settings.paper}`
  const size = (d: number) => setSettings({ tafsirSize: Math.min(30, Math.max(13, settings.tafsirSize + d)) })

  return (
    <div className="tafsir-book-screen">
      <header className="topbar mushaf-top no-print">
        <button className="icon-btn" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/quran'))} aria-label="زڤرین">
          <Icon name="back" />
        </button>
        <button className="title as-button" onClick={() => setPicker(true)} aria-label="هەلبژارتنا سورەتێ">
          <strong>{surah?.name_ar ?? ''}</strong>
          <small>
            تەفسیر بتنێ<span className="wide-only">{surah ? ` · ${surahMeta(surah)}` : ''}</span>
          </small>
        </button>
        <div className="zoom">
          <button className="icon-btn plain" onClick={() => size(-1)} aria-label="بچووککرن">
            <Icon name="minus" />
          </button>
          <span>{ar(settings.tafsirSize)}</span>
          <button className="icon-btn plain" onClick={() => size(1)} aria-label="مەزنکرن">
            <Icon name="plus" />
          </button>
        </div>
        <button className="pill-toggle" aria-pressed={showAyah} onClick={() => setShowAyah((v) => !v)} title="ئایەتان ژی نیشان بدە">
          ئایەت
        </button>
        <Link to={`/surah/${surahNo}`} className="icon-btn" title="ل مسحەفێ ڤەکە" aria-label="ل مسحەفێ ڤەکە">
          <Icon name="book" />
        </Link>
        <ThemeToggle />
      </header>

      <div className="tafsir-book-wrap">
        {isLoading && <div className="spinner" />}
        {error && <p className="error">{(error as Error).message}</p>}
        {data && surah && (
          <article className={`tafsir-book ${paperClass}`}>
            <div className="running">
              <span>{surah.name_ar}</span>
              <span>تەفسیرا ساناهی</span>
            </div>
            <div className="mushaf-frame">
              <div className="tb-inner" style={{ fontSize: settings.tafsirSize }}>
                <div className="surah-banner" style={{ height: 46, fontSize: 24 }}>
                  <Medallion className="medal" />
                  <div className="name">
                    <span>سورة {surah.name_ar}</span>
                  </div>
                  <Medallion className="medal" />
                </div>
                {data.intros.length > 0 && (
                  <div className="tb-intros">
                    {data.intros.map((c, i) => (
                      <a key={i} className="btn tonal small" href={c.url} target="_blank" rel="noreferrer">
                        <Icon name="headphones" /> {c.label}
                      </a>
                    ))}
                  </div>
                )}
                {data.ayahs.map((a) => {
                  const key = `${surahNo}:${a.number}`
                  const live = player.key === key && player.track === 'tafsir'
                  const bookmarked = settings.bookmarks.includes(key)
                  return (
                    <section key={key} id={`t-${a.number}`} className={`tb-ayah${live ? ' live' : ''}`}>
                      <div className="tb-head">
                        <span className="tb-num">{ar(a.number)}</span>
                        <span className="tb-tools no-print">
                          <button className="icon-btn on-card" onClick={() => toggle(key, 'tafsir')} title="تەفسیرا دەنگی" aria-label="تەفسیرا دەنگی">
                            <Icon name={live && player.playing ? 'pause' : 'headphones'} size={18} />
                          </button>
                          <button className="icon-btn on-card" aria-pressed={bookmarked} onClick={() => toggleBookmark(key)} aria-label="نیشانکرن">
                            <Icon name={bookmarked ? 'bookmark' : 'bookmarkOutline'} size={18} />
                          </button>
                          <button
                            className="icon-btn on-card"
                            onClick={() => copyText(`${a.tafsir?.text ?? ''}\n\n[${surah.name_ar} · ${ar(a.number)}] — تەفسیرا ساناهی\n${location.origin}/tafsir/${surahNo}/${a.number}`)}
                            aria-label="کۆپیکرن"
                          >
                            <Icon name="copy" size={18} />
                          </button>
                          <button className="icon-btn on-card" onClick={() => share(`${surah.name_ar} · ${ar(a.number)}`, a.tafsir?.text?.slice(0, 120) ?? '', `${location.origin}/tafsir/${surahNo}/${a.number}`)} aria-label="پارڤەکرن">
                            <Icon name="share" size={18} />
                          </button>
                          <Link className="icon-btn on-card" to={`/surah/${surahNo}/${a.number}`} title="ل مسحەفێ" aria-label="ل مسحەفێ">
                            <Icon name="book" size={18} />
                          </Link>
                        </span>
                      </div>
                      {showAyah && (
                        <p className="tb-quran" dir="rtl">
                          {a.text.hafs_smart}
                        </p>
                      )}
                      <p className="tb-text" onClick={() => toggle(key, 'tafsir')}>
                        {a.tafsir?.text}
                      </p>
                    </section>
                  )
                })}
              </div>
            </div>
            <nav className="tb-nav no-print">
              <button className="btn ghost" disabled={surahNo <= 1} onClick={() => go(surahNo - 1)}>
                <Icon name="chevronRight" /> سورەتا پێشتر
              </button>
              <button className="btn" disabled={surahNo >= 114} onClick={() => go(surahNo + 1)}>
                سورەتا پاشتر <Icon name="chevronLeft" />
              </button>
            </nav>
          </article>
        )}
      </div>
      <SurahPicker open={picker} onClose={() => setPicker(false)} onPick={(s) => go(s.number)} />
    </div>
  )
}
