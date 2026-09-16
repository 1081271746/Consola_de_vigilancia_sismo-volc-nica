const canvas =
    document.getElementById("grafico");

const ctx =
    canvas.getContext("2d");

const estado =
    document.getElementById("estado");

const estacionesTexto =
    document.getElementById("estaciones");

const ratioTexto =
    document.getElementById("ratio");

const amplitudTexto =
    document.getElementById("amplitud");

const muestrasTexto =
    document.getElementById("muestras");

const eventoTexto =
    document.getElementById("evento");

const inpTexto =
    document.getElementById("inp");

const longTasksTexto =
    document.getElementById("longTasks");

const aisladoTexto =
    document.getElementById("aislado");


const NUM_ESTACIONES = 9;
const CANALES_POR_ESTACION = 3;
const NUM_CANALES = 27;

const HISTORIAL = 120000;

const PIXELES = 900;


// ========================================
// SharedArrayBuffer
// ========================================

const memoriaDatos =
    new SharedArrayBuffer(
        NUM_CANALES *
        HISTORIAL *
        Float32Array.BYTES_PER_ELEMENT
    );

const datos =
    new Float32Array(memoriaDatos);


const memoriaControl =
    new SharedArrayBuffer(
        NUM_CANALES *
        2 *
        Int32Array.BYTES_PER_ELEMENT
    );

const control =
    new Int32Array(memoriaControl);

let workers = [];

let ejecutando = false;

let totalMuestras = 0;

let estacionesDisparadas =
    new Set();

let intervalos = [];

let eventoConfirmado = false;

document
    .getElementById("btnIniciar")
    .onclick = iniciar;


function iniciar() {

    if (ejecutando) {
        return;
    }

    ejecutando = true;

    estado.textContent =
        "MONITOREANDO";

    estado.className = "";


    crearWorkers();

    dibujar();
}
function crearWorkers() {

    workers = [];


    const grupos = [
        [1, 2, 3],
        [4, 5, 6],
        [7, 8, 9]
    ];


    grupos.forEach(
        (grupo, indice) => {

            const worker =
                new Worker("worker.js");

            worker.onmessage =
                recibirMensaje;

            worker.postMessage({
                tipo: "init",

                workerId:
                    indice + 1,

                estaciones:
                    grupo,

                dataBuffer:
                    memoriaDatos,

                controlBuffer:
                    memoriaControl
            });

            workers.push(worker);
        }
    );
}
function recibirMensaje(event) {

    const mensaje =
        event.data;


    if (mensaje.tipo === "estadisticas") {

        totalMuestras += 27;

        muestrasTexto.textContent =
            totalMuestras;
    }


    if (mensaje.tipo === "disparo") {

        registrarDisparo(mensaje);
    }


    if (mensaje.tipo === "fin") {

        registrarFin(mensaje);
    }
}

function registrarDisparo(mensaje) {

    estacionesDisparadas.add(
        mensaje.estacion
    );


    intervalos.push({
        estacion:
            mensaje.estacion,

        inicio:
            mensaje.inicio
    });


    comprobarEvento(
        mensaje.inicio
    );


    if (estacionesDisparadas.size > 0) {

        estacionesTexto.textContent =
            estacionesDisparadas.size +
            " / 9";
    }
}


function registrarFin(mensaje) {

    intervalos.push({
        estacion:
            mensaje.estacion,

        inicio:
            mensaje.inicio,

        fin:
            mensaje.fin
    });
}


function comprobarEvento(tiempo) {

    const limite =
        tiempo - 6000;


    const estaciones =
        new Set();


    for (const intervalo of intervalos) {

        if (
            intervalo.inicio >= limite &&
            intervalo.inicio <= tiempo
        ) {

            estaciones.add(
                intervalo.estacion
            );
        }
    }


    if (
        estaciones.size >= 4 &&
        !eventoConfirmado
    ) {

        eventoConfirmado = true;


        eventoTexto.innerHTML =
            "<strong>EVENTO CONFIRMADO</strong><br>" +
            "Cuarta estación alcanzada: " +
            tiempo.toFixed(0) +
            " ms<br>" +
            "Estaciones participantes: " +
            [...estaciones].join(", ");
    }
}

document
    .getElementById("btnSismo")
    .onclick = simularSismo;


function simularSismo() {

    workers.forEach(
        worker => {

            worker.postMessage({
                tipo: "sismo"
            });
        }
    );

    eventoTexto.textContent =
        "Simulación de actividad sísmica iniciada.";
}
document
    .getElementById("btnDetener")
    .onclick = detener;


function detener() {

    ejecutando = false;

    workers.forEach(
        worker => {

            worker.postMessage({
                tipo: "detener"
            });

            worker.terminate();
        }
    );

    workers = [];

    estado.textContent =
        "DETENIDO";
}

