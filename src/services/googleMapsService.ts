import { mapsReady } from './mapsLoader';
import { type Location } from '../types/route';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

type RoutesLibrary = any;

let routesLibPromise: Promise<RoutesLibrary> | null = null;

async function getRoutesLib(): Promise<RoutesLibrary> {
  if (!routesLibPromise) {
    await mapsReady;
    routesLibPromise = google.maps.importLibrary('routes');
  }
  return routesLibPromise;
}

// Adaptador: Convierte Location al formato nativo del JS SDK
function toWaypoint(loc: Location): object {
  if (loc.lat != null && loc.lng != null) {
    return { location: { lat: loc.lat, lng: loc.lng } };
  }
  return { query: loc.address + ', Lima, Perú' };
}

export class GoogleMapsService {

  static isApiKeyConfigured(): boolean {
    return !!API_KEY && API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
  }

  /**
    * Traza la ruta respetando estrictamente el orden calculado por Greedy/A*.
    * optimizeWaypointOrder se mantiene en false para no alterar el pathfinding.
   */
  static async getRouteFromOrderedLocations(orderedLocations: Location[]): Promise<{
    orderedIds: string[];
    totalDistance: number;  // km
    totalTime: number;  // minutos
    path: google.maps.LatLngAltitude[];
  } | null> {
    if (orderedLocations.length < 2 || !this.isApiKeyConfigured()) return null;

    try {
      const { Route } = await getRoutesLib();

      const { routes } = await Route.computeRoutes({
        origin: toWaypoint(orderedLocations[0]),
        destination: toWaypoint(orderedLocations[orderedLocations.length - 1]),
        intermediates: orderedLocations.slice(1, -1).map(toWaypoint),
        travelMode: 'DRIVING',
        optimizeWaypointOrder: false,
        fields: ['distanceMeters', 'durationMillis', 'path'],
      });

      const route = routes?.[0];
      if (!route) return null;

      return {
        orderedIds: orderedLocations.map(l => l.id),
        totalDistance: (route.distanceMeters ?? 0) / 1000,
        totalTime: (route.durationMillis ?? 0) / 60000,
        path: route.path ?? [],
      };
    } catch (error) {
      console.error('[GoogleMapsService] getRouteFromOrderedLocations:', error);
      return null;
    }
  }

  // Benchmark Comercial (Caja Negra): Delega la optimización interna a Google (TSP nativo).
  static async getNativeGoogleRoute(locations: Location[]): Promise<{
    order: string[];
    totalDistance: number;  // km
    totalTime: number;  // minutos
    path: google.maps.LatLngAltitude[];
  } | null> {
    if (locations.length < 2 || !this.isApiKeyConfigured()) return null;

    const originLoc = locations.find(l => l.isBase);
    const deliveryLocs = locations.filter(l => !l.isBase);
    if (!originLoc) return null;

    try {
      const { Route } = await getRoutesLib();

      const { routes } = await Route.computeRoutes({
        origin: toWaypoint(originLoc),
        destination: toWaypoint(originLoc), // tour cerrado: regresa a la base
        intermediates: deliveryLocs.map(toWaypoint),
        travelMode: 'DRIVING',
        optimizeWaypointOrder: true,
        fields: ['distanceMeters', 'durationMillis', 'path', 'optimizedIntermediateWaypointIndices'],
      });

      const route = routes?.[0];
      if (!route) return null;

      const waypointOrder: number[] = route.optimizedIntermediateWaypointIndices ?? [];
      const optimizedIds = [
        originLoc.id,
        ...waypointOrder.map((i: number) => deliveryLocs[i].id),
        originLoc.id,
      ];

      return {
        order: optimizedIds,
        totalDistance: (route.distanceMeters ?? 0) / 1000,
        totalTime: (route.durationMillis ?? 0) / 60000,
        path: route.path ?? [],
      };
    } catch (error) {
      console.error('[GoogleMapsService] getNativeGoogleRoute:', error);
      return null;
    }
  }
}
