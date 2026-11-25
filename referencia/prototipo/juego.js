// Letras Cruzadas: prototipo local (24 nov 2026). Sin librerías ni servidor.
// Anuncios SIMULADOS: «Letra» (revelar una letra) iría con el reward de Groone, opcional; la viñeta, entre niveles
// (cada 3); y un bloque solo en la pantalla de nivel completado. Nunca durante la partida.
(function () {
  "use strict";
  var PREFIJO = "lc_", NIVELES = window.NIVELES, PISTAS = window.PISTAS;
  var EXTRAS_POR_LETRA = 5; // cada 5 palabras extra, una letra gratis

  function leer(k, d) { try { var v = localStorage.getItem(PREFIJO + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }
  function guardar(k, v) { try { localStorage.setItem(PREFIJO + k, JSON.stringify(v)); } catch (e) {} }
  function evento(n, d) { (window.dataLayer = window.dataLayer || []).push(Object.assign({ event: n }, d || {})); }
  var $ = function (id) { return document.getElementById(id); };

  // ---------- estado ----------
  var st = leer("estado", null) || { nivel: 1, encontradas: [], reveladas: [], extrasNivel: [], extrasTotal: 0, gratis: 1 };
  var params = new URLSearchParams(location.search);
  if (params.get("nivel")) { st = { nivel: Math.max(1, Math.min(NIVELES.length, +params.get("nivel") || 1)), encontradas: [], reveladas: [], extrasNivel: [], extrasTotal: st.extrasTotal, gratis: st.gratis }; }
  var nivel, celdas, seleccion = -1, letrasOrden;
  function persistir() { guardar("estado", st); }

  function cargarNivel() {
    nivel = NIVELES[st.nivel - 1];
    celdas = {}; // "f,c" -> {l, palabras:[i]}
    nivel.palabras.forEach(function (w, i) {
      for (var j = 0; j < w.p.length; j++) {
        var f = w.f + (w.d === "v" ? j : 0), c = w.c + (w.d === "h" ? j : 0), k = f + "," + c;
        celdas[k] = celdas[k] || { l: w.p[j], palabras: [] }; celdas[k].palabras.push(i);
      }
    });
    letrasOrden = nivel.letras.split("");
    seleccion = siguientePendiente(-1);
    $("nivel").textContent = "Nivel " + st.nivel + " de " + NIVELES.length;
    dibujarGrilla(); dibujarRueda(); dibujarPista(); dibujarCupo(); dibujarGuia();
    if (seleccion < 0) setTimeout(nivelCompleto, 400); // nivel ya terminado (por ejemplo, al recargar)
  }

  function encontrada(i) { return st.encontradas.indexOf(nivel.palabras[i].p) >= 0; }
  function siguientePendiente(desde) {
    for (var n = 1; n <= nivel.palabras.length; n++) { var i = (desde + n + nivel.palabras.length) % nivel.palabras.length; if (!encontrada(i)) return i; }
    return -1;
  }
  function celdasDe(i) {
    var w = nivel.palabras[i], r = [];
    for (var j = 0; j < w.p.length; j++) r.push((w.f + (w.d === "v" ? j : 0)) + "," + (w.c + (w.d === "h" ? j : 0)));
    return r;
  }
  function celdaVisible(k) {
    return st.reveladas.indexOf(k) >= 0 || celdas[k].palabras.some(function (i) { return encontrada(i); });
  }

  // ---------- grilla ----------
  function tamCelda() {
    var z = $("zona-grilla"), w = Math.min(z.clientWidth, 488), h = z.clientHeight - 4;
    return Math.max(24, Math.min(46, Math.floor((w - 4 * (nivel.columnas - 1)) / nivel.columnas), Math.floor((h - 4 * (nivel.filas - 1)) / nivel.filas)));
  }
  function dibujarGrilla(nuevas) {
    var g = $("grilla"), t = tamCelda(), marcadas = seleccion >= 0 ? celdasDe(seleccion) : [];
    g.style.gridTemplateColumns = "repeat(" + nivel.columnas + "," + t + "px)";
    g.style.gridTemplateRows = "repeat(" + nivel.filas + "," + t + "px)";
    g.innerHTML = "";
    for (var f = 0; f < nivel.filas; f++) for (var c = 0; c < nivel.columnas; c++) {
      var k = f + "," + c, d = document.createElement("div"); d.className = "celda";
      if (celdas[k]) {
        d.className += " on"; d.dataset.k = k; d.style.fontSize = Math.round(t * .55) + "px";
        var porPalabra = celdas[k].palabras.some(function (i) { return encontrada(i); });
        if (porPalabra) { d.className += " llena"; d.textContent = celdas[k].l; }
        else if (st.reveladas.indexOf(k) >= 0) { d.className += " revelada"; d.textContent = celdas[k].l; }
        if (marcadas.indexOf(k) >= 0 && !porPalabra) d.className += " marcada";
        if (nuevas && nuevas.indexOf(k) >= 0) d.className += " nueva";
      }
      g.appendChild(d);
    }
  }

  function dibujarPista() {
    var t = $("pista-texto");
    if (seleccion < 0) { t.innerHTML = "<b>¡Completo!</b>"; return; }
    var w = nivel.palabras[seleccion], pend = nivel.palabras.filter(function (x, i) { return !encontrada(i); }).length;
    t.innerHTML = "<b>" + w.p.length + " letras · " + (w.d === "h" ? "horizontal" : "vertical") + " · faltan " + pend + "</b>" + PISTAS[w.p];
  }
  function dibujarCupo() { var c = $("cupo"); c.hidden = !st.gratis; c.textContent = st.gratis; }
  function dibujarGuia() {
    var g = $("guia");
    if (st.nivel <= 2 && !st.encontradas.length) g.textContent = "Desliza el dedo sobre las letras para formar una palabra";
    else if (st.nivel <= 2) g.textContent = "Toca una casilla para ver la pista de esa palabra";
    else g.textContent = st.extrasNivel.length ? "Palabras extra: " + st.extrasNivel.length : "";
  }

  // ---------- rueda ----------
  var rueda = $("rueda"), trazo = $("trazo"), centros = [], elegidas = [], arrastrando = false, demoT = null;
  function dibujarRueda() {
    var ancho = Math.min(230, window.innerWidth - 164), r = ancho / 2 - 34, n = letrasOrden.length;
    rueda.style.width = rueda.style.height = ancho + "px";
    trazo.setAttribute("viewBox", "0 0 " + ancho + " " + ancho);
    Array.prototype.slice.call(rueda.querySelectorAll(".letra")).forEach(function (e) { e.remove(); });
    centros = letrasOrden.map(function (l, i) {
      var a = -Math.PI / 2 + i * 2 * Math.PI / n, x = ancho / 2 + r * Math.cos(a), y = ancho / 2 + r * Math.sin(a);
      var e = document.createElement("div"); e.className = "letra"; e.textContent = l; e.style.left = x + "px"; e.style.top = y + "px";
      rueda.appendChild(e); return { x: x, y: y, e: e };
    });
    pintarTrazo(); iniciarDemo();
  }
  function pintarTrazo(px, py) {
    var pts = elegidas.map(function (i) { return centros[i].x + "," + centros[i].y; });
    if (arrastrando && px != null && pts.length) pts.push(px + "," + py);
    trazo.innerHTML = pts.length > 1 ? '<polyline points="' + pts.join(" ") + '" fill="none" stroke="#1D5FA8" stroke-width="8" stroke-linecap="round" stroke-linejoin="round" opacity=".55"/>' : "";
    centros.forEach(function (c, i) { c.e.classList.toggle("sel", elegidas.indexOf(i) >= 0); });
    var a = $("actual"); a.className = "actual";
    a.innerHTML = elegidas.length ? "<span>" + elegidas.map(function (i) { return letrasOrden[i]; }).join("") + "</span>" : "";
  }
  function letraEn(x, y) {
    for (var i = 0; i < centros.length; i++) { var dx = centros[i].x - x, dy = centros[i].y - y; if (dx * dx + dy * dy < 30 * 30) return i; }
    return -1;
  }
  function punto(e) { var b = rueda.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; }
  rueda.addEventListener("pointerdown", function (e) {
    if ($("velo").classList.contains("ver")) return;
    var p = punto(e), i = letraEn(p.x, p.y); if (i < 0) return;
    pararDemo(); arrastrando = true; elegidas = [i]; rueda.setPointerCapture(e.pointerId); pintarTrazo(p.x, p.y);
  });
  rueda.addEventListener("pointermove", function (e) {
    if (!arrastrando) return;
    var p = punto(e), i = letraEn(p.x, p.y);
    if (i >= 0) {
      if (elegidas.length > 1 && elegidas[elegidas.length - 2] === i) elegidas.pop();      // volver atrás
      else if (elegidas.indexOf(i) < 0) elegidas.push(i);
    }
    pintarTrazo(p.x, p.y);
  });
  function soltar() {
    if (!arrastrando) return; arrastrando = false;
    var palabra = elegidas.map(function (i) { return letrasOrden[i]; }).join(""); elegidas = [];
    pintarTrazo(); if (palabra.length >= 2) probar(palabra); else $("actual").innerHTML = "";
  }
  rueda.addEventListener("pointerup", soltar);
  rueda.addEventListener("pointercancel", soltar);

  // demostración del gesto en los primeros niveles
  function iniciarDemo() {
    pararDemo(); if (st.nivel > 1 || st.encontradas.length) return;
    var objetivo = nivel.palabras[0].p.split(""), usados = [], orden = objetivo.map(function (l) {
      for (var i = 0; i < letrasOrden.length; i++) if (letrasOrden[i] === l && usados.indexOf(i) < 0) { usados.push(i); return i; }
    }), paso = 0;
    demoT = setInterval(function () {
      centros.forEach(function (c) { c.e.classList.remove("demo"); });
      if (paso < orden.length) for (var j = 0; j <= paso; j++) centros[orden[j]].e.classList.add("demo");
      paso = (paso + 1) % (orden.length + 2);
    }, 550);
  }
  function pararDemo() { clearInterval(demoT); demoT = null; centros.forEach(function (c) { c.e.classList.remove("demo"); }); }

  // ---------- probar palabra ----------
  function mostrarActual(txt, clase) {
    var a = $("actual"); a.innerHTML = "<span>" + txt + "</span>"; a.className = "actual " + clase;
    setTimeout(function () { if (!arrastrando) { a.innerHTML = ""; a.className = "actual"; } }, 900);
  }
  function probar(w) {
    var i = -1; nivel.palabras.forEach(function (x, j) { if (x.p === w) i = j; });
    if (i >= 0) {
      if (encontrada(i)) { aviso("Ya la encontraste"); return mostrarActual(w, ""); }
      st.encontradas.push(w); persistir(); evento("lc_palabra", { nivel: st.nivel });
      var nuevas = celdasDe(i);
      if (seleccion === i || seleccion < 0 || encontrada(seleccion)) seleccion = siguientePendiente(i);
      dibujarGrilla(nuevas); dibujarPista(); dibujarGuia(); mostrarActual(w, "");
      if (seleccion < 0) setTimeout(nivelCompleto, 700);
      return;
    }
    if (nivel.extras.indexOf(w) >= 0) {
      if (st.extrasNivel.indexOf(w) >= 0) { aviso("Ya la encontraste"); return mostrarActual(w, "extra"); }
      st.extrasNivel.push(w); st.extrasTotal++;
      if (st.extrasTotal % EXTRAS_POR_LETRA === 0) { st.gratis++; aviso("¡Palabra extra! Ganaste una letra gratis"); }
      else aviso("Palabra extra: " + (EXTRAS_POR_LETRA - st.extrasTotal % EXTRAS_POR_LETRA) + " más para una letra gratis");
      persistir(); dibujarCupo(); dibujarGuia(); return mostrarActual(w, "extra");
    }
    mostrarActual(w, "mal");
  }

  // ---------- revelar letra ----------
  function revelar() {
    if (seleccion < 0) return;
    var libres = celdasDe(seleccion).filter(function (k) { return !celdaVisible(k); });
    if (!libres.length) return;
    var k = libres[0]; st.reveladas.push(k);
    // si con esto la palabra queda completa, cuenta como encontrada
    nivel.palabras.forEach(function (w, i) {
      if (!encontrada(i) && celdasDe(i).every(celdaVisible)) st.encontradas.push(w.p);
    });
    persistir(); evento("lc_letra", { nivel: st.nivel });
    if (encontrada(seleccion)) seleccion = siguientePendiente(seleccion);
    dibujarGrilla([k]); dibujarPista();
    if (seleccion < 0) setTimeout(nivelCompleto, 700);
  }
  function pedirLetra() {
    if (seleccion < 0) return;
    if (st.gratis > 0) { st.gratis--; dibujarCupo(); return revelar(); }
    abrir("<h2>¿Revelar una letra?</h2><p>Mira un anuncio corto y te mostramos una letra de la palabra marcada. Es opcional: también ganas letras gratis encontrando palabras extra.</p>" +
      '<div class="acciones"><button class="btn prin" data-accion="ver-letra">Ver anuncio y revelar</button><button class="btn sec" data-accion="cerrar">No, gracias</button></div>');
    evento("lc_letra_ofrecida");
  }

  // ---------- fin de nivel ----------
  function nivelCompleto() {
    evento("lc_nivel", { nivel: st.nivel, extras: st.extrasNivel.length });
    var h = "<h2>¡Nivel " + st.nivel + " completado!</h2><p>Repasa las palabras:</p><ul class=\"repaso\">";
    nivel.palabras.forEach(function (w) { h += "<li><b>" + w.p + "</b>" + PISTAS[w.p] + "</li>"; });
    h += "</ul>" + (st.extrasNivel.length ? "<p>Además encontraste " + st.extrasNivel.length + " palabra" + (st.extrasNivel.length > 1 ? "s" : "") + " extra.</p>" : "");
    h += '<div class="acciones"><button class="btn prin" data-accion="siguiente">' + (st.nivel < NIVELES.length ? "Siguiente nivel" : "Volver a empezar") + "</button></div>" +
      '<div class="espacio-anuncio">Espacio de anuncio (simulado)<br>Solo en esta pantalla, debajo del botón</div>';
    abrir(h);
  }
  function siguienteNivel() {
    var pasado = st.nivel;
    st = { nivel: pasado < NIVELES.length ? pasado + 1 : 1, encontradas: [], reveladas: [], extrasNivel: [], extrasTotal: st.extrasTotal, gratis: st.gratis };
    persistir();
    if (pasado % 3 === 0) simular("Aquí podría salir la viñeta de Google entre niveles", 2, cargarNivel);
    else cargarNivel();
  }

  // ---------- hojas, avisos y simulación ----------
  function abrir(h) { $("hoja-contenido").innerHTML = h; $("velo").classList.add("ver"); }
  function cerrar() { $("velo").classList.remove("ver"); }
  var tA; function aviso(t) { var a = $("aviso"); a.textContent = t; a.classList.add("ver"); clearTimeout(tA); tA = setTimeout(function () { a.classList.remove("ver"); }, 1700); }
  function simular(texto, s, despues) {
    var sim = $("sim"), n = s; sim.innerHTML = texto + "<small>Simulación del prototipo: " + n + " s</small>"; sim.classList.add("ver");
    var t = setInterval(function () { n--; sim.querySelector("small").textContent = "Simulación del prototipo: " + n + " s"; if (n <= 0) { clearInterval(t); sim.classList.remove("ver"); despues(); } }, 1000);
  }
  function ayuda() {
    abrir("<h2>Cómo jugar</h2><p><strong>1.</strong> Desliza el dedo sobre las letras del círculo para formar una palabra y suelta.</p>" +
      "<p><strong>2.</strong> Si la palabra está en el crucigrama, se coloca sola.</p>" +
      "<p><strong>3.</strong> La casilla marcada en celeste tiene su pista arriba de las letras. Toca otra casilla o usa las flechas para ver otra pista.</p>" +
      "<p><strong>Mezclar</strong> cambia el orden de las letras. <strong>Letra</strong> te muestra una letra de la palabra marcada. Las palabras extra que encuentres suman letras gratis.</p>" +
      '<div class="acciones"><button class="btn prin" data-accion="cerrar">Jugar</button></div>');
  }

  document.addEventListener("click", function (e) {
    var cel = e.target.closest(".celda.on");
    if (cel) {
      var cand = celdas[cel.dataset.k].palabras.filter(function (i) { return !encontrada(i); });
      if (cand.length) { seleccion = cand.indexOf(seleccion) >= 0 && cand.length > 1 ? cand[(cand.indexOf(seleccion) + 1) % cand.length] : cand[0]; dibujarGrilla(); dibujarPista(); }
      return;
    }
    var b = e.target.closest("button"); if (!b) return;
    if (b.id === "b-ayuda") return ayuda();
    if (b.id === "cerrar") return cerrar();
    if (b.id === "b-sig" || b.id === "b-ant") { if (seleccion >= 0) { var paso = b.id === "b-sig" ? 1 : -1, i = seleccion; do { i = (i + paso + nivel.palabras.length) % nivel.palabras.length; } while (encontrada(i)); seleccion = i; dibujarGrilla(); dibujarPista(); } return; }
    if (b.id === "b-mezclar") { for (var j = letrasOrden.length - 1; j > 0; j--) { var r = Math.floor(Math.random() * (j + 1)), t = letrasOrden[j]; letrasOrden[j] = letrasOrden[r]; letrasOrden[r] = t; } dibujarRueda(); return; }
    if (b.id === "b-letra") return pedirLetra();
    var a = b.dataset.accion;
    if (a === "cerrar") cerrar();
    else if (a === "ver-letra") { cerrar(); evento("lc_letra_aceptada"); simular("Aquí iría el anuncio con recompensa (reward de Groone)", 3, revelar); }
    else if (a === "siguiente") { cerrar(); siguienteNivel(); }
  });
  $("velo").addEventListener("click", function (e) { if (e.target.id === "velo") cerrar(); });
  window.addEventListener("resize", function () { dibujarGrilla(); dibujarRueda(); });

  cargarNivel();
  if (!leer("visto", false)) { guardar("visto", true); ayuda(); }
})();
