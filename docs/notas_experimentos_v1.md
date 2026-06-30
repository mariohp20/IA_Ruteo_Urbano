# Proyecto de Medio Semestre - IA

## Curso: Inteligencia Artificial
## Docente: Yudi Guzman Monteza

# Título del proyecto
Optimización y Evaluación de Búsqueda Informada: Análisis Comparativo de Algoritmos Greedy y A* frente a la API v2 de Google Routes en Entornos Urbanos de Lima Metropolitana

---
# Grupo 4

# Integrantes del grupo

| Apellidos | Nombres |
|---|---|
| Chavez Chacon | Alex Junior |
| Huarcaya Pariona | Mario Anderson |
| Llamocca Milla | Piero Josue |
| Quispe Arango | Paolo Cesar |

---
# 1. Introducción

El ruteo logístico de última milla representa uno de los desafíos operativos y computacionales más complejos en la investigación de operaciones, especialmente en escenarios urbanos densos y altamente congestionados como Lima Metropolitana. Este proyecto aborda el Problema del Viajante (TSP) modelando la red vial urbana como un grafo asimétrico ponderado por tiempo real. La solución aplica Inteligencia Artificial mediante técnicas de búsqueda no informada (Greedy) e informada (A*), contrastando sus resultados empíricos con los estándares comerciales de la industria (Google Platform). 

---

# 2. Problema identificado

El problema central es la **ineficiencia algorítmica y operativa en la planificación de rutas multi-nodo** del entorno urbano de Lima Metropolitana. Esto se desglosa en:

- **Dinámica caótica del tráfico:** La fluctuación extrema del tráfico vehicular altera constantemente los pesos temporales de las vías, lo que invalida el uso de distancias geométricas o matrices estáticas para la toma de decisiones logísticas.
- **Uso de Heurísticas Miopes:** La planificación empírica o el uso de algoritmos voraces simples (Greedy) genera decisiones que priorizan cercanías inmediatas, lo que resulta en el fenómeno de "rutas cruzadas" y un incremento drástico en el costo temporal final al cerrar el tour.
- **Opacidad de soluciones comerciales:** Los motores de ruteo del mercado operan como "cajas negras", lo que impide el análisis paramétrico del esfuerzo computacional requerido para hallar una ruta matemáticamente óptima.

---

# 3. Objetivo del proyecto

**Objetivo principal:**
Diseñar e implementar un sistema web que resuelva el Problema del Viajante (TSP) en Lima Metropolitana, evaluando y comparando cuantitativamente el desempeño de los algoritmos Greedy y A* frente al motor de optimización comercial nativo de Google Routes API.

**Objetivos específicos:**
- Desarrollar un motor de búsqueda en TypeScript estricto sobre grafos asimétricos dinámicos basados en tráfico real.
- Formular una heurística admisible h(n) basada en la distancia de Haversine y los límites de velocidad legales del Perú.
- Analizar el "trade-off" (compromiso) entre el costo computacional (nodos expandidos) y la calidad de la ruta (minutos totales).

---

# 4. Descripción de la solución propuesta

Se propone una Single Page Application (SPA) construida en React bajo el principio de separación de responsabilidades (Separation of Concerns). El sistema interactúa de la siguiente manera:

- **Entradas del sistema:** A través de una interfaz interactiva integrada con el componente PlaceAutocompleteElement, el usuario registra de forma controlada la localización de una Base de Operaciones (origen/destino final del tour) y un conjunto de destinos de entrega ($N$). Las direcciones ingresadas son validadas en coordenadas geográficas precisas (latitud y longitud) mediante geocodificación acotada al perímetro metropolitano.

- **Procesamiento:** El sistema despacha las coordenadas estructuradas hacia el endpoint REST backend de Google Routes v2 para generar una matriz de adyacencia dinámica de $N X N$ elementos, ponderada por duraciones de tránsito reales (TRAFFIC_AWARE). Una vez instanciada la matriz, el componente PathfindingEngine realiza de forma aislada y paralela la ejecución de las búsquedas probabilísticas y exactas.

