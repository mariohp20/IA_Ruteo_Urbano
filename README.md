# TSP Moto Lima — Greedy vs A* vs Google Routes API

Aplicación web de comparativa académica de algoritmos de Búsqueda Informada aplicados al Problema del Viajante (TSP) en Lima Metropolitana, con perfil de motocicleta y tráfico en tiempo real.

> **Versión 2.0.0** — Refactorización a estándares modernos.

## Características

- **Motor de IA propio:** Implementación pura en TypeScript de Greedy (Voraz) y A* Óptimo.
- **Routes API v2 (REST):** Petición `fetch` directa a `routes.googleapis.com` con `travelMode: TWO_WHEELER` y `TRAFFIC_AWARE` — sin SDK antiguo de DistanceMatrix.
- **Benchmark comercial:** Comparativa contra la "Caja Negra" de Google (`optimizeWaypoints: true`).
- **Heurística admisible:** Haversine a 50 km/h máx. garantiza optimalidad matemática de A*.
- **TypeScript estricto:** Tipos definidos para la respuesta de la Routes API, sin `any` implícitos.

## Instalación

```sh
git clone https://github.com/mariohp20/IA_Ruteo_Urbano.git
cd IA_Ruteo_Urbano
npm install
```

### Configurar API Key

Copia el archivo de ejemplo y añade tu clave:

```sh
cp .env.example .env
```

Edita `.env`:

```
VITE_GOOGLE_MAPS_API_KEY=tu_clave_api
```

**APIs que deben estar habilitadas en Google Cloud Console:**
- Maps JavaScript API (Para el mapa base)
- Places API (New) (Para el autocompletado de direcciones)
- Geocoding API (Para la validación estricta de Lima)
- Routes API (Para la matriz de tiempos de motos)
- Directions API (Para el trazado visual de la ruta final)

```sh
npm run dev
# Abre http://localhost:5173
```

## Estructura del proyecto

```
src/
  ai/
    heuristics.ts         # h(n): Haversine → tiempo optimista(admisible)
    matrixAdapter.ts      # extractCoordinates(), secondsToMinutesMatrix()
    tspAlgorithms.ts      # PathfindingEngine: runGreedy(), runAStar()
  components/
    DistanceMatrix.tsx    # Tabla NxN a partir de number[][] (segundos)
    LocationForm.tsx      # Gestión de nodos del grafo
    OptimizationResults.tsx  # Dashboard métrico comparativo
    RouteMap.tsx          # Mapa interactivo con @googlemaps/js-api-loader
  services/
    googleMapsService.ts  # SDK visual: trazado de rutas y Caja Negra
    routesApiService.ts   # Routes API REST: fetchMotorcycleMatrix()
  types/
    route.ts              # Interfaces core: Location, OptimizedRoute
  App.tsx                 # Orquestador: estado + flujo de optimización
  main.tsx                # Punto de entrada React
  vite-env.d.ts           # Tipado de import.meta.env
```

## Flujo de Datos

```
Click "Ejecutar Motor de IA"
  → fetchMotorcycleMatrix()      [Routes API REST, TWO_WHEELER, TRAFFIC_AWARE]
  → PathfindingEngine.runGreedy()
  → PathfindingEngine.runAStar()
  → Promise.all([
      getRouteFromOrderedLocations(greedyOrder),  [DirectionsService, draw]
      getRouteFromOrderedLocations(astarOrder),   [DirectionsService, draw]
      getNativeGoogleRoute()                       [Caja Negra, benchmark]
    ])
  → setState → React re-render
```

## Tecnologías

- [React 18](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- [Vite 5](https://vitejs.dev/)
- [Tailwind CSS 3](https://tailwindcss.com/)
- [Google Maps JavaScript API](https://developers.google.com/maps/documentation/javascript)
- [Google Routes API v2](https://developers.google.com/maps/documentation/routes)
- [Lucide React](https://lucide.dev/)

## Licencia

MIT

---

### Autoría

**Refactorización v2.0.0:** Mario

**Créditos — Proyecto Original:**
- Pieers
- Alex
