// Prueba de los anuncios (Groone + Ad Manager) con groone.js real (copia local en datos/groone/) y el GPT simulado.
// Nunca pide anuncios reales: todo pedido a Google o a Groone se bloquea o se simula (regla 8).
// Uso: con npm run dev encendido, npm run prueba:anuncios. Arma dist/ con --anuncios-prueba, revisa y lo deja normal.
// La copia de groone.js se baja con: curl -o datos/groone/groone.js https://genius.groone.com/groone.js
//  1. Muro de ofertas apagado. groone.js se carga después de la página, nunca durante la partida.
//  2. Portada: Content1 y anchor arriba. Cómo jugar: Content2. Niveles: nada mientras se juega; al completar, Content3
//     (y la viñeta desde el nivel 3). Diario: nada mientras se juega. Los niveles 1 y 2 no disparan la viñeta.
//  3. Recompensa: con el anuncio visto da 2 letras; cerrado antes no da nada; sin anuncio, Tilde regala 1 letra.
//  4. El display de «nivel completado» queda a 32 px o más de los botones.
//  5. Con la CSP de anuncios activos no hay bloqueos ni errores.
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const BASE = "http://localhost:8080", RAIZ = path.join(__dirname, "../.."), DIST = path.join(RAIZ, "dist");
const GPT = "https://securepubads.g.doubleclick.net/tag/js/gpt.js", GROONE = "https://genius.groone.com/groone.js";
const SIM = fs.readFileSync(path.join(__dirname, "gpt_simulado.js"), "utf8"), COPIA = path.join(RAIZ, "datos/groone/groone.js");
const espera = ms => new Promise(r => setTimeout(r, ms));
const fallas = [], ok = m => console.log("✓ " + m), mal = m => { fallas.push(m); console.log("✗ " + m); };
const construir = (...a) => execFileSync("node", [path.join(RAIZ, "herramientas/construir.js"), ...a], { cwd: RAIZ, stdio: "pipe" });

