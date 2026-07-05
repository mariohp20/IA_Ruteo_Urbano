import { calculateHeuristicTime, HeuristicType } from './heuristics';

// ---------------------------------------------------------------------------
// Tipos públicos
// ---------------------------------------------------------------------------

/** Coordenadas GPS de un nodo. El `id` coincide con su índice en la timeMatrix. */
export interface NodeLocation {
    id: number;
    lat: number;
    lng: number;
}

/** Entrada del log de expansión, registrada por cada estado expandido. */
export interface ExpansionEntry {
    step: number;
    nodeExpanded: number;
    /** g(n) acumulado en segundos. */
    gCost: number;
    /** h(n) en segundos (0 para Greedy). */
    hCost: number;
    /** f(n) = g(n) + h(n) en segundos. */
    fCost: number;
}

/** Resultado final de un algoritmo: ruta, costo y métricas de ejecución. */
export interface SearchResult {
    path: number[];
    totalCost: number;
    expandedNodes: number;
    executionTimeMs: number;
    heuristicType?: HeuristicType;
    peakStatesInMemory: number;
}

/** Traza completa de una ejecución. Exportable a JSON y CSV para análisis experimental. */
export interface AlgorithmTrace {
    algorithm: 'greedy' | 'astar';
    heuristicType?: HeuristicType;
    nodeCount: number;
    timestamp: string;

    executionTimeMs: number;
    expandedNodes: number;
    peakStatesInMemory: number;
    totalCostSeconds: number;
    totalCostMinutes: number;
    /**
     * Gap% respecto a la solución óptima de A*.
     * `null` cuando esta traza ES la referencia óptima.
     */
    gapVsOptimalPercent: number | null;

    expansionLog: ExpansionEntry[];

    /** Serializa la traza a JSON (metadata + métricas + expansionLog). */
    toJSON(): object;

    /**
     * Exporta el expansionLog como CSV con cabeceras.
     * Columnas: step, nodeExpanded, gCost, hCost, fCost (en segundos).
     */
    exportExpansionLogToCSV(): string;
}

// ---------------------------------------------------------------------------
// Utilidades internas — Bitmask
// ---------------------------------------------------------------------------

/** Activa el bit del nodo `nodeIndex` en `mask`. */
const setBit = (mask: number, nodeIndex: number): number =>
    mask | (1 << nodeIndex);

/** Retorna true si el bit del nodo `nodeIndex` está activo en `mask`. */
const hasBit = (mask: number, nodeIndex: number): boolean =>
    (mask & (1 << nodeIndex)) !== 0;

/** Clave única de estado para el mapa bestG: "nodo|bitmask". */
const stateKey = (node: number, visitedMask: number): string =>
    `${node}|${visitedMask}`;

// ---------------------------------------------------------------------------
// Construcción de AlgorithmTrace
// ---------------------------------------------------------------------------

function buildTrace(
    params: Omit<AlgorithmTrace, 'toJSON' | 'exportExpansionLogToCSV'>
): AlgorithmTrace {
    return {
        ...params,

        toJSON(): object {
            return {
                metadata: {
                    algorithm: this.algorithm,
                    heuristicType: this.heuristicType ?? null,
                    nodeCount: this.nodeCount,
                    timestamp: this.timestamp,
                },
                metrics: {
                    executionTimeMs: this.executionTimeMs,
                    expandedNodes: this.expandedNodes,
                    peakStatesInMemory: this.peakStatesInMemory,
                    totalCostSeconds: this.totalCostSeconds,
                    totalCostMinutes: this.totalCostMinutes,
                    gapVsOptimalPercent: this.gapVsOptimalPercent,
                },
                expansionLog: this.expansionLog,
            };
        },

        exportExpansionLogToCSV(): string {
            const header = 'step,nodeExpanded,gCost,hCost,fCost';
            const rows = this.expansionLog.map(
                (e) => `${e.step},${e.nodeExpanded},${e.gCost.toFixed(4)},${e.hCost.toFixed(4)},${e.fCost.toFixed(4)}`
            );
            return [header, ...rows].join('\n');
        },
    };
}

// ---------------------------------------------------------------------------
// MinHeap (priority queue) — O(log k) push/pop vs O(k log k) array.sort
// ---------------------------------------------------------------------------

class MinHeap<T> {
    private readonly data: T[] = [];
    private readonly compareFn: (a: T, b: T) => number;

    constructor(compareFn: (a: T, b: T) => number) {
        this.compareFn = compareFn;
    }

    get size(): number { return this.data.length; }

    push(item: T): void {
        this.data.push(item);
        this._bubbleUp(this.data.length - 1);
    }

