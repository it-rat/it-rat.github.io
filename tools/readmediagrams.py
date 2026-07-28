#!/usr/bin/env python3
"""Turn each room's architecture diagram into a standalone animated SVG.

Every service page already carries a hand-drawn schematic in the site's own
visual language. On the site it is animated by `assets/diagram.js`; in a GitHub
README there is no JavaScript, so the flow has to be carried by SMIL inside the
file itself. This lifts the diagram out of the page, wraps it so it renders
standalone (`xmlns`, an opaque background so it stays legible on a light GitHub
theme, a title), and animates the arrows: a coloured pulse marches along every
wire, and the service's own box breathes in its accent.

The output is one file per service under assets/img/readme/diagrams/, copied
from there into each service repo's README.

Run from the repo root:  python3 tools/readmediagrams.py
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/img/readme/diagrams"
PAD = 18
BG = "#0A0E13"
DUR = 2.4  # seconds for one pulse to cross a wire, whatever that wire's length

# id -> (page, accent, the one-line title screen readers and tooltips get)
ROOMS = {
    "tokenfuse": ("services/tokenfuse.html", "#F4B23E",
                  "TokenFuse: every agent call priced and gated in-line, budgets replicated by raft"),
    "wardryx":   ("services/wardryx.html", "#2DD4BF",
                  "Wardryx: the PEP asks per request, the PDP answers allow, deny or hold"),
    "idryx":     ("services/idryx.html", "#34D399",
                  "Idryx: identity sources feed one graph that emits alerts, an Agent-BOM and proposed diffs"),
    "qryx":      ("services/qryx.html", "#B48CFF",
                  "Qryx: the estate is swept into a crypto inventory and scored for post-quantum risk"),
    "verdryx":   ("services/verdryx.html", "#FF7AA2",
                  "Verdryx: outcomes judged and priced per resolved case, with drift watched over time"),
    "mockryx":   ("services/mockryx.html", "#FF8A5B",
                  "Mockryx: hostile scenarios driven at the gateway, with the guardrails asserted"),
    "engram":    ("services/engram.html", "#6C7BFF",
                  "Engram: agent memory in one SQLite file, recalled with provenance"),
    "platform":  ("services/platform.html", "#93A8C4",
                  "Platform: seven emitters, one agent-event envelope, three consumers"),
    "genaryx":   ("genaryx.html", "#B48CFF",
                  "Genaryx: one browser control room over the stack, reached only over the tunnel"),
}


def diagram(page):
    """The first wide inline <svg> on a page is that room's schematic."""
    s = (ROOT / page).read_text(encoding="utf-8")
    for m in re.finditer(r'<svg\b[^>]*viewBox="([^"]+)"[^>]*>', s):
        vb = [float(v) for v in m.group(1).split()]
        if vb[2] < 300:
            continue
        return s[m.start(): s.index("</svg>", m.start()) + 6], vb
    raise SystemExit(f"no diagram found in {page}")


def pulses(svg, accent):
    """One travelling pulse per arrow, on a copy of each wire.

    Overlaying rather than replacing keeps the original wire visible, so the
    diagram still reads correctly wherever SMIL is ignored. `pathLength="100"`
    normalises every wire to the same 100 units, so a short hop and a long
    diagonal each take one full `DUR` to travel: without it the dash pattern is
    in user units and the pulse crawls across long wires and blinks past short
    ones. The negative `begin` starts each animation mid-flight, so the very
    first frame already reads as flowing rather than empty.
    """
    out = []
    wires = re.findall(r'<line\b[^>]*marker-end[^>]*/>', svg)
    wires += re.findall(r'<path\b[^>]*marker-end[^>]*/>', svg)
    for i, wire in enumerate(wires):
        tag = "line" if wire.startswith("<line") else "path"
        geom = re.sub(r'\s(marker-end|stroke|stroke-width|class)="[^"]*"', "", wire[:-2])
        out.append(
            f'{geom} pathLength="100" stroke="{accent}" stroke-width="2.6" '
            f'stroke-linecap="round" stroke-dasharray="7 100" stroke-dashoffset="7">'
            f'<animate attributeName="stroke-dashoffset" from="7" to="-100" '
            f'dur="{DUR}s" begin="-{i * 0.37:.2f}s" repeatCount="indefinite"/>'
            f'</{tag}>'
        )
    return "\n  ".join(out)


def breathe(svg, accent):
    """Make the room's own box pulse in its accent, the way the page does."""
    m = re.search(r'<rect\b[^>]*stroke="' + re.escape(accent) + r'"[^>]*stroke-width="1.4"[^>]*/>', svg)
    if not m:
        return svg
    animated = m.group(0)[:-2] + (
        '><animate attributeName="stroke-opacity" values="1;.45;1" '
        'dur="3.4s" repeatCount="indefinite"/></rect>'
    )
    return svg[:m.start()] + animated + svg[m.end():]


def build(room, page, accent, title):
    svg, vb = diagram(page)
    x, y, w, h = vb[0] - PAD, vb[1] - PAD, vb[2] + PAD * 2, vb[3] + PAD * 2
    inner = breathe(svg, accent)
    # Strip the page-level wrapper; everything inside is reused verbatim.
    inner = inner[inner.index(">") + 1: inner.rindex("</svg>")]
    return (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:g} {y:g} {w:g} {h:g}" '
        f'width="{w:g}" height="{h:g}" role="img" aria-label="{title}">\n'
        f'  <title>{title}</title>\n'
        f'  <rect x="{x:g}" y="{y:g}" width="{w:g}" height="{h:g}" rx="16" fill="{BG}"/>\n'
        f'  <rect x="{x + .5:g}" y="{y + .5:g}" width="{w - 1:g}" height="{h - 1:g}" rx="15.5" '
        f'fill="none" stroke="rgba(255,255,255,.09)"/>\n'
        f'{inner}\n'
        f'  <g fill="none">\n  {pulses(svg, accent)}\n  </g>\n'
        f'</svg>\n'
    )


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for room, (page, accent, title) in ROOMS.items():
        out = OUT / f"{room}.svg"
        out.write_text(build(room, page, accent, title), encoding="utf-8")
        print(f"{out.relative_to(ROOT)}  {out.stat().st_size // 1024 or 1} KB")


if __name__ == "__main__":
    main()
