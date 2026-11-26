# Enletrados (sitio de juegos de palabras en español)

Proyecto propio, separado de los blogs. Un sitio de juegos de palabras en español neutro para toda Latinoamérica, con
anuncios de Groone (Google Ad Manager) y tráfico de Meta. Empieza con un solo juego completo: un crucigrama que se arma
deslizando el dedo por una rueda de letras, con una pista para cada palabra. Plan escrito el 24 nov 2026, en la
conversación de Tu Bono Hoy (`Hydra SAS/Blogs Hydra/chile-subsidios`); el trabajo sigue en una ventana de VS Code
abierta en esta carpeta.

Responder siempre en español.

## Estado (24 nov 2026)
- El jefe del usuario aprobó la prueba con sitio y dominio propios. **Fase 1 hecha en local**: estructura, `construir.js`,
  una página por nivel, mundos, portada con el pueblo y base visual. Nada publicado y nada comprado.
- **Orden acordado:** se trabaja todo en local primero; el dominio se compra cuando el usuario se lo pida al jefe.
- Nombre: **Enletrados** (elegido por el usuario). `enletrados.com` estaba libre el 24 nov 2026 (registro de Verisign).
  La compra la hace el usuario; mejor en Cloudflare, donde va alojado.
- **Repositorio:** privado en GitHub, `miguelcorreahydra/enletrados` (cuenta personal del usuario). Este repositorio
  tiene su propio ayudante de credenciales para usar esa cuenta, aunque la cuenta activa de `gh` sea otra. Los commits
  van con el correo `noreply` de GitHub de esa cuenta.
- **Medición, más adelante:** Analytics, píxel de Meta, **Clarity y Hotjar** (los dos, decidido por el usuario). En las
  grabaciones se ocultan los espacios de anuncio (`data-clarity-mask`, `data-hj-suppress`). Se cargan después de que se
  vea el juego.
- Decisiones del usuario:
  - mercado: toda Latinoamérica, en español neutro, sin chilenismos;
  - primero un juego completo; los otros juegos se suman solo si la prueba funciona.
- Base existente, solo como referencia: el prototipo en `Hydra SAS/Blogs Hydra/juego-palabra/letras/` (`generar.js`,
  `pistas.js` con 572 pistas, `niveles.js` con 30 niveles, `index.html`, `juego.js`). **Se copia aquí, no se edita allá.**
- Propuesta presentada al jefe: `Hydra SAS/Blogs Hydra/juego-palabra/propuesta/propuesta_letras_cruzadas.html`.
  En ella el juego todavía se llama «Letras Cruzadas».
- **Fase 2 en curso** (24–26 nov 2026):
  - lista de bloqueo, pistas por tandas con estado, revisión automática, generador con la curva de dificultad, desafío
    diario y prueba de niveles, todo hecho;
  - las 18 dudosas, decididas por el usuario en `/revisar/`;
  - tandas 0, 1 y 2 revisadas por Claude y aprobadas (1.321 palabras con pista). Salen los 300 niveles y los 365
    tableros del diario solo con pistas aprobadas.
- **Fase 3 hecha en local** (26 nov 2026), con la lista aprobada por el usuario:
  - dificultad: 8 letras en el lugar 10, más palabras por nivel desde el lugar 6 y palabras base menos frecuentes en los
    lugares 9–10; tanda 3 con 171 palabras de 8 letras (1.492 palabras con pista aprobada);
  - monedas, estrellas, cofre cada 5 niveles, palabra dorada, frasco, cartero de Tilde, racha con protector y letra de
    regalo de Tilde;
  - `/diario/` (un JSON por tablero en `/diario/dia/N.json`), `/logros/`, `/ajustes/`;
  - escenas SVG de los 10 lugares (`fuente/plantillas/escenas/`), con los nombres de los detalles en `mundos.json`;
  - **sin app instalable y sin service worker** (decisión del usuario, 26 nov 2026): por ahora es un juego de navegador
    y **no se promete app** en ningún texto. Se quitaron el manifiesto, la oferta de instalar y `sw.js`; el juego da de
    baja cualquier service worker que haya quedado;
  - navegador de Facebook o Instagram: después del nivel 3, en la pantalla de nivel completado, una tarjeta opcional
    «Guarda tu avance» (botón con enlace `intent://` en Android, guía de «•••» en iPhone). El avance viaja en el enlace
    (`?enl=`) y se borra de la barra al llegar. Se ofrece una vez y, como mucho, otra a los 3 días. Evento
    `enl_navegador_externo` (ofrecido, abrir, copiar, llego);
  - cómo jugar, quiénes somos, contacto, créditos, privacidad, términos y cookies (`fuente/paginas/`);
  - anuncios simulados: display en portada, cómo jugar, nivel completado y diario completado; anchor en portada,
    lugares y cómo jugar; recompensa solo sin monedas.
