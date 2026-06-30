import { Location } from '../types/route';
import { NodeLocation } from './tspAlgorithms';

/** Extrae coordenadas GPS de cada ubicación al formato NodeLocation.
 *  El índice debe coincidir exactamente con filas/columnas de timeMatrix. */
export const extractCoordinates = (orderedLocations: Location[]): NodeLocation[] =>
  orderedLocations.map((loc, index) => ({
    id: index,
    lat: loc.lat ?? 0,
    lng: loc.lng ?? 0,
  }));

/** Convierte una matriz de segundos a minutos para mostrar en la UI. */
export const secondsToMinutesMatrix = (secondsMatrix: number[][]): number[][] =>
  secondsMatrix.map(row =>
    row.map(val => (val === Infinity ? Infinity : val / 60))
  );