// Revisión de accesibilidad (axe-core, el mismo motor de Lighthouse) y de SEO, sobre el sitio tal como lo ve el público.
// Uso: con npm run dev encendido, npm run accesibilidad. Arma dist/ en modo publicado, revisa y lo deja normal.
// Bloquea todo lo externo (anuncios, píxel y analítica nunca se cargan: regla 8).
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const BASE = "http://localhost:8080", RAIZ = path.join(__dirname, "../.."), DIST = path.join(RAIZ, "dist");
const AXE = fs.readFileSync(require.resolve("axe-core/axe.min.js"), "utf8");
const espera = ms => new Promise(r => setTimeout(r, ms));
const construir = (...a) => execFileSync("node", [path.join(RAIZ, "herramientas/construir.js"), ...a], { cwd: RAIZ, stdio: "pipe" });
const PAGINAS = ["/", "/mundos/", "/nivel/1/", "/nivel/12/", "/nivel/291/", "/diario/", "/logros/", "/ajustes/", "/tienda/", "/como-jugar/", "/privacidad/", "/terminos/", "/cookies/", "/quienes-somos/", "/contacto/", "/creditos/", "/no-existe/"];
const hallazgos = {}; // regla → { impacto, ayuda, lugares: Set }
const anotar = (v, donde) => { const h = hallazgos[v.id] = hallazgos[v.id] || { impacto: v.impact, ayuda: v.help, lugares: new Set(), ejemplos: new Set() };
  h.lugares.add(donde); v.nodes.slice(0, 3).forEach(n => h.ejemplos.add(n.target.join(" ") + (n.any[0] && n.any[0].message ? " · " + n.any[0].message : ""))); };

