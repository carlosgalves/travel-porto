import { useState, useMemo, useEffect } from 'react';
import { Locate, LocateFixed, LocateOff, Bookmark } from 'lucide-react';
import { Button } from './ui/button';
import Searchbar from './Searchbar';
import { useMapContext } from '../contexts/MapContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { centerMap } from '../lib/map';
import { filterStopsByQuery } from '../lib/search';
import type { BusStop } from '../api/types';
import { fetchBusStops } from '../api/endpoints/stops';
import type { MobileTab } from './BottomNav';

interface HeaderProps {
  isMobile?: boolean;
  mobileTab?: MobileTab;
}

export default function Header({ isMobile, mobileTab }: HeaderProps) {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const { mapInstance, userPosition, hasLocationPermission, isCenteredOnUser, setIsCenteredOnUser, isSavedStop } = useMapContext();
  const [headerSearch, setHeaderSearch] = useState('');
  const [allStops, setAllStops] = useState<BusStop[]>([]);

  useEffect(() => {
    fetchBusStops()
      .then(setAllStops)
      .catch((err) => console.error('Failed to load stops for search:', err));
  }, []);

  const headerSearchResults = useMemo(() => {
    const matches = filterStopsByQuery(allStops, headerSearch);
    const saved = matches.filter((s) => isSavedStop(s.id));
    const notSaved = matches.filter((s) => !isSavedStop(s.id));
    return [...saved, ...notSaved];
  }, [allStops, headerSearch, isSavedStop]);

  const openStop = (stop: BusStop) => {
    setHeaderSearch('');
    const url = new URL(window.location.href);
    url.searchParams.set('stop', stop.id);
    window.history.pushState({}, '', url.pathname + url.search);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleReCenter = () => {
    if (mapInstance && userPosition) {
      centerMap(mapInstance, userPosition);
      setIsCenteredOnUser(true);
    }
  };

  const getLocationIcon = () => {
    if (!hasLocationPermission) {
      return <LocateOff className="h-5 w-5" />;
    }
    if (isCenteredOnUser) {
      return <LocateFixed className="h-5 w-5" />;
    }
    return <Locate className="h-5 w-5" />;
  };

  const showMobileMapHeader = isMobile && mobileTab === 'map';
  const showMobileSavedHeader = isMobile && mobileTab === 'saved';
  const showMobileSettingsHeader = isMobile && mobileTab === 'settings';
  const showDesktopHeader = !isMobile;

  return (
    <header className="fixed top-0 left-0 right-0 z-[250] bg-background/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-14 gap-3 px-4">
        {/* Desktop header */}
        <div className={`flex min-w-0 flex-1 items-center gap-3 ${showDesktopHeader ? '' : 'hidden md:flex'}`}>
          <h1 className="shrink-0 text-lg font-semibold">{t('app.title')}</h1>
          <Searchbar
            value={headerSearch}
            onChange={setHeaderSearch}
            placeholder={t('menu.searchSavedStops')}
            results={headerSearchResults}
            onSelectStop={openStop}
            maxVisibleResults={8}
            noResultsMessage={t('menu.noSearchResults')}
            renderItemPrefix={(stop) =>
              isSavedStop(stop.id) ? (
                <Bookmark className="h-4 w-4 shrink-0 fill-current" aria-hidden />
              ) : (
                <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
              )
            }
            className="min-w-0 flex-1"
            searchBarClassName="w-full min-w-0"
          />
        </div>
        {/* Mobile map tab */}
        {showMobileMapHeader && (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-3 md:hidden">
              <h1 className="shrink-0 text-lg font-semibold">{t('app.title')}</h1>
              <Searchbar
                value={headerSearch}
                onChange={setHeaderSearch}
                placeholder={t('menu.searchSavedStops')}
                results={headerSearchResults}
                onSelectStop={openStop}
                maxVisibleResults={8}
                noResultsMessage={t('menu.noSearchResults')}
                renderItemPrefix={(stop) =>
                  isSavedStop(stop.id) ? (
                    <Bookmark className="h-4 w-4 shrink-0 fill-current" aria-hidden />
                  ) : (
                    <span className="inline-block h-4 w-4 shrink-0" aria-hidden />
                  )
                }
                className="min-w-0 flex-1"
                searchBarClassName="w-full min-w-0"
              />
            </div>
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              {(userPosition || !hasLocationPermission) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReCenter}
                  disabled={!hasLocationPermission || !userPosition}
                >
                  {getLocationIcon()}
                </Button>
              )}
            </div>
          </>
        )}
        {/* Mobile saved tab */}
        {showMobileSavedHeader && (
          <h1 className="flex-1 text-lg font-semibold md:hidden">{t('menu.savedStops')}</h1>
        )}
        {/* Mobile settings tab */}
        {showMobileSettingsHeader && (
          <h1 className="flex-1 text-lg font-semibold md:hidden">{t('menu.settings')}</h1>
        )}
        {/* Desktop gps button */}
        <div className={`flex shrink-0 items-center gap-2 ${showDesktopHeader ? '' : 'hidden md:flex'}`}>
          {(userPosition || !hasLocationPermission) && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleReCenter}
              disabled={!hasLocationPermission || !userPosition}
            >
              {getLocationIcon()}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
