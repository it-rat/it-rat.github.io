<!-- https://it-rat.com/services/engram.html -->

# Engram, the knowledge plane

> Embeddable agent memory in one SQLite file: bitemporal facts, hybrid BM25 and vector recall, why() provenance and GDPR forget. No server, no API key to start.

Engram is an embeddable memory in one SQLite file. It stores raw episodes, distills them into facts with confidence scores, records when each fact was true, and answers why() for every belief it holds, with the episodes it came from.

## Watch five episodes become ten facts.

A simulation, but not a fantasy: it replays the shape of the live validation run, the first time Engram's reflection pipeline processed real Claude output instead of fixtures. Five episodes go in, ten subject-predicate-object facts come out, each scored and traceable to its source.

## One file on disk. One optional network call.

Your agent calls observe() and recall() against one .engram file: SQLite plus sqlite-vec, in-process, nothing between the agent and its memory. The only part that ever touches a network is reflect(), through a pluggable LLM adapter, and even that can route through TokenFuse.

## Not a log of text. Beliefs with receipts.

### Single file, embeddable

One .engram file on SQLite plus sqlite-vec: no server, no Docker, no config file. Writes land in about 4 ms because no LLM sits in the write path.

### reflect() distills facts

A background reflection loop groups recent episodes and asks an LLM to extract subject-predicate-object facts, each with a confidence score. Every fact keeps a why() chain.

### Facts that know their dates

Every fact carries two timelines: when it was true in reality, and when the system learned it. When Ivan changes jobs the old fact is closed with an end date, never deleted.

### Three ways to recall

Cosine vectors for meaning, BM25 blended with vectors when exact terms matter, and spreading activation that walks the entity graph.

### The plane that remembers.

Engram is the knowledge plane of the stack. Every memory_written, reflection_run, contradiction_found and memory_forgotten goes out as an agent-event on the same NDJSON bus [Idryx](https://it-rat.com/idryx.html) correlates into the identity graph.

The PyPI name is engdbram (the plain name was taken); the import stays `from engram import Engram`.

## Not released yet, and off by default.

- Provenance on every observation (user, tool or external), returned by recall and reported by why(), is on main; the last release is v2.4.1.

- reflect() is deliberately not exposed to MCP clients.

- Agent events are opt-in and off by default.

### The Engram guide

## What a memory has to do that similarity search cannot

**Q: Does it need a server, a container or an API key?**
None of the three to write a memory. It is one `.engram` file on SQLite plus sqlite-vec, in-process, installed with pip. A model only enters the picture when you ask for `reflect()`, and even that call can be pointed at a local model or routed through [TokenFuse](https://it-rat.com/tokenfuse.html) so thinking has a budget too.

**Q: Can I delete everything about one person?**
Yes, and the cascade is the point. Erasing an entity removes the episodes about them, the facts derived from those episodes, and the graph edges that made them findable, and reports how many of each it deleted. That erasure reaches every agent in a shared store on purpose, because the request is about the person. What one agent cannot do is erase another agent's episodes by id: `forget()` is agent-scoped.

**Q: Does it work with Claude Desktop, Claude Code or Cursor?**
Yes, over MCP on stdio, so there is no network listener and no port to guard. Those clients get remember, recall, why and forget against the same store with no integration code.
