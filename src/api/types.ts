export interface BusStop {
  id: string;
  name: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  zone_id: string;
}

export interface BusStopsResponse {
  data: BusStop[];
}

export { fetchBusStops } from './endpoints/stops';