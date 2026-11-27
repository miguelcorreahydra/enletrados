// Pruebas de seguridad (revisión del 27 nov 2026). Uso: con npm run dev encendido, node herramientas/pruebas/seguridad.js
// [--en-linea] para revisar también las cabeceras del sitio publicado.
//  1. Un enlace de avance armado (?enl=) con código no se ejecuta, y el progreso queda con su formato correcto.
//  2. Un progreso alterado en el navegador tampoco ejecuta código.
//  3. Las páginas funcionan con la política de contenido (CSP) de _headers, sin bloqueos ni errores.
//  4. La API local de revisión rechaza pedidos de otras páginas o de otras direcciones.
//  5. (--en-linea) El sitio publicado envía las cabeceras de seguridad y no deja ver archivos internos.
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), http = require("http");
const BASE = "http://localhost:8080", EN_LINEA = "https://enletrados.cosmovil.com.mx";
const DIST = path.join(__dirname, "../../dist"), espera = ms => new Promise(r => setTimeout(r, ms));
const fallas = [], ok = m => console.log("✓ " + m), mal = m => { fallas.push(m); console.log("✗ " + m); };
const enl = o => Buffer.from(JSON.stringify(o)).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

(async () => {
  const cabeceras = fs.readFileSync(path.join(DIST, "_headers"), "utf8");
  const CSP = (cabeceras.match(/Content-Security-Policy: (.*)/) || [])[1];
  if (!CSP || !/frame-ancestors 'none'/.test(CSP) || !/X-Frame-Options: DENY/.test(cabeceras)) mal("_headers no trae la CSP o la protección contra marcos"); else ok("_headers trae CSP, X-Frame-Options y las demás cabeceras");

  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); const avisos = [];
  p.on("pageerror", e => avisos.push("Error JS: " + e.message));
  p.on("console", m => { if (/Content Security Policy|Refused to/i.test(m.text())) avisos.push("CSP: " + m.text()); });
  // se sirven las páginas con la CSP real (el servidor local no lee _headers)
  await p.setRequestInterception(true);
  p.on("request", async r => {
    if (!r.url().startsWith(BASE)) return r.abort();
    if (r.resourceType() !== "document") return r.continue();
    // se quita el script de recarga que agrega el servidor de desarrollo (nunca está en el sitio publicado)
    try { const res = await fetch(r.url()), cuerpo = (await res.text()).replace(/<script>\(function\(\)\{var s=new EventSource\("\/__recarga"\)[\s\S]*?<\/script>/, "");
      r.respond({ status: res.status, headers: { "content-type": res.headers.get("content-type") || "text/html", "content-security-policy": CSP }, body: cuerpo });
    } catch (e) { r.abort(); }
  });

  // 1) enlace de avance con código
  await p.goto(BASE + "/", { waitUntil: "load" }); await p.evaluate(() => localStorage.clear());
  const ataque = { hechos: [1, 2, 3], monedas: "<img src=x onerror=window.__xss=1>", extras: "<img src=x onerror=window.__xss=1>", estrellas: { 1: "<b>" }, dias: ["<svg onload=window.__xss=1>"], lugaresVistos: ["<x>"] };
  await p.goto(`${BASE}/logros/?enl=${enl(ataque)}`, { waitUntil: "load" }); await espera(700);
  const r1 = await p.evaluate(() => ({ xss: window.__xss === 1, pr: JSON.parse(localStorage.getItem("enl_progreso") || "{}") }));
  if (r1.xss) mal("un enlace de avance armado ejecutó código"); else ok("un enlace de avance armado no ejecuta código");
  if (typeof r1.pr.extras === "number" && typeof r1.pr.monedas === "number" && r1.pr.dias.length === 0 && r1.pr.estrellas["1"] === 1) ok("el progreso que llega por enlace queda con su formato correcto");
  else mal("el progreso del enlace no se limpió: " + JSON.stringify(r1.pr).slice(0, 160));

  // 2) progreso alterado directamente en el navegador
  await p.evaluate(() => localStorage.setItem("enl_progreso", JSON.stringify({ hechos: [1], extras: "<img src=x onerror=window.__xss=2>", racha: { n: "<i>", mejor: "<img src=x onerror=window.__xss=2>" } })));
  await p.goto(BASE + "/logros/", { waitUntil: "load" }); await espera(700);
  if (await p.evaluate(() => window.__xss === 2)) mal("un progreso alterado en el navegador ejecutó código"); else ok("un progreso alterado en el navegador no ejecuta código");

  // 3) las páginas funcionan con la CSP
  await p.evaluate(() => localStorage.clear()); avisos.length = 0;
  for (const ruta of ["/", "/mundos/", "/nivel/1/", "/nivel/291/", "/diario/", "/logros/", "/ajustes/", "/como-jugar/", "/privacidad/", "/no-existe/"]) {
    await p.goto(BASE + ruta, { waitUntil: "load" }); await espera(600);
  }
  if (avisos.length) mal("con la CSP aparecieron problemas:\n   " + [...new Set(avisos)].slice(0, 6).join("\n   ")); else ok("las 10 páginas principales funcionan con la CSP, sin bloqueos ni errores");
  await nav.close();

  // 4) API local de revisión
  // pedido HTTP directo (fetch no deja cambiar la cabecera Host, que es justo lo que se quiere probar)
  const api = cab => new Promise(listo => {
    const cuerpo = JSON.stringify({ palabra: "huevo", decision: "permitir" });
    const q = http.request({ host: "127.0.0.1", port: 8080, path: "/__api/dudosa", method: "POST", headers: Object.assign({ Host: "localhost:8080", "Content-Type": "text/plain", "Content-Length": Buffer.byteLength(cuerpo) }, cab) },
      r => { r.resume(); listo(r.statusCode); });
    q.on("error", () => listo(0)); q.end(cuerpo);
  });
  const s1 = await api({}), s2 = await api({ Origin: "https://sitio-malicioso.example", "X-Enletrados": "1" }), s3 = await api({ Host: "atacante.example:8080", "X-Enletrados": "1" });
  if (s1 === 403 && s2 === 403 && s3 === 403) ok("la API local rechaza pedidos sin la cabecera propia, de otras páginas y de otras direcciones");
  else mal(`la API local respondió ${s1}/${s2}/${s3} (se esperaba 403/403/403)`);
  const g = await fetch(BASE + "/__api/revision").then(r => r.status);
  if (g === 200) ok("la página de revisión sigue funcionando desde este computador"); else mal("la revisión local no responde (" + g + ")");

  // 5) sitio publicado
  if (process.argv.includes("--en-linea")) {
    const res = await fetch(EN_LINEA + "/"), h = n => res.headers.get(n) || "";
    if (/frame-ancestors 'none'/.test(h("content-security-policy")) && h("x-frame-options") === "DENY") ok("el sitio publicado envía la CSP y X-Frame-Options");
    else mal("el sitio publicado todavía no envía la CSP ni X-Frame-Options (hay que volver a subirlo)");
    const internos = [".env", ".git/config", "CLAUDE.md", "package.json", "herramientas/servidor.js", "fuente/contenido/bloqueo.json", "respaldos/cambios.jsonl", "revisar/", "__api/revision"];
    const vistos = []; for (const r of internos) if ((await fetch(EN_LINEA + "/" + r)).status === 200) vistos.push(r);
    if (vistos.length) mal("archivos internos visibles en línea: " + vistos.join(", ")); else ok(`ningún archivo interno se ve en línea (${internos.length} revisados)`);
  }
  console.log(fallas.length ? `\n${fallas.length} problema(s) de seguridad` : "\nSin problemas de seguridad.");
  process.exit(fallas.length ? 1 : 0);
})();
