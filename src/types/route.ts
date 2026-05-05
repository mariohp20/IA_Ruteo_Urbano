export interface Location {
  id: string;
  address: string;
  lat?: number;
  lng?: number;
  isBase?: boolean;
}

export interface DistanceMatrixElement {
  distance: {
    text: string;
    value: number; // in meters
  };
  duration: {
    text: string;
    value: number; // in seconds
  };
  status: string;
}

export interface DistanceMatrix {
  [fromId: string]: {
    [toId: string]: DistanceMatrixElement;
  };
}

export interface OptimizedRoute {
  order: string[];
  totalDistance: number;
  totalTime: number;
  totalCost: number;
}
