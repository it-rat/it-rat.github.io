#!/usr/bin/env python3
"""Keep the counts the guides hub states true.

Until 2026-10-20 this also wrote one row per room under "Each service in
depth". That list moved to the Stack page (stack.html), where each service sits
with its room and its guide side by side, built from the same STACK registry;
the hub now carries the guides about the field and about running the stack,
and its lede points at the Stack page for the rest. A service guide is still
reached from its room, from the Stack page and from llms.txt.

THE COUNTS, read off the page: the distinct guides the hub links as a card, how
many of those explain the field (FIELD, below), and the rest, which cover this
stack. So the number is what a reader can click on the hub, not the length of
some list. They are written as words into PLACES and nowhere else, and a place
that no longer states a total stops this rather than being skipped.

FIELD is a hand-kept classification, and the one list here: which guides are
about the discipline rather than about this stack. It cannot be derived, and
it is checked: each one must be linked from the hub.

Run from the repo root:  python3 tools/guidehub.py   (idempotent)
Run it before seo.py and llms.py: both read the hub's description and its rows.
"""
import pathlib
import re
import sys


ROOT = pathlib.Path(__file__).resolve().parent.parent
HUB = "guides.html"
DESC_MAX = 160  # scripts/page-metadata.sh, invariant 1

FIELD = {
    "ai-agent-governance.html",
    "finops-for-ai.html",
    "ai-agent-security.html",
    "mcp-security.html",
    "agent-identity.html",
    "ai-observability-vs-governance.html",
    "agent-tooling-compared.html",
}

# Where the hub states its counts. Each is (label, pattern with three groups:
# what comes before the text, the text, what comes after).
PLACES = [
    ("meta description", r'(<meta name="description" content=")([^"]*)(")'),
    ("og:description", r'(<meta property="og:description" content=")([^"]*)(")'),
    ("twitter:description", r'(<meta name="twitter:description" content=")([^"]*)(")'),
    ("hero lede", r'(<section class="guide-hero">.*?<p class="lede[^"]*">)(.*?)(</p>)'),
]

ONES = ("zero one two three four five six seven eight nine ten eleven twelve thirteen "
        "fourteen fifteen sixteen seventeen eighteen nineteen").split()
TENS = "_ _ twenty thirty forty fifty sixty seventy eighty ninety".split()
NUMBER = (r"(?:(?:twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety)"
          r"(?:-(?:one|two|three|four|five|six|seven|eight|nine))?"
          r"|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen"
          r"|one|two|three|four|five|six|seven|eight|nine|ten)")
TOTAL = re.compile(rf"\b({NUMBER})(?= guides\b)", re.I)
ON_FIELD = re.compile(rf"\b({NUMBER})(?= (?:on|explain) the field\b)", re.I)
ON_STACK = re.compile(rf"\b({NUMBER})(?= (?:on running|cover) this stack\b)", re.I)


def words(n):
    if not 0 < n < 100:
        sys.exit(f"{HUB}: counted {n} guides, which this cannot spell. Refusing to write it.")
    if n < 20:
        return ONES[n]
    tens, ones = divmod(n, 10)
    return TENS[tens] + (f"-{ONES[ones]}" if ones else "")


def recount(h):
    linked = []
    for href in re.findall(r'<a class="(?:gcard|svc-row)"[^>]*?href="([^"#]+)', h):
        if href not in linked:
            linked.append(href)
    unlinked_field = sorted(FIELD - set(linked))
    if unlinked_field:
        sys.exit(f"{HUB}: FIELD names {', '.join(unlinked_field)} and the hub links none "
                 f"of them as a card. Link it, or take it out of FIELD in tools/guidehub.py.")
    total = len(linked)
    field = sum(1 for p in linked if p in FIELD)
    counts = ((TOTAL, total), (ON_FIELD, field), (ON_STACK, total - field))

    def spell(pattern, n, text):
        return pattern.sub(lambda m: words(n).capitalize() if m.group(1)[0].isupper()
                           else words(n), text)

    for label, place in PLACES:
        m = re.search(place, h, re.S)
        if not m:
            sys.exit(f"{HUB}: could not find the {label}, so its guide count cannot be "
                     f"written. Fix the anchor in tools/guidehub.py rather than skip it.")
        text = m.group(2)
        if not TOTAL.search(text):
            sys.exit(f"{HUB}: the {label} no longer says how many guides there are, so "
                     f"this has nothing to keep true. If that is the intent, take it out "
                     f"of PLACES in tools/guidehub.py.")
        for pattern, n in counts:
            text = spell(pattern, n, text)
        if label == "meta description" and len(text) > DESC_MAX:
            sys.exit(f"{HUB}: with the count written, the meta description is {len(text)} "
                     f"characters, over {DESC_MAX} (invariant 1). Shorten the copy around it.")
        h = h[:m.start(2)] + text + h[m.end(2):]
    return h, total, field


def main():
    p = ROOT / HUB
    h = p.read_text(encoding="utf-8")
    h2, total, field = recount(h)
    if h2 != h:
        p.write_text(h2, encoding="utf-8")
    print(f"{HUB:28} {total} guides ({field} on the field, {total - field} on this stack), "
          f"{'written' if h2 != h else 'unchanged'}")


if __name__ == "__main__":
    main()
