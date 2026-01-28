import { memo, useEffect, useState } from 'react';
import { Marker } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import L from 'leaflet';
import { fetchBusStops, type BusStop } from '../../api/types';


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

function createClusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 'small' : count < 30 ? 'medium' : 'large';
  const px = CLUSTER_SIZE_PX[size];
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
    ">${count}</div>`,
    className: 'cluster-icon-wrapper',
    iconSize: L.point(px, px),
  });
}

interface BusStopMarkerProps {
  stop: BusStop;
  isSelected: boolean;
  onStopClick: (stop: BusStop) => void;
}

const BusStopMarker = memo(function BusStopMarker({ stop, isSelected, onStopClick }: BusStopMarkerProps) {
  return (
    <Marker
      position={[stop.coordinates.latitude, stop.coordinates.longitude]}
      icon={isSelected ? BUS_STOP_ICON_SELECTED : BUS_STOP_ICON_UNSELECTED}
      eventHandlers={{
        click: () => onStopClick(stop),
      }}
    />
  );
});

interface BusStopsProps {
  onStopClick: (stop: BusStop) => void;
  selectedStopId?: string | null;
}

export default function BusStops({ onStopClick, selectedStopId }: BusStopsProps) {
  const [stops, setStops] = useState<BusStop[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading || error) {
    return null;
  }

  return (
    <MarkerClusterGroup
      chunkedLoading
      spiderfyOnMaxZoom={false}
      zoomToBoundsOnClick={true}
      showCoverageOnHover={false}
      removeOutsideVisibleBounds={true}
      animate={true}
      maxClusterRadius={80}
      disableClusteringAtZoom={17}
      iconCreateFunction={createClusterIcon}
    >
      {stops.map((stop) => (
        <BusStopMarker
          key={stop.id}
          stop={stop}
          isSelected={selectedStopId === stop.id}
          onStopClick={onStopClick}
        />
      ))}
    </MarkerClusterGroup>
  );
}