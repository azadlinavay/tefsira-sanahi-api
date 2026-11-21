import { useCallback, useEffect, useState } from 'react'

const KINDS = { problem: 'Problem', tafsir: 'Tafsir mistake', suggestion: 'Suggestion', review: 'Review', other: 'Other' }
const PLATFORMS = { web: 'Website', android: 'Android', ios: 'iPhone', windows: 'Windows' }
const FILTERS = [['new', 'New'], ['seen', 'Seen'], ['done', 'Done'], ['', 'All']]

const when = (iso) => new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })

/** Feedback from the website and the apps: read it, mark it, note it, delete it. */
export function FeedbackInbox({ api, canEdit, notify, onOpenAyah }) {
  const [status, setStatus] = useState('new')
  const [page, setPage] = useState(1)
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  const load = useCallback(() => {
    setError(null)
    api.feedback(status, page).then(setResult).catch((e) => setError(e.message))
  }, [api, status, page])
  useEffect(() => {
    if (canEdit) load()
  }, [canEdit, load])

  if (!canEdit) {
    return (
      <div className="empty">
        <h2>Feedback needs the admin token</h2>
        <p className="muted">Enter the admin token above to read what people send from the website and the apps.</p>
      </div>
    )
  }

  const counts = result?.meta?.counts ?? {}
  const update = async (item, patch, done) => {
    try {
      await api.updateFeedback(item.id, patch)
      notify(done)
      load()
    } catch (e) {
      notify(e.message, 'error')
    }
  }
  const remove = async (item) => {
    try {
      await api.deleteFeedback(item.id)
      notify('Deleted')
      load()
    } catch (e) {
      notify(e.message, 'error')
    }
  }

  return (
    <section className="feedback">
      <div className="feedback-head">
        <h1>Feedback</h1>
        <div className="seg" role="tablist">
          {FILTERS.map(([id, label]) => (
            <button key={id || 'all'} aria-pressed={status === id} onClick={() => { setStatus(id); setPage(1) }}>
              {label}
              {id && counts[id] ? <span className="count">{counts[id]}</span> : null}
            </button>
          ))}
        </div>
        <button className="btn btn-light" onClick={load}>Refresh</button>
      </div>
      {error && <p className="error">{error}</p>}
      {result && result.data.length === 0 && <p className="muted empty-line">Nothing here.</p>}
      <ul className="feedback-list">
        {result?.data.map((f) => (
          <FeedbackItem key={f.id} item={f} onUpdate={update} onDelete={remove} onOpenAyah={onOpenAyah} />
        ))}
      </ul>
      {result && result.meta.last_page > 1 && (
        <div className="pager">
          <button className="btn btn-light" disabled={page <= 1} onClick={() => setPage(page - 1)}>Newer</button>
          <span className="muted">Page {page} of {result.meta.last_page}</span>
          <button className="btn btn-light" disabled={page >= result.meta.last_page} onClick={() => setPage(page + 1)}>Older</button>
        </div>
      )}
    </section>
  )
}

function FeedbackItem({ item, onUpdate, onDelete, onOpenAyah }) {
  const [note, setNote] = useState(item.note ?? '')
  const [confirm, setConfirm] = useState(false)
  return (
    <li className={`feedback-item status-${item.status}`}>
      <div className="feedback-meta">
        <span className={`badge kind-${item.kind}`}>{KINDS[item.kind] ?? item.kind}</span>
        <span>{PLATFORMS[item.platform] ?? item.platform}{item.app_version ? ` ${item.app_version}` : ''}</span>
        <span className="muted">{when(item.created_at)}</span>
        {item.rating ? <span aria-label={`${item.rating} of 5`}>{'★'.repeat(item.rating)}{'☆'.repeat(5 - item.rating)}</span> : null}
        {item.ayah_key && (
          <button className="link" onClick={() => onOpenAyah(item.ayah_key)}>
            Ayah {item.ayah_key}
          </button>
        )}
      </div>
      <p className="feedback-message" dir="auto">{item.message}</p>
      <div className="feedback-extra">
        {item.contact && <span>Contact: <b dir="auto">{item.contact}</b></span>}
        {item.page && <span className="muted">From {item.page}</span>}
      </div>
      <div className="feedback-actions">
        <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note for the team" aria-label="Note" />
        {note !== (item.note ?? '') && <button className="btn btn-light" onClick={() => onUpdate(item, { note }, 'Note saved')}>Save note</button>}
        {item.status !== 'seen' && <button className="btn btn-light" onClick={() => onUpdate(item, { status: 'seen' }, 'Marked seen')}>Mark seen</button>}
        {item.status !== 'done' && <button className="btn" onClick={() => onUpdate(item, { status: 'done' }, 'Marked done')}>Done</button>}
        {confirm ? (
          <>
            <button className="btn btn-danger" onClick={() => onDelete(item)}>Delete for good</button>
            <button className="btn btn-light" onClick={() => setConfirm(false)}>Keep</button>
          </>
        ) : (
          <button className="btn btn-light" onClick={() => setConfirm(true)}>Delete</button>
        )}
      </div>
    </li>
  )
}
