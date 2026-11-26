// Piezas compartidas de los videos del anuncio: navegador, capa de textos y dedo, grabador sincronizado y armado final.
// Todo se graba con la partida REAL del juego (npm run dev encendido). Reglas: lo que se ve es lo que se encuentra al
// entrar; sin premios en dinero, sin cifras inventadas y sin botones falsos.
"use strict";
const puppeteer = require("../pruebas/node_modules/puppeteer-core"), fs = require("fs"), path = require("path"), { execFileSync } = require("child_process");
const { sintetizar } = require("./musica");
const BASE = "http://localhost:8080";
const espera = ms => new Promise(r => setTimeout(r, ms));

const CAPA_CSS = `
#anuncio { position: fixed; inset: 0; z-index: 9999; pointer-events: none; font-family: "Nunito", system-ui, sans-serif; }
#anuncio .gancho, #anuncio .titulo { position: absolute; left: 14px; right: 14px; top: 70px; text-align: center; font: 600 29px/1.1 "Fraunces", Georgia, serif; color: #2E241B;
  background: rgb(255 252 246 / .95); border-radius: 22px; padding: 14px 12px; box-shadow: 0 10px 30px rgb(46 36 27 / .2); }
#anuncio .gancho b, #anuncio .titulo b { color: #C0603A; }
#anuncio .titulo.al-pie { top: auto; bottom: 70px; }
#anuncio .titulo.noche { background: rgb(27 23 18 / .82); color: #F3EADB; box-shadow: 0 10px 30px rgb(0 0 0 / .4); }
#anuncio .titulo.noche b { color: #F0C75E; }
#anuncio .paso { position: absolute; left: 12px; right: 12px; top: 62px; display: flex; align-items: center; gap: 12px; padding: 12px 14px; border-radius: 20px;
  background: #2E241B; color: #FFF8EE; font: 800 21px/1.15 "Nunito", sans-serif; box-shadow: 0 10px 26px rgb(0 0 0 / .3); }
#anuncio .paso i { font-style: normal; flex: none; width: 40px; height: 40px; border-radius: 50%; display: grid; place-items: center; background: #E2B65A; color: #2E241B; font-size: 22px; }
#anuncio .grito { position: absolute; left: 0; right: 0; top: 40%; text-align: center; font: 900 46px "Nunito", sans-serif; color: #FFF8EE;
  -webkit-text-stroke: 3px #7E3A22; paint-order: stroke fill; text-shadow: 0 6px 0 #7E3A22, 0 14px 26px rgb(0 0 0 / .25); letter-spacing: .5px; }
#anuncio .grito.oro { color: #FFE7A8; -webkit-text-stroke-color: #8A6420; text-shadow: 0 6px 0 #8A6420, 0 0 30px rgb(255 214 120 / .9); }
#anuncio .golpe { position: absolute; left: 0; right: 0; top: 34%; display: grid; justify-items: center; gap: 2px; font: 900 64px/1 "Nunito", sans-serif; color: #FFF8EE;
  -webkit-text-stroke: 4px #7E3A22; paint-order: stroke fill; text-shadow: 0 7px 0 #7E3A22; }
#anuncio .golpe span { opacity: 0; display: block; }
#anuncio .golpe span:last-child { color: #FFE7A8; -webkit-text-stroke-color: #8A6420; text-shadow: 0 7px 0 #8A6420, 0 0 34px rgb(255 214 120 / .9); }
#anuncio .dedo { position: absolute; left: 0; top: 0; width: 58px; height: 58px; margin: -6px 0 0 -24px; filter: drop-shadow(0 6px 8px rgb(0 0 0 / .3)); transition: transform .08s; }
#anuncio .dedo.abajo { transform: scale(.86); }
#anuncio .destello { position: absolute; inset: 0; background: #FFF8EE; }
#anuncio .letra-viento { position: absolute; width: 38px; height: 38px; border-radius: 9px; display: grid; place-items: center; font: 900 22px "Nunito", sans-serif;
  color: #FFF8EE; background: linear-gradient(180deg, #D27550, #C0603A); box-shadow: 0 6px 14px rgb(0 0 0 / .3); }
#anuncio .racha-viento { position: absolute; height: 2px; border-radius: 2px; background: linear-gradient(90deg, transparent, rgb(255 255 255 / .7), transparent); }
#anuncio .tilde-grande { position: absolute; width: 190px; height: 119px; left: 50%; top: 46%; margin: -60px 0 0 -95px; --tilde: #2F3E5C; filter: drop-shadow(0 10px 16px rgb(0 0 0 / .25)); }
#anuncio .final { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 10px; text-align: center; padding: 30px;
  background: radial-gradient(120% 80% at 50% 30%, #FBF1E2, #F4DDBF); }
#anuncio .final svg.t { width: 96px; height: 60px; }
#anuncio .final h1 { margin: 6px 0 0; font: 600 52px "Fraunces", Georgia, serif; color: #2E241B; }
#anuncio .final h1 span { color: #C0603A; }
#anuncio .final p { margin: 0; font: 800 22px/1.25 "Nunito", sans-serif; color: #6B5D4F; }
#anuncio .final .pie { margin-top: 18px; font: 900 24px "Nunito", sans-serif; color: #FFF8EE; background: #C0603A; border-radius: 99px; padding: 12px 22px; box-shadow: 0 5px 0 #7E3A22; }
.espacio-anuncio, .anchor-sim, .cartero, #aviso, #pin { display: none !important; }`;
const DEDO = `<svg class="dedo" viewBox="0 0 48 48"><path d="M18 6a4 4 0 0 1 8 0v14l9 2a5 5 0 0 1 4 6l-2 10a6 6 0 0 1-6 5H22a6 6 0 0 1-5-3l-7-11a3.5 3.5 0 0 1 5.5-4l2.5 3z" fill="#FFF6EA" stroke="#2E241B" stroke-width="2.2" stroke-linejoin="round"/></svg>`;

