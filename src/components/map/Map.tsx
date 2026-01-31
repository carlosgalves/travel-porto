import { useCallback, useEffect, useState } from 'react';
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
  const { mapInstance, setMapInstance, setUserPosition, setHasLocationPermission, setIsCenteredOnUser, userPosition } = useMapContext();
  const [position, setPosition] = useState<[number, number] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorType>(null);
  const [selectedStop, setSelectedStop] = useState<BusStop | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [bearing, setBearing] = useState<number | null>(null);

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
      } catch (err) {
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
  
  useEffect(() => {
    if ('geolocation' in navigator) {
      let watchId: number | null = null;
      
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
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

          watchId = navigator.geolocation.watchPosition(
            (geoPosition) => {
              const { latitude, longitude, heading } = geoPosition.coords;
              const userPos: [number, number] = [latitude, longitude];
              setPosition(userPos);
              setUserPosition(userPos);
              setBearing(heading ?? null);
            },
            (err) => {
              console.error('Geolocation watch error:', err);
            },
            geoOptions
          );
        },
        (err) => {
          console.error('Geolocation error:', err);
          // Only set location error if we don't already have an internet connection error
          setError((prevError) => prevError === 'noInternetConnection' ? prevError : 'locationError');
          setPosition(PORTO_CENTER);
          setHasLocationPermission(false);
          setLoading(false);
        },
        geoOptions
      );

      return () => {
        if (watchId !== null) {
          navigator.geolocation.clearWatch(watchId);
        }
      };
    } else {
      setError((prevError) => prevError === 'noInternetConnection' ? prevError : 'geolocationNotSupported');
      setPosition(PORTO_CENTER);
      setHasLocationPermission(false);
      setLoading(false);
    }
  }, [setUserPosition, setHasLocationPermission]);

  if (loading) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <div className="text-center">
          <p className="text-lg">{t('map.loading')}</p>
          <p className="text-sm text-muted-foreground">{t('map.gettingLocation')}</p>
        </div>
      </div>
    );
  }

  if (!position) {
    return (
      <div className={`flex items-center justify-center h-full ${className || ''}`}>
        <div className="text-center">
          <p className="text-lg text-destructive">{t('map.unableToLoad')}</p>
        </div>
      </div>
    );
  }

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

  return (
    <div className={className || 'w-full h-full'} style={{ position: 'relative', zIndex: 1 }}>
      {error && (
        <div className="fixed top-16 left-4 right-4 z-[200] max-w-md mx-auto">
          <Alert 
            variant={getErrorVariant()} 
            onClose={() => setError(null)}
          >
            <AlertDescription>
              {getErrorMessage()}
            </AlertDescription>
          </Alert>
        </div>
      )}
      <MapContainer
        center={position}
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
          <Marker position={userPosition} icon={createUserLocationIcon(bearing)}>
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
        <MapCenter center={position} />
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