    pop(): T | undefined {
        if (this.data.length === 0) return undefined;
        const top = this.data[0];
        const last = this.data.pop()!;
        if (this.data.length > 0) {
            this.data[0] = last;
            this._sinkDown(0);
        }
        return top;
    }

    private _bubbleUp(i: number): void {
        while (i > 0) {
            const parent = (i - 1) >> 1;
            if (this.compareFn(this.data[i], this.data[parent]) < 0) {
                [this.data[i], this.data[parent]] = [this.data[parent], this.data[i]];
                i = parent;
            } else break;
        }
    }

    private _sinkDown(i: number): void {
        const n = this.data.length;
        while (true) {
            let smallest = i;
            const l = 2 * i + 1, r = 2 * i + 2;
            if (l < n && this.compareFn(this.data[l], this.data[smallest]) < 0) smallest = l;
            if (r < n && this.compareFn(this.data[r], this.data[smallest]) < 0) smallest = r;
            if (smallest === i) break;
            [this.data[i], this.data[smallest]] = [this.data[smallest], this.data[i]];
            i = smallest;
        }
    }
}

// ---------------------------------------------------------------------------
// Estado interno de A* — usa parent pointer en vez de copiar el path completo
// ---------------------------------------------------------------------------

/**
 * Nodo del árbol de búsqueda de A*.
 * parentIdx apunta al índice en la tabla `nodes` del nodo predecesor.
 * El camino completo se reconstruye hacia atrás solo cuando se halla la solución.
 */
interface AStarNode {
    readonly currentNode: number;
    /** Bitmask de nodos visitados. Bit i activo = nodo i ya visitado. */
    readonly visitedMask: number;
    /** Índice en el array `closed` del nodo padre. -1 para el nodo raíz. */
    readonly parentIdx: number;
    readonly g: number;
    readonly h: number;
    readonly f: number;
}

// ---------------------------------------------------------------------------
// Motor de Búsqueda
// ---------------------------------------------------------------------------

export class PathfindingEngine {
    private readonly timeMatrix: ReadonlyArray<ReadonlyArray<number>>;
    private readonly nodes: ReadonlyArray<NodeLocation>;
    private readonly n: number;
    /** Bitmask con todos los bits activos (estado "todos visitados"). */
    private readonly fullMask: number;

    constructor(timeMatrix: number[][], nodes: NodeLocation[]) {
        this.timeMatrix = Object.freeze(timeMatrix.map(row => Object.freeze([...row])));
        this.nodes = Object.freeze([...nodes]);
        this.n = nodes.length;
        this.fullMask = (1 << this.n) - 1;
    }

    // -------------------------------------------------------------------------
    // Heurística admisible para A*
    // -------------------------------------------------------------------------

    /**
     * Calcula h(n) como la suma de dos lower bounds independientes:
     *   1. Arista heurística mínima desde el nodo actual hacia cualquier nodo no visitado.
     *   2. Arista heurística mínima desde cualquier nodo no visitado hacia la base.
     *
     * La suma es admisible (nunca supera el costo real restante), lo que garantiza
     * que A* encuentre la ruta óptima global.
     * Si no quedan nodos sin visitar, h(n) = distancia heurística directa a la base.
     */
    private computeHeuristic(
        currentNode: number,
        visitedMask: number,
        baseNode: NodeLocation,
        type: HeuristicType
    ): number {
        const current = this.nodes[currentNode];

        const hToBase = calculateHeuristicTime(
            current.lat, current.lng,
            baseNode.lat, baseNode.lng,
            type
        );

        const unvisitedIndices: number[] = [];
        for (let i = 0; i < this.n; i++) {
            if (!hasBit(visitedMask, i)) {
                unvisitedIndices.push(i);
            }
        }

        if (unvisitedIndices.length === 0) return hToBase;

        // Lower bound 1: arista mínima desde el nodo actual hacia los no visitados.
        let minEdgeFromCurrent = Infinity;
        for (const ui of unvisitedIndices) {
            const unvisitedNode = this.nodes[ui];
            const h = calculateHeuristicTime(
                current.lat, current.lng,
                unvisitedNode.lat, unvisitedNode.lng,
                type
            );
            if (h < minEdgeFromCurrent) minEdgeFromCurrent = h;
        }

        // Lower bound 2: arista mínima desde los no visitados hacia la base (cierre del tour).
        let minEdgeToBase = Infinity;
        for (const ui of unvisitedIndices) {
            const unvisitedNode = this.nodes[ui];
            const h = calculateHeuristicTime(
                unvisitedNode.lat, unvisitedNode.lng,
                baseNode.lat, baseNode.lng,
                type
            );
            if (h < minEdgeToBase) minEdgeToBase = h;
        }

        return minEdgeFromCurrent + minEdgeToBase;
    }

