import { DistanceMatrix, DistanceMatrixElement, type Location } from '../types/route';

// 🔑 INSTRUCCIONES PARA CONFIGURAR TU API KEY DE GOOGLE MAPS:
// 1. Ve a https://console.cloud.google.com/
// 2. Crea un nuevo proyecto o selecciona uno existente
// 3. Habilita las siguientes APIs:
//    - Maps JavaScript API
//    - Directions API
//    - Distance Matrix API
//    - Geocoding API
// 4. Ve a "Credenciales" y crea una nueva API Key
// 5. Configura las restricciones de la API Key:
//    - Tipo: Restricciones HTTP (sitios web)
//    - Referentes del sitio web: *.webcontainer-api.io/* (para desarrollo)
// 6. Reemplaza 'YOUR_GOOGLE_MAPS_API_KEY_HERE' con tu API key real
const VITE_GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

export class GoogleMapsService {
  private static geocoder: google.maps.Geocoder | null = null;
  private static directionsService: google.maps.DirectionsService | null = null;
  private static distanceMatrixService: google.maps.DistanceMatrixService | null = null;

  // Inicializar servicios de Google Maps
  private static async initializeServices(): Promise<void> {
    if (typeof google === 'undefined' || !google.maps) {
      throw new Error('Google Maps JavaScript API not loaded');
    }

    if (!this.geocoder) {
      this.geocoder = new google.maps.Geocoder();
    }
    if (!this.directionsService) {
      this.directionsService = new google.maps.DirectionsService();
    }
    if (!this.distanceMatrixService) {
      this.distanceMatrixService = new google.maps.DistanceMatrixService();
    }
  }

  static async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    if (!this.isApiKeyConfigured()) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      await this.initializeServices();

