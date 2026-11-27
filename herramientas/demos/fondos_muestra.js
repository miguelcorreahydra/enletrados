// Muestra de fondos: aplica los 4 de fondos.js sobre niveles reales (servidor local) y deja capturas y videos en
// herramientas/demos/salida/fondos/. Uso: con npm run dev encendido, node herramientas/demos/fondos_muestra.js
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { FONDOS, CSS, aplicar, extra } = require("./fondos");
const BASE = "http://localhost:8080", SAL = path.join(__dirname, "salida/fondos"), espera = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SAL, { recursive: true });
(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  for (const [id, f] of Object.entries(FONDOS)) {
    const ctx = await nav.createBrowserContext(), p = await ctx.newPage();
    await p.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.setRequestInterception(true); p.on("request", r => (r.url().startsWith(BASE) ? r.continue() : r.abort()));
    await p.goto(BASE + "/", { waitUntil: "load" });
    await p.evaluate(n => { localStorage.clear(); localStorage.setItem("enl_progreso", JSON.stringify({ hechos: Array.from({ length: n - 1 }, (_, i) => i + 1), monedas: 240, llegada: "2026-11-01" })); }, f.nivel);
    await p.goto(`${BASE}/nivel/${f.nivel}/`, { waitUntil: "load" }); await espera(1500);
    await p.evaluate(`(${aplicar})(${JSON.stringify(f)}, ${JSON.stringify(CSS)}, ${JSON.stringify(extra)})`);
    // una palabra ya puesta, para que se vea como una partida
    const w = await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras[0].p);
    const pts = await p.evaluate(w => { const fi = [...document.querySelectorAll(".letra")], u = new Set(); return w.split("").map(l => { const i = fi.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = fi[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, w);
    await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); for (const [x, y] of pts.slice(1)) await p.mouse.move(x, y, { steps: 5 }); await p.mouse.up();
    await espera(2500);
    await p.screenshot({ path: path.join(SAL, `${id}.png`) });
    // 6 s de movimiento, a 12 cuadros por segundo
    const dir = path.join(SAL, id); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir);
    for (let i = 0; i < 72; i++) { const t0 = Date.now(); await p.screenshot({ path: path.join(dir, String(i).padStart(3, "0") + ".jpg"), type: "jpeg", quality: 85 }); await espera(Math.max(0, 83 - (Date.now() - t0))); }
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-framerate", "12", "-i", path.join(dir, "%03d.jpg"), "-vf", "scale=780:-2", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(SAL, `${id}.mp4`)]);
    fs.rmSync(dir, { recursive: true, force: true });
    console.log("listo:", f.titulo); await ctx.close();
  }
  await nav.close();
  const ids = Object.keys(FONDOS), ent = ids.flatMap(i => ["-i", path.join(SAL, i + ".png")]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...ent, "-filter_complex", "[0][1][2][3]hstack=inputs=4,scale=1560:-2", path.join(SAL, "los-4-fondos.png")]);
  const entv = ids.flatMap(i => ["-i", path.join(SAL, i + ".mp4")]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", ...entv, "-filter_complex", "[0][1][2][3]hstack=inputs=4,scale=1560:-2", "-c:v", "libx264", "-pix_fmt", "yuv420p", path.join(SAL, "los-4-fondos.mp4")]);
  console.log("Muestra en", SAL);
})();
