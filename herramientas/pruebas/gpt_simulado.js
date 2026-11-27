// Simulador del tag de Google (GPT) para las pruebas: reemplaza a securepubads.g.doubleclick.net/tag/js/gpt.js, así
// nunca se piden anuncios reales ni se generan impresiones (regla 8). Anota todo en window.__gpt para revisarlo.
// window.__gptModo: "ok" (la recompensa se ve completa), "cerrar" (se cierra antes) o "vacio" (no hay anuncio).
(function () {
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
        if (s.tipo === "display") { if (window.__gptVacio) return emitir("slotRenderEnded", { slot: s, isEmpty: true }); var d = document.getElementById(s.div); if (d) { d.insertAdjacentHTML("beforeend", '<div class="gpt-sim" style="width:300px;height:250px;background:#ddd;display:inline-grid;place-items:center">GPT simulado</div>'); } emitir("slotRenderEnded", { slot: s, isEmpty: false }); }
        if (s.tipo === "recompensa") {
          if (modo === "vacio") return emitir("slotRenderEnded", { slot: s, isEmpty: true });
          emitir("rewardedSlotReady", { slot: s, makeRewardedVisible: function () {
            reg.recompensaVisible = true;
            setTimeout(function () { if (modo === "ok") emitir("rewardedSlotGranted", { slot: s, payload: null }); emitir("rewardedSlotClosed", { slot: s }); }, 400);
          } });
        }
      }, 50);
    },
    cmd: { push: function () { for (var i = 0; i < arguments.length; i++) arguments[i](); } }
  });
  cola.forEach(function (f) { f(); });
})();
