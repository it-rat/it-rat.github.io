# it-rat2 - the new IT-RAT site (parallel build)

A ground-up rebuild of it-rat.com as an interactive product site for the
agent-governance stack. Lives NEXT TO the current site (`../it-rat`) and does
not touch it; swapping is a separate, explicit decision.

## What's inside

- `index.html` - the control-room home: fuse-wire canvas hero, the stack rail
  (10 cards, scrolls sideways), wiring diagram, live-validation numbers,
  consulting section.
- `services/*.html` - one room per service (wave 1, wave 2, platform contract,
  TokenFuse Pocket, Sphere). Each page: hero facts, a scrubbable "watch it over
  time" simulation built on real validation numbers, an animated architecture
  diagram, six feature cards, an honest comparison table, prev/next edge
  navigation.
- `assets/site.css` - the design system (dark control-room, per-service accent
  colors, view-transition slide animations).
- `assets/site.js` - stack registry, command palette (Cmd+K or /), directional
  cross-document View Transitions (pages slide sideways), reveal-on-scroll,
  count-up numbers, edge/dots navigation, arrow-key paging.
- `assets/sim.js` - the timeline-simulation engine (shared chrome: counters,
  event log, play/scrub/speed, reduced-motion aware) plus a stage registry:
  every service renders its own kind of visualization on the shared timeline.
- `assets/stages/*.js` - one bespoke sim stage per service (fuse wire and
  budget bar for TokenFuse, decision gate lanes for Wardryx, estate sweep grid
  for Qryx, and so on). Deterministic in t, so scrubbing works both ways.
- `assets/diagram.js` - architecture-schematic helpers: staggered draw-in on
  reveal and a full-screen lightbox (wheel/pinch zoom, drag pan, double-click
  reset) so every label is readable at any size.
- `assets/ambient.js` - quiet AI-flavored canvas backdrops for service heroes,
  one motif per service drawn from its domain: gradient descent (TokenFuse),
  a learned decision boundary (Wardryx), a memory graph with spreading
  activation (Engram), an identity graph (Idryx), a rotating point lattice
  (Qryx), training curves (Verdryx), adversarial bursts vs a guardrail
  (Mockryx), tensor tiles (Platform), an out-of-band pulse graph (Pocket),
  an attention ring over twelve agents (Sphere).

No build step, no CDNs, no external fonts. Everything works from GitHub Pages
as-is and from any static file server.

## Preview locally

    python3 -m http.server 8123 --directory .

then open http://localhost:8123. (View Transitions need http, not file://.)

## Navigation model (why there is no 10-tab menu)

Home is the hub: the rail and the wiring diagram are the map. Service pages
are chained left/right (edge cards, arrow keys, the dots rail on the right),
and the whole site pages SIDEWAYS via cross-document View Transitions in
Chrome/Edge/Safari-18+; other browsers just navigate instantly. Cmd+K (or /)
opens the command palette from anywhere.

## If/when it replaces the live site

1. Copy the contents of this folder over the `it-rat` repo work tree
   (keep `CNAME`!), commit, push: GitHub Pages does the rest.
2. Or point Pages at a new branch containing this tree.
Keep `favicon.png` and `CNAME`; regenerate `og` images if desired.
