<!-- https://it-rat.com/agent-tooling-compared.html -->

# Three shapes of agent tooling, and what each cannot do

> Three shapes of agent tooling exist and two of them cannot stop anything. What each is for, where each stops, and twelve differences you can go and check.

Three shapes of tooling exist today, and a team evaluating them usually compares one against another without noticing that two of the three answer only the first question: what did the agent do. The third can act, on the condition that the agent moves onto its platform first. Nobody in this list stands in front of an agent that stays where it is and answers before the call, which is the question that shows up on an invoice, in an incident review, and in front of an auditor.

Products are described by shape rather than by name on purpose. An archetype stays true when a vendor ships a feature next month, and a named comparison is wrong the moment they do. The three descriptions were read against the vendors' own current documentation and pricing on 10 August 2026.

## Watch it happen.

The page carries a diagram of one request, sent twice: once through a fleet that only watches, once through a fleet that can also refuse. In both fleets a copy of the event goes sideways into the dashboard, and in both fleets it arrives after the thing already happened. The only difference is whether anything stood on the wire itself with the authority to stop it.

With tracing only, the call always completes. Over budget, the money is gone before the chart exists. Deleting a bucket, the trace ends at the model's answer and the dashboard shows a normal-looking run. With a control plane in the path, the same call over budget gets a 402 and the provider never hears the request, and the destructive one is held for a person rather than refused outright or allowed outright.

## What is actually on the market.

Named products change monthly. These shapes do not, and every tool a team is likely to already run falls into one of them.

*A, framework-native tracing*

Sold by the company behind an agent framework, and genuinely framework-agnostic: the SDKs cover the other frameworks and the model providers directly. Traces every step, captures prompts and responses, counts tokens and latency, runs evaluation suites online and offline, versions prompts, raises alerts, and clusters recurring failures into a root cause. Commercial, hosted by the vendor, with self-hosting on the enterprise tier only.

**Best at:** why a chain produced a bad answer, and whether a model upgrade changed behaviour. **Says of itself:** observability and evaluation. It does not enforce or block anything at runtime.

*B, open observability, self-hosted*

An MIT-licensed core you run yourself, with its own SDKs for the common frameworks and an OpenTelemetry path for anything that already emits spans, plus prompt management, model-as-judge evaluation and per-model cost accounting. The whole observability surface is free; what a commercial key unlocks is the administration around it: role permissions, retention policies, audit logs, data masking, directory sync.

**Best at:** the same as A, without sending prompts and completions to somebody else's cloud. **Says of itself:** the run-time measures belong to separate guardrail libraries, and its own job is judging afterwards whether they worked.

*C, a vendor's hosted control plane*

The large-vendor answer: a hosted console with a catalog, a gateway to models and tools, policy and lifecycle management. It no longer covers only agents built in its own builder, and this is the part most comparisons get wrong: agents written in other frameworks can be imported. What they cannot do is stay where they were. An imported agent is deployed onto the vendor's own infrastructure in order to be governed there.

**Best at:** assembling agents quickly from a catalog, with support and a contract behind it. **The entry:** tiered plans with a monthly floor and capacity ceilings above it.

*what is left over*

Planes that stand in the path and answer before the action. A gateway that gives every run a budget and answers 402 the moment it is crossed. A policy plane the agent asks before acting, which can hold the expensive one for a person. An egress plane that decides the destination before anything leaves the machine. An identity graph that knows which human a key ultimately belongs to. A record built so that somebody who does not trust you can still check it is complete.

**Not best at:** explaining why the model wanted to do it. That is what A and B are for, and this stack exports into them rather than competing.

## Where each one stops.

