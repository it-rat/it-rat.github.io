<!-- https://it-rat.com/index.html -->

# IT-RAT, the agent-governance stack

> Open-source runtime governance for AI agents: budgets, policy, memory, identity, crypto and drills. Cloud security, IAM and FinOps consulting for AWS and GCP.

A new hire gets a contract, a budget, a badge and a manager. An AI agent usually gets an admin key and a prayer. We build the open-source stack that closes that gap: seven services that meter, police, remember, identify, audit and rehearse your agents at runtime, proven on real infrastructure before anyone saw a slide about it.

## One corridor, every door on it.

Every service has its own room: what it does, how it behaves over a live time window, and where it sits in the wiring. Eight of these doors open on their own. Genaryx, first on the rail, is the control room over all of them, deployed with us on your own infrastructure. Walk it with the arrows on each page, scroll this rail sideways, or hit `⌘K` and type two letters.

### Genaryx

The control room over all of it, in your browser on your own box.

### Engram

The SQLite of agent memory.

### TokenFuse

Runtime spend control and the in-line kill switch.

### Wardryx

Policy decisions with a human in the loop.

### Idryx

One identity graph for humans, keys and agents.

### Qryx

Cryptography inventory and post-quantum risk.

### Verdryx

Cost per correctly resolved case, not per token.

### Mockryx

Fire drills that prove guardrails hold.

### Platform

Agent Passport, shared contract, Terraform.

