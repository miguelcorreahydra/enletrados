// Prueba de los anuncios de Ad Manager con el GPT simulado (nunca pide anuncios reales: regla 8).
// Uso: con npm run dev encendido, npm run prueba:anuncios. Arma dist/ con --anuncios-prueba (unidades falsas), revisa y al
// final vuelve a armar dist/ normal.
//  1. El tag de Google se pide solo después de que la página cargó, y el muro de ofertas queda apagado.
//  2. Portada: display y anchor. Niveles 1 y 2: nada, y sus enlaces no disparan la viñeta. Nivel 3 en adelante: viñeta.
//     Nunca hay anchor ni display durante la partida.
//  3. Recompensa: con el anuncio visto da 2 letras; cerrado antes no da nada; sin anuncio, Tilde regala 1 letra.
//  4. Nivel completado: aparece el display debajo de los botones.
//  5. Con la CSP de anuncios activos no hay bloqueos ni errores, y no sale ningún pedido externo fuera del tag simulado.
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const BASE = "http://localhost:8080", RAIZ = path.join(__dirname, "../.."), DIST = path.join(RAIZ, "dist");
const GPT = "https://securepubads.g.doubleclick.net/tag/js/gpt.js", SIM = fs.readFileSync(path.join(__dirname, "gpt_simulado.js"), "utf8");
const espera = ms => new Promise(r => setTimeout(r, ms));
const fallas = [], ok = m => console.log("✓ " + m), mal = m => { fallas.push(m); console.log("✗ " + m); };
const construir = (...a) => execFileSync("node", [path.join(RAIZ, "herramientas/construir.js"), ...a], { cwd: RAIZ, stdio: "pipe" });

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
  construir("--anuncios-prueba");
  try {
    const cab = fs.readFileSync(path.join(DIST, "_headers"), "utf8"), CSP = cab.match(/Content-Security-Policy: (.*)/)[1];
    const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    const p = await nav.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const avisos = [], externos = []; let pedidoGpt = 0;
    p.on("pageerror", e => avisos.push("Error JS: " + e.message));
    p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) avisos.push("CSP: " + m.text()); });
    await p.setRequestInterception(true);
    p.on("request", async r => {
      const u = r.url();
      if (u.startsWith(GPT)) { pedidoGpt = Date.now(); return r.respond({ status: 200, contentType: "application/javascript", body: SIM }); }
      if (u.startsWith("data:")) return r.continue();
      if (!u.startsWith(BASE)) { externos.push(u); return r.abort(); }
      if (r.resourceType() !== "document") return r.continue();
      try { const res = await fetch(u), cuerpo = (await res.text()).replace(/<script>\(function\(\)\{var s=new EventSource\("\/__recarga"\)[\s\S]*?<\/script>/, "");
        r.respond({ status: res.status, headers: { "content-type": res.headers.get("content-type") || "text/html", "content-security-policy": CSP }, body: cuerpo });
      } catch (e) { r.abort(); }
    });
    const ir = async (ruta, ms = 2600) => { pedidoGpt = 0; await p.goto(BASE + ruta, { waitUntil: "load" }); const cargo = Date.now(); await espera(ms); return cargo; };
    const slots = () => p.evaluate(() => (window.__gpt ? window.__gpt.slots.filter(s => s.vivo !== false || s.tipo === "recompensa").map(s => s.tipo + ":" + s.ruta.split("/").pop()) : null));
    const progreso = d => p.evaluate(d => { localStorage.clear(); localStorage.setItem("enl_progreso", JSON.stringify(d)); }, d);

    // 1) portada
    await ir("/"); await progreso({ hechos: [1, 2], monedas: 100, llegada: "2026-11-01" });
    const cargo = await ir("/");
    const r1 = await p.evaluate(() => ({ modo: document.documentElement.dataset.anuncios, fc: (() => { let x = null; window.googlefc.controlledMessagingFunction({ proceed: v => (x = v) }); return x; })() }));
    if (r1.modo === "activos" && pedidoGpt && pedidoGpt - cargo >= 900) ok(`el tag de Google se pide ${((pedidoGpt - cargo) / 1000).toFixed(1)} s después de cargar la página`); else mal("el tag de Google se pidió antes de tiempo o no se pidió");
    if (r1.fc === false) ok("el muro de ofertas queda apagado (controlledMessagingFunction → proceed(false))"); else mal("el muro de ofertas no está bloqueado");
    const sp = await slots();
    if (sp && sp.includes("display:enl_prueba_display_portada") && sp.includes("anchor:enl_prueba_anchor") && !sp.some(s => /vineta|recompensa/.test(s))) ok("portada: display y anchor, sin viñeta ni recompensa");
    else mal("portada: espacios inesperados " + JSON.stringify(sp));

    // 2) niveles
    await ir("/nivel/1/"); const s1 = await slots();
    if (s1 && s1.length === 0) ok("nivel 1: ningún anuncio"); else mal("nivel 1 con anuncios: " + JSON.stringify(s1));
    await ir("/nivel/2/", 2000);
    const sinVineta = await p.evaluate(() => [...document.querySelectorAll("a")].every(a => a.dataset.googleInterstitial === "false"));
    if (sinVineta) ok("nivel 2: todos los enlaces llevan la viñeta apagada"); else mal("nivel 2: hay enlaces sin data-google-interstitial=\"false\"");
    await ir("/nivel/3/"); const s3 = await slots();
    if (s3 && s3.length === 1 && s3[0] === "vineta:enl_prueba_vineta") ok("nivel 3: solo la viñeta (sin anchor ni display durante la partida)"); else mal("nivel 3: " + JSON.stringify(s3));
    await ir("/diario/"); const sd = await slots();
    if (sd && sd.length === 0) ok("diario: ningún anuncio durante la partida"); else mal("diario con anuncios: " + JSON.stringify(sd));

    // 3) recompensa: visto, cerrado y sin anuncio
    const pedir = async modo => {
      await progreso({ hechos: [1, 2, 3, 4], monedas: 0, gratis: 0, llegada: "2026-11-01" });
      await ir("/nivel/5/", 2600); await p.evaluate(m => (window.__gptModo = m), modo);
      const antes = await p.evaluate(() => document.querySelectorAll(".celda.revelada").length);
      await p.click("#b-letra"); await espera(500);
      const hay = await p.$('[data-accion="ver-letra"]'); if (!hay) return { oferta: false };
      await hay.click(); await espera(9500);
      const despues = await p.evaluate(() => document.querySelectorAll(".celda.revelada").length);
      return { oferta: true, letras: despues - antes, n: await p.evaluate(() => (JSON.parse(localStorage.getItem("enl_recompensas") || "null") || { n: 0 }).n) };
    };
    const rv = await pedir("ok"), rc = await pedir("cerrar"), rs = await pedir("vacio");
    if (rv.oferta && rv.letras === 2 && rv.n === 1) ok("recompensa vista: 2 letras y se cuenta en el tope diario"); else mal("recompensa vista: " + JSON.stringify(rv));
    if (rc.oferta && rc.letras === 0 && rc.n === 0) ok("recompensa cerrada antes de tiempo: no da premio"); else mal("recompensa cerrada: " + JSON.stringify(rc));
    if (rs.oferta && rs.letras === 1 && rs.n === 0) ok("sin anuncio disponible: Tilde regala 1 letra"); else mal("sin anuncio: " + JSON.stringify(rs));

    // 4) nivel completado
    await progreso({ hechos: [1, 2, 3, 4], monedas: 100, llegada: "2026-11-01" }); await ir("/nivel/5/", 2600);
    for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) { await formar(p, w); await espera(1200); }
    await espera(2500);
    const fin = await p.evaluate(() => { const d = document.querySelector(".espacio-anuncio.real"), b = document.querySelector("a.con-vineta");
      return { slots: window.__gpt.slots.filter(s => s.tipo === "display").map(s => s.ruta.split("/").pop()), lleno: !!(d && d.querySelector(".gpt-sim")),
        distancia: d && b ? Math.round(d.getBoundingClientRect().top - b.getBoundingClientRect().bottom) : null }; });
    if (fin.slots.includes("enl_prueba_display_nivel") && fin.lleno) ok(`nivel completado: display a ${fin.distancia} px del botón «Siguiente nivel»`); else mal("nivel completado: " + JSON.stringify(fin));
    if (fin.distancia !== null && fin.distancia < 32) mal("el display quedó a menos de 32 px de los botones");

    // 5) CSP y pedidos externos
    if (avisos.length) mal("problemas con la CSP o errores:\n   " + [...new Set(avisos)].slice(0, 6).join("\n   ")); else ok("sin bloqueos de la CSP ni errores de JavaScript");
    if (externos.length) mal("pedidos externos inesperados: " + [...new Set(externos)].slice(0, 5).join(", ")); else ok("ningún pedido externo fuera del tag (simulado)");
    await nav.close();
  } finally {
    construir(); // dist/ vuelve a quedar normal (anuncios simulados)
  }
  console.log(fallas.length ? `\n${fallas.length} problema(s) con los anuncios` : "\nAnuncios en orden.");
  process.exit(fallas.length ? 1 : 0);
})();
