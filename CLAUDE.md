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
   70 characters, description between 25 and 160. A truncated title in a search
   result is the first thing a stranger sees.
   *(gate: `scripts/page-metadata.sh`, run in the Pages workflow BEFORE the
   upload, so a bad page does not reach production and get fixed afterwards)*
2. **The machine-readable claims move with the copy.** JSON-LD, Open Graph,
   canonical and sitemap describe the same thing the visible text does. A pivot
   that rewrites the prose and leaves the structured data behind ships two
   different stories, and search engines read the one nobody proofread.
   **Never put `noindex` beside a canonical.**
   *(partly gated: `scripts/page-metadata.sh` holds the noindex-beside-canonical
   pair and og:title agreeing with `<title>`. JSON-LD and sitemap agreeing with
   the prose still needs a reader.)*
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
7. **The published demo is a build of the current genaryx.** `/demo` is not
   built here: it is a hand-pasted copy of `genaryx/apps/web/dist`, and a copy
   carries no date. Every page renders and every link works while the console
   on the site sits months behind the console in the repository, so this decays
   in the one direction nobody looks. It is refreshed with
   `scripts/refresh-demo.sh`, never by hand, because two flags in genaryx's
   build command are load-bearing and neither is guessable.
   *(gate: `scripts/demo-bundle-current.sh`, in the Pages workflow before the
   upload. It compares the last commit that touched `apps/web`, NOT genaryx's
   main tip: most commits there cannot change the bundle, and a check that
   fails on every unrelated merge is one somebody switches off. It also holds
   the local half with no network, that `demo/index.html` loads exactly the two
   files `demo/BUILD.json` records and that no previous build's hashed assets
   linger beside them, since a content-hashed name is served for as long as the
   file exists.)*

## Decisions that have no gate yet

**Held by this file alone: invariants 3, 4 and 6.** Invariant 2 is half held.

Invariants 1 and 2 are now `scripts/page-metadata.sh`, and it found invariant 2
being violated rather than merely unenforced: `console.html` carried a canonical
AND a noindex. The pair says opposite things, one asking for the URL to be the
authoritative version and the other asking for it to be dropped, and which wins
is somebody else's algorithm. Resolved by dropping the canonical, since that
page is deliberately not indexed and is not in the sitemap. `/enterprise` and
`/products` resolved the same contradiction the other way round, because those
want to be folded rather than dropped, and they already carry comments saying so.

**The check knows this site rather than counting blindly**, which matters:
its first version reported three failures, and all three were the two redirect
pages and the built `/demo` app, none of which authors its own head. Redirects
are checked for a canonical instead; generated output is skipped, because
measuring it measures the bundler.

It also does NOT require `og:description` to match the meta description. They
differ deliberately on all nineteen pages that have both: the search snippet is
held under 160 and the social card is allowed to run longer. Requiring a match
would be requiring a mistake.

Invariant 7 is `scripts/demo-bundle-current.sh`, added after the site was found
serving a demo built from an unmerged branch, with nothing anywhere able to say
so. Writing it turned up a defect in the check itself, which is worth recording
because it is the shape these fail in: the manifest was parsed through a command
substitution piped into `read`, which discards the exit status, so a manifest
missing a key produced empty values and then complained about a file named
`demo/`. It reported a real failure for the wrong reason, which is the same
thing as reporting a wrong one. Each of its six refusals was then triggered
deliberately and checked to fail for its OWN reason, after a first attempt at
that whose fixture stayed broken between cases and "proved" three of them on the
previous case's damage.

What still needs a reader: JSON-LD and the sitemap agreeing with the prose,
invariant 3's numbers having owners, invariant 4's status sentences, and
invariant 6.

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
