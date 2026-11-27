// Prueba de la Tienda de Tilde (sitio local, npm run dev encendido): protector de racha y estilos de la rueda.
// Uso: npm run prueba:tienda
"use strict";
const puppeteer = require("puppeteer-core");
const BASE = "http://localhost:8080", espera = ms => new Promise(r => setTimeout(r, ms));
const fallas = [], ok = m => console.log("✓ " + m), mal = m => { fallas.push(m); console.log("✗ " + m); };
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
  const errores = []; p.on("pageerror", e => errores.push(e.message));
  await p.setRequestInterception(true); p.on("request", r => (r.url().startsWith(BASE) ? r.continue() : r.abort()));
  const prog = () => p.evaluate(() => JSON.parse(localStorage.getItem("enl_progreso")));
  const poner = d => p.evaluate(d => { localStorage.clear(); localStorage.setItem("enl_progreso", JSON.stringify(d)); }, d);
  const tocar = async sel => { await p.click(sel); await espera(300); };

  await p.goto(BASE + "/", { waitUntil: "load" }); await poner({ hechos: [1, 2, 3], monedas: 500, protector: 0, llegada: "2026-11-01" });
  await p.goto(BASE + "/", { waitUntil: "load" }); await espera(800);
  const enl = await p.evaluate(() => ({ chip: document.getElementById("monedas").getAttribute("href"), prot: !!document.querySelector('.racha a[href="/tienda/#protector"]'), tarjeta: !document.getElementById("enlace-tienda").hidden }));
  if (enl.chip === "/tienda/" && enl.prot && enl.tarjeta) ok("portada: monedas, tarjeta del protector y «Tienda de Tilde» llevan a la tienda"); else mal("portada: " + JSON.stringify(enl));

  await p.goto(BASE + "/tienda/", { waitUntil: "load" }); await espera(500);
  await tocar('[data-comprar="protector"]'); let x = await prog();
  if (x.monedas === 500 && x.protector === 0) ok("protector: el primer toque solo pide confirmar"); else mal("protector sin confirmar gastó: " + JSON.stringify(x));
  await tocar('[data-comprar="protector"]'); x = await prog();
  if (x.monedas === 350 && x.protector === 1) ok("protector comprado: −150 monedas, 1 protector"); else mal("protector: " + JSON.stringify(x));
  await tocar('[data-comprar="protector"]'); await tocar('[data-comprar="protector"]'); x = await prog();
  const max = await p.evaluate(() => !document.querySelector('[data-comprar="protector"]'));
  if (x.protector === 2 && x.monedas === 200 && max) ok("protector: máximo 2, después ya no se ofrece"); else mal("tope del protector: " + JSON.stringify({ x, max }));

  await tocar('[data-comprar="mar"]'); await tocar('[data-comprar="mar"]'); x = await prog();
  const est = await p.evaluate(() => ({ html: document.documentElement.dataset.estilo, guardado: JSON.parse(localStorage.getItem("enl_estilo")) }));
  if (x.monedas === 0 && x.tienda.includes("mar") && est.html === "mar" && est.guardado === "mar") ok("estilo Mar comprado (−200) y en uso"); else mal("estilo: " + JSON.stringify({ x, est }));
  const sinPlata = await p.evaluate(() => document.querySelector('[data-comprar="bosque"]').disabled);
  if (sinPlata) ok("sin monedas suficientes, el botón queda desactivado"); else mal("se puede comprar sin monedas");

  await p.goto(BASE + "/nivel/1/", { waitUntil: "load" }); await espera(1200);
  const color = await p.evaluate(() => getComputedStyle(document.querySelector(".letra")).borderTopColor);
  if (color === "rgb(156, 195, 204)") ok("en la partida, las fichas usan el estilo Mar"); else mal("las fichas no cambiaron de estilo: " + color);

  await p.evaluate(() => { localStorage.setItem("enl_estilo", JSON.stringify("oro")); });
  await p.goto(BASE + "/nivel/1/", { waitUntil: "load" }); await espera(800);
  const truco = await p.evaluate(() => document.documentElement.dataset.estilo || "clasico");
  if (truco === "clasico") ok("un estilo no comprado, puesto a mano en el navegador, no se aplica"); else mal("se aplicó un estilo no comprado: " + truco);

  await p.goto(BASE + "/tienda/", { waitUntil: "load" }); await espera(400);
  await tocar('[data-usar="mar"]'); await tocar('[data-usar="clasico"]'); const vuelta = await p.evaluate(() => document.documentElement.dataset.estilo || "clasico");
  if (vuelta === "clasico") ok("se puede volver al estilo Clásico"); else mal("no volvió al Clásico");

  if (errores.length) mal("errores de JavaScript: " + errores.join(" | ")); else ok("sin errores de JavaScript");
  await nav.close();
  console.log(fallas.length ? `\n${fallas.length} problema(s) en la tienda` : "\nTienda en orden."); process.exit(fallas.length ? 1 : 0);
})();
