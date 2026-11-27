// Muestra de fondos por lugar (papel tapiz en SVG + movimiento suave). Solo para elegir el estilo: todavía no está en
// el juego. La usa herramientas/demos/fondos_muestra.js, que la aplica sobre niveles reales y saca capturas y videos.
// Reglas: dibujados en código (1–2 KB cada uno), tenues detrás del crucigrama, movimiento solo con transform y opacity,
// y nada se mueve con «reducir movimiento».
"use strict";
// url('…') con comillas simples: así también se puede usar dentro de un atributo style="…"
const svg = s => `url('data:image/svg+xml,${encodeURIComponent(s.replace(/\s+/g, " "))}')`;

// ---------- motivos (cada uno es una baldosa que se repite) ----------
const TRIGO = c => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="140" height="140" viewBox="0 0 140 140" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round">
  <path d="M30 110 Q34 70 40 40"/><g fill="${c}" stroke="none"><ellipse cx="36" cy="62" rx="4" ry="8" transform="rotate(-25 36 62)"/><ellipse cx="44" cy="58" rx="4" ry="8" transform="rotate(25 44 58)"/>
  <ellipse cx="38" cy="48" rx="4" ry="8" transform="rotate(-25 38 48)"/><ellipse cx="46" cy="44" rx="4" ry="8" transform="rotate(25 46 44)"/><ellipse cx="41" cy="34" rx="3.5" ry="7"/></g>
  <ellipse cx="100" cy="100" rx="18" ry="11"/><path d="M90 96l4 8M98 94l4 9M106 95l4 8"/><circle cx="104" cy="30" r="2" fill="${c}" stroke="none"/><circle cx="70" cy="76" r="1.6" fill="${c}" stroke="none"/></svg>`);
const OLAS = c => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="96" viewBox="0 0 160 96" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round">
  <path d="M0 24 q20 -12 40 0 t40 0 t40 0 t40 0"/><path d="M0 72 q20 -12 40 0 t40 0 t40 0 t40 0"/>
  <g transform="translate(112 34)"><circle cx="0" cy="0" r="3"/><path d="M0 3v18M-7 9h14M-9 15q9 9 18 0"/></g></svg>`);
const NOTAS = c => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="130" height="130" viewBox="0 0 130 130" fill="${c}" stroke="${c}" stroke-width="2" stroke-linecap="round">
  <ellipse cx="30" cy="52" rx="7" ry="5" transform="rotate(-20 30 52)" stroke="none"/><path d="M36 50V18l14 6" fill="none"/>
  <ellipse cx="86" cy="104" rx="6" ry="4.5" transform="rotate(-20 86 104)" stroke="none"/><ellipse cx="108" cy="98" rx="6" ry="4.5" transform="rotate(-20 108 98)" stroke="none"/>
  <path d="M91 102V76l22-6v26" fill="none"/><path d="M8 84h40M8 90h40M8 96h40" stroke-width="1" opacity=".7" fill="none"/><circle cx="100" cy="30" r="2" stroke="none"/></svg>`);
const HOJAS = c => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="150" height="150" viewBox="0 0 150 150" fill="none" stroke="${c}" stroke-width="2" stroke-linecap="round">
  <path d="M30 60 C30 36 52 26 64 28 C64 46 52 62 30 60Z"/><path d="M30 60 L58 32"/>
  <path d="M104 126 C96 104 110 88 122 86 C126 104 118 120 104 126Z"/><path d="M104 126 L119 92"/><circle cx="118" cy="40" r="1.8" fill="${c}" stroke="none"/><circle cx="48" cy="112" r="1.4" fill="${c}" stroke="none"/></svg>`);

// ---------- los 4 fondos de la muestra ----------
const FONDOS = {
  "panaderia-manana": {
    nivel: 5, titulo: "Panadería · mañana", tema: "claro",
    fondo: `${TRIGO("rgba(192,96,58,.13)")}, linear-gradient(180deg, #FCF4E6 0%, #F6E7CF 100%)`,
    particulas: { tipo: "harina", n: 16 }
  },
  "puerto-tarde": {
    nivel: 104, titulo: "Puerto · tarde", tema: "claro",
    fondo: `${OLAS("rgba(63,120,138,.16)")}, linear-gradient(180deg, #FCE7D2 0%, #F3D6CB 55%, #DCE8EC 100%)`,
    particulas: { tipo: "olas", n: 0 }
  },
  "kiosco-tarde": {
    nivel: 194, titulo: "Kiosco de música · tarde", tema: "claro",
    fondo: `${NOTAS("rgba(122,78,140,.12)")}, linear-gradient(180deg, #FBEADF 0%, #F1DCE4 100%)`,
    particulas: { tipo: "notas", n: 10 }
  },
  "bosque-noche": {
    nivel: 265, titulo: "Bosque · noche", tema: "oscuro",
    fondo: `${HOJAS("rgba(127,166,107,.14)")}, radial-gradient(120% 70% at 50% 0%, #1F3326 0%, #121D18 60%, #0D1514 100%)`,
    particulas: { tipo: "bosque", n: 9 }
  }
};

