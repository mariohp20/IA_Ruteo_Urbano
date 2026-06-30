// Orquestador principal. Flujo: Ubicaciones → Matriz de tráfico → Motores IA → Trazado de rutas.
// Los paths (polylines) se cachean aquí para que RouteMap sea estrictamente presentacional.

import { Box, BrainCircuit, Clock, MapPin, TrendingUp } from 'lucide-react';
import { useCallback, useState } from 'react';
import { PathfindingEngine, SearchResult, AlgorithmTrace, computeGapPercent } from './ai/tspAlgorithms';
import { extractCoordinates } from './ai/matrixAdapter';
import { HeuristicType } from './ai/heuristics';
import { DistanceMatrix } from './components/DistanceMatrix';
import { LocationForm } from './components/LocationForm';
import { OptimizationResults } from './components/OptimizationResults';
import { RouteMap } from './components/RouteMap';
import { GoogleMapsService } from './services/googleMapsService';
import { fetchAutomobileMatrix } from './services/routesApiService';
import { Location, OptimizedRoute } from './types/route';

export type ViewMode = 'greedy' | 'astar' | 'google';

interface RoutePaths {
  greedy: google.maps.LatLngAltitude[];
  astar: google.maps.LatLngAltitude[];
  google: google.maps.LatLngAltitude[];
}

interface AlgorithmMetrics {
  result: SearchResult;
  trace: AlgorithmTrace;
  /** Gap% respecto al óptimo de A*. null si este ES el óptimo (A*). */
  gapPercent: number | null;
}

/**
 * Colección de métricas para los 4 experimentos comparativos:
 * Greedy, A*(Haversine), A*(Euclidiana), A*(Manhattan).
 */
interface ExperimentMetrics {
  greedy: AlgorithmMetrics | null;
  astarHaversine: AlgorithmMetrics | null;
  astarEuclidean: AlgorithmMetrics | null;
  astarManhattan: AlgorithmMetrics | null;
}

const EMPTY_METRICS: ExperimentMetrics = {
  greedy: null,
  astarHaversine: null,
  astarEuclidean: null,
  astarManhattan: null,
};

