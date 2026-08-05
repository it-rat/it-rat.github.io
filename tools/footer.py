#!/usr/bin/env python3
"""Regenerate the shared footer on every page from one source of truth.

The stack registry lives in assets/site.js and already feeds the rail, the
dots, the arrows and the palette. This reads that same array and writes the
footer chips into the HTML as real links: a crawler should not have to run
JavaScript to find nine internal pages, and a reader should not have to know
that Cmd-K exists.

Run from the repo root:  python3 tools/footer.py
It is idempotent: it replaces the block between the footer markers.
"""
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent

BRAND_SVG = ('<svg class="glyph" viewBox="0 0 24 24" fill="none">'
             '<path d="M13.5 2 5 13.2h5.1L9.4 22l9-11.8h-5.3L13.5 2Z" fill="#F4B23E"/></svg>')
FLAG_SVG = ('<svg style="display:inline-block;width:15px;height:11px;vertical-align:-1px;'
            'margin:0 3px;border-radius:2px" viewBox="0 0 3 2" role="img" aria-label="Ukraine">'
            '<title>Ukraine</title><rect width="3" height="1" fill="#005BBB"/>'
            '<rect y="1" width="3" height="1" fill="#FFD500"/></svg>')

# page path -> (root prefix, the tail of the copyright line)
PAGES = {
    "genaryx.html": ("", "Apache-2.0"),
    "ai-agent-governance.html": ("", ""),
    "finops-for-ai.html": ("", ""),
    "ai-agent-security.html": ("", ""),
    "mcp-security.html": ("", ""),
    "agent-identity.html": ("", ""),
    "glossary.html": ("", ""),
    "guides.html": ("", ""),
    "ai-observability-vs-governance.html": ("", ""),
    "one-incident-end-to-end.html": ("", ""),
    "what-runs-where.html": ("", ""),
    "first-alert.html": ("", ""),
    "what-is-proven.html": ("", ""),
    "console.html": ("", ""),
    "404.html": ("/", ""),
    "services/engram.html": ("../", "Apache-2.0"),
    "services/idryx.html": ("../", "Apache-2.0"),
    "services/mockryx.html": ("../", "Apache-2.0"),
    "services/heraldyx.html": ("../", "Apache-2.0"),
    "services/trailryx.html": ("../", "Apache-2.0"),
    # Side projects. They get the same footer as everything else because the
    # footer is where a reader checks what else exists; what keeps them out of
    # the stack is the registry, not this list.
    "services/pocket.html": ("../", "Apache-2.0"),
    "services/sphere.html": ("../", "MIT"),
    "services/platform.html": ("../", "Apache-2.0"),
    "services/qryx.html": ("../", "Apache-2.0"),
    "services/tokenfuse.html": ("../", "Apache-2.0"),
    "services/verdryx.html": ("../", "Apache-2.0"),
    "services/wardryx.html": ("../", "Apache-2.0"),
}


def stack():
    """Parse the registry out of site.js rather than keeping a second copy."""
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    block = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
    if not block:
        sys.exit("site.js: could not find the STACK registry")
    out = []
    for line in block.group(1).splitlines():
        m = re.search(r'id:"([^"]+)".*?name:"([^"]+)".*?plane:"([^"]+)".*?color:"([^"]+)"'
                      r'.*?what:"([^"]+)".*?href:"([^"]+)"', line)
        if m:
            s = dict(zip(("id", "name", "plane", "color", "what", "href"), m.groups()))
            g = re.search(r'group:"([^"]+)"', line)
            s["group"] = g.group(1) if g else "stack"
            # An optional status, shown on the corridor card. It is a field
            # rather than something appended to `plane` because plane is what a
            # thing IS and this is how far along it is, and because the hand
            # edits that carried it before were silently overwritten the moment
            # this generator started writing the rail.
            n = re.search(r'note:"([^"]+)"', line)
            s["note"] = n.group(1) if n else ""
            out.append(s)
    if len(out) < 5:
        sys.exit("site.js: parsed too few services, refusing to write a broken footer")
    return out


def side():
    """The two mobile apps, from their own list. See site.js for why they are
    not in STACK: that registry drives a walk between pages on this site, and
    these have no page here."""
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    block = re.search(r"const SIDE = \[(.*?)\n\];", js, re.S)
    if not block:
        sys.exit("site.js: could not find the SIDE registry")
    out = [dict(zip(("id", "name", "color", "href"), m.groups()))
           for m in re.finditer(r'id:"([^"]+)".*?name:"([^"]+)".*?color:"([^"]+)".*?href:"([^"]+)"',
                                block.group(1))]
    if not out:
        sys.exit("site.js: SIDE parsed empty, refusing to write a footer with a silent gap")
    return out


