#!/usr/bin/env python3
"""Put the console link in the top bar of every page, from one source of truth.

Why a script for one link. The top bar is hand-written in each of the 28 pages
and always has been: unlike the footer it differs per page, because the index
carries `Stack` and `Proof`, which are its own anchors, and the service pages
carry a crumb instead. So there is nothing to generate wholesale. But a link
that has to appear on all 28 and read the same on all 28 is exactly the thing
that drifts when it is pasted 28 times, which is the lesson tools/footer.py
already exists to hold. This owns one link and nothing else.

It went into the top bar on 2026-08-05 (@yurii), moving out of the footer where
it had ended up looking orphaned next to a lone GitHub link. It sits after the
jump button on purpose: `jump` is for anybody, the console is for the reader
who already has one.

console.html does not get a link to itself. Its crumb already reads
`the stack / your console`, which is where you are rather than where to go.

Run from the repo root:  python3 tools/topbar.py
Idempotent: it replaces the link if it is there and inserts it if it is not.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

# The jump button, byte for byte, in every page. It is the anchor rather than a
# marker comment because it is already there and already identical everywhere;
# a marker would be one more thing to keep in step.
JUMP = ('<button class="kbd-hint" data-cmdk type="button">'
        '<span>jump</span><kbd>&#8984;K</kbd></button>')

LINK = '<a class="tb-link" href="{root}console.html">Console</a>'

# Same map footer.py uses: path -> root prefix. Kept here rather than imported
# so neither file can quietly change the other's idea of the page list.
PAGES = {
    "index.html": "",
    "genaryx.html": "",
    "ai-agent-governance.html": "",
    "finops-for-ai.html": "",
    "ai-agent-security.html": "",
    "mcp-security.html": "",
    "agent-identity.html": "",
    "glossary.html": "",
    "guides.html": "",
    "ai-observability-vs-governance.html": "",
    "one-incident-end-to-end.html": "",
    "what-runs-where.html": "",
    "first-alert.html": "",
    "what-is-proven.html": "",
    "404.html": "/",
    "services/engram.html": "../",
    "services/idryx.html": "../",
    "services/mockryx.html": "../",
    "services/heraldyx.html": "../",
    "services/trailryx.html": "../",
    "services/pocket.html": "../",
    "services/sphere.html": "../",
    "services/platform.html": "../",
    "services/qryx.html": "../",
    "services/tokenfuse.html": "../",
    "services/verdryx.html": "../",
    "services/wardryx.html": "../",
}

written = 0
missing = []

for path, root in PAGES.items():
    p = ROOT / path
    if not p.exists():
        missing.append(path)
        continue
    h = p.read_text(encoding="utf-8")
    if JUMP not in h:
        sys.exit(f"{path}: the jump button is not where this script expects it. "
                 "It anchors on the button's exact markup, so either the button "
                 "changed or this page never had one. Fix the anchor rather than "
                 "letting the link land somewhere arbitrary.")

    # Match from the jump button through the close of the bar, and rebuild the
    # whole span. Matching only the button and appending after it looks simpler
    # and is not: the first version did that, its `\s*` swallowed the newline
    # before `</div>`, and 27 pages ended up with the tag glued to the link.
    # Rewriting a span you have measured end to end cannot half-apply.
    span = re.search(
        re.escape(JUMP)
        + r'(?:\s*<a class="tb-link" href="[^"]*console\.html">[^<]*</a>)?'
        + r'\s*</div>',
        h)
    if not span:
        sys.exit(f"{path}: found the jump button but not the close of the bar after it.")
    want = JUMP + "\n    " + LINK.format(root=root) + "\n  </div>"
    if span.group(0) == want:
        continue
    h = h[:span.start()] + want + h[span.end():]
    p.write_text(h, encoding="utf-8")
    print(f"{path:36} written")
    written += 1

if missing:
    sys.exit("pages in the list and not on disk: " + ", ".join(missing))

# console.html is deliberately absent from PAGES. Say so every run rather than
# leaving somebody to wonder whether it was forgotten.
print(f"\n{written} file(s) updated. console.html has no link to itself, by design.")