- **Pendiente:**
  - datos de `fuente/contenido/sitio.json` (empresa, país, correo): `--estricto` no publica mientras digan POR CONFIRMAR;
  - que el usuario pruebe en su celular;
  - postales y vecinos para coleccionar (no entraron en la lista de la fase 3);
  - más tandas de pistas para llegar a unas 2.500 (más variedad en los niveles).
- **Tandas 4 y 5** (26 nov 2026): 282 palabras de la vida diaria y 296 de 5–6 letras, revisadas y aprobadas por Claude.
  Fuera por doble sentido o tema delicado: yegua, pandero, enano, nicho, cadete, alcalde (agregadas al bloqueo).
  Total: **2.070 palabras con pista aprobada**. El diario tiene **730 tableros (dos años)**: 3 días de 5 letras, 3 de
  6 y 1 de 7 por semana (`npm run generar` genera 730; `--dias N` para otro número).

## Historia y diseño (decididos el 24 nov 2026)
- **Historia: «El pueblo que perdió sus palabras».** Una noche de viento se llevó las palabras del pueblo; el jugador,
  con **Tilde** (una golondrina con alas en forma de virgulilla), las devuelve lugar por lugar.
- Cada mundo es un lugar: Cocina → la panadería, Jardín → la plaza de las flores, Ciudad → la calle principal,
  Mar → el puerto, Montaña → el mirador, Viajes → la estación de tren, Música → el kiosco de música,
  Hogar → las casas del barrio, Bosque → el sendero del bosque, Cielo → el faro y el observatorio
  (`fuente/contenido/mundos.json`).
- El mapa del pueblo (SVG) empieza apagado. El lugar actual se ve en color, y cada lugar terminado se enciende. Cada
  lugar tiene una escena propia con 6 detalles, que aparecen en los niveles 1, 4, 8, 13, 20 y 30 del mundo.
  Por ahora solo está la escena de la panadería.
- **Estilo: cálido y elegante.** Tonos papel y crema, terracota y dorado, títulos con serif del sistema y modo oscuro
  como «el pueblo de noche».
- **El usuario quiere un aspecto premium que no pese:**
  - animaciones solo con `transform` y `opacity`;
  - transiciones entre páginas con View Transitions;
  - sonidos sintetizados con Web Audio, sin archivos;
  - confeti en `canvas`;
  - con «reducir movimiento», las animaciones se apagan.
- **Mecánicas de regreso** (fase 3), con el límite de que generen ganas y no presión:
  - nada se pierde por no entrar, nada se compra y no hay cuentas regresivas falsas;
  - cofre cada 5 niveles, palabra dorada y frasco de palabras extra;
  - el cartero de Tilde: un regalo cada 4 horas, hasta 3 por día;
  - «El Diario del Pueblo»: el desafío diario;
  - racha con protector que se gana jugando;
  - postales y vecinos para coleccionar, y estrellas por nivel.
- **Dificultad en serrucho:** de 3–4 letras en los mundos 1–2 a 7 letras en el mundo 9 y 8 en el mundo 10. Cada 5 niveles va uno de
  respiro, el nivel 30 de cada mundo es más grande, y cada mundo suma una novedad. Si alguien se atasca mucho, Tilde
  ofrece una pista gratis de vez en cuando.
