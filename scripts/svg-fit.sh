#!/usr/bin/env bash
# Serves this checkout over HTTP on a free local port and runs
# scripts/svg-fit.mjs against it: every drawing on every page, measured in
# headless Chrome. See the header of svg-fit.mjs for what it checks and what
# it does not.
#
# NOT a gate yet, and not in any workflow. It is a tool until its
# false-positive rate has been read off a reviewed sweep.
#
#   scripts/svg-fit.sh --out /tmp/svgfit                 # the whole site
#   scripts/svg-fit.sh --out /tmp/svgfit --pages services/qryx.html --viewports 1440x900
#   ROOT=/path/to/copy scripts/svg-fit.sh --out /tmp/x   # measure another tree
#
# Needs Node 22 or newer (built-in WebSocket), python3, and Chrome (CHROME
# overrides the macOS default path).

set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
root="${ROOT:-$(cd "$here/.." && pwd)}"

command -v node >/dev/null || { echo "svg-fit: node not found" >&2; exit 64; }
command -v python3 >/dev/null || { echo "svg-fit: python3 not found" >&2; exit 64; }

port="$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1", 0)); print(s.getsockname()[1]); s.close()')"
python3 -m http.server "$port" --bind 127.0.0.1 --directory "$root" >/dev/null 2>&1 &
server=$!
trap 'kill "$server" 2>/dev/null || true' EXIT INT TERM

for _ in $(seq 1 100); do
  if python3 -c "import urllib.request,sys; urllib.request.urlopen('http://127.0.0.1:$port/', timeout=1)" 2>/dev/null; then break; fi
  sleep 0.1
done

node "$here/svg-fit.mjs" --base "http://127.0.0.1:$port/" --root "$root" "$@"
