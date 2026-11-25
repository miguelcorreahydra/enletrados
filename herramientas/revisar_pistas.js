// Revisión automática de las pistas (regla del CLAUDE.md):
//   cada palabra del crucigrama tiene pista; la pista tiene 45 caracteres o menos; no contiene la palabra ni su raíz;
//   no hay palabras bloqueadas (ni en el crucigrama ni entre las palabras extra); no hay pistas repetidas.
// Uso: node herramientas/revisar_pistas.js [--estricto]
//   --estricto: además exige que todas las palabras de los niveles y del diario tengan la pista APROBADA (antes de publicar).
"use strict";
const fs = require("fs"), path = require("path"), L = require("./lib/contenido");
const ESTRICTO = process.argv.includes("--estricto");
const tandas = L.cargarTandas(), ctx = L.contexto(tandas);
let errores = 0, avisos = 0;
const err = m => { errores++; console.log("  ✗ " + m); }, av = m => { avisos++; console.log("  · " + m); };

console.log("Tandas de pistas:");
for (const t of tandas) {
  const c = { aprobada: 0, pendiente: 0, descartada: 0 };
  t.items.forEach(i => c[i.estado]++);
  console.log(`  Tanda ${t.tanda} (${t.titulo}): ${t.items.length} palabras · ${c.aprobada} aprobadas · ${c.pendiente} pendientes · ${c.descartada} descartadas`);
}
console.log("\nAlertas en pistas que no están descartadas:");
for (const t of tandas) for (const i of t.items) {
  if (i.estado === "descartada") continue;
  const a = L.alertas(i, ctx);
  if (a.length) (i.estado === "aprobada" ? err : av)(`[tanda ${t.tanda}, ${i.estado}] ${i.palabra}: ${a.join("; ")}`);
}

const aprobadas = L.pistas("aprobadas", tandas), vigentes = L.pistas("vigentes", tandas);
for (const [nombre, archivo] of [["Niveles", "niveles.json"], ["Desafío diario", "diario.json"]]) {
  const ruta = path.join(L.RAIZ, "fuente/contenido", archivo);
  if (!fs.existsSync(ruta)) continue;
  const lista = JSON.parse(fs.readFileSync(ruta, "utf8"));
  console.log(`\n${nombre} (${lista.length}):`);
  const sinPista = new Set(), sinAprobar = new Set(), extrasMalas = new Set();
  lista.forEach(l => {
    l.palabras.forEach(w => {
      if (!vigentes[w.p]) sinPista.add(w.p); else if (!aprobadas[w.p]) sinAprobar.add(w.p);
      if (ctx.bloqueo.bloqueadas.has(w.p)) err(`palabra bloqueada en el crucigrama: ${w.p}`);
    });
    l.extras.forEach(x => { if (ctx.bloqueo.bloqueadas.has(x)) extrasMalas.add(x); });
  });
  if (sinPista.size) err(`palabras sin pista: ${[...sinPista].join(", ")}`);
  if (extrasMalas.size) err(`palabras bloqueadas entre las extra: ${[...extrasMalas].join(", ")}`);
  if (sinAprobar.size) (ESTRICTO ? err : av)(`${sinAprobar.size} palabras con la pista todavía sin aprobar`);
  if (!sinPista.size && !extrasMalas.size && !sinAprobar.size) console.log("  ✓ todo en orden");
}
console.log(`\n${errores} errores · ${avisos} avisos`);
process.exit(errores ? 1 : 0);
