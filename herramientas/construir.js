// Arma el sitio completo en dist/ a partir de fuente/. Sin dependencias.
// Uso: node herramientas/construir.js
"use strict";
const fs = require("fs"), path = require("path"), crypto = require("crypto"), zlib = require("zlib");
const RAIZ = path.join(__dirname, ".."), F = p => path.join(RAIZ, "fuente", p), DIST = path.join(RAIZ, "dist");
// dominio del sitio publicado (decidido el 27 nov 2026): subdominio de cosmovil.com.mx, en Cloudflare
const DOMINIO = "https://enletrados.cosmovil.com.mx";
const leer = p => fs.readFileSync(F(p), "utf8");

// ---------- contenido ----------
const mundos = JSON.parse(leer("contenido/mundos.json"));
const niveles = JSON.parse(leer("contenido/niveles.json")), diario = JSON.parse(leer("contenido/diario.json"));
// En local se usan las pistas vigentes (aprobadas y pendientes). Con --estricto (antes de publicar) solo las aprobadas.
// --estricto: para publicar. Exige pistas aprobadas y datos legales completos, y activa el modo publicado.
// --publicado: el sitio tal como lo ve el público (sin anuncios simulados), sin las exigencias de --estricto (para revisarlo).
// Anuncios: «simulados» en local; «no» publicado mientras Ad Manager no esté conectado (no se muestra nada falso);
// «activos» cuando fuente/contenido/anuncios.json diga activo: true.
const ESTRICTO = process.argv.includes("--estricto"), PUBLICADO = ESTRICTO || process.argv.includes("--publicado"), L = require("./lib/contenido");
const PISTAS = L.pistas(ESTRICTO ? "aprobadas" : "vigentes"), APROBADAS = L.pistas("aprobadas");
const TOTAL = niveles.length;
const enUso = [...new Set(niveles.concat(diario).flatMap(l => l.palabras.map(w => w.p)))];
const faltan = enUso.filter(w => !PISTAS[w]);
if (faltan.length) { console.error(`Palabras sin pista ${ESTRICTO ? "aprobada" : "vigente"}:`, faltan.join(", ")); process.exit(1); }
const sinAprobar = enUso.filter(w => !APROBADAS[w]).length;

// ---------- archivos con nombre versionado ----------
const minCss = s => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\s+/g, " ").replace(/\s*([{}:;,>])\s*/g, "$1").replace(/;}/g, "}").trim();
const minJs = s => s.split("\n").map(l => l.replace(/^\s+/, "")).filter(l => l && !l.startsWith("//")).join("\n");
const huella = s => crypto.createHash("sha256").update(s).digest("hex").slice(0, 10);
fs.rmSync(DIST, { recursive: true, force: true }); fs.mkdirSync(DIST, { recursive: true });
// imágenes y letras con nombre versionado (caché larga): ARCHIVO["pueblo.webp"] → "/img/pueblo.1a2b3c4d5e.webp"
const ARCHIVO = {};
for (const [carpeta, destino] of [["imagenes", "img"], ["letras", "letras"]]) {
  if (!fs.existsSync(F(carpeta))) continue;
  fs.mkdirSync(path.join(DIST, destino), { recursive: true });
  for (const f of fs.readdirSync(F(carpeta)).filter(f => /\.(webp|png|woff2)$/.test(f))) {
    const datos = fs.readFileSync(F(carpeta + "/" + f)), nombre = f.replace(/(\.\w+)$/, `.${crypto.createHash("sha256").update(datos).digest("hex").slice(0, 10)}$1`);
    fs.writeFileSync(path.join(DIST, destino, nombre), datos); ARCHIVO[f] = `/${destino}/${nombre}`;
  }
}
// letra propia (aprobada por el usuario el 26 nov 2026, regla 7): Fraunces para títulos y Nunito para botones y fichas, alojadas en el sitio
const LETRAS = `@font-face{font-family:"Fraunces";font-weight:600;font-display:swap;src:url(${ARCHIVO["fraunces-600.woff2"]}) format("woff2")}` +
  `@font-face{font-family:"Nunito";font-weight:800;font-display:swap;src:url(${ARCHIVO["nunito-800.woff2"]}) format("woff2")}`;
