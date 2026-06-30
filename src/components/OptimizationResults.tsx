import { Award, BarChart3, BrainCircuit, GitBranch, MapPin, Box, Clock, Zap, Download } from 'lucide-react';
import React, { useCallback } from 'react';
import { Location, OptimizedRoute } from '../types/route';
import { AlgorithmTrace, SearchResult } from '../ai/tspAlgorithms';
import { HeuristicType } from '../ai/heuristics';
import { ViewMode, AStarHeuristicMode } from '../App';

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface AlgorithmMetrics {
  result: SearchResult;
  trace: AlgorithmTrace;
  gapPercent: number | null;
}

export interface ExperimentMetrics {
  greedy: AlgorithmMetrics | null;
  astarHaversine: AlgorithmMetrics | null;
  astarEuclidean: AlgorithmMetrics | null;
  astarManhattan: AlgorithmMetrics | null;
}

interface OptimizationResultsProps {
  activeRoute: OptimizedRoute | null;
  viewMode: ViewMode;
  astarHeuristic: AStarHeuristicMode;
  experimentMetrics: ExperimentMetrics;
  googleRoute: OptimizedRoute | null;
  locations: Location[];
  rawTimeMatrix: number[][] | null;
}

// ---------------------------------------------------------------------------
// Helpers de presentación
// ---------------------------------------------------------------------------

const HEURISTIC_LABEL: Record<HeuristicType, string> = {
  haversine: 'Haversine',
  euclidean: 'Euclidiana',
  manhattan: 'Manhattan',
};

const fmt = (seconds: number) => Math.round(seconds / 60);
const fmtMs = (ms: number) => ms < 1 ? '<1 ms' : `${ms.toFixed(2)} ms`;

interface TableRow {
  label: string;
  algorithm: string;
  expandedNodes: number | string;
  timeMin: number | string;
  execMs: number | string;
  peakMem: number | string;
  gapPercent: number | null | string;
  isOptimal: boolean;
  isGoogle: boolean;
}

// ---------------------------------------------------------------------------
// Subcomponente: exportación del experimento completo
// ---------------------------------------------------------------------------