def chips(root, here, group="stack"):
    out = []
    for s in stack():
        if s["group"] != group:
            continue
        dot = f'<i style="background:{s["color"]}"></i>{s["name"]}'
        if s["id"] == here:
            out.append(f'<span class="foot-chip here" aria-current="page">{dot}</span>')
        else:
            out.append(f'<a class="foot-chip" href="{root}{s["href"]}">{dot}</a>')
    return "".join(out)


def side_chips(root, here):
    """The same chip as everything else in this footer. See site.js: the
    distinction these carry is the group heading and the band at the top of
    each room, not a second visual language down here."""
    out = []
    for s in side():
        dot = f'<i style="background:{s["color"]}"></i>{s["name"]}'
        if s["id"] == here:
            out.append(f'<span class="foot-chip here" aria-current="page">{dot}</span>')
        else:
            out.append(f'<a class="foot-chip" href="{root}{s["href"]}">{dot}</a>')
    return "".join(out)


def groups(root, here):
    """The three states these things are actually in, which is not the same
    question as what they do: running and wired together; running and wired to
    nothing; not finished and not checkable. The headings carry that; what each
    one MEANS is on the rooms themselves, where somebody is reading."""
    return (
        '<div class="foot-groups">\n'
        '        <div class="foot-group"><div class="l">the stack</div>\n'
        f'          <div class="foot-chips">{chips(root, here)}</div>\n'
        '        </div>\n'
        # The two small shelves sit BESIDE each other rather than stacked: they
        # hold one item each, and a column of two one-item groups reads like a
        # list that ran out rather than like two categories (Yurii, 2026-08-03).
        '        <div class="foot-row">\n'
        '          <div class="foot-group"><div class="l">standalone</div>\n'
        f'            <div class="foot-chips">{chips(root, here, "standalone")}</div>\n'
        '          </div>\n'
        '          <div class="foot-group"><div class="l">side project</div>\n'
        f'            <div class="foot-chips">{side_chips(root, here)}</div>\n'
        '          </div>\n'
        '        </div>\n      </div>')


def cols(root, here):
    # The last column is three links. Four more were removed on 2026-08-05 by
    # @yurii, and each of them was reachable somewhere better:
    #
    #   Guides              a button in the top bar, on every page
    #   The people          a section of the front page, one scroll down
    #   Leave a note        the same action as the address beside it
    #   Yurii / Tania on LinkedIn   in the people section, next to the person
    #
    # A footer link that repeats the top bar earns nothing and spends a
    # reader's attention, twenty-eight pages over.
    #
    # The console link went with them and came back the same day, @yurii:
    # "щоб не було якихось непорозумінь". It reads `Console`, one word, to
    # match the two beside it: this column is three nouns, not a sentence and
    # two nouns. It said `Go to your console` until 2026-08-05.
    #
    # It is deliberately absent from the top bar, because it addresses somebody
    # who already runs a console of their own over their own tunnel, a
    # returning operator rather than a visitor, and the primary slot belongs to
    # what a stranger should do first. The footer is the only place that link
    # exists anywhere on the site, which is exactly why removing it was the one
    # item on that list with a cost.
    #
    # This rationale lives here rather than in an HTML comment on purpose: the
    # first version of it shipped into all 28 pages, which put an explanation
    # of our own housekeeping in front of every visitor and made a grep for
    # leftover links match its own footnote.
    return f"""    <div class="cols">
      <div>
        <a class="brand" href="{root}index.html" style="margin-bottom:10px">{BRAND_SVG}IT<b>-</b>RAT</a>
      </div>
      {groups(root, here)}
      <div>
        <a href="mailto:itratmail@gmail.com">itratmail@gmail.com</a>
        <a href="https://github.com/TAIPANBOX" target="_blank" rel="noopener">GitHub &#8599;</a>
        <a href="{root}console.html">Console</a>
      </div>
    </div>"""


