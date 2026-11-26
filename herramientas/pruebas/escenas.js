// Muestra las 10 escenas con todos sus detalles a la vista (para revisarlas de una vez), en modo claro y oscuro.
// Uso: con npm run dev encendido, node herramientas/pruebas/escenas.js [carpeta de salida]
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const SALIDA = process.argv[2] || path.join(__dirname, "capturas"), BASE = "http://localhost:8080";
fs.mkdirSync(SALIDA, { recursive: true });
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 1000, height: 1400, deviceScaleFactor: 1.5 });
  await p.setRequestInterception(true); p.on("request", r => r.url().startsWith(BASE) || r.url().startsWith("data:") ? r.continue() : r.abort());
  const svgs = [];
  for (let m = 1; m <= 10; m++) { await p.goto(`${BASE}/nivel/${(m - 1) * 30 + 1}/`, { waitUntil: "load" }); svgs.push(await p.evaluate(() => document.getElementById("t-escena").innerHTML)); }
  for (const oscuro of [false, true]) {
    await p.goto(`${BASE}/nivel/1/`, { waitUntil: "load" });
    await p.evaluate((svgs, oscuro) => {
      if (oscuro) document.documentElement.dataset.tema = "oscuro";
      document.body.className = ""; document.body.style.cssText = "padding:12px;display:grid;grid-template-columns:repeat(2,1fr);gap:12px;height:auto;overflow:visible";
      [...document.body.children].forEach(c => { if (c.tagName !== "svg" || !c.querySelector("symbol")) c.remove(); });
      svgs.forEach(s => { const d = document.createElement("div"); d.className = "escena-tarjeta"; d.innerHTML = s; d.querySelectorAll(".d").forEach(g => g.classList.add("si")); document.body.appendChild(d); });
    }, svgs, oscuro);
    await p.evaluate(() => Promise.all([...document.querySelectorAll("image")].map(i => new Promise(r => { const im = new Image(); im.onload = im.onerror = r; im.src = i.getAttribute("href"); }))));
    await new Promise(r => setTimeout(r, 1200));
    await p.screenshot({ path: path.join(SALIDA, `escenas${oscuro ? "-oscuro" : ""}.png`), fullPage: true });
  }
  await nav.close(); console.log("Escenas en", SALIDA);
})();
