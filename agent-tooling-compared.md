<!-- https://it-rat.com/agent-tooling-compared.html -->

# Three shapes of agent tooling

> Three shapes of agent tooling exist and two of them cannot stop anything. What each is for, and twelve differences you can go and check for yourself.

Three shapes of tooling exist today, and a team evaluating them usually compares one against another without noticing that two of the three answer only the first question: what did the agent do. The third can act, on the condition that the agent moves onto its platform first. Nobody in this list stands in front of an agent that stays where it is and answers before the call, which is the question that shows up on an invoice, in an incident review, and in front of an auditor.

## Watch it happen.

The same call, sent twice: once through a fleet that only watches, once through a fleet that can also refuse. Pick what the agent is trying to do and see where each one ends up.

**The tap is the whole argument.** In both fleets a copy of the event goes sideways into the dashboard, and in both fleets it arrives after the thing already happened. The only difference is whether anything stood on the wire itself with the authority to stop it.

## What is actually on the market.

Named products change monthly. These shapes do not, and every tool a team is likely to already run falls into one of them.

***A**framework-native tracing*

### Deep inside the chain you wrote

Sold by the company behind an agent framework, and genuinely framework-agnostic: the SDKs cover the other frameworks and the model providers directly. Traces every step, captures prompts and responses, counts tokens and latency, runs evaluation suites online and offline, versions prompts, raises alerts, and clusters recurring failures into a root cause. Commercial, hosted by the vendor, with self-hosting on the enterprise tier only.

**Best at:** why a chain produced a bad answer, and whether a model upgrade changed behaviour.

**Says of itself:** observability and evaluation. It does not enforce or block anything at runtime.

***B**open observability, self-hosted*

### The same job, on your own metal

An MIT-licensed core you run yourself, with its own SDKs for the common frameworks and an OpenTelemetry path for anything that already emits spans, plus prompt management, model-as-judge evaluation and per-model cost accounting. The whole observability surface is free; what a commercial key unlocks is the administration around it, which is worth noticing: role permissions, retention policies, audit logs, data masking, directory sync.

**Best at:** the same as A, without sending prompts and completions to somebody else's cloud.

**Says of itself:** the run-time measures belong to separate guardrail libraries; its own job is judging afterwards whether they worked.

***C**a vendor's hosted control plane*

### One pane over the agents that run on it

The large-vendor answer: a hosted console with a catalog, a gateway to models and tools, policy and lifecycle management. It no longer covers only agents built in its own builder, and this is the part most comparisons get wrong: agents written in other frameworks can be imported. What they cannot do is stay where they were. An imported agent is deployed onto the vendor's own infrastructure in order to be governed there.

**Best at:** assembling agents quickly from a catalog, with support and a contract behind it.

**The entry:** tiered plans with a monthly floor and capacity ceilings above it, the lowest one in the hundreds per month and the next one an order of magnitude higher.

*what is left over*

### Planes that stand in the path and answer before the action

A gateway that gives every run a budget and answers 402 the moment it is crossed. A policy plane the agent asks before acting, which can hold the expensive one for a person. An egress plane that decides the destination before anything leaves the machine. An identity graph that knows which human a key ultimately belongs to. A record built so that somebody who does not trust you can still check it is complete. None of that is a view of the past. Each one is a decision that either happened or did not.

**Not best at:** explaining why the model wanted to do it. That is what A and B are for, and this stack exports into them rather than competing.

## Twelve differences, and how to check each one.

A comparison you cannot verify is an advertisement. Every claim below says what makes it true and where to go and look, because the only durable advantage in this market is being the one whose claims survive being checked. The first six are visible on a single request. The second six are the ones that actually decide whether a regulated organisation can buy anything at all.

### It answers before the call, not after it

The gateway prices every call against the run's budget and, on the one that would cross it, replies 402 with a stable error and never forwards the request to the provider. The policy plane answers allow, deny or hold before the action, and never performs the action itself. Neither of those is a notification.

### The agent stays where it is, and does not have to be declared at all

Integration is one base URL. Nothing is rewritten, nothing is redeployed, no SDK enters the agent. Underneath, a kernel-level sensor reads real outbound connections, so an agent nobody registered anywhere still appears, along with the model providers it is quietly reaching.

### The record answers to somebody who does not trust you

Every query comes back with a completeness proof: a short receipt, checkable on its own, that the rows shown are all the rows matching the question. The verifier that checks it carries zero dependencies, so an auditor can read the whole of it before believing any of it.

### The guardrails are themselves fired, in CI, before release

Adversarial scenarios run against a real gateway with a fake provider behind it. Burn the budget and require the 402. Ask for a forbidden tool and require the 403. Present a forged delegation chain and require it to be rejected. The exit codes differ on purpose, so the pipeline can tell a genuine hole in the defence from a broken test rig.

