#!/usr/bin/env node
// svg-fit.mjs: measures every drawing on the site in a real browser.
//
// WHY THIS EXISTS
//
// The schematics, charts and animations on the service pages and guides are
// hand-drawn inline SVG plus canvas simulations. A label that runs past its
// box, two labels drawn on top of each other, or an arrow that points at
// nothing renders without an error, passes every other gate here, and is only
// found by a person who happens to look at the right page, at the right
// width, at the right moment of the animation. This measures instead of
// looking.
//
// HOW
//
// No npm dependencies. It launches Chrome headless (path from $CHROME, else
// the macOS default), drives it over the DevTools Protocol with Node's
// built-in WebSocket, and for every page, at every viewport:
//   - loads it, adds class "in" to every .rv (the reveal hides content until
//     it is scrolled to), scrolls through the page so observers fire;
//   - measures at several moments after load (animations are pure functions
//     of time), once more with prefers-reduced-motion: reduce emulated (the
//     end state), and after clicking every tab-like control one by one, in
//     both modes;
//   - collects console errors and uncaught exceptions per phase.
//
// THE CHECKS, per inline <svg> drawing (an svg with text, or wider than 120px)
// and per <img> of an .svg file (loaded on its own):
//   1. a <text> fits the smallest rect, rect-like path or circle containing
//      its anchor point, with SLACK user units on every side (getBBox, so the
//      font's ascent and descent count); text in no box is held to the viewBox;
//   2. no text overlaps other text (ink boxes, area > 2), is crossed by a
//      connector through its glyphs (unless an opaque shape painted between
//      the two hides the crossing), or is covered by or runs into a box;
//   3. nothing visible lies beyond the viewBox by more than 1 unit;
//   4. every connector with a marker (and every dashed connector) ends within
//      ARROW_TOL units of the edge of some box, node, label or line; the arrow
//      tip is computed from the marker's own geometry;
//   5. around the drawings: HTML text clipped by overflow hidden or clip, HTML
//      text colliding with other text, boxes or drawing content, and anything
//      wider than the viewport.
// Canvas drawings (the simulations) are measured through a hook on
// fillText/strokeText: text cut by the canvas edge counts under 3, canvas text
// overlapping canvas text under 2.
//
// WHAT IT DOES NOT DO. It does not judge whether a drawing is right, only
// whether its geometry is. Fonts are the ones on the machine it runs on, so a
// run on macOS measures SF Pro and SF Mono, not what a Windows reader gets. It
// samples moments; a collision that lasts 200 ms between two samples is not
// seen. Its findings still need a reader: findings.md carries a verdict column
// for that, and the false-positive rate is what decides whether this can ever
// become a gate. It is not wired into any workflow.
//
// CALIBRATION, from the first reviewed sweep (@measured `scripts/svg-fit.sh
// --workers 6` 2026-10-17: 51 pages, 728 measurements, 332 distinct lines,
// each read against its crop: 61 REAL, 225 BORDERLINE, 46 FALSE). What that
// reading turned into rules, so the next reader does not undo them:
//   - a box painted over a text is a cover (check 2), never its container;
//   - an anchor on a box edge (an axis tick under a band) is not inside it;
//   - "overflows" needs the glyph ink past the edge; a font cell past it with
//     the ink inside is only "tight";
//   - text over a borderless band painted beneath it is not a collision;
//   - a box still fading in counts as an arrow target, or every arrow drawn
//     before its box is "in space" for the first second;
//   - fixed and sticky elements, and whatever an ancestor scroller or clipper
//     hides, are not HTML collisions; fillText's maxWidth squeezes the text;
//   - the decorative ambient canvas is reported apart from the drawings.
// What it still reports and a reader has to mark: every room's arrows stop
// 6.6 to 7.9 units short of their box by house style (69 lines; a tolerance
// of 8 would pass all of them), dashed chart guides read as connectors, and
// labels that fit with less than 4 units to spare.
//
// USAGE
//   scripts/svg-fit.sh [--out DIR] [--pages a.html,services/b.html]
//                      [--viewports 1440x900,390x844] [--moments 500,2000,5000,9000]
//                      [--workers 4] [--no-clicks] [--no-crops] [--no-contact]
//                      [--fail-on text-overflows-box,...]
//   node scripts/svg-fit.mjs --base http://127.0.0.1:PORT/ [same flags]
//   node scripts/svg-fit.mjs --render --out DIR   (rewrite findings.md from
//        findings.json plus DIR/review.json, no browser)
//
// Exit status: 0 when it measured something, 2 when it measured nothing (no
// pages, or no drawing on any page), 1 when --fail-on names a kind it found.

import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));

