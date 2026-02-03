import { useState, useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
} from '../ui/dropdown-menu';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../lib/i18n';
import { useIsMobile } from '../../lib/useMediaQuery';
import { tabToPathname } from '../../lib/routes';
import { fetchRoutes, fetchRouteStops } from '../../api/endpoints/routes';
import type { Route, RouteDirection, RouteStopItem } from '../../api/types';

function toHex(color: string): string {
  if (!color) return '#000000';
  const s = color.trim();
  return s.startsWith('#') ? s : `#${s}`;
}

function directionKey(d: RouteDirection): string {
  return `${d.direction_id}-${d.headsign}`;
}

type ViewState =
  | { step: 'list' }
  | {
      step: 'route';
      route: Route;
      selectedDirection: RouteDirection;
      stops: RouteStopItem[];
      stopsLoading: boolean;
    };

export interface RoutesViewProps {
  onSelectStop?: (stop: { id: string }) => void;
}

export function RoutesView({ onSelectStop }: RoutesViewProps = {}) {
  const isMobile = useIsMobile();
  const { language } = useLanguage();
  const t = useTranslation(language);

  const handleStopClick = (stopId: string) => {
    if (onSelectStop) {
      onSelectStop({ id: stopId });
    } else {
      const path = tabToPathname('map') + `?stop=${encodeURIComponent(stopId)}`;
      window.history.pushState({}, '', path);
      window.dispatchEvent(new PopStateEvent('popstate'));
    }
  };
  const [routes, setRoutes] = useState<Route[]>([]);
  const [routesLoading, setRoutesLoading] = useState(true);
  const [routesError, setRoutesError] = useState<string | null>(null);
  const [view, setView] = useState<ViewState>({ step: 'list' });
  const stopsCacheRef = useRef<Map<string, RouteStopItem[]>>(new Map());

  useEffect(() => {
    let cancelled = false;
    setRoutesLoading(true);
    setRoutesError(null);
    fetchRoutes()
      .then((data) => {
        if (!cancelled) setRoutes(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setRoutesError(err instanceof Error ? err.message : t('routes.loadError'));
        }
      })
      .finally(() => {
        if (!cancelled) setRoutesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [t]);

  const handleSelectRoute = (route: Route) => {
    const first = route.directions?.[0];
    if (!first) {
      setView({
        step: 'route',
        route,
        selectedDirection: { direction_id: 0, headsign: '', service_days: [] },
        stops: [],
        stopsLoading: false,
      });
      return;
    }
    const cacheKey = `${route.id}-${directionKey(first)}`;
    const cached = stopsCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      setView({
        step: 'route',
        route,
        selectedDirection: first,
        stops: cached,
        stopsLoading: false,
      });
      return;
    }
    setView({
      step: 'route',
      route,
      selectedDirection: first,
      stops: [],
      stopsLoading: true,
    });
  };

  const handleSelectHeadsign = (direction: RouteDirection) => {
    if (view.step !== 'route') return;
    const { route } = view;
    const cacheKey = `${route.id}-${directionKey(direction)}`;
    const cached = stopsCacheRef.current.get(cacheKey);
    if (cached !== undefined) {
      setView({
        ...view,
        selectedDirection: direction,
        stops: cached,
        stopsLoading: false,
      });
      return;
    }
    setView({
      ...view,
      selectedDirection: direction,
      stops: [],
      stopsLoading: true,
    });
  };

  useEffect(() => {
    if (view.step !== 'route' || !view.stopsLoading) return;
    const { route, selectedDirection } = view;
    let cancelled = false;
    fetchRouteStops(route.id, selectedDirection.direction_id, selectedDirection.headsign)
      .then((data) => {
        const dir = data.directions.find(
          (d) =>
            d.direction_id === selectedDirection.direction_id &&
            d.headsign === selectedDirection.headsign
        );
        const stops = dir?.stops ?? [];
        const cacheKey = `${route.id}-${directionKey(selectedDirection)}`;
        stopsCacheRef.current.set(cacheKey, stops);
        if (!cancelled)
          setView((prev) =>
            prev.step === 'route' &&
            prev.route.id === route.id &&
            prev.selectedDirection.direction_id === selectedDirection.direction_id &&
            prev.selectedDirection.headsign === selectedDirection.headsign
              ? { ...prev, stops, stopsLoading: false }
              : prev
          );
      })
      .catch(() => {
        if (!cancelled)
          setView((prev) =>
            prev.step === 'route' &&
            prev.route.id === route.id &&
            prev.selectedDirection.direction_id === selectedDirection.direction_id &&
            prev.selectedDirection.headsign === selectedDirection.headsign
              ? { ...prev, stops: [], stopsLoading: false }
              : prev
          );
      });
    return () => {
      cancelled = true;
    };
  }, [view]);

  const handleBack = () => {
    if (view.step === 'route') {
      setView({ step: 'list' });
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden bg-background">
      {view.step === 'route' && isMobile && (
        <div className="shrink-0 border-b border-border px-3 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-1 -ml-1"
            onClick={handleBack}
          >
            <ChevronLeft className="h-4 w-4" />
            {t('nav.back')}
          </Button>
        </div>
      )}

      <ScrollArea className="min-h-0 flex-1">
        <div className="p-3 pb-6">
          {view.step === 'list' && (
            <>
              {routesLoading && (
                <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span>{t('routes.loading')}</span>
                </div>
              )}
              {!routesLoading && routesError && (
                <p className="py-6 text-center text-sm text-destructive">
                  {routesError}
                </p>
              )}
              {!routesLoading && !routesError && routes.length === 0 && (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  {t('routes.noRoutes')}
                </p>
              )}
              {!routesLoading && !routesError && routes.length > 0 && (
                <ul className="space-y-2">
                  {routes.map((route) => (
                    <li key={route.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => handleSelectRoute(route)}
                      >
                        <span
                          className="inline-flex items-center justify-center rounded px-2 py-0.5 text-sm font-semibold shrink-0"
                          style={{
                            backgroundColor: toHex(route.route_color),
                            color: toHex(route.route_text_color),
                          }}
                        >
                          {route.short_name}
                        </span>
                        <span className="min-w-0 flex-1 text-base font-medium">
                          {route.long_name}
                        </span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}

          {view.step === 'route' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span
                  className="inline-flex items-center justify-center rounded px-2 py-0.5 text-sm font-semibold shrink-0"
                  style={{
                    backgroundColor: toHex(view.route.route_color),
                    color: toHex(view.route.route_text_color),
                  }}
                >
                  {view.route.short_name}
                </span>
                <span className="min-w-0 flex-1 text-base font-medium break-words">
                  {view.route.long_name}
                </span>
              </div>

              {view.route.directions && view.route.directions.length > 0 && (
                <DropdownMenu
                  trigger={
                    <button
                      type="button"
                      className="flex w-full items-start gap-2 rounded-md border border-border bg-card px-3 py-2.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <span className="min-w-0 flex-1 text-base font-medium break-words">
                        {view.selectedDirection.headsign || t('routes.selectDirection')}
                      </span>
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground mt-0.5" />
                    </button>
                  }
                >
                  <DropdownMenuContent className="max-h-[min(16rem,50vh)] overflow-y-auto">
                    {view.route.directions.map((dir) => (
                      <DropdownMenuItem
                        key={directionKey(dir)}
                        onClick={() => handleSelectHeadsign(dir)}
                        className="rounded-md border border-border bg-card px-3 py-2.5 text-base font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&:not(:first-child)]:mt-1"
                      >
                        <span className="min-w-0 flex-1 break-words">{dir.headsign}</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              <div className="pt-2">
                <p className="text-xs text-muted-foreground mb-2">
                  {view.selectedDirection.headsign
                    ? `${view.selectedDirection.headsign} – ${t('routes.stopsLabel')}`
                    : t('routes.stopsLabel')}
                </p>
                {view.stopsLoading && (
                  <div className="flex items-center justify-center py-6 gap-2 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>{t('routes.loadingStops')}</span>
                  </div>
                )}
                {!view.stopsLoading && view.stops.length === 0 && (
                  <p className="py-4 text-center text-sm text-muted-foreground">
                    {t('routes.noStops')}
                  </p>
                )}
                {!view.stopsLoading && view.stops.length > 0 && (
                  <ul className="space-y-1">
                    {[...view.stops]
                      .sort((a, b) => a.sequence - b.sequence)
                      .map((item) => (
                        <li
                          key={`${item.stop.id}-${item.sequence}`}
                          className="rounded-md border border-border bg-card"
                        >
                          <button
                            type="button"
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:bg-accent focus-visible:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
                            onClick={() => handleStopClick(item.stop.id)}
                          >
                            <span className="shrink-0 w-6 text-right tabular-nums text-muted-foreground">
                              {item.sequence}.
                            </span>
                            <span className="min-w-0 flex-1 break-words font-medium">
                              {item.stop.name}
                            </span>
                            <span className="shrink-0 text-xs text-muted-foreground">
                              {item.stop.id}
                            </span>
                          </button>
                        </li>
                      ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