- Los fondos ilustrados de los mundos los genera el usuario con una herramienta de imágenes; Claude los optimiza a
  menos de 100 KB. Otra opción es hacerlos en SVG.
- Tipografía: por ahora, letras del sistema. Una letra propia alojada en el sitio (unos 20–30 KB) se propone más
  adelante, con aprobación (regla 7).

## Cómo se trabaja en local
- `npm run datos`: baja las listas de palabras a `datos/`, en versiones fijas (esa carpeta no va a GitHub).
- `npm run generar`: genera `fuente/contenido/niveles.json`.
- `npm run construir`: arma `dist/` y muestra el peso con gzip.
- `npm start`: servidor en `http://localhost:8080`, y también en la wifi para el celular.
- `npm run dev`: igual que `npm start`, pero cada cambio en `fuente/` rearma `dist/` y recarga solas las páginas
  abiertas. El script de recarga se agrega al servir y nunca queda en `dist/`. Para verlo dentro de VS Code:
  Cmd+Shift+P → «Simple Browser: Show» → `http://localhost:8080`.
- `npm run capturas`, con `npm install` hecho antes en `herramientas/pruebas/`:
  - capturas a 360, 390, 768 y 1280 px, y en modo oscuro;
  - revisa errores de JavaScript y desplazamiento lateral;
  - juega una partida automática;
  - usa el Chrome instalado y bloquea todo lo externo.
- **Pistas:**
  - van en `fuente/contenido/tandas/tanda-NN.json`, cada una con su estado: pendiente, aprobada o descartada;
  - al juego publicado solo entran las aprobadas;
  - **las revisa Claude, no el usuario** (decisión del 26 nov 2026: no tiene tiempo para revisarlas una por una).
    Criterio: descartar toda palabra con doble sentido o que sea vulgar, grosera u ofensiva en algún país de
    Latinoamérica, agregarla a `bloqueo.json` y anotar el motivo en `nota`. Al terminar, se le muestra al usuario la
    lista de las palabras sacadas;
  - la página `http://localhost:8080/revisar/` queda para consultas o cambios puntuales (solo con `npm run dev`, y
    solo desde este computador);
  - si Claude corrige una pista, guarda la original en `original` y el motivo en `nota`.
- **Bloqueo:** `fuente/contenido/bloqueo.json` también bloquea los plurales. Las «dudosas» quedan fuera hasta que el
  usuario las permita en `/revisar/`. Se aplica también a las palabras extra.
- `npm run generar` genera los niveles y el diario solo con pistas aprobadas. `npm run generar:vigentes` usa también
  las pendientes, solo para verlos en local. `npm run revisar` y `npm run probar` son las revisiones automáticas.
  `construir.js --estricto` (antes de publicar) exige que todas las pistas estén aprobadas.
- Los datos de cada nivel van dentro de su propia página, no en un JSON por mundo. Es más rápido y tampoco carga los
  300 niveles de una vez.

## Reglas de trabajo
1. Antes de cambiar algo, mostrar la lista de cambios y esperar la aprobación del usuario. Esto incluye publicar, tocar
   DNS, Cloudflare, Groone, el píxel o la campaña.
2. Guardar en `respaldos/` el estado anterior de todo lo que se cambie en línea, y registrarlo en `respaldos/cambios.jsonl`
   con fecha, recurso, qué cambió y respaldo.
3. Ningún secreto en el chat ni fuera del `.env`: tokens de Cloudflare, claves y contraseñas. El `.env` nunca se sube al sitio.
4. **Separación total de los blogs.** Nunca usar el `.env`, los ID (píxel, cuenta publicitaria, página, data-key de Groone,
   snippets) ni las herramientas de las carpetas de `Blogs Hydra/`. No editar sus archivos. Lo que sirva se copia y se adapta.
