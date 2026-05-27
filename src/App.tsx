import { useEffect } from 'react'
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom'
import { BottomNav } from './components/ui/BottomNav'
import { Sidebar } from './components/ui/Sidebar'
import { IOSInstallHint } from './components/IOSInstallHint'
import { PWAUpdate } from './components/PWAUpdate'
import { NotFoundPage } from './pages/NotFoundPage'
import { DashboardPage } from './pages/DashboardPage'
import { TeamsPage } from './pages/TeamsPage'
import { TeamDetailPage } from './pages/TeamDetailPage'
import { OpenPackPage } from './pages/OpenPackPage'
import { TradePage } from './pages/TradePage'
import { SettingsPage } from './pages/SettingsPage'
import { StatsPage } from './pages/StatsPage'
import { PackHistoryPage } from './pages/PackHistoryPage'
import { AboutPage } from './pages/AboutPage'
import { OnboardingPage } from './pages/OnboardingPage'
import { db, recomputeAllCaches } from './lib/db'

// Routes that should NOT show app chrome (sidebar / nav).
const NO_CHROME = new Set(['/onboarding'])

export function App() {
  const location = useLocation()
  const navigate = useNavigate()
  const showChrome = !NO_CHROME.has(location.pathname)

  // One-time migration: if a previous app version stored darkMode only in
  // IndexedDB (no localStorage), copy it over so the synchronous bootstrap
  // in main.tsx picks it up on the next page load.
  useEffect(() => {
    if (typeof localStorage !== 'undefined' && !localStorage.getItem('theme')) {
      db.settings.get('darkMode').then((s) => {
        if (s?.value === true) {
          localStorage.setItem('theme', 'dark')
          document.documentElement.classList.add('dark')
        }
      })
    }
    void recomputeAllCaches()
  }, [])

  // First-run onboarding redirect.
  useEffect(() => {
    if (location.pathname !== '/') return
    db.settings.get('onboardingCompleted').then((s) => {
      if (!s) navigate('/onboarding', { replace: true })
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!showChrome) {
    // Onboarding: full-bleed, no chrome
    return (
      <div className="min-h-screen bg-background text-foreground">
        <Routes>
          <Route path="/onboarding" element={<OnboardingPage />} />
        </Routes>
        <IOSInstallHint />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <Sidebar />
      {/* Main content column — full width on mobile, fills remaining space on desktop */}
      <main className="flex-1 min-w-0 pb-safe-nav lg:pb-0">
        <div className="lg:max-w-5xl lg:mx-auto lg:px-8 lg:py-6">
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/teams" element={<TeamsPage />} />
            <Route path="/teams/:code" element={<TeamDetailPage />} />
            <Route path="/scan" element={<OpenPackPage />} />
            <Route path="/trade" element={<TradePage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/stats" element={<StatsPage />} />
            <Route path="/packs" element={<PackHistoryPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </div>
      </main>
      <BottomNav />
      <IOSInstallHint />
      <PWAUpdate />
    </div>
  )
}