async function abrir() {
  const nav = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const p = await nav.newPage();
  await p.setViewport({ width: 360, height: 640, deviceScaleFactor: 3, isMobile: true, hasTouch: false });
  await p.setRequestInterception(true); p.on("request", r => r.url().startsWith(BASE) || r.url().startsWith("data:") ? r.continue() : r.abort());
  await p.goto(BASE + "/", { waitUntil: "load" });
  return { nav, p };
}

// capa del anuncio sobre la página: textos que saltan, el dedo, destellos, viento y la tarjeta final
async function capa(p) {
  await p.addStyleTag({ content: CAPA_CSS });
  await p.evaluate(dedo => {
    const c = document.createElement("div"); c.id = "anuncio"; c.innerHTML = dedo; document.body.appendChild(c);
    const d = c.querySelector(".dedo"); d.style.opacity = 0;
    window.__dedo = (x, y, abajo, ver) => { d.style.left = x + "px"; d.style.top = y + "px"; d.classList.toggle("abajo", !!abajo); d.style.opacity = ver === false ? 0 : 1; };
    window.__texto = (clase, html, ms) => {
      const e = document.createElement("div"); e.className = clase; e.innerHTML = html; c.appendChild(e);
      e.animate([{ opacity: 0, transform: "scale(.5) rotate(-5deg)" }, { opacity: 1, transform: "scale(1.08) rotate(1.5deg)", offset: .55 }, { opacity: 1, transform: "none" }], { duration: 360, easing: "cubic-bezier(.3,.7,.2,1)" });
      if (ms) setTimeout(() => e.animate([{ opacity: 1 }, { opacity: 0, transform: "translateY(-24px) scale(.92)" }], { duration: 240, fill: "forwards" }).onfinish = () => e.remove(), ms);
      return e;
    };
    window.__golpe = (palabras, paso) => {
      const e = document.createElement("div"); e.className = "golpe"; e.innerHTML = palabras.map(w => "<span>" + w + "</span>").join(""); c.appendChild(e);
      [...e.children].forEach((s, i) => s.animate([{ opacity: 0, transform: "scale(2.2) rotate(-8deg)" }, { opacity: 1, transform: "scale(.92)", offset: .7 }, { opacity: 1, transform: "none" }],
        { duration: 300, delay: i * paso, fill: "forwards", easing: "cubic-bezier(.3,.7,.2,1)" }));
      return e;
    };
    window.__destello = () => { const e = document.createElement("div"); e.className = "destello"; c.appendChild(e);
      e.animate([{ opacity: .95 }, { opacity: 0 }], { duration: 260, fill: "forwards" }).onfinish = () => e.remove(); };
    window.__limpiar = () => [...c.children].forEach(x => { if (!x.classList.contains("dedo")) x.remove(); });
    // el viento se lleva las letras del pueblo
    window.__viento = () => {
      const letras = "PALABRASDELPUEBLO";
      for (let i = 0; i < letras.length; i++) {
        const e = document.createElement("div"); e.className = "letra-viento"; e.textContent = letras[i]; c.appendChild(e);
        const x0 = 60 + Math.random() * 240, y0 = 330 + Math.random() * 160;
        e.style.left = x0 + "px"; e.style.top = y0 + "px";
        e.animate([{ opacity: 0, transform: "scale(.4)" }, { opacity: 1, transform: "scale(1) rotate(0)", offset: .15 },
          { opacity: 0, transform: `translate(${-420 - Math.random() * 200}px, ${-260 - Math.random() * 260}px) rotate(${-200 - Math.random() * 300}deg) scale(.7)` }],
          { duration: 2200 + Math.random() * 700, delay: i * 70, easing: "cubic-bezier(.4,0,.6,1)", fill: "forwards" });
      }
      for (let i = 0; i < 16; i++) {
        const r = document.createElement("div"); r.className = "racha-viento"; c.appendChild(r);
        r.style.width = 80 + Math.random() * 120 + "px"; r.style.top = 80 + Math.random() * 480 + "px"; r.style.left = "380px";
        r.animate([{ transform: "translateX(0)", opacity: 0 }, { opacity: 1, offset: .3 }, { transform: "translateX(-620px)", opacity: 0 }], { duration: 900 + Math.random() * 500, delay: i * 140, iterations: 2 });
      }
    };
    window.__tilde = () => {
      const t = document.createElementNS("http://www.w3.org/2000/svg", "svg"); t.setAttribute("viewBox", "0 0 64 40"); t.setAttribute("class", "tilde-grande");
      t.innerHTML = '<use href="#tilde"/>'; c.appendChild(t);
      t.animate([{ transform: "translate(-320px, 120px) rotate(-14deg) scale(.6)" }, { transform: "translate(0, -10px) rotate(4deg) scale(1.05)", offset: .65 }, { transform: "translate(0, 0) rotate(0) scale(1)" }],
        { duration: 1300, easing: "cubic-bezier(.3,.7,.2,1)", fill: "forwards" });
      t.animate([{ transform: "translateY(0)" }, { transform: "translateY(-10px)" }], { duration: 700, delay: 1300, iterations: 4, direction: "alternate", composite: "add" });
    };
    window.__final = url => {
      const f = document.createElement("div"); f.className = "final";
      f.innerHTML = (url ? '<img src="' + url + '" style="width:300px;margin:-20px 0 -6px;filter:drop-shadow(0 12px 18px rgb(46 36 27 / .2))">' : "") +
        '<svg class="t" viewBox="0 0 64 40"><use href="#tilde"/></svg><h1>En<span>letrados</span></h1><p>Forma palabras, completa el crucigrama<br>y devuélvele la luz al pueblo</p><div class="pie">Juega gratis · sin instalar nada</div>';
      c.appendChild(f); f.animate([{ opacity: 0, transform: "scale(1.08)" }, { opacity: 1, transform: "none" }], { duration: 400, easing: "ease-out" });
    };
  }, DEDO);
}

