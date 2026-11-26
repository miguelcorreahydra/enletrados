// Dos videos de 20 segundos para el anuncio (partida REAL del juego):
//   dinamico: cómo se juega, a toda velocidad, en 4 pasos, y el pueblo que se enciende.
//   historia: la noche en que el viento se llevó las palabras, Tilde pide ayuda, se juega y el pueblo vuelve a brillar.
// Uso: con npm run dev encendido, node herramientas/videos/guiones.js [dinamico|historia|todos] [carpeta de salida]
"use strict";
const path = require("path");
const { espera, ir, formar, palabrasDe, partida, grabar, BASE } = require("./comun");
const QUE = process.argv[2] || "todos", SALIDA = process.argv[3] || path.join(__dirname, "../demos/salida/videos");

// el pueblo a pantalla completa con un acercamiento lento hacia un punto (en % del dibujo)
async function puebloGrande(p, origen, desde, hasta, ms) {
  return p.evaluate((origen, desde, hasta, ms) => {
    const e = document.querySelector(".escenario"), sv = e.querySelector(".pueblo");
    Object.assign(e.style, { position: "fixed", inset: "0", zIndex: 9000, margin: "0", display: "flex", alignItems: "center", justifyContent: "center" });
    sv.style.transformOrigin = origen;
    sv.animate([{ transform: `scale(${desde})` }, { transform: `scale(${hasta})` }], { duration: ms, easing: "ease-in-out", fill: "forwards" });
    return sv.querySelector(".base").getAttribute("href");
  }, origen, desde, hasta, ms);
}
const progreso = (p, datos) => p.evaluate(d => localStorage.setItem("enl_progreso", JSON.stringify(d)), datos);
const GRITOS = ["¡Bien!", "¡Genial!", "¡Increíble!", "¡Imparable!", "¡Perfecto!"];

// ---------- video 2: dinámico, cómo se juega ----------
const dinamico = {
  async preparar(p) {
    await p.evaluate(() => localStorage.clear());
    const vistos = []; for (let m = 1; m <= 9; m++) vistos.push(m + "e"); // el faro (lugar 10) se enciende al final
    await progreso(p, { hechos: Array.from({ length: 279 }, (_, i) => i + 1), monedas: 520, llegada: "2026-11-01", regreso: true, lugaresVistos: vistos, cartero: { ultimo: Date.now(), hoy: 3 } });
    await ir(p, "/nivel/168/"); const w168 = await palabrasDe(p); await partida(p, 168, w168.filter(w => !["rana", "nata"].includes(w)));
    await ir(p, "/nivel/280/"); const w280 = await palabrasDe(p); await partida(p, 280, w280.filter(w => !["barato", "atajo", "jota"].includes(w)));
    await ir(p, "/nivel/66/"); await espera(900);
  },
  async grabar(p, marca) {
    let g = 0;
    // gancho: tres palabras que golpean al ritmo
    await espera(200); await p.evaluate(() => window.__golpe(["Desliza.", "Forma.", "¡Gana!"], 330));
    for (let i = 0; i < 3; i++) { marca("golpe"); await espera(330); }
    await espera(650); await p.evaluate(() => window.__limpiar());
    // paso 1
    await p.evaluate(() => window.__texto("paso", "<i>1</i>Desliza el dedo por las letras")); marca("paso");
    for (const w of ["paz", "pala"]) { await formar(p, w, w === "paz"); marca("palabra"); await espera(220); await p.evaluate(t => window.__texto("grito", t, 600), GRITOS[g++]); await espera(380); }
    // paso 2: la pista
    marca("corte"); await ir(p, "/nivel/168/"); await p.evaluate(() => window.__destello());
    await p.evaluate(() => { window.__texto("paso", "<i>2</i>Cada palabra tiene su pista");
      document.querySelector(".pista").animate([{ transform: "scale(1)", boxShadow: "0 0 0 0 rgb(226 182 90 / .9)" }, { transform: "scale(1.06)", boxShadow: "0 0 0 10px rgb(226 182 90 / 0)" }, { transform: "scale(1)" }], { duration: 700, iterations: 2 }); });
    marca("paso"); await espera(700);
    for (const w of ["rana", "nata"]) { await formar(p, w); marca("palabra"); await espera(220); await p.evaluate(t => window.__texto("grito", t, 600), GRITOS[g++]); await espera(360); }
    // paso 3 y 4: nivel grande, se completa y se abre el cofre
    marca("corte"); await ir(p, "/nivel/280/"); await p.evaluate(() => window.__destello());
    await p.evaluate(() => window.__texto("paso", "<i>3</i>Si aciertas, vuela a su lugar")); marca("paso");
    const ultimas = ["barato", "atajo", "jota"];
    for (const [i, w] of ultimas.entries()) { await formar(p, w); marca("palabra"); await espera(200); await p.evaluate((t, oro) => window.__texto("grito" + (oro ? " oro" : ""), t, 560), GRITOS[Math.min(g++, 4)], i === 2); await espera(i === 2 ? 250 : 330); }
    await p.evaluate(() => window.__dedo(0, 0, false, false));
    marca("completo"); await espera(500);
    await p.evaluate(() => { window.__limpiar(); window.__texto("paso", "<i>4</i>Gana estrellas, monedas y cofres"); }); marca("paso");
    await espera(900); marca("cofre"); await espera(1100);
    // el pueblo: el faro se enciende
    marca("corte"); await ir(p, "/"); await p.evaluate(() => window.__destello());
    const url = await puebloGrande(p, "86% 22%", 1.35, 1.75, 2900);
    await p.evaluate(() => window.__texto("titulo", "¡Y enciende <b>el pueblo</b>!")); marca("lugar"); await espera(2800);
    await p.evaluate(u => { window.__limpiar(); window.__final(u); }, url); marca("final"); await espera(2400);
  }
};