### Governance is not the part you pay for

Thirteen repositories, Apache-2.0 throughout, the console included. Nothing in the governance layer sits behind a licence key, a seat count or a tier.

### An alert is a coordinate, and a session is not an authority

The mail that wakes somebody at night carries one link into a view, and never a button that acts. A link that acts is a permission held by everyone who received or forwarded the mail, and security gateways follow links before a human reads the sentence next to them. In the console, the privileged actions each require a fresh passkey assertion bound to that action and its arguments, rather than to whoever is signed in.

### Post-quantum sits inside the agent loop, and it has legal dates attached

Every key, certificate and algorithm actually running is inventoried, graded for quantum risk and emitted as a CBOM in the CycloneDX format, scored against the published CNSA and NCSC timelines: new systems by 2027, legacy migration by 2030, everything by 2035. The cryptography agents themselves use is inventoried too, which is the part the established crypto-inventory vendors do not reach, because their products were designed before agents existed.

### A person can be erased without breaking the audit trail

Every payload is encrypted under its own key, so erasing a person means destroying their keys. The content becomes unrecoverable, every earlier proof still verifies, and the record itself carries the fact that an erasure happened. Nothing is re-encrypted afterwards, and records written later are reached by the same erasure.

### A refusal is a pure function, so an auditor can rerun it

No model anywhere in the decision path. Given the same policy set and the same request, the answer is always the same, which means a refusal from six months ago can be reproduced today in front of somebody who wants to see it. The policy primitives are deliberately dull: deny a tool, deny an unattested agent, cap the number of steps, restrict the destinations, require a human above a sum.

### The kill switch does not run through the thing it kills

The out-of-band control is a phone and a watch. The signing key is generated inside the device's secure element and never leaves it, not even to the app. A kill is signed on the device and the control plane verifies that signature before it acts, so the stop still works when the agent's own host is precisely what is misbehaving or compromised.

### Changing a limit goes through code review, like changing a firewall rule

Budgets, agent passports and policies are ordinary Terraform resources: in version control, reviewed in a pull request the way an IAM policy or a security group is, planned before they apply, and diffed when somebody has changed them outside the process.

### The money is counted per resolved case, not per token

Token spend says how much was burned. It does not say whether the burning bought anything. The quality plane joins the cost trace to your own outcome tags and returns the price of a resolved case beside the price of an escalated one and an abandoned one, which is the same arithmetic a finance function already applies to everything else it funds.

### And what it costs, since none of this is free

Standing in the request path buys the refusal and charges latency for it, on every call, including the overwhelming majority that were always going to be fine. It also forces a decision nobody enjoys making: what happens when the control plane itself is unreachable, fail-open or fail-closed. Observability never has to answer that question, because nothing waits on it. **That is the actual trade, and a vendor who will not name it has not thought about it.**

## The half they do not cover, by service.

A budget per run, and a 402 the moment it is crossed. A dashboard shows you the spend; this refuses it.

Allow, deny, or hold for a human, asked before the action, with a hard ceiling that outranks approvals.

Every destination decided before anything leaves. Tracing sees the request; this sees whether it should exist.

One identity graph for humans, keys, service accounts and agents, so "who did this" ends at a person.

A record nobody can quietly change or shorten, where every answer carries a proof that it is complete.

The one place we overlap on purpose: quality as a denominator, cost per correctly resolved case rather than per token.

Fire drills for the guardrails themselves, asserting the 402 and the 403 in CI. No shape above has an analogue.

Decides what is worth waking a human for tonight, and mails it with one link. A dashboard waits to be opened.

All of it is Apache-2.0 and runs on infrastructure you own, and the governance planes export over OTLP into whatever tracing backend you already have. **Governance data belongs in your observability stack. The enforcement decision does not belong in a dashboard.**

## What people ask when they have already bought one

**Q: Do we have to drop our tracing to use this?**
No, and we would advise against it. Tracing answers a question this stack does not: why the model wanted to do the thing. Keep it, put the gateway in front of the model calls in shadow mode for a week, then turn on caps where the outliers are.

**Q: Our observability tool already tracks cost. Is that not the same?**
Cost tracking and a cost control are different products. One tells you a run spent the money. The other answers 402 and the run does not spend it. One arrives with the invoice, the other instead of it.

**Q: Why describe products by shape instead of naming them?**
Because a named comparison is wrong the week after a vendor ships a feature, and a reader who already runs one of these can map the shape to their tool in a second. The shapes are also more useful: they say what a category of tool can and cannot do architecturally, which is the part that does not change with a release note.

**Q: Could one of them add enforcement later?**
They could, and the sensible assumption is that somebody will. It is a different architecture though: standing in the path means owning an availability decision, fail-open or fail-closed, on every call. That is a heavier commitment than receiving a copy of a trace, and it is why the categories have stayed separate so far.
