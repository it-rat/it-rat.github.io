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
  "<p>Seven services are Apache-2.0 and stay that way, source on <a href=\"https://github.com/TAIPANBOX\" target=\"_blank\" rel=\"noopener\">GitHub</a>: TokenFuse, Wardryx, Idryx, Engram, Qryx, Verdryx and Mockryx, plus the shared <a href=\"services/platform.html\">contract</a> under them.</p>"
  "<p><a href=\"enterprise.html\">Genaryx</a>, the console over all of them, is the one paid room, and it is deployed with us on your own infrastructure.</p>"),
 ("Do you host any of this, or see our data?",
  "<p>No. Every plane runs on infrastructure you own: AWS, GCP, Hetzner, any cloud or on-prem. We never run your control plane, hold your keys or store your traffic, so there is nothing on our side to subpoena or breach.</p>"),
 ("What does it cost to try?",
  "<p>The open services cost nothing and need no account. One command builds and starts the long-running ones locally: see <a href=\"services/platform.html#run\">run the live stack locally</a>. The four that are libraries and CLIs each carry a one-line try-it on their own page.</p>"),
 ("How does an engagement work?",
  "<p>A short, honest call first; if we are not the right fit we say so. Then an assessment on your real estate, identities, spend paths and agent surfaces, and then hands-on build with your team until they run it without us. We leave runbooks rather than a dependency.</p>"),
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
