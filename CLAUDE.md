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

## Gates

```sh
./scripts/page-metadata.sh
./scripts/service-numbers.sh
./scripts/demo-bundle-current.sh
./scripts/deploy-target-current.sh  # invariant 9; needs network
# demo-bundle-current.sh also runs daily on its own schedule; see invariant 7
./scripts/gates-have-teeth.sh     # invariant 8; needs a clean tree
```

This list did not exist until 2026-08-09: the gates were named only inside the
invariants that own them, while the Pages workflow ran three of them.

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
   if it cannot, it does not belong here.
   *(gate: `scripts/service-numbers.sh` against `numbers.json`, in the Pages
   workflow before the upload. It cannot tell you a recorded figure is still
   true, because nothing here can reach another repository's suite. It makes the
   silent case impossible: every figure on a service page is in the manifest
   with its repository, the command that produces it and the date somebody last
   ran that command, and a page edited without the manifest fails. Figures
   nobody has reproduced are ALLOWED and reported every run, because refusing
   them would only teach people to leave numbers off the page. **All seven are
   reproduced as of 2026-08-05**, which took a venv, one `git clone` and reading
   two type signatures, and found four of the seven wrong: trailryx by 33,
   tokenfuse by 196, engram by 42 and verdryx by 75. Nothing keeps them true;
   the manifest keeps them dated.)*
4. **A refresh updates numbers. Only a sweep updates status sentences.** The
   sentence "we are building X" outlives the number beside it by months. When
   the numbers change, read the sentences too. *(not enforced)*
5. **Nothing unverified reads as verified, and the two mobile apps are where
   that is hardest.** They are not one case, and this invariant said they were
   until 2026-08-04. Sphere is a side project; **TokenFuse Pocket is in the
   stack**, by Yurii's decision on 2026-08-03, and the site says so.

   - **Sphere** is linked from the footer and nowhere else: not in the `STACK`
     registry, so it cannot reach the corridor rail, the prev/next walk, the
     dot strip or the jump palette. It sits under its own `side project`
     heading beside `standalone`.
   - **Pocket** is in `STACK`, on the rail, in the walk, in the palette, has
     `services/pocket.html`, and carries a coloured chip like any other room.
     What holds the invariant for it is not exclusion but a marker it cannot
     lose: `note: "not wired in yet"` in the registry, rendered on its rail
     card, in its top band, and in its own eyebrow. Its page states the limit
     in its own fact table: no hardening pass, no security review, no App
     Store.

   The reason the old rule existed has not changed, only who it applies to.
   Every other page here points at something running and measured, and that is
   the one thing this site has that cannot be copied; a promise standing next
   to those makes a reader ask which of the rest are also promises. So a room
   for something unshipped is allowed to exist and is never allowed to look
   finished.

   **Read this before "fixing" the site to match an older version of this
   file.** Between 2026-08-03 and 2026-08-04 this invariant forbade four
   things the site was already doing on purpose: Pocket in the registry, on
   the rail, with a page, with a chip. An instruction file younger than the
   decision it describes is the one way a rule like this destroys work rather
   than protecting it.
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
   upload AND on a daily schedule of its own
   (`.github/workflows/demo-freshness.yml`), which is the half that took two
   incidents to learn. The gate was correct from the day it was written and
   caught neither of them, because the Pages workflow only runs on a push HERE
   and the demo goes stale when GENARYX changes. Between a merge there and the
   next push here it was right and silent, and both times a person found the
   stale demo by opening it. A check nothing invokes at the moment of the fault
   is documentation. It compares the last commit that touched `apps/web`, NOT genaryx's
   main tip: most commits there cannot change the bundle, and a check that
   fails on every unrelated merge is one somebody switches off. It also holds
   the local half with no network, that `demo/index.html` loads exactly the two
   files `demo/BUILD.json` records and that no previous build's hashed assets
   linger beside them, since a content-hashed name is served for as long as the
   file exists.)*

