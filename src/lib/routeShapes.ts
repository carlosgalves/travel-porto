import L from 'leaflet';
import type { RouteShapeItem } from '../api/types';


export function shapeToLatLngs(shape: RouteShapeItem): [number, number][] {
  const sorted = [...(shape.points ?? [])].sort((a, b) => a.sequence - b.sequence);
  return sorted.map((p) => [p.coordinates.latitude, p.coordinates.longitude]);
}

export interface DrawRouteShapeOptions {
  color: string;
  weight?: number;
  opacity?: number;
  debug?: boolean;
  // draw white outline on dark mode for M lines
  whiteOutline?: boolean;
  // offset meters to draw overlapping routes side by side
  offsetMeters?: number;
}

const DEFAULT_OPTIONS: Required<Omit<DrawRouteShapeOptions, 'debug' | 'offsetMeters'>> = {
  color: '#000000',
  weight: 5,
  opacity: 0.9,
  whiteOutline: false,
};

export interface DrawRouteShapeResult {
  polyline: L.Polyline;
  outlinePolyline?: L.Polyline; // white outline on dark mode for M lines
  markers: L.CircleMarker[];
}


export function drawRouteShape(
  map: L.Map,
  shape: RouteShapeItem,
  options: DrawRouteShapeOptions
): DrawRouteShapeResult | null {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let latlngs = shapeToLatLngs(shape);
  if (latlngs.length < 2) return null;

  const offsetM = opts.offsetMeters ?? 0;
  if (Math.abs(offsetM) >= 1e-6) {
    const lat0 = latlngs[0][0];
    // Convert offset meters to degrees longitude (≈111 km/deg × cos(lat) at this latitude)
    const mPerDegLng = 111_000 * Math.cos((lat0 * Math.PI) / 180);
    const dLng = offsetM / mPerDegLng;
    latlngs = latlngs.map(([lat, lng]) => [lat, lng + dLng]);
  }

  let outlinePolyline: L.Polyline | undefined;
  if (opts.whiteOutline) {
    const outlineWeight = (opts.weight ?? DEFAULT_OPTIONS.weight) + 3;
    outlinePolyline = L.polyline(latlngs, {
      color: '#ffffff',
      weight: outlineWeight,
      opacity: 1,
    }).addTo(map);
  }

  const polyline = L.polyline(latlngs, {
    color: opts.color,
    weight: opts.weight,
    opacity: opts.opacity,
  }).addTo(map);

  // draw shape points when debug=true
  const markers: L.CircleMarker[] = [];
  if (opts.debug) {
    for (const [lat, lng] of latlngs) {
      const marker = L.circleMarker([lat, lng], {
        radius: 4,
        fillColor: opts.color,
        color: '#fff',
        weight: 1,
        opacity: 1,
        fillOpacity: 0.9,
      }).addTo(map);
      markers.push(marker);
    }
  }

  return { polyline, outlinePolyline, markers };
}
