// Prueba la app sin conexión: el service worker debe servir lo ya visitado y la página «sin conexión» para lo demás.
// Uso: node herramientas/pruebas/sin_conexion.js (con dist/ ya armado)
// Levanta su propio servidor en el puerto 8099 y lo apaga a mitad de la prueba: así la falta de conexión es real
// (la emulación de Chrome no corta las peticiones del service worker).
// El sitio local no pide nada externo; por eso esta prueba no intercepta peticiones, que desactivaría el service worker.
"use strict";
const puppeteer = require("puppeteer-core"), path = require("path"), { spawn } = require("child_process");
const BASE = "http://localhost:8099", espera = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const srv = spawn(process.execPath, [path.join(__dirname, "../servidor.js"), "8099"], { stdio: "ignore" }); await espera(800);
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(), fallas = [];
  p.on("pageerror", e => fallas.push("Error JS: " + e.message));
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.evaluate(() => navigator.serviceWorker.ready); await espera(800);
  await p.goto(BASE + "/nivel/2/", { waitUntil: "load" }); await espera(500);
  srv.kill(); await espera(500);
  for (const [ruta, esperado] of [["/", "Devuélvele las palabras"], ["/nivel/2/", "Nivel 2"], ["/nivel/1/", "Nivel 1"], ["/nivel/77/", "Estás sin conexión"]]) {
    try { await p.goto(BASE + ruta, { waitUntil: "load" }); const t = await p.evaluate(() => document.body.innerText);
      console.log((t.includes(esperado) ? "✓ " : "✗ ") + ruta + " → " + esperado + (t.includes(esperado) ? "" : " · se vio: " + t.slice(0, 80).replace(/\n/g, " "))); if (!t.includes(esperado)) fallas.push(ruta);
    } catch (e) { console.log("✗ " + ruta + ": " + e.message); fallas.push(ruta); }
  }
  await nav.close(); console.log(fallas.length ? "PROBLEMAS: " + fallas.join(", ") : "Sin conexión: todo en orden."); process.exit(fallas.length ? 1 : 0);
})();
