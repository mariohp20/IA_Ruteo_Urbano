/**
 * Heurísticas admisibles h(n) para A* en TSP urbano.
 *
 * Las tres métricas (Haversine, Euclidiana, Manhattan) estiman el tiempo mínimo
 * de viaje asumiendo una velocidad optimista de 50 km/h, lo que garantiza
 * ADMISIBILIDAD: h(n) ≤ costo_real(n) para todo par de nodos.
 *
 * Las métricas Euclidiana y Manhattan aplican corrección por latitud en la
 * componente longitudinal (los meridianos convergen fuera del ecuador):
 *   km_por_grado_lng = 111.32 × cos(lat_media)
 */

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;
const KM_PER_LAT_DEGREE = 111.32;

/**
 * Velocidad optimista de referencia en km/h.
 * Por debajo de la velocidad media real en Lima (~25-35 km/h con tráfico),
 * lo que garantiza que h(n) nunca supere el costo real.
 */
const OPTIMISTIC_SPEED_KMH = 50;

// ---------------------------------------------------------------------------
// Utilidades internas
// ---------------------------------------------------------------------------

const toRadians = (degrees: number): number => (degrees * Math.PI) / 180;

/** Convierte distancia en km a tiempo heurístico en segundos. */
const kmToSeconds = (distanceKm: number): number =>
  (distanceKm / OPTIMISTIC_SPEED_KMH) * 3600;

/** Kilómetros por grado de longitud en la latitud media entre dos puntos. */
const kmPerLngDegree = (lat1: number, lat2: number): number =>
  KM_PER_LAT_DEGREE * Math.cos(toRadians((lat1 + lat2) / 2));

// ---------------------------------------------------------------------------
// Métricas de distancia
// ---------------------------------------------------------------------------

/**
 * Distancia Haversine (gran círculo sobre la esfera terrestre).
 * La métrica más precisa de las tres para coordenadas GPS. O(1).
 */
export const haversineDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a =
    sinDLat * sinDLat +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    sinDLng * sinDLng;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Distancia Euclidiana proyectada (norma L2 en proyección equirectangular).
 * Error < 0.5% para áreas del tamaño de Lima. Más rápida que Haversine. O(1).
 */
export const euclideanDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const deltaLatKm = (lat2 - lat1) * KM_PER_LAT_DEGREE;
  const deltaLngKm = (lng2 - lng1) * kmPerLngDegree(lat1, lat2);
  return Math.sqrt(deltaLatKm * deltaLatKm + deltaLngKm * deltaLngKm);
};

/**
 * Distancia Manhattan proyectada (norma L1, desplazamientos ortogonales).
 * Modela una cuadrícula urbana. Siempre ≥ Euclidiana → heurística más
 * informada sin violar la admisibilidad en zonas de grilla. O(1).
 */
export const manhattanDistance = (
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number => {
  const deltaLatKm = Math.abs(lat2 - lat1) * KM_PER_LAT_DEGREE;
  const deltaLngKm = Math.abs(lng2 - lng1) * kmPerLngDegree(lat1, lat2);
  return deltaLatKm + deltaLngKm;
};

// ---------------------------------------------------------------------------
// API pública
// ---------------------------------------------------------------------------

export type HeuristicType = 'haversine' | 'euclidean' | 'manhattan';

const DISTANCE_FN: Record<
  HeuristicType,
  (lat1: number, lng1: number, lat2: number, lng2: number) => number
> = {
  haversine: haversineDistance,
  euclidean: euclideanDistance,
  manhattan: manhattanDistance,
};

/**
 * Calcula el tiempo heurístico h(n) en segundos entre dos coordenadas GPS.
 * Es la función principal que consume el motor A* en tspAlgorithms.ts.
 */
export const calculateHeuristicTime = (
  lat1: number, lng1: number,
  lat2: number, lng2: number,
  type: HeuristicType = 'haversine'
): number => kmToSeconds(DISTANCE_FN[type](lat1, lng1, lat2, lng2));

/**
 * Verifica la admisibilidad de una heurística contra la matriz de tiempos reales.
 * Útil para validación experimental: detecta pares (i, j) donde h > real.
 */
export const verifyAdmissibility = (
  coords: Array<{ lat: number; lng: number }>,
  realTimeMatrix: number[][],
  type: HeuristicType
): { isAdmissible: boolean; violations: Array<{ i: number; j: number; h: number; real: number }> } => {
  const violations: Array<{ i: number; j: number; h: number; real: number }> = [];

  for (let i = 0; i < coords.length; i++) {
    for (let j = 0; j < coords.length; j++) {
      if (i === j) continue;
      const h = calculateHeuristicTime(
        coords[i].lat, coords[i].lng,
        coords[j].lat, coords[j].lng,
        type
      );
      const real = realTimeMatrix[i][j];
      if (real !== Infinity && h > real) {
        violations.push({ i, j, h, real });
      }
    }
  }

  return { isAdmissible: violations.length === 0, violations };
};