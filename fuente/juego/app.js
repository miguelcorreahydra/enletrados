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
  function evento(n, d) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: n }, d || {})); }
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
  var p = (function () {
    var x = leer("progreso", null) || {};
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
      if (x && Array.isArray(x.hechos) && typeof x.monedas === "number") {
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
  function estrellasHtml(n, animar) {
    var h = '<div class="estrellas' + (animar ? " entra" : "") + '" aria-label="' + n + ' de 3 estrellas">';
    for (var i = 0; i < 3; i++) h += '<svg class="i' + (i < n ? " si" : "") + '" style="--i:' + i + '"><use href="#i-estrella"/></svg>';
    return h + "</div>";
  }
  var COFRE = '<svg class="cofre" viewBox="0 0 120 96" aria-hidden="true"><ellipse cx="60" cy="90" rx="44" ry="5" fill="rgb(0 0 0 / .12)"/>' +
    '<g class="brillos"><path d="M60 8v14M36 16l8 10M84 16l-8 10M24 34h12M84 34h12" stroke="#E2B65A" stroke-width="4" stroke-linecap="round"/></g>' +
    '<rect x="18" y="46" width="84" height="42" rx="6" fill="#9C4A2C"/><rect x="18" y="46" width="84" height="10" fill="#7E3A22"/>' +
    '<rect x="54" y="46" width="12" height="42" fill="#E2B65A"/><rect x="51" y="58" width="18" height="14" rx="3" fill="#F3D27E" stroke="#B9872F" stroke-width="2"/>' +
    '<g class="tapa"><path d="M18 48V38a20 18 0 0 1 20-18h44a20 18 0 0 1 20 18v10z" fill="#C0603A"/><rect x="54" y="20" width="12" height="28" fill="#E2B65A"/></g></svg>';

  // ---------- portada ----------
  var PUNTOS = { 1: [196, 174], 2: [56, 190], 3: [128, 138], 4: [316, 184], 5: [255, 36], 6: [156, 114], 7: [221, 130], 8: [50, 142], 9: [40, 102], 10: [332, 54] };
  function nivelActual(sitio) {
    for (var n = 1; n <= sitio.total; n++) if (p.hechos.indexOf(n) < 0) return n;
    return sitio.total;
  }
  function mundoDe(sitio, n) { for (var i = 0; i < sitio.mundos.length; i++) if (n >= sitio.mundos[i].desde && n <= sitio.mundos[i].hasta) return sitio.mundos[i]; return sitio.mundos[0]; }
  function hechosEn(m) { return p.hechos.filter(function (n) { return n >= m.desde && n <= m.hasta; }).length; }

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
    }, { once: true });
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
      var g = document.querySelector('.pueblo .lugar[data-mundo="' + mu.id + '"]'); if (!g) return;
      var completo = hechosEn(mu) >= (mu.hasta - mu.desde + 1) && mu.hasta <= sitio.total;
      if (completo) g.classList.add("encendido");
      else if (mu.id === m.id) g.classList.add("actual");
      else g.setAttribute("filter", "url(#apagado)");
    });
    var pt = PUNTOS[m.id], pin = $("pin");
    if (pt && pin) { pin.style.left = (pt[0] / 360 * 100) + "%"; pin.style.top = (pt[1] / 240 * 100) + "%"; pin.hidden = false; }
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

  // ---------- logros ----------
  function logros(sitio) {
    var lugares = sitio.mundos.filter(function (m) { return hechosEn(m) >= m.hasta - m.desde + 1; }).length;
    var diarios = Object.keys(p.diario).length, est = totalEstrellas();
    var cifras = [["Niveles", p.hechos.length], ["Estrellas", est], ["Racha actual", rachaVigente()], ["Mejor racha", p.racha.mejor],
      ["Palabras extra", p.extras], ["Días jugados", p.dias.length], ["Diarios", diarios], ["Monedas", p.monedas]];
    $("cifras").innerHTML = cifras.map(function (c) { return "<div><b>" + c[1] + "</b><small>" + c[0] + "</small></div>"; }).join("");
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
      tam = Math.max(22, Math.min(54, Math.floor((Math.min(z.clientWidth, 520) - hueco * (D.columnas - 1)) / D.columnas), Math.floor((z.clientHeight - 16 - hueco * (D.filas - 1)) / D.filas)));
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
        var fin1 = dorada ? 0.25 : 1;
        var an = el.animate([
          { transform: "translate(" + dx + "px," + dy + "px) scale(" + s0 + ")", opacity: 1 },
          { transform: "translate(" + dx * 0.45 + "px," + (dy * 0.45 - 46) + "px) scale(" + (s0 + fin1) / 2 * 1.2 + ")", opacity: 1, offset: 0.5 },
          { transform: "translate(0,0) scale(" + fin1 + ")", opacity: dorada ? 0 : 1 }
        ], { duration: 520, delay: i * 70, easing: "cubic-bezier(.45,0,.25,1)", fill: "both" });
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
          el.classList.remove("esperando"); el.style.setProperty("--j", 0); el.classList.add("gira", "brilla");
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
      nuevas.forEach(function (k, j) { var el = celdaEl(k); if (el) { el.style.setProperty("--j", j); el.classList.add("gira", "brilla"); } });
      if (seleccion < 0) setTimeout(completado, 800); else esperarTilde();
    }
    function pedirLetra() {
      if (seleccion < 0) return;
      if (p.gratis > 0) { p.gratis--; guardarP(); dibujarCupo(); return revelar(false); }
      var h = '<h2>¿Necesitas una ayuda?</h2><p class="sub">Tienes <b>' + p.monedas + '</b> monedas. Las ganas jugando: nunca se compran.</p><div class="botones">' +
        '<button class="boton prin" data-accion="letra"' + (p.monedas < PRECIO_LETRA ? " disabled" : "") + '>Revelar una letra <small>' + PRECIO_LETRA + ' monedas</small></button>' +
        '<button class="boton sec" data-accion="palabra"' + (p.monedas < PRECIO_PALABRA ? " disabled" : "") + '>Revelar la palabra <small>' + PRECIO_PALABRA + ' monedas</small></button>';
      if (p.monedas < PRECIO_LETRA) h += '<button class="boton sec" data-accion="ver-letra">Ver un anuncio y revelar una letra</button>';
      h += '<button class="boton sec" data-accion="cerrar">No, gracias</button></div><p class="nota-chica">Cada 5 palabras extra llenas el frasco y ganas una letra gratis.</p>';
      abrir(h);
    }
    function simular(texto, s, despues) {
      var sim = $("sim"), n = s; sim.innerHTML = texto + "<small>Simulación: " + n + " s</small>"; sim.classList.add("ver");
      var t = setInterval(function () { n--; sim.querySelector("small").textContent = "Simulación: " + n + " s"; if (n <= 0) { clearInterval(t); sim.classList.remove("ver"); despues(); } }, 1000);
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
      var h = "<h2>" + (est === 3 ? "¡Perfecto!" : elogios[(D.n * 7) % elogios.length]) + '</h2><p class="sub">Nivel ' + D.n + " completado</p>" + estrellasHtml(est, true);
      var premios = [];
      if (!mismo) premios.push("+10 monedas");
      if (st.x.length) premios.push("+" + st.x.length * 2 + " por palabras extra");
      if (premios.length) h += '<p class="premios">' + premios.join(" · ") + "</p>";
      if (est < 3 && !mismo) h += '<p class="nota-chica">Sin ayudas ganas las 3 estrellas.</p>';
      if (cofre) h += '<div class="cofre-tarjeta">' + COFRE + "<div><b>¡Un cofre!</b><small>Cada 5 niveles: +50 monedas y una letra gratis</small></div></div>";
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
      h += '<div class="espacio-anuncio" data-clarity-mask="true" data-hj-suppress>Espacio de anuncio (simulado)<br>Solo en esta pantalla, 36 px debajo de los botones</div>';
      abrir(h);
      var esc = document.querySelector(".hoja .escena");
      if (esc) Array.prototype.forEach.call(esc.querySelectorAll(".d"), function (g, i) {
        if (i < +esc.dataset.antes) g.classList.add("si"); else if (i < +esc.dataset.det) g.classList.add("nuevo");
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
      compartirTexto = "Enletrados · El Diario del Pueblo\n" + fechaLarga + "\n" + cuadros + "\n" + "⭐".repeat(est) + (r > 1 ? " · 🔥 " + r + " días" : "") + "\nhttps://enletrados.com/diario/";
      var h = '<h2>¡Diario completo!</h2><p class="sub">El tablero del ' + fechaLarga + "</p>" + estrellasHtml(est, nuevo) +
        '<div class="resultado" aria-label="Tu resultado">' + cuadros + "</div>" +
        '<p class="premios">' + (nuevo ? "+25 monedas · " : "") + (r ? "Racha de " + r + (r === 1 ? " día" : " días") : "") + "</p>" +
        (msgRacha ? '<p class="premios">' + msgRacha + "</p>" : "") +
        '<p class="nota-chica">🟧 sin ayuda · 🟨 con ayuda. Al compartir no se ven las palabras.</p>' +
        '<div class="botones"><a class="boton prin" target="_blank" rel="noopener" data-google-interstitial="false" href="https://wa.me/?text=' + encodeURIComponent(compartirTexto) + '"><svg class="i"><use href="#i-whatsapp"/></svg>Compartir por WhatsApp</a>' +
        (navigator.share ? '<button class="boton sec" data-accion="compartir"><svg class="i"><use href="#i-compartir"/></svg>Compartir de otra forma</button>' : '<button class="boton sec" data-accion="copiar">Copiar el resultado</button>') +
        '<a class="boton sec" href="/" data-google-interstitial="false">Volver al pueblo</a></div>' +
        '<p class="nota-chica">Mañana habrá un tablero nuevo en el Diario.</p>' + repaso() +
        '<div class="espacio-anuncio" data-clarity-mask="true" data-hj-suppress>Espacio de anuncio (simulado)</div>';
      abrir(h);
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
      else if (a === "ver-letra") { cerrar(); evento("enl_ayuda", { tipo: "anuncio", nivel: D.n, modo: modo }); simular("Aquí iría el anuncio con recompensa", 3, function () { revelar(false); }); }
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
