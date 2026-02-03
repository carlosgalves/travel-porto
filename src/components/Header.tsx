import { useState, useMemo, useEffect, useRef } from 'react';
import { Locate, LocateFixed, LocateOff, Bookmark, Filter } from 'lucide-react';
import { Button } from './ui/button';
import Searchbar from './Searchbar';
import { ScrollArea } from './ui/scroll-area';
import { useMapContext } from '../contexts/MapContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import { centerMap } from '../lib/map';
import { filterStopsByQuery, filterRoutesByQuery } from '../lib/search';
import type { BusStop } from '../api/types';
import type { Route } from '../api/types';
import { fetchBusStops } from '../api/endpoints/stops';
import { fetchRoutes } from '../api/endpoints/routes';
import type { MobileTab } from './BottomNav';
import { tabToPathname } from '../lib/routes';

function toHex(color: string): string {
  if (!color) return '#000000';
  const s = color.trim();
  return s.startsWith('#') ? s : `#${s}`;
}

interface HeaderProps {
  isMobile?: boolean;
  mobileTab?: MobileTab;
}

export default function Header({ isMobile, mobileTab }: HeaderProps) {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const {
    mapInstance,
    userPosition,
    hasLocationPermission,
    isCenteredOnUser,
    setIsCenteredOnUser,
    isSavedStop,
    requestLocation,
    enabledRouteIds,
    setEnabledRouteIds,
    loadStopToRouteIds,
    stopToRouteIdsLoading,
  } = useMapContext();
  const [headerSearch, setHeaderSearch] = useState('');
  const [allStops, setAllStops] = useState<BusStop[]>([]);
  const [allRoutes, setAllRoutes] = useState<Route[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        if (enabledRouteIds !== null && enabledRouteIds.size === 0) {
          setEnabledRouteIds(null);
        }
        setFilterOpen(false);
      }
    };
    if (filterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [filterOpen, enabledRouteIds, setEnabledRouteIds]);

  const isRouteEnabled = (routeId: string) =>
    enabledRouteIds === null || enabledRouteIds.has(routeId);

  const toggleRouteFilter = (routeId: string) => {
    setEnabledRouteIds((prev) => {
      const allIds = allRoutes.map((r) => r.id);
      if (prev === null) {
        const next = new Set(allIds.filter((id) => id !== routeId));
        return next.size === 0 ? null : next;
      }
      const next = new Set(prev);
      if (next.has(routeId)) {
        next.delete(routeId);
        return next.size === 0 ? null : next;
      }
      next.add(routeId);
      return next;
    });
  };

  const openFilterPanel = () => {
    if (filterOpen) {
      if (enabledRouteIds !== null && enabledRouteIds.size === 0) {
        setEnabledRouteIds(null);
      }
      setFilterOpen(false);
    } else {
      loadStopToRouteIds();
      setFilterOpen(true);
    }
  };

  useEffect(() => {
    fetchBusStops()
      .then(setAllStops)
      .catch((err) => console.error('Failed to load stops for search:', err));
  }, []);

  useEffect(() => {
    fetchRoutes()
      .then(setAllRoutes)
      .catch((err) => console.error('Failed to load routes for search:', err));
  }, []);

  const headerSearchResults = useMemo(() => {
    const routeMatches = filterRoutesByQuery(allRoutes, headerSearch);
    const stopMatches = filterStopsByQuery(allStops, headerSearch);
    const savedStops = stopMatches.filter((s) => isSavedStop(s.id));
    const notSavedStops = stopMatches.filter((s) => !isSavedStop(s.id));
    const routeResults = routeMatches.map((route) => ({ kind: 'route' as const, route }));
    const stopResults = [...savedStops, ...notSavedStops].map((stop) => ({ kind: 'stop' as const, stop }));
    return [...routeResults, ...stopResults];
  }, [allStops, allRoutes, headerSearch, isSavedStop]);

  const openStop = (stop: BusStop) => {
    setHeaderSearch('');
    const url = new URL(window.location.href);
    url.searchParams.set('stop', stop.id);
    window.history.pushState({}, '', url.pathname + url.search);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const openRoute = (route: Awaited<ReturnType<typeof fetchRoutes>>[number]) => {
    setHeaderSearch('');
    const path = tabToPathname('routes');
    const url = `${path}?route=${encodeURIComponent(route.id)}`;
    window.history.pushState({}, '', url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const handleReCenter = () => {
    requestLocation();
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
  const showMobileRoutesHeader = isMobile && mobileTab === 'routes';
  const showMobileSettingsHeader = isMobile && mobileTab === 'settings';
  const showDesktopHeader = !isMobile;

  return (
    <header className="fixed top-0 left-0 right-0 z-[250] bg-background/80 backdrop-blur-sm border-b border-border shadow-sm">
      <div className="flex items-center justify-between h-14 gap-3 px-4">
        {/* Desktop header */}
        <div className={`flex min-w-0 flex-1 items-center gap-2 ${showDesktopHeader ? '' : 'hidden md:flex'}`}>
          <h1 className="shrink-0 text-lg font-semibold">{t('app.title')}</h1>
          <Searchbar
            value={headerSearch}
            onChange={setHeaderSearch}
            placeholder={t('menu.searchSavedStops')}
            results={headerSearchResults}
            onSelectStop={openStop}
            onSelectRoute={openRoute}
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
          <div className="relative shrink-0" ref={filterPanelRef}>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={openFilterPanel}
              aria-label={t('menu.filterByRoute')}
              aria-expanded={filterOpen}
              className={enabledRouteIds !== null ? 'text-primary' : ''}
            >
              <Filter className="h-4 w-4" />
            </Button>
            {filterOpen && (
              <div className="absolute right-0 top-full z-[260] mt-1 w-72 rounded-md border border-border bg-background shadow-lg flex flex-col max-h-[min(24rem,80vh)]">
                <div className="shrink-0 border-b border-border px-3 py-2">
                  <h3 className="text-sm font-semibold">{t('menu.filterByRoute')}</h3>
                  {!stopToRouteIdsLoading && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-2 w-full"
                      onClick={() => {
                        if (enabledRouteIds === null) {
                          setEnabledRouteIds(new Set());
                        } else {
                          setEnabledRouteIds(null);
                        }
                      }}
                    >
                      {enabledRouteIds === null ? t('menu.filterDisableAll') : t('menu.filterEnableAll')}
                    </Button>
                  )}
                </div>
                {stopToRouteIdsLoading ? (
                  <div className="shrink-0 px-3 py-4 text-center text-sm text-muted-foreground">
                    {t('routes.loading')}
                  </div>
                ) : (
                  <ScrollArea className="shrink min-h-0" style={{ height: '16rem' }}>
                    <div className="p-1">
                      {allRoutes.map((route) => {
                        const enabled = isRouteEnabled(route.id);
                        return (
                          <button
                            key={route.id}
                            type="button"
                            onClick={() => toggleRouteFilter(route.id)}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                          >
                            <span
                              className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${enabled ? 'border-primary bg-primary' : 'border-muted-foreground opacity-50'}`}
                              aria-hidden
                            >
                              {enabled && (
                                <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              )}
                            </span>
                            <span
                              className="inline-flex shrink-0 items-center justify-center rounded px-2 py-0.5 text-xs font-semibold"
                              style={{
                                backgroundColor: toHex(route.route_color),
                                color: toHex(route.route_text_color),
                              }}
                            >
                              {route.short_name}
                            </span>
                            <span className="min-w-0 flex-1 truncate text-muted-foreground">
                              {route.long_name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </ScrollArea>
                )}
              </div>
            )}
          </div>
        </div>
        {/* Mobile map tab */}
        {showMobileMapHeader && (
          <>
            <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
              <h1 className="shrink-0 text-lg font-semibold">{t('app.title')}</h1>
              <Searchbar
                value={headerSearch}
                onChange={setHeaderSearch}
                placeholder={t('menu.searchSavedStops')}
                results={headerSearchResults}
                onSelectStop={openStop}
                onSelectRoute={openRoute}
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
              <div className="relative shrink-0" ref={filterPanelRef}>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={openFilterPanel}
                  aria-label={t('menu.filterByRoute')}
                  aria-expanded={filterOpen}
                  className={enabledRouteIds !== null ? 'text-primary' : ''}
                >
                  <Filter className="h-4 w-4" />
                </Button>
                {filterOpen && (
                  <div className="absolute right-0 top-full z-[260] mt-1 w-72 rounded-md border border-border bg-background shadow-lg flex flex-col max-h-[min(24rem,80vh)]">
                    <div className="shrink-0 border-b border-border px-3 py-2">
                      <h3 className="text-sm font-semibold">{t('menu.filterByRoute')}</h3>
                      {!stopToRouteIdsLoading && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2 w-full"
                          onClick={() => {
                            if (enabledRouteIds === null) {
                              setEnabledRouteIds(new Set());
                            } else {
                              setEnabledRouteIds(null);
                            }
                          }}
                        >
                          {enabledRouteIds === null ? t('menu.filterDisableAll') : t('menu.filterEnableAll')}
                        </Button>
                      )}
                    </div>
                    {stopToRouteIdsLoading ? (
                      <div className="shrink-0 px-3 py-4 text-center text-sm text-muted-foreground">
                        {t('routes.loading')}
                      </div>
                    ) : (
                      <ScrollArea className="shrink min-h-0" style={{ height: '16rem' }}>
                        <div className="p-1">
                          {allRoutes.map((route) => {
                            const enabled = isRouteEnabled(route.id);
                            return (
                              <button
                                key={route.id}
                                type="button"
                                onClick={() => toggleRouteFilter(route.id)}
                                className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm outline-none hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground"
                              >
                                <span
                                  className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded border ${enabled ? 'border-primary bg-primary' : 'border-muted-foreground opacity-50'}`}
                                  aria-hidden
                                >
                                  {enabled && (
                                    <svg className="h-2.5 w-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                    </svg>
                                  )}
                                </span>
                                <span
                                  className="inline-flex shrink-0 items-center justify-center rounded px-2 py-0.5 text-xs font-semibold"
                                  style={{
                                    backgroundColor: toHex(route.route_color),
                                    color: toHex(route.route_text_color),
                                  }}
                                >
                                  {route.short_name}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-muted-foreground">
                                  {route.long_name}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2 md:hidden">
              {(userPosition || !hasLocationPermission) && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleReCenter}
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
        {/* Mobile routes tab */}
        {showMobileRoutesHeader && (
          <h1 className="flex-1 text-lg font-semibold md:hidden">{t('nav.routes')}</h1>
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
            >
              {getLocationIcon()}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
