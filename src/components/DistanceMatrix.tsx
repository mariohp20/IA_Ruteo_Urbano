import { Activity, Clock, Network, Route, Table } from 'lucide-react';
import React from 'react';
import { Location } from '../types/route';

interface DistanceMatrixProps {
  locations: Location[];
  rawTimeMatrix: number[][] | null;
}

// Utilidades de formato visual
function secsToDisplay(secs: number): string {
  if (secs === Infinity || secs < 0) return '—';
  if (secs === 0) return '0 min';
  const mins = Math.round(secs / 60);
  return `${mins} min`;
}

function getNodeLabel(location: Location, locations: Location[]): string {
  if (location.isBase) return 'BASE';
  const idx = locations.filter(l => !l.isBase).findIndex(l => l.id === location.id);
  return `N${idx + 1}`;
}

// Funciones de análisis estadístico de grafos
function getAverageMinutes(matrix: number[][]): number {
  const values = matrix.flat().filter(v => v !== 0 && v !== Infinity);
  if (!values.length) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length / 60;
}

interface EdgeInfo { label: string; minutes: number }

function getFastestEdge(matrix: number[][], locations: Location[]): EdgeInfo | null {
  let min = Infinity;
  let result: EdgeInfo | null = null;
  for (let i = 0; i < locations.length; i++) {
    for (let j = 0; j < locations.length; j++) {
      if (i !== j && matrix[i]?.[j] < min) {
        min = matrix[i][j];
        result = {
          label: `${getNodeLabel(locations[i], locations)} → ${getNodeLabel(locations[j], locations)}`,
          minutes: min / 60,
        };
      }
    }
  }
  return result;
}

function getSlowestEdge(matrix: number[][], locations: Location[]): EdgeInfo | null {
  let max = -1;
  let result: EdgeInfo | null = null;
  for (let i = 0; i < locations.length; i++) {
    for (let j = 0; j < locations.length; j++) {
      if (i !== j && matrix[i]?.[j] !== Infinity && matrix[i]?.[j] > max) {
        max = matrix[i][j];
        result = {
          label: `${getNodeLabel(locations[i], locations)} → ${getNodeLabel(locations[j], locations)}`,
          minutes: max / 60,
        };
      }
    }
  }
  return result;
}

