#!/bin/sh
# Arma el sitio para publicar y lo deja en un ZIP, para subirlo a mano en Cloudflare
# (Workers y Pages › el proyecto › Crear implementación › arrastrar el ZIP). No necesita token.
# Uso: sh herramientas/paquete.sh
set -e
cd "$(dirname "$0")/.."
node herramientas/revisar_pistas.js --estricto >/dev/null
node herramientas/probar_niveles.js | tail -1
node herramientas/construir.js --estricto | grep -E "Modo|Primera"
COMMIT=$(git rev-parse --short HEAD); ZIP="respaldos/enletrados-$(date +%Y-%m-%d)-$COMMIT.zip"
rm -f "$ZIP"; (cd dist && zip -qr "../$ZIP" .)
echo "Paquete listo: $ZIP ($(du -h "$ZIP" | cut -f1)). Súbelo en Cloudflare Pages."
