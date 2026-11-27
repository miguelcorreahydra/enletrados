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

## Día 1 — 27 nov 2026 (parcial)
- Meta: 311 impresiones, CTR de enlace 4,5 %, 10 visitas, 7 llegaron al nivel 3 (~369 COP c/u). Muy buen embudo.
- Groone: 37 impresiones, relleno 57 % (normal en un sitio nuevo), eCPM 1,35 USD, ingreso 0,05 USD (se completa
  con atraso). Viñeta: 3 clics en 9 impresiones; el usuario hizo clics de prueba, así que no se lee todavía.
- Decisión: ninguna. Dejar correr.