5. No borrar nada publicado sin aprobación expresa.
6. Toda imagen del sitio pesa menos de 100 KB (regla del jefe del usuario), en WebP salvo el ícono (PNG).
7. Sin fuentes de Google ni externas: letra del sistema. Si alguna vez se quiere una letra propia, va alojada en el sitio
   y con aprobación.
8. En las pruebas con navegador automático sobre el sitio real, bloquear anuncios, píxeles y analítica para no generar
   impresiones ni eventos falsos. Para probar los anuncios, usar un simulador del GPT de Google, como en los blogs.
9. Nunca anuncios disfrazados de botones ni ubicaciones que provoquen clics: arriesgan la cuenta de Groone, que es de la
   empresa y la comparten todos los blogs.
10. No leer ni comentar el texto ni la parte visual de los anuncios con recompensa (prohibición expresa del usuario).
11. Cada propuesta para el jefe se presenta como «una idea más que puede funcionar», con datos, pros y contras. Nunca
    como salvación ni mencionando la situación de la empresa.
12. Antes de mandar tráfico pagado, comprobar varias veces seguidas que el sitio carga rápido en el celular.

## El juego
**Cómo se juega**
- Arriba, un crucigrama. Abajo, una rueda de 3 a 7 letras.
- Se desliza el dedo por las letras para formar una palabra. Si es del crucigrama, se coloca sola.
- Cada palabra del crucigrama tiene su pista. La pista de la palabra elegida se ve arriba, con flechas ‹ › para cambiar.
- Las palabras válidas que no están en el crucigrama cuentan como «palabras extra» y dan monedas.
- El nivel 1 trae una demostración animada del gesto. El juego tiene que entenderse sin leer instrucciones: el usuario
  rechazó el primer prototipo, un Wordle de chilenismos, por difícil y poco intuitivo.

**Contenido de la versión 1**
- **300 niveles en 10 mundos de 30 niveles.** Cada mundo tiene su color, su fondo ilustrado (WebP de menos de 100 KB) y
  su nombre: Cocina, Jardín, Ciudad, Mar, Montaña, Viajes, Música, Hogar, Bosque y Cielo (por confirmar).
- **Dificultad progresiva:** nivel 1 con 3 letras y 2 palabras, después 4, 5, 6 y 7 letras.
  - Un nivel nunca debe trabar al jugador: palabras comunes y pistas claras.
  - Cada cierto número de niveles va un nivel «de respiro», más fácil.
- **Desafío diario** (`/diario/`):
  - el mismo tablero para todos ese día, según la fecha local del jugador;
  - racha de días seguidos;
  - resultado para compartir por WhatsApp sin revelar las palabras.
  - Es la herramienta principal para que la gente vuelva.
- **Monedas.** Propuesta inicial, que se ajusta con los datos:
  - se empieza con 100;
  - +10 por nivel, +2 por palabra extra y +25 por el desafío diario;
  - revelar una letra cuesta 30 y revelar una palabra cuesta 80;
  - mezclar es gratis.
  - Sin monedas, se puede ver un anuncio con recompensa para recibir una letra. Siempre es opcional y siempre se puede decir
    «No, gracias».
  - Las monedas nunca se compran, nunca se canjean por dinero ni premios y no se transfieren.
- **Logros y estadísticas:** niveles, rachas, palabras extra y días jugados.
- **Ajustes:** sonido, vibración, modo oscuro y tamaño de letra. También «Borrar progreso», con confirmación.
- **Repaso al terminar cada nivel:** las palabras con su definición. Aporta valor real para Google y para el jugador.
- **App instalable: descartada por ahora** (26 nov 2026). Es un juego de navegador; no se promete app.
- **Sin cuentas:** el progreso queda en el navegador, en `localStorage` con prefijo `enl_`. Sincronizar entre dispositivos
  queda para más adelante.

## Contenido: vocabulario y pistas
- **Palabras:** español neutro de uso común en toda Latinoamérica.
  - Se excluyen las que tienen un sentido vulgar u ofensivo en algún país, como coger, concha, pija, polla, cajeta, bicho,
    chucha, pico o paja. La lista de bloqueo de `generar.js` se amplía con estas.
  - También se excluyen las regionales de sentido distinto: guagua, torta, pibe, chamba, etc.
  - Sin temas delicados: violencia, drogas, sexo, muerte, religión ni política.
