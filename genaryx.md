<!-- https://it-rat.com/genaryx.html -->

# Genaryx, the console over the stack

> Genaryx: one browser control room over the whole agent stack, on your own box. Passkey-signed kills, WireGuard-only reach and signed evidence packs.

The seven open services each govern one plane of an agent fleet. Genaryx is the console built on top of them for companies that run real fleets. It runs on your own infrastructure and you open it in a browser: money, policy, identity, quality, crypto, memory, drills and evidence in one window, a kill switch confirmed per action by a passkey in your hand, remote reach over its own WireGuard tunnel, and Felyx - a local-first AI copilot that can read everything and touch nothing. Self-hosted on infrastructure you own, any cloud or on-prem: your plane, your data. It is Apache-2.0 like the eight services under it, and the people who wrote it are available if you want them.

### The open stack stays open.

Genaryx is Apache-2.0, like everything under it. It is the room built on top of the seven services, for teams that want one pane of glass, passkey ceremonies and an incident feed instead of seven dashboards and a terminal, and you can read every line of it before you run it. And every screenshot on this page is the real app against a live plane, not a mockup: a fictional tier-1 bank, `meridian.example`, run on real infrastructure.

## What the console adds that the stack alone does not.

You can stand up the open stack's live services yourself in one command, and plenty of teams should. Genaryx exists for the moment the fleet stops being a side project: when the person on call is not the person who built it, when an auditor asks for proof, when 2am happens.

|  | The open stack, by hand | Genaryx |
|---|---|---|
| One place to look | Per-service dashboards, curl, logs | One console, 17 live tabs over one Rust core |
| Killing a runaway | A curl with an admin key | A break-glass ceremony over a device signature the plane already verifies: a passkey, a typed reason journaled beside it |
| Reaching a private plane | SSH tunnels you babysit | Your box issues each device its own peer config, lists what holds access, and revokes one in a click; the console answers only inside that tunnel |
| On call at 2am | Laptop, VPN, luck | Your console from any browser over your own tunnel, incidents sorted worst-first, and the destructive step re-signed by the passkey in your hand |
| When something is off | You read six dashboards | Felyx explains it across planes with cited ids - and can only propose, never act |
| Proving it to an auditor | Exports from each service | One signed evidence pack: EU AI Act, SR 11-7, SOC 2 mappings built in |
| Where your data lives | Your infrastructure | Still yours: AWS, GCP, Hetzner and other clouds, or on-prem |

## One Rust core. The whole console, one live run.

The actual console against a live plane on a Hetzner box: $42,895 of governed spend this month across 86 agents and 125,897 model calls, 203 open incidents, and the runaway reconciliation batch caught and killed. The view groups nav in a left rail, keeps a right dock of whatever you pinned to watch, and drills any agent into a single 360 drawer. Try it yourself below: the live demo is the whole console on simulated data, nothing leaving your browser, and the gallery under it slides through fifteen frozen frames of that same real run, any of them opening full screen.

## An AI that reads everything and can touch nothing.

Felyx is the fleet's analyst. It answers money questions with numbers pulled by tools, chains an incident across money, identity, policy and memory into a root cause with cited ids, drafts the kill you were about to write, and annotates the page that wakes you. It is also an AI we can honestly ask you to trust, because the trust is structural, not a system prompt.

### Local first, by default

Out of the box Felyx talks to a model on your own hardware: Ollama, LM Studio, vLLM - any OpenAI-compatible endpoint on localhost or your private network. A residency gate refuses any other destination, so a sensitive install cannot leak a prompt or a number by misconfiguration.

### Cloud only if you choose it

An operator can explicitly opt into a bring-your-own-key cloud model - Anthropic or OpenRouter - per install, in config, off by default. The app's residency banner always states which mode you are in; there is no silent fallback.

### Numbers from tools, never vibes

Every figure in an answer comes from a typed read tool over the same connectors the tabs use. The model does not do arithmetic in prose, and when a plane is not configured Felyx says what it cannot see instead of inventing it.

### No signing key. Not restrained - absent.

The copilot crate has no dependency on the signing crate, and a build-time test asserts it stays that way. A proposal becomes action only through the same passkey ceremony a human uses (Touch ID, Windows Hello or a security key); the audit trail reads “human approved copilot proposal”, never “copilot did it”.

### It cannot silence an alert

The hard floor is deterministic code: an over-cap or runaway event fires immediately, before any model is called. Felyx may only add a short annotation inside a strict time budget. A slow, wrong or absent model changes nothing about whether you get alerted.

### Metered like any other agent

Felyx's own LLM calls route through TokenFuse under their own run id, so the assistant that watches your budgets has a budget: visible, cappable, killable. The thesis, dogfooded.

