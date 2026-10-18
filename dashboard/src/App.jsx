import { useCallback, useEffect, useMemo, useState } from 'react'
import { audioDuration, createApi } from './api.js'

const STORE_KEY = 'tefsira-dashboard'

function loadSettings() {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY)) || {}
  } catch {
    return {}
  }
}

function saveSettings(settings) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(settings))
  } catch {
    // private mode: settings last for this tab only
  }
}

export default function App() {
  const saved = useMemo(loadSettings, [])
  const [settings, setSettings] = useState({
    baseUrl: saved.baseUrl || (import.meta.env.VITE_API_URL ?? 'http://tefsira-sanahi-api.test'),
    token: saved.token || '',
    edition: saved.edition || 'tehsin-duski-ku',
  })
  const api = useMemo(() => createApi(settings), [settings])
  const [info, setInfo] = useState(null)
  const [surahs, setSurahs] = useState([])
  const [editions, setEditions] = useState([])
  const [current, setCurrent] = useState(1)
  const [connError, setConnError] = useState(null)
  const [toast, setToast] = useState(null)

  const notify = useCallback((text, kind = 'ok') => {
    setToast({ text, kind, id: Date.now() })
  }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    let cancelled = false
    setConnError(null)
    Promise.all([api.info(), api.surahs(), api.tafsirs()])
      .then(([i, s, e]) => {
        if (cancelled) return
        setInfo(i)
        setSurahs(s)
        setEditions(e)
      })
      .catch((err) => !cancelled && setConnError(err.message))
    return () => { cancelled = true }
  }, [api])

  const updateSettings = (next) => {
    setSettings(next)
    saveSettings(next)
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>۞</span>
          <div>
            <div className="brand-title">تەفسیرا ساناهی</div>
            <div className="brand-sub">Dashboard {info ? `· API ${info.version}` : ''}</div>
          </div>
        </div>
        <Connection settings={settings} editions={editions} onChange={updateSettings} />
      </header>

      {connError ? (
        <div className="empty">
          <h2>Can’t reach the API</h2>
          <p>{connError}</p>
          <p className="muted">Check the API address above. When running locally with Herd it is usually <code>http://tefsira-sanahi-api.test</code>.</p>
        </div>
      ) : (
        <div className="layout">
          <SurahList surahs={surahs} current={current} onPick={setCurrent} />
          <main className="main">
            {surahs.length > 0 && (
              <SurahEditor
                key={`${settings.edition}-${current}`}
                api={api}
                edition={settings.edition}
                surahNumber={current}
                canEdit={Boolean(settings.token)}
                notify={notify}
              />
            )}
          </main>
        </div>
      )}

      {toast && <div key={toast.id} className={`toast toast-${toast.kind}`} role="status">{toast.text}</div>}
    </div>
  )
}

function Connection({ settings, editions, onChange }) {
  const [draft, setDraft] = useState(settings)
  const dirty = draft.baseUrl !== settings.baseUrl || draft.token !== settings.token

  return (
    <form
      className="connection"
      onSubmit={(e) => {
        e.preventDefault()
        onChange({ ...draft, baseUrl: draft.baseUrl.trim(), token: draft.token.trim() })
      }}
    >
      <label>
        <span>API</span>
        <input value={draft.baseUrl} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://api.example.com" />
      </label>
      <label>
        <span>Admin token</span>
        <input type="password" value={draft.token} onChange={(e) => setDraft({ ...draft, token: e.target.value })} placeholder="read-only without a token" autoComplete="off" />
      </label>
      {editions.length > 1 && (
        <label>
          <span>Tafsir</span>
          <select value={settings.edition} onChange={(e) => onChange({ ...settings, edition: e.target.value })}>
            {editions.map((ed) => <option key={ed.slug} value={ed.slug}>{ed.title}</option>)}
          </select>
        </label>
      )}
      <button type="submit" className="btn btn-light" disabled={!dirty}>Connect</button>
    </form>
  )
}

