/**
 * Static Quran data served with the app (public/data, built by
 * tool/build_data.py): ayah order and meta, Mushaf layouts and the words of
 * each script. Everything is fetched once and cached for the session.
 */

export interface AyahMeta {
  surah: number
  ayah: number
  juz: number
  /** Page in the Madinah 1421 print. */
  page: number
}

export type LineType = 'h' | 'b' | 'a'
export interface LayoutLine {
  t: LineType
  s?: number
  /** Runs of words: [surah, ayah, first word, last word] (0-based). */
  w?: [number, number, number, number][]
  em?: number
  c?: 1
}
export interface LayoutPage {
  p: number
  l: LayoutLine[]
}
export interface Layout {
  refEm: number
  pages: LayoutPage[]
  linesPerPage: number
  /** First page of every ayah, keyed "surah:ayah". */
  pageOf: Map<string, number>
}

export interface Edition {
  id: string
  name: string
  details: string
  layout: string
  words: string
  font?: string
  /** V1: a font per page (fonts/v1/p<page>.ttf). */
  pageFonts?: boolean
  /** Pages 1–2 are the decorated Madinah opening pages. */
  opening?: boolean
}

export const EDITIONS: Edition[] = [
  { id: 'madinah1421', name: 'مسحەفا مەدینێ ١٤٢١', details: 'KFGQPC V2 · ٦٠٤ لاپەر · ١٥ ڕێز', layout: 'madinah1421', words: 'words_v2', font: 'HafsSmart', opening: true },
  { id: 'madinah1405', name: 'مسحەفا مەدینێ ١٤٠٥', details: 'KFGQPC V1 · ٦٠٤ لاپەر · ١٥ ڕێز', layout: 'v1', words: 'words_v1', pageFonts: true, opening: true },
  { id: 'qatar', name: 'مسحەفا قەتەرێ', details: 'KFGQPC Hafs · ٦٠٤ لاپەر · ١٥ ڕێز', layout: 'qatar', words: 'words_hafs', font: 'UthmanicHafs', opening: true },
  { id: 'digital_khatt', name: 'دیجیتال خەت', details: 'Digital Khatt · ٦٠٤ لاپەر · ١٥ ڕێز', layout: 'digital_khatt', words: 'words_dk', font: 'DigitalKhatt', opening: true },
  { id: 'nastaleeq', name: 'نەستەعلیق', details: 'KFGQPC Nastaleeq · ٦١٠ لاپەر · ١٥ ڕێز', layout: 'nastaleeq', words: 'words_nastaleeq', font: 'KFGQPCNastaleeq' },
  { id: 'indopak15', name: 'هندی ١٥ ڕێز (قدرة الله)', details: 'IndoPak · ٦١٠ لاپەر · ١٥ ڕێز', layout: 'indopak15', words: 'words_indopak', font: 'IndopakNastaleeq' },
  { id: 'indopak16', name: 'هندی ١٦ ڕێز (تاج)', details: 'IndoPak · ٥٤٨ لاپەر · ١٦ ڕێز', layout: 'indopak16', words: 'words_indopak', font: 'IndopakNastaleeq' },
  { id: 'indopak13q', name: 'هندی ١٣ ڕێز (قدرة الله)', details: 'IndoPak · ٨٤٩ لاپەر · ١٣ ڕێز', layout: 'indopak13q', words: 'words_indopak', font: 'IndopakNastaleeq' },
  { id: 'indopak13t', name: 'هندی ١٣ ڕێز (تاج)', details: 'IndoPak · ٨٤٧ لاپەر · ١٣ ڕێز', layout: 'indopak13t', words: 'words_indopak', font: 'IndopakNastaleeq' },
  { id: 'indopak9', name: 'هندی ٩ ڕێز (گابا)', details: 'IndoPak · ١٨٩٠ لاپەر · ٩ ڕێز', layout: 'indopak9', words: 'words_indopak', font: 'IndopakNastaleeq' },
]

export const editionById = (id: string) => EDITIONS.find((e) => e.id === id) ?? EDITIONS[0]

const cache = new Map<string, Promise<unknown>>()
function json<T>(path: string): Promise<T> {
  if (!cache.has(path)) {
    cache.set(
      path,
      fetch(path).then((r) => {
        if (!r.ok) throw new Error(`${path}: HTTP ${r.status}`)
        return r.json()
      }),
    )
  }
  return cache.get(path) as Promise<T>
}

// ── Ayah order and meta ──────────────────────────────────────────────
export interface AyahIndex {
  list: AyahMeta[]
  indexOf: Map<string, number>
}
let ayahIndex: Promise<AyahIndex> | null = null
export function loadAyahs(): Promise<AyahIndex> {
  return (ayahIndex ??= json<[number, number, number, number][]>('/data/ayahs.json').then((rows) => {
    const list = rows.map(([surah, ayah, juz, page]) => ({ surah, ayah, juz, page }))
    const indexOf = new Map(list.map((a, i) => [`${a.surah}:${a.ayah}`, i]))
    return { list, indexOf }
  }))
}

