import { useEffect } from 'react'
import { setSettings, useSettings } from '../lib/settings'
import { Icon } from './Icon'
import { useMedia } from './ui'

/** Applies the theme (light, dark or the system's) to <html>. */
export function useApplyTheme() {
  const theme = useSettings((s) => s.theme)
  const systemDark = useMedia('(prefers-color-scheme: dark)')
  const dark = theme === 'dark' || (theme === 'system' && systemDark)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#0a1713' : '#0b6b4e')
  }, [dark])
  return dark
}

export function ThemeToggle() {
  const dark = document.documentElement.dataset.theme === 'dark'
  useSettings((s) => s.theme) // re-render when it changes
  return (
    <button
      className="icon-btn"
      onClick={() => setSettings({ theme: dark ? 'light' : 'dark' })}
      aria-label={dark ? 'ڕەنگێ ڕۆناهی' : 'ڕەنگێ تاری'}
      title={dark ? 'ڕەنگێ ڕۆناهی' : 'ڕەنگێ تاری'}
    >
      <Icon name={dark ? 'sun' : 'moon'} />
    </button>
  )
}
