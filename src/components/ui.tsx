import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

// ── Toast ──────────────────────────────────────────────────────────
let toastText: string | null = null
let toastTimer: number | undefined
const toastListeners = new Set<() => void>()

export function toast(text: string) {
  toastText = text
  toastListeners.forEach((l) => l())
  clearTimeout(toastTimer)
  toastTimer = window.setTimeout(() => {
    toastText = null
    toastListeners.forEach((l) => l())
  }, 2600)
}

export function Toasts() {
  const text = useSyncExternalStore(
    (l) => {
      toastListeners.add(l)
      return () => toastListeners.delete(l)
    },
    () => toastText,
  )
  return text ? <div className="toast" role="status">{text}</div> : null
}

// ── Sheet / dialog ─────────────────────────────────────────────────
export function Sheet({
  open,
  onClose,
  children,
  dialog = false,
  label,
}: {
  open: boolean
  onClose: () => void
  children: ReactNode
  dialog?: boolean
  label: string
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose])
  if (!open) return null
  return createPortal(
    <div className={`sheet-backdrop${dialog ? ' dialog-backdrop' : ''}`} onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} onClick={(e) => e.stopPropagation()}>
        {!dialog && <div className="grab" />}
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ── Copy and share ─────────────────────────────────────────────────
export async function copyText(text: string, done = 'هاتە کۆپیکرن') {
  try {
    await navigator.clipboard.writeText(text)
    toast(done)
  } catch {
    toast('کۆپی نەبوو')
  }
}

/** Native share sheet where available, else copy the link. */
export async function share(title: string, text: string, url: string) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text, url })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  await copyText(url, 'لینک هاتە کۆپیکرن')
}

/** Matches a CSS media query, live. */
export function useMedia(query: string) {
  const [match, setMatch] = useState(() => window.matchMedia(query).matches)
  useEffect(() => {
    const m = window.matchMedia(query)
    const on = () => setMatch(m.matches)
    m.addEventListener('change', on)
    return () => m.removeEventListener('change', on)
  }, [query])
  return match
}

/** Sets the browser tab title and description for the current view. */
export function usePageMeta(title: string, description?: string) {
  useEffect(() => {
    document.title = title ? `${title} · تەفسیرا ساناهی` : 'تەفسیرا ساناهی · Tefsira Sanahi'
    if (description) document.querySelector('meta[name="description"]')?.setAttribute('content', description)
  }, [title, description])
}
