// Video vertical para el anuncio de Meta (1080×1920), grabado con la partida REAL del juego.
// Reglas del plan: lo que muestra el anuncio es lo que se encuentra al entrar; sin premios en dinero, sin cifras
// inventadas y sin botones falsos. La música y los efectos se sintetizan aquí (sin archivos ni derechos de terceros).
// Uso: con npm run dev encendido, node herramientas/videos/anuncio.js [carpeta de salida]
// Salidas: anuncio-20s.mp4 (completo) y anuncio-10s.mp4 (corte rápido), más una tira de cuadros para revisar.
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { sintetizar } = require("./musica");
const BASE = "http://localhost:8080", SALIDA = process.argv[2] || path.join(__dirname, "salida");
const espera = ms => new Promise(r => setTimeout(r, ms));
fs.mkdirSync(SALIDA, { recursive: true });

// capa del anuncio: textos que saltan, el dedo y la tarjeta final. Se inyecta en la página (no queda en el sitio).
const CAPA_CSS = `
#anuncio { position: fixed; inset: 0; z-index: 9999; pointer-events: none; font-family: "Nunito", system-ui, sans-serif; }
#anuncio .gancho { position: absolute; left: 14px; right: 14px; top: 82px; text-align: center; font: 600 30px/1.08 "Fraunces", Georgia, serif; color: #2E241B;
  background: rgb(255 252 246 / .94); border-radius: 22px; padding: 14px 12px; box-shadow: 0 10px 30px rgb(46 36 27 / .18); }
#anuncio .gancho b { color: #C0603A; }
#anuncio .grito { position: absolute; left: 0; right: 0; top: 40%; text-align: center; font: 900 46px "Nunito", sans-serif; color: #FFF8EE;
  -webkit-text-stroke: 3px #7E3A22; paint-order: stroke fill; text-shadow: 0 6px 0 #7E3A22, 0 14px 26px rgb(0 0 0 / .25); letter-spacing: .5px; }
#anuncio .grito.oro { color: #FFE7A8; -webkit-text-stroke-color: #8A6420; text-shadow: 0 6px 0 #8A6420, 0 0 30px rgb(255 214 120 / .9); }
#anuncio .titulo { position: absolute; left: 14px; right: 14px; top: 64px; text-align: center; font: 600 28px/1.1 "Fraunces", Georgia, serif; color: #2E241B;
  background: rgb(255 252 246 / .94); border-radius: 22px; padding: 14px 12px; box-shadow: 0 10px 30px rgb(46 36 27 / .18); }
#anuncio .dedo { position: absolute; left: 0; top: 0; width: 58px; height: 58px; margin: -6px 0 0 -24px; filter: drop-shadow(0 6px 8px rgb(0 0 0 / .3)); transition: transform .08s; }
#anuncio .dedo.abajo { transform: scale(.86); }
#anuncio .final { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; padding: 30px;
  background: radial-gradient(120% 80% at 50% 30%, #FBF1E2, #F4DDBF); }
#anuncio .final svg.t { width: 96px; height: 60px; }
#anuncio .final h1 { margin: 6px 0 0; font: 600 52px "Fraunces", Georgia, serif; color: #2E241B; }
#anuncio .final h1 span { color: #C0603A; }
#anuncio .final p { margin: 0; font: 800 22px/1.25 "Nunito", sans-serif; color: #6B5D4F; }
#anuncio .final .pie { margin-top: 18px; font: 900 24px "Nunito", sans-serif; color: #FFF8EE; background: #C0603A; border-radius: 99px; padding: 12px 22px;
  box-shadow: 0 5px 0 #7E3A22; }
.espacio-anuncio, .anchor-sim, .cartero, #aviso { display: none !important; }`;
const DEDO = `<svg class="dedo" viewBox="0 0 48 48"><path d="M18 6a4 4 0 0 1 8 0v14l9 2a5 5 0 0 1 4 6l-2 10a6 6 0 0 1-6 5H22a6 6 0 0 1-5-3l-7-11a3.5 3.5 0 0 1 5.5-4l2.5 3z" fill="#FFF6EA" stroke="#2E241B" stroke-width="2.2" stroke-linejoin="round"/></svg>`;

