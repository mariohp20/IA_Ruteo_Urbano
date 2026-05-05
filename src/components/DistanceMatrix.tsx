import { AlertCircle, CheckCircle, Clock, RefreshCw, Route, Table, Network, Activity } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { GoogleMapsService } from '../services/googleMapsService';
import { DistanceMatrix as DistanceMatrixType, Location } from '../types/route';

interface DistanceMatrixProps {
  locations: Location[];
  distanceMatrix: DistanceMatrixType;
}

export const DistanceMatrix: React.FC<DistanceMatrixProps> = ({ locations, distanceMatrix }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [localMatrix, setLocalMatrix] = useState<DistanceMatrixType>(distanceMatrix);

  useEffect(() => {
    setLocalMatrix(distanceMatrix);
    if (Object.keys(distanceMatrix).length > 0) {
      setLastUpdated(new Date());
    }
  }, [distanceMatrix]);

  const handleRefreshMatrix = async () => {
    if (locations.length < 2) return;

    setIsLoading(true);
    setError(null);

    try {
      const newMatrix = await GoogleMapsService.getDistanceMatrix(locations);
      setLocalMatrix(newMatrix);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error refreshing distance matrix:', err);
      setError('Error al actualizar la matriz. Verifica tu conexión y la API key.');
    } finally {
      setIsLoading(false);
    }
  };

  if (locations.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Table className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Matriz de Costos Reales g(n)</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <Network className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <p>Agrega nodos al grafo para visualizar la matriz de pesos g(n)</p>
        </div>
      </div>
    );
  }

  const getLocationName = (id: string) => {
    const location = locations.find(l => l.id === id);
    if (!location) return 'Desconocido';
    if (location.isBase) return 'BASE';
    const index = locations.filter(l => !l.isBase).findIndex(l => l.id === id);
    return `N${index + 1}`; // N de Nodo
  };

  const getLocationAddress = (id: string) => {
    const location = locations.find(l => l.id === id);
    return location ? location.address : 'Desconocido';
  };

  const hasValidMatrix = Object.keys(localMatrix).length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Table className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Matriz de Costos Reales g(n)</h3>
          {lastUpdated && (
            <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-200">
              <CheckCircle className="w-3 h-3" />
              <span>Sincronizado {lastUpdated.toLocaleTimeString()}</span>
            </div>
          )}
        </div>

        {locations.length >= 2 && (
          <button
            onClick={handleRefreshMatrix}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 bg-indigo-50 text-indigo-700 rounded-lg hover:bg-indigo-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium border border-indigo-200"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {isLoading ? 'Extrayendo...' : 'Refrescar g(n)'}
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {isLoading && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center gap-2 text-indigo-700">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">Extrayendo pesos g(n) en tiempo real de Google Maps API...</span>
          </div>
        </div>
      )}

      {!hasValidMatrix && !isLoading ? (
        <div className="text-center text-gray-500 py-8">
          <Network className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <p className="mb-4">Ejecuta el Motor de IA para construir el grafo de distancias</p>
        </div>
      ) : hasValidMatrix && (
        <>
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Network className="w-4 h-4 text-slate-500" />
              Nodos del Grafo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {locations.map(location => (
                <div key={location.id} className="flex items-center gap-3 p-2 bg-white rounded border border-gray-100 shadow-sm">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                    location.isBase ? 'bg-green-600' : 'bg-indigo-500'
                  }`}>
                    {getLocationName(location.id)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800">
                      {location.isBase ? 'Base de Operaciones' : `Nodo Destino ${getLocationName(location.id)}`}
                    </div>
                    <div className="text-gray-500 truncate text-xs">
                      {getLocationAddress(location.id)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla de Matriz */}
          <div className="overflow-x-auto mb-6 rounded-lg border border-gray-200 shadow-sm">
            <div className="min-w-full">
              <table className="w-full border-collapse bg-white">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    <th className="p-3 text-left font-semibold text-sm sticky left-0 bg-slate-900 z-10 border-r border-slate-700">
                      <div className="flex items-center gap-2">
                        <Route className="w-4 h-4" />
                        Origen (i) \ Destino (j)
                      </div>
                    </th>
                    {locations.map(location => (
                      <th key={location.id} className="p-3 text-center font-semibold min-w-32 border-b border-slate-700 border-r border-slate-700 last:border-r-0">
                        <div className="flex flex-col items-center gap-1">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            location.isBase ? 'bg-green-500 text-green-950' : 'bg-indigo-400 text-indigo-950'
                          }`}>
                            {getLocationName(location.id)}
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {locations.map((fromLocation, rowIndex) => (
                    <tr key={fromLocation.id} className="hover:bg-indigo-50 transition-colors border-b border-gray-200 last:border-b-0">
                      <td className="p-3 font-semibold text-gray-700 bg-slate-50 sticky left-0 z-10 border-r border-gray-200">
                        <div className="flex items-center gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${
                            fromLocation.isBase ? 'bg-green-600' : 'bg-indigo-500'
                          }`}>
                            {getLocationName(fromLocation.id)}
                          </div>
                          <span className="text-sm">{getLocationName(fromLocation.id)}</span>
                        </div>
                      </td>
                      {locations.map(toLocation => {
                        const element = localMatrix[fromLocation.id]?.[toLocation.id];
                        const isOrigin = fromLocation.id === toLocation.id;

                        return (
                          <td key={toLocation.id} className={`p-3 text-center text-sm border-r border-gray-200 last:border-r-0 ${
                            isOrigin ? 'bg-gray-100' : ''
                          }`}>
                            {isOrigin ? (
                              <span className="text-gray-400 font-bold text-xs">0 (Diagonal)</span>
                            ) : element && element.status === 'OK' ? (
                              <div className="space-y-1">
                                <div className="flex items-center justify-center gap-1 text-indigo-700">
                                  <Clock className="w-3 h-3" />
                                  <span className="font-bold">{element.duration.text}</span>
                                </div>
                                <div className="text-[10px] text-gray-500 font-medium">
                                  {element.distance.text}
                                </div>
                              </div>
                            ) : (
                              <span className="text-red-400 text-xs font-bold">Inalcanzable</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análisis de Aristas (Usando las funciones no utilizadas) */}
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Análisis de Aristas del Grafo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Aristas Totales Evaluadas</div>
              <div className="text-xl font-black text-indigo-600">{locations.length * (locations.length - 1)}</div>
              <div className="text-xs text-gray-400 mt-1">Complejidad O(n²)</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Costo g(n) Promedio</div>
              <div className="text-xl font-black text-indigo-600">{calculateAverageTime(localMatrix, locations).toFixed(0)} min</div>
              <div className="text-xs text-gray-400 mt-1">{calculateAverageDistance(localMatrix, locations).toFixed(1)} km por arista</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Arista Más Rápida</div>
              <div className="text-sm font-bold text-green-600">{getFastestRoute(localMatrix, locations)}</div>
              <div className="text-xs text-gray-400 mt-1">Menor peso temporal</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">Arista Más Lenta</div>
              <div className="text-sm font-bold text-red-600">{getSlowestRoute(localMatrix, locations)}</div>
              <div className="text-xs text-gray-400 mt-1">Mayor peso temporal</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs text-indigo-800 font-medium">
              <strong>Nota Técnica:</strong> Esta matriz asimétrica de tiempos reales alimenta directamente la función de costo <code>g(n)</code> evaluada por los algoritmos Greedy y A* durante la expansión del árbol de búsqueda.
            </p>
          </div>
        </>
      )}
    </div>
  );
};

// ==========================================
// FUNCIONES AUXILIARES MATEMÁTICAS
// ==========================================

function calculateAverageDistance(matrix: DistanceMatrixType, locations: Location[]): number {
  let total = 0, count = 0;
  locations.forEach(from => {
    locations.forEach(to => {
      if (from.id !== to.id) {
        const element = matrix[from.id]?.[to.id];
        if (element && element.status === 'OK') {
          total += element.distance.value / 1000;
          count++;
        }
      }
    });
  });
  return count > 0 ? total / count : 0;
}

function calculateAverageTime(matrix: DistanceMatrixType, locations: Location[]): number {
  let total = 0, count = 0;
  locations.forEach(from => {
    locations.forEach(to => {
      if (from.id !== to.id) {
        const element = matrix[from.id]?.[to.id];
        if (element && element.status === 'OK') {
          total += element.duration.value / 60;
          count++;
        }
      }
    });
  });
  return count > 0 ? total / count : 0;
}

function getFastestRoute(matrix: DistanceMatrixType, locations: Location[]): string {
  let minTime = Infinity;
  let fastestRoute = 'N/A';
  locations.forEach(from => {
    locations.forEach(to => {
      if (from.id !== to.id) {
        const element = matrix[from.id]?.[to.id];
        if (element && element.status === 'OK' && element.duration.value < minTime) {
          minTime = element.duration.value;
          const fromName = from.isBase ? 'BASE' : `N${locations.filter(l => !l.isBase).findIndex(l => l.id === from.id) + 1}`;
          const toName = to.isBase ? 'BASE' : `N${locations.filter(l => !l.isBase).findIndex(l => l.id === to.id) + 1}`;
          fastestRoute = `${fromName} → ${toName} (${element.duration.text})`;
        }
      }
    });
  });
  return fastestRoute;
}

function getSlowestRoute(matrix: DistanceMatrixType, locations: Location[]): string {
  let maxTime = 0;
  let slowestRoute = 'N/A';
  locations.forEach(from => {
    locations.forEach(to => {
      if (from.id !== to.id) {
        const element = matrix[from.id]?.[to.id];
        if (element && element.status === 'OK' && element.duration.value > maxTime) {
          maxTime = element.duration.value;
          const fromName = from.isBase ? 'BASE' : `N${locations.filter(l => !l.isBase).findIndex(l => l.id === from.id) + 1}`;
          const toName = to.isBase ? 'BASE' : `N${locations.filter(l => !l.isBase).findIndex(l => l.id === to.id) + 1}`;
          slowestRoute = `${fromName} → ${toName} (${element.duration.text})`;
        }
      }
    });
  });
  return slowestRoute;
}