<!-- https://it-rat.com/guides.html -->

# Guides index

> Thirty-one guides: seven on the field of AI agent governance, and twenty-four on running this stack, from a first alert to what changed in October.

Thirty-one guides, grouped by what you came for: where to start, how the stack is secured, the practice of running agents, each service in depth, and what changed in October. The service pages stay short; the full story lives here.

## Start here

*start here*

### [From zero to your first alert](https://it-rat.com/first-alert.html)

One command on a box you own, one agent pointed at it, one address to write to, and then make it fire on purpose. Four steps, what each is for, and where each one goes wrong.

*the honest half*

### [What is proven here, and what is not](https://it-rat.com/what-is-proven.html)

What a measurement on this stack actually established, the limit published beside each one, three conclusions we withdrew, and the list of what nobody has established yet.

*the operational half*

### [What runs where, and what it costs](https://it-rat.com/what-runs-where.html)

One machine, a five-node cluster, or a hyperscaler. Six clusters measured across three clouds and then destroyed: how each performed, the storage line that differs by a factor of 108, and a published conclusion we had to withdraw.

*the home page, in full*

### [The stack in depth](https://it-rat.com/stack-guide.html)

Everything the home page leaves out: how its eight figures were produced and what the runs caught, how the stack wires, and why all of it is open.

## Security

*the decisions*

### [Security by design: eight decisions, each proven by breaking it](https://it-rat.com/security-by-design.html)

Why every control sits where an agent cannot talk to it.

*the defensive half*

### [AI agent security: an old discipline with a new blast radius](https://it-rat.com/ai-agent-security.html)

The damage does not arrive as a sentence, it arrives as a tool call. Eight failure modes a fleet actually hits, the control that answers each, and what to rehearse in CI so a broken guardrail fails a build rather than an incident review.

*the newest surface*

### [MCP security: your tools are now a fetch, not a build](https://it-rat.com/mcp-security.html)

A tool used to be code you shipped. Over the Model Context Protocol it is a description you fetched, from a server that can change it after you approved it. Six failure modes, and the control that answers each.

*the join key*

### [Agent identity and authentication: how an agent proves who it is](https://it-rat.com/agent-identity.html)

A static key answers one question, badly. What an identity has to be instead, nameable, attributable, attestable and revocable, plus delegation chains, when to demand a signature per action, and how to evaluate anything in this space.

## The practice

*the umbrella*

### [AI agent governance, and what it means at runtime](https://it-rat.com/ai-agent-governance.html)

Governance is the set of controls that decide what an agent may do while it is doing it. Every question a fleet has to answer at runtime with the tool that owns it, the five decisions every governed team ends up making, and the order to adopt them in.

*the money*

### [FinOps for AI: managing spend that creates itself](https://it-rat.com/finops-for-ai.html)

Cloud FinOps assumes somebody provisioned the thing. Agent spend appears when an agent decides to try again. What breaks, what to instrument first, and how to report it in a format finance already reads.

*the record and the control*

### [The record and the control are different jobs](https://it-rat.com/ai-observability-vs-governance.html)

One explains what happened, the other decides what may happen. The same incident seen by each, why the control alone is opaque, and the single integration decision that makes them meet: one run id.

*the controls*

### [What the stack refuses before a call, and how to check it](https://it-rat.com/agent-tooling-compared.html)

Twelve controls that answer before a call: what each one does, what it does not do yet, and how to check it, one at a time.

*the second site*

### [Two sites, one control plane, no VPN](https://it-rat.com/two-sites.html)

A hub that holds the control plane and the policy, and a gateway at every site that reaches it over outbound HTTPS through one narrow door. One script on the hub, one command per site, four variables at the site, and what the runs showed.

*the walk-through*

### [One incident, end to end: a runaway agent through every plane](https://it-rat.com/one-incident-end-to-end.html)

One ordinary failure, an agent stuck in a retry loop, followed from its first over-budget call to the evidence an auditor reads months later. Eight steps, the event each one writes, and what only becomes visible in that order.

## Each service in depth

- [Genaryx](https://it-rat.com/genaryx-guide.html), control room

- [TokenFuse](https://it-rat.com/tokenfuse-guide.html), money

- [CostCrew](https://it-rat.com/costcrew-guide.html), finops

- [TokenFuse Pocket](https://it-rat.com/pocket-guide.html), out of band · not wired in yet

- [Wardryx](https://it-rat.com/wardryx-guide.html), policy

- [Idryx](https://it-rat.com/idryx-guide.html), access

- [Scopyx](https://it-rat.com/scopyx-guide.html), egress

- [Vouchryx](https://it-rat.com/vouchryx-guide.html), delegation

- [Qryx](https://it-rat.com/qryx-guide.html), crypto

- [Verdryx](https://it-rat.com/verdryx-guide.html), quality

- [Typryx](https://it-rat.com/typryx-guide.html), typed answers · optional add-on

- [Mockryx](https://it-rat.com/mockryx-guide.html), pre-prod

- [Trailryx](https://it-rat.com/trailryx-guide.html), the record

- [Heraldyx](https://it-rat.com/heraldyx-guide.html), alerts

- [Engram](https://it-rat.com/engram-guide.html), memory

- [Platform](https://it-rat.com/platform-guide.html), contract

## What changed

*what changed*

### [What changed in the stack, 1 to 15 October 2026](https://it-rat.com/changes-2026-10.html)

What changed across the stack between 1 and 15 October 2026, in one place.

## Every control in the guides has an open implementation.

Every control the guides describe has an Apache-2.0 service behind it, and they run on infrastructure you own. [Walk the stack](https://it-rat.com/index.html#stack), or [start the live services locally in one command](https://it-rat.com/services/platform.html#run) and watch the money plane light up. Unfamiliar term? The [glossary](https://it-rat.com/glossary.html) defines the vocabulary these guides use.
