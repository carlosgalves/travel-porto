import { useEffect, useRef } from 'react';
import { useMap } from 'react-leaflet';
import L from 'leaflet';
import { useMapContext, routeDirectionKey } from '../../contexts/MapContext';
import { useTheme } from '../../contexts/ThemeContext';
import { fetchRoutes, fetchRouteShapes } from '../../api/endpoints/routes';
import { drawRouteShape } from '../../lib/routeShapes';
import { toHex } from '../../lib/utils';

const FULL_OPACITY = 1;
const FADED_OPACITY = 0.2;

interface RouteLayer {
  polyline: L.Polyline;
  outlinePolyline?: L.Polyline;
  routeId: string;
  directionId: number;
}

/**
 * Draws route lines on the map for routes enabledin the filter.
 * When a stop drawer is open and the line doesn't match the stop it's faded out.
 */
export default function RouteFilterLines({ selectedStopId }: { selectedStopId: string | null }) {
  const map = useMap();
  const { enabledRouteIds, stopToRouteDirectionIds } = useMapContext();
  const { theme } = useTheme();
  const layersRef = useRef<RouteLayer[]>([]);
  const fadeStateRef = useRef({ selectedStopId, stopToRouteDirectionIds });
  fadeStateRef.current = { selectedStopId, stopToRouteDirectionIds };

  useEffect(() => {
    const activeIds =
      enabledRouteIds !== null && enabledRouteIds.size > 0
        ? Array.from(enabledRouteIds)
        : [];

    layersRef.current.forEach(({ polyline, outlinePolyline }) => {
      if (outlinePolyline?.getPane()) outlinePolyline.remove();
      if (polyline.getPane()) polyline.remove();
    });
    layersRef.current = [];

    if (activeIds.length === 0 || !map) return;

    let cancelled = false;

    void fetchRoutes().then((routes) => {
      if (cancelled || !map) return;
      const routeById = new Map(routes.map((r) => [r.id, r]));

      const directionPairs: { routeId: string; directionId: number }[] = [];
      for (const routeId of activeIds) {
        const route = routeById.get(routeId);
        if (!route?.directions?.length) continue;
        for (const dir of route.directions) {
          directionPairs.push({ routeId, directionId: dir.direction_id });
        }
      }

      const drawPromises = directionPairs.map(async ({ routeId, directionId }) => {
        if (cancelled || !map) return;
        try {
          const shapes = await fetchRouteShapes(routeId, directionId);
          if (cancelled || !map) return;
          const route = routeById.get(routeId);
          const color = toHex(route?.route_color ?? '#000000');
          const whiteOutline = theme === 'dark' && routeId.endsWith('M');
          for (const shape of shapes) {
            if (cancelled || !map) break;
            const result = drawRouteShape(map, shape, {
              color,
              whiteOutline,
            });
            if (result && !cancelled) {
              layersRef.current.push({
                polyline: result.polyline,
                outlinePolyline: result.outlinePolyline,
                routeId,
                directionId,
              });
            }
          }
        } catch {}
      });

      void Promise.all(drawPromises).then(() => {
        if (cancelled) return;
        const { selectedStopId: sid, stopToRouteDirectionIds: stopToDirections } = fadeStateRef.current;
        const directionKeysAtStop = sid ? stopToDirections.get(sid) : null;
        const faded = directionKeysAtStop != null;
        layersRef.current.forEach(({ polyline, outlinePolyline, routeId, directionId }) => {
          const key = routeDirectionKey(routeId, directionId);
          const opacity = faded && !directionKeysAtStop?.has(key) ? FADED_OPACITY : FULL_OPACITY;
          polyline.setStyle({ opacity });
          outlinePolyline?.setStyle({ opacity: opacity < 1 ? opacity : 1 });
        });
      });
    });

    return () => {
      cancelled = true;
      layersRef.current.forEach(({ polyline, outlinePolyline }) => {
        if (outlinePolyline?.getPane()) outlinePolyline.remove();
        if (polyline.getPane()) polyline.remove();
      });
      layersRef.current = [];
    };
  }, [map, enabledRouteIds, theme]);

  // Fade lines that don't match the selected stop
  useEffect(() => {
    const directionKeysAtStop = selectedStopId ? stopToRouteDirectionIds.get(selectedStopId) : null;
    const faded = directionKeysAtStop != null;

    layersRef.current.forEach(({ polyline, outlinePolyline, routeId, directionId }) => {
      const key = routeDirectionKey(routeId, directionId);
      const opacity = faded && !directionKeysAtStop?.has(key) ? FADED_OPACITY : FULL_OPACITY;
      polyline.setStyle({ opacity });
      outlinePolyline?.setStyle({ opacity: opacity < 1 ? opacity : 1 });
    });
  }, [selectedStopId, stopToRouteDirectionIds]);

  return null;
}
