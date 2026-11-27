// Fondos de los niveles (aprobados el 27 nov 2026): un papel tapiz por lugar, que cambia con la hora del día dentro de
// cada lugar (niveles 1–10 de mañana, 11–20 de tarde, 21–30 de noche, con los colores oscuros), y un movimiento suave.
// Todo dibujado en código: cada nivel lleva solo su fondo (unos 2 KB dentro de su propia página), así no pesa en la
// portada ni en app.js. Movimiento solo con transform y opacity; se apaga con «reducir movimiento» y con el ajuste
// «Fondos con movimiento». Muestra para elegir el estilo: herramientas/demos/fondos_muestra.js.
"use strict";
const svg = s => `url('data:image/svg+xml,${encodeURIComponent(s.replace(/\s+/g, " ").trim())}')`;
const T = (w, h, cuerpo, c, relleno) => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="${relleno ? c : "none"}" stroke="${c}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${cuerpo}</svg>`);

// ---------- motivos (baldosas que se repiten), uno por lugar ----------
const MOTIVOS = {
  1: c => T(140, 140, `<path d="M30 110 Q34 70 40 40"/><g fill="${c}" stroke="none"><ellipse cx="36" cy="62" rx="4" ry="8" transform="rotate(-25 36 62)"/><ellipse cx="44" cy="58" rx="4" ry="8" transform="rotate(25 44 58)"/><ellipse cx="38" cy="48" rx="4" ry="8" transform="rotate(-25 38 48)"/><ellipse cx="46" cy="44" rx="4" ry="8" transform="rotate(25 46 44)"/><ellipse cx="41" cy="34" rx="3.5" ry="7"/></g><ellipse cx="100" cy="100" rx="18" ry="11"/><path d="M90 96l4 8M98 94l4 9M106 95l4 8"/><circle cx="104" cy="30" r="2" fill="${c}" stroke="none"/>`, c),
  2: c => T(130, 130, `<g transform="translate(34 38)"><circle r="4"/><path d="M0-6c-5-9 5-9 0 0M6 0c9-5 9 5 0 0M0 6c5 9-5 9 0 0M-6 0c-9 5-9-5 0 0"/></g><g transform="translate(96 96) scale(.8)"><circle r="4"/><path d="M0-6c-5-9 5-9 0 0M6 0c9-5 9 5 0 0M0 6c5 9-5 9 0 0M-6 0c-9 5-9-5 0 0"/></g><circle cx="98" cy="30" r="2" fill="${c}" stroke="none"/><circle cx="30" cy="104" r="2" fill="${c}" stroke="none"/>`, c),
  3: c => T(120, 120, `<rect x="8" y="78" width="30" height="16" rx="5"/><rect x="44" y="78" width="30" height="16" rx="5"/><rect x="26" y="100" width="30" height="16" rx="5"/><path d="M96 70V30M88 30h16l-3-10h-10z"/><circle cx="96" cy="36" r="3" fill="${c}" stroke="none"/><circle cx="40" cy="30" r="2" fill="${c}" stroke="none"/>`, c),
  4: c => T(160, 96, `<path d="M0 24q20-12 40 0t40 0t40 0t40 0"/><path d="M0 72q20-12 40 0t40 0t40 0t40 0"/><g transform="translate(112 34)"><circle r="3"/><path d="M0 3v18M-7 9h14M-9 15q9 9 18 0"/></g>`, c),
  5: c => T(160, 110, `<path d="M6 92l26-40 18 22 22-38 30 56"/><path d="M58 52l8-10 8 12" /><circle cx="128" cy="30" r="8"/><path d="M112 86h30"/>`, c),
  6: c => T(150, 110, `<path d="M0 80h150M0 92h150"/><path d="M12 76v20M42 76v20M72 76v20M102 76v20M132 76v20"/><rect x="40" y="18" width="40" height="24" rx="3"/><path d="M48 28h16M48 34h10"/><path d="M64 18v24" stroke-dasharray="3 3"/>`, c),
  7: c => T(130, 130, `<ellipse cx="30" cy="52" rx="7" ry="5" transform="rotate(-20 30 52)" fill="${c}" stroke="none"/><path d="M36 50V18l14 6"/><ellipse cx="86" cy="104" rx="6" ry="4.5" transform="rotate(-20 86 104)" fill="${c}" stroke="none"/><ellipse cx="108" cy="98" rx="6" ry="4.5" transform="rotate(-20 108 98)" fill="${c}" stroke="none"/><path d="M91 102V76l22-6v26"/><path d="M8 84h40M8 90h40M8 96h40" stroke-width="1"/>`, c),
  8: c => T(140, 120, `<path d="M10 56l30-24 30 24M18 50v34h44V50"/><rect x="30" y="60" width="10" height="10"/><rect x="46" y="60" width="10" height="10"/><path d="M84 104q8-8 16 0q8-8 16 0q8-8 16 0"/><circle cx="108" cy="30" r="2" fill="${c}" stroke="none"/>`, c),
  9: c => T(150, 150, `<path d="M30 60C30 36 52 26 64 28C64 46 52 62 30 60Z"/><path d="M30 60L58 32"/><path d="M104 126C96 104 110 88 122 86C126 104 118 120 104 126Z"/><path d="M104 126L119 92"/><circle cx="118" cy="40" r="1.8" fill="${c}" stroke="none"/>`, c),
  10: c => T(140, 140, `<path d="M30 20l3 9 9 3-9 3-3 9-3-9-9-3 9-3z"/><path d="M104 74l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/><path d="M76 124V96l4-14h8l4 14v28M74 124h20M80 82l4-6 4 6"/><circle cx="110" cy="26" r="1.8" fill="${c}" stroke="none"/><circle cx="34" cy="100" r="1.6" fill="${c}" stroke="none"/>`, c)
};