// Componente para renderizar la matriz de distancias
export const DistanceMatrix: React.FC<DistanceMatrixProps> = ({
  locations,
  rawTimeMatrix,
}) => {
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

  const hasMatrix = rawTimeMatrix !== null && rawTimeMatrix.length > 0;

  const fastest = hasMatrix ? getFastestEdge(rawTimeMatrix, locations) : null;
  const slowest = hasMatrix ? getSlowestEdge(rawTimeMatrix, locations) : null;
  const avgMin = hasMatrix ? getAverageMinutes(rawTimeMatrix) : 0;
  const totalEdges = locations.length * (locations.length - 1);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Table className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Matriz de Costos Reales g(n)</h3>
        </div>
      </div>

      {!hasMatrix ? (
        <div className="text-center text-gray-500 py-8">
          <Network className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <p>Ejecuta el Motor de IA para construir el grafo de distancias</p>
        </div>
      ) : (
        <>
          {/* Leyenda de nodos */}
          <div className="mb-6 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Network className="w-4 h-4 text-slate-500" />
              Nodos del Grafo
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {locations.map(location => (
                <div
                  key={location.id}
                  className="flex items-center gap-3 p-2 bg-white rounded border border-gray-100 shadow-sm"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${location.isBase ? 'bg-green-600' : 'bg-indigo-500'
                      }`}
                  >
                    {getNodeLabel(location, locations)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-gray-800">
                      {location.isBase
                        ? 'Base de Operaciones'
                        : `Nodo Destino ${getNodeLabel(location, locations)}`}
                    </div>
                    <div className="text-gray-500 truncate text-xs">
                      {location.address}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tabla NxN */}
          <div className="overflow-x-auto mb-6 rounded-lg border border-gray-200 shadow-sm">
            <table className="w-full border-collapse bg-white">
              <thead>
                <tr className="bg-slate-800 text-white">
                  <th className="p-3 text-left font-semibold text-sm sticky left-0 bg-slate-900 z-10 border-r border-slate-700">
                    <div className="flex items-center gap-2">
                      <Route className="w-4 h-4" />
                      Origen (i) \ Destino (j)
                    </div>
                  </th>
                  {locations.map(loc => (
                    <th
                      key={loc.id}
                      className="p-3 text-center font-semibold min-w-28 border-b border-slate-700 border-r border-slate-700 last:border-r-0"
                    >
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mx-auto ${loc.isBase
                          ? 'bg-green-500 text-green-950'
                          : 'bg-indigo-400 text-indigo-950'
                          }`}
                      >
                        {getNodeLabel(loc, locations)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {locations.map((fromLoc, i) => (
                  <tr
                    key={fromLoc.id}
                    className="hover:bg-indigo-50 transition-colors border-b border-gray-200 last:border-b-0"
                  >
                    <td className="p-3 font-semibold text-gray-700 bg-slate-50 sticky left-0 z-10 border-r border-gray-200">
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white shadow-sm ${fromLoc.isBase ? 'bg-green-600' : 'bg-indigo-500'
                            }`}
                        >
                          {getNodeLabel(fromLoc, locations)}
                        </div>
                        <span className="text-sm">{getNodeLabel(fromLoc, locations)}</span>
                      </div>
                    </td>
                    {locations.map((toLoc, j) => {
                      const secs = rawTimeMatrix[i]?.[j];
                      const isDiag = i === j;

                      return (
                        <td
                          key={toLoc.id}
                          className={`p-3 text-center text-sm border-r border-gray-200 last:border-r-0 ${isDiag ? 'bg-gray-100' : ''
                            }`}
                        >
                          {isDiag ? (
                            <span className="text-gray-400 font-bold text-xs">
                              0 (Diagonal)
                            </span>
                          ) : secs === Infinity || secs == null ? (
                            <span className="text-red-400 text-xs font-bold">Inalcanzable</span>
                          ) : (
                            <div className="flex items-center justify-center gap-1 text-indigo-700">
                              <Clock className="w-3 h-3" />
                              <span className="font-bold">{secsToDisplay(secs)}</span>
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Estadísticas de aristas */}
          <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-slate-500" />
            Análisis de Aristas del Grafo
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                Aristas Evaluadas
              </div>
              <div className="text-xl font-black text-indigo-600">{totalEdges}</div>
              <div className="text-xs text-gray-400 mt-1">Complejidad O(n²)</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                g(n) Promedio
              </div>
              <div className="text-xl font-black text-indigo-600">
                {avgMin.toFixed(0)} min
              </div>
              <div className="text-xs text-gray-400 mt-1">Por arista</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                Arista Más Rápida
              </div>
              <div className="text-sm font-bold text-green-600">
                {fastest ? `${fastest.label} (${Math.round(fastest.minutes)} min)` : 'N/A'}
              </div>
              <div className="text-xs text-gray-400 mt-1">Menor peso temporal</div>
            </div>
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
              <div className="text-xs font-bold text-gray-500 uppercase mb-1">
                Arista Más Lenta
              </div>
              <div className="text-sm font-bold text-red-600">
                {slowest ? `${slowest.label} (${Math.round(slowest.minutes)} min)` : 'N/A'}
              </div>
              <div className="text-xs text-gray-400 mt-1">Mayor peso temporal</div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-indigo-50 rounded-lg border border-indigo-100">
            <p className="text-xs text-indigo-800 font-medium">
              <strong>Nota Técnica:</strong> Esta matriz asimétrica de tiempos reales
              (obtenidos vía <code>routes.googleapis.com/distanceMatrix/v2</code> con perfil{' '}
              <code>DRIVING</code> y <code>TRAFFIC_AWARE</code>) alimenta la función de
              costo <code>g(n)</code> evaluada por los algoritmos Greedy y A* durante la
              expansión del árbol de búsqueda.
            </p>
          </div>
        </>
      )}
    </div>
  );
};