## Your plane stays yours. Every path in is signed.

The console reaches a client-hosted Cloud from inside your own WireGuard tunnel, so the control plane never faces the internet. Any browser on that tunnel is the whole client story: laptop at a desk, phone at 2am, same console, same ceremonies. And Felyx sits beside it with no signing key at all.

## One shell. One Rust brain. Hardware where it counts.

### One core, one shell

The browser console is the product, and it is deliberately thin: every screen is a call into one shared Rust command layer - stores, connectors, ceremonies, the graph all live in the core, never in a screen. Written once, tested once, so a command cannot mean one thing in one place and something else in another.

### Hardware signatures, shipped

Kills, budget changes and approval grants are confirmed per action with a passkey on your own device: Touch ID, Windows Hello or a security key. With no passkey enrolled the action still works and is journaled software-signed, labeled honestly.

**Q: How the ceremony works**

The console mints a challenge bound to that exact command and its exact arguments, verifies the ES256 assertion server-side, and journals which enrolled credential confirmed it, next to the typed break-glass reason. A signature over a different command, or over the same command with different arguments, does not verify.

No passkey enrolled yet? The action still works and is journaled software-signed, labeled honestly, never dressed up as hardware.

### WireGuard, but yours

Your box runs the WireGuard side and issues each device its own peer config as a QR: scan, connect, done. Inside that tunnel the console answers over HTTPS on its own name and nowhere else, and it never faces the internet.

**Q: The tunnel in detail**

The tunnel is raised by your own client, not by anything of ours. On the box itself the console is bound to loopback, so the only way in is the tunnel.

The certificate is not decoration: a passkey ceremony cannot run without one, because WebAuthn refuses both an insecure context and a bare IP as the party it binds credentials to.

Every device that holds a way in is listed, and revoking one cuts it off at the next handshake. Issuing and revoking both take a passkey, because a road into the control plane is not something a stolen session should mint quietly. SSH stays for ops; the console does not need it.

### An audit trail that proves itself

Every governance event the stack emits carries the SHA-256 of the event before it, computed over RFC 8785 canonical JSON: one file, one chain, restarts included. Tampering does not hide, it breaks the chain exactly where it happened, and `agent-conform -chain` verifies a journal in one command.

### Post-quantum, already

Evidence packs self-verify: an embedded digest plus an ML-DSA (FIPS 204) signature, the NIST post-quantum standard, so the proof you hand an auditor stays trustworthy past the next cryptographic era. And Qryx audits your fleet's own crypto against the NCSC and CNSA 2.0 migration timelines, so you know what will break before an adversary does.

### Self-hosted, your cloud or on-prem

We never run your Cloud plane or hold your data. The plane lives on infrastructure you own - AWS, GCP, Hetzner, any cloud or on-prem - reached only over WireGuard. Nothing to subpoena or breach on our side.

## Built, and proven on a live fleet.

- A laptop on the public internet opened the console over a tunnel this box issued itself, with no other route in.

- Issuing a device and revoking one each needed a touch on the operator's own authenticator, journaled `webauthn-es256`.

- Every one of those records carries the hash of the event before it, and the stack's own checker verifies the chain.

- A device-signed kill went through a real fleet, against a plane closed to the internet.

- Felyx, on a live local model, named the caught runaway and filed a capped proposal only a human could approve, on 42 agents.

**Q: What was actually run**

A laptop on the public internet imported the peer config this box issued itself, completed a handshake against the box's published UDP port, and opened the console over TLS inside that tunnel, from a machine that had no other route to it. It then enrolled a passkey and issued a second device, and that action was refused until the operator confirmed it on their own authenticator: the journal records it signed `webauthn-es256`, naming the credential they touched. Revoking a device cut it off the same way.

Every one of those records carries the hash of the event before it, and the stack's own conformance checker verifies the chain they sit in. The console has separately driven a real fleet and put a device-signed kill through it, against a plane closed to the internet.

Felyx has run against a live local model, named the caught runaway and what it burned, and filed a capped-budget proposal only a human could approve, on a live fleet of 42 agents. Every claim here has a captured run behind it.

Clone it, run it, fork it. Apache-2.0, the whole console, with no tier and no key. It comes up on infrastructure you own and it is reached over a tunnel your own box issues, which is the same on the first day as on the hundredth.

Or [run the open stack yourself in one command](https://it-rat.com/services/platform.html#run) today.

The practice this console is built for is written up separately: [AI agent governance and the runtime controls](https://it-rat.com/ai-agent-governance.html), [AI agent security](https://it-rat.com/ai-agent-security.html), and [FinOps for AI](https://it-rat.com/finops-for-ai.html).