// ---------- colores: [arriba, abajo] por lugar y hora ----------
const CIELOS = {
  1: { manana: ["#FCF4E6", "#F6E7CF"], tarde: ["#FCE6CF", "#F3D2B8"], noche: ["#2A1E16", "#17110D"] },
  2: { manana: ["#FBF1EC", "#F4E3E3"], tarde: ["#FBE4DA", "#EFCFD6"], noche: ["#241A26", "#130F17"] },
  3: { manana: ["#F6F1E8", "#E9E1D3"], tarde: ["#F8E3CF", "#E8CDBB"], noche: ["#1E1F2B", "#111219"] },
  4: { manana: ["#F3F7F6", "#DDEBEE"], tarde: ["#FCE7D2", "#DCE8EC"], noche: ["#142230", "#0B141D"] },
  5: { manana: ["#F1F5F0", "#DFE9E2"], tarde: ["#FBE5D4", "#E3D8E6"], noche: ["#1C2230", "#10131C"] },
  6: { manana: ["#F7F2EA", "#E8E0D6"], tarde: ["#F9E2CC", "#E6D0C4"], noche: ["#221D1B", "#121010"] },
  7: { manana: ["#F8F0F4", "#EEE2EC"], tarde: ["#FBEADF", "#F1DCE4"], noche: ["#221A2C", "#120E19"] },
  8: { manana: ["#FBF3E9", "#F1E4D3"], tarde: ["#FBE2CF", "#EFD0C0"], noche: ["#241C18", "#130F0D"] },
  9: { manana: ["#F1F6EC", "#E1EDD8"], tarde: ["#F7EBD5", "#E5DFC5"], noche: ["#1F3326", "#0D1514"] },
  10: { manana: ["#EEF3F8", "#DDE6F0"], tarde: ["#FBE3D3", "#DCD6EC"], noche: ["#151B33", "#0A0E1E"] }
};

