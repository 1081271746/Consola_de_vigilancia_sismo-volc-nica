README - Consola de Vigilancia Sismo-Volcánica
Descripción

Este proyecto es una página web que simula una consola para monitorear actividad sísmica de 9 estaciones y 27 canales.

Se utilizan Web Workers para repartir el procesamiento y evitar que la página se quede bloqueada.

¿Cómo funciona?
index.html: contiene la interfaz y los botones.
style.css: contiene los estilos de la página.
app.js: controla la interfaz, los Workers, la gráfica y los eventos.
worker.js: procesa las señales de cada estación.

Los 3 Workers se dividen las estaciones:

Worker 1 → Estaciones 1, 2, 3
Worker 2 → Estaciones 4, 5, 6
Worker 3 → Estaciones 7, 8, 9

Cada canal utiliza STA/LTA para detectar actividad sísmica. También se calcula la amplitud máxima y se guardan las muestras en un SharedArrayBuffer.

La gráfica muestra los 27 canales en tiempo real usando requestAnimationFrame.

Prueba
Abrir el proyecto con un servidor local.
Presionar Iniciar monitoreo.
Presionar Simular sismo para generar actividad.
Observar la gráfica y los valores de STA/LTA.
Usar Exportar CSV para guardar los datos.

El proyecto busca demostrar cómo utilizar procesamiento paralelo en JavaScript para mantener una interfaz fluida mientras se procesan varias señales al mismo tiempo.
