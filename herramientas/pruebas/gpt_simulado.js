// Simulador del tag de Google (GPT) para las pruebas: reemplaza a securepubads.g.doubleclick.net/tag/js/gpt.js, así
// nunca se piden anuncios reales ni se generan impresiones (regla 8). Anota todo en window.__gpt para revisarlo.
// window.__gptModo: "ok" (la recompensa se ve completa), "cerrar" (se cierra antes) o "vacio" (no hay anuncio).
(function () {
  // como el GPT real: si ya está cargado, una segunda copia no reinicia nada (solo corre lo que esté en la cola)
  if (window.__gpt && window.googletag && window.googletag.apiReady) return;
  var previo = window.googletag || {}, cola = previo.cmd || [], oyentes = {}, n = 0;
  var reg = window.__gpt = { slots: [], servicios: false, eventos: [] };
  function emitir(tipo, e) { e.type = tipo; reg.eventos.push(tipo); (oyentes[tipo] || []).forEach(function (f) { f(e); }); }
  function Slot(ruta, tipo, div) { this.ruta = ruta; this.tipo = tipo; this.div = div || "fuera-" + (++n); this.vivo = true; }
  Slot.prototype.addService = function () { return this; };
  Slot.prototype.defineSizeMapping = function () { return this; };
  Slot.prototype.setConfig = function () { return this; };
  Slot.prototype.getSlotElementId = function () { return this.div; };
  Slot.prototype.getAdUnitPath = function () { return this.ruta; };
  var pub = { addEventListener: function (t, f) { (oyentes[t] = oyentes[t] || []).push(f); return pub; }, enableSingleRequest: function () { return pub; }, setTargeting: function () { return pub; } };
  // como el GPT real, completa el objeto googletag que ya existe (quien lo guardó antes lo sigue usando)
  var g = window.googletag = Object.assign(previo, {
    apiReady: true, pubadsReady: true,
    enums: { OutOfPageFormat: { TOP_ANCHOR: 2, BOTTOM_ANCHOR: 3, REWARDED: 4, INTERSTITIAL: 5 } },
    pubads: function () { return pub; },
    sizeMapping: function () { var b = { addSize: function () { return b; }, build: function () { return []; } }; return b; },
    defineSlot: function (ruta, t, div) { var s = new Slot(ruta, "display", div); reg.slots.push(s); return s; },
    defineOutOfPageSlot: function (ruta, f) { var nombre = { 2: "anchor", 3: "anchor", 4: "recompensa", 5: "vineta" }[f] || "otro"; var s = new Slot(ruta, nombre); reg.slots.push(s); return s; },
    enableServices: function () { reg.servicios = true; },
    setConfig: function (c) { reg.config = Object.assign(reg.config || {}, c); },
    destroySlots: function (l) { (l || []).forEach(function (s) { s.vivo = false; }); return true; },
    display: function (s) {
      if (typeof s === "string") { var id = s; s = reg.slots.filter(function (x) { return x.div === id; })[0]; if (!s || s.mostrado) return; }
      s.mostrado = true;
      setTimeout(function () {
        var modo = window.__gptModo || "ok";
        if (s.tipo === "display") { if (window.__gptVacio) return emitir("slotRenderEnded", { slot: s, isEmpty: true }); var d = document.getElementById(s.div); if (d) { d.insertAdjacentHTML("beforeend", '<div id="google_ads_iframe_' + s.div + '__container__" style="border:0pt none"><iframe class="gpt-sim" title="GPT simulado" width="300" height="250" frameborder="0" style="border:0;vertical-align:bottom;background:#ddd"></iframe></div>'); } emitir("slotRenderEnded", { slot: s, isEmpty: false }); }
        if (s.tipo === "anchor") {
          // como el anchor de Google: fijo arriba, 64 px, con una flecha que lo oculta dejando una pestaña de 14 px
          if (window.__gptAnchorVacio) return emitir("slotRenderEnded", { slot: s, isEmpty: true });
          var caja = document.createElement("div"); caja.style.cssText = "position:fixed;top:0;left:0;right:0;z-index:2147483000;transition:transform .2s";
          caja.innerHTML = '<div id="' + s.div + '" style="height:64px;background:#ccc;display:grid;place-items:center">Anchor simulado</div>';
          document.body.appendChild(caja);
          window.__gptAnchorOcultar = function () { caja.style.transform = "translateY(-50px)"; };
          window.__gptAnchorMostrar = function () { caja.style.transform = "none"; };
          emitir("slotRenderEnded", { slot: s, isEmpty: false });
        }
        if (s.tipo === "recompensa") {
          if (modo === "vacio") return emitir("slotRenderEnded", { slot: s, isEmpty: true });
          emitir("rewardedSlotReady", { slot: s, makeRewardedVisible: function () {
            reg.recompensaVisible = true;
            // "largo": un video de 12 s (más que el temporizador de 8 s del juego), para comprobar que el premio llega igual
            setTimeout(function () { if (modo === "ok" || modo === "largo") emitir("rewardedSlotGranted", { slot: s, payload: null }); emitir("rewardedSlotClosed", { slot: s }); }, modo === "largo" ? 12000 : 400);
          } });
        }
      }, 50);
    },
    cmd: { push: function () { for (var i = 0; i < arguments.length; i++) arguments[i](); } }
  });
  cola.forEach(function (f) { f(); });
})();