const PRECARGA = ["fraunces-600.woff2", "nunito-800.woff2"].map(f => `<link rel="preload" href="${ARCHIVO[f]}" as="font" type="font/woff2" crossorigin>`).join("\n");
const css = LETRAS + minCss(leer("juego/estilos.css")), js = minJs(leer("juego/app.js"));
const CSS = `estilos.${huella(css)}.css`, JS = `app.${huella(js)}.js`;
fs.writeFileSync(path.join(DIST, CSS), css); fs.writeFileSync(path.join(DIST, JS), js);
for (const f of fs.readdirSync(F("publico"))) fs.copyFileSync(F("publico/" + f), path.join(DIST, f));

// ---------- plantillas ----------
const BASE = leer("plantillas/base.html"), ICONOS = leer("plantillas/iconos.svg").trim();
// piezas compartidas: el pie con enlaces y el tablero del juego (niveles y diario)
const PIEZAS = { pie: leer("plantillas/pie.html").trim(), juego: leer("plantillas/juego.html").trimEnd(), comunes: leer("plantillas/juego-comunes.html").trim() };
const rellenar = (t, d) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (d[k] != null ? d[k] : ""));
const plantilla = (nombre, d) => rellenar(leer("plantillas/" + nombre), Object.assign({}, PIEZAS, d));
const json = o => JSON.stringify(o).replace(/</g, "\\u003c");
const esc = s => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
// La viñeta de Google nunca sale al abrir el sitio ni en los primeros niveles: todos los enlaces llevan
// data-google-interstitial="false", salvo los que tienen la clase con-vineta («Siguiente nivel» desde el nivel 3).
const sinVineta = html => html.replace(/<a\b(?![^>]*data-google-interstitial)(?![^>]*con-vineta)/g, '<a data-google-interstitial="false"');
const paginas = [];
function pagina(ruta, d) {
  const html = sinVineta(rellenar(BASE, Object.assign({ css: CSS, js: JS, iconos: ICONOS, robots: "index, follow", precarga: PRECARGA, anuncios: MODO_ANUNCIOS,
    canonica: d.indexar === false ? "" : `<link rel="canonical" href="${DOMINIO}${ruta}">` }, d)));
  if (ruta.endsWith(".html")) fs.writeFileSync(path.join(DIST, ruta), html);
  else { const dir = path.join(DIST, ruta); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, "index.html"), html); }
  paginas.push({ ruta, bytes: html.length, indexar: d.indexar !== false });
}
// vecinos (12) y postales (2 por lugar: de día en el nivel 15 y de noche en el 30)
const VECINOS = JSON.parse(leer("contenido/vecinos.json")), VECINOS_SVG = leer("plantillas/vecinos.svg").trim();
const sitio = { total: TOTAL, vecinos: VECINOS, mundos: mundos.map(m => ({ id: m.id, lugar: m.lugar, tema: m.tema, color: m.color, desde: m.desde, hasta: m.hasta, frase: m.frase })) };
const NOINDEX = { robots: "noindex, follow", indexar: false };

