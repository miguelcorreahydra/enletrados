// Enletrados: un solo archivo para todo el sitio. Sin librerías.
// Partió del prototipo «Letras Cruzadas» (24 nov 2026). Progreso en localStorage con prefijo enl_.
// Los anuncios están SIMULADOS: el de recompensa solo si el jugador lo pide; nunca durante la partida.
// Mecánicas de regreso (fase 3): generan ganas, no presión. Nada se pierde por no entrar, nada se compra
// y no hay cuentas regresivas falsas.
(function () {
  "use strict";
  var PREFIJO = "enl_";
  var $ = function (id) { return document.getElementById(id); };
  var quieto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- guardado (si el navegador lo bloquea, el juego sigue funcionando) ----------
  function leer(k, d) { try { var v = localStorage.getItem(PREFIJO + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(PREFIJO + k, JSON.stringify(v)); } catch (e) {} }
  function borrar(k) { try { localStorage.removeItem(PREFIJO + k); } catch (e) {} }
  // Google Tag Manager (el código de medición que entregó el usuario). Va aquí y no en línea porque la CSP no permite
  // scripts en línea. La cola dataLayer existe desde el principio (los eventos del juego no se pierden), y gtm.js se pide
  // cuando la página ya cargó: la medición nunca retrasa la partida.
  var GTM = document.documentElement.dataset.gtm;
  if (GTM) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    var cargarGtm = function () { var s = document.createElement("script"); s.async = true; s.src = "https://www.googletagmanager.com/gtm.js?id=" + encodeURIComponent(GTM); document.head.appendChild(s); };
    if (document.readyState === "complete") cargarGtm(); else addEventListener("load", cargarGtm);
  }
  // Píxel de Meta, Clarity y Hotjar (códigos del usuario, propios de Enletrados). Las colas se crean ya, así ningún evento
  // se pierde; los scripts se piden cuando la página terminó de cargar (el píxel) o un momento después (las grabaciones).
  // Los espacios de anuncio llevan data-clarity-mask y data-hj-suppress: no se graban.
  var RAIZ = document.documentElement.dataset;
  function cargarScript(src) { var s = document.createElement("script"); s.async = true; s.src = src; document.head.appendChild(s); }
  function alCargar(f, ms) { var g = function () { setTimeout(f, ms || 0); }; if (document.readyState === "complete") g(); else addEventListener("load", g); }
  if (RAIZ.pixel) {
    var fb = window.fbq = function () { fb.callMethod ? fb.callMethod.apply(fb, arguments) : fb.queue.push(arguments); };
    if (!window._fbq) window._fbq = fb; fb.push = fb; fb.loaded = true; fb.version = "2.0"; fb.queue = [];
    fb("init", RAIZ.pixel); fb("track", "PageView");
    alCargar(function () { cargarScript("https://connect.facebook.net/en_US/fbevents.js"); });
  }
  if (RAIZ.clarity) {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    alCargar(function () { cargarScript("https://www.clarity.ms/tag/" + encodeURIComponent(RAIZ.clarity)); }, 1500);
  }
  if (RAIZ.hotjar) {
    window.hj = window.hj || function () { (window.hj.q = window.hj.q || []).push(arguments); };
    window._hjSettings = { hjid: +RAIZ.hotjar, hjsv: 6 };
    alCargar(function () { cargarScript("https://static.hotjar.com/c/hotjar-" + window._hjSettings.hjid + ".js?sv=6"); }, 1500);
  }
  // Al píxel van solo los momentos que sirven a la campaña. enl_nivel_3 es «Cliente potencial» (Lead): la conversión
  // «ENL - Nivel 3» por la que optimiza la campaña (alguien que de verdad jugó).
  var PIXEL = { enl_nivel_3: ["track", "Lead"], enl_nivel_1: ["trackCustom", "enl_nivel_1"], enl_nivel_5: ["trackCustom", "enl_nivel_5"],
    enl_nivel_10: ["trackCustom", "enl_nivel_10"], enl_diario: ["trackCustom", "enl_diario"], enl_regreso: ["trackCustom", "enl_regreso"] };
  function evento(n, d) {
    (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: n }, d || {}));
    if (window.fbq && RAIZ.pixel && PIXEL[n]) window.fbq(PIXEL[n][0], PIXEL[n][1], { content_name: n });
  }
  function datos(id) { var e = $(id); return e ? JSON.parse(e.textContent) : null; }

  // ---------- fechas locales (el diario y la racha usan la fecha del jugador) ----------
  function dos(n) { return (n < 10 ? "0" : "") + n; }
  function fecha(d) { d = d || new Date(); return d.getFullYear() + "-" + dos(d.getMonth() + 1) + "-" + dos(d.getDate()); }
  function aFecha(s) { var x = s.split("-"); return new Date(+x[0], x[1] - 1, +x[2]); }
  function diasEntre(a, b) { return Math.round((aFecha(b) - aFecha(a)) / 864e5); }
  var HOY = fecha();

  // ---------- progreso ----------
  // monedas: se empieza con 100. +10 por nivel, +2 por palabra extra, +25 por el diario. Letra 30, palabra 80.
  var PRECIO_LETRA = 30, PRECIO_PALABRA = 80;
  // ---------- seguridad: el progreso se acepta solo con su formato exacto ----------
  // Viene del navegador o de un enlace (?enl=) que cualquiera puede armar: todo lo que no calce con el formato se descarta.
  // (Revisión de seguridad del 27 nov 2026: un enlace armado permitía ejecutar código en la página de Logros.)
  var FECHA = /^\d{4}-\d{2}-\d{2}$/;
  function entero(v, min, max) { v = Math.floor(Number(v)); return isFinite(v) ? Math.max(min, Math.min(max, v)) : min; }
  function esFecha(v) { return typeof v === "string" && FECHA.test(v); }
  function esObjeto(v) { return !!v && typeof v === "object" && !Array.isArray(v); }
  function limpiarProgreso(x) {
    var r = {}; if (!esObjeto(x)) return r;
    if (Array.isArray(x.hechos)) r.hechos = x.hechos.slice(0, 1000).map(function (n) { return entero(n, 0, 1000); })
      .filter(function (n, i, a) { return n >= 1 && a.indexOf(n) === i; });
    [["gratis", 999], ["extras", 1e6], ["monedas", 1e7], ["doradas", 1e5], ["cofres", 1e5], ["ayudas", 1e6], ["protector", 2]].forEach(function (c) {
      if (x[c[0]] != null) r[c[0]] = entero(x[c[0]], 0, c[1]); });
    if (esObjeto(x.estrellas)) { r.estrellas = {}; Object.keys(x.estrellas).slice(0, 1000).forEach(function (k) { if (/^\d{1,4}$/.test(k)) r.estrellas[k] = entero(x.estrellas[k], 1, 3); }); }
    if (Array.isArray(x.dias)) r.dias = x.dias.filter(esFecha).slice(-800);
    if (esObjeto(x.racha)) r.racha = { n: entero(x.racha.n, 0, 1e5), mejor: entero(x.racha.mejor, 0, 1e5), ultimo: esFecha(x.racha.ultimo) ? x.racha.ultimo : null };
    if (esObjeto(x.diario)) { r.diario = {}; Object.keys(x.diario).filter(esFecha).slice(-1000).forEach(function (k) {
      var d = esObjeto(x.diario[k]) ? x.diario[k] : {};
      r.diario[k] = { e: entero(d.e, 1, 3), c: typeof d.c === "string" ? d.c.replace(/[^\u{1F7E7}\u{1F7E8}]/gu, "").slice(0, 60) : "", x: entero(d.x, 0, 1000) }; }); }
    if (esObjeto(x.cartero)) r.cartero = { ultimo: entero(x.cartero.ultimo, 0, 1e14), fecha: esFecha(x.cartero.fecha) ? x.cartero.fecha : null, hoy: entero(x.cartero.hoy, 0, 3) };
    if (esFecha(x.llegada)) r.llegada = x.llegada;
    if (x.regreso === true) r.regreso = true;
    if (Array.isArray(x.lugaresVistos)) r.lugaresVistos = x.lugaresVistos.filter(function (v) { return typeof v === "string" && /^\d{1,2}[ec]$/.test(v); }).slice(0, 40);
    return r;
  }
  // para mostrar cualquier valor dentro de HTML sin que se interprete como código
  function esc(v) { return String(v).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }

  var p = (function () {
    var x = limpiarProgreso(leer("progreso", null));
    var def = { hechos: [], gratis: 1, extras: 0, monedas: 100, estrellas: {}, dias: [], racha: { n: 0, mejor: 0, ultimo: null }, protector: 0,
      diario: {}, cartero: { ultimo: 0, fecha: null, hoy: 0 }, doradas: 0, cofres: 0, ayudas: 0, llegada: null };
    for (var k in def) if (x[k] == null) x[k] = def[k];
    return x;
  })();
  function guardarP() { guardar("progreso", p); }
  // Avance que llega desde el navegador de Facebook o Instagram (?enl=): se usa si trae más niveles que el de aquí.
  var avanceLlego = null;
  (function () {
    var m = /[?&]enl=([A-Za-z0-9_-]+)/.exec(location.search); if (!m) return;
    try {
      var b = m[1].replace(/-/g, "+").replace(/_/g, "/"); while (b.length % 4) b += "=";
      var x = JSON.parse(decodeURIComponent(escape(atob(b))));
      x = limpiarProgreso(x);
      if (Array.isArray(x.hechos) && x.monedas != null) {
        if (x.hechos.length >= p.hechos.length) { for (var k in x) p[k] = x[k]; guardarP(); avanceLlego = "Tu avance llegó. ¡Sigue donde quedaste!"; }
        else avanceLlego = "Aquí ya tenías más avance: lo mantuvimos.";
        evento("enl_navegador_externo", { accion: "llego" });
      }
    } catch (e) {}
    try { history.replaceState(null, "", location.pathname + location.hash); } catch (e) {}
  })();
  // primera visita y regreso (enl_regreso: primera visita de un día distinto al de la llegada)
  if (!p.llegada) { p.llegada = HOY; guardarP(); evento("enl_inicio"); }
  else if (p.llegada !== HOY && !p.regreso) { p.regreso = true; guardarP(); evento("enl_regreso"); }
  function totalEstrellas() { var t = 0; for (var k in p.estrellas) t += p.estrellas[k]; return t; }

  // Racha de días seguidos. El protector (se gana cada 7 días de racha, máximo 2) cubre un día sin jugar.
  function marcarDia() {
    if (p.dias.indexOf(HOY) >= 0) return null;
    p.dias.push(HOY); if (p.dias.length > 800) p.dias.shift();
    var r = p.racha, msg = null, gap = r.ultimo ? diasEntre(r.ultimo, HOY) : 99;
    if (gap === 1) r.n++;
    else if (gap === 2 && p.protector > 0) { p.protector--; r.n++; msg = "Tu protector cuidó la racha de ayer"; }
    else r.n = 1;
    r.ultimo = HOY; r.mejor = Math.max(r.mejor, r.n);
    if (r.n % 7 === 0 && p.protector < 2) { p.protector++; msg = "¡" + r.n + " días seguidos! Ganaste un protector de racha"; }
    guardarP(); return msg;
  }
  function rachaVigente() { return p.racha.ultimo && diasEntre(p.racha.ultimo, HOY) <= (p.protector > 0 ? 2 : 1) ? p.racha.n : 0; }

  // ---------- sonido: tonos sintetizados con Web Audio, sin archivos ----------
  var sonido = leer("sonido", true), vibra = leer("vibracion", true), ac = null;
  function audio() {
    if (!sonido) return null;
    if (!ac) { try { ac = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (ac.state === "suspended") ac.resume();
    return ac;
  }
  function tono(f, cuando, dur, vol, tipo) {
    var a = audio(); if (!a) return;
    var t = a.currentTime + (cuando || 0), o = a.createOscillator(), g = a.createGain();
    o.type = tipo || "sine"; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + dur + 0.03);
    if (!tipo) { // un armónico corto le da timbre de marimba
      var o2 = a.createOscillator(), g2 = a.createGain(); o2.frequency.setValueAtTime(f * 4, t);
      g2.gain.setValueAtTime(0.0001, t); g2.gain.exponentialRampToValueAtTime((vol || 0.12) * 0.25, t + 0.005); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
      o2.connect(g2); g2.connect(a.destination); o2.start(t); o2.stop(t + 0.1);
    }
  }
  var ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5, 1567.98];
  var suena = {
    letra: function (i) { tono(ESCALA[Math.min(i, ESCALA.length - 1)], 0, 0.28, 0.11); },
    acierto: function () { [0, 2, 4, 5].forEach(function (n, i) { tono(ESCALA[n], i * 0.07, 0.4, 0.1); }); },
    extra: function () { tono(1318.5, 0, 0.3, 0.08); tono(1760, 0.08, 0.45, 0.07); },
    moneda: function () { tono(1975.5, 0, 0.12, 0.06); tono(2637, 0.07, 0.3, 0.06); },
    dorada: function () { [4, 5, 7, 8].forEach(function (n, i) { tono(ESCALA[n], i * 0.06, 0.5, 0.08); }); },
    error: function () { tono(220, 0, 0.18, 0.08, "triangle"); tono(174.6, 0.09, 0.22, 0.07, "triangle"); },
    completo: function () { [0, 2, 4, 5, 7].forEach(function (n, i) { tono(ESCALA[n], i * 0.09, 0.7, 0.1); }); tono(261.6, 0.45, 1.2, 0.06, "triangle"); tono(392, 0.45, 1.2, 0.05, "triangle"); },
    cofre: function () { tono(196, 0, 0.25, 0.08, "triangle"); [2, 4, 5, 7, 8].forEach(function (n, i) { tono(ESCALA[n], 0.25 + i * 0.07, 0.6, 0.08); }); },
    toque: function () { tono(880, 0, 0.12, 0.05); }
  };
  function vibrar(ms) { if (!vibra) return; try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function botonSonido() {
    var b = $("b-sonido"); if (!b) return;
    var pintar = function () { b.classList.toggle("mudo", !sonido); b.setAttribute("aria-pressed", sonido ? "true" : "false"); b.setAttribute("aria-label", sonido ? "Silenciar sonido" : "Activar sonido"); };
    pintar();
    b.addEventListener("click", function () { sonido = !sonido; guardar("sonido", sonido); pintar(); suena.toque(); });
  }

  // ---------- avisos ----------
  var tAviso;
  function aviso(t, ms) { var a = $("aviso"); if (!a) return; a.textContent = t; a.classList.add("ver"); clearTimeout(tAviso); tAviso = setTimeout(function () { a.classList.remove("ver"); }, ms || 1800); }

  // ---------- monedas: el contador sube de a poco y la ficha da un salto ----------
  var mostradas = p.monedas;
  function pintarMonedas(animar) {
    var c = $("monedas"); if (!c) return;
    var b = c.querySelector("b"), desde = mostradas, hasta = p.monedas; mostradas = hasta;
    if (!animar || quieto || desde === hasta) { b.textContent = hasta; return; }
    c.classList.remove("salta"); void c.offsetWidth; c.classList.add("salta");
    var t0 = performance.now();
    (function paso(t) { var k = Math.min(1, (t - t0) / 600); b.textContent = Math.round(desde + (hasta - desde) * k); if (k < 1) requestAnimationFrame(paso); })(t0);
  }
  function ganarMonedas(n, desde) {
    p.monedas += n; guardarP();
    var c = $("monedas");
    if (!desde || !c || quieto) { pintarMonedas(true); return; }
    var o = desde.getBoundingClientRect(), r = c.getBoundingClientRect(), k = Math.min(5, Math.max(1, Math.round(n / 5)));
    for (var i = 0; i < k; i++) (function (i) {
      var el = document.createElement("div"); el.className = "moneda-vuela"; el.innerHTML = '<svg class="i"><use href="#i-moneda"/></svg>';
      el.style.left = (r.left + 6) + "px"; el.style.top = (r.top + r.height / 2 - 11) + "px"; document.body.appendChild(el);
      var dx = o.left + o.width / 2 - r.left - 17, dy = o.top + o.height / 2 - r.top - r.height / 2;
      el.animate([{ transform: "translate(" + dx + "px," + dy + "px) scale(.6)", opacity: 0 }, { opacity: 1, offset: 0.2 },
        { transform: "translate(" + dx * 0.4 + "px," + (dy * 0.4 - 40) + "px) scale(1.1)", offset: 0.55 }, { transform: "none", opacity: 1 }],
        { duration: 650, delay: i * 80, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" }).onfinish = function () {
        el.remove(); if (i === k - 1) { pintarMonedas(true); suena.moneda(); }
      };
    })(i);
  }

  // ---------- chispas de luz (estilo «mágico», elegido por el usuario el 26 nov 2026) ----------
  // x, y en coordenadas de la pantalla. modo «estallido»: salen en círculo; «sube»: flotan hacia arriba.
  function chispas(x, y, op) {
    if (quieto) return; op = op || {};
    var n = op.n || 6, radio = op.radio || 36, ms = op.ms || 650;
    for (var i = 0; i < n; i++) (function (i) {
      var c = document.createElement("div"), a = i / n * 6.283 + (op.giro || 0), dx, dy;
      c.className = "chispa"; c.style.left = (x - 3 + (op.ancho ? (Math.random() - 0.5) * op.ancho : 0)) + "px"; c.style.top = (y - 3) + "px";
      document.body.appendChild(c);
      if (op.modo === "sube") { dx = (Math.random() - 0.5) * 20; dy = -radio - Math.random() * radio * 0.8; } else { dx = Math.cos(a) * radio; dy = Math.sin(a) * radio; }
      c.animate([{ opacity: 0, transform: "scale(1)" }, { opacity: 1, offset: 0.15 }, { opacity: 0, transform: "translate(" + dx + "px," + dy + "px) scale(.2)" }],
        { duration: ms, delay: (op.delay || 0) + (op.escalonar ? i * op.escalonar : 0), easing: "cubic-bezier(.2,.8,.2,1)", fill: "both" }).onfinish = function () { c.remove(); };
    })(i);
  }

  // ---------- confeti: canvas propio, unas 140 piezas de papel ----------
  function confeti() {
    if (quieto) return;
    var c = document.createElement("canvas"), x = c.getContext("2d"), dpr = Math.min(2, window.devicePixelRatio || 1);
    c.className = "confeti"; document.body.appendChild(c);
    var W = c.width = innerWidth * dpr, H = c.height = innerHeight * dpr;
    var colores = ["#C0603A", "#C9973B", "#6E8B57", "#E58B6B", "#F3DFAE", "#2F6E8A", "#FFFFFF"], piezas = [];
    for (var i = 0; i < 140; i++) {
      var lado = Math.random() < 0.5 ? -1 : 1;
      piezas.push({ x: W / 2 + lado * W * 0.18, y: H * 0.62, vx: (lado * -1) * (2 + Math.random() * 7) * dpr + (Math.random() - 0.5) * 4 * dpr,
        vy: -(9 + Math.random() * 9) * dpr, g: 0.32 * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: (6 + Math.random() * 6) * dpr,
        h: (8 + Math.random() * 8) * dpr, c: colores[i % colores.length], o: Math.random() * 6 });
    }
    var t0 = performance.now();
    (function cuadro(t) {
      var vida = (t - t0) / 1000; x.clearRect(0, 0, W, H);
      piezas.forEach(function (q) {
        q.vy += q.g; q.vx *= 0.985; q.vy *= 0.985; q.x += q.vx + Math.sin(vida * 4 + q.o) * dpr; q.y += q.vy; q.r += q.vr;
        x.save(); x.translate(q.x, q.y); x.rotate(q.r); x.scale(1, Math.cos(vida * 8 + q.o)); x.globalAlpha = Math.max(0, 1 - Math.max(0, vida - 1.8));
        x.fillStyle = q.c; x.fillRect(-q.w / 2, -q.h / 2, q.w, q.h); x.restore();
      });
      if (vida < 2.9) requestAnimationFrame(cuadro); else c.remove();
    })(t0);
  }

  // ---------- hojas (ventanas que suben desde abajo) ----------
  function abrir(h) { $("hoja-contenido").innerHTML = h; $("velo").classList.add("ver"); $("hoja-contenido").parentNode.scrollTop = 0; }
  function cerrar() { $("velo").classList.remove("ver"); }
  function prepararHojas() {
    var v = $("velo"); if (!v) return;
    v.addEventListener("click", function (e) { if (e.target.id === "velo" || e.target.id === "cerrar" || (e.target.closest && e.target.closest('[data-accion="cerrar"]'))) cerrar(); });
  }
  // después de abrir la hoja: un estallido de chispas en cada estrella ganada, al ritmo de su entrada
  function chispasEstrellas() {
    Array.prototype.forEach.call(document.querySelectorAll(".hoja .estrellas.entra .est.si"), function (e, i) {
      setTimeout(function () { var r = e.getBoundingClientRect(); chispas(r.left + r.width / 2, r.top + r.height / 2, { n: 7, radio: 46, ms: 720 }); }, 350 + i * 180 + 380);
    });
  }
  function estrellasHtml(n, animar) {
    var h = '<div class="estrellas' + (animar ? " entra" : "") + '" role="img" aria-label="' + n + ' de 3 estrellas">';
    for (var i = 0; i < 3; i++) h += '<span class="est' + (i < n ? " si" : "") + '" style="--i:' + i + '"><span class="rayos"></span><svg class="i"><use href="#i-estrella"/></svg></span>';
    return h + "</div>";
  }
  var COFRE = '<svg class="cofre" viewBox="0 0 120 96" aria-hidden="true"><ellipse cx="60" cy="90" rx="44" ry="5" fill="rgb(0 0 0 / .12)"/>' +
    '<g class="brillos"><path d="M60 8v14M36 16l8 10M84 16l-8 10M24 34h12M84 34h12" stroke="#E2B65A" stroke-width="4" stroke-linecap="round"/></g>' +
    '<rect x="18" y="46" width="84" height="42" rx="6" fill="#9C4A2C"/><rect x="18" y="46" width="84" height="10" fill="#7E3A22"/>' +
    '<rect x="54" y="46" width="12" height="42" fill="#E2B65A"/><rect x="51" y="58" width="18" height="14" rx="3" fill="#F3D27E" stroke="#B9872F" stroke-width="2"/>' +
    '<g class="tapa"><path d="M18 48V38a20 18 0 0 1 20-18h44a20 18 0 0 1 20 18v10z" fill="#C0603A"/><rect x="54" y="20" width="12" height="28" fill="#E2B65A"/></g></svg>';

  // ---------- portada ----------
  function nivelActual(sitio) {
    for (var n = 1; n <= sitio.total; n++) if (p.hechos.indexOf(n) < 0) return n;
    return sitio.total;
  }
  function mundoDe(sitio, n) { for (var i = 0; i < sitio.mundos.length; i++) if (n >= sitio.mundos[i].desde && n <= sitio.mundos[i].hasta) return sitio.mundos[i]; return sitio.mundos[0]; }
  function hechosEn(m) { return p.hechos.filter(function (n) { return n >= m.desde && n <= m.hasta; }).length; }

  // ---------- anuncios con recompensa: siempre opcionales y rotulados como anuncio ----------
  // El premio se entrega solo si el anuncio se vio completo (así lo exige Google). Tope de 10 al día por jugador, para no
  // cansar y cuidar la cuenta de Groone. Cuando Ad Manager esté activo, window.enlAnuncios.recompensa(listo) pide el
  // anuncio real y avisa con «visto», «cerrado» o «sin-anuncio»; mientras tanto se simula.
  var TOPE_RECOMPENSAS = 10;
  // «simulados» en local, «no» publicado sin Ad Manager (no se ofrece nada falso), «activos» con Ad Manager conectado
  var ANUNCIOS = document.documentElement.dataset.anuncios || "simulados";
  // el tag de Google se pide cuando la página ya cargó y el juego se ve: los anuncios nunca retrasan la primera partida
  if (ANUNCIOS === "activos" && document.documentElement.dataset.anunciosJs) addEventListener("load", function () {
    setTimeout(function () { var s = document.createElement("script"); s.src = document.documentElement.dataset.anunciosJs; document.head.appendChild(s); }, 1200);
  });
  function hayAnuncios() { return ANUNCIOS === "simulados" || (ANUNCIOS === "activos" && !!(window.enlAnuncios && window.enlAnuncios.recompensa)); }
  // display de las pantallas de completado: con Ad Manager, un <div groone="ContentN"> (groone.js se carga al aparecer)
  function espacioAnuncio(extra, cual) {
    if (ANUNCIOS === "simulados") return '<div class="espacio-anuncio" data-clarity-mask="true" data-hj-suppress>Espacio de anuncio (simulado)' + (extra || "") + "</div>";
    var nombre = ANUNCIOS === "activos" && document.documentElement.dataset[cual === "diario" ? "espacioDiario" : "espacioNivel"];
    return nombre && /^Content\d+$/.test(nombre) ? '<div class="espacio-anuncio real" data-clarity-mask="true" data-hj-suppress><div groone="' + nombre + '" lazyload="true"></div></div>' : "";
  }
  function recompensasHoy() { var r = leer("recompensas", null); return r && r.fecha === HOY ? r.n : 0; }
  function quedanRecompensas() { return hayAnuncios() && recompensasHoy() < TOPE_RECOMPENSAS; }
  function verAnuncio(tipo, alGanar, sinAnuncio) {
    evento("enl_recompensa", { tipo: tipo, estado: "pedido" });
    var listo = function (estado) {
      if (estado === "visto") { guardar("recompensas", { fecha: HOY, n: recompensasHoy() + 1 }); evento("enl_recompensa", { tipo: tipo, estado: "visto" }); alGanar(); }
      else if (estado === "sin-anuncio") { evento("enl_recompensa", { tipo: tipo, estado: "sin_anuncio" }); if (sinAnuncio) sinAnuncio(); else aviso("Ahora no hay anuncios disponibles. Prueba más tarde.", 2600); }
      else { evento("enl_recompensa", { tipo: tipo, estado: "cerrado" }); aviso("El premio se entrega al ver el anuncio completo", 2600); }
    };
    if (window.enlAnuncios && window.enlAnuncios.recompensa) return window.enlAnuncios.recompensa(listo);
    if (ANUNCIOS === "simulados") simularAnuncio(listo); else listo("sin-anuncio"); // nunca se simula en el sitio publicado
  }
  function simularAnuncio(listo) {
    var sim = $("sim"); if (!sim) { sim = document.createElement("div"); sim.className = "sim"; sim.id = "sim"; document.body.appendChild(sim); }
    var n = 3; sim.innerHTML = "Aquí iría el anuncio con recompensa<small>Simulación: " + n + " s</small>"; sim.classList.add("ver");
    var t = setInterval(function () { n--; sim.querySelector("small").textContent = "Simulación: " + n + " s"; if (n <= 0) { clearInterval(t); sim.classList.remove("ver"); listo("visto"); } }, 1000);
  }
  // tarjeta de oferta: se ve como oferta (con la etiqueta «Anuncio»), nunca como un botón del juego
  function ofertaAnuncio(accion, titulo, detalle) {
    return '<button class="oferta-anuncio" data-accion="' + accion + '"><span class="oferta-icono" aria-hidden="true"><svg class="i"><use href="#i-video"/></svg></span>' +
      "<span><b>" + titulo + "</b><small>" + detalle + '</small></span><span class="etiqueta-anuncio">Anuncio</span></button>';
  }

  // El cartero de Tilde: una carta cada 4 horas, hasta 3 por día. Si no entras, no pasa nada: la carta espera.
  var CARTAS = [{ m: 20, t: "20 monedas" }, { g: 1, t: "una letra gratis" }, { m: 30, t: "30 monedas" }];
  function carteroListo() {
    var c = p.cartero, hoyN = c.fecha === HOY ? c.hoy : 0;
    return hoyN < 3 && Date.now() - c.ultimo >= 4 * 3600e3;
  }
  function cartero() {
    var b = $("cartero"); if (!b) return;
    if (!p.hechos.length || !carteroListo()) return; // la primera carta llega después del primer nivel
    b.hidden = false;
    b.addEventListener("click", function () {
      if (!carteroListo()) return;
      var c = p.cartero; if (c.fecha !== HOY) { c.fecha = HOY; c.hoy = 0; }
      var regalo = CARTAS[(p.dias.length + c.hoy) % CARTAS.length]; c.hoy++; c.ultimo = Date.now();
      if (regalo.g) p.gratis += regalo.g; guardarP();
      b.classList.add("abierta"); suena.cofre(); vibrar([10, 40, 10]);
      b.querySelector("b").textContent = "Tilde te trajo " + regalo.t;
      b.querySelector("small").textContent = c.hoy < 3 ? "Volverá con otra carta más tarde" : "Mañana trae más cartas";
      if (regalo.m) ganarMonedas(regalo.m, b); else pintarMonedas(true);
      evento("enl_cartero", { regalo: regalo.t });
      if (c.hoy < 3 && quedanRecompensas()) {
        var o = document.createElement("div"); o.innerHTML = ofertaAnuncio("otra-carta", "¿No quieres esperar?", "Mira un anuncio y Tilde trae otra carta ahora"); o = o.firstChild;
        b.insertAdjacentElement("afterend", o);
        o.addEventListener("click", function () {
          verAnuncio("carta", function () {
            p.cartero.ultimo = 0; guardarP(); o.remove();
            b.classList.remove("abierta"); b.querySelector("b").textContent = "Tilde te trajo otra carta"; b.querySelector("small").textContent = "Ábrela para ver tu regalo";
            cartero();
          });
        }, { once: true });
      }
    }, { once: true });
  }

  // revelado «mágico»: halo dorado, la capa de color sube desde abajo y flotan chispas
  function encenderLugar(g) {
    if (quieto) return;
    var svg = g.ownerSVGElement, ns = "http://www.w3.org/2000/svg", x = +g.getAttribute("x"), y = +g.getAttribute("y"), w = +g.getAttribute("width"), h = +g.getAttribute("height");
    var cp = document.createElementNS(ns, "clipPath"), rect = document.createElementNS(ns, "rect"), id = "sube-" + g.dataset.mundo;
    cp.id = id; rect.setAttribute("x", x); rect.setAttribute("width", w); rect.setAttribute("y", y + h); rect.setAttribute("height", 0);
    cp.appendChild(rect); svg.querySelector("defs").appendChild(cp); g.setAttribute("clip-path", "url(#" + id + ")");
    var halo = document.createElementNS(ns, "ellipse");
    halo.setAttribute("cx", x + w / 2); halo.setAttribute("cy", y + h * 0.6); halo.setAttribute("rx", w * 0.9); halo.setAttribute("ry", h * 0.55);
    halo.setAttribute("fill", "url(#g-halo)"); halo.setAttribute("class", "halo-lugar"); svg.insertBefore(halo, g);
    var t0 = performance.now(), dur = 1300;
    (function paso(t) {
      var k = Math.max(0, Math.min(1, (t - t0) / dur)), e = Math.max(0, Math.min(1, k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2));
      rect.setAttribute("y", y + h * (1 - e)); rect.setAttribute("height", h * e);
      if (k < 1) requestAnimationFrame(paso); else { g.removeAttribute("clip-path"); cp.remove(); setTimeout(function () { halo.remove(); }, 1600); }
    })(t0);
    var b = g.getBoundingClientRect();
    chispas(b.left + b.width / 2, b.top + b.height * 0.8, { n: 12, radio: 60, ms: 1300, modo: "sube", ancho: b.width * 0.8, escalonar: 70, delay: 200 });
    suena.cofre();
  }

  function portada(sitio) {
    var n = nivelActual(sitio), m = mundoDe(sitio, n), hechos = hechosEn(m);
    var jugar = $("b-jugar");
    jugar.href = "/nivel/" + n + "/";
    $("b-jugar-t").textContent = p.hechos.length ? "Seguir jugando" : "Empezar a jugar";
    $("b-jugar-n").textContent = "Nivel " + n;
    if (p.hechos.length) $("saludo").textContent = "¡Qué bueno verte de nuevo! El pueblo te estaba esperando.";
    $("b-diario-n").textContent = p.diario[HOY] ? "Hecho hoy ✓" : "Tablero de hoy";
    // estado de cada lugar en el mapa
    sitio.mundos.forEach(function (mu) {
      var g = document.querySelector('.pueblo .luz-lugar[data-mundo="' + mu.id + '"]'); if (!g) return;
      var completo = hechosEn(mu) >= (mu.hasta - mu.desde + 1) && mu.hasta <= sitio.total;
      if (!completo && mu.id !== m.id) return;
      var codigo = mu.id + (completo ? "e" : "c"), nuevoLugar = (p.lugaresVistos || []).indexOf(codigo) < 0;
      g.addEventListener("load", function () {
        g.classList.add(completo ? "encendido" : "en-curso");
        if (nuevoLugar) { p.lugaresVistos = (p.lugaresVistos || []).concat(codigo); guardarP(); setTimeout(function () { encenderLugar(g); }, 500); }
      }, { once: true });
      g.setAttribute("href", g.dataset.src); // la capa de color se baja solo para los lugares encendidos
    });
    var pt = sitio.pines && sitio.pines[m.id], pin = $("pin");
    if (pt && pin) { pin.style.left = pt[0] + "%"; pin.style.top = pt[1] + "%"; pin.hidden = false; }
    var t = $("lugar-actual");
    t.style.setProperty("--mundo", m.color);
    $("lugar-num").textContent = m.id; $("lugar-nombre").textContent = m.lugar; $("lugar-frase").textContent = m.frase;
    $("lugar-cuenta").textContent = hechos + " de " + (m.hasta - m.desde + 1) + " niveles";
    requestAnimationFrame(function () { requestAnimationFrame(function () { $("lugar-barra").style.setProperty("--p", hechos / (m.hasta - m.desde + 1) * 100); }); });
    if (p.hechos.length) {
      var r = rachaVigente(); $("racha").hidden = false;
      $("racha-n").textContent = r; $("racha-t").textContent = r === 1 ? "día seguido" : "días seguidos";
      $("racha-p").textContent = p.protector; $("racha-e").textContent = totalEstrellas();
    }
    cartero();
    var postales = sitio.mundos.reduce(function (s, mu) { return s + (p.hechos.indexOf(mu.desde + 14) >= 0) + (p.hechos.indexOf(mu.hasta) >= 0); }, 0);
    var vecinos = sitio.vecinos.filter(function (v) { return p.hechos.indexOf(v.nivel) >= 0; }).length;
    if (postales || vecinos) { $("enlace-album").hidden = false; $("album-cuenta").textContent = postales + " postales · " + vecinos + " vecinos"; }
    if (quieto) { var tv = document.querySelector(".tilde-vuela"); if (tv) tv.remove(); }
  }

  function paginaMundos(sitio) {
    var actual = mundoDe(sitio, nivelActual(sitio));
    Array.prototype.forEach.call(document.querySelectorAll(".mundo-item"), function (a) {
      var m = sitio.mundos[+a.dataset.mundo - 1], hechos = hechosEn(m), cuenta = a.querySelector(".cuenta");
      var disponible = m.desde <= sitio.total, abierto = disponible && (m.id <= actual.id), est = 0;
      for (var n = m.desde; n <= m.hasta; n++) est += p.estrellas[n] || 0;
      a.querySelector(".barra i").style.setProperty("--p", hechos / (m.hasta - m.desde + 1) * 100);
      if (abierto) { a.classList.remove("cerrado"); a.href = "/nivel/" + Math.min(sitio.total, Math.max(m.desde, m.id === actual.id ? nivelActual(sitio) : m.desde)) + "/";
        cuenta.textContent = hechos + " de " + (m.hasta - m.desde + 1) + " · ★ " + est + " de " + (m.hasta - m.desde + 1) * 3; }
    });
  }

  // ---------- vecinos y postales ----------
  function tarjetaVecino(v, nuevo) {
    return '<div class="vecino-tarjeta' + (nuevo ? " nuevo" : "") + '"><svg class="cara" viewBox="0 0 96 96" aria-hidden="true"><use href="#v-' + v.id + '"/></svg><div>' +
      (nuevo ? '<small class="etiqueta-nuevo">¡Llegó un vecino!</small>' : "") + "<b>" + v.nombre + ", " + v.animal + "</b><small>" + v.oficio.charAt(0).toUpperCase() + v.oficio.slice(1) + "</small>" +
      '<p>«' + v.frase + '»</p><p class="favorita">Su palabra favorita: <strong>' + v.palabra + "</strong>. " + v.definicion + "</p></div></div>";
  }
  // cada copia de una escena necesita sus propios id de degradado (si no, todas usan los de la primera)
  var copias = 0;
  function idsPropios(svg) { var u = "-c" + (++copias); return svg.replace(/id="e-(\w+)"/g, 'id="e-$1' + u + '"').replace(/url\(#e-(\w+)\)/g, "url(#e-$1" + u + ")"); }
  function postalHtml(m, tipo, svg) {
    return '<figure class="postal' + (tipo === "noche" ? " noche" : "") + '">' + idsPropios(svg).replace(/class="d d(\d)"/g, 'class="d d$1 si"') +
      '<span class="sello" aria-hidden="true"><svg viewBox="0 0 64 40"><use href="#tilde"/></svg></span>' +
      "<figcaption>Saludos desde <b>" + m.lugar.charAt(0).toLowerCase() + m.lugar.slice(1) + "</b>" + (tipo === "noche" ? " · de noche" : "") + "</figcaption></figure>";
  }
  function album(sitio) {
    var postales = [], tot = 0;
    sitio.mundos.forEach(function (m) {
      [["dia", m.desde + 14], ["noche", m.hasta]].forEach(function (par) {
        tot++; var tiene = p.hechos.indexOf(par[1]) >= 0, t = document.getElementById("postal-" + m.id);
        postales.push(tiene && t ? '<button class="postal-mini" data-postal="' + m.id + "-" + par[0] + '">' + postalHtml(m, par[0], t.innerHTML) + "</button>" :
          '<div class="postal-mini bloqueada"><svg class="i"><use href="#i-candado"/></svg><b>' + m.lugar + '</b><small>' + (par[0] === "dia" ? "De día" : "De noche") + " · nivel " + par[1] + "</small></div>");
      });
    });
    $("postales").innerHTML = postales.join("");
    var tienePost = document.querySelectorAll(".postal-mini:not(.bloqueada)").length;
    $("postales-n").textContent = tienePost + " de " + tot;
    var vec = sitio.vecinos.map(function (v) {
      var tiene = p.hechos.indexOf(v.nivel) >= 0; // los datos de los vecinos son del sitio, no del jugador
      return '<button class="vecino-mini' + (tiene ? "" : " bloqueado") + '" data-vecino="' + v.id + '"' + (tiene ? "" : " disabled") + '><svg viewBox="0 0 96 96" aria-hidden="true"><use href="#v-' + v.id + '"/></svg>' +
        "<b>" + (tiene ? v.nombre : "?") + "</b><small>" + (tiene ? v.oficio : "Nivel " + v.nivel) + "</small></button>";
    });
    $("vecinos").innerHTML = vec.join("");
    $("vecinos-n").textContent = sitio.vecinos.filter(function (v) { return p.hechos.indexOf(v.nivel) >= 0; }).length + " de " + sitio.vecinos.length;
    document.addEventListener("click", function (e) {
      var b = e.target.closest("[data-vecino]"), q = e.target.closest("[data-postal]");
      if (b) { var v = sitio.vecinos.filter(function (x) { return x.id === b.dataset.vecino; })[0]; abrir(tarjetaVecino(v, false) + '<div class="botones"><button class="boton sec" data-accion="cerrar">Cerrar</button></div>'); }
      if (q) { var partes = q.dataset.postal.split("-"), m = sitio.mundos[+partes[0] - 1];
        abrir('<div class="postal-grande">' + postalHtml(m, partes[1], document.getElementById("postal-" + partes[0]).innerHTML) + '</div><p class="sub">' + m.frase + '</p><div class="botones"><button class="boton sec" data-accion="cerrar">Cerrar</button></div>'); }
    });
  }

  // ---------- logros ----------
  function logros(sitio) {
    album(sitio);
    var lugares = sitio.mundos.filter(function (m) { return hechosEn(m) >= m.hasta - m.desde + 1; }).length;
    var diarios = Object.keys(p.diario).length, est = totalEstrellas();
    var cifras = [["Niveles", p.hechos.length], ["Estrellas", est], ["Racha actual", rachaVigente()], ["Mejor racha", p.racha.mejor],
      ["Palabras extra", p.extras], ["Días jugados", p.dias.length], ["Diarios", diarios], ["Monedas", p.monedas]];
    $("cifras").innerHTML = cifras.map(function (c) { return "<div><b>" + esc(c[1]) + "</b><small>" + esc(c[0]) + "</small></div>"; }).join("");
    var L = [
      ["Primera palabra", "Completa tu primer nivel", p.hechos.length, 1],
      ["La panadería encendida", "Termina el primer lugar", lugares, 1],
      ["Medio pueblo", "Enciende 5 lugares", lugares, 5],
      ["El pueblo entero", "Enciende los 10 lugares", lugares, 10],
      ["Vecino constante", "Completa 50 niveles", p.hechos.length, 50],
      ["Cien palabras de vuelta", "Completa 100 niveles", p.hechos.length, 100],
      ["Brillo de estrellas", "Junta 100 estrellas", est, 100],
      ["Tres días seguidos", "Juega 3 días seguidos", p.racha.mejor, 3],
      ["Una semana entera", "Juega 7 días seguidos", p.racha.mejor, 7],
      ["Un mes en el pueblo", "Juega 30 días seguidos", p.racha.mejor, 30],
      ["Lector del Diario", "Completa 7 Diarios del Pueblo", diarios, 7],
      ["Ojo fino", "Encuentra 50 palabras extra", p.extras, 50],
      ["Diccionario andante", "Encuentra 300 palabras extra", p.extras, 300],
      ["Buscador de oro", "Encuentra 10 palabras doradas", p.doradas, 10],
      ["Cazador de cofres", "Abre 10 cofres", p.cofres, 10],
      ["Primer vecino", "Conoce a tu primer vecino", sitio.vecinos.filter(function (v) { return p.hechos.indexOf(v.nivel) >= 0; }).length, 1],
      ["Todo el vecindario", "Conoce a los 12 vecinos", sitio.vecinos.filter(function (v) { return p.hechos.indexOf(v.nivel) >= 0; }).length, 12],
      ["Coleccionista de postales", "Junta las 20 postales", sitio.mundos.reduce(function (s, m) { return s + (p.hechos.indexOf(m.desde + 14) >= 0) + (p.hechos.indexOf(m.hasta) >= 0); }, 0), 20],
      ["Sin ayuda", "Gana 30 niveles con 3 estrellas", Object.keys(p.estrellas).filter(function (k) { return p.estrellas[k] === 3; }).length, 30]
    ];
    $("logros").innerHTML = L.map(function (l) {
      var ok = l[2] >= l[3], pr = Math.min(1, l[2] / l[3]);
      return '<li class="' + (ok ? "si" : "") + '"><svg class="i"><use href="#i-trofeo"/></svg><div><b>' + l[0] + "</b><small>" + l[1] + "</small>" +
        (ok ? "" : '<div class="barra"><i style="--p:' + (pr * 100).toFixed(0) + '"></i></div>') + "</div>" + (ok ? '<span class="hecho">✓</span>' : "<span>" + Math.min(l[2], l[3]) + "/" + l[3] + "</span>") + "</li>";
    }).join("");
  }

  // ---------- ajustes ----------
  function ajustes() {
    var s = $("a-sonido"), v = $("a-vibracion");
    s.checked = sonido; v.checked = vibra;
    s.addEventListener("change", function () { sonido = s.checked; guardar("sonido", sonido); suena.toque(); });
    v.addEventListener("change", function () { vibra = v.checked; guardar("vibracion", vibra); vibrar(20); });
    function segmentos(id, clave, def, aplicar) {
      var g = $(id), actual = String(leer(clave, def));
      var pintar = function () { Array.prototype.forEach.call(g.children, function (b) { b.setAttribute("aria-checked", b.dataset.v === actual ? "true" : "false"); }); };
      pintar();
      g.addEventListener("click", function (e) { var b = e.target.closest("button"); if (!b) return; actual = b.dataset.v; guardar(clave, actual); aplicar(actual); pintar(); suena.toque(); });
    }
    segmentos("a-tema", "tema", "auto", function (v) { if (v === "auto") delete document.documentElement.dataset.tema; else document.documentElement.dataset.tema = v; });
    segmentos("a-letra", "letra", "1", function (v) { document.documentElement.style.setProperty("--escala", v); });
    $("a-borrar").addEventListener("click", function () {
      abrir('<h2>¿Borrar todo tu progreso?</h2><p class="sub">Se borran los niveles, las estrellas, las monedas, la racha y los ajustes de este navegador. No se puede deshacer.</p>' +
        '<div class="botones"><button class="boton peligro" data-accion="borrar-todo">Sí, borrar todo</button><button class="boton sec" data-accion="cerrar">No, mantener</button></div>');
    });
    document.addEventListener("click", function (e) {
      var b = e.target.closest('[data-accion="borrar-todo"]'); if (!b) return;
      try { Object.keys(localStorage).forEach(function (k) { if (k.indexOf(PREFIJO) === 0) localStorage.removeItem(k); }); } catch (x) {}
      location.href = "/";
    });
  }

  // ---------- partida: la misma para los niveles y el Diario del Pueblo ----------
  function juego(D, modo) {
    var diario = modo === "diario", clave = diario ? "diario_" + D.fecha : "partida_" + D.n;
    var st = leer(clave, null) || {}; // e: encontradas, r: celdas reveladas, x: extra, a: ayudas, d: dorada, t: ayuda de Tilde
    ["e", "r", "x"].forEach(function (k) { st[k] = st[k] || []; }); st.a = st.a || 0;
    var celdas = {}, seleccion = -1, orden = D.letras.split(""), fichas = [], centros = [], elegidas = [], arrastrando = false;
    var DORADA = diario ? -1 : (D.n * 7 + 3) % D.palabras.length; // una palabra dorada por nivel
    document.documentElement.style.setProperty("--mundo", D.mundo.color);
    function persistir() { guardar(clave, st); }

    D.palabras.forEach(function (w, i) {
      for (var j = 0; j < w.p.length; j++) {
        var f = w.f + (w.d === "v" ? j : 0), c = w.c + (w.d === "h" ? j : 0), k = f + "," + c;
        celdas[k] = celdas[k] || { l: w.p[j], palabras: [] }; celdas[k].palabras.push(i);
      }
    });
    function encontrada(i) { return st.e.indexOf(D.palabras[i].p) >= 0; }
    function siguientePendiente(desde) {
      for (var n = 1; n <= D.palabras.length; n++) { var i = (desde + n + D.palabras.length) % D.palabras.length; if (!encontrada(i)) return i; }
      return -1;
    }
    function celdasDe(i) {
      var w = D.palabras[i], r = [];
      for (var j = 0; j < w.p.length; j++) r.push((w.f + (w.d === "v" ? j : 0)) + "," + (w.c + (w.d === "h" ? j : 0)));
      return r;
    }
    function celdaVisible(k) { return st.r.indexOf(k) >= 0 || celdas[k].palabras.some(encontrada); }
    function progresoDiario() { var b = $("diario-barra"); if (b) b.style.setProperty("--p", st.e.length / D.palabras.length * 100); }

    // ---- crucigrama ----
    var tam = 40;
    function medir() {
      var z = $("zona-grilla"), hueco = D.columnas > 6 || D.filas > 6 ? 4 : 5;
      $("grilla").innerHTML = ""; // se mide el espacio libre, sin el crucigrama anterior adentro
      tam = Math.max(18, Math.min(54, Math.floor((Math.min(z.clientWidth, 520) - hueco * (D.columnas - 1)) / D.columnas), Math.floor((z.clientHeight - 16 - hueco * (D.filas - 1)) / D.filas)));
      $("grilla").style.setProperty("--hueco", hueco + "px");
    }
    function dibujarGrilla(op) {
      op = op || {};
      var g = $("grilla"), marcadas = seleccion >= 0 ? celdasDe(seleccion) : [], doradas = DORADA >= 0 && !st.d ? celdasDe(DORADA) : [], idx = 0;
      g.style.gridTemplateColumns = "repeat(" + D.columnas + "," + tam + "px)";
      g.style.gridTemplateRows = "repeat(" + D.filas + "," + tam + "px)";
      var html = "";
      for (var f = 0; f < D.filas; f++) for (var c = 0; c < D.columnas; c++) {
        var k = f + "," + c;
        if (!celdas[k]) { html += "<div></div>"; continue; }
        var porPalabra = celdas[k].palabras.some(encontrada), cl = "celda on";
        if (porPalabra) cl += " llena"; else if (st.r.indexOf(k) >= 0) cl += " revelada";
        if (marcadas.indexOf(k) >= 0 && !porPalabra) cl += " marcada";
        if (doradas.indexOf(k) >= 0 && !porPalabra) cl += " dorada";
        if (op.esperando && op.esperando.indexOf(k) >= 0) cl += " esperando";
        if (op.sinEntrada) cl += " quieta";
        html += '<div class="' + cl + '" data-k="' + k + '" style="--i:' + (idx++) + ";font-size:" + Math.round(tam * 0.56) + 'px"><span class="cara">' + celdas[k].l + "</span></div>";
      }
      g.innerHTML = html;
      if (op.sinEntrada) Array.prototype.forEach.call(g.querySelectorAll(".celda"), function (e) { e.style.animation = "none"; });
    }
    function celdaEl(k) { return document.querySelector('.celda[data-k="' + k + '"]'); }

    // ---- pista ----
    function dibujarPista(animar) {
      var t = $("pista-texto");
      if (seleccion < 0) { t.innerHTML = "<small>¡Listo!</small><span>Completaste el crucigrama</span>"; return; }
      var w = D.palabras[seleccion];
      t.innerHTML = "<small>" + w.p.length + " letras · " + (w.d === "h" ? "horizontal" : "vertical") + (seleccion === DORADA && !st.d ? " · dorada" : "") + "</small><span>" + D.pistas[w.p] + "</span>";
      if (animar) { t.classList.remove("cambia"); void t.offsetWidth; t.classList.add("cambia"); }
    }
    function dibujarCupo(salto) { var c = $("cupo"); c.hidden = !p.gratis; c.textContent = p.gratis; if (salto) { c.classList.remove("salta"); void c.offsetWidth; c.classList.add("salta"); } }
    // Tilde ofrece una letra de regalo si pasa un buen rato sin aciertos (una vez por partida).
    var tTilde, tildeVisible = false;
    function esperarTilde() {
      clearTimeout(tTilde); if (st.t || seleccion < 0) return;
      tTilde = setTimeout(function () { tildeVisible = true; dibujarGuia(); }, D.n === 1 && !diario ? 45000 : 75000);
    }
    function dibujarGuia() {
      var g = $("guia");
      if (tildeVisible && !st.t && seleccion >= 0) { g.innerHTML = '<button class="tilde-ayuda" data-accion="tilde"><svg viewBox="0 0 64 40" aria-hidden="true"><use href="#tilde"/></svg>Tilde te regala una letra</button>'; return; }
      if (!diario && D.n === 1 && !st.e.length) g.textContent = "Desliza el dedo por las letras";
      else if (!diario && D.n <= 2 && st.e.length && seleccion >= 0) g.textContent = "Toca una casilla para ver la pista de esa palabra";
      else { var f = p.extras % 5; g.textContent = st.x.length || f ? "Frasco de palabras extra: " + f + " de 5" : ""; }
    }

    // ---- rueda ----
    var rueda = $("rueda"), trazo = $("trazo"), ancho = 240;
    function dibujarRueda(entrada) {
      var n = orden.length, alto = window.innerHeight;
      ancho = Math.round(Math.max(176, Math.min(256, window.innerWidth - 150, alto * 0.33)));
      var ficha = Math.round((n <= 4 ? 64 : n <= 5 ? 60 : n <= 6 ? 56 : n <= 7 ? 52 : 48) * Math.min(1, ancho / 240)), r = ancho / 2 - ficha / 2 - 12;
      rueda.style.width = rueda.style.height = ancho + "px"; rueda.style.setProperty("--tam-ficha", ficha + "px");
      trazo.setAttribute("viewBox", "0 0 " + ancho + " " + ancho);
      fichas.forEach(function (f) { f.remove(); }); fichas = [];
      centros = orden.map(function (l, i) {
        var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = ancho / 2 + r * Math.cos(a), y = ancho / 2 + r * Math.sin(a);
        var e = document.createElement("div"); e.className = "letra"; e.textContent = l; e.style.left = x + "px"; e.style.top = y + "px"; e.style.setProperty("--i", i);
        rueda.appendChild(e); fichas.push(e); return { x: x, y: y, e: e };
      });
      rueda.classList.toggle("entra", !!entrada);
      pintarTrazo();
    }
    function pintarTrazo(px, py, demo) {
      var lista = demo || elegidas, pts = lista.map(function (i) { return centros[i].x.toFixed(1) + "," + centros[i].y.toFixed(1); });
      if (px != null && pts.length) pts.push(px.toFixed(1) + "," + py.toFixed(1));
      trazo.innerHTML = pts.length > 1 ?
        '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#E2B65A" stroke-opacity=".35" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>' +
        '<polyline points="' + pts.join(" ") + '" fill="none" stroke="' + D.mundo.color + '" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>' : "";
      centros.forEach(function (c, i) { c.e.classList.toggle(demo ? "demo" : "sel", lista.indexOf(i) >= 0); if (!demo) c.e.classList.remove("demo"); });
      if (!demo) burbuja(elegidas.map(function (i) { return orden[i]; }).join(""));
    }
    function burbuja(txt, clase) {
      var a = $("actual"); a.className = "actual" + (clase ? " " + clase : "");
      a.innerHTML = txt ? '<span class="burbuja">' + txt.split("").map(function (l) { return "<i>" + l + "</i>"; }).join("") + "</span>" : "";
    }
    var tBurbuja;
    function soltarBurbuja(clase, ms) {
      clearTimeout(tBurbuja);
      tBurbuja = setTimeout(function () { if (arrastrando) return; var a = $("actual"); a.classList.add("va"); setTimeout(function () { if (!arrastrando) burbuja(""); }, 480); }, ms || 700);
    }
    function letraEn(x, y) {
      var radio = parseFloat(rueda.style.getPropertyValue("--tam-ficha")) * 0.62;
      for (var i = 0; i < centros.length; i++) { var dx = centros[i].x - x, dy = centros[i].y - y; if (dx * dx + dy * dy < radio * radio) return i; }
      return -1;
    }
    function punto(e) { var b = rueda.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
    rueda.addEventListener("pointerdown", function (e) {
      if ($("velo").classList.contains("ver")) return;
      var q = punto(e), i = letraEn(q.x, q.y); if (i < 0) return;
      e.preventDefault(); pararDemo(); clearTimeout(tBurbuja);
      arrastrando = true; elegidas = [i]; rueda.setPointerCapture(e.pointerId); suena.letra(0); vibrar(8); pintarTrazo(q.x, q.y);
    });
    rueda.addEventListener("pointermove", function (e) {
      if (!arrastrando) return;
      var q = punto(e), i = letraEn(q.x, q.y);
      if (i >= 0) {
        if (elegidas.length > 1 && elegidas[elegidas.length - 2] === i) { elegidas.pop(); vibrar(4); } // volver atrás
        else if (elegidas.indexOf(i) < 0) { elegidas.push(i); suena.letra(elegidas.length - 1); vibrar(8); }
      }
      pintarTrazo(q.x, q.y);
    });
    function soltar() {
      if (!arrastrando) return; arrastrando = false;
      var palabra = elegidas.map(function (i) { return orden[i]; }).join(""); elegidas = [];
      trazo.innerHTML = ""; centros.forEach(function (c) { c.e.classList.remove("sel"); });
      if (palabra.length >= 2) probar(palabra); else burbuja("");
    }
    rueda.addEventListener("pointerup", soltar);
    rueda.addEventListener("pointercancel", soltar);

    // ---- demostración del gesto (nivel 1): una mano recorre las letras ----
    var demoActiva = false, demoRaf = 0, mano = $("mano");
    function iniciarDemo() {
      pararDemo(); if (diario || D.n !== 1 || st.e.length || quieto) return;
      var objetivo = D.palabras[0].p.split(""), usados = [];
      var ruta = objetivo.map(function (l) { for (var i = 0; i < orden.length; i++) if (orden[i] === l && usados.indexOf(i) < 0) { usados.push(i); return i; } });
      demoActiva = true; var t0 = performance.now(), PASO = 520, total = 600 + PASO * (ruta.length - 1) + 1300;
      (function cuadro(t) {
        if (!demoActiva) return;
        var tt = (t - t0) % total, lista = [], x, y;
        if (tt < 600) { lista = [ruta[0]]; x = centros[ruta[0]].x; y = centros[ruta[0]].y; mano.classList.toggle("ver", tt > 150); }
        else if (tt < 600 + PASO * (ruta.length - 1)) {
          var s = (tt - 600) / PASO, k = Math.floor(s), f = s - k, ease = f < 0.5 ? 2 * f * f : 1 - Math.pow(-2 * f + 2, 2) / 2;
          var a = centros[ruta[k]], b = centros[ruta[k + 1]]; x = a.x + (b.x - a.x) * ease; y = a.y + (b.y - a.y) * ease;
          lista = ruta.slice(0, k + 1 + (f > 0.8 ? 1 : 0)); mano.classList.add("ver");
        } else { lista = ruta.slice(); var u = centros[ruta[ruta.length - 1]]; x = u.x; y = u.y; mano.classList.toggle("ver", tt < total - 700); if (tt > total - 700) lista = []; }
        mano.style.transform = "translate(" + x + "px," + y + "px)";
        pintarTrazo(lista.length && tt < total - 700 ? x : null, y, lista);
        demoRaf = requestAnimationFrame(cuadro);
      })(t0);
    }
    function pararDemo() {
      if (!demoActiva) return;
      demoActiva = false; cancelAnimationFrame(demoRaf); mano.classList.remove("ver");
      trazo.innerHTML = ""; centros.forEach(function (c) { c.e.classList.remove("demo"); });
    }

    // ---- letras que vuelan desde la burbuja ----
    function volar(origenes, destinos, dorada, alLlegar, fin) {
      if (quieto || !origenes.length) { destinos.forEach(function (d, i) { alLlegar && alLlegar(i); }); fin && fin(); return; }
      var quedan = destinos.length;
      destinos.forEach(function (dest, i) {
        var o = origenes[i] && origenes[i].getBoundingClientRect(), r = dest.getBoundingClientRect(); if (!o) { if (!--quedan && fin) fin(); return; }
        var lado = dorada ? 38 : r.width, el = document.createElement("div");
        el.className = "vuela" + (dorada ? " dorada" : ""); el.textContent = origenes[i].textContent;
        el.style.cssText = "left:" + (r.left + r.width / 2 - lado / 2) + "px;top:" + (r.top + r.height / 2 - lado / 2) + "px;width:" + lado + "px;height:" + lado + "px;font-size:" + Math.round(lado * 0.56) + "px";
        document.body.appendChild(el);
        var dx = (o.left + o.width / 2) - (r.left + r.width / 2), dy = (o.top + o.height / 2) - (r.top + r.height / 2), s0 = Math.max(o.width, o.height) / lado;
        var fin1 = dorada ? 0.25 : 1, alto = dorada ? 46 : 60;
        var an = el.animate([
          { transform: "translate(" + dx + "px," + dy + "px) scale(" + s0 + ")", opacity: 1 },
          { transform: "translate(" + dx * 0.4 + "px," + (dy * 0.4 - alto) + "px) scale(" + (s0 + fin1) / 2 * 1.15 + ") rotate(-8deg)", opacity: 1, offset: 0.5 },
          { transform: "translate(0,0) scale(" + fin1 + ")", opacity: dorada ? 0 : 1 }
        ], { duration: 600, delay: i * 70, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" });
        // estela de chispas detrás de cada letra
        var cx = r.left + r.width / 2, cy = r.top + r.height / 2;
        for (var k = 0; k < 5; k++) (function (k) {
          var f = k / 5, px = cx + dx * (1 - f) * 0.62, py = cy + dy * (1 - f) * 0.62 - alto * 0.9 * Math.sin(f * 3.14);
          chispas(px, py, { n: 1, radio: 10, ms: 520, delay: i * 70 + 110 + k * 50, giro: k });
        })(k);
        an.onfinish = function () { el.remove(); alLlegar && alLlegar(i); if (!--quedan && fin) fin(); };
      });
    }
    function copiarFichas() {
      return Array.prototype.slice.call(document.querySelectorAll("#actual .burbuja i")).map(function (l) {
        var r = l.getBoundingClientRect(), c = document.createElement("i"); c.textContent = l.textContent; c.getBoundingClientRect = function () { return r; }; return c;
      });
    }

    // ---- probar una palabra ----
    function probar(w) {
      burbuja(w);
      var i = -1; D.palabras.forEach(function (x, j) { if (x.p === w) i = j; });
      if (i >= 0) {
        if (encontrada(i)) { burbuja(w, "repetida"); aviso("Ya la encontraste"); suena.toque(); return soltarBurbuja("", 600); }
        var antes = celdasDe(i).filter(celdaVisible);
        st.e.push(w); persistir(); evento("enl_palabra", { nivel: D.n, modo: modo });
        if (seleccion === i || seleccion < 0 || encontrada(seleccion)) seleccion = siguientePendiente(i);
        var destinos = celdasDe(i), nuevas = destinos.filter(function (k) { return antes.indexOf(k) < 0; });
        var esDorada = i === DORADA && !st.d && !destinos.some(function (k) { return st.r.indexOf(k) >= 0; });
        if (i === DORADA) { st.d = 1; if (esDorada) p.doradas++; persistir(); }
        tildeVisible = false; esperarTilde();
        dibujarGrilla({ esperando: nuevas, sinEntrada: true }); dibujarPista(true); dibujarGuia(); progresoDiario();
        suena.acierto(); vibrar([10, 40, 14]);
        var clones = copiarFichas(); $("actual").innerHTML = ""; // se mide antes de vaciar la burbuja
        volar(clones, destinos.map(celdaEl), false, function (j) {
          var el = celdaEl(destinos[j]); if (!el) return;
          el.classList.remove("esperando"); el.classList.add("luz");
          var rc = el.getBoundingClientRect(); chispas(rc.left + rc.width / 2, rc.top + rc.height / 2, { n: 5, radio: rc.width * 0.75, ms: 600, giro: j });
        }, function () {
          if (esDorada) { suena.dorada(); aviso("¡Palabra dorada! +10 monedas"); ganarMonedas(10, celdaEl(destinos[0])); }
          if (seleccion < 0) setTimeout(completado, esDorada ? 900 : 450);
        });
        return;
      }
      if (D.extras.indexOf(w) >= 0) {
        if (st.x.indexOf(w) >= 0) { burbuja(w, "repetida"); aviso("Ya la encontraste"); return soltarBurbuja("", 600); }
        st.x.push(w); p.extras++; p.monedas += 2; var regalo = p.extras % 5 === 0; if (regalo) p.gratis++;
        guardarP(); persistir(); suena.extra(); vibrar(12);
        burbuja(w, "extra");
        aviso(regalo ? "¡Frasco lleno! Ganaste una letra gratis" : "Palabra extra · +2 monedas");
        var destino = $("b-letra");
        setTimeout(function () {
          var clones = copiarFichas(); $("actual").innerHTML = "";
          volar(clones, clones.map(function () { return destino; }), true, null, function () { dibujarCupo(regalo); dibujarGuia(); pintarMonedas(true); });
        }, 380);
        return;
      }
      burbuja(w, "mal"); suena.error(); vibrar(30); soltarBurbuja("", 650);
    }

    // ---- ayudas: letra o palabra ----
    function revelar(todas, regalo) {
      if (seleccion < 0) return;
      var libres = celdasDe(seleccion).filter(function (k) { return !celdaVisible(k); });
      if (!libres.length) return;
      var nuevas = todas ? libres : [libres[0]];
      nuevas.forEach(function (k) { st.r.push(k); });
      if (!regalo) { st.a++; p.ayudas++; guardarP(); }
      D.palabras.forEach(function (w, i) { if (!encontrada(i) && celdasDe(i).every(celdaVisible)) { st.e.push(w.p); if (i === DORADA) st.d = 1; } });
      persistir(); evento("enl_ayuda", { tipo: todas ? "palabra" : "letra", nivel: D.n, modo: modo });
      if (encontrada(seleccion)) seleccion = siguientePendiente(seleccion);
      dibujarGrilla({ sinEntrada: true }); dibujarPista(true); dibujarGuia(); progresoDiario(); suena.extra();
      nuevas.forEach(function (k, j) { var el = celdaEl(k); if (el) { el.classList.add("luz"); var rc = el.getBoundingClientRect(); chispas(rc.left + rc.width / 2, rc.top + rc.height / 2, { n: 5, radio: rc.width * 0.75, delay: j * 70 }); } });
      if (seleccion < 0) setTimeout(completado, 800); else esperarTilde();
    }
    function pedirLetra() {
      if (seleccion < 0) return;
      if (p.gratis > 0) { p.gratis--; guardarP(); dibujarCupo(); return revelar(false); }
      var h = '<h2>¿Necesitas una ayuda?</h2><p class="sub">Tienes <b>' + esc(p.monedas) + '</b> monedas. Las ganas jugando: nunca se compran.</p><div class="botones">' +
        '<button class="boton prin" data-accion="letra"' + (p.monedas < PRECIO_LETRA ? " disabled" : "") + '>Revelar una letra <small>' + PRECIO_LETRA + ' monedas</small></button>' +
        '<button class="boton sec" data-accion="palabra"' + (p.monedas < PRECIO_PALABRA ? " disabled" : "") + '>Revelar la palabra <small>' + PRECIO_PALABRA + ' monedas</small></button>';
      if (p.monedas < PRECIO_LETRA && quedanRecompensas()) h += ofertaAnuncio("ver-letra", "Mira un anuncio corto", "y te revelamos 2 letras");
      h += '<button class="boton sec" data-accion="cerrar">No, gracias</button></div><p class="nota-chica">Cada 5 palabras extra llenas el frasco y ganas una letra gratis.</p>';
      abrir(h);
    }

    // ---- mezclar: las fichas se cambian de lugar con movimiento ----
    function mezclar() {
      var antes = centros.map(function (c) { return { x: c.x, y: c.y }; });
      var idx = orden.map(function (l, i) { return i; });
      do { for (var j = idx.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), t = idx[j]; idx[j] = idx[r]; idx[r] = t; } }
      while (idx.length > 2 && idx.every(function (v, i) { return v === i; }));
      orden = idx.map(function (i) { return orden[i]; }); dibujarRueda(false);
      if (!quieto) centros.forEach(function (c, i) {
        var de = antes[idx[i]]; c.e.animate([{ transform: "translate(" + (de.x - c.x) + "px," + (de.y - c.y) + "px) rotate(-90deg)" }, { transform: "none" }],
          { duration: 480, easing: "cubic-bezier(.34,1.4,.64,1)" });
      });
      var b = $("b-mezclar").querySelector("svg"); b.classList.remove("girando"); void b.getBoundingClientRect(); b.classList.add("girando");
      suena.toque(); vibrar(6);
    }

    // ---- final de la partida ----
    // Estrellas: 3 sin ayudas, 2 con una o dos ayudas, 1 con más. La letra que regala Tilde no cuenta.
    function estrellasDe(a) { return a === 0 ? 3 : a <= 2 ? 2 : 1; }
    function repaso() { return '<ul class="repaso">' + D.palabras.map(function (w, i) { return '<li style="--i:' + i + '"><b>' + w.p + "</b><span>" + D.pistas[w.p] + "</span></li>"; }).join("") + "</ul>"; }
    var UMBRALES = [1, 4, 8, 13, 20, 30];
    function completado() {
      clearTimeout(tTilde);
      if (diario) return diarioCompletado();
      var mismo = p.hechos.indexOf(D.n) >= 0, totalMundo = D.mundo.hasta - D.mundo.desde + 1;
      var antes = p.hechos.filter(function (n) { return n >= D.mundo.desde && n <= D.mundo.hasta; }).length;
      var est = estrellasDe(st.a), cofre = !mismo && D.n % 5 === 0, msgRacha = marcarDia();
      p.estrellas[D.n] = Math.max(est, p.estrellas[D.n] || 0);
      if (!mismo) { p.hechos.push(D.n); p.hechos.sort(function (a, b) { return a - b; }); p.monedas += 10; }
      if (cofre) { p.monedas += 50; p.gratis++; p.cofres++; }
      guardarP(); borrar(clave);
      var ahora = antes + (mismo ? 0 : 1);
      evento("enl_nivel_completo", { nivel: D.n, extras: st.x.length, estrellas: est, ayudas: st.a });
      if ([1, 3, 5, 10].indexOf(D.n) >= 0 && !mismo) evento("enl_nivel_" + D.n);
      suena.completo(); vibrar([20, 60, 20, 60, 40]); confeti();

      var elogios = ["¡Muy bien!", "¡Excelente!", "¡Impecable!", "¡Así se hace!", "¡Bravo!", "¡Qué buena mente!"];
      var h = '<h2 class="brillo">' + (est === 3 ? "¡Perfecto!" : elogios[(D.n * 7) % elogios.length]) + '</h2><p class="sub">Nivel ' + D.n + " completado</p>" + estrellasHtml(est, true);
      var premios = [];
      if (!mismo) premios.push("+10 monedas");
      if (st.x.length) premios.push("+" + st.x.length * 2 + " por palabras extra");
      if (premios.length) h += '<p class="premios">' + premios.join(" · ") + "</p>";
      if (est < 3 && !mismo) h += '<p class="nota-chica">Sin ayudas ganas las 3 estrellas.</p>';
      if (cofre) h += '<div class="cofre-tarjeta">' + COFRE + "<div><b>¡Un cofre!</b><small>Cada 5 niveles: +50 monedas y una letra gratis</small></div></div>";
      if (cofre && quedanRecompensas()) h += ofertaAnuncio("doble-cofre", "Duplica tu cofre", "Mira un anuncio: +50 monedas y otra letra gratis");
      else if (!mismo && D.n % 3 === 0 && D.n > 3 && quedanRecompensas()) h += ofertaAnuncio("triple-monedas", "Triplica tus monedas", "Mira un anuncio: +20 monedas más");
      if (D.vecino && !mismo) h += tarjetaVecino(D.vecino, true);
      var tPostal = $("t-escena");
      if (D.postal && !mismo && tPostal && tPostal.innerHTML.trim()) h += '<div class="premio-postal"><b>¡Te llegó una postal!</b>' + postalHtml(D.mundo, D.postal, tPostal.innerHTML) + '<a href="/logros/#album" data-google-interstitial="false">Ver el álbum</a></div>';
      if (msgRacha) h += '<p class="premios">' + msgRacha + "</p>";
      var t = $("t-escena");
      if (t && t.innerHTML.trim()) {
        var det = UMBRALES.filter(function (u) { return ahora >= u; }).length, detAntes = UMBRALES.filter(function (u) { return antes >= u; }).length;
        var nombres = D.mundo.detalles || [];
        var prox = UMBRALES[det], nota = det > detAntes ? "Nuevo detalle en " + D.mundo.lugar.toLowerCase() + ": <strong>" + (nombres[det - 1] || "un rincón nuevo") + "</strong>" :
          prox ? "Próximo detalle en <strong>" + (prox - ahora) + " nivel" + (prox - ahora > 1 ? "es" : "") + "</strong>" : "¡" + D.mundo.lugar + " brilla de nuevo!";
        h += '<div class="escena-tarjeta">' + t.innerHTML + '<div class="escena-pie"><div class="fila"><b>' + D.mundo.lugar + "</b><small>" + ahora + " de " + totalMundo +
          '</small></div><div class="barra"><i id="barra-escena" style="--p:' + (antes / totalMundo * 100) + '"></i></div><p class="nota-detalle">' + nota + "</p></div></div>";
        h = h.replace('class="escena"', 'class="escena" data-det="' + det + '" data-antes="' + detAntes + '"');
      }
      h += repaso();
      if (st.x.length) h += '<p class="extras-nota">Además encontraste ' + st.x.length + " palabra" + (st.x.length > 1 ? "s" : "") + " extra.</p>";
      var sig = D.siguiente ? '<a class="boton prin' + (D.vinetaSiguiente ? " con-vineta" : "") + '" href="' + D.siguiente + '"' + (D.vinetaSiguiente ? "" : ' data-google-interstitial="false"') +
        ">Siguiente nivel <svg class=\"i\"><use href=\"#i-flecha\"/></svg></a>" : '<a class="boton prin" href="/mundos/" data-google-interstitial="false">Ver los lugares</a>';
      h += '<div class="botones">' + sig + '<a class="boton sec" href="/" data-google-interstitial="false">Volver al pueblo</a></div>';
      h += ofertaNavegador(D.n, D.siguiente || location.pathname);
      h += espacioAnuncio("<br>Solo en esta pantalla, 36 px debajo de los botones");
      abrir(h); chispasEstrellas();
      setTimeout(function () { Array.prototype.forEach.call(document.querySelectorAll(".hoja .vecino-tarjeta.nuevo .cara, .hoja .premio-postal .postal"), function (el) {
        var r = el.getBoundingClientRect(); chispas(r.left + r.width / 2, r.top + r.height / 2, { n: 10, radio: 60, ms: 900 }); }); }, 1100);
      var esc = document.querySelector(".hoja .escena");
      if (esc) Array.prototype.forEach.call(esc.querySelectorAll(".d"), function (g, i) {
        if (i < +esc.dataset.antes) g.classList.add("si");
        else if (i < +esc.dataset.det) {
          g.classList.add("nuevo"); // el detalle nuevo aparece con un destello de chispas
          setTimeout(function () { var r = g.getBoundingClientRect(); if (r.width) chispas(r.left + r.width / 2, r.top + r.height * 0.7, { n: 10, radio: 50, ms: 1100, modo: "sube", ancho: Math.min(r.width, 160), escalonar: 60 }); }, 900);
        }
      });
      setTimeout(function () { var b = $("barra-escena"); if (b) b.style.setProperty("--p", ahora / totalMundo * 100); }, 350);
      setTimeout(function () { pintarMonedas(true); if (cofre) { suena.cofre(); var c = document.querySelector(".hoja .cofre"); if (c) c.classList.add("abre"); } }, 900);
    }

    var compartirTexto = "";
    function diarioCompletado() {
      var nuevo = !p.diario[D.fecha], est = estrellasDe(st.a), msgRacha = null;
      var cuadros = D.palabras.map(function (w, i) { return celdasDe(i).some(function (k) { return st.r.indexOf(k) >= 0; }) ? "🟨" : "🟧"; }).join("");
      if (nuevo) {
        msgRacha = marcarDia(); p.diario[D.fecha] = { e: est, c: cuadros, x: st.x.length }; p.monedas += 25; guardarP();
        evento("enl_diario", { estrellas: est, ayudas: st.a });
        suena.completo(); vibrar([20, 60, 20, 60, 40]); confeti();
      }
      var r = rachaVigente(), fechaLarga = new Date().toLocaleDateString("es", { day: "numeric", month: "long" });
      compartirTexto = "Enletrados · El Diario del Pueblo\n" + fechaLarga + "\n" + cuadros + "\n" + "⭐".repeat(est) + (r > 1 ? " · 🔥 " + r + " días" : "") + "\n" + location.origin + "/diario/";
      var h = '<h2 class="brillo">¡Diario completo!</h2><p class="sub">El tablero del ' + fechaLarga + "</p>" + estrellasHtml(est, nuevo) +
        '<div class="resultado" aria-label="Tu resultado">' + cuadros + "</div>" +
        '<p class="premios">' + (nuevo ? "+25 monedas · " : "") + (r ? "Racha de " + r + (r === 1 ? " día" : " días") : "") + "</p>" +
        (msgRacha ? '<p class="premios">' + msgRacha + "</p>" : "") +
        '<p class="nota-chica">🟧 sin ayuda · 🟨 con ayuda. Al compartir no se ven las palabras.</p>' +
        '<div class="botones"><a class="boton prin" target="_blank" rel="noopener" data-google-interstitial="false" href="https://wa.me/?text=' + encodeURIComponent(compartirTexto) + '"><svg class="i"><use href="#i-whatsapp"/></svg>Compartir por WhatsApp</a>' +
        (navigator.share ? '<button class="boton sec" data-accion="compartir"><svg class="i"><use href="#i-compartir"/></svg>Compartir de otra forma</button>' : '<button class="boton sec" data-accion="copiar">Copiar el resultado</button>') +
        '<a class="boton sec" href="/" data-google-interstitial="false">Volver al pueblo</a></div>' +
        '<p class="nota-chica">Mañana habrá un tablero nuevo en el Diario.</p>' + repaso() +
        espacioAnuncio("", "diario");
      abrir(h); if (nuevo) chispasEstrellas();
      setTimeout(function () { pintarMonedas(true); }, 900);
    }

    function ayuda() {
      abrir('<h2>Cómo jugar</h2><p class="sub">' + (diario ? "Un tablero nuevo cada día, el mismo para todos." : "Devuélvele las palabras al pueblo.") + "</p>" +
        '<div class="paso"><b>1</b><p>Desliza el dedo por las letras del círculo para formar una palabra, y suelta.</p></div>' +
        '<div class="paso"><b>2</b><p>Si la palabra está en el crucigrama, vuela sola a su lugar.</p></div>' +
        '<div class="paso"><b>3</b><p>La pista de la palabra marcada está arriba. Toca otra casilla o usa las flechas para ver otra.</p></div>' +
        '<div class="paso"><b>✦</b><p><strong>Mezclar</strong> cambia el orden de las letras. <strong>Pista</strong> muestra una letra. Las palabras extra dan monedas y llenan el frasco: cada 5, una letra gratis.</p></div>' +
        (diario ? "" : '<div class="paso"><b>★</b><p>Sin ayudas ganas 3 estrellas. Busca la <strong>palabra dorada</strong>, marcada con un punto, y abre un cofre cada 5 niveles.</p></div>') +
        '<div class="botones"><button class="boton prin" data-accion="cerrar">¡A jugar!</button></div>');
    }

    document.addEventListener("click", function (e) {
      var cel = e.target.closest(".celda.on");
      if (cel) {
        var cand = celdas[cel.dataset.k].palabras.filter(function (i) { return !encontrada(i); });
        if (cand.length) { seleccion = cand.indexOf(seleccion) >= 0 && cand.length > 1 ? cand[(cand.indexOf(seleccion) + 1) % cand.length] : cand[0]; dibujarGrilla({ sinEntrada: true }); dibujarPista(true); suena.toque(); }
        return;
      }
      var b = e.target.closest("button"); if (!b) return;
      if (b.id === "b-ayuda") return ayuda();
      if (b.id === "b-sig" || b.id === "b-ant") {
        if (seleccion >= 0) { var paso = b.id === "b-sig" ? 1 : -1, i = seleccion; do { i = (i + paso + D.palabras.length) % D.palabras.length; } while (encontrada(i)); seleccion = i; dibujarGrilla({ sinEntrada: true }); dibujarPista(true); suena.toque(); }
        return;
      }
      if (b.id === "b-mezclar") return mezclar();
      if (b.id === "b-letra") return pedirLetra();
      var a = b.dataset.accion;
      if (a === "letra" && p.monedas >= PRECIO_LETRA) { cerrar(); p.monedas -= PRECIO_LETRA; pintarMonedas(true); revelar(false); }
      else if (a === "palabra" && p.monedas >= PRECIO_PALABRA) { cerrar(); p.monedas -= PRECIO_PALABRA; pintarMonedas(true); revelar(true); }
      else if (a === "ver-letra") { cerrar(); evento("enl_ayuda", { tipo: "anuncio", nivel: D.n, modo: modo });
        verAnuncio("letras", function () { revelar(false); setTimeout(function () { if (seleccion >= 0) revelar(false); }, 500); },
          function () { aviso("Ahora no hay anuncios: Tilde te regala una letra", 2600); revelar(false, true); }); }
      else if (a === "doble-cofre") { verAnuncio("cofre", function () { p.gratis++; guardarP(); ganarMonedas(50, b); b.disabled = true; b.querySelector("b").textContent = "¡Cofre duplicado!"; b.querySelector("small").textContent = "+50 monedas y otra letra gratis"; suena.cofre(); }); }
      else if (a === "triple-monedas") { verAnuncio("monedas", function () { ganarMonedas(20, b); b.disabled = true; b.querySelector("b").textContent = "¡Monedas triplicadas!"; b.querySelector("small").textContent = "+20 monedas más"; }); }
      else if (a === "tilde") { st.t = 1; tildeVisible = false; persistir(); revelar(false, true); aviso("Tilde te regaló una letra"); }
      else if (a === "compartir") { navigator.share({ text: compartirTexto }).catch(function () {}); }
      else if (a === "copiar") { try { navigator.clipboard.writeText(compartirTexto); aviso("Resultado copiado"); } catch (x) {} }
    });
    var tRes; window.addEventListener("resize", function () { clearTimeout(tRes); tRes = setTimeout(function () { medir(); dibujarGrilla({ sinEntrada: true }); pararDemo(); dibujarRueda(false); iniciarDemo(); }, 120); });

    seleccion = siguientePendiente(-1);
    medir(); dibujarGrilla(); dibujarRueda(true); dibujarPista(); dibujarCupo(); dibujarGuia(); progresoDiario();
    // segunda medición después del primer cuadro, por si el diseño todavía no estaba asentado
    requestAnimationFrame(function () { var antes = tam; medir(); dibujarGrilla(tam !== antes ? { sinEntrada: true } : null); });
    setTimeout(iniciarDemo, 900);
    if (seleccion < 0) setTimeout(completado, 500); else esperarTilde();
    evento(diario ? "enl_diario_inicio" : "enl_nivel_inicio", { nivel: D.n });
  }

  // ---------- Diario del Pueblo: el tablero depende de la fecha local; el mismo para todos ese día ----------
  function paginaDiario(cfg) {
    var idx = ((diasEntre(cfg.inicio, HOY) % cfg.dias) + cfg.dias) % cfg.dias + 1;
    var f = $("diario-fecha"); if (f) f.textContent = new Date().toLocaleDateString("es", { weekday: "long", day: "numeric", month: "long" });
    var r = rachaVigente(), rt = $("diario-racha"); if (rt && r) rt.textContent = "Racha: " + r + (r === 1 ? " día" : " días");
    fetch("/diario/dia/" + idx + ".json").then(function (x) { if (!x.ok) throw 0; return x.json(); }).then(function (D) {
      D.fecha = HOY; D.n = idx; D.mundo = { color: cfg.color };
      juego(D, "diario");
    }).catch(function () { aviso("No se pudo cargar el tablero. Revisa tu conexión.", 4000); });
  }

  // ---------- navegador de Facebook o Instagram: ofrecer seguir en el navegador del teléfono ----------
  // Después del nivel 3 y nunca durante la partida. El avance viaja en el enlace (?enl=), sin cuentas ni servidor.
  // Se ofrece una vez y, si dice «Ahora no», una sola vez más al menos 3 días después.
  var EN_META = /FBAN|FBAV|FB_IAB|FBIOS|Instagram|Messenger/i.test(navigator.userAgent), IOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  function enlaceConAvance(ruta) {
    var datos = btoa(unescape(encodeURIComponent(JSON.stringify(p)))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return ruta + "?enl=" + datos;
  }
  function ofertaNavegador(n, ruta) {
    if (!EN_META || n < 3) return "";
    var o = leer("externo", { veces: 0, ultima: null });
    if (o.veces >= 2 || (o.ultima && diasEntre(o.ultima, HOY) < 3)) return "";
    o.veces++; o.ultima = HOY; guardar("externo", o); evento("enl_navegador_externo", { accion: "ofrecido", ios: IOS });
    var url = location.origin + enlaceConAvance(ruta), h = '<div class="externo"><b>Guarda tu avance</b><small>Ábrelo en el navegador de tu teléfono para volver cuando quieras y seguir donde quedaste.</small>';
    if (IOS) {
      try { history.replaceState(null, "", enlaceConAvance(location.pathname)); } catch (e) {} // así «Abrir en el navegador» lleva el avance
      h += '<ol><li>Toca <b>•••</b> arriba a la derecha.</li><li>Elige <b>«Abrir en el navegador externo»</b>.</li></ol>' +
        '<div class="botones"><button class="boton sec" data-accion="copiar-enlace" data-url="' + url + '">Copiar el enlace</button>';
    } else {
      var intent = "intent://" + location.host + enlaceConAvance(ruta) + "#Intent;scheme=" + location.protocol.replace(":", "") + ";end";
      h += '<div class="botones"><a class="boton sec" data-accion="abrir-externo" data-google-interstitial="false" href="' + intent + '">Abrir en mi navegador</a>';
    }
    return h + '<button class="boton sec" data-accion="ocultar-externo">Ahora no</button></div></div>';
  }
  document.addEventListener("click", function (e) {
    var b = e.target.closest && e.target.closest('[data-accion="abrir-externo"],[data-accion="copiar-enlace"],[data-accion="ocultar-externo"]'); if (!b) return;
    if (b.dataset.accion === "ocultar-externo") { var t = b.closest(".externo"); if (t) t.remove(); return; }
    evento("enl_navegador_externo", { accion: b.dataset.accion === "abrir-externo" ? "abrir" : "copiar", ios: IOS });
    if (b.dataset.accion === "copiar-enlace") { try { navigator.clipboard.writeText(b.dataset.url); aviso("Enlace copiado: pégalo en Safari"); } catch (x) {} }
  });
  // El juego ya no usa service worker (26 nov 2026): si quedó alguno de una versión anterior, se da de baja.
  if (navigator.serviceWorker && navigator.serviceWorker.getRegistrations) navigator.serviceWorker.getRegistrations().then(function (rs) { rs.forEach(function (r) { r.unregister(); }); }).catch(function () {});

  // ---------- arranque según la página ----------
  botonSonido(); prepararHojas(); pintarMonedas(false);
  if (avanceLlego) setTimeout(function () { aviso(avanceLlego, 3200); }, 600);
  var pagina = document.body.dataset.pagina;
  if (pagina === "portada") portada(datos("datos-sitio"));
  else if (pagina === "mundos") paginaMundos(datos("datos-sitio"));
  else if (pagina === "nivel") juego(datos("datos-nivel"), "nivel");
  else if (pagina === "diario") paginaDiario(datos("datos-diario"));
  else if (pagina === "logros") logros(datos("datos-sitio"));
  else if (pagina === "ajustes") ajustes();
})();