New to this? [Five guides](https://it-rat.com/guides.html) explain the field rather than the products: [agent governance](https://it-rat.com/ai-agent-governance.html), [FinOps for AI](https://it-rat.com/finops-for-ai.html), [agent security](https://it-rat.com/ai-agent-security.html), [observability versus governance](https://it-rat.com/ai-observability-vs-governance.html), and [MCP security](https://it-rat.com/mcp-security.html).

## One passport, one event bus, four planes of control.

Every request carries an Agent Passport. Money and policy sit in the request path; memory, identity, crypto, quality and rehearsal watch the same NDJSON event stream off-path. Nothing here is a dashboard after the fact: the gateway enforces in-line, in seconds.

## Validated on real infrastructure. Then torn down.

Before this site existed, the stack ran on disposable boxes across Hetzner, AWS and GCP with a real Anthropic key: four physical machines holding one budget over a real network, a partition with no split-brain, and a kill switch cutting real spend.

**Q: How these numbers were produced**

Every number above came from a run against real infrastructure, not a benchmark harness written to flatter us. The boxes were disposable, the model calls were real and paid for, and nothing from the campaign is still standing: the machines were deleted, the key revoked.

**Money.** Four nodes across two datacenters held one budget through a leader kill and a real network partition: the majority kept serving, the isolated node could not overspend, and the state stayed byte-identical on every node. Under 500 concurrent agents against a fixed budget, the ledger admitted exactly what the budget allowed and no more.

**Policy.** An enriched multi-agent campaign produced 176 real enforcement decisions with differentiated rights: an analyst agent refused a wire transfer that a treasury agent was allowed, an unattested agent refused until it attested, and shell execution refused for everyone regardless of identity. Fired as a 34-request concurrent burst, the decision point still sorted them exactly right.

**The rest.** Qryx scanned 25,586 real Linux binaries, stripped, static and truncated among them, without a crash. Engram's reflection ran against real Claude output three times on three topologies with zero contradictions. Verdryx priced a correctly resolved case at $0.00042. Mockryx fired three hostile drills against a real gateway twice, with zero gaps and zero real spend, because the provider behind that gateway was fake while every guardrail in front of it was live.

**And what it caught.** Live testing found real bugs, which is the point of doing it. Two of them, both in the policy plane, were invisible to sequential test traffic: a request that merely declared a forbidden tool without calling it slipped past a deny rule, and a decision cache keyed without the attestation method let an unattested agent inherit a recently attested allow inside the cache window. Only the 34-agent concurrent burst surfaced the second one. Both were fixed, covered by regression tests, and re-verified live before any number here was taken as final.

The full ledger, every number and every bug, is public in each repository's `VALIDATION.md`. A validation write-up with no bug list is marketing.

You do not have to take our word for it: [run the stack's live services locally](https://it-rat.com/services/platform.html#run) in one command and watch the money plane light up. The four that are not servers, Engram, Qryx, Verdryx and Mockryx, each carry a one-line try-it on their own page.

## Boutique by choice. Senior by default.

IT-RAT is a small cloud practice: Zero Trust and IAM architecture, FinOps that survives an auditor, and AI adoption that doesn't end up on the front page for the wrong reason. The stack is how we work in the open; an engagement is how it lands inside your perimeter, with the people who wrote it.

**Q: Why we build in the open**

We deploy AI solutions with a clear-eyed view of where the field is going: agentic fleets, post-quantum crypto, FinOps for AI. We build there already, and everything on this site runs, which is a different claim from everything on this site is described.

That is also why the stack is open and the validation records name their own bugs. A consultancy that only shows you slides is asking you to take the judgment on trust. We would rather hand you the code, the numbers and the list of things that broke, and be judged on those.

An engagement is the same work, inside your perimeter, with your people, until they run it without us. We leave runbooks rather than a dependency, and everything we build is reproducible and explainable to an auditor, because eventually one will ask.

- **Cloud security & IAM.** Identity-first architecture on AWS and GCP: least privilege that people can actually live with.

- **FinOps for AI.** Budgets, showback and unit economics for LLM workloads, wired into the tooling your finance team already reads.

- **Agent governance.** Deploying this stack, Genaryx included, inside your perimeter: runtime enforcement, not another dashboard.

| Week 0 | A short, honest call. If we're not the right fit, we say so and point you somewhere better. |
|---|---|
| Weeks 1-2 | Assessment on your real estate: identities, spend paths, agent surfaces. No slideware. |
| Weeks 3+ | Architecture and hands-on build with your team. We leave runbooks, not lock-in. |
| Always | Everything reproducible, everything explainable to an auditor. |

## Two of us, plus the agents.

IT-RAT is built and run by two people who spend their working lives in exactly the two rooms this stack lives in: cloud security and cloud money.

### Yurii Kostiuk

IAM solutions architect and cloud security consultant: Zero Trust, identity, DevSecOps and platform resilience across AWS and GCP. The stack's view that an agent deserves a badge, a budget and a boundary comes straight from this desk.

### Tania Fedirko

FinOps expert in cloud financial governance, cost optimization and multi-cloud strategy. Tania aligns engineering, finance and business, and applies FinOps practice to LLM APIs and token-based usage: the reason this stack meters money before it meters anything else.

## The questions that come before the demo

**Q: What is AI agent governance?**
Governance is the set of controls that decide what an agent is allowed to do while it is running: a budget it cannot exceed, a policy it must ask before acting, an identity that records who it acts for, a memory that can say where a belief came from, and evidence an auditor can verify afterwards. Observability tells you what an agent did. Governance decides what it can do next. The two are not substitutes, and only one of them stops a runaway at 3am.

**Q: Is the stack open source?**
Seven services are Apache-2.0 and stay that way, source on [GitHub](https://github.com/TAIPANBOX): TokenFuse, Wardryx, Idryx, Engram, Qryx, Verdryx and Mockryx, plus the shared [contract](https://it-rat.com/services/platform.html) under them. [Genaryx](https://it-rat.com/enterprise.html), the console over all of them, is the one paid room, and it is deployed with us on your own infrastructure.

**Q: Do you host any of this, or see our data?**
No. Every plane runs on infrastructure you own: AWS, GCP, Hetzner, any cloud or on-prem. We never run your control plane, hold your keys or store your traffic, so there is nothing on our side to subpoena or breach.

**Q: What does it cost to try?**
The open services cost nothing and need no account. One command builds and starts the long-running ones locally: see [run the live stack locally](https://it-rat.com/services/platform.html#run). The four that are libraries and CLIs each carry a one-line try-it on their own page.

**Q: How does an engagement work?**
A short, honest call first; if we are not the right fit we say so. Then an assessment on your real estate, identities, spend paths and agent surfaces, and then hands-on build with your team until they run it without us. We leave runbooks rather than a dependency.
