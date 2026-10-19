#!/usr/bin/env bash
# Holds invariant 13 of CLAUDE.md: a list item in prose is one block.
#
# WHY THIS EXISTS
#
# Every page styles `.prose li` as a flex row: the accent dot is a ::before
# with a fixed width, and the content sits beside it. A flex row makes every
# child of the <li> its own column. So `<li><b>Streams.</b> A changed byte
# is <span class="mono">x</span>.</li>` is not one sentence on the page: the
# bold lead, each run of text and each code span become separate narrow
# columns, and a paragraph is drawn as a ladder of one or two words per line.
# The house form wraps the content in one span, `<li><span>...</span></li>`,
# and then the item is one column whatever it holds.
#
# Nothing checked it. On 2026-10-19 the new Keyryx guide had five such items,
# and twenty more were live on it-rat.com across four pages
# (what-is-proven, two-sites, finops-for-ai, ai-observability-vs-governance),
# found on opening the guide.
#
# WHAT IT CHECKS. On every page whose own <style> sets `.prose li` to
# display:flex, every <li> inside an element of class `prose` has exactly one
# child: one element, or one run of non-blank text. The pages are found, not
# listed (invariant 10 says why a list is the bug).
#
# WHAT IT DOES NOT CHECK. A page that styles lists some other way, a list
# outside `.prose`, or whether the one child reads well. If no page sets the
# flex rule it says "measured nothing" and fails, since then its subject is
# gone and a green line would mean nothing.

set -uo pipefail
cd "$(dirname "$0")/.." || exit 1

python3 - <<'PY'
import pathlib
import re
import sys
from html.parser import HTMLParser

FLEX = re.compile(r"\.prose\s+li\s*\{[^}]*display\s*:\s*flex", re.S)
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link",
        "meta", "source", "track", "wbr"}


class Items(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []      # (tag, is_prose)
        self.item = None     # the <li> being read
        self.split = []      # (line, first words) of each item with >1 child

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            if self.item is not None and len(self.stack) == self.item["depth"]:
                self.item["kids"] += 1
            return
        cls = (dict(attrs).get("class") or "").split()
        if self.item is not None and len(self.stack) == self.item["depth"]:
            self.item["kids"] += 1
        self.stack.append((tag, "prose" in cls))
        if tag == "li" and self.item is None and any(p for _, p in self.stack[:-1]):
            self.item = {"line": self.getpos()[0], "kids": 0,
                         "depth": len(self.stack), "text": ""}

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        while self.stack:
            t, _ = self.stack.pop()
            if t == tag:
                break
        if tag == "li" and self.item is not None and len(self.stack) < self.item["depth"]:
            if self.item["kids"] > 1:
                self.split.append((self.item["line"], " ".join(self.item["text"].split()[:6])))
            self.item = None

    def handle_data(self, data):
        if self.item is None:
            return
        self.item["text"] += data
        if len(self.stack) == self.item["depth"] and data.strip():
            self.item["kids"] += 1


pages = sorted(p for p in pathlib.Path(".").rglob("*.html")
               if not p.parts[0] in ("demo", "node_modules", ".git"))
measured = 0
bad = 0
for page in pages:
    src = page.read_text(encoding="utf-8")
    styles = " ".join(re.findall(r"<style\b[^>]*>(.*?)</style>", src, re.S))
    if not FLEX.search(styles):
        continue
    measured += 1
    parser = Items()
    parser.feed(src)
    for line, words in parser.split:
        bad += 1
        print(f"FAIL  {page}:{line}: a list item in prose splits into columns "
              f"(wrap its content in one <span>): {words} ...")

if measured == 0:
    print("FAIL  measured nothing: no page sets .prose li to display:flex, so "
          "this gate has no subject")
    sys.exit(1)
if bad:
    print(f"FAIL  {bad} list item(s) split into columns on the {measured} pages that style .prose li as flex")
    sys.exit(1)
print(f"OK  every list item in prose is one block, on {measured} pages that style .prose li as flex")
PY
