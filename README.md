# it-rat.com

Source for the live IT-RAT site at <https://it-rat.com>, served by GitHub
Pages from the `master` branch of this repo (custom domain via `CNAME`).

Static: no build step, no CDNs, no external fonts. Everything works from
GitHub Pages as-is and from any static file server.

## Layout

- `index.html` - the control-room home: fuse-wire hero, the stack rail (ten
  services), wiring diagram, live-validation numbers, consulting section.
- `services/*.html` - one page per service, each with a scrubbable timeline
  simulation built on real validation numbers, an animated architecture
  diagram, feature cards and an honest comparison table.
- `assets/` - the design system (`site.css`) plus the interaction and
  simulation engines (`site.js`, `sim.js`, `stages/*.js`, `diagram.js`,
  `ambient.js`) and the shared `og.png` link-preview card.
- `404.html`, `robots.txt`, `sitemap.xml`, `CNAME` - hosting glue.

## Preview locally

    python3 -m http.server 8123
    # then open http://localhost:8123
    # (cross-document View Transitions need http, not file://)

## History

This is the v2 rebuild. The previous version of the site is preserved at the
`v1-final` tag and in the private `it-rat-v1` archive repository.
