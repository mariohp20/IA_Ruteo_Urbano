// Tipado de tus Nodos Internos (Frontend)
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

// Tipado de la Respuesta de Google Routes API (Backend REST)
export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteLeg {
  distanceMeters: number;
  duration: {
    seconds: number;
  };
}

export interface Route {
  legs: RouteLeg[];
  distanceMeters: number;
  duration: {
    seconds: number;
  };
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