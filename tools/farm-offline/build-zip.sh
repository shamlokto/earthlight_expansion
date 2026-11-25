#!/bin/bash
# Builds the offline copy of Sato's Harvest as a zip: the game, its art, the wiki, a tiny local server and launchers.
#   bash tools/farm-offline/build-zip.sh [project dir] [output zip]
set -e
P=$(cd "${1:-.}" && pwd); OUT=${2:-dist/sato-harvest-offline.zip}
T=$(mktemp -d); G="$T/Sato's Harvest"; mkdir -p "$G"
cd "$P"
mkdir -p "$G/css" "$G/js/expansion" "$G/js/vendor" "$G/art"
cp farm.html farm-wiki.html "$G/"
cp css/farm.css css/farm-fonts.css "$G/css/"
cp -r fonts "$G/"
cp -r js/farm "$G/js/"; cp -r js/vendor/three "$G/js/vendor/"; cp js/expansion/portraits.js js/expansion/villain.js "$G/js/expansion/"
cp -r art/farm "$G/art/"; find "$G/art" \( -name _tmp -o -name _new \) -prune -exec rm -rf {} + ; find "$G" -name .DS_Store -delete
cp tools/farm-offline/serve.ps1 tools/farm-offline/play.sh "tools/farm-offline/Play Sato's Harvest (Windows).bat" "tools/farm-offline/Play Sato's Harvest (Mac).command" tools/farm-offline/README.txt "$G/"
chmod +x "$G/play.sh" "$G/Play Sato's Harvest (Mac).command"
# mark it as the offline copy: the title screen hides the download button and the other games' links
sed -i 's|<head>|<head><script>window.FARM_OFFLINE = true;</script>|' "$G/farm.html"
sed -i 's/\r*$/\r/' "$G/Play Sato's Harvest (Windows).bat"   # Windows line endings for the batch file
mkdir -p "$(dirname "$OUT")"; OUT=$(cd "$(dirname "$OUT")" && pwd)/$(basename "$OUT"); rm -f "$OUT"
(cd "$T" && zip -qr -X "$OUT" "Sato's Harvest")
rm -rf "$T"
echo "built $OUT ($(du -h "$OUT" | cut -f1))"
