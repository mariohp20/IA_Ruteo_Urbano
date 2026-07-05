/**
 * tsp.worker.ts — Web Worker para cómputo de rutas en hilo aislado.
 *
 * Ejecuta los 4 motores IA (Greedy, A*×3) sin bloquear el hilo principal.
 * Recibe una matriz de tiempos y coordenadas de nodos, devuelve resultados
 * serializables (sin métodos de clase) listos para reconstituir en App.tsx.
 *
 * Protocolo de mensajes:
 *   → WorkerInput  (postMessage desde App.tsx)
 *   ← WorkerOutput (postMessage de vuelta a App.tsx)
 */

import { PathfindingEngine, computeGapPercent } from './tspAlgorithms';
import type { NodeLocation, SearchResult, ExpansionEntry } from './tspAlgorithms';
import type { HeuristicType } from './heuristics';

// ---------------------------------------------------------------------------
// Tipos del protocolo de comunicación
// ---------------------------------------------------------------------------

export interface WorkerInput {
  timeMatrix: number[][];
  nodes: NodeLocation[];
  baseIndex: number;
}

/** Datos planos de AlgorithmTrace (sin métodos). Se reconstituye en App.tsx. */
export interface TraceData {
  algorithm: 'greedy' | 'astar';
  heuristicType?: HeuristicType;
  nodeCount: number;
  timestamp: string;
  executionTimeMs: number;
  expandedNodes: number;
  peakStatesInMemory: number;
  totalCostSeconds: number;
  totalCostMinutes: number;
  gapVsOptimalPercent: number | null;
  expansionLog: ExpansionEntry[];
}

export interface AlgorithmPayload {
  result: SearchResult;
  traceData: TraceData;
}

export interface ExperimentPayload {
  greedy: AlgorithmPayload;
  astarHaversine: AlgorithmPayload;
  astarEuclidean: AlgorithmPayload;
  astarManhattan: AlgorithmPayload;
}

export type WorkerOutput =
  | { success: true; payload: ExperimentPayload }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Lógica del Worker
// ---------------------------------------------------------------------------

self.addEventListener('message', (e: MessageEvent<WorkerInput>) => {
  const { timeMatrix, nodes, baseIndex } = e.data;

  try {
    console.log(`[Worker] Iniciando cómputo — ${nodes.length} nodos, base: ${baseIndex}`);

    const engine = new PathfindingEngine(timeMatrix, nodes);

    const { result: greedyRes, trace: greedyTrace } = engine.runGreedy(baseIndex);
    const { result: astarHavRes, trace: astarHavTrace } = engine.runAStar(baseIndex, 'haversine');
    const { result: astarEucRes, trace: astarEucTrace } = engine.runAStar(baseIndex, 'euclidean');
    const { result: astarManRes, trace: astarManTrace } = engine.runAStar(baseIndex, 'manhattan');

    const optimalCost = astarHavRes.totalCost;

    const toTraceData = (trace: typeof greedyTrace, gap: number | null): TraceData => ({
      algorithm: trace.algorithm,
      heuristicType: trace.heuristicType,
      nodeCount: trace.nodeCount,
      timestamp: trace.timestamp,
      executionTimeMs: trace.executionTimeMs,
      expandedNodes: trace.expandedNodes,
      peakStatesInMemory: trace.peakStatesInMemory,
      totalCostSeconds: trace.totalCostSeconds,
      totalCostMinutes: trace.totalCostMinutes,
      gapVsOptimalPercent: gap,
      expansionLog: trace.expansionLog,
    });

    const payload: ExperimentPayload = {
      greedy: {
        result: greedyRes,
        traceData: toTraceData(greedyTrace, computeGapPercent(greedyRes.totalCost, optimalCost)),
      },
      astarHaversine: {
        result: astarHavRes,
        traceData: toTraceData(astarHavTrace, null),
      },
      astarEuclidean: {
        result: astarEucRes,
        traceData: toTraceData(astarEucTrace, computeGapPercent(astarEucRes.totalCost, optimalCost)),
      },
      astarManhattan: {
        result: astarManRes,
        traceData: toTraceData(astarManTrace, computeGapPercent(astarManRes.totalCost, optimalCost)),
      },
    };

    console.log(`[Worker] Completado. Greedy: ${greedyRes.totalCost.toFixed(0)}s | A*: ${astarHavRes.totalCost.toFixed(0)}s`);

    const response: WorkerOutput = { success: true, payload };
    self.postMessage(response);

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Error interno desconocido en el Worker.';
    console.error('[Worker] Error:', err);
    const response: WorkerOutput = { success: false, error: message };
    self.postMessage(response);
  }
});
