// Arma la imagen de vista previa para compartir (WhatsApp, Facebook): 1200×630, JPG de menos de 100 KB.
// Es la única imagen del sitio en JPG (excepción aprobada el 27 nov 2026: WhatsApp no siempre muestra WebP en la vista previa).
// Uso: node herramientas/pruebas/imagen_compartir.js   → fuente/publico/compartir.jpg
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const F = p => path.join(__dirname, "../../fuente", p), SALIDA = F("publico/compartir.jpg");
const b64 = f => fs.readFileSync(F(f)).toString("base64");
const html = `<!doctype html><meta charset="utf-8"><style>
@font-face{font-family:Fraunces;font-weight:600;src:url(data:font/woff2;base64,${b64("letras/fraunces-600.woff2")})}
@font-face{font-family:Nunito;font-weight:800;src:url(data:font/woff2;base64,${b64("letras/nunito-800.woff2")})}
body{margin:0;width:1200px;height:630px;overflow:hidden;background:radial-gradient(120% 90% at 70% 40%,#FBF1E2,#F1D9B8);font-family:Nunito}
.pueblo{position:absolute;right:-50px;top:60px;width:660px;filter:drop-shadow(0 24px 30px rgb(46 36 27 / .22))}
.mar{position:absolute;right:-60px;bottom:-60px;width:760px;height:200px;border-radius:50%;background:radial-gradient(#9CC3CC,#6F9EAD)}
.texto{position:absolute;left:70px;top:150px;width:440px}
h1{margin:0;font:600 92px/1 Fraunces;color:#2E241B}h1 span{color:#C0603A}
p{margin:22px 0 0;font:800 28px/1.25 Nunito;color:#6B5D4F}
.chip{display:inline-block;margin-top:30px;padding:14px 26px;border-radius:99px;background:#C0603A;color:#FFF8EE;font:800 28px Nunito;box-shadow:0 6px 0 #7E3A22}
.tilde{position:absolute;left:70px;top:70px;width:110px}
</style>
<div class="mar"></div><img class="pueblo" src="data:image/webp;base64,${b64("imagenes/pueblo.webp")}">
<svg class="tilde" viewBox="0 0 64 40"><path d="M4 20C14 6 24 6 31 17s19 12 29-3" fill="none" stroke="#2F3E5C" stroke-width="6" stroke-linecap="round"/><ellipse cx="33" cy="22" rx="9" ry="5.5" fill="#2F3E5C"/><ellipse cx="34" cy="24.5" rx="6" ry="2.8" fill="#FBF6EC"/><circle cx="42" cy="19" r="4.6" fill="#2F3E5C"/><circle cx="43.6" cy="18" r="1.1" fill="#FBF6EC"/><path d="M46 19.5l5 1-5 1.6z" fill="#E08A3C"/><path d="M25 23l-11 9M26 25l-8 11" stroke="#2F3E5C" stroke-width="2.6" stroke-linecap="round"/></svg>
<div class="texto"><h1>En<span>letrados</span></h1><p>Forma palabras, completa el crucigrama y devuélvele la luz al pueblo</p><div class="chip">Juega gratis</div></div>`;
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 1200, height: 630 });
  await p.setContent(html); await p.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 300));
  for (const q of [86, 80, 74, 68]) {
    await p.screenshot({ path: SALIDA, type: "jpeg", quality: q });
    const kb = fs.statSync(SALIDA).size / 1024; if (kb < 100) { console.log(`compartir.jpg: ${kb.toFixed(1)} KB (calidad ${q})`); break; }
  }
  await nav.close();
})();
