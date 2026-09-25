<!-- https://it-rat.com/services/typryx.html -->

# Typryx, typed answers

> A typed answer, choice, score or yes/no, with a probability, never a guess: capped, journaled, and calibrated against real outcomes.

Agents already ask each other, and their models, questions that have exactly one shape: choice (which option), score (how good, on an ordered scale) or yes/no. Typryx takes a question from a versioned template and returns a typed answer read off a probability distribution, or refuses with a named reason instead of inventing one. Only the fields the template names ever leave the box, and every answer, refusal or timeout lands on a hash-chained journal.

## Every real judgement from one run, replayed in the same order.

Not an illustration: these are the 60 real arithmetic judgements from the calibration table below, local 7B, wording v2, in the order they were asked (the real run took 9.44 seconds; this replay plays it about 2× slower). Watch the resolved probability, the verdict, and how often "confident" and "right" turn out to be different things.

## The path of one ask.

An agent reaches typryx over MCP, most often through tokenfuse's broker, both measured. Inside, a call crosses the door, the template lookup, the egress filter and the hourly cap before it reaches a swappable backend; the answer is read off the probability distribution, never taken as the backend's own claim. Everything is journaled. On the right: the calibration loop that scores a later truth, and the consumers, all still planned, that would read the journal.

## Where can an ask stop, and what does it leave behind?

Six shapes, exact codes from `internal/service/service.go` and `internal/api/api.go`. Pick one.

## Where Jev meets the stack.

Three question shapes are the whole contract: `choice`, `score`, `noul` (yes/no). A template goes to any backend unchanged, because the templates are the contract and the backend is swappable. Switch the backend and watch what is sent and what comes back change; the typed-answer shape at the far right never does.

| template | type | options | who would ask it | status |
|---|---|---|---|---|
| eval.outcome_met | noul (yes/no) | n/a | Verdryx's grading; the calibration run below used it | planned |
| eval.answer_quality | score | 4 ordered levels | Verdryx grader | planned |
| request.complexity | choice | cheap / default / hard / reasoning | TokenFuse router, shadow mode only | planned, shadow only |

### Toggle the extra fields. The egress never changes.

Only `task` and `final_answer` are in the template's `fields`, so they are the only two that ever reach the backend, whatever else sits in the state. The type a backend receives is constructible only inside the template package, so a map or raw state cannot reach one even by an implementation mistake.

Measured on a live run: a five-field state carrying `user_email` and, separately, `customer_iban`, neither ever reached the backend or the record. Through Claude Code over MCP, an extra `api_token` field never reached the record either (`held_back_fields: 1`).

### Never invents an answer

A backend error, a timeout, missing or malformed probabilities, a cap hit: the answer is unanswered with a named reason, and the wire shape omits `answer` and `probabilities` entirely. No renormalizing, no fallback guess.

The served answer is always read back off the probability distribution itself: the argmax for a choice, the level for a score, `probabilities["true"]` for a yes-or-no, never from a claim the backend states alongside a disagreeing distribution.

## The one-token shortcut is not always faster.

Same 60 items, seed 1, timed end to end from the caller (`go run ./examples/speed`, typryx f4045e0, one run each, so read the medians as indicative rather than final).

| way of deciding | model label | median | p95 | accuracy |
|---|---|---|---|---|
| typed, one token, through typryx | hosted A | 538 ms | 795 ms | 71.7% |
| text judge, short verdict | hosted A | 723 ms | 1,012 ms | 100% |
| reasoning judge | a current small hosted reasoning model | 562 ms | 896 ms | 100% |
| typed, one token, through typryx | local 7B | 148 ms | 159 ms | 66.7% (3 of 60 unparsed, counted wrong) |
| text judge, short verdict | local 7B | 1,509 ms | 2,103 ms | 100% |
| typed, through typryx | Jev | not measured | built, not run live |  |

