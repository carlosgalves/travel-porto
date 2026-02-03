import { useState, useEffect } from 'react'
import { ThemeProvider } from './contexts/ThemeContext'
import { LanguageProvider } from './contexts/LanguageContext'
import { MapProvider } from './contexts/MapContext'
import { useIsMobile } from './lib/useMediaQuery'
import { pathnameToTab, tabToPathname } from './lib/routes'
import Header from './components/Header'
import Map from './components/map/Map'
import { BottomNav, type MobileTab } from './components/BottomNav'
import { Sidebar } from './components/Sidebar'
import { SavedStopsView } from './components/mobile/SavedStopsView'
import { RoutesView } from './components/mobile/RoutesView'
import { SettingsView } from './components/mobile/SettingsView'
import './App.css'

function App() {
  const isMobile = useIsMobile()
  const [mobileTab, setMobileTab] = useState<MobileTab>(() =>
    pathnameToTab(window.location.pathname)
  )

  useEffect(() => {
    const syncTabFromPath = () => {
      setMobileTab(pathnameToTab(window.location.pathname))
    }
    window.addEventListener('popstate', syncTabFromPath)
    return () => window.removeEventListener('popstate', syncTabFromPath)
  }, [])

  const handleMobileTabChange = (tab: MobileTab) => {
    const path =
      tab === 'map'
        ? tabToPathname(tab) + window.location.search
        : tabToPathname(tab);
    window.history.pushState({}, '', path)
    setMobileTab(tab)
  }

  const handleSelectStop = (stop: { id: string }) => {
    const path = tabToPathname('map') + `?stop=${encodeURIComponent(stop.id)}`
    window.history.pushState({}, '', path)
    setMobileTab('map')
    window.dispatchEvent(new PopStateEvent('popstate'))
  }

  const handleSelectStopFromSaved = (stop: { id: string }) => {
    handleSelectStop(stop)
  }

  return (
    <ThemeProvider>
      <LanguageProvider>
        <MapProvider>
          <div className="flex h-screen w-screen flex-col">
            <Header isMobile={isMobile} mobileTab={mobileTab} />
            <div className="flex flex-1 min-h-0 md:pb-0" style={isMobile ? { paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))' } : undefined}>
              <main className="flex-1 overflow-hidden min-h-0">
                {isMobile && mobileTab === 'map' && <Map className="h-full w-full" />}
                {isMobile && mobileTab === 'saved' && (
                  <SavedStopsView onSelectStop={handleSelectStopFromSaved} />
                )}
                {isMobile && mobileTab === 'routes' && (
                  <RoutesView onSelectStop={handleSelectStop} />
                )}
                {isMobile && mobileTab === 'settings' && <SettingsView />}
                {!isMobile && <Map className="h-full w-full" />}
              </main>
              {!isMobile && <Sidebar />}
            </div>
            {isMobile && (
              <BottomNav activeTab={mobileTab} onTabChange={handleMobileTabChange} />
            )}
          </div>
        </MapProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