def footer(path, root, tail, here):
    # NOTE on console.html, 2026-08-05. The footer link to it is the ONLY
    # inbound link it has anywhere: it is not in the top bar, not in the STACK
    # registry, so not on the rail, the walk or the palette, not in the sitemap,
    # and it carries noindex. It was removed with the rest of the column that
    # day and restored within the hour once that was measured and said out loud.
    # Take it out again and the page is reachable by typing the address and by
    # nothing else, which is also how it stops being noticed and gets deleted as
    # dead in some later sweep. It is not dead.
    #
    # Only the service pages carry a licence tag; everywhere else the line
    # ends at the flag. An empty tail means exactly that, separator included.
    #
    # This tail is now the ONLY licence the footer states. A second line used to
    # sit under the brand on every page reading "The agent-governance stack,
    # Apache-2.0.", and it was removed on 2026-08-05 for two reasons.
    #
    # It was a duplicate on the thirteen pages that carry a tail, which are
    # exactly the pages whose own body already explains their licence.
    #
    # And on one page it was simply wrong. services/sphere.html is MIT, so its
    # footer stated two different licences, one above the other. A line printed
    # unconditionally cannot be right about a page it does not read.
    #
    # The fourteen pages with no tail now state no licence, which is correct:
    # a glossary and a guide are not products and have nothing to license. The
    # products say it on their own pages, where a reader is deciding.
    suffix = f' &#183; {tail}' if tail else ''
    return (f'<footer class="footer">\n  <div class="wrap">\n<!-- footer:auto -->\n'
            f'{cols(root, here)}\n<!-- /footer:auto -->\n'
            f'    <div class="foot-note">&#169; 2026 IT-RAT {FLAG_SVG}{suffix}</div>\n'
            f'  </div>\n</footer>')


def service_id(path):
    h = (ROOT / path).read_text(encoding="utf-8")
    m = re.search(r'<body[^>]*data-service="([^"]+)"', h)
    return m.group(1) if m else ""


def rail_cards():
    """The corridor rail on the home page, as real links rather than JS output.

    Written when the rail was hand-maintained and then never called, which is
    the same defect the footer had: on 2026-08-03 the registry carried twelve
    services and this grid carried eleven, because adding one meant editing
    two places and somebody only edited one. Now main() writes it."""
    out = []
    for s in stack():
        out.append(
            f'      <a class="card hover svc" style="--c:{s["color"]}" href="{s["href"]}" data-dir="fwd">\n'
            f'        <span class="head"><span class="g"></span>'
            f'<span class="mono" style="font-size:11px;color:var(--faint)">{s["id"]}</span>'
            f'<span class="plane">{s["plane"]}</span></span>\n'

            f'        <h3>{s["name"]}</h3>\n'
            f'        <p class="what">{s["what"]}.</p>\n'
            f'        <span class="go">open the room'
            + (f'<span class="note">{s["note"]}</span>' if s["note"] else "")
            + '</span>\n'
            f'      </a>')
    return "\n".join(out)


def main():
    written = 0
    for path, (root, tail) in PAGES.items():
        p = ROOT / path
        h = p.read_text(encoding="utf-8")
        new = footer(path, root, tail, service_id(path))
        if "<footer" in h:
            h2 = re.sub(r"<footer.*?</footer>", lambda _: new, h, count=1, flags=re.S)
        else:  # 404 has none yet
            h2 = h.replace("<script src=", new + "\n\n<script src=", 1)
        if h2 != h:
            p.write_text(h2, encoding="utf-8")
            written += 1
        print(f"{path:28} {'written' if h2 != h else 'unchanged'}")

    # the home page keeps its desk-agent block; only the injected slot changes
    p = ROOT / "index.html"
    h = p.read_text(encoding="utf-8")
    # Match the whole foot-groups block, ending at its own closing tag rather
    # than the first </div> inside it.
    #
    # This used to be guarded by `id="foot-stack"` being present, which was
    # true only during the one-off migration away from the JS-rendered footer.
    # The id went with that migration, so the guard has been false ever since
    # and the home page silently stopped tracking the registry: adding a
    # service updated nineteen footers and not the one a stranger sees first.
    # The corridor rail, from the same registry. Anchored on the container's own
    # id rather than on the first and last card, so an empty rail can still be
    # filled and a hand-edited one is replaced whole.
    rail = re.search(r'(<div class="rail rv" id="svc-rail">\n)(.*?)(\n    </div>)', h, re.S)
    if not rail:
        sys.exit("index.html: could not find the corridor rail to update")
    want = rail_cards()
    if rail.group(2).strip() != want.strip():
        h = h[:rail.start(2)] + want + h[rail.end(2):]
        p.write_text(h, encoding="utf-8")
        print(f"{'index.html rail':28} written")
        written += 1
    else:
        print(f"{'index.html rail':28} unchanged")

    slot = re.search(r'<div class="foot-groups">.*?\n      </div>', h, re.S)
    static = groups("", "")
    if slot:
        if slot.group(0) == static:
            print(f"{'index.html':28} unchanged")
        else:
            h = h[:slot.start()] + static + h[slot.end():]
            p.write_text(h, encoding="utf-8")
            print(f"{'index.html':28} written")
            written += 1
    else:
        sys.exit("index.html: could not find the foot-groups block to update")
    print(f"\n{written} file(s) updated")


if __name__ == "__main__":
    main()
