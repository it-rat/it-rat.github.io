#!/usr/bin/env python3
"""Render one Open Graph image per page, from the same registry as everything else.

A shared og.png makes every link the site posts look identical in Slack,
LinkedIn and iMessage. One card per room costs nothing at runtime and is the
cheapest click-through win available.

Needs Chrome and writes assets/og/<id>.png, then points each page's
og:image and twitter:image at its own card.

Run from the repo root:  python3 tools/ogimages.py
"""
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/og"
SITE = "https://it-rat.com"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# id -> (page path, kicker, headline, line under it, accent)
EXTRA = {
    "index": ("index.html", "the agent-governance stack",
              "Run AI agents like a workforce, not a wildfire.",
              "Budgets, policy, identity, memory, crypto, quality and drills. Apache-2.0.", "#F4B23E"),
}


def stack():
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    block = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
    out = []
    for line in block.group(1).splitlines():
        m = re.search(r'id:"([^"]+)".*?name:"([^"]+)".*?plane:"([^"]+)".*?color:"([^"]+)".*?what:"([^"]+)".*?href:"([^"]+)"', line)
        if m:
            out.append(dict(zip(("id", "name", "plane", "color", "what", "href"), m.groups())))
    return out


CARD = """<!doctype html><meta charset="utf-8">
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:630px;overflow:hidden}
  body{background:#0A0E13;color:#E9EFF6;
    font-family:"SF Pro Display",-apple-system,BlinkMacSystemFont,system-ui,sans-serif;
    display:flex;flex-direction:column;justify-content:space-between;padding:64px 72px;position:relative}
  .glow{position:absolute;right:-160px;top:-160px;width:620px;height:620px;border-radius:50%;
    background:radial-gradient(circle,ACCENT 0%,transparent 62%);opacity:.20}
  .top{display:flex;align-items:center;gap:14px;position:relative}
  .mark{width:34px;height:34px}
  .brand{font-size:22px;font-weight:700;letter-spacing:-.01em}
  .brand b{color:#F4B23E;font-weight:700}
  .kick{margin-left:auto;font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:14px;
    letter-spacing:.18em;text-transform:uppercase;color:ACCENT}
  h1{font-size:HSIZE;line-height:1.06;letter-spacing:-.028em;font-weight:700;max-width:19ch;position:relative}
  h1 .nm{color:ACCENT}
  p{margin-top:24px;font-size:25px;line-height:1.45;color:#8A97A6;max-width:44ch;position:relative}
  .foot{display:flex;align-items:center;gap:16px;position:relative;
    font-family:"SF Mono",ui-monospace,Menlo,monospace;font-size:16px;color:#5A6675}
  .dot{width:9px;height:9px;border-radius:50%;background:ACCENT;box-shadow:0 0 18px ACCENT}
  .rule{flex:1;height:1px;background:linear-gradient(90deg,rgba(255,255,255,.13),transparent)}
</style>
<div class="glow"></div>
<div class="top">
  <svg class="mark" viewBox="0 0 24 24" fill="none"><path d="M13.5 2 5 13.2h5.1L9.4 22l9-11.8h-5.3L13.5 2Z" fill="#F4B23E"/></svg>
  <span class="brand">IT<b>-</b>RAT</span>
  <span class="kick">KICKER</span>
</div>
<div>
  <h1>HEADLINE</h1>
  <p>SUB</p>
</div>
<div class="foot"><span class="dot"></span>it-rat.com<span class="rule"></span>TAIL</div>
"""


def render(html, png):
    with tempfile.TemporaryDirectory() as td:
        src = pathlib.Path(td) / "card.html"
        src.write_text(html, encoding="utf-8")
        subprocess.run(
            ["/bin/bash", "-c",
             f'set -m; "{CHROME}" --headless=new --disable-gpu --hide-scrollbars '
             f'--window-size=1200,630 --virtual-time-budget=3000 '
             f'--screenshot="{png}" "file://{src}" >/dev/null 2>&1 & p=$!; sleep 8; '
             f'kill -- -$p 2>/dev/null; true'],
            check=False)
    return png.exists()


def card(kicker, headline, sub, accent, tail, nm=""):
    head = headline
    if nm:
        head = headline.replace(nm, f'<span class="nm">{nm}</span>', 1)
    size = "62px" if len(headline) < 46 else "54px"
    return (CARD.replace("ACCENT", accent).replace("HSIZE", size)
            .replace("KICKER", kicker).replace("HEADLINE", head)
            .replace("SUB", sub).replace("TAIL", tail))


def main():
    if not pathlib.Path(CHROME).exists():
        sys.exit("Chrome not found; nothing rendered")
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = []

    path, kicker, headline, sub, accent = EXTRA["index"]
    jobs.append(("index", path, card(kicker, headline, sub, accent, "Apache-2.0")))

    for s in stack():
        tail = "Genaryx" if s["id"] == "enterprise" else "Apache-2.0"
        head = f'{s["name"]}. {s["what"]}.'
        jobs.append((s["id"], s["href"],
                     card(f'{s["plane"]} plane', head, "", s["color"], tail, nm=s["name"])))

    ok = 0
    for ident, page, html in jobs:
        png = OUT / f"{ident}.png"
        if not render(html, png):
            print(f"{ident:12} RENDER FAILED")
            continue
        url = f"{SITE}/assets/og/{ident}.png"
        p = ROOT / page
        h = p.read_text(encoding="utf-8")
        h2 = re.sub(r'(<meta property="og:image" content=")[^"]+(")', lambda m: m.group(1) + url + m.group(2), h)
        h2 = re.sub(r'(<meta name="twitter:image" content=")[^"]+(")', lambda m: m.group(1) + url + m.group(2), h2)
        if h2 != h:
            p.write_text(h2, encoding="utf-8")
        size = png.stat().st_size // 1024
        print(f"{ident:12} {size:4} KB  -> {page}")
        ok += 1
    print(f"\n{ok} card(s) rendered")


if __name__ == "__main__":
    main()
