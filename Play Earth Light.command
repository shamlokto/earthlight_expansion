#!/bin/zsh
# Double-click to play: starts the local server with your ROM and English patch and opens the
# game. Close this window (or press Ctrl-C) to stop the server.
cd "${0:A:h}"
ROM="$HOME/Downloads/Earth Light (Japan).zip"
PATCH="$HOME/Downloads/Earthlight_1_English.zip"
[[ -f "$ROM" ]] || { echo "ROM not found: $ROM"; read -k1 "?Press any key to close."; exit 1; }
args=(--rom "$ROM")
[[ -f "$PATCH" ]] && args+=(--patch "$PATCH") || echo "English patch not found ($PATCH): playing in Japanese."

# first free port from 8765
port=8765
while lsof -iTCP:$port -sTCP:LISTEN >/dev/null 2>&1; do (( port++ )); done

python3 serve.py --port $port $args &
server=$!
trap 'kill $server 2>/dev/null' EXIT INT TERM
sleep 1
open "http://localhost:$port/game.html"
echo "Earth Light is running at http://localhost:$port/game.html. Close this window to stop."
wait $server
