// Prueba de la medición (Tag Manager) sin mandar nada a Google: gtm.js se reemplaza por un archivo vacío (regla 8).
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
    const p = await nav.newPage(), avisos = [], externos = []; let gtm = null;
    p.on("pageerror", e => avisos.push("Error JS: " + e.message));
    p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) avisos.push("CSP: " + m.text()); });
    await p.setRequestInterception(true);
    p.on("request", async r => {
      const u = r.url();
      if (u.startsWith("https://www.googletagmanager.com/gtm.js")) { gtm = { u, t: Date.now() }; return r.respond({ status: 200, contentType: "application/javascript", body: "window.__gtm=1;" }); }
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
    if (avisos.length) mal("CSP o errores:\n   " + [...new Set(avisos)].join("\n   ")); else ok("sin bloqueos de la CSP ni errores");
    if (externos.length) mal("pedidos externos inesperados: " + [...new Set(externos)].join(", ")); else ok("ningún otro pedido externo");
    await nav.close();
  } finally { construir(); }
  console.log(fallas.length ? `\n${fallas.length} problema(s)` : "\nMedición en orden."); process.exit(fallas.length ? 1 : 0);
})();
