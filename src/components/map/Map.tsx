import { useCallback, useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useTranslation } from '../../lib/i18n';
import { useMapContext } from '../../contexts/MapContext';
import BusStops from './BusStops';
import RouteFilterLines from './RouteFilterLines';
import type { BusStop } from '../../api/types';
import BusStopDrawer from '../BusStopDrawer';
import { centerMap } from '../../lib/map';
import { createUserLocationIcon } from './UserMarker';
import { Alert, AlertDescription } from '../ui/alert';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';


const DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const PORTO_CENTER: [number, number] = [41.1579, -8.6291];

const GPS_ALERT_DISMISSED_KEY = 'travel-porto-gps-alert-dismissed';

function loadGpsAlertDismissed(): boolean {
  try {
    return localStorage.getItem(GPS_ALERT_DISMISSED_KEY) === 'true';
  } catch {
    return false;
  }
}

function MapCenter({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, map.getZoom());
  }, [map, center]);
  return null;
}

function MapController({ onMapReady }: { onMapReady: (map: L.Map) => void }) {
  const map = useMap();
  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);
  return null;
}

function MapCenterTracker({ userPosition, onCenteredChange }: { userPosition: [number, number] | null; onCenteredChange: (isCentered: boolean) => void }) {
  const map = useMap();
  
  useEffect(() => {
    if (!userPosition) {
      onCenteredChange(false);
      return;
    }

    const checkCenter = () => {
      const center = map.getCenter();
      const distance = center.distanceTo(L.latLng(userPosition[0], userPosition[1]));
      const isCentered = distance < 50;
      onCenteredChange(isCentered);
    };

    // Check on move
    map.on('moveend', checkCenter);
    
    checkCenter();

    return () => {
      map.off('moveend', checkCenter);
    };
  }, [map, userPosition, onCenteredChange]);

  return null;
}


interface MapProps {
  className?: string;
}

type ErrorType = 'locationError' | 'geolocationNotSupported' | 'noInternetConnection' | null;

