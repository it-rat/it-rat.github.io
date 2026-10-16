<!-- https://it-rat.com/index.html -->

# IT-RAT, open-source governance for AI agents

> Open-source runtime governance for AI agents: budgets, policy, memory, identity, cryptography, quality and pre-production drills. Apache-2.0, self-hosted.

A new hire gets a contract, a budget, a badge and a manager. An AI agent usually gets an admin key and a prayer. We build the open-source governance that closes that gap: services that meter, police, remember, identify, audit and rehearse your agents at runtime, each installed on its own rather than adopted whole, and proven on real infrastructure before anyone saw a slide about it. Around them sit the parts a fleet needs and nobody builds first: a decision before an agent reaches the web, a delegation it can prove and a person can end, alerts by mail, a record nobody can quietly shorten, and a kill switch out of band, built and not yet wired into a running stack.

## Validated on real infrastructure. Then torn down.

Before this site existed, the stack ran on disposable boxes across Hetzner, AWS and GCP with a real Anthropic key.

## One corridor, every door on it.

Every service has its own room: what it does, how it behaves over a live time window, and where it sits in the wiring. Every room is Apache-2.0, with nothing behind a licence. Genaryx, first on the rail, is the control room, and it runs on your own infrastructure like the rest. After it come the planes themselves, in the order a fleet tends to adopt them: money and the crew that reads the bill, then policy, access, egress and delegation, then the planes that watch rather than decide. Platform, last, is the contract they all share. Walk it with the arrows on each page, scroll this rail sideways, or hit `⌘K` and type two letters.

### Genaryx

The control room over all of it, in your browser on your own box.

### TokenFuse

Runtime spend control and the in-line kill switch.

### CostCrew

A crew of agents takes your cloud bill apart, a person signs it off.

### TokenFuse Pocket

The kill switch on a device the agent's host never touches.

### Wardryx

Policy decisions with a human in the loop.

### Idryx

One identity graph for humans, keys and agents.

### Scopyx

Agents reach the web through a decision, not around one.

### Vouchryx

A delegation an agent can prove it holds, and a person can end.

### Qryx

Cryptography inventory and post-quantum risk.

### Verdryx

Cost per correctly resolved case, not per token.

### Typryx

A typed answer with a probability, never a guess.

### Mockryx

Fire drills that prove guardrails hold.

### Trailryx

A record nobody can quietly change or shorten.

### Heraldyx

The box writes to you, with a link and never a button.

### Engram

The SQLite of agent memory.

### Platform

Agent Passport, shared contract, Terraform.

## One passport, one event bus, four planes of control.

Every request carries an Agent Passport. An agent has two ways out, not one: a call to a model, and a fetch of something on the internet, and each has a gate standing in it. Above them sit the two questions a gate asks, and they are asked differently. Policy answers per action. Delegation deliberately does not: it publishes keys and a revocation list that enforcement points poll, and it refuses to offer introspection precisely so that it never becomes a service every gate has to reach on every call. Below, memory, identity, crypto, quality, rehearsal and alerting read the same NDJSON stream off-path. Nothing here is a dashboard after the fact: the gates enforce in-line, in seconds. The drawing stops at the planes a request actually touches, so three that matter are named on the rail rather than here: Trailryx seals the bus into a record, Pocket, not yet wired into a running stack, is meant to hold the switch on a device this box never touches, and CostCrew's crew are agents the same gates govern like any other.

New to this? [Seven guides](https://it-rat.com/guides.html) explain the field rather than the products: [agent governance](https://it-rat.com/ai-agent-governance.html), [FinOps for AI](https://it-rat.com/finops-for-ai.html), [agent security](https://it-rat.com/ai-agent-security.html), [observability versus governance](https://it-rat.com/ai-observability-vs-governance.html), [MCP security](https://it-rat.com/mcp-security.html), [agent identity](https://it-rat.com/agent-identity.html), and [the shapes of the tooling itself](https://it-rat.com/agent-tooling-compared.html). Four more cover this stack in practice: [a first alert](https://it-rat.com/first-alert.html), [one incident end to end](https://it-rat.com/one-incident-end-to-end.html), [what runs where and what it costs](https://it-rat.com/what-runs-where.html), and [what is proven and what is not](https://it-rat.com/what-is-proven.html).

## Governance you cannot read is governance you have to trust.

Every part of this stack is Apache-2.0, the console included, and that is not a marketing posture. These services decide what an AI agent may do: what it may spend, which tools it may call, whose authority it acts under, and what evidence exists afterwards. A control whose entire job is to remove the need for trust cannot itself be a thing you take on trust.

**Q: The longer answer**

Closed governance software asks you to believe a claim precisely where you came to stop believing claims. So the source is readable, the validation records name their own bugs, and a conclusion we got wrong is corrected in public next to the one it replaces. Everything on this site runs, which is a different claim from everything on this site is described.

And we are downstream of a great deal of work nobody billed us for. This stack stands on k3s, Calico, Longhorn, Postgres, SQLite and three language ecosystems, none of which sent an invoice. Publishing ours under Apache-2.0 is not charity and not a growth tactic; it is the ordinary way to be a participant in that rather than only a consumer of it.

Take it, run it, fork it, and never speak to us. That is the point of publishing it.

## Two of us, plus the agents.

This stack is written by two people who spend their working lives in exactly the two rooms it lives in: cloud security and cloud money.

### Yurii Kostiuk

IAM solutions architect and cloud security consultant: Zero Trust, identity, DevSecOps and platform resilience across AWS and GCP. The stack's view that an agent deserves a badge, a budget and a boundary comes straight from this desk.

### Tania Fedirko

Cloud financial governance, cost optimization and multi-cloud strategy. Tania aligns engineering, finance and business, and applies FinOps practice to LLM APIs and token-based usage: the reason this stack meters money before it meters anything else.

## The questions that come before the demo

**Q: What is AI agent governance?**
Governance is the set of controls that decide what an agent is allowed to do while it is running: a budget it cannot exceed, a policy it must ask before acting, an identity that records who it acts for, a memory that can say where a belief came from, and evidence an auditor can verify afterwards.

**Q: Is the stack open source?**
Yes, all of it. Apache-2.0, source on [GitHub](https://github.com/TAIPANBOX): TokenFuse, Wardryx, Idryx, Engram, Qryx, Verdryx and Mockryx, the shared [contract](https://it-rat.com/services/platform.html) under them, and [Genaryx](https://it-rat.com/genaryx.html), the console over all of them.

**Q: Do you host any of this, or see our data?**
No. Every plane runs on infrastructure you own: AWS, GCP, Hetzner, any cloud or on-prem, and on-prem is measured rather than merely allowed: on 2026-09-17 the whole stack ran on a small box behind a home router, governing agents in AWS and GCP at the same time. We never run your control plane, hold your keys or store your traffic, so there is nothing on our side to subpoena or breach.

**Q: What does it cost to try?**
Nothing, and no account. Every part of it is Apache-2.0, the console included. One command builds and starts the long-running services locally: see [run the live stack locally](https://it-rat.com/services/platform.html#run). The four that are libraries and CLIs each carry a one-line try-it on their own page.