function obtenerMuestras(canal) {

    const resultado = [];

    const controlIndex =
        canal * 2;


    const cantidad =
        Atomics.load(
            control,
            controlIndex
        );


    const posicion =
        Atomics.load(
            control,
            controlIndex + 1
        );


    const cantidadMostrar =
        Math.min(
            cantidad,
            12000
        );


    const inicio =
        (posicion -
            cantidadMostrar +
            HISTORIAL) %
        HISTORIAL;


    for (
        let i = 0;
        i < cantidadMostrar;
        i++
    ) {

        const indice =
            (
                inicio + i
            ) % HISTORIAL;


        const valor =
            datos[
                canal *
                HISTORIAL +
                indice
            ];


        resultado.push(valor);
    }


    return resultado;
}

function dibujarCanal(
    canal,
    x,
    y,
    ancho,
    alto
) {

    const muestras =
        obtenerMuestras(canal);


    if (muestras.length === 0) {
        return;
    }


    const porPixel =
        Math.max(
            1,
            Math.floor(
                muestras.length /
                ancho
            )
        );


    ctx.beginPath();


    for (
        let pixel = 0;
        pixel < ancho;
        pixel++
    ) {

        const inicio =
            pixel * porPixel;

        const fin =
            Math.min(
                inicio + porPixel,
                muestras.length
            );


        let min =
            Infinity;

        let max =
            -Infinity;


        for (
            let i = inicio;
            i < fin;
            i++
        ) {

            const valor =
                muestras[i];


            if (valor < min) {
                min = valor;
            }

            if (valor > max) {
                max = valor;
            }
        }


        const px =
            x + pixel;


        const centro =
            y + alto / 2;


        const escala =
            alto / 20;


        const yMin =
            centro -
            max * escala;


        const yMax =
            centro -
            min * escala;


        ctx.moveTo(
            px,
            yMin
        );

        ctx.lineTo(
            px,
            yMax
        );
    }


    ctx.stroke();
}

function dibujar() {

    if (!ejecutando) {
        return;
    }


    requestAnimationFrame(
        dibujar
    );


    ctx.clearRect(
        0,
        0,
        canvas.width,
        canvas.height
    );


    const altoCanal =
        canvas.height /
        NUM_CANALES;


    for (
        let canal = 0;
        canal < NUM_CANALES;
        canal++
    ) {

        const y =
            canal *
            altoCanal;


        ctx.beginPath();

        ctx.strokeStyle =
            "#55dd55";


        dibujarCanal(
            canal,
            0,
            y,
            canvas.width,
            altoCanal
        );


        ctx.strokeStyle =
            "#444";


        ctx.beginPath();

        ctx.moveTo(
            0,
            y + altoCanal
        );

        ctx.lineTo(
            canvas.width,
            y + altoCanal
        );

        ctx.stroke();
    }
}


let cantidadLongTasks = 0;


if (
    "PerformanceObserver"
    in window
) {

    try {

        const observer =
            new PerformanceObserver(
                function(list) {

                    cantidadLongTasks +=
                        list.getEntries().length;

                    longTasksTexto.textContent =
                        cantidadLongTasks;
                }
            );


        observer.observe({
            type: "longtask",
            buffered: true
        });

    } catch (error) {

        console.log(
            "Long Tasks no disponible"
        );
    }


    try {

        const observerINP =
            new PerformanceObserver(
                function(list) {

                    const entries =
                        list.getEntries();


                    if (
                        entries.length > 0
                    ) {

                        const ultimo =
                            entries[
                                entries.length - 1
                            ];


                        inpTexto.textContent =
                            ultimo.duration.toFixed(2) +
                            " ms";
                    }
                }
            );


        observerINP.observe({
            type: "event",
            buffered: true,
            durationThreshold: 16
        });

    } catch (error) {

        console.log(
            "Event Timing no disponible"
        );
    }
}


aisladoTexto.textContent =
    window.crossOriginIsolated
        ? "ACTIVO"
        : "NO ACTIVO";


document
    .getElementById("btnCSV")
    .onclick = exportarCSV;


function exportarCSV() {

    let csv =
        "canal,muestra,valor\n";


    for (
        let canal = 0;
        canal < NUM_CANALES;
        canal++
    ) {

        const muestras =
            obtenerMuestras(canal);


        for (
            let i = 0;
            i < muestras.length;
            i++
        ) {

            csv +=
                `${canal + 1},${i},${muestras[i]}\n`;
        }
    }


    const blob =
        new Blob(
            [csv],
            {
                type: "text/csv"
            }
        );


    const url =
        URL.createObjectURL(blob);


    const enlace =
        document.createElement("a");


    enlace.href = url;

    enlace.download =
        "evento_sismico.csv";

    enlace.click();


    URL.revokeObjectURL(url);
}