// ---------- movimiento de cada lugar ----------
const MOV = { 1: "harina", 2: "petalos", 3: "farolas", 4: "olas", 5: "nubes", 6: "humo", 7: "notas", 8: "ventanas", 9: "bosque", 10: "estrellas" };
const COLOR_P = {
  harina: { manana: "#F2C76E", tarde: "#F2C76E", noche: "#E8C27A" }, petalos: { manana: "#F2A7B8", tarde: "#EE9AA8", noche: "#B98AA4" },
  farolas: { manana: "#FFD98A", tarde: "#FFD98A", noche: "#FFD98A" }, ventanas: { manana: "#FFD98A", tarde: "#FFD98A", noche: "#FFD98A" },
  nubes: { manana: "rgba(255,255,255,.5)", tarde: "rgba(255,248,240,.45)", noche: "rgba(200,210,235,.08)" },
  humo: { manana: "rgba(140,130,120,.16)", tarde: "rgba(150,120,110,.15)", noche: "rgba(225,215,205,.07)" },
  notas: { manana: "rgba(122,78,140,.34)", tarde: "rgba(122,78,140,.38)", noche: "rgba(220,200,240,.30)" },
  bosque: { manana: "#7FA66B", tarde: "#8FA662", noche: "#7FA66B" }, estrellas: { manana: "#E2B65A", tarde: "#E2B65A", noche: "#FFE7A8" },
  olas: { manana: "rgba(79,134,150,", tarde: "rgba(79,134,150,", noche: "rgba(120,170,190," }
};

// azar con semilla: cada nivel siempre igual
function azar(semilla) { let s = semilla * 9301 + 49297; return (a, b) => { s = (s * 9301 + 49297) % 233280; return a + (s / 233280) * (b - a); }; }
const f1 = v => v.toFixed(1), f0 = v => v.toFixed(0);