Against a hosted API the network dominates: the shortcut was about 1.3× faster than a short text verdict and gave up about a third of the accuracy, and a current small reasoning model was right on all 60 in about the same time as the shortcut. Locally the shortcut is about 10× faster. A typed decision earns its place by the probability it carries and where it runs, not by speed; vendor speed claims are not on this page.

## Stated confidence and actual accuracy are not the same number.

Eight groups, 480 judgements, never pooled: `typryx calibration --min-n 30 --json` over durable ledgers, 60 arithmetic judgements per group, seed 1, template `eval.outcome_met`, backend openai-logprobs, half the items right and half wrong. Every group was 96% to 100% confident on average and right 50% to 73% of the time. Click or focus a dot for its numbers.

Every group was 96% to 100% confident on average, right 50% to 73% of the time, and the errors do not lean one way: three groups (hosted C in both wordings, and the local 3B) said "correct" to every one of 60 items, right exactly half the time, the base rate. Hosted A mostly passed a wrong answer as right; hosted B erred both ways; the local 7B never passed a wrong answer but failed a third of the right ones. Rewording (v1 to v2) barely moved accuracy, because a one-token judge has no room to work anything out before answering: it suits classification, not verification. The current hosted generation refuses token probabilities outright (probed 2026-09-25: "'logprobs' is not supported with this model"), so this backend reaches only earlier hosted models and open models.

| label | wording | n | stated | accuracy | ECE | Brier | right | lenient | strict |
|---|---|---|---|---|---|---|---|---|---|
| hosted A | v1 | 60 | 0.990 | 0.733 | 0.267 | 0.525 | 44 | 15 | 1 |
| hosted A | v2 | 60 | 0.958 | 0.733 | 0.243 | 0.505 | 44 | 15 | 1 |
| hosted B | v1 | 60 | 0.987 | 0.583 | 0.414 | 0.823 | 35 | 11 | 14 |
| hosted B | v2 | 60 | 0.983 | 0.633 | 0.358 | 0.716 | 38 | 5 | 17 |
| hosted C | v1 | 60 | 0.99999 | 0.500 | 0.500 | 1.000 | 30 | 30 | 0 |
| hosted C | v2 | 60 | 0.9995 | 0.500 | 0.500 | 0.999 | 30 | 30 | 0 |
| local 3B | v2 | 60 | 0.998 | 0.500 | 0.498 | 0.995 | 30 | 30 | 0 |
| local 7B | v2 | 60 | 0.965 | 0.667 | 0.298 | 0.597 | 40 | 0 | 20 |

**stated confidence**
The probability the model's own answer carried when it was given, averaged over the group.

**ECE**
Expected calibration error: the average gap between stated confidence and actual accuracy across the bins, 0 is perfect.

**Brier**
Mean squared error between the stated probabilities and the true outcome; here, multi-class, 0 is best and 2 is worst.

## What each part of the stack would get.

Two edges are measured; the rest are what a later integration would read, not something built. Click or focus a node.

Click or focus a node above for what typryx gives it, which template, and what happens with typryx absent.

|  | what typryx gives it | status |
|---|---|---|
| MCP clients (Claude Code and others) | a typed answer with a probability, per call, over MCP | measured |
| TokenFuse, as broker | a named upstream; one tool_call recorded against the agent | measured |
| TokenFuse, router shadow mode | the class it would have routed to, alongside cost, recorded only | planned |
| Verdryx | a typed grader beside the existing LLM judge | planned |
| Wardryx | an optional signal that may become a hold, never a deny | planned |
| CostCrew | a suggested class or priority at triage; a person still decides | planned |
| Genaryx | a panel, live only when `GENARYX_TYPRYX_URL` resolves | planned |
| Engram | an optional importance score | planned |
| Journal readers (Trailryx, Idryx) | the same agent-event envelope; Idryx will never call typryx, its detection stays deterministic | planned |

## A probability, never an enforcement decision.

### No deny from a probability

