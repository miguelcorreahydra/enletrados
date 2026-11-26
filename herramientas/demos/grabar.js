// Graba las opciones de animación de /demos/animaciones.html: un video y un GIF por estilo, y tiras de cuadros.
// Uso: con npm run dev encendido, node herramientas/demos/grabar.js [carpeta de salida]
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const SALIDA = process.argv[2] || path.join(__dirname, "salida"), CUADROS = path.join(SALIDA, "cuadros");
fs.mkdirSync(CUADROS, { recursive: true });
const PASO = 40, FIN = 3400, CLAVES = [250, 700, 1150, 1400, 1700, 2400];
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 1200, height: 1000, deviceScaleFactor: 1.5 });
  await p.goto("http://localhost:8080/demos/animaciones.html?quieto", { waitUntil: "networkidle0" });
  await p.evaluate(() => Promise.all([...document.images].map(i => i.decode().catch(() => {}))));
  await p.evaluate(() => window.reproducir()); await new Promise(r => setTimeout(r, 300));
  const cajas = await p.evaluate(() => ["A", "B", "C"].map(e => [...document.querySelectorAll(`.escenario[data-estilo="${e}"]`)].map(x => { const r = x.getBoundingClientRect(); return { x: r.x, y: r.y + scrollY, w: r.width, h: r.height }; })));
  for (const [i, est] of ["A", "B", "C"].entries()) {
    const c = cajas[i], clip = { x: c[0].x, y: c[0].y, width: c[0].w, height: c[2].y + c[2].h - c[0].y };
    const dir = path.join(CUADROS, est); fs.mkdirSync(dir, { recursive: true });
    let n = 0;
    for (let t = 0; t <= FIN; t += PASO) { await p.evaluate(t => window.enInstante(t), t); await p.screenshot({ path: path.join(dir, `c${String(n++).padStart(4, "0")}.png`), clip }); }
    const mp4 = path.join(SALIDA, `animacion-${est}.mp4`), gif = path.join(SALIDA, `animacion-${est}.gif`);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(1000 / PASO), "-i", path.join(dir, "c%04d.png"), "-vf", "scale=450:-2", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "20", mp4]);
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", String(1000 / PASO), "-i", path.join(dir, "c%04d.png"), "-vf", "scale=300:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer", gif]);
    // tira: los 3 momentos (filas) en 6 instantes (columnas)
    const tira = path.join(SALIDA, `tira-${est}.png`), arg = [];
    for (const t of CLAVES) arg.push("-i", path.join(dir, `c${String(Math.round(t / PASO)).padStart(4, "0")}.png`));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...arg, "-filter_complex", CLAVES.map((_, k) => `[${k}:v]scale=300:-1,pad=iw+8:ih:0:0:color=#EDE3D3[v${k}]`).join(";") + ";" + CLAVES.map((_, k) => `[v${k}]`).join("") + `hstack=inputs=${CLAVES.length}`, tira]);
    console.log(est, "listo");
  }
  await nav.close(); console.log("Salida en", SALIDA);
})();
