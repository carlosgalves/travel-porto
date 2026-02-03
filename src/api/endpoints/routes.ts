import { API_BASE_URL, API_KEY } from '../config';
import type { Route, RoutesResponse, RouteStopsResponse } from '../types';

let routesPromise: Promise<Route[]> | null = null;

export async function fetchRoutes(): Promise<Route[]> {
  if (routesPromise) {
    return routesPromise;
  }

  routesPromise = (async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/stcp/routes/`, {
        method: 'GET',
        headers: {
          accept: 'application/json',
          'X-API-Key': API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch routes: ${response.statusText}`);
      }

      const data: RoutesResponse = await response.json();
      return data.data;
    } catch (error) {
      routesPromise = null;
      console.error('Error fetching routes:', error);
      throw error;
    }
  })();

  return routesPromise;
}

// Fetches all stops for a route
export async function fetchRouteStopsAll(routeId: string): Promise<RouteStopsResponse['data']> {
  const response = await fetch(`${API_BASE_URL}/stcp/routes/${encodeURIComponent(routeId)}/stops`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch route stops: ${response.statusText}`);
  }

  const data: RouteStopsResponse = await response.json();
  return data.data;
}

//Fetches stops for a route headsign
export async function fetchRouteStops(
  routeId: string,
  directionId: number,
  headsign: string
): Promise<RouteStopsResponse['data']> {
  const params = new URLSearchParams({
    direction_id: String(directionId),
    headsign,
  });
  const response = await fetch(
    `${API_BASE_URL}/stcp/routes/${encodeURIComponent(routeId)}/stops?${params}`,
    {
      method: 'GET',
      headers: {
        accept: 'application/json',
        'X-API-Key': API_KEY,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch route stops: ${response.statusText}`);
  }

  const data: RouteStopsResponse = await response.json();
  return data.data;
}
