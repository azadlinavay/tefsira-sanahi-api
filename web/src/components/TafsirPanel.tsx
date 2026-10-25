import { useTafsirAyah } from '../lib/api'
import { ar } from '../lib/arabic'
import { toggle, usePlayer } from '../lib/audio'
import { toggleBookmark, useSettings } from '../lib/settings'
import { Link } from 'react-router-dom'
import { Icon } from './Icon'
import { copyText, share } from './ui'
import { WordByWord } from './WordByWord'

/** The selected ayah: text, tafsir, audio and actions. */
export function TafsirPanel({
  ayahKey,
  surahName,
  onStep,
}: {
  ayahKey: string
  surahName: string
  onStep: (delta: 1 | -1) => void
}) {
  const { data: ayah, isLoading, error } = useTafsirAyah(ayahKey)
  const player = usePlayer()
  const bookmarks = useSettings((s) => s.bookmarks)
  const tafsirSize = useSettings((s) => s.tafsirSize)
  const [s, a] = ayahKey.split(':').map(Number)
  const bookmarked = bookmarks.includes(ayahKey)
  const playing = (t: 'recitation' | 'tafsir') => player.key === ayahKey && player.track === t && player.playing
  const link = `${location.origin}/surah/${s}/${a}`
  const ref = `${surahName} · ${ar(a)}`

  const copy = (what: 'quran' | 'tafsir' | 'both') => {
    if (!ayah) return
    const quran = `${ayah.text.uthmani} ﴿${ar(a)}﴾`
    const tafsir = ayah.tafsir?.text ?? ''
    const body = what === 'quran' ? quran : what === 'tafsir' ? tafsir : `${quran}\n\n${tafsir}`
    void copyText(`${body}\n\n[${ref}] — تەفسیرا ساناهی\n${link}`)
  }

  return (
    <div className="tafsir-panel">
      <div className="tp-head">
        <span className="tp-kicker">تەفسیرا ساناهی</span>
        <h2>
          {surahName} · ئایەت {ar(a)}
        </h2>
        {ayah && (
          <p className="tp-quran" dir="rtl">
            {ayah.text.hafs_smart}
          </p>
        )}
        <div className="tp-actions">
          <button className={`btn tonal${playing('recitation') ? ' active' : ''}`} onClick={() => toggle(ayahKey, 'recitation')}>
            <Icon name={playing('recitation') ? 'pause' : 'play'} />
            خواندن
          </button>
          <button className={`btn tonal${playing('tafsir') ? ' active' : ''}`} onClick={() => toggle(ayahKey, 'tafsir')}>
            <Icon name={playing('tafsir') ? 'pause' : 'headphones'} />
            تەفسیرا دەنگی
          </button>
          <button className="icon-btn on-card" aria-pressed={bookmarked} title="نیشانکرن" onClick={() => toggleBookmark(ayahKey)}>
            <Icon name={bookmarked ? 'bookmark' : 'bookmarkOutline'} label="نیشانکرن" />
          </button>
          <details className="tp-copy">
            <summary className="icon-btn on-card" title="کۆپیکرن">
              <Icon name="copy" label="کۆپیکرن" />
            </summary>
            <div className="menu">
              <button onClick={() => copy('both')}>قورئان و تەفسیر</button>
              <button onClick={() => copy('quran')}>قورئان بتنێ</button>
              <button onClick={() => copy('tafsir')}>تەفسیر بتنێ</button>
            </div>
          </details>
          <button className="icon-btn on-card" title="پارڤەکرن" onClick={() => share(ref, ayah?.text.uthmani ?? '', link)}>
            <Icon name="share" label="پارڤەکرن" />
          </button>
        </div>
      </div>
      <div className="tp-links no-print">
        <Link to={`/tafsir/${s}/${a}`}>
          <Icon name="text" size={16} /> خواندنا تەفسیرا سورەتێ ب تنێ
        </Link>
      </div>
      <WordByWord ayahKey={ayahKey} />
      <div className="tp-body" style={{ fontSize: tafsirSize }}>
        {isLoading && <p className="muted">...</p>}
        {error && <p className="muted">{(error as Error).message}</p>}
        {ayah?.tafsir?.text}
      </div>
      <div className="tp-foot">
        <button className="btn ghost" onClick={() => onStep(-1)}>
          <Icon name="chevronRight" />
          ئایەتا پێشتر
        </button>
        <button className="btn" onClick={() => onStep(1)}>
          ئایەتا پاشتر
          <Icon name="chevronLeft" />
        </button>
      </div>
    </div>
  )
}
