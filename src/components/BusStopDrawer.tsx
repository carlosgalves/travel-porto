import { useEffect, useState } from 'react';
import { Button } from './ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from './ui/drawer';
import { X, Locate, LocateFixed } from 'lucide-react';
import type { BusStop } from '../api/types';
import L from 'leaflet';


interface BusStopDrawerProps {
  stop: BusStop | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mapInstance: L.Map | null;
}

export default function BusStopDrawer({
  stop,
  open,
  onOpenChange,
  mapInstance,
}: BusStopDrawerProps) {
  const [isCenteredOnStop, setIsCenteredOnStop] = useState(false);

  useEffect(() => {
    if (!mapInstance || !stop || !open) {
      setIsCenteredOnStop(false);
      return;
    }

    const stopPosition: [number, number] = [stop.coordinates.latitude, stop.coordinates.longitude];

    const checkCenter = () => {
      const center = mapInstance.getCenter();
      const stopLatLng = L.latLng(stopPosition[0], stopPosition[1]);
      const distance = center.distanceTo(stopLatLng);

      const zoom = mapInstance.getZoom();
      const threshold = zoom >= 17 ? 30 : zoom >= 15 ? 100 : 200;
      const isCentered = distance < threshold;
      setIsCenteredOnStop(isCentered);
    };

    // Wait for map to finish moving before checking
    const checkAfterMove = () => {
      setTimeout(checkCenter, 100);
    };

    mapInstance.on('moveend', checkAfterMove);
    
    checkCenter();

    return () => {
      mapInstance.off('moveend', checkAfterMove);
    };
  }, [mapInstance, stop, open]);

  const handleReCenter = () => {
    if (mapInstance && stop) {
      mapInstance.setView(
        [stop.coordinates.latitude, stop.coordinates.longitude],
        16,
        {
          animate: true,
          duration: 0.5,
          easeLinearity: 0.25
        }
      );
      setIsCenteredOnStop(true);
    }
  };

  const getLocationIcon = () => {
    if (isCenteredOnStop) {
      return <LocateFixed className="h-5 w-5" />;
    }
    return <Locate className="h-5 w-5" />;
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange} dismissible={false} modal={false}>
      <DrawerContent showOverlay={false} className="pointer-events-none !z-40">
        <div className="pointer-events-auto">
          <DrawerHeader>
            <div className="flex items-center justify-between w-full">
              <DrawerTitle className="flex-1 text-left">
                {stop?.name || 'Bus Stop'}
              </DrawerTitle>
              <div className="flex items-center gap-2">
                {stop && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleReCenter}
                    aria-label="Re-center map on stop"
                  >
                    {getLocationIcon()}
                  </Button>
                )}
                <Button 
                  variant="ghost" 
                  size="icon" 
                  aria-label="Close"
                  onClick={() => onOpenChange(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            {stop && (
              <DrawerDescription className="mt-1">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">{stop.id}</span>
                  <span className="text-muted-foreground">{stop.zone_id}</span>
                </div>
              </DrawerDescription>
            )}
          </DrawerHeader>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