// arrastra el dedo por las letras de la palabra (como una persona)
async function formar(p, palabra, lento) {
  const pts = await p.evaluate(w => { const f = [...document.querySelectorAll(".letra")], u = new Set();
    return w.split("").map(l => { const i = f.findIndex((x, j) => !u.has(j) && x.textContent === l); u.add(i); const r = f[i].getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }); }, palabra);
  await p.evaluate(([x, y]) => window.__dedo(x, y, false, true), pts[0]); await espera(lento ? 220 : 80);
  await p.mouse.move(pts[0][0], pts[0][1]); await p.mouse.down(); await p.evaluate(([x, y]) => window.__dedo(x, y, true), pts[0]);
  let [x0, y0] = pts[0];
  for (const [x, y] of pts.slice(1)) {
    const pasos = lento ? 9 : 5;
    for (let k = 1; k <= pasos; k++) { const xx = x0 + (x - x0) * k / pasos, yy = y0 + (y - y0) * k / pasos; await p.mouse.move(xx, yy); await p.evaluate((a, b) => window.__dedo(a, b, true), xx, yy); await espera(lento ? 16 : 9); }
    x0 = x; y0 = y;
  }
  await espera(50); await p.mouse.up(); await p.evaluate(([x, y]) => window.__dedo(x, y, false), pts[pts.length - 1]);
}
const palabrasDe = p => p.evaluate(() => JSON.parse(document.getElementById("datos-nivel").textContent).palabras.map(x => x.p));
// prepara una partida a medias: estas palabras ya encontradas
async function partida(p, n, encontradas) { await p.evaluate((n, e) => localStorage.setItem("enl_partida_" + n, JSON.stringify({ e, r: [], x: [], a: 0 })), n, encontradas); }
async function ir(p, ruta) { await p.goto(BASE + ruta, { waitUntil: "load" }); await capa(p); }