- **Fuentes de las palabras:**
  - lista de frecuencias hermitdave/FrequencyWords: el código tiene licencia MIT y el contenido sale de OpenSubtitles, con
    CC BY-SA 4.0 según el repositorio. Verificar la licencia y dar el crédito en la página «Créditos»;
  - el diccionario `an-array-of-spanish-words` 2.0.0 (MIT) para validar palabras;
  - ante una duda de significado, el Diccionario de la lengua española (dle.rae.es) y el de americanismos de ASALE.
- **Pistas:** hacen falta unas 2.500 para 300 niveles más el desafío diario de un año.
  - Cortas: 45 caracteres como máximo. Claras, con una sola respuesta razonable.
  - Nunca contienen la palabra ni su raíz: «pie» no se define con «pies».
  - Se escriben en tandas de unas 300, que Claude revisa con el criterio de arriba antes de entrar al juego.
  - Una revisión automática comprueba que cada palabra del crucigrama tenga pista, que la pista no contenga la respuesta y
    que no haya palabras bloqueadas.
- **Niveles:**
  - los genera `generar.js` con una semilla fija, para que siempre salgan iguales;
  - una prueba automática resuelve cada nivel: todas las palabras se forman con sus letras, el crucigrama es válido y
    ninguna palabra se repite en niveles cercanos;
  - el desafío diario sale de un grupo aparte de tableros, para no repetir los niveles normales.

## Cómo se arma por dentro
- **Sitio estático, sin WordPress ni base de datos.**
  - Un script de Node arma la carpeta `dist/` con todas las páginas.
  - Se publica en **Cloudflare Pages** con `wrangler`. El token va en el `.env`.
  - Dominio `enletrados.com` en Cloudflare, con certificado automático.
- **JavaScript propio, sin frameworks.** Primera carga: menos de 100 KB transferidos sin contar los anuncios.
  - Los datos de cada mundo van en su propio JSON, para no cargar los 300 niveles de una vez.
- **Direcciones:**
  - `/`: portada con «Jugar», «Desafío diario» y los mundos;
  - `/nivel/N/`: una página por nivel. La viñeta de Google solo sale al cambiar de página, por eso «Siguiente nivel» es un
    enlace real a `/nivel/N+1/`;
  - `/diario/`, `/mundos/`, `/como-jugar/`, `/logros/`, `/ajustes/`;
  - páginas legales: `/privacidad/`, `/terminos/`, `/cookies/`, `/quienes-somos/`, `/contacto/`, `/creditos/`;
  - `404` propia.
- **Google:**
  - en el índice: portada, cómo jugar, mundos y páginas legales;
  - fuera del índice (`noindex`): las páginas de nivel, para no parecer cientos de páginas de poco contenido, y las de
    logros y ajustes;
  - `sitemap.xml` y `robots.txt` propios.
- `_headers` de Cloudflare: caché larga para JS, CSS, imágenes y JSON con nombre versionado; corta para el HTML.
- **Herramientas previstas en `herramientas/`:**
  - `generar.js`: niveles;
  - `construir.js`: arma `dist/`;
  - `revisar_pistas.js`: revisión automática de las pistas;
  - `publicar.sh`: `wrangler pages deploy`, con aprobación;
  - `pruebas/`: puppeteer con el GPT simulado, capturas a 360, 390, 768 y 1280 px, y velocidad en 4G simulada.
    Se instala con `npm install` dentro de la carpeta.

## Anuncios (Groone)
**Regla principal:** ningún anuncio mientras se juega ni cerca del crucigrama, la rueda o los botones del juego.

