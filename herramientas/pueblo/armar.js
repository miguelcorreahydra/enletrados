// Arma las imágenes del pueblo de la portada y su geometría.
// Uso: node herramientas/pueblo/armar.js   (necesita las piezas de Kenney: sh herramientas/descargar_kenney.sh)
// Salidas en fuente/imagenes/: pueblo.webp (todo el pueblo; en la portada se ve apagado) y lugar-N.webp (cada lugar con
// color, recortado a su silueta: solo se bajan las de los lugares encendidos). Geometría en fuente/contenido/pueblo.json.
"use strict";
const fs = require("fs"), path = require("path");
const { componer, cerrar, posicion } = require("./componer"), { piezas, lugares } = require("./pueblo");
const RAIZ = path.join(__dirname, "../.."), ANCHO = 920, IMG = path.join(RAIZ, "fuente/imagenes");

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  const r = await componer(piezas, { ancho: ANCHO, calidad: 62, salida: path.join(IMG, "pueblo.webp") });
  const k = r.escala, a = v => Math.round(v * 10) / 10;
  const geo = { ancho: ANCHO, alto: Math.round(r.caja.h * k), lugares: {} };
  let total = r.bytes;
  for (const [id, celdas] of Object.entries(lugares)) {
    const casillas = new Set(celdas.map(([x, y]) => x + "," + y));
    const delLugar = q => q.l === +id || ((q.z || 0) <= 0.05 && casillas.has(q.x + "," + q.y));
    const c = await componer(piezas, { ancho: ANCHO, calidad: 80, salida: path.join(IMG, `lugar-${id}.webp`), capa: delLugar, recortar: true });
    total += c.bytes;
    // el pin va sobre la pieza más alta del lugar
    const alta = celdas.slice().sort((u, v) => posicion({ x: u[0], y: u[1], z: u[2] }).y - posicion({ x: v[0], y: v[1], z: v[2] }).y)[0];
    const pa = posicion({ x: alta[0], y: alta[1], z: alta[2] });
    geo.lugares[id] = { x: c.recorte.x, y: c.recorte.y, w: c.recorte.w, h: c.recorte.h, pin: [a((pa.x + 128 - r.caja.x) * k), a((pa.y + 135 - r.caja.y) * k)], kb: +(c.bytes / 1024).toFixed(1) };
  }
  fs.writeFileSync(path.join(RAIZ, "fuente/contenido/pueblo.json"), JSON.stringify(geo) + "\n");
  console.log(`pueblo.webp ${(r.bytes / 1024).toFixed(1)} KB · capas: ${Object.entries(geo.lugares).map(([i, l]) => i + ":" + l.kb).join(" ")} KB · ${geo.ancho}×${geo.alto}`);
  if (r.bytes >= 100 * 1024) { console.error("pueblo.webp pasa de 100 KB (regla 6)."); process.exitCode = 1; }
  await cerrar();
})();
