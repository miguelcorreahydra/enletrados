# Seguimiento de la campaña de prueba (Meta → Enletrados)

Campaña: Colombia, México, Chile y Argentina; 20.000 COP diarios; optimiza por «Cliente potencial» (nivel 3).
Inicio: 27 nov 2026. Decisiones: lectura el día 3; decisión el día 7 (criterios en CLAUDE.md: regreso al día
siguiente ≥ 25 % seguir, 15–25 % ajustar, < 15 % parar).

Cada día el usuario envía capturas de **ayer, día completo**: Meta (vista «Enletrados» + desglose por país), Groone
(Enletrados por bloque) y, desde el día 2, GA4 (jugadores, niveles por jugador, regreso). Los números van a
`datos_diarios.csv`; aquí, la lectura de cada día.

## Alarmas (pausar y avisar)
- CTR de un bloque de Groone muy por encima de lo normal con volumen suficiente (viñeta > ~10 % con 200+ impresiones).
- Descuentos por tráfico inválido.
- Cualquier aviso de Groone, Google o Meta.

## Día 1 — 27 nov 2026 (parcial, leído el mismo día)
- Meta: 311 impresiones, CTR de enlace 4,5 %, 10 visitas, 7 llegaron al nivel 3 (~369 COP c/u). Muy buen embudo.
- Groone: 37 impresiones, relleno 57 % (normal en un sitio nuevo), eCPM 1,35 USD, ingreso 0,05 USD (se completa
  con atraso). Viñeta: 3 clics en 9 impresiones; el usuario hizo clics de prueba, así que no se lee todavía.
- Decisión: ninguna. Dejar correr.

## Día 1 completo — 27 nov 2026 (leído el 28 nov)
- **Meta:** 12.524 COP; 1.850 impresiones; CTR de enlace 4,22 %; 55 visitas; **22 llegaron al nivel 3, a 569 COP c/u**.
  Por anuncio: 3 = 12 resultados (538 COP), 1 = 7 (317 COP, el más barato), 4 = 3 (1.150 COP, el peor), 2 = casi sin entrega.
- **Groone:** 319 impresiones, relleno 49 %, eCPM 0,88 USD, **ingreso 0,28 USD (840 COP) = 6,7 % del gasto**.
  Viñeta 143 imp, eCPM 1,54, CTR 4,2 % (con clics de prueba del usuario): normal. Display de nivel completado eCPM 0,35.
  Rewards: 3 impresiones.
- **GA4:** ~54 jugadores reales (CO 21, MX 21, AR 10, CL 1); los demás son revisores de Meta (EE. UU., Irlanda, Suecia,
  ~10 s). Sesión media: México 11 min, Argentina 5, Colombia 4. De los que abren el nivel 1, ~55 % pasa al 2; del 3 al 4
  se va el 36 % (coincide con la primera viñeta); 9 llegaron al nivel 10 y 4 al 20.
- **Regalo de Tilde:** 63 ofrecidos, 1 aceptado (1,6 %). +30 monedas no atrae. Cofre doble: 3 de 4 pedidos sin anuncio.
- Decisión: ninguna en la campaña (día 3). Para conversar: premio del regalo, caída del nivel 1 y viñeta en el paso 3→4.
