#!/usr/bin/env node
/**
 * it-rat-docs: an MCP server over the IT-RAT guides and service docs.
 *
 * Deliberately stdio, not HTTP. Our own MCP security guide argues for the
 * transport with the smaller surface where the integration is local, and
 * this one is: no listener, no port, no network trust boundary to get
 * wrong. The only thing it talks to is it-rat.com over HTTPS, to read the
 * same markdown mirrors a human can read.
 *
 * Node 18+, no dependencies.
 *
 *   node mcp/it-rat-docs.mjs                 # speaks MCP on stdio
 *   IT_RAT_SITE=http://localhost:4174 node mcp/it-rat-docs.mjs
 *
 * Wire it into a client the usual way, for example in Claude Desktop:
 *   { "mcpServers": { "it-rat-docs": { "command": "node",
 *     "args": ["/absolute/path/to/mcp/it-rat-docs.mjs"] } } }
 */

const SITE = (process.env.IT_RAT_SITE || "https://it-rat.com").replace(/\/$/, "");
const NAME = "it-rat-docs";
const VERSION = "0.1.0";
const TTL_MS = 10 * 60 * 1000;

const cache = new Map();

async function fetchText(url) {
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.body;
  const res = await fetch(url, { headers: { "user-agent": `${NAME}/${VERSION}` } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  const body = await res.text();
  cache.set(url, { at: Date.now(), body });
  return body;
}

/* The published index carries absolute URLs. Rebase them onto whatever site
   this instance was pointed at, so IT_RAT_SITE works for the content too and
   not only for the index itself. */
async function index() {
  const idx = JSON.parse(await fetchText(`${SITE}/mcp-index.json`));
  const home = String(idx.site || "").replace(/\/$/, "");
  if (home && home !== SITE) {
    const rebase = (u) => (typeof u === "string" && u.startsWith(home) ? SITE + u.slice(home.length) : u);
    idx.pages = (idx.pages || []).map((p) => ({ ...p, url: rebase(p.url), markdown: rebase(p.markdown) }));
  }
  return idx;
}

/* ---- tools ---- */

const TOOLS = [
  {
    name: "list_pages",
    description:
      "List every IT-RAT page available as markdown: the guides on running AI agents " +
      "(governance, FinOps for AI, agent security, MCP security, observability vs governance) " +
      "and the eight services of the open-source agent-governance stack. Returns titles, " +
      "URLs and one-line descriptions.",
    inputSchema: {
      type: "object",
      properties: {
        kind: { type: "string", enum: ["guide", "service", "page", "all"], description: "filter by kind, default all" },
      },
    },
  },
  {
    name: "get_page",
    description:
      "Read one IT-RAT page as markdown. Accepts a title, a slug such as 'mcp-security' " +
      "or 'tokenfuse', or a full URL from list_pages.",
    inputSchema: {
      type: "object",
      properties: { page: { type: "string", description: "title, slug or URL" } },
      required: ["page"],
    },
  },
  {
    name: "search_docs",
    description:
      "Search the IT-RAT guides and service docs for a phrase and return the matching " +
      "passages with the page they came from. Use this to answer questions about agent " +
      "governance, LLM cost control, agent security, MCP security or any of the services.",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "words or a phrase to look for" },
        limit: { type: "integer", description: "maximum passages to return, default 8" },
      },
      required: ["query"],
    },
  },
];

