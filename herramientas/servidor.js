// Servidor local para probar dist/ en el computador y en el celular (misma red wifi). Sin dependencias.
// Uso: node herramientas/servidor.js [puerto, 8080 por omisión]
"use strict";
const http = require("http"), fs = require("fs"), path = require("path"), os = require("os");
const DIST = path.join(__dirname, "..", "dist"), PUERTO = +(process.argv[2] || 8080);
const TIPOS = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json",
  ".svg": "image/svg+xml", ".png": "image/png", ".webp": "image/webp", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".webmanifest": "application/manifest+json" };

http.createServer((req, res) => {
  let ruta = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let archivo = path.normalize(path.join(DIST, ruta));
  if (!archivo.startsWith(DIST)) { res.writeHead(403); return res.end(); }
  if (fs.existsSync(archivo) && fs.statSync(archivo).isDirectory()) {
    if (!ruta.endsWith("/")) { res.writeHead(301, { Location: ruta + "/" }); return res.end(); }
    archivo = path.join(archivo, "index.html");
  }
  let estado = 200;
  if (!fs.existsSync(archivo)) { archivo = path.join(DIST, "404.html"); estado = 404; }
  res.writeHead(estado, { "Content-Type": TIPOS[path.extname(archivo)] || "application/octet-stream", "Cache-Control": "no-store" });
  fs.createReadStream(archivo).pipe(res);
}).listen(PUERTO, "0.0.0.0", () => {
  console.log(`Enletrados en local: http://localhost:${PUERTO}`);
  for (const lista of Object.values(os.networkInterfaces())) for (const i of lista || [])
    if (i.family === "IPv4" && !i.internal) console.log(`En el celular (misma wifi): http://${i.address}:${PUERTO}`);
});