async function formar(p, palabra) {
  const pts = await p.evaluate(w => { const f = [...document.querySelectorAll(".letra")], u = new Set(); return w.split("").map(l => { const i = f.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = f[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, palabra);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const [x, y] of pts.slice(1)) await p.mouse.move(x, y, { steps: 6 }); await p.mouse.up();
}

(async () => {
  if (!fs.existsSync(COPIA)) { console.log("Falta la copia de groone.js en datos/groone/ (ver el encabezado de este archivo)."); process.exit(1); }
  const GRO = fs.readFileSync(COPIA, "utf8");
  construir("--anuncios-prueba");
  try {
    const CSP = fs.readFileSync(path.join(DIST, "_headers"), "utf8").match(/Content-Security-Policy: (.*)/)[1];
    const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    const p = await nav.newPage(); await p.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true });
    const avisos = [], externos = new Set(); let pedidoGroone = 0;
    p.on("pageerror", e => avisos.push("Error JS: " + e.message));
    p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) avisos.push("CSP: " + m.text()); });
    await p.setRequestInterception(true);
    p.on("request", async r => {
      const u = r.url();
      if (u.startsWith(GPT)) return r.respond({ status: 200, contentType: "application/javascript", headers: { "access-control-allow-origin": "*" }, body: SIM }); // el GPT real responde con CORS
      if (u.startsWith(GROONE)) { pedidoGroone = Date.now(); return r.respond({ status: 200, contentType: "application/javascript", body: GRO }); }
      if (u.startsWith("data:")) return r.continue();
      // API de Groone (valores clave y conteo de páginas): respuesta vacía simulada, sin contactar a Groone
      if (/^https:\/\/(genius|data)\.groone\.com\/api\//.test(u)) { externos.add(new URL(u).host + " (simulado)"); return r.respond({ status: 200, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: "{}" }); }
      if (!u.startsWith(BASE)) { externos.add(new URL(u).host); return r.abort(); } // API de Groone y demás: bloqueados
      if (r.resourceType() !== "document") return r.continue();
      try { const res = await fetch(u), cuerpo = (await res.text()).replace(/<script>\(function\(\)\{var s=new EventSource\("\/__recarga"\)[\s\S]*?<\/script>/, "");
        r.respond({ status: res.status, headers: { "content-type": res.headers.get("content-type") || "text/html", "content-security-policy": CSP }, body: cuerpo });
      } catch (e) { r.abort(); }
    });
    const ir = async (ruta, ms = 3000) => { pedidoGroone = 0; await p.goto(BASE + ruta, { waitUntil: "load" }); const t = Date.now(); await espera(ms); return t; };
    const estado = () => p.evaluate(() => {
      const s = document.getElementById("grooneads");
      return { groone: !!s, anchor: s && s.getAttribute("data-anchor"), vineta: s && s.getAttribute("data-interstitial"),
        slots: window.__gpt ? window.__gpt.slots.map(x => x.tipo + ":" + x.ruta.split("/").pop()) : [] };
    });
    const progreso = d => p.evaluate(d => { localStorage.clear(); localStorage.setItem("enl_progreso", JSON.stringify(d)); }, d);
    const completar = async () => { for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) { await formar(p, w); await espera(1200); } await espera(3000); };

    // 1-2) portada y cómo jugar
    await ir("/"); await progreso({ hechos: [1, 2], monedas: 100, llegada: "2026-11-01" });
    const cargo = await ir("/");
    const fc = await p.evaluate(() => { let x = null; window.googlefc.controlledMessagingFunction({ proceed: v => (x = v) }); return x; });
    if (fc === false) ok("muro de ofertas apagado"); else mal("el muro de ofertas no está bloqueado");
    if (pedidoGroone && pedidoGroone - cargo >= 900) ok(`groone.js se pide ${((pedidoGroone - cargo) / 1000).toFixed(1)} s después de cargar la página`); else mal("groone.js se pidió antes de tiempo o no se pidió");
    const ep = await estado();
    if (ep.slots.some(s => /^display:Enletrados_Content1_/.test(s)) && ep.anchor === "TOP" && !ep.vineta) ok("portada: Content1 y anchor arriba, sin viñeta (" + ep.slots.join(", ") + ")");
    else mal("portada: " + JSON.stringify(ep));
    await p.evaluate(() => { const d = document.querySelector(".espacio-anuncio.real"); d && d.scrollIntoView({ block: "center" }); }); await espera(400);
    await p.screenshot({ path: path.join(__dirname, "capturas", "anuncio-portada.png") });
    await ir("/como-jugar/"); const ec = await estado();
    if (ec.slots.some(s => /^display:Enletrados_Content2_/.test(s))) ok("cómo jugar: Content2"); else mal("cómo jugar: " + JSON.stringify(ec));

    // 2) niveles y diario
    await progreso({ hechos: [], monedas: 100, llegada: "2026-11-01" }); await ir("/nivel/1/");
    const e1 = await estado(); if (!e1.groone && e1.slots.length === 1 && /^anchor:enl_prueba_anchor_juego/.test(e1.slots[0])) ok("nivel 1 mientras se juega: solo el anchor de arriba (sin groone, display ni viñeta)"); else mal("nivel 1 en juego: " + JSON.stringify(e1));
    // el juego no se mueve con el anchor (decisión del usuario): ni al aparecer ni al ocultarlo
    const pos = () => p.evaluate(() => Math.round(document.querySelector(".cabecera").getBoundingClientRect().top) + "/" + Math.round(document.getElementById("rueda").getBoundingClientRect().top));
    const antes = await pos(); await p.evaluate(() => window.__gptAnchorOcultar()); await espera(800); const despues = await pos();
    const anc = await p.evaluate(() => !!document.querySelector('[id^="fuera-"]'));
    if (anc && antes === despues) ok("el anchor sale encima y el juego no se mueve (ni al ocultarlo)"); else mal("el juego se movió o no hubo anchor: " + JSON.stringify({ anc, antes, despues }));
    await completar(); const e1b = await estado();
    if (e1b.slots.some(s => /^display:Enletrados_Content3_/.test(s)) && !e1b.vineta && !e1b.anchor) ok("nivel 1 completado: Content3, sin viñeta ni anchor"); else mal("nivel 1 completado: " + JSON.stringify(e1b));
    await ir("/nivel/2/", 1500);
    if (await p.evaluate(() => [...document.querySelectorAll("a")].every(a => a.dataset.googleInterstitial === "false"))) ok("nivel 2: todos los enlaces con la viñeta apagada"); else mal("nivel 2: hay enlaces que podrían disparar la viñeta");
    await progreso({ hechos: [1, 2], monedas: 100, llegada: "2026-11-01" }); await ir("/nivel/3/");
    const e3 = await estado(); if (!e3.groone && e3.slots.every(s => s.startsWith("anchor:"))) ok("nivel 3 mientras se juega: solo el anchor de arriba"); else mal("nivel 3 en juego: " + JSON.stringify(e3));
    await completar(); const e3b = await estado();
    const fin = await p.evaluate(() => { const d = document.querySelector(".espacio-anuncio.real"), b = document.querySelector("a.con-vineta");
      return { distancia: d && b ? Math.round(d.getBoundingClientRect().top - b.getBoundingClientRect().bottom) : null, lleno: !!(d && d.querySelector(".gpt-sim")) }; });
    if (e3b.vineta === "true" && e3b.slots.some(s => /^display:Enletrados_Content3_/.test(s)) && fin.lleno) ok(`nivel 3 completado: Content3 y viñeta para «Siguiente nivel» (${e3b.slots.join(", ")})`); else mal("nivel 3 completado: " + JSON.stringify({ e3b, fin }));
    const CAP = path.join(__dirname, "capturas"); fs.mkdirSync(CAP, { recursive: true });
    await p.evaluate(() => { const d = document.querySelector(".espacio-anuncio.real"); d && d.scrollIntoView({ block: "center" }); }); await espera(400);
    await p.screenshot({ path: path.join(CAP, "anuncio-nivel-completado.png") });
    const centro = await p.evaluate(() => [...document.querySelectorAll(".espacio-anuncio.real .gpt-sim")].map(f => { const r = f.getBoundingClientRect(), c = f.closest(".espacio-anuncio").getBoundingClientRect(); return Math.round(Math.abs((r.left - c.left) - (c.right - r.right))); }));
    if (centro.length && centro.every(d => d <= 2)) ok("el anuncio queda centrado en su espacio"); else mal("anuncio descentrado (diferencia de márgenes en px): " + JSON.stringify(centro));
    if (fin.distancia !== null && fin.distancia >= 32) ok(`el display queda a ${fin.distancia} px de los botones`); else mal("el display quedó cerca de los botones: " + fin.distancia);
    await progreso({ hechos: Array.from({ length: 290 }, (_, i) => i + 1), monedas: 100, llegada: "2026-11-01" }); await ir("/nivel/291/");
    const eg = await estado();
    if (!eg.slots.length) ok("nivel 291 (crucigrama grande): sin anchor"); else mal("nivel grande con anuncio: " + JSON.stringify(eg));
    await ir("/diario/"); const ed = await estado();
    if (!ed.groone) ok("diario mientras se juega: nada de anuncios"); else mal("diario en juego: " + JSON.stringify(ed));

    // 3) recompensa (unidad de prueba; groone.js no interviene)
    const pedir = async modo => {
      await progreso({ hechos: [1, 2, 3, 4], monedas: 0, gratis: 0, llegada: "2026-11-01" });
      await ir("/nivel/5/", 2600); await p.evaluate(m => (window.__gptModo = m), modo);
      const antes = await p.evaluate(() => document.querySelectorAll(".celda.revelada").length);
      await p.click("#b-letra"); await espera(500);
      const b = await p.$('[data-accion="ver-letra"]'); if (!b) return { oferta: false };
      await b.click(); await espera(9500);
      return { oferta: true, letras: (await p.evaluate(() => document.querySelectorAll(".celda.revelada").length)) - antes,
        n: await p.evaluate(() => (JSON.parse(localStorage.getItem("enl_recompensas") || "null") || { n: 0 }).n), groone: (await estado()).groone };
    };
    const rv = await pedir("ok"), rc = await pedir("cerrar"), rs = await pedir("vacio");
    const rl = await (async () => { await progreso({ hechos: [1, 2, 3, 4], monedas: 0, gratis: 0, llegada: "2026-11-01" }); await ir("/nivel/5/", 2600);
      await p.evaluate(() => (window.__gptModo = "largo")); const antes = await p.evaluate(() => document.querySelectorAll(".celda.revelada").length);
      await p.click("#b-letra"); await espera(500); await p.click('[data-accion="ver-letra"]'); await espera(15000);
      return (await p.evaluate(() => document.querySelectorAll(".celda.revelada").length)) - antes; })();
    if (rl === 2) ok("anuncio largo (12 s, más que el temporizador): el premio llega completo, 2 letras"); else mal(`anuncio largo: dio ${rl} letra(s) en vez de 2`);
    if (rv.oferta && rv.letras === 2 && rv.n === 1 && !rv.groone) ok("recompensa vista: 2 letras, cuenta en el tope diario y no carga display durante la partida"); else mal("recompensa vista: " + JSON.stringify(rv));
    if (rc.oferta && rc.letras === 0 && rc.n === 0) ok("recompensa cerrada antes: sin premio"); else mal("recompensa cerrada: " + JSON.stringify(rc));
    if (rs.oferta && rs.letras === 1 && rs.n === 0) ok("sin anuncio disponible: Tilde regala 1 letra"); else mal("sin anuncio: " + JSON.stringify(rs));

    // 3a) cofre doble (nivel 5): +50 monedas y una letra gratis más
    await progreso({ hechos: [1, 2, 3, 4], monedas: 100, gratis: 0, llegada: "2026-11-01" }); await ir("/nivel/5/", 2000);
    await p.evaluate(() => (window.__gptModo = "ok")); await completar();
    const c0 = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("enl_progreso")); return { m: d.monedas, g: d.gratis }; });
    const bc = await p.$('[data-accion="doble-cofre"]'); if (bc) { await bc.click(); await espera(3000); }
    const c1 = await p.evaluate(() => { const d = JSON.parse(localStorage.getItem("enl_progreso")); return { m: d.monedas, g: d.gratis }; });
    if (bc && c1.m - c0.m === 50 && c1.g - c0.g === 1) ok("cofre doble: al ver el anuncio da +50 monedas y otra letra gratis"); else mal("cofre doble: " + JSON.stringify({ oferta: !!bc, c0, c1 }));
    // 3c) otra carta del cartero: al ver el anuncio, la carta vuelve a estar lista y se puede abrir
    await progreso({ hechos: [1, 2], monedas: 100, gratis: 0, llegada: "2026-11-01", cartero: { ultimo: 0, fecha: null, hoy: 0 } }); await ir("/", 2000);
    await p.evaluate(() => (window.__gptModo = "ok"));
    const carta = await p.$("#cartero:not([hidden])"); if (carta) { await carta.click(); await espera(1200); }
    const oc = await p.$('[data-accion="otra-carta"]'); if (oc) { await oc.click(); await espera(3000); }
    const hoy1 = await p.evaluate(() => JSON.parse(localStorage.getItem("enl_progreso")).cartero.hoy);
    const c2 = await p.$("#cartero:not([hidden]):not(.abierta)"); if (c2) { await c2.click(); await espera(1200); }
    const hoy2 = await p.evaluate(() => JSON.parse(localStorage.getItem("enl_progreso")).cartero.hoy);
    if (carta && oc && c2 && hoy1 === 1 && hoy2 === 2) ok("otra carta: al ver el anuncio llega otra carta y se abre con su regalo"); else mal("otra carta: " + JSON.stringify({ carta: !!carta, oferta: !!oc, otra: !!c2, hoy1, hoy2 }));

    // 3b) regalo de Tilde: sale solo en el nivel 4 (no en el 5, que tiene cofre, ni en el 6); al verlo, +30 y sin viñeta
    const regalo = async (n, modo, ver) => {
      await progreso({ hechos: Array.from({ length: n - 1 }, (_, i) => i + 1), monedas: 100, llegada: "2026-11-01" });
      await ir(`/nivel/${n}/`, 2000); await p.evaluate(m => (window.__gptModo = m), modo);
      await completar(); const hay = !!(await p.$("#regalo-tilde"));
      if (!hay || !ver) return { hay };
      const antes = await p.evaluate(() => JSON.parse(localStorage.getItem("enl_progreso")).monedas);
      await p.click('[data-accion="regalo-ver"]'); await espera(3000);
      return { hay, ganadas: (await p.evaluate(() => JSON.parse(localStorage.getItem("enl_progreso")).monedas)) - antes,
        sinVineta: await p.evaluate(() => { const a = [...document.querySelectorAll(".hoja .botones a")].find(x => /Siguiente/.test(x.textContent)); return !!a && a.dataset.googleInterstitial === "false" && !a.classList.contains("con-vineta"); }) };
    };
    const g4 = await regalo(4, "ok", true), g5 = await regalo(5, "ok", false), g6 = await regalo(6, "ok", false);
    if (g4.hay && g4.ganadas === 30 && g4.sinVineta) ok("regalo de Tilde en el nivel 4: al ver el anuncio da +30 monedas y apaga la viñeta de ese paso"); else mal("regalo nivel 4: " + JSON.stringify(g4));
    if (!g5.hay && !g6.hay) ok("sin regalo en el nivel 5 (tiene cofre) ni en el 6"); else mal("regalo fuera de lugar: " + JSON.stringify({ g5, g6 }));
    const g7 = await regalo(7, "ok", false);
    if (g7.hay) { await p.click('[data-accion="regalo-no"]'); await espera(500); }
    if (g7.hay && !(await p.$("#regalo-tilde"))) ok("nivel 7: el regalo sale y «No, gracias» lo cierra sin anuncio"); else mal("nivel 7: " + JSON.stringify(g7));

    // 5) CSP
    if (avisos.length) mal("CSP o errores:\n   " + [...new Set(avisos)].slice(0, 8).join("\n   ")); else ok("sin bloqueos de la CSP ni errores de JavaScript");
    console.log("  (pedidos externos bloqueados en la prueba: " + ([...externos].join(", ") || "ninguno") + ")");
    await nav.close();
  } finally { construir(); }
  console.log(fallas.length ? `\n${fallas.length} problema(s) con los anuncios` : "\nAnuncios en orden.");
  process.exit(fallas.length ? 1 : 0);
})();
