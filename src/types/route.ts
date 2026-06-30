export interface Location {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  isBase?: boolean;
}

export interface OptimizedRoute {
  order: string[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
}

// Tipos de respuesta de Google Routes API
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteLeg {
  distanceMeters: number;
  duration: string;
}

export interface Route {
  legs: RouteLeg[];
  distanceMeters: number;
  duration: string;
  polyline: {
    encodedPolyline: string;
  };
}

export interface RouteMatrixElement {
  originIndex: number;
  destinationIndex: number;
  duration: string;
  distanceMeters: number;
  status?: string;
}