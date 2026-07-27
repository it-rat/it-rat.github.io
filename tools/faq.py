#!/usr/bin/env python3
"""Insert the FAQ block on each page, once, before the footer.

Plain <details>: the answers sit in the HTML whether or not anyone opens
them, so the page stays short without hiding anything from a crawler.
tools/seo.py reads this same markup back out to build the FAQPage data, so
the structured answer and the visible answer cannot disagree.

Run from the repo root:  python3 tools/faq.py   (idempotent)
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
MARK_OPEN = "<!-- faq:auto -->"
MARK_CLOSE = "<!-- /faq:auto -->"

FAQ = {
"index.html": ("common questions", "The questions that come before the demo", [
 ("What is AI agent governance?",
  "<p>Governance is the set of controls that decide what an agent is allowed to do while it is running: a budget it cannot exceed, a policy it must ask before acting, an identity that records who it acts for, a memory that can say where a belief came from, and evidence an auditor can verify afterwards.</p>"
  "<p>Observability tells you what an agent did. Governance decides what it can do next. The two are not substitutes, and only one of them stops a runaway at 3am.</p>"),
 ("Is the stack open source?",
  "<p>Yes, all of it. Apache-2.0, source on <a href=\"https://github.com/TAIPANBOX\" target=\"_blank\" rel=\"noopener\">GitHub</a>: TokenFuse, Wardryx, Idryx, Engram, Qryx, Verdryx and Mockryx, the shared <a href=\"services/platform.html\">contract</a> under them, and <a href=\"genaryx.html\">Genaryx</a>, the console over all of them.</p>"),
 ("Do you host any of this, or see our data?",
  "<p>No. Every plane runs on infrastructure you own: AWS, GCP, Hetzner, any cloud or on-prem. We never run your control plane, hold your keys or store your traffic, so there is nothing on our side to subpoena or breach.</p>"),
 ("What does it cost to try?",
  "<p>Nothing, and no account. Every part of it is Apache-2.0, the console included. One command builds and starts the long-running services locally: see <a href=\"services/platform.html#run\">run the live stack locally</a>. The four that are libraries and CLIs each carry a one-line try-it on their own page.</p>"),
]),

"services/tokenfuse.html": ("common questions", "How teams put a ceiling on agent spend", [
 ("How do I cap what an AI agent can spend?",
  "<p>Give the run a budget. Every call is priced before it happens, the reserve is taken against that budget, and the call that would cross the cap is refused with an HTTP 402 before the provider ever sees it. Budgets nest, so a run also has to fit inside its agent, team and company caps.</p>"),
 ("What happens to my agent when it hits the budget?",
  "<p>It gets a 402 with the reason, which is a status every framework already understands, and an incident is recorded against that run. Nothing else in the fleet is affected, and the spend that would have followed simply never happens.</p>"),
 ("Do I have to rewrite my agent to use it?",
  "<p>No. It is a one-line base-URL change to a gateway that speaks the Anthropic Messages API. Run it in shadow mode first and it prices and records everything while refusing nothing, so you can see what would have been blocked before anything is. It is fail-open, so it never becomes a single point of failure.</p>"),
 ("Can it catch a retry loop before the bill does?",
  "<p>That is the case it was built for. A sustained loop or a fan-out explosion looks the same as a compromised agent from the budget's side, and both trip the breaker. In the live campaign, the runaway that mattered was caught and killed on the day, not on the invoice.</p>"),
 ("Does it still work with several gateways behind a load balancer?",
  "<p>Yes. The spend ledger is raft-replicated and the affordability check is linearized across the fleet, so five gateways on five machines admit exactly what one budget allows. That was tested through a leader kill and a real network partition.</p>"),
]),

"services/wardryx.html": ("common questions", "Putting a human in front of the expensive actions", [
 ("How do I require human approval before an agent does something expensive?",
  "<p>Set a threshold in policy. Above it the answer to the agent is <span class=\"mono\">hold</span> rather than allow, a human grants or refuses out of band, and the agent resubmits with a signed approval token bound to that agent, run and tool set. No connection is parked waiting for a signature.</p>"),
 ("What answers can the policy plane give?",
  "<p>Three, and only three: allow, deny, or hold for a human. There is no improvisation and no fourth case, which is what makes the decisions reproducible and arguable after the fact.</p>"),
 ("What happens if the policy service is unreachable?",
  "<p>You choose, per deployment, and the choice is written down. Fail-open treats it as allow, so availability wins and an outage silently disables policy. Fail-closed treats it as deny, so policy wins and an outage blocks every governed action. Started with no policy loaded, Wardryx allows and says so in the log rather than pretending to enforce.</p>"),
 ("Can policies be reviewed like code?",
  "<p>Yes. Budgets, passports and policies are Terraform resources, so they get pull requests, plans and diffs, and an edit made out of band shows up on the next plan instead of quietly persisting.</p>"),
]),

"services/engram.html": ("common questions", "What a memory has to do that similarity search cannot", [
 ("How is this different from a vector database?",
  "<p>A vector store finds text that looks similar. It cannot tell you when a fact was true, where a belief came from, or that two beliefs disagree. Engram ships a vector index too, in-process, and adds the three answers similarity has no concept for: bitemporal validity, a <span class=\"mono\">why()</span> chain back to source episodes, and contradiction detection.</p>"),
 ("Does it need a server, a container or an API key?",
  "<p>None of the three to write a memory. It is one <span class=\"mono\">.engram</span> file on SQLite plus sqlite-vec, in-process, installed with pip. A model only enters the picture when you ask for <span class=\"mono\">reflect()</span>, and even that call can be pointed at a local model or routed through <a href=\"tokenfuse.html\">TokenFuse</a> so thinking has a budget too.</p>"),
 ("Can I delete everything about one person?",
  "<p>Yes, and the cascade is the point. Erasing an entity removes the episodes about them, the facts derived from those episodes, and the graph edges that made them findable, and reports how many of each it deleted. Erasure is agent-scoped, so in a shared store one agent cannot delete another's memories.</p>"),
 ("Does it work with Claude Desktop, Claude Code or Cursor?",
  "<p>Yes, over MCP on stdio, so there is no network listener and no port to guard. Those clients get remember, recall, why and forget against the same store with no integration code.</p>"),
]),

"services/idryx.html": ("common questions", "Counting the identities nobody is counting", [
 ("How do I find every AI agent and service account we actually have?",
  "<p>Idryx reads what Okta, Entra, AWS, GCP and Azure already log, adds the agent-event bus the rest of the stack writes, and stitches all of it into one graph of humans, service accounts, keys, agents and MCP servers. The answer comes from the graph, not from a spreadsheet someone maintained until they left.</p>"),
 ("Will it change anything in my cloud?",
  "<p>No. It is read-only by design: connectors read, and the output is an alert, a bill of materials, or a Terraform diff a human applies. It never writes back.</p>"),
 ("What is an Agent-BOM?",
  "<p>A CycloneDX 1.6 bill of materials for your agents: who owns each one, what runtime it runs on, what it is attested by, and what it can reach. It plugs into the same supply-chain tooling that already ingests your SBOMs.</p>"),
 ("What does it actually detect?",
  "<p>Twenty-two deterministic detectors in four families: identity threats, non-human identity hygiene, agents and AI, and least privilege. Detection is statistics and rules over the graph; the model is never in the detection path, so every finding is reproducible and defensible in an audit.</p>"),
]),

"services/qryx.html": ("common questions", "Where a post-quantum migration actually starts", [
 ("How do I start a post-quantum migration?",
  "<p>With an inventory, because you cannot migrate what you have not found. Qryx scans binaries, containers, live TLS endpoints, certificates, dependencies and cloud KMS, and returns a cryptographic asset graph graded against the NCSC milestones: discovery by 2028, the highest-priority systems by 2031, everything by 2035.</p>"),
 ("What is a CBOM?",
  "<p>A cryptographic bill of materials in CycloneDX 1.6: one component per unique asset and risk class, with every occurrence attached. It lives in the same supply-chain tooling as your SBOMs, so cryptography stops having its own isolated report nobody reads.</p>"),
 ("Can it fail a build when someone ships a weak key?",
  "<p>Yes. Snapshot the graph as a baseline, and a new weak or quantum-vulnerable asset fails the build with a distinct exit code, with separate codes for a standards violation and a regressed compliance trend. That is the day it matters, not the next audit cycle.</p>"),
 ("Does it find hardcoded keys?",
  "<p>It does, and it counts them honestly: cryptography that exists only in test fixtures is scanned, reported and kept out of the production inventory, with one line saying how much was set aside. Counting fixtures inflates the number you are trying to drive to zero.</p>"),
]),

"services/verdryx.html": ("common questions", "Measuring quality in money, not vibes", [
 ("How do I measure cost per correct answer?",
  "<p>Tag outcomes in production, then read them back off the gateway's own trace: resolved, escalated, abandoned. Verdryx turns that into a dollar figure per case, including the untagged intermediate calls a run made and the calls the breaker blocked, because both are part of what the outcome cost.</p>"),
 ("How do I know when quality has actually dropped?",
  "<p>A flat threshold catches the obvious fall. Beside it, a two-sample significance check, Welch's t with a bootstrap interval, catches the small consistent regression a threshold tuned for noise would miss. Point it at a baseline whose source run is gone and it fails loudly rather than silently.</p>"),
 ("Do I need an LLM judge to use it?",
  "<p>No. Four of the five graders are deterministic and free: exact, regex, outcome tag and tool trace. The judge is there for the cases a rubric can score and a pattern cannot, and when you use it, its own cost is priced against the same book the money plane uses rather than reported as zero.</p>"),
 ("Does it need network access or a key?",
  "<p>Not for the common path. The eval runner, graders and drift maths import nothing but the standard library, and the whole suite runs against a deterministic stub adapter with no network and no key, which is exactly what its own CI runs.</p>"),
]),

"services/mockryx.html": ("common questions", "Rehearsing a defence before it is needed", [
 ("How do I test that my guardrails actually work?",
  "<p>Fire drills. Each scenario is a YAML file describing the request to send and the answer the guardrail must give, aimed at a real gateway with the guardrails live: the breaker's 402, DLP's 403, the deny or hold from the policy plane. No mocked gateway in the middle, so the code you rehearse is the code production traffic meets.</p>"),
 ("Does running the drills spend real money?",
  "<p>No. The provider behind the gateway is fake, so a runaway scenario can burn as much as it likes: the meter it trips is real, the invoice is not. Every hostile input also stays inside your perimeter, because the harness only ever talks to the one gateway URL you hand it.</p>"),
 ("What if a guardrail simply is not configured?",
  "<p>Then a miss is reported as not configured rather than as a gap, and only when there is no evidence anywhere in the run that the feature is live. A core guardrail with no optional declaration is always a finding, and so is a gateway that could not be reached at all. One flag turns even a skip into a failure when you know the guardrail must be there.</p>"),
 ("Can it gate CI?",
  "<p>That is the intended home. Exit 0 means every drill held, exit 1 is a real defensive gap and should fail the build, exit 2 means the harness itself is broken so nothing was proven. Gate on 1, fix the pipeline on 2, and never let the two blur.</p>"),
]),

"services/platform.html": ("common questions", "The contract seven services agree on", [
 ("What is an Agent Passport?",
  "<p>One identifier and one document per agent: an <span class=\"mono\">agent://</span> URI of at most 255 bytes, aligned with SPIFFE without requiring it, and a document naming an owner, a runtime and one of five attestation methods. The delegation chain behind it is ordered root first, acyclic, and capped at 32 entries.</p>"),
 ("Do I have to adopt the whole stack to use the contract?",
  "<p>No. There is no shared runtime and no shared database. Adopting it is a naming agreement plus a few optional fields on events you already emit, which is why a service can add an event type without asking any other service for permission.</p>"),
 ("Can budgets and policies live in version control?",
  "<p>Yes. Three Terraform resources cover budgets, agent passports and policies, published on the public Terraform Registry, so governance gets pull requests, plans and diffs like the rest of your infrastructure. Where the API has no delete, the provider says so instead of pretending.</p>"),
 ("How do I check that my events actually conform?",
  "<p>Run <span class=\"mono\">agent-conform</span>. It carries the canonical JSON Schemas, classifies each file by its own schema field, treats unrecognised content as a failure rather than skipping it quietly, and exits 0 or 1. It has already caught a real 63-versus-64 character hash defect.</p>"),
]),

"ai-agent-governance.html": ("common questions", "What people ask about agent governance", [
 ("What is AI agent governance?",
  "<p>The controls that decide what an AI agent may do while it is running, rather than the reports that describe what it did. In practice that is six things: a budget it cannot exceed, a policy it must ask before acting, an identity that records who it acts for, memory with provenance, quality measured in outcomes, and drills that prove the guardrails still hold.</p>"),
 ("How is agent governance different from LLM observability?",
  "<p>Observability is a witness; governance is a brake. A trace tells you afterwards that an agent looped four hundred times against a production API. A budget tells the agent on call five that it may not. Both are useful, but only one of them is standing in the path when it matters.</p>"),
 ("Do I have to adopt all of it at once?",
  "<p>No, and nobody does. The order that works is metering first, then a ceiling, then naming the actions that need a human, then drawing the identities, then rehearsing the guardrails in CI, and only then measuring quality in money. Each step is a separate Apache-2.0 tool and each is useful alone.</p>"),
 ("Does putting controls in the request path slow agents down?",
  "<p>The enforcement decision itself is in-process and measured in microseconds, and the gateway is fail-open by design, so an unreachable control plane never becomes the thing that stops your fleet. The latency people notice in agent systems comes from models and tools, not from a budget check.</p>"),
 ("Can this run on our own infrastructure?",
  "<p>It is the only way it runs. Every plane is self-hosted on infrastructure you own, any cloud or on-prem, and nothing is sent to us: we never hold your keys, your traffic or your data.</p>"),
]),

"finops-for-ai.html": ("common questions", "What people ask about AI cost control", [
 ("What is FinOps for AI?",
  "<p>FinOps practice applied to spend that nobody provisions: LLM and agent usage created at machine speed by the decisions of an agent. It keeps the discipline of cloud FinOps, visibility, allocation and optimisation, but moves the unit of work to the run, the control into the request path, and the feedback loop from monthly to immediate.</p>"),
 ("How do I control LLM costs in production?",
  "<p>Route calls through one gateway, give every run a budget that rolls up to its agent, team and company, price each call before it happens, and refuse the call that would cross the cap. Add a semantic cache and a model router to reduce spend without refusing work, and report what each mechanism saved separately.</p>"),
 ("Why is a per-key rate limit not enough?",
  "<p>Because a key cannot tell one agent's honest afternoon from the same key looping on itself, and a limit expressed in requests per minute has no opinion about money. A retry storm stays comfortably inside a rate limit while spending four figures.</p>"),
 ("How do I report AI spend to finance?",
  "<p>Export it in the FinOps Foundation's FOCUS format, one row per model call, so agent spend lands in the same pipelines and dashboards as the rest of the cloud bill. Showback and chargeback by team then reuse the tooling finance already trusts instead of becoming a bespoke project.</p>"),
 ("What is cost per resolved case?",
  "<p>The unit economic that changes decisions: the money spent to actually resolve one piece of work, including the intermediate calls nobody tagged and the calls a breaker refused. An agent at forty cents a resolved case and one at four dollars are different businesses, and a monthly total cannot tell them apart.</p>"),
]),

"ai-agent-security.html": ("common questions", "What people ask about securing agents", [
 ("What is different about securing an AI agent?",
  "<p>The actor reasons and can be talked into changing its mind, but the damage still arrives as a tool call: a write, a transfer, a shell command, a request carrying a credential. That makes the tool boundary the place to defend, with the same discipline as any service account: identity, least privilege, blast radius, evidence.</p>"),
 ("How do I stop prompt injection from reaching a tool?",
  "<p>Not with a better prompt. Taint-track what came from outside the trust boundary and refuse the actions it reaches, at the policy point, per call. A system prompt asking the model not to do something is a request; a decision point that denies the call is a control.</p>"),
 ("What is excessive agency?",
  "<p>OWASP's LLM06: an agent that reaches admin-equivalent power through its delegation chain rather than through its own grants. Its own permissions look modest, and two hops away it can do anything. Finding it needs the chain drawn as a graph, because no permission list on a single identity will show it.</p>"),
 ("How do I know an agent is not exfiltrating data slowly?",
  "<p>Correlate rather than count. A single blocked action is noise; a stream of blocked actions from one identity inside a day is a pattern, and severity should rise with repetition and with the privilege of the identity doing it.</p>"),
 ("How do we prove our guardrails still work?",
  "<p>Rehearse them in CI against a real gateway with a fake provider behind it, so the meter that trips is real and the invoice is not. And refuse to count an unconfigured feature as a pass: a guardrail that is switched off looks exactly like one that is broken.</p>"),
]),

"ai-observability-vs-governance.html": ("common questions", "Where one ends and the other begins", [
 ("What is the difference between LLM observability and AI governance?",
  "<p>Observability reconstructs what an agent did: traces, token counts, latencies, evaluations. Governance decides what it may do next, in the request path, with a binding answer. One is a record you can question, the other is an action that did or did not happen.</p>"),
 ("Do I need both, or will tracing be enough?",
  "<p>Tracing alone leaves every insight arriving after the action and often after the invoice. Governance alone leaves you safe and opaque: you know an action was refused and cannot say what made the agent try. Most teams already have the first half, and the shortest path to the second is a gateway in shadow mode.</p>"),
 ("How do the two connect technically?",
  "<p>On one run identifier. If the trace, the spend line, the policy verdict and the outcome tag all carry the same id, a refusal links to the exact chain of calls that led to it. If they do not, you own two dashboards and an argument.</p>"),
 ("Does adding governance mean replacing our tracing stack?",
  "<p>No. The governance planes here export over OTLP into whatever backend you already run, and the gateway writes its own traces, so governance data lands in your observability stack rather than competing with it. What does not belong in a dashboard is the enforcement decision itself.</p>"),
 ("How can I tell whether a tool actually enforces anything?",
  "<p>Four questions. Does it act in the path or after it? Is the answer binding, or can the agent proceed past a warning? What happens when it is unreachable, and is that choice documented? Can somebody who does not trust you verify its record?</p>"),
]),

"mcp-security.html": ("common questions", "What people ask about MCP", [
 ("What are the main security risks of the Model Context Protocol?",
  "<p>Two structural ones and the rest follow. A tool definition is a description the model reads as instructions, so it is content, not just a signature. And clients re-fetch definitions on connect, so the tool you approved is not necessarily the tool in use later. From those come poisoned descriptions, rug pulls, unsanctioned servers, credentials passing through the model, and drift nobody tracks.</p>"),
 ("What is an MCP rug pull, and how do I catch one?",
  "<p>A tool whose description or schema changes after you approved it, with no deployment on your side and no trace in your repository. Catch it the way you catch a changed dependency: pin a fingerprint of every approved tool and fail the build when the fingerprint moves. It ships as a CI action for that reason.</p>"),
 ("How do I find MCP servers nobody registered?",
  "<p>From the agent side, not the server side. Compare what your agents actually reach against the list of sanctioned servers and flag the difference; then join agents to servers on the tools they share, so an agent whose declared tools come from an unsanctioned server is a query rather than an incident.</p>"),
 ("Should an MCP server use stdio or HTTP?",
  "<p>Prefer stdio where the integration is genuinely local: no listener, no port, no network trust boundary to get wrong. Plenty of servers are remote by habit rather than need. Where a network server is required, treat it as any other internal service: authentication, network placement, and a name in the inventory.</p>"),
 ("How do I keep API keys out of the model when a tool needs one?",
  "<p>Do not hand the value to the agent. The agent holds a named handle, and the real credential is injected at the last hop, so it never enters the prompt, the trace or the model's memory. That also makes revocation meaningful, because the value lives in exactly one place.</p>"),
]),

"agent-identity.html": ("common questions", "What people ask about agent identity", [
 ("How should an AI agent authenticate to the tools it calls?",
  "<p>With an identity, not a shared secret. The agent needs a stable name, a recorded owner, and evidence binding that name to the workload: an OIDC token, a SPIFFE SVID, an mTLS certificate or an enclave key. A key in an environment variable proves only that the caller knows the key, which is the one thing an incident review never needs to establish.</p>"),
 ("What is agent attestation, and do we need it on day one?",
  "<p>Attestation is the evidence that a name belongs to the workload using it. You do not need it everywhere on day one, and most organisations honestly start with none nearly everywhere. What matters is that the absence is recorded rather than implied, so privileged agents with nothing behind their name show up as a list instead of a feeling.</p>"),
 ("Why keep a delegation chain instead of just an owner field?",
  "<p>Because an agent's real reach is the union of everything along the chain it acts through, not the grants attached to its own name. A one-hop field cannot show that an agent with modest permissions arrives at admin two hops away. Keep the chain ordered root first, acyclic and capped, and keep it separate from the static parent that provisioned the agent.</p>"),
 ("Should every agent action require human approval?",
  "<p>No, and demanding it is how a control gets clicked through within a week. Reserve per-action confirmation for the destructive and expensive few: a kill, a budget change, an approval grant, issuing or revoking access. Bind the signature to that exact command and its arguments so approving one action never quietly approves the next.</p>"),
 ("How do we keep API keys out of the model's context?",
  "<p>Hand the agent a handle rather than a value, and attach the real credential at the last hop before the call leaves. Anything in the context window is quotable, loggable and memorable, so a token given to the model is a token in the trace and in whatever it repeats next. Brokering also gives revocation exactly one place to act.</p>"),
]),
}


def block(kicker, heading, items):
    out = [MARK_OPEN,
           '<section class="sec" id="faq" style="padding-top:14px">',
           '  <div class="wrap">',
           '    <div class="sec-head rv">',
           f'      <div class="kicker">{kicker}</div>',
           f'      <h2>{heading}</h2>',
           '    </div>',
           '    <div class="faq rv">']
    for q, a in items:
        out.append("      <details>")
        out.append(f"        <summary>{q}</summary>")
        out.append(f'        <div class="a">{a}</div>')
        out.append("      </details>")
    out += ["    </div>", "  </div>", "</section>", MARK_CLOSE]
    return "\n".join(out)


def main():
    n = 0
    for path, (kicker, heading, items) in FAQ.items():
        p = ROOT / path
        h = p.read_text(encoding="utf-8")
        new = block(kicker, heading, items)
        if MARK_OPEN in h:
            h2 = re.sub(re.escape(MARK_OPEN) + r".*?" + re.escape(MARK_CLOSE), lambda _: new, h, flags=re.S)
        else:
            h2 = h.replace("<footer", new + "\n\n<footer", 1)
        if h2 != h:
            p.write_text(h2, encoding="utf-8")
            n += 1
        print(f"{path:28} {len(items)} questions {'written' if h2 != h else 'unchanged'}")
    print(f"\n{n} file(s) updated")


if __name__ == "__main__":
    main()
