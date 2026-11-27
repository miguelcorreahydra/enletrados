// Imágenes para la página de Facebook: foto de perfil (1080×1080, se ve en círculo) y portada (1640×924: en celular se
// ve completa; en computador Facebook deja la franja central de 1640×624, así que todo lo importante va ahí).
// Antes, el pueblo en alta resolución: node -e (ver el commit) con componer.js a 1600 px → datos/pueblo-hd.webp
// Uso: node herramientas/marca/fanpage.js → marca/fanpage-perfil-1080.png y marca/fanpage-portada-1640x924.png
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path");
const F = p => path.join(__dirname, "../../fuente", p), M = p => path.join(__dirname, "../../marca", p);
const b64 = f => fs.readFileSync(F(f)).toString("base64");
// el pueblo en alta resolución (las mismas piezas de Kenney que el sitio); se arma antes con componer.js en datos/
const HD = path.join(__dirname, "../../datos/pueblo-hd.webp");
const PUEBLO = fs.existsSync(HD) ? fs.readFileSync(HD).toString("base64") : b64("imagenes/pueblo.webp");
const LETRAS = `@font-face{font-family:Fraunces;font-weight:600;src:url(data:font/woff2;base64,${b64("letras/fraunces-600.woff2")})}
@font-face{font-family:Nunito;font-weight:800;src:url(data:font/woff2;base64,${b64("letras/nunito-800.woff2")})}`;
const TILDE = (ojo, pico) => `<svg viewBox="0 0 64 40"><path d="M4 20C14 6 24 6 31 17s19 12 29-3" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><ellipse cx="33" cy="22" rx="9" ry="5.5" fill="currentColor"/><circle cx="42" cy="19" r="4.6" fill="currentColor"/><circle cx="43.6" cy="18" r="1.2" fill="${ojo}"/><path d="M46 19.5l5 1-5 1.6z" fill="${pico}"/><path d="M25 23l-11 9M26 25l-8 11" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"/></svg>`;

const perfil = `<!doctype html><meta charset="utf-8"><style>${LETRAS}
html,body{margin:0;width:1080px;height:1080px}
body{background:radial-gradient(circle at 50% 38%,#D47449,#A9502D 70%,#8C4125);display:grid;place-items:center;overflow:hidden}
.ave{width:660px;color:#FFF8EE;margin-top:-20px;filter:drop-shadow(0 18px 24px rgb(80 30 12 / .35))}
.chispa{position:absolute;border-radius:50%;background:#FFE7A8;box-shadow:0 0 18px 6px rgb(255 214 120 / .55)}
</style>
<i class="chispa" style="left:300px;top:300px;width:14px;height:14px"></i><i class="chispa" style="left:770px;top:330px;width:10px;height:10px"></i><i class="chispa" style="left:720px;top:720px;width:12px;height:12px"></i>
<div class="ave">${TILDE("#A9502D", "#F3DFAE")}</div>`;

const portada = `<!doctype html><meta charset="utf-8"><style>${LETRAS}
html,body{margin:0;width:1640px;height:924px;overflow:hidden}
body{background:radial-gradient(120% 100% at 72% 45%,#FBF1E2,#F1D9B8);position:relative}
.sol{position:absolute;left:1010px;top:170px;width:120px;height:120px;border-radius:50%;background:#F2C27B;box-shadow:0 0 0 26px rgb(242 194 123 / .25)}
.nube{position:absolute;height:44px;border-radius:44px;background:#FFFCF6;opacity:.9}
.mar{position:absolute;right:-120px;bottom:40px;width:1000px;height:260px;border-radius:50%;background:radial-gradient(#9CC3CC,#6F9EAD)}
.pueblo{position:absolute;right:20px;top:200px;width:820px;filter:drop-shadow(0 28px 34px rgb(46 36 27 / .22))}
.texto{position:absolute;left:130px;top:270px;width:600px}
.tilde{width:120px;color:#2F3E5C;margin-bottom:6px}
h1{margin:0;font:600 112px/1 Fraunces;color:#2E241B;letter-spacing:-1px}h1 span{color:#A9502D}
p{margin:22px 0 0;font:800 36px/1.25 Nunito;color:#6B5D4F}
.chip{display:inline-block;margin-top:30px;padding:16px 30px;border-radius:99px;background:#A9502D;color:#FFF8EE;font:800 32px Nunito;box-shadow:0 7px 0 #7E3A22}
</style>
<div class="sol"></div><div class="nube" style="left:1180px;top:200px;width:150px"></div><div class="nube" style="left:820px;top:240px;width:110px"></div>
<div class="mar"></div><img class="pueblo" src="data:image/webp;base64,${PUEBLO}">
<div class="texto"><div class="tilde">${TILDE("#FBF6EC", "#E08A3C")}</div><h1>En<span>letrados</span></h1>
<p>Forma palabras, completa el crucigrama y devuélvele la luz al pueblo</p><div class="chip">Juega gratis en tu celular</div></div>`;

(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage();
  for (const [html, w, h, archivo] of [[perfil, 1080, 1080, "fanpage-perfil-1080.png"], [portada, 1640, 924, "fanpage-portada-1640x924.png"]]) {
    await p.setViewport({ width: w, height: h }); await p.setContent(html); await p.evaluate(() => document.fonts.ready); await new Promise(r => setTimeout(r, 300));
    await p.screenshot({ path: M(archivo), type: "png" }); console.log(`${archivo}: ${(fs.statSync(M(archivo)).size / 1024).toFixed(0)} KB`);
  }
  await nav.close();
})();
