// Graba un video del juego real: un nivel, la hoja de nivel completado y la portada con el lugar que se enciende.
// Uso: con npm run dev encendido, node herramientas/demos/video_juego.js [salida.mp4]
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), path = require("path"), fs = require("fs"), { execFileSync } = require("child_process");
const SALIDA = process.argv[2] || path.join(__dirname, "salida/juego.mp4"), BASE = "http://localhost:8080", espera = ms => new Promise(r => setTimeout(r, ms));
async function formar(p, palabra) {
  const pts = await p.evaluate(w => { const f = [...document.querySelectorAll(".letra")], u = new Set();
    return w.split("").map(l => { const i = f.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = f[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, palabra);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); await espera(120);
  for (const [x, y] of pts.slice(1)) { await p.mouse.move(x, y, { steps: 10 }); await espera(90); }
  await espera(150); await p.mouse.up();
}
(async () => {
  fs.mkdirSync(path.dirname(SALIDA), { recursive: true });
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage(); await p.setViewport({ width: 390, height: 780, deviceScaleFactor: 2 });
  await p.setRequestInterception(true); p.on("request", r => r.url().startsWith(BASE) || r.url().startsWith("data:") ? r.continue() : r.abort());
  await p.goto(BASE + "/nivel/4/", { waitUntil: "load" }); await p.evaluate(() => localStorage.clear()); await p.reload({ waitUntil: "load" }); await espera(800);
  const webm = SALIDA.replace(/\.mp4$/, ".webm"), rec = await p.screencast({ path: webm });
  await espera(900);
  for (const w of await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p))) { await formar(p, w); await espera(1300); }
  await espera(3200);
  await p.goto(BASE + "/", { waitUntil: "load" }); await espera(3800);
  await rec.stop(); await nav.close();
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", webm, "-vf", "scale=390:-2", "-pix_fmt", "yuv420p", "-c:v", "libx264", "-crf", "22", SALIDA]); fs.unlinkSync(webm);
  console.log("Video en", SALIDA);
})();