const ExportExperimentButton: React.FC<{
  experimentMetrics: ExperimentMetrics;
  googleRoute: OptimizedRoute | null;
  locations: Location[];
  rawTimeMatrix: number[][] | null;
}> = ({ experimentMetrics, googleRoute, locations, rawTimeMatrix }) => {
  const { greedy, astarHaversine, astarEuclidean, astarManhattan } = experimentMetrics;
  if (!greedy || !astarHaversine || !astarEuclidean || !astarManhattan) return null;

  const handleExport = useCallback(() => {
    const now = new Date();
    const timestamp = now.toISOString();
    const fileTs = timestamp.replace(/[:.]/g, '-');

    // Paquete completo del experimento en formato listo para Python (json.load) o R (jsonlite::fromJSON).
    // Incluye la timeMatrix para garantizar reproducibilidad (los tiempos de la Routes API varían con el tráfico).
    const experimentPackage = {
      metadata: {
        exportDate: timestamp,
        captureLocation: 'Lima, Perú',
        trafficProfile: 'TRAFFIC_AWARE',
        routesApiVersion: 'v2',
        nodeCount: locations.length,
        nodes: locations.map(l => ({
          id: l.id,
          address: l.address,
          lat: l.lat,
          lng: l.lng,
          isBase: l.isBase ?? false,
        })),
      },
      timeMatrixSeconds: rawTimeMatrix,
      results: {
        greedy: greedy.trace.toJSON(),
        astarHaversine: astarHaversine.trace.toJSON(),
        astarEuclidean: astarEuclidean.trace.toJSON(),
        astarManhattan: astarManhattan.trace.toJSON(),
      },
      googleBenchmark: googleRoute ? {
        totalTimeMinutes: googleRoute.totalTime,
        totalDistanceKm: googleRoute.totalDistance,
      } : null,
      comparativeTable: [
        {
          method: 'Greedy',
          heuristic: null,
          expandedNodes: greedy.result.expandedNodes,
          totalCostMin: Math.round(greedy.result.totalCost / 60),
          cpuMs: greedy.result.executionTimeMs,
          peakMemory: greedy.result.peakStatesInMemory,
          gapPercent: greedy.gapPercent,
        },
        {
          method: 'A*',
          heuristic: 'haversine',
          expandedNodes: astarHaversine.result.expandedNodes,
          totalCostMin: Math.round(astarHaversine.result.totalCost / 60),
          cpuMs: astarHaversine.result.executionTimeMs,
          peakMemory: astarHaversine.result.peakStatesInMemory,
          gapPercent: null,
        },
        {
          method: 'A*',
          heuristic: 'euclidean',
          expandedNodes: astarEuclidean.result.expandedNodes,
          totalCostMin: Math.round(astarEuclidean.result.totalCost / 60),
          cpuMs: astarEuclidean.result.executionTimeMs,
          peakMemory: astarEuclidean.result.peakStatesInMemory,
          gapPercent: astarEuclidean.gapPercent,
        },
        {
          method: 'A*',
          heuristic: 'manhattan',
          expandedNodes: astarManhattan.result.expandedNodes,
          totalCostMin: Math.round(astarManhattan.result.totalCost / 60),
          cpuMs: astarManhattan.result.executionTimeMs,
          peakMemory: astarManhattan.result.peakStatesInMemory,
          gapPercent: astarManhattan.gapPercent,
        },
        ...(googleRoute ? [{
          method: 'Google Maps',
          heuristic: null,
          expandedNodes: null,
          totalCostMin: Math.round(googleRoute.totalTime),
          cpuMs: null,
          peakMemory: null,
          gapPercent: null,
        }] : []),
      ],
    };

    const blob = new Blob(
      [JSON.stringify(experimentPackage, null, 2)],
      { type: 'application/json' },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `experimento-ruteo-lima_n${locations.length}_${fileTs}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [experimentMetrics, googleRoute, locations, rawTimeMatrix]);

  return (
    <button
      onClick={handleExport}
      className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-lg
                 hover:bg-slate-700 active:bg-slate-900 transition-colors shadow-sm
                 text-sm font-semibold"
    >
      <Download className="w-4 h-4" />
      Exportar Experimento (JSON)
    </button>
  );
};

// ---------------------------------------------------------------------------
// Subcomponente: tabla comparativa científica
// ---------------------------------------------------------------------------

const ComparativeTable: React.FC<{
  experimentMetrics: ExperimentMetrics;
  googleRoute: OptimizedRoute | null;
  locations: Location[];
  rawTimeMatrix: number[][] | null;
}> = ({ experimentMetrics, googleRoute, locations, rawTimeMatrix }) => {
  const { greedy, astarHaversine, astarEuclidean, astarManhattan } = experimentMetrics;
  if (!greedy || !astarHaversine || !astarEuclidean || !astarManhattan) return null;

  const rows: TableRow[] = [
    {
      label: 'Greedy',
      algorithm: 'Voraz',
      expandedNodes: greedy.result.expandedNodes,
      timeMin: fmt(greedy.result.totalCost),
      execMs: greedy.result.executionTimeMs,
      peakMem: greedy.result.peakStatesInMemory,
      gapPercent: greedy.gapPercent,
      isOptimal: false,
      isGoogle: false,
    },
    {
      label: 'A* Haversine',
      algorithm: 'A*',
      expandedNodes: astarHaversine.result.expandedNodes,
      timeMin: fmt(astarHaversine.result.totalCost),
      execMs: astarHaversine.result.executionTimeMs,
      peakMem: astarHaversine.result.peakStatesInMemory,
      gapPercent: null,
      isOptimal: true,
      isGoogle: false,
    },
    {
      label: 'A* Euclidiana',
      algorithm: 'A*',
      expandedNodes: astarEuclidean.result.expandedNodes,
      timeMin: fmt(astarEuclidean.result.totalCost),
      execMs: astarEuclidean.result.executionTimeMs,
      peakMem: astarEuclidean.result.peakStatesInMemory,
      gapPercent: astarEuclidean.gapPercent,
      isOptimal: false,
      isGoogle: false,
    },
    {
      label: 'A* Manhattan',
      algorithm: 'A*',
      expandedNodes: astarManhattan.result.expandedNodes,
      timeMin: fmt(astarManhattan.result.totalCost),
      execMs: astarManhattan.result.executionTimeMs,
      peakMem: astarManhattan.result.peakStatesInMemory,
      gapPercent: astarManhattan.gapPercent,
      isOptimal: false,
      isGoogle: false,
    },
  ];

  if (googleRoute) {
    rows.push({
      label: 'Google Maps',
      algorithm: 'Caja Negra',
      expandedNodes: '—',
      timeMin: Math.round(googleRoute.totalTime),
      execMs: '—',
      peakMem: '—',
      gapPercent: '—',
      isOptimal: false,
      isGoogle: true,
    });
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-4">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 className="w-5 h-5 text-indigo-600" />
        <h3 className="font-bold text-gray-800">Tabla Comparativa — Experimento</h3>
        <span className="ml-auto text-xs text-gray-400 italic">Para el artículo científico</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 pr-3 font-semibold text-gray-600">Método</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">Nodos Exp.</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">Tiempo (min)</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">CPU (ms)</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">Mem. pico</th>
              <th className="text-center py-2 px-2 font-semibold text-gray-600">Gap%</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className={`border-b border-gray-100 transition-colors ${row.isOptimal ? 'bg-blue-50'
                    : row.isGoogle ? 'bg-emerald-50'
                      : 'hover:bg-gray-50'
                  }`}
              >
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1.5">
                    {row.isGoogle
                      ? <Box className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      : <BrainCircuit className={`w-3.5 h-3.5 shrink-0 ${row.isOptimal ? 'text-blue-600'
                          : row.algorithm === 'A*' ? 'text-blue-400'
                            : 'text-red-500'
                        }`} />
                    }
                    <span className={`font-semibold ${row.isOptimal ? 'text-blue-700'
                        : row.isGoogle ? 'text-emerald-700'
                          : row.algorithm === 'A*' ? 'text-blue-600'
                            : 'text-red-600'
                      }`}>
                      {row.label}
                    </span>
                    {row.isOptimal && (
                      <span className="text-[10px] bg-blue-600 text-white px-1 py-0.5 rounded font-bold leading-none">
                        REF
                      </span>
                    )}
                  </div>
                </td>

                <td className="py-2 px-2 text-center font-mono text-gray-700">
                  {typeof row.expandedNodes === 'number'
                    ? row.expandedNodes.toLocaleString()
                    : row.expandedNodes}
                </td>

                <td className="py-2 px-2 text-center font-mono font-semibold text-gray-800">
                  {row.timeMin}
                </td>

                <td className="py-2 px-2 text-center font-mono text-gray-600">
                  {typeof row.execMs === 'number' ? fmtMs(row.execMs) : row.execMs}
                </td>

                <td className="py-2 px-2 text-center font-mono text-gray-600">
                  {typeof row.peakMem === 'number'
                    ? row.peakMem.toLocaleString()
                    : row.peakMem}
                </td>

                <td className="py-2 px-2 text-center">
                  {row.gapPercent === null ? (
                    <span className="text-blue-600 font-bold">óptimo</span>
                  ) : typeof row.gapPercent === 'number' ? (
                    <span className={`font-semibold ${row.gapPercent === 0 ? 'text-green-600'
                        : row.gapPercent < 10 ? 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                      +{row.gapPercent.toFixed(2)}%
                    </span>
                  ) : (
                    <span className="text-gray-400">{row.gapPercent}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
        Gap% = ((costo − óptimo) / óptimo) × 100. Referencia óptima: A*(Haversine).
        Nodos exp. = estados expandidos del árbol de búsqueda. Mem. pico = estados
        simultáneos máximos en memoria. CPU medido con <code>performance.now()</code>.
      </p>

      <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
        <p className="text-[10px] text-gray-400 max-w-xs leading-relaxed">
          El archivo JSON incluye la matriz de tráfico, métricas y logs de expansión
          de todos los algoritmos — listo para Python o R.
        </p>
        <ExportExperimentButton
          experimentMetrics={experimentMetrics}
          googleRoute={googleRoute}
          locations={locations}
          rawTimeMatrix={rawTimeMatrix}
        />
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({
  activeRoute,
  viewMode,
  astarHeuristic,
  experimentMetrics,
  googleRoute,
  locations,
  rawTimeMatrix,
}) => {

  if (!activeRoute) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Análisis de Algoritmos</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <p>Los resultados aparecerán tras ejecutar la optimización.</p>
        </div>
      </div>
    );
  }

  const deliveryCount = locations.filter(l => !l.isBase).length;
  const isGoogle = viewMode === 'google';
  const isGreedy = viewMode === 'greedy';
  const isAstar = viewMode === 'astar';

  const activeAlgMetrics =
    isGreedy ? experimentMetrics.greedy
      : isAstar && astarHeuristic === 'haversine' ? experimentMetrics.astarHaversine
        : isAstar && astarHeuristic === 'euclidean' ? experimentMetrics.astarEuclidean
          : isAstar && astarHeuristic === 'manhattan' ? experimentMetrics.astarManhattan
            : null;

  const astarRef = experimentMetrics.astarHaversine;

  const colorText = isGoogle ? 'text-emerald-800'
    : isGreedy ? 'text-red-800'
      : 'text-blue-800';

  const colorBg = isGoogle ? 'bg-emerald-50 border-emerald-200'
    : isGreedy ? 'bg-red-50 border-red-200'
      : 'bg-blue-50 border-blue-200';

  const titleLabel = isGoogle ? 'Caja Negra (API Google)'
    : isGreedy ? 'Voraz (Greedy)'
      : `A-Estrella — ${HEURISTIC_LABEL[astarHeuristic]}`;

  const behaviorText = isGoogle
    ? "Representa la solución comercial. Google utiliza heurísticas propietarias no reveladas (caja negra) alimentadas por grafos masivos de tráfico. No sabemos cuántos nodos expande, pero sirve como 'Ground Truth' para medir nuestros algoritmos."
    : isGreedy
      ? "Greedy evaluó únicamente el costo inmediato g(n). Eligió el destino con menos tráfico actual sin prever el futuro, ahorrando memoria computacional pero arriesgando el tiempo final."
      : astarHeuristic === 'haversine'
        ? "A* con Haversine usa la distancia del gran círculo sobre la esfera terrestre como h(n). Es la métrica más precisa geográficamente y actúa como referencia óptima del experimento."
        : astarHeuristic === 'euclidean'
          ? "A* con distancia Euclidiana proyectada sobre plano equirectangular. Válida para áreas pequeñas como Lima (error < 0.5%). Más rápida de calcular que Haversine al evitar funciones trigonométricas extra."
          : "A* con distancia Manhattan proyectada. Modela desplazamiento en cuadrícula ortogonal, característica de distritos como Miraflores y San Isidro en Lima. Produce una heurística más informada que Euclidiana en zonas de grilla urbana.";

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          {isGoogle
            ? <Box className="w-6 h-6 text-emerald-600" />
            : <BrainCircuit className={`w-6 h-6 ${isGreedy ? 'text-red-600' : 'text-blue-600'}`} />
          }
          <h3 className="text-lg font-bold text-gray-800">Rendimiento: {titleLabel}</h3>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
            <div className="text-2xl font-black text-gray-800 mb-1">
              {isGoogle ? '?' : (activeAlgMetrics?.result.expandedNodes ?? '-')}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Nodos Expandidos
            </div>
          </div>

          <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
            <div className={`text-2xl font-black mb-1 ${isGoogle ? 'text-emerald-600' : isGreedy ? 'text-red-600' : 'text-blue-600'
              }`}>
              {Math.round(activeRoute.totalTime)}
            </div>
            <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Minutos Tráfico
            </div>
          </div>

          {!isGoogle && activeAlgMetrics && (
            <>
              <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                <div className="text-lg font-black text-gray-700 mb-1">
                  {fmtMs(activeAlgMetrics.result.executionTimeMs)}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3" /> CPU
                </div>
              </div>

              <div className="bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                <div className="text-lg font-black text-gray-700 mb-1">
                  {activeAlgMetrics.result.peakStatesInMemory.toLocaleString()}
                </div>
                <div className="text-xs font-medium text-gray-500 uppercase tracking-wide flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" /> Mem. Pico
                </div>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          <div className={`p-4 rounded-lg border ${colorBg}`}>
            <div className="flex items-center gap-2 mb-2">
              <GitBranch className={`w-5 h-5 ${colorText}`} />
              <span className={`font-bold ${colorText}`}>Comportamiento</span>
            </div>
            <p className={`text-sm ${colorText} opacity-90 leading-relaxed`}>
              {behaviorText}
            </p>
          </div>

          {!isGoogle && !isAstar && astarRef && activeAlgMetrics && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-slate-600" />
                Comparativa contra A* Óptimo
              </h4>
              <div className="text-sm text-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Costo Greedy:</span>
                  <span className="font-semibold">{fmt(activeAlgMetrics.result.totalCost)} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Costo A* (ref.):</span>
                  <span className="font-semibold text-blue-700">{fmt(astarRef.result.totalCost)} min</span>
                </div>
                <div className="flex justify-between items-center pt-1 border-t border-slate-200">
                  <span className="text-gray-600 font-medium">Gap%:</span>
                  <span className={`font-black text-base ${(activeAlgMetrics.gapPercent ?? 0) === 0 ? 'text-green-600'
                      : (activeAlgMetrics.gapPercent ?? 0) < 10 ? 'text-yellow-600'
                        : 'text-red-600'
                    }`}>
                    +{activeAlgMetrics.gapPercent?.toFixed(2) ?? '0.00'}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {isGoogle && astarRef && googleRoute && (
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
              <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                <Award className="w-5 h-5 text-slate-600" />
                Comparativa contra A* Óptimo
              </h4>
              <div className="text-sm text-slate-700 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Google Maps:</span>
                  <span className="font-semibold text-emerald-700">{Math.round(googleRoute.totalTime)} min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">A* (ref.):</span>
                  <span className="font-semibold text-blue-700">{fmt(astarRef.result.totalCost)} min</span>
                </div>
                <p className="text-xs text-slate-500 pt-2 border-t border-slate-200 leading-relaxed">
                  {fmt(astarRef.result.totalCost) <= Math.round(googleRoute.totalTime)
                    ? 'Nuestro A* académico igualó o superó a Google sobre la matriz estática de tráfico capturada.'
                    : 'Google considera condiciones de tráfico dinámico en tiempo real adicionales a la matriz, lo que puede explicar la diferencia.'}
                </p>
              </div>
            </div>
          )}

          <div className="bg-white p-4 rounded-lg border border-gray-200">
            <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-gray-500" /> Resumen Logístico
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Entregas:</span>
                <span className="font-medium text-gray-800">{deliveryCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Distancia trazada:</span>
                <span className="font-medium text-gray-800">
                  {activeRoute.totalDistance.toFixed(1)} km
                </span>
              </div>
              {!isGoogle && activeAlgMetrics?.gapPercent !== undefined && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Gap vs óptimo:</span>
                  <span className={`font-medium ${activeAlgMetrics?.gapPercent === null ? 'text-blue-600'
                      : (activeAlgMetrics?.gapPercent ?? 0) === 0 ? 'text-green-600'
                        : 'text-orange-600'
                    }`}>
                    {activeAlgMetrics?.gapPercent === null
                      ? 'Referencia óptima'
                      : `+${activeAlgMetrics?.gapPercent?.toFixed(2)}%`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <ComparativeTable
        experimentMetrics={experimentMetrics}
        googleRoute={googleRoute}
        locations={locations}
        rawTimeMatrix={rawTimeMatrix}
      />
    </>
  );
};