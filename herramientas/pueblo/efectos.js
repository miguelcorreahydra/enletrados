// Efectos de luz de las escenas (estilo «mágico»): se dibujan en SVG encima de la imagen de cada lugar.
// Cada función recibe el efecto de escenas.json ({ tipo, x, y, x2, y2 }) y la escala de la escena (k) y devuelve SVG.
// Las animaciones están en estilos.css (clases titila, flota, humo, fugaz, haz-e, nube-e, barco-e, bandera-e, nota-e, ave-e).
"use strict";
const r1 = v => Math.round(v * 10) / 10;
const COLORES = ["#C0603A", "#E2B65A", "#6E8B57", "#2F6E8A", "#E58B6B"];

// curva de una guirnalda entre dos puntos (cuelga un poco) y n puntos sobre ella
function curva(e, caida) {
  const cx = (e.x + e.x2) / 2, cy = Math.max(e.y, e.y2) + caida;
  const punto = t => [(1 - t) ** 2 * e.x + 2 * (1 - t) * t * cx + t * t * e.x2, (1 - t) ** 2 * e.y + 2 * (1 - t) * t * cy + t * t * e.y2];
  return { d: `M${e.x} ${e.y}Q${r1(cx)} ${r1(cy)} ${e.x2} ${e.y2}`, punto };
}

