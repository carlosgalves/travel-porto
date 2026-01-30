import { API_BASE_URL, API_KEY } from '../config';
import type {
  BusStop,
  BusStopsResponse,
  BusScheduledArrivals,
  BusRealtimeArrivals,
} from '../types';

let stops: Promise<BusStop[]> | null = null;
let scheduledArrivalsByStopId = new Map<string, Promise<BusScheduledArrivals['data']>>();
let realtimeArrivalsByStopId = new Map<string, Promise<BusRealtimeArrivals['data']>>();

export async function fetchBusStops(): Promise<BusStop[]> {
  if (stops) {
    return stops;
  }

  stops = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stcp/stops/`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bus stops: ${response.statusText}`);
      }

      const data: BusStopsResponse = await response.json();
      return data.data;
    } catch (error) {
      stops = null;
      console.error('Error fetching bus stops:', error);
      throw error;
    }
  })();

  return stops;
}

export async function fetchBusScheduledArrivals(stopId: string): Promise<BusScheduledArrivals['data']> {
  const cached = scheduledArrivalsByStopId.get(stopId);
  if (cached) {
    return cached;
  }

  const scheduledArrivals = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stcp/stops/${stopId}/scheduled?all=false`, {
        method: 'GET',
        headers: {
          'accept': 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bus scheduled arrivals: ${response.statusText}`);
      }

      const data: BusScheduledArrivals = await response.json();
      return data.data;
    } catch (error) {
      scheduledArrivalsByStopId.delete(stopId);
      console.error('Error fetching bus scheduled arrivals:', error);
      throw error;
    }
  })();

  scheduledArrivalsByStopId.set(stopId, scheduledArrivals);
  return scheduledArrivals;
}

export async function fetchBusRealtimeArrivals(
  stopId: string
): Promise<BusRealtimeArrivals['data']> {
  const cached = realtimeArrivalsByStopId.get(stopId);
  if (cached) {
    return cached;
  }

  const realtimeArrivals = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stcp/stops/${stopId}/realtime`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch bus realtime arrivals: ${response.statusText}`);
      }

      const data: BusRealtimeArrivals = await response.json();
      return data.data;
    } catch (error) {
      realtimeArrivalsByStopId.delete(stopId);
      console.error('Error fetching bus realtime arrivals:', error);
      throw error;
    }
  })();

  realtimeArrivalsByStopId.set(stopId, realtimeArrivals);
  return realtimeArrivals;
}

export function invalidateRealtimeArrivalsCache(stopId: string): void {
  realtimeArrivalsByStopId.delete(stopId);
}