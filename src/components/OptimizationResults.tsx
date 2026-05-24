import { Award, BarChart3, BrainCircuit, GitBranch, MapPin, Box } from 'lucide-react';
import React from 'react';
import { Location, OptimizedRoute } from '../types/route';
import { SearchResult } from '../ai/tspAlgorithms';

interface OptimizationResultsProps {
  activeRoute: OptimizedRoute | null;
  viewMode: 'greedy' | 'astar' | 'google';
  metrics: { greedy: SearchResult | null; astar: SearchResult | null; };
  googleRoute: OptimizedRoute | null;
  locations: Location[];
}

export const OptimizationResults: React.FC<OptimizationResultsProps> = ({ activeRoute, viewMode, metrics, googleRoute, locations }) => {
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
  const astarM = metrics.astar;
  const isGoogle = viewMode === 'google';

  // Títulos y colores dinámicos
  const title = isGoogle ? 'Caja Negra (API Google)' : (viewMode === 'greedy' ? 'Voraz (Greedy)' : 'A-Estrella (A*)');
  const colorText = isGoogle ? 'text-emerald-800' : (viewMode === 'greedy' ? 'text-red-800' : 'text-blue-800');
  const colorBg = isGoogle ? 'bg-emerald-50 border-emerald-200' : (viewMode === 'greedy' ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        {isGoogle ? <Box className="w-6 h-6 text-emerald-600" /> : <BrainCircuit className={`w-6 h-6 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />}
        <h3 className="text-lg font-bold text-gray-800">Rendimiento: {title}</h3>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
          <div className="text-2xl font-black text-gray-800 mb-1">
            {isGoogle ? '?' : metrics[viewMode]?.expandedNodes}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase">Nodos Expandidos</div>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-100">
          <div className={`text-2xl font-black mb-1 ${isGoogle ? 'text-emerald-600' : (viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600')}`}>
            {Math.round(activeRoute.totalTime)}
          </div>
          <div className="text-xs font-medium text-gray-500 uppercase">Minutos Tráfico</div>
        </div>
      </div>

      <div className="space-y-4">
        {/* Algorithm Behavior Explanation */}
        <div className={`p-4 rounded-lg border ${colorBg}`}>
          <div className="flex items-center gap-2 mb-2">
            <GitBranch className={`w-5 h-5 ${colorText}`} />
            <span className={`font-bold ${colorText}`}>Comportamiento</span>
          </div>
          <p className={`text-sm ${colorText} opacity-90`}>
            {isGoogle
              ? "Representa la solución comercial. Google utiliza heurísticas propietarias no reveladas (caja negra) alimentadas por grafos masivos de tráfico. No sabemos cuántos nodos expande, pero sirve como 'Ground Truth' para medir nuestros algoritmos."
              : (viewMode === 'greedy'
                ? "Greedy evaluó únicamente el costo inmediato g(n). Eligió el destino con menos tráfico actual sin prever el futuro, ahorrando memoria computacional pero arriesgando el tiempo final."
                : "A* utilizó f(n) = g(n) + h(n), combinando el tráfico real acumulado con la distancia Haversine. Explora más nodos, pero garantiza matemáticamente la ruta óptima dentro del grafo.")}
          </p>
        </div>

        {/* Baseline Comparison against Optimal A* */}
        {astarM && googleRoute && viewMode !== 'astar' && (
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
              <Award className="w-5 h-5 text-slate-600" />
              Comparativa contra A* Óptimo
            </h4>
            <div className="text-sm text-slate-700 space-y-2">
              {isGoogle ? (
                <p>La API de Google obtuvo una ruta de <strong>{Math.round(googleRoute.totalTime)} min</strong>. Nuestro algoritmo A* encontró una de <strong>{Math.round(astarM.totalCost / 60)} min</strong>. {Math.round(astarM.totalCost / 60) <= Math.round(googleRoute.totalTime) ? 'Nuestra heurística académica superó a la caja negra de Google en base a la matriz estática.' : 'Google considera tráfico en tiempo real, por eso puede diferir del óptimo teórico calculado con la matriz.'}</p>
              ) : (
                <p>Greedy resultó <strong>{Math.round(activeRoute.totalTime - (astarM.totalCost / 60))} minutos más lento</strong> que A*, demostrando la desventaja de la miopía de búsqueda, aunque requirió menos carga en memoria.</p>
              )}
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
              <span className="font-medium text-gray-800">{activeRoute.totalDistance.toFixed(1)} km</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};