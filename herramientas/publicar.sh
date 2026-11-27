#!/bin/sh
# Publica Enletrados en Cloudflare Pages (https://enletrados.cosmovil.com.mx). Pide confirmación antes de subir.
# Uso: sh herramientas/publicar.sh        (necesita el .env con el token; ver .env.ejemplo)
# Qué hace: revisa pistas y niveles, arma en modo estricto (sin anuncios simulados y con los datos legales completos),
# guarda un respaldo del sitio en respaldos/, sube con wrangler y anota el cambio en respaldos/cambios.jsonl.
set -e
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "Falta el archivo .env (copia .env.ejemplo y completa el token)."; exit 1; }
set -a; . ./.env; set +a
[ -n "$CLOUDFLARE_API_TOKEN" ] && [ -n "$CLOUDFLARE_ACCOUNT_ID" ] && [ -n "$CF_PROYECTO" ] || { echo "Faltan valores en el .env."; exit 1; }
[ -z "$(git status --porcelain)" ] || { echo "Hay cambios sin guardar en git. Haz commit antes de publicar, para saber qué versión queda en línea."; exit 1; }

echo "1/4 Revisando pistas y niveles…"
node herramientas/revisar_pistas.js --estricto >/dev/null
node herramientas/probar_niveles.js | tail -1
echo "2/4 Armando el sitio en modo estricto…"
node herramientas/construir.js --estricto | grep -E "Modo|Primera"

COMMIT=$(git rev-parse --short HEAD); FECHA=$(date +%Y-%m-%d_%H%M)
echo ""
echo "Se va a publicar la versión $COMMIT en el proyecto «$CF_PROYECTO» de Cloudflare."
printf "¿Publicar ahora? Escribe «si» para continuar: "; read RESP
[ "$RESP" = "si" ] || { echo "No se publicó nada."; exit 0; }

echo "3/4 Guardando respaldo…"
RESPALDO="respaldos/sitio-$FECHA-$COMMIT.zip"
(cd dist && zip -qr "../$RESPALDO" .)
echo "4/4 Subiendo a Cloudflare Pages…"
npx --yes wrangler@4 pages deploy dist --project-name "$CF_PROYECTO" --branch main --commit-hash "$COMMIT" --commit-message "Enletrados $COMMIT"
printf '{"fecha":"%s","recurso":"Cloudflare Pages · %s","cambio":"publicación de la versión %s","respaldo":"%s"}\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$CF_PROYECTO" "$COMMIT" "$RESPALDO" >> respaldos/cambios.jsonl
echo "Listo. Para volver atrás: en Cloudflare, Workers y Pages › $CF_PROYECTO › Implementaciones, o subiendo $RESPALDO."
