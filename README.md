<p align="center">
  <img src="docs/banner.svg" alt="IT-RAT — Secure your cloud. Control your spend." width="100%">
</p>

<p align="center">
  <a href="#-live-site"><img src="https://img.shields.io/badge/site-live-e8431c?style=flat-square" alt="Live"></a>
  <img src="https://img.shields.io/badge/HTML5-14110f?style=flat-square&logo=html5&logoColor=f4a91b" alt="HTML5">
  <img src="https://img.shields.io/badge/CSS3-14110f?style=flat-square&logo=css3&logoColor=f4a91b" alt="CSS3">
  <img src="https://img.shields.io/badge/JavaScript-14110f?style=flat-square&logo=javascript&logoColor=f4a91b" alt="JavaScript">
  <img src="https://img.shields.io/badge/dependencies-0-2ea44f?style=flat-square" alt="Zero dependencies">
  <img src="https://img.shields.io/badge/GitHub%20Pages-deployed-f4a91b?style=flat-square&logo=github&logoColor=14110f" alt="GitHub Pages">
</p>

# IT-RAT

Marketing site for **IT-RAT** — a boutique cloud consultancy. The company is
positioned around two disciplines its founders practise at enterprise scale —
**Cloud Security & IAM** and **FinOps & Cloud Cost Governance** — now applied to
a full-scale **AI rollout**: adopting AI across cloud, FinOps and security while
keeping it secure, cost-governed and compliant.

The site is a single, self-contained landing page: hand-written HTML, CSS and
vanilla JavaScript with **no frameworks, no build step and no runtime
dependencies** beyond Google Fonts. It is hosted on GitHub Pages.

---

## 🌐 Live site

> ## **https://it-rat.github.io/**

Served from the `master` branch of this repository via GitHub Pages.

> [!NOTE]
> **`it-rat/it-rat.github.io` is the canonical repository** — it powers the live
> `it-rat.github.io` site. `TAIPANBOX/it-rat.github.io` is only a personal fork
> used to prepare changes.

---

## 🧭 The message (AIDA)

The page is structured around the classic **A·I·D·A** copywriting funnel — every
section pushes the visitor one step further toward booking a call.

```mermaid
flowchart LR
    A["🎯 Attention<br/>Hero<br/><i>Scale AI safely.<br/>Control the spend.</i>"]
    I["💡 Interest<br/>Proof bar + 'The problem'<br/><i>AI spend, identity, late security</i>"]
    D["🔥 Desire<br/>Services · AI under control<br/>Capabilities · Team · Process"]
    Act["✅ Action<br/>CTA + contact form<br/><i>Book a discovery call</i>"]
    A --> I --> D --> Act
```

---

## 🗺️ Page structure

```mermaid
flowchart TD
    NAV[Sticky nav + scroll progress bar]
    HERO[Hero — headline, CTAs, trust line, constellation canvas]
    PROOF[Proof marquee — NatWest · Okta · PETRONAS · clients]
    PAIN[The problem — 3 pain cards on dark]
    SVC[Services — 4 cards]
    AIB[AI under control — feature band]
    CAP[Capabilities — cloud / security / finops / AI / compliance tags]
    TEAM[Team — Yurii & Tania]
    PROC[How we engage — Assess · Architect · Embed]
    CTA[CTA + contact form]
    FOOT[Footer — social + copyright]

    NAV --> HERO --> PROOF --> PAIN --> SVC --> AIB --> CAP --> TEAM --> PROC --> CTA --> FOOT
```

---

## 🧩 Services offered

```mermaid
mindmap
  root((IT-RAT))
    AI Adoption & Governance
      AI across cloud · FinOps · security
      Securing AI / LLM / model access
      FinOps for AI / token guardrails
      AI policy & compliance
    Cloud Security & IAM
      Zero Trust / least privilege
      IAM across AWS · GCP · Okta · Auth0
      DevSecOps & secure CI/CD
      Securing AI workloads
      ISO 27001 · NIST · SOC 2 · GDPR
    FinOps & Cost Governance
      Cost optimization & rightsizing
      Tagging / allocation / chargeback
      Anomaly detection & budget guardrails
      FinOps for AI / token cost
      Multi-cloud & GreenOps
    Cloud & Platform Architecture
      AWS & GCP solution design
      Kubernetes · GitOps
      Terraform / Terragrunt (IaC)
      Migration & data pipelines
    Advisory & Reviews
      Security & cost posture audits
      Multi-year cloud strategy
      Team enablement & FinOps training
```

---

