// Genera los íconos PNG de la app instalable a partir del dibujo de Tilde (se corre una vez; los PNG quedan en fuente/publico/).
// Uso: node herramientas/pruebas/iconos.js
"use strict";
const puppeteer = require("puppeteer-core"), path = require("path");
const PUB = path.join(__dirname, "../../fuente/publico");
const tilde = c => `<g><path d="M4 20C14 6 24 6 31 17s19 12 29-3" fill="none" stroke="${c}" stroke-width="6" stroke-linecap="round"/><ellipse cx="33" cy="22" rx="9" ry="5.5" fill="${c}"/><circle cx="42" cy="19" r="4.6" fill="${c}"/><path d="M46 19.5l5 1-5 1.6z" fill="#F3D27E"/><path d="M25 23l-11 9M26 25l-8 11" stroke="${c}" stroke-width="2.6" stroke-linecap="round"/></g>`;
// normal: esquinas redondeadas; «maskable»: fondo completo y Tilde dentro de la zona segura (80 %)
const svg = (lado, mascara) => `<svg xmlns="http://www.w3.org/2000/svg" width="${lado}" height="${lado}" viewBox="0 0 64 64">
  <defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#D27550"/><stop offset="1" stop-color="#A9502F"/></linearGradient></defs>
  <rect width="64" height="64" rx="${mascara ? 0 : 14}" fill="url(#g)"/>
  <g transform="translate(32 32) scale(${mascara ? 0.62 : 0.8}) translate(-30 -21)">${tilde("#FFF8EE")}</g></svg>`;
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage();
  for (const [nombre, lado, mascara] of [["icono-192.png", 192, false], ["icono-512.png", 512, false], ["icono-maskable-512.png", 512, true], ["apple-touch-icon.png", 180, true]]) {
    await p.setViewport({ width: lado, height: lado, deviceScaleFactor: 1 });
    await p.setContent(`<html><body style="margin:0;background:transparent">${svg(lado, mascara)}</body></html>`);
    await p.screenshot({ path: path.join(PUB, nombre), omitBackground: !mascara, clip: { x: 0, y: 0, width: lado, height: lado } });
  }
  await nav.close(); console.log("Íconos listos en fuente/publico/");
})();
