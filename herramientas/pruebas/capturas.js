// Capturas a 360, 390, 768 y 1280 px, errores de JavaScript, desplazamiento lateral y una partida automática.
// Uso: con el servidor local encendido (npm start), node herramientas/pruebas/capturas.js [url base]
// Bloquea todo lo que no sea el sitio local: así nunca se generan impresiones ni eventos de anuncios o analítica.
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8080";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SALIDA = path.join(__dirname, "capturas"); fs.mkdirSync(SALIDA, { recursive: true });
const TAMANOS = [[360, 740], [390, 844], [768, 1024], [1280, 800]];
const PAGINAS = [["portada", "/"], ["mundos", "/mundos/"], ["nivel-1", "/nivel/1/"], ["nivel-12", "/nivel/12/"], ["nivel-30", "/nivel/30/"], ["404", "/no-existe/"]];
const espera = ms => new Promise(r => setTimeout(r, ms));
const problemas = [];

async function nuevaPagina(nav, ancho, alto, oscuro) {
  const ctx = await nav.createBrowserContext(), p = await ctx.newPage();
  await p.setViewport({ width: ancho, height: alto, deviceScaleFactor: 2, isMobile: ancho < 700, hasTouch: ancho < 700 });
  if (oscuro) await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
  await p.setRequestInterception(true);
  p.on("request", r => (r.url().startsWith(BASE) || r.url().startsWith("data:") ? r.continue() : (problemas.push("Bloqueado: " + r.url()), r.abort())));
  p.on("pageerror", e => problemas.push(`[${ancho}px] Error JS: ${e.message}`));
  p.on("console", m => m.type() === "error" && !/404/.test(m.text()) && problemas.push(`[${ancho}px] Consola: ${m.text()}`));
  return { ctx, p };
}
async function lateral(p, nombre, ancho) {
  const sobra = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  if (sobra > 0) problemas.push(`[${ancho}px] ${nombre}: desplazamiento lateral de ${sobra}px`);
}

// Arrastra el dedo por las letras de una palabra, como lo haría una persona.
async function formar(p, palabra) {
  const pts = await p.evaluate(w => {
    const fichas = [...document.querySelectorAll(".letra")], usadas = new Set();
    return w.split("").map(l => { const i = fichas.findIndex((f, j) => !usadas.has(j) && f.textContent === l); usadas.add(i); const r = fichas[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
  }, palabra);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down();
  for (const [x, y] of pts.slice(1)) await p.mouse.move(x, y, { steps: 6 });
  await p.mouse.up();
}

(async () => {
  const nav = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--autoplay-policy=no-user-gesture-required"] });
  for (const [ancho, alto] of TAMANOS) for (const oscuro of [false, true]) {
    if (oscuro && ancho !== 390) continue; // modo oscuro: solo en el tamaño de celular más común
    const { ctx, p } = await nuevaPagina(nav, ancho, alto, oscuro), sufijo = `${ancho}${oscuro ? "-oscuro" : ""}`;
    for (const [nombre, ruta] of PAGINAS) {
      await p.goto(BASE + ruta, { waitUntil: "networkidle0" }); await espera(1400);
      await lateral(p, nombre, ancho);
      await p.screenshot({ path: path.join(SALIDA, `${nombre}-${sufijo}.png`) });
    }
    ctx.close();
  }
  // partida automática del nivel 1 al 2, a 390 px: animaciones, hoja de nivel completado y progreso
  const { ctx, p } = await nuevaPagina(nav, 390, 844);
  for (const n of [1, 2]) {
    await p.goto(`${BASE}/nivel/${n}/`, { waitUntil: "networkidle0" }); await espera(1700);
    if (n === 1) await p.screenshot({ path: path.join(SALIDA, "partida-demo.png") });
    const palabras = await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(w => w.p));
    for (const [i, w] of palabras.entries()) {
      await formar(p, w);
      if (n === 2 && i === 0) { await espera(260); await p.screenshot({ path: path.join(SALIDA, "partida-vuelo.png") }); }
      await espera(1200);
    }
    if (n === 2) await p.screenshot({ path: path.join(SALIDA, "partida-casi.png") });
    await espera(1300); await p.screenshot({ path: path.join(SALIDA, `partida-completado-${n}.png`) });
    const ok = await p.evaluate(() => document.getElementById("velo").classList.contains("ver"));
    if (!ok) problemas.push(`Nivel ${n}: no apareció la pantalla de nivel completado`);
  }
  await p.goto(BASE + "/", { waitUntil: "networkidle0" }); await espera(1200);
  await p.screenshot({ path: path.join(SALIDA, "portada-con-progreso.png") });
  const progreso = await p.evaluate(() => localStorage.getItem("enl_progreso"));
  console.log("Progreso guardado:", progreso);
  await ctx.close(); await nav.close();
  console.log(problemas.length ? "PROBLEMAS:\n" + problemas.join("\n") : "Sin errores de JavaScript ni desplazamiento lateral.");
  console.log("Capturas en", SALIDA);
})();
