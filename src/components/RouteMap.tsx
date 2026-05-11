import { Loader } from '@googlemaps/js-api-loader';
import { AlertCircle, Clock, Key, Map, Navigation, Route } from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import { Location, OptimizedRoute } from '../types/route';

// Actualizamos las props para recibir el estado de la IA
interface RouteMapProps {
  locations: Location[];
  activeRoute?: OptimizedRoute | null;
  viewMode?: 'greedy' | 'astar' | 'google'; 
}

const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export const RouteMap: React.FC<RouteMapProps> = ({ locations, activeRoute, viewMode = 'astar' }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const [directionsRenderer, setDirectionsRenderer] = useState<google.maps.DirectionsRenderer | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markers, setMarkers] = useState<google.maps.Marker[]>([]);
  const [apiKeyValid, setApiKeyValid] = useState(false);

  const isApiKeyConfigured = VITE_GOOGLE_MAPS_API_KEY && VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';

  // Colores dinámicos según el algoritmo
  const routeColor = viewMode === 'google' ? '#059669' : (viewMode === 'greedy' ? '#DC2626' : '#2563EB'); 
  const routeName = viewMode === 'google' ? 'Caja Negra (Google)' : (viewMode === 'greedy' ? 'Voraz (Greedy)' : 'A* (A-Estrella)');

  useEffect(() => {
    if (!isApiKeyConfigured) {
      setError('API Key de Google Maps no configurada.');
      return;
    }

    const initMap = async () => {
      try {
        const loader = new Loader({
          apiKey: VITE_GOOGLE_MAPS_API_KEY,
          version: 'weekly',
          libraries: ['places', 'geometry']
        });

        await loader.load();
        setApiKeyValid(true);

        if (mapRef.current) {
          const mapInstance = new google.maps.Map(mapRef.current, {
            center: { lat: -12.0464, lng: -77.0428 },
            zoom: 12,
            mapTypeControl: true,
            streetViewControl: false,
            fullscreenControl: true,
            zoomControl: true,
            styles: [
              {
                featureType: 'poi',
                elementType: 'labels',
                stylers: [{ visibility: 'off' }]
              }
            ]
          });

          const directionsServiceInstance = new google.maps.DirectionsService();
          const directionsRendererInstance = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
              strokeColor: '#2563EB', // Color base, se actualizará dinámicamente
              strokeWeight: 4,
              strokeOpacity: 0.8
            }
          });

          directionsRendererInstance.setMap(mapInstance);

          setMap(mapInstance);
          setDirectionsService(directionsServiceInstance);
          setDirectionsRenderer(directionsRendererInstance);
          setError(null);
        }
      } catch (err) {
        console.error('Error loading Google Maps:', err);
        setApiKeyValid(false);
        setError('Error al cargar Google Maps. Verifica tu API Key.');
      }
    };

    initMap();
  }, [isApiKeyConfigured]);

  const clearMarkers = () => {
    markers.forEach(marker => marker.setMap(null));
    setMarkers([]);
  };

  useEffect(() => {
    if (!map || !directionsService || !directionsRenderer || !apiKeyValid) return;

    clearMarkers();
    directionsRenderer.setDirections({ routes: [] } as any);

    if (locations.length === 0) return;

    if (!activeRoute) {
      showMarkersOnly();
      return;
    }

    showOptimizedRoute();
  }, [map, directionsService, directionsRenderer, locations, activeRoute, apiKeyValid, viewMode]);

  const showMarkersOnly = () => {
    if (!map) return;
    const newMarkers: google.maps.Marker[] = [];

    locations.forEach((location, index) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location.address + ', Lima, Perú' }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const position = results[0].geometry.location;
          const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: location.address,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createNumberedMarkerSVG(
                location.isBase ? 'BASE' : (index + 1).toString(),
                location.isBase ? '#059669' : '#6B7280' // Gris cuando no hay ruta calculada
              ))}`,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40)
            }
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-2">
                <h3 class="font-semibold text-gray-800">
                  ${location.isBase ? 'Base de Operaciones' : `Entrega ${index + 1}`}
                </h3>
                <p class="text-sm text-gray-600">${location.address}</p>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        }
      });
    });

    setMarkers(newMarkers);
  };

  const showOptimizedRoute = async () => {
    if (!map || !directionsService || !directionsRenderer || !activeRoute) return;

    setIsLoading(true);
    setError(null);

    // Actualizamos el color de la línea según el algoritmo seleccionado
    directionsRenderer.setOptions({
        polylineOptions: {
            strokeColor: routeColor,
            strokeWeight: 4,
            strokeOpacity: 0.8
        }
    });

    try {
      const orderedLocations = activeRoute.order.map(id =>
        locations.find(loc => loc.id === id)
      ).filter(Boolean) as Location[];

      if (orderedLocations.length < 2) return;

      const origin = orderedLocations[0].address + ', Lima, Perú';
      const destination = orderedLocations[orderedLocations.length - 1].address + ', Lima, Perú';
      const waypoints = orderedLocations.slice(1, -1).map(location => ({
        location: location.address + ', Lima, Perú',
        stopover: true
      }));

      directionsService.route({
        origin: origin,
        destination: destination,
        waypoints: waypoints,
        travelMode: google.maps.TravelMode.DRIVING,
        optimizeWaypoints: false, // La IA ya hizo el trabajo
        avoidHighways: false,
        avoidTolls: false
      }, (result, status) => {
        if (status === 'OK' && result) {
          directionsRenderer.setDirections(result);

          const bounds = new google.maps.LatLngBounds();
          result.routes[0].legs.forEach(leg => {
            bounds.extend(leg.start_location);
            bounds.extend(leg.end_location);
          });
          map.fitBounds(bounds);

          addNumberedMarkers(orderedLocations);
        } else {
          console.error('Error getting directions:', status);
          setError('Error al calcular el trazado en el mapa.');
          showMarkersOnly();
        }
        setIsLoading(false);
      });

    } catch (err) {
      console.error('Error showing optimized route:', err);
      setError('Error al mostrar la ruta.');
      setIsLoading(false);
    }
  };

  const addNumberedMarkers = (orderedLocations: Location[]) => {
    if (!map) return;
    const newMarkers: google.maps.Marker[] = [];

    orderedLocations.forEach((location, index) => {
      const geocoder = new google.maps.Geocoder();
      geocoder.geocode({ address: location.address + ', Lima, Perú' }, (results, status) => {
        if (status === 'OK' && results && results[0]) {
          const position = results[0].geometry.location;

          let markerLabel = '';
          let markerIconColor = routeColor; // Aplica el color del algoritmo

          if (location.isBase) {
            markerIconColor = '#059669'; // Verde para la base siempre
            markerLabel = index === 0 ? 'INICIO' : 'FIN';
          } else {
            const deliveryIndex = orderedLocations.slice(0, index).filter(l => !l.isBase).length + 1;
            markerLabel = deliveryIndex.toString();
          }

          const marker = new google.maps.Marker({
            position: position,
            map: map,
            title: location.address,
            icon: {
              url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(createNumberedMarkerSVG(markerLabel, markerIconColor))}`,
              scaledSize: new google.maps.Size(40, 40),
              anchor: new google.maps.Point(20, 40)
            },
            zIndex: 1000
          });

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div class="p-3 max-w-xs">
                <h3 class="font-semibold text-gray-800 mb-1">
                  ${location.isBase
                    ? (index === 0 ? 'Punto de Partida' : 'Punto de Llegada')
                    : `Entrega #${orderedLocations.slice(0, index).filter(l => !l.isBase).length + 1}`
                  }
                </h3>
                <p class="text-sm text-gray-600 mb-2">${location.address}</p>
                <div class="text-xs text-gray-500">
                  Orden en ruta: ${index + 1} de ${orderedLocations.length}
                </div>
              </div>
            `
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });

          newMarkers.push(marker);
        }
      });
    });

    setMarkers(newMarkers);
  };

  const createNumberedMarkerSVG = (label: string, color: string) => {
    return `
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="${color}" stroke="white" stroke-width="2"/>
        <text x="20" y="26" text-anchor="middle" fill="white" font-family="Arial, sans-serif" font-size="${label.length > 2 ? '8' : '12'}" font-weight="bold">
          ${label}
        </text>
      </svg>
    `;
  };

  // Componente de Instrucciones omitido por brevedad en este bloque, pero incluido en el return
  const ApiKeySetupInstructions = () => (
    <div className="p-6 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg border border-blue-200">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <Key className="w-8 h-8 text-blue-600" />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">
            Configuración de Google Maps API Key
          </h3>
        </div>
      </div>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden border border-gray-200">
      <div className="p-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Map className={`w-5 h-5 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
            <h3 className="font-semibold text-gray-800">
                Trazado en Mapa: {activeRoute ? routeName : 'Esperando ubicaciones...'}
            </h3>
          </div>
          {isLoading && (
            <div className={`flex items-center gap-2 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`}>
              <div className={`w-4 h-4 border-2 border-t-transparent rounded-full animate-spin ${viewMode === 'greedy' ? 'border-red-600' : 'border-blue-600'}`}></div>
              <span className="text-sm">Dibujando ruta...</span>
            </div>
          )}
        </div>
      </div>

      {!isApiKeyConfigured && (
        <div className="p-4">
          <ApiKeySetupInstructions />
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {isApiKeyConfigured && (
        <div className="relative">
          <div
            ref={mapRef}
            className="h-96 w-full"
            style={{ minHeight: '400px' }}
          />

          {locations.length === 0 && (
            <div className="absolute inset-0 bg-gray-50 flex items-center justify-center">
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
              <span className="font-semibold text-gray-800">
                {activeRoute.totalDistance.toFixed(1)} km
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Clock className={`w-5 h-5 mb-1 ${viewMode === 'greedy' ? 'text-red-600' : 'text-blue-600'}`} />
              <span className="text-sm text-gray-600">Tiempo</span>
              <span className="font-semibold text-gray-800">
                {Math.round(activeRoute.totalTime)} min
              </span>
            </div>
            <div className="flex flex-col items-center">
              <Navigation className="w-5 h-5 text-green-600 mb-1" />
              <span className="text-sm text-gray-600">Paradas</span>
              <span className="font-semibold text-gray-800">
                {locations.filter(l => !l.isBase).length}
              </span>
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
                if (isStart) {
                  stepNumber = 'INICIO';
                  stepColor = 'bg-green-600 text-white';
                } else {
                  stepNumber = 'FIN';
                  stepColor = 'bg-green-600 text-white';
                }
              } else {
                const deliveryNumber = activeRoute.order.slice(0, index).filter(id => {
                  const loc = locations.find(l => l.id === id);
                  return loc && !loc.isBase;
                }).length + 1;
                stepNumber = deliveryNumber.toString();
                stepColor = viewMode === 'google' ? 'bg-emerald-600 text-white' : (viewMode === 'greedy' ? 'bg-red-600 text-white' : 'bg-blue-600 text-white');
              }

              return (
                <div key={`${locationId}-${index}`} className="flex items-center gap-3 p-2 bg-white rounded-lg border border-gray-100 shadow-sm">
                  <div className={`min-w-[2rem] h-8 rounded-full flex items-center justify-center text-sm font-medium ${stepColor}`}>
                    {stepNumber}
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">
                      {location.address}
                    </span>
                    {location.isBase && (
                      <span className="ml-2 text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">
                        {isStart ? 'Punto de partida' : 'Retorno a base'}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 font-medium">
                    Paso {index + 1}
                  </div>
                </div>
              );
            })}
          </div>

          <div className={`mt-4 p-3 rounded-lg border ${viewMode === 'greedy' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-blue-50 border-blue-100 text-blue-800'}`}>
            <p className="text-sm">
              <strong>Motor de IA:</strong> La secuencia está definida por el algoritmo <strong>{routeName}</strong>. El trazado vial respeta el sentido de las calles utilizando Google Maps.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};