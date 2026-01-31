import type { BusStop } from '../api/types';


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


export function filterStopsByQuery(stops: BusStop[], query: string): BusStop[] {
  const q = query.trim();
  if (!q) return [];
  return stops.filter((stop) => stopMatchesQuery(stop, q));
}