## ⚙️ Architecture & tech

A deliberately simple, dependency-free static site — fast, portable and trivial
to host.

```mermaid
flowchart LR
    subgraph Repo["📦 Repository (master)"]
        HTML["index.html<br/>structure + inline JS"]
        CSS["style.css<br/>design system + animation"]
        ASSETS["img/ · favicon.png"]
        DOCS["docs/banner.svg"]
    end
    FONTS["Google Fonts<br/>Space Grotesk · Inter"]
    PAGES["GitHub Pages"]
    USER["🧑 Visitor browser"]

    HTML --> PAGES
    CSS --> PAGES
    ASSETS --> PAGES
    HTML -. CDN .-> FONTS
    PAGES --> USER
    FONTS -. webfonts .-> USER
```

| Layer | Choice |
|---|---|
| Markup | Semantic HTML5, single page |
| Styling | One `style.css`, CSS custom properties, grid/flex, `clamp()` |
| Behaviour | Vanilla JS (one IIFE, inline) |
| Graphics | Inline SVG icons + a `<canvas>` particle field |
| Fonts | Space Grotesk (display) + Inter (body) |
| Build | **None** — open `index.html` and it runs |
| Hosting | GitHub Pages |

---

## 🎬 Interactivity & motion

- **Constellation canvas** in the hero — a particle network (amber / red / ink
  nodes) that links nearby points and reacts to the cursor.
- **3D tilt + parallax** on the hero illustration and its floating badges.
- **Magnetic buttons** that lean toward the pointer.
- **Logo marquee** — an infinite, pause-on-hover credibility strip.
- **Scroll-reveal** of every section (staggered) + a top **scroll-progress bar**.
- **Animated backgrounds** — drifting dot-grid, rotating glows on the dark bands.
- Fully respects **`prefers-reduced-motion`**; reveal is **JS-gated** so the page
  is never blank without JavaScript.

---

## 🎨 Design system

**Palette**

| | Token | Hex | Use |
|---|---|---|---|
| ![amber](https://img.shields.io/badge/_-F4A91B?style=flat-square&color=F4A91B) | Amber | `#F4A91B` | Brand / highlights |
| ![red](https://img.shields.io/badge/_-E8431C?style=flat-square&color=E8431C) | Red | `#E8431C` | Accent / CTA hover |
| ![ink](https://img.shields.io/badge/_-14110F?style=flat-square&color=14110F) | Ink | `#14110F` | Text / dark sections |
| ![paper](https://img.shields.io/badge/_-F7F3EC?style=flat-square&color=F7F3EC) | Paper | `#F7F3EC` | Background |

**Type** — `Space Grotesk` for headings, `Inter` for body.
**Motif** — hand-drawn line illustrations + a node/identity-graph constellation.

---

## 👥 The team

<table>
  <tr>
    <td align="center" width="50%">
      <img src="img/Yuriy.gif" width="180" alt="Yurii Kostiuk"><br>
      <b>Yurii Kostiuk</b><br>
      Cloud Security &amp; IAM<br>
      <sub>Lead Security Architect, PETRONAS · ex-Okta</sub><br>
      <a href="https://www.linkedin.com/in/yurii-kostiuk-778900ab/">LinkedIn</a>
    </td>
    <td align="center" width="50%">
      <img src="img/Tania.gif" width="180" alt="Tania Fedirko"><br>
      <b>Tania Fedirko</b><br>
      FinOps &amp; Cost Governance<br>
      <sub>Principal FinOps Architect, NatWest · AWS Community Builder</sub><br>
      <a href="https://www.linkedin.com/in/tania-fedirko-9bb1a5136/">LinkedIn</a>
    </td>
  </tr>
</table>

---

## 🚀 Run locally

No build, no install. Either open the file directly:

```bash
open index.html
```

…or serve it (recommended, so relative paths and fonts behave):

```bash
python3 -m http.server 4599
# then visit http://localhost:4599
```

---

## 📁 Project structure

```
it-rat.github.io/
├── index.html        # the whole page (markup + inline JS)
├── style.css         # design system, layout, animation
├── favicon.png
├── docs/
│   └── banner.svg    # README banner
└── img/              # logo, team illustrations, client logos
```

---

## 🛠️ Deployment

Pushing to `master` publishes automatically through GitHub Pages — no CI, no
actions, no build artefacts.

```bash
git add -A
git commit -m "feat: ..."
git push origin master
```

---

## 📄 License

© IT-RAT. All rights reserved. Team illustrations and logo belong to IT-RAT.