function SurahList({ surahs, current, onPick }) {
  const [q, setQ] = useState('')
  const shown = surahs.filter((s) => !q || String(s.number) === q || s.name_en.toLowerCase().includes(q.toLowerCase()) || s.name_ar.includes(q))

  return (
    <nav className="sidebar" aria-label="Surahs">
      <input className="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find a surah…" />
      <ul>
        {shown.map((s) => (
          <li key={s.number}>
            <button className={s.number === current ? 'surah active' : 'surah'} onClick={() => onPick(s.number)}>
              <span className="num">{s.number}</span>
              <span className="en">{s.name_en}</span>
              <span className="ar" dir="rtl">{s.name_ar}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

function SurahEditor({ api, edition, surahNumber, canEdit, notify }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [building, setBuilding] = useState(false)

  const reload = useCallback(() => {
    return api.surah(edition, surahNumber).then(setData).catch((e) => setError(e.message))
  }, [api, edition, surahNumber])

  useEffect(() => { reload() }, [reload])

  if (error) return <div className="empty"><p>{error}</p></div>
  if (!data) return <div className="empty muted">Loading…</div>

  const withAudio = data.ayahs.filter((a) => a.tafsir?.audio).length
  const withText = data.ayahs.filter((a) => a.tafsir?.text).length

  const rebuild = async () => {
    setBuilding(true)
    try {
      const p = await api.buildPackage(edition, 'surah', surahNumber)
      notify(`Package ${p.name} rebuilt · ${(p.size_bytes / 1048576).toFixed(1)} MB`)
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setBuilding(false)
    }
  }

  return (
    <>
      <section className="surah-head">
        <div>
          <h1><span dir="rtl" className="ar-title">{data.surah.name_ar}</span> <span className="muted">{data.surah.number}. {data.surah.name_en}</span></h1>
          <div className="stats">
            <span className="chip">{data.surah.ayah_count} ayahs</span>
            <span className={`chip ${withText === data.ayahs.length ? 'chip-ok' : 'chip-warn'}`}>text {withText}/{data.ayahs.length}</span>
            <span className={`chip ${withAudio === data.ayahs.length ? 'chip-ok' : 'chip-warn'}`}>audio {withAudio}/{data.ayahs.length}</span>
            <span className="chip">pages {data.surah.pages.join('–')}</span>
          </div>
        </div>
        {canEdit && (
          <button className="btn" onClick={rebuild} disabled={building}>
            {building ? 'Building…' : 'Rebuild download package'}
          </button>
        )}
      </section>

      {!canEdit && <p className="hint">Viewing only. Enter the admin token above to edit text and upload audio.</p>}

      {data.intros.map((intro) => (
        <div key={intro.url} className="card intro">
          <div className="card-head"><span className="key">{data.surah.number}:0</span><span>{intro.label}</span></div>
          <AudioRow
            audio={intro}
            canEdit={canEdit}
            onUpload={(file, ms) => api.uploadAudio(edition, surahNumber, 0, file, ms)}
            onDelete={() => api.deleteAudio(edition, surahNumber, 0)}
            onChanged={reload}
            notify={notify}
          />
        </div>
      ))}

      {data.ayahs.map((ayah) => (
        <AyahCard key={ayah.key} api={api} edition={edition} ayah={ayah} canEdit={canEdit} notify={notify} onChanged={reload} />
      ))}
    </>
  )
}

function AyahCard({ api, edition, ayah, canEdit, notify, onChanged }) {
  const original = ayah.tafsir?.text ?? ''
  const [text, setText] = useState(original)
  const [saving, setSaving] = useState(false)
  const dirty = text.trim() !== original.trim()

  const save = async () => {
    setSaving(true)
    try {
      await api.saveText(edition, ayah.surah, ayah.number, text)
      notify(`Saved ${ayah.key}`)
      onChanged()
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <article className="card">
      <div className="card-head">
        <span className="key">{ayah.key}</span>
        <span className="muted">page {ayah.page} · juz {ayah.juz}</span>
        {ayah.tafsir?.audio?.needs_review && <span className="chip chip-warn">audio needs review</span>}
      </div>
      <p className="quran" dir="rtl" lang="ar">{ayah.text.uthmani} <span className="ayah-no">﴿{ayah.number.toLocaleString('ar-EG')}﴾</span></p>
      <textarea
        className="tafsir"
        dir="rtl"
        lang="ckb"
        value={text}
        readOnly={!canEdit}
        rows={Math.min(12, Math.max(3, Math.ceil(text.length / 90)))}
        onChange={(e) => setText(e.target.value)}
        placeholder="No tafsir text yet"
      />
      {canEdit && dirty && (
        <div className="row-actions">
          <button className="btn" onClick={save} disabled={saving || !text.trim()}>{saving ? 'Saving…' : 'Save text'}</button>
          <button className="btn btn-ghost" onClick={() => setText(original)} disabled={saving}>Undo</button>
        </div>
      )}
      <AudioRow
        audio={ayah.tafsir?.audio}
        canEdit={canEdit}
        onUpload={(file, ms) => api.uploadAudio(edition, ayah.surah, ayah.number, file, ms)}
        onDelete={() => api.deleteAudio(edition, ayah.surah, ayah.number)}
        onChanged={onChanged}
        notify={notify}
      />
    </article>
  )
}

function AudioRow({ audio, canEdit, onUpload, onDelete, onChanged, notify }) {
  const [busy, setBusy] = useState(false)

  const upload = async (file) => {
    if (!file) return
    setBusy(true)
    try {
      await onUpload(file, await audioDuration(file))
      notify('Audio uploaded')
      onChanged()
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm('Delete this audio clip? It is removed from storage.')) return
    setBusy(true)
    try {
      await onDelete()
      notify('Audio deleted')
      onChanged()
    } catch (e) {
      notify(e.message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="audio-row">
      {audio ? (
        <>
          <audio controls preload="none" src={audio.url} />
          <span className="muted small">{audio.duration_ms ? `${(audio.duration_ms / 1000).toFixed(1)} s` : ''}</span>
        </>
      ) : (
        <span className="muted small">No audio</span>
      )}
      {canEdit && (
        <span className="audio-actions">
          <label className={`btn btn-ghost ${busy ? 'disabled' : ''}`}>
            {busy ? 'Working…' : audio ? 'Replace MP3' : 'Upload MP3'}
            <input type="file" accept="audio/mpeg,.mp3" hidden disabled={busy} onChange={(e) => { upload(e.target.files[0]); e.target.value = '' }} />
          </label>
          {audio && <button className="btn btn-ghost btn-danger" onClick={remove} disabled={busy}>Delete</button>}
        </span>
      )}
    </div>
  )
}
