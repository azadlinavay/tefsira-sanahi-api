import { useSyncExternalStore } from 'react'
import { getSettings } from './settings'
import { loadAyahs, loadReciters, recitationUrl, tafsirAudioUrl, type AyahMeta } from './quran'

/**
 * One audio player for the whole site. Plays an ayah's recitation, its
 * Kurdish tafsir, or both one after the other; can repeat each ayah, follow
 * on to the next ayah (across surahs), change speed, and shows on the
 * lock screen / media keys (Media Session API).
 */
export type Track = 'recitation' | 'tafsir'

export interface PlayerState {
  /** "surah:ayah" being played; "1:0" = the a'udhu billah intro. */
  key: string | null
  track: Track
  playing: boolean
  loading: boolean
  duration: number
  error: string | null
}

const audio = new Audio()
audio.preload = 'auto'

let state: PlayerState = { key: null, track: 'recitation', playing: false, loading: false, duration: 0, error: null }
const listeners = new Set<() => void>()
let repeatsLeft = 0

/**
 * Listening session (the Listen page): playback stops after `endKey` (end of
 * a surah or juz) and/or at `sleepAt` (a time, ms). Ends with stop().
 */
export interface Session {
  /** A listening session is on: play on to the next ayah regardless of auto-play. */
  active: boolean
  endKey: string | null
  sleepAt: number | null
}
let session: Session = { active: false, endKey: null, sleepAt: null }
let sleepTimer: number | undefined
const sessionListeners = new Set<() => void>()
export const subscribeSession = (l: () => void) => {
  sessionListeners.add(l)
  return () => sessionListeners.delete(l)
}
export const useSession = () => useSyncExternalStore(subscribeSession, () => session)

export function setSession(patch: Partial<Session>) {
  session = { ...session, ...patch }
  clearTimeout(sleepTimer)
  if (session.sleepAt) sleepTimer = window.setTimeout(() => {
    audio.pause()
    setSession({ sleepAt: null, active: false })
  }, Math.max(0, session.sleepAt - Date.now()))
  sessionListeners.forEach((l) => l())
}

/** Surah names for the lock screen, filled in by the app once loaded. */
let surahNames: string[] = []
export const setSurahNames = (names: string[]) => {
  surahNames = names
}
/** A track the listener picked (e.g. tafsir audio): following ayahs keep it. */
let chosenTrack: Track | null = null

function set(patch: Partial<PlayerState>) {
  state = { ...state, ...patch }
  listeners.forEach((l) => l())
}

export const subscribePlayer = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

export const usePlayer = () => useSyncExternalStore(subscribePlayer, () => state)
export const getPlayer = () => state

/** Current position in seconds, for progress bars (polled by the UI). */
export const currentTime = () => audio.currentTime

async function urlFor(key: string, track: Track): Promise<string | null> {
  const [s, a] = key.split(':').map(Number)
  if (track === 'tafsir') return tafsirAudioUrl(s, a)
  if (a === 0) return null
  const [{ reciters, default: def }, { indexOf }] = await Promise.all([loadReciters(), loadAyahs()])
  const reciter = reciters.find((r) => r.id === getSettings().reciter) ?? reciters.find((r) => r.id === def)!
  return recitationUrl(reciter, s, a, (indexOf.get(key) ?? 0) + 1)
}

/** First track for a new ayah, from the play mode. */
const firstTrack = (): Track => chosenTrack ?? (getSettings().playMode === 'tafsir' ? 'tafsir' : 'recitation')

async function start(key: string, track: Track) {
  const url = await urlFor(key, track)
  if (!url) return
  set({ key, track, loading: true, error: null })
  audio.src = url
  audio.playbackRate = getSettings().rate
  try {
    await audio.play()
  } catch (e) {
    // A newer play() interrupted this one: not an error.
    if ((e as Error).name !== 'AbortError') set({ loading: false, playing: false, error: 'دەنگ نەهاتە لێدان' })
  }
  updateMediaSession()
}

/** Plays an ayah; `track` overrides the play mode for this ayah. */
export function playAyah(key: string, track?: Track) {
  repeatsLeft = Math.max(0, getSettings().repeat - 1)
  if (!key.endsWith(':0')) chosenTrack = track ?? null
  void start(key, track ?? (key.endsWith(':0') ? 'tafsir' : firstTrack()))
}

export function toggle(key?: string, track?: Track) {
  if (key && (key !== state.key || (track && track !== state.track))) return playAyah(key, track)
  if (!state.key) return
  if (audio.paused) void audio.play()
  else audio.pause()
}