| Lugar | Formato | Cuándo |
|---|---|---|
| Botón de ayuda sin monedas | Anuncio con recompensa | Solo si el jugador lo pide; uno a la vez. La recompensa es una letra. |
| Paso al nivel siguiente | Viñeta | Al navegar a `/nivel/N+1/`, desde el nivel 3 y con límite de frecuencia. Nunca al abrir el sitio. |
| Pantalla «nivel completado» | Display | Debajo del botón «Siguiente nivel», con 32 px de margen o más. |
| Portada, mundos, cómo jugar | Display y anchor | Fuera de la partida. |
| Durante la partida | Ninguno | El anchor tampoco va en las páginas de nivel: quedaría junto a la rueda. |

- **Muro de ofertas** (Offerwall de Google): apagado en todo el sitio. Se bloquea por código con
  `googlefc.controlledMessagingFunction`, definida antes del tag.
- **Viñeta en los primeros niveles:** los enlaces de los niveles 1 y 2 llevan `data-google-interstitial="false"`.
- **Consultas a Groone por escrito antes de construir la versión pública:**
  - si aceptan el sitio, qué formatos dan y si hay intersticial para juegos (`GAME_MANUAL_INTERSTITIAL`, de acceso limitado);
  - el eCPM esperado en Latinoamérica;
  - si hace falta un aviso de consentimiento (CMP) para visitas de Europa.
  - Se les muestra el prototipo.
- **Alternativa en paralelo** (opcional, con aprobación): postular a AdSense para juegos (H5 Games Ads, beta cerrada).
  Así no se concentra todo en una sola cuenta.
- `ads.txt` en la raíz del dominio con la línea que dé Groone.
- **Alarmas, que pausan la campaña de inmediato y se avisan:**
  - un CTR de los anuncios muy por encima de lo normal del display. En los blogs, el reward llegó a 45–48 % y eso ya
    obligó a poner un aviso;
  - descuentos por tráfico inválido;
  - cualquier aviso de Groone, Google o Meta.

## Medición
- Píxel de Meta y propiedad de Analytics **propios de Enletrados**: nunca los de los blogs.
  - Si se usa la misma cuenta publicitaria de los blogs: conversiones con prefijo «ENL - …» y campañas con prefijo `enl_`.
- Eventos:
  - `enl_inicio`;
  - `enl_nivel_1`, `enl_nivel_3`, `enl_nivel_5` y `enl_nivel_10`;
  - `enl_diario`, `enl_ayuda` (con tipo: moneda o anuncio), `enl_navegador_externo` y `enl_regreso`.
  - `enl_regreso` es la primera visita de un día distinto al de la llegada. Se calcula con `localStorage`.
- **Números que deciden:**
  - ingreso por jugador = ingresos de Groone ÷ jugadores que llegan desde Meta;
  - costo por jugador;
  - niveles por visita;
  - regreso al día siguiente y a los 7 días;
  - RPM por sesión, que importa más que el eCPM.
- Seguimiento diario en `informes/campana/` (`datos_diarios.csv` y `seguimiento.md`), con las capturas que manda el usuario.

## Campaña de Meta (prueba)
- **Presupuesto:** 50 USD como máximo durante 7 días, unos 1.000 jugadores. Solo después del visto bueno de Groone.
- **Público y lugares:**
  - Chile primero, por su CPM barato, y después otros países;
  - de 35 a 65 años, con intereses en crucigramas, sopas de letras y juegos de palabras;
  - solo móviles, en Feeds, Stories y Reels de Facebook e Instagram, sin Audience Network.
- **Objetivo y conversión:** Clientes potenciales, con conversión en el sitio.
  - Optimiza por **«ENL - Nivel 3»**, el evento estándar «Cliente potencial» sobre `enl_nivel_3`: es alguien que de verdad
    jugó, no solo que abrió la página.
  - Advantage+ y las mejoras de contenido apagadas.
- **Creativos:**
  - video vertical de la partida real, hecho con puppeteer y ffmpeg;
  - sin premios en dinero, sin cifras inventadas y sin botones falsos;
  - lo que muestra el anuncio es lo que se encuentra al entrar: se juega al instante, sin anuncio de entrada.