    // -------------------------------------------------------------------------
    // Algoritmo Greedy (Búsqueda Voraz)
    // -------------------------------------------------------------------------

    /**
     * Expande siempre el vecino no visitado con el menor costo inmediato g'(n).
     *
     * - Completo: sí (visita todos los nodos).
     * - Óptimo: NO (puede quedar atrapado en óptimos locales).
     * - Complejidad temporal: O(n²) | espacial: O(n).
     */
    public runGreedy(startIndex: number): { result: SearchResult; trace: AlgorithmTrace } {
        const t0 = performance.now();
        const timestamp = new Date().toISOString();

        const expansionLog: ExpansionEntry[] = [];
        const path: number[] = [startIndex];
        let visitedMask = setBit(0, startIndex);
        let totalCost = 0;
        let currentNode = startIndex;
        let step = 0;
        let peakStatesInMemory = 1;

        while (visitedMask !== this.fullMask) {
            step++;
            let nextNode = -1;
            let minCost = Infinity;

            for (let j = 0; j < this.n; j++) {
                if (!hasBit(visitedMask, j)) {
                    const cost = this.timeMatrix[currentNode][j];
                    if (cost < minCost) {
                        minCost = cost;
                        nextNode = j;
                    }
                }
            }

            const gCost = totalCost + minCost;
            expansionLog.push({ step, nodeExpanded: nextNode, gCost, hCost: 0, fCost: gCost });

            path.push(nextNode);
            totalCost = gCost;
            visitedMask = setBit(visitedMask, nextNode);
            currentNode = nextNode;
            peakStatesInMemory = Math.max(peakStatesInMemory, path.length);
        }

        // Cerrar el tour regresando a la base.
        const returnCost = this.timeMatrix[currentNode][startIndex];
        totalCost += returnCost;
        path.push(startIndex);

        step++;
        expansionLog.push({ step, nodeExpanded: startIndex, gCost: totalCost, hCost: 0, fCost: totalCost });

        const executionTimeMs = performance.now() - t0;

        const result: SearchResult = { path, totalCost, expandedNodes: step, executionTimeMs, peakStatesInMemory };

        const trace = buildTrace({
            algorithm: 'greedy',
            nodeCount: this.n,
            timestamp,
            executionTimeMs,
            expandedNodes: step,
            peakStatesInMemory,
            totalCostSeconds: totalCost,
            totalCostMinutes: Math.round((totalCost / 60) * 100) / 100,
            gapVsOptimalPercent: null,
            expansionLog,
        });

        return { result, trace };
    }

    // -------------------------------------------------------------------------
    // Algoritmo A* (Búsqueda Informada Óptima)
    // -------------------------------------------------------------------------