// grabador: guarda cada cuadro con su hora exacta; ffmpeg los arma respetando esos tiempos (sin desfasar el audio)
async function grabador(p, dir) {
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const cdp = await p.createCDPSession(), cuadros = [];
  cdp.on("Page.screencastFrame", f => {
    const archivo = path.join(dir, `c${String(cuadros.length).padStart(5, "0")}.jpg`);
    fs.writeFileSync(archivo, Buffer.from(f.data, "base64")); cuadros.push({ archivo, t: f.metadata.timestamp });
    cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
  });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 1080, maxHeight: 1920, everyNthFrame: 1 });
  return async (salida, finReal) => {
    await cdp.send("Page.stopScreencast");
    const lineas = cuadros.map((c, i) => `file '${c.archivo}'\nduration ${((i + 1 < cuadros.length ? cuadros[i + 1].t : finReal) - c.t).toFixed(4)}`);
    lineas.push(`file '${cuadros[cuadros.length - 1].archivo}'`);
    const lista = path.join(dir, "lista.txt"); fs.writeFileSync(lista, lineas.join("\n"));
    execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", lista, "-vf", "scale=1080:1920:flags=lanczos,fps=30,format=yuv420p", "-c:v", "libx264", "-crf", "16", salida]);
    return cuadros[0].t;
  };
}

// arma el video final: música sincronizada, mp4 para Meta y tira de cuadros para revisar
async function grabar(nombre, salidaDir, guion, estiloMusica) {
  fs.mkdirSync(salidaDir, { recursive: true });
  const { nav, p } = await abrir();
  const marcas = { lista: [] };
  const preparar = await guion.preparar(p);
  const dirCuadros = path.join(salidaDir, "cuadros-" + nombre), parar = await grabador(p, dirCuadros);
  await espera(300);
  const t0 = Date.now(), marca = e => marcas.lista.push({ t: Date.now() - t0, e });
  marca("inicio");
  await guion.grabar(p, marca, preparar);
  const crudo = path.join(salidaDir, nombre + "-crudo.mp4"), primer = await parar(crudo, Date.now() / 1000); await nav.close();
  const desfase = t0 / 1000 - primer; marcas.lista.forEach(e => { e.t += desfase * 1000; });
  const dur = parseFloat(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", crudo]).toString());
  const wav = path.join(salidaDir, nombre + ".wav"); sintetizar(wav, dur, marcas.lista, estiloMusica);
  const mp4 = path.join(salidaDir, nombre + ".mp4");
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", crudo, "-i", wav, "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-c:a", "aac", "-b:a", "160k", "-shortest", "-movflags", "+faststart", mp4]);
  execFileSync("ffmpeg", ["-y", "-loglevel", "error", "-i", mp4, "-vf", `fps=${9 / dur},scale=200:-1,tile=9x1`, "-frames:v", "1", path.join(salidaDir, nombre + "-cuadros.png")]);
  fs.unlinkSync(crudo); fs.unlinkSync(wav); fs.rmSync(dirCuadros, { recursive: true, force: true });
  console.log(`${nombre}: ${dur.toFixed(1)} s · ${marcas.lista.map(x => x.e + "@" + (x.t / 1000).toFixed(1)).join(" ")}`);
  return mp4;
}

module.exports = { BASE, espera, abrir, capa, formar, palabrasDe, partida, ir, grabador, grabar };