// ---------------------------------------------------------------- arguments
function parseArgs(argv) {
  const a = {
    base: null, root: path.resolve(HERE, ".."), out: path.resolve("svgfit-out"),
    pages: null, viewports: "1440x900,390x844", moments: "500,2000,5000,9000",
    workers: Math.max(1, Math.min(6, os.cpus().length - 2)), clicks: true, crops: true,
    contact: true, slack: 4, arrowTol: 6, failOn: [], render: false, quiet: false,
    clickWaitMotion: 1200, clickWaitReduced: 400,
  };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = () => argv[++i];
    if (k === "--base") a.base = v();
    else if (k === "--root") a.root = path.resolve(v());
    else if (k === "--out") a.out = path.resolve(v());
    else if (k === "--pages") a.pages = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--viewports") a.viewports = v();
    else if (k === "--moments") a.moments = v();
    else if (k === "--workers") a.workers = Math.max(1, parseInt(v(), 10) || 1);
    else if (k === "--no-clicks") a.clicks = false;
    else if (k === "--no-crops") a.crops = false;
    else if (k === "--no-contact") a.contact = false;
    else if (k === "--slack") a.slack = parseFloat(v());
    else if (k === "--arrow-tol") a.arrowTol = parseFloat(v());
    else if (k === "--fail-on") a.failOn = v().split(",").map((s) => s.trim()).filter(Boolean);
    else if (k === "--render") a.render = true;
    else if (k === "--quiet") a.quiet = true;
    else if (k === "-h" || k === "--help") { console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("\n").filter((l) => l.startsWith("//")).map((l) => l.slice(3)).join("\n")); process.exit(0); }
    else { console.error(`svg-fit: unknown argument ${k}`); process.exit(64); }
  }
  a.viewports = a.viewports.split(",").map((s) => { const [w, h] = s.split("x").map(Number); return { w, h, name: `${w}x${h}` }; });
  a.moments = a.moments.split(",").map(Number).filter((n) => n >= 0).sort((x, y) => x - y);
  return a;
}
const ARGS = parseArgs(process.argv.slice(2));
const log = (...m) => { if (!ARGS.quiet) console.error(...m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- pages
function discoverPages(root) {
  const outp = [];
  const walk = (dir) => {
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      if (ent.name.startsWith(".") || ent.name === "node_modules") continue;
      const p = path.join(dir, ent.name);
      const rel = path.relative(root, p).split(path.sep).join("/");
      if (ent.isDirectory()) { if (rel === "demo" || rel.startsWith("svgaudit")) continue; walk(p); continue; }
      if (!ent.name.endsWith(".html")) continue;
      if (rel === "404.html" || rel === "console.html") continue;
      const head = fs.readFileSync(p, "utf8").slice(0, 6000);
      if (/<meta[^>]+http-equiv=["']?refresh/i.test(head)) continue; // redirect page
      outp.push(rel);
    }
  };
  walk(root);
  return outp.sort();
}

// ---------------------------------------------------------------- CDP
class Chrome {
  static async launch() {
    const bin = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    if (!fs.existsSync(bin)) throw new Error(`Chrome not found at ${bin}; set CHROME`);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "svgfit-chrome-"));
    const proc = spawn(bin, [
      "--headless=new", "--remote-debugging-port=0", `--user-data-dir=${dir}`,
      "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--hide-scrollbars",
      "--mute-audio", "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows", "--disable-features=Translate,MediaRouter",
      "--force-color-profile=srgb", "about:blank",
    ], { stdio: ["ignore", "ignore", "ignore"] });
    const portFile = path.join(dir, "DevToolsActivePort");
    for (let i = 0; i < 300 && !fs.existsSync(portFile); i++) await sleep(50);
    if (!fs.existsSync(portFile)) { proc.kill("SIGKILL"); throw new Error("Chrome did not open a DevTools port"); }
    let txt = "";
    for (let i = 0; i < 40; i++) { txt = fs.readFileSync(portFile, "utf8"); if (txt.split("\n").length >= 2 && txt.split("\n")[1]) break; await sleep(50); }
    const [port, wsPath] = txt.trim().split("\n");
    const c = new Chrome(proc, dir);
    await c.connect(`ws://127.0.0.1:${port}${wsPath}`);
    return c;
  }
  constructor(proc, dir) { this.proc = proc; this.dir = dir; this.id = 0; this.pending = new Map(); this.handlers = new Map(); }
  connect(url) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      this.ws = ws;
      ws.onopen = () => resolve();
      ws.onerror = (e) => reject(new Error("websocket error " + (e.message || "")));
      ws.onclose = () => { for (const [, p] of this.pending) p.reject(new Error("browser connection closed")); this.pending.clear(); this.closed = true; };
      ws.onmessage = (ev) => {
        const msg = JSON.parse(typeof ev.data === "string" ? ev.data : Buffer.from(ev.data).toString());
        if (msg.id) {
          const p = this.pending.get(msg.id); if (!p) return; this.pending.delete(msg.id);
          if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`)); else p.resolve(msg.result);
        } else {
          const hs = this.handlers.get(`${msg.sessionId || ""}|${msg.method}`);
          if (hs) for (const h of hs) h(msg.params);
        }
      };
    });
  }
  send(method, params = {}, sessionId, timeout = 60000) {
    if (this.closed) return Promise.reject(new Error("browser connection closed"));
    const id = ++this.id;
    const msg = { id, method, params }; if (sessionId) msg.sessionId = sessionId;
    return new Promise((resolve, reject) => {
      const t = setTimeout(() => { this.pending.delete(id); reject(new Error(`${method}: timed out`)); }, timeout);
      this.pending.set(id, { method, resolve: (v) => { clearTimeout(t); resolve(v); }, reject: (e) => { clearTimeout(t); reject(e); } });
      this.ws.send(JSON.stringify(msg));
    });
  }
  on(sessionId, method, fn) { const k = `${sessionId || ""}|${method}`; if (!this.handlers.has(k)) this.handlers.set(k, []); this.handlers.get(k).push(fn); }
  async newPage() {
    const { targetId } = await this.send("Target.createTarget", { url: "about:blank" });
    const { sessionId } = await this.send("Target.attachToTarget", { targetId, flatten: true });
    return new Page(this, sessionId, targetId);
  }
  async close() { try { await this.send("Browser.close", {}, undefined, 3000); } catch {} try { this.proc.kill("SIGKILL"); } catch {} try { fs.rmSync(this.dir, { recursive: true, force: true }); } catch {} }
}

class Page {
  constructor(b, sid, tid) { this.b = b; this.sid = sid; this.tid = tid; this.phase = "load"; this.errors = []; }
  send(m, p, t) { return this.b.send(m, p, this.sid, t); }
  on(m, fn) { this.b.on(this.sid, m, fn); }
  async init() {
    await this.send("Page.enable"); await this.send("Runtime.enable"); await this.send("Log.enable");
    await this.send("Page.addScriptToEvaluateOnNewDocument", { source: CANVAS_HOOK });
    try { await this.send("Emulation.setFocusEmulationEnabled", { enabled: true }); } catch {}
    this.on("Runtime.consoleAPICalled", (p) => {
      if (p.type !== "error" && p.type !== "assert") return;
      const text = (p.args || []).map((x) => x.value !== undefined ? String(x.value) : (x.description || x.type)).join(" ");
      this.errors.push({ phase: this.phase, source: "console." + p.type, text: text.slice(0, 400) });
    });
    this.on("Runtime.exceptionThrown", (p) => {
      const d = p.exceptionDetails || {};
      const text = (d.exception && d.exception.description) || d.text || "exception";
      this.errors.push({ phase: this.phase, source: "exception", text: String(text).split("\n").slice(0, 3).join(" | ").slice(0, 400), url: d.url, line: d.lineNumber });
    });
    this.on("Log.entryAdded", (p) => {
      const e = p.entry || {}; if (e.level !== "error") return;
      this.errors.push({ phase: this.phase, source: "log." + e.source, text: String(e.text).slice(0, 400), url: e.url });
    });
  }
  async eval(expr, timeout = 60000) {
    const r = await this.send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, timeout);
    if (r.exceptionDetails) throw new Error("in-page: " + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result.value;
  }
  async call(fn, arg, timeout) { return this.eval(`(${fn.toString()})(${JSON.stringify(arg === undefined ? null : arg)})`, timeout); }
  async goto(url, timeout = 30000) {
    const loaded = new Promise((resolve) => { this._onload = resolve; });
    if (!this._wired) { this._wired = true; this.on("Page.loadEventFired", () => { if (this._onload) { const f = this._onload; this._onload = null; f(); } }); }
    const r = await this.send("Page.navigate", { url });
    if (r.errorText) throw new Error(`navigate ${url}: ${r.errorText}`);
    await Promise.race([loaded, sleep(timeout)]);
  }
  async viewport(vp, reduced) {
    const mobile = vp.w < 768;
    await this.send("Emulation.setDeviceMetricsOverride", { width: vp.w, height: vp.h, deviceScaleFactor: mobile ? 2 : 1, mobile });
    await this.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: reduced ? "reduce" : "no-preference" }] });
  }
  async shot(clip, beyond = false) {
    const r = await this.send("Page.captureScreenshot", { format: "png", clip: { ...clip, scale: 1 }, captureBeyondViewport: beyond, fromSurface: true }, 60000);
    return Buffer.from(r.data, "base64");
  }
}

// ---------------------------------------------------------------- canvas hook
// Installed before any page script runs. Records every fillText/strokeText
// with its ink box in canvas device pixels, the frame it was drawn in, and its
// alpha; a full-canvas clear starts a new list.
const CANVAS_HOOK = `(() => {
  if (window.__svgfitCanvas) return;
  const P = CanvasRenderingContext2D.prototype;
  const logs = new Map();
  let frame = -1;
  const rAF = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = function (cb) { return rAF(function (ts) { frame = ts; return cb(ts); }); };
  function alphaOf(st) {
    if (typeof st !== "string") return 1;
    const m = st.match(/rgba?\\(([^)]+)\\)/);
    if (!m) { if (/^#[0-9a-f]{8}$/i.test(st)) return parseInt(st.slice(7, 9), 16) / 255; return 1; }
    const p = m[1].split(/[\\s,\\/]+/).filter(Boolean);
    return p.length >= 4 ? parseFloat(p[3]) * (p[3].endsWith("%") ? 0.01 : 1) : 1;
  }
  function rec(ctx, text, x, y, stroke, maxWidth) {
    const c = ctx.canvas; if (!c || !(c instanceof HTMLCanvasElement)) return;
    const s = String(text); if (!s.trim()) return;
    const m = ctx.measureText(s), T = ctx.getTransform();
    let L = m.actualBoundingBoxLeft, R = m.actualBoundingBoxRight; const A = m.actualBoundingBoxAscent, D = m.actualBoundingBoxDescent;
    if (maxWidth !== undefined && maxWidth > 0 && m.width > maxWidth) { const k = maxWidth / m.width; L *= k; R *= k; } // fillText squeezes to maxWidth
    const pts = [[x - L, y - A], [x + R, y - A], [x - L, y + D], [x + R, y + D]].map(([px, py]) => [T.a * px + T.c * py + T.e, T.b * px + T.d * py + T.f]);
    const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
    let arr = logs.get(c); if (!arr) { arr = []; logs.set(c, arr); }
    arr.push({ text: s.slice(0, 80), x0: Math.min(...xs), y0: Math.min(...ys), x1: Math.max(...xs), y1: Math.max(...ys),
      alpha: ctx.globalAlpha * alphaOf(stroke ? ctx.strokeStyle : ctx.fillStyle), frame, w: c.width, h: c.height, font: ctx.font, stroke: !!stroke });
    if (arr.length > 4000) arr.splice(0, 2000);
  }
  function reset(ctx, w, h, opaque) {
    const c = ctx.canvas; if (!c || !logs.has(c) || !opaque) return;
    const T = ctx.getTransform();
    if (Math.abs(w * T.a * h * T.d) >= 0.95 * c.width * c.height) logs.set(c, []);
  }
  const fT = P.fillText, sT = P.strokeText, cR = P.clearRect, fR = P.fillRect;
  P.fillText = function (t, x, y, mw) { try { rec(this, t, x, y, false, mw); } catch (e) {} return fT.apply(this, arguments); };
  P.strokeText = function (t, x, y, mw) { try { rec(this, t, x, y, true, mw); } catch (e) {} return sT.apply(this, arguments); };
  P.clearRect = function (x, y, w, h) { try { reset(this, w, h, true); } catch (e) {} return cR.apply(this, arguments); };
  P.fillRect = function (x, y, w, h) { try { reset(this, w, h, this.globalAlpha * alphaOf(this.fillStyle) >= 0.95); } catch (e) {} return fR.apply(this, arguments); };
  window.__svgfitCanvas = { list: () => [...logs.keys()].filter((c) => c.isConnected), get: (c) => logs.get(c) || [] };
})();`;

// ---------------------------------------------------------------- in-page: prepare
// Adds "in" to every .rv and scrolls through the page one frame per step so
// intersection observers fire. Returns how long that took.
async function inPagePrepare() {
  const t0 = performance.now();
  const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
  document.querySelectorAll(".rv").forEach((el) => el.classList.add("in"));
  const H = () => Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
  const step = Math.max(200, Math.floor(innerHeight * 0.8));
  // the site sets html{scroll-behavior:smooth}; a smooth scroll would never arrive
  for (let y = 0; y < H(); y += step) { scrollTo({ top: y, behavior: "instant" }); await frame(); }
  scrollTo({ top: H(), behavior: "instant" }); await frame();
  try { await Promise.race([document.fonts.ready, new Promise((r) => setTimeout(r, 1500))]); } catch (e) {}
  return { ms: Math.round(performance.now() - t0), height: H(), visibility: document.visibilityState };
}

// ---------------------------------------------------------------- in-page: controls
function inPageControls(arg) {
  const SEL = '[role=tab], .fl-tab, button[aria-pressed], [data-tab], [class*="tabs"] button';
  const vis = (el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 0 && r.height > 0 && s.visibility === "visible" && s.display !== "none"; };
  const ctls = [...document.querySelectorAll(SEL)].filter((el) => !el.closest("header, footer, nav, .dg-ov, [data-cmdk]") && vis(el) && !el.disabled);
  document.querySelectorAll("[data-svgfit-ctl]").forEach((el) => el.removeAttribute("data-svgfit-ctl"));
  ctls.forEach((el, i) => el.setAttribute("data-svgfit-ctl", String(i)));
  const label = (el) => {
    const g = el.closest('[role=group],[role=tablist],[aria-label]');
    const gl = g && g !== el ? (g.getAttribute("aria-label") || "") : "";
    const t = (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim();
    return (gl ? gl + ": " : "") + t;
  };
  if (arg && arg.click != null) {
    const want = arg.click;
    let el = ctls.find((c, i) => i === want.i && label(c) === want.label) || ctls.find((c) => label(c) === want.label);
    if (!el) return { clicked: false };
    document.querySelectorAll("[data-svgfit-scope]").forEach((x) => x.removeAttribute("data-svgfit-scope"));
    const scope = el.closest(".flight, figure, .frame, .diagram, section, main") || document.body;
    scope.setAttribute("data-svgfit-scope", "1");
    el.scrollIntoView({ block: "center", inline: "nearest", behavior: "instant" });
    el.click();
    return { clicked: true };
  }
  return ctls.map((el, i) => ({ i, label: label(el).slice(0, 90) }));
}

// ---------------------------------------------------------------- in-page: measure
// Everything geometric happens here, in the svg's own user units. Returns the
// findings and a registry the crop step uses to find each element again.
function inPageMeasure(opts) {
  const SLACK = opts.slack, ATOL = opts.arrowTol;
  const S = window.__svgfit || (window.__svgfit = {});
  S.reg = new Map(); let refSeq = 0;
  const reg = (fn) => { const id = ++refSeq; S.reg.set(id, fn); return id; };
  const docRoot = document.body || document.documentElement; // an .svg file loaded on its own has no body
  const scopeRoot = opts.scoped ? (document.querySelector("[data-svgfit-scope]") || docRoot) : docRoot;
  const stats = { drawings: 0, hiddenDrawings: 0, svgElements: 0, texts: 0, boxes: 0, connectors: 0, arrows: 0,
    canvases: 0, canvasTexts: 0, htmlElements: 0, occludedCrossings: 0, clipSkipped: 0, clippedNonText: 0 };
  const findings = [], drawings = [];
  const csCache = new Map();
  const cs = (e) => { let s = csCache.get(e); if (!s) { s = getComputedStyle(e); csCache.set(e, s); } return s; };
  const r1 = (n) => Math.round(n * 10) / 10;
  const bxr = (b) => [r1(b.x0), r1(b.y0), r1(b.x1), r1(b.y1)];
  const clean = (s) => (s || "").replace(/\s+/g, " ").trim();
  const alphaOf = (c) => {
    if (!c || c === "none" || c === "transparent") return 0;
    if (c.startsWith("url(")) return 1;
    const sl = c.match(/\/\s*([\d.]+%?)\s*\)$/); if (sl) return parseFloat(sl[1]) * (sl[1].endsWith("%") ? 0.01 : 1);
    const m = c.match(/rgba?\(([^)]+)\)/); if (!m) return 1;
    const p = m[1].split(/[\s,]+/).filter(Boolean);
    return p.length >= 4 ? parseFloat(p[3]) * (p[3].endsWith("%") ? 0.01 : 1) : 1;
  };
  const opacUpTo = (e, stop) => {
    let o = 1;
    for (let x = e; x && x.nodeType === 1; x = x.parentElement) {
      const s = cs(x); if (s.display === "none") return 0;
      o *= parseFloat(s.opacity); if (x === stop) break;
    }
    return o;
  };
  const inter = (a, b) => { const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0), h = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0); return w > 0 && h > 0 ? { w, h, area: w * h } : null; };
  const area = (b) => Math.max(0, b.x1 - b.x0) * Math.max(0, b.y1 - b.y0);
  const contains = (b, p, m = 0) => p.x >= b.x0 - m && p.x <= b.x1 + m && p.y >= b.y0 - m && p.y <= b.y1 + m;
  const headingFor = (el) => {
    const sec = el.closest("figure, .flight, section, .card") || el.parentElement;
    const h = sec && sec.querySelector("figcaption, h2, h3, .kicker");
    return h ? clean(h.textContent).slice(0, 70) : "";
  };
  const NONRENDER = new Set(["defs", "marker", "clippath", "mask", "pattern", "symbol", "title", "desc", "metadata",
    "lineargradient", "radialgradient", "filter", "style", "script", "animate", "animatemotion", "animatetransform", "set", "mpath", "stop"]);
  const mctx = S.mctx || (S.mctx = new OffscreenCanvas(8, 8).getContext("2d"));
  const fontMetrics = (s, str) => {
    mctx.font = `${s.fontStyle} ${s.fontWeight} ${s.fontSize} ${s.fontFamily}`;
    try { mctx.letterSpacing = s.letterSpacing === "normal" ? "0px" : s.letterSpacing; } catch (e) {}
    return mctx.measureText(str);
  };

  // ---- svg drawings
  const svgs = [...document.querySelectorAll("svg")].filter((s) => !(s.parentElement && s.parentElement.closest("svg")) && scopeRoot.contains(s) && !s.closest(".dg-ov"));
  const svgPlans = []; // for the HTML pass
  let drawIdx = -1;
  for (const svg of svgs) {
    const all = [...document.querySelectorAll("svg")];
    const docIndex = all.indexOf(svg);
    const hasText = !!svg.querySelector("text");
    const rect = svg.getBoundingClientRect();
    if (!hasText && rect.width < 120) continue; // an icon, not a drawing
    drawIdx++;
    const name = clean(svg.getAttribute("aria-label")) || svg.id || headingFor(svg) || `svg #${docIndex}`;
    const dOpac = svg.parentElement ? opacUpTo(svg.parentElement, null) : 1;
    if (rect.width === 0 || rect.height === 0 || cs(svg).display === "none" || dOpac < 0.05) { stats.hiddenDrawings++; continue; }
    const rootCTM = svg.getScreenCTM(); if (!rootCTM) { stats.hiddenDrawings++; continue; }
    stats.drawings++;
    const inv = rootCTM.inverse();
    const vbv = svg.viewBox && svg.viewBox.baseVal;
    const VB = vbv && vbv.width > 0 ? { x0: vbv.x, y0: vbv.y, x1: vbv.x + vbv.width, y1: vbv.y + vbv.height }
      : { x0: 0, y0: 0, x1: (svg.width && svg.width.baseVal.value) || rect.width, y1: (svg.height && svg.height.baseVal.value) || rect.height };
    const vbArea = area(VB);
    const D = { index: docIndex, name, kind: "svg", opacity: r1(dOpac) };
    drawings.push({ ...D, vb: bxr(VB), w: Math.round(rect.width), h: Math.round(rect.height) });
    const tp = (m, x, y) => ({ x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f });
    const mOf = (e) => { const m = e.getScreenCTM(); return m ? inv.multiply(m) : null; };
    const aabb = (m, b) => {
      const p = [tp(m, b.x, b.y), tp(m, b.x + b.width, b.y), tp(m, b.x, b.y + b.height), tp(m, b.x + b.width, b.y + b.height)];
      return { x0: Math.min(...p.map((q) => q.x)), y0: Math.min(...p.map((q) => q.y)), x1: Math.max(...p.map((q) => q.x)), y1: Math.max(...p.map((q) => q.y)) };
    };
    const clientToRoot = (r) => {
      const p = [new DOMPoint(r.left, r.top), new DOMPoint(r.right, r.top), new DOMPoint(r.left, r.bottom), new DOMPoint(r.right, r.bottom)].map((q) => q.matrixTransform(inv));
      return { x0: Math.min(...p.map((q) => q.x)), y0: Math.min(...p.map((q) => q.y)), x1: Math.max(...p.map((q) => q.x)), y1: Math.max(...p.map((q) => q.y)) };
    };
    // root user units -> client rect, at the time of the call (used for crops)
    const rootToClient = (b) => {
      const m = svg.getScreenCTM(); if (!m) return null;
      const p = [new DOMPoint(b.x0, b.y0), new DOMPoint(b.x1, b.y0), new DOMPoint(b.x0, b.y1), new DOMPoint(b.x1, b.y1)].map((q) => q.matrixTransform(m));
      return { x: Math.min(...p.map((q) => q.x)), y: Math.min(...p.map((q) => q.y)), x1: Math.max(...p.map((q) => q.x)), y1: Math.max(...p.map((q) => q.y)) };
    };
    const inNonRender = (e) => { for (let x = e; x && x !== svg; x = x.parentElement) if (NONRENDER.has(x.localName.toLowerCase())) return true; return false; };
    const hasClip = (e) => { for (let x = e; x && x !== svg.parentElement; x = x.parentElement) { const s = cs(x); if ((s.clipPath && s.clipPath !== "none") || (s.mask && s.mask !== "none" && x !== svg)) return true; } return false; };
    const els = [...svg.querySelectorAll("*")].filter((e) => !inNonRender(e));
    stats.svgElements += els.length;
    const order = new Map(els.map((e, i) => [e, i]));
    const texts = [], boxes = [], conns = [], visEls = [], ghosts = [];
    const describe = (e) => ({ tag: e.localName, text: clean(e.textContent).slice(0, 80), id: e.id || undefined, cls: (e.getAttribute("class") || undefined) });
    // a key that survives scripts inserting elements and tokens moving: the element's own
    // signature plus its rank among elements with the same signature
    const sigCount = new Map(), sigOf = new Map();
    const sig = (e) => {
      if (sigOf.has(e)) return sigOf.get(e);
      const tag = e.localName, a = (n) => e.getAttribute(n) || "";
      let k = tag === "text" ? `text:${clean(e.textContent).slice(0, 40)}`
        : tag === "line" ? `line:${a("x1")},${a("y1")},${a("x2")},${a("y2")}`
        : tag === "path" ? `path:${a("d").slice(0, 60)}`
        : tag === "polyline" || tag === "polygon" ? `${tag}:${a("points").slice(0, 60)}`
        : tag === "rect" ? `rect:${a("width")}x${a("height")}:${a("fill")}${a("class")}`
        : tag === "circle" ? `circle:${a("r")}:${a("fill")}${a("class")}`
        : `${tag}:${a("class")}`;
      const n = sigCount.get(k) || 0; sigCount.set(k, n + 1);
      k = `${k}#${n}`; sigOf.set(e, k); return k;
    };
    for (const e of els) sig(e);
    for (const e of els) {
      const tag = e.localName.toLowerCase();
      if (tag === "tspan" || tag === "textpath" || tag === "svg" || tag === "g" || tag === "a" || tag === "switch") continue;
      const s = cs(e);
      if (s.visibility !== "visible") continue;
      const op = opacUpTo(e, svg);
      if (op < 0.05) {
        // a box still fading in is where an arrow already drawn will land: keep it as an arrow target only
        if (tag === "rect" && (() => { try { return e.getAnimations().length > 0 || (e.closest(".dg-el") && !e.closest(".dg-done")); } catch (err) { return false; } })()) {
          try { const m0 = mOf(e), bb0 = e.getBBox(); if (m0 && bb0.width >= 8 && bb0.height >= 8) ghosts.push({ el: e, kind: "rect", b: aabb(m0, bb0), label: "", ghost: true }); } catch (err) {}
        }
        continue;
      }
      let m; try { m = mOf(e); } catch (err) { m = null; }
      if (!m) continue;
      const fillA = alphaOf(s.fill) * parseFloat(s.fillOpacity || 1);
      const strokeW = parseFloat(s.strokeWidth) || 0;
      const strokeA = s.stroke && s.stroke !== "none" && strokeW > 0 ? alphaOf(s.stroke) * parseFloat(s.strokeOpacity || 1) : 0;
      const animating = (() => { try { return e.getAnimations().some((a) => a.playState === "running" && a.effect && a.effect.getTiming && isFinite(a.effect.getTiming().iterations)); } catch (err) { return false; } })();
      const base = { el: e, tag, order: order.get(e), op, m, fillA, strokeA, strokeW, s, animating };
      if (tag === "text") {
        if (fillA * op < 0.05 && strokeA * op < 0.05) continue;
        const content = clean(e.textContent); if (!content) continue;
        let bb; try { bb = e.getBBox(); } catch (err) { continue; }
        if (!bb || (bb.width === 0 && bb.height === 0)) continue;
        const cell = aabb(m, bb);
        // ink lines: per positioned tspan when the text is multi-line
        const lineEls = [...e.children].filter((c) => c.localName === "tspan" && (c.hasAttribute("y") || c.hasAttribute("dy")));
        const lines = [];
        const inkOf = (le, lbb) => {
          const ls = cs(le); const fm = fontMetrics(ls, clean(le.textContent) || "x");
          const FA = fm.fontBoundingBoxAscent, FD = fm.fontBoundingBoxDescent, A = fm.actualBoundingBoxAscent, Dd = fm.actualBoundingBoxDescent;
          const k = FA + FD > 0 ? lbb.height / (FA + FD) : 1;
          let top = lbb.y + Math.max(0, FA - A) * k, bot = lbb.y + lbb.height - Math.max(0, FD - Dd) * k;
          if (!(bot - top > 0.5)) { top = lbb.y; bot = lbb.y + lbb.height; }
          const r = aabb(m, { x: lbb.x, y: top, width: lbb.width, height: bot - top });
          r.local = { x0: lbb.x, y0: top, x1: lbb.x + lbb.width, y1: bot };
          return r;
        };
        if (lineEls.length >= 2) {
          for (const le of lineEls) { let lb; try { lb = le.getBBox(); } catch (err) { lb = null; } if (lb && lb.width > 0) lines.push(inkOf(le, lb)); }
        }
        if (!lines.length) lines.push(inkOf(e, bb));
        const ink = { x0: Math.min(...lines.map((l) => l.x0)), y0: Math.min(...lines.map((l) => l.y0)), x1: Math.max(...lines.map((l) => l.x1)), y1: Math.max(...lines.map((l) => l.y1)) };
        const xl = e.x.baseVal, yl = e.y.baseVal;
        let ax = xl.numberOfItems ? xl.getItem(0).value : null, ay = yl.numberOfItems ? yl.getItem(0).value : null;
        if (ax === null || ay === null) {
          const t1 = e.querySelector("tspan[x],tspan[y]");
          if (t1) { if (ax === null && t1.x.baseVal.numberOfItems) ax = t1.x.baseVal.getItem(0).value; if (ay === null && t1.y.baseVal.numberOfItems) ay = t1.y.baseVal.getItem(0).value; }
        }
        const anchor = tp(m, ax || 0, ay || 0);
        texts.push({ ...base, content, cell, ink, lines, anchor, fontSize: parseFloat(s.fontSize) });
        visEls.push({ ...base, b: cell, what: "text" });
        continue;
      }
      if (tag === "foreignobject" || tag === "image" || tag === "use") {
        const b = clientToRoot(e.getBoundingClientRect());
        boxes.push({ ...base, kind: tag, b, opaque: tag === "image", label: "" });
        visEls.push({ ...base, b, what: tag });
        continue;
      }
      if (!["rect", "path", "line", "polyline", "polygon", "circle", "ellipse"].includes(tag)) continue;
      if (fillA * op < 0.03 && strokeA * op < 0.03) continue; // paints nothing (hit area)
      let bb; try { bb = e.getBBox(); } catch (err) { continue; }
      const b = aabb(m, bb);
      visEls.push({ ...base, b, what: tag });
      const opaque = fillA * op >= 0.6;
      if (tag === "rect") {
        if (bb.width >= 8 && bb.height >= 8) boxes.push({ ...base, kind: "rect", b, opaque });
        continue;
      }
      if (tag === "circle" || tag === "ellipse") {
        const rr = Math.min(b.x1 - b.x0, b.y1 - b.y0) / 2;
        if (rr >= 6) boxes.push({ ...base, kind: "circle", b, opaque, c: { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, rx: (b.x1 - b.x0) / 2, ry: (b.y1 - b.y0) / 2 } });
        continue;
      }
      // path, polygon, polyline, line
      let closed = false, rectLike = false, localPts = null;
      if (tag === "line") {
        localPts = [[{ x: e.x1.baseVal.value, y: e.y1.baseVal.value }, { x: e.x2.baseVal.value, y: e.y2.baseVal.value }]];
      } else if (tag === "polyline" || tag === "polygon") {
        const pts = [...e.points].map((p) => ({ x: p.x, y: p.y }));
        if (tag === "polygon" && pts.length) pts.push(pts[0]);
        closed = tag === "polygon";
        localPts = [pts];
      } else {
        let L = 0; try { L = e.getTotalLength(); } catch (err) { L = 0; }
        if (L > 0) {
          const n = Math.min(500, Math.max(8, Math.ceil(L / 2.5)));
          const step = L / n; const polys = [[]];
          let prev = null;
          for (let i = 0; i <= n; i++) {
            const p = e.getPointAtLength(L * i / n); const q = { x: p.x, y: p.y };
            if (prev && Math.hypot(q.x - prev.x, q.y - prev.y) > step * 2.2 + 1) polys.push([]);
            polys[polys.length - 1].push(q); prev = q;
          }
          localPts = polys.filter((p) => p.length >= 2);
          const d = e.getAttribute("d") || "";
          const f = localPts[0][0], l = localPts[localPts.length - 1].slice(-1)[0];
          closed = /z\s*$/i.test(d.trim()) || (localPts.length === 1 && Math.hypot(f.x - l.x, f.y - l.y) < 0.5);
        } else localPts = [];
      }
      if (closed && bb.width >= 8 && bb.height >= 8) {
        const flat = localPts.flat();
        const tol = 3;
        rectLike = flat.length > 3 && flat.every((p) => Math.min(Math.abs(p.x - bb.x), Math.abs(p.x - bb.x - bb.width), Math.abs(p.y - bb.y), Math.abs(p.y - bb.y - bb.height)) <= tol);
      }
      if (rectLike) { boxes.push({ ...base, kind: "rect-path", b, opaque }); continue; }
      if (closed && fillA * op >= 0.03) {
        if ((bb.width * bb.height) >= 200) boxes.push({ ...base, kind: "shape", b, opaque, noContain: true });
        continue;
      }
      if (strokeA * op < 0.03) continue;
      const rootPolys = localPts.map((poly) => poly.map((p) => tp(m, p.x, p.y)));
      const markerEnd = s.markerEnd && s.markerEnd !== "none" ? s.markerEnd : null;
      const markerStart = s.markerStart && s.markerStart !== "none" ? s.markerStart : null;
      const dashed = s.strokeDasharray && s.strokeDasharray !== "none" && !/^0(px)?(,?\s*0(px)?)*$/.test(s.strokeDasharray);
      conns.push({ ...base, kind: tag, b, localPts, polys: rootPolys, markerEnd, markerStart, dashed });
    }
    stats.texts += texts.length; stats.boxes += boxes.length; stats.connectors += conns.length;
    // label each box with the first text whose anchor is inside it
    for (const bx of boxes) { const t = texts.find((t) => contains(bx.b, t.anchor)); bx.label = t ? t.content.slice(0, 40) : ""; }
    const boxDesc = (bx) => bx ? `${bx.kind}${bx.label ? ` "${bx.label}"` : ""} [${bxr(bx.b).join(",")}]` : "viewBox";
    const isBackground = (bx) => area(bx.b) >= 0.9 * vbArea;
    const elRect = (e) => () => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, x1: r.right, y1: r.bottom }; };
    const rootRect = (b) => () => rootToClient(b);
    const push = (f, primary, secondary) => {
      f.drawing = D;
      f.ref = reg(() => ({ scrollTo: primary.scrollEl || svg, a: primary.rect(), b: secondary ? secondary.rect() : null }));
      findings.push(f);
    };
    const tdesc = (t) => ({ tag: "text", text: t.content.slice(0, 80), box: bxr(t.cell), ink: bxr(t.ink), anchor: [r1(t.anchor.x), r1(t.anchor.y)], fontSize: t.fontSize, opacity: r1(t.op), animating: t.animating || undefined, key: sig(t.el) });

    // ---- check 1: text fits its box
    for (const t of texts) {
      let best = null;
      for (const bx of boxes) {
        if (bx.noContain || bx.kind === "image" || bx.kind === "use" || bx.kind === "foreignobject") continue;
        if (bx.order > t.order) continue; // painted over the text: a cover, not a container (check 2 judges it)
        if (bx.kind === "circle") { const c = bx.c; if (Math.hypot((t.anchor.x - c.x) / Math.max(1, c.rx - 1), (t.anchor.y - c.y) / Math.max(1, c.ry - 1)) > 1) continue; }
        else if (!contains(bx.b, t.anchor, -1)) continue; // strictly inside: an anchor on the edge (an axis tick) is not in the box
        if (!best || area(bx.b) < area(best.b)) best = bx;
      }
      const cont = best && !isBackground(best) ? best : null;
      let slack, sides;
      if (cont && cont.kind === "circle") {
        const c = cont.c; const tb = t.ink; // a glyph in a round badge: judged by its ink, a cell's corners are always outside
        const corners = [[tb.x0, tb.y0], [tb.x1, tb.y0], [tb.x0, tb.y1], [tb.x1, tb.y1]];
        const worst = Math.max(...corners.map(([x, y]) => Math.hypot((x - c.x) / c.rx, (y - c.y) / c.ry)));
        slack = (1 - worst) * Math.min(c.rx, c.ry); sides = { radial: r1(slack) };
      } else {
        const B = cont ? cont.b : VB, tb = t.cell;
        sides = { L: tb.x0 - B.x0, R: B.x1 - tb.x1, T: tb.y0 - B.y0, B: B.y1 - tb.y1 };
        slack = Math.min(sides.L, sides.R, sides.T, sides.B);
        for (const k in sides) sides[k] = r1(sides[k]);
      }
      if (slack < SLACK) {
        let inkSlack = null;
        if (!(cont && cont.kind === "circle")) { const B = cont ? cont.b : VB, ib = t.ink; inkSlack = r1(Math.min(ib.x0 - B.x0, B.x1 - ib.x1, ib.y0 - B.y0, B.y1 - ib.y1)); }
        const over = slack < 0 && (inkSlack === null || inkSlack < 0);
        const kind = cont ? (over ? "text-overflows-box" : "text-tight-in-box") : (over ? "text-overflows-viewbox" : "text-tight-to-viewbox");
        push({ check: 1, kind, element: tdesc(t), measured: { slack: r1(slack), sides, inkSlack, container: boxDesc(cont), containerOpacity: cont ? r1(cont.op) : undefined } },
          { rect: elRect(t.el), scrollEl: t.el }, cont ? { rect: rootRect(cont.b) } : null);
      }
      t.container = cont;
    }

    // ---- check 2: text on text, text crossed by a line, text covered by or running into a box
    for (let i = 0; i < texts.length; i++) for (let j = i + 1; j < texts.length; j++) {
      const a = texts[i], b = texts[j];
      if (!inter(a.ink, b.ink)) continue;
      let worst = 0;
      for (const la of a.lines) for (const lb of b.lines) { const x = inter(la, lb); if (x && x.area > worst) worst = x.area; }
      if (worst <= 2) continue;
      const dup = a.content === b.content && (inter(a.ink, b.ink).area / Math.max(area(a.ink), area(b.ink))) > 0.8;
      push({ check: 2, kind: dup ? "text-duplicate-layer" : "text-overlaps-text", element: tdesc(a), other: tdesc(b), measured: { overlapArea: r1(worst) } },
        { rect: elRect(a.el), scrollEl: a.el }, { rect: elRect(b.el) });
    }
    const segHitsBox = (p, q, B) => { // Liang-Barsky; returns clipped length or 0
      let t0 = 0, t1 = 1; const dx = q.x - p.x, dy = q.y - p.y;
      const tests = [[-dx, p.x - B.x0], [dx, B.x1 - p.x], [-dy, p.y - B.y0], [dy, B.y1 - p.y]];
      for (const [pp, qq] of tests) {
        if (pp === 0) { if (qq < 0) return null; continue; }
        const r = qq / pp;
        if (pp < 0) { if (r > t1) return null; if (r > t0) t0 = r; } else { if (r < t0) return null; if (r < t1) t1 = r; }
      }
      if (t1 <= t0) return null;
      return { len: Math.hypot(dx, dy) * (t1 - t0), mid: { x: p.x + dx * (t0 + t1) / 2, y: p.y + dy * (t0 + t1) / 2 } };
    };
    for (const t of texts) {
      for (const c of conns) {
        if (!inter(c.b.x1 - c.b.x0 < 0.01 ? { ...c.b, x0: c.b.x0 - 0.5, x1: c.b.x1 + 0.5 } : (c.b.y1 - c.b.y0 < 0.01 ? { ...c.b, y0: c.b.y0 - 0.5, y1: c.b.y1 + 0.5 } : c.b), t.ink)) continue;
        let len = 0, visibleLen = 0, mids = [];
        const tinv = t.m.inverse();
        const toLocal = (p) => tp(tinv, p.x, p.y);
        const scale = Math.hypot(t.m.a, t.m.b) || 1;
        for (const line of t.lines) {
          const L0 = line.local || line;
          const B = { x0: L0.x0 + 0.5, y0: L0.y0 + 0.5, x1: L0.x1 - 0.5, y1: L0.y1 - 0.5 };
          if (B.x1 <= B.x0 || B.y1 <= B.y0) continue;
          for (const poly of c.polys) for (let k = 1; k < poly.length; k++) {
            const h = segHitsBox(toLocal(poly[k - 1]), toLocal(poly[k]), B); if (!h) continue;
            const mid = tp(t.m, h.mid.x, h.mid.y), hl = h.len * scale;
            len += hl;
            const occl = boxes.some((bx) => bx.opaque && bx.order > c.order && bx.order < t.order && contains(bx.b, mid, 0.5));
            if (occl) continue;
            visibleLen += hl; mids.push(mid);
          }
        }
        if (len > 0 && visibleLen < 0.5) { stats.occludedCrossings++; continue; }
        if (visibleLen < 0.5) continue;
        const cx = (t.ink.x0 + t.ink.x1) / 2, cy = (t.ink.y0 + t.ink.y1) / 2;
        push({ check: 2, kind: "text-crossed-by-line", element: tdesc(t),
          other: { tag: c.tag, box: bxr(c.b), marker: !!(c.markerEnd || c.markerStart), dashed: !!c.dashed, stroke: c.s.stroke, key: sig(c.el) },
          measured: { crossingLength: r1(visibleLen), lineAboveText: c.order > t.order, at: mids.slice(0, 3).map((p) => [r1(p.x), r1(p.y)]), textCenter: [r1(cx), r1(cy)] } },
          { rect: elRect(t.el), scrollEl: t.el }, { rect: rootRect(c.b) });
      }
      for (const bx of boxes) {
        if (bx === t.container || isBackground(bx)) continue;
        const x = inter(bx.b, t.ink); if (!x || x.area <= 2) continue;
        const fully = t.ink.x0 >= bx.b.x0 && t.ink.x1 <= bx.b.x1 && t.ink.y0 >= bx.b.y0 && t.ink.y1 <= bx.b.y1;
        const covering = bx.opaque && bx.order > t.order;
        if (fully && !covering) continue; // sits inside a larger panel that also holds its own box
        if (!covering && !(bx.strokeA * bx.op >= 0.2)) continue; // text over a borderless band painted beneath it is legible, not a collision
        if (bx.kind === "circle") { // only flag a circle if its shape, not its bbox, meets the text
          const c = bx.c; const nx = Math.max(t.ink.x0, Math.min(c.x, t.ink.x1)), ny = Math.max(t.ink.y0, Math.min(c.y, t.ink.y1));
          if (((nx - c.x) / c.rx) ** 2 + ((ny - c.y) / c.ry) ** 2 > 1) continue;
        }
        if (t.container && bx.b.x0 <= t.container.b.x0 && bx.b.y0 <= t.container.b.y0 && bx.b.x1 >= t.container.b.x1 && bx.b.y1 >= t.container.b.y1 && !covering) continue; // an enclosing panel
        push({ check: 2, kind: covering ? "text-covered-by-shape" : "text-runs-into-box", element: tdesc(t),
          other: { tag: bx.el.localName, box: bxr(bx.b), label: bx.label, opaque: bx.opaque, key: sig(bx.el) },
          measured: { overlapArea: r1(x.area), overlapW: r1(x.w), overlapH: r1(x.h) } },
          { rect: elRect(t.el), scrollEl: t.el }, { rect: rootRect(bx.b) });
      }
    }

    // ---- check 3: nothing beyond the viewBox
    for (const v of visEls) {
      const b = v.b;
      const over = { L: VB.x0 - b.x0, R: b.x1 - VB.x1, T: VB.y0 - b.y0, B: b.y1 - VB.y1 };
      const worst = Math.max(over.L, over.R, over.T, over.B);
      if (worst <= 1) continue;
      if (hasClip(v.el)) { stats.clipSkipped++; continue; }
      for (const k in over) over[k] = r1(Math.max(0, over[k]));
      const isText = v.what === "text";
      push({ check: 3, kind: isText ? "text-outside-viewbox" : "shape-outside-viewbox",
        element: { tag: v.tag, text: clean(v.el.textContent).slice(0, 60), box: bxr(b), opacity: r1(v.op), animating: v.animating || undefined, key: sig(v.el) },
        measured: { beyond: r1(worst), sides: over, viewBox: bxr(VB), svgOverflow: cs(svg).overflow } },
        { rect: () => { const r = v.el.getBoundingClientRect(); return { x: r.left, y: r.top, x1: r.right, y1: r.bottom }; }, scrollEl: v.el }, { rect: rootRect(VB) });
    }

    // ---- check 4: arrows and connectors land on something
    const targets = [];
    for (const bx of boxes) targets.push({ kind: "box", bx, b: bx.b });
    for (const g of ghosts) { g.label = (texts.find((t) => contains(g.b, t.anchor)) || {}).content || "(fading in)"; targets.push({ kind: "box", bx: g, b: g.b }); }
    for (const t of texts) for (const l of t.lines) targets.push({ kind: "label", t, b: l });
    const distBox = (p, b) => {
      if (contains(b, p)) return { d: Math.min(p.x - b.x0, b.x1 - p.x, p.y - b.y0, b.y1 - p.y), inside: true };
      return { d: Math.hypot(Math.max(b.x0 - p.x, 0, p.x - b.x1), Math.max(b.y0 - p.y, 0, p.y - b.y1)), inside: false };
    };
    const distCircle = (p, c) => { const d = Math.hypot(p.x - c.x, p.y - c.y); const r = (c.rx + c.ry) / 2; return { d: Math.abs(d - r), inside: d < r }; };
    const distSeg = (p, a, b) => { const dx = b.x - a.x, dy = b.y - a.y; const L2 = dx * dx + dy * dy; let u = L2 ? ((p.x - a.x) * dx + (p.y - a.y) * dy) / L2 : 0; u = Math.max(0, Math.min(1, u)); return Math.hypot(p.x - a.x - u * dx, p.y - a.y - u * dy); };
    const rayHit = (p, dir, b) => { // distance along dir from p to box b, or null
      let t0 = 0, t1 = 1e9;
      for (const [o, d, lo, hi] of [[p.x, dir.x, b.x0, b.x1], [p.y, dir.y, b.y0, b.y1]]) {
        if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) return null; continue; }
        let a = (lo - o) / d, c = (hi - o) / d; if (a > c) [a, c] = [c, a];
        t0 = Math.max(t0, a); t1 = Math.min(t1, c); if (t0 > t1) return null;
      }
      return t0;
    };
    const markerTip = (c, which, endLocal, dirLocal) => {
      const ref = which === "end" ? c.markerEnd : c.markerStart;
      if (!ref) return { tipLen: 0, dir: dirLocal };
      const id = (ref.match(/#([^"')]+)/) || [])[1]; const mk = id && document.getElementById(id);
      if (!mk || mk.localName !== "marker") return { tipLen: 0, dir: dirLocal };
      const vb = mk.viewBox && mk.viewBox.baseVal;
      const mw = mk.markerWidth.baseVal.value || 3, mh = mk.markerHeight.baseVal.value || 3;
      const sc = vb && vb.width > 0 ? Math.min(mw / vb.width, mh / vb.height) : 1;
      const units = mk.markerUnits.baseVal === 1 ? 1 : c.strokeW;
      let maxX = vb && vb.width > 0 ? vb.x + vb.width : mw;
      try { const kids = [...mk.children].filter((k) => k.getBBox); if (kids.length) maxX = Math.max(...kids.map((k) => { const bb = k.getBBox(); return bb.x + bb.width; })); } catch (err) {}
      const orient = (mk.getAttribute("orient") || "0").trim();
      let dir = dirLocal;
      if (orient === "auto-start-reverse" && which === "start") dir = { x: -dirLocal.x, y: -dirLocal.y };
      else if (orient === "auto" && which === "start") dir = { x: -dirLocal.x, y: -dirLocal.y }; // tip direction is ambiguous; treat as pointing back
      else if (orient !== "auto" && orient !== "auto-start-reverse") { const ang = parseFloat(orient) * Math.PI / 180 || 0; dir = { x: Math.cos(ang), y: Math.sin(ang) }; }
      const tipLen = (maxX - mk.refX.baseVal.value) * sc * units;
      return { tipLen, dir };
    };
    for (const c of conns) {
      if (!c.markerEnd && !c.markerStart && !c.dashed) continue;
      stats.arrows++;
      const ends = [];
      const lp = c.localPts; if (!lp.length) continue;
      const first = lp[0], last = lp[lp.length - 1];
      const endOf = (poly, atEnd) => {
        const n = poly.length; const p = atEnd ? poly[n - 1] : poly[0];
        let q = atEnd ? poly[n - 2] : poly[1];
        for (let k = 2; q && Math.hypot(p.x - q.x, p.y - q.y) < 0.5 && k < n; k++) q = atEnd ? poly[n - 1 - k] : poly[k];
        const L = Math.hypot(p.x - q.x, p.y - q.y) || 1;
        return { p, dir: { x: (p.x - q.x) / L, y: (p.y - q.y) / L } }; // pointing outward from the line
      };
      if (c.markerEnd || (!c.markerStart && c.dashed)) ends.push({ which: "end", ...endOf(last, true) });
      if (c.markerStart || (!c.markerEnd && c.dashed)) ends.push({ which: "start", ...endOf(first, false) });
      for (const en of ends) {
        let tipLocal = en.p, dirLocal = en.dir;
        if ((en.which === "end" && c.markerEnd) || (en.which === "start" && c.markerStart)) {
          const mt = markerTip(c, en.which, en.p, en.which === "end" ? en.dir : { x: -en.dir.x, y: -en.dir.y });
          // for a start marker, the line direction at the start points inward; markerTip flips it back
          const d = mt.dir; tipLocal = { x: en.p.x + d.x * mt.tipLen, y: en.p.y + d.y * mt.tipLen };
          dirLocal = en.which === "end" ? d : en.dir;
        }
        const tip = tp(c.m, tipLocal.x, tipLocal.y), pEnd = tp(c.m, en.p.x, en.p.y);
        const d2 = tp(c.m, tipLocal.x + dirLocal.x, tipLocal.y + dirLocal.y); const dl = Math.hypot(d2.x - tip.x, d2.y - tip.y) || 1;
        const dir = { x: (d2.x - tip.x) / dl, y: (d2.y - tip.y) / dl };
        let best = null, smallestInside = null;
        for (const tg of targets) {
          if (tg.bx && tg.bx.el === c.el) continue;
          const r = tg.bx && tg.bx.kind === "circle" ? distCircle(tip, tg.bx.c) : distBox(tip, tg.b);
          if (!best || r.d < best.d) best = { ...r, tg };
          if (r.inside && tg.kind === "box" && !isBackground(tg.bx) && (!smallestInside || area(tg.b) < area(smallestInside.b))) smallestInside = { b: tg.b, d: r.d, tg };
        }
        let lineHit = null;
        for (const o of conns) { if (o === c) continue; for (const poly of o.polys) for (let k = 1; k < poly.length; k++) { const d = distSeg(tip, poly[k - 1], poly[k]); if (!lineHit || d < lineHit.d) lineHit = { d, o }; } }
        const nearest = Math.min(best ? best.d : 1e9, lineHit ? lineHit.d : 1e9);
        if (nearest <= ATOL) continue;
        let ray = null;
        for (const tg of targets) { if (tg.kind !== "box" || isBackground(tg.bx) || tg.bx.el === c.el) continue; if (contains(tg.b, tip)) continue; const h = rayHit(tip, dir, tg.b); if (h !== null && h <= 400 && (!ray || h < ray.d)) ray = { d: h, tg }; }
        const inside = smallestInside && smallestInside.d > ATOL && !(best && best.d <= ATOL);
        const kind = ray && ray.d <= 3 * ATOL ? "arrow-stops-short" : inside ? "arrow-ends-inside-box" : "arrow-ends-in-space";
        const tgDesc = (tg) => !tg ? null : tg.kind === "label" ? `label "${tg.t.content.slice(0, 40)}"` : boxDesc(tg.bx);
        const tipBox = { x0: tip.x - 3, y0: tip.y - 3, x1: tip.x + 3, y1: tip.y + 3 };
        push({ check: 4, kind, element: { tag: c.tag, which: en.which, marker: !!(en.which === "end" ? c.markerEnd : c.markerStart), dashed: !!c.dashed, end: [r1(pEnd.x), r1(pEnd.y)], tip: [r1(tip.x), r1(tip.y)], box: bxr(c.b), animating: c.animating || undefined, key: `${sig(c.el)}:${en.which}` },
          measured: { distance: r1(nearest), nearest: tgDesc(best && best.tg), nearestLine: lineHit ? r1(lineHit.d) : null, insideBox: inside ? `${tgDesc(smallestInside.tg)} depth ${r1(smallestInside.d)}` : null, pointsAt: ray ? `${tgDesc(ray.tg)} ${r1(ray.d)} ahead` : "nothing within 400" } },
          { rect: rootRect(tipBox), scrollEl: c.el }, { rect: rootRect(c.b) });
      }
    }
    svgPlans.push({ svg, texts, boxes, VB, rootToClient, isBackground });
  }

  // ---- canvases (simulations): text cut by the edge, text on text
  const CV = window.__svgfitCanvas;
  const canvasTexts = [];
  if (CV) for (const c of CV.list()) {
    if (!scopeRoot.contains(c)) continue;
    const backdrop = c.matches("canvas.ambient, canvas.ambient-deep"); // the decorative hero backdrop: reported once per page, apart from the drawings
    const r = c.getBoundingClientRect(); if (r.width < 1 || r.height < 1) continue;
    const op = opacUpTo(c, null); if (op < 0.05 || cs(c).visibility !== "visible") continue;
    let es = CV.get(c).filter((e) => e.w === c.width && e.h === c.height);
    if (!es.length) continue;
    const lastFrame = Math.max(...es.map((e) => e.frame));
    es = es.filter((e) => e.frame === lastFrame && e.alpha >= 0.05);
    if (!es.length) continue;
    stats.canvases++; stats.canvasTexts += es.length;
    const kx = r.width / c.width, ky = r.height / c.height;
    const name = c.getAttribute("aria-label") || headingFor(c) || "canvas";
    const all = [...document.querySelectorAll("canvas")]; const index = all.indexOf(c);
    const D = { index, name: backdrop ? "decorative backdrop" : name, kind: backdrop ? "backdrop" : "canvas", opacity: r1(op) };
    if (!backdrop) drawings.push({ ...D, w: Math.round(r.width), h: Math.round(r.height) });
    const toClient = (e) => ({ x: r.left + e.x0 * kx, y: r.top + e.y0 * ky, x1: r.left + e.x1 * kx, y1: r.top + e.y1 * ky });
    const live = (e) => () => { const rr = c.getBoundingClientRect(); return { x: rr.left + e.x0 * kx, y: rr.top + e.y0 * ky, x1: rr.left + e.x1 * kx, y1: rr.top + e.y1 * ky }; };
    const cdesc = (e) => ({ tag: "canvas-text", text: e.text, box: [r1(e.x0 * kx), r1(e.y0 * ky), r1(e.x1 * kx), r1(e.y1 * ky)], font: e.font, alpha: r1(e.alpha), key: backdrop ? "backdrop" : `${e.text.replace(/[\d.]+/g, "#")}` });
    for (const e of es) {
      const over = { L: -e.x0 * kx, R: (e.x1 - c.width) * kx, T: -e.y0 * ky, B: (e.y1 - c.height) * ky };
      const worst = Math.max(over.L, over.R, over.T, over.B);
      if (!backdrop) { const cl = toClient(e); const v = { x: Math.max(cl.x, r.left), y: Math.max(cl.y, r.top), x1: Math.min(cl.x1, r.right), y1: Math.min(cl.y1, r.bottom) }; if (v.x1 - v.x > 1 && v.y1 - v.y > 1) canvasTexts.push({ c, e, client: v }); }
      if (worst > 1) {
        for (const k in over) over[k] = r1(Math.max(0, over[k]));
        const f = { check: 3, kind: backdrop ? "backdrop-text-cut" : "canvas-text-cut", drawing: D, element: cdesc(e), measured: { beyond: r1(worst), sides: over, canvasCss: [Math.round(r.width), Math.round(r.height)] } };
        f.ref = reg(() => ({ scrollTo: c, a: live(e)(), b: (() => { const rr = c.getBoundingClientRect(); return { x: rr.left, y: rr.top, x1: rr.right, y1: rr.bottom }; })() }));
        findings.push(f);
      }
    }
    for (let i = 0; i < es.length; i++) for (let j = i + 1; j < es.length; j++) {
      const a = es[i], b = es[j];
      const x = inter(a, b); if (!x) continue;
      const ar = x.area * kx * ky; if (ar <= 4) continue;
      if (a.text === b.text && x.area / Math.max(area(a), area(b)) > 0.8) continue; // the same text drawn twice (stroke then fill, glow)
      const f = { check: 2, kind: backdrop ? "backdrop-text-overlap" : "canvas-text-overlap", drawing: D, element: cdesc(a), other: cdesc(b), measured: { overlapArea: r1(ar) } };
      f.ref = reg(() => ({ scrollTo: c, a: live(a)(), b: live(b)() }));
      findings.push(f);
    }
  }

  // ---- check 5: HTML around the drawings
  const vw = document.documentElement.clientWidth;
  const CHROME = "header.topbar, footer, .footer, nav, .dg-ov, script, style, noscript, template, [data-cmdk], .cmdk, .tb-pop";
  const all = [...scopeRoot.querySelectorAll("*")];
  const isChrome = (el) => !!el.closest(CHROME);
  const pinnedCache = new Map();
  const pinned = (el) => { if (!el || el.nodeType !== 1) return false; if (pinnedCache.has(el)) return pinnedCache.get(el); const p = cs(el).position; const v = p === "fixed" || p === "sticky" || pinned(el.parentElement); pinnedCache.set(el, v); return v; };
  const visibleEl = (el) => {
    const s = cs(el); if (s.display === "none" || s.visibility !== "visible") return false;
    // closed <details> content and content-visibility:hidden still report boxes; checkVisibility knows better
    return el.checkVisibility ? el.checkVisibility({ contentVisibilityAuto: true }) : true;
  };
  // what an element's ancestors leave visible of it: the intersection of every
  // ancestor box whose overflow is not visible (scrollers and clippers alike)
  const INF = { x: -1e9, y: -1e9, x1: 1e9, y1: 1e9 };
  const isect = (a, b) => ({ x: Math.max(a.x, b.x), y: Math.max(a.y, b.y), x1: Math.min(a.x1, b.x1), y1: Math.min(a.y1, b.y1) });
  const ownClip = (el) => { const s = cs(el); if (s.overflowX === "visible" && s.overflowY === "visible") return INF; const r = el.getBoundingClientRect(); const box = { x: r.left + el.clientLeft, y: r.top + el.clientTop, x1: r.left + el.clientLeft + el.clientWidth, y1: r.top + el.clientTop + el.clientHeight }; return { x: s.overflowX === "visible" ? -1e9 : box.x, x1: s.overflowX === "visible" ? 1e9 : box.x1, y: s.overflowY === "visible" ? -1e9 : box.y, y1: s.overflowY === "visible" ? 1e9 : box.y1 }; };
  const clipAboveCache = new Map();
  const clipAbove = (el) => { if (!el || !el.parentElement || el === document.documentElement) return INF; if (clipAboveCache.has(el)) return clipAboveCache.get(el); const p = el.parentElement; const v = isect(clipAbove(p), p === document.documentElement || p === document.body ? INF : ownClip(p)); clipAboveCache.set(el, v); return v; };
  const clipBetween = (el, stop) => { let v = INF; for (let x = el; x && x !== stop; x = x.parentElement) v = isect(v, ownClip(x)); return v; };
  const effOp = new Map();
  const eop = (el) => { if (!el || el.nodeType !== 1) return 1; if (effOp.has(el)) return effOp.get(el); const s = cs(el); const v = s.display === "none" ? 0 : parseFloat(s.opacity) * eop(el.parentElement); effOp.set(el, v); return v; };
  const rr = (r) => ({ x: r.left, y: r.top, x1: r.right, y1: r.bottom });
  const textRuns = [];
  const reported = new Set();
  const hdesc = (el) => ({ tag: el.localName, cls: (typeof el.className === "string" ? el.className : "") || undefined, id: el.id || undefined, text: clean(el.textContent).slice(0, 80) });
  const hkey = (el) => `${headingFor(el)}|${el.localName}.${(typeof el.className === "string" ? el.className : "").trim().split(/\s+/).slice(0, 2).join(".")}${el.id ? "#" + el.id : ""}|${clean(el.textContent).slice(0, 30)}`;
  for (const el of all) {
    if (el.closest("svg") || el.localName === "canvas") continue;
    stats.htmlElements++;
    if (!visibleEl(el)) continue;
    const r = el.getBoundingClientRect(); if (r.width === 0 && r.height === 0) continue;
    // 5c: wider than the viewport, outermost element only
    if ((r.right > vw + 1 || r.left < -1) && r.width > 0 && r.height > 0 && eop(el) >= 0.05) {
      let contained = false;
      for (let x = el.parentElement; x && x !== document.body && x !== document.documentElement; x = x.parentElement) {
        const s = cs(x); if (s.overflowX !== "visible") { const pr = x.getBoundingClientRect(); if (pr.right <= vw + 1 && pr.left >= -1) { contained = true; break; } }
        if (reported.has(x)) { contained = true; break; }
      }
      if (!contained && cs(el).position !== "fixed") {
        reported.add(el);
        const f = { check: 5, kind: "wider-than-viewport", drawing: { index: -1, name: headingFor(el), kind: "html" }, element: { ...hdesc(el), key: hkey(el) }, measured: { left: r1(r.left), right: r1(r.right), viewport: vw, beyond: r1(Math.max(r.right - vw, -r.left)) } };
        f.ref = reg(() => ({ scrollTo: el, a: rr(el.getBoundingClientRect()), b: null }));
        findings.push(f);
      }
    }
    if (isChrome(el)) continue;
    // 5a: clipped text (overflow hidden or clip)
    const s = cs(el);
    const cx = s.overflowX === "hidden" || s.overflowX === "clip", cy = s.overflowY === "hidden" || s.overflowY === "clip";
    if ((cx && el.scrollWidth > el.clientWidth + 1) || (cy && el.scrollHeight > el.clientHeight + 1)) {
      if (r.width > 2 && r.height > 2 && eop(el) >= 0.05) {
        const inner = { x: r.left + el.clientLeft, y: r.top + el.clientTop }; inner.x1 = inner.x + el.clientWidth; inner.y1 = inner.y + el.clientHeight;
        let worst = 0, sample = "", drawingCut = null;
        const tw = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let n = tw.nextNode(); n; n = tw.nextNode()) {
          if (!n.textContent.trim() || (n.parentElement && n.parentElement.closest("svg"))) continue;
          if (n.parentElement && (!visibleEl(n.parentElement) || eop(n.parentElement) < 0.05)) continue;
          const range = document.createRange(); range.selectNodeContents(n);
          const inner2 = n.parentElement === el ? INF : clipBetween(n.parentElement, el);
          for (const q0 of range.getClientRects()) {
            const q = (() => { const c = isect({ x: q0.left, y: q0.top, x1: q0.right, y1: q0.bottom }, inner2); return { left: c.x, top: c.y, right: c.x1, bottom: c.y1 }; })();
            if (q.right - q.left < 1 || q.bottom - q.top < 1) continue;
            const o = Math.max(cx ? q.right - inner.x1 : 0, cx ? inner.x - q.left : 0, cy ? q.bottom - inner.y1 : 0, cy ? inner.y - q.top : 0);
            if (o > worst) { worst = o; sample = clean(n.textContent).slice(0, 80); }
          }
        }
        for (const d of el.querySelectorAll("svg, canvas")) {
          if (d.localName === "svg" && d.parentElement && d.parentElement.closest("svg")) continue;
          const q = d.getBoundingClientRect(); if (q.width < 120) continue;
          const o = Math.max(cx ? q.right - inner.x1 : 0, cx ? inner.x - q.left : 0, cy ? q.bottom - inner.y1 : 0, cy ? inner.y - q.top : 0);
          if (o > 1 && (!drawingCut || o > drawingCut.o)) drawingCut = { o, name: d.getAttribute("aria-label") || d.localName };
        }
        if (worst > 1 || drawingCut) {
          const f = { check: 5, kind: worst > 1 ? "html-clipped-text" : "html-clipped-drawing", drawing: { index: -1, name: headingFor(el), kind: "html" },
            element: { ...hdesc(el), key: hkey(el) },
            measured: { clippedBy: r1(worst > 1 ? worst : drawingCut.o), sample: worst > 1 ? sample : drawingCut.name, scroll: [el.scrollWidth, el.scrollHeight], client: [el.clientWidth, el.clientHeight], overflow: `${s.overflowX}/${s.overflowY}`, ellipsis: s.textOverflow === "ellipsis" || undefined, lineClamp: (s.webkitLineClamp && s.webkitLineClamp !== "none") ? s.webkitLineClamp : undefined } };
          f.ref = reg(() => ({ scrollTo: el, a: rr(el.getBoundingClientRect()), b: null }));
          findings.push(f);
        } else stats.clippedNonText++;
      }
    }
  }
  // 5b: HTML text colliding with other text, boxes, or drawing content
  {
    const tw = document.createTreeWalker(scopeRoot, NodeFilter.SHOW_TEXT);
    for (let n = tw.nextNode(); n; n = tw.nextNode()) {
      const pe = n.parentElement; if (!pe || !n.textContent.trim()) continue;
      if (pe.closest("svg") || isChrome(pe) || !visibleEl(pe) || eop(pe) < 0.05 || pinned(pe)) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const clip = isect(clipAbove(pe), ownClip(pe));
      for (const q of range.getClientRects()) { const v = isect(rr(q), clip); if (v.x1 - v.x > 1 && v.y1 - v.y > 1) textRuns.push({ n, pe, r: v }); }
    }
    const boxEls = [];
    for (const el of all) {
      if (el.closest("svg") || isChrome(el) || !visibleEl(el) || eop(el) < 0.05 || pinned(el)) continue;
      const s = cs(el);
      const bg = alphaOf(s.backgroundColor) > 0.05 || (s.backgroundImage && s.backgroundImage !== "none");
      const bd = ["Top", "Right", "Bottom", "Left"].some((k) => parseFloat(s[`border${k}Width`]) > 0 && alphaOf(s[`border${k}Color`]) > 0.05);
      const repl = ["img", "video"].includes(el.localName);
      if (!bg && !bd && !repl) continue;
      const r0 = el.getBoundingClientRect(); if (r0.width < 2 || r0.height < 2) continue;
      const frags = s.display === "inline" ? [...el.getClientRects()] : [r0];
      for (const q of frags) { const r = isect(rr(q), clipAbove(el)); if (r.x1 - r.x < 2 || r.y1 - r.y < 2) continue; boxEls.push({ el, r }); }
    }
    const pairOK = (a, b) => { const x = inter({ x0: a.x, y0: a.y, x1: a.x1, y1: a.y1 }, { x0: b.x, y0: b.y, x1: b.x1, y1: b.y1 }); return x && x.area > 4 && x.w >= 2 && x.h >= 2 ? x : null; };
    const seen = new Set();
    for (let i = 0; i < textRuns.length; i++) {
      const A = textRuns[i];
      for (let j = i + 1; j < textRuns.length; j++) {
        const B = textRuns[j]; if (A.n === B.n) continue;
        const x = pairOK(A.r, B.r); if (!x) continue;
        if (x.h < 0.3 * Math.min(A.r.y1 - A.r.y, B.r.y1 - B.r.y)) continue;
        const k = `${hkey(A.pe)}|${hkey(B.pe)}|${clean(A.n.textContent).slice(0, 20)}|${clean(B.n.textContent).slice(0, 20)}`; if (seen.has(k)) continue; seen.add(k);
        const f = { check: 5, kind: "html-text-overlaps-text", drawing: { index: -1, name: headingFor(A.pe), kind: "html" }, element: { ...hdesc(A.pe), text: clean(A.n.textContent).slice(0, 80), key: k }, other: { ...hdesc(B.pe), text: clean(B.n.textContent).slice(0, 80) }, measured: { overlapArea: r1(x.area) } };
        const an = A.n, bn = B.n;
        f.ref = reg(() => { const ra = document.createRange(); ra.selectNodeContents(an); const rb = document.createRange(); rb.selectNodeContents(bn); return { scrollTo: an.parentElement, a: rr(ra.getBoundingClientRect()), b: rr(rb.getBoundingClientRect()) }; });
        findings.push(f);
      }
      for (const B of boxEls) {
        if (B.el.contains(A.n)) continue;
        const x = pairOK(A.r, B.r); if (!x) continue;
        if (A.pe.contains(B.el) && x.h < 0.5 * (A.r.y1 - A.r.y)) continue; // an inline chip beside its own text
        const k = `${hkey(A.pe)}|box:${hkey(B.el)}`; if (seen.has(k)) continue; seen.add(k);
        const f = { check: 5, kind: "html-text-overlaps-box", drawing: { index: -1, name: headingFor(A.pe), kind: "html" }, element: { ...hdesc(A.pe), text: clean(A.n.textContent).slice(0, 80), key: k }, other: hdesc(B.el), measured: { overlapArea: r1(x.area), overlapW: r1(x.w), overlapH: r1(x.h) } };
        const an = A.n, be = B.el;
        f.ref = reg(() => { const ra = document.createRange(); ra.selectNodeContents(an); return { scrollTo: an.parentElement, a: rr(ra.getBoundingClientRect()), b: rr(be.getBoundingClientRect()) }; });
        findings.push(f);
      }
      // HTML text over svg drawing content (labels and node boxes)
      for (const P of svgPlans) {
        const sr = P.svg.getBoundingClientRect();
        if (!pairOK(A.r, rr(sr))) continue;
        if (P.svg.contains(A.n)) continue;
        const items = [...P.texts.map((t) => ({ b: t.ink, what: `svg text "${t.content.slice(0, 40)}"` })), ...P.boxes.filter((bx) => !P.isBackground(bx)).map((bx) => ({ b: bx.b, what: `svg ${bx.kind}${bx.label ? ` "${bx.label}"` : ""}` }))];
        for (const it of items) {
          const cr = P.rootToClient(it.b); if (!cr) continue;
          const x = pairOK(A.r, cr); if (!x) continue;
          const k = `${hkey(A.pe)}|svg:${it.what}`; if (seen.has(k)) continue; seen.add(k);
          const f = { check: 5, kind: "html-text-over-drawing", drawing: { index: -1, name: clean(P.svg.getAttribute("aria-label")) || headingFor(P.svg), kind: "html" }, element: { ...hdesc(A.pe), text: clean(A.n.textContent).slice(0, 80), key: k }, other: { what: it.what }, measured: { overlapArea: r1(x.area) } };
          const an = A.n, b = it.b, rtc = P.rootToClient;
          f.ref = reg(() => { const ra = document.createRange(); ra.selectNodeContents(an); return { scrollTo: an.parentElement, a: rr(ra.getBoundingClientRect()), b: rtc(b) }; });
          findings.push(f);
        }
      }
      for (const C of canvasTexts) {
        const x = pairOK(A.r, C.client); if (!x) continue;
        const k = `${hkey(A.pe)}|canvas:${C.e.text}`; if (seen.has(k)) continue; seen.add(k);
        const f = { check: 5, kind: "html-text-over-canvas-text", drawing: { index: -1, name: headingFor(C.c), kind: "html" }, element: { ...hdesc(A.pe), text: clean(A.n.textContent).slice(0, 80), key: k }, other: { what: `canvas text "${C.e.text}"` }, measured: { overlapArea: r1(x.area) } };
        const an = A.n, cc = C.client;
        f.ref = reg(() => { const ra = document.createRange(); ra.selectNodeContents(an); return { scrollTo: an.parentElement, a: rr(ra.getBoundingClientRect()), b: cc }; });
        findings.push(f);
      }
    }
  }
  const sw = document.documentElement.scrollWidth;
  if (!opts.scoped && sw > vw + 1) {
    const f = { check: 5, kind: "page-scrolls-sideways", drawing: { index: -1, name: "page", kind: "html" }, element: { tag: "html", key: "page" }, measured: { scrollWidth: sw, viewport: vw } };
    f.ref = reg(() => ({ scrollTo: null, a: { x: 0, y: 0, x1: vw, y1: 40 }, b: null }));
    findings.push(f);
  }
  // registry helpers for the crop step
  S.reveal = (id) => {
    const fn = S.reg.get(id); if (!fn) return null;
    let g = fn();
    const el = g.scrollTo;
    if (el && el.scrollIntoView) { el.scrollIntoView({ block: "center", inline: "center", behavior: "instant" }); g = fn(); }
    return { a: g.a, b: g.b, sx: scrollX, sy: scrollY, vw: innerWidth, vh: innerHeight, dw: document.documentElement.scrollWidth, dh: document.documentElement.scrollHeight };
  };
  S.mark = (rects) => {
    document.querySelectorAll(".__svgfit_mark").forEach((x) => x.remove());
    if (!document.body) return;
    (rects || []).forEach((r, i) => {
      if (!r) return;
      const d = document.createElement("div"); d.className = "__svgfit_mark";
      d.style.cssText = `position:absolute;left:${r.x + scrollX - 2}px;top:${r.y + scrollY - 2}px;width:${Math.max(2, r.x1 - r.x) + 4}px;height:${Math.max(2, r.y1 - r.y) + 4}px;outline:2px ${i ? "dashed" : "solid"} ${i ? "#2EA8FF" : "#FF2D55"};z-index:2147483647;pointer-events:none;`;
      document.body.appendChild(d);
    });
  };
  S.unmark = () => document.querySelectorAll(".__svgfit_mark").forEach((x) => x.remove());
  return { findings, stats, drawings };
}

