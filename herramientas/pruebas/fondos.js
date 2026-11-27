// Prueba de los fondos de los niveles (npm run dev encendido): los 300 estilos se leen completos, la noche es oscura,
// y el movimiento se apaga con el ajuste «Fondos con movimiento» y con «reducir movimiento». Uso: npm run prueba:fondos
"use strict";
const puppeteer = require("puppeteer-core"), fs = require("fs"), path = require("path");
const BASE = "http://localhost:8080", DIST = path.join(__dirname, "../../dist");
const fallas = [], ok = m => console.log("✓ " + m), mal = m => { fallas.push(m); console.log("✗ " + m); };
(async () => {
  const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
  const estilos = []; for (let n = 1; n <= 300; n++) estilos.push((fs.readFileSync(path.join(DIST, `nivel/${n}/index.html`), "utf8").match(/<style>([\s\S]*?)<\/style>/) || [])[1] || "");
  const v = await b.newPage(); await v.setContent("<html><head></head><body></body></html>");
  const rotos = await v.evaluate(lista => lista.map((css, i) => { const s = document.createElement("style"); s.textContent = css; document.head.appendChild(s);
    const reglas = [...s.sheet.cssRules], raiz = reglas.find(x => x.selectorText === ":root");
    const bien = !!raiz && raiz.style.getPropertyValue("--fondo-nivel").includes("svg") && reglas.some(x => x.selectorText === ".fondo-mov") && reglas.some(x => x.type === 7);
    s.remove(); return bien ? null : i + 1; }).filter(Boolean), estilos);
  if (rotos.length) mal("estilos del fondo incompletos en los niveles " + rotos.join(", ")); else ok("los 300 niveles: el navegador lee completo el estilo del fondo");

  const p = await b.newPage(); await p.setRequestInterception(true); p.on("request", r => (r.url().startsWith(BASE) ? r.continue() : r.abort()));
  const estado = () => p.evaluate(() => { const i = document.querySelector(".fondo-mov i"), f = document.querySelector(".fondo-mov");
    return { mueve: !!i && getComputedStyle(i).display !== "none", tapiz: !!f && getComputedStyle(f).backgroundImage.includes("svg"), hora: document.documentElement.dataset.hora, papel: getComputedStyle(document.documentElement).getPropertyValue("--papel").trim() }; });
  await p.goto(BASE + "/ajustes/", { waitUntil: "load" }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem("enl_tema", JSON.stringify("claro")); });
  for (const [n, hora] of [[5, "manana"], [104, "tarde"], [265, "noche"]]) {
    await p.goto(`${BASE}/nivel/${n}/`, { waitUntil: "load" }); const e = await estado();
    if (e.tapiz && e.mueve && e.hora === hora) ok(`nivel ${n}: papel tapiz, movimiento y hora «${hora}»`); else mal(`nivel ${n}: ` + JSON.stringify(e));
    if (hora === "noche") { if (e.papel === "#1B1712") ok("de noche se usan los colores oscuros aunque el jugador haya elegido el tema claro"); else mal("la noche no quedó oscura: " + e.papel); }
  }
  await p.goto(BASE + "/diario/", { waitUntil: "load" }); const ed = await estado();
  if (ed.tapiz && ed.mueve) ok("Diario del Pueblo: papel de periódico y letras que suben"); else mal("diario: " + JSON.stringify(ed));
  await p.goto(BASE + "/ajustes/", { waitUntil: "load" }); await p.click("#a-fondos");
  await p.goto(BASE + "/nivel/104/", { waitUntil: "load" }); let e = await estado();
  if (!e.mueve && e.tapiz) ok("con «Fondos con movimiento» apagado: se queda el papel tapiz, sin movimiento"); else mal("interruptor: " + JSON.stringify(e));
  await p.evaluate(() => localStorage.removeItem("enl_fondomov")); await p.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
  await p.goto(BASE + "/nivel/104/", { waitUntil: "load" }); e = await estado();
  if (!e.mueve && e.tapiz) ok("con «reducir movimiento» del celular: sin movimiento"); else mal("reducir movimiento: " + JSON.stringify(e));
  await b.close();
  console.log(fallas.length ? `\n${fallas.length} problema(s) en los fondos` : "\nFondos en orden."); process.exit(fallas.length ? 1 : 0);
})();
