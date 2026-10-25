/** Links to the app on Google Play, the App Store and for Windows. */
export const PLAY_URL = 'https://play.google.com/store/apps/details?id=com.tefsirasanahi.app'
export const APP_STORE_URL = 'https://apps.apple.com/iq/app/tefsira-sanahi/id1618690795'
/** Always the latest Windows installer (a link on the server to the current version). */
export const WINDOWS_URL = '/storage/downloads/TefsiraSanahi-Setup.exe'

const WindowsLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M3 3h8.5v8.5H3z" fill="#f25022" />
    <path d="M12.5 3H21v8.5h-8.5z" fill="#7fba00" />
    <path d="M3 12.5h8.5V21H3z" fill="#00a4ef" />
    <path d="M12.5 12.5H21V21h-8.5z" fill="#ffb900" />
  </svg>
)

const AppleLogo = () => (
  <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="currentColor">
    <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.02-1.5-2.62-1.7-3.19-1.72-1.36-.14-2.65.8-3.34.8-.69 0-1.75-.78-2.88-.76-1.48.02-2.85.86-3.61 2.19-1.54 2.67-.39 6.62 1.11 8.79.73 1.06 1.6 2.25 2.75 2.2 1.1-.04 1.52-.71 2.85-.71 1.33 0 1.71.71 2.88.69 1.19-.02 1.94-1.08 2.66-2.14.84-1.23 1.19-2.42 1.21-2.48-.03-.01-2.32-.89-2.32-3.55zM14.2 6.12c.61-.74 1.02-1.76.91-2.78-.88.04-1.94.59-2.57 1.32-.56.65-1.06 1.69-.93 2.69.98.08 1.98-.5 2.59-1.23z" />
  </svg>
)

const PlayLogo = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
    <path d="M4 2.6 13.6 12 4 21.4c-.3-.2-.5-.6-.5-1V3.6c0-.4.2-.8.5-1z" fill="#00d7fe" />
    <path d="m16.8 8.8-3.2 3.2L4 2.6c.3-.2.8-.2 1.2 0z" fill="#00f076" />
    <path d="m16.8 15.2-11.6 6.2c-.4.2-.9.2-1.2 0l9.6-9.4z" fill="#f83a4b" />
    <path d="m20.1 10.6c.9.5.9 2.3 0 2.8l-3.3 1.8-3.2-3.2 3.2-3.2z" fill="#ffd400" />
  </svg>
)

export function StoreLinks({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`store-links${compact ? ' compact' : ''}`}>
      <a className="store-btn" href={APP_STORE_URL} target="_blank" rel="noopener">
        <AppleLogo />
        <span>
          <small>Download on the</small>
          <b>App Store</b>
        </span>
      </a>
      <a className="store-btn" href={PLAY_URL} target="_blank" rel="noopener">
        <PlayLogo />
        <span>
          <small>GET IT ON</small>
          <b>Google Play</b>
        </span>
      </a>
      <a className="store-btn" href={WINDOWS_URL} download>
        <WindowsLogo />
        <span>
          <small>Download for</small>
          <b>Windows</b>
        </span>
      </a>
    </div>
  )
}