// contact sheet: rects of every drawing container on the page (end state)
function inPageContactTargets() {
  const out = []; const seen = new Set();
  const add = (el, label) => { if (!el || seen.has(el)) return; const r = el.getBoundingClientRect(); if (r.width < 60 || r.height < 40) return; seen.add(el); out.push(label); el.setAttribute("data-svgfit-contact", String(out.length - 1)); };
  document.querySelectorAll("[data-svgfit-contact]").forEach((x) => x.removeAttribute("data-svgfit-contact"));
  for (const s of document.querySelectorAll("svg")) {
    if (s.parentElement && s.parentElement.closest("svg")) continue;
    if (s.closest(".dg-ov")) continue;
    const r = s.getBoundingClientRect();
    if (!s.querySelector("text") && r.width < 120) continue;
    if (r.width === 0 || getComputedStyle(s).display === "none") continue;
    const box = s.closest(".diagram, .flight, figure, .frame") || s;
    add(box, (s.getAttribute("aria-label") || "").trim() || "svg");
  }
  for (const c of document.querySelectorAll("canvas")) {
    const r = c.getBoundingClientRect(); if (r.width < 200 || r.height < 80) continue;
    if (c.closest(".svc-hero") || c.matches("canvas.ambient, canvas.ambient-deep")) continue; // the ambient backdrop, decorative
    const box = c.closest(".sim, .sim-wrap, figure") || c;
    add(box, c.getAttribute("aria-label") || "simulation canvas");
  }
  return out;
}
function inPageRectOf(i) {
  const el = document.querySelector(`[data-svgfit-contact="${i}"]`); if (!el) return null;
  el.scrollIntoView({ block: "start", inline: "nearest", behavior: "instant" });
  const r = el.getBoundingClientRect();
  return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height, vh: innerHeight };
}