const CSS_BASE = `html,body.nivel{background:transparent}
.fondo-mov{position:fixed;inset:0;z-index:-1;pointer-events:none;overflow:hidden;background:var(--fondo-nivel)}
.fondo-mov i{position:absolute;display:block;will-change:transform,opacity}
[data-fondo-quieto] .fondo-mov i{display:none}
.fondo-mov::before{content:"";position:absolute;inset:0;background:rgba(22,17,13,.74);opacity:0}
:root[data-tema="oscuro"]:not([data-hora="noche"]) .fondo-mov::before{opacity:1}
@media (prefers-color-scheme:dark){:root:not([data-tema="claro"]):not([data-hora="noche"]) .fondo-mov::before{opacity:1}}
@media (prefers-reduced-motion:reduce){.fondo-mov i{display:none}}`;
const CSS_MOV = {
  harina: `.fondo-mov .p{width:var(--t);height:var(--t);border-radius:50%;background:var(--pc);box-shadow:0 0 8px 2px rgba(232,180,90,.5);left:var(--x);bottom:-10px;animation:fsube var(--d) linear var(--r) infinite}
@keyframes fsube{0%{transform:translate(0,0);opacity:0}15%{opacity:.85}100%{transform:translate(var(--dx),-105vh);opacity:0}}`,
  petalos: `.fondo-mov .p{width:12px;height:8px;border-radius:60% 40% 60% 40%;background:var(--pc);opacity:.8;left:var(--x);top:-20px;animation:fcae var(--d) linear var(--r) infinite}
@keyframes fcae{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:.85}100%{transform:translate(var(--dx),110vh) rotate(500deg);opacity:.3}}`,
  farolas: `.fondo-mov .p{width:var(--t);height:var(--t);border-radius:50%;background:var(--pc);box-shadow:0 0 18px 8px rgba(255,214,120,.35);left:var(--x);top:var(--y);animation:fbrilla var(--d) ease-in-out var(--r) infinite alternate}
@keyframes fbrilla{from{opacity:.15;transform:scale(.8)}to{opacity:.8;transform:scale(1.1)}}`,
  ventanas: `.fondo-mov .p{width:10px;height:12px;border-radius:2px;background:var(--pc);box-shadow:0 0 10px 3px rgba(255,214,120,.35);left:var(--x);top:var(--y);animation:fbrilla var(--d) ease-in-out var(--r) infinite alternate}
@keyframes fbrilla{from{opacity:0}to{opacity:.75}}`,
  nubes: `.fondo-mov .p{width:var(--t);height:calc(var(--t)*.4);border-radius:999px;background:var(--pc);left:-30%;top:var(--y);animation:fpasa var(--d) linear var(--r) infinite}
@keyframes fpasa{from{transform:translateX(0)}to{transform:translateX(170vw)}}`,
  humo: `.fondo-mov .p{width:var(--t);height:var(--t);border-radius:50%;background:var(--pc);left:var(--x);bottom:-30px;animation:fhumo var(--d) ease-out var(--r) infinite}
@keyframes fhumo{0%{transform:translate(0,0) scale(.5);opacity:0}20%{opacity:1}100%{transform:translate(var(--dx),-100vh) scale(2.2);opacity:0}}`,
  notas: `.fondo-mov .p{left:var(--x);bottom:-30px;font:700 var(--t) Georgia,serif;color:var(--pc);animation:fnota var(--d) ease-in-out var(--r) infinite}
@keyframes fnota{0%{transform:translate(0,0) rotate(-8deg);opacity:0}15%{opacity:1}50%{transform:translate(var(--dx),-50vh) rotate(8deg)}100%{transform:translate(0,-100vh) rotate(-8deg);opacity:0}}`,
  olas: `.fondo-mov .p{left:-50%;width:200%;height:130px;bottom:var(--b);background-repeat:repeat-x;background-size:320px 130px;animation:fmece var(--d) ease-in-out infinite alternate}
@keyframes fmece{from{transform:translateX(0)}to{transform:translateX(-160px)}}`,
  bosque: `.fondo-mov .p{width:18px;height:18px;left:var(--x);top:-30px;background:var(--hoja) center/contain no-repeat;animation:fcae var(--d) linear var(--r) infinite}
@keyframes fcae{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:.9}100%{transform:translate(var(--dx),110vh) rotate(540deg);opacity:.2}}
.fondo-mov .l{width:6px;height:6px;border-radius:50%;background:#FFE58A;box-shadow:0 0 10px 4px rgba(255,214,110,.55);left:var(--x);top:var(--y);animation:fluz var(--d) ease-in-out var(--r) infinite alternate}
@keyframes fluz{0%{opacity:0;transform:translate(0,0)}50%{opacity:1}100%{opacity:.15;transform:translate(var(--dx),-40px)}}`,
  estrellas: `.fondo-mov .p{width:var(--t);height:var(--t);left:var(--x);top:var(--y);background:var(--pc);clip-path:polygon(50% 0,62% 38%,100% 50%,62% 62%,50% 100%,38% 62%,0 50%,38% 38%);animation:fbrilla var(--d) ease-in-out var(--r) infinite alternate}
@keyframes fbrilla{from{opacity:.1;transform:scale(.6)}to{opacity:.95;transform:scale(1)}}`
};

function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; }

