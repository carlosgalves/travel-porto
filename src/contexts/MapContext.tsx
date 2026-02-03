import { createContext, useCallback, useContext, useEffect, useState, useRef } from 'react';
import type { ReactNode } from 'react';
import type L from 'leaflet';
import type { BusStop } from '../api/types';
import { fetchRoutes, fetchRouteStopsAll } from '../api/endpoints/routes';

const SAVED_STOPS_STORAGE_KEY = 'travel-porto-saved-stops';

function loadSavedStops(): BusStop[] {
  try {
    const raw = localStorage.getItem(SAVED_STOPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is BusStop =>
        item &&
        typeof item === 'object' &&
        typeof (item as BusStop).id === 'string' &&
        typeof (item as BusStop).name === 'string' &&
        typeof (item as BusStop).coordinates?.latitude === 'number' &&
        typeof (item as BusStop).coordinates?.longitude === 'number' &&
        typeof (item as BusStop).zone_id === 'string'
    );
  } catch {
    return [];
  }
}

export type EnabledRouteIds = Set<string> | null;

interface MapContextType {
  mapInstance: L.Map | null;
  userPosition: [number, number] | null;
  hasLocationPermission: boolean;
  isCenteredOnUser: boolean;
  savedStops: BusStop[];
  setMapInstance: (map: L.Map | null) => void;
  setUserPosition: (position: [number, number] | null) => void;
  setHasLocationPermission: (hasPermission: boolean) => void;
  setIsCenteredOnUser: (isCentered: boolean) => void;
  addSavedStop: (stop: BusStop) => void;
  removeSavedStop: (stopId: string) => void;
  isSavedStop: (stopId: string) => boolean;
  requestLocation: () => void;
  setRequestLocation: (fn: () => void) => void;
  enabledRouteIds: EnabledRouteIds;
  setEnabledRouteIds: (value: EnabledRouteIds | ((prev: EnabledRouteIds) => EnabledRouteIds)) => void;
  stopToRouteIds: Map<string, Set<string>>;
  loadStopToRouteIds: () => void;
  stopToRouteIdsLoading: boolean;
}

const MapContext = createContext<MapContextType | undefined>(undefined);


export function MapProvider({ children }: { children: ReactNode }) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(true);
  const [isCenteredOnUser, setIsCenteredOnUser] = useState<boolean>(false);
  const [savedStops, setSavedStops] = useState<BusStop[]>(loadSavedStops);
  const [requestLocation, setRequestLocation] = useState<() => void>(() => () => {});

  const [enabledRouteIds, setEnabledRouteIdsState] = useState<EnabledRouteIds>(null);
  const setEnabledRouteIds = useCallback((value: EnabledRouteIds | ((prev: EnabledRouteIds) => EnabledRouteIds)) => {
    setEnabledRouteIdsState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      return next;
    });
  }, []);

  const [stopToRouteIds, setStopToRouteIds] = useState<Map<string, Set<string>>>(() => new Map());
  const [stopToRouteIdsLoading, setStopToRouteIdsLoading] = useState(false);
  const stopToRouteIdsLoadedRef = useRef(false);

  const loadStopToRouteIds = useCallback(() => {
    if (stopToRouteIdsLoadedRef.current || stopToRouteIdsLoading) return;
    stopToRouteIdsLoadedRef.current = true;
    setStopToRouteIdsLoading(true);
    fetchRoutes()
      .then((routes) => {
        const allStops = new Map<string, Set<string>>();
        return Promise.all(
          routes.map((route) =>
            fetchRouteStopsAll(route.id)
              .then((data) => {
                (data.directions ?? []).forEach((dir) => {
                  (dir.stops ?? []).forEach((s) => {
                    const stopId = s.stop?.id;
                    if (stopId) {
                      if (!allStops.has(stopId)) allStops.set(stopId, new Set());
                      allStops.get(stopId)!.add(route.id);
                    }
                  });
                });
              })
              .catch(() => {})
          )
        ).then(() => allStops);
      })
      .then((map) => {
        setStopToRouteIds(new Map(map));
      })
      .catch(() => {
        stopToRouteIdsLoadedRef.current = false;
      })
      .finally(() => {
        setStopToRouteIdsLoading(false);
      });
  }, [stopToRouteIdsLoading]);

  useEffect(() => {
    localStorage.setItem(SAVED_STOPS_STORAGE_KEY, JSON.stringify(savedStops));
  }, [savedStops]);

  const addSavedStop = useCallback((stop: BusStop) => {
    setSavedStops((prev) => {
      if (prev.some((s) => s.id === stop.id)) return prev;
      return [...prev, stop];
    });
  }, []);

  const removeSavedStop = useCallback((stopId: string) => {
    setSavedStops((prev) => prev.filter((s) => s.id !== stopId));
  }, []);

  const isSavedStop = useCallback(
    (stopId: string) => savedStops.some((s) => s.id === stopId),
    [savedStops]
  );

  return (
    <MapContext.Provider
      value={{
        mapInstance, setMapInstance,
        userPosition, setUserPosition,
        hasLocationPermission, setHasLocationPermission,
        isCenteredOnUser, setIsCenteredOnUser,
        savedStops, addSavedStop, removeSavedStop, isSavedStop,
        requestLocation, setRequestLocation,
        enabledRouteIds, setEnabledRouteIds,
        stopToRouteIds, loadStopToRouteIds, stopToRouteIdsLoading,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}