// ---------- el pueblo isométrico de la portada (piezas de Kenney, CC0; ver herramientas/pueblo/) ----------
// Abajo, el pueblo completo apagado (filtro). Encima, cada lugar encendido con su capa de color recortada a su silueta.
// Las capas no traen href: el juego se lo pone solo a los lugares encendidos, así un jugador nuevo baja una sola.
const GEO = JSON.parse(leer("contenido/pueblo.json")), IMG = ARCHIVO["pueblo.webp"];
const ALTO_PUEBLO = GEO.alto + 30;
sitio.pines = Object.fromEntries(Object.entries(GEO.lugares).map(([id, l]) => [id, [+(l.pin[0] / GEO.ancho * 100).toFixed(2), +(l.pin[1] / ALTO_PUEBLO * 100).toFixed(2)]]));
const PUEBLO = `<svg class="pueblo" viewBox="0 0 ${GEO.ancho} ${ALTO_PUEBLO}" role="img" aria-labelledby="pueblo-t">
<title id="pueblo-t">El pueblo de Enletrados: cada lugar se ilumina al devolverle sus palabras</title>
<defs>
  <filter id="apagado" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values=".2"/>
    <feComponentTransfer><feFuncR type="linear" slope=".8" intercept=".15"/><feFuncG type="linear" slope=".8" intercept=".14"/><feFuncB type="linear" slope=".8" intercept=".13"/></feComponentTransfer></filter>
  <radialGradient id="g-halo"><stop offset="0" stop-color="#FFDE8C" stop-opacity=".95"/><stop offset="1" stop-color="#FFDE8C" stop-opacity="0"/></radialGradient>
  <radialGradient id="g-mar" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#9CC3CC"/><stop offset="1" stop-color="#6F9EAD"/></radialGradient>
</defs>
<g class="mar"><ellipse cx="${GEO.ancho * 0.68}" cy="${GEO.alto - 30}" rx="${GEO.ancho * 0.4}" ry="${GEO.alto * 0.15}" fill="url(#g-mar)"/>
  <path class="ola" d="M${GEO.ancho * .5} ${GEO.alto - 20}q12-6 24 0t24 0M${GEO.ancho * .8} ${GEO.alto - 60}q12-6 24 0t24 0M${GEO.ancho * .64} ${GEO.alto + 10}q12-6 24 0t24 0" fill="none" stroke="#DCEBEE" stroke-width="3" stroke-linecap="round"/></g>
<image class="base" href="${IMG}" width="${GEO.ancho}" height="${GEO.alto}" filter="url(#apagado)"/>
${Object.entries(GEO.lugares).map(([id, l]) => `<image class="luz-lugar" data-mundo="${id}" data-src="${ARCHIVO["lugar-" + id + ".webp"]}" x="${l.x}" y="${l.y}" width="${l.w}" height="${l.h}"/>`).join("\n")}
</svg>`;
// anuncio anchor SIMULADO: solo fuera de la partida (portada, lugares y cómo jugar); nunca en niveles ni en el diario
const CONF_ANUNCIOS = fs.existsSync(F("contenido/anuncios.json")) ? JSON.parse(leer("contenido/anuncios.json")) : { activo: false };
const MODO_ANUNCIOS = !PUBLICADO ? "simulados" : CONF_ANUNCIOS.activo ? "activos" : "no";
const SIMULADOS = MODO_ANUNCIOS === "simulados";
const ANCHOR = SIMULADOS ? '<div class="anchor-sim" data-clarity-mask="true" data-hj-suppress>Anuncio anchor (simulado)</div>' : "";
const CON_ANCHOR = SIMULADOS ? "con-anchor" : "";
const ANUNCIO = SIMULADOS ? '<div class="espacio-anuncio" data-clarity-mask="true" data-hj-suppress>Espacio de anuncio (simulado)</div>' : "";

// portada
pagina("/", { titulo: "Enletrados · Crucigrama de palabras en español", pagina: "portada", clase: CON_ANCHOR,
  descripcion: "Forma palabras deslizando el dedo por las letras y completa el crucigrama. Cada palabra tiene su pista. Gratis y sin instalar nada.",
  contenido: ANCHOR + plantilla("portada.html", { pueblo: PUEBLO, anuncioPortada: ANUNCIO, frase1: esc(mundos[0].frase), datos: json(sitio) }) });

// mundos
const lista = mundos.map(m => `    <li><a class="mundo-item cerrado" data-mundo="${m.id}" style="--mundo:${m.color}"><span class="num">${m.id}</span><div><b>${esc(m.lugar)}</b>` +
  `<small>${esc(m.tema)} · <span class="cuenta">${m.desde <= TOTAL ? "Se abre al terminar el lugar anterior" : "Pronto"}</span></small><div class="barra"><i></i></div></div>` +
  `<svg class="i"><use href="#i-candado"/></svg></a></li>`).join("\n");
pagina("/mundos/", { titulo: "Los lugares del pueblo · Enletrados", pagina: "mundos", clase: CON_ANCHOR, descripcion: "Los diez lugares del pueblo de Enletrados: de la panadería al faro.",
  contenido: ANCHOR + plantilla("mundos.html", { lista, datos: json(sitio) }) });