// ---------------------------------------------------------------- severity and keys
const SEV = {
  "text-overflows-box": 1, "text-overlaps-text": 1, "text-covered-by-shape": 1, "canvas-text-overlap": 1, "canvas-text-cut": 1,
  "text-outside-viewbox": 1, "text-overflows-viewbox": 1, "html-text-over-drawing": 1, "html-text-over-canvas-text": 1,
  "text-runs-into-box": 2, "text-crossed-by-line": 2, "text-tight-in-box": 2, "text-tight-to-viewbox": 2,
  "shape-outside-viewbox": 2, "text-duplicate-layer": 2,
  "arrow-ends-in-space": 3, "arrow-ends-inside-box": 3, "arrow-stops-short": 3,
  "html-clipped-text": 4, "html-clipped-drawing": 4, "html-text-overlaps-text": 4, "html-text-overlaps-box": 4, "wider-than-viewport": 4, "page-scrolls-sideways": 4,
  "backdrop-text-overlap": 4.5, "backdrop-text-cut": 4.5,
  "console-error": 5,
};
const GROUP = { 1: "Overflow and overlap a reader sees", 2: "Overflow and overlap a reader sees", 3: "Arrows and connectors", 4: "Clipped or colliding HTML", 4.5: "Decorative hero backdrop", 5: "Console errors" };
function fnv(s) { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; } return h.toString(16).padStart(8, "0"); }
function findingKey(page, f) {
  const el = f.element || {}; const ot = f.other || {};
  const base = `${page}|${f.check}|${f.kind}|${f.drawing ? f.drawing.kind + ":" + f.drawing.name : ""}|${el.key || el.text || ""}`;
  const other = (f.kind.includes("overlap") || f.kind.includes("runs-into") || f.kind.includes("covered")) ? `|${ot.key || ot.text || ot.what || ""}` : "";
  return base + other;
}