8. **A check must be able to tell "did not fail" from "did not run", and every
   gate here has been made to fail on purpose to prove it can.**
   `page-metadata.sh` and `service-numbers.sh` already refuse when their
   subject is absent, and say so in their own words: no HTML pages found,
   `numbers.json` missing, `numbers.json` recording no entries. Those sentences
   were true, were established by hand once, and nothing re-ran them.

   **This repository added a fourth property to the harness, and the reason is
   worth keeping.** A case expecting a gate to FAIL proves nothing if the gate
   was already failing before the mutation. On 2026-08-09
   `demo-bundle-current.sh` was red on a clean tree here, correctly: the
   published demo is built from an older genaryx than `apps/web` now holds. A
   case written against it would have gone green while measuring nothing, which
   is the fault this harness exists to catch, one level up. So every fail-case
   now runs the gate on the UNMUTATED tree first and reports `UNJUDGEABLE`
   rather than a pass. Verified by writing exactly that case and watching it
   refuse.
   *(gate: `scripts/gates-have-teeth.sh`, 9 cases: five real faults, two
   non-faults, and two subjects taken away entirely. The non-faults are the
   ones worth keeping: prose that happens to contain digits is not a claim with
   an owner, and an uncommitted local edit is not a deploy that failed to
   arrive. A gate flagging either would be switched off inside a week.)*

   **`demo-bundle-current.sh` now HAS a case, and the delay is the record worth
   keeping.** This file used to say it deliberately had none, because the gate
   was red on a clean tree (the published demo was older than `apps/web`) and
   any case written against it would have measured nothing. The demo was
   refreshed on 2026-08-10, the gate went green, and the case became possible.
   The prediction held exactly: it was a deploy decision, not a gate decision.

   **What else it does not cover.** It cannot test itself. It proves each gate
   catches the faults named in it, not every fault of that kind.

9. **The repository that serves the domain is not behind the one that gets
   pushed to.** `origin` is a mirror and `upstream` is the live site, and a
   push to the mirror succeeds, reports nothing wrong and deploys nothing.

   This is not hypothetical and it is not rare. On 2026-08-10 it-rat.com was
   found **seven commits behind**: the scopyx room, the pass fixing seven
   drifted figures, this repository's own gate work, and a rebuilt demo. Every
   one had been merged and pushed. Several sessions in a row had believed they
   shipped.

   Two things made it invisible. A successful `git push` is not evidence of a
   deploy, and the tracked `CNAME` file says `it-rat.com` in BOTH repositories,
   so reading it is what convinced a session that the mirror was live. A
   `CNAME` in a tree is a request; the Pages API says who was granted it.
   *(gate: `scripts/deploy-target-current.sh`, three checks: the `upstream`
   remote exists and points at the live repository, the live repository is not
   behind the mirror, and the repository this all calls "live" really holds the
   domain per the API rather than per the file. It runs in the Pages workflow
   too, where only the second check applies, because a CI clone has no
   `upstream`. It cannot run inside the LIVE repository's own workflow and mean
   anything: that workflow only runs when a push arrives, and the fault is a
   push that never arrives.)*

## Decisions that have no gate yet

**Held by this file alone: invariants 4 and 6.** Invariant 9 arrived with its gate on the day the fault was found, which is the standing rule working rather than being quoted. Invariant 2 is half held, and invariant 3 is now half held too: the manifest is enforced, the truth of what it records is not.

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
invariant 4's status sentences, and invariant 6. Invariant 3's numbers now have
owners; what still needs a person is running the five commands `numbers.json`
names and writing the dates back.

**Invariant 5 has never had the check this file claimed for it.** The line here
said "a wordlist grep across HTML, alt text and filenames" and no such script
exists; it was looked for on 2026-08-03 and is not in `scripts/`. That was
worth more than the missing grep: a sentence describing a check nobody wrote
reads as a check somebody is running, which is exactly how the rule then went
unnoticed for a fortnight. The invariant is now held by this file and by
`STACK` being the only thing the rail, the walk and the palette read from, so
a side project cannot get into them by being added to a list.

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