|  | A, framework tracing | B, open observability | C, hosted control plane | This stack |
|---|---|---|---|---|
| Where it sits | Beside the app | Beside the app | Under the agent: it hosts it | In the request path |
| What comes out | A trace, a score, a chart | A trace, a score, a chart | A queue, a chart, a policy on its own platform | An action that did or did not occur |
| Can it stop a run | No, and it says so | No, and it says so | On the agents it hosts | Yes, at the budget or the policy |
| Whose agents it sees | Yours, if instrumented | Yours, if instrumented | Any, once imported and redeployed there | Anyone's, wherever they already run |
| What it can see | The model call | The model call | What crosses its own platform | Spend, destination, identity, approval |
| Who can verify the record | Your team, after sampling | Your team, after sampling | Your team, in their console | An outsider, from the record's own proofs |
| Where the data lives | Their cloud, yours on enterprise | Yours | Their cloud, with an on-prem option | Yours |
| Cost of entry | Per seat, plus usage | Free to self-host | A monthly floor, then capacity tiers | Clone the repository |

Read the third row first. A tool that cannot stop a run is telemetry, however good its dashboard is, and telemetry is priced and staffed differently from a control. Then read the sixth. Dev telemetry is sampled, editable and eventually dropped, because it was built for an engineer debugging on a Tuesday. Nobody designed it to be read by a regulator two years later.

## Twelve differences, and how to check each one.

A comparison you cannot verify is an advertisement. Every claim below says what makes it true and where to go and look. The first six are visible on a single request. The second six are the ones that actually decide whether a regulated organisation can buy anything at all.

**1. It answers before the call, not after it.** The gateway prices every call against the run's budget and, on the one that would cross it, replies 402 and never forwards the request to the provider. The policy plane answers allow, deny or hold before the action, and never performs the action itself. *Check it:* the refusal is five call sites in the gateway proxy, and a drill in CI asserts the exact status.

**2. The agent stays where it is, and does not have to be declared at all.** Integration is one base URL. Underneath, a kernel-level sensor reads real outbound connections, so an agent nobody registered anywhere still appears. *Check it:* the detectors are called shadow_ai, unmanaged_egress, undeclared_llm and unrouted_egress, and every one is deterministic. The agent that causes the incident is the one nobody wrote down.

**3. The record answers to somebody who does not trust you.** Every query comes back with a completeness proof: a short receipt, checkable on its own, that the rows shown are all the rows matching the question. *Check it:* the verifier's dependency list is empty in its manifest. Their record proves what it shows; this one proves that what it does not show is nothing.

**4. The guardrails are themselves fired, in CI, before release.** Adversarial scenarios run against a real gateway with a fake provider behind it: burn the budget and require the 402, ask for a forbidden tool and require the 403, present a forged delegation chain and require it to be rejected. *Check it:* a scenario has a required status field and it takes 402, 403 or 200, nothing vaguer. A guardrail nobody has ever fired is a comment with a name.

**5. Governance is not the part you pay for.** Thirteen repositories, Apache-2.0 throughout, the console included. *Check it:* open the licence file in any repository in the stack. The thing an auditor asks for is the thing the others charge for.

**6. An alert is a coordinate, and a session is not an authority.** The mail carries one link into a view and never a button that acts, because a link that acts is a permission held by everyone who received or forwarded the mail. The privileged actions in the console each require a fresh passkey assertion bound to that action. *Check it:* the ceremony writes the signature algorithm and the credential fingerprint into the record beside the action.

**7. Post-quantum sits inside the agent loop, and it has legal dates attached.** Every key, certificate and algorithm actually running is inventoried, graded for quantum risk and emitted as a CBOM in CycloneDX, scored against the CNSA and NCSC timelines. The cryptography agents themselves use is inventoried too. *Check it:* the output formats are standards rather than ours. A migration with a legal deadline begins with an inventory, and the inventory is the part nobody has.

**8. A person can be erased without breaking the audit trail.** Every payload is encrypted under its own key, so erasing a person means destroying their keys. The content becomes unrecoverable, every earlier proof still verifies, and the record carries the fact that an erasure happened. *Check it:* erasure is its own component, and the property to test is that the proofs still verify after the keys are destroyed.