export type AStarHeuristicMode = HeuristicType;

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [rawTimeMatrix, setRawTimeMatrix] = useState<number[][] | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('astar');
  const [astarHeuristic, setAstarHeuristic] = useState<AStarHeuristicMode>('haversine');

  const [greedyRoute, setGreedyRoute] = useState<OptimizedRoute | null>(null);
  const [astarRoute, setAstarRoute] = useState<OptimizedRoute | null>(null);
  const [googleRoute, setGoogleRoute] = useState<OptimizedRoute | null>(null);

  const [routePaths, setRoutePaths] = useState<RoutePaths>({
    greedy: [], astar: [], google: [],
  });

  const [experimentMetrics, setExperimentMetrics] = useState<ExperimentMetrics>(EMPTY_METRICS);

  // ---------------------------------------------------------------------------
  // Handlers de ubicaciones
  // ---------------------------------------------------------------------------

  const handleAddLocation = useCallback((location: Location) => {
    setLocations(prev =>
      location.isBase
        ? [...prev.filter(l => !l.isBase), location]
        : [...prev, location]
    );
  }, []);

  const handleRemoveLocation = useCallback((id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    setGreedyRoute(null);
    setAstarRoute(null);
    setGoogleRoute(null);
    setRoutePaths({ greedy: [], astar: [], google: [] });
    setExperimentMetrics(EMPTY_METRICS);
    setRawTimeMatrix(null);
  }, []);

  // ---------------------------------------------------------------------------
  // Orquestador principal
  // ---------------------------------------------------------------------------

  const handleOptimizeRoute = useCallback(async () => {
    if (locations.length < 2) {
      alert('Se necesitan al menos la Base y un punto de entrega.');
      return;
    }
    const baseIndex = locations.findIndex(l => l.isBase);
    if (baseIndex === -1) {
      alert('Selecciona una ubicación como Base de Operaciones.');
      return;
    }
    if (locations.some(l => l.lat == null || l.lng == null)) {
      alert(
        'Algunos nodos no tienen coordenadas GPS. ' +
        'Asegúrate de seleccionarlos desde el autocompletado del mapa.'
      );
      return;
    }

    setIsOptimizing(true);

    try {
      // 1. Obtener matriz de tiempos reales (única llamada REST de costo).
      const timeMatrix = await fetchAutomobileMatrix(locations);
      if (!timeMatrix) {
        throw new Error(
          'No se pudo obtener la matriz de distancias. ' +
          'Verifica que la Routes API esté habilitada y la API Key tenga permisos.'
        );
      }
      setRawTimeMatrix(timeMatrix);

      // 2. Ejecutar motores IA (operaciones puras en memoria, sin red).
      const nodes = extractCoordinates(locations);
      const engine = new PathfindingEngine(timeMatrix, nodes);

      const { result: greedyRes, trace: greedyTrace } = engine.runGreedy(baseIndex);
      const { result: astarHavRes, trace: astarHavTrace } = engine.runAStar(baseIndex, 'haversine');
      const { result: astarEucRes, trace: astarEucTrace } = engine.runAStar(baseIndex, 'euclidean');
      const { result: astarManRes, trace: astarManTrace } = engine.runAStar(baseIndex, 'manhattan');

      // A*(Haversine) como referencia óptima canónica (heurística más precisa geográficamente).
      const optimalCost = astarHavRes.totalCost;

      const metrics: ExperimentMetrics = {
        greedy: { result: greedyRes, trace: greedyTrace, gapPercent: computeGapPercent(greedyRes.totalCost, optimalCost) },
        astarHaversine: { result: astarHavRes, trace: astarHavTrace, gapPercent: null },
        astarEuclidean: { result: astarEucRes, trace: astarEucTrace, gapPercent: computeGapPercent(astarEucRes.totalCost, optimalCost) },
        astarManhattan: { result: astarManRes, trace: astarManTrace, gapPercent: computeGapPercent(astarManRes.totalCost, optimalCost) },
      };
      setExperimentMetrics(metrics);

      // 3. Trazar rutas en el mapa (SDK de Maps JS).
      const greedyLocs = greedyRes.path.map(idx => locations[idx]);
      const astarLocs = astarHavRes.path.map(idx => locations[idx]);

      const [gRoute, aRoute, nativeGoogleRoute] = await Promise.all([
        GoogleMapsService.getRouteFromOrderedLocations(greedyLocs),
        GoogleMapsService.getRouteFromOrderedLocations(astarLocs),
        GoogleMapsService.getNativeGoogleRoute(locations),
      ]);

      setRoutePaths({
        greedy: gRoute?.path ?? [],
        astar: aRoute?.path ?? [],
        google: nativeGoogleRoute?.path ?? [],
      });

      if (gRoute) {
        setGreedyRoute({ order: gRoute.orderedIds, totalDistance: gRoute.totalDistance, totalTime: greedyRes.totalCost / 60, totalCost: 0 });
      }
      if (aRoute) {
        setAstarRoute({ order: aRoute.orderedIds, totalDistance: aRoute.totalDistance, totalTime: astarHavRes.totalCost / 60, totalCost: 0 });
      }
      if (nativeGoogleRoute) {
        setGoogleRoute({ order: nativeGoogleRoute.order, totalDistance: nativeGoogleRoute.totalDistance, totalTime: nativeGoogleRoute.totalTime, totalCost: 0 });
      }

    } catch (error) {
      console.error('[App] Error en la optimización:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Error inesperado en la optimización. Revisa la consola.'
      );
    } finally {
      setIsOptimizing(false);
    }
  }, [locations]);

  // ---------------------------------------------------------------------------
  // Selectores derivados
  // ---------------------------------------------------------------------------

  const activeRoute: OptimizedRoute | null =
    viewMode === 'greedy' ? greedyRoute
      : viewMode === 'astar' ? astarRoute
        : googleRoute;

  const activePath: google.maps.LatLngAltitude[] = routePaths[viewMode];

  const activeMetrics: AlgorithmMetrics | null =
    viewMode === 'google' ? null
      : viewMode === 'greedy' ? experimentMetrics.greedy
        : astarHeuristic === 'haversine' ? experimentMetrics.astarHaversine
          : astarHeuristic === 'euclidean' ? experimentMetrics.astarEuclidean
            : experimentMetrics.astarManhattan;

  const hasRoutes = !!(greedyRoute || astarRoute || googleRoute);

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">IA Logística Lima</h1>
              <p className="text-sm text-gray-600">
                Comparativa: Greedy vs A* vs API Comercial
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Selector principal de algoritmos */}
        <div className="mb-6 flex flex-col items-center gap-2">
          <div className={`inline-flex p-1 rounded-xl transition-all ${hasRoutes ? 'bg-gray-200' : 'bg-gray-100 opacity-50'
            }`}>
            <button
              disabled={!hasRoutes}
              onClick={() => setViewMode('greedy')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${!hasRoutes ? 'text-gray-400 cursor-not-allowed'
                  : viewMode === 'greedy' ? 'bg-white text-red-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Greedy (Voraz)
            </button>

            <button
              disabled={!hasRoutes}
              onClick={() => setViewMode('astar')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all ${!hasRoutes ? 'text-gray-400 cursor-not-allowed'
                  : viewMode === 'astar' ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              A* (Óptimo)
            </button>

            <button
              disabled={!hasRoutes}
              onClick={() => setViewMode('google')}
              className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${!hasRoutes ? 'text-gray-400 cursor-not-allowed'
                  : viewMode === 'google' ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              <Box className="w-4 h-4" />
              Caja Negra (Google)
            </button>
          </div>

          {!hasRoutes && (
            <p className="text-xs text-gray-400">
              Ejecuta el motor de IA para activar la comparativa
            </p>
          )}

          {/* Sub-selector de heurística (solo en tab A*) */}
          {hasRoutes && viewMode === 'astar' && (
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 font-medium">Heurística:</span>
              {(['haversine', 'euclidean', 'manhattan'] as AStarHeuristicMode[]).map(h => (
                <button
                  key={h}
                  onClick={() => setAstarHeuristic(h)}
                  className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${astarHeuristic === h
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-500 border-gray-300 hover:border-blue-400 hover:text-blue-500'
                    }`}
                >
                  {h.charAt(0).toUpperCase() + h.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <MapPin className="w-8 h-8 text-blue-600" />
              <div>
                <div className="text-2xl font-bold">{locations.length}</div>
                <div className="text-sm text-gray-500">Nodos totales</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <BrainCircuit className={`w-8 h-8 ${viewMode === 'google' ? 'text-gray-300' : 'text-indigo-500'
                }`} />
              <div>
                <div className="text-2xl font-bold">
                  {viewMode === 'google'
                    ? 'Oculto'
                    : (activeMetrics?.result.expandedNodes ?? '-')}
                </div>
                <div className="text-sm text-gray-500">Nodos expandidos</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className={`w-8 h-8 ${viewMode === 'google' ? 'text-emerald-500' : 'text-orange-500'
                }`} />
              <div>
                <div className="text-2xl font-bold">
                  {activeRoute ? Math.round(activeRoute.totalTime) : '-'}
                </div>
                <div className="text-sm text-gray-500">Minutos totales</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {activeRoute ? activeRoute.totalDistance.toFixed(1) : '-'}
                </div>
                <div className="text-sm text-gray-500">Kilómetros</div>
              </div>
            </div>
          </div>
        </div>

        {/* Layout principal */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <LocationForm
              locations={locations}
              onAddLocation={handleAddLocation}
              onRemoveLocation={handleRemoveLocation}
              onOptimizeRoute={handleOptimizeRoute}
              isOptimizing={isOptimizing}
            />
            <OptimizationResults
              activeRoute={activeRoute}
              viewMode={viewMode}
              astarHeuristic={astarHeuristic}
              experimentMetrics={experimentMetrics}
              googleRoute={googleRoute}
              locations={locations}
              rawTimeMatrix={rawTimeMatrix}
            />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <RouteMap
              locations={locations}
              activeRoute={activeRoute}
              activePath={activePath}
              viewMode={viewMode}
            />
            <DistanceMatrix
              locations={locations}
              rawTimeMatrix={rawTimeMatrix}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;