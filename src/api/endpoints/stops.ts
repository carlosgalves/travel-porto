import { API_BASE_URL, API_KEY } from '../config';
import type { BusStop, BusStopsResponse } from '../types';

let cache: Promise<BusStop[]> | null = null;

export async function fetchBusStops(): Promise<BusStop[]> {
  if (cache) {
    return cache;
  }

  cache = (async () => {
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
      cache = null;
      console.error('Error fetching bus stops:', error);
      throw error;
    }
  })();

  return cache;
}