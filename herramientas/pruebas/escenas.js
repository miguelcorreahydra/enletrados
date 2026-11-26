// Muestra los 10 lugares con todos sus detalles visibles (para revisar las escenas de una vez).
// Uso: node herramientas/pruebas/escenas.js [carpeta de salida]
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const RAIZ = path.join(__dirname, "../.."), F = p => path.join(RAIZ, "fuente", p);
const SALIDA = process.argv[2] || path.join(__dirname, "capturas"); fs.mkdirSync(SALIDA, { recursive: true });
const css = fs.readFileSync(F("juego/estilos.css"), "utf8"), iconos = fs.readFileSync(F("plantillas/iconos.svg"), "utf8");
const nombres = ["panaderia", "plaza", "calle", "puerto", "mirador", "estacion", "kiosco", "casas", "bosque", "faro"];
const html = oscuro => `<!doctype html><html${oscuro ? ' data-tema="oscuro"' : ""}><meta charset="utf-8"><style>${css}
body{padding:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.escena .d{opacity:1}*{animation:none!important}</style><body>${iconos}` +
  nombres.map(n => `<div class="escena-tarjeta">${fs.readFileSync(F(`plantillas/escenas/${n}.svg`), "utf8")}</div>`).join("") + "</body></html>";
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 720, height: 1100, deviceScaleFactor: 2 });
  await p.setRequestInterception(true); p.on("request", r => (r.url().startsWith("data:") || r.url().startsWith("about:") ? r.continue() : r.abort()));
  for (const oscuro of [false, true]) {
    await p.setContent(html(oscuro)); await p.screenshot({ path: path.join(SALIDA, `escenas${oscuro ? "-oscuro" : ""}.png`), fullPage: true });
  }
  await nav.close(); console.log("Escenas en", SALIDA);
})();
