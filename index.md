<!-- https://it-rat.com/index.html -->

# IT-RAT, open-source governance for AI agents

> Open-source runtime governance for AI agents: budgets, policy, memory, identity, cryptography, quality and pre-production drills. Apache-2.0, self-hosted.

A new hire gets a contract, a budget, a badge and a manager. An AI agent usually gets an admin key and a prayer. We build the open-source governance that closes that gap: services that meter, police, remember, identify, audit and rehearse your agents at runtime.

## Validated on real infrastructure. Then torn down.

Before this site existed, the stack ran on disposable boxes across Hetzner, AWS and GCP with a real Anthropic key. Then the same stack came up again as a five-node Kubernetes cluster on each of those three clouds.

## One corridor, every door on it.

Every service has its own room: what it does, how it behaves over a live time window, and where it sits in the wiring. Every room is Apache-2.0, with nothing behind a licence. Genaryx, first on the rail, is the control room, and it runs on your own infrastructure like the rest.

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

Every request carries an Agent Passport. An agent has two ways out, not one: a call to a model, and a fetch of something on the internet, and each has a gate standing in it. Below, memory, identity, crypto, quality, rehearsal and alerting read the same NDJSON stream off-path. Nothing here is a dashboard after the fact: the gates enforce in-line, in seconds.

New to this? [The guides](https://it-rat.com/guides.html) are grouped by what you came for: [where to start](https://it-rat.com/first-alert.html), [how the stack is secured](https://it-rat.com/security-by-design.html), the practice of running agents, from [governance](https://it-rat.com/ai-agent-governance.html) to [FinOps for AI](https://it-rat.com/finops-for-ai.html), each service in depth, and [what changed in October](https://it-rat.com/changes-2026-10.html). Every room above links its own guide, and [the stack in depth](https://it-rat.com/stack-guide.html) holds the rest of this page.

## Governance you cannot read is governance you have to trust.

Every part of this stack is Apache-2.0, the console included, and that is not a marketing posture. These services decide what an AI agent may do: what it may spend, which tools it may call, whose authority it acts under, and what evidence exists afterwards. A control whose entire job is to remove the need for trust cannot itself be a thing you take on trust.

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
Yes, all of it. Apache-2.0, source on [GitHub](https://github.com/TAIPANBOX): TokenFuse, CostCrew, TokenFuse Pocket, Wardryx, Idryx, Scopyx, Vouchryx, Qryx, Verdryx, Typryx, Mockryx, Trailryx, Heraldyx and Engram, the shared [contract](https://it-rat.com/services/platform.html) under them, and [Genaryx](https://it-rat.com/genaryx.html), the console over all of them.

**Q: Do you host any of this, or see our data?**
No. Every plane runs on infrastructure you own: AWS, GCP, Hetzner, any cloud or on-prem, and on-prem is measured rather than merely allowed: on 2026-09-17 the whole stack ran on a small box behind a home router, governing agents in AWS and GCP at the same time. We never run your control plane, hold your keys or store your traffic, so there is nothing on our side to subpoena or breach.

**Q: What does it cost to try?**
Nothing, and no account. Every part of it is Apache-2.0, the console included. One command builds and starts the long-running services locally: see [run the live stack locally](https://it-rat.com/services/platform.html#run). The four that are libraries and CLIs each carry a one-line try-it on their own page.
