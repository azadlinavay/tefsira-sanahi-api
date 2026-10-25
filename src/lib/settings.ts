import { useSyncExternalStore } from 'react'

/** Reader preferences, kept in this browser (localStorage). */
export type Theme = 'system' | 'light' | 'dark'
export type Script = 'uthmani' | 'tajweed' | 'imlaei'
export type PlayMode = 'recitation' | 'tafsir' | 'both'

export interface Settings {
  theme: Theme
  paper: string
  edition: string
  script: Script
  mushafScale: number
  tafsirSize: number
  reciter: string
  playMode: PlayMode
  autoplay: boolean
  rate: number
  repeat: number
  lastPage: number
  /** Last ayah read in the scroll view ("surah:ayah"). */
  lastKey: string
  bookmarks: string[]
  /** Word by word: meanings under each word in the tafsir panel, and on hover. */
  wbw: boolean
  wbwLang: string
  /** How surahs open: one long scrolling page (default) or Mushaf pages. */
  readView: 'scroll' | 'page'
  /** Quran text size in the scroll view (px). */
  scrollSize: number
  /** Show each ayah's tafsir under it in the scroll view. */
  scrollTafsir: boolean
  /** Set once saved settings have moved to the light default. */
  themeV2?: boolean
  /** Set once saved settings have moved to the "both" play mode. */
  playModeV2?: boolean
}

const defaults: Settings = {
  theme: 'light', // dark only when someone picks it
  paper: 'auto',
  edition: 'madinah1421',
  script: 'uthmani',
  mushafScale: 1,
  tafsirSize: 18,
  reciter: 'alafasy',
  playMode: 'both', // each ayah, then its Kurdish tafsir
  autoplay: true,
  rate: 1,
  repeat: 1,
  lastPage: 1,
  lastKey: '1:1',
  bookmarks: [],
  wbw: true,
  wbwLang: 'en',
  readView: 'scroll',
  scrollSize: 34,
  scrollTafsir: false,
}

const KEY = 'tefsira.settings'
const listeners = new Set<() => void>()

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return defaults
    const saved = JSON.parse(raw)
    // Earlier versions followed the device; light is the default now.
    if (saved.theme === 'system' && !saved.themeV2) saved.theme = 'light'
    // Play now reads the tafsir after each ayah unless changed after this.
    if (!saved.playModeV2) saved.playMode = 'both'
    return { ...defaults, ...saved, themeV2: true, playModeV2: true }
  } catch {
    return defaults
  }
}

let state = load()

export function getSettings(): Settings {
  return state
}

export function setSettings(patch: Partial<Settings>): void {
  state = { ...state, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(state))
  } catch {
    // private browsing: settings last for this tab only
  }
  listeners.forEach((l) => l())
}

function subscribe(l: () => void) {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** The whole settings object, or one slice of it (re-renders only on change). */
export function useSettings(): Settings
export function useSettings<T>(pick: (s: Settings) => T): T
export function useSettings<T>(pick?: (s: Settings) => T) {
  return useSyncExternalStore(subscribe, () => (pick ? pick(state) : state))
}

export function toggleBookmark(key: string): void {
  const has = state.bookmarks.includes(key)
  setSettings({
    bookmarks: has ? state.bookmarks.filter((k) => k !== key) : [key, ...state.bookmarks],
  })
}

// Keep other tabs in sync.
window.addEventListener('storage', (e) => {
  if (e.key === KEY) {
    state = load()
    listeners.forEach((l) => l())
  }
})
