<!-- https://it-rat.com/security-by-design.html -->

# Security by design

> An agent can be persuaded, so its controls sit where persuasion cannot reach. Eight design decisions in the stack, and what happened when we broke each one.

An AI agent can be talked into anything, so everything that keeps it safe has to sit where persuasion cannot reach. Security in a stack for agents is decided by three things: where each decision sits, what happens when a part of the stack fails, and whether its record can prove itself. **These are the eight decisions we made, why we made them, and what happened when we broke each one on purpose.**

- [At a glance: the eight decisions](https://it-rat.com/security-by-design.html#at-a-glance)

- [A refusal we did not count](https://it-rat.com/security-by-design.html#intro)

- [Why security comes first](https://it-rat.com/security-by-design.html#why-security-first)

- [The shortcuts agents usually run on](https://it-rat.com/security-by-design.html#shortcuts)

- [1. The decision sits in the path](https://it-rat.com/security-by-design.html#in-the-path)

- [2. No model in the decision](https://it-rat.com/security-by-design.html#no-model-in-the-decision)

- [3. Every failure has a stated answer](https://it-rat.com/security-by-design.html#stated-failure-answer)

- [4. An identity, not a key](https://it-rat.com/security-by-design.html#identity-not-key)

- [5. Each part holds only what it needs](https://it-rat.com/security-by-design.html#least-held)

- [6. A record that proves itself](https://it-rat.com/security-by-design.html#self-proving-record)

- [7. It stays in your building](https://it-rat.com/security-by-design.html#stays-in-your-building)

- [8. Every control is proven by breaking it](https://it-rat.com/security-by-design.html#proven-by-breaking)

- [What we built](https://it-rat.com/security-by-design.html#what-we-built)

- [Three things to try on Monday](https://it-rat.com/security-by-design.html#monday)

## Eight decisions, one line each.

- [The decision sits in the path, before the action.](https://it-rat.com/security-by-design.html#in-the-path) Identity, policy and budget are decided before the model provider hears a call, and a tool call the model asks for is judged before the agent can run it.

- [No model in the decision.](https://it-rat.com/security-by-design.html#no-model-in-the-decision) Plain rules give the same answer to the same request every time; a model may add a risk signal that can hold a call, never allow or deny one.

- [Every failure has a stated answer.](https://it-rat.com/security-by-design.html#stated-failure-answer) For every dependency we wrote down what happens next, and the installers ship the policy service's answer set to closed.

- [An identity, not a key.](https://it-rat.com/security-by-design.html#identity-not-key) Each agent has its own identifier, a key speaks only for the identities bound to it, and a revocation wins.

- [Each part holds only what it needs.](https://it-rat.com/security-by-design.html#least-held) The part that decides is not the part that enforces, the part that alerts can act on nothing, and the stop is a person behind a passkey.

- [A record that proves itself.](https://it-rat.com/security-by-design.html#self-proving-record) Hash-chained, sealed, and checkable offline by somebody who has no reason to trust us.

- [It stays in your building.](https://it-rat.com/security-by-design.html#stays-in-your-building) Self-hosted and Apache-2.0, with no account and no telemetry; what leaves through the stack is decided first.

- [Every control is proven by breaking it.](https://it-rat.com/security-by-design.html#proven-by-breaking) A check counts only after it has failed on a planted fault, and then we break the running system.

## A refusal we did not count.

On 14 October we hid an instruction for an AI agent inside a configuration note on a small network router, the kind of text an agent reads while doing an ordinary job. The model read it, said it looked like an injection, and did not follow it.

We were glad, and we did not count it.

A model that refused today can comply tomorrow, after an update, a different phrasing or a longer conversation. An agent is a program that chooses its next step by asking a model, and a model can be persuaded. Everything that keeps an agent safe therefore has to sit where persuasion cannot reach it: in the path of the call, decided by code that gives the same answer every time, and still saying no when part of the system is broken.

That sentence is most of our architecture. Each decision below came from one question, **what could an agent do with its credentials if somebody talked it into it**, and each was tested by breaking it.

## Why security comes first.

An agent holds three things a chatbot never did. A key to a model provider is a budget. Access to tools is the power to write, send and pay. A delegation from a person, which most agents acting for somebody carry, is that person's authority. The services we build sit in front of all three. They see every call an agent makes, which makes them the best place to stop a bad one and the most valuable thing in the building to attack.

Security was never one feature on our list; it was the condition every other feature had to meet. A budget that a retry loop can race past is not a budget, and a policy that switches itself off whenever its server restarts is a suggestion. An audit record that an administrator can quietly edit is a diary.

### What supervisors have started to write down

There is a plainer reason too. The first organisations to run agents at scale are banks, insurers and public bodies, and the people who supervise them have started writing down what they expect.

- The **Financial Stability Board**'s consultation report of 10 June 2026 lists steps financial institutions take to oversee agents: an individual identifier for each agent, actions that are prohibited or need human approval at checkpoints, dual authorisation above a certain value, and audit trails.

- On 3 July the **Monetary Authority of Singapore** and the industry published a white paper on governance checkpoints that verify and record an agent's proposed actions before it executes them.

- In August the UK's **National Cyber Security Centre** asked for every agent to have its own identity, and for technically enforced controls beside human oversight wherever the risk is higher.

- The **OWASP Top 10 for agentic applications** opens with goal hijack, tool misuse, and identity and privilege abuse.

Most of those lines describe a control that sits in the path of the action, the rest describe the evidence it leaves behind, and none of them describes a dashboard. How the decisions below line up with those texts is our reading of them, not a compliance claim.

## The shortcuts agents usually run on.

Most agents today run on a handful of shortcuts, and each one is reasonable on the day somebody takes it: a shared provider key in an environment variable, a dashboard of yesterday's spend, a system prompt that asks the model not to do certain things, a second model that reads the conversations and scores them. Then come the default that lets traffic through when the policy service is down, because an outage looks worse than a risk, the log the platform team can edit, and the stop link in an alert email.

Each of them moves the decision somewhere an agent, or a tired person at three in the morning, can get around it. The eight decisions below move it back.

| shortcut | decision instead | held by |
|---|---|---|
| A shared key | An identity per agent | 403 for a key posing as another |
| Yesterday's dashboard | A decision before the call | 402 before the provider hears it |
| A model scoring a model | Fixed rules, and the kernel | Same request, same answer |
| Open during an outage | Closed, chosen out loud | Refused from 2.5 s |
| An editable log | A hash-chained record | One flipped byte fails |
| A stop link in email | A stop behind a passkey | Journaled with its outcome |

## The decision sits in the path, before the action.

Every call an agent makes to a model passes through a gateway ([TokenFuse](https://it-rat.com/services/tokenfuse.html)), and three questions are answered before the provider hears it. Who is calling? May it do this? Can it afford it? A no arrives at once as an ordinary HTTP status: 401 when the caller has no identity, 403 when the action is refused, 402 when the budget is spent. A call refused there costs nothing. It never left.

The fourth question comes back with the model's answer: when the model asks for a tool call, may that call run? A refused one is withheld from the agent and replaced with a refusal.

In August, on a cluster in AWS with a real provider key behind the gateway, a request against a budget smaller than one call came back 402 with no request id from the provider, because the provider never saw it.

On 14 October, on a test box, the gateway refused the tool calls that untrusted text tried to reach: a command after a web page was read, a message out after a planted instruction, an email built from memory. The same day showed why the path matters more than the model. On the router from the opening, a tool call inside a streamed answer reached the agent unjudged, because only buffered answers were being checked. The release that shipped that night judges both.

A report after the call tells you what an agent already did. **A decision before the call is the one place where no is still cheap.**

## No model in the decision.

The policy point that answers allow, deny or hold ([Wardryx](https://it-rat.com/services/wardryx.html)) runs plain rules. A cost line above which a named person must approve. A hard ceiling no approval can pass. Tools an agent may never use, and domains it may reach. The detectors that look for excess privilege or an agent going around the gateway are fixed rules as well, and the sensor that watches outbound connections works inside the Linux kernel, without touching the application (both in [Idryx](https://it-rat.com/services/idryx.html)).

The same request under the same policy gets the same answer every time, which is what an auditor means by reproducible. It is also fast. On 13 September, thirty-four concurrent requests with different rights were decided correctly, 34 of 34, in 16 milliseconds, and one policy instance reached 27,210 decisions a second in runs of 3,000 decisions.

Putting a second model in charge of the first looks like a control and behaves like a second opinion. The text that persuaded one model can persuade the next, and their mistakes tend to travel together.

In our stack a model may add exactly one thing to a decision: a typed risk signal ([Typryx](https://it-rat.com/services/typryx.html)), the probability that a tool call destroys something, sends data out or moves money. **A signal can only hold a call for a person. It can never allow a call, and it can never deny one.**

## Every failure has a stated answer.

Parts of any system fail. A policy service restarts, a node dies, a site loses its link to the hub. For every dependency we wrote down what happens next, and for the policy service the installers ship that answer set to closed.

On 14 October we cut the policy service off from a running gateway for about a minute. From 2.5 seconds on, every call was refused with a 403 that named the closed failure mode, 126 of 155, and the gateway answered again 0.7 seconds after the link came back. In September a second site was cut from its hub: its gateway refused in 255 milliseconds, queued its telemetry and replayed it with nothing lost.

| failure | answer | measured |
|---|---|---|
| Policy service cut off | Refuses from 2.5 s; back 0.7 s after the link returns | 14 Oct 2026 |
| A site loses its hub | Refuses in 255 ms; telemetry queued and replayed | 26 Sep 2026 |
| Policy database pod deleted | Back in 17 s; pending approvals kept | 14 Oct 2026 |
| Five servers reset at once | Serving in 327 s, with the same state | 14 Oct 2026 |
| An unpriced model | Priced high, not waved through | by design |
| A misspelt security switch | Refuses to start | by design |

The same rule runs through the defaults. A model with no price on file is priced high rather than waved through. A call that does not say which run it belongs to is refused. Secret scanning that nobody configured blocks, and a security switch whose value the gateway cannot read stops it from starting.

Failing closed has a cost. We state it. During an outage some legitimate calls are refused. The alternative is that during an outage nothing is checked while every run still looks clean, and that is the outage an attacker waits for.

### A missing signal is not a clean one

The most useful thing the October tests found belonged to the same family. The risk signal from decision 2 arrives for each tool call. Above about 12 kilobytes of arguments the classifier handed over nothing, and a call with no signal was treated like a call with nothing to worry about. The same tool call was held for a person at 11,264 bytes and answered at 13,312. Twelve kilobytes sounds like a lot for one tool call, until you remember that padding a field costs an attacker nothing.

The fix was a rule about absence. The policy point can now be told what a missing signal means, and the rule our installers document says hold the call for a person. It was released the same afternoon, and on two clouds the same day the padded call was held. **A control that only judges what it can see has to decide, in advance, what it does about what it cannot.**

## An identity, not a key.

Each agent has its own identifier, and a key is bound to the identities it may speak for. On 14 October a key issued to one agent presented another agent's identity. The answer was 403 `identity_mismatch`, a high-severity event on the bus, and zero spend. A missing or unknown key gets 401.

When an agent acts for a person, it carries a short-lived token bound to its own key ([Vouchryx](https://it-rat.com/services/vouchryx.html)), so a stolen token is useless without that key. Delegation can only narrow on the way down a chain, never widen.

A revocation wins over whatever the token says about its own expiry: the gateway refuses the token once its next poll of the revocation list lands, every 12 seconds by default. On Google Cloud on 14 October, with the poll set to one second, a revoked delegation was refused 1.5 seconds later.

Agent tokens are the default now, not an option. In the shipped Docker Compose launcher (stack-single 1.3.0, released 2026-10-19) the gateway and the MCP broker require an agent's own token, a static key is admitted only when its id is on a named list and is refused with 401 otherwise, and vouchryx, which issues the tokens, starts on every default box. The Kubernetes launcher does the same from 1.5.0. On a stack-single box one agent can be enrolled for a token so far; the others stay on the list until the registry takes more than one.

A key answers one question: does the caller know a secret. **An identity answers who is acting, for whom, with which rights, and how to take them away.**

## Each part holds only what it needs.

The service that decides is not the one that enforces. The one that tells people about incidents ([Heraldyx](https://it-rat.com/services/heraldyx.html)) holds no credential for any other service and can act on nothing, and its only way out is mail.

A mail never carries the stop, because mail security gateways open links before people do. The stop is a button in your own console ([Genaryx](https://it-rat.com/genaryx.html)), behind a fresh passkey, and every attempt that passes the passkey, carried out or refused, is written to the console's own journal with its outcome. Eight console commands that move money or authority work that way, from killing a run to changing a business unit's monthly cap.

Two recent changes follow the same idea. The newest change to the policy service makes every policy change made through its API name, on the event bus, the fingerprint of the key that made it, so "who changed the rules" has an answer that does not depend on anyone's memory. The alert service's new quiet hours and maintenance windows can hold an alert, but never a critical one. Both are in [what changed from 1 to 15 October](https://it-rat.com/changes-2026-10.html).

Separation of duties is the oldest control in banking, and here it means **one compromised part does not hand over the others.**

## A record that proves itself.

Decisions, refusals, stops and approvals go into append-only event logs in which each entry carries the hash of the one before it, and a record service ([Trailryx](https://it-rat.com/services/trailryx.html)) seals finished segments. Change one record and every seal after it stops matching, so an edit cannot hide in the middle: it has to rewrite everything after it. Signing the root and an outside witness are no longer missing, but they are not on by default. Trailryx can sign sealed roots with Keyryx (opt-in, from its 1.3.0 release), and Keyryx runs a witness that reads the event bus read-only and writes its findings to its own volume. The shipped launcher runs that witness on the same host, as a separate user and volume rather than as an outside party, and it leaves the root signer off, so a pack from the default install carries no root signature yet.

The check runs offline, by somebody who has no reason to trust us. On Google Cloud in September a sealed record verified, and one flipped byte made it fail.

A chain is only worth something if somebody checks it. A verifier on the box reads every stream, and on 14 October it earned its place. When a policy-service pod was replaced, the old one wrote two lines after its successor had taken over the chain, and the verifier flagged the break that afternoon. The fix, one writer at a time held by a file lock, is merged.

The record keeps metadata only. Prompts and payloads never enter it. It also answers the question an ordinary log cannot: whether a reply to "everything agent X did in March" is complete, or partial, with the reason.

## It stays in your building.

Everything we build is self-hosted and Apache-2.0, with no account, no licence key, no seats and no telemetry. The source is public and the container images pull without a login. Prompts and bills never pass through us. We are not in the path.

What goes out through the stack is decided first. A secret pasted into a prompt is refused before the provider sees it. Card numbers, email addresses, phone numbers and IBANs can be masked, or the call blocked. Where the egress gate ([Scopyx](https://it-rat.com/services/scopyx.html)) is installed, a web fetch is decided before it goes out, and the cloud's own metadata address and private ranges are refused. A typed question to an outside model sends only the fields its template names. Where the kernel sensor from decision 2 runs, it sees what tries to go around the stack.

For a regulated firm, "where does our data go" is the first question in any review. The best answer is "nowhere you did not choose", and it is easiest to prove when the code is yours to read.

## Every control is proven by breaking it.

A control nobody has fired is a guess. In our repositories a check counts only after it has been shown to fail on a planted fault, and every new test must fail on the broken code before it passes on the fixed one.

Releases of the gateway, the policy point, the record and the delegation service are signed and carry a software bill of materials and build provenance. The verifier for the record has no third-party dependencies and forbids unsafe code, and 650,000 fuzzed inputs to the record's parsers produced no crash.

Then we break the running system. On 14 October, on two clouds and on a server at home, we killed every service's process, deleted the policy database's pod, stopped a node, rebooted a server and reset all five machines of a cluster at once.

*327 s*

five servers reset at once, back with the same state

*2.5 s*

policy service cut off, and every call after it refused

*0 lost*

event lines, after 14 processes were killed one by one

*650,000*

fuzzed inputs to the record's parsers, no crash

Four numbers from breaking the stack on purpose: 14 October 2026 on Google Cloud and a home server, and the record's fuzzing run of 31 July 2026.

Each of the fourteen processes we killed on the home server came back by itself in under a second, and no event line was lost. The five-machine cluster was serving again 327 seconds after the reset, with no manual step and the same state as before: the same policies, the same approvals, 977 events on the bus and 977 in the console. A home server rebooted and was healthy 86 seconds later.

That is what a test day is for. Four of the defects it turned up were fixed in released versions before the next morning: the padded tool call, the streamed tool call that skipped the check a buffered one gets, a gateway that could admit calls before it had read its budgets after a restart, and a refused key that left no event behind. The padded call was re-tested live on two clouds the same day.

## What we built.

We build fifteen open-source services for running AI agents the way a company runs a workforce. Each one installs on its own, and all of them share one way of naming an agent and one event format, which is what lets a decision in one become evidence in another.

- **The gateway**, [TokenFuse](https://it-rat.com/services/tokenfuse.html), and **the policy point**, [Wardryx](https://it-rat.com/services/wardryx.html).

- **Delegation**, [Vouchryx](https://it-rat.com/services/vouchryx.html), and **an identity graph with its kernel sensor**, [Idryx](https://it-rat.com/services/idryx.html).

- **The egress gate**, [Scopyx](https://it-rat.com/services/scopyx.html), and **a cryptography inventory**, [Qryx](https://it-rat.com/services/qryx.html).

- **Key custody and a witness**, [Keyryx](https://it-rat.com/services/keyryx.html).

- **Memory**, [Engram](https://it-rat.com/services/engram.html); **quality grading**, [Verdryx](https://it-rat.com/services/verdryx.html); **typed answers**, [Typryx](https://it-rat.com/services/typryx.html).

- **The record**, [Trailryx](https://it-rat.com/services/trailryx.html); **alerts**, [Heraldyx](https://it-rat.com/services/heraldyx.html); **drills**, [Mockryx](https://it-rat.com/services/mockryx.html).

- **A FinOps crew**, [CostCrew](https://it-rat.com/services/costcrew.html), and **a console**, [Genaryx](https://it-rat.com/genaryx.html).

All of it is Apache-2.0 and self-hosted, with no seats, licence key or telemetry.

## Three things to try on Monday.

- Find one decision about an agent that today happens after the fact, in a report or a review, and **move it into the path of the call.**

- Write down what each control does when the thing it depends on is down. **Then switch that thing off and watch.**

- Give one agent its own identity, revoke it, and **time how long it takes until the next call is refused.**

[What changed in the stack from 1 to 15 October 2026](https://it-rat.com/changes-2026-10.html) lists the releases behind several fixes named here. [AI agent security](https://it-rat.com/ai-agent-security.html) covers the failure modes an agent introduces, and [the guides index](https://it-rat.com/guides.html) has the rest.
