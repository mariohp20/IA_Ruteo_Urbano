import { calculateHeuristicTime } from './heuristics';

export interface NodeLocation {
    id: number;
    lat: number;
    lng: number;
}

export interface SearchResult {
    path: number[];
    totalCost: number;
    expandedNodes: number;
}

// Estado del nodo para el árbol de búsqueda del algoritmo A*.
interface AStarState {
    currentNode: number;
    visited: number[];
    g: number;
    h: number;
    f: number;
}

export class PathfindingEngine {
    private timeMatrix: number[][];
    private nodes: NodeLocation[];

    constructor(timeMatrix: number[][], nodes: NodeLocation[]) {
        this.timeMatrix = timeMatrix;
        this.nodes = nodes;
    }

    // Algoritmo Greedy (Voraz): selecciona el vecino no visitado con el costo inmediato mínimo.
    public runGreedy(startIndex: number): SearchResult {
        const path: number[] = [startIndex];
        const unvisited = new Set(this.nodes.map(n => n.id).filter(id => id !== startIndex));
        let totalCost = 0;
        let currentNode = startIndex;
        let expandedNodes = 0;

        while (unvisited.size > 0) {
            expandedNodes++;
            let nextNode = -1;
            let minTime = Infinity;

            for (const neighbor of unvisited) {
                const time = this.timeMatrix[currentNode][neighbor];
                if (time < minTime) {
                    minTime = time;
                    nextNode = neighbor;
                }
            }

            path.push(nextNode);
            totalCost += minTime;
            unvisited.delete(nextNode);
            currentNode = nextNode;
        }

        path.push(startIndex);
        totalCost += this.timeMatrix[currentNode][startIndex];

        return { path, totalCost, expandedNodes };
    }

    // Algoritmo A*: Garantiza la ruta óptima matemáticamente dentro del grafo evaluando f = g + h.
    // Utiliza una heurística admisible (distancia Haversine) para podar caminos ineficientes.
    public runAStar(startIndex: number): SearchResult {
        let expandedNodes = 0;
        const totalNodes = this.nodes.length;
        const baseNode = this.nodes.find(n => n.id === startIndex)!;

        const openList: AStarState[] = [{
            currentNode: startIndex,
            visited: [startIndex],
            g: 0,
            h: 0,
            f: 0,
        }];

        let bestFinalState: AStarState | null = null;

        while (openList.length > 0) {
            openList.sort((a, b) => a.f - b.f);
            const currentState = openList.shift()!;
            expandedNodes++;

            if (currentState.visited.length === totalNodes) {
                const returnCost = this.timeMatrix[currentState.currentNode][startIndex];
                const finalG = currentState.g + returnCost;

                if (!bestFinalState || finalG < bestFinalState.g) {
                    bestFinalState = {
                        ...currentState,
                        visited: [...currentState.visited, startIndex],
                        g: finalG,
                        f: finalG,
                    };
                }
                continue;
            }

            for (let neighborIndex = 0; neighborIndex < totalNodes; neighborIndex++) {
                if (!currentState.visited.includes(neighborIndex)) {
                    const neighborNode = this.nodes.find(n => n.id === neighborIndex)!;

                    const g = currentState.g + this.timeMatrix[currentState.currentNode][neighborIndex];
                    const h = calculateHeuristicTime(neighborNode.lat, neighborNode.lng, baseNode.lat, baseNode.lng);
                    const f = g + h;

                    openList.push({
                        currentNode: neighborIndex,
                        visited: [...currentState.visited, neighborIndex],
                        g,
                        h,
                        f,
                    });
                }
            }
        }

        if (bestFinalState) {
            return {
                path: bestFinalState.visited,
                totalCost: bestFinalState.g,
                expandedNodes,
            };
        }

        return { path: [], totalCost: 0, expandedNodes: 0 };
    }
}