Not here, and not in a consumer. The planned Wardryx rule may turn a signal into a hold, which a person releases; nothing turns a probability into a deny.

### Calibration, never pooled

`typryx calibration` groups by template, template version, backend and model, never averaged across any of the four. Two models under the same question with opposite calibration would otherwise cancel out on paper while neither is fine.

### A later truth, scored honestly

An outcome posted later is scored against the exact template version an answer was asked under, read from the ledger's own record, never against whatever the live template says today. A second outcome for the same answer is refused.

### One direct dependency

agent-stack-go, the stack's shared envelope library, is the only import beyond the standard library. A hostile-input sweep runs against the backends that parse bytes from outside the process, and the ledger survives a torn write mid-crash without losing the record after it.

### Spend capped by default

1,000 calls an hour by default, counted only against calls that got past the door, the template lookup and the egress filter. Disabling it logs a warning at boot rather than doing it quietly.

### Offline by default

The stub backend is deterministic and free, for tests and demos, and every answer it gives says so. The suite itself runs against httptest fakes; nothing in the test run reaches a live network.

### Optional, and it changes nothing when it is absent.

Typryx sits behind [TokenFuse](https://it-rat.com/tokenfuse.html)'s MCP broker as a named upstream, so a call an agent makes is priced and recorded there before it ever reaches typryx's own door; the `request.complexity` template maps directly onto that router's own task classes, in shadow mode only, planned rather than built. A typed grader beside [Verdryx](https://it-rat.com/verdryx.html)'s existing LLM judge is on the planned list above, not built: a typed answer is a single number a policy can threshold, calibrated against real outcomes rather than assumed honest, and it does not replace the judgement Verdryx already makes. If [Wardryx](https://it-rat.com/wardryx.html) ever reads a typed signal, the planned rule may turn it into a hold, which a person releases; nothing here or in a consumer turns a probability into a deny.

Without it, the rest of the stack behaves exactly as it does today: nothing here is consumed by anything else unless an operator wires it in.

Released as v0.1.0 on 2026-09-25: a signed image on ghcr.io for amd64 and arm64, and a release page with SBOMs; public on GitHub, CI green. Built and tested: the HTTP and MCP surfaces, the stub and openai-logprobs backends, the journal and ledger, calibration. The jev backend is built and tested against the documented wire shape, not yet run live: TypeSafe AI paused new signups on 2026-09-25.

Not yet: any launcher wiring (stack-single, stack-up, stack-k8s), agent-passport registration of its four event types, and every consumer in the tables above.

## A typed answer, and what it does and does not do

**Q: Is typryx required to run the rest of the stack?**
No. It is an optional add-on, and every other service keeps its current path unchanged when it is absent. Nothing in this repository or a planned consumer is built to depend on it.

**Q: What leaves the box when I send it a state?**
Only the fields the template's own `fields` list names, held by the type system rather than a promise: `internal/backend.Backend.Ask` takes a `template.Egress`, a type constructible only inside the template package. Measured on a live run: a state carrying `user_email` and, separately, `customer_iban`, neither reached the backend or the record.

**Q: Can a probability block anything?**
Not here, and not in a consumer. A probability is a signal a policy can threshold; the planned Wardryx rule may turn one into a hold, which a person releases, never a deny.

**Q: How do I know a probability is honest?**
Not from the number alone, which is the finding of the calibration run below: every group was 96% to 100% confident on average and right 50% to 73% of the time. `typryx calibration` groups by template, version, backend and model, never pooled, and prints accuracy, mean confidence, ECE and Brier against a later truth posted to `/v1/outcome`, so calibration is measured rather than assumed.

**Q: Does typryx need Jev to be useful?**
No. Jev is one backend behind one interface, not the contract; the stub backend answers deterministically for tests and demos, and openai-logprobs reaches any OpenAI-compatible server, including a local model. Jev is built and tested against the documented wire shape but not yet run live, since TypeSafe AI paused new signups on 2026-09-25.
