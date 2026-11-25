// Arma el sitio completo en dist/ a partir de fuente/. Sin dependencias.
// Uso: node herramientas/construir.js
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");
const RAIZ = path.join(__dirname, ".."), F = p => path.join(RAIZ, "fuente", p), DIST = path.join(RAIZ, "dist");
const DOMINIO = "https://enletrados.com";
const leer = p => fs.readFileSync(F(p), "utf8");

// ---------- contenido ----------
const mundos = JSON.parse(leer("contenido/mundos.json"));
const niveles = JSON.parse(leer("contenido/niveles.json"));
// En local se usan las pistas vigentes (aprobadas y pendientes). Con --estricto (antes de publicar) solo las aprobadas.
const ESTRICTO = process.argv.includes("--estricto"), L = require("./lib/contenido");
const PISTAS = L.pistas(ESTRICTO ? "aprobadas" : "vigentes"), APROBADAS = L.pistas("aprobadas");
const TOTAL = niveles.length;
const enUso = [...new Set(niveles.flatMap(l => l.palabras.map(w => w.p)))];
const faltan = enUso.filter(w => !PISTAS[w]);
if (faltan.length) { console.error(`Palabras sin pista ${ESTRICTO ? "aprobada" : "vigente"}:`, faltan.join(", ")); process.exit(1); }
const sinAprobar = enUso.filter(w => !APROBADAS[w]).length;

// ---------- archivos con nombre versionado ----------
const minCss = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").replace(/;}/g, "}").trim();
const minJs = s => s.split("\n").map(l => l.replace(/^\s+/, "")).filter(l => l && !l.startsWith("//")).join("\n");
const huella = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
fs.rmSync(DIST, { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true });
const css = minCss(leer("juego/estilos.css")), js = minJs(leer("juego/app.js"));
const CSS = `estilos.${huella(css)}.css`, JS = `app.${huella(js)}.js`;
fs.writeFileSync(path.join(DIST, CSS), css); fs.writeFileSync(path.join(DIST, JS), js);
for (const f of fs.readdirSync(F("publico"))) fs.copyFileSync(F("publico/" + f), path.join(DIST, f));

// ---------- plantillas ----------
const BASE = leer("plantillas/base.html"), ICONOS = leer("plantillas/iconos.svg").trim();
const rellenar = (t, d) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (d[k] != null ? d[k] : ""));
const json = o => JSON.stringify(o).replace(/</g, "\\u003c");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
// La viñeta de Google nunca sale al abrir el sitio ni en los primeros niveles: todos los enlaces llevan
// data-google-interstitial="false", salvo los que tienen la clase con-vineta («Siguiente nivel» desde el nivel 3).
const sinVineta = html => html.replace(/<a\b(?![^>]*data-google-interstitial)(?![^>]*con-vineta)/g, '<a data-google-interstitial="false"');
const paginas = [];
function pagina(ruta, d) {
  const html = sinVineta(rellenar(BASE, Object.assign({ css: CSS, js: JS, iconos: ICONOS, robots: "index, follow",
    canonica: d.indexar === false ? "" : `<link rel="canonical" href="${DOMINIO}${ruta}">` }, d)));
  if (ruta.endsWith(".html")) fs.writeFileSync(path.join(DIST, ruta), html);
  else { const dir = path.join(DIST, ruta); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), html); }
  paginas.push({ ruta, bytes: html.length, indexar: d.indexar !== false });
}
const sitio = { total: TOTAL, mundos: mundos.map(m => ({ id: m.id, lugar: m.lugar, tema: m.tema, color: m.color, desde: m.desde, hasta: m.hasta, frase: m.frase })) };

// portada
pagina("/", { titulo: "Enletrados · Crucigrama de palabras en español", pagina: "portada",
  descripcion: "Forma palabras deslizando el dedo por las letras y completa el crucigrama. Cada palabra tiene su pista. Gratis y sin instalar nada.",
  contenido: rellenar(leer("plantillas/portada.html"), { pueblo: leer("plantillas/pueblo.svg").trim(), frase1: esc(mundos[0].frase), datos: json(sitio) }) });

