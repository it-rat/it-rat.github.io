<!-- https://it-rat.com/ai-observability-vs-governance.html -->

# AI observability vs governance

> LLM observability explains what an agent did; governance decides what it may do next. The difference, where each fails, how they connect through one run id, and why you need both.

Teams comparing agent tooling usually end up comparing a tracing product with an enforcement product and asking which to buy. It is the wrong question, in the same way that comparing your logging stack with your firewall is the wrong question. One explains what happened. The other decides what may happen. You will eventually want both, and the order you adopt them in matters less than knowing which problem each one leaves untouched.

## What each one is actually for.

*observability*

### A record you can question

Traces, spans, token counts, latencies, prompt and response capture, evaluation reports. It reconstructs what an agent did, in what order, with what inputs, and how much of the context window it burned doing it. When an agent behaves strangely, this is the only thing that will tell you why.

**Strongest at:** debugging a bad answer, understanding a slow chain, finding the tool call that returned nonsense, showing a change in behaviour after a model upgrade.

**Useless for:** stopping any of it. Every insight arrives after the action, and often after the invoice.

*governance*

### A decision that binds

Budgets, policy verdicts, identity, approval ceremonies, hard ceilings. It sits in the request path and answers before the call happens: allowed, refused, or held for a human. Its output is not a chart, it is an action that did or did not occur, and a record that it was decided on purpose.

**Strongest at:** refusing the loop on call five, denying a tool the agent should never have, requiring a person for the expensive action, producing evidence somebody else can verify.

**Useless for:** explaining why the model wanted to do it. A refusal is not an analysis.

## Same incident, two tools.

Take one concrete case: an agent enters a retry loop against a production API at two in the morning and spends four figures before anyone wakes up.

|  | Observability alone | Governance alone | Both |
|---|---|---|---|
| At 02:00 | Records every call faithfully | Refuses the call that crosses the cap | Refuses it, and records why |
| At 09:00 | You can reconstruct exactly what happened | You know it was stopped, not why it started | Root cause and a bounded loss |
| The bill | Already spent | Capped at the budget | Capped, and attributable per run |
| The fix | A ticket for next sprint | A cap, without knowing the trigger | A cap now, the trigger fixed properly |
| The auditor | Logs, if retention was right | A signed decision record | Both, joined on one id |

The middle column is deliberately uncomfortable. Governance without observability is a fleet that is safe and opaque: you know an action was refused, and you cannot say what made the agent try. That is a worse place to debug from than most teams expect, which is why the answer is not to replace one with the other.

## One run id, or two systems arguing.

The join is the only integration decision that really matters. If the trace, the spend line, the policy verdict and the outcome tag all carry the same run identifier, then the two halves compose: a refusal in the governance record links to the exact chain of calls that led to it, and a spike in the trace links to the budget that stopped it. If they do not, you have two dashboards and an argument.

In this stack the run id is the unit everything keys on, and the governance planes deliberately emit rather than hoard: policy decisions and quality runs export over OTLP into whatever tracing backend you already run, the gateway writes its own traces as Parquet, and every plane emits the same agent-event envelope. **Governance data belongs in your observability stack; the enforcement decision does not belong in a dashboard.**

### What to ask when you evaluate either one

- **Does it act in the path, or after it?** If the answer arrives after the call, it is observability, whatever the marketing says.

- **Is the answer binding?** A warning an agent can proceed past is telemetry with a stern voice.

- **What happens when it is unreachable?** Fail-open or fail-closed, chosen and documented, is the honest answer; silence is not.

- **Can somebody else verify the record?** A journal whose entries each carry the hash of the one before it can be checked by a person who does not trust you. An export from a dashboard cannot.

- **Does it join on the same id as everything else?** If it invents its own identifier, you are buying the integration project as well.

## Most teams already have half of this.

If you have tracing and no enforcement, which is the common case, the shortest path to the other half is not a migration. Route model calls through one gateway, watch in shadow mode for a week, then turn on caps where the outliers are. Your traces keep working; they gain a spend line and a verdict per run.

The governance side is laid out in [the agent governance guide](https://it-rat.com/ai-agent-governance.html), the money in [FinOps for AI](https://it-rat.com/finops-for-ai.html), and the defensive half in [AI agent security](https://it-rat.com/ai-agent-security.html). All of the tools are Apache-2.0, run on infrastructure you own, and export into the observability stack you already have.

## Where one ends and the other begins

**Q: What is the difference between LLM observability and AI governance?**
Observability reconstructs what an agent did: traces, token counts, latencies, evaluations. Governance decides what it may do next, in the request path, with a binding answer. One is a record you can question, the other is an action that did or did not happen.

**Q: Do I need both, or will tracing be enough?**
Tracing alone leaves every insight arriving after the action and often after the invoice. Governance alone leaves you safe and opaque: you know an action was refused and cannot say what made the agent try. Most teams already have the first half, and the shortest path to the second is a gateway in shadow mode.

**Q: How do the two connect technically?**
On one run identifier. If the trace, the spend line, the policy verdict and the outcome tag all carry the same id, a refusal links to the exact chain of calls that led to it. If they do not, you own two dashboards and an argument.

**Q: Does adding governance mean replacing our tracing stack?**
No. The governance planes here export over OTLP into whatever backend you already run, and the gateway writes its own traces, so governance data lands in your observability stack rather than competing with it. What does not belong in a dashboard is the enforcement decision itself.

**Q: How can I tell whether a tool actually enforces anything?**
Four questions. Does it act in the path or after it? Is the answer binding, or can the agent proceed past a warning? What happens when it is unreachable, and is that choice documented? Can somebody who does not trust you verify its record?