const EFECTOS = {
  ventanas: (e, k) => `<ellipse class="titila lento" cx="${e.x}" cy="${e.y}" rx="${r1(70 * k)}" ry="${r1(52 * k)}" fill="url(#e-luz)"/>` +
    `<ellipse cx="${e.x}" cy="${e.y}" rx="${r1(34 * k)}" ry="${r1(26 * k)}" fill="#FFE3A3" opacity=".35"/>`,
  humo: (e, k) => `<g class="humo" fill="#FFFFFF" opacity=".8"><circle cx="${r1(e.x + 10 * k)}" cy="${r1(e.y - 70 * k)}" r="${r1(16 * k)}"/>` +
    `<circle cx="${r1(e.x + 22 * k)}" cy="${r1(e.y - 110 * k)}" r="${r1(12 * k)}"/><circle cx="${r1(e.x + 14 * k)}" cy="${r1(e.y - 142 * k)}" r="${r1(9 * k)}"/></g>`,
  guirnalda: (e, k) => {
    const c = curva(e, 40 * k), n = 9; let s = `<path d="${c.d}" fill="none" stroke="#6B5A4B" stroke-width="${r1(2 * k)}"/>`;
    for (let i = 1; i < n; i++) { const [x, y] = c.punto(i / n), a = 9 * k; s += `<path d="M${r1(x - a)} ${r1(y)}h${r1(2 * a)}l${r1(-a)} ${r1(1.6 * a)}z" fill="${COLORES[i % 5]}" stroke="#6B3A22" stroke-width="${r1(1.4 * k)}" stroke-linejoin="round"/>`; }
    return s;
  },
  farolitos: (e, k) => {
    const n = 5; let s = "";
    for (let i = 0; i <= n; i++) { const t = i / n, x = e.x + (e.x2 - e.x) * t, y = e.y + (e.y2 - e.y) * t - 30 * k;
      s += `<circle class="titila" style="--i:${i}" cx="${r1(x)}" cy="${r1(y)}" r="${r1(26 * k)}" fill="url(#e-luz)"/><circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(6 * k)}" fill="#FFD98A" stroke="#6B3A22" stroke-width="${r1(1.6 * k)}"/>`; }
    return s;
  },
  agua: (e, k) => [[-14, -30], [10, -44], [22, -22], [-4, -56]].map(([dx, dy], i) =>
    `<circle class="titila" style="--i:${i}" cx="${r1(e.x + dx * k)}" cy="${r1(e.y + dy * k)}" r="${r1(5 * k)}" fill="#D9F2FA"/>`).join("") +
    `<ellipse cx="${e.x}" cy="${r1(e.y - 20 * k)}" rx="${r1(46 * k)}" ry="${r1(30 * k)}" fill="#BFE8F5" opacity=".35"/>`,
  mariposas: (e, k) => [[-70, -40, "#E58B6B"], [40, -80, "#F0C75E"], [90, -20, "#C9A0DC"]].map(([dx, dy, c], i) => {
    const x = e.x + dx * k, y = e.y + dy * k, a = 7 * k;
    return `<g class="flota" style="--i:${i}"><path d="M${r1(x)} ${r1(y)}l${r1(-a)} ${r1(-a)}a${r1(a * .5)} ${r1(a * .5)} 0 1 0 0 ${r1(a * 1.4)}zM${r1(x)} ${r1(y)}l${r1(a)} ${r1(-a)}a${r1(a * .5)} ${r1(a * .5)} 0 1 1 0 ${r1(a * 1.4)}z" fill="${c}" stroke="#6B3A22" stroke-width="${r1(1.2 * k)}"/></g>`;
  }).join(""),
  aves: (e, k) => [[-60, -40, 1], [10, -70, .8], [70, -30, .7]].map(([dx, dy, s], i) => {
    const x = e.x + dx * k, y = e.y + dy * k, a = 12 * k * s;
    return `<path class="ave-e flota" style="--i:${i}" d="M${r1(x)} ${r1(y)}q${r1(a / 2)} ${r1(-a / 2)} ${r1(a)} 0q${r1(a / 2)} ${r1(-a / 2)} ${r1(a)} 0" fill="none" stroke="#3A3F4E" stroke-width="${r1(3 * k)}" stroke-linecap="round"/>`;
  }).join(""),
  barca: (e, k) => { const x = e.x, y = e.y, a = k;
    return `<g class="barco-e"><path d="M${r1(x - 46 * a)} ${r1(y)}h${r1(92 * a)}l${r1(-14 * a)} ${r1(20 * a)}h${r1(-64 * a)}z" fill="#E0855E" stroke="#6B3A22" stroke-width="${r1(3 * a)}" stroke-linejoin="round"/>` +
      `<path d="M${r1(x)} ${r1(y)}v${r1(-62 * a)}" stroke="#6B3A22" stroke-width="${r1(3 * a)}"/><path d="M${r1(x + 2 * a)} ${r1(y - 60 * a)}l${r1(34 * a)} ${r1(52 * a)}h${r1(-34 * a)}z" fill="#FFF8EE" stroke="#6B3A22" stroke-width="${r1(2.4 * a)}" stroke-linejoin="round"/></g>`; },
  nubes: (e, k) => [[-90, 0, 1], [80, 26, .75]].map(([dx, dy, s], i) => { const x = e.x + dx * k, y = e.y + dy * k, a = 60 * k * s;
    return `<path class="nube-e" style="animation-duration:${36 + i * 12}s" d="M${r1(x - a)} ${r1(y)}h${r1(2 * a)}a${r1(a * .35)} ${r1(a * .35)} 0 0 0 ${r1(-a * .4)} ${r1(-a * .45)}a${r1(a * .5)} ${r1(a * .5)} 0 0 0 ${r1(-a * .9)} ${r1(-a * .1)}a${r1(a * .35)} ${r1(a * .35)} 0 0 0 ${r1(-a * .7)} ${r1(a * .55)}z" fill="#FFFFFF" opacity=".9"/>`; }).join(""),
  arcoiris: (e, k) => { const r = 170 * k; return `<g fill="none" stroke-width="${r1(9 * k)}" opacity=".5">` +
    ["#E58B6B", "#F0C75E", "#9FC28A", "#7FB3C4", "#A493C9"].map((c, i) => `<path d="M${r1(e.x - r + i * 9 * k)} ${r1(e.y + 40 * k)}a${r1(r - i * 9 * k)} ${r1(r - i * 9 * k)} 0 0 1 ${r1(2 * (r - i * 9 * k))} 0" stroke="${c}"/>`).join("") + "</g>"; },
  reloj: (e, k) => `<circle cx="${e.x}" cy="${r1(e.y - 70 * k)}" r="${r1(15 * k)}" fill="#FBF6EC" stroke="#6B3A22" stroke-width="${r1(3 * k)}"/>` +
    `<path d="M${e.x} ${r1(e.y - 70 * k)}v${r1(-9 * k)}M${e.x} ${r1(e.y - 70 * k)}l${r1(7 * k)} ${r1(3 * k)}" stroke="#6B3A22" stroke-width="${r1(2.4 * k)}" stroke-linecap="round"/>`,
  notas: (e, k) => [[-60, -10], [50, -40]].map(([dx, dy], i) => { const x = e.x + dx * k, y = e.y + dy * k, a = k;
    return `<g class="nota-e" style="--i:${i}"><path d="M${r1(x)} ${r1(y)}v${r1(-26 * a)}l${r1(16 * a)} ${r1(-5 * a)}v${r1(24 * a)}" fill="none" stroke-width="${r1(3 * a)}"/>` +
      `<ellipse cx="${r1(x - 4 * a)}" cy="${r1(y)}" rx="${r1(6 * a)}" ry="${r1(4.5 * a)}"/><ellipse cx="${r1(x + 12 * a)}" cy="${r1(y - 5 * a)}" rx="${r1(6 * a)}" ry="${r1(4.5 * a)}"/></g>`; }).join(""),
  bandera: (e, k) => `<path d="M${e.x} ${r1(e.y - 20 * k)}v${r1(-50 * k)}" stroke="#6B3A22" stroke-width="${r1(3 * k)}"/>` +
    `<path class="bandera-e" d="M${e.x} ${r1(e.y - 70 * k)}l${r1(30 * k)} ${r1(9 * k)}l${r1(-30 * k)} ${r1(10 * k)}z" fill="#C0603A" stroke="#6B3A22" stroke-width="${r1(2 * k)}" stroke-linejoin="round"/>`,
  luciernagas: (e, k) => [[-80, -30], [-40, -80], [20, -20], [70, -70], [110, -10], [-110, -60], [40, -110], [-20, -130]].map(([dx, dy], i) =>
    `<circle class="titila" style="--i:${i}" cx="${r1(e.x + dx * k)}" cy="${r1(e.y + dy * k)}" r="${r1(4 * k)}" fill="#F6E27A"/><circle class="titila" style="--i:${i}" cx="${r1(e.x + dx * k)}" cy="${r1(e.y + dy * k)}" r="${r1(14 * k)}" fill="url(#e-luz)"/>`).join(""),
  faro: (e, k) => `<path class="haz-e" style="transform-origin:${e.x}px ${r1(e.y + 30 * k)}px" d="M${e.x} ${r1(e.y + 30 * k)}L${r1(e.x - 560 * k)} ${r1(e.y - 90 * k)}v${r1(170 * k)}z" fill="#FFE3A3" opacity=".35"/>` +
    `<circle cx="${e.x}" cy="${r1(e.y + 30 * k)}" r="${r1(40 * k)}" fill="url(#e-luz)"/>`,
  estrellas: (e, k) => [[-300, -40], [-200, -110], [-90, -60], [20, -130], [150, -90], [260, -40], [-250, 20], [90, -20]].map(([dx, dy], i) => {
    const x = e.x + dx * k, y = e.y + dy * k, a = 7 * k;
    return `<path class="titila" style="--i:${i}" d="M${r1(x)} ${r1(y - a)}l${r1(a * .3)} ${r1(a * .7)} ${r1(a * .7)} ${r1(a * .3)} ${r1(-a * .7)} ${r1(a * .3)} ${r1(-a * .3)} ${r1(a * .7)} ${r1(-a * .3)} ${r1(-a * .7)} ${r1(-a * .7)} ${r1(-a * .3)} ${r1(a * .7)} ${r1(-a * .3)}z" fill="#FFF6D6"/>`;
  }).join(""),
  luna: (e, k) => { const r = 26 * k; return `<path d="M${r1(e.x + r * .3)} ${r1(e.y - r)}a${r1(r)} ${r1(r)} 0 1 0 ${r1(r * .7)} ${r1(r * 1.7)}a${r1(r * .8)} ${r1(r * .8)} 0 1 1 ${r1(-r * .7)} ${r1(-r * 1.7)}z" fill="#F7EFD6"/>`; },
  fugaz: (e, k) => `<g class="fugaz"><path d="M${e.x} ${e.y}l${r1(-70 * k)} ${r1(24 * k)}" stroke="#FFF6D6" stroke-width="${r1(3 * k)}" stroke-linecap="round"/><circle cx="${e.x}" cy="${e.y}" r="${r1(4 * k)}" fill="#FFF6D6"/></g>`
};

function dibujar(e, k) { const f = EFECTOS[e.tipo]; if (!f) throw new Error("Efecto desconocido: " + e.tipo); return f(e, k); }
module.exports = { dibujar };
