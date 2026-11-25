#!/bin/sh
# Descarga las listas de palabras que usa generar.js, en versiones fijas, a datos/ (carpeta fuera de GitHub).
#   - FrequencyWords (Hermit Dave): código MIT, contenido CC BY-SA 4.0 (sale de OpenSubtitles 2018).
#     Se da crédito en /creditos/.
#   - an-array-of-spanish-words 2.0.0 (MIT), desde npm: diccionario para validar palabras.
set -eu
cd "$(dirname "$0")/.."
mkdir -p datos
FW_COMMIT=525f9b560de45753a5ea01069454e72e9aa541c6
FW_URL="https://raw.githubusercontent.com/hermitdave/FrequencyWords/$FW_COMMIT"
curl -fsSL "$FW_URL/content/2018/es/es_50k.txt" -o datos/es_50k.txt
curl -fsSL "$FW_URL/LICENSE" -o datos/LICENCIA_FrequencyWords.txt
printf 'FrequencyWords, commit %s\nCódigo: MIT. Contenido: CC BY-SA 4.0 (README del repositorio).\n' "$FW_COMMIT" > datos/FUENTES.txt

TMP=$(mktemp -d)
( cd "$TMP" && npm pack an-array-of-spanish-words@2.0.0 --silent >/dev/null && tar -xzf an-array-of-spanish-words-2.0.0.tgz )
cp "$TMP/package/index.json" datos/diccionario.json
cp "$TMP/package/license" datos/LICENCIA_an-array-of-spanish-words.txt 2>/dev/null || cp "$TMP/package/LICENSE"* datos/LICENCIA_an-array-of-spanish-words.txt 2>/dev/null || true
echo "an-array-of-spanish-words 2.0.0 (npm). Licencia: MIT." >> datos/FUENTES.txt
rm -rf "$TMP"
wc -l datos/es_50k.txt | sed 's/^/Frecuencias: /'
node -e 'console.log("Diccionario:", require("./datos/diccionario.json").length, "palabras")'
