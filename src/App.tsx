import { Clock, MapPin, TrendingUp, Truck, BrainCircuit } from 'lucide-react';
import { useCallback, useState } from 'react';
import { DistanceMatrix } from './components/DistanceMatrix';
import { LocationForm } from './components/LocationForm';
import { OptimizationResults } from './components/OptimizationResults';
import { RouteMap } from './components/RouteMap';
import { GoogleMapsService } from './services/googleMapsService';
import { DistanceMatrix as DistanceMatrixType, Location, OptimizedRoute } from './types/route';

// IMPORTACIONES DE LÓGICA IA
import { PathfindingEngine, SearchResult } from './ai/tspAlgorithms';
import { convertToTimeMatrix, extractCoordinates } from './ai/matrixAdapter';

// Definición de tipo para el interruptor de algoritmos
export type ViewMode = 'greedy' | 'astar';

function App() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [distanceMatrix, setDistanceMatrix] = useState<DistanceMatrixType>({});
  const [isOptimizing, setIsOptimizing] = useState(false);

  // ESTADOS PARA LA COMPARACIÓN DE IA
  const [viewMode, setViewMode] = useState<ViewMode>('astar'); // A* por defecto por ser óptimo [cite: 927]
  const [greedyRoute, setGreedyRoute] = useState<OptimizedRoute | null>(null);
  const [astarRoute, setAstarRoute] = useState<OptimizedRoute | null>(null);
  const [aiMetrics, setAiMetrics] = useState<{greedy: SearchResult | null, astar: SearchResult | null}>({
    greedy: null, 
    astar: null
  });

  const handleAddLocation = useCallback((location: Location) => {
    if (location.isBase) {
      setLocations(prev => prev.filter(l => !l.isBase).concat(location));
    } else {
      setLocations(prev => [...prev, location]);
    }
  }, []);

  const handleRemoveLocation = useCallback((id: string) => {
    setLocations(prev => prev.filter(l => l.id !== id));
    setGreedyRoute(null);
    setAstarRoute(null);
    setAiMetrics({greedy: null, astar: null});
    setDistanceMatrix({});
  }, []);

  const handleOptimizeRoute = useCallback(async () => {
    if (locations.length < 2) {
       alert("Se necesitan al menos la Base y un punto de entrega.");
       return;
    }

    const baseIndex = locations.findIndex(l => l.isBase);
    if (baseIndex === -1) {
        alert("Selecciona una ubicación como Base de Operaciones.");
        return;
    }

    setIsOptimizing(true);
    try {
      // 1. Obtención de datos reales (Tráfico de Lima) [cite: 923]
      const rawMatrix = await GoogleMapsService.getDistanceMatrix(locations);
      setDistanceMatrix(rawMatrix);

      // 2. Preparación para el motor de IA
      const timeMatrix = convertToTimeMatrix(rawMatrix, locations);
      const nodes = extractCoordinates(locations);
      const aiEngine = new PathfindingEngine(timeMatrix, nodes);
      
      // 3. Ejecución de búsquedas informadas [cite: 918]
      const greedyRes = aiEngine.runGreedy(baseIndex); // Algoritmo Voraz [cite: 926]
      const astarRes = aiEngine.runAStar(baseIndex);   // Algoritmo A* [cite: 927]

      setAiMetrics({ greedy: greedyRes, astar: astarRes });

      // 4. Mapeo y trazado en mapa
      const greedyLocs = greedyRes.path.map(idx => locations[idx]);
      const astarLocs = astarRes.path.map(idx => locations[idx]);

      const gRoute = await GoogleMapsService.getRouteFromOrderedLocations(greedyLocs);
      const aRoute = await GoogleMapsService.getRouteFromOrderedLocations(astarLocs);

      if (gRoute && aRoute) {
        setGreedyRoute({
          order: gRoute.orderedIds,
          totalDistance: gRoute.totalDistance,
          totalTime: greedyRes.totalCost,
          totalCost: gRoute.totalDistance * 0.5 + greedyRes.totalCost * 0.1
        });

        setAstarRoute({
          order: aRoute.orderedIds,
          totalDistance: aRoute.totalDistance,
          totalTime: astarRes.totalCost,
          totalCost: aRoute.totalDistance * 0.5 + astarRes.totalCost * 0.1
        });
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Error en la optimización. Revisa tu API Key.');
    } finally {
      setIsOptimizing(false);
    }
  }, [locations]);

  // Selección de la ruta activa según el interruptor
  const activeRoute = viewMode === 'greedy' ? greedyRoute : astarRoute;
  const activeMetrics = viewMode === 'greedy' ? aiMetrics.greedy : aiMetrics.astar;

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
              <p className="text-sm text-gray-600">Comparativa de Búsqueda Informada: Greedy vs A*</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* INTERRUPTOR DE ALGORITMO */}
        {(greedyRoute || astarRoute) && (
            <div className="mb-8 flex justify-center">
              <div className="inline-flex p-1 bg-gray-200 rounded-xl">
                <button 
                  onClick={() => setViewMode('greedy')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${viewMode === 'greedy' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  Greedy (Voraz)
                </button>
                <button 
                  onClick={() => setViewMode('astar')}
                  className={`px-6 py-2 rounded-lg font-semibold transition-all ${viewMode === 'astar' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  A* (Óptimo)
                </button>
              </div>
            </div>
        )}

        {/* Resumen de Métricas */}
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
              <BrainCircuit className="w-8 h-8 text-indigo-500" />
              <div>
                <div className="text-2xl font-bold">{activeMetrics?.expandedNodes || '-'}</div>
                <div className="text-sm text-gray-500">Nodos expandidos</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className="w-8 h-8 text-orange-500" />
              <div>
                <div className="text-2xl font-bold">{activeRoute ? Math.round(activeRoute.totalTime) : '-'}</div>
                <div className="text-sm text-gray-500">Minutos totales</div>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">{activeRoute ? activeRoute.totalDistance.toFixed(1) : '-'}</div>
                <div className="text-sm text-gray-500">Kilómetros</div>
              </div>
            </div>
          </div>
        </div>

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
              distanceMatrix={distanceMatrix}
            />
          </div>
        </div>
      </main>
    </div>
  );
}

export default App;