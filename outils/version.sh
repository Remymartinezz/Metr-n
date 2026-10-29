#!/bin/sh
# Ajoute ?v=<date> aux fichiers CSS et JS des pages : le navigateur recharge les nouveaux après chaque publication.
# À lancer avant chaque commit : sh outils/version.sh
v=$(date +%Y%m%d%H%M%S)
for f in *.html; do
  sed -i -E "s#(href|src)=\"(tokens\.css|style\.css|app\.js|mascot\.js|nav\.js)(\?v=[0-9]+)?\"#\1=\"\2?v=$v\"#g" "$f"
done
echo "version $v"