// mundos
const lista = mundos.map(m => `    <li><a class="mundo-item cerrado" data-mundo="${m.id}" style="--mundo:${m.color}"><span class="num">${m.id}</span><div><b>${esc(m.lugar)}</b>` +
  `<small>${esc(m.tema)} · <span class="cuenta">${m.desde <= TOTAL ? "Se abre al terminar el lugar anterior" : "Pronto"}</span></small><div class="barra"><i></i></div></div>` +
  `<svg class="i"><use href="#i-candado"/></svg></a></li>`).join("\n");
pagina("/mundos/", { titulo: "Los lugares del pueblo · Enletrados", pagina: "mundos", descripcion: "Los diez lugares del pueblo de Enletrados: de la panadería al faro.",
  contenido: rellenar(leer("plantillas/mundos.html"), { lista, datos: json(sitio) }) });

// niveles
const ESCENAS = { 1: "plantillas/panaderia.svg" };
niveles.forEach((l, i) => {
  const n = i + 1, m = mundos.find(x => n >= x.desde && n <= x.hasta), totalMundo = m.hasta - m.desde + 1, pos = n - m.desde + 1;
  const datos = { n, total: TOTAL, mundo: { id: m.id, lugar: m.lugar, color: m.color, desde: m.desde, hasta: m.hasta },
    letras: l.letras, palabras: l.palabras, filas: l.filas, columnas: l.columnas, extras: l.extras,
    pistas: Object.fromEntries(l.palabras.map(w => [w.p, PISTAS[w.p]])),
    siguiente: n < TOTAL ? `/nivel/${n + 1}/` : null, vinetaSiguiente: n >= 3 };
  pagina(`/nivel/${n}/`, { titulo: `Nivel ${n} · ${m.lugar} · Enletrados`, pagina: "nivel", clase: "nivel", robots: "noindex, follow", indexar: false,
    descripcion: `Nivel ${n} de Enletrados: completa el crucigrama con las letras de la rueda.`,
    contenido: rellenar(leer("plantillas/nivel.html"), { n, lugar: esc(m.lugar), posicion: pos, totalMundo, porcentaje: (pos / totalMundo * 100).toFixed(1),
      escena: ESCENAS[m.id] ? leer(ESCENAS[m.id]).trim() : "", datos: json(datos) }) });
});

// 404
pagina("/404.html", { titulo: "Página no encontrada · Enletrados", pagina: "404", robots: "noindex", indexar: false, descripcion: "Esta página no existe.",
  contenido: leer("plantillas/404.html") });

// ---------- robots, sitemap y cabeceras de Cloudflare ----------
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMINIO}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paginas.filter(p => p.indexar).map(p => `  <url><loc>${DOMINIO}${p.ruta}</loc></url>`).join("\n") + "\n</urlset>\n");
fs.writeFileSync(path.join(DIST, "_headers"), [
  "# Archivos con nombre versionado: caché larga. El HTML queda con la caché corta por omisión de Cloudflare Pages.",
  "/app.*.js", "  Cache-Control: public, max-age=31536000, immutable",
  "/estilos.*.css", "  Cache-Control: public, max-age=31536000, immutable",
  "/*", "  X-Content-Type-Options: nosniff", "  Referrer-Policy: strict-origin-when-cross-origin", ""].join("\n"));

// ---------- resumen de peso (gzip, como lo transfiere Cloudflare) ----------
const gz = f => zlib.gzipSync(fs.readFileSync(path.join(DIST, f)), { level: 9 }).length;
const kb = b => (b / 1024).toFixed(1) + " KB";
const portadaGz = gz("index.html"), nivelGz = gz("nivel/5/index.html"), cssGz = gz(CSS), jsGz = gz(JS);
console.log(`dist/ listo: ${paginas.length} páginas (${TOTAL} niveles), ${CSS}, ${JS}`);
console.log(`Peso transferido (gzip): CSS ${kb(cssGz)} · JS ${kb(jsGz)} · portada ${kb(portadaGz)} · nivel ${kb(nivelGz)}`);
if (sinAprobar) console.log(`Ojo: ${sinAprobar} de ${enUso.length} palabras en uso tienen la pista sin aprobar todavía (solo sirve en local).`);
console.log(`Primera carga: portada ${kb(portadaGz + cssGz + jsGz)} · nivel ${kb(nivelGz + cssGz + jsGz)} (límite: 100 KB)`);