// lo que va dentro de cada página de nivel: estilos y la capa con las partículas
function fondo(mundo, hora, nivel) {
  const [arriba, abajo] = CIELOS[mundo.id][hora], tipo = MOV[mundo.id], pc = COLOR_P[tipo][hora], R = azar(nivel);
  const trazo = hora === "noche" ? "rgba(233,223,203,.09)" : rgba(mundo.color, .13);
  const cielo = mundo.id === 9 && hora === "noche" ? `radial-gradient(120% 70% at 50% 0%,${arriba} 0%,#121D18 60%,${abajo} 100%)` : `linear-gradient(180deg,${arriba} 0%,${abajo} 100%)`;
  const h = [];
  const p = (estilo, txt) => h.push(`<i class="p" style="${estilo}">${txt || ""}</i>`);
  if (tipo === "harina") for (let i = 0; i < 14; i++) p(`--x:${f0(R(2, 98))}%;--t:${f1(R(3, 6))}px;--d:${f1(R(9, 16))}s;--r:-${f1(R(0, 16))}s;--dx:${f0(R(-40, 40))}px`);
  if (tipo === "petalos") for (let i = 0; i < 10; i++) p(`--x:${f0(R(2, 96))}%;--d:${f1(R(10, 17))}s;--r:-${f1(R(0, 17))}s;--dx:${f0(R(-70, 70))}px`);
  if (tipo === "farolas") for (let i = 0; i < 6; i++) p(`--x:${f0(R(4, 94))}%;--y:${f0(R(8, 92))}%;--t:${f0(R(6, 10))}px;--d:${f1(R(2.5, 5))}s;--r:-${f1(R(0, 5))}s`);
  if (tipo === "ventanas") for (let i = 0; i < 8; i++) p(`--x:${f0(R(4, 94))}%;--y:${f0(R(8, 92))}%;--d:${f1(R(3, 7))}s;--r:-${f1(R(0, 7))}s`);
  if (tipo === "nubes") for (let i = 0; i < 3; i++) p(`--y:${f0(R(6, 70))}%;--t:${f0(R(70, 120))}px;--d:${f1(R(40, 65))}s;--r:-${f1(R(0, 65))}s`);
  if (tipo === "humo") for (let i = 0; i < 8; i++) p(`--x:${f0(R(5, 90))}%;--t:${f0(R(18, 34))}px;--d:${f1(R(9, 15))}s;--r:-${f1(R(0, 15))}s;--dx:${f0(R(-40, 40))}px`);
  if (tipo === "notas") for (let i = 0; i < 9; i++) p(`--x:${f0(R(3, 92))}%;--t:${f0(R(18, 30))}px;--d:${f1(R(10, 17))}s;--r:-${f1(R(0, 17))}s;--dx:${f0(R(-30, 30))}px`, R(0, 1) < .5 ? "♪" : "♫");
  if (tipo === "estrellas") for (let i = 0; i < 12; i++) p(`--x:${f0(R(3, 96))}%;--y:${f0(R(4, 94))}%;--t:${f0(R(8, 14))}px;--d:${f1(R(1.8, 4))}s;--r:-${f1(R(0, 4))}s`);
  if (tipo === "olas") {
    const ola = c => svg(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="130" viewBox="0 0 320 130"><path d="M0 50q40-26 80 0t80 0t80 0t80 0V130H0Z" fill="${c}"/></svg>`);
    p(`--b:40px;--d:7s;opacity:.5;background-image:${ola(pc + ".45)")}`); p(`--b:0px;--d:9s;opacity:.65;animation-direction:alternate-reverse;background-image:${ola(pc + ".55)")}`);
  }
  if (tipo === "bosque") {
    for (let i = 0; i < 8; i++) p(`--x:${f0(R(2, 95))}%;--d:${f1(R(11, 18))}s;--r:-${f1(R(0, 18))}s;--dx:${f0(R(-60, 60))}px`);
    if (hora !== "manana") for (let i = 0; i < (hora === "noche" ? 12 : 5); i++) h.push(`<i class="l" style="--x:${f0(R(4, 96))}%;--y:${f0(R(10, 90))}%;--d:${f1(R(2.5, 5))}s;--r:-${f1(R(0, 5))}s;--dx:${f0(R(-20, 20))}px"></i>`);
  }
  const hoja = tipo === "bosque" ? `;--hoja:${svg(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M3 17C3 8 10 3 17 3C17 11 11 17 3 17Z" fill="${pc}"/><path d="M3 17L15 5" stroke="#4E6E3F" stroke-width="1.2"/></svg>`)}` : "";
  // con el tema oscuro, las nubes y el humo claros brillarían demasiado: usan su color de noche
  const oscuro = (tipo === "nubes" || tipo === "humo") && hora !== "noche" ? `\n:root[data-tema="oscuro"] .fondo-mov{--pc:${COLOR_P[tipo].noche}}@media (prefers-color-scheme:dark){:root:not([data-tema="claro"]) .fondo-mov{--pc:${COLOR_P[tipo].noche}}}` : "";
  const css = `:root{--fondo-nivel:${MOTIVOS[mundo.id](trazo)},${cielo};--pc:${tipo === "olas" ? pc + ".5)" : pc}${hoja}}\n${CSS_BASE}\n${CSS_MOV[tipo]}${oscuro}`;
  return { css, html: `<div class="fondo-mov" aria-hidden="true">${h.join("")}</div>` };
}
// El Diario del Pueblo: papel de periódico (titulares, columnas y recuadros de foto en sepia) y letras sueltas que
// suben despacio, como las palabras que vuelven al pueblo. Con el tema oscuro lleva el mismo velo que los niveles.
const PERIODICO = c => T(180, 150, `<path d="M10 16h96" stroke-width="6"/><path d="M10 28h70" stroke-width="3"/>
  <path d="M10 42h48M10 49h48M10 56h48M10 63h40M10 74h48M10 81h48M10 88h30" stroke-width="1.5"/>
  <rect x="68" y="40" width="40" height="28"/><path d="M68 40l40 28M108 40l-40 28" stroke-width="1"/>
  <path d="M68 76h40M68 83h40M68 90h32" stroke-width="1.5"/>
  <path d="M124 16h46M124 23h46M124 30h46M124 37h30M124 48h46M124 55h46M124 62h46M124 69h40M124 80h46M124 87h22" stroke-width="1.5"/>
  <path d="M118 10v90" stroke-width="1"/><path d="M10 108h160" stroke-width="1"/>
  <path d="M10 120h52M10 127h52M10 134h40M72 120h44M72 127h44M72 134h30M126 120h44M126 127h44M126 134h36" stroke-width="1.5"/>`, c);
const CSS_LETRAS = `.fondo-mov .p{left:var(--x);bottom:-40px;font:600 var(--t) Georgia,serif;color:var(--pc);animation:fletra var(--d) ease-in-out var(--r) infinite}
@keyframes fletra{0%{transform:translate(0,0) rotate(-10deg);opacity:0}15%{opacity:1}50%{transform:translate(var(--dx),-50vh) rotate(10deg)}100%{transform:translate(0,-100vh) rotate(-6deg);opacity:0}}`;
function fondoDiario() {
  const R = azar(2026), h = [], letras = "AEÑOSLRUTCMDPÁÉ";
  for (let i = 0; i < 11; i++) h.push(`<i class="p" style="--x:${f0(R(3, 92))}%;--t:${f0(R(18, 30))}px;--d:${f1(R(12, 20))}s;--r:-${f1(R(0, 20))}s;--dx:${f0(R(-30, 30))}px">${letras[Math.floor(R(0, letras.length))]}</i>`);
  const css = `:root{--fondo-nivel:${PERIODICO("rgba(74,58,40,.10)")},linear-gradient(180deg,#F8F2E4 0%,#EEE3CC 100%);--pc:rgba(74,58,40,.22)}\n${CSS_BASE}\n${CSS_LETRAS}
:root[data-tema="oscuro"] .fondo-mov{--pc:rgba(233,223,203,.16)}@media (prefers-color-scheme:dark){:root:not([data-tema="claro"]) .fondo-mov{--pc:rgba(233,223,203,.16)}}`;
  return { css, html: `<div class="fondo-mov" aria-hidden="true">${h.join("")}</div>` };
}
const horaDe = posicion => (posicion <= 10 ? "manana" : posicion <= 20 ? "tarde" : "noche");
module.exports = { fondo, fondoDiario, horaDe };
