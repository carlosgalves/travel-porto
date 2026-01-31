import { useState, useMemo, useEffect } from 'react';
import { Moon, Sun, Locate, LocateFixed, LocateOff, Settings, Check, Bookmark, X } from 'lucide-react';
import { Button } from './ui/button';
import Searchbar from './Searchbar';
import { useTheme } from '../contexts/ThemeContext';
import { useMapContext } from '../contexts/MapContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { centerMap } from '../lib/map';
import { filterStopsByQuery } from '../lib/search';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import type { BusStop } from '../api/types';
import { fetchBusStops } from '../api/endpoints/stops';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation(language);
  const { mapInstance, userPosition, hasLocationPermission, isCenteredOnUser, setIsCenteredOnUser, savedStops, removeSavedStop, isSavedStop } = useMapContext();
  const [savedStopsSearch, setSavedStopsSearch] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [allStops, setAllStops] = useState<BusStop[]>([]);

  useEffect(() => {
    fetchBusStops()
      .then(setAllStops)
      .catch((err) => console.error('Failed to load stops for search:', err));
  }, []);

  const filteredSavedStops = useMemo(() => {
    const q = savedStopsSearch.trim();
    if (!q) return savedStops;
    return filterStopsByQuery(savedStops, q);
  }, [savedStops, savedStopsSearch]);

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

  return (
    <header className="fixed top-0 left-0 right-0 z-[250] bg-background/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-14 gap-3 px-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <h1 className="shrink-0 text-lg font-semibold">{t('app.title')}</h1>
          <Searchbar
            value={headerSearch}
            onChange={setHeaderSearch}
            placeholder={t('menu.searchSavedStops')}
            ariaLabel={t('menu.searchSavedStops')}
            clearAriaLabel={t('menu.clearSearch')}
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
        <div className="flex shrink-0 items-center gap-2">
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('menu.savedStops')}
              >
                <Bookmark className="h-5 w-5" />
              </Button>
            }
            align="right"
          >
            <DropdownMenuContent className="w-72 p-0">
              <DropdownMenuLabel className="px-3 pt-3 pb-2">
                {t('menu.savedStops')}
              </DropdownMenuLabel>
              {savedStops.length > 0 ? (
                <div className="px-2 pb-2">
                  <Searchbar
                    value={savedStopsSearch}
                    onChange={setSavedStopsSearch}
                    placeholder={t('menu.searchSavedStops')}
                    ariaLabel={t('menu.searchSavedStops')}
                    clearAriaLabel={t('menu.clearSearch')}
                    results={filteredSavedStops}
                    onSelectStop={openStop}
                    maxVisibleResults={5}
                    noResultsMessage={t('menu.noSearchResults')}
                    showResultsWhenEmpty
                    inlineResults
                    stopPropagation
                    renderItemExtra={(stop) => (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        aria-label={t('busStop.unsaveStop')}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          removeSavedStop(stop.id);
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  />
                </div>
              ) : (
                <div className="border-t border-border px-3 py-2 text-sm text-muted-foreground">
                  {t('menu.noSavedStops')}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
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
          <DropdownMenu
            trigger={
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('menu.settings')}
              >
                <Settings className="h-5 w-5" />
              </Button>
            }
            align="right"
          >
            <DropdownMenuContent>
              <DropdownMenuLabel>{t('menu.theme')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTheme('light')}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Sun className="h-4 w-4" />
                    <span>{t('header.light')}</span>
                  </div>
                  {theme === 'light' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <Moon className="h-4 w-4" />
                    <span>{t('header.dark')}</span>
                  </div>
                  {theme === 'dark' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>{t('menu.language')}</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setLanguage('pt')}>
                <div className="flex items-center justify-between w-full">
                  <span>{t('menu.portuguese')}</span>
                  {language === 'pt' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setLanguage('en')}>
                <div className="flex items-center justify-between w-full">
                  <span>{t('menu.english')}</span>
                  {language === 'en' && <Check className="h-4 w-4" />}
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
