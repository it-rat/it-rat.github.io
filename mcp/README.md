# it-rat-docs: this site, as an MCP server

The guides and service docs on [it-rat.com](https://it-rat.com), exposed as
three MCP tools so an agent can look something up instead of being handed a
web page to parse.

| Tool | What it does |
|---|---|
| `search_docs` | search every guide and service page for a phrase, returns the matching passages with their source |
| `get_page` | read one page as markdown, by slug, title or URL |
| `list_pages` | list what exists, optionally filtered to guides or services |

Everything it serves is the same markdown a human can fetch: each page on the
site has a mirror at the same path with a `.md` extension, indexed in
[`/mcp-index.json`](https://it-rat.com/mcp-index.json) and
[`/llms.txt`](https://it-rat.com/llms.txt).

## Run it (stdio, no listener)

Node 18 or newer, no dependencies:

```bash
node mcp/it-rat-docs.mjs
```

In Claude Desktop, Claude Code or any other MCP client:

```json
{
  "mcpServers": {
    "it-rat-docs": {
      "command": "node",
      "args": ["/absolute/path/to/it-rat/mcp/it-rat-docs.mjs"]
    }
  }
}
```

Point it at a local copy of the site while editing:

```bash
IT_RAT_SITE=http://localhost:4174 node mcp/it-rat-docs.mjs
```

## Why stdio and not a URL

Our own [MCP security guide](https://it-rat.com/mcp-security.html) argues for
the transport with the smaller surface where the integration is local, and
this one is local: a docs lookup on someone's laptop. Over stdio there is no
listener, no port and no network trust boundary to get wrong. The only thing
the process talks to is `it-rat.com` over HTTPS.

`worker.mjs` is the same three tools over Streamable HTTP, for clients that
cannot spawn a process. It is not deployed: it exists so the remote endpoint
is a decision rather than a project. If it is ever wanted, `npx wrangler
deploy` from this directory publishes it, and at this site's traffic it sits
inside the Cloudflare Workers free plan.

## What it is not

It reads published documentation and nothing else. There is no write path, no
credential, no telemetry, and it never touches the services the docs describe.
