// Anuncios de Google Ad Manager (Groone). Este archivo solo se publica y se carga cuando fuente/contenido/anuncios.json
// dice «activo: true», y app.js lo pide después de que se vea el juego (nunca antes de la primera partida).
// Reglas (CLAUDE.md): ningún anuncio durante la partida ni junto a la rueda; anchor solo fuera de los niveles; viñeta solo
// al pasar de nivel desde el nivel 3; la recompensa siempre la pide el jugador; el muro de ofertas está apagado.
(function () {
  "use strict";
  var CONF = __CONF__; // { red, unidades: { recompensa, vineta, display_nivel, display_portada, anchor } } (lo pone construir.js)
  var ruta = function (u) { var v = CONF.unidades[u] || ""; return !v ? "" : v.charAt(0) === "/" ? v : "/" + CONF.red + "/" + v; };

  // Muro de ofertas (Offerwall) apagado en todo el sitio. Tiene que estar definido antes de cargar el tag de Google.
  window.googlefc = window.googlefc || {};
  window.googlefc.controlledMessagingFunction = function (mensaje) { mensaje.proceed(false); };

  window.googletag = window.googletag || { cmd: [] };
  var cuerpo = document.body, pagina = cuerpo.dataset.pagina;
  var nivel = +((location.pathname.match(/^\/nivel\/(\d+)\//) || [])[1] || 0);
  var enPartida = pagina === "nivel" || pagina === "diario";
  var cuenta = 0, recompensa = null; // la oferta de recompensa en curso (una a la vez)

  // tamaños de display: en celular, nada más ancho que la pantalla
  var g = { get cmd() { return window.googletag.cmd; } }; // siempre el googletag vigente
  ["pubads", "sizeMapping", "defineSlot", "defineOutOfPageSlot", "display", "destroySlots", "enableServices"].forEach(function (f) { g[f] = function () { return window.googletag[f].apply(window.googletag, arguments); }; });
  Object.defineProperty(g, "enums", { get: function () { return window.googletag.enums; } });
  function tamanos() {
    var m = g.sizeMapping().addSize([768, 0], [[336, 280], [300, 250], [728, 90]]).addSize([0, 0], [[300, 250], [320, 100], [320, 50]]).build();
    return { lista: [[336, 280], [300, 250], [728, 90], [320, 100], [320, 50]], mapa: m };
  }
  // cada espacio .espacio-anuncio.real (en la página o en la pantalla de nivel completado) se llena una sola vez
  function llenar(div) {
    if (div.dataset.listo) return; div.dataset.listo = "1";
    var unidad = ruta(div.dataset.unidad || (enPartida ? "display_nivel" : "display_portada"));
    if (!unidad) { div.hidden = true; return; }
    div.id = div.id || "enl-anuncio-" + (++cuenta);
    g.cmd.push(function () {
      var t = tamanos(), s = g.defineSlot(unidad, t.lista, div.id);
      if (!s) return; s.defineSizeMapping(t.mapa).addService(g.pubads()); g.display(s);
    });
  }

  g.cmd.push(function () {
    var pub = g.pubads();
    pub.addEventListener("slotRenderEnded", function (e) {
      if (recompensa && e.slot === recompensa.slot && e.isEmpty) return recompensa.fin("sin-anuncio");
      var div = document.getElementById(e.slot.getSlotElementId()); if (div && e.isEmpty && div.classList.contains("espacio-anuncio")) div.hidden = true;
    });
    // recompensa: el jugador ya aceptó la oferta («Anuncio») en el juego, así que se muestra apenas está lista
    pub.addEventListener("rewardedSlotReady", function (e) { if (recompensa && e.slot === recompensa.slot) e.makeRewardedVisible(); });
    pub.addEventListener("rewardedSlotGranted", function (e) { if (recompensa && e.slot === recompensa.slot) recompensa.ganado = true; });
    pub.addEventListener("rewardedSlotClosed", function (e) { if (recompensa && e.slot === recompensa.slot) recompensa.fin(recompensa.ganado ? "visto" : "cerrado"); });

    // anchor: solo fuera de la partida (portada, mundos, cómo jugar)
    if (cuerpo.classList.contains("con-anchor") && !enPartida && ruta("anchor")) {
      var a = g.defineOutOfPageSlot(ruta("anchor"), g.enums.OutOfPageFormat.BOTTOM_ANCHOR); if (a) { a.addService(pub); g.display(a); }
    }
    // viñeta: en las páginas de nivel desde el 3. Sale al tocar «Siguiente nivel» (los demás enlaces la tienen apagada)
    if (pagina === "nivel" && nivel >= 3 && ruta("vineta")) {
      var v = g.defineOutOfPageSlot(ruta("vineta"), g.enums.OutOfPageFormat.INTERSTITIAL); if (v) { v.addService(pub); g.display(v); }
    }
    g.enableServices();
  });

  // espacios de display que ya están en la página y los que aparecen después (nivel completado, diario completado)
  [].forEach.call(document.querySelectorAll(".espacio-anuncio.real"), llenar);
  new MutationObserver(function (cambios) {
    cambios.forEach(function (c) { [].forEach.call(c.addedNodes, function (n) {
      if (n.nodeType !== 1) return;
      if (n.matches(".espacio-anuncio.real")) llenar(n);
      [].forEach.call(n.querySelectorAll(".espacio-anuncio.real"), llenar);
    }); });
  }).observe(cuerpo, { childList: true, subtree: true });

  // lo que usa app.js: verAnuncio() llama a recompensa(listo) y espera «visto», «cerrado» o «sin-anuncio»
  window.enlAnuncios = {
    recompensa: function (listo) {
      if (recompensa || !ruta("recompensa")) return listo("sin-anuncio");
      var r = recompensa = { ganado: false, slot: null }, espera = setTimeout(function () { r.fin("sin-anuncio"); }, 8000);
      r.fin = function (estado) {
        if (r.hecho) return; r.hecho = true; clearTimeout(espera); recompensa = null;
        if (r.slot) g.cmd.push(function () { g.destroySlots([r.slot]); });
        listo(estado);
      };
      g.cmd.push(function () {
        // mientras no llegue el anuncio, el jugador puede seguir: si no hay, el juego regala igual (sin-anuncio)
        r.slot = g.defineOutOfPageSlot(ruta("recompensa"), g.enums.OutOfPageFormat.REWARDED);
        if (!r.slot) return r.fin("sin-anuncio"); // el navegador o la página no admiten recompensa
        r.slot.addService(g.pubads()); g.display(r.slot);
      });
    }
  };

  var s = document.createElement("script"); s.async = true; s.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
  s.onerror = function () { window.enlAnuncios = null; }; // bloqueador de anuncios: el juego sigue igual, sin ofertas
  document.head.appendChild(s);
})();
