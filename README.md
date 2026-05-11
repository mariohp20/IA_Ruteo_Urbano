# IA Logística Lima: Búsqueda Informada (Greedy vs A*)

Aplicación web desarrollada para evaluar la eficiencia de algoritmos de Búsqueda Informada aplicados al ruteo logístico en Lima Metropolitana. Este proyecto compara implementaciones propias de los algoritmos Greedy (Voraz) y A-Estrella (A*) frente a la optimización nativa (Caja Negra) de Google Maps Directions API.

## Características

* **Motor de Inteligencia Artificial:** Implementación pura en TypeScript de algoritmos de búsqueda informada para resolver el Problema del Viajante (TSP).
* **Comparativa de Rendimiento:** Evaluación en tiempo real entre la heurística miope (Greedy), la búsqueda óptima (A*) y el estándar comercial (Google API).
* **Métricas de IA:** Análisis cuantitativo de Nodos Expandidos, complejidad temporal, costo real $g(n)$ y función de evaluación $f(n) = g(n) + h(n).
* [cite_start]**Análisis de Grafos:** Generación automática de la Matriz de Costos Reales utilizando la *Distance Matrix API* considerando el tráfico actual de Lima.
* [cite_start]**Heurística Admisible:** Cálculo de la distancia Haversine como estimación optimista $h(n)$ para garantizar la optimalidad de A*.
* **Visualización Interactiva:** Interfaz moderna con React y TailwindCSS que grafica las decisiones del algoritmo sobre el mapa vial.

## Instalación

1. **Clona el repositorio:**
   ```sh
   git clone https://github.com/alEx777170/miniproyecto_IA_01.git
   cd miniproyecto_IA_01
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
  ai/
    heuristics.ts       # Funciones h(n) (Haversine/Línea recta)
    matrixAdapter.ts    # Transformación de datos a matrices g(n)
    tspAlgorithms.ts    # Motor de IA: Clases de búsqueda Greedy y A*
  components/
    DistanceMatrix.tsx  # Visualización de la matriz de costos reales
    LocationForm.tsx    # Gestión de nodos del grafo (Base y Entregas)
    OptimizationResults.tsx # Dashboard métrico y comparativo
    RouteMap.tsx        # Renderizado geográfico con Google Maps
  services/
    googleMapsService.ts # Consumo de APIs (Directions / Distance Matrix)
  types/
    route.ts            # Interfaces y tipos de datos de la aplicación
  App.tsx               # Orquestador principal de estados y lógica
  main.tsx              # Punto de entrada de React
  vite-env.d.ts         # Definiciones de entorno para Vite
```

## Tecnologías

- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Google Maps APIs](https://developers.google.com/maps/documentation)
- [Lucide React Icons](https://lucide.dev/)

## Notas

- El sistema modela Lima Metropolitana como un Grafo Completo.
- La matriz de pesos es dinámica y asimétrica según el tráfico en tiempo real.
- El proyecto valida la admisibilidad de la heurística para garantizar resultados óptimos en A*.

## Licencia

MIT

---

Desarrollado por Alex
