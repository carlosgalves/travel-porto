import L from 'leaflet';


export function createUserLocationIcon(bearing: number | null = null, isLocationUnavailable = false) {
  const rotation = bearing !== null ? bearing : 0;
  const colorVar = isLocationUnavailable ? 'var(--color-user-location-unavailable)' : 'var(--color-user-location)';
  const animation = isLocationUnavailable ? 'none' : 'userMarkerPulse 2s ease-in-out infinite';

  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="
        width: var(--marker-bus-stop-size);
        height: var(--marker-bus-stop-size);
        border-radius: 50%;
        background: ${colorVar};
        border: var(--marker-bus-stop-border) solid var(--color-white);
        box-shadow: var(--marker-shadow);
        position: relative;
        display: flex;
        align-items: center;
        justify-content: center;
        animation: ${animation};
      ">
        <div style="
          position: absolute;
          top: 120%;
          left: 50%;
          transform: translateX(-50%) rotate(${rotation}deg);
          transform-origin: center top;
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 7px solid ${colorVar};
          filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 10],
    popupAnchor: [0, -10]
  });
}