- Parámetros de URL: `utm_source=facebook&utm_medium=paid&utm_campaign={{campaign.name}}&utm_content={{ad.name}}`.

## Ruta
0. **Permisos y consultas** (sin costo):
   - el usuario compra `enletrados.com`;
   - consulta por escrito a Groone con el prototipo;
   - opcional: postular a AdSense para juegos.
1. **Base técnica:**
   - copiar el prototipo a esta carpeta;
   - el script de construcción, una página por nivel, el sistema de mundos y la portada;
   - todo en local.
2. **Contenido:**
   - vocabulario neutro y lista de bloqueo;
   - unas 2.500 pistas en tandas revisadas por el usuario;
   - 300 niveles y los tableros del desafío diario, con sus pruebas automáticas.
3. **Juego completo:**
   - desafío diario, monedas, logros, sonidos y ajustes;
   - páginas legales, con las leyes de datos de los países de la región sin plazos fijos, y créditos;
   - anuncios simulados en los lugares acordados.
4. **Pruebas locales:**
   - capturas a 360, 390, 768 y 1280 px, sin errores de JavaScript y sin desplazamiento lateral;
   - velocidad en 4G simulada;
   - el usuario lo juega en su celular con un servidor local.
5. **Publicación** (con aprobación):
   - Cloudflare Pages con el dominio;
   - tag de Groone, `ads.txt`, píxel y Analytics;
   - revisión de Groone antes de recibir tráfico.
6. **Prueba pagada:** 7 días, máximo 50 USD.
7. **Decisión:**
   - **Seguir:** al día siguiente vuelve el 25 % o más y el ingreso de 7 días se acerca al costo del jugador. Se sube el
     presupuesto de a poco y se planean los otros juegos: sopa de letras, crucigrama del día, adivina la palabra.
   - **Ajustar una vez:** vuelve entre el 15 % y el 25 %. Se mejora el juego o el desafío diario y se repite una prueba
     igual de chica.
   - **Parar:** vuelve menos del 15 % y la primera visita deja menos del 30 % de su costo, o hay cualquier alarma.

## Proyección (de la propuesta al jefe, 24 nov 2026)
Son escenarios con supuestos, no promesas.
- **Costo por jugador:** unos 0,05 USD, sacado de la campaña de Tu Bono Hoy. Cada visita a la landing costó unos 190 COP,
  con el dólar a 3.000 COP.
- **Ingreso de la primera visita:** unos 0,03 USD con todos los anuncios llenos. Supone 6 niveles, 2 viñetas, 6 bloques de
  display y medio reward.

| Por jugador (30 días) | Prudente | Medio | Bueno |
|---|---|---|---|
| Ingreso de la primera visita | 0,010 USD | 0,020 USD | 0,030 USD |
| Visitas de regreso | 0,5 | 2 | 4 |
| Ingreso total | 0,015 USD | 0,060 USD | 0,150 USD |
| Ingreso ÷ costo | 30 % | 120 % | 300 % |

- **eCPM de referencia de los blogs:**
  - reward: 15,6–18,4 USD;
  - viñeta: unos 6,7 USD;
  - display: 1,6–2,6 USD;
  - anchor: unos 0,9 USD.
  - En un sitio de juegos pueden ser distintos: los anunciantes de juegos pagan menos que los de finanzas.
- **Lo que decide el resultado** es cuánta gente vuelve, no el anuncio. La primera visita sola no se paga.

## Riesgos
- **Clics accidentales** en un juego táctil. Por eso no hay anuncios cerca de los controles y se vigila el CTR.
- **Que la cuenta de Groone se vea afectada:** es compartida con los blogs. Por eso va la revisión previa por escrito y
  ninguna fuente de tráfico dudosa.
- **Mucha competencia** en juegos de palabras, sobre todo en apps. El fuerte de Enletrados es jugar al instante, sin
  instalar nada, en español neutro y con pistas.
- **Trabajo constante:** pistas, tableros diarios y revisión de palabras.
- **Formatos especiales para juegos** con acceso limitado: el intersticial de juegos y H5 Games Ads.