export function stop() {
  chosenTrack = null
  setSession({ active: false, endKey: null, sleepAt: null })
  audio.pause()
  audio.removeAttribute('src')
  set({ key: null, playing: false, loading: false, duration: 0 })
}

export function seek(fraction: number) {
  if (audio.duration) audio.currentTime = fraction * audio.duration
}

export function setRate(rate: number) {
  audio.playbackRate = rate
}

/** The ayah before/after `key` in the Mushaf, or null at either end. */
export async function neighbour(key: string, delta: 1 | -1): Promise<AyahMeta | null> {
  const { list, indexOf } = await loadAyahs()
  const i = indexOf.get(key)
  if (i === undefined) return key === '1:0' && delta === 1 ? list[0] : null
  return list[i + delta] ?? null
}

export async function skip(delta: 1 | -1) {
  if (!state.key) return
  const next = await neighbour(state.key, delta)
  if (!next) return
  repeatsLeft = Math.max(0, getSettings().repeat - 1)
  void start(`${next.surah}:${next.ayah}`, firstTrack())
}

audio.addEventListener('playing', () => set({ playing: true, loading: false }))
audio.addEventListener('pause', () => set({ playing: false }))
audio.addEventListener('waiting', () => set({ loading: true }))
audio.addEventListener('loadedmetadata', () => set({ duration: audio.duration || 0 }))
audio.addEventListener('error', () => set({ loading: false, playing: false, error: 'دەنگ نەهاتە بارکرن' }))
audio.addEventListener('ended', async () => {
  const { key, track } = state
  if (!key) return
  // Recitation first, then tafsir, in "both" mode.
  if (track === 'recitation' && getSettings().playMode === 'both' && !chosenTrack) return void start(key, 'tafsir')
  if (repeatsLeft > 0) {
    repeatsLeft--
    return void start(key, firstTrack())
  }
  // End of the listening range (surah or juz).
  if (session.endKey === key) {
    setSession({ active: false, endKey: null })
    return set({ playing: false })
  }
  if (!getSettings().autoplay && !session.active) return set({ playing: false })
  const next = await neighbour(key, 1)
  if (next) {
    repeatsLeft = Math.max(0, getSettings().repeat - 1)
    void start(`${next.surah}:${next.ayah}`, firstTrack())
  } else set({ playing: false })
})

function updateMediaSession() {
  if (!('mediaSession' in navigator) || !state.key) return
  const [s, a] = state.key.split(':')
  navigator.mediaSession.metadata = new MediaMetadata({
    title: a === '0' ? 'أعوذ بالله' : `${surahNames[Number(s) - 1] ?? `سورة ${s}`} · ${a}`,
    artist: state.track === 'tafsir' ? 'تەفسیرا ساناهی · تەحسین دۆسکی' : 'قورئانا پیروز',
    album: 'تەفسیرا ساناهی',
    artwork: [{ src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' }],
  })
}

if ('mediaSession' in navigator) {
  navigator.mediaSession.setActionHandler('play', () => void audio.play())
  navigator.mediaSession.setActionHandler('pause', () => audio.pause())
  navigator.mediaSession.setActionHandler('nexttrack', () => void skip(1))
  navigator.mediaSession.setActionHandler('previoustrack', () => void skip(-1))
  navigator.mediaSession.setActionHandler('stop', () => stop())
  navigator.mediaSession.setActionHandler('seekto', (d) => {
    if (d.seekTime != null) audio.currentTime = d.seekTime
  })
  navigator.mediaSession.setActionHandler('seekbackward', (d) => {
    audio.currentTime = Math.max(0, audio.currentTime - (d.seekOffset ?? 10))
  })
  navigator.mediaSession.setActionHandler('seekforward', (d) => {
    audio.currentTime = Math.min(audio.duration || 0, audio.currentTime + (d.seekOffset ?? 10))
  })
  // Lock-screen progress bar.
  const position = () => {
    if (!audio.duration || !isFinite(audio.duration)) return
    try {
      navigator.mediaSession.setPositionState({ duration: audio.duration, position: Math.min(audio.currentTime, audio.duration), playbackRate: audio.playbackRate })
    } catch {
      // older browsers
    }
  }
  audio.addEventListener('loadedmetadata', position)
  audio.addEventListener('seeked', position)
  audio.addEventListener('playing', () => {
    navigator.mediaSession.playbackState = 'playing'
    position()
  })
  audio.addEventListener('pause', () => {
    navigator.mediaSession.playbackState = 'paused'
  })
}