async function revisar(p, donde) {
  await p.addScriptTag({ content: AXE });
  const r = await p.evaluate(() => window.axe.run(document, { runOnly: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"], resultTypes: ["violations"] }));
  r.violations.forEach(v => anotar(v, donde));
}
async function formar(p, palabra) {
  const pts = await p.evaluate(w => { const f = [...document.querySelectorAll(".letra")], u = new Set(); return w.split("").map(l => { const i = f.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = f[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, palabra);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const [x, y] of pts.slice(1)) await p.mouse.move(x, y, { steps: 6 }); await p.mouse.up();
}

function seo() {
  const fallas = [], html = [];
  const recorrer = d => fs.readdirSync(d, { withFileTypes: true }).forEach(e => { const f = path.join(d, e.name); if (e.isDirectory()) recorrer(f); else if (e.name.endsWith(".html")) html.push(f); });
  recorrer(DIST);
  const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8"), enSitemap = new Set([...sitemap.matchAll(/<loc>https:\/\/[^/]+(\/[^<]*)<\/loc>/g)].map(m => m[1]));
  const titulos = {}, descripciones = {}, existe = r => { const f = path.join(DIST, r.split(/[?#]/)[0]); return fs.existsSync(f) && (fs.statSync(f).isFile() || fs.existsSync(path.join(f, "index.html"))); };
  let indexables = 0, enlaces = 0;
  for (const f of html) {
    const s = fs.readFileSync(f, "utf8"), ruta = "/" + path.relative(DIST, f).replace(/index\.html$/, ""), nivel = ruta.startsWith("/nivel/");
    const t = (s.match(/<title>([^<]*)<\/title>/) || [])[1] || "", d = (s.match(/<meta name="description" content="([^"]*)"/) || [])[1] || "";
    const robots = (s.match(/<meta name="robots" content="([^"]*)"/) || [])[1] || "", indexa = !/noindex/.test(robots);
    const canon = (s.match(/<link rel="canonical" href="https:\/\/[^/]+([^"]*)"/) || [])[1];
    if (!/<html lang="es"/.test(s)) fallas.push(`${ruta}: sin lang="es"`);
    if (indexa) {
      indexables++;
      (titulos[t] = titulos[t] || []).push(ruta); (descripciones[d] = descripciones[d] || []).push(ruta);
      if (t.length < 15 || t.length > 65) fallas.push(`${ruta}: título de ${t.length} caracteres (mejor 15–65): «${t}»`);
      if (d.length < 70 || d.length > 160) fallas.push(`${ruta}: descripción de ${d.length} caracteres (mejor 70–160)`);
      if (canon !== ruta && ruta !== "/404.html") fallas.push(`${ruta}: canónica ${canon || "ausente"}`);
      if (!enSitemap.has(ruta) && ruta !== "/404.html") fallas.push(`${ruta}: indexable pero fuera del sitemap`);
      if (!/og:image/.test(s)) fallas.push(`${ruta}: sin imagen para compartir`);
    } else if (enSitemap.has(ruta)) fallas.push(`${ruta}: noindex pero está en el sitemap`);
    if (ruta === "/404.html" && indexa) fallas.push("/404.html debería ser noindex");
    const h1 = (s.match(/<h1[\s>]/g) || []).length; if (h1 !== 1 && !nivel) fallas.push(`${ruta}: ${h1} encabezados h1`);
    for (const m of s.matchAll(/<img\b(?![^>]*\balt=)[^>]*>/g)) fallas.push(`${ruta}: imagen sin alt: ${m[0].slice(0, 80)}`);
    for (const m of s.matchAll(/href="(\/[^"]*)"/g)) { enlaces++; if (!existe(m[1])) fallas.push(`${ruta}: enlace roto ${m[1]}`); }
  }
  for (const [t, r] of Object.entries(titulos)) if (r.length > 1) fallas.push(`título repetido en ${r.join(", ")}: «${t}»`);
  for (const [d, r] of Object.entries(descripciones)) if (r.length > 1) fallas.push(`descripción repetida en ${r.join(", ")}`);
  const robots = fs.readFileSync(path.join(DIST, "robots.txt"), "utf8"); if (!/Sitemap: https:/.test(robots)) fallas.push("robots.txt sin Sitemap");
  return { fallas: [...new Set(fallas)], paginas: html.length, indexables, enlaces, sitemap: enSitemap.size };
}

(async () => {
  construir("--publicado");
  try {
    const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
    for (const [tema, ancho] of [["claro", 390], ["oscuro", 390], ["claro", 1280]]) {
      const ctx = await nav.createBrowserContext(), p = await ctx.newPage();
      await p.setViewport({ width: ancho, height: ancho < 700 ? 844 : 800, isMobile: ancho < 700, hasTouch: ancho < 700 });
      await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: tema === "oscuro" ? "dark" : "light" }, { name: "prefers-reduced-motion", value: "reduce" }]);
      await p.setRequestInterception(true); p.on("request", r => (r.url().startsWith(BASE) || r.url().startsWith("data:") ? r.continue() : r.abort()));
      const et = `${tema} ${ancho}px`;
      for (const ruta of PAGINAS) { await p.goto(BASE + ruta, { waitUntil: "load" }); await espera(1200); await revisar(p, `${ruta} (${et})`); }
      // estados: ayuda abierta, nivel completado
      await p.goto(BASE + "/nivel/1/", { waitUntil: "load" }); await espera(1200);
      await p.evaluate(() => document.getElementById("b-ayuda") && document.getElementById("b-ayuda").click()); await espera(800); await revisar(p, `/nivel/1/ ayuda (${et})`);
      await p.goto(BASE + "/nivel/1/", { waitUntil: "load" }); await espera(1200);
      for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) { await formar(p, w); await espera(1200); }
      await espera(2500); await revisar(p, `/nivel/1/ completado (${et})`);
      await ctx.close();
    }
    await nav.close();
  } finally { construir(); }
  const orden = { critical: 0, serious: 1, moderate: 2, minor: 3 };
  const lista = Object.entries(hallazgos).sort((a, b) => orden[a[1].impacto] - orden[b[1].impacto]);
  console.log(`\nACCESIBILIDAD (axe-core): ${lista.length} regla(s) con problemas`);
  for (const [id, h] of lista) {
    console.log(`\n[${h.impacto}] ${id}: ${h.ayuda}\n  en: ${[...h.lugares].slice(0, 6).join(" · ")}${h.lugares.size > 6 ? ` (+${h.lugares.size - 6})` : ""}`);
    [...h.ejemplos].slice(0, 4).forEach(e => console.log("  · " + e.slice(0, 220)));
  }
  const s = seo();
  console.log(`\nSEO: ${s.paginas} páginas, ${s.indexables} indexables, ${s.sitemap} en el sitemap, ${s.enlaces} enlaces internos revisados`);
  s.fallas.forEach(f => console.log("  ✗ " + f)); if (!s.fallas.length) console.log("  ✓ sin problemas");
  process.exit(lista.length || s.fallas.length ? 1 : 0);
})();
