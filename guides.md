<!-- https://it-rat.com/guides.html -->

# Guides index

> Six guides on running AI agents in production: runtime governance, LLM cost control, agent security, MCP, identity, and observability.

Six guides about the practice rather than about our tools: what it means to govern an agent while it is running, how to manage spend that nobody provisions, how to secure a fleet that holds credentials and calls tools, where observability stops being enough, and what changes when tools arrive over a protocol. Each one names the open-source tool that does the job, and none of them needs you to buy anything to be useful.

*the umbrella*

## AI agent governance, and what it means at runtime

Governance is the set of controls that decide what an agent may do while it is doing it. The seven questions a fleet has to answer, the five decisions every governed team ends up making, and the order to adopt them in.

*the money*

## FinOps for AI: managing spend that creates itself

Cloud FinOps assumes somebody provisioned the thing. Agent spend appears when an agent decides to try again. What breaks, what to instrument first, and how to report it in a format finance already reads.

*the defensive half*

## AI agent security: an old discipline with a new blast radius

The damage does not arrive as a sentence, it arrives as a tool call. Eight failure modes a fleet actually hits, the control that answers each, and what to rehearse in CI so a broken guardrail fails a build rather than an incident review.

*the comparison*

## AI observability and governance are not rivals

One explains what happened, the other decides what may happen. The same incident seen by each, why governance without observability is opaque, and the single integration decision that makes them compose: one run id.

*the newest surface*

## MCP security: your tools are now a fetch, not a build

A tool used to be code you shipped. Over the Model Context Protocol it is a description you fetched, from a server that can change it after you approved it. Six failure modes, and the control that answers each.

*the join key*

## Agent identity and authentication: how an agent proves who it is

A static key answers one question, badly. What an identity has to be instead, nameable, attributable, attestable and revocable, plus delegation chains, when to demand a signature per action, and how to evaluate anything in this space.

## Every control in the guides has an open implementation.

Seven Apache-2.0 services cover the planes the guides describe, and they run on infrastructure you own. [Walk the stack](https://it-rat.com/index.html#stack), or [start the live services locally in one command](https://it-rat.com/services/platform.html#run) and watch the money plane light up. Unfamiliar term? The [glossary](https://it-rat.com/glossary.html) defines the vocabulary these guides use.
