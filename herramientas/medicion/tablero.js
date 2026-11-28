// Arma los datos del tablero de la campaña (informes/campana/tablero/datos.json): GA4 leído en vivo con la cuenta
// robot, más Meta y Groone transcritos de las capturas en informes/campana/manual.json. Solo cuenta jugadores de los
// países de la campaña (Colombia, México, Chile, Argentina): las visitas de EE. UU., Irlanda o Suecia son revisores de Meta.
// Uso: node herramientas/medicion/tablero.js
"use strict";
const fs = require("fs"), path = require("path"), { api } = require("./google");
const RAIZ = path.join(__dirname, "../.."), MAN = JSON.parse(fs.readFileSync(path.join(RAIZ, "informes/campana/manual.json"), "utf8"));
const PAISES = ["Colombia", "Mexico", "Chile", "Argentina"], NOMBRE = { Colombia: "Colombia", Mexico: "México", Chile: "Chile", Argentina: "Argentina" };
const q = (fecha, b) => api(["ga_leer"], "https://analyticsdata.googleapis.com/v1beta/properties/566075014:runReport", { method: "POST",
  body: JSON.stringify(Object.assign({ dateRanges: [{ startDate: fecha, endDate: fecha }], dimensionFilter: { filter: { fieldName: "country", inListFilter: { values: PAISES } } } }, b)) });
const filas = r => (r.rows || []).map(x => ({ d: (x.dimensionValues || []).map(v => v.value), m: x.metricValues.map(v => +v.value) }));
const r1 = v => Math.round(v * 10) / 10, r2 = v => Math.round(v * 100) / 100;

(async () => {
  const dias = [], paises = [], embudo = [], anuncios = [], bloques = [], recompensas = [];
  for (const [fecha, man] of Object.entries(MAN.dias).sort()) {
    const p = filas(await q(fecha, { dimensions: [{ name: "country" }], metrics: ["totalUsers", "sessions", "userEngagementDuration"].map(name => ({ name })) }));
    let jug = 0, tiempo = 0;
    for (const x of p) { jug += x.m[0]; tiempo += x.m[2]; paises.push({ fecha, pais: NOMBRE[x.d[0]] || x.d[0], jugadores: x.m[0], sesiones: x.m[1], minutos_por_jugador: r1(x.m[2] / 60 / Math.max(1, x.m[0])) }); }
    const pg = filas(await q(fecha, { dimensions: [{ name: "pagePath" }], metrics: [{ name: "totalUsers" }], limit: 400 }));
    for (const x of pg) { const m = x.d[0].match(/^\/nivel\/(\d+)\/$/); if (m && +m[1] <= 30) embudo.push({ fecha, nivel: +m[1], jugadores: x.m[0] }); }
    const rc = filas(await api(["ga_leer"], "https://analyticsdata.googleapis.com/v1beta/properties/566075014:runReport", { method: "POST", body: JSON.stringify({ dateRanges: [{ startDate: fecha, endDate: fecha }],
      dimensions: [{ name: "customEvent:tipo" }, { name: "customEvent:estado" }], metrics: [{ name: "eventCount" }], dimensionFilter: { filter: { fieldName: "eventName", stringFilter: { value: "enl_recompensa" } } } }) }));
    const TIPO = { regalo: "Regalo de Tilde", cofre: "Cofre doble", letras: "Pista sin monedas", carta: "Otra carta" };
    const porTipo = {}; for (const x of rc) { const t = TIPO[x.d[0]] || x.d[0]; porTipo[t] = porTipo[t] || { fecha, oferta: t, ofrecidos: 0, aceptados: 0, vistos: 0, sin_anuncio: 0 };
      const k = { ofrecido: "ofrecidos", pedido: "aceptados", visto: "vistos", sin_anuncio: "sin_anuncio" }[x.d[1]]; if (k) porTipo[t][k] += x.m[0]; }
    recompensas.push(...Object.values(porTipo));
    const g = man.groone, me = man.meta, ingreso_cop = Math.round(g.ingreso_usd * MAN.cop_por_usd);
    dias.push({ fecha, gasto_cop: me.gasto_cop, impresiones_meta: me.impresiones, clics: me.clics, ctr_meta_pct: me.ctr_pct, visitas: me.visitas,
      jugadores_n3: me.resultados_n3, costo_n3_cop: me.costo_resultado_cop, jugadores: jug, minutos_por_jugador: r1(tiempo / 60 / Math.max(1, jug)),
      impresiones_groone: g.impresiones, relleno_pct: g.relleno_pct, ctr_groone_pct: g.ctr_pct, ecpm_usd: g.ecpm_usd, ingreso_usd: g.ingreso_usd, ingreso_cop,
      retorno_pct: r1(ingreso_cop / me.gasto_cop * 100), regreso_d1_pct: null });
    for (const a of me.anuncios) anuncios.push(Object.assign({ fecha }, a));
    for (const b of g.bloques) bloques.push(Object.assign({ fecha }, b));
  }
  const datos = { generado: new Date().toISOString(), cop_por_usd: MAN.cop_por_usd, dias, paises, embudo, anuncios, bloques, recompensas };
  const salida = path.join(RAIZ, "informes/campana/tablero/datos.json"); fs.writeFileSync(salida, JSON.stringify(datos));
  console.log("datos.json:", (fs.statSync(salida).size / 1024).toFixed(1), "KB ·", dias.length, "día(s)");
  console.log(JSON.stringify(dias, null, 0)); console.log("embudo:", embudo.sort((a, b) => a.nivel - b.nivel).map(e => e.nivel + ":" + e.jugadores).join(" ")); console.log("recompensas:", JSON.stringify(recompensas));
})().catch(e => { console.error("✗", e.message); process.exit(1); });
