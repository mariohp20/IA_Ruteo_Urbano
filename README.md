# IA Ruteo Urbano — Análisis Experimental de Algoritmos de Búsqueda Informada

Comparativa experimental de **Búsqueda Voraz (Greedy)**, **A\*** (con tres heurísticas geométricas) y **optimización comercial (Google Routes API)** aplicados al Problema del Viajante (TSP) sobre datos de tráfico real en Lima Metropolitana, Perú.

Este repositorio es el soporte técnico del artículo científico *"Análisis Experimental de Algoritmos de Búsqueda Informada para el Problema de Ruteo Urbano: A\*, Búsqueda Voraz y Optimización Comercial con Datos de Tráfico Real en Lima Metropolitana"*, desarrollado como proyecto de fin de curso en Inteligencia Artificial.

<!-- IMG: Captura general de la interfaz principal con una ruta optimizada trazada sobre el mapa de Lima -->

---

## Tabla de contenidos

- [Descripción general](#descripción-general)
- [Motivación](#motivación)
- [Algoritmos implementados](#algoritmos-implementados)
- [Arquitectura del sistema](#arquitectura-del-sistema)
- [Stack tecnológico](#stack-tecnológico)
- [Estructura del repositorio](#estructura-del-repositorio)
- [Instalación y ejecución local](#instalación-y-ejecución-local)
- [Configuración de Google Cloud Platform](#configuración-de-google-cloud-platform)
- [Uso de la aplicación](#uso-de-la-aplicación)
- [Métricas experimentales](#métricas-experimentales)
- [Exportación de datos para análisis estadístico](#exportación-de-datos-para-análisis-estadístico)
- [Reproducibilidad del experimento](#reproducibilidad-del-experimento)
- [Limitaciones conocidas](#limitaciones-conocidas)
- [Trabajo futuro](#trabajo-futuro)
- [Autores](#autores)
- [Referencias](#referencias)
- [Licencia](#licencia)

---

## Descripción general

La aplicación permite definir un conjunto de nodos geográficos (una base de operaciones y N puntos de entrega) sobre Lima Metropolitana, obtener una matriz de tiempos de viaje reales mediante la Google Routes API (con tráfico en tiempo real), y ejecutar cuatro motores de búsqueda sobre dicha matriz:

| Método | Tipo | Garantía de optimalidad |
|---|---|---|
| Búsqueda Voraz (Greedy) | Heurística local | No |
| A\* — Haversine | Búsqueda informada | Sí (heurística admisible) |
| A\* — Euclidiana | Búsqueda informada | Sí (heurística admisible) |
| A\* — Manhattan | Búsqueda informada | Sí (heurística admisible) |
| Google Routes API | Optimización comercial ("caja negra") | No verificable |

Los resultados se presentan en una interfaz comparativa con métricas de calidad de solución (costo de ruta, Gap% respecto al óptimo) y de eficiencia computacional (nodos expandidos, tiempo de CPU, memoria pico), exportables en formato JSON estructurado para análisis posterior en R o Python.

<!-- IMG: Captura del panel de resultados mostrando la tabla comparativa de los 5 métodos -->

---

## Motivación

El ruteo urbano de última milla en ciudades latinoamericanas de alta densidad enfrenta condiciones de tráfico altamente variables que los algoritmos clásicos de optimización de grafos no siempre modelan de forma realista. Este proyecto evalúa, sobre datos de tráfico real y no sintéticos, el desempeño de dos algoritmos académicos clásicos frente a una solución comercial de referencia, con el objetivo de cuantificar el costo de optimalidad de cada enfoque en términos de tiempo de ruta, esfuerzo computacional y uso de memoria.

---

## Algoritmos implementados

### Búsqueda Voraz (Greedy)

En cada paso, selecciona el nodo no visitado de menor costo inmediato `g(n)`. Complejidad temporal `O(n²)`, complejidad espacial `O(n)`. No garantiza la solución óptima, pero su bajo costo computacional la hace apta para escenarios de baja latencia.

### A\* (Búsqueda Informada Óptima)

Expande estados según `f(n) = g(n) + h(n)`, donde `g(n)` es el costo real acumulado (segundos de tráfico real) y `h(n)` es una estimación heurística admisible del costo restante. La implementación incluye:

- **Representación de estados mediante bitmask**: el conjunto de nodos visitados se codifica como un entero de 32 bits, permitiendo operaciones de membresía en tiempo `O(1)`.
- **Poda por mejor costo conocido (`bestG`)**: se descarta cualquier expansión de un estado `(nodo, visitados)` cuyo costo acumulado supere el mejor ya registrado para ese mismo estado.
- **Poda por cota superior dinámica**: una vez encontrado un tour completo, se descartan todos los estados cuyo `f(n)` ya superen ese costo.
- **Heurística informada**: `h(n)` combina la arista mínima estimada hacia cualquier nodo no visitado más la arista mínima de cierre hacia la base, preservando la admisibilidad.

Complejidad temporal `O(n² · 2ⁿ)`, complejidad espacial `O(n · 2ⁿ)` en el peor caso.

### Heurísticas geométricas evaluadas

| Heurística | Fórmula base | Corrección aplicada |
|---|---|---|
| Haversine | Distancia del gran círculo sobre la esfera terrestre | — |
| Euclidiana | Norma L2 sobre proyección equirectangular | Corrección por latitud media |
| Manhattan | Suma de desplazamientos ortogonales | Corrección por latitud media |

Las tres heurísticas asumen una velocidad optimista de referencia de **50 km/h**, correspondiente al límite máximo legal para avenidas urbanas en el Perú según el Decreto Supremo 025-2021-MTC, garantizando formalmente la propiedad de admisibilidad (`h(n) ≤ costo_real(n)`) necesaria para que A\* retorne la solución óptima.

<!-- IMG: Captura del sub-selector de heurística dentro del panel de A* -->

---

## Arquitectura del sistema

```
Usuario define nodos (UI)
        │
        ▼
Google Routes API v2 ── matriz de tiempos reales NxN (única llamada de red por ejecución)
        │
        ▼
PathfindingEngine ── ejecuta Greedy + A*(Haversine) + A*(Euclidiana) + A*(Manhattan)
        │                    (operaciones en memoria, sin red adicional)
        ▼
Google Maps SDK ── trazado de polylines + benchmark nativo de Google (paralelo, una sola vez)
        │
        ▼
UI comparativa ── tabla de métricas + mapa + exportación JSON
```

El estado de las rutas (polylines) se cachea en el componente raíz, de forma que cambiar entre pestañas de algoritmo o entre heurísticas de A\* no genera llamadas de red adicionales. Toda ejecución de optimización dispara exactamente una llamada a la Routes API y una llamada paralela al SDK de Maps JS, independientemente de cuántos algoritmos o heurísticas se comparen.

<!-- IMG: Diagrama de arquitectura de componentes (puede generarse con la herramienta de diagramación del repositorio) -->

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite |
| Estilos | Tailwind CSS |
| Iconografía | Lucide React |
| Mapas y geocodificación | Google Maps JavaScript SDK, Places API (New) |
| Matriz de tiempos de tráfico | Google Routes API v2 (`computeRouteMatrix`) |
| Motor de búsqueda | Implementación propia en TypeScript puro, sin dependencias externas |

---

## Estructura del repositorio

```
src/
├── ai/
│   ├── heuristics.ts          Funciones heurísticas admisibles (Haversine, Euclidiana, Manhattan)
│   ├── matrixAdapter.ts       Adaptadores de formato entre la UI y el motor de búsqueda
│   └── tspAlgorithms.ts       Motor de búsqueda: PathfindingEngine (Greedy + A*)
├── components/
│   ├── DistanceMatrix.tsx     Visualización de la matriz NxN de costos reales
│   ├── LocationForm.tsx       Gestión de nodos y autocompletado de direcciones
│   ├── OptimizationResults.tsx Panel de métricas y tabla comparativa
│   └── RouteMap.tsx           Renderizado de rutas sobre Google Maps
├── services/
│   ├── googleMapsService.ts   Trazado de rutas y benchmark nativo de Google
│   ├── mapsLoader.ts          Inicialización del SDK de Maps
│   └── routesApiService.ts    Cliente de la Routes API v2 (matriz de tráfico)
├── types/
│   └── route.ts               Definiciones de tipos compartidas
└── App.tsx                    Orquestador principal
```

---

## Instalación y ejecución local

### Requisitos previos

- Node.js 18 o superior
- Una API Key de Google Cloud Platform con las siguientes APIs habilitadas: Maps JavaScript API, Places API (New), Routes API

### Pasos

```bash
git clone https://github.com/mariohp20/IA_Ruteo_Urbano.git
cd IA_Ruteo_Urbano
npm install
cp .env.example .env
```

Editar `.env` y completar:

```
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui
```

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:5173`.

---

## Configuración de Google Cloud Platform

Para evaluar este proyecto con una API Key propia, se recomienda aplicar las siguientes restricciones de seguridad antes de su uso:

1. **Restricciones de aplicación**: limitar la key a `HTTP referrers`, agregando `http://localhost:5173/*` y el dominio de despliegue en producción.
2. **Restricciones de API**: habilitar exclusivamente Maps JavaScript API, Places API (New) y Routes API.
3. **Cuotas**: establecer límites diarios conservadores acordes al volumen de pruebas esperado.
4. **Alertas de presupuesto**: configurar una alerta de facturación como medida de control adicional.

El consumo de la Routes API por ejecución completa equivale a `N²` elementos de matriz, donde `N` es el número de nodos del grafo. Para un experimento de 15 nodos, esto representa 225 elementos por ejecución — un costo marginal dentro de los créditos gratuitos mensuales que ofrece la plataforma.

---

## Uso de la aplicación

1. Buscar y agregar una dirección como **Base de Operaciones**.
2. Agregar entre 1 y 15 puntos de entrega adicionales mediante el buscador de direcciones.
3. Presionar **Buscar Mejor Ruta** — esta acción dispara la única llamada de red de costo por ejecución.
4. Navegar entre las pestañas **Greedy**, **A\*** y **Caja Negra (Google)** para comparar resultados.
5. Dentro de la pestaña A\*, alternar entre las heurísticas Haversine, Euclidiana y Manhattan sin generar tráfico de red adicional.
6. Descargar el experimento completo en formato JSON desde el botón de exportación al pie de la tabla comparativa.

<!-- IMG: Captura de la secuencia de entrega y matriz de costos reales -->

---

## Métricas experimentales

| Métrica | Descripción |
|---|---|
| Costo de ruta | Tiempo total de viaje en minutos, calculado sobre tráfico real |
| Gap% | Diferencia porcentual respecto a la solución óptima de referencia (A\* Haversine) |
| Nodos expandidos | Número de estados procesados por el árbol de búsqueda |
| Tiempo de CPU | Tiempo de ejecución del algoritmo, medido con `performance.now()` |
| Memoria pico | Número máximo de estados simultáneos mantenidos en memoria |
| Admisibilidad | Verificación formal de que `h(n) ≤ costo_real(n)` para todo par de nodos |

---

## Exportación de datos para análisis estadístico

El botón **Exportar Experimento (JSON)** genera un archivo único con la siguiente estructura:

```json
{
  "metadata": { "exportDate", "nodeCount", "nodes", "trafficProfile", "routesApiVersion" },
  "timeMatrixSeconds": [[ ... matriz NxN ... ]],
  "results": {
    "greedy":         { "metadata", "metrics", "expansionLog" },
    "astarHaversine": { "metadata", "metrics", "expansionLog" },
    "astarEuclidean": { "metadata", "metrics", "expansionLog" },
    "astarManhattan":  { "metadata", "metrics", "expansionLog" }
  },
  "googleBenchmark": { "totalTimeMinutes", "totalDistanceKm" },
  "comparativeTable": [ ... fila por método ... ]
}
```

El campo `expansionLog` de cada algoritmo contiene la traza paso a paso (`step`, `nodeExpanded`, `gCost`, `hCost`, `fCost`), apta para generar curvas de convergencia en R o Python:

```python
import json
import pandas as pd

with open('experimento-ruteo-lima_n15_....json') as f:
    data = json.load(f)

df = pd.DataFrame(data['results']['astarHaversine']['expansionLog'])
df.plot(x='step', y='fCost')
```

---

## Reproducibilidad del experimento

Dado que la Routes API incorpora condiciones de tráfico en tiempo real, los costos absolutos de una ejecución varían según la hora y fecha de captura. El archivo JSON exportado incluye la matriz de tiempos exacta utilizada en cada experimento, junto con su marca temporal, permitiendo que cualquier análisis posterior referencie las condiciones precisas bajo las cuales se obtuvieron los resultados reportados en el artículo asociado a este repositorio.

---

## Limitaciones conocidas

- La complejidad espacial de A\* (`O(n · 2ⁿ)`) limita la escalabilidad práctica del enfoque exacto a aproximadamente 15-18 nodos en un entorno de navegador.
- El benchmark de Google Routes API se ejecuta sobre una matriz estática capturada en un instante determinado, mientras que el motor comercial de Google puede incorporar señales de tráfico adicionales no reflejadas en dicha matriz.
- Las heurísticas geométricas no incorporan restricciones de sentido único ni topología real de la red vial, limitándose a estimaciones de distancia en línea recta o cuadrícula.

---

## Trabajo futuro

- Evaluación de metaheurísticas (Simulated Annealing, Optimización por Colonia de Hormigas) para instancias de mayor tamaño.
- Incorporación de ventanas de tiempo de entrega (TSP with Time Windows).
- Validación del experimento bajo múltiples condiciones horarias de tráfico.

---

## Autores

Proyecto desarrollado para el curso de Inteligencia Artificial.

| Integrante | Rol |
|---|---|
| Chavez Chacon, Alex | Integrante del grupo |
| Huarcaya Pariona, Mario | Integrante del grupo |
| Llamocca Milla, Piero | Integrante del grupo |
| Quispe Arango, Paolo | Integrante del grupo |

**Colaboración adicional:** Pachas, Pieers — contribuyó al desarrollo de la primera versión de la aplicación web sobre la cual se construyó este proyecto.

---

## Referencias

Las referencias completas en formato IEEE se encuentran en el artículo científico asociado a este repositorio.

---

## Licencia

Este proyecto se distribuye bajo la licencia [MIT](LICENSE). Se permite su uso, copia, modificación y distribución, incluso con fines comerciales, manteniendo el aviso de copyright original.

Copyright (c) 2026 — ver titulares en el archivo [LICENSE](LICENSE) y sección [Autores](#autores).