const slug = (u) => u.replace(/.*\//, "").replace(/\.(md|html)$/, "");

async function resolvePage(needle) {
  const idx = await index();
  const want = String(needle).trim().toLowerCase();
  const hit =
    idx.pages.find((p) => p.markdown.toLowerCase() === want || p.url.toLowerCase() === want) ||
    idx.pages.find((p) => slug(p.markdown).toLowerCase() === want) ||
    idx.pages.find((p) => p.title.toLowerCase() === want) ||
    idx.pages.find((p) => p.title.toLowerCase().includes(want)) ||
    idx.pages.find((p) => slug(p.markdown).toLowerCase().includes(want));
  if (!hit) {
    const names = idx.pages.map((p) => slug(p.markdown)).join(", ");
    throw new Error(`no page matches "${needle}". Available: ${names}`);
  }
  return hit;
}

async function call(name, args = {}) {
  if (name === "list_pages") {
    const idx = await index();
    const kind = args.kind && args.kind !== "all" ? args.kind : null;
    const pages = idx.pages.filter((p) => !kind || p.kind === kind);
    return pages
      .map((p) => `- ${p.title} [${p.kind}]\n  ${p.markdown}\n  ${p.description}`)
      .join("\n");
  }

  if (name === "get_page") {
    const page = await resolvePage(args.page);
    return await fetchText(page.markdown);
  }

  if (name === "search_docs") {
    const q = String(args.query || "").trim();
    if (!q) throw new Error("query is empty");
    const limit = Math.min(Math.max(parseInt(args.limit ?? 8, 10) || 8, 1), 25);
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const idx = await index();
    const found = [];
    for (const page of idx.pages) {
      const md = await fetchText(page.markdown);
      for (const para of md.split(/\n{2,}/)) {
        const hay = para.toLowerCase();
        const score = terms.reduce((n, t) => n + (hay.includes(t) ? 1 : 0), 0);
        if (score === terms.length && para.trim().length > 40) {
          found.push({ score: score + (hay.includes(q.toLowerCase()) ? 1 : 0), page, para: para.trim() });
        }
      }
    }
    if (!found.length) return `Nothing in the IT-RAT docs matches "${q}".`;
    found.sort((a, b) => b.score - a.score);
    return found
      .slice(0, limit)
      .map((f) => `## ${f.page.title}\n${f.page.url}\n\n${f.para}`)
      .join("\n\n---\n\n");
  }

  throw new Error(`unknown tool: ${name}`);
}

/* ---- the protocol, spoken plainly over stdio ---- */

function send(msg) {
  process.stdout.write(JSON.stringify(msg) + "\n");
}

function reply(id, result) {
  if (id !== undefined && id !== null) send({ jsonrpc: "2.0", id, result });
}

function fail(id, message) {
  if (id !== undefined && id !== null) send({ jsonrpc: "2.0", id, error: { code: -32000, message } });
}

async function handle(req) {
  const { id, method, params } = req;
  switch (method) {
    case "initialize":
      return reply(id, {
        protocolVersion: params?.protocolVersion || "2025-06-18",
        capabilities: { tools: {} },
        serverInfo: { name: NAME, version: VERSION },
        instructions:
          "Documentation for the IT-RAT agent-governance stack and its guides on running " +
          "AI agents in production. Start with search_docs for a question, list_pages to " +
          "see what exists, get_page to read one in full.",
      });
    case "notifications/initialized":
      return;
    case "ping":
      return reply(id, {});
    case "tools/list":
      return reply(id, { tools: TOOLS });
    case "tools/call":
      try {
        const text = await call(params?.name, params?.arguments || {});
        return reply(id, { content: [{ type: "text", text }] });
      } catch (e) {
        return reply(id, { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true });
      }
    default:
      return fail(id, `unsupported method: ${method}`);
  }
}

let buf = "";
let inFlight = 0;
let closed = false;

/* A request can be mid-fetch when stdin closes; exiting there would drop the
   answer on the floor, which is exactly what a piped smoke test looks like. */
function maybeExit() {
  if (closed && inFlight === 0) process.exit(0);
}

process.stdin.setEncoding("utf8");
process.stdin.on("data", (chunk) => {
  buf += chunk;
  let nl;
  while ((nl = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, nl).trim();
    buf = buf.slice(nl + 1);
    if (!line) continue;
    let req;
    try {
      req = JSON.parse(line);
    } catch {
      continue; // a malformed line is not worth killing the session over
    }
    inFlight++;
    handle(req)
      .catch((e) => fail(req.id, e.message))
      .finally(() => {
        inFlight--;
        maybeExit();
      });
  }
});
process.stdin.on("end", () => {
  closed = true;
  maybeExit();
});
