#!/bin/sh
# Serve Dress & Learn on your home Wi-Fi so the iPad can open it.
# Usage: ./serve.sh        (stop with Ctrl+C)
cd "$(dirname "$0")" || exit 1
PORT="${PORT:-8000}"
NAME="$(scutil --get LocalHostName 2>/dev/null)"
IP="$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null)"
echo "Dress & Learn is running. On the iPad, open Safari and go to:"
[ -n "$NAME" ] && echo "   http://$NAME.local:$PORT"
[ -n "$IP" ] && echo "   http://$IP:$PORT   (if the .local address doesn't work)"
echo "Keep this Mac awake and on the same Wi-Fi. Press Ctrl+C to stop."
# caffeinate keeps the Mac from going to sleep while the game is being served.
exec caffeinate -i python3 -m http.server "$PORT" --bind 0.0.0.0
