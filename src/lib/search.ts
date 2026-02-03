import type { BusStop, Route } from '../api/types';

export function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

export function stopMatchesQuery(stop: BusStop, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const nq = normalizeForSearch(q);
  const nName = normalizeForSearch(stop.name);
  const nId = normalizeForSearch(stop.id);
  return nName.includes(nq) || nId.includes(nq);
}

export function routeMatchesQuery(route: Route, query: string): boolean {
  const q = query.trim();
  if (!q) return false;
  const nq = normalizeForSearch(q);
  const nShort = normalizeForSearch(route.short_name);
  const nLong = normalizeForSearch(route.long_name);
  const nId = normalizeForSearch(route.id);
  return nShort.includes(nq) || nLong.includes(nq) || nId.includes(nq);
}

export function filterStopsByQuery(stops: BusStop[], query: string): BusStop[] {
  const q = query.trim();
  if (!q) return [];
  return stops.filter((stop) => stopMatchesQuery(stop, q));
}

export function filterRoutesByQuery(routes: Route[], query: string): Route[] {
  const q = query.trim();
  if (!q) return [];
  return routes.filter((route) => routeMatchesQuery(route, q));
}