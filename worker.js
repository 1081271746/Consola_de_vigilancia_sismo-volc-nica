let workerId = 0;
let estaciones = [];

let dataBuffer;
let controlBuffer;

let datos;
let control;

const SAMPLE_RATE = 200;
const STA_SIZE = 200;
const LTA_SIZE = 6000;
const MAX_SIZE = 1000;

let canales = [];

let ejecutando = false;
let sismo = false;

self.onmessage = function (event) {

    const mensaje = event.data;

    if (mensaje.tipo === "init") {

        workerId = mensaje.workerId;
        estaciones = mensaje.estaciones;

        dataBuffer = mensaje.dataBuffer;
        controlBuffer = mensaje.controlBuffer;

        datos = new Float32Array(dataBuffer);
        control = new Int32Array(controlBuffer);

        crearCanales();

        ejecutando = true;

        procesar();
    }

    if (mensaje.tipo === "sismo") {

        sismo = true;

        setTimeout(() => {
            sismo = false;
        }, 7000);
    }

    if (mensaje.tipo === "detener") {

        ejecutando = false;
    }
};


function crearCanales() {

    canales = [];

    for (let estacion of estaciones) {

        for (let canal = 0; canal < 3; canal++) {

            canales.push({
                estacion: estacion,
                canal: canal,

                sta: new Float64Array(STA_SIZE),
                lta: new Float64Array(LTA_SIZE),

                staIndex: 0,
                ltaIndex: 0,

                staSuma: 0,
                ltaSuma: 0,

                staCantidad: 0,
                ltaCantidad: 0,

                disparo: false,
                inicioDisparo: 0,

                maxQueue: [],
                maxIndex: 0,

                kahanSTA: 0,
                kahanLTA: 0,

                muestras: 0
            });
        }
    }
}


function procesar() {

    if (!ejecutando) {
        return;
    }

    const tiempo = performance.now();

    for (let canal of canales) {

        const valor = generarMuestra(
            canal.estacion,
            canal.canal
        );

        procesarCanal(canal, valor);

        escribirBuffer(canal, valor);
    }

    self.postMessage({
        tipo: "estadisticas",
        workerId: workerId,
        tiempo: tiempo
    });

    setTimeout(procesar, 5);
}


function generarMuestra(estacion, canal) {

    let ruido = (Math.random() - 0.5) * 2;

    if (sismo) {

        let señal =
            Math.sin(performance.now() * 0.04) *
            (10 + Math.random() * 10);

        return ruido + señal;
    }

    return ruido;
}


function procesarCanal(c, valor) {

    const energia = valor * valor;

    // -----------------------------
    // STA O(1)
    // -----------------------------

    if (c.staCantidad < STA_SIZE) {

        c.sta[c.staIndex] = energia;

        sumarSTA(c, energia);

        c.staCantidad++;

    } else {

        restarSTA(c, c.sta[c.staIndex]);

        c.sta[c.staIndex] = energia;

        sumarSTA(c, energia);
    }

    c.staIndex =
        (c.staIndex + 1) % STA_SIZE;


    

    if (!c.disparo) {

        if (c.ltaCantidad < LTA_SIZE) {

            c.lta[c.ltaIndex] = energia;

            sumarLTA(c, energia);

            c.ltaCantidad++;

        } else {

            restarLTA(c, c.lta[c.ltaIndex]);

            c.lta[c.ltaIndex] = energia;

            sumarLTA(c, energia);
        }

        c.ltaIndex =
            (c.ltaIndex + 1) % LTA_SIZE;
    }


    const staPromedio =
        c.staSuma /
        Math.max(c.staCantidad, 1);

    const ltaPromedio =
        c.ltaSuma /
        Math.max(c.ltaCantidad, 1);

    let ratio = 0;

    if (ltaPromedio > 0) {

        ratio =
            staPromedio /
            ltaPromedio;
    }



    actualizarMaximo(c, Math.abs(valor));


  

    if (!c.disparo && ratio >= 4) {

        c.disparo = true;

        c.inicioDisparo =
            performance.now();

        self.postMessage({
            tipo: "disparo",
            estacion: c.estacion,
            canal: c.canal,
            ratio: ratio,
            inicio: c.inicioDisparo
        });
    }


    if (c.disparo && ratio <= 1.5) {

        c.disparo = false;

        self.postMessage({
            tipo: "fin",
            estacion: c.estacion,
            canal: c.canal,
            ratio: ratio,
            inicio: c.inicioDisparo,
            fin: performance.now()
        });
    }


    c.muestras++;
}


function sumarSTA(c, valor) {

    const y =
        valor - c.kahanSTA;

    const t =
        c.staSuma + y;

    c.kahanSTA =
        (t - c.staSuma) - y;

    c.staSuma = t;
}


function restarSTA(c, valor) {

    sumarSTA(c, -valor);
}


function sumarLTA(c, valor) {

    const y =
        valor - c.kahanLTA;

    const t =
        c.ltaSuma + y;

    c.kahanLTA =
        (t - c.ltaSuma) - y;

    c.ltaSuma = t;
}


function restarLTA(c, valor) {

    sumarLTA(c, -valor);
}


function actualizarMaximo(c, valor) {

    const cola = c.maxQueue;

    while (
        cola.length > 0 &&
        cola[cola.length - 1].valor <= valor
    ) {
        cola.pop();
    }

    cola.push({
        indice: c.maxIndex,
        valor: valor
    });

    const limite =
        c.maxIndex - MAX_SIZE + 1;

    while (
        cola.length > 0 &&
        cola[0].indice < limite
    ) {
        cola.shift();
    }

    c.maxIndex++;
}


function escribirBuffer(c, valor) {

    const canalGlobal =
        (c.estacion - 1) * 3 +
        c.canal;

    const HISTORIAL = 120000;

    const posicion =
        canalGlobal * HISTORIAL +
        (c.muestras % HISTORIAL);

    datos[posicion] = valor;

    const controlIndex =
        canalGlobal * 2;

    Atomics.store(
        control,
        controlIndex,
        c.muestras
    );

    Atomics.store(
        control,
        controlIndex + 1,
        c.muestras % HISTORIAL
    );
}

