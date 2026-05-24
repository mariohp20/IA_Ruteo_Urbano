import { importMapsLibrary, mapsReady } from '../services/mapsLoader';
import { AlertCircle, MapPin, Plus, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  isOptimizing,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const acElementRef = useRef<google.maps.places.PlaceAutocompleteElement | null>(null);

  // ESTADOS
  const [inputText, setInputText] = useState('');
  const [isBase, setIsBase] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [acKey, setAcKey] = useState(0);

  // Inicialización Visual del Buscador
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let mounted = true;

    const init = async () => {
      await mapsReady;
      if (!mounted || !container) return;

      const { PlaceAutocompleteElement } = await importMapsLibrary('places');

      const element = new PlaceAutocompleteElement({
        componentRestrictions: { country: 'pe' },
        requestedLanguage: 'es',
        locationBias: new google.maps.LatLngBounds(
          { lat: -12.4, lng: -77.2 },
          { lat: -11.7, lng: -76.7 },
        ),
      });

      element.setAttribute('autocomplete', 'new-password');

      acElementRef.current = element;

      element.addEventListener('input', (e: Event) => {
        const target = e.target as HTMLInputElement;
        if (target) setInputText(target.value);
      });

      element.addEventListener('gmp-placeselect', () => {
        setTimeout(() => {
          if (acElementRef.current) {
            setInputText(acElementRef.current.value || '');
          }
        }, 50);
      });

      container.appendChild(element);
    };

    init();

    return () => {
      mounted = false;
      if (container) container.innerHTML = '';
    };
  }, [acKey]);

  /**
   * Confirma la ubicación seleccionada en el estado global.
   * Si no se selecciona explícitamente del desplegable, recurre a la API de Geocodificación.
   */
  const handleAddLocation = useCallback(async () => {
    const textToSearch = (acElementRef.current?.value || inputText).trim();

    if (!textToSearch) {
      setErrorMsg('Escribe una dirección válida.');
      return;
    }

    setIsProcessing(true);
    setErrorMsg('');

    try {
      await mapsReady;
      const geocoder = new google.maps.Geocoder();

      const response = await geocoder.geocode({
        address: `${textToSearch}, Lima, Perú`,
        bounds: new google.maps.LatLngBounds(
          { lat: -12.4, lng: -77.2 },
          { lat: -11.7, lng: -76.7 }
        )
      });

      if (response.results && response.results.length > 0) {
        const result = response.results[0];

        onAddLocation({
          id: Date.now().toString(),
          address: result.formatted_address,
          lat: result.geometry.location.lat(),
          lng: result.geometry.location.lng(),
          isBase
        });

        setIsBase(false);
        setInputText('');
        setAcKey(k => k + 1);
      } else {
        setErrorMsg('No se encontró la ubicación exacta en Lima.');
      }
    } catch (error) {
      console.error('[Geocoding Error]', error);
      setErrorMsg('No se pudo verificar la dirección en el mapa.');
    } finally {
      setIsProcessing(false);
    }
  }, [inputText, isBase, onAddLocation]);

  const baseLocation = locations.find(l => l.isBase);
  const deliveryLocations = locations.filter(l => !l.isBase);

  const canAdd = inputText.trim().length > 3 && !isProcessing;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center gap-3 mb-6">
        <MapPin className="w-6 h-6 text-indigo-600" />
        <h2 className="text-xl font-semibold text-gray-800">Gestión de Nodos</h2>
      </div>

      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar Dirección en Lima
          </label>
          <div
            key={acKey}
            ref={containerRef}
            className={`w-full rounded-lg border transition-all ${errorMsg ? 'border-red-400 ring-2 ring-red-100' : 'border-gray-200'}`}
            style={{ position: 'relative', zIndex: 50, minHeight: '40px' }}
          />

          {errorMsg && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errorMsg}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="isBase"
            checked={isBase}
            onChange={e => setIsBase(e.target.checked)}
            className="w-4 h-4 text-indigo-600 border-gray-300 rounded"
          />
          <label htmlFor="isBase" className="text-sm text-gray-700 cursor-pointer">
            Definir como <span className="font-semibold text-green-700">Base de Operaciones</span>
          </label>
        </div>

        <button
          onClick={handleAddLocation}
          disabled={!canAdd}
          className="w-full bg-indigo-600 text-white py-2.5 px-4 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2 font-medium text-sm"
        >
          {isProcessing ? 'Verificando...' : <><Plus className="w-4 h-4" />Agregar Nodo</>}
        </button>
      </div>

      <div className="space-y-3">
        {baseLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate font-bold text-green-800">📍 BASE: {baseLocation.address}</span>
            <button onClick={() => onRemoveLocation(baseLocation.id)} className="text-red-400 hover:text-red-600 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {deliveryLocations.map((location, index) => (
          <div key={location.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate">📍 {index + 1}. {location.address}</span>
            <button onClick={() => onRemoveLocation(location.id)} className="text-red-400 hover:text-red-600 p-1">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {locations.length >= 2 && baseLocation && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <button
            onClick={onOptimizeRoute}
            disabled={isOptimizing}
            className="w-full bg-slate-800 text-white py-3 px-4 rounded-lg hover:bg-slate-900 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            {isOptimizing ? 'Procesando...' : 'Buscar Mejor Ruta'}
          </button>
        </div>
      )}
    </div>
  );
};