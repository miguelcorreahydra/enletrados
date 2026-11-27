// Logo cuadrado de Enletrados (1200×1200 PNG, menos de 150 KB) para la imagen del anuncio con recompensa en Ad Manager.
// Uso: node herramientas/marca/logo.js → marca/enletrados-logo-1200.png
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path");
const F = p => path.join(__dirname, "../../fuente", p), SALIDA = path.join(__dirname, "../../marca/enletrados-logo-1200.png");
const b64 = f => fs.readFileSync(F(f)).toString("base64");
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;font-weight:600;src:url(data:font/woff2;base64,${b64("letras/fraunces-600.woff2")})}
@font-face{font-family:Nunito;font-weight:800;src:url(data:font/woff2;base64,${b64("letras/nunito-800.woff2")})}
html,body{margin:0;width:1200px;height:1200px;background:#fff}
body{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:56px}
.insignia{width:560px;height:560px;border-radius:140px;background:linear-gradient(160deg,#C8693F,#A9502D);box-shadow:0 26px 0 #7E3A22;display:grid;place-items:center}
.insignia svg{width:430px;margin-top:-10px}
h1{margin:0;font:600 178px/1 Fraunces;color:#2E241B;letter-spacing:-2px}h1 span{color:#A9502D}
p{margin:-28px 0 0;font:800 50px/1 Nunito;color:#6B5D4F;letter-spacing:1px}
</style>
<div class="insignia"><svg viewBox="0 0 64 40"><path d="M4 20C14 6 24 6 31 17s19 12 29-3" fill="none" stroke="#FFF8EE" stroke-width="6" stroke-linecap="round"/><ellipse cx="33" cy="22" rx="9" ry="5.5" fill="#FFF8EE"/><circle cx="42" cy="19" r="4.6" fill="#FFF8EE"/><circle cx="43.6" cy="18" r="1.2" fill="#A9502D"/><path d="M46 19.5l5 1-5 1.6z" fill="#F3DFAE"/><path d="M25 23l-11 9M26 25l-8 11" stroke="#FFF8EE" stroke-width="2.6" stroke-linecap="round"/></svg></div>
<h1>En<span>letrados</span></h1><p>Juego de palabras</p>`;
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 1200, height: 1200 });
  await p.setContent(html); await p.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 300));
  await p.screenshot({ path: SALIDA, type: "png" }); await nav.close();
  console.log(`enletrados-logo-1200.png: ${(fs.statSync(SALIDA).size / 1024).toFixed(1)} KB`);
})();
