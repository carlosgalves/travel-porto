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

export interface RouteDirection {
  headsign: string;
  direction_id: number;
  service_days: string[];
}

export interface Route {
  id: string;
  short_name: string;
  long_name: string;
  type: number;
  route_color: string;
  route_text_color: string;
  service_days: string[];
  directions: RouteDirection[];
}

export interface RoutesResponse {
  data: Route[];
}

export interface RouteStopItem {
  stop: {
    id: string;
    name: string;
    zone_id: string;
  };
  sequence: number;
}

export interface RouteDirectionStops {
  direction_id: number;
  headsign: string;
  service_ids: string[];
  stops: RouteStopItem[];
}

export interface RouteStopsResponse {
  data: {
    route_id: string;
    directions: RouteDirectionStops[];
  };
}