- **Comportamiento del modelo:** El agente Greedy actúa con una política de selección local, eligiendo secuencialmente el nodo no visitado cuyo arco posea el peso mínimo en la matriz de adyacencia. El agente *A\** realiza una búsqueda en un árbol de estados combinatorios, expandiendo rutas parciales y ordenándolas mediante una cola de prioridad regida por la función de evaluación $f(n) = g(n) + h(n)$.

- **Salida esperada:** Un tablero de control métrico que contrasta las rutas resultantes (secuencia ordenada de visitas), los tiempos consolidados de viaje, los kilómetros totales y la cantidad de estados evaluados por la IA, junto con la representación cartográfica de los trazados geométricos sobre las calles de Lima.
---

# 5. Técnicas o algoritmos utilizados

- **Búsqueda Voraz (Greedy Search):** Algoritmo de optimización local que expande un único camino agregando en cada paso el nodo $j$ que minimiza de forma inmediata el costo de tránsito desde el nodo actual $i$. Su función de evaluación se simplifica a $f(n) = g'(n)$, donde $g'(n)$ representa únicamente el peso del arco inmediato. Posee una complejidad temporal lineal $O(N)$ en términos de expansión de nodos, pero no garantiza optimalidad.
- **Búsqueda Informada Óptima (A*):** Algoritmo de exploración de grafos que garantiza la obtención de la ruta óptima global, siempre que sea alimentado por una heurística admisible. Utiliza la función fundamental: $$f(n) = g(n) + h(n)$$ , Donde $g(n)$ es el tiempo real acumulado en segundos desde la base hasta el nodo actual, y $h(n)$ es el costo estimado hacia el objetivo. Para resolver el TSP en forma de tour cerrado, cada estado del algoritmo mantiene un registro de los nodos visitados de forma binaria o indexada, y el estado final se alcanza cuando la longitud del camino es igual al total de nodos y se añade el costo de retorno al nodo de origen.

- **Reglas Heurísticas (Diseño Propio):** Para estimar el tiempo remanente desde cualquier nodo hacia la base sin sobreestimar el valor real (requisito de admisibilidad), se diseñó la siguiente función matemática:


$$h(n) = \frac{\text{Distancia de Haversine}(Node, Base)}{\text{Velocidad Máxima Optimista}}$$


La distancia de Haversine calcula la separación geodésica en línea recta sobre la superficie de una esfera a partir de las coordenadas de latitud ($\phi$) y longitud ($\lambda$):


$$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$

Donde $R = 6371\text{ km}$. Para transformar esta distancia en un tiempo admisible (el menor tiempo físicamente posible), se asume una velocidad constante de $50\text{ km/h}$. Este valor se seleccionó rigurosamente bajo el marco legal del Ministerio de Transportes y Comunicaciones (MTC) del Perú, que establece el límite de velocidad máximo en avenidas urbanas para automóviles, asegurando que el cálculo sea siempre optimista frente a las demoras del tráfico vial real.


---

# 6. Dataset o datos utilizados

El sistema opera sobre un **Dataset Dinámico en Tiempo Real**, prescindiendo de archivos estáticos obsoletos.

- **Fuente de datos:** Google Cloud Console Platform - API v2 de Routes (Endpoint REST: `computeRouteMatrix`).
- **Estructura e Integración:** A través de una petición HTTP POST segura, el sistema envía un objeto JSON conteniendo un arreglo de estructuras `waypoint` con las coordenadas geográficas verificadas de los nodos. La API procesa la solicitud y retorna una colección plana de objetos con interfaces estrictas del tipo `RouteMatrixElement`.
- **Variables principales del Dataset Dinámico:**
    - originIndex (entero): Índice del nodo de salida en el grafo.

    - destinationIndex (entero): Índice del nodo de llegada en el grafo.

    - duration (string): Tiempo de tránsito calculado con tráfico real en formato de cadena (ej. "1250s"), el cual es parseado por la aplicación a valores numéricos puros en segundos.

    - distanceMeters (entero): Distancia física de la trayectoria por calles en metros.


