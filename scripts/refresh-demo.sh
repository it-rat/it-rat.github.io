#!/usr/bin/env bash
#
# Rebuilds the published demo from genaryx and records where it came from.
#
# The counterpart to scripts/demo-bundle-current.sh: that one says the copy is
# stale, this one is the whole of what to do about it. A gate whose fix lives in
# somebody's memory is a gate that gets argued with rather than run.
#
# Two flags in the build command are load-bearing and neither is guessable, so
# this calls genaryx's own `build:demo` rather than restating them; see that
# repo's CLAUDE.md for what each one breaks when it is missing.
set -euo pipefail

cd "$(dirname "$0")/.."
SITE=$PWD
GENARYX=${GENARYX_DIR:-../genaryx}

[ -d "$GENARYX/apps/web" ] \
  || { echo "No genaryx checkout at $GENARYX. Set GENARYX_DIR." >&2; exit 1; }
# Absolute from here on. It defaults to a RELATIVE path, and this script changes
# directory three times: the second `cd "$GENARYX"` then resolved against
# wherever it had got to, which is how the first run of this failed.
GENARYX=$(cd "$GENARYX" && pwd)

cd "$GENARYX"
branch=$(git rev-parse --abbrev-ref HEAD)
dirty=$(git status --porcelain -- apps/web | head -1)
if [ "$branch" != "main" ] || [ -n "$dirty" ]; then
  # Not refused: building from a branch is how a change is previewed before it
  # merges. But it is said out loud, because the copy is going to be published
  # and the gate will then report it as behind main, correctly.
  echo "NOTE: building from '$branch'${dirty:+ with uncommitted changes in apps/web}."
  echo "      The published demo will not match main until this lands there."
fi

commit=$(git log -1 --format=%H -- apps/web)
( cd "$GENARYX/apps/web" && npm run build:demo >/dev/null 2>&1 ) \
  || { echo "genaryx's build:demo failed. Run it there to see why." >&2; exit 1; }

dist="$GENARYX/apps/web/dist"
bundle=$(cd "$dist" && ls assets/index-*.js)
stylesheet=$(cd "$dist" && ls assets/index-*.css)

cd "$SITE"
# Delete the previous hashed files rather than copying over them: the names
# change per build, so a plain copy leaves the old pair in place and served.
rm -f demo/assets/index-*.js demo/assets/index-*.css
cp -R "$dist"/assets/. demo/assets/
cp "$dist"/index.html demo/index.html

python3 - "$commit" "$bundle" "$stylesheet" <<'PY' > demo/BUILD.json
import json, sys
print(json.dumps({
    "_": "Where demo/ came from. Checked by scripts/demo-bundle-current.sh;"
         " written by scripts/refresh-demo.sh. Do not edit by hand.",
    "source": "TAIPANBOX/genaryx",
    "path": "apps/web",
    "commit": sys.argv[1],
    "bundle": sys.argv[2],
    "stylesheet": sys.argv[3],
    "built_with": "npm run build:demo",
}, indent=2))
PY

echo "demo/ rebuilt from ${commit:0:12}"
echo "  $bundle"
echo "  $stylesheet"
./scripts/demo-bundle-current.sh
