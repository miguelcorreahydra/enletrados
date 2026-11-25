// Genera los niveles de Enletrados. Copiado del prototipo «Letras Cruzadas» (24 nov 2026) y adaptado.
// Uso: node herramientas/generar.js [cantidad de niveles, 30 por omisión]
//   datos/es_50k.txt: lista de frecuencias de hermitdave/FrequencyWords (código MIT, contenido CC BY-SA 4.0).
//   datos/diccionario.json: an-array-of-spanish-words 2.0.0 (MIT), para confirmar que son palabras del español.
//   (los dos se bajan con herramientas/descargar_datos.sh)
// Salida: fuente/contenido/niveles.json. Cada nivel: letras, palabras con posición en la grilla y palabras extra válidas.
"use strict";
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..");
const frecRuta = path.join(RAIZ, "datos/es_50k.txt"), dicRuta = path.join(RAIZ, "datos/diccionario.json");
const sinTilde = s => s.toLowerCase().replace(/ñ/g, "#").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/#/g, "ñ");

// Palabras que no deben salir (groserías, temas delicados). Se amplía al revisar los niveles.
const BLOQUEO = new Set(("puta puto putas putos mierda joder jodes jodas jodido coño culo culos polla verga pene penes coger follar " +
  "cabron pendejo maricon marica idiota idiotas estupido imbecil perra perras zorra zorras droga drogas matar mato mata maten " +
  "muerte muerto muerta morir muere murio sexo sexy desnudo desnuda violar viola cagar caga mear teta tetas pedo pedos caca " +
  "mamar mama chupa chupar concha pija carajo nazi nazis odio asesino suicida bomba balas arma armas sangre tumba cadaver " +
  "orina orinar ano anal porno puti cachar maldito maldita diablo infierno").split(" "));

const dic = new Set(JSON.parse(fs.readFileSync(dicRuta, "utf8")).map(sinTilde));
const comunes = []; const visto = new Set();
for (const linea of fs.readFileSync(frecRuta, "utf8").split("\n")) {
  const w = sinTilde(linea.split(" ")[0] || "");
  if (!/^[a-zñ]{3,7}$/.test(w) || visto.has(w) || BLOQUEO.has(w) || !dic.has(w)) continue;
  visto.add(w); comunes.push(w);
}
const rango = new Map(comunes.map((w, i) => [w, i]));
// Solo palabras con definición en pistas.js pueden ir en la grilla (si aún no existe, se usan las comunes para elegir vocabulario).
let PISTAS = null;
try { global.window = {}; require(path.join(RAIZ, "fuente/contenido/pistas.js")); PISTAS = window.PISTAS; } catch (e) {}
const RESPUESTAS = PISTAS ? comunes.filter(w => PISTAS[w]) : comunes.slice(0, 7000);
const EXTRAS = comunes.slice(0, 20000);      // cuentan como «palabra extra»

// generador pseudoaleatorio fijo (los niveles salen siempre iguales)
let semilla = 20261124;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);

const cuenta = w => { const c = {}; for (const l of w) c[l] = (c[l] || 0) + 1; return c; };
const cabe = (w, letras) => { const a = cuenta(w); return Object.keys(a).every(l => (letras[l] || 0) >= a[l]); };