- **Volumen de Datos:** Para una cantidad de $N$ localizaciones definidas por el usuario, el dataset autogenerado posee un volumen exacto de $N^2$ registros, estructurando una matriz de adyacencia completa y asimétrica (donde el costo de ir de $i \rightarrow j$ no es necesariamente igual al de $j \rightarrow i$ debido a los sentidos de las calles y el tráfico).

---

# 7. Diseño general del proyecto

1. **Ingreso y Geocodificación:** Captura y control de estados de las direcciones en la UI, garantizando mediante un cerco de coordenadas geográficas (bounds) la localización exclusiva en Lima Metropolitana, validadas en coordenadas GPS.
2. **Extracción y Adaptación:** Petición POST a Google Routes API. recepción del JSON plano y procesamiento mediante la función `parseRoutesApiToMatrix` para inyectar una matriz indexada bidimensional limpia.
3. **Aplicación Algorítmica Paralela:** Ejecución en memoria del motor IA (`runGreedy` y `runAStar`), abstrayendo la lógica algorítmica de los elementos del DOM de React.
4. **Trazado Geométrico:** Llamada asíncrona concurrente (`Promise.all`) al SDK de Google para dibujar las polilíneas de las secuencias obtenidas, y llamado adicional alTSP nativo de Google como benchmark.
5. **Evaluación:** Renderizado condicional del dashboard comparativo y las estadísticas del grafo O(N^2).

---

# 8. Resultados y Experimentos (Valor Agregado)

Para que los experimentos tengan un impacto real y demuestren la teoría de la Inteligencia Artificial, utilizaremos localizaciones reales de Lima Metropolitana distribuidas de modo estratégico para forzar el comportamiento de los algoritmos.
### Experimento 1: Baja Complejidad (Clúster Cercano)
- **Objetivo:** Probar el comportamiento del sistema cuando todos los puntos están agrupados en una misma zona geográfica. Al haber poca distancia, ambos algoritmos deben encontrar la misma ruta óptima de forma inmediata.
- **Nodos a Ingresar:**
    - Base: Universidad Nacional Mayor de San Marcos (Puerta 3).
    - Nodo 1: Centro Comercial Plaza San Miguel.
    - Nodo 2: Parque de las Leyendas.
    - Nodo 3: Hospital San José (Callao).

    **Matriz de Costos reales:**

    ![Descripción](/assets/Exp_01_Matriz.png)

    **Algortimo Greddy:**

    ![Descripción](/assets/Exp_01_Greddy.png)
    
    **Ruta optima por el algoritmo Greddy:**

    ![Descripción](/assets/Exp_01_Greddy_Ruta.png)

    **Algoritmo A\*:**

    ![Descripción](/assets/Exp_01_A.png)

    **Ruta optima por el algoritmo A\*:**
    
    ![Descripción](/assets/Exp_01_A_Ruta.png)

    **Algoritmo Google API**

    ![Descripción](/assets/Exp_01_Google.png)

    **Ruta optima por el algoritmo Google API:**

    ![Descripción](/assets/Exp_01_Google_Ruta.png)

- **Interpretación Analítica:**
  En este escenario de baja complejidad (4 nodos fuertemente agrupados), el espacio de combinaciones posibles es muy reducido (apenas $3! = 6$ rutas). Como se evidencia en los resultados, tanto el algoritmo de búsqueda local (Greedy) como el de búsqueda global (A*) **convergieron exactamente en la misma ruta** que el motor de optimización comercial de Google. 

  El valor de este experimento radica en evidenciar la diferencia de esfuerzo computacional:
  1. **Algoritmo Greedy:** Trazó la ruta de forma instantánea expandiendo únicamente el mínimo indispensable de nodos (3 expansiones), tomando la decisión más barata en cada salto sin mirar el futuro.
  2. **Algoritmo A\*:** Requirió expandir un mayor número de estados en su lista abierta. Esto demuestra su rigor matemático: A* no se conforma con el primer camino rápido que encuentra, sino que evalúa ramas alternativas mediante la función $f(n) = g(n) + h(n)$ para garantizar y demostrar que **no existe ninguna ruta matemáticamente superior** antes de dar el resultado final.


