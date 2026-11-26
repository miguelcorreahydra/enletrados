// Servidor local para probar dist/ en el computador y en el celular (misma red wifi). Sin dependencias.
// Uso: node herramientas/servidor.js [puerto, 8080 por omisión] [--vigilar]
//   --vigilar (npm run dev): al cambiar algo en fuente/, vuelve a armar dist/ y recarga solas las páginas abiertas.
//   El script de recarga se agrega aquí, al servir el HTML: nunca queda en dist/ ni llega al sitio publicado.
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os"), { execFileSync } = require("child_process");
const RAIZ = path.join(__dirname, ".."), DIST = path.join(RAIZ, "dist");
const args = process.argv.slice(2), VIGILAR = args.includes("--vigilar"), PUERTO = +(args.find(a => /^\d+$/.test(a)) || 8080);
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };
const RECARGA = '<script>(function(){var s=new EventSource("/__recarga");s.onmessage=function(){location.reload()};' +
  's.addEventListener("error-construccion",function(e){console.error("Error al construir:\\n"+e.data)})})();</script>';
const oyentes = new Set();

http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (VIGILAR && ruta === "/__recarga") { // canal por el que se avisa a las páginas abiertas
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-store", Connection: "keep-alive" });
    res.write(": conectado\n\n"); oyentes.add(res); req.on("close", () => oyentes.delete(res)); return;
  }
  if (VIGILAR && (ruta === "/revisar/" || ruta === "/revisar" || ruta.startsWith("/__api/"))) return revision(req, res, ruta);
  if (VIGILAR && ruta.startsWith("/demos/")) return demos(req, res, ruta);
  let archivo = path.normalize(path.join(DIST, ruta));
  if (!archivo.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) {
    if (!ruta.endsWith("/")) { res.writeHead(301, { Location: ruta + "/" }); return res.end(); }
    archivo = path.join(archivo, "index.html");
  }
  let estado = 200;
  if (!fs.existsSync(archivo)) { archivo = path.join(DIST, "404.html"); estado = 404; }
  if (!fs.existsSync(archivo)) { res.writeHead(503, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Armando el sitio… recarga en un momento."); }
  const tipo = TIPOS[path.extname(archivo)] || "application/octet-stream";
  res.writeHead(estado, { "Content-Type": tipo, "Cache-Control": "no-store" });
  if (VIGILAR && path.extname(archivo) === ".html") return res.end(fs.readFileSync(archivo, "utf8").replace("</body>", RECARGA + "\n</body>"));
  fs.createReadStream(archivo).pipe(res);
}).listen(PUERTO, "0.0.0.0", () => {
  console.log(`Enletrados en local: http://localhost:${PUERTO}`);
  for (const lista of Object.values(os.networkInterfaces())) for (const i of lista || [])
    if (i.family === "IPv4" && !i.internal) console.log(`En el celular (misma wifi): http://${i.address}:${PUERTO}`);
  if (VIGILAR) vigilar();
});

