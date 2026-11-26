// Genera los niveles de Enletrados y los tableros del desafío diario. Siempre salen iguales (semilla fija).
// Partió del generador del prototipo «Letras Cruzadas» (24 nov 2026).
// Uso: node herramientas/generar.js [--vigentes] [--total 300]
//   Por omisión solo usa pistas APROBADAS. Con --vigentes usa también las pendientes: sirve para ver en local
//   cómo quedarán los niveles antes de terminar la revisión, pero eso nunca se publica.
// Entradas: datos/es_50k.txt (FrequencyWords: código MIT, contenido CC BY-SA 4.0), datos/diccionario.json
//   (an-array-of-spanish-words 2.0.0, MIT), y en fuente/contenido/: tandas/, bloqueo.json, tematicas.json, mundos.json.
// Salidas: fuente/contenido/niveles.json y fuente/contenido/diario.json.
"use strict";
const fs = require("fs"), path = require("path");
const L = require("./lib/contenido"), RAIZ = L.RAIZ, C = p => path.join(RAIZ, "fuente/contenido", p);
const args = process.argv.slice(2), MODO = args.includes("--vigentes") ? "vigentes" : "aprobadas";
const TOTAL = +(args[args.indexOf("--total") + 1] || 300) || 300, DIAS = +(args[args.indexOf("--dias") + 1] || 730) || 730, VENTANA = 15, VENTANA_DIARIO = 30;

// ---------- vocabulario ----------
const bloqueo = L.cargarBloqueo(), libre = w => !bloqueo.bloqueadas.has(w);
const dic = new Set(JSON.parse(fs.readFileSync(path.join(RAIZ, "datos/diccionario.json"), "utf8")).map(L.normal));
const comunes = [], visto = new Set();
for (const linea of fs.readFileSync(path.join(RAIZ, "datos/es_50k.txt"), "utf8").split("\n")) {
  const w = L.normal(linea.split(" ")[0] || "");
  if (!/^[a-zñ]{3,8}$/.test(w) || visto.has(w) || !libre(w) || !dic.has(w)) continue;
  visto.add(w); comunes.push(w);
}
const rango = new Map(comunes.map((w, i) => [w, i])), rangoDe = w => (rango.has(w) ? rango.get(w) : 30000);
const PISTAS = L.pistas(MODO);
const RESPUESTAS = Object.keys(PISTAS).map(L.normal).filter(w => /^[a-zñ]{3,8}$/.test(w) && libre(w)).sort((a, b) => rangoDe(a) - rangoDe(b));
const EXTRAS = comunes.slice(0, 20000);
const TEMAS = JSON.parse(fs.readFileSync(C("tematicas.json"), "utf8"));
const MUNDOS = JSON.parse(fs.readFileSync(C("mundos.json"), "utf8"));

