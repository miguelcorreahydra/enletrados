// Arma la escena de cada lugar (la tarjeta de «nivel completado»): un acercamiento a ese lugar dentro de la maqueta,
// con sus 6 detalles. Cada detalle de piezas es una capa recortada; los efectos de luz se dibujan en SVG al armar el sitio.
// Uso: node herramientas/pueblo/escenas.js   (necesita las piezas de Kenney: sh herramientas/descargar_kenney.sh)
// Salidas: fuente/imagenes/escena-N.webp, escena-N-dK.webp y fuente/contenido/escenas.json.
"use strict";
const fs = require("fs"), path = require("path");
const { componer, cerrar, posicion } = require("./componer"), { piezas, efectos } = require("./pueblo");
const RAIZ = path.join(__dirname, "../.."), IMG = path.join(RAIZ, "fuente/imagenes");
const ANCHO = 640, ALTO = 400; // proporción 16:10, igual que la tarjeta
const APAGADO = "saturate(.22) brightness(1.1) contrast(.82)"; // los alrededores: el protagonista es el lugar
const ANCHO_MIN = 1150;              // encuadre mínimo en píxeles de la maqueta (unas 5 casillas)

// puntos de una casilla en la composición: arriba del bloque y centro de su frente
const arriba = ([x, y, z]) => { const p = posicion({ x, y, z }); return [p.x + 128, p.y + 186]; };
const frente = ([x, y, z]) => { const p = posicion({ x, y, z }); return [p.x + 128, p.y + 268]; };

(async () => {
  fs.mkdirSync(IMG, { recursive: true });
  const salida = {};
  for (let id = 1; id <= 10; id++) {
    const del = piezas.filter(q => q.l === id);
    // encuadre: todas las piezas del lugar y sus efectos, con margen, en proporción 16:10
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    const incluir = (x, y) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
    for (const q of del) { const p = posicion(q); incluir(p.x + 14, p.y + 120); incluir(p.x + 242, p.y + 347); }
    for (const e of efectos[id] || []) { const [ax, ay] = arriba(e.en); incluir(ax - 60, ay - 60); incluir(ax + 60, ay + 30); }
    const m = 110; x0 -= m; y0 -= m; x1 += m; y1 += m;
    let w = Math.max(x1 - x0, ANCHO_MIN), h = y1 - y0, cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    if (w / h > ANCHO / ALTO) h = w * ALTO / ANCHO; else w = h * ANCHO / ALTO;
    const recorte = { x: Math.round(cx - w / 2), y: Math.round(cy - h / 2), w: Math.round(w), h: Math.round(h) }, k = ANCHO / recorte.w;
    const enEscena = ([x, y]) => [Math.round((x - recorte.x) * k), Math.round((y - recorte.y) * k)];

    // base: todo menos los detalles de este lugar
    const base = await componer(piezas.filter(q => !(q.l === id && q.d)).map(q => q.l === id ? q : Object.assign({}, q, { filtro: APAGADO })), { ancho: ANCHO, calidad: 78, recorte, salida: path.join(IMG, `escena-${id}.webp`) });
    const capas = {}; let bytes = base.bytes;
    for (let d = 1; d <= 6; d++) {
      if (!del.some(q => q.d === d)) continue;
      // la capa la tapan las piezas de adelante, salvo los detalles que todavía no aparecen (los de número mayor)
      const enJuego = piezas.filter(q => !(q.l === id && q.d > d)).map(q => q.l === id ? q : Object.assign({}, q, { filtro: APAGADO }));
      const c = await componer(enJuego, { ancho: ANCHO, calidad: 80, recorte, capa: q => q.l === id && q.d === d, recortar: true, salida: path.join(IMG, `escena-${id}-d${d}.webp`) });
      capas[d] = c.recorte; bytes += c.bytes;
    }
    const efs = (efectos[id] || []).map(e => {
      const [x, y] = enEscena(e.tipo === "ventanas" || e.tipo === "reloj" ? frente(e.en) : arriba(e.en));
      const r = { d: e.d, tipo: e.tipo, x, y };
      if (e.hasta) { const [x2, y2] = enEscena(arriba(e.hasta)); r.x2 = x2; r.y2 = y2; }
      return r;
    });
    // Tilde se posa sobre la pieza más alta del lugar (sin contar los detalles)
    const alta = del.filter(q => !q.d).sort((a, b) => posicion(a).y - posicion(b).y)[0];
    salida[id] = { ancho: ANCHO, alto: ALTO, escala: +k.toFixed(4), capas, efectos: efs, tilde: enEscena([posicion(alta).x + 128, posicion(alta).y + 172]), kb: +(bytes / 1024).toFixed(1) };
    console.log(`escena ${id}: ${(bytes / 1024).toFixed(1)} KB en total (base ${(base.bytes / 1024).toFixed(1)} KB, ${Object.keys(capas).length} capas)`);
  }
  fs.writeFileSync(path.join(RAIZ, "fuente/contenido/escenas.json"), JSON.stringify(salida) + "\n");
  await cerrar();
})();