### Experimento 2: La "Trampa Voraz" (El plato fuerte de la sustentación)
- **Objetivo:** Este escenario está diseñado específicamente para hacer fallar al algoritmo Greedy. Colocaremos nodos secuenciales hacia el sur, pero un nodo aislado en el extremo oeste (Callao). Greedy irá felizmente avanzando hacia el sur porque cada nodo está "cerca" del anterior, dejando el Callao para el final. Esto lo obligará a dar un salto gigantesco y caótico de regreso con el tráfico de Lima, mientras que A* detectará esa penalización futura y armará una ruta circular limpia.
- **Nodos a Ingresar:**
    - Base: Plaza Mayor de Lima (Centro de Lima).
    - Nodo 1: Real Plaza Salaverry (Jesús María).
    - Nodo 2: Centro Financiero de San Isidro (Av. Canaval y Moreyra).
    - Nodo 3: Parque Kennedy (Miraflores).
    - Nodo 4: Terminal Marítimo del Callao (Plaza Grau, Callao).

    **Matriz de Costos reales:**

    ![Descripción](/assets/Exp_02_Matriz.png)

    **Algortimo Greddy:**

    ![Descripción](/assets/Exp_02_Greddy.png)
    
    **Ruta optima por el algoritmo Greddy:**

    ![Descripción](/assets/Exp_02_Greddy_Ruta.png)

    **Algoritmo A\*:**

    ![Descripción](/assets/Exp_02_A.png)

    **Ruta optima por el algoritmo A\*:**
    
    ![Descripción](/assets/Exp_02_A_Ruta.png)

    **Algoritmo Google API**

    ![Descripción](/assets/Exp_02_Google.png)

    **Ruta optima por el algoritmo Google API:**

    ![Descripción](/assets/Exp_02_Google_Ruta.png)


    - **Interpretación Analítica:**
  Este escenario demuestra empíricamente la mayor vulnerabilidad de los algoritmos de búsqueda local: quedarse atrapados en un "óptimo local" y perder de vista el "óptimo global".
  
  1. **El Fracaso de Greedy (La Trampa):** El algoritmo Voraz operó con un esfuerzo computacional mínimo (4 expansiones). Se dejó seducir por las distancias cortas inmediatas, trazando una ruta secuencial hacia el sur (Centro → Jesús María → San Isidro → Miraflores). Sin embargo, al dejar el Callao para el final, sufrió una penalización masiva en el viaje de regreso cruzando toda la ciudad con tráfico. El resultado fue una ruta subóptima de **143 minutos** con líneas de recorrido cruzadas y poco eficientes.
  2. **La Visión Global de A\*:** El motor A* logró evadir esta trampa geométrica gracias a su evaluación $f(n) = g(n) + h(n)$. La heurística le permitió anticipar el altísimo costo futuro de dejar un nodo aislado. Optó por resolver el punto más distante al inicio (Centro → Callao) para luego descender hacia el sur y retornar limpiamente a la Base. El resultado fue el óptimo global de **131 minutos** (un ahorro de 12 minutos de conducción).
  3. **El Costo Computacional:** Alcanzar esta perfección matemática exigió un mayor poder de procesamiento. A* necesitó expandir **65 nodos** en su lista abierta para comprobar todas las ramificaciones posibles. Una vez más, la ruta de A* (131 min) coincidió exactamente con el benchmark de la Caja Negra de Google API, demostrando que nuestro motor informático es capaz de igualar estándares industriales.

