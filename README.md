# OptimizaRutas Lima

Aplicación web para optimizar rutas de reparto en Lima Metropolitana usando Google Maps Directions API y el modelo del Agente Viajero (TSP).

## Características

- Optimización automática de rutas de entrega con Google Maps.
- Visualización de rutas y paradas en un mapa interactivo.
- Matriz de distancias y tiempos entre ubicaciones.
- Resultados detallados de eficiencia y recomendaciones.
- Interfaz moderna con React y TailwindCSS.

## Instalación

1. **Clona el repositorio:**
   ```sh
   git clone https://github.com/tu-usuario/route-optimizer.git
   cd route-optimizer
   ```

2. **Instala las dependencias:**
   ```sh
   npm install
   ```

3. **Configura tu API Key de Google Maps:**
   - Ve a [Google Cloud Console](https://console.cloud.google.com/).
   - Habilita las APIs: Maps JavaScript API, Directions API, Distance Matrix API, Geocoding API.
   - Crea una API Key.
   - Crea un archivo `.env` en la raíz del proyecto y agrega:
     ```
     VITE_GOOGLE_MAPS_API_KEY=tu_clave_api_aqui
     ```
   - La app tomará automáticamente la clave desde el archivo `.env`.

4. **Inicia la app en modo desarrollo:**
   ```sh
   npm run dev
   ```

5. **Abre en tu navegador:**
   ```
   http://localhost:5173
   ```

## Scripts disponibles

- `npm run dev` — Inicia el servidor de desarrollo.
- `npm run build` — Compila la app para producción.
- `npm run preview` — Previsualiza la app de producción.
- `npm run lint` — Ejecuta el linter.

## Estructura del proyecto

```
src/
  App.tsx
  main.tsx
  index.css
  components/
    LocationForm.tsx
    DistanceMatrix.tsx
    OptimizationResults.tsx
    RouteMap.tsx
  services/
    googleMapsService.ts
  types/
    route.ts
  utils/
    tspSolver.ts
```

## Tecnologías

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Google Maps APIs](https://developers.google.com/maps/documentation)
- [Lucide React Icons](https://lucide.dev/)

## Notas

- La app está optimizada para rutas en Lima, Perú.
- Para producción, restringe tu API Key solo a los dominios necesarios.
- Si no configuras la API Key, la app usará simulaciones de distancias y tiempos.

## Licencia

MIT

---

Desarrollado por Pieers
