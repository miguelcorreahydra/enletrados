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
