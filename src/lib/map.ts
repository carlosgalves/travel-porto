import type L from 'leaflet';

const CENTER_ANIMATION = {
  animate: true,
  duration: 0.5,
  easeLinearity: 0.25,
} as const;


// Centers the map on the given coordinates with a smooth animation
export function centerMap(
  map: L.Map | null,
  center: [number, number],
  zoom = 16
): void {
  if (!map) return;
  map.setView(center, zoom, CENTER_ANIMATION);
}