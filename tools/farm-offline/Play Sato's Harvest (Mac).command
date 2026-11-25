#!/bin/sh
# Sato's Harvest offline (Mac and Linux): serves this folder at http://localhost:8777/ and opens the game.
# Browsers will not run the game straight from files, so a tiny local server is needed. It uses Python 3
# (or Ruby, which older Macs have); it only answers this computer. Keep the window open while you play.
cd "$(dirname "$0")" || exit 1
PORT=8777   # always the same port, so the browser keeps your saves between sessions
URL="http://localhost:$PORT/farm.html"
open_url() { sleep 1; if command -v open >/dev/null 2>&1; then open "$URL"; elif command -v xdg-open >/dev/null 2>&1; then xdg-open "$URL"; fi; }
echo "Sato's Harvest is running at $URL"
echo "Keep this window open while you play. Close it (or press Ctrl+C) to stop."
open_url &
if command -v python3 >/dev/null 2>&1 && python3 -c 'import http.server' >/dev/null 2>&1; then exec python3 -m http.server "$PORT" --bind 127.0.0.1
elif command -v python >/dev/null 2>&1; then exec python -m http.server "$PORT" --bind 127.0.0.1
elif command -v ruby >/dev/null 2>&1; then exec ruby -run -e httpd . -p "$PORT" -b 127.0.0.1
elif command -v php >/dev/null 2>&1; then exec php -S "127.0.0.1:$PORT"
else echo "No Python, Ruby or PHP found. On a Mac, install Python 3 from python.org (or run: xcode-select --install), then try again."; read -r _; fi
