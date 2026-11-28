// Anuncios de Google Ad Manager con Groone. Este archivo solo se publica cuando fuente/contenido/anuncios.json dice
// «activo: true», y app.js lo pide cuando la página ya cargó (nunca antes de la primera partida).
// Reglas (CLAUDE.md): ningún anuncio durante la partida; anchor solo fuera de los niveles; viñeta solo al pasar de nivel
// desde el nivel 3; la recompensa siempre la pide el jugador; el muro de ofertas está apagado.
(function () {
  "use strict";
  var CONF = __CONF__; // { groone: { network, date, domain, subdomain, title, anchor }, recompensa } (lo pone construir.js)
  var cuerpo = document.body, pagina = cuerpo.dataset.pagina;
  var nivel = +((location.pathname.match(/^\/nivel\/(\d+)\//) || [])[1] || 0);
  var enPartida = pagina === "nivel" || pagina === "diario";

  // Muro de ofertas (Offerwall) apagado en todo el sitio. Tiene que estar definido antes de que cargue el tag de Google.
  window.googlefc = window.googlefc || {};
  window.googlefc.controlledMessagingFunction = function (mensaje) { mensaje.proceed(false); };
  window.googletag = window.googletag || { cmd: [] };

  // groone.js (Groone): llena los <div groone="ContentN">, y pone el anchor y la viñeta solo donde se le pide.
  // Busca los espacios una sola vez, al cargar: por eso en niveles y diario se carga cuando aparece la pantalla de
  // completado (ya con su espacio adentro). Así no hay nada de anuncios mientras se juega.
  var cargado = false;
  function cargarGroone() {
    if (cargado) return; cargado = true;
    var g = CONF.groone, s = document.createElement("script");
    s.id = "grooneads"; s.async = true; s.src = "https://genius.groone.com/groone.js";
    ["network", "date", "domain", "subdomain", "title"].forEach(function (k) { s.setAttribute("data-" + k, g[k]); });
    if (pagina === "nivel" && nivel >= 3) s.setAttribute("data-interstitial", "true"); // sale al tocar «Siguiente nivel»
    if (!enPartida && g.anchor && cuerpo.classList.contains("con-anchor")) s.setAttribute("data-anchor", g.anchor);
    document.head.appendChild(s);
  }
  if (!enPartida) cargarGroone();
  else if (document.querySelector("[groone]")) cargarGroone();
  else new MutationObserver(function (c, o) { if (document.querySelector("[groone]")) { o.disconnect(); cargarGroone(); } }).observe(cuerpo, { childList: true, subtree: true });

  function cargarGpt() {
    if (document.querySelector('script[src*="securepubads.g.doubleclick.net/tag/js/gpt.js"]')) return;
    var s = document.createElement("script"); s.async = true; s.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
    s.onerror = function () { window.enlAnuncios = null; }; // bloqueador de anuncios: el juego sigue igual, sin ofertas
    document.head.appendChild(s);
  }

  // ---- anchor arriba durante el juego (28 nov 2026), solo en niveles de crucigrama chico ----
  // Por decisión del usuario sale normal, encima del juego, y el juego no se mueve: si alguien necesita ver lo que tapa,
  // lo oculta con la flecha del propio anuncio. Vigilar su CTR en Groone (clics accidentales sobre la cabecera).
  if (pagina === "nivel" && CONF.anchorJuego && document.documentElement.dataset.anchorJuego === "1") {
    cargarGpt();
    window.googletag.cmd.push(function () {
      var g = window.googletag, s = g.defineOutOfPageSlot(CONF.anchorJuego, g.enums.OutOfPageFormat.TOP_ANCHOR);
      if (!s) return; // el navegador o la página no admiten anchor
      s.addService(g.pubads()); g.enableServices(); g.display(s);
    });
  }

  // ---- recompensa: la pide el jugador desde la tarjeta «Anuncio» del juego ----
  // app.js llama a recompensa(listo) y espera «visto», «cerrado» o «sin-anuncio».
  if (!CONF.recompensa) return; // sin unidad de recompensa, el juego no ofrece anuncios con recompensa
  var oyentes = false, actual = null;
  function escuchar() {
    if (oyentes) return; oyentes = true;
    var pub = window.googletag.pubads();
    pub.addEventListener("slotRenderEnded", function (e) { if (actual && e.slot === actual.slot && e.isEmpty) actual.fin("sin-anuncio"); });
    // el jugador ya aceptó la oferta en el juego, así que el anuncio se muestra apenas está listo
    // al estar listo se apaga el temporizador de «sin anuncio»: el jugador puede tardar lo que dure el video y recibe su premio
    pub.addEventListener("rewardedSlotReady", function (e) { if (actual && e.slot === actual.slot) { clearTimeout(actual.espera); e.makeRewardedVisible(); } });
    pub.addEventListener("rewardedSlotGranted", function (e) { if (actual && e.slot === actual.slot) actual.ganado = true; });
    pub.addEventListener("rewardedSlotClosed", function (e) { if (actual && e.slot === actual.slot) actual.fin(actual.ganado ? "visto" : "cerrado"); });
  }
  window.enlAnuncios = {
    recompensa: function (listo) {
      if (actual) return listo("sin-anuncio");
      // si en 8 s no llega ningún anuncio, el juego regala igual (sin-anuncio); el temporizador se apaga cuando llega
      var r = actual = { ganado: false, slot: null };
      r.espera = setTimeout(function () { r.fin("sin-anuncio"); }, 8000);
      r.fin = function (estado) {
        if (r.hecho) return; r.hecho = true; clearTimeout(r.espera); actual = null;
        if (r.slot) window.googletag.cmd.push(function () { window.googletag.destroySlots([r.slot]); });
        listo(estado);
      };
      cargarGpt();
      window.googletag.cmd.push(function () {
        escuchar();
        r.slot = window.googletag.defineOutOfPageSlot(CONF.recompensa, window.googletag.enums.OutOfPageFormat.REWARDED);
        if (!r.slot) return r.fin("sin-anuncio"); // el navegador o la página no admiten recompensa
        r.slot.addService(window.googletag.pubads()); window.googletag.enableServices(); window.googletag.display(r.slot);
      });
    }
  };
})();
