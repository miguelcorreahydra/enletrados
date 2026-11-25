// Prueba automática de todos los niveles y tableros del diario. Resuelve cada uno y comprueba que:
//   - todas las palabras se forman con las letras de la rueda y la rueda no está ya ordenada como la palabra principal;
//   - el crucigrama es válido: letras coherentes en los cruces, todo conectado, y cada tramo de 2 o más letras seguidas
//     es una palabra del nivel (no quedan pegadas que formen «basura»);
//   - ninguna palabra se repite dentro del nivel ni en niveles cercanos (15 niveles; 30 días en el diario);
//   - la curva de dificultad se respeta (letras por mundo, tamaño máximo de la grilla).
// Uso: node herramientas/probar_niveles.js
"use strict";
const fs = require("fs"), path = require("path"), L = require("./lib/contenido");
const C = p => path.join(L.RAIZ, "fuente/contenido", p);
const cuenta = w => { const c = {}; for (const l of w) c[l] = (c[l] || 0) + 1; return c; };
const cabe = (w, letras) => { const a = cuenta(w), b = cuenta(letras); return Object.keys(a).every(l => (b[l] || 0) >= a[l]); };
let errores = 0;

function probar(lista, nombre, ventana, letrasEsperadas) {
  const recientes = [];
  lista.forEach((l, idx) => {
    const n = idx + 1, mal = m => { errores++; console.log(`  ✗ ${nombre} ${n}: ${m}`); };
    const base = l.palabras[0].p;
    if (l.letras.length !== base.length) mal(`la rueda tiene ${l.letras.length} letras y la palabra principal ${base.length}`);
    if (l.letras === base) mal("la rueda viene ordenada como la respuesta");
    const esperadas = letrasEsperadas && letrasEsperadas(n, l);
    if (esperadas && !esperadas.includes(l.letras.length)) mal(`tiene ${l.letras.length} letras; se esperaban ${esperadas.join(" o ")}`);
    if (l.filas > 9 || l.columnas > 9) mal(`grilla de ${l.filas}×${l.columnas}: máximo 9×9`);
    const celdas = new Map(), vistas = new Set();
    for (const w of l.palabras) {
      if (!cabe(w.p, l.letras)) mal(`«${w.p}» no se forma con «${l.letras}»`);
      if (vistas.has(w.p)) mal(`«${w.p}» está repetida`); vistas.add(w.p);
      if (recientes.flat().includes(w.p)) mal(`«${w.p}» ya salió hace menos de ${ventana}`);
      for (let i = 0; i < w.p.length; i++) {
        const f = w.f + (w.d === "v" ? i : 0), c = w.c + (w.d === "h" ? i : 0), k = f + "," + c;
        if (f < 0 || c < 0 || f >= l.filas || c >= l.columnas) mal(`«${w.p}» se sale de la grilla`);
        if (celdas.has(k) && celdas.get(k) !== w.p[i]) mal(`cruce incoherente en ${k}`);
        celdas.set(k, w.p[i]);
      }
    }
    // cada tramo horizontal y vertical de 2+ letras debe ser una palabra puesta en esa dirección
    const puestas = new Set(l.palabras.map(w => `${w.d}:${w.f},${w.c}:${w.p}`));
    for (const d of ["h", "v"]) for (let a = 0; a < (d === "h" ? l.filas : l.columnas); a++) {
      let tramo = "", ini = 0;
      for (let b = 0; b <= (d === "h" ? l.columnas : l.filas); b++) {
        const k = d === "h" ? a + "," + b : b + "," + a, x = celdas.get(k);
        if (x) { if (!tramo) ini = b; tramo += x; continue; }
        if (tramo.length >= 2) { const pos = d === "h" ? `${a},${ini}` : `${ini},${a}`; if (!puestas.has(`${d}:${pos}:${tramo}`)) mal(`tramo suelto «${tramo}» (${d === "h" ? "horizontal" : "vertical"})`); }
        tramo = "";
      }
    }
    // todo conectado
    const claves = [...celdas.keys()], visit = new Set([claves[0]]), cola = [claves[0]];
    while (cola.length) { const [f, c] = cola.pop().split(",").map(Number); for (const k of [`${f + 1},${c}`, `${f - 1},${c}`, `${f},${c + 1}`, `${f},${c - 1}`]) if (celdas.has(k) && !visit.has(k)) { visit.add(k); cola.push(k); } }
    if (visit.size !== celdas.size) mal("el crucigrama tiene partes sueltas");
    recientes.push(l.palabras.map(w => w.p)); if (recientes.length > ventana) recientes.shift();
  });
  console.log(`${nombre}: ${lista.length} revisados`);
}

const niveles = JSON.parse(fs.readFileSync(C("niveles.json"), "utf8"));
probar(niveles, "Nivel", 15, (n, l) => {
  const m = Math.ceil(n / 30), pos = n - (m - 1) * 30;
  if (n <= 2) return [3];
  const normal = m <= 2 ? 4 : m <= 5 ? 5 : m <= 8 ? 6 : 7;
  if (l.grande) return [normal, normal + 1];
  if (l.respiro) return [normal - 1, normal];
  return [normal];
});
if (fs.existsSync(C("diario.json"))) probar(JSON.parse(fs.readFileSync(C("diario.json"), "utf8")), "Diario", 30, () => [5, 6]);
console.log(errores ? `${errores} errores` : "✓ Todos los niveles se pueden resolver y son válidos");
process.exit(errores ? 1 : 0);