// generador pseudoaleatorio fijo
let semilla = 20261124;
const azar = () => ((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648);
const barajar = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(azar() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const cuenta = w => { const c = {}; for (const l of w) c[l] = (c[l] || 0) + 1; return c; };
const cabe = (w, letras) => { const a = cuenta(w); return Object.keys(a).every(l => (letras[l] || 0) >= a[l]); };

// ---------- armado del crucigrama (del prototipo) ----------
function armar(palabras, maxLado) {
  const celdas = new Map(), puestas = [], k = (f, c) => f + "," + c;
  const poner = (w, f, c, d) => {
    for (let i = 0; i < w.length; i++) {
      const ff = f + (d === "v" ? i : 0), cc = c + (d === "h" ? i : 0), x = celdas.get(k(ff, cc)) || { l: w[i] };
      x[d] = true; celdas.set(k(ff, cc), x);
    }
    puestas.push({ p: w, f, c, d });
  };
  const libreC = (f, c) => !celdas.has(k(f, c));
  const sePuede = (w, f, c, d) => {
    const df = d === "v" ? 1 : 0, dc = d === "h" ? 1 : 0;
    if (!libreC(f - df, c - dc) || !libreC(f + df * w.length, c + dc * w.length)) return false;
    let cruces = 0;
    for (let i = 0; i < w.length; i++) {
      const ff = f + df * i, cc = c + dc * i, x = celdas.get(k(ff, cc));
      if (x) { if (x.l !== w[i] || x[d]) return false; cruces++; }
      else if (!libreC(ff + dc, cc + df) || !libreC(ff - dc, cc - df)) return false; // no tocar palabras vecinas
    }
    return cruces > 0;
  };
  const caja = extra => {
    let f0 = Infinity, f1 = -Infinity, c0 = Infinity, c1 = -Infinity;
    const ver = (f, c) => { f0 = Math.min(f0, f); f1 = Math.max(f1, f); c0 = Math.min(c0, c); c1 = Math.max(c1, c); };
    for (const key of celdas.keys()) { const [f, c] = key.split(",").map(Number); ver(f, c); }
    if (extra) for (let i = 0; i < extra.w.length; i++) ver(extra.f + (extra.d === "v" ? i : 0), extra.c + (extra.d === "h" ? i : 0));
    return { f0, c0, alto: f1 - f0 + 1, ancho: c1 - c0 + 1 };
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
  return puestas.map(x => ({ p: x.p, f: x.f - b.f0, c: x.c - b.c0, d: x.d }));
}
function medida(pal) {
  let f1 = 0, c1 = 0;
  pal.forEach(x => { f1 = Math.max(f1, x.f + (x.d === "v" ? x.p.length - 1 : 0)); c1 = Math.max(c1, x.c + (x.d === "h" ? x.p.length - 1 : 0)); });
  return { filas: f1 + 1, columnas: c1 + 1 };
}

// ---------- curva de dificultad (decidida el 24 nov 2026) ----------
// mundos 1–2: 3–4 letras · 3–5: 5 · 6–8: 6 · 9: 7 · 10: 8 (ajuste aprobado el 26 nov 2026). Cada 5 niveles, uno de
// respiro. El 30 de cada mundo es el «gran nivel». Desde el mundo 6 hay más palabras por nivel, y en los mundos 9–10 la
// palabra principal es menos frecuente (baseMin): ni las más comunes ni rebuscadas, porque todas tienen pista revisada.
function plan(n) {
  const m = Math.ceil(n / 30), pos = n - (m - 1) * 30;
  let p = m === 1 ? { largo: pos <= 2 ? 3 : 4, min: 3, max: 4, base: 1500, lado: 5 }
    : m === 2 ? { largo: 4, min: 3, max: 5, base: 2500, lado: 6 }
    : m <= 5 ? { largo: 5, min: 4, max: 6, base: 3500, lado: 7 }
    : m <= 8 ? { largo: 6, min: 6, max: 10, base: 5000, lado: 9 }
    : m === 9 ? { largo: 7, min: 7, max: 12, base: 12000, baseMin: 1200, lado: 9 }
    : { largo: 8, min: 7, max: 12, base: 20000, baseMin: 1200, lado: 10 };
  if (p.largo === 3) { p.min = 2; p.max = n === 1 ? 2 : 3; }
  const respiro = pos % 5 === 0 && pos < 30 && n > 5, grande = pos === 30;
  if (respiro) p = Object.assign({}, p, { largo: Math.max(4, p.largo - 1), min: Math.max(3, p.min - 1), max: Math.max(3, p.max - 3), base: 1500, baseMin: 0, lado: Math.max(5, p.lado - 1) });
  if (grande) p = Object.assign({}, p, { largo: m <= 2 ? p.largo + 1 : p.largo, min: p.min + 1, max: p.max + 2, lado: Math.min(10, p.lado + 1) });
  return Object.assign(p, { mundo: m, pos, respiro, grande });
}

// Intenta armar un nivel con una palabra principal dada. Devuelve null si no alcanza.
function intentar(base, p, prohibidas) {
  const letras = cuenta(base);
  const posibles = RESPUESTAS.filter(w => w !== base && !prohibidas.has(w) && cabe(w, letras));
  if (posibles.length < p.min - 1) return null;
  // nunca una palabra y su plural en el mismo nivel («ala» y «alas»)
  const plural = (x, y) => x === y + "s" || x === y + "es" || y === x + "s" || y === x + "es";
  const elegidas = [base];
  for (const w of posibles.sort((a, b) => (rangoDe(a) - rangoDe(b)) + (azar() - 0.5) * 900)) {
    if (elegidas.length >= p.max + 5) break;
    if (!elegidas.some(x => plural(x, w))) elegidas.push(w);
  }
  let pal = armar(elegidas, p.lado);
  if (pal.length < p.min) return null;
  pal = pal.slice(0, p.max);
  const enGrilla = new Set(pal.map(x => x.p));
  const extras = EXTRAS.filter(w => !enGrilla.has(w) && cabe(w, letras));
  let mezcla; do { mezcla = barajar(base.split("")).join(""); } while (mezcla === base && base.length > 2);
  return Object.assign({ letras: mezcla, palabras: pal }, medida(pal), { extras });
}

function generarSerie(cant, planDe, ventana, basesUsadas, temaDe) {
  const serie = [], recientes = [];
  for (let n = 1; n <= cant; n++) {
    const p = planDe(n), prohibidas = new Set(recientes.flat());
    let hecho = null, tema = false;
    // relajar de a poco si no alcanza: más palabras candidatas, luego una palabra menos y, al final, cualquier palabra
    // con pista sin importar su frecuencia (todas las que tienen pista son de uso común)
    for (const relajo of [0, 1, 2, 3]) {
      const q = Object.assign({}, p, { base: relajo === 3 ? Infinity : p.base * (1 + relajo), min: Math.max(2, p.min - (relajo >= 2 ? 1 : 0)) });
      const ok = w => w.length === q.largo && !basesUsadas.has(w) && !prohibidas.has(w);
      const delTema = barajar((temaDe(p) || []).filter(w => ok(w) && RESPUESTAS.includes(w) && rangoDe(w) < q.base * 2));
      for (const w of delTema) { if ((hecho = intentar(w, q, prohibidas))) { tema = true; break; } }
      if (!hecho) {
        const generales = barajar(RESPUESTAS.filter(w => ok(w) && rangoDe(w) < q.base && (relajo === 3 || rangoDe(w) >= (q.baseMin || 0)))).slice(0, 400);
        for (const w of generales) { if ((hecho = intentar(w, q, prohibidas))) break; }
      }
      if (hecho) break;
    }
    if (!hecho) return { serie, falla: n, plan: p };
    basesUsadas.add(hecho.palabras[0].p);
    if (tema) hecho.tema = true; if (p.respiro) hecho.respiro = true; if (p.grande) hecho.grande = true;
    serie.push(hecho);
    recientes.push(hecho.palabras.map(x => x.p)); if (recientes.length > ventana) recientes.shift();
  }
  return { serie };
}

// ---------- niveles normales ----------
const basesUsadas = new Set();
const r = generarSerie(TOTAL, plan, VENTANA, basesUsadas, p => TEMAS[p.mundo]);
fs.writeFileSync(C("niveles.json"), JSON.stringify(r.serie) + "\n");

// ---------- desafío diario: grupo aparte (otra semilla, sin repetir las palabras principales de los niveles) ----------
semilla = 20270101;
// 3 días de 5 letras, 3 de 6 y 1 de 7 (un tablero algo más grande, como el del domingo en los diarios de papel)
const planDiario = n => (n % 7 === 6 ? { largo: 7, min: 5, max: 8, base: 8000, lado: 8 } : { largo: n % 7 >= 3 ? 6 : 5, min: 4, max: 7, base: 4000, lado: 7 });
const d = generarSerie(DIAS, planDiario, VENTANA_DIARIO, basesUsadas, () => null);
fs.writeFileSync(C("diario.json"), JSON.stringify(d.serie) + "\n");

// ---------- informe ----------
const usadas = new Set(r.serie.concat(d.serie).flatMap(l => l.palabras.map(x => x.p)));
console.log(`Pistas usadas para generar: ${MODO} (${RESPUESTAS.length} palabras)`);
console.log(`Niveles: ${r.serie.length} de ${TOTAL}` + (r.falla ? ` · se detuvo en el nivel ${r.falla} (mundo ${r.plan.mundo}, ${r.plan.largo} letras): faltan palabras con pista` : " · completos"));
console.log(`Desafío diario: ${d.serie.length} de ${DIAS} tableros` + (d.falla ? ` · se detuvo en el tablero ${d.falla}` : ""));
console.log(`Con «palabra del lugar»: ${r.serie.filter(l => l.tema).length} · de respiro: ${r.serie.filter(l => l.respiro).length} · grandes: ${r.serie.filter(l => l.grande).length}`);
console.log(`Palabras distintas en uso: ${usadas.size}`);
for (let m = 1; m <= 10; m++) {
  const del = r.serie.slice((m - 1) * 30, m * 30); if (!del.length) break;
  const prom = (del.reduce((s, l) => s + l.palabras.length, 0) / del.length).toFixed(1);
  console.log(`  ${MUNDOS[m - 1].lugar}: ${del.length} niveles, ${prom} palabras por nivel, letras ${[...new Set(del.map(l => l.letras.length))].join("/")}`);
}
