// Enletrados: un solo archivo para todo el sitio (portada, mundos y niveles). Sin librerías.
// Partió del prototipo «Letras Cruzadas» (24 nov 2026). Progreso en localStorage con prefijo enl_.
// Los anuncios están SIMULADOS: el de recompensa solo si el jugador lo pide; nunca durante la partida.
(function () {
  "use strict";
  var PREFIJO = "enl_";
  var $ = function (id) { return document.getElementById(id); };
  var quieto = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---------- guardado (si el navegador lo bloquea, el juego sigue funcionando) ----------
  function leer(k, d) { try { var v = localStorage.getItem(PREFIJO + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(PREFIJO + k, JSON.stringify(v)); } catch (e) {} }
  function borrar(k) { try { localStorage.removeItem(PREFIJO + k); } catch (e) {} }
  function progreso() { var p = leer("progreso", null) || {}; p.hechos = p.hechos || []; if (p.gratis == null) p.gratis = 1; p.extras = p.extras || 0; return p; }
  function evento(n, d) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: n }, d || {})); }
  function datos(id) { var e = $(id); return e ? JSON.parse(e.textContent) : null; }

  // ---------- sonido: tonos sintetizados con Web Audio, sin archivos ----------
  var sonido = leer("sonido", true), ac = null;
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
  var ESCALA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.66, 1318.5];
  var suena = {
    letra: function (i) { tono(ESCALA[Math.min(i, ESCALA.length - 1)], 0, 0.28, 0.11); },
    acierto: function () { [0, 2, 4, 5].forEach(function (n, i) { tono(ESCALA[n], i * 0.07, 0.4, 0.1); }); },
    extra: function () { tono(1318.5, 0, 0.3, 0.08); tono(1760, 0.08, 0.45, 0.07); },
    error: function () { tono(220, 0, 0.18, 0.08, "triangle"); tono(174.6, 0.09, 0.22, 0.07, "triangle"); },
    completo: function () { [0, 2, 4, 5, 7].forEach(function (n, i) { tono(ESCALA[n], i * 0.09, 0.7, 0.1); }); tono(261.6, 0.45, 1.2, 0.06, "triangle"); tono(392, 0.45, 1.2, 0.05, "triangle"); },
    toque: function () { tono(880, 0, 0.12, 0.05); }
  };
  function vibrar(ms) { try { if (navigator.vibrate) navigator.vibrate(ms); } catch (e) {} }

  function botonSonido() {
    var b = $("b-sonido"); if (!b) return;
    var pintar = function () { b.classList.toggle("mudo", !sonido); b.setAttribute("aria-pressed", sonido ? "true" : "false"); b.setAttribute("aria-label", sonido ? "Silenciar sonido" : "Activar sonido"); };
    pintar();
    b.addEventListener("click", function () { sonido = !sonido; guardar("sonido", sonido); pintar(); suena.toque(); });
  }

  // ---------- avisos ----------
  var tAviso;
  function aviso(t) { var a = $("aviso"); if (!a) return; a.textContent = t; a.classList.add("ver"); clearTimeout(tAviso); tAviso = setTimeout(function () { a.classList.remove("ver"); }, 1800); }

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
      piezas.forEach(function (p) {
        p.vy += p.g; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx + Math.sin(vida * 4 + p.o) * dpr; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.scale(1, Math.cos(vida * 8 + p.o)); x.globalAlpha = Math.max(0, 1 - Math.max(0, vida - 1.8));
        x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
      });
      if (vida < 2.9) requestAnimationFrame(cuadro); else c.remove();
    })(t0);
  }

  // ---------- portada ----------
  var PUNTOS = { 1: [196, 174], 2: [56, 190], 3: [128, 138], 4: [316, 184], 5: [255, 36], 6: [156, 114], 7: [221, 130], 8: [50, 142], 9: [40, 102], 10: [332, 54] };
  function nivelActual(sitio, p) {
    for (var n = 1; n <= sitio.total; n++) if (p.hechos.indexOf(n) < 0) return n;
    return sitio.total;
  }
  function mundoDe(sitio, n) { for (var i = 0; i < sitio.mundos.length; i++) if (n >= sitio.mundos[i].desde && n <= sitio.mundos[i].hasta) return sitio.mundos[i]; return sitio.mundos[0]; }
  function hechosEn(m, p) { return p.hechos.filter(function (n) { return n >= m.desde && n <= m.hasta; }).length; }

  function portada(sitio) {
    var p = progreso(), n = nivelActual(sitio, p), m = mundoDe(sitio, n), hechos = hechosEn(m, p);
    var jugar = $("b-jugar");
    jugar.href = "/nivel/" + n + "/";
    $("b-jugar-t").textContent = p.hechos.length ? "Seguir jugando" : "Empezar a jugar";
    $("b-jugar-n").textContent = "Nivel " + n;
    if (p.hechos.length) $("saludo").textContent = "¡Qué bueno verte de nuevo! El pueblo te estaba esperando.";
    // estado de cada lugar en el mapa
    sitio.mundos.forEach(function (mu) {
      var g = document.querySelector('.pueblo .lugar[data-mundo="' + mu.id + '"]'); if (!g) return;
      var completo = hechosEn(mu, p) >= (mu.hasta - mu.desde + 1) && mu.hasta <= sitio.total;
      if (completo) g.classList.add("encendido");
      else if (mu.id === m.id) g.classList.add("actual");
      else g.setAttribute("filter", "url(#apagado)");
    });
    var pt = PUNTOS[m.id], pin = $("pin");
    if (pt && pin) { pin.style.left = (pt[0] / 360 * 100) + "%"; pin.style.top = (pt[1] / 240 * 100) + "%"; pin.hidden = false; }
    // tarjeta del lugar actual
    var t = $("lugar-actual");
    t.style.setProperty("--mundo", m.color);
    $("lugar-num").textContent = m.id; $("lugar-nombre").textContent = m.lugar; $("lugar-frase").textContent = m.frase;
    $("lugar-cuenta").textContent = hechos + " de " + (m.hasta - m.desde + 1) + " niveles";
    requestAnimationFrame(function () { requestAnimationFrame(function () { $("lugar-barra").style.setProperty("--p", hechos / (m.hasta - m.desde + 1) * 100); }); });
    if (quieto) { var tv = document.querySelector(".tilde-vuela"); if (tv) tv.remove(); }
  }

  function paginaMundos(sitio) {
    var p = progreso(), actual = mundoDe(sitio, nivelActual(sitio, p));
    Array.prototype.forEach.call(document.querySelectorAll(".mundo-item"), function (a) {
      var m = sitio.mundos[+a.dataset.mundo - 1], hechos = hechosEn(m, p), cuenta = a.querySelector(".cuenta");
      var disponible = m.desde <= sitio.total, abierto = disponible && (m.id <= actual.id);
      a.querySelector(".barra i").style.setProperty("--p", hechos / (m.hasta - m.desde + 1) * 100);
      if (abierto) { a.classList.remove("cerrado"); a.href = "/nivel/" + Math.min(sitio.total, Math.max(m.desde, m.id === actual.id ? nivelActual(sitio, p) : m.desde)) + "/"; cuenta.textContent = hechos + " de " + (m.hasta - m.desde + 1); }
    });
  }

  // ---------- nivel ----------
  function nivel(D) {
    var p = progreso(), clave = "partida_" + D.n;
    var st = leer(clave, null) || { e: [], r: [], x: [] }; // encontradas, celdas reveladas, palabras extra
    var celdas = {}, seleccion = -1, orden = D.letras.split(""), fichas = [], centros = [], elegidas = [], arrastrando = false;
    var ultimaVez = 0;
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

    // ---- crucigrama ----
    var tam = 40;
    function medir() {
      var z = $("zona-grilla"), hueco = D.columnas > 6 || D.filas > 6 ? 4 : 5;
      $("grilla").innerHTML = ""; // se mide el espacio libre, sin el crucigrama anterior adentro
      tam = Math.max(24, Math.min(54, Math.floor((Math.min(z.clientWidth, 520) - hueco * (D.columnas - 1)) / D.columnas), Math.floor((z.clientHeight - 16 - hueco * (D.filas - 1)) / D.filas)));
      $("grilla").style.setProperty("--hueco", hueco + "px");
    }
    function dibujarGrilla(op) {
      op = op || {};
      var g = $("grilla"), marcadas = seleccion >= 0 ? celdasDe(seleccion) : [], idx = 0;
      g.style.gridTemplateColumns = "repeat(" + D.columnas + "," + tam + "px)";
      g.style.gridTemplateRows = "repeat(" + D.filas + "," + tam + "px)";
      var html = "";
      for (var f = 0; f < D.filas; f++) for (var c = 0; c < D.columnas; c++) {
        var k = f + "," + c;
        if (!celdas[k]) { html += "<div></div>"; continue; }
        var porPalabra = celdas[k].palabras.some(encontrada), cl = "celda on";
        if (porPalabra) cl += " llena"; else if (st.r.indexOf(k) >= 0) cl += " revelada";
        if (marcadas.indexOf(k) >= 0 && !porPalabra) cl += " marcada";
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
      t.innerHTML = "<small>" + w.p.length + " letras · " + (w.d === "h" ? "horizontal" : "vertical") + "</small><span>" + D.pistas[w.p] + "</span>";
      if (animar) { t.classList.remove("cambia"); void t.offsetWidth; t.classList.add("cambia"); }
    }
    function dibujarCupo(salto) { var c = $("cupo"); c.hidden = !p.gratis; c.textContent = p.gratis; if (salto) { c.classList.remove("salta"); void c.offsetWidth; c.classList.add("salta"); } }
    function dibujarGuia() {
      var g = $("guia");
      if (D.n === 1 && !st.e.length) g.textContent = "Desliza el dedo por las letras";
      else if (D.n <= 2 && st.e.length && seleccion >= 0) g.textContent = "Toca una casilla para ver la pista de esa palabra";
      else g.textContent = st.x.length ? "Palabras extra: " + st.x.length : "";
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
      var palabra = elegidas.map(function (i) { return orden[i]; }).join(""), usadas = elegidas.slice(); elegidas = [];
      trazo.innerHTML = ""; centros.forEach(function (c) { c.e.classList.remove("sel"); });
      if (palabra.length >= 2) probar(palabra, usadas); else burbuja("");
    }
    rueda.addEventListener("pointerup", soltar);
    rueda.addEventListener("pointercancel", soltar);

    // ---- demostración del gesto (nivel 1): una mano recorre las letras ----
    var demoActiva = false, demoRaf = 0, mano = $("mano");
    function iniciarDemo() {
      pararDemo(); if (D.n !== 1 || st.e.length || quieto) return;
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

    // ---- probar una palabra ----
    function probar(w, usadas) {
      burbuja(w);
      var letrasB = Array.prototype.slice.call(document.querySelectorAll("#actual .burbuja i"));
      var i = -1; D.palabras.forEach(function (x, j) { if (x.p === w) i = j; });
      if (i >= 0) {
        if (encontrada(i)) { burbuja(w, "repetida"); aviso("Ya la encontraste"); suena.toque(); return soltarBurbuja("", 600); }
        var antes = celdasDe(i).filter(celdaVisible);
        st.e.push(w); persistir(); evento("enl_palabra", { nivel: D.n });
        if (seleccion === i || seleccion < 0 || encontrada(seleccion)) seleccion = siguientePendiente(i);
        var destinos = celdasDe(i), nuevas = destinos.filter(function (k) { return antes.indexOf(k) < 0; });
        dibujarGrilla({ esperando: nuevas, sinEntrada: true }); dibujarPista(true); dibujarGuia();
        suena.acierto(); vibrar([10, 40, 14]);
        // las letras salen de la burbuja y vuelan a su casilla (se mide antes de vaciar la burbuja)
        var clones = letrasB.map(function (l) { var r = l.getBoundingClientRect(), c = document.createElement("i"); c.textContent = l.textContent; c.getBoundingClientRect = function () { return r; }; return c; });
        $("actual").innerHTML = "";
        volar(clones, destinos.map(celdaEl), false, function (j) {
          var el = celdaEl(destinos[j]); if (!el) return;
          el.classList.remove("esperando"); el.style.setProperty("--j", 0); el.classList.add("gira", "brilla");
        }, function () { if (seleccion < 0) setTimeout(completado, 450); });
        return;
      }
      if (D.extras.indexOf(w) >= 0) {
        if (st.x.indexOf(w) >= 0) { burbuja(w, "repetida"); aviso("Ya la encontraste"); return soltarBurbuja("", 600); }
        st.x.push(w); p.extras++; var regalo = p.extras % 5 === 0; if (regalo) p.gratis++;
        guardar("progreso", p); persistir(); suena.extra(); vibrar(12);
        burbuja(w, "extra");
        aviso(regalo ? "¡Palabra extra! Ganaste una letra gratis" : "Palabra extra · " + (5 - p.extras % 5) + " más para una letra gratis");
        var fichasB = Array.prototype.slice.call(document.querySelectorAll("#actual .burbuja i")), destino = $("b-letra");
        setTimeout(function () {
          var clones = fichasB.map(function (l) { var r = l.getBoundingClientRect(), c = document.createElement("i"); c.textContent = l.textContent; c.getBoundingClientRect = function () { return r; }; return c; });
          $("actual").innerHTML = "";
          volar(clones, clones.map(function () { return destino; }), true, null, function () { dibujarCupo(true); dibujarGuia(); });
        }, 380);
        return;
      }
      burbuja(w, "mal"); suena.error(); vibrar(30); soltarBurbuja("", 650);
    }

    // ---- revelar una letra ----
    function revelar() {
      if (seleccion < 0) return;
      var libres = celdasDe(seleccion).filter(function (k) { return !celdaVisible(k); });
      if (!libres.length) return;
      var k = libres[0]; st.r.push(k);
      D.palabras.forEach(function (w, i) { if (!encontrada(i) && celdasDe(i).every(celdaVisible)) st.e.push(w.p); });
      persistir(); evento("enl_ayuda", { tipo: "letra", nivel: D.n });
      if (encontrada(seleccion)) seleccion = siguientePendiente(seleccion);
      dibujarGrilla({ sinEntrada: true }); dibujarPista(true); suena.extra();
      var el = celdaEl(k); if (el) el.classList.add("gira", "brilla");
      if (seleccion < 0) setTimeout(completado, 800);
    }
    function pedirLetra() {
      if (seleccion < 0) return;
      if (p.gratis > 0) { p.gratis--; guardar("progreso", p); dibujarCupo(); return revelar(); }
      abrir('<h2>¿Revelar una letra?</h2><p class="sub">Mira un anuncio corto y te mostramos una letra de la palabra marcada. Es opcional: también ganas letras gratis encontrando palabras extra.</p>' +
        '<div class="botones"><button class="boton prin" data-accion="ver-letra">Ver anuncio y revelar</button><button class="boton sec" data-accion="cerrar">No, gracias</button></div>');
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
      var nuevoOrden = idx.map(function (i) { return orden[i]; }); // la ficha i ahora tiene la letra que estaba en idx[i]
      orden = nuevoOrden; dibujarRueda(false);
      if (!quieto) centros.forEach(function (c, i) {
        var de = antes[idx[i]]; c.e.animate([{ transform: "translate(" + (de.x - c.x) + "px," + (de.y - c.y) + "px) rotate(-90deg)" }, { transform: "none" }],
          { duration: 480, easing: "cubic-bezier(.34,1.4,.64,1)" });
      });
      var b = $("b-mezclar").querySelector("svg"); b.classList.remove("girando"); void b.getBoundingClientRect(); b.classList.add("girando");
      suena.toque(); vibrar(6);
    }

    // ---- nivel completado ----
    var UMBRALES = [1, 4, 8, 13, 20, 30];
    function completado() {
      var mismo = p.hechos.indexOf(D.n) >= 0, totalMundo = D.mundo.hasta - D.mundo.desde + 1;
      var antes = p.hechos.filter(function (n) { return n >= D.mundo.desde && n <= D.mundo.hasta; }).length;
      if (!mismo) { p.hechos.push(D.n); p.hechos.sort(function (a, b) { return a - b; }); guardar("progreso", p); }
      borrar(clave);
      var ahora = antes + (mismo ? 0 : 1);
      evento("enl_nivel_completo", { nivel: D.n, extras: st.x.length });
      if ([1, 3, 5, 10].indexOf(D.n) >= 0 && !mismo) evento("enl_nivel_" + D.n);
      suena.completo(); vibrar([20, 60, 20, 60, 40]); confeti();

      var elogios = ["¡Muy bien!", "¡Excelente!", "¡Impecable!", "¡Así se hace!", "¡Bravo!", "¡Qué buena mente!"];
      var h = '<h2>' + elogios[(D.n * 7) % elogios.length] + '</h2><p class="sub">Nivel ' + D.n + " completado</p>";
      var t = $("t-escena");
      if (t) {
        var det = UMBRALES.filter(function (u) { return ahora >= u; }).length, detAntes = UMBRALES.filter(function (u) { return antes >= u; }).length;
        var nombres = ["las luces de la vitrina", "el letrero", "el toldo", "las flores", "el humo del horno", "el farol y el pan"];
        var prox = UMBRALES[det], nota = det > detAntes ? "Nuevo detalle en " + D.mundo.lugar.toLowerCase() + ": <strong>" + nombres[det - 1] + "</strong>" :
          prox ? "Próximo detalle en <strong>" + (prox - ahora) + " nivel" + (prox - ahora > 1 ? "es" : "") + "</strong>" : "¡" + D.mundo.lugar + " está completa!";
        h += '<div class="escena-tarjeta">' + t.innerHTML + '<div class="escena-pie"><div class="fila"><b>' + D.mundo.lugar + "</b><small>" + ahora + " de " + totalMundo +
          '</small></div><div class="barra"><i id="barra-escena" style="--p:' + (antes / totalMundo * 100) + '"></i></div><p class="nota-detalle">' + nota + "</p></div></div>";
        h = h.replace('class="escena"', 'class="escena" data-det="' + det + '" data-antes="' + detAntes + '"');
      }
      h += '<ul class="repaso">' + D.palabras.map(function (w, i) { return '<li style="--i:' + i + '"><b>' + w.p + "</b><span>" + D.pistas[w.p] + "</span></li>"; }).join("") + "</ul>";
      if (st.x.length) h += '<p class="extras-nota">Además encontraste ' + st.x.length + " palabra" + (st.x.length > 1 ? "s" : "") + " extra.</p>";
      var sig = D.siguiente ? '<a class="boton prin' + (D.vinetaSiguiente ? " con-vineta" : "") + '" href="' + D.siguiente + '"' + (D.vinetaSiguiente ? "" : ' data-google-interstitial="false"') +
        ">Siguiente nivel <svg class=\"i\"><use href=\"#i-flecha\"/></svg></a>" : '<a class="boton prin" href="/mundos/" data-google-interstitial="false">Ver los lugares</a>';
      h += '<div class="botones">' + sig + '<a class="boton sec" href="/" data-google-interstitial="false">Volver al pueblo</a></div>';
      h += '<div class="espacio-anuncio">Espacio de anuncio (simulado)<br>Solo en esta pantalla, 36 px debajo de los botones</div>';
      abrir(h);
      var esc = document.querySelector(".hoja .escena");
      if (esc) Array.prototype.forEach.call(esc.querySelectorAll(".d"), function (g, i) {
        if (i < +esc.dataset.antes) g.classList.add("si"); else if (i < +esc.dataset.det) g.classList.add("nuevo");
      });
      setTimeout(function () { var b = $("barra-escena"); if (b) b.style.setProperty("--p", ahora / totalMundo * 100); }, 350);
    }

    // ---- hojas ----
    function abrir(h) { $("hoja-contenido").innerHTML = h; $("velo").classList.add("ver"); $("hoja-contenido").parentNode.scrollTop = 0; }
    function cerrar() { $("velo").classList.remove("ver"); }
    function ayuda() {
      abrir('<h2>Cómo jugar</h2><p class="sub">Devuélvele las palabras al pueblo.</p>' +
        '<div class="paso"><b>1</b><p>Desliza el dedo por las letras del círculo para formar una palabra, y suelta.</p></div>' +
        '<div class="paso"><b>2</b><p>Si la palabra está en el crucigrama, vuela sola a su lugar.</p></div>' +
        '<div class="paso"><b>3</b><p>La pista de la palabra marcada está arriba. Toca otra casilla o usa las flechas para ver otra.</p></div>' +
        '<div class="paso"><b>✦</b><p><strong>Mezclar</strong> cambia el orden de las letras. <strong>Pista</strong> muestra una letra. Cada 5 palabras extra ganas una letra gratis.</p></div>' +
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
      if (b.id === "cerrar") return cerrar();
      if (b.id === "b-sig" || b.id === "b-ant") {
        if (seleccion >= 0) { var paso = b.id === "b-sig" ? 1 : -1, i = seleccion; do { i = (i + paso + D.palabras.length) % D.palabras.length; } while (encontrada(i)); seleccion = i; dibujarGrilla({ sinEntrada: true }); dibujarPista(true); suena.toque(); }
        return;
      }
      if (b.id === "b-mezclar") return mezclar();
      if (b.id === "b-letra") return pedirLetra();
      var a = b.dataset.accion;
      if (a === "cerrar") cerrar();
      else if (a === "ver-letra") { cerrar(); evento("enl_ayuda", { tipo: "anuncio", nivel: D.n }); simular("Aquí iría el anuncio con recompensa", 3, revelar); }
    });
    $("velo").addEventListener("click", function (e) { if (e.target.id === "velo") cerrar(); });
    var tRes; window.addEventListener("resize", function () { clearTimeout(tRes); tRes = setTimeout(function () { medir(); dibujarGrilla({ sinEntrada: true }); pararDemo(); dibujarRueda(false); iniciarDemo(); }, 120); });

    seleccion = siguientePendiente(-1);
    medir(); dibujarGrilla(); dibujarRueda(true); dibujarPista(); dibujarCupo(); dibujarGuia();
    // segunda medición después del primer cuadro, por si el diseño todavía no estaba asentado
    requestAnimationFrame(function () { var antes = tam; medir(); dibujarGrilla(tam !== antes ? { sinEntrada: true } : null); });
    setTimeout(iniciarDemo, 900);
    if (seleccion < 0) setTimeout(completado, 500);
    evento("enl_nivel_inicio", { nivel: D.n });
  }

  // ---------- arranque según la página ----------
  botonSonido();
  var pagina = document.body.dataset.pagina;
  if (pagina === "portada") portada(datos("datos-sitio"));
  else if (pagina === "mundos") paginaMundos(datos("datos-sitio"));
  else if (pagina === "nivel") nivel(datos("datos-nivel"));
})();
