import { useQuery } from '@tanstack/react-query'
import { pad3 } from './arabic'
import { getPlayer, toggle } from './audio'

/**
 * Word by word: every Quran word with its transliteration and meaning, and
 * its own recitation (as on quran.com). Data: public/data/wbw/<surah>.json,
 * built by tool/build_wbw.py.
 */
export const WBW_LANGS: [string, string][] = [
  ['en', 'English'],
  ['fa', 'فارسی'],
  ['tr', 'Türkçe'],
  ['ur', 'اردو'],
  ['id', 'Indonesia'],
]

export interface WbwSurah {
  ar: string[][]
  tl: string[][]
  [lang: string]: string[][]
}

export const loadWbw = (surah: number): Promise<WbwSurah> => fetch(`/data/wbw/${surah}.json`).then((r) => r.json())

export const useWbw = (surah: number | null) =>
  useQuery({ queryKey: ['wbw', surah], queryFn: () => loadWbw(surah!), enabled: !!surah, staleTime: Infinity, gcTime: Infinity })

export const wordAudioUrl = (s: number, a: number, w: number) => `https://audio.qurancdn.com/wbw/${pad3(s)}_${pad3(a)}_${pad3(w)}.mp3`

let wordAudio: HTMLAudioElement | null = null

/** Plays one word (1-based), pausing the ayah player while it does. */
export function playWord(s: number, a: number, w: number) {
  const p = getPlayer()
  if (p.playing) toggle()
  wordAudio?.pause()
  wordAudio = new Audio(wordAudioUrl(s, a, w))
  void wordAudio.play().catch(() => undefined)
}
