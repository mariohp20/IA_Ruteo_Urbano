// Orquestador principal. Flujo: Matriz -> Motores IA -> Trazado de Rutas.

import { Box, BrainCircuit, Clock, MapPin, TrendingUp } from 'lucide-react';
import { useCallback, useState } from 'react';
import { PathfindingEngine, SearchResult } from './ai/tspAlgorithms';
import { extractCoordinates } from './ai/matrixAdapter';
import { DistanceMatrix } from './components/DistanceMatrix';
import { LocationForm } from './components/LocationForm';
import { OptimizationResults } from './components/OptimizationResults';
import { RouteMap } from './components/RouteMap';
import { GoogleMapsService } from './services/googleMapsService';
import { fetchAutomobileMatrix } from './services/routesApiService';
import { Location, OptimizedRoute } from './types/route';

export type ViewMode = 'greedy' | 'astar' | 'google';

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [rawTimeMatrix, setRawTimeMatrix] = useState<number[][] | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('astar');
  const [greedyRoute, setGreedyRoute] = useState<OptimizedRoute | null>(null);
  const [astarRoute, setAstarRoute] = useState<OptimizedRoute | null>(null);
  const [googleRoute, setGoogleRoute] = useState<OptimizedRoute | null>(null);
  const [aiMetrics, setAiMetrics] = useState<{
    greedy: SearchResult | null;
    astar: SearchResult | null;
  }>({ greedy: null, astar: null });

  const handleAddLocation = useCallback((location: Location) => {
    setLocations(prev =>
      location.isBase
        ? [...prev.filter(l => !l.isBase), location]
        : [...prev, location]
    );
  }, []);

  const handleRemoveLocation = useCallback((id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    // resetear resultados al modificar el grafo
    setGreedyRoute(null);
    setAstarRoute(null);
    setGoogleRoute(null);
    setAiMetrics({ greedy: null, astar: null });
    setRawTimeMatrix(null);
  }, []);

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
    const missingCoords = locations.some(l => l.lat == null || l.lng == null);
    if (missingCoords) {
      alert('Algunos nodos no tienen coordenadas GPS. Asegúrate de seleccionarlos desde el autocompletado del mapa.');
      return;
    }

    setIsOptimizing(true);
    try {
      const timeMatrix = await fetchAutomobileMatrix(locations);

      if (!timeMatrix) {
        throw new Error(
          'No se pudo obtener la matriz de distancias. ' +
          'Verifica que la Routes API esté habilitada y la API Key tenga permisos.'
        );
      }
      setRawTimeMatrix(timeMatrix);

      const nodes = extractCoordinates(locations);
      const aiEngine = new PathfindingEngine(timeMatrix, nodes);
      const greedyRes = aiEngine.runGreedy(baseIndex);
      const astarRes = aiEngine.runAStar(baseIndex);
      setAiMetrics({ greedy: greedyRes, astar: astarRes });

      const greedyLocs = greedyRes.path.map(idx => locations[idx]);
      const astarLocs = astarRes.path.map(idx => locations[idx]);

      const [gRoute, aRoute, nativeGoogleRoute] = await Promise.all([
        GoogleMapsService.getRouteFromOrderedLocations(greedyLocs),
        GoogleMapsService.getRouteFromOrderedLocations(astarLocs),
        GoogleMapsService.getNativeGoogleRoute(locations),
      ]);

      if (gRoute) {
        setGreedyRoute({
          order: gRoute.orderedIds,
          totalDistance: gRoute.totalDistance,
          totalTime: greedyRes.totalCost / 60,
          totalCost: 0,
        });
      }
      if (aRoute) {
        setAstarRoute({
          order: aRoute.orderedIds,
          totalDistance: aRoute.totalDistance,
          totalTime: astarRes.totalCost / 60,
          totalCost: 0,
        });
      }
      if (nativeGoogleRoute) {
        setGoogleRoute({
          order: nativeGoogleRoute.order,
          totalDistance: nativeGoogleRoute.totalDistance,
          totalTime: nativeGoogleRoute.totalTime,
          totalCost: 0,
        });
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

  // Selector derivado para renderizar la ruta activa
  const activeRoute = viewMode === 'greedy' ? greedyRoute
    : viewMode === 'astar' ? astarRoute
      : googleRoute;

  const activeMetrics = viewMode === 'google' ? null
    : viewMode === 'greedy' ? aiMetrics.greedy
      : aiMetrics.astar;

  // Renderizado
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

        {/* Selector de algoritmos */}
        {(() => {
          const hasRoutes = !!(greedyRoute || astarRoute || googleRoute);
          return (
            <div className="mb-8 flex flex-col items-center gap-2">
              <div className={`inline-flex p-1 rounded-xl transition-all ${hasRoutes ? 'bg-gray-200' : 'bg-gray-100 opacity-50'}`}>
                <button
                  disabled={!hasRoutes}
                  onClick={() => setViewMode('greedy')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${!hasRoutes
                    ? 'text-gray-400 cursor-not-allowed'
                    : viewMode === 'greedy'
                      ? 'bg-white text-red-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Greedy (Voraz)
                </button>
                <button
                  disabled={!hasRoutes}
                  onClick={() => setViewMode('astar')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${!hasRoutes
                    ? 'text-gray-400 cursor-not-allowed'
                    : viewMode === 'astar'
                      ? 'bg-white text-blue-600 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  A* (Óptimo)
                </button>
                <button
                  disabled={!hasRoutes}
                  onClick={() => setViewMode('google')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all flex items-center gap-2 ${!hasRoutes
                    ? 'text-gray-400 cursor-not-allowed'
                    : viewMode === 'google'
                      ? 'bg-emerald-600 text-white shadow-sm'
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
            </div>
          );
        })()}

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
              <BrainCircuit className={`w-8 h-8 ${viewMode === 'google' ? 'text-gray-300' : 'text-indigo-500'}`} />
              <div>
                <div className="text-2xl font-bold">
                  {viewMode === 'google' ? 'Oculto' : (activeMetrics?.expandedNodes ?? '-')}
                </div>
                <div className="text-sm text-gray-500">Nodos expandidos</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className={`w-8 h-8 ${viewMode === 'google' ? 'text-emerald-500' : 'text-orange-500'}`} />
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

        {/* Layout Principal*/}
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
              metrics={aiMetrics}
              googleRoute={googleRoute}
              locations={locations}
            />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <RouteMap
              locations={locations}
              activeRoute={activeRoute}
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