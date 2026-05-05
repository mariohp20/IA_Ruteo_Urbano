import { calculateHeuristicTime } from './heuristics';

export interface NodeLocation {
    id: number;
    lat: number;
    lng: number;
}

export interface SearchResult {
    path: number[];
    totalCost: number;     // En minutos
    expandedNodes: number; // Métrica clave para la IA
}

// Representa un nodo en el árbol de búsqueda de A*
interface AStarState {
    currentNode: number;
    visited: number[]; // Secuencia de IDs de lugares ya visitados
    g: number;         // g(n): Costo real acumulado en tráfico
    h: number;         // h(n): Heurística estimada
    f: number;         // f(n) = g(n) + h(n)
}

export class PathfindingEngine {
    private timeMatrix: number[][];
    private nodes: NodeLocation[];

    constructor(timeMatrix: number[][], nodes: NodeLocation[]) {
        this.timeMatrix = timeMatrix;
        this.nodes = nodes;
    }

    // ==========================================
    // 1. ALGORITMO GREEDY (Búsqueda Voraz)
    // ==========================================
    public runGreedy(startIndex: number): SearchResult {
        const path: number[] = [startIndex];
        const unvisited = new Set(this.nodes.map(n => n.id).filter(id => id !== startIndex));
        let totalCost = 0;
        let currentNode = startIndex;
        let expandedNodes = 0;

        // Mientras queden lugares por visitar
        while (unvisited.size > 0) {
            expandedNodes++; // Contamos cada decisión que toma
            let nextNode = -1;
            let minTime = Infinity;

            // Mira a sus vecinos y elige solo basándose en el costo inmediato g(n)
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

        // Retornar a la base
        path.push(startIndex);
        totalCost += this.timeMatrix[currentNode][startIndex];

        return { path, totalCost, expandedNodes };
    }

    // ==========================================
    // 2. ALGORITMO A* (Búsqueda Informada Óptima)
    // ==========================================
    public runAStar(startIndex: number): SearchResult {
        let expandedNodes = 0;
        const totalNodes = this.nodes.length;
        const baseNode = this.nodes.find(n => n.id === startIndex)!;

        // OpenList: Cola de prioridad que evaluará los estados.
        // En TS puro usamos un array y lo ordenamos, para pocos nodos (TSP urbano) es rapidísimo.
        let openList: AStarState[] = [];

        // Estado inicial: Empezamos en la Base
        openList.push({
            currentNode: startIndex,
            visited: [startIndex],
            g: 0,
            h: 0,
            f: 0
        });

        let bestFinalState: AStarState | null = null;

        while (openList.length > 0) {
            // Ordenar para extraer el de menor f(n) (Simula Priority Queue)
            openList.sort((a, b) => a.f - b.f);
            const currentState = openList.shift()!; 
            expandedNodes++; // Contamos el nodo extraído

            // ¿Llegamos a la meta? (Es decir, ¿ya visitamos todos los puntos?)
            if (currentState.visited.length === totalNodes) {
                // Sumamos el costo final de regresar a la base
                const returnCost = this.timeMatrix[currentState.currentNode][startIndex];
                const finalG = currentState.g + returnCost;

                // Si encontramos una ruta completa mejor, la guardamos
                if (!bestFinalState || finalG < bestFinalState.g) {
                    bestFinalState = {
                        ...currentState,
                        visited: [...currentState.visited, startIndex],
                        g: finalG,
                        f: finalG
                    };
                }
                continue; // Continuamos por si otra rama promete ser aún mejor
            }

            // Expandir a los vecinos que aún no hemos visitado en esta rama
            for (let neighborIndex = 0; neighborIndex < totalNodes; neighborIndex++) {
                if (!currentState.visited.includes(neighborIndex)) {
                    
                    const neighborNode = this.nodes.find(n => n.id === neighborIndex)!;

                    // 1. Calcular g(n): Costo acumulado + Tráfico real hacia el vecino
                    const g = currentState.g + this.timeMatrix[currentState.currentNode][neighborIndex];

                    // 2. Calcular h(n): Heurística admisible (Estimación Haversine desde el vecino a la base)
                    const h = calculateHeuristicTime(neighborNode.lat, neighborNode.lng, baseNode.lat, baseNode.lng);

                    // 3. f(n) = g(n) + h(n)
                    const f = g + h;

                    // Añadir el nuevo estado a la lista abierta
                    openList.push({
                        currentNode: neighborIndex,
                        visited: [...currentState.visited, neighborIndex],
                        g,
                        h,
                        f
                    });
                }
            }
        }

        // Devolver la mejor ruta encontrada
        if (bestFinalState) {
            return {
                path: bestFinalState.visited,
                totalCost: bestFinalState.g,
                expandedNodes: expandedNodes
            };
        }

        return { path: [], totalCost: 0, expandedNodes: 0 };
    }
}