      return new Promise((resolve, _reject) => {
        this.geocoder!.geocode(
          { address: address + ', Lima, Perú' },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              const location = results[0].geometry.location;
              resolve({ lat: location.lat(), lng: location.lng() });
            } else if (status === 'REQUEST_DENIED') {
              console.error('Geocoding API access denied. Check your API key permissions.');
              resolve(null);
            } else {
              console.warn('Geocoding failed:', status);
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Geocoding error:', error);
      return null;
    }
  }

  static async getRouteFromOrderedLocations(orderedLocations: Location[]): Promise<{
    orderedIds: string[];
    totalDistance: number;
    totalTime: number;
    waypoints: any[];
  } | null> {
    if (orderedLocations.length < 2) return null;

    if (!this.isApiKeyConfigured()) {
      return await this.getFallbackOptimizedRoute(orderedLocations);
    }

    try {
      await this.initializeServices();

      // El primer elemento es el origen, el último es el destino. 
      // Los del medio son los waypoints.
      const originLoc = orderedLocations[0];
      const destLoc = orderedLocations[orderedLocations.length - 1];
      const intermediateLocs = orderedLocations.slice(1, -1);

      const waypoints = intermediateLocs.map(location => ({
        location: location.address + ', Lima, Perú',
        stopover: true
      }));

      const origin = originLoc.address + ', Lima, Perú';
      const destination = destLoc.address + ', Lima, Perú';

      return new Promise((resolve, _reject) => {
        this.directionsService!.route({
          origin: origin,
          destination: destination,
          waypoints: waypoints,
          optimizeWaypoints: false, // ¡ESTO ES CRÍTICAL! Le decimos a Google que no toque nuestro orden
          travelMode: google.maps.TravelMode.DRIVING,
          avoidHighways: false,
          avoidTolls: true,
          unitSystem: google.maps.UnitSystem.METRIC
        }, (result, status) => {
          if (status === 'OK' && result) {
            const route = result.routes[0];
            if (!route) {
              resolve(null);
              return;
            }

            let totalDistance = 0;
            let totalTime = 0;

            route.legs.forEach(leg => {
              totalDistance += leg.distance?.value || 0;
              totalTime += leg.duration?.value || 0;
            });

            resolve({
              orderedIds: orderedLocations.map(loc => loc.id),
              totalDistance: totalDistance / 1000,
              totalTime: totalTime / 60,
              waypoints: route.legs
            });

          } else {
            console.error('Directions API error:', status);
            resolve(null);
          }
        });
      });

    } catch (error) {
      console.error('Error getting route:', error);
      return null;
    }
  }

  private static async getFallbackOptimizedRoute(locations: Location[]): Promise<{
    orderedIds: string[];
    totalDistance: number;
    totalTime: number;
    waypoints: any[];
  } | null> {
    if (locations.length < 2) return null;

    // Fallback: usar el orden proporcionado sin optimización
    const orderedIds = locations.map(location => location.id);

    const totalDistance = (locations.length - 1) * 8 + Math.random() * 10; // Estimación
    const totalTime = (locations.length - 1) * 15 + Math.random() * 20; // Estimación

    return {
      orderedIds,
      totalDistance,
      totalTime,
      waypoints: []
    };
  }

  static async getDistanceMatrix(locations: Location[]): Promise<DistanceMatrix> {
    if (locations.length === 0) return {};

    console.log('🚀 Iniciando cálculo de matriz de distancias...');

    if (!this.isApiKeyConfigured()) {
      console.warn('⚠️ Google Maps API key not configured, using simulation');
      return this.simulateDistanceMatrix(locations);
    }

    try {
      return await this.getRealDistanceMatrix(locations);
    } catch (error) {
      console.warn('⚠️ Error with Google Maps API, using simulation:', error);
      // Fallback a simulación si la API falla
      return this.simulateDistanceMatrix(locations);
    }
  }

  private static async getRealDistanceMatrix(locations: Location[]): Promise<DistanceMatrix> {
    const matrix: DistanceMatrix = {};

    console.log(`📍 Procesando ${locations.length} ubicaciones...`);

    try {
      await this.initializeServices();

      // Preparar direcciones para la API
      const addresses = locations.map(loc => {
        let formattedAddress = loc.address;
        if (!formattedAddress.toLowerCase().includes('lima')) {
          formattedAddress += ', Lima, Perú';
        }
        return formattedAddress;
      });

      console.log(`🔄 Calculando matriz de distancias con Google Maps JavaScript API...`);

      // Usar Google Distance Matrix Service (JavaScript API)
      return new Promise((resolve, reject) => {
        this.distanceMatrixService!.getDistanceMatrix({
          origins: addresses,
          destinations: addresses,
          travelMode: google.maps.TravelMode.DRIVING,
          unitSystem: google.maps.UnitSystem.METRIC,
          avoidHighways: false,
          avoidTolls: true
        }, (response, status) => {
          if (status === 'OK' && response) {
            console.log(`📊 Respuesta de Google Maps:`, {
              status: status,
              rows: response.rows?.length
            });

            // Procesar resultados
            locations.forEach((originLocation, originIndex) => {
              if (!matrix[originLocation.id]) {
                matrix[originLocation.id] = {};
              }

              locations.forEach((destLocation, destIndex) => {
                const row = response.rows[originIndex];
                const element = row?.elements[destIndex];

                if (element && element.status === 'OK') {
                  // Verificar que tenemos datos válidos
                  if (element.distance && element.duration) {
                    matrix[originLocation.id][destLocation.id] = {
                      distance: {
                        text: element.distance.text,
                        value: element.distance.value
                      },
                      duration: {
                        text: element.duration.text,
                        value: element.duration.value
                      },
                      status: 'OK'
                    };

                    console.log(`✅ ${originLocation.address} → ${destLocation.address}: ${element.distance.text}, ${element.duration.text}`);
                  } else {
                    console.warn(`⚠️ Datos incompletos para ${originLocation.address} → ${destLocation.address}`);
                    matrix[originLocation.id][destLocation.id] = this.simulateDistanceBetween(originLocation, destLocation);
                  }
                } else {
                  console.warn(`⚠️ Error en elemento: ${element?.status || 'UNKNOWN'} para ${originLocation.address} → ${destLocation.address}`);
                  // Si hay error, usar distancia simulada
                  matrix[originLocation.id][destLocation.id] = this.simulateDistanceBetween(originLocation, destLocation);
                }
              });
            });

            console.log('✅ Matriz de distancias completada');
            resolve(matrix);

          } else {
            console.error('❌ Error en Distance Matrix API:', status);
            if (status === 'REQUEST_DENIED') {
              console.error('❌ Solicitud denegada - verifica tu API key y permisos');
              reject(new Error('API key inválida o sin permisos para Distance Matrix API'));
            } else if (status === 'OVER_QUERY_LIMIT') {
              console.error('❌ Límite de consultas excedido en Google Maps API');
              reject(new Error('Límite de consultas excedido. Intenta más tarde.'));
            } else {
              reject(new Error(`API error: ${status}`));
            }
          }
        });
      });

    } catch (error) {
      console.error(`❌ Error general:`, error);
      throw error;
    }
  }

  private static simulateDistanceMatrix(locations: Location[]): DistanceMatrix {
    console.log('🎭 Usando simulación de matriz de distancias...');
    const matrix: DistanceMatrix = {};

    locations.forEach((from, _i) => {
      matrix[from.id] = {};
      locations.forEach((to, _j) => {
        matrix[from.id][to.id] = this.simulateDistanceBetween(from, to);
      });
    });

    return matrix;
  }

  private static simulateDistanceBetween(from: Location, to: Location): DistanceMatrixElement {
    if (from.id === to.id) {
      return {
        distance: { text: '0 m', value: 0 },
        duration: { text: '0 mins', value: 0 },
        status: 'OK'
      };
    }

    // Simular distancias más realistas para Lima
    const baseDistance = Math.random() * 20000 + 2000; // 2-22 km (más realista para Lima)
    const trafficFactor = 1.2 + Math.random() * 0.8; // Factor de tráfico 1.2-2.0x (Lima tiene mucho tráfico)

    // Velocidad promedio en Lima: 15-25 km/h dependiendo del tráfico
    const avgSpeed = 15 + Math.random() * 10; // 15-25 km/h
    const baseTime = (baseDistance / 1000) * (3600 / avgSpeed) * trafficFactor; // segundos

    return {
      distance: {
        text: `${(baseDistance / 1000).toFixed(1)} km`,
        value: Math.round(baseDistance)
      },
      duration: {
        text: `${Math.round(baseTime / 60)} mins`,
        value: Math.round(baseTime)
      },
      status: 'OK'
    };
  }

  static async getDirections(waypoints: Location[]): Promise<google.maps.DirectionsResult | null> {
    if (waypoints.length < 2) return null;

    if (!this.isApiKeyConfigured()) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      await this.initializeServices();

      const origin = waypoints[0].address + ', Lima, Perú';
      const destination = waypoints[waypoints.length - 1].address + ', Lima, Perú';
      const waypointsList = waypoints.slice(1, -1).map(location => ({
        location: location.address + ', Lima, Perú',
        stopover: true
      }));

      return new Promise((resolve, reject) => {
        this.directionsService!.route({
          origin: origin,
          destination: destination,
          waypoints: waypointsList,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          avoidHighways: false,
          avoidTolls: true
        }, (result, status) => {
          if (status === 'OK' && result) {
            resolve(result);
          } else {
            if (status === 'REQUEST_DENIED') {
              console.error('Directions API access denied. Check your API key permissions.');
            }
            reject(new Error(`Directions error: ${status}`));
          }
        });
      });
    } catch (error) {
      console.error('Error getting directions:', error);
      return null;
    }
  }