// ── Layouts and words ────────────────────────────────────────────────
export function loadLayout(edition: Edition): Promise<Layout> {
  const key = `layout:${edition.layout}`
  if (!cache.has(key)) {
    cache.set(
      key,
      json<{ refEm: number; pages: LayoutPage[] }>(`/data/mushaf/${edition.layout}.json`).then((raw) => {
        const pageOf = new Map<string, number>()
        let linesPerPage = 15
        for (const page of raw.pages) {
          linesPerPage = Math.max(linesPerPage, page.l.length)
          for (const line of page.l) {
            for (const [s, a] of line.w ?? []) {
              const k = `${s}:${a}`
              if (!pageOf.has(k)) pageOf.set(k, page.p)
            }
          }
        }
        return { refEm: raw.refEm, pages: raw.pages, linesPerPage, pageOf }
      }),
    )
  }
  return cache.get(key) as Promise<Layout>
}

export const loadWords = (file: string) => json<string[][]>(`/data/mushaf/${file}.json`)
export const loadImlaei = () => json<string[][]>('/data/words_imlaei.json')

// ── Fonts ────────────────────────────────────────────────────────────
const fontLoads = new Map<string, Promise<void>>()

/** The font family a page is drawn in (V1 has one per page). */
export const fontFamilyFor = (edition: Edition, page: number) =>
  edition.pageFonts ? `QCFv1P${page}` : edition.font ?? 'HafsSmart'

/** Loads the font a page needs; resolves at once when already loaded. */
export function ensureFont(edition: Edition, page: number): Promise<void> {
  const family = fontFamilyFor(edition, page)
  if (!fontLoads.has(family)) {
    const src = edition.pageFonts ? `/fonts/v1/p${page}.ttf` : null
    fontLoads.set(
      family,
      src
        ? new FontFace(family, `url(${src})`, { display: 'block' }).load().then((f) => {
            document.fonts.add(f)
          })
        : document.fonts.load(`20px "${family}"`).then(() => undefined),
    )
  }
  return fontLoads.get(family)!
}

// ── Tajweed ──────────────────────────────────────────────────────────
export type TajweedRun = string | [number, string]
export interface Tajweed {
  rules: string[]
  ayahs: Record<string, TajweedRun[][]>
}
export const loadTajweed = () => json<Tajweed>('/data/quran_tajweed.json')

/** Madinah-Mushaf colours per rule, and brighter ones for dark paper. */
export const TAJWEED_COLORS: Record<string, [string, string, string]> = {
  ham_wasl: ['#9E9E9E', '#8A8A8A', 'همزة الوصل'],
  laam_shamsiyah: ['#9E9E9E', '#8A8A8A', 'لام شمسية'],
  slnt: ['#9E9E9E', '#8A8A8A', 'حرف لا يُلفظ'],
  madda_normal: ['#537FFF', '#7FA2FF', 'مد طبيعي'],
  madda_permissible: ['#4050FF', '#7A86FF', 'مد جائز'],
  madda_obligatory: ['#2144C1', '#6C8BFF', 'مد واجب'],
  madda_necessary: ['#000EBC', '#5A68FF', 'مد لازم'],
  qalaqah: ['#DD0008', '#FF5A5F', 'قلقلة'],
  ikhafa: ['#9400A8', '#D45CE6', 'إخفاء'],
  ikhafa_shafawi: ['#D500B7', '#FF5CE1', 'إخفاء شفوي'],
  idgham_ghunnah: ['#169777', '#3FD1AB', 'إدغام بغنة'],
  idgham_wo_ghunnah: ['#169200', '#52C93A', 'إدغام بلا غنة'],
  idgham_shafawi: ['#58B800', '#8AE23A', 'إدغام شفوي'],
  idgham_mutajanisayn: ['#A1A1A1', '#9A9A9A', 'إدغام متجانسين'],
  idgham_mutaqaribayn: ['#A1A1A1', '#9A9A9A', 'إدغام متقاربين'],
  iqlab: ['#26BFFD', '#5CD2FF', 'إقلاب'],
  ghunnah: ['#FF7E1E', '#FFA25C', 'غنة'],
}

// ── Reciters ─────────────────────────────────────────────────────────
export interface Reciter {
  id: string
  name: string
  url: string
}
export const loadReciters = () => json<{ default: string; reciters: Reciter[] }>('/data/reciters.json')

export function recitationUrl(reciter: Reciter, surah: number, ayah: number, id: number): string {
  return reciter.url
    .replace('{sss}', String(surah).padStart(3, '0'))
    .replace('{aaa}', String(ayah).padStart(3, '0'))
    .replace('{id}', String(id))
}

/** Tehsin Duski's tafsir clip (ayah 0 = the intro before Al-Fatiha). */
export const tafsirAudioUrl = (surah: number, ayah: number) => {
  const s = String(surah).padStart(3, '0')
  return `/storage/tehsin-duski-ku/audio/${s}/${s}${String(ayah).padStart(3, '0')}.mp3`
}
