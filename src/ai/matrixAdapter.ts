import { DistanceMatrix, Location } from '../types/route';
import { NodeLocation } from './tspAlgorithms'; // O donde hayas definido tus tipos de IA

/**
 * Convierte la matriz de distancias de Google (basada en IDs) 
 * en una matriz matemática 2D (number[][]) para los algoritmos.
 */
export const convertToTimeMatrix = (
    googleMatrix: DistanceMatrix, 
    orderedLocations: Location[]
): number[][] => {
    const size = orderedLocations.length;
    // Inicializamos una matriz de N x N llena de ceros
    const timeMatrix: number[][] = Array(size).fill(0).map(() => Array(size).fill(0));

    for (let i = 0; i < size; i++) {
        const originId = orderedLocations[i].id;
        
        for (let j = 0; j < size; j++) {
            const destId = orderedLocations[j].id;
            
            // Si es el mismo punto (diagonal de la matriz), el tiempo es 0
            if (i === j) {
                timeMatrix[i][j] = 0;
                continue;
            }

            // Extraemos el valor. Si por alguna razón Google falló, ponemos infinito para evitar esa ruta
            if (googleMatrix[originId] && googleMatrix[originId][destId]) {
                const durationSeconds = googleMatrix[originId][destId].duration.value;
                // Convertimos a minutos para que sea más fácil de leer en la interfaz
                timeMatrix[i][j] = durationSeconds / 60; 
            } else {
                timeMatrix[i][j] = Infinity; 
            }
        }
    }

    return timeMatrix;
};

/**
 * Función extra para extraer solo las coordenadas puras para la heurística H(n)
 */
export const extractCoordinates = (orderedLocations: Location[]): NodeLocation[] => {
    return orderedLocations.map((loc, index) => ({
        id: index, // Transformamos el ID de string a un índice numérico 0, 1, 2...
        lat: loc.lat || 0, // Asegúrate de que tu tipo Location tenga las coordenadas
        lng: loc.lng || 0
    }));
};