// Música y efectos del anuncio, sintetizados con código (sin archivos ni derechos de terceros).
// Ritmo alegre a 124 pulsos por minuto: bombo, palmas, platillo, bajo y marimba con la progresión Do–Sol–La menor–Fa,
// más efectos sincronizados con los eventos del video (cada palabra, nivel completo, cofre, pueblo, vecino y final).
"use strict";
const fs = require("fs");
const SR = 44100;

function sintetizar(salida, segundos, eventos) {
  const n = Math.ceil(segundos * SR), mix = new Float32Array(n);
  const sumar = (t0, f) => { const i0 = Math.floor(t0 * SR); for (let i = 0; i < f.length && i0 + i < n; i++) if (i0 + i >= 0) mix[i0 + i] += f[i]; };
  const env = (t, a, d) => t < a ? t / a : Math.exp(-(t - a) / d);
  const nota = m => 440 * Math.pow(2, (m - 69) / 12);
  // instrumentos
  const marimba = (f, dur, vol) => { const s = new Float32Array(Math.floor(dur * SR)); for (let i = 0; i < s.length; i++) { const t = i / SR, e = env(t, 0.004, dur / 4);
    s[i] = vol * e * (Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(2 * Math.PI * f * 4 * t) * Math.exp(-t * 30)); } return s; };
  const bajo = (f, dur, vol) => { const s = new Float32Array(Math.floor(dur * SR)); for (let i = 0; i < s.length; i++) { const t = i / SR, e = env(t, 0.006, dur / 2.5), ph = (f * t) % 1;
    s[i] = vol * e * (2 * Math.abs(2 * ph - 1) - 1); } return s; };
  const bombo = vol => { const s = new Float32Array(Math.floor(0.25 * SR)); let ph = 0; for (let i = 0; i < s.length; i++) { const t = i / SR, f = 50 + 90 * Math.exp(-t * 28); ph += f / SR;
    s[i] = vol * Math.sin(2 * Math.PI * ph) * Math.exp(-t * 11); } return s; };
  let semilla = 7; const ruido = () => { semilla = (semilla * 16807) % 2147483647; return semilla / 1073741823.5 - 1; };
  const palmas = vol => { const s = new Float32Array(Math.floor(0.18 * SR)); let lp = 0; for (let i = 0; i < s.length; i++) { const t = i / SR, r = ruido(); lp += 0.35 * (r - lp);
    s[i] = vol * (r - lp) * (Math.exp(-t * 24) + 0.6 * Math.exp(-Math.abs(t - 0.012) * 300)); } return s; };
  const platillo = vol => { const s = new Float32Array(Math.floor(0.05 * SR)); let prev = 0; for (let i = 0; i < s.length; i++) { const r = ruido(); s[i] = vol * (r - prev) * Math.exp(-i / SR * 70); prev = r; } return s; };
  const destello = (t0, base, vol) => [0, 4, 7, 12, 16].forEach((m, k) => sumar(t0 + k * 0.045, marimba(nota(base + m), 0.5, vol)));

  // ---------- música de fondo ----------
  const pulso = 60 / 124, inicio = 0, finMusica = (eventos.find(e => e.e === "final") || { t: segundos * 1000 }).t / 1000;
  const acordes = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]], raices = [36, 31, 33, 29]; // Do, Sol, La m, Fa
  const entraBateria = ((eventos.find(e => e.e === "palabra") || { t: 1500 }).t / 1000) - 0.25;
  for (let b = 0; inicio + b * pulso < finMusica; b++) {
    const t = inicio + b * pulso, compas = Math.floor(b / 4) % 4, acorde = acordes[compas];
    if (t >= entraBateria) {
      sumar(t, bombo(0.75)); if (b % 2 === 1) sumar(t, palmas(0.32));
      sumar(t + pulso / 2, platillo(0.16)); sumar(t, platillo(0.08));
      sumar(t, bajo(nota(raices[compas]), pulso * 0.45, 0.22)); sumar(t + pulso / 2, bajo(nota(raices[compas] + 12), pulso * 0.4, 0.16));
    }
    for (let k = 0; k < 4; k++) sumar(t + k * pulso / 4, marimba(nota(acorde[(b * 4 + k) % 3] + 12 + (k === 3 ? 12 : 0)), 0.28, t >= entraBateria ? 0.075 : 0.1));
  }
  // final: acorde largo y brillante
  [60, 64, 67, 72, 76].forEach((m, k) => sumar(finMusica + k * 0.03, marimba(nota(m), 2.2, 0.12)));
  sumar(finMusica, bajo(nota(36), 1.6, 0.25));

  // ---------- efectos ----------
  let k = 0;
  for (const ev of eventos) {
    const t = ev.t / 1000;
    if (ev.e === "palabra") { destello(t, 72 + (k++ % 3) * 2, 0.16); }
    if (ev.e === "completo") { [0, 4, 7, 12, 16, 19, 24].forEach((m, i) => sumar(t + i * 0.07, marimba(nota(67 + m), 0.7, 0.15))); }
    if (ev.e === "cofre") { sumar(t, bajo(nota(43), 0.25, 0.2)); destello(t + 0.2, 79, 0.14); destello(t + 0.45, 84, 0.1); }
    if (ev.e === "lugar") { for (let i = 0; i < 14; i++) sumar(t + 0.3 + i * 0.06, marimba(nota(72 + i * 2), 0.6, 0.07 + i * 0.004)); }
    if (ev.e === "vecino") { destello(t + 0.6, 76, 0.13); }
  }
  // ---------- mezcla: suavizar picos y normalizar ----------
  let max = 0; for (let i = 0; i < n; i++) { mix[i] = Math.tanh(mix[i] * 1.1); max = Math.max(max, Math.abs(mix[i])); }
  const g = 0.89 / (max || 1), buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + n * 2, 4); buf.write("WAVEfmt ", 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 2, 28); buf.writeUInt16LE(2, 32); buf.writeUInt16LE(16, 34); buf.write("data", 36); buf.writeUInt32LE(n * 2, 40);
  // salida suave de 0,4 s al final
  for (let i = 0; i < n; i++) { const fade = Math.min(1, (n - i) / (0.4 * SR)); buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(mix[i] * g * fade * 32767))), 44 + i * 2); }
  fs.writeFileSync(salida, buf);
}
module.exports = { sintetizar };
