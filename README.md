# Consola de Vigilancia Sismo-Volcánica

## Descripción

Este proyecto implementa una consola web para el monitoreo de actividad sismo-volcánica en tiempo real.

El sistema simula el funcionamiento de una red de **9 estaciones sismológicas**, donde cada estación posee **3 canales de medición**:

* Canal Norte-Sur (N-S)
* Canal Este-Oeste (E-O)
* Canal Vertical (Z)

En total se procesan **27 canales simultáneamente**.

El objetivo principal es evitar que el procesamiento de los datos sísmicos bloquee la interfaz gráfica del navegador. Para esto se utilizan **Web Workers**, permitiendo distribuir el procesamiento entre diferentes hilos.

Además, el sistema utiliza `SharedArrayBuffer` y `Atomics` para compartir los datos entre los Workers y la interfaz principal.

---

# Tecnologías utilizadas

* HTML5
* CSS3
* JavaScript
* Web Workers
* SharedArrayBuffer
* Atomics
* Canvas API
* PerformanceObserver
* Git y GitHub

---

# Estructura del proyecto

```text
sismo-volcan/
│
├── index.html
├── style.css
├── app.js
├── worker.js
└── README.md
```

## index.html

Contiene la estructura principal de la interfaz.

Aquí se encuentran:

* Panel de estado.
* Número de estaciones activas.
* Ratio STA/LTA.
* Amplitud máxima.
* Número de muestras.
* Cantidad de Workers.
* Botones de control.
* Gráfica de los 27 canales.
* Información de eventos.
* Métricas de rendimiento.

---

## style.css

Contiene los estilos visuales de la aplicación.

Se utiliza para organizar:

* Encabezado.
* Panel de información.
* Botones.
* Canvas.
* Área de eventos.
* Métricas de rendimiento.

---

## app.js

Es el archivo principal de la aplicación.

Se encarga de:

1. Crear el `SharedArrayBuffer`.
2. Crear el buffer de control.
3. Crear los 3 Web Workers.
4. Distribuir las estaciones entre los Workers.
5. Recibir los resultados del procesamiento.
6. Mostrar los datos en la interfaz.
7. Dibujar los 27 canales utilizando `requestAnimationFrame`.
8. Detectar eventos sísmicos.
9. Exportar los datos a CSV.
10. Medir el rendimiento mediante `PerformanceObserver`.

---

## worker.js

Es el encargado de realizar el procesamiento de los datos.

Cada Worker recibe un grupo de estaciones.

La distribución utilizada es:

```text
Worker 1
├── Estación 1
├── Estación 2
└── Estación 3

Worker 2
├── Estación 4
├── Estación 5
└── Estación 6

Worker 3
├── Estación 7
├── Estación 8
└── Estación 9
```

Cada estación tiene tres canales, por lo que cada Worker procesa:

```text
3 estaciones × 3 canales = 9 canales
```

En total:

```text
3 Workers × 9 canales = 27 canales
```

---

# Procesamiento STA/LTA

El algoritmo utiliza dos ventanas:

```text
STA = 200 muestras
LTA = 6000 muestras
```

La frecuencia de muestreo utilizada es:

```text
200 Hz
```

Por lo tanto:

```text
200 muestras / 200 Hz = 1 segundo
```

y:

```text
6000 muestras / 200 Hz = 30 segundos
```

El sistema calcula la energía de cada muestra:

```javascript
energia = valor * valor;
```

Posteriormente mantiene las sumas de las ventanas STA y LTA utilizando buffers circulares.

El ratio utilizado es:

```text
STA/LTA = promedio STA / promedio LTA
```

---

# Detección de actividad

El sistema utiliza dos umbrales:

```text
ON  = 4.0
OFF = 1.5
```

Cuando:

```text
STA/LTA >= 4.0
```

se genera un disparo.

Cuando posteriormente:

```text
STA/LTA <= 1.5
```

el disparo finaliza.

Esto permite utilizar histéresis y evitar que el estado cambie continuamente cuando el valor se encuentra cerca del límite.

---

# Cálculo de amplitud máxima

Para cada canal se mantiene una ventana de:

```text
1000 muestras
```

Como la frecuencia es de 200 Hz:

```text
1000 / 200 = 5 segundos
```

Por lo tanto, el sistema mantiene la amplitud máxima de los últimos 5 segundos.

El valor utilizado es:

```javascript
Math.abs(valor)
```

---

# Memoria compartida

El sistema utiliza `SharedArrayBuffer` para almacenar las muestras.

Se tienen:

```text
27 canales
```

Cada canal mantiene:

```text
120000 muestras
```

Esto corresponde a:

```text
120000 / 200 = 600 segundos
```

Es decir:

```text
10 minutos de historial
```

La estructura general es:

```text
SharedArrayBuffer
│
├── Canal 1
├── Canal 2
├── Canal 3
├── ...
└── Canal 27
```

Los datos se almacenan utilizando un `Float32Array`.

---

# Sincronización con Atomics

El acceso a la memoria compartida se controla mediante `Atomics`.

Para cada canal se almacenan valores de control relacionados con:

* Cantidad de muestras.
* Posición actual dentro del buffer.

Por ejemplo:

```javascript
Atomics.store(
    control,
    controlIndex,
    c.muestras
);
```

La interfaz utiliza:

```javascript
Atomics.load()
```

para consultar la información almacenada por los Workers.

Esto permite que el hilo principal consulte los datos sin tener que copiar constantemente todo el historial.

---

# Visualización

La aplicación utiliza un elemento:

```html
<canvas>
```

para representar los 27 canales.

La actualización de la gráfica se realiza mediante:

```javascript
requestAnimationFrame()
```

en lugar de utilizar un `setInterval()` para el dibujo.

La interfaz divide el Canvas entre los 27 canales:

```text
Canal 1
Canal 2
Canal 3
...
Canal 27
```

Para reducir la cantidad de datos que se dibujan, las muestras se agrupan por píxel y se