// ---------------------------------------------------------------- one page at one viewport
async function runJob(page, job, ctx) {
  const { rel, vp } = job;
  const url = new URL(rel, ARGS.base).href;
  const out = [];
  const meta = { page: rel, viewport: vp.name, measurements: 0, phases: [], drawings: new Map(), errors: [], contact: null };
  const cropped = new Map(); // key -> crop path
  const slug = rel.replace(/\.html$/, "").replace(/[^a-z0-9]+/gi, "-");
  const cropDir = path.join(ARGS.out, "crops", slug);
  let cropN = 0;
  const measure = async (moment, scoped = false) => {
    let res;
    try { res = await page.call(inPageMeasure, { slack: ARGS.slack, arrowTol: ARGS.arrowTol, scoped }, 120000); }
    catch (e) { meta.errors.push({ phase: moment, source: "svg-fit", text: "measure failed: " + e.message }); return; }
    meta.measurements++;
    meta.phases.push({ moment, findings: res.findings.length, ...res.stats });
    for (const d of res.drawings) meta.drawings.set(`${d.kind}:${d.index}`, d);
    for (const f of res.findings) {
      const rec = { page: rel, viewport: vp.name, moment, check: f.check, kind: f.kind, severity: SEV[f.kind] || 3, drawing: f.drawing, element: f.element, other: f.other, measured: f.measured };
      rec.key = findingKey(rel, rec);
      rec.id = fnv(rec.key);
      const ck = `${rec.id}|${vp.name}`;
      if (ARGS.crops && !cropped.has(ck)) {
        cropped.set(ck, null);
        try {
          const g = await page.eval(`window.__svgfit.reveal(${f.ref})`);
          if (g && g.a) {
            await page.eval(`window.__svgfit.mark(${JSON.stringify([g.a, g.b && (g.b.x1 - g.b.x) * (g.b.y1 - g.b.y) < 4e6 ? g.b : null])})`);
            const ux0 = Math.min(g.a.x, g.b ? g.b.x : g.a.x), uy0 = Math.min(g.a.y, g.b ? g.b.y : g.a.y);
            const ux1 = Math.max(g.a.x1, g.b ? g.b.x1 : g.a.x1), uy1 = Math.max(g.a.y1, g.b ? g.b.y1 : g.a.y1);
            // keep the crop near the element: cap the partner's reach
            let x0 = Math.max(ux0, g.a.x - 360), y0 = Math.max(uy0, g.a.y - 260), x1 = Math.min(ux1, g.a.x1 + 360), y1 = Math.min(uy1, g.a.y1 + 260);
            x0 = Math.max(0, x0 - 40 + g.sx); y0 = Math.max(0, y0 - 40 + g.sy);
            x1 = Math.min(g.dw, x1 + 40 + g.sx); y1 = Math.min(g.dh, y1 + 40 + g.sy);
            if (x1 - x0 > 4 && y1 - y0 > 4) {
              const buf = await page.shot({ x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, (y1 - y0) > g.vh);
              fs.mkdirSync(cropDir, { recursive: true });
              const p = path.join(cropDir, `${vp.name}-c${f.check}-${String(++cropN).padStart(3, "0")}-${rec.id}.png`);
              fs.writeFileSync(p, buf);
              cropped.set(ck, path.relative(ARGS.out, p));
            }
            await page.eval("window.__svgfit.unmark()");
          }
        } catch (e) { meta.errors.push({ phase: moment, source: "svg-fit", text: "crop failed: " + e.message }); }
      }
      rec.crop = cropped.get(ck) || null;
      out.push(rec);
    }
  };
  const clickPass = async (mode, wait) => {
    let ctls = [];
    try { ctls = await page.call(inPageControls, null); } catch (e) { return; }
    for (const c of ctls) {
      page.phase = `click(${mode}): ${c.label}`;
      let r; try { r = await page.call(inPageControls, { click: c }); } catch (e) { r = { clicked: false }; }
      if (!r.clicked) { meta.errors.push({ phase: page.phase, source: "svg-fit", text: "control not found again after an earlier click" }); continue; }
      await sleep(wait);
      await measure(page.phase, true);
    }
    return ctls.length;
  };

  // motion pass
  page.errors = []; page.phase = "load";
  await page.viewport(vp, false);
  await page.goto(url);
  const t0 = Date.now();
  const prep = await page.call(inPagePrepare, null, 30000);
  meta.prep = prep;
  for (const m of ARGS.moments) {
    const wait = t0 + m - Date.now(); if (wait > 0) await sleep(wait);
    page.phase = `t=${m / 1000}s`;
    await measure(page.phase);
  }
  if (ARGS.clicks) meta.controls = await clickPass("motion", ARGS.clickWaitMotion);
  meta.errors.push(...page.errors);

  // reduced-motion pass: the end state
  page.errors = []; page.phase = "load(reduced-motion)";
  await page.viewport(vp, true);
  await page.goto(url);
  await page.call(inPagePrepare, null, 30000);
  await sleep(1200);
  page.phase = "reduced-motion";
  await measure(page.phase);
  // every <img> of an .svg file is measured once, on its own
  let svgFiles = [];
  try { svgFiles = await page.eval("[...document.querySelectorAll('img')].map((i) => i.currentSrc || i.src).filter((s) => /\\.svg([?#]|$)/i.test(s))"); } catch (e) {}
  const pendingSvgFiles = svgFiles.filter((u) => !ctx.svgFilesSeen.has(u));
  pendingSvgFiles.forEach((u) => ctx.svgFilesSeen.add(u));
  let contactShots = [];
  if (ARGS.contact && job.contact) {
    try {
      const labels = await page.call(inPageContactTargets, null);
      for (let i = 0; i < labels.length; i++) {
        const r = await page.eval(`(${inPageRectOf.toString()})(${i})`);
        if (!r) continue;
        await sleep(60);
        const buf = await page.shot({ x: Math.max(0, r.x - 8), y: Math.max(0, r.y - 8), width: r.w + 16, height: r.h + 16 }, r.h + 16 > r.vh);
        contactShots.push({ label: labels[i], b64: buf.toString("base64"), w: Math.round(r.w + 16), h: Math.round(r.h + 16) });
      }
    } catch (e) { meta.errors.push({ phase: "contact", source: "svg-fit", text: "contact sheet failed: " + e.message }); }
  }
  if (ARGS.clicks) await clickPass("reduced", ARGS.clickWaitReduced);
  meta.errors.push(...page.errors);
  page.errors = [];

  if (contactShots.length) {
    try {
      await page.viewport({ w: 1480, h: 900, name: "sheet" }, true);
      await page.goto("about:blank");
      const html = `<!doctype html><meta charset=utf-8><style>body{margin:0;padding:16px;background:#0B0F14;color:#E9EFF6;font:13px -apple-system,system-ui,sans-serif}h1{font-size:16px;margin:0 0 12px}figure{margin:0 0 18px}figcaption{color:#8A97A6;margin:0 0 6px}img{display:block;max-width:1440px;border:1px solid #2a3547}</style><h1>${rel} at ${vp.name}, end state (reduced motion), ${contactShots.length} drawings</h1>` +
        contactShots.map((c, i) => `<figure><figcaption>${i + 1}. ${c.label.replace(/[<&]/g, "")}</figcaption><img src="data:image/png;base64,${c.b64}"></figure>`).join("");
      await page.call((h) => { document.open(); document.write(h); document.close(); return true; }, html);
      await sleep(300);
      const dims = await page.eval("({w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight})");
      let h = dims.h;
      if (h > 16000) { await page.eval(`document.body.style.zoom=${(16000 / h).toFixed(3)}`); await sleep(200); h = 16000; }
      const buf = await page.shot({ x: 0, y: 0, width: dims.w, height: h }, true);
      fs.mkdirSync(path.join(ARGS.out, "contact"), { recursive: true });
      const p = path.join(ARGS.out, "contact", `${slug}.png`);
      fs.writeFileSync(p, buf);
      meta.contact = path.relative(ARGS.out, p);
      meta.contactDrawings = contactShots.length;
    } catch (e) { meta.errors.push({ phase: "contact", source: "svg-fit", text: "contact sheet failed: " + e.message }); }
  }
  for (const u of pendingSvgFiles) {
    const relFile = decodeURIComponent(new URL(u).pathname.replace(/^\//, ""));
    page.errors = []; page.phase = "standalone svg file";
    try {
      await page.viewport(vp, true);
      await page.goto(u);
      await sleep(300);
      const sub = await page.call(inPageMeasure, { slack: ARGS.slack, arrowTol: ARGS.arrowTol, scoped: false }, 60000);
      meta.measurements++;
      for (const d of sub.drawings) meta.drawings.set(`file:${relFile}`, { ...d, file: relFile });
      for (const f of sub.findings) {
        const rec = { page: relFile, viewport: vp.name, moment: `standalone (img on ${rel})`, check: f.check, kind: f.kind, severity: SEV[f.kind] || 3, drawing: f.drawing, element: f.element, other: f.other, measured: f.measured, crop: null };
        rec.key = findingKey(relFile, rec); rec.id = fnv(rec.key);
        out.push(rec);
      }
    } catch (e) { meta.errors.push({ phase: "standalone svg file", source: "svg-fit", text: `${relFile}: ${e.message}` }); }
    meta.errors.push(...page.errors); page.errors = [];
  }
  meta.svgFiles = svgFiles.length;
  for (const e of meta.errors) {
    if (e.source === "svg-fit") continue;
    const rec = { page: rel, viewport: vp.name, moment: e.phase, check: "console", kind: "console-error", severity: 5, drawing: null, element: { source: e.source, text: e.text, url: e.url, line: e.line }, measured: {} };
    rec.key = `${rel}|console|${e.source}|${e.text}`; rec.id = fnv(rec.key); rec.crop = null;
    out.push(rec);
  }
  meta.drawings = [...meta.drawings.values()];
  return { findings: out, meta };
}

// ---------------------------------------------------------------- report
function renderMarkdown(findings, metas, review, summary) {
  const groups = new Map();
  for (const f of findings) {
    if (!groups.has(f.id)) groups.set(f.id, { id: f.id, page: f.page, check: f.check, kind: f.kind, severity: f.severity, drawing: f.drawing, element: f.element, other: f.other, worst: f.measured, moments: new Map(), crops: new Map(), n: 0, steady: 0 });
    const g = groups.get(f.id); g.n++;
    if (!(f.element && f.element.animating)) g.steady++;
    if (!g.moments.has(f.viewport)) g.moments.set(f.viewport, new Set());
    g.moments.get(f.viewport).add(f.moment);
    if (f.crop && !g.crops.has(f.viewport)) g.crops.set(f.viewport, f.crop);
    const v = valueOf(f), w = valueOf({ kind: g.kind, measured: g.worst });
    if (v !== null && (w === null || worse(f.kind, v, w))) g.worst = f.measured;
  }
  const pages = [...new Set(findings.map((f) => f.page))].sort();
  const L = [];
  const counts = { REAL: 0, BORDERLINE: 0, FALSE: 0, unreviewed: 0 };
  for (const g of groups.values()) { const r = review[g.id]; counts[r ? r.verdict : "unreviewed"]++; }
  L.push(`# svg-fit findings`, ``);
  L.push(`Generated ${summary.when}. ${summary.pages} pages, ${summary.viewports.join(" and ")}, ${summary.drawings} drawings, ${summary.measurements} measurements, ${findings.length} raw findings in ${groups.size} distinct lines. Sweep time ${summary.seconds} s.`, ``);
  L.push(`Verdicts: REAL ${counts.REAL}, BORDERLINE ${counts.BORDERLINE}, FALSE ${counts.FALSE}, unreviewed ${counts.unreviewed}.`, ``);
  L.push(`Each line is one element and one check, merged across moments and viewports. Coordinates are the drawing's own user units. The crop marks the element in solid red and its partner (box, other label, line) in dashed blue.`, ``);
  for (const page of pages) {
    const gs = [...groups.values()].filter((g) => g.page === page);
    if (!gs.length) continue;
    gs.sort((a, b) => a.severity - b.severity || sortVal(a) - sortVal(b));
    L.push(`## ${page}`, ``);
    let lastGroup = null;
    for (const g of gs) {
      const grp = GROUP[g.severity];
      if (grp !== lastGroup) { L.push(`### ${grp}`, ``); lastGroup = grp; }
      const r = review[g.id];
      const verdict = r ? `**${r.verdict}**: ${r.reason}` : "**unreviewed**";
      const moments = [...g.moments.entries()].map(([vp, ms]) => `${vp}: ${[...ms].join(", ")}`).join("; ");
      const crops = [...g.crops.entries()].map(([vp, c]) => `[${vp}](${c})`).join(" ");
      L.push(`- \`${g.id}\` ${verdict}`);
      L.push(`  - check ${g.check}, ${g.kind}: ${describe(g)}`);
      const dn = g.drawing ? (g.drawing.name.length > 80 ? g.drawing.name.slice(0, 77) + "..." : g.drawing.name) : "";
      L.push(`  - drawing: ${g.drawing ? `${g.drawing.kind} "${dn}"` : "page"}; seen at ${moments}${g.steady === 0 ? " (only while the element was still animating in)" : ""}${crops ? `; crop ${crops}` : ""}`);
    }
    L.push(``);
  }
  return L.join("\n");
}
function valueOf(f) {
  const m = f.measured || {};
  if (m.slack !== undefined) return m.slack;
  if (m.overlapArea !== undefined) return m.overlapArea;
  if (m.distance !== undefined) return m.distance;
  if (m.beyond !== undefined) return m.beyond;
  if (m.clippedBy !== undefined) return m.clippedBy;
  if (m.crossingLength !== undefined) return m.crossingLength;
  return null;
}
function worse(kind, v, w) { return kind.startsWith("text-overflows") || kind.startsWith("text-tight") ? v < w : v > w; }
function sortVal(g) { const v = valueOf({ kind: g.kind, measured: g.worst }); if (v === null) return 0; return g.kind.startsWith("text-overflows") || g.kind.startsWith("text-tight") ? v : -v; }
function describe(g) {
  const e = g.element || {}, o = g.other || {}, m = g.worst || {};
  const t = (s) => `"${String(s || "").slice(0, 60)}"`;
  switch (g.kind) {
    case "text-overflows-box": case "text-tight-in-box": case "text-overflows-viewbox": case "text-tight-to-viewbox":
      return `${t(e.text)} at [${e.box}] in ${m.container}: slack ${m.slack} (${Object.entries(m.sides || {}).map(([k, v]) => `${k} ${v}`).join(", ")}), ink slack ${m.inkSlack}`;
    case "text-overlaps-text": case "text-duplicate-layer":
      return `${t(e.text)} [${e.ink}] and ${t(o.text)} [${o.ink}] overlap by ${m.overlapArea} sq units`;
    case "text-crossed-by-line":
      return `${t(e.text)} [${e.ink}] crossed by a ${o.dashed ? "dashed " : ""}${o.marker ? "arrowed " : ""}${o.tag} for ${m.crossingLength} units at ${JSON.stringify(m.at)}, line ${m.lineAboveText ? "above" : "below"} the text`;
    case "text-runs-into-box": case "text-covered-by-shape":
      return `${t(e.text)} [${e.ink}] meets ${o.tag}${o.label ? ` "${o.label}"` : ""} [${o.box}] by ${m.overlapW} x ${m.overlapH} (${m.overlapArea} sq units)`;
    case "text-outside-viewbox": case "shape-outside-viewbox":
      return `${e.tag}${e.text ? ` ${t(e.text)}` : ""} [${e.box}] beyond the viewBox [${m.viewBox}] by ${m.beyond} (${Object.entries(m.sides || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(", ")})`;
    case "arrow-ends-in-space": case "arrow-ends-inside-box": case "arrow-stops-short":
      return `${e.which} of ${e.marker ? "arrowed" : "dashed"} ${e.tag}, tip at [${e.tip}]: nearest edge ${m.distance} (${m.nearest})${m.insideBox ? `, inside ${m.insideBox}` : ""}, points at ${m.pointsAt}`;
    case "canvas-text-cut":
      return `${t(e.text)} cut by the canvas edge by ${m.beyond} css px (${Object.entries(m.sides || {}).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(", ")})`;
    case "canvas-text-overlap":
      return `${t(e.text)} and ${t(o.text)} overlap by ${m.overlapArea} css px sq`;
    case "html-clipped-text": case "html-clipped-drawing":
      return `<${e.tag}${e.cls ? ` class="${e.cls}"` : ""}> clips ${t(m.sample)} by ${m.clippedBy} px (scroll ${m.scroll}, client ${m.client}, overflow ${m.overflow}${m.ellipsis ? ", ellipsis" : ""})`;
    case "html-text-overlaps-text":
      return `${t(e.text)} (<${e.tag}${e.cls ? ` .${e.cls}` : ""}>) and ${t(o.text)} (<${o.tag}${o.cls ? ` .${o.cls}` : ""}>) overlap by ${m.overlapArea} px sq`;
    case "html-text-overlaps-box":
      return `${t(e.text)} (<${e.tag}${e.cls ? ` .${e.cls}` : ""}>) over <${o.tag}${o.cls ? ` class="${o.cls}"` : ""}> by ${m.overlapW} x ${m.overlapH} px`;
    case "html-text-over-drawing": case "html-text-over-canvas-text":
      return `${t(e.text)} (<${e.tag}${e.cls ? ` .${e.cls}` : ""}>) over ${o.what} by ${m.overlapArea} px sq`;
    case "wider-than-viewport":
      return `<${e.tag}${e.cls ? ` class="${e.cls}"` : ""}> ${t(e.text)} spans ${m.left} to ${m.right} in a ${m.viewport} px viewport`;
    case "page-scrolls-sideways":
      return `document is ${m.scrollWidth} px wide in a ${m.viewport} px viewport`;
    case "console-error":
      return `${e.source}: ${t(e.text)}${e.url ? ` (${e.url}${e.line != null ? `:${e.line}` : ""})` : ""}`;
    default: return JSON.stringify({ e, m });
  }
}

// ---------------------------------------------------------------- main
async function main() {
  fs.mkdirSync(ARGS.out, { recursive: true });
  const jsonPath = path.join(ARGS.out, "findings.json");
  const reviewPath = path.join(ARGS.out, "review.json");
  const readReview = () => { try { return JSON.parse(fs.readFileSync(reviewPath, "utf8")); } catch { return {}; } };
  if (ARGS.render) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    fs.writeFileSync(path.join(ARGS.out, "findings.md"), renderMarkdown(data.findings, data.pages, readReview(), data.summary));
    console.log(`svg-fit: rewrote ${path.join(ARGS.out, "findings.md")}`);
    return 0;
  }
  if (!ARGS.base) { console.error("svg-fit: --base URL is required (scripts/svg-fit.sh serves the repo and passes it)"); return 64; }
  const pages = ARGS.pages || discoverPages(ARGS.root);
  if (!pages.length) { console.error("svg-fit: measured nothing: no pages found under " + ARGS.root); return 2; }
  const jobs = [];
  for (const rel of pages) for (const vp of ARGS.viewports) jobs.push({ rel, vp, contact: vp === ARGS.viewports[0] });
  // heaviest first, so the workers finish together
  const weight = (rel) => { try { const s = fs.readFileSync(path.join(ARGS.root, rel), "utf8"); return (s.match(/<svg|aria-pressed|role="tab"|data-tab/g) || []).length; } catch { return 0; } };
  const w = new Map(pages.map((p) => [p, weight(p)]));
  jobs.sort((a, b) => w.get(b.rel) - w.get(a.rel));
  const started = Date.now();
  const allFindings = [], metas = [];
  let next = 0, done = 0;
  const shared = { svgFilesSeen: new Set() };
  const worker = async (wi) => {
    let chrome = null, page = null;
    const fresh = async () => { if (chrome) await chrome.close(); chrome = await Chrome.launch(); page = await chrome.newPage(); await page.init(); };
    await fresh();
    while (next < jobs.length) {
      const job = jobs[next++];
      const t = Date.now();
      try {
        const r = await runJob(page, job, shared);
        allFindings.push(...r.findings); metas.push(r.meta);
        log(`[${++done}/${jobs.length}] w${wi} ${job.rel} ${job.vp.name}: ${r.findings.length} findings, ${r.meta.measurements} measurements, ${((Date.now() - t) / 1000).toFixed(1)} s`);
      } catch (e) {
        metas.push({ page: job.rel, viewport: job.vp.name, measurements: 0, errors: [{ phase: "job", source: "svg-fit", text: e.message }], drawings: [] });
        log(`[${++done}/${jobs.length}] w${wi} ${job.rel} ${job.vp.name}: FAILED ${e.message}`);
        try { await fresh(); } catch (e2) { log("could not restart Chrome: " + e2.message); return; }
      }
    }
    await chrome.close();
  };
  await Promise.all(Array.from({ length: Math.min(ARGS.workers, jobs.length) }, (_, i) => worker(i)));
  const seconds = Math.round((Date.now() - started) / 1000);
  const drawings = metas.reduce((n, m) => n + (m.viewport === ARGS.viewports[0].name ? (m.drawings || []).length : 0), 0);
  const measurements = metas.reduce((n, m) => n + (m.measurements || 0), 0);
  const summary = { when: new Date().toISOString(), pages: pages.length, viewports: ARGS.viewports.map((v) => v.name), drawings, measurements, seconds, findings: allFindings.length, args: { slack: ARGS.slack, arrowTol: ARGS.arrowTol, moments: ARGS.moments } };
  allFindings.sort((a, b) => a.page.localeCompare(b.page) || a.severity - b.severity);
  fs.writeFileSync(jsonPath, JSON.stringify({ summary, pages: metas, findings: allFindings }, null, 1));
  fs.writeFileSync(path.join(ARGS.out, "findings.md"), renderMarkdown(allFindings, metas, readReview(), summary));
  const kinds = {}; for (const f of allFindings) kinds[f.kind] = (kinds[f.kind] || 0) + 1;
  const toolErrors = metas.flatMap((m) => (m.errors || []).filter((e) => e.source === "svg-fit").map((e) => `${m.page} ${m.viewport} ${e.phase}: ${e.text}`));
  console.log(`svg-fit: ${pages.length} pages x ${ARGS.viewports.length} viewports, ${drawings} drawings at ${ARGS.viewports[0].name}, ${measurements} measurements, ${allFindings.length} raw findings, ${seconds} s`);
  for (const [k, v] of Object.entries(kinds).sort((a, b) => (SEV[a[0]] || 9) - (SEV[b[0]] || 9))) console.log(`  ${k}: ${v}`);
  if (toolErrors.length) { console.log(`svg-fit: ${toolErrors.length} tool errors:`); for (const t of toolErrors.slice(0, 20)) console.log("  " + t); }
  if (!drawings) { console.log("svg-fit: measured nothing: no drawing found on any page"); return 2; }
  const failing = allFindings.filter((f) => ARGS.failOn.includes(f.kind));
  if (failing.length) { console.log(`svg-fit: ${failing.length} findings of a kind named in --fail-on`); return 1; }
  return 0;
}

main().then((code) => process.exit(code), (e) => { console.error("svg-fit: " + (e && e.stack || e)); process.exit(3); });
