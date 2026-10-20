#!/usr/bin/env python3
"""Write the Stack page's list of every service, grouped by ring.

stack.html lists each service once, in the group of the ring it belongs to,
with one sentence and two links: its room and its guide. Nothing in that list
is typed by hand. The services come from STACK in assets/site.js, the registry
that also drives the rail of rooms, the palette and the footer; the group names
and their one line come from RINGS in assets/home/parts.js, the same words the
home page's four rings use. So a new service, a renamed ring or a new guide
reaches the list the next time this runs.

A room that is not on disk stops this. A guide that is not on disk only drops
its link, because a room can ship before its guide.

Run from the repo root:  python3 tools/stacklist.py   (idempotent)
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGE = "stack.html"
MARK_OPEN = "<!-- stacklist:auto -->"
MARK_CLOSE = "<!-- /stacklist:auto -->"
ROOM_LINE = "One room over all of it, in your browser, on your own box."


def _pairs(line):
    return dict(re.findall(r'(\w+):"((?:[^"\\]|\\.)*)"', line))


def _block(name, src):
    m = re.search(r"const " + name + r"\s*=\s*\[(.*?)\];", src, re.S)
    if not m:
        sys.exit(f"{name} not found")
    return [_pairs(line) for line in m.group(1).splitlines() if "id:" in line or "key:" in line]


def registry():
    js = (ROOT / "assets" / "site.js").read_text(encoding="utf-8")
    rings = _block("RINGS", (ROOT / "assets" / "home" / "parts.js").read_text(encoding="utf-8"))
    return _block("CATEGORIES", js), _block("STACK", js), {r["key"]: r for r in rings}


def groups():
    cats, stack, rings = registry()
    out = []
    for c in cats:
        members = [s for s in stack if s.get("cat") == c["id"]]
        if not members:
            continue
        ring = rings.get(c["id"])
        title, line = (ring["name"], ring["desc"]) if ring else ("The control room", ROOM_LINE)
        rows = []
        for s in members:
            if not (ROOT / s["href"]).exists():
                sys.exit(f'{s["id"]}: its room {s["href"]} is not on disk')
            links = f'<a href="{s["href"]}" data-dir="fwd">Room &#8594;</a>'
            guide = f'{s["id"]}-guide.html'
            if (ROOT / guide).exists():
                links += f'<a href="{guide}">Guide &#8594;</a>'
            what = s["what"].rstrip()
            what += "" if what[-1:] in ".!?" else "."
            note = f'<em class="sg-note">{s["note"]}</em>' if s.get("note") else ""
            rows.append(f'<li class="sg-row" style="--c:{s["color"]}"><i></i>'
                        f'<div class="sg-name"><b>{s["name"]}</b><span>{s["plane"]}</span>{note}</div>'
                        f'<p>{what}</p><div class="sg-go">{links}</div></li>')
        out.append(f'<div class="svc-group" style="--c:{c["color"]}">'
                   f'<div class="sg-head"><i></i><h3>{title}</h3><p>{line}</p></div>'
                   f'<ul class="sg-rows">{"".join(rows)}</ul></div>')
    return (f"{MARK_OPEN}\n    <div class=\"svc-groups\">\n"
            + "\n".join("      " + g for g in out)
            + f"\n    </div>\n    {MARK_CLOSE}")


def main():
    p = ROOT / PAGE
    h = p.read_text(encoding="utf-8")
    if h.count(MARK_OPEN) != 1 or h.count(MARK_CLOSE) != 1:
        sys.exit(f"{PAGE}: expected one pair of stacklist:auto markers. Refusing to write "
                 f"the list somewhere arbitrary.")
    h2 = re.sub(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), lambda _: groups(), h, flags=re.S)
    if h2 != h:
        p.write_text(h2, encoding="utf-8")
    print(f"{PAGE:28} {h2.count('class=\"sg-row\"')} services, {'written' if h2 != h else 'unchanged'}")


if __name__ == "__main__":
    main()
