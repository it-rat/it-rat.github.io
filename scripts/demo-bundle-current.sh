#!/usr/bin/env bash
#
# Fails when the demo under /demo is a build of a genaryx that has moved on.
#
# `demo/` is not built here. It is a static copy of `genaryx/apps/web/dist`,
# produced by `npm run build:demo` in that repo and pasted in by hand. Nothing
# about that copy says where it came from, so the console on it-rat.com can sit
# months behind the console in the repository and every page still renders,
# every link still works, and no check anywhere notices. That is exactly what
# happened on 2026-08-03: the site served a build from an unmerged branch, and
# the only reason anybody knew was that the person who built it happened to
# remember.
#
# So the copy carries its provenance in `demo/BUILD.json`, and this compares it
# against the source.
#
# # What it compares, and why not the obvious thing
#
# NOT genaryx's `main` tip. Most commits there do not touch the web app, and a
# check that fails on every unrelated merge is a check somebody turns off in a
# fortnight. It compares the last commit that touched `apps/web`, which is the
# only thing that can change the bundle.
#
# The local half runs with no network: the recorded filenames must be the ones
# `demo/index.html` actually loads, those files must exist, and no other hashed
# asset may linger beside them. That last one is its own trap: Vite names by
# content hash, so a refresh that forgets to delete the previous files leaves
# them served forever, and the wrong one can be picked up by anything holding an
# old URL.
set -euo pipefail

cd "$(dirname "$0")/.."

SOURCE_REPO="TAIPANBOX/genaryx"
SOURCE_PATH="apps/web"
MANIFEST="demo/BUILD.json"

fail() { echo "FAIL: $*" >&2; exit 1; }

[ -f "$MANIFEST" ] || fail "$MANIFEST is missing. The demo copy has no provenance,
      so nothing can tell whether it is current. Refresh it with
      scripts/refresh-demo.sh, which writes this file."

# python3 rather than jq: it is on every runner and every mac, and jq is not.
#
# Its exit status is checked instead of being read through a here-string. The
# first version piped the substitution straight into `read`, which discards the
# status, so a manifest with a missing key produced empty values and then a
# baffling complaint about a file called "demo/". A parse error has to say it is
# a parse error.
if ! parsed=$(python3 - "$MANIFEST" <<'PY'
import json, sys
# The heredoc is quoted, so the shell does not expand anything in here. The
# path comes in as an argument.
path = sys.argv[1]
try:
    m = json.load(open(path))
except Exception as e:
    sys.exit("%s does not parse as JSON: %s" % (path, e))
missing = [k for k in ("commit", "bundle", "stylesheet") if not m.get(k)]
if missing:
    sys.exit("%s has no %s. It is written by scripts/refresh-demo.sh; a "
             "hand-edited one is how it stops describing the copy."
             % (path, ", ".join(missing)))
print(m["commit"], m["bundle"], m["stylesheet"])
PY
); then
  fail "$parsed"
fi
read -r recorded bundle stylesheet <<EOF
$parsed
EOF

# The manifest must describe the files that are actually there. Without this it
# is a note somebody can forget to update, which is what it exists to replace.
for f in "$bundle" "$stylesheet"; do
  [ -f "demo/$f" ] || fail "$MANIFEST names demo/$f, which does not exist."
  grep -q "$f" demo/index.html \
    || fail "$MANIFEST names $f, but demo/index.html does not load it.
      The manifest and the copy beside it disagree."
done

# Stale hashed assets: served forever, and invisible until something loads one.
# A glob rather than `ls | grep`, so a filename with a space or a newline in it
# is one entry here rather than several.
strays=""
for f in demo/assets/index-*.js demo/assets/index-*.css; do
  [ -e "$f" ] || continue                      # an unmatched glob is a literal
  case "$f" in
    "demo/$bundle"|"demo/$stylesheet") continue;;
  esac
  strays="$strays
        $f"
done
[ -z "$strays" ] || fail "demo/assets holds a previous build's files:$strays
      Delete them: a content-hashed name is served for as long as it exists."

if [ "${DEMO_BUNDLE_SKIP_REMOTE:-}" = "1" ]; then
  echo "OK (local only): demo/index.html loads exactly the two files"
  echo "    $MANIFEST records, and nothing else. The comparison against"
  echo "    $SOURCE_REPO was skipped by DEMO_BUNDLE_SKIP_REMOTE=1."
  exit 0
fi

command -v gh >/dev/null 2>&1 \
  || fail "this check asks $SOURCE_REPO for its current $SOURCE_PATH commit and
      needs the gh CLI. Set DEMO_BUNDLE_SKIP_REMOTE=1 to run the local half
      only, deliberately."

current=$(gh api "repos/$SOURCE_REPO/commits?path=$SOURCE_PATH&sha=main&per_page=1" \
  --jq '.[0].sha' 2>/dev/null) \
  || fail "could not ask $SOURCE_REPO for its current $SOURCE_PATH commit.
      Set DEMO_BUNDLE_SKIP_REMOTE=1 to run the local half only."

[ -n "$current" ] || fail "$SOURCE_REPO answered with no commit for $SOURCE_PATH.
      Refusing to report this as current: an empty answer is not a match."

if [ "$current" != "$recorded" ]; then
  fail "the published demo is behind $SOURCE_REPO.
      built from : ${recorded:0:12}
      $SOURCE_PATH is now at : ${current:0:12}
      Every page would still render and every link would still work, which is
      why this is checked rather than noticed. Refresh with:
        ./scripts/refresh-demo.sh"
fi

echo "OK: demo/ is a build of $SOURCE_REPO $SOURCE_PATH at ${current:0:12},"
echo "    which is its current one, and demo/index.html loads exactly the two"
echo "    files recorded beside it."
