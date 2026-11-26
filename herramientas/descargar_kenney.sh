#!/bin/sh
# Baja las piezas de Kenney «Sketch Town» y su expansión (licencia CC0, www.kenney.nl) a datos/kenney/.
# Esa carpeta no va a GitHub: en el repositorio solo quedan las imágenes ya armadas (fuente/imagenes/).
set -e
D="$(dirname "$0")/../datos/kenney"; mkdir -p "$D"; cd "$D"
J=$(mktemp)
for a in sketch-town sketch-town-expansion; do
  P="https://kenney.nl/assets/$a"
  id=$(curl -sL -A "Mozilla/5.0" -c "$J" -b "$J" "$P" | grep -o "data-download-id='[0-9a-f]*'" | head -1 | cut -d"'" -f2)
  u=$(curl -sL -A "Mozilla/5.0" -c "$J" -b "$J" -H "Referer: $P" "https://kenney.nl/download-link/$id" | python3 -c "import sys,json;print(json.load(sys.stdin)['url'])")
  curl -sL -A "Mozilla/5.0" -c "$J" -b "$J" -H "Referer: $P" "$u" -o "$a.zip"
  mkdir -p "$a"; unzip -qo "$a.zip" -d "$a"; rm "$a.zip"
  echo "$a: $(find "$a" -name '*.png' | wc -l | tr -d ' ') piezas"
done
rm -f "$J"
