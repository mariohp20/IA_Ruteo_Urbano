import { AlertCircle, Clock, Key, Map, Navigation, Route } from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { mapsReady } from '../services/mapsLoader';
import { Location, OptimizedRoute } from '../types/route';

interface RouteMapProps {
  locations: Location[];
  activeRoute?: OptimizedRoute | null;
  /** Path cacheado en App.tsx — no provoca llamadas de red al cambiar de pestaña. */
  activePath?: google.maps.LatLngAltitude[];
  viewMode?: 'greedy' | 'astar' | 'google';
}

export const RouteMap: React.FC<RouteMapProps> = ({
  locations,
  activeRoute,
  activePath = [],
  viewMode = 'astar',
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  const [isMapReady, setIsMapReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isApiKeyConfigured = !!import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const routeColor = viewMode === 'google' ? '#059669'
    : viewMode === 'greedy' ? '#DC2626'
      : '#2563EB';
  const routeName = viewMode === 'google' ? 'Caja Negra (Google)'
    : viewMode === 'greedy' ? 'Voraz (Greedy)'
      : 'A* (A-Estrella)';

  useEffect(() => {
    if (!isApiKeyConfigured || !mapRef.current) return;

    mapsReady.then(() => {
      if (!mapRef.current || mapInstanceRef.current) return;

      const mapInstance = new google.maps.Map(mapRef.current, {
        center: { lat: -12.0464, lng: -77.0428 },
        zoom: 12,
        mapId: 'DEMO_MAP_ID', // requerido para AdvancedMarkerElement
        mapTypeControl: true,
        streetViewControl: false,
        fullscreenControl: true,
        zoomControl: true,
        styles: [{
          featureType: 'poi',
          elementType: 'labels',
          stylers: [{ visibility: 'off' }],
        }],
      });

      mapInstanceRef.current = mapInstance;
      setIsMapReady(true);
      setError(null);
    }).catch(err => {
      console.error('[RouteMap] Error loading Google Maps SDK:', err);
      setError('Error al cargar Google Maps. Verifica tu API Key y que Maps JavaScript API esté activada.');
    });
  }, [isApiKeyConfigured]);

  const clearMarkers = useCallback(() => {
    markersRef.current.forEach(m => { m.map = null; });
    markersRef.current = [];
  }, []);

  const clearPolyline = useCallback(() => {
    polylineRef.current?.setMap(null);
    polylineRef.current = null;
  }, []);

  const createMarkerElement = (label: string, color: string): HTMLElement => {
    const div = document.createElement('div');
    div.style.cssText = 'width:40px;height:40px;cursor:pointer;';
    div.innerHTML = `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="20" y="26" text-anchor="middle" fill="white"
          font-family="Arial, sans-serif"
          font-size="${label.length > 2 ? '8' : '12'}"
          font-weight="bold">${label}</text>
      </svg>`;
    return div;
  };

  const placeMarkers = useCallback((
    orderedLocations: Location[],
    color: string,
    mapInst: google.maps.Map,
  ) => {
    clearMarkers();
    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];

    orderedLocations.forEach((loc, index) => {
      if (loc.lat == null || loc.lng == null) return;

      let label = '';
      let markerColor = color;

      if (loc.isBase) {
        markerColor = '#059669';
        label = index === 0 ? 'INICIO' : 'FIN';
      } else {
        const deliveryIdx = orderedLocations.slice(0, index).filter(l => !l.isBase).length + 1;
        label = deliveryIdx.toString();
      }

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: loc.lat, lng: loc.lng },
        map: mapInst,
        title: loc.address,
        zIndex: 1000,
        content: createMarkerElement(label, markerColor),
      });

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div style="padding:8px;max-width:200px">
            <strong>${loc.isBase ? (index === 0 ? 'Punto de Partida' : 'Retorno a Base') : `Entrega #${label}`}</strong>
            <p style="margin:4px 0 0;font-size:12px;color:#555">${loc.address}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#888">Paso ${index + 1} de ${orderedLocations.length}</p>
          </div>`,
      });
      marker.addListener('click', () => infoWindow.open(mapInst, marker));
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
  }, [clearMarkers]);

  const showMarkersOnly = useCallback(() => {
    const mapInst = mapInstanceRef.current;
    if (!mapInst) return;
    clearPolyline();
    clearMarkers();

    if (locations.length === 0) return;

    const newMarkers: google.maps.marker.AdvancedMarkerElement[] = [];
    const bounds = new google.maps.LatLngBounds();

    locations.forEach((loc, index) => {
      if (loc.lat == null || loc.lng == null) return;

      const marker = new google.maps.marker.AdvancedMarkerElement({
        position: { lat: loc.lat, lng: loc.lng },
        map: mapInst,
        title: loc.address,
        content: createMarkerElement(
          loc.isBase ? 'BASE' : (index + 1).toString(),
          loc.isBase ? '#059669' : '#6B7280',
        ),
      });
      bounds.extend({ lat: loc.lat, lng: loc.lng });
      newMarkers.push(marker);
    });

    markersRef.current = newMarkers;
    if (!bounds.isEmpty()) mapInst.fitBounds(bounds);
  }, [locations, clearPolyline, clearMarkers]);

  /**
   * Dibuja el path cacheado sobre el mapa sin realizar llamadas de red.
   * Si activePath está vacío, muestra solo los marcadores de ubicación.
   */
  const drawActivePath = useCallback(() => {
    const mapInst = mapInstanceRef.current;
    if (!mapInst || !activeRoute) return;

    setError(null);
    clearPolyline();
    clearMarkers();

    const orderedLocations = activeRoute.order
      .map(id => locations.find(loc => loc.id === id))
      .filter(Boolean) as Location[];

    if (orderedLocations.length < 2) return;

    if (!activePath || activePath.length === 0) {
      setError('No hay ruta trazada para este algoritmo.');
      showMarkersOnly();
      return;
    }

    const polyline = new google.maps.Polyline({
      path: activePath,
      strokeColor: routeColor,
      strokeWeight: 4,
      strokeOpacity: 0.85,
      map: mapInst,
    });
    polylineRef.current = polyline;

    const bounds = new google.maps.LatLngBounds();
    activePath.forEach(pt => bounds.extend(pt));
    mapInst.fitBounds(bounds);

    placeMarkers(orderedLocations, routeColor, mapInst);
  }, [activeRoute, activePath, locations, routeColor, clearPolyline, clearMarkers, placeMarkers, showMarkersOnly]);

  useEffect(() => {
    if (!isMapReady) return;

    if (locations.length === 0) {
      clearPolyline();
      clearMarkers();
      return;
    }

    if (!activeRoute) {
      showMarkersOnly();
      return;
    }

    drawActivePath();
  }, [isMapReady, locations, activeRoute, activePath, drawActivePath, showMarkersOnly, clearPolyline, clearMarkers]);

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className={`w-5 h-5 ${viewMode === 'google' ? 'text-emerald-600' : viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
            <h3 className="font-semibold text-gray-800">
              Trazado en Mapa: {activeRoute ? routeName : 'Esperando ubicaciones...'}
            </h3>
          </div>
        </div>
      </div>

      {!isApiKeyConfigured && (
        <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 border border-blue-200 m-4 rounded-lg">
          <div className="flex items-start gap-4">
            <Key className="w-8 h-8 text-blue-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-gray-800 mb-2">Configurar API Key</h3>
              <p className="text-sm text-gray-600">
                Añade <code className="bg-white px-1 rounded">VITE_GOOGLE_MAPS_API_KEY</code> en tu archivo <code className="bg-white px-1 rounded">.env</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-start gap-2 text-red-700">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {isApiKeyConfigured && (
        <div className="relative">
          <div ref={mapRef} className="h-96 w-full" style={{ minHeight: '400px' }} />
          {locations.length === 0 && (
            <div className="absolute inset-0 bg-gray-50/80 flex items-center justify-center pointer-events-none">
              <div className="text-center text-gray-400">
                <Map className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Agrega ubicaciones en el panel izquierdo</p>
              </div>
            </div>
          )}
        </div>
      )}

      {activeRoute && isApiKeyConfigured && (
        <div className="p-4 bg-gray-50 border-t border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="flex flex-col items-center">
              <Route className={`w-5 h-5 mb-1 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
              <span className="text-sm text-gray-600">Distancia</span>
              <span className="font-semibold text-gray-800">{activeRoute.totalDistance.toFixed(1)} km</span>
            </div>
            <div className="flex flex-col items-center">
              <Clock className={`w-5 h-5 mb-1 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
              <span className="text-sm text-gray-600">Tiempo</span>
              <span className="font-semibold text-gray-800">{Math.round(activeRoute.totalTime)} min</span>
            </div>
            <div className="flex flex-col items-center">
              <Navigation className="w-5 h-5 text-green-600 mb-1" />
              <span className="text-sm text-gray-600">Paradas</span>
              <span className="font-semibold text-gray-800">{locations.filter(l => !l.isBase).length}</span>
            </div>
          </div>
        </div>
      )}

      {activeRoute && activeRoute.order.length > 0 && isApiKeyConfigured && (
        <div className="p-4 border-t border-gray-200">
          <h4 className="font-medium text-gray-800 mb-3">Secuencia de Entrega ({routeName}):</h4>
          <div className="space-y-2">
            {activeRoute.order.map((locationId, index) => {
              const location = locations.find(l => l.id === locationId);
              if (!location) return null;

              const isStart = index === 0;
              let stepNumber = '';
              let stepColor = '';

              if (location.isBase) {
                stepNumber = isStart ? 'INICIO' : 'FIN';
                stepColor = 'bg-green-600 text-white';
              } else {
                const deliveryNumber = activeRoute.order
                  .slice(0, index)
                  .filter(id => locations.find(l => l.id === id && !l.isBase)).length + 1;
                stepNumber = deliveryNumber.toString();
                stepColor = viewMode === 'google' ? 'bg-emerald-600 text-white'
                  : viewMode === 'greedy' ? 'bg-red-600 text-white'
                    : 'bg-blue-600 text-white';
              }

              return (
                <div key={`${locationId}-${index}`} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <div className={`min-w-[2rem] h-8 rounded-full flex items-center justify-center text-sm font-medium ${stepColor}`}>
                    {stepNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span className="text-sm text-gray-700 truncate block">{location.address}</span>
                    {location.isBase && (
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full font-medium">
                        {isStart ? 'Punto de partida' : 'Retorno a base'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-medium flex-shrink-0">
                    Paso {index + 1}
                  </div>
                </div>
              );
            })}
          </div>
          <div className={`mt-4 p-3 rounded-lg border text-sm ${viewMode === 'greedy' ? 'bg-red-50 border-red-100 text-red-800'
            : 'bg-blue-50 border-blue-100 text-blue-800'
            }`}>
            <strong>Motor de IA:</strong> Secuencia definida por <strong>{routeName}</strong>.
            Trazado vial via Routes API v2.
          </div>
        </div>
      )}
    </div>
  );
};