// Diario del Pueblo: una página y un archivo por tablero (se baja solo el del día)
const INICIO_DIARIO = "2026-01-01";
pagina("/diario/", { titulo: "El Diario del Pueblo · Crucigrama diario · Enletrados", pagina: "diario", clase: "nivel",
  descripcion: "Un crucigrama nuevo cada día, el mismo para todos. Forma las palabras con la rueda de letras y comparte tu resultado sin revelar las respuestas.",
  contenido: plantilla("diario.html", {}) + `\n<template id="t-escena"></template>\n<script type="application/json" id="datos-diario">${json({ inicio: INICIO_DIARIO, dias: diario.length, color: "#B98A2E" })}</script>` });
fs.mkdirSync(path.join(DIST, "diario/dia"), { recursive: true });
diario.forEach((l, i) => fs.writeFileSync(path.join(DIST, `diario/dia/${i + 1}.json`), JSON.stringify({ letras: l.letras, palabras: l.palabras, filas: l.filas,
  columnas: l.columnas, extras: l.extras, pistas: Object.fromEntries(l.palabras.map(w => [w.p, PISTAS[w.p]])) })));

// escena de cada lugar (tarjeta de «nivel completado»): acercamiento a la maqueta con 6 detalles (piezas o efectos de luz).
// Va dentro de un <template>: sus imágenes se bajan recién al completar el nivel.
const ESC = JSON.parse(leer("contenido/escenas.json")), { dibujar } = require("./pueblo/efectos");
function escena(id) {
  const e = ESC[id], partes = [];
  for (let d = 1; d <= 6; d++) {
    const c = e.capas[d], img = c ? `<image href="${ARCHIVO[`escena-${id}-d${d}.webp`]}" x="${c.x}" y="${c.y}" width="${c.w}" height="${c.h}"/>` : "";
    partes.push(`<g class="d d${d}">${img}${e.efectos.filter(f => f.d === d).map(f => dibujar(f, e.escala)).join("")}</g>`);
  }
  return `<svg class="escena" viewBox="0 0 ${e.ancho} ${e.alto}" aria-hidden="true"><defs>
<linearGradient id="e-cielo" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:var(--cielo-a)"/><stop offset="1" style="stop-color:var(--cielo-b)"/></linearGradient>
<radialGradient id="e-luz"><stop offset="0" stop-color="#FFE3A3"/><stop offset="1" stop-color="#FFE3A3" stop-opacity="0"/></radialGradient>
<radialGradient id="e-mar" cx=".5" cy=".3" r=".7"><stop offset="0" stop-color="#9CC3CC"/><stop offset="1" stop-color="#6F9EAD"/></radialGradient></defs>
<rect width="${e.ancho}" height="${e.alto}" fill="url(#e-cielo)"/><circle class="sol" cx="${e.ancho - 70}" cy="60" r="26" fill="#F2C27B" opacity=".8"/>
<ellipse cx="${e.ancho / 2}" cy="${e.alto + 30}" rx="${e.ancho * 0.75}" ry="90" fill="url(#e-mar)"/>
<image href="${ARCHIVO[`escena-${id}.webp`]}" width="${e.ancho}" height="${e.alto}"/>
${partes.join("\n")}
<g class="tilde-posada"><use href="#tilde" x="${e.tilde[0] - 24}" y="${e.tilde[1] - 30}" width="48" height="30"/></g></svg>`;
}

// logros y ajustes (fuera del índice de Google)
pagina("/logros/", Object.assign({ titulo: "Tus logros · Enletrados", pagina: "logros", descripcion: "Tus niveles, estrellas, rachas, postales, vecinos y medallas en Enletrados.",
  contenido: plantilla("logros.html", { datos: json(sitio), vecinossvg: VECINOS_SVG,
    plantillasPostales: mundos.map(m => `<template id="postal-${m.id}">${ESC[m.id] ? escena(m.id) : ""}</template>`).join("\n") }) }, NOINDEX));
pagina("/ajustes/", Object.assign({ titulo: "Ajustes · Enletrados", pagina: "ajustes", descripcion: "Sonido, vibración, tema y tamaño de letra de Enletrados.",
  contenido: plantilla("ajustes.html", {}) }, NOINDEX));

// niveles

