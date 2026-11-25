# Enletrados

Sitio de juegos de palabras en español neutro para Latinoamérica. El primer juego es un crucigrama que se arma
deslizando el dedo por una rueda de letras, con una pista para cada palabra.

- Sitio estático: sin WordPress ni base de datos. El progreso del jugador queda en su navegador (`localStorage`, prefijo `enl_`).
- JavaScript propio, sin frameworks.
- Alojamiento previsto: Cloudflare Pages, con el dominio `enletrados.com`.

## Estructura prevista
- `herramientas/`: `generar.js` (niveles), `construir.js` (arma `dist/`), `revisar_pistas.js`, `publicar.sh` y `pruebas/`.
- `dist/`: el sitio armado. No se sube al repositorio; se genera con `construir.js`.
- `respaldos/`: estado anterior de todo lo que se cambie en línea, con su registro en `cambios.jsonl`.

## Reglas
- El `.env` nunca se sube, ni al repositorio ni al sitio.
- Publicar en Cloudflare solo con aprobación.

Las decisiones y reglas completas están en [`CLAUDE.md`](CLAUDE.md).