async function capa(p) {
  await p.addStyleTag({ content: CAPA_CSS });
  await p.evaluate(dedo => {
    const c = document.createElement("div"); c.id = "anuncio"; c.innerHTML = dedo; document.body.appendChild(c);
    const d = c.querySelector(".dedo"); d.style.opacity = 0;
    window.__dedo = (x, y, abajo, ver) => { d.style.left = x + "px"; d.style.top = y + "px"; d.classList.toggle("abajo", !!abajo); d.style.opacity = ver === false ? 0 : 1; };
    window.__texto = (clase, html, ms) => {
      const e = document.createElement("div"); e.className = clase; e.innerHTML = html; c.appendChild(e);
      e.animate([{ opacity: 0, transform: "scale(.4) rotate(-6deg)" }, { opacity: 1, transform: "scale(1.12) rotate(2deg)", offset: .55 }, { opacity: 1, transform: "none" }], { duration: 380, easing: "cubic-bezier(.3,.7,.2,1)" });
      if (ms) setTimeout(() => e.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-30px) scale(.9)" }], { duration: 260, fill: "forwards" }).onfinish = () => e.remove(), ms);
      return e;
    };
  }, DEDO);
}
// arrastra el dedo por las letras de la palabra (como una persona, pero rápido)
async function formar(p, palabra, lento) {
  const pts = await p.evaluate(w => { const f = [...document.querySelectorAll(".letra")], u = new Set();
    return w.split("").map(l => { const i = f.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = f[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, palabra);
  await p.evaluate(([x, y]) => window.__dedo(x, y, false, true), pts[0]); await espera(lento ? 220 : 90);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); await p.evaluate(([x, y]) => window.__dedo(x, y, true), pts[0]);
  for (const [x, y] of pts.slice(1)) {
    const pasos = lento ? 9 : 6, [x0, y0] = await p.evaluate(() => { const d = document.querySelector("#anuncio .dedo"); return [parseFloat(d.style.left), parseFloat(d.style.top)]; });
    for (let k = 1; k <= pasos; k++) { const xx = x0 + (x - x0) * k / pasos, yy = y0 + (y - y0) * k / pasos; await p.mouse.move(xx, yy); await p.evaluate((a, b) => window.__dedo(a, b, true), xx, yy); await espera(lento ? 16 : 10); }
  }
  await espera(60); await p.mouse.up(); await p.evaluate(([x, y]) => window.__dedo(x, y, false), pts[pts.length - 1]);
}

// Grabador propio: guarda cada cuadro que pinta Chrome con su hora exacta (la grabación integrada pierde cuadros y
// acelera el video). Después ffmpeg los arma respetando esos tiempos, así la música queda sincronizada.
async function grabador(p, dir) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.createCDPSession(), cuadros = [];
  cdp.on("Page.screencastFrame", async f => {
    const n = cuadros.length, archivo = path.join(dir, `c${String(n).padStart(5, "0")}.jpg`);
    fs.writeFileSync(archivo, Buffer.from(f.data, "base64")); cuadros.push({ archivo, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  return {
    t0: () => Date.now() / 1000,
    async parar(salida, finReal) {
      await cdp.send("Page.stopScreencast");
      // lista para ffmpeg: cada cuadro dura hasta el siguiente; el último, hasta el final real
      const lineas = cuadros.map((c, i) => `file '${c.archivo}'\nduration ${((i + 1 < cuadros.length ? cuadros[i + 1].t : finReal) - c.t).toFixed(4)}`);
      lineas.push(`file '${cuadros[cuadros.length - 1].archivo}'`);
      const lista = path.join(dir, "lista.txt"); fs.writeFileSync(lista, lineas.join("\n"));
      execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-vf", "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", salida]);
      return cuadros[0].t;
    }
  };
}

(async () => {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage();
  await p.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: false });
  await p.setRequestInterception(true); p.on("request", r => r.url().startsWith(BASE) || r.url().startsWith("data:") ? r.continue() : r.abort());
  // estado de partida: un jugador que ya va en el nivel 90 (así no salen las guías del primer nivel)
  await p.goto(BASE + "/", { waitUntil: "load" });
  await p.evaluate(() => { localStorage.clear(); localStorage.setItem("enl_progreso", JSON.stringify({ hechos: Array.from({ length: 89 }, (_, i) => i + 1), monedas: 340, llegada: "2026-11-20", regreso: true, lugaresVistos: ["1e", "2e", "3c"], cartero: { ultimo: Date.now(), fecha: null, hoy: 3 } })); });
  await p.goto(BASE + "/nivel/90/", { waitUntil: "load" }); await capa(p); await espera(900);
  const palabras = await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p));
  const crudo = path.join(SALIDA, "anuncio-crudo.mp4"), rec = await grabador(p, path.join(SALIDA, "cuadros"));
  await espera(300);
  const t0 = Date.now(), eventos = [], marca = e => eventos.push({ t: Date.now() - t0, e });
  marca("inicio");
  // 1) gancho
  await p.evaluate(() => window.__texto("gancho", "¿Cuántas palabras puedes formar con <b>estas letras</b>?", 1500));
  await espera(1500);
  // 2) juego rápido con gritos de ánimo
  const gritos = ["¡Bien!", "¡Genial!", "¡Increíble!", "¡Imparable!", "¡Perfecto!"];
  for (const [i, w] of palabras.entries()) {
    await formar(p, w, i === 0); marca("palabra");
    await espera(260); await p.evaluate((g, oro) => window.__texto("grito" + (oro ? " oro" : ""), g, 650), gritos[Math.min(i, gritos.length - 1)], i === palabras.length - 1);
    await espera(i === palabras.length - 1 ? 400 : 520);
  }
  await p.evaluate(() => window.__dedo(0, 0, false, false));
  marca("completo"); await espera(1400); marca("cofre"); await espera(1500);
  // 3) el pueblo se enciende (la panadería ya terminada brilla; la plaza recién se enciende)
  await p.goto(BASE + "/", { waitUntil: "load" }); await capa(p);
  // el pueblo a pantalla completa, con un acercamiento lento mientras la calle se enciende
  const puebloUrl = await p.evaluate(() => {
    const e = document.querySelector(".escenario"), sv = e.querySelector(".pueblo"), pin = document.getElementById("pin"); if (pin) pin.style.display = "none";
    Object.assign(e.style, { position: "fixed", inset: "0", zIndex: 9000, margin: "0", display: "flex", alignItems: "center", justifyContent: "center" });
    sv.style.transformOrigin = "46% 60%";
    sv.animate([{ transform: "scale(1.45)" }, { transform: "scale(1.9)" }], { duration: 3200, easing: "ease-in-out", fill: "forwards" });
    return sv.querySelector(".base").getAttribute("href");
  });
  await p.evaluate(() => window.__texto("titulo", "Cada palabra enciende el pueblo", 2700));
  marca("lugar"); await espera(3000);
  // 4) llega un vecino (Lola, en el nivel 3): se completa la última palabra
  await p.evaluate(() => { const pr = JSON.parse(localStorage.getItem("enl_progreso")); pr.hechos = pr.hechos.filter(n => n !== 3); localStorage.setItem("enl_progreso", JSON.stringify(pr)); });
  await p.goto(BASE + "/nivel/3/", { waitUntil: "load" });
  const p3 = await p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p));
  await p.evaluate(e => localStorage.setItem("enl_partida_3", JSON.stringify({ e: e, r: [], x: [], a: 0 })), p3.slice(0, -1));
  await p.goto(BASE + "/nivel/3/", { waitUntil: "load" }); await capa(p); await espera(500);
  await formar(p, p3[p3.length - 1]); marca("palabra"); await p.evaluate(() => window.__dedo(0, 0, false, false)); await espera(1500);
  await p.evaluate(() => { const v = document.querySelector(".hoja .vecino-tarjeta"); if (v) v.scrollIntoView({ block: "center" }); });
  marca("vecino"); await espera(2700);
  // 5) tarjeta final
  await p.evaluate(url => {
    const f = document.createElement("div"); f.className = "final";
    f.innerHTML = '<img src="' + url + '" style="width:300px;margin:-20px 0 -6px;filter:drop-shadow(0 12px 18px rgb(46 36 27 / .2))"><svg class="t" viewBox="0 0 64 40"><use href="#tilde"/></svg><h1>En<span>letrados</span></h1><p>Forma palabras, completa el crucigrama<br>y devuélvele la luz al pueblo</p><div class="pie">Juega gratis · sin instalar nada</div>';
    document.getElementById("anuncio").appendChild(f);
    f.animate([{ opacity: 0, transform: "scale(1.08)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: "ease-out" });
  }, puebloUrl);
  marca("final"); await espera(2800);
  const primerCuadro = await rec.parar(crudo, Date.now() / 1000); await nav.close();
  // los eventos se miden desde t0; el video empieza en el primer cuadro: se corrige la diferencia
  const desfase = t0 / 1000 - primerCuadro; eventos.forEach(e => { e.t += desfase * 1000; });

  // música y efectos sincronizados con los eventos
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", crudo]).toString());
  const wav = path.join(SALIDA, "anuncio.wav"); sintetizar(wav, dur, eventos);
  const mp4 = path.join(SALIDA, "anuncio-20s.mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", crudo, "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "18",
    "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", mp4]);
  // corte de 10 s: gancho + juego + premio, y la tarjeta final
  const ev = n => (eventos.find(x => x.e === n) || {}).t / 1000, fin = ev("final");
  const corte = path.join(SALIDA, "anuncio-10s.mp4"), a = 0, b = Math.min(ev("cofre") + 0.9, 8.2);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-filter_complex",
    `[0:v]trim=${a}:${b},setpts=PTS-STARTPTS[v1];[0:a]atrim=${a}:${b},asetpts=PTS-STARTPTS[a1];[0:v]trim=${fin}:${fin + 2.2},setpts=PTS-STARTPTS[v2];[0:a]atrim=${fin}:${fin + 2.2},asetpts=PTS-STARTPTS[a2];[v1][a1][v2][a2]concat=n=2:v=1:a=1[v][a]`,
    "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", corte]);
  // tira de cuadros para revisar
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf", `fps=${8 / dur},scale=240:-1,tile=8x1`, "-frames:v", "1", path.join(SALIDA, "anuncio-cuadros.png")]);
  fs.unlinkSync(crudo); fs.unlinkSync(wav); fs.rmSync(path.join(SALIDA, "cuadros"), { recursive: true, force: true });
  console.log("Eventos:", eventos.map(x => x.e + "@" + (x.t / 1000).toFixed(1)).join(" "));
  console.log("Listo:", mp4, "y", corte, `(${dur.toFixed(1)} s)`);
})();