// ---------- armado del crucigrama ----------
function armar(palabras, maxLado) {
  const celdas = new Map(); // "f,c" -> {l, h, v}
  const puestas = [];
  const k = (f, c) => f + "," + c;
  const poner = (w, f, c, d) => {
    for (let i = 0; i < w.length; i++) {
      const ff = f + (d === "v" ? i : 0), cc = c + (d === "h" ? i : 0), x = celdas.get(k(ff, cc)) || { l: w[i] };
      x[d] = true; celdas.set(k(ff, cc), x);
    }
    puestas.push({ p: w, f, c, d });
  };
  const libre = (f, c) => !celdas.has(k(f, c));
  const sePuede = (w, f, c, d) => {
    const df = d === "v" ? 1 : 0, dc = d === "h" ? 1 : 0;
    if (!libre(f - df, c - dc) || !libre(f + df * w.length, c + dc * w.length)) return false;
    let cruces = 0;
    for (let i = 0; i < w.length; i++) {
      const ff = f + df * i, cc = c + dc * i, x = celdas.get(k(ff, cc));
      if (x) { if (x.l !== w[i] || x[d]) return false; cruces++; }
      else if (!libre(ff + dc, cc + df) || !libre(ff - dc, cc - df)) return false; // no tocar palabras vecinas
    }
    return cruces > 0;
  };
  const caja = extra => {
    let f0 = Infinity, f1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    const ver = (f, c) => { f0 = Math.min(f0, f); f1 = Math.max(f1, f); c0 = Math.min(c0, c); c1 = Math.max(c1, c); };
    for (const key of celdas.keys()) { const [f, c] = key.split(",").map(Number); ver(f, c); }
    if (extra) for (let i = 0; i < extra.w.length; i++) ver(extra.f + (extra.d === "v" ? i : 0), extra.c + (extra.d === "h" ? i : 0));
    return { f0, f1, c0, c1, alto: f1 - f0 + 1, ancho: c1 - c0 + 1 };
  };
  poner(palabras[0], 0, 0, "h");
  for (const w of palabras.slice(1)) {
    const opciones = [];
    for (const [key, x] of celdas) {
      const [f, c] = key.split(",").map(Number);
      for (let i = 0; i < w.length; i++) {
        if (w[i] !== x.l) continue;
        for (const d of ["h", "v"]) {
          if (x[d]) continue;
          const f0 = d === "v" ? f - i : f, c0 = d === "h" ? c - i : c;
          if (!sePuede(w, f0, c0, d)) continue;
          const b = caja({ w, f: f0, c: c0, d });
          if (b.alto > maxLado || b.ancho > maxLado) continue;
          opciones.push({ f: f0, c: c0, d, area: b.alto * b.ancho + azar() * 3 });
        }
      }
    }
    if (!opciones.length) continue;
    opciones.sort((a, b) => a.area - b.area);
    const o = opciones[0]; poner(w, o.f, o.c, o.d);
  }
  const b = caja();
  return { palabras: puestas.map(x => ({ p: x.p, f: x.f - b.f0, c: x.c - b.c0, d: x.d })), filas: b.alto, columnas: b.ancho };
}

// ---------- dificultad por nivel ----------
function plan(n) {
  if (n === 1) return { largo: 3, min: 2, max: 2, base: 300 };
  if (n <= 5) return { largo: 4, min: 3, max: 4, base: 800 };
  if (n <= 15) return { largo: 5, min: 4, max: 5, base: 1500 };
  if (n <= 40) return { largo: 6, min: 5, max: 7, base: 2500 };
  return { largo: 7, min: 6, max: 8, base: 3500 };
}

const TOTAL = +(process.argv[2] || 30);
const usadas = new Set(), niveles = [];
for (let n = 1; niveles.length < TOTAL; n++) {
  const pl = plan(n);
  let hecho = null;
  for (let intento = 0; intento < 4000 && !hecho; intento++) {
    const base = RESPUESTAS[Math.floor(azar() * Math.min(pl.base, RESPUESTAS.length))];
    if (!base || base.length !== pl.largo || usadas.has(base)) continue;
    const letras = cuenta(base);
    const posibles = RESPUESTAS.filter(w => w !== base && cabe(w, letras));
    if (posibles.length < pl.min - 1) continue;
    // las más conocidas primero, con algo de variedad
    const elegidas = [base].concat(posibles.sort((a, b) => (rango.get(a) - rango.get(b)) + (azar() - .5) * 800).slice(0, pl.max + 3));
    const cruci = armar(elegidas, n <= 5 ? 5 : n <= 15 ? 7 : 8);
    if (cruci.palabras.length < pl.min) continue;
    cruci.palabras = cruci.palabras.slice(0, pl.max);
    // recalcular tamaño si se recortaron palabras
    let f1 = 0, c1 = 0;
    cruci.palabras.forEach(x => { f1 = Math.max(f1, x.f + (x.d === "v" ? x.p.length - 1 : 0)); c1 = Math.max(c1, x.c + (x.d === "h" ? x.p.length - 1 : 0)); });
    const enGrilla = new Set(cruci.palabras.map(x => x.p));
    const extras = EXTRAS.filter(w => !enGrilla.has(w) && cabe(w, letras));
    hecho = { letras: base.split("").sort(() => azar() - .5).join(""), palabras: cruci.palabras, filas: f1 + 1, columnas: c1 + 1, extras };
    usadas.add(base);
  }
  if (!hecho) { console.error("Sin nivel para", n); break; }
  niveles.push(hecho);
}
const salida = JSON.stringify(niveles);
fs.writeFileSync(path.join(RAIZ, "fuente/contenido/niveles.json"), salida + "\n");
console.log(niveles.length, "niveles,", Math.round(salida.length / 1024), "KB");
niveles.forEach((l, i) => console.log(i + 1, l.letras, l.filas + "x" + l.columnas, l.palabras.map(x => x.p).join(","), "| extras:", l.extras.length));
console.log("SIN_PISTA:", [...new Set(niveles.flatMap(l => l.palabras.map(x => x.p)))].filter(w => !PISTAS || !PISTAS[w]).join(" "));
