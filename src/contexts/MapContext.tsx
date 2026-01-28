import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type L from 'leaflet';


interface MapContextType {
  mapInstance: L.Map | null;
  userPosition: [number, number] | null;
  hasLocationPermission: boolean;
  isCenteredOnUser: boolean;
  setMapInstance: (map: L.Map | null) => void;
  setUserPosition: (position: [number, number] | null) => void;
  setHasLocationPermission: (hasPermission: boolean) => void;
  setIsCenteredOnUser: (isCentered: boolean) => void;
}

const MapContext = createContext<MapContextType | undefined>(undefined);


export function MapProvider({ children }: { children: ReactNode }) {
  const [mapInstance, setMapInstance] = useState<L.Map | null>(null);
  const [userPosition, setUserPosition] = useState<[number, number] | null>(null);
  const [hasLocationPermission, setHasLocationPermission] = useState<boolean>(true);
  const [isCenteredOnUser, setIsCenteredOnUser] = useState<boolean>(false);

  return (
    <MapContext.Provider
      value={{
        mapInstance,
        userPosition,
        hasLocationPermission,
        isCenteredOnUser,
        setMapInstance,
        setUserPosition,
        setHasLocationPermission,
        setIsCenteredOnUser,
      }}
    >
      {children}
    </MapContext.Provider>
  );
}

export function useMapContext() {
  const context = useContext(MapContext);
  if (context === undefined) {
    throw new Error('useMapContext must be used within a MapProvider');
  }
  return context;
}