#!/usr/bin/env bash
#
# Fails when the footer's shelves and the stylesheet's columns disagree.
#
# WHY THIS EXISTS
#
# From 2026-08-29 the footer is drawn as six columns above 860px:
#
#   .foot-row{display:grid;grid-template-columns:repeat(6,1fr)}
#
# That 6 is a constant in a stylesheet describing content that is generated
# from a registry. Nothing connected the two. Add a seventh category to
# assets/site.js and every page grows a seventh shelf that wraps to a second
# row on its own, half empty; drop one and the row keeps a column of air. Both
# are silent: no build fails, no page 404s, and the footer is the part of a
# page nobody scrolls to on purpose.
#
# WHAT IT FOUND ON THE DAY IT WAS WRITTEN
#
# agent-tooling-compared.html was published on 2026-08-11 and never added to
# tools/footer.py's PAGES list, so every regeneration since had skipped it. Its
# footer still carried the shape from before the categories existed: one shelf
# of twelve chips, CostCrew and Vouchryx missing outright, and Trailryx under a
# "standalone" heading that stopped being true on 2026-08-29. Thirty-one pages
# were right and one was three months stale, and the only reason anybody looked
# was that a 6-column grid would have drawn it wrong.
#
# So this script does NOT read tools/footer.py's list of pages. A hand-written
# list of what to check is itself unchecked, and that list was the bug. It
# finds every page that has a footer and judges what it finds.
#
# WHAT IT CHECKS
#
#   1. How many shelves the footer generator would emit, computed from the
#      registry in assets/site.js the way tools/footer.py computes it: one per
#      category that actually has a service, plus the side project.
#   2. Every page carrying a footer has exactly that many shelves, in exactly
#      one row, with the labels the registry declares.
#   3. The column count in assets/site.css is that same number.
#
# WHAT IT DOES NOT CHECK
#
# That the chips inside a shelf are the right ones. tools/footer.py writes
# those from the registry and scripts/service-numbers.sh owns what a page may
# claim; this is about the SHAPE the stylesheet assumes.
set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

python3 - <<'PY'
import pathlib
import re
import sys

ROOT = pathlib.Path.cwd()
js = (ROOT / "assets/site.js").read_text(encoding="utf-8")

# ---------------------------------------------------------------------------
# 1. What the registry says the shelves are.
# ---------------------------------------------------------------------------
cats = re.search(r"const CATEGORIES = \[(.*?)\n\];", js, re.S)
stack = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
if not cats or not stack:
    print("UNJUDGEABLE: assets/site.js has no CATEGORIES or no STACK registry.")
    print("     nothing was measured, so nothing is claimed.")
    sys.exit(1)

used = {m.group(1) for m in re.finditer(r'cat:"([^"]+)"', stack.group(1))}
labels = [m.group(2) for m in re.finditer(r'id:"([^"]+)".*?label:"([^"]+)"', cats.group(1))
          if m.group(1) in used]
labels.append("side project")          # tools/footer.py appends this shelf itself
want = len(labels)
if want < 2:
    print("UNJUDGEABLE: parsed %d shelves out of the registry, which cannot be right." % want)
    sys.exit(1)

# ---------------------------------------------------------------------------
# 2. Every page that has a footer.
# ---------------------------------------------------------------------------
pages = sorted(p for p in ROOT.rglob("*.html")
               if '<footer class="footer"' in p.read_text(encoding="utf-8", errors="ignore")
               and "demo/" not in str(p.relative_to(ROOT)))
if not pages:
    print("UNJUDGEABLE: no page with a footer was found, so nothing was measured.")
    sys.exit(1)

problems = []
for p in pages:
    rel = p.relative_to(ROOT)
    whole = p.read_text(encoding="utf-8")
    # Read the footer, not the page. `<div class="l">` is also the label on the
    # proof grid of index.html, and an unscoped search picked up eight of those
    # and reported the front page as carrying fourteen shelves.
    cut = re.search(r'<footer class="footer".*?</footer>', whole, re.S)
    if not cut:
        problems.append(f"{rel}: has a footer tag but no closing </footer>")
        continue
    h = cut.group(0)
    rows = h.count('class="foot-row"')
    groups = h.count('class="foot-group"')
    if rows != 1:
        problems.append(f"{rel}: {rows} foot-row blocks, expected exactly 1")
    if groups != want:
        problems.append(f"{rel}: {groups} shelves, expected {want} "
                        f"({', '.join(labels)})")
        continue
    seen = [re.sub(r"<[^>]+>", "", m.group(1)).strip()
            for m in re.finditer(r'<div class="l">(.*?)</div>', h, re.S)]
    if seen != labels:
        problems.append(f"{rel}: shelves are {seen}, the registry says {labels}")

# ---------------------------------------------------------------------------
# 3. The stylesheet draws that many columns.
# ---------------------------------------------------------------------------
css = (ROOT / "assets/site.css").read_text(encoding="utf-8")
m = re.search(r"\.foot-row\{display:grid;grid-template-columns:repeat\((\d+),", css)
if not m:
    problems.append("assets/site.css: no .foot-row grid rule found, so the column "
                    "count this gate exists to hold is not there to read")
elif int(m.group(1)) != want:
    problems.append(f"assets/site.css draws {m.group(1)} columns for {want} shelves")

print(f"     {len(pages)} pages with a footer, {want} shelves each: {', '.join(labels)}")
if problems:
    print()
    for line in problems:
        print("FAIL " + line)
    print(f"\n{len(problems)} problem(s). The footer's shape is generated from the registry")
    print("in assets/site.js and assumed by a constant in assets/site.css. When those")
    print("two disagree the page still renders, which is why this is a gate.")
    print("Regenerate with: python3 tools/footer.py")
    sys.exit(1)

print(f"OK: every footer carries {want} shelves in one row, and the stylesheet draws {want} columns.")
PY
