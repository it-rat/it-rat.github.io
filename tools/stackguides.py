"""The service guides, derived from the STACK registry rather than listed.

Every room in the STACK registry in assets/site.js owes a guide at
`<id>-guide.html` at the repository root (CLAUDE.md invariant 12): the room
explains, the guide holds the rest. Genaryx's room is genaryx.html and its
guide is genaryx-guide.html like any other. Sphere is not in STACK, so it owes
none, and that exemption states its own reason the way invariant 11's does.

This is imported by every generator that writes into the guides (seo, llms,
footer, topbar, guidehub) instead of each of them carrying a list of sixteen
names. A hand-written list of pages is the defect invariants 10 and 11 record
twice: a page outside the list keeps whatever it was born with, and nobody is
told.

A STACK entry whose guide is not on disk STOPS the generator. Skipping it
would write every other page and leave the new room's guide without a footer,
a top bar, JSON-LD or a markdown twin, which is exactly the shape of the two
pages that sat outside every generator for months.

Not a generator itself: running it does nothing.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def stack():
    """The rooms, in registry order, with what a guide row or a crumb needs."""
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    block = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
    if not block:
        sys.exit("assets/site.js: could not find the STACK registry, so which guides "
                 "exist cannot be worked out. Refusing to guess.")
    out = []
    for line in block.group(1).splitlines():
        m = re.search(r'id:"([^"]+)".*?name:"([^"]+)".*?plane:"([^"]+)".*?color:"([^"]+)"'
                      r'.*?href:"([^"]+)"', line)
        if not m:
            continue
        s = dict(zip(("id", "name", "plane", "color", "href"), m.groups()))
        n = re.search(r'note:"([^"]+)"', line)
        s["note"] = n.group(1) if n else ""
        out.append(s)
    if len(out) < 5:
        sys.exit(f"assets/site.js: parsed {len(out)} rooms out of STACK, which cannot be "
                 "right. Refusing to write guides from a registry this tool cannot read.")
    return out


def guide_path(entry):
    return f"{entry['id']}-guide.html"


def service_guides():
    """[(guide path, registry entry)] for every room, in registry order.

    Stops, naming every missing file, when any room's guide is not on disk.
    The last line of the message carries the names, because
    scripts/generated-blocks.sh reports only a refusing tool's last line.
    """
    rooms = stack()
    out = [(guide_path(s), s) for s in rooms]
    missing = [p for p, _ in out if not (ROOT / p).exists()]
    if missing:
        sys.exit(f"assets/site.js STACK names {len(missing)} room(s) whose guide is not on "
                 f"disk: {', '.join(missing)}. Every room owes one (CLAUDE.md invariant "
                 f"12): write it, or take the entry out of STACK. Refusing rather than "
                 f"skipping, since a skipped page keeps whatever it was born with.")
    return out
