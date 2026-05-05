import React, { useState } from 'react';
import { MapPin, Plus, Trash2, Navigation, BrainCircuit } from 'lucide-react';
import { Location } from '../types/route';

interface LocationFormProps {
  locations: Location[];
  onAddLocation: (location: Location) => void;
  onRemoveLocation: (id: string) => void;
  onOptimizeRoute: () => void;
  isOptimizing: boolean;
}

export const LocationForm: React.FC<LocationFormProps> = ({
  locations,
  onAddLocation,
  onRemoveLocation,
  onOptimizeRoute,
  isOptimizing
}) => {
  const [newAddress, setNewAddress] = useState('');
  const [isBase, setIsBase] = useState(false);

  const handleAddLocation = () => {
    if (!newAddress.trim()) return;

    const location: Location = {
      id: Date.now().toString(),
      address: newAddress.trim(),
      isBase
    };

    onAddLocation(location);
    setNewAddress('');
    setIsBase(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddLocation();
    }
  };

  const baseLocation = locations.find(l => l.isBase);
  const deliveryLocations = locations.filter(l => !l.isBase);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-800">Gestión de Nodos (Grafo)</h2>
      </div>

      {/* Add Location Form */}
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nueva Dirección o Coordenada
          </label>
          <input
            type="text"
            value={newAddress}
            onChange={(e) => setNewAddress(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ej. Av. Universitaria 1800, Lima"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isBase"
            checked={isBase}
            onChange={(e) => setIsBase(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
          />
          <label htmlFor="isBase" className="text-sm text-gray-700">
            Definir como Base de Operaciones (Nodo Inicial)
          </label>
        </div>

        <button
          onClick={handleAddLocation}
          disabled={!newAddress.trim()}
          className="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Agregar Nodo
        </button>
      </div>

      {/* Locations List */}
      <div className="space-y-3">
        <h3 className="font-medium text-gray-800 flex justify-between items-center">
          <span>Ubicaciones Actuales</span>
          <span className="bg-gray-100 text-gray-600 py-1 px-2 rounded-full text-xs">
            Total: {locations.length}
          </span>
        </h3>
        
        {baseLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Navigation className="w-4 h-4 text-green-600" />
                <span className="text-sm font-bold text-green-800">BASE:</span>
                <span className="text-sm text-gray-700">{baseLocation.address}</span>
              </div>
              <button
                onClick={() => onRemoveLocation(baseLocation.id)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Eliminar base"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {deliveryLocations.map((location, index) => (
          <div key={location.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg hover:border-indigo-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-6 h-6 bg-indigo-100 text-indigo-700 text-xs rounded-full flex items-center justify-center font-bold">
                  {index + 1}
                </span>
                <span className="text-sm text-gray-700">{location.address}</span>
              </div>
              <button
                onClick={() => onRemoveLocation(location.id)}
                className="text-red-500 hover:text-red-700 transition-colors p-1"
                title="Eliminar nodo"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Optimize Button */}
      {locations.length >= 2 && baseLocation && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onOptimizeRoute}
            disabled={isOptimizing}
            className="w-full bg-slate-800 text-white py-3 px-4 rounded-lg hover:bg-slate-900 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium shadow-md"
          >
            {isOptimizing ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Procesando Algoritmos...
              </>
            ) : (
              <>
                <BrainCircuit className="w-5 h-5 text-indigo-400" />
                Ejecutar Motor de IA
              </>
            )}
          </button>
        </div>
      )}

      {/* Warnings */}
      {locations.length < 2 && (
        <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800 flex items-center gap-2">
            <span className="block w-2 h-2 bg-amber-500 rounded-full"></span>
            Agrega al menos 2 nodos (1 base + 1 destino) para ejecutar los algoritmos.
          </p>
        </div>
      )}
      {locations.length >= 2 && !baseLocation && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-800 flex items-center gap-2">
            <span className="block w-2 h-2 bg-red-500 rounded-full"></span>
            Falta definir un nodo como Base de Operaciones.
          </p>
        </div>
      )}
    </div>
  );
};