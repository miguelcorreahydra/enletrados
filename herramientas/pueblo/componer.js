// Compone escenas isométricas con las piezas de Kenney «Sketch Town» (licencia CC0, www.kenney.nl).
// Las piezas se bajan a datos/kenney/ (esa carpeta no va a GitHub); lo que se publica es la imagen ya armada.
// Uso como módulo: componer(piezas, { ancho, salida, calidad, recorte }) → escribe un WebP y devuelve la geometría.
//   piezas: [{ x, y, z, t }] con x, y en la cuadrícula, z = nivel (0 = suelo) y t = nombre de la pieza («grass_center_N»).
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const RAIZ = path.join(__dirname, "../.."), KENNEY = path.join(RAIZ, "datos/kenney");
const CARPETAS = ["sketch-town/Tiles", "sketch-town-expansion/Tiles"].map(c => path.join(KENNEY, c));
// Geometría de Tiled para este paquete: rombo de 232×110, imagen de 256×352, desplazamiento (-12, 6).
// Cada nivel sube 104 px: lo que miden los costados de un bloque.
const MX = 116, MY = 55, NIVEL = 104, IW = 256, IH = 352;
const archivo = t => { for (const c of CARPETAS) { const f = path.join(c, t + ".png"); if (fs.existsSync(f)) return f; } throw new Error("No existe la pieza " + t); };

// posición de la esquina superior izquierda de la imagen de una pieza, en píxeles de la composición
const posicion = p => ({ x: (p.x - p.y) * MX - MX - 12, y: (p.x + p.y) * MY + 2 * MY + 6 - IH - (p.z || 0) * NIVEL });
// orden de dibujo: de atrás hacia adelante y de abajo hacia arriba
const ordenar = piezas => piezas.slice().sort((a, b) => (a.x + a.y) - (b.x + b.y) || (a.z || 0) - (b.z || 0) || a.x - b.x);

let nav = null;
async function navegador() { return nav || (nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true })); }
async function cerrar() { if (nav) await nav.close(); nav = null; }

// op.capa(pieza) → true: arma solo las piezas de un lugar. Las demás se dibujan «borrando» (destination-out), así lo
// que queda delante del lugar lo tapa igual que en la imagen completa. Con op.recortar se recorta al contenido visible.
async function componer(piezas, op) {
  const lista = ordenar(piezas).map(p => Object.assign({}, p, posicion(p), op.capa ? { borra: !op.capa(p) } : {}));
  const rc = op.recorte;
  // la caja de dibujo incluye el recorte, aunque salga de la maqueta (por ejemplo, el cielo sobre el faro)
  const minX = Math.min(...lista.map(p => p.x), rc ? rc.x : Infinity), minY = Math.min(...lista.map(p => p.y), rc ? rc.y : Infinity);
  const maxX = Math.max(...lista.map(p => p.x + IW), rc ? rc.x + rc.w : -Infinity), maxY = Math.max(...lista.map(p => p.y + IH), rc ? rc.y + rc.h : -Infinity);
  const nombres = [...new Set(lista.map(p => p.t))];
  const imagenes = Object.fromEntries(nombres.map(t => [t, "data:image/png;base64," + fs.readFileSync(archivo(t)).toString("base64")]));
  const recorte = op.recorte || null; // { x, y, w, h } en píxeles de la composición, si se quiere solo una parte
  const b = await navegador(), p = await b.newPage();
  const res = await p.evaluate(async (lista, imagenes, caja, ancho, recorte, filtro, recortarAlfa) => {
    const im = {};
    for (const [k, v] of Object.entries(imagenes)) { const i = new Image(); i.src = v; await i.decode(); im[k] = i; }
    const c = document.createElement("canvas"); c.width = caja.w; c.height = caja.h; const x = c.getContext("2d");
    for (const q of lista) {
      x.globalCompositeOperation = q.borra ? "destination-out" : "source-over";
      x.filter = q.filtro && !q.borra ? q.filtro : "none"; // por ejemplo, los alrededores apagados en las escenas
      x.drawImage(im[q.t], q.x - caja.x, q.y - caja.y);
    }
    x.globalCompositeOperation = "source-over";
    const r = recorte ? { x: recorte.x - caja.x, y: recorte.y - caja.y, w: recorte.w, h: recorte.h } : { x: 0, y: 0, w: caja.w, h: caja.h };
    const s = document.createElement("canvas"); s.width = ancho; s.height = Math.round(r.h * ancho / r.w);
    const y = s.getContext("2d"); y.imageSmoothingQuality = "high"; if (filtro) y.filter = filtro;
    y.drawImage(c, r.x, r.y, r.w, r.h, 0, 0, s.width, s.height);
    if (!recortarAlfa) return { png: s.toDataURL("image/png"), bb: null };
    const d = y.getImageData(0, 0, s.width, s.height).data; let x0 = s.width, y0 = s.height, x1 = -1, y1 = -1;
    for (let j = 0; j < s.height; j++) for (let i = 0; i < s.width; i++) if (d[(j * s.width + i) * 4 + 3] > 8) { if (i < x0) x0 = i; if (i > x1) x1 = i; if (j < y0) y0 = j; if (j > y1) y1 = j; }
    const bb = { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 }, t = document.createElement("canvas"); t.width = bb.w; t.height = bb.h;
    t.getContext("2d").drawImage(s, bb.x, bb.y, bb.w, bb.h, 0, 0, bb.w, bb.h);
    return { png: t.toDataURL("image/png"), bb };
  }, lista, imagenes, { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, op.ancho || 1080, recorte, op.filtro || null, !!op.recortar);
  const png = res.png;
  await p.close();
  const tmp = op.salida.replace(/\.webp$/, ".tmp.png");
  fs.writeFileSync(tmp, Buffer.from(png.split(",")[1], "base64"));
  if (op.salida.endsWith(".png")) fs.renameSync(tmp, op.salida);
  else { execFileSync("cwebp", ["-quiet", "-q", String(op.calidad || 80), "-alpha_q", "90", "-m", "6", tmp, "-o", op.salida]); fs.unlinkSync(tmp); }
  return { recorte: res.bb, caja: { x: minX, y: minY, w: maxX - minX, h: maxY - minY }, escala: (op.ancho || 1080) / ((recorte || { w: maxX - minX }).w), bytes: fs.statSync(op.salida).size };
}

module.exports = { componer, cerrar, posicion, MX, MY, NIVEL, IW, IH };
