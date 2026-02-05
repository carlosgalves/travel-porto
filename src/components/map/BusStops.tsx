import { memo, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Marker, Tooltip } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { fetchBusStops, type BusStop } from '../../api/types';
import { useMapContext } from '../../contexts/MapContext';
import { Badge } from '../ui/badge';


const BUS_STOP_ICON_UNSELECTED = L.divIcon({
  className: 'bus-stop-marker',
  html: `
    <div style="
      width: var(--marker-bus-stop-size);
      height: var(--marker-bus-stop-size);
      border-radius: 50%;
      background: var(--color-bus-stop-unselected);
      border: var(--marker-bus-stop-border) solid var(--color-white);
      box-shadow: var(--marker-shadow);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

const BUS_STOP_ICON_SAVED = L.divIcon({
  className: 'bus-stop-marker',
  html: `
    <div style="
      width: var(--marker-bus-stop-size);
      height: var(--marker-bus-stop-size);
      border-radius: 50%;
      background: var(--color-bus-stop-unselected);
      border: var(--marker-bus-stop-border) solid var(--color-white);
      outline: 2px solid var(--color-bus-stop-saved);
      outline-offset: 2px;
      box-shadow: var(--marker-shadow);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

const BUS_STOP_ICON_SELECTED = L.divIcon({
  className: 'bus-stop-marker',
  html: `
    <div style="
      width: var(--marker-bus-stop-size);
      height: var(--marker-bus-stop-size);
      border-radius: 50%;
      background: var(--color-bus-stop-selected);
      border: var(--marker-bus-stop-border) solid var(--color-white);
      box-shadow: var(--marker-shadow);
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

// Used when the stop has no enabled routes due to route filter
const BUS_STOP_ICON_DISABLED = L.divIcon({
  className: 'bus-stop-marker',
  html: `
    <div style="
      width: var(--marker-bus-stop-size);
      height: var(--marker-bus-stop-size);
      border-radius: 50%;
      background: var(--color-bus-stop-unselected);
      border: var(--marker-bus-stop-border) solid var(--color-white);
      box-shadow: var(--marker-shadow);
      opacity: 0.45;
    "></div>
  `,
  iconSize: [20, 20],
  iconAnchor: [10, 10],
  popupAnchor: [0, -10]
});

const CLUSTER_SIZE_PX = { small: 32, medium: 38, large: 44 } as const;

function createClusterIcon(
  cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] },
  savedStopIds: Set<string>,
  disabledStopIds: Set<string>
) {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();
  const hasSavedStop = markers.some(
    (m) => (m.options as L.MarkerOptions & { stopId?: string }).stopId && savedStopIds.has((m.options as L.MarkerOptions & { stopId?: string }).stopId!)
  );
  const allDisabled = disabledStopIds.size > 0 && markers.every(
    (m) => (m.options as L.MarkerOptions & { stopId?: string }).stopId && disabledStopIds.has((m.options as L.MarkerOptions & { stopId?: string }).stopId!)
  );
  const size = count < 10 ? 'small' : count < 30 ? 'medium' : 'large';
  const px = CLUSTER_SIZE_PX[size];
  const outlineStyle = hasSavedStop
    ? 'outline: 2px solid var(--color-bus-stop-saved); outline-offset: 2px;'
    : '';
  const disabledStyle = allDisabled
    ? 'opacity: 0.45; background-color: var(--muted, #9ca3af); border-color: var(--muted, #9ca3af);'
    : '';
  return L.divIcon({
    html: `<div class="custom-cluster-icon" style="
      background-color: var(--color-cluster);
      color: white;
      border: 2px solid var(--color-cluster);
      border-radius: 50%;
      width: ${px}px;
      height: ${px}px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
      font-size: ${size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px'};
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ${outlineStyle}
      ${disabledStyle}
    ">${count}</div>`,
    className: 'cluster-icon-wrapper',
    iconSize: L.point(px, px),
  });
}

function getBusStopIcon(isSelected: boolean, isSaved: boolean, isDisabled: boolean) {
  if (isDisabled) return BUS_STOP_ICON_DISABLED;
  if (isSelected) return BUS_STOP_ICON_SELECTED;
  if (isSaved) return BUS_STOP_ICON_SAVED;
  return BUS_STOP_ICON_UNSELECTED;
}


/** Offset to spread overlapping stops so that they are clickable */

const OVERLAP_OFFSET_DEG = 0.00005;


function getStopPositions(stops: BusStop[]): Map<string, [number, number]> {
  const key = (s: BusStop) =>
    `${s.coordinates.latitude.toFixed(6)},${s.coordinates.longitude.toFixed(6)}`;
  const byPos = new Map<string, BusStop[]>();
  for (const stop of stops) {
    const k = key(stop);
    if (!byPos.has(k)) byPos.set(k, []);
    byPos.get(k)!.push(stop);
  }
  const positions = new Map<string, [number, number]>();
  for (const [, group] of byPos) {
    if (group.length === 1) {
      const s = group[0];
      positions.set(s.id, [s.coordinates.latitude, s.coordinates.longitude]);
      continue;
    }
    const baseLat = group[0].coordinates.latitude;
    const baseLng = group[0].coordinates.longitude;
    group.forEach((s, i) => {
      const angle = (2 * Math.PI * i) / group.length;
      const lat = baseLat + OVERLAP_OFFSET_DEG * Math.cos(angle);
      const lng = baseLng + OVERLAP_OFFSET_DEG * Math.sin(angle);
      positions.set(s.id, [lat, lng]);
    });
  }
  return positions;
}

interface BusStopMarkerProps {
  stop: BusStop;
  position: [number, number];
  isSelected: boolean;
  isSaved: boolean;
  isDisabled: boolean;
  enabledRouteIdsAtStop: string[];
  showRouteBadges: boolean;
  onStopClick: (stop: BusStop) => void;
}

const BusStopMarker = memo(function BusStopMarker({
  stop,
  position,
  isSelected,
  isSaved,
  isDisabled,
  enabledRouteIdsAtStop,
  showRouteBadges,
  onStopClick,
}: BusStopMarkerProps) {
  const showBadges = showRouteBadges && enabledRouteIdsAtStop.length > 0;

  return (
    <Marker
      position={position}
      icon={getBusStopIcon(isSelected, isSaved, isDisabled)}
      eventHandlers={{
        click: () => onStopClick(stop),
      }}
      {...({ stopId: stop.id } as { stopId: string })}
    >
      {showBadges && (
        <Tooltip
          permanent
          direction="right"
          offset={[14, 0]}
          className="route-badge-tooltip"
        >
          <div className="flex items-center gap-1 pointer-events-none">
            {enabledRouteIdsAtStop.map((routeId) => (
              <Badge
                key={routeId}
                variant="secondary"
                className={
                  routeId.endsWith('M')
                    ? 'border border-transparent dark:border-white/80'
                    : ''
                }
                style={{
                  backgroundColor: `var(--route-${routeId}, var(--muted))`,
                  color: `var(--route-text-${routeId}, var(--foreground))`,
                  borderColor: 'transparent',
                }}
              >
                {routeId}
              </Badge>
            ))}
          </div>
        </Tooltip>
      )}
    </Marker>
  );
});

interface BusStopsProps {
  onStopClick: (stop: BusStop) => void;
  selectedStopId?: string | null;
  urlStopId?: string | null;
}

export default function BusStops({ onStopClick, selectedStopId, urlStopId }: BusStopsProps) {
  const { savedStops, enabledRouteIds, stopToRouteIds } = useMapContext();
  const savedStopIds = useMemo(() => new Set(savedStops.map((s) => s.id)), [savedStops]);

  const disabledStopIds = useMemo(() => {
    if (enabledRouteIds === null) return new Set<string>();
    const disabled = new Set<string>();
    stopToRouteIds.forEach((routeIds, stopId) => {
      const hasEnabled = [...routeIds].some((r) => enabledRouteIds.has(r));
      if (!hasEnabled) disabled.add(stopId);
    });
    return disabled;
  }, [enabledRouteIds, stopToRouteIds]);

  const stopHasEnabledRoute = useCallback(
    (stopId: string) => {
      if (enabledRouteIds === null) return true;
      const routeIds = stopToRouteIds.get(stopId);
      if (!routeIds) return true;
      return [...routeIds].some((r) => enabledRouteIds.has(r));
    },
    [enabledRouteIds, stopToRouteIds]
  );

  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clusterGroupRef = useRef<{
    options: { iconCreateFunction?: (cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) => L.DivIcon };
    refreshClusters: () => void;
  } | null>(null);

  const iconCreateFunction = useCallback(
    (cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) =>
      createClusterIcon(cluster, savedStopIds, disabledStopIds),
    [savedStopIds, disabledStopIds]
  );

  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group?.refreshClusters) return;
    group.options.iconCreateFunction = iconCreateFunction;
    group.refreshClusters();
  }, [savedStopIds, disabledStopIds, iconCreateFunction]);

  useEffect(() => {
    fetchBusStops()
      .then((data) => {
        setStops(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load bus stops:', err);
        setError('Failed to load bus stops');
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!urlStopId || stops.length === 0 || selectedStopId === urlStopId) return;
    const stop = stops.find((s) => s.id === urlStopId);
    if (stop) onStopClick(stop);
  }, [urlStopId, stops, selectedStopId, onStopClick]);

  const stopPositions = useMemo(() => getStopPositions(stops), [stops]);

  const showRouteBadges =
    enabledRouteIds !== null && enabledRouteIds.size > 1;

  const stopToEnabledRouteIds = useMemo(() => {
    if (!showRouteBadges || !enabledRouteIds) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    stopToRouteIds.forEach((routeIds, stopId) => {
      const enabled = [...routeIds].filter((r) => enabledRouteIds.has(r));
      if (enabled.length > 0) map.set(stopId, enabled);
    });
    return map;
  }, [showRouteBadges, enabledRouteIds, stopToRouteIds]);

  if (loading || error) {
    return null;
  }

  return (
    <MarkerClusterGroup
      ref={clusterGroupRef}
      chunkedLoading
      spiderfyOnMaxZoom={false}
      zoomToBoundsOnClick={true}
      showCoverageOnHover={false}
      removeOutsideVisibleBounds={true}
      animate={true}
      maxClusterRadius={80}
      disableClusteringAtZoom={17}
      iconCreateFunction={iconCreateFunction}
    >
      {stops.map((stop) => (
        <BusStopMarker
          key={stop.id}
          stop={stop}
          position={stopPositions.get(stop.id) ?? [stop.coordinates.latitude, stop.coordinates.longitude]}
          isSelected={selectedStopId === stop.id}
          isSaved={savedStopIds.has(stop.id)}
          isDisabled={!stopHasEnabledRoute(stop.id)}
          enabledRouteIdsAtStop={stopToEnabledRouteIds.get(stop.id) ?? []}
          showRouteBadges={showRouteBadges}
          onStopClick={onStopClick}
        />
      ))}
    </MarkerClusterGroup>
  );
}