// ---------- estilos del movimiento (se inyectan en la página) ----------
const CSS = `
/* el papel tapiz y el movimiento van en una sola capa fija, detrás del juego (el body queda transparente) */
html, body.nivel { background: transparent !important; }
.fondo-mov { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; background: var(--fondo-nivel); }
.fondo-mov i { position: absolute; display: block; will-change: transform, opacity; }
/* harina: puntitos claros que suben y se desvanecen */
.fondo-mov .harina { width: var(--t); height: var(--t); border-radius: 50%; background: #F2C76E; box-shadow: 0 0 8px 2px rgba(232,180,90,.55); left: var(--x); bottom: -10px;
  animation: sube var(--d) linear var(--r) infinite; }
@keyframes sube { 0% { transform: translate(0, 0); opacity: 0; } 15% { opacity: .85; } 100% { transform: translate(var(--dx), -105vh); opacity: 0; } }
/* notas que suben meciéndose */
.fondo-mov .nota { left: var(--x); bottom: -30px; font: 700 var(--t) Georgia, serif; color: rgba(122,78,140,.38); animation: nota var(--d) ease-in-out var(--r) infinite; }
@keyframes nota { 0% { transform: translate(0, 0) rotate(-8deg); opacity: 0; } 15% { opacity: 1; } 50% { transform: translate(var(--dx), -50vh) rotate(8deg); }
  100% { transform: translate(0, -100vh) rotate(-8deg); opacity: 0; } }
/* olas: dos franjas al pie que se mecen de lado */
.fondo-mov .ola { left: -50%; width: 200%; height: 130px; bottom: var(--b); background-repeat: repeat-x; background-size: 320px 130px; opacity: var(--o);
  animation: mece var(--d) ease-in-out infinite alternate; }
@keyframes mece { from { transform: translateX(0); } to { transform: translateX(-160px); } }
/* bosque: hojas que caen girando y luciérnagas que titilan */
.fondo-mov .hoja-cae { width: 18px; height: 18px; left: var(--x); top: -30px; animation: cae var(--d) linear var(--r) infinite; }
@keyframes cae { 0% { transform: translate(0, 0) rotate(0); opacity: 0; } 10% { opacity: .9; } 100% { transform: translate(var(--dx), 110vh) rotate(540deg); opacity: .2; } }
.fondo-mov .luz { width: 6px; height: 6px; border-radius: 50%; background: #FFE58A; box-shadow: 0 0 10px 4px rgba(255,214,110,.55); left: var(--x); top: var(--y);
  animation: titila var(--d) ease-in-out var(--r) infinite alternate; }
@keyframes titila { 0% { opacity: 0; transform: translate(0, 0); } 50% { opacity: 1; } 100% { opacity: .15; transform: translate(var(--dx), -40px); } }
@media (prefers-reduced-motion: reduce) { .fondo-mov { display: none; } }`;

const OLA_SVG = (c) => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="90" viewBox="0 0 320 90"><path d="M0 40 q40 -26 80 0 t80 0 t80 0 t80 0 V90 H0Z" fill="${c}"/></svg>`);
const HOJA_SVG = svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M3 17 C3 8 10 3 17 3 C17 11 11 17 3 17Z" fill="#7FA66B"/><path d="M3 17 L15 5" stroke="#4E6E3F" stroke-width="1.2"/></svg>`);

// arma la capa de movimiento dentro de la página (se ejecuta en el navegador)
function aplicar(f, css, extra) {
  const r = document.documentElement; r.dataset.tema = f.tema;
  const st = document.createElement("style"); st.textContent = css; document.head.appendChild(st);
  r.style.setProperty("--fondo-nivel", f.fondo);
  const c = document.createElement("div"); c.className = "fondo-mov"; c.setAttribute("aria-hidden", "true");
  const rnd = (a, b) => a + Math.random() * (b - a), h = [];
  const t = f.particulas.tipo;
  if (t === "harina") for (let i = 0; i < f.particulas.n; i++) h.push(`<i class="harina" style="--x:${rnd(2, 98)}%;--t:${rnd(3, 6).toFixed(1)}px;--d:${rnd(9, 16).toFixed(1)}s;--r:-${rnd(0, 16).toFixed(1)}s;--dx:${rnd(-40, 40).toFixed(0)}px"></i>`);
  if (t === "notas") for (let i = 0; i < f.particulas.n; i++) h.push(`<i class="nota" style="--x:${rnd(3, 92)}%;--t:${rnd(18, 30).toFixed(0)}px;--d:${rnd(10, 17).toFixed(1)}s;--r:-${rnd(0, 17).toFixed(1)}s;--dx:${rnd(-30, 30).toFixed(0)}px">${Math.random() < .5 ? "♪" : "♫"}</i>`);
  if (t === "olas") { h.push(`<i class="ola" style="--b:40px;--o:.5;--d:7s;background-image:${extra.ola1}"></i>`, `<i class="ola" style="--b:0px;--o:.65;--d:9s;animation-direction:alternate-reverse;background-image:${extra.ola2}"></i>`); }
  if (t === "bosque") {
    for (let i = 0; i < f.particulas.n; i++) h.push(`<i class="hoja-cae" style="--x:${rnd(2, 95)}%;--d:${rnd(11, 18).toFixed(1)}s;--r:-${rnd(0, 18).toFixed(1)}s;--dx:${rnd(-60, 60).toFixed(0)}px;background:${extra.hoja} center/contain no-repeat"></i>`);
    for (let i = 0; i < 12; i++) h.push(`<i class="luz" style="--x:${rnd(4, 96)}%;--y:${rnd(10, 90)}%;--d:${rnd(2.5, 5).toFixed(1)}s;--r:-${rnd(0, 5).toFixed(1)}s;--dx:${rnd(-20, 20).toFixed(0)}px"></i>`);
  }
  c.innerHTML = h.join(""); document.body.prepend(c);
}

module.exports = { FONDOS, CSS, aplicar, extra: { ola1: OLA_SVG("rgba(111,158,173,.45)"), ola2: OLA_SVG("rgba(79,134,150,.55)"), hoja: HOJA_SVG } };
