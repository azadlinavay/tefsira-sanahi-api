import { useQuery } from '@tanstack/react-query'
import { useSurahs } from './api'
import { editionById, loadAyahs, loadImlaei, loadLayout, loadTajweed, loadWords } from './quran'
import type { Script } from './settings'

const forever = { staleTime: Infinity, gcTime: Infinity }

/** Everything a Mushaf view needs for an edition and script, or null while loading. */
export function useMushaf(editionId: string, script: Script) {
  const edition = editionById(editionId)
  const layout = useQuery({ queryKey: ['layout', edition.layout], queryFn: () => loadLayout(edition), ...forever })
  const words = useQuery({ queryKey: ['words', edition.words], queryFn: () => loadWords(edition.words), ...forever })
  const ayahs = useQuery({ queryKey: ['ayahs'], queryFn: loadAyahs, ...forever })
  const tajweed = useQuery({ queryKey: ['tajweed'], queryFn: loadTajweed, enabled: script === 'tajweed', ...forever })
  const imlaei = useQuery({ queryKey: ['imlaei'], queryFn: loadImlaei, enabled: script === 'imlaei', ...forever })
  const surahs = useSurahs()

  const error = layout.error ?? words.error ?? ayahs.error ?? surahs.error
  if (!layout.data || !words.data || !ayahs.data || !surahs.data) return { data: null, error }
  return {
    error: null,
    data: {
      edition,
      layout: layout.data,
      words: words.data,
      ayahs: ayahs.data,
      surahs: surahs.data,
      surahNames: surahs.data.map((s) => s.name_ar),
      tajweed: tajweed.data ?? null,
      imlaei: imlaei.data ?? null,
    },
  }
}

/** True when the reading paper is dark (theme or paper choice). */
export function isDarkPaper(paper: string): boolean {
  if (paper === 'night' || paper === 'black') return true
  if (paper !== 'auto') return false
  return document.documentElement.dataset.theme === 'dark'
}
