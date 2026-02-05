import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type L from 'leaflet';
import type { BusStop, Route } from '../api/types';
import { fetchRoutes, fetchRouteStopsAll } from '../api/endpoints/routes';
import { runWithConcurrency, withRetry } from '../lib/async';

const SAVED_STOPS_STORAGE_KEY = 'travel-porto-saved-stops';
const SAVED_ROUTES_STORAGE_KEY = 'travel-porto-saved-routes';

let cachedStopToRouteIds: Map<string, Set<string>> | null = null;

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

function loadSavedRoutes(): Route[] {
  try {
    const raw = localStorage.getItem(SAVED_ROUTES_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is Route =>
        item &&
        typeof item === 'object' &&
        typeof (item as Route).id === 'string' &&
        typeof (item as Route).short_name === 'string' &&
        typeof (item as Route).long_name === 'string'
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
  savedRoutes: Route[];
  setMapInstance: (map: L.Map | null) => void;
  setUserPosition: (position: [number, number] | null) => void;
  setHasLocationPermission: (hasPermission: boolean) => void;
  setIsCenteredOnUser: (isCentered: boolean) => void;
  addSavedStop: (stop: BusStop) => void;
  removeSavedStop: (stopId: string) => void;
  isSavedStop: (stopId: string) => boolean;
  addSavedRoute: (route: Route) => void;
  removeSavedRoute: (routeId: string) => void;
  isSavedRoute: (routeId: string) => boolean;
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
  const [savedRoutes, setSavedRoutes] = useState<Route[]>(loadSavedRoutes);
  const [requestLocation, setRequestLocation] = useState<() => void>(() => () => {});

  const [enabledRouteIds, setEnabledRouteIdsState] = useState<EnabledRouteIds>(null);
  const setEnabledRouteIds = useCallback((value: EnabledRouteIds | ((prev: EnabledRouteIds) => EnabledRouteIds)) => {
    setEnabledRouteIdsState((prev) => {
      const next = typeof value === 'function' ? value(prev) : value;
      return next;
    });
  }, []);

  const [stopToRouteIds, setStopToRouteIds] = useState<Map<string, Set<string>>>(() => {
    if (cachedStopToRouteIds) {
      return new Map([...cachedStopToRouteIds].map(([k, v]) => [k, new Set(v)]));
    }
    return new Map();
  });
  const [stopToRouteIdsLoading, setStopToRouteIdsLoading] = useState(false);

  // Fetch stops for each route on app load, limiting concurrent requests
  const CONCURRENCY = 3;

  useEffect(() => {
    if (cachedStopToRouteIds !== null) return;
    setStopToRouteIdsLoading(true);
    fetchRoutes()
      .then((routes) => {
        const tasks = routes.map(
          (route) => () => withRetry(() => fetchRouteStopsAll(route.id), Infinity) // retry until success
        );
        return runWithConcurrency(tasks, CONCURRENCY).then((results) => {
          const allStops = new Map<string, Set<string>>();
          results.forEach((data, i) => {
            if (!data || i >= routes.length) return;
            const route = routes[i];
            (data.directions ?? []).forEach((dir) => {
              (dir.stops ?? []).forEach((s) => {
                const stopId = s.stop?.id;
                if (stopId) {
                  if (!allStops.has(stopId)) allStops.set(stopId, new Set());
                  allStops.get(stopId)!.add(route.id);
                }
              });
            });
          });
          return allStops;
        });
      })
      .then((map) => {
        cachedStopToRouteIds = new Map([...map].map(([k, v]) => [k, new Set(v)]));
        setStopToRouteIds(new Map([...map].map(([k, v]) => [k, new Set(v)])));
      })
      .catch(() => {})
      .finally(() => {
        setStopToRouteIdsLoading(false);
      });
  }, []);

  const loadStopToRouteIds = useCallback(() => {
    if (cachedStopToRouteIds !== null) {
      setStopToRouteIds(new Map([...cachedStopToRouteIds].map(([k, v]) => [k, new Set(v)])));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(SAVED_STOPS_STORAGE_KEY, JSON.stringify(savedStops));
  }, [savedStops]);

  useEffect(() => {
    localStorage.setItem(SAVED_ROUTES_STORAGE_KEY, JSON.stringify(savedRoutes));
  }, [savedRoutes]);

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

  const addSavedRoute = useCallback((route: Route) => {
    setSavedRoutes((prev) => {
      if (prev.some((r) => r.id === route.id)) return prev;
      return [...prev, route];
    });
  }, []);

  const removeSavedRoute = useCallback((routeId: string) => {
    setSavedRoutes((prev) => prev.filter((r) => r.id !== routeId));
  }, []);

  const isSavedRoute = useCallback(
    (routeId: string) => savedRoutes.some((r) => r.id === routeId),
    [savedRoutes]
  );

  return (
    <MapContext.Provider
      value={{
        mapInstance, setMapInstance,
        userPosition, setUserPosition,
        hasLocationPermission, setHasLocationPermission,
        isCenteredOnUser, setIsCenteredOnUser,
        savedStops, addSavedStop, removeSavedStop, isSavedStop,
        savedRoutes, addSavedRoute, removeSavedRoute, isSavedRoute,
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