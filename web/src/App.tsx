import { Suspense, lazy, useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { PlayerBar } from './components/PlayerBar'
import { useApplyTheme } from './components/ThemeToggle'
import { Toasts } from './components/ui'
import HomeScreen from './pages/HomeScreen'
import LandingScreen from './pages/LandingScreen'
import { getSettings, useSettings } from './lib/settings'

// Bigger screens load on demand.
const MushafScreen = lazy(() => import('./pages/MushafScreen'))
const SearchScreen = lazy(() => import('./pages/SearchScreen'))
const TafsirBookScreen = lazy(() => import('./pages/TafsirBookScreen'))
const ScrollReaderScreen = lazy(() => import('./pages/ScrollReaderScreen'))
const ListenScreen = lazy(() => import('./pages/ListenScreen'))
const Info = () => import('./pages/InfoScreens')
const BookmarksScreen = lazy(() => Info().then((m) => ({ default: m.BookmarksScreen })))
const SettingsScreen = lazy(() => Info().then((m) => ({ default: m.SettingsScreen })))
const AboutScreen = lazy(() => Info().then((m) => ({ default: m.AboutScreen })))
const SupportScreen = lazy(() => Info().then((m) => ({ default: m.SupportScreen })))

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } })

/** Old-style "/surah/2:255" links → "/surah/2/255". */
function SurahRedirect() {
  const { key = '1' } = useParams()
  const [s, a] = key.split(':')
  return <Navigate to={`/surah/${s}${a ? `/${a}` : ''}`} replace />
}

/** /surah/… opens the scroll view, or the Mushaf pages when chosen. */
function ReadRoute() {
  const view = useSettings((s) => s.readView)
  return view === 'page' ? <MushafScreen /> : <ScrollReaderScreen />
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    if (!pathname.startsWith('/surah')) window.scrollTo(0, 0)
  }, [pathname])
  return null
}

function Shell() {
  useApplyTheme()
  return (
    <>
      <ScrollToTop />
      <Suspense fallback={<div className="spinner page-spinner" aria-label="بارکرن" />}>
        <Routes>
          <Route path="/" element={<LandingScreen />} />
          <Route path="/quran" element={<HomeScreen />} />
          <Route path="/page" element={<Navigate to={`/page/${getSettings().lastPage || 1}`} replace />} />
          <Route path="/page/:page" element={<MushafScreen />} />
          <Route path="/surah/:surah/:ayah?" element={<ReadRoute />} />
          <Route path="/listen" element={<ListenScreen />} />
          <Route path="/tafsir/:surah/:ayah?" element={<TafsirBookScreen />} />
          <Route path="/tafsir" element={<Navigate to="/tafsir/1" replace />} />
          <Route path="/s/:key" element={<SurahRedirect />} />
          <Route path="/search" element={<SearchScreen />} />
          <Route path="/bookmarks" element={<BookmarksScreen />} />
          <Route path="/settings" element={<SettingsScreen />} />
          <Route path="/about" element={<AboutScreen />} />
          <Route path="/support" element={<SupportScreen />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
      <PlayerBar />
      <Toasts />
    </>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Shell />
      </BrowserRouter>
    </QueryClientProvider>
  )
}