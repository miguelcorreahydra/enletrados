// Acceso a Tag Manager y GA4 como la cuenta robot «enletrados-claude», SIN llave: con la sesión de gcloud del usuario
// se pide a Google un permiso temporal (máximo 1 h) en nombre de esa cuenta, que solo tiene acceso a lo de Enletrados.
// El permiso nunca se imprime ni se guarda. Requisitos: gcloud con sesión iniciada (gcloud auth login) y el rol
// «Creador de tokens de cuenta de servicio» del usuario sobre enletrados-claude (configurado el 27 nov 2026).
"use strict";
const { execFileSync } = require("child_process");
const CUENTA = "enletrados-claude@project-836f64ef-07f3-4673-a9a.iam.gserviceaccount.com";
const ALCANCES = {
  gtm_leer: "https://www.googleapis.com/auth/tagmanager.readonly",
  gtm_editar: "https://www.googleapis.com/auth/tagmanager.edit.containers",
  gtm_version: "https://www.googleapis.com/auth/tagmanager.edit.containerversions",
  gtm_publicar: "https://www.googleapis.com/auth/tagmanager.publish",
  ga_leer: "https://www.googleapis.com/auth/analytics.readonly",
  ga_editar: "https://www.googleapis.com/auth/analytics.edit"
};
const cache = {};
async function permiso(alcances) {
  const clave = alcances.slice().sort().join(" ");
  if (cache[clave] && cache[clave].vence > Date.now() + 60e3) return cache[clave].t;
  const usuario = execFileSync("gcloud", ["auth", "print-access-token"], { encoding: "utf8" }).trim();
  const r = await fetch(`https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${CUENTA}:generateAccessToken`, {
    method: "POST", headers: { Authorization: "Bearer " + usuario, "Content-Type": "application/json" },
    body: JSON.stringify({ scope: alcances.map(a => ALCANCES[a] || a), lifetime: "1800s" }) });
  const d = await r.json();
  if (!d.accessToken) throw new Error("No se pudo actuar como enletrados-claude: " + JSON.stringify(d.error || d).slice(0, 300));
  cache[clave] = { t: d.accessToken, vence: Date.parse(d.expireTime) };
  return d.accessToken;
}
// pedido a una API de Google con el permiso de la cuenta robot
async function api(alcances, url, opciones = {}) {
  const t = await permiso(alcances);
  const r = await fetch(url, Object.assign({}, opciones, { headers: Object.assign({ Authorization: "Bearer " + t, "Content-Type": "application/json" }, opciones.headers || {}) }));
  const texto = await r.text(); let d; try { d = JSON.parse(texto); } catch (e) { d = { texto }; }
  if (!r.ok) throw new Error(`${r.status} ${url.split("?")[0]}: ` + JSON.stringify(d.error || d).slice(0, 400));
  return d;
}
module.exports = { api, CUENTA };

if (require.main === module) (async () => {
  // prueba de acceso, solo lectura
  const g = await api(["gtm_leer"], "https://tagmanager.googleapis.com/tagmanager/v2/accounts");
  for (const a of g.account || []) {
    console.log("Tag Manager · cuenta:", a.name);
    const c = await api(["gtm_leer"], `https://tagmanager.googleapis.com/tagmanager/v2/${a.path}/containers`);
    for (const x of c.container || []) console.log("   contenedor:", x.publicId, "·", x.name, "·", x.path);
  }
  const s = await api(["ga_leer"], "https://analyticsadmin.googleapis.com/v1beta/accountSummaries");
  for (const a of s.accountSummaries || []) for (const p of a.propertySummaries || []) console.log("GA4 · propiedad:", p.displayName, "·", p.property);
})().catch(e => { console.error("✗", e.message); process.exit(1); });
