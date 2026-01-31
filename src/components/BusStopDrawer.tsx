import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHandle,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { ScrollArea } from './ui/scroll-area';
import { Toggle } from './ui/toggle';
import { X, Locate, LocateFixed, Clock } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useTranslation } from '../lib/i18n';
import type {
  BusStop,
  BusScheduledArrivals,
  BusRealtimeArrivals,
} from '../api/types';
import {
  fetchBusScheduledArrivals,
  fetchBusRealtimeArrivals,
  invalidateRealtimeArrivalsCache,
} from '../api/endpoints/stops';
import { centerMap } from '../lib/map';
import L from 'leaflet';


interface BusStopDrawerProps {
  stop: BusStop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapInstance: L.Map | null;
}

export default function BusStopDrawer({
  stop,
  open,
  onOpenChange,
  mapInstance,
}: BusStopDrawerProps) {
  const { language } = useLanguage();
  const t = useTranslation(language);
  const isDebug = String(import.meta.env.VITE_DEBUG).toLowerCase() === 'true';
  const [isCenteredOnStop, setIsCenteredOnStop] = useState(false);
  const [arrivals, setArrivals] = useState<BusScheduledArrivals['data']>([]);
  const [realtimeArrivals, setRealtimeArrivals] = useState<
    BusRealtimeArrivals['data']
  >([]);
  const [arrivalsLoading, setArrivalsLoading] = useState(false);
  const [arrivalsError, setArrivalsError] = useState<string | null>(null);
  const [enabledRoutes, setEnabledRoutes] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!mapInstance || !stop || !open) {
      setIsCenteredOnStop(false);
      return;
    }

    const stopPosition: [number, number] = [stop.coordinates.latitude, stop.coordinates.longitude];

    const checkCenter = () => {
      const center = mapInstance.getCenter();
      const stopLatLng = L.latLng(stopPosition[0], stopPosition[1]);
      const distance = center.distanceTo(stopLatLng);

      const zoom = mapInstance.getZoom();
      const threshold = zoom >= 17 ? 30 : zoom >= 15 ? 100 : 200;
      const isCentered = distance < threshold;
      setIsCenteredOnStop(isCentered);
    };

    // Wait for map to finish moving before checking
    const checkAfterMove = () => {
      setTimeout(checkCenter, 100);
    };

    mapInstance.on('moveend', checkAfterMove);
    
    checkCenter();

    return () => {
      mapInstance.off('moveend', checkAfterMove);
    };
  }, [mapInstance, stop, open]);

  useEffect(() => {
    if (!open || !stop) {
      setArrivals([]);
      setRealtimeArrivals([]);
      setArrivalsLoading(false);
      setArrivalsError(null);
      setEnabledRoutes(new Set());
      return;
    }

    let cancelled = false;
    setArrivalsLoading(true);
    setArrivalsError(null);

    const scheduledPromise = fetchBusScheduledArrivals(stop.id);
    const realtimePromise = fetchBusRealtimeArrivals(stop.id).catch(() => []);

    Promise.all([scheduledPromise, realtimePromise])
      .then(([scheduledData, realtimeData]) => {
        if (cancelled) return;
        setArrivals(scheduledData);
        setRealtimeArrivals(Array.isArray(realtimeData) ? realtimeData : []);
        const allRouteIds = new Set([
          ...scheduledData.map((a) => a.trip.route_id),
          ...(Array.isArray(realtimeData)
            ? realtimeData.map((r) => r.trip.route_id)
            : []),
        ]);
        setEnabledRoutes(allRouteIds);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setArrivals([]);
        setRealtimeArrivals([]);
        setArrivalsError(
          err instanceof Error ? err.message : t('busStop.scheduledArrivalsError')
        );
        setEnabledRoutes(new Set());
      })
      .finally(() => {
        if (cancelled) return;
        setArrivalsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, stop?.id, t]);

  useEffect(() => {
    if (!open || !stop) return;

    const REFETCH_INTERVAL_MS = 10_000;

    const intervalId = setInterval(() => {
      invalidateRealtimeArrivalsCache(stop.id);
      fetchBusRealtimeArrivals(stop.id)
        .then(setRealtimeArrivals)
        .catch(() => {});
    }, REFETCH_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [open, stop?.id]);

  const handleReCenter = () => {
    if (mapInstance && stop) {
      centerMap(mapInstance, [stop.coordinates.latitude, stop.coordinates.longitude]);
      setIsCenteredOnStop(true);
    }
  };

  const getLocationIcon = () => {
    if (isCenteredOnStop) {
      return <LocateFixed className="h-5 w-5" />;
    }
    return <Locate className="h-5 w-5" />;
  };

  const formatTime = (time: string) =>
    time.length >= 5 ? time.slice(0, 5) : time;

  type DisplayArrival =
    | {
        type: 'realtime';
        route_id: string;
        trip_id: string;
        headsign: string;
        arrivalTime: string;
        key: string;
        raw: BusRealtimeArrivals['data'][number];
      }
    | {
        type: 'scheduled';
        route_id: string;
        trip_id: string;
        headsign: string;
        arrivalTime: string;
        key: string;
        raw: BusScheduledArrivals['data'][number];
      };

  const realtimeTripIds = new Set(realtimeArrivals.map((r) => r.trip.id));
  const displayItems: DisplayArrival[] = [
    ...realtimeArrivals.map((r) => ({
      type: 'realtime' as const,
      route_id: r.trip.route_id,
      trip_id: r.trip.id,
      headsign: r.trip.headsign ?? '',
      arrivalTime: r.realtime_arrival_time,
      key: `realtime-${r.trip.id}-${r.stop.sequence}-${r.realtime_arrival_time}`,
      raw: r,
    })),
    ...arrivals
      .filter((s) => !realtimeTripIds.has(s.trip.id))
      .map((s) => ({
        type: 'scheduled' as const,
        route_id: s.trip.route_id,
        trip_id: s.trip.id,
        headsign: s.trip.headsign ?? '',
        arrivalTime: s.arrival_time,
        key: `scheduled-${s.trip.id}-${s.stop.sequence}-${s.arrival_time}`,
        raw: s,
      })),
  ];

  const routeIds = Array.from(new Set(displayItems.map((d) => d.route_id))).sort();
  const visibleArrivals =
    enabledRoutes.size === 0
      ? displayItems
      : displayItems.filter((d) => enabledRoutes.has(d.route_id));

  const SNAP_POINTS = [0.6, 1.1] as const;
  const [activeSnapPoint, setActiveSnapPoint] = useState<number | null>(SNAP_POINTS[0]);

  useEffect(() => {
    if (!open) setActiveSnapPoint(SNAP_POINTS[0]);
  }, [open]);

  const setActiveSnapPointWrapper = (snapPoint: number | string | null) => {
    setActiveSnapPoint(snapPoint === null ? null : Number(snapPoint));
  };

  const isFullHeight = activeSnapPoint === SNAP_POINTS[SNAP_POINTS.length - 1];
  const contentWrapperRef = useRef<HTMLDivElement>(null);
  const contentHeaderRef = useRef<HTMLDivElement>(null);
  const [listVisibleHeight, setListVisibleHeight] = useState<number | null>(
    null
  );

  useLayoutEffect(() => {
    if (!open || !stop || isFullHeight) {
      setListVisibleHeight(null);
      return;
    }
    const measure = () => {
      const cw = contentWrapperRef.current;
      const header = contentHeaderRef.current;
      if (!cw || !header) return;
      const cwRect = cw.getBoundingClientRect();
      const headerRect = header.getBoundingClientRect();
      const viewportBottom = window.innerHeight;
      const listTop = headerRect.bottom;
      const listBottom = Math.min(cwRect.bottom, viewportBottom);
      const height = Math.max(0, listBottom - Math.max(listTop, 0));
      setListVisibleHeight(height);
    };
    measure();
    const raf = requestAnimationFrame(measure);
    const resizeObserver = new ResizeObserver(measure);
    if (contentWrapperRef.current) {
      resizeObserver.observe(contentWrapperRef.current);
    }
    const timeout = setTimeout(measure, 350);
    return () => {
      cancelAnimationFrame(raf);
      resizeObserver.disconnect();
      clearTimeout(timeout);
    };
  }, [open, stop, activeSnapPoint, isFullHeight]);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      modal={false}
      dismissible
      handleOnly
      snapPoints={[...SNAP_POINTS]}
      activeSnapPoint={activeSnapPoint}
      setActiveSnapPoint={setActiveSnapPointWrapper}
    >
      <DrawerContent showOverlay={false} className="drawer-map-passthrough !z-40">
        <div className="drawer-interactive flex min-h-0 flex-1 flex-col">
          <DrawerHeader>
            <div className="flex items-center justify-between w-full gap-2">
              <DrawerHandle className="min-w-0 flex-1 cursor-grab active:cursor-grabbing border-0 bg-transparent p-0 text-left [&]:block">
                <DrawerTitle className="text-left">
                  {stop?.name || t('busStop.title')}
                </DrawerTitle>
              </DrawerHandle>
              <div className="flex shrink-0 items-center gap-2">
                {stop && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReCenter}
                  >
                    {getLocationIcon()}
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {stop && (
              <DrawerDescription className="mt-1 flex justify-between text-muted-foreground">
                <span>{stop.id}</span>
                <span>{stop.zone_id}</span>
              </DrawerDescription>
            )}
          </DrawerHeader>

          {stop && (
            <div
              ref={contentWrapperRef}
              className="flex min-h-0 flex-1 flex-col overflow-hidden border-t border-border px-4 pb-4 pt-3"
            >
              <div ref={contentHeaderRef} className="shrink-0">
                <div className="text-sm font-medium mb-2">
                  {t('busStop.linesAtThisStop')}
                </div>

              {routeIds.length > 0 && (
                <div className="mb-4 flex shrink-0 flex-wrap gap-2">
                  {routeIds.map((routeId) => {
                    const pressed = enabledRoutes.has(routeId);
                    const isMSeries = routeId.endsWith('M');
                    const toggle = (
                      <Toggle
                        key={routeId}
                        size="sm"
                        variant="outline"
                        pressed={pressed}
                        onPressedChange={(next) => {
                          setEnabledRoutes((prev) => {
                            const s = new Set(prev);
                            if (next) s.add(routeId);
                            else s.delete(routeId);
                            if (s.size === 0) return new Set(routeIds);
                            return s;
                          });
                        }}
                        className="gap-0"
                        style={{
                          backgroundColor: pressed
                            ? `var(--route-${routeId}, var(--accent))`
                            : 'var(--muted)',
                          borderColor: pressed
                            ? `var(--route-${routeId}, var(--border))`
                            : 'var(--border)',
                          color: pressed
                            ? `var(--route-text-${routeId}, var(--accent-foreground))`
                            : 'var(--muted-foreground)',
                          opacity: pressed ? 1 : 0.7,
                        }}
                      >
                        {routeId}
                      </Toggle>
                    );
                    return isMSeries ? (
                      <span
                        key={routeId}
                        className="inline-flex rounded-md border border-transparent dark:border-white/80"
                      >
                        {toggle}
                      </span>
                    ) : (
                      toggle
                    );
                  })}
                </div>
              )}

              <div className="text-sm font-medium mb-2">
                  {t('busStop.nextArrivals')}
                </div>

                {arrivalsLoading && (
                <div className="text-sm text-muted-foreground">
                  {t('busStop.loadingScheduledArrivals')}
                </div>
              )}

              {!arrivalsLoading && arrivalsError && (
                <div className="text-sm text-destructive">
                  {arrivalsError}
                </div>
              )}

              {!arrivalsLoading && !arrivalsError && visibleArrivals.length === 0 && (
                  <div className="text-sm text-muted-foreground">
                    {t('busStop.noScheduledArrivals')}
                  </div>
                )}
              </div>

              {!arrivalsLoading && !arrivalsError && visibleArrivals.length > 0 && (
                <ScrollArea
                  className={
                    listVisibleHeight != null
                      ? 'min-h-0 shrink-0 pr-3'
                      : 'min-h-0 flex-1 pr-3'
                  }
                  style={
                    listVisibleHeight != null
                      ? { height: listVisibleHeight }
                      : undefined
                  }
                >
                  <div className="space-y-3 pb-4">
                    {visibleArrivals
                      .filter((item) => item.type === 'realtime')
                      .map((item) => (
                        <div
                          key={item.key}
                          className={[
                            'rounded-md border border-l-4 px-3 py-2',
                            'border-t border-r border-b border-t-blue-500 border-r-blue-500 border-b-blue-500 bg-blue-50/80 dark:border-t-blue-400 dark:border-r-blue-400 dark:border-b-blue-400 dark:bg-blue-950/20',
                          ].join(' ')}
                          style={{
                            borderLeftColor: `var(--route-${item.route_id}, var(--border))`,
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2 shrink-0">
                              
                              <span
                                className={[
                                  'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                                  item.route_id.endsWith('M')
                                    ? 'border border-transparent dark:border-white/80'
                                    : '',
                                ].join(' ')}
                                style={{
                                  backgroundColor: `var(--route-${item.route_id}, var(--muted))`,
                                  color: `var(--route-text-${item.route_id}, var(--foreground))`,
                                }}
                              >
                                {item.route_id}
                              </span>
                            </div>
                            <div className="min-w-0 flex-1 text-base font-medium text-foreground truncate">
                              {item.headsign}
                            </div>
                            <div className="text-sm font-bold tabular-nums text-right shrink-0">
                              {item.raw.arrival_minutes < 1
                                ? t('busStop.arrivalNow')
                                : `${item.raw.arrival_minutes} min`}
                            </div>
                          </div>

                          {isDebug && (
                            <details className="mt-1">
                              <summary className="cursor-pointer text-xs text-muted-foreground select-none">
                                Debug
                              </summary>
                              <div className="mt-1 text-xs text-muted-foreground">
                                vehicle_id={item.raw.vehicle_id} · trip.id=
                                {item.raw.trip.id} · arrival_minutes=
                                {item.raw.arrival_minutes} · delay_minutes=
                                {item.raw.delay_minutes} · status={item.raw.status}
                              </div>
                            </details>
                          )}
                        </div>
                      ))}

                    {visibleArrivals.filter((item) => item.type === 'scheduled')
                      .length > 0 && (
                      <>
                        <div className="flex items-center gap-2 text-sm font-medium">
                          <Clock
                            className="h-4 w-4 text-muted-foreground shrink-0"
                            aria-label="Scheduled"
                          />
                          {t('busStop.scheduledArrivalsLabel')}
                        </div>
                        <div className="space-y-2">
                          {visibleArrivals
                            .filter((item) => item.type === 'scheduled')
                            .map((item) => (
                              <div
                                key={item.key}
                                className="rounded-md border border-l-4 px-3 py-2"
                                style={{
                                  borderLeftColor: `var(--route-${item.route_id}, var(--border))`,
                                }}
                              >
                                <div className="flex items-center justify-between gap-3">
                                  <div className="flex items-center gap-2 shrink-0">
                                    <span
                                      className={[
                                        'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
                                        item.route_id.endsWith('M')
                                          ? 'border border-transparent dark:border-white/80'
                                          : '',
                                      ].join(' ')}
                                      style={{
                                        backgroundColor: `var(--route-${item.route_id}, var(--muted))`,
                                        color: `var(--route-text-${item.route_id}, var(--foreground))`,
                                      }}
                                    >
                                      {item.route_id}
                                    </span>
                                  </div>
                                  <div className="min-w-0 flex-1 text-base font-medium text-foreground truncate">
                                    {item.headsign}
                                  </div>
                                  <div className="text-sm font-medium tabular-nums text-right shrink-0">
                                    {formatTime(item.arrivalTime)}
                                  </div>
                                </div>

                                {isDebug && (
                                  <details className="mt-1">
                                    <summary className="cursor-pointer text-xs text-muted-foreground select-none">
                                      Debug
                                    </summary>
                                    <div className="mt-1 text-xs text-muted-foreground">
                                      number={item.raw.trip.number} · trip.id=
                                      {item.raw.trip.id} · service_id=
                                      {item.raw.trip.service_id} · direction_id=
                                      {item.raw.trip.direction_id} · stop.sequence=
                                      {item.raw.stop.sequence} · depart=
                                      {formatTime(item.raw.departure_time)}
                                    </div>
                                  </details>
                                )}
                              </div>
                            ))}
                        </div>
                      </>
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
