// Contenido de Enletrados, en un solo lugar: pistas por tandas, lista de bloqueo y revisión automática.
// Lo usan generar.js, construir.js, revisar_pistas.js, probar_niveles.js y la página local /revisar/.
"use strict";
const fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "..", ".."), C = p => path.join(RAIZ, "fuente/contenido", p);
const DIR_TANDAS = C("tandas"), MAX_PISTA = 45;

// Minúsculas sin tildes; la ñ se conserva (año ≠ ano).
const normal = s => String(s).toLowerCase().replace(/ñ/g, "\u0001").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/\u0001/g, "ñ");
const tokens = s => normal(s).split(/[^a-zñ]+/).filter(Boolean);

// ---------- lista de bloqueo ----------
function cargarBloqueo() {
  const b = JSON.parse(fs.readFileSync(C("bloqueo.json"), "utf8"));
  const bloqueadas = new Set(), motivo = new Map();
  const agregar = (w, m) => { w = normal(w); for (const f of [w, w + "s", w + "es"]) { bloqueadas.add(f); if (!motivo.has(f)) motivo.set(f, m); } };
  for (const [m, lista] of Object.entries(b.bloqueadas)) lista.forEach(w => agregar(w, m));
  const decisiones = b.decisiones || {};
  for (const [w, m] of Object.entries(b.dudosas)) if (decisiones[w] !== "permitir") agregar(w, "dudosa: " + m);
  return { bloqueadas, motivo, dudosas: b.dudosas, decisiones, crudo: b };
}
function guardarDecision(palabra, decision) {
  const b = JSON.parse(fs.readFileSync(C("bloqueo.json"), "utf8"));
  b.decisiones = b.decisiones || {};
  if (decision) b.decisiones[palabra] = decision; else delete b.decisiones[palabra];
  fs.writeFileSync(C("bloqueo.json"), JSON.stringify(b, null, 2) + "\n");
}

// ---------- tandas de pistas ----------
// Cada tanda: fuente/contenido/tandas/tanda-NN.json con { tanda, titulo, creada, items: [{ palabra, pista, estado, original?, nota? }] }.
// estado: "pendiente" | "aprobada" | "descartada". Al juego solo entran las aprobadas.
function cargarTandas() {
  if (!fs.existsSync(DIR_TANDAS)) return [];
  return fs.readdirSync(DIR_TANDAS).filter(f => /^tanda-\d+\.json$/.test(f)).sort()
    .map(f => Object.assign(JSON.parse(fs.readFileSync(path.join(DIR_TANDAS, f), "utf8")), { archivo: f }));
}
// Una línea por palabra: así los cambios se leen bien en GitHub.
function guardarTanda(t) {
  const { archivo, ...datos } = t;
  const cuerpo = datos.items.map(i => "    " + JSON.stringify(i)).join(",\n");
  const cabeza = JSON.stringify({ tanda: datos.tanda, titulo: datos.titulo, creada: datos.creada });
  fs.writeFileSync(path.join(DIR_TANDAS, archivo || `tanda-${String(datos.tanda).padStart(2, "0")}.json`),
    cabeza.slice(0, -1) + ',\n  "items": [\n' + cuerpo + "\n  ]\n}\n");
}
// modo "aprobadas" (lo que entra al juego) o "vigentes" (aprobadas y pendientes: solo para prever cuántos niveles saldrán)
function pistas(modo = "aprobadas", tandas = cargarTandas()) {
  const m = {};
  for (const t of tandas) for (const i of t.items) {
    if (i.estado === "aprobada" || (modo === "vigentes" && i.estado === "pendiente")) m[i.palabra] = i.pista;
  }
  return m;
}

// ---------- revisión automática de una pista ----------
function prefijoComun(a, b) { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; }
function alertas(item, ctx) {
  const r = [], w = normal(item.palabra), p = item.pista || "";
  if (!p.trim()) r.push("Sin pista");
  if (p.length > MAX_PISTA) r.push(`Tiene ${p.length} caracteres (máximo ${MAX_PISTA})`);
  // la pista no puede contener la palabra ni su raíz («pie» no se define con «pies»)
  const umbral = Math.max(3, Math.min(w.length, 5) - 1);
  const choca = tokens(p).filter(t => t.length >= 3 && prefijoComun(t, w) >= umbral);
  if (choca.length) r.push("Contiene la palabra o su raíz: " + [...new Set(choca)].join(", "));
  if (ctx.bloqueo.bloqueadas.has(w)) r.push("Palabra bloqueada (" + ctx.bloqueo.motivo.get(w) + ")");
  const malas = tokens(p).filter(t => ctx.bloqueo.bloqueadas.has(t) && !/^dudosa/.test(ctx.bloqueo.motivo.get(t)));
  if (malas.length) r.push("La pista usa una palabra bloqueada: " + malas.join(", "));
  const otras = ctx.porPista.get(normal(p).trim()) || [];
  if (otras.length > 1) r.push("Misma pista que: " + otras.filter(x => x !== item.palabra).join(", "));
  if (!/^[a-zñ]{3,8}$/.test(w)) r.push("La palabra debe tener de 3 a 8 letras");
  if ((ctx.repetidas.get(w) || 0) > 1) r.push("La palabra está en más de una tanda");
  return r;
}
function contexto(tandas = cargarTandas()) {
  const porPista = new Map(), repetidas = new Map();
  for (const t of tandas) for (const i of t.items) {
    if (i.estado === "descartada") continue;
    const k = normal(i.pista || "").trim(); porPista.set(k, (porPista.get(k) || []).concat(i.palabra));
    repetidas.set(normal(i.palabra), (repetidas.get(normal(i.palabra)) || 0) + 1);
  }
  return { bloqueo: cargarBloqueo(), porPista, repetidas };
}

module.exports = { RAIZ, MAX_PISTA, normal, tokens, cargarBloqueo, guardarDecision, cargarTandas, guardarTanda, pistas, alertas, contexto };
