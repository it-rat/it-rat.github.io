#!/usr/bin/env python3
"""Render the README hero banner from the same service registry as the site.

The first version of this banner was rendered by hand and then drifted: it kept
advertising rooms that had since been removed from `assets/site.js`, which is
the one place the stack is actually listed. Reading the registry here means the
banner cannot say something the site does not.

Needs Chrome and writes assets/img/readme/hero.png (2400x692, the 2x render of
a 1200x346 card).

Run from the repo root:  python3 tools/readmehero.py
"""
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
OUT = ROOT / "assets/img/readme/hero.png"
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
W, H = 1200, 346


def stack():
    """The service registry, straight out of assets/site.js."""
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    block = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
    out = []
    for line in block.group(1).splitlines():
        m = re.search(r'id:"([^"]+)".*?name:"([^"]+)".*?color:"([^"]+)"', line)
        if m:
            out.append({"id": m.group(1), "name": m.group(2), "color": m.group(3)})
    return out


def html(services):
    chips = "\n".join(
        f'<span class="chip"><i style="background:{s["color"]}"></i>{s["name"]}</span>'
        for s in services
    )
    return f"""<!doctype html><html><head><meta charset="utf-8"><style>
  * {{ box-sizing: border-box; margin: 0; }}
  html, body {{ width: {W}px; height: {H}px; }}
  body {{
    font-family: "SF Pro Display", -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
    color: #E9EFF6; overflow: hidden; position: relative;
    background:
      radial-gradient(760px 420px at 88% 8%, rgba(180,140,255,.13), transparent 60%),
      radial-gradient(620px 380px at 4% 96%, rgba(244,178,62,.10), transparent 62%),
      linear-gradient(140deg, #0A0E13 0%, #0C1118 46%, #0A0E13 100%);
  }}
  .grid {{
    position: absolute; inset: 0; opacity: .5;
    background-image:
      linear-gradient(rgba(255,255,255,.028) 1px, transparent 1px),
      linear-gradient(90deg, rgba(255,255,255,.028) 1px, transparent 1px);
    background-size: 48px 48px;
  }}
  .wire {{ position: absolute; inset: 0; }}
  .wrap {{ position: relative; height: 100%; display: flex; align-items: center;
           gap: 30px; padding: 0 52px; }}
  .left {{ flex: 1; min-width: 0; }}
  .kicker {{
    font-family: "SF Mono", ui-monospace, Menlo, monospace;
    font-size: 12.5px; letter-spacing: .18em; color: #8A97A6; margin-bottom: 14px;
  }}
  .kicker b {{ color: #F4B23E; font-weight: 400; }}
  .mark {{ font-size: 68px; font-weight: 800; letter-spacing: -.035em; line-height: 1; }}
  .mark span {{ color: #F4B23E; }}
  .lede {{ font-size: 19px; line-height: 1.45; color: #C6D2DF; margin-top: 16px; max-width: 520px; }}
  .lede b {{ color: #E9EFF6; font-weight: 600; }}
  .chips {{ display: flex; flex-wrap: wrap; gap: 8px; margin-top: 22px; max-width: 560px; }}
  .chip {{
    display: inline-flex; align-items: center; gap: 7px;
    font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 12.5px;
    padding: 6px 12px; border-radius: 999px;
    background: #10161F; border: 1px solid rgba(255,255,255,.09); color: #C6D2DF;
  }}
  .chip i {{ width: 7px; height: 7px; border-radius: 50%; display: block; }}
  .card {{
    width: 342px; flex: none; border-radius: 16px; padding: 18px 20px;
    background: linear-gradient(180deg, #141C27, #10161F);
    border: 1px solid rgba(255,255,255,.10);
    box-shadow: 0 24px 60px rgba(0,0,0,.45);
  }}
  .card .head {{
    display: flex; align-items: center; gap: 8px; padding-bottom: 13px;
    border-bottom: 1px solid rgba(255,255,255,.07);
    font-family: "SF Mono", ui-monospace, Menlo, monospace;
    font-size: 11.5px; letter-spacing: .13em; color: #8A97A6;
  }}
  .card .head i {{ width: 7px; height: 7px; border-radius: 50%; background: #F4B23E; }}
  .run {{ font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 12.5px;
          color: #8A97A6; margin-top: 14px; }}
  .amt {{ display: flex; justify-content: space-between; align-items: baseline; margin-top: 5px; }}
  .amt b {{ font-size: 22px; font-weight: 700; letter-spacing: -.01em; }}
  .amt span {{ font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 12px; color: #5A6675; }}
  .bar {{ height: 7px; border-radius: 999px; background: #0A0E13; margin-top: 9px; overflow: hidden; }}
  .bar i {{ display: block; height: 100%; width: 92%; border-radius: 999px;
            background: linear-gradient(90deg, #F4B23E, #FF574B); }}
  .rows {{ margin-top: 15px; }}
  .row {{
    display: flex; justify-content: space-between; padding: 9px 0;
    border-top: 1px solid rgba(255,255,255,.06);
    font-family: "SF Mono", ui-monospace, Menlo, monospace; font-size: 12.5px;
  }}
  .row .k {{ color: #8A97A6; }}
  .row .v {{ color: #E9EFF6; }}
  .row .v.on {{ color: #2DD4BF; }}
</style></head><body>
  <div class="grid"></div>
  <svg class="wire" viewBox="0 0 {W} {H}" fill="none">
    <path d="M36 326 C 250 330, 400 322, 520 302 S 700 214, 812 188"
          stroke="url(#g)" stroke-width="1.6"/>
    <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#F4B23E" stop-opacity="0"/>
      <stop offset=".45" stop-color="#F4B23E" stop-opacity=".55"/>
      <stop offset="1" stop-color="#B48CFF" stop-opacity=".35"/>
    </linearGradient></defs>
  </svg>
  <div class="wrap">
    <div class="left">
      <div class="kicker"><b>&#9889;</b> IT-RAT.COM &#183; STATIC SITE &#183; NO BUILD STEP</div>
      <div class="mark">IT-RAT<span>.</span></div>
      <div class="lede">The source of <b>it-rat.com</b>: an interactive control room
        for open agent governance, one room per service.</div>
      <div class="chips">{chips}</div>
    </div>
    <div class="card">
      <div class="head"><i></i>MONEY PLANE &#183; LIVE</div>
      <div class="run">run &#183; reconciliation-batch</div>
      <div class="amt"><b>$18.40</b><span>cap $20.00</span></div>
      <div class="bar"><i></i></div>
      <div class="rows">
        <div class="row"><span class="k">policy</span><span class="v on">enforced</span></div>
        <div class="row"><span class="k">kill switch</span><span class="v">passkey-signed</span></div>
        <div class="row"><span class="k">plane</span><span class="v">self-hosted</span></div>
      </div>
    </div>
  </div>
</body></html>"""


def main():
    if not pathlib.Path(CHROME).exists():
        sys.exit(f"Chrome not found at {CHROME}")
    services = stack()
    if not services:
        sys.exit("no services parsed out of assets/site.js")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        page = pathlib.Path(tmp) / "hero.html"
        page.write_text(html(services), encoding="utf-8")
        subprocess.run(
            [CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars",
             "--force-device-scale-factor=2", f"--window-size={W},{H}",
             f"--screenshot={OUT}", "--virtual-time-budget=3000", page.as_uri()],
            capture_output=True, timeout=120, check=False,
        )
    # Chrome exits non-zero on some hosts after writing the file, so trust the file.
    if not OUT.exists():
        sys.exit("Chrome wrote no screenshot")
    print(f"{OUT.relative_to(ROOT)}  ({len(services)} services)")


if __name__ == "__main__":
    main()
