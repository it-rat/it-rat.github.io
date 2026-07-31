# CLAUDE.md, working instructions for the it-rat.com site

These instructions apply to any model working in this repo. Read this file
before changing anything. It holds process and invariants only: **no status.**

## What this is

The site for IT-RAT, a boutique cloud consultancy. A self-contained static site
served from GitHub Pages at it-rat.com. The default branch here is `master`.

**Two remotes, on purpose.** `origin` is `TAIPANBOX/it-rat.github.io`;
`upstream` is `it-rat/it-rat.github.io`, the separate account the live site
deploys from. Know which one you are pushing to before you push.

## Blast radius

This is the public face of the business. A wrong claim here is not a bug report,
it is something a prospective client reads and quietly discounts. Everything
committed is published.

## Hard invariants

Each one carries how it is held today. Use `(gate: ...)`, `(test: ...)`,
`(partly gated: ...)` or `(not enforced)`, and use the weakest one that is
true.

1. **Every page's metadata is measured at publish, not assumed.** Title at most
   70 characters, description between 25 and 160, re-measured for every page
   that changed. A truncated title in a search result is the first thing a
   stranger sees. *(not enforced)*
2. **The machine-readable claims move with the copy.** JSON-LD, Open Graph,
   canonical and sitemap describe the same thing the visible text does. A pivot
   that rewrites the prose and leaves the structured data behind ships two
   different stories, and search engines read the one nobody proofread. Never
   put `noindex` beside a canonical. *(not enforced)*
3. **A number on this site is a claim with an owner.** Anything measured says
   what measured it and when. If a figure came from a run, it can be pointed at;
   if it cannot, it does not belong here. *(not enforced)*
4. **A refresh updates numbers. Only a sweep updates status sentences.** The
   sentence "we are building X" outlives the number beside it by months. When
   the numbers change, read the sentences too. *(not enforced)*
5. **The cancelled phone and watch surface is never mentioned**, including in
   glossary cards, alt text, structured data, and asset filenames.
   *(not enforced)*
6. **Nothing on this site is sold.** The stack is open; consulting is the
   commercial motion. No pricing, no plans, no upgrade language.
   *(not enforced)*

## Decisions that have no gate yet

Every invariant above is held by this file alone.

**Invariants 1 and 2 are both straightforward scripts and both have already been
violated in practice**, which makes them the obvious first two: parse each HTML
page, measure title and description length, and assert the JSON-LD and canonical
agree with the visible headline. That is an afternoon, and it converts the two
most repeated manual checks into a red build.

Invariant 5 is a wordlist grep across HTML, alt text and filenames.

## Standing rule

An approved architecture decision is **not finished** until it is two things: a
numbered invariant in this file, and a gate in a script if it can be checked
structurally. Until then it is a document, and documents do not stop code.

## Conventions

- **No long dashes** anywhere: not in code, docs, commit messages, or PR
  bodies. Use a comma, a colon, parentheses, or a short hyphen.
- Nothing paid or metered gets enabled without telling the user first and
  getting agreement.
- Do not delete or revoke keys, tokens, or certificates on your own initiative.