niveles.forEach((l, i) => {
  const n = i + 1, m = mundos.find(x => n >= x.desde && n <= x.hasta), totalMundo = m.hasta - m.desde + 1, pos = n - m.desde + 1;
  const datos = { n, total: TOTAL, mundo: { id: m.id, lugar: m.lugar, color: m.color, desde: m.desde, hasta: m.hasta, detalles: m.detalles },
    letras: l.letras, palabras: l.palabras, filas: l.filas, columnas: l.columnas, extras: l.extras,
    pistas: Object.fromEntries(l.palabras.map(w => [w.p, PISTAS[w.p]])),
    siguiente: n < TOTAL ? `/nivel/${n + 1}/` : null, vinetaSiguiente: n >= 3,
    vecino: VECINOS.find(v => v.nivel === n) || null,
    postal: pos === 15 ? "dia" : pos === totalMundo ? "noche" : null };
  pagina(`/nivel/${n}/`, { titulo: `Nivel ${n} · ${m.lugar} · Enletrados`, pagina: "nivel", clase: "nivel", robots: "noindex, follow", indexar: false,
    descripcion: `Nivel ${n} de Enletrados: completa el crucigrama con las letras de la rueda.`,
    contenido: plantilla("nivel.html", { n, lugar: esc(m.lugar), posicion: pos, totalMundo, porcentaje: (pos / totalMundo * 100).toFixed(1),
      escena: ESC[m.id] ? escena(m.id) : "", vecinossvg: datos.vecino ? VECINOS_SVG : "", datos: json(datos) }) });
});

// cómo jugar, quiénes somos, contacto, créditos y páginas legales (en el índice de Google)
const SITIO = JSON.parse(leer("contenido/sitio.json"));
if (ESTRICTO && Object.values(SITIO).some(v => /POR CONFIRMAR/.test(v))) { console.error("Faltan datos en fuente/contenido/sitio.json (dicen POR CONFIRMAR)."); process.exit(1); }
const TEXTOS = {
  "como-jugar": ["Cómo jugar · Enletrados", "Cómo se juega Enletrados: desliza el dedo por la rueda de letras, completa el crucigrama con las pistas, gana estrellas y juega el Diario del Pueblo.", true],
  "quienes-somos": ["Quiénes somos · Enletrados", "Enletrados es un sitio de juegos de palabras en español neutro para toda Latinoamérica."],
  "contacto": ["Contacto · Enletrados", "Escríbenos si encontraste un error en una pista o tienes una idea para Enletrados."],
  "creditos": ["Créditos · Enletrados", "Las fuentes de datos abiertas que usa Enletrados y sus licencias."],
  "privacidad": ["Política de privacidad · Enletrados", "Qué datos se usan en Enletrados, para qué y cuáles son tus derechos."],
  "terminos": ["Términos de uso · Enletrados", "Las condiciones para usar Enletrados."],
  "cookies": ["Política de cookies · Enletrados", "Cómo usa Enletrados las cookies y el almacenamiento del navegador."]
};
for (const [slug, [titulo, descripcion, conAnuncio]] of Object.entries(TEXTOS)) {
  pagina(`/${slug}/`, { titulo, descripcion, pagina: "texto", clase: conAnuncio ? CON_ANCHOR : "",
    contenido: plantilla("texto.html", { cuerpo: rellenar(leer(`paginas/${slug}.html`).trim(), Object.assign({ dominio: DOMINIO.replace("https://", "") }, SITIO)), anuncio: conAnuncio ? ANUNCIO + ANCHOR : "" }) });
}

// 404
pagina("/404.html", { titulo: "Página no encontrada · Enletrados", pagina: "404", robots: "noindex", indexar: false, descripcion: "Esta página no existe.",
  contenido: plantilla("404.html", {}) });

