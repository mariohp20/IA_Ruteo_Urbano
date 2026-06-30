// Usa AutocompleteSuggestion de la Places API (New), disponible para cuentas post-Marzo 2025.
// El dropdown se construye manualmente en React para control total sobre los eventos.

import { importMapsLibrary, mapsReady } from '../services/mapsLoader';
import { AlertCircle, CheckCircle, Loader2, MapPin, Plus, Search, Trash2 } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Location } from '../types/route';

interface LocationFormProps {
  locations: Location[];
  onAddLocation: (location: Location) => void;
  onRemoveLocation: (id: string) => void;
  onOptimizeRoute: () => void;
  isOptimizing: boolean;
}

interface SelectedPlace {
  address: string;
  lat: number;
  lng: number;
}

interface Suggestion {
  id: string;
  mainText: string;
  secondaryText: string;
  raw: any;
}

const LIMA_BOUNDS = {
  low:  { lat: -12.4, lng: -77.2 },
  high: { lat: -11.7, lng: -76.7 },
};

export const LocationForm: React.FC<LocationFormProps> = ({
  locations,
  onAddLocation,
  onRemoveLocation,
  onOptimizeRoute,
  isOptimizing,
}) => {
  const wrapperRef       = useRef<HTMLDivElement>(null);
  const inputRef         = useRef<HTMLInputElement>(null);
  const searchTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionTokenRef  = useRef<any>(null);
  const selectedPlaceRef = useRef<SelectedPlace | null>(null);

  const [inputValue,    setInputValue]    = useState('');
  const [suggestions,   setSuggestions]   = useState<Suggestion[]>([]);
  const [isSearching,   setIsSearching]   = useState(false);
  const [isDropdownOpen,setIsDropdownOpen]= useState(false);
  const [hasValidPlace, setHasValidPlace] = useState(false);
  const [isBase,        setIsBase]        = useState(false);
  const [errorMsg,      setErrorMsg]      = useState('');
  const [isProcessing,  setIsProcessing]  = useState(false);

  useEffect(() => {
    mapsReady.then(() => importMapsLibrary('places')).catch(console.error);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsDropdownOpen(false);
      return;
    }

    setIsSearching(true);
    try {
      const lib = await importMapsLibrary('places') as any;
      const { AutocompleteSuggestion, AutocompleteSessionToken } = lib;

      // Crear o reutilizar session token (agrupa Autocomplete + Place Details en 1 sesión de billing).
      if (!sessionTokenRef.current) {
        sessionTokenRef.current = new AutocompleteSessionToken();
      }

      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(LIMA_BOUNDS.low.lat,  LIMA_BOUNDS.low.lng),
        new google.maps.LatLng(LIMA_BOUNDS.high.lat, LIMA_BOUNDS.high.lng),
      );

      const { suggestions: raw } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input:              query,
        sessionToken:       sessionTokenRef.current,
        includedRegionCodes: ['pe'],
        locationBias:       bounds,
        language:           'es',
      });

      const parsed: Suggestion[] = (raw ?? []).map((s: any, i: number) => {
        const pred = s.placePrediction;
        return {
          id:            pred?.placeId ?? String(i),
          mainText:      pred?.mainText?.text      ?? pred?.text?.text ?? '',
          secondaryText: pred?.secondaryText?.text ?? '',
          raw:           pred,
        };
      });

      setSuggestions(parsed);
      setIsDropdownOpen(parsed.length > 0);
    } catch (err) {
      console.error('[fetchSuggestions] error:', err);
      setSuggestions([]);
      setIsDropdownOpen(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputValue(val);
    setErrorMsg('');

    if (selectedPlaceRef.current !== null) {
      selectedPlaceRef.current = null;
      setHasValidPlace(false);
    }

    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => fetchSuggestions(val), 300);
  }, [fetchSuggestions]);

  const handleSelectSuggestion = useCallback(async (suggestion: Suggestion) => {
    setIsDropdownOpen(false);
    setSuggestions([]);

    const displayText = suggestion.mainText + (suggestion.secondaryText ? `, ${suggestion.secondaryText}` : '');
    setInputValue(displayText);
    setIsSearching(true);
    setErrorMsg('');

    try {
      const place = suggestion.raw.toPlace();
      await place.fetchFields({
        fields: ['displayName', 'formattedAddress', 'location'],
      });

      const lat     = place.location?.lat();
      const lng     = place.location?.lng();
      const address = place.formattedAddress
        || place.displayName?.text
        || place.displayName
        || displayText;

      if (lat != null && lng != null && address) {
        selectedPlaceRef.current = { address, lat, lng };
        setInputValue(address);
        setHasValidPlace(true);

        // Rotar el session token: la sesión de billing termina con fetchFields.
        const { AutocompleteSessionToken } = await importMapsLibrary('places') as any;
        sessionTokenRef.current = new AutocompleteSessionToken();
      } else {
        throw new Error('Coordenadas vacías');
      }
    } catch (err) {
      console.error('[selectSuggestion] error:', err);
      selectedPlaceRef.current = null;
      setHasValidPlace(false);
      setErrorMsg('No se obtuvieron coordenadas. Selecciona de nuevo.');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleAddLocation = useCallback(() => {
    const place = selectedPlaceRef.current;
    if (!place) {
      setErrorMsg('Selecciona una dirección de la lista desplegable.');
      return;
    }

    setIsProcessing(true);
    onAddLocation({
      id:      Date.now().toString(),
      address: place.address,
      lat:     place.lat,
      lng:     place.lng,
      isBase,
    });

    selectedPlaceRef.current  = null;
    sessionTokenRef.current   = null;
    setHasValidPlace(false);
    setInputValue('');
    setSuggestions([]);
    setIsDropdownOpen(false);
    setIsBase(false);
    setErrorMsg('');
    setIsProcessing(false);
  }, [isBase, onAddLocation]);

  const baseLocation      = locations.find(l => l.isBase);
  const deliveryLocations = locations.filter(l => !l.isBase);
  const canAdd            = hasValidPlace && !isProcessing;

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

          {hasValidPlace && (
            <div className="mb-1.5 flex items-center gap-1.5 text-xs text-green-700 font-medium">
              <CheckCircle className="w-3 h-3" />
              Lugar confirmado — coordenadas GPS obtenidas
            </div>
          )}

          <div ref={wrapperRef} className="relative">
            <div className={`flex items-center rounded-lg border transition-all ${
              hasValidPlace
                ? 'border-green-400 ring-2 ring-green-100 bg-green-50'
                : errorMsg
                  ? 'border-red-400 ring-2 ring-red-100'
                  : 'border-gray-300 focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-100'
            }`}>
              {isSearching
                ? <Loader2 className="w-4 h-4 ml-3 text-gray-400 animate-spin shrink-0" />
                : <Search   className="w-4 h-4 ml-3 text-gray-400 shrink-0" />
              }
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => suggestions.length > 0 && setIsDropdownOpen(true)}
                placeholder="Ej: Jockey Plaza, Surco..."
                autoComplete="off"
                className="w-full px-3 py-2 text-sm bg-transparent outline-none placeholder:text-gray-400"
              />
              {inputValue && (
                <button
                  type="button"
                  onClick={() => {
                    setInputValue('');
                    setSuggestions([]);
                    setIsDropdownOpen(false);
                    selectedPlaceRef.current = null;
                    setHasValidPlace(false);
                    setErrorMsg('');
                    inputRef.current?.focus();
                  }}
                  className="mr-2 text-gray-300 hover:text-gray-500 text-lg leading-none shrink-0"
                  aria-label="Borrar"
                >
                  ×
                </button>
              )}
            </div>

            {isDropdownOpen && suggestions.length > 0 && (
              <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {suggestions.map(s => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onMouseDown={e => {
                        e.preventDefault(); // Evita que el input pierda focus antes del click.
                        handleSelectSuggestion(s);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-indigo-50 transition-colors flex flex-col gap-0.5"
                    >
                      <span className="text-sm font-medium text-gray-800">{s.mainText}</span>
                      {s.secondaryText && (
                        <span className="text-xs text-gray-500">{s.secondaryText}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

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
          {isProcessing
            ? 'Agregando...'
            : <><Plus className="w-4 h-4" />Agregar Nodo</>}
        </button>
      </div>

      <div className="space-y-3">
        {baseLocation && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg shadow-sm flex items-center justify-between">
            <span className="text-sm text-gray-700 truncate font-bold text-green-800">
              📍 BASE: {baseLocation.address}
            </span>
            <button
              onClick={() => onRemoveLocation(baseLocation.id)}
              className="text-red-400 hover:text-red-600 p-1"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}

        {deliveryLocations.map((location, index) => (
          <div
            key={location.id}
            className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center justify-between"
          >
            <span className="text-sm text-gray-700 truncate">
              📍 {index + 1}. {location.address}
            </span>
            <button
              onClick={() => onRemoveLocation(location.id)}
              className="text-red-400 hover:text-red-600 p-1"
            >
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