<!-- https://it-rat.com/stack-guide.html -->

# The stack in depth

> How the figures on the home page were produced: one budget on four machines, a policy burst, a five-node cluster on three clouds, and the bugs it caught.

The [home page](https://it-rat.com/index.html#proof) keeps the eight figures from the validation campaign. This guide keeps the rest of what the home page used to say about them: each figure in full, what the campaign ran and what it caught, and how to run the stack yourself. [What is proven](https://it-rat.com/what-is-proven.html) sets out every claim with what it stops short of.

- [The eight figures](https://it-rat.com/#proof)

- [What the campaign ran](https://it-rat.com/#campaign)

- [What it caught](https://it-rat.com/#caught)

- [Where the rest is recorded](https://it-rat.com/#elsewhere)

- [Run it yourself](https://it-rat.com/#run)

## Validated on real infrastructure. Then torn down.

Before this site existed, the stack ran on disposable boxes across Hetzner, AWS and GCP with a real Anthropic key: four physical machines holding one budget over a real network, a partition with no split-brain, and a kill switch cutting real spend. Then the same stack came up again as a five-node Kubernetes cluster on each of those three clouds, which is where the cost of the governance itself finally got measured.

- **8000/8000** · **Money, under load.** Requests admitted against one budget by 100 to 500 concurrent agents, on a stub provider. None dropped, and none over the budget.

- **$0.00042** · **Money, per unit of work.** The measured cost of one correctly resolved case, which is the number that changes a decision. Monthly spend is not.

- **2,449/s** · **Policy, throughput.** Decisions a single pod makes each second, with no cliff out to 256 concurrent callers on dedicated cores.

- **34** · **Policy, under concurrency.** Requests fired at once and sorted exactly right: 6/6 served, 6/6 oversteppers denied, differentiated rights holding.

- **426 B** · **Evidence, per decision.** Hash-linked audit written for every decision rather than a sample. This is the line item that grows on its own.

- **12/12** · **Portability.** Deliberate budget overruns blocked, identically on Hetzner, AWS and GCP. What differs between clouds is the price, not the behaviour.

- **25,586** · **Crypto inventory.** Real Linux binaries scanned by Qryx, stripped, static and truncated among them, with zero crashes.

- **0** · **Rehearsal.** Guardrail gaps across three hostile drills fired twice at a real gateway, with zero real spend behind it.

## What the campaign ran, and what it caught.

Every number above came from a run against real infrastructure, not a benchmark harness written to flatter us. The boxes were disposable, the model calls behind the cost and policy figures were real and paid for, and nothing from the campaign is still standing: the machines were deleted, the key revoked.

**Money.** Four nodes across two datacenters held one budget through a leader kill and a real network partition: the majority kept serving, the isolated node could not overspend, and the state stayed byte-identical on every node. Under 500 concurrent agents against a fixed budget, the ledger admitted exactly what the budget allowed and no more.

**Policy.** An enriched multi-agent campaign produced 176 real enforcement decisions with differentiated rights: an analyst agent refused a wire transfer that a treasury agent was allowed, an unattested agent refused until it attested, and shell execution refused for everyone regardless of identity. Fired as a 34-request concurrent burst, the decision point still sorted them exactly right.

**The rest.** Qryx scanned 25,586 real Linux binaries, stripped, static and truncated among them, without a crash. Engram's reflection ran against real Claude output three times on three topologies with zero contradictions. Verdryx priced a correctly resolved case at $0.00042. Mockryx fired three hostile drills against a real gateway twice, with zero gaps and zero real spend, because the provider behind that gateway was fake while every guardrail in front of it was live.

**At cluster scale.** The same manifests then came up as a five-node cluster on each of the three clouds, to answer the question the campaign above could not: what does the supervision itself cost. Several clusters went up in all: a quota ceiling capped the first GCP attempt at three nodes, and AWS was rebuilt twice, the last time a chip generation lower, once it turned out the first result had compared silicon rather than clouds. One policy pod peaks at about 2,449 decisions a second and answers in 3.2ms at p50 while the queue is short. On identical silicon the two hyperscalers land 1.2% apart, which makes choosing between them procurement rather than engineering. At full load the infrastructure under the control plane works out at EUR 0.024 per million governed decisions on Hetzner and about USD 0.21 to USD 0.23 on AWS and GCP. That is what the machines cost to run. What binds first is not the processor but the evidence: every decision is audited, not a sample of them, at 426 bytes each, which is 614 MB a day at a thousand calls a minute. Provability is measured in gigabytes and can be budgeted a year ahead from a single number.

The full ledger, every number and every bug, is public in each repository's `VALIDATION.md`. A validation write-up with no bug list is marketing.

## Live testing found real bugs.

**And what it caught.** Live testing found real bugs, which is the point of doing it. Two of them, both in the policy plane, were invisible to sequential test traffic: a request that merely declared a forbidden tool without calling it slipped past a deny rule, and a decision cache keyed without the attestation method let an unattested agent inherit a recently attested allow inside the cache window. Only the 34-agent concurrent burst surfaced the second one. Both were fixed, covered by regression tests, and re-verified live before any number here was taken as final.

## Where the rest of the record is.

- **On premises.** The 2026-09-17 run on a small box behind a home router, governing agents in AWS and GCP and then taking sixteen injected failures, is in [what is proven](https://it-rat.com/what-is-proven.html), under "Seven claims and what each one stops short of" and "Sixteen ways to break it, and what each one did".

- **What we withdrew.** The throughput cliff past 64 concurrent callers that turned out to be a shared-vCPU instance is in [what is proven](https://it-rat.com/what-is-proven.html), under "Three things we published and had to withdraw", and in [what runs where](https://it-rat.com/what-runs-where.html).

## You do not have to take our word for it.

You do not have to take our word for it: [run the stack's live services locally](https://it-rat.com/services/platform.html#run) in one command and watch the money plane light up. The four that are not servers, Engram, Qryx, Verdryx and Mockryx, each carry a one-line try-it on their own page.

## Back to the home page.

The [home page](https://it-rat.com/index.html) has the eight figures, the stack's corridor and the wiring, and [the guides index](https://it-rat.com/guides.html) has the field itself.
