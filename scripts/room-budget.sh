#!/usr/bin/env bash
# Holds invariant 12 of CLAUDE.md: a room explains; its guide holds the rest.
#
# WHY THIS EXISTS
#
# A room is a service page: the hero, the picture of how the thing works, how
# to start it, its limits and its common questions. Rooms grew by accretion.
# Every release added a paragraph, and the first half of October added a dated
# "what changed" block to four of them, so by 2026-10-16 the Typryx room ran to
# 1,540 lines, and a reader of four rooms read a fortnight's release notes in
# the middle of the page. Nothing measured how long a room had become, because "short" is
# not something a script can check until somebody writes down a number.
#
# The depth did not go away. It moved to a guide per room, `<id>-guide.html` at
# the repository root, and what changed in a period lives in the changes guide
# (changes-2026-10.html) and in the room's own guide.
#
# WHAT IT CHECKS, per room, where a room is every entry in the STACK registry
# in assets/site.js (found, not listed, for the reason invariant 10 gives):
#
#   1. its guide exists at <id>-guide.html;
#   2. the room links to that guide;
#   3. the room carries no dated release list. Stated simply so it can be
#      argued with: no element with id="changes", and no kicker or <h2> that
#      names a date range ("1 to 15 October 2026") or a release date
#      ("released 15 October 2026"). A kicker saying "measured 2026-09-25" is a
#      measurement with a date, not a release list, and passes;
#   4. the room's prose is at most CEILING words.
#
# HOW PROSE IS MEASURED, because a word count is only as good as what it reads.
# The <body>, without: the visible FAQ (the block between the faq:auto
# markers, which tools/faq.py owns), every <svg>, <code> and <pre>, every
# <script> and <style>, the top bar (<header>), any <nav>, the <footer>, and
# HTML comments. What is left is tag-stripped and unescaped, and a word is any
# whitespace-separated token with at least one letter or digit in it, so a
# middle dot or an arrow is not a word. Figure captions and the hero's fact
# table DO count: a reader reads them.
#
# WHAT IT DOES NOT CHECK. Whether the prose is any good, whether the guide
# holds what left the room, or whether a room under the ceiling is short
# enough. It holds a ceiling, not a target.
#
# It prints the count and the slack for every room, so a room at 990 is a
# claim somebody can see is thin rather than a green line.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

python3 - <<'PY'
import html
import pathlib
import posixpath
import re
import sys

ROOT = pathlib.Path.cwd()
CEILING = 1000

MONTH = (r"(?:January|February|March|April|May|June|July|August|September|"
         r"October|November|December)")
DATED = re.compile(
    r"\b\d{1,2}\s+to\s+\d{1,2}\s+" + MONTH + r"\b"
    r"|\breleased\s+(?:on\s+)?(?:\d{1,2}\s+" + MONTH + r"|\d{4}-\d{2}-\d{2})",
    re.I)

CHROME = [
    r"<!-- faq:auto -->.*?<!-- /faq:auto -->",
    r"<header\b.*?</header>",
    r"<nav\b.*?</nav>",
    r"<footer\b.*?</footer>",
    r"<script\b.*?</script>",
    r"<style\b.*?</style>",
    r"<svg\b.*?</svg>",
    r"<code\b.*?</code>",
    r"<pre\b.*?</pre>",
    r"<!--.*?-->",
]


def prose_words(page_html):
    body = page_html.split("<body", 1)[1] if "<body" in page_html else page_html
    for pattern in CHROME:
        body = re.sub(pattern, " ", body, flags=re.S | re.I)
    text = html.unescape(re.sub(r"<[^>]+>", " ", body))
    return sum(1 for t in text.split() if re.search(r"[0-9A-Za-z]", t))


def plain(fragment):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", fragment))).strip()


js_path = ROOT / "assets/site.js"
js = js_path.read_text(encoding="utf-8") if js_path.exists() else ""
block = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
rooms = []
for line in block.group(1).splitlines() if block else []:
    m = re.search(r'id:"([^"]+)".*?href:"([^"]+)"', line)
    if m:
        rooms.append(m.groups())
if not rooms:
    print("UNJUDGEABLE: no rooms found in the STACK registry in assets/site.js, so this")
    print("     measured nothing. A ceiling held over no rooms is not a ceiling.")
    sys.exit(1)

problems = []
for rid, href in rooms:
    page = ROOT / href
    guide = f"{rid}-guide.html"
    if not page.exists():
        problems.append(f"{rid}: the registry points at {href} and it is not on disk")
        continue
    h = page.read_text(encoding="utf-8")

    if not (ROOT / guide).exists():
        problems.append(f"{rid}: no guide at {guide}. Every room owes one; the depth that "
                        f"leaves a room has to land somewhere")

    base = posixpath.dirname(href)
    targets = set()
    for target in re.findall(r'<a\b[^>]*\bhref="([^"]+)"', h):
        if re.match(r"[a-z]+:|//|#", target):
            continue
        targets.add(posixpath.normpath(posixpath.join(base, re.split(r"[#?]", target)[0])))
    if guide not in targets:
        problems.append(f"{rid}: {href} does not link to its guide {guide}")

    if re.search(r'<[a-z][^>]*\bid="changes"', h, re.I):
        problems.append(f'{rid}: carries a changes block (id="changes"). What changed in a '
                        f"period lives in changes-2026-10.html and in {guide}, not on the room")
    for kind, pattern in (("kicker", r'<div class="kicker[^"]*">(.*?)</div>'),
                          ("heading", r"<h2\b[^>]*>(.*?)</h2>")):
        for fragment in re.findall(pattern, h, re.S):
            text = plain(fragment)
            if DATED.search(text):
                problems.append(f"{rid}: a {kind} reads {text!r}, which is a dated release "
                                f"list. It belongs in changes-2026-10.html and in {guide}")

    words = prose_words(h)
    slack = CEILING - words
    verdict = f"{slack} to spare" if slack >= 0 else f"{-slack} over"
    print(f"     {rid:10} {words:5} / {CEILING}, {verdict}")
    if slack < 0:
        problems.append(f"{rid}: {words} words of prose, {-slack} over the ceiling of {CEILING}")

if problems:
    print()
    for line in problems:
        print("FAIL " + line)
    print(f"\n{len(problems)} problem(s) across {len(rooms)} rooms. See CLAUDE.md invariant 12:")
    print("a room explains, and its guide holds the rest.")
    sys.exit(1)

print(f"OK: {len(rooms)} rooms, each under {CEILING} words of prose, each linking to its guide,")
print("    and none carrying a dated release list.")
PY