    /**
     * Búsqueda A* sobre el espacio de estados (nodo_actual × bitmask_visitados).
     *
     * - Completo: sí.
     * - Óptimo: SÍ, dado que la heurística es admisible.
     * - Complejidad temporal: O(n² · 2ⁿ) | espacial: O(n · 2ⁿ).
     *
     * Optimizaciones implementadas:
     * - MinHeap: extrae el estado de menor f(n) en O(log k) vs O(k log k) del sort.
     * - Parent pointers: no copia el array de path en cada estado; lo reconstruye
     *   una sola vez al hallar la solución óptima.
     * - Bitmask para representación de estados visitados (O(1) por operación).
     * - Poda bestG: descarta estados ya alcanzados con menor costo.
     * - Poda por cota superior dinámica (upperBound): descarta ramas subóptimas.
     */
    public runAStar(
        startIndex: number,
        heuristicType: HeuristicType = 'haversine'
    ): { result: SearchResult; trace: AlgorithmTrace } {
        const t0 = performance.now();
        const timestamp = new Date().toISOString();

        const baseNode = this.nodes[startIndex];
        const expansionLog: ExpansionEntry[] = [];

        // bestG[stateKey] = mejor g(n) conocido para ese estado (nodo, visitados).
        const bestG = new Map<string, number>();

        let upperBound = Infinity;

        /**
         * Tabla de nodos cerrados (expandidos).
         * Cada entrada guarda el nodo actual y su índice de padre en esta misma tabla.
         * Permite reconstruir el camino completo en O(n) sin haber copiado arrays.
         */
        const closed: Array<{ node: number; parentIdx: number }> = [];

        /** Índice en `closed` del nodo del mejor tour completo hallado. */
        let bestFinalClosedIdx = -1;
        let bestFinalCost = Infinity;

        const initialMask = setBit(0, startIndex);
        const heap = new MinHeap<AStarNode>((a, b) => a.f - b.f);
        heap.push({
            currentNode: startIndex,
            visitedMask: initialMask,
            parentIdx: -1,
            g: 0,
            h: 0,
            f: 0,
        });

        bestG.set(stateKey(startIndex, initialMask), 0);

        let expandedNodes = 0;
        let peakStatesInMemory = 1;
        let step = 0;

        while (heap.size > 0) {
            const current = heap.pop()!;
            expandedNodes++;
            step++;

            // Descarta si f supera la mejor solución conocida.
            if (current.f >= upperBound) continue;

            // Poda de dominancia: si ya expandimos este estado con menor g, ignorar.
            const key = stateKey(current.currentNode, current.visitedMask);
            const recorded = bestG.get(key);
            if (recorded !== undefined && current.g > recorded) continue;

            // Registrar en closed para reconstrucción del camino.
            const closedIdx = closed.length;
            closed.push({ node: current.currentNode, parentIdx: current.parentIdx });

            expansionLog.push({
                step,
                nodeExpanded: current.currentNode,
                gCost: current.g,
                hCost: current.h,
                fCost: current.f,
            });

            // Estado terminal: todos los nodos visitados → cerrar el tour.
            if (current.visitedMask === this.fullMask) {
                const returnCost = this.timeMatrix[current.currentNode][startIndex];
                const totalG = current.g + returnCost;

                if (totalG < upperBound) {
                    upperBound = totalG;
                    bestFinalClosedIdx = closedIdx;
                    bestFinalCost = totalG;
                }
                continue;
            }

            // Expandir vecinos no visitados.
            for (let j = 0; j < this.n; j++) {
                if (hasBit(current.visitedMask, j)) continue;

                const edgeCost = this.timeMatrix[current.currentNode][j];
                const newG = current.g + edgeCost;
                const newMask = setBit(current.visitedMask, j);
                const neighborKey = stateKey(j, newMask);

                const prevBest = bestG.get(neighborKey);
                if (prevBest !== undefined && newG >= prevBest) continue;

                const newH = this.computeHeuristic(j, newMask, baseNode, heuristicType);
                const newF = newG + newH;

                if (newF >= upperBound) continue;

                bestG.set(neighborKey, newG);

                heap.push({
                    currentNode: j,
                    visitedMask: newMask,
                    parentIdx: closedIdx,
                    g: newG,
                    h: newH,
                    f: newF,
                });

                peakStatesInMemory = Math.max(peakStatesInMemory, heap.size);
            }
        }

        // Sin solución (grafo desconectado): retornar resultado vacío.
        if (bestFinalClosedIdx === -1) {
            const executionTimeMs = performance.now() - t0;
            const emptyResult: SearchResult = { path: [], totalCost: 0, expandedNodes, executionTimeMs, heuristicType, peakStatesInMemory };
            const emptyTrace = buildTrace({
                algorithm: 'astar',
                heuristicType,
                nodeCount: this.n,
                timestamp,
                executionTimeMs,
                expandedNodes,
                peakStatesInMemory,
                totalCostSeconds: 0,
                totalCostMinutes: 0,
                gapVsOptimalPercent: null,
                expansionLog,
            });
            return { result: emptyResult, trace: emptyTrace };
        }

        // Reconstruir el camino óptimo recorriendo la tabla closed hacia atrás.
        const reversePath: number[] = [startIndex];
        let idx = bestFinalClosedIdx;
        while (idx !== -1) {
            reversePath.push(closed[idx].node);
            idx = closed[idx].parentIdx;
        }
        const path = reversePath.reverse();

        const executionTimeMs = performance.now() - t0;
        const totalCost = bestFinalCost;

        const result: SearchResult = {
            path,
            totalCost,
            expandedNodes,
            executionTimeMs,
            heuristicType,
            peakStatesInMemory,
        };

        const trace = buildTrace({
            algorithm: 'astar',
            heuristicType,
            nodeCount: this.n,
            timestamp,
            executionTimeMs,
            expandedNodes,
            peakStatesInMemory,
            totalCostSeconds: totalCost,
            totalCostMinutes: Math.round((totalCost / 60) * 100) / 100,
            gapVsOptimalPercent: null,
            expansionLog,
        });

        return { result, trace };
    }
}

// ---------------------------------------------------------------------------
// Utilidad de comparación
// ---------------------------------------------------------------------------

/**
 * Calcula el gap porcentual de una solución subóptima respecto a la óptima.
 * Fórmula estándar: gap% = ((costo_subóptimo − costo_óptimo) / costo_óptimo) × 100
 */
export const computeGapPercent = (
    suboptimalCost: number,
    optimalCost: number
): number => {
    if (optimalCost === 0) return 0;
    return Math.round(((suboptimalCost - optimalCost) / optimalCost) * 100 * 100) / 100;
};