export default function Map({ className }: MapProps) {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const t = useTranslation(language);
  const { mapInstance, setMapInstance, setUserPosition, setHasLocationPermission, setIsCenteredOnUser, userPosition, setRequestLocation } = useMapContext();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);
  const [gpsAlertDismissed, setGpsAlertDismissed] = useState(loadGpsAlertDismissed);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bearing, setBearing] = useState<number | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const initialCenterRef = useRef<[number, number] | null>(null);

  const persistGpsAlertDismissed = useCallback((dismissed: boolean) => {
    setGpsAlertDismissed(dismissed);
    try {
      localStorage.setItem(GPS_ALERT_DISMISSED_KEY, dismissed ? 'true' : 'false');
    } catch {
      // ignore
    }
  }, []);

  const [urlStopId, setUrlStopId] = useState<string | null>(() => {
    return new URLSearchParams(window.location.search).get('stop');
  });

  useEffect(() => {
    const syncUrlToState = () => {
      setUrlStopId(new URLSearchParams(window.location.search).get('stop'));
    };
    window.addEventListener('popstate', syncUrlToState);
    return () => window.removeEventListener('popstate', syncUrlToState);
  }, []);

  useEffect(() => {
    if (urlStopId === null && drawerOpen) {
      setDrawerOpen(false);
      setSelectedStop(null);
    }
  }, [urlStopId, drawerOpen]);

  const handleStopClick = useCallback((stop: BusStop) => {
    setSelectedStop(stop);
    setDrawerOpen(true);
    centerMap(mapInstance, [stop.coordinates.latitude, stop.coordinates.longitude]);
    const url = new URL(window.location.href);
    url.searchParams.set('stop', stop.id);
    window.history.pushState({}, '', url.pathname + url.search);
    setUrlStopId(stop.id);
  }, [mapInstance]);

  // check internet connection
  useEffect(() => {
    const checkConnectivity = async () => {
      if (!navigator.onLine) {
        setError('noInternetConnection');
        return;
      }

      // connectivity test
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        await fetch('https://www.google.com/favicon.ico', {
          method: 'HEAD',
          mode: 'no-cors',
          signal: controller.signal,
          cache: 'no-cache',
        });
        
        clearTimeout(timeoutId);
        
        setError((prevError) => prevError === 'noInternetConnection' ? null : prevError);
      } catch {
        setError('noInternetConnection');
      }
    };

    // Check on mount
    checkConnectivity();

    const handleOnline = () => {
      checkConnectivity();
    };

    const handleOffline = () => {
      setError('noInternetConnection');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Periodic check every 30 seconds
    const intervalId = setInterval(checkConnectivity, 30000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);
  
  const doRequestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setError((prev) => (prev === 'noInternetConnection' ? prev : 'geolocationNotSupported'));
      setPosition(PORTO_CENTER);
      setHasLocationPermission(false);
      setLoading(false);
      return;
    }
    const geoOptions = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };
    navigator.geolocation.getCurrentPosition(
      (geoPosition) => {
        const { latitude, longitude, heading } = geoPosition.coords;
        const userPos: [number, number] = [latitude, longitude];
        setPosition(userPos);
        setUserPosition(userPos);
        setHasLocationPermission(true);
        setBearing(heading ?? null);
        setLoading(false);
        persistGpsAlertDismissed(false);
        setError((prev) => (prev === 'locationError' || prev === 'geolocationNotSupported' ? null : prev));
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
        watchIdRef.current = navigator.geolocation.watchPosition(
          (gp) => {
            const { latitude, longitude, heading: h } = gp.coords;
            const pos: [number, number] = [latitude, longitude];
            setPosition(pos);
            setUserPosition(pos);
            setBearing(h ?? null);
            persistGpsAlertDismissed(false);
          },
          (err) => {
            console.error('Geolocation watch error:', err);
          },
          geoOptions
        );
      },
      (err) => {
        console.error('Geolocation error:', err);
        setError((prev) => (prev === 'noInternetConnection' ? prev : 'locationError'));
        setPosition(PORTO_CENTER);
        setHasLocationPermission(false);
        setLoading(false);
      },
      geoOptions
    );
  }, [setUserPosition, setHasLocationPermission, persistGpsAlertDismissed]);

  useEffect(() => {
    doRequestLocation();
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
  }, [doRequestLocation]);

  useEffect(() => {
    setRequestLocation(() => doRequestLocation);
    return () => setRequestLocation(() => () => {});
  }, [doRequestLocation, setRequestLocation]);

  if (position !== null && initialCenterRef.current === null) {
    initialCenterRef.current = position;
  }
  const mapCenter = initialCenterRef.current ?? position ?? PORTO_CENTER;

  const getErrorMessage = (): string => {
    if (error === 'locationError') return t('errors.locationError');
    if (error === 'geolocationNotSupported') return t('errors.geolocationNotSupported');
    if (error === 'noInternetConnection') return t('errors.noInternetConnection');
    return '';
  };

  const getErrorVariant = (): 'error' | 'alert' => {
    if (error === 'noInternetConnection') return 'error';
    return 'alert';
  };

  const isGpsError = (e: ErrorType): boolean =>
    e === 'locationError' || e === 'geolocationNotSupported';

  return (
    <div className={className || 'w-full h-full'} style={{ position: 'relative', zIndex: 1 }}>
      {loading && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="text-center rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg">
            <p className="text-lg font-medium">{t('map.loading')}</p>
            <p className="text-sm text-muted-foreground">{t('map.gettingLocation')}</p>
          </div>
        </div>
      )}
      {!position && !loading && (
        <div className="absolute inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-[2px]">
          <div className="text-center rounded-lg border border-border bg-background/95 px-4 py-3 shadow-lg">
            <p className="text-lg font-medium text-destructive">{t('map.unableToLoad')}</p>
          </div>
        </div>
      )}
      {error && !(isGpsError(error) && gpsAlertDismissed) && (
        <div className="absolute top-3 left-4 right-4 z-[200] max-w-md mx-auto pointer-events-auto">
          <Alert
            variant={getErrorVariant()}
            onClose={() => {
              if (isGpsError(error)) {
                persistGpsAlertDismissed(true);
              } else {
                setError(null);
              }
            }}
          >
            <AlertDescription>
              {getErrorMessage()}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <MapContainer
        center={mapCenter}
        zoom={16}
        minZoom={12}
        maxZoom={18}
        style={{ height: '100%', width: '100%', zIndex: 0 }}
        scrollWheelZoom={true}
      >
        <TileLayer
          key={theme}
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          url={theme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'}
          subdomains="abcd"
        />
        {userPosition && (
          <Marker position={userPosition} icon={createUserLocationIcon(bearing, isGpsError(error))}>
            <Popup>
              <div className="text-center">
                <p className="text-sm text-muted-foreground">
                  {userPosition[0].toFixed(4)}, {userPosition[1].toFixed(4)}
                </p>
              </div>
            </Popup>
          </Marker>
        )}
        <BusStops
          selectedStopId={selectedStop?.id}
          urlStopId={urlStopId}
          onStopClick={handleStopClick}
        />
        <RouteFilterLines selectedStopId={drawerOpen && selectedStop ? selectedStop.id : null} />
        <MapCenter center={mapCenter} />
        <MapController onMapReady={(map) => setMapInstance(map)} />
        <MapCenterTracker userPosition={userPosition} onCenteredChange={setIsCenteredOnUser} />
      </MapContainer>
      <BusStopDrawer
        stop={selectedStop}
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) {
            setSelectedStop(null);
            const url = new URL(window.location.href);
            url.searchParams.delete('stop');
            window.history.replaceState({}, '', url.pathname + url.search);
            setUrlStopId(null);
          }
        }}
        mapInstance={mapInstance}
      />
    </div>
  );
}