  // Método para validar si la API key está configurada
  static isApiKeyConfigured(): boolean {
    return VITE_GOOGLE_MAPS_API_KEY && VITE_GOOGLE_MAPS_API_KEY !== 'YOUR_GOOGLE_MAPS_API_KEY_HERE';
  }

  // Método para obtener información de geocodificación mejorada
  static async getDetailedGeocode(address: string): Promise<any> {
    if (!this.isApiKeyConfigured()) {
      console.warn('Google Maps API key not configured');
      return null;
    }

    try {
      await this.initializeServices();

      return new Promise((resolve, _reject) => {
        this.geocoder!.geocode(
          { address: address + ', Lima, Perú' },
          (results, status) => {
            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0]);
            } else if (status === 'REQUEST_DENIED') {
              console.error('Geocoding API access denied. Check your API key permissions.');
              resolve(null);
            } else {
              resolve(null);
            }
          }
        );
      });
    } catch (error) {
      console.error('Detailed geocoding error:', error);
      return null;
    }
  }

  // Método para verificar el estado de la API
  static async checkApiStatus(): Promise<{ isValid: boolean; error?: string }> {
    if (!this.isApiKeyConfigured()) {
      return { isValid: false, error: 'API key no configurada' };
    }

    try {
      await this.initializeServices();

      return new Promise((resolve) => {
        this.geocoder!.geocode(
          { address: 'Lima, Peru' },
          (_results, status) => {
            if (status === 'OK') {
              resolve({ isValid: true });
            } else if (status === 'REQUEST_DENIED') {
              resolve({ isValid: false, error: 'API key inválida o sin permisos' });
            } else if (status === 'OVER_QUERY_LIMIT') {
              resolve({ isValid: false, error: 'Límite de consultas excedido' });
            } else {
              resolve({ isValid: false, error: `Error de API: ${status}` });
            }
          }
        );
      });
    } catch (error) {
      return { isValid: false, error: 'Error de conexión con Google Maps' };
    }
  }

  static async getNativeGoogleRoute(locations: Location[]): Promise<{
    order: string[];
    totalDistance: number;
    totalTime: number;
  } | null> {
    if (locations.length < 2 || !this.isApiKeyConfigured()) return null;

    try {
      await this.initializeServices();
      const originLoc = locations.find(l => l.isBase);
      const deliveryLocs = locations.filter(l => !l.isBase);
      if (!originLoc) return null;

      const origin = originLoc.address + ', Lima, Perú';
      const waypoints = deliveryLocs.map(loc => ({
        location: loc.address + ', Lima, Perú',
        stopover: true
      }));

      return new Promise((resolve) => {
        this.directionsService!.route({
          origin: origin,
          destination: origin, // Retorna a la base
          waypoints: waypoints,
          optimizeWaypoints: true, // LA CAJA NEGRA DE GOOGLE
          travelMode: google.maps.TravelMode.DRIVING,
        }, (result, status) => {
          if (status === 'OK' && result) {
            const route = result.routes[0];
            let totalDist = 0;
            let totalTime = 0;
            
            route.legs.forEach(leg => {
              totalDist += leg.distance?.value || 0;
              totalTime += leg.duration?.value || 0;
            });

            // Extraer el orden que Google decidió
            const waypointOrder = route.waypoint_order || [];
            const optimizedIds = [
              originLoc.id,
              ...waypointOrder.map(index => deliveryLocs[index].id),
              originLoc.id
            ];

            resolve({
              order: optimizedIds,
              totalDistance: totalDist / 1000,
              totalTime: totalTime / 60
            });
          } else {
            resolve(null);
          }
        });
      });
    } catch (error) {
      console.error('Error en Caja Negra de Google:', error);
      return null;
    }
  }
}
