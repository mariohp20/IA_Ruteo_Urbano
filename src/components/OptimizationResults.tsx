import { Award, BarChart3, BrainCircuit, Clock, GitBranch, MapPin, TrendingUp, Zap } from 'lucide-react';
import React from 'react';
import { Location, OptimizedRoute } from '../types/route';
import { SearchResult } from '../ai/tspAlgorithms';

interface OptimizationResultsProps {
  activeRoute: OptimizedRoute | null;
  viewMode: 'greedy' | 'astar';
  metrics: {
    greedy: SearchResult | null;
    astar: SearchResult | null;
  };
  locations: Location[];
}

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({
  activeRoute,
  viewMode,
  metrics,
  locations
}) => {
  if (!activeRoute || !metrics[viewMode]) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <BrainCircuit className="w-5 h-5 text-indigo-600" />
          <h3 className="font-semibold text-gray-800">Análisis de Algoritmos IA</h3>
        </div>
        <div className="text-center text-gray-500 py-8">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30 text-indigo-600" />
          <p>Los resultados y comparativas aparecerán después de ejecutar el motor de búsqueda informada.</p>
        </div>
      </div>
    );
  }

  const deliveryCount = locations.filter(l => !l.isBase).length;
  const currentMetrics = metrics[viewMode]!;
  
  // Lógica para la comparativa si ambos algoritmos ya corrieron
  const greedyM = metrics.greedy;
  const astarM = metrics.astar;
  const hasComparison = greedyM && astarM;
  
  const timeDiff = hasComparison ? (greedyM.totalCost - astarM.totalCost) : 0;
  const nodeDiff = hasComparison ? (astarM.expandedNodes - greedyM.expandedNodes) : 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BrainCircuit className={`w-6 h-6 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
          <h3 className="text-lg font-bold text-gray-800">
            Rendimiento: {viewMode === 'greedy' ? 'Voraz (Greedy)' : 'A-Estrella (A*)'}
          </h3>
        </div>
      </div>

      {/* MÉTRICAS CLAVE IA */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
          <div className="text-2xl font-black text-gray-800 mb-1">
            {currentMetrics.expandedNodes}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Nodos Expandidos</div>
        </div>

        <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
          <div className={`text-2xl font-black mb-1 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`}>
            {Math.round(currentMetrics.totalCost)}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Minutos Tráfico</div>
        </div>
      </div>

      <div className="space-y-4">
        
        {/* EXPLICACIÓN ACADÉMICA DEL ALGORITMO ACTIVO */}
        <div className={`p-4 rounded-lg border ${viewMode === 'greedy' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className={`w-5 h-5 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
            <span className={`font-bold ${viewMode === 'greedy' ? 'text-red-800' : 'text-blue-800'}`}>
              Comportamiento del Algoritmo
            </span>
          </div>
          <p className={`text-sm ${viewMode === 'greedy' ? 'text-red-700' : 'text-blue-700'}`}>
            {viewMode === 'greedy' 
              ? "Greedy evaluó únicamente el costo inmediato g(n). En cada paso, eligió el destino con menos tráfico actual sin pensar en el retorno, lo que minimiza la memoria usada (nodos) pero puede resultar en una ruta global ineficiente."
              : "A* utilizó la función de evaluación f(n) = g(n) + h(n), combinando el tráfico real acumulado con la heurística de distancia Haversine. Esto garantiza encontrar la ruta matemáticamente óptima, a costa de explorar más nodos posibles."}
          </p>
        </div>

        {/* COMPARATIVA AUTOMÁTICA (El plato fuerte del proyecto) */}
        {hasComparison && timeDiff > 0 && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-100">
            <h4 className="font-bold text-indigo-900 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-indigo-600" />
              Conclusión de la Comparativa
            </h4>
            <ul className="text-sm text-indigo-800 space-y-2">
              <li className="flex items-start gap-2">
                <Clock className="w-4 h-4 mt-0.5 text-green-600 flex-shrink-0" />
                <span>
                  <strong>A* es superior en tiempo:</strong> Logró reducir la ruta en <strong className="text-green-700">{Math.round(timeDiff)} minutos</strong> respecto a Greedy, evitando atascos a largo plazo.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <Zap className="w-4 h-4 mt-0.5 text-orange-500 flex-shrink-0" />
                <span>
                  <strong>Greedy es superior en memoria:</strong> Resolvió el problema expandiendo <strong className="text-orange-600">{nodeDiff} nodos menos</strong> que A*, exigiendo menos carga computacional.
                </span>
              </li>
            </ul>
          </div>
        )}

        {/* Resumen Logístico Estándar */}
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            Resumen Logístico Físico
          </h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Puntos de entrega:</span>
              <span className="font-medium text-gray-800">{deliveryCount}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Distancia trazada (Google):</span>
              <span className="font-medium text-gray-800">
                {activeRoute.totalDistance.toFixed(1)} km
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Velocidad promedio:</span>
              <span className="font-medium text-gray-800">
                {activeRoute.totalTime > 0 ? ((activeRoute.totalDistance / (activeRoute.totalTime / 60)).toFixed(1)) : '0'} km/h
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};