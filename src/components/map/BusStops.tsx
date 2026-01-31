import { memo, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { fetchBusStops, type BusStop } from '../../api/types';
import { useMapContext } from '../../contexts/MapContext';


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

const CLUSTER_SIZE_PX = { small: 32, medium: 38, large: 44 } as const;

function createClusterIcon(
  cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] },
  savedStopIds: Set<string>
) {
  const count = cluster.getChildCount();
  const markers = cluster.getAllChildMarkers();
  const hasSavedStop = markers.some(
    (m) => (m.options as L.MarkerOptions & { stopId?: string }).stopId && savedStopIds.has((m.options as L.MarkerOptions & { stopId?: string }).stopId!)
  );
  const size = count < 10 ? 'small' : count < 30 ? 'medium' : 'large';
  const px = CLUSTER_SIZE_PX[size];
  const outlineStyle = hasSavedStop
    ? 'outline: 2px solid var(--color-bus-stop-saved); outline-offset: 2px;'
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
    ">${count}</div>`,
    className: 'cluster-icon-wrapper',
    iconSize: L.point(px, px),
  });
}

function getBusStopIcon(isSelected: boolean, isSaved: boolean) {
  if (isSelected) return BUS_STOP_ICON_SELECTED;
  if (isSaved) return BUS_STOP_ICON_SAVED;
  return BUS_STOP_ICON_UNSELECTED;
}

interface BusStopMarkerProps {
  stop: BusStop;
  isSelected: boolean;
  isSaved: boolean;
  onStopClick: (stop: BusStop) => void;
}

const BusStopMarker = memo(function BusStopMarker({ stop, isSelected, isSaved, onStopClick }: BusStopMarkerProps) {
  return (
    <Marker
      position={[stop.coordinates.latitude, stop.coordinates.longitude]}
      icon={getBusStopIcon(isSelected, isSaved)}
      eventHandlers={{
        click: () => onStopClick(stop),
      }}
      {...({ stopId: stop.id } as { stopId: string })}
    />
  );
});

interface BusStopsProps {
  onStopClick: (stop: BusStop) => void;
  selectedStopId?: string | null;
  urlStopId?: string | null;
}

export default function BusStops({ onStopClick, selectedStopId, urlStopId }: BusStopsProps) {
  const { savedStops } = useMapContext();
  const savedStopIds = useMemo(() => new Set(savedStops.map((s) => s.id)), [savedStops]);
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const clusterGroupRef = useRef<{
    options: { iconCreateFunction?: (cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) => L.DivIcon };
    refreshClusters: () => void;
  } | null>(null);

  const iconCreateFunction = useCallback(
    (cluster: { getChildCount: () => number; getAllChildMarkers: () => L.Marker[] }) =>
      createClusterIcon(cluster, savedStopIds),
    [savedStopIds]
  );

  useEffect(() => {
    const group = clusterGroupRef.current;
    if (!group?.refreshClusters) return;
    group.options.iconCreateFunction = iconCreateFunction;
    group.refreshClusters();
  }, [savedStopIds, iconCreateFunction]);

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
          isSelected={selectedStopId === stop.id}
          isSaved={savedStopIds.has(stop.id)}
          onStopClick={onStopClick}
        />
      ))}
    </MarkerClusterGroup>
  );
}