### Experimento 3: Explosión Combinatoria (Prueba de Estrés)
- Objetivo: Demostrar cómo el algoritmo A* agota los recursos de la CPU debido a la complejidad $O(N!)$ del Problema del Viajante cuando no hay podas severas, contrastándolo con la ligereza de Greedy.
- Nodos a Ingresar:
    - Base: Universidad Nacional Mayor de San Marcos (Puerta 3).
    - Nodo 1 (Norte): MegaPlaza (Independencia).
    - Nodo 2 (Sur): Mall del Sur (San Juan de Miraflores).
    - Nodo 3 (Este): Jockey Plaza (Surco).
    - Nodo 4 (Oeste): Aeropuerto Internacional Jorge Chávez (Callao).
    - Nodo 5 (Centro): Circuito Mágico del Agua (Lima).
    - Nodo 6: Parque Kennedy (Miraflores).
    - Nodo 7: Real Plaza Puruchuco (Ate).
    - Nodo 8: Plaza Lima Sur (Chorrillos).
    - Nodo 9: Minka (Callao).

**Interpretación Analítica:**
  Este experimento expone la limitación matemática fundamental de los algoritmos de búsqueda exacta frente a problemas NP-Hard.
  
  1. **La Ligereza de Greedy:** Al tener una complejidad lineal para la expansión $O(N)$, el algoritmo Voraz procesó los 10 nodos de forma casi instantánea (< 2 ms) realizando apenas 9 expansiones. Sin embargo, al observar el mapa, el resultado es una ruta visualmente caótica e ineficiente, cruzando la ciudad de extremo a extremo múltiples veces al no poder planificar rutas zonales.
  2. **El Colapso de A\* (Explosión Combinatoria):** Al escalar a 10 nodos, el espacio de combinaciones posibles creció a $9!$ ($362,880$ posibles tours). A pesar de la excelente poda generada por la heurística de Haversine, el motor A* requirió expandir **miles de estados** en la lista abierta, saturando el hilo de ejecución principal (Main Thread) del navegador y elevando drásticamente el tiempo de procesamiento.
  3. **Conclusión General:** Se demuestra que A* es perfecto y garantizado para el ruteo de última milla a pequeña escala ($N \le 8$). Sin embargo, para flotas logísticas reales (ej. 50 entregas), buscar la "ruta matemáticamente perfecta" es computacionalmente inviable. Esto justifica la necesidad industrial de aplicar **Metaheurísticas** (Algoritmos Genéticos o Recocido Simulado), las cuales ofrecen rutas aproximadas de muy alta calidad en tiempos polinomiales.
---

# 9. Herramientas utilizadas

- **Lenguaje:** TypeScript v5.6 (Modo estricto).
- **Frontend:** React v18, Vite, Tailwind CSS.
- **Servicios Cloud:** Google Maps Platform (Routes API v2 para matrices REST, Places API para autocompletado, Directions API para renderizado cartográfico).
- **Entorno:** Visual Studio Code, Node.js, Git.

---

# 10. Consideraciones finales

- **Utilidad del proyecto:** Demuestra visualmente los "trade-offs" algorítmicos en problemas de ruteo urbano, validando que buscar la perfección matemática (A*) tiene un alto costo de CPU frente a métodos de aproximación (Greedy).
- **Posibles limitaciones:** Debido a la explosión combinatoria O(N!) del TSP, el algoritmo A* ejecutado en el hilo del navegador agota la memoria rápidamente para grafos superiores a 10 nodos.
- **Trabajos futuros:** Migrar hacia metaheurísticas (Algoritmos Genéticos o Colonias de Hormigas) para abordar flotas logísticas masivas (+50 puntos) manteniendo tiempos de respuesta polinomiales.

---

# 11. Referencias

- Boysen, N., Fedtke, S., & Schwerdfeger, S. (2021). *Last-mile delivery concepts: A survey from an operational research perspective*. OR Spectrum, 43(1), 1-58.
- Google Developers. (2026). *Routes API v2 Overview and Compute Route Matrix Guide*. Google Maps Platform Documentation.
- Ministerio de Transportes y Comunicaciones (MTC). (2022). *Nuevos límites de velocidad en zonas urbanas a nivel nacional*. Gobierno del Perú. Recuperado de: https://www.gob.pe/26617-nuevos-limites-de-velocidad-en-zonas-urbanas-a-nivel-nacional
- Russell, S., & Norvig, P. (2021). *Artificial Intelligence: A Modern Approach* (4.ª ed.). Pearson.