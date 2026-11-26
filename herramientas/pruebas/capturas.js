// Capturas a 360, 390, 768 y 1280 px, errores de JavaScript, desplazamiento lateral y una partida automática.
// Uso: con el servidor local encendido (npm start), node herramientas/pruebas/capturas.js [url base]
// Bloquea todo lo que no sea el sitio local: así nunca se generan impresiones ni eventos de anuncios o analítica.
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const BASE = process.argv[2] || "http://localhost:8080";
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const SALIDA = path.join(__dirname, "capturas"); fs.mkdirSync(SALIDA, { recursive: true });
const TAMANOS = [[360, 740], [390, 844], [768, 1024], [1280, 800]];
const PAGINAS = [["portada", "/"], ["mundos", "/mundos/"], ["nivel-1", "/nivel/1/"], ["nivel-12", "/nivel/12/"], ["nivel-30", "/nivel/30/"], ["nivel-291", "/nivel/291/"], ["diario", "/diario/"], ["logros", "/logros/"], ["ajustes", "/ajustes/"], ["como-jugar", "/como-jugar/"], ["privacidad", "/privacidad/"], ["404", "/no-existe/"]];
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
      await p.goto(BASE + ruta, { waitUntil: "load" }); await espera(1400);
      await lateral(p, nombre, ancho);
      await p.screenshot({ path: path.join(SALIDA, `${nombre}-${sufijo}.png`) });
    }
    ctx.close();
  }
  // partida automática del nivel 1 al 2, a 390 px: animaciones, hoja de nivel completado y progreso
  const { ctx, p } = await nuevaPagina(nav, 390, 844);
  for (const n of [1, 2]) {
    await p.goto(`${BASE}/nivel/${n}/`, { waitUntil: "load" }); await espera(1700);
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
  // nivel 5: cofre y estrellas (se juega desde cero, sin ayudas)
  await p.goto(`${BASE}/nivel/5/`, { waitUntil: "load" }); await espera(1500);
  for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) { await formar(p, w); await espera(1200); }
  await espera(2400); await p.screenshot({ path: path.join(SALIDA, "partida-cofre.png") });
  if (!(await p.evaluate(() => !!document.querySelector(".hoja .cofre")))) problemas.push("Nivel 5: no apareció el cofre");
  // Diario del Pueblo: se juega el tablero del día
  await p.goto(`${BASE}/diario/`, { waitUntil: "load" }); await espera(1800);
  const delDia = await p.evaluate(async () => {
    const cfg = JSON.parse(document.getElementById("datos-diario").textContent), d = new Date();
    const hoy = new Date(d.getFullYear(), d.getMonth(), d.getDate()), ini = new Date(...cfg.inicio.split("-").map((x, i) => i === 1 ? x - 1 : +x));
    const idx = ((Math.round((hoy - ini) / 864e5) % cfg.dias) + cfg.dias) % cfg.dias + 1;
    return (await (await fetch(`/diario/dia/${idx}.json`)).json()).palabras.map(x => x.p);
  });
  for (const w of delDia) { await formar(p, w); await espera(1200); }
  await espera(1800); await p.screenshot({ path: path.join(SALIDA, "diario-completo.png") });
  if (!(await p.evaluate(() => !!document.querySelector(".hoja .resultado")))) problemas.push("Diario: no apareció el resultado para compartir");
  // Navegador de Facebook (Android): después del nivel 3 se ofrece seguir en el navegador del teléfono, con el avance en el enlace
  await p.setUserAgent("Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Mobile Safari/537.36 [FBAN/EMA;FBLC/es_LA;FBAV/450.0]");
  await p.goto(`${BASE}/nivel/3/`, { waitUntil: "load" }); await espera(1500);
  for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) { await formar(p, w); await espera(1200); }
  await espera(2000);
  const enlace = await p.evaluate(() => { const a = document.querySelector('.hoja [data-accion="abrir-externo"]'); if (a) a.scrollIntoView(); return a && a.getAttribute("href"); });
  await espera(400); await p.screenshot({ path: path.join(SALIDA, "navegador-facebook.png") });
  if (!enlace || !enlace.startsWith("intent://")) problemas.push("Navegador de Facebook: no apareció el botón para abrir en el navegador");
  else {
    // el avance viaja: se abre el enlace en un navegador «nuevo» (sin datos) y debe llegar con los mismos niveles
    const ruta = enlace.replace(/^intent:\/\/[^/]+/, "").replace(/#Intent.*$/, "");
    const otro = await nuevaPagina(nav, 390, 844);
    await otro.p.goto(BASE + ruta, { waitUntil: "load" }); await espera(1200);
    const llego = await otro.p.evaluate(() => JSON.parse(localStorage.getItem("enl_progreso") || "{}"));
    const limpia = await otro.p.evaluate(() => !location.search);
    if (!llego.hechos || llego.hechos.length < 4) problemas.push("El avance no llegó al otro navegador");
    if (!limpia) problemas.push("El enlace con el avance quedó en la barra de direcciones");
    await otro.ctx.close();
  }
  await p.setUserAgent((await nav.userAgent()));
  for (const [nombre, ruta] of [["logros-con-progreso", "/logros/"], ["portada-con-progreso", "/"]]) {
    await p.goto(BASE + ruta, { waitUntil: "load" }); await espera(1300);
    await p.screenshot({ path: path.join(SALIDA, nombre + ".png") });
  }
  const progreso = await p.evaluate(() => localStorage.getItem("enl_progreso"));
  console.log("Progreso guardado:", progreso);
  await ctx.close(); await nav.close();
  console.log(problemas.length ? "PROBLEMAS:\n" + problemas.join("\n") : "Sin errores de JavaScript ni desplazamiento lateral.");
  console.log("Capturas en", SALIDA);
})();
