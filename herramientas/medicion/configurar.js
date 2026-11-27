// Configura la medición de Enletrados (aprobado por el usuario el 27 nov 2026), como la cuenta robot:
//  1. Tag Manager (GTM-NWZLHLTD): variables de capa de datos, el activador «ENL - eventos del juego» (todo evento que
//     empieza con enl_) y la etiqueta «GA4 - eventos del juego», que los reenvía a GA4 con sus datos.
//  2. GA4: dimensiones personalizadas de evento.
// No publica el contenedor (eso es aparte y con aprobación). Se puede correr varias veces: lo que ya existe no se repite.
// Uso: node herramientas/medicion/configurar.js
"use strict";
const { api } = require("./google");
const GTM = "https://tagmanager.googleapis.com/tagmanager/v2/", WS = "accounts/6408527078/containers/289102612/workspaces/2";
const GA = "https://analyticsadmin.googleapis.com/v1beta/properties/566075014", MEDICION = "G-KP4M6SVW9Z";
const DATOS = ["nivel", "estrellas", "extras", "ayudas", "tipo", "estado", "modo", "item", "precio"];
const DIMENSIONES = [["nivel", "Nivel", "Número de nivel del juego"], ["tipo", "Tipo", "Tipo de ayuda o de recompensa"], ["estado", "Estado", "Estado del anuncio con recompensa"],
  ["modo", "Modo", "nivel o diario"], ["item", "Artículo de la tienda", "Lo comprado en la Tienda de Tilde"], ["estrellas", "Estrellas", "Estrellas del nivel (1 a 3)"]];
const E = ["gtm_editar"], post = (u, b) => api(E, GTM + u, { method: "POST", body: JSON.stringify(b) });
const t = (key, value) => ({ type: "template", key, value });

(async () => {
  // ---- Tag Manager ----
  const vars = (await api(E, GTM + WS + "/variables")).variable || [];
  for (const d of DATOS) {
    const nombre = "DL - " + d;
    if (vars.some(v => v.name === nombre)) { console.log("= variable ya existía:", nombre); continue; }
    await post(WS + "/variables", { name: nombre, type: "v", parameter: [{ type: "integer", key: "dataLayerVersion", value: "2" }, { type: "boolean", key: "setDefaultValue", value: "false" }, t("name", d)] });
    console.log("+ variable:", nombre);
  }
  const trigs = (await api(E, GTM + WS + "/triggers")).trigger || [];
  let trig = trigs.find(x => x.name === "ENL - eventos del juego");
  if (!trig) {
    trig = await post(WS + "/triggers", { name: "ENL - eventos del juego", type: "customEvent",
      customEventFilter: [{ type: "matchRegex", parameter: [t("arg0", "{{_event}}"), t("arg1", "^enl_.*")] }] });
    console.log("+ activador:", trig.name, "(evento personalizado ^enl_.*)");
  } else console.log("= activador ya existía:", trig.name);
  const tags = (await api(E, GTM + WS + "/tags")).tag || [];
  if (!tags.some(x => x.name === "GA4 - eventos del juego")) {
    const tag = await post(WS + "/tags", { name: "GA4 - eventos del juego", type: "gaawe", tagFiringOption: "oncePerEvent", firingTriggerId: [trig.triggerId],
      parameter: [{ type: "boolean", key: "sendEcommerceData", value: "false" }, t("eventName", "{{Event}}"), t("measurementIdOverride", MEDICION),
        { type: "list", key: "eventSettingsTable", list: DATOS.map(d => ({ type: "map", map: [t("parameter", d), t("parameterValue", "{{DL - " + d + "}}")] })) }] });
    console.log("+ etiqueta:", tag.name, "→", MEDICION, "con", DATOS.length, "parámetros");
  } else console.log("= etiqueta ya existía: GA4 - eventos del juego");

  // ---- GA4 ----
  const dims = (await api(["ga_leer"], GA + "/customDimensions")).customDimensions || [];
  for (const [param, nombre, desc] of DIMENSIONES) {
    if (dims.some(d => d.parameterName === param)) { console.log("= dimensión ya existía:", param); continue; }
    try { await api(["ga_editar"], GA + "/customDimensions", { method: "POST", body: JSON.stringify({ parameterName: param, displayName: nombre, description: desc, scope: "EVENT" }) }); console.log("+ dimensión de GA4:", nombre, `(${param})`); }
    catch (e) { console.log("✗ dimensión", param, "→", e.message.slice(0, 160)); }
  }
  // ---- resumen del espacio de trabajo (lo que se publicaría) ----
  const st = await api(["gtm_leer"], GTM + WS + "/status");
  console.log("\nCambios sin publicar en Tag Manager:", (st.workspaceChange || []).map(c => (c.tag && "etiqueta " + c.tag.name) || (c.trigger && "activador " + c.trigger.name) || (c.variable && "variable " + c.variable.name) || "otro").join(" · "));
})().catch(e => { console.error("✗", e.message); process.exit(1); });
