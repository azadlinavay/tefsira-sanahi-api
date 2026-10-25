import { useQuery } from '@tanstack/react-query'

/**
 * Client for the Tefsira Sanahi API. The web app is served from the same
 * domain, so every path is relative (/api/v1/...). Docs: /docs.
 */
export const EDITION = 'tehsin-duski-ku'

export interface Surah {
  number: number
  name_ar: string
  name_en: string
  revelation_place: 'makkah' | 'madinah'
  ayah_count: number
  pages: [number, number]
  juz_start: number
  has_basmala: boolean
}

export interface Clip {
  url: string
  duration_ms: number | null
  size_bytes: number | null
  needs_review: boolean
}

export interface Ayah {
  id: number
  key: string
  surah: number
  number: number
  page: number
  juz: number
  text: { uthmani: string; simple: string; hafs_smart: string }
  tafsir?: { edition: string; text: string | null; audio: Clip | null }
}

export interface SearchPage<T> {
  current_page: number
  last_page: number
  total: number
  data: T[]
}
export type SearchMode = 'all' | 'any' | 'phrase'
export interface SearchOptions {
  q: string
  scope: 'all' | 'quran' | 'tafsir'
  mode: SearchMode
  surah?: number
  juz?: number
  page: number
}
export interface SearchResult {
  query: string
  mode: SearchMode
  /** Normalised words the server matched, for highlighting. */
  words: string[]
  quran: SearchPage<{ key: string; page: number; juz: number; text: string }> | null
  tafsir: SearchPage<{ key: string; page: number; edition: string; snippet: string }> | null
}

export interface Donation {
  phone: string
  phone_e164: string
  website?: string
  methods: { id: string; name: string }[]
  message: Record<'ku' | 'en' | 'ar', string>
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`/api/v1${path}`, { headers: { Accept: 'application/json' } })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(body.message ?? `HTTP ${res.status}`)
  return body.data as T
}

const forever = { staleTime: Infinity, gcTime: Infinity }

export const useSurahs = () => useQuery({ queryKey: ['surahs'], queryFn: () => get<Surah[]>('/surahs'), ...forever })

export const useTafsirSurah = (surah: number) =>
  useQuery({
    queryKey: ['tafsir-surah', surah],
    queryFn: () =>
      get<{ surah: Surah; intros: (Clip & { label: string })[]; ayahs: Ayah[] }>(`/tafsirs/${EDITION}/surahs/${surah}`),
    enabled: surah > 0,
    ...forever,
  })

export const useTafsirAyah = (key: string | null) =>
  useQuery({
    queryKey: ['tafsir-ayah', key],
    queryFn: () => get<Ayah>(`/tafsirs/${EDITION}/ayahs/${key!.replace(':', '/')}`),
    enabled: !!key,
    ...forever,
  })

export const useSearch = (o: SearchOptions) =>
  useQuery({
    queryKey: ['search', o],
    queryFn: () => {
      const p = new URLSearchParams({ q: o.q, in: o.scope, mode: o.mode, per_page: '20', quran_page: String(o.page), tafsir_page: String(o.page) })
      if (o.surah) p.set('surah', String(o.surah))
      if (o.juz) p.set('juz', String(o.juz))
      return get<SearchResult>(`/search?${p}`)
    },
    enabled: o.q.trim().length >= 2,
    staleTime: 5 * 60_000,
    placeholderData: (prev) => prev,
  })

export const useDonation = () => useQuery({ queryKey: ['donation'], queryFn: () => get<Donation>('/donation'), ...forever })
