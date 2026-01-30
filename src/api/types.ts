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

export interface BusScheduledArrivals {
  data: Array<{
    trip: {
      id: string;
      route_id: string;
      direction_id: 0 | 1;
      service_id: string;
      number: string;
      headsign: string;
    };
    stop: {
      id: string;
      sequence: number;
    };
    arrival_time: string;
    departure_time: string;
  }>;
}

export interface BusRealtimeArrivals {
  data: Array<{
    vehicle_id: string;
    trip: {
      id: string;
      route_id: string;
      direction_id: 0 | 1;
      service_id: string;
      number: string;
      headsign: string;
    };
    stop: {
      id: string;
      sequence: number;
    };
    realtime_arrival_time: string;
    scheduled_arrival_time: string;
    arrival_minutes: number;
    delay_minutes: number;
    status: string;
    last_updated: string;
  }>;
}