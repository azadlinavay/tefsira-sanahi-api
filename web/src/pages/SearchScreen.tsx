import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Icon } from '../components/Icon'
import { usePageMeta } from '../components/ui'
import { useSearch, useSurahs, type SearchMode } from '../lib/api'
import { ar, matchRanges, queryWords } from '../lib/arabic'

function Highlighted({ text, words }: { text: string; words: string[] }) {
  const out: (string | React.ReactElement)[] = []
  let at = 0
  for (const [from, to] of matchRanges(text, words)) {
    if (from > at) out.push(text.slice(at, from))
    out.push(<mark key={from}>{text.slice(from, to)}</mark>)
    at = to
  }
  out.push(text.slice(at))
  return <>{out}</>
}

const MODES: [SearchMode, string, string][] = [
  ['all', 'هەمی پەیڤ', 'هەمی پەیڤ د ئایەتێ دا هەبن، ب هەر ڕێزەکێ'],
  ['phrase', 'وەکی خۆ', 'پەیڤ پێکڤە و ب ڤێ ڕێزێ'],
  ['any', 'هەر پەیڤەک', 'ئێک ژ پەیڤان بەسە'],
]

const toLatin = (s: string) => s.replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))

/**
 * Search the Quran (plain Arabic is fine) and the Kurdish tafsir: every word,
 * the exact phrase or any word, in one surah or juz. "quotes" keep words
 * together and -word leaves results with that word out.
 */
