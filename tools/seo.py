#!/usr/bin/env python3
"""Write the structured data every page should carry, from facts already on it.

Nothing here is invented: names, descriptions and repository URLs are read out
of each page's own <head> and hero, so the JSON-LD cannot drift away from what
a visitor sees. No ratings, no review counts, no prices we do not publish.

Run from the repo root:  python3 tools/seo.py   (idempotent)
"""
import json
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = "https://it-rat.com"
MARK_OPEN = "<!-- seo:auto -->"
MARK_CLOSE = "<!-- /seo:auto -->"

GUIDES = {
    "ai-agent-governance.html": "AI agent governance",
    "finops-for-ai.html": "FinOps for AI",
    "ai-agent-security.html": "AI agent security",
}

SERVICE_PAGES = [
    "services/engram.html", "services/tokenfuse.html", "services/wardryx.html",
    "services/idryx.html", "services/qryx.html", "services/verdryx.html",
    "services/mockryx.html", "services/platform.html",
]


def registry_names():
    """The names the rail, the footer and the palette already use for each page."""
    js = (ROOT / "assets/site.js").read_text(encoding="utf-8")
    block = re.search(r"const STACK = \[(.*?)\n\];", js, re.S)
    out = {}
    for line in block.group(1).splitlines() if block else []:
        m = re.search(r'name:"([^"]+)".*?href:"([^"]+)"', line)
        if m:
            out[m.group(2)] = m.group(1)
    return out


NAMES = registry_names()


def head_bits(html, path=""):
    title = re.search(r"<title>(.*?)</title>", html, re.S)
    desc = re.search(r'<meta name="description" content="(.*?)"', html, re.S)
    canon = re.search(r'<link rel="canonical" href="([^"]+)"', html)
    repo = re.search(r'href="(https://github\.com/TAIPANBOX/[a-z0-9-]+)"', html)
    h1 = re.search(r"<h1[^>]*>(.*?)</h1>", html, re.S)
    name = re.sub(r"<[^>]+>", "", h1.group(1)).split(".")[0].strip() if h1 else ""
    return dict(
        title=re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", title.group(1))).strip() if title else "",
        desc=desc.group(1) if desc else "",
        url=canon.group(1) if canon else "",
        repo=repo.group(1) if repo else "",
        name=NAMES.get(path, name),
    )


def ld(obj):
    return ('<script type="application/ld+json">'
            + json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
            + "</script>")


def organization():
    return {
        "@type": "Organization",
        "@id": f"{SITE}/#org",
        "name": "IT-RAT",
        "url": f"{SITE}/",
        "logo": f"{SITE}/apple-touch-icon.png",
        "image": f"{SITE}/assets/og.png",
        "email": "itratmail@gmail.com",
        "description": ("Cloud security, IAM and FinOps practice, and the authors of the "
                        "open-source agent-governance stack: runtime spend control, policy, "
                        "memory, identity, cryptography, quality and pre-production drills for AI agents."),
        "sameAs": [
            "https://github.com/TAIPANBOX",
            "https://www.linkedin.com/in/yurii-kostiuk-778900ab/",
            "https://www.linkedin.com/in/tania-fedirko-9bb1a5136/",
        ],
        "founder": [
            {"@type": "Person", "name": "Yurii Kostiuk",
             "jobTitle": "Lead Security Architect",
             "sameAs": "https://www.linkedin.com/in/yurii-kostiuk-778900ab/"},
            {"@type": "Person", "name": "Tania Fedirko",
             "jobTitle": "Principal FinOps Architect",
             "sameAs": "https://www.linkedin.com/in/tania-fedirko-9bb1a5136/"},
        ],
        "knowsAbout": ["AI agent governance", "FinOps for AI", "Zero Trust", "Identity and access management",
                       "Post-quantum cryptography", "Cloud security"],
    }


def website():
    return {"@type": "WebSite", "@id": f"{SITE}/#website", "url": f"{SITE}/",
            "name": "IT-RAT", "publisher": {"@id": f"{SITE}/#org"}, "inLanguage": "en"}


def breadcrumbs(bits):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "IT-RAT", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": "The stack", "item": f"{SITE}/#stack"},
        {"@type": "ListItem", "position": 3, "name": bits["name"], "item": bits["url"]},
    ]}


