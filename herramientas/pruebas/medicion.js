// Prueba de la medición (Tag Manager, píxel de Meta, Clarity y Hotjar) sin mandar nada a nadie: cada script se
// reemplaza por un archivo simulado (regla 8). Revisa que se carguen después de la página y que el nivel 3 sea «Lead».
// Uso: con npm run dev encendido, npm run prueba:medicion. Arma dist/ en modo publicado, revisa y lo deja normal.
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const BASE = "http://localhost:8080", RAIZ = path.join(__dirname, "../.."), DIST = path.join(RAIZ, "dist");
const espera = ms => new Promise(r => setTimeout(r, ms));
const fallas = [], ok = m => console.log("✓ " + m), mal = m => { fallas.push(m); console.log("✗ " + m); };
const construir = (...a) => execFileSync("node", [path.join(RAIZ, "herramientas/construir.js"), ...a], { cwd: RAIZ, stdio: "pipe" });
(async () => {
  construir("--publicado");
  try {
    const CSP = fs.readFileSync(path.join(DIST, "_headers"), "utf8").match(/Content-Security-Policy: (.*)/)[1];
    const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    const p = await nav.newPage(), avisos = [], externos = []; let gtm = null, pedidos = {};
    const SIMULADOS = { gtm: "https://www.googletagmanager.com/gtm.js", pixel: "https://connect.facebook.net/en_US/fbevents.js", clarity: "https://www.clarity.ms/tag/", hotjar: "https://static.hotjar.com/c/hotjar-" };
    p.on("pageerror", e => avisos.push("Error JS: " + e.message));
    p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) avisos.push("CSP: " + m.text()); });
    await p.setRequestInterception(true);
    p.on("request", async r => {
      const u = r.url();
      if (u.startsWith("https://www.googletagmanager.com/gtm.js")) { gtm = { u, t: Date.now() }; return r.respond({ status: 200, contentType: "application/javascript", body: "window.__gtm=1;" }); }
      for (const [k, pre] of Object.entries(SIMULADOS)) if (u.startsWith(pre)) { pedidos[k] = { u, t: Date.now() }; return r.respond({ status: 200, contentType: "application/javascript", body: "" }); }
      if (!u.startsWith(BASE)) { externos.push(u); return r.abort(); }
      if (r.resourceType() !== "document") return r.continue();
      try { const res = await fetch(u), cuerpo = (await res.text()).replace(/<script>\(function\(\)\{var s=new EventSource\("\/__recarga"\)[\s\S]*?<\/script>/, "");
        r.respond({ status: res.status, headers: { "content-type": "text/html", "content-security-policy": CSP }, body: cuerpo }); } catch (e) { r.abort(); }
    });
    for (const ruta of ["/", "/nivel/1/", "/diario/", "/privacidad/"]) {
      gtm = null; await p.goto(BASE + ruta, { waitUntil: "load" }); const cargo = Date.now(); await espera(1500);
      const dl = await p.evaluate(() => ({ eventos: (window.dataLayer || []).map(x => x && x.event).filter(Boolean), cargado: window.__gtm === 1 }));
      if (gtm && /id=GTM-[A-Z0-9]+$/.test(gtm.u) && gtm.t >= cargo - 50 && dl.cargado && dl.eventos.includes("gtm.js")) ok(`${ruta}: Tag Manager se carga al terminar la página (eventos: ${dl.eventos.join(", ")})`);
      else mal(`${ruta}: Tag Manager no se cargó bien ` + JSON.stringify({ gtm, dl }));
    }
    // píxel, Clarity y Hotjar en la portada
    pedidos = {}; await p.goto(BASE + "/", { waitUntil: "load" }); const t0 = Date.now(); await espera(2500);
    const cola = await p.evaluate(() => (window.fbq && window.fbq.queue || []).map(a => [].slice.call(a, 0, 2).join(" ")));
    if (pedidos.pixel && pedidos.pixel.t >= t0 - 50 && cola.includes("init 1187863220859635") && cola.includes("track PageView")) ok("píxel de Meta: se carga al terminar la página, con init y PageView"); else mal("píxel: " + JSON.stringify({ p: pedidos.pixel, cola }));
    if (pedidos.clarity && /zk7p49h1s2$/.test(pedidos.clarity.u) && pedidos.clarity.t - t0 >= 1200) ok(`Clarity: se carga ${((pedidos.clarity.t - t0) / 1000).toFixed(1)} s después de la página`); else mal("Clarity: " + JSON.stringify(pedidos.clarity));
    if (pedidos.hotjar && /hotjar-6856127\.js\?sv=6$/.test(pedidos.hotjar.u) && pedidos.hotjar.t - t0 >= 1200) ok(`Hotjar: se carga ${((pedidos.hotjar.t - t0) / 1000).toFixed(1)} s después de la página`); else mal("Hotjar: " + JSON.stringify(pedidos.hotjar));
    // nivel 3 completado → Lead («ENL - Nivel 3»)
    await p.evaluate(() => { localStorage.clear(); localStorage.setItem("enl_progreso", JSON.stringify({ hechos: [1, 2], monedas: 100, llegada: "2026-11-01" })); });
    await p.goto(BASE + "/nivel/3/", { waitUntil: "load" }); await espera(1500);
    for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) {
      const pts = await p.evaluate(w => { const f = [...document.querySelectorAll(".letra")], u = new Set(); return w.split("").map(l => { const i = f.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = f[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, w);
      await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const [x, y] of pts.slice(1)) await p.mouse.move(x, y, { steps: 6 }); await p.mouse.up(); await espera(1200);
    }
    await espera(1500);
    const leads = await p.evaluate(() => (window.fbq.queue || []).filter(a => a[0] === "track" && a[1] === "Lead").length);
    if (leads === 1) ok("nivel 3 completado: el píxel manda «Lead» una vez (conversión «ENL - Nivel 3»)"); else mal(`nivel 3: el píxel mandó ${leads} Lead`);
    if (avisos.length) mal("CSP o errores:\n   " + [...new Set(avisos)].join("\n   ")); else ok("sin bloqueos de la CSP ni errores");
    if (externos.length) mal("pedidos externos inesperados: " + [...new Set(externos)].join(", ")); else ok("ningún otro pedido externo");
    await nav.close();
  } finally { construir(); }
  console.log(fallas.length ? `\n${fallas.length} problema(s)` : "\nMedición en orden."); process.exit(fallas.length ? 1 : 0);
})();
