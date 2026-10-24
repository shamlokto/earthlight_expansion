#!/bin/bash
# Builds the static website (GitHub Pages) into a folder: the campaign (game.html) is the front
# door at index.html and the lab moves to lab.html.
# No ROM or game data is included: each browser loads the player's own ROM once.
#   bash tools/build-site.sh [project dir] [output dir]
set -e
P=$(cd "${1:-.}" && pwd); W=${2:-_site}
rm -rf "$W" && mkdir -p "$W" && W=$(cd "$W" && pwd)
cd "$P"
cp -r css js missions README.md "$W/"
for f in game editor expansion fightlab play soundlab wiki; do cp "$f.html" "$W/"; done
cp index.html "$W/lab.html"
cd "$W"
find . -name .DS_Store -delete
grep -rl 'href="index.html"' . | xargs -r sed -i 's|href="index.html"|href="lab.html"|g'
cp game.html index.html
touch .nojekyll
echo "site built in $W: $(find . -type f | wc -l) files"