// ---------- robots, sitemap y cabeceras de Cloudflare ----------
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${DOMINIO}/sitemap.xml\n`);
fs.writeFileSync(path.join(DIST, "sitemap.xml"), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  paginas.filter(p => p.indexar).map(p => `  <url><loc>${DOMINIO}${p.ruta}</loc></url>`).join("\n") + "\n</urlset>\n");
// ---------- cabeceras de seguridad (revisión del 27 nov 2026) ----------
// CSP: solo archivos propios; el único script en línea (el del tema, en base.html) se autoriza por su huella SHA-256.
// Los <script type="application/json"> son datos y no se ejecutan. Cuando los anuncios estén activos se permiten los
// dominios https de Google, Meta, Clarity y Hotjar (script, imágenes, conexiones y marcos), sin abrir el código en línea.
const scriptTema = (BASE.match(/<script>([\s\S]*?)<\/script>/) || [])[1] || "";
const HUELLA_TEMA = "'sha256-" + crypto.createHash("sha256").update(scriptTema).digest("base64") + "'";
const externos = MODO_ANUNCIOS === "activos" ? " https:" : "";
const CSP = [
  "default-src 'self'", `script-src 'self' ${HUELLA_TEMA}${externos}`, "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob:${externos}`, "font-src 'self'", `connect-src 'self'${externos}`, `frame-src ${externos ? "https:" : "'none'"}`,
  "object-src 'none'", "base-uri 'none'", "form-action 'none'", "frame-ancestors 'none'", "upgrade-insecure-requests"
].join("; ");
const CABECERAS_SEGURIDAD = [
  "Content-Security-Policy: " + CSP,
  "X-Frame-Options: DENY",                                   // no se puede meter el sitio dentro de otra página
  "Strict-Transport-Security: max-age=31536000",             // solo este subdominio (sin includeSubDomains)
  "Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
  "Cross-Origin-Opener-Policy: same-origin-allow-popups",
  "X-Content-Type-Options: nosniff",
  "Referrer-Policy: strict-origin-when-cross-origin"
];
fs.writeFileSync(path.join(DIST, "_headers"), [
  "# Archivos con nombre versionado: caché larga. El HTML queda con la caché corta por omisión de Cloudflare Pages.",
  "/app.*.js", "  Cache-Control: public, max-age=31536000, immutable",
  "/estilos.*.css", "  Cache-Control: public, max-age=31536000, immutable",
  "/img/*", "  Cache-Control: public, max-age=31536000, immutable",
  "/letras/*", "  Cache-Control: public, max-age=31536000, immutable",
  "/*", ...CABECERAS_SEGURIDAD.map(h => "  " + h), ""].join("\n"));

// ---------- resumen de peso (gzip, como lo transfiere Cloudflare) ----------
const gz = f => zlib.gzipSync(fs.readFileSync(path.join(DIST, f)), { level: 9 }).length;
const kb = b => (b / 1024).toFixed(1) + " KB";
const portadaGz = gz("index.html"), nivelGz = gz("nivel/5/index.html"), cssGz = gz(CSS), jsGz = gz(JS);
console.log(`Modo: ${ESTRICTO ? "estricto (para publicar)" : PUBLICADO ? "publicado (para revisar)" : "local"} · anuncios: ${MODO_ANUNCIOS} · dominio: ${DOMINIO}`);
console.log(`dist/ listo: ${paginas.length} páginas (${TOTAL} niveles), ${CSS}, ${JS}`);
console.log(`Peso transferido (gzip): CSS ${kb(cssGz)} · JS ${kb(jsGz)} · portada ${kb(portadaGz)} · nivel ${kb(nivelGz)}`);
if (sinAprobar) console.log(`Ojo: ${sinAprobar} de ${enUso.length} palabras en uso tienen la pista sin aprobar todavía (solo sirve en local).`);
// la primera carga cuenta también las letras y, en la portada, el pueblo y la capa del primer lugar (lo que baja un jugador nuevo)
const bytesDe = r => fs.statSync(path.join(DIST, r.replace(/^\//, ""))).size;
const letrasB = bytesDe(ARCHIVO["fraunces-600.woff2"]) + bytesDe(ARCHIVO["nunito-800.woff2"]), puebloB = bytesDe(ARCHIVO["pueblo.webp"]) + bytesDe(ARCHIVO["lugar-1.webp"]);
const portadaTotal = portadaGz + cssGz + jsGz + letrasB + puebloB, nivelTotal = nivelGz + cssGz + jsGz + letrasB;
console.log(`Primera carga: portada ${kb(portadaTotal)} (letras ${kb(letrasB)}, pueblo ${kb(puebloB)}) · nivel ${kb(nivelTotal)} (límite: 100 KB)`);
if (portadaTotal > 100 * 1024 || nivelTotal > 100 * 1024) console.error("Ojo: la primera carga pasa de 100 KB.");