**9. A refusal is a pure function, so an auditor can rerun it.** No model anywhere in the decision path, so the same policy and the same request always return the same answer, and a refusal from six months ago can be reproduced today. *Check it:* the decision function is documented as pure, and the identity detectors follow the same rule.

**10. The kill switch does not run through the thing it kills.** The out-of-band control is a phone and a watch, with the signing key generated inside the device's secure element. *Check it honestly:* this one is built and not yet wired into a running stack, and its own page says so. Judge it as a design decision, not as a shipped feature.

**11. Changing a limit goes through code review.** Budgets, agent passports and policies are ordinary Terraform resources: reviewed in a pull request, planned before they apply, diffed when somebody changed them outside the process. *Check it:* the provider is published on the public Terraform registry.

**12. The money is counted per resolved case, not per token.** The quality plane joins the cost trace to your own outcome tags and returns the price of a resolved case beside an escalated and an abandoned one. *Check it:* the computation is a small named script over a flat export of outcome and cost.

### And what it costs, since none of this is free

Standing in the request path buys the refusal and charges latency for it, on every call, including the overwhelming majority that were always going to be fine. It also forces a decision nobody enjoys making: what happens when the control plane itself is unreachable, fail-open or fail-closed. Observability never has to answer that question, because nothing waits on it. That is the actual trade, and a vendor who will not name it has not thought about it.

## Where they are plainly better than us.

- **Prompt iteration.** Playgrounds, prompt versioning, side-by-side runs on a dataset. That is the core loop of A and B, refined for years, and we do not have it.
- **Evaluation tooling.** Our quality plane is deliberately narrower: cost per correctly resolved case, scored on your own outcome tags. For general offline evaluation suites, theirs are more complete.
- **Assembling agents at speed.** Shape C sells a catalog, support and a contract. We are not an agent-building platform.
- **Open source is not the differentiator against B.** Its core is MIT and self-hosts for free. What is worth saying out loud is which part it charges for: not the observability, but the governance around it.
- **Maturity.** All three are established products with real deployments behind them.

If a team runs B today, the sensible move is to keep it and put a gateway in front of the model calls in shadow mode. The traces keep working and gain a spend line and a verdict per run.

## The half they do not cover, by service.

- **TokenFuse.** A budget per run, and a 402 the moment it is crossed.
- **Wardryx.** Allow, deny, or hold for a human, asked before the action.
- **Scopyx.** Every destination decided before anything leaves.
- **Idryx.** One identity graph for humans, keys, service accounts and agents.
- **Trailryx.** A record nobody can quietly change or shorten.
- **Verdryx.** The one place we overlap on purpose: cost per correctly resolved case.
- **Mockryx.** Fire drills for the guardrails themselves, in CI.
- **Heraldyx.** Decides what is worth waking a human for, and mails it with one link.

All of it is Apache-2.0 and runs on infrastructure you own, and the governance planes export over OTLP into whatever tracing backend you already have. Governance data belongs in your observability stack. The enforcement decision does not belong in a dashboard.

## What people ask when they have already bought one

**Q: Do we have to drop our tracing to use this?**
No, and we would advise against it. Tracing answers a question this stack does not: why the model wanted to do the thing. Keep it, put the gateway in front of the model calls in shadow mode for a week, then turn on caps where the outliers are.

**Q: Our observability tool already tracks cost. Is that not the same?**
Cost tracking and a cost control are different products. One tells you a run spent the money. The other answers 402 and the run does not spend it. One arrives with the invoice, the other instead of it.

**Q: Why describe products by shape instead of naming them?**
Because a named comparison is wrong the week after a vendor ships a feature, and a reader who already runs one of these can map the shape to their tool in a second. The shapes say what a category can and cannot do architecturally, which is the part that does not change with a release note.

**Q: Could one of them add enforcement later?**
They could, and the sensible assumption is that somebody will. It is a different architecture though: standing in the path means owning an availability decision, fail-open or fail-closed, on every call. That is a heavier commitment than receiving a copy of a trace, and it is why the categories have stayed separate so far.