// ---------- video 3: la historia ----------
const historia = {
  async preparar(p) {
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem("enl_tema", JSON.stringify("oscuro")); });
    await progreso(p, { hechos: [], llegada: "2026-11-26" });
    await ir(p, "/");
    await p.addStyleTag({ content: ".pueblo .luz-lugar { display: none !important; }" }); // todo el pueblo apagado
    await puebloGrande(p, "50% 55%", 1.3, 1.55, 5600);
    await espera(600);
  },
  async grabar(p, marca) {
    // 1) la noche del viento
    await p.evaluate(() => window.__texto("titulo noche", "Una noche de viento se llevó <b>las palabras</b> del pueblo")); marca("viento");
    await espera(200); await p.evaluate(() => window.__viento()); await espera(2700);
    // 2) Tilde pide ayuda
    await p.evaluate(() => { window.__limpiar(); window.__tilde(); }); marca("tilde"); await espera(500);
    await p.evaluate(() => window.__texto("titulo noche", "<b>Tilde</b>, la golondrina, necesita tu ayuda")); await espera(2100);
    // 3) cómo se juega: nivel 1 con la mano que enseña el gesto
    marca("corte"); await p.evaluate(() => localStorage.setItem("enl_tema", JSON.stringify("claro")));
    await ir(p, "/nivel/1/"); await p.evaluate(() => window.__destello()); marca("ritmo");
    await p.evaluate(() => window.__texto("paso", "<i>1</i>Desliza el dedo por las letras")); marca("paso");
    await espera(1600); // se ve la mano del juego haciendo el gesto
    const w = await palabrasDe(p);
    await formar(p, w[0], true); marca("palabra"); await espera(250); await p.evaluate(() => window.__texto("grito", "¡Bien!", 600)); await espera(500);
    await p.evaluate(() => { window.__limpiar(); window.__texto("paso", "<i>2</i>Completa el crucigrama con las pistas"); }); marca("paso"); await espera(500);
    await formar(p, w[1]); marca("palabra"); await p.evaluate(() => window.__dedo(0, 0, false, false));
    await espera(450); marca("completo"); await espera(1700);
    // 4) el día vuelve: la panadería se enciende
    marca("corte"); await ir(p, "/"); await p.evaluate(() => window.__destello());
    const url = await puebloGrande(p, "37% 72%", 1.4, 1.85, 3000);
    await p.evaluate(() => window.__texto("titulo", "Cada palabra le devuelve <b>la luz</b>")); marca("lugar"); await espera(2600);
    // 5) vecinos y postales
    marca("corte");
    await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("enl_progreso")); d.hechos = Array.from({ length: 120 }, (_, i) => i + 1); localStorage.setItem("enl_progreso", JSON.stringify(d)); });
    await ir(p, "/logros/"); await p.evaluate(() => { window.__destello(); scrollTo(0, document.getElementById("album").offsetTop - 70); });
    await p.evaluate(() => window.__texto("titulo al-pie", "Conoce a <b>los vecinos</b> y junta postales")); marca("vecino");
    await espera(600); await p.evaluate(() => { const y0 = scrollY, y1 = document.getElementById("vecinos").offsetTop - 170, t0 = performance.now();
      (function paso(t) { const k = Math.min(1, (t - t0) / 1500); scrollTo(0, y0 + (y1 - y0) * k * k * (3 - 2 * k)); if (k < 1) requestAnimationFrame(paso); })(t0); });
    await espera(1700);
    await p.evaluate(u => { window.__limpiar(); window.__final(u); }, url); marca("final"); await espera(2400);
  }
};

(async () => {
  if (QUE === "dinamico" || QUE === "todos") await grabar("anuncio-dinamico", SALIDA, dinamico, "dinamico");
  if (QUE === "historia" || QUE === "todos") await grabar("anuncio-historia", SALIDA, historia, "historia");
})();