def software(bits, free=True):
    app = {
        "@type": "SoftwareApplication",
        "name": bits["name"],
        "url": bits["url"],
        "description": bits["desc"],
        "applicationCategory": "DeveloperApplication",
        "operatingSystem": "Linux, macOS",
        "publisher": {"@id": f"{SITE}/#org"},
        "isAccessibleForFree": free,
    }
    if bits["repo"]:
        app["codeRepository"] = bits["repo"]
    if free:
        app["license"] = "https://www.apache.org/licenses/LICENSE-2.0"
        app["offers"] = {"@type": "Offer", "price": "0", "priceCurrency": "USD"}
    return app


def faq(html):
    """Read the visible FAQ back out of the page.

    Google's rule is that the marked-up answer must be the answer on the
    page, so the only safe source for this is the page itself.
    """
    block = re.search(r"<!-- faq:auto -->(.*?)<!-- /faq:auto -->", html, re.S)
    if not block:
        return None
    items = []
    for m in re.finditer(r"<summary>(.*?)</summary>\s*<div class=\"a\">(.*?)</div>\s*</details>",
                         block.group(1), re.S):
        q = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", "", m.group(1))).strip()
        a = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", m.group(2))).strip()
        if q and a:
            items.append({"@type": "Question", "name": q,
                          "acceptedAnswer": {"@type": "Answer", "text": a}})
    if not items:
        return None
    return {"@type": "FAQPage", "mainEntity": items}


def article(bits, name, published="2026-07-26"):
    return {
        "@type": "TechArticle",
        "headline": bits["title"].split("\u00b7")[0].strip(),
        "name": name,
        "url": bits["url"],
        "description": bits["desc"],
        "inLanguage": "en",
        "datePublished": published,
        "dateModified": published,
        "author": {"@id": f"{SITE}/#org"},
        "publisher": {"@id": f"{SITE}/#org"},
        "mainEntityOfPage": bits["url"],
    }


def guide_crumbs(bits, name):
    return {"@type": "BreadcrumbList", "itemListElement": [
        {"@type": "ListItem", "position": 1, "name": "IT-RAT", "item": f"{SITE}/"},
        {"@type": "ListItem", "position": 2, "name": name, "item": bits["url"]},
    ]}


def write(path, graph):
    p = ROOT / path
    h = p.read_text(encoding="utf-8")
    block = MARK_OPEN + "\n" + ld({"@context": "https://schema.org", "@graph": graph}) + "\n" + MARK_CLOSE
    if MARK_OPEN in h:
        h2 = re.sub(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), lambda _: block, h, flags=re.S)
    else:
        h2 = h.replace("</head>", block + "\n</head>", 1)
    if h2 == h:
        print(f"{path:28} unchanged")
        return 0
    p.write_text(h2, encoding="utf-8")
    print(f"{path:28} written")
    return 1


def main():
    n = 0
    idx_html = (ROOT / "index.html").read_text(encoding="utf-8")
    idx = head_bits(idx_html, "index.html")
    graph = [organization(), website(),
             {"@type": "WebPage", "url": f"{SITE}/", "name": idx["title"],
              "description": idx["desc"], "isPartOf": {"@id": f"{SITE}/#website"}}]
    q = faq(idx_html)
    if q:
        graph.append(q)
    n += write("index.html", graph)

    ent = head_bits((ROOT / "enterprise.html").read_text(encoding="utf-8"), "enterprise.html")
    ent_app = software(ent, free=False)
    ent_app.pop("codeRepository", None)   # Genaryx is the one closed room
    n += write("enterprise.html", [ent_app, breadcrumbs(ent)])

    for path, name in GUIDES.items():
        html = (ROOT / path).read_text(encoding="utf-8")
        bits = head_bits(html, path)
        graph = [article(bits, name), guide_crumbs(bits, name)]
        q = faq(html)
        if q:
            graph.append(q)
        n += write(path, graph)

    for path in SERVICE_PAGES:
        html = (ROOT / path).read_text(encoding="utf-8")
        bits = head_bits(html, path)
        if not bits["name"] or not bits["url"]:
            sys.exit(f"{path}: could not read a name or canonical, refusing to guess")
        graph = [software(bits), breadcrumbs(bits)]
        q = faq(html)
        if q:
            graph.append(q)
        n += write(path, graph)
    print(f"\n{n} file(s) updated")


if __name__ == "__main__":
    main()