export default function SearchScreen() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const q = params.get('q') ?? ''
  const scope = (params.get('in') as 'all' | 'quran' | 'tafsir') || 'all'
  const mode = (params.get('mode') as SearchMode) || 'all'
  const surah = Number(params.get('surah')) || undefined
  const juz = Number(params.get('juz')) || undefined
  const page = Number(params.get('p')) || 1
  const [draft, setDraft] = useState(q)
  const [showOptions, setShowOptions] = useState(mode !== 'all' || !!surah || !!juz)
  useEffect(() => setDraft(q), [q])
  usePageMeta(q ? `لێگەریان: ${q}` : 'لێگەریان', 'لێگەریان د قورئانا پیروز و تەفسیرا ساناهی دا.')

  const { data: surahs } = useSurahs()
  const { data, isFetching, error } = useSearch({ q, scope, mode, surah, juz, page })
  const name = (key: string) => surahs?.[Number(key.split(':')[0]) - 1]?.name_ar ?? ''
  const ref = q.match(/^\s*([0-9٠-٩]{1,3})\s*[:\s/.-]\s*([0-9٠-٩]{1,3})\s*$/)
  const words = useMemo(() => (mode === 'phrase' ? [q.replace(/["«»“”]/g, '')] : queryWords(q)), [q, mode])

  const set = (patch: Record<string, string>) => {
    const next = new URLSearchParams(params)
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v)
      else next.delete(k)
    }
    if (!('p' in patch)) next.delete('p')
    setParams(next)
  }
  const lastPage = Math.max(scope !== 'tafsir' ? data?.quran?.last_page ?? 1 : 1, scope !== 'quran' ? data?.tafsir?.last_page ?? 1 : 1)
  const filters = (surah ? 1 : 0) + (juz ? 1 : 0) + (mode !== 'all' ? 1 : 0)

  return (
    <div className="search-screen">
      <header className="topbar">
        <button className="icon-btn" onClick={() => (history.length > 1 ? navigate(-1) : navigate('/quran'))} aria-label="زڤرین">
          <Icon name="back" />
        </button>
        <form
          className="search-inline"
          role="search"
          onSubmit={(e) => {
            e.preventDefault()
            set({ q: draft.trim() })
          }}
        >
          <input autoFocus={!q} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="ب عەرەبی یان کوردی بنڤیسە…" aria-label="لێگەریان" />
          <button className="icon-btn plain" aria-label="لێگەریان">
            <Icon name="search" />
          </button>
        </form>
        <button className="icon-btn with-badge" aria-pressed={showOptions} onClick={() => setShowOptions((v) => !v)} aria-label="هەلبژارتنێن لێگەریانێ" title="هەلبژارتنێن لێگەریانێ">
          <Icon name="settings" />
          {filters > 0 && <span className="badge">{ar(filters)}</span>}
        </button>
      </header>
      <div className="container">
        <div className="segmented" role="tablist">
          {(
            [
              ['all', 'هەمی'],
              ['quran', `قورئان${data?.quran ? ` (${ar(data.quran.total)})` : ''}`],
              ['tafsir', `تەفسیر${data?.tafsir ? ` (${ar(data.tafsir.total)})` : ''}`],
            ] as const
          ).map(([id, label]) => (
            <button key={id} aria-pressed={scope === id} onClick={() => set({ in: id === 'all' ? '' : id })}>
              {label}
            </button>
          ))}
        </div>

        {showOptions && (
          <div className="card on-card search-options">
            <div className="opt">
              <span>چاوا بگەڕێت</span>
              <div className="segmented">
                {MODES.map(([id, label, hint]) => (
                  <button key={id} aria-pressed={mode === id} title={hint} onClick={() => set({ mode: id === 'all' ? '' : id })}>
                    {label}
                  </button>
                ))}
              </div>
              <small className="muted">{MODES.find((m) => m[0] === mode)?.[2]}</small>
            </div>
            <div className="opt-row">
              <label>
                <span>سورەت</span>
                <select value={surah ?? ''} onChange={(e) => set({ surah: e.target.value })}>
                  <option value="">هەمی سورەت</option>
                  {surahs?.map((s) => (
                    <option key={s.number} value={s.number}>
                      {ar(s.number)}. {s.name_ar}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>جوزء</span>
                <select value={juz ?? ''} onChange={(e) => set({ juz: e.target.value })}>
                  <option value="">هەمی جوزء</option>
                  {Array.from({ length: 30 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      الجزء {ar(i + 1)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="tips">
              <b>"رب العالمين"</b> پەیڤ پێکڤە · <b>صبر -صلاة</b> بێی پەیڤا دووێ · پێدڤی ب حەرەکەتان نینە · <b>٢:٢٥٥</b> بۆ چوونا ئایەتێ
            </p>
            {filters > 0 && (
              <button className="btn ghost small" onClick={() => set({ mode: '', surah: '', juz: '' })}>
                <Icon name="close" /> لابرنا هەلبژارتنان
              </button>
            )}
          </div>
        )}

        {ref && (
          <Link className="card jump" to={`/surah/${toLatin(ref[1])}/${toLatin(ref[2])}`}>
            <Icon name="chevronLeft" /> بچە بۆ {name(`${toLatin(ref[1])}:1`)} · ئایەت {ar(toLatin(ref[2]))}
          </Link>
        )}
        {!q && (
          <p className="hint">
            پەیڤەکێ ژ ئایەتەکێ یان ژ تەفسیرێ بنڤیسە. پێدڤی ب حەرەکەتان نینە.
            <br />
            ب دوکمەیا ⚙ دشێی ب پەیڤا وەکی خۆ، یان د سورەتەکێ یان جوزئەکێ دا بگەڕێی.
          </p>
        )}
        {isFetching && !data && <div className="spinner" />}
        {error && <p className="error">{(error as Error).message}</p>}

        <div className={isFetching ? 'results loading' : 'results'}>
          {scope !== 'tafsir' && data?.quran && data.quran.data.length > 0 && (
            <>
              <h2 className="section-title">ئایەت · {ar(data.quran.total)} ئەنجام</h2>
              {data.quran.data.map((r) => (
                <Link key={r.key} className="card result" to={`/surah/${r.key.replace(':', '/')}`}>
                  <small className="kicker">
                    {name(r.key)} · ئایەت {ar(r.key.split(':')[1])} · لاپەر {ar(r.page)}
                  </small>
                  <p className="r-quran" dir="rtl">
                    <Highlighted text={r.text} words={words} />
                  </p>
                </Link>
              ))}
            </>
          )}
          {scope !== 'quran' && data?.tafsir && data.tafsir.data.length > 0 && (
            <>
              <h2 className="section-title">تەفسیر · {ar(data.tafsir.total)} ئەنجام</h2>
              {data.tafsir.data.map((r) => (
                <Link key={r.key} className="card result" to={`/surah/${r.key.replace(':', '/')}`}>
                  <small className="kicker">
                    {name(r.key)} · ئایەت {ar(r.key.split(':')[1])} · لاپەر {ar(r.page)}
                  </small>
                  <p>
                    <Highlighted text={r.snippet} words={words} />
                  </p>
                </Link>
              ))}
            </>
          )}
        </div>
        {data && q && !data.quran?.total && !data.tafsir?.total && (
          <p className="hint">
            چ ئەنجام نەهاتنە دیتن.
            {mode !== 'any' && (
              <>
                {' '}
                <button className="btn ghost small" onClick={() => set({ mode: 'any' })}>
                  ب «هەر پەیڤەک» بگەڕێ
                </button>
              </>
            )}
          </p>
        )}
        {data && lastPage > 1 && (
          <nav className="pager">
            <button className="btn ghost" disabled={page <= 1} onClick={() => set({ p: String(page - 1) })}>
              <Icon name="chevronRight" /> پێشتر
            </button>
            <span>
              {ar(page)} / {ar(lastPage)}
            </span>
            <button className="btn ghost" disabled={page >= lastPage} onClick={() => set({ p: String(page + 1) })}>
              پاشتر <Icon name="chevronLeft" />
            </button>
          </nav>
        )}
      </div>
    </div>
  )
}
