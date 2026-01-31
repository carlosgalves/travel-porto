import { useState, useMemo } from 'react';
import { Moon, Sun, Locate, LocateFixed, LocateOff, Settings, Check, Bookmark, X, Search } from 'lucide-react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { useTheme } from '../contexts/ThemeContext';
import { useMapContext } from '../contexts/MapContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { centerMap } from '../lib/map';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from './ui/dropdown-menu';
import type { BusStop } from '../api/types';

export default function Header() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const t = useTranslation(language);
  const { mapInstance, userPosition, hasLocationPermission, isCenteredOnUser, setIsCenteredOnUser, savedStops, removeSavedStop } = useMapContext();
  const [savedStopsSearch, setSavedStopsSearch] = useState('');

  const filteredSavedStops = useMemo(() => {
    const q = savedStopsSearch.trim().toLowerCase();
    if (!q) return savedStops;
    return savedStops.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || s.id.toLowerCase().includes(q)
    );
  }, [savedStops, savedStopsSearch]);

  const openSavedStop = (stop: BusStop) => {
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
      <div className="flex items-center justify-between h-14 px-4">
        <div className="flex items-center">
          <h1 className="text-lg font-semibold">{t('app.title')}</h1>
        </div>
        <div className="flex items-center gap-2">
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
              {savedStops.length > 0 && (
                <div className="px-2 pb-2">
                  <div className="relative flex items-center">
                    <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      inputMode="search"
                      value={savedStopsSearch}
                      onChange={(e) => setSavedStopsSearch(e.target.value)}
                      placeholder={t('menu.searchSavedStops')}
                      className="saved-stops-search-input w-full rounded-md border border-input bg-background py-1.5 pl-8 pr-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={t('menu.searchSavedStops')}
                      onClick={(e) => e.stopPropagation()}
                    />
                    {savedStopsSearch.trim() !== '' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 h-7 w-7 shrink-0"
                        aria-label={t('menu.clearSearch')}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                          setSavedStopsSearch('');
                        }}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {filteredSavedStops.length > 6 ? (
                <ScrollArea className="h-[13.5rem] border-t border-border">
                  <div className="p-1">
                    {filteredSavedStops.map((stop) => (
                      <DropdownMenuItem
                        key={stop.id}
                        onClick={() => openSavedStop(stop)}
                        className="flex items-center gap-2"
                      >
                        <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                        <span className="shrink-0 text-muted-foreground text-xs">
                          {stop.id}
                        </span>
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
                      </DropdownMenuItem>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="border-t border-border">
                  <div className="p-1">
                    {savedStops.length === 0 ? (
                      <div className="rounded-sm px-2 py-1.5 text-sm text-muted-foreground">
                        {t('menu.noSavedStops')}
                      </div>
                    ) : filteredSavedStops.length === 0 ? (
                      <div className="rounded-sm px-2 py-1.5 text-sm text-muted-foreground">
                        {t('menu.noSearchResults')}
                      </div>
                    ) : (
                      filteredSavedStops.map((stop) => (
                        <DropdownMenuItem
                          key={stop.id}
                          onClick={() => openSavedStop(stop)}
                          className="flex items-center gap-2"
                        >
                          <span className="min-w-0 flex-1 truncate">{stop.name}</span>
                          <span className="shrink-0 text-muted-foreground text-xs">
                            {stop.id}
                          </span>
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
                        </DropdownMenuItem>
                      ))
                    )}
                  </div>
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
