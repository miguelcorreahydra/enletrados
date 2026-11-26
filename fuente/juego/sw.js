// Service worker de Enletrados: el juego abre sin conexión con lo que ya se descargó.
// - Archivos con nombre versionado (CSS, JS): primero la caché.
// - Páginas y tableros: primero la red; si no hay conexión, la copia guardada; si no hay copia, la página «sin conexión».
// - Nunca toca anuncios, analítica ni nada de otros dominios (solo peticiones GET del mismo sitio).
// construir.js completa la versión de la caché y la lista de precarga en cada armado.
"use strict";
const CACHE = "enl-__VERSION__", PRECARGA = __PRECARGA__;
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECARGA)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("enl-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const r = e.request, u = new URL(r.url);
  if (r.method !== "GET" || u.origin !== location.origin || u.pathname.startsWith("/__") || u.pathname.startsWith("/revisar")) return;
  if (/^\/(app|estilos)\.[0-9a-f]+\.(js|css)$/.test(u.pathname)) {
    e.respondWith(caches.match(r).then(x => x || fetch(r).then(res => { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); return res; })));
    return;
  }
  e.respondWith(fetch(r).then(res => {
    if (res.ok) { const c = res.clone(); caches.open(CACHE).then(k => k.put(r, c)); }
    return res;
  }).catch(() => caches.match(r, { ignoreSearch: true }).then(x => x || (r.mode === "navigate" ? caches.match("/sin-conexion/") : Response.error()))));
});