// ---------- página local de revisión de pistas (/revisar/): solo en modo desarrollo y solo desde este computador ----------
function revision(req, res, ruta) {
  const L = require("./lib/contenido");
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
  const enviar = (estado, cuerpo, tipo = "application/json; charset=utf-8") => { res.writeHead(estado, { "Content-Type": tipo, "Cache-Control": "no-store" }); res.end(typeof cuerpo === "string" ? cuerpo : JSON.stringify(cuerpo)); };
  if (!local) return enviar(403, "La revisión solo se abre desde este computador (http://localhost).", "text/plain; charset=utf-8");
  if (!ruta.startsWith("/__api/")) return enviar(200, fs.readFileSync(path.join(__dirname, "revisar.html"), "utf8"), "text/html; charset=utf-8");
  const conAlertas = () => { const t = L.cargarTandas(), ctx = L.contexto(t); return { t, ctx }; };
  if (req.method === "GET" && ruta === "/__api/revision") {
    const { t, ctx } = conAlertas(), b = ctx.bloqueo;
    return enviar(200, { tandas: t.map(x => ({ tanda: x.tanda, titulo: x.titulo, items: x.items.map(i => Object.assign({}, i, { alertas: i.estado === "descartada" ? [] : L.alertas(i, ctx) })) })),
      dudosas: Object.entries(b.dudosas).map(([palabra, motivo]) => ({ palabra, motivo, decision: b.decisiones[palabra] || null })) });
  }
  if (req.method !== "POST") return enviar(405, { error: "método no permitido" });
  let cuerpo = "";
  req.on("data", c => { cuerpo += c; if (cuerpo.length > 1e6) req.destroy(); });
  req.on("end", () => {
    let d; try { d = JSON.parse(cuerpo); } catch (e) { return enviar(400, { error: "JSON inválido" }); }
    const ESTADOS = ["pendiente", "aprobada", "descartada"];
    if (ruta === "/__api/dudosa") {
      const b = L.cargarBloqueo();
      if (!b.dudosas[d.palabra] || !["permitir", "bloquear"].includes(d.decision)) return enviar(400, { error: "datos inválidos" });
      L.guardarDecision(d.palabra, d.decision); return enviar(200, { ok: true });
    }
    const tandas = L.cargarTandas(), t = tandas.find(x => x.tanda === d.tanda);
    if (!t) return enviar(404, { error: "no existe la tanda" });
    if (ruta === "/__api/lote") {
      if (!Array.isArray(d.palabras) || !ESTADOS.includes(d.estado)) return enviar(400, { error: "datos inválidos" });
      t.items.forEach(i => { if (d.palabras.includes(i.palabra)) i.estado = d.estado; });
      L.guardarTanda(t); return enviar(200, { ok: true, cambiadas: d.palabras.length });
    }
    if (ruta === "/__api/pista") {
      const i = t.items.find(x => x.palabra === d.palabra);
      if (!i) return enviar(404, { error: "no existe la palabra" });
      if (d.estado != null) { if (!ESTADOS.includes(d.estado)) return enviar(400, { error: "estado inválido" }); i.estado = d.estado; }
      if (d.pista != null) {
        const nueva = String(d.pista).trim().slice(0, 120);
        if (nueva && nueva !== i.pista) { if (!i.original) i.original = i.pista; i.pista = nueva; if (i.estado === "descartada") i.estado = "pendiente"; }
      }
      L.guardarTanda(t);
      const ctx = L.contexto(L.cargarTandas());
      return enviar(200, Object.assign({}, i, { alertas: i.estado === "descartada" ? [] : L.alertas(i, ctx) }));
    }
    enviar(404, { error: "ruta desconocida" });
  });
}

// ---------- demostraciones de diseño (/demos/): solo en modo desarrollo y solo desde este computador ----------
// /demos/x.html → herramientas/demos/x.html · /demos/img/… → fuente/imagenes/ · /demos/letras/… → fuente/letras/
function demos(req, res, ruta) {
  const local = ["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(req.socket.remoteAddress);
  if (!local) { res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" }); return res.end("Las demostraciones solo se abren desde este computador."); }
  const resto = ruta.slice("/demos/".length), base = resto.startsWith("img/") ? path.join(RAIZ, "fuente/imagenes") : resto.startsWith("letras/") ? path.join(RAIZ, "fuente/letras") : path.join(__dirname, "demos");
  const archivo = path.normalize(path.join(base, resto.replace(/^(img|letras)\//, "") || "index.html"));
  if (!archivo.startsWith(base) || !fs.existsSync(archivo) || fs.statSync(archivo).isDirectory()) { res.writeHead(404); return res.end(); }
  const tipos = Object.assign({ ".woff2": "font/woff2" }, TIPOS);
  res.writeHead(200, { "Content-Type": tipos[path.extname(archivo)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(archivo).pipe(res);
}

function construir() {
  const inicio = Date.now();
  try {
    execFileSync(process.execPath, [path.join(__dirname, "construir.js")], { cwd: RAIZ, stdio: "pipe" });
    console.log(`[${new Date().toLocaleTimeString("es")}] Sitio armado en ${Date.now() - inicio} ms · recargando ${oyentes.size} página(s)`);
    for (const r of oyentes) r.write("data: recargar\n\n");
  } catch (e) {
    const msg = String((e.stderr && e.stderr.toString()) || e.message).trim();
    console.error(`[${new Date().toLocaleTimeString("es")}] Error al construir (la página sigue con la versión anterior):\n${msg}`);
    for (const r of oyentes) r.write(`event: error-construccion\ndata: ${JSON.stringify(msg)}\n\n`);
  }
}
function vigilar() {
  construir();
  let espera = null;
  fs.watch(path.join(RAIZ, "fuente"), { recursive: true }, (tipo, archivo) => {
    if (!archivo || /(^|\/)\.|~$|\.swp$/.test(archivo)) return; // archivos temporales del editor
    clearTimeout(espera); espera = setTimeout(construir, 150);
  });
  console.log("Modo desarrollo: vigilando fuente/. Cada cambio rearma el sitio y recarga las páginas abiertas.");
}
