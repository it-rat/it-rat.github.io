/**
 * The same docs server, over Streamable HTTP, for clients that cannot spawn a
 * local process. Same three tools, same content, different transport.
 *
 * Not deployed by default, and that is deliberate: stdio is the smaller
 * surface and costs nothing to run, so the remote endpoint is opt-in. When it
 * is wanted:
 *
 *   npx wrangler deploy            # from mcp/, with wrangler.toml beside it
 *
 * It fits inside the Cloudflare Workers free plan at this site's traffic;
 * nothing here enables a paid feature.
 */

const SITE = "https://it-rat.com";
const NAME = "it-rat-docs";
const VERSION = "0.1.0";

const TOOLS = [
  {
    name: "list_pages",
    description:
      "List every IT-RAT page available as markdown: the guides on running AI agents " +
      "(governance, FinOps for AI, agent security, MCP security, observability vs governance) " +
      "and the eight services of the open-source agent-governance stack.",
    inputSchema: {
      type: "object",
      properties: { kind: { type: "string", enum: ["guide", "service", "page", "all"] } },
    },
  },
  {
    name: "get_page",
    description: "Read one IT-RAT page as markdown. Accepts a title, a slug such as 'mcp-security', or a URL.",
    inputSchema: { type: "object", properties: { page: { type: "string" } }, required: ["page"] },
  },
  {
    name: "search_docs",
    description:
      "Search the IT-RAT guides and service docs for a phrase and return the matching passages " +
      "with the page they came from.",
    inputSchema: {
      type: "object",
      properties: { query: { type: "string" }, limit: { type: "integer" } },
      required: ["query"],
    },
  },
];

const slug = (u) => u.replace(/.*\//, "").replace(/\.(md|html)$/, "");

async function get(url) {
  const res = await fetch(url, { cf: { cacheTtl: 600, cacheEverything: true } });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return await res.text();
}

const index = async () => JSON.parse(await get(`${SITE}/mcp-index.json`));

async function call(name, args = {}) {
  const idx = await index();

  if (name === "list_pages") {
    const kind = args.kind && args.kind !== "all" ? args.kind : null;
    return idx.pages
      .filter((p) => !kind || p.kind === kind)
      .map((p) => `- ${p.title} [${p.kind}]\n  ${p.markdown}\n  ${p.description}`)
      .join("\n");
  }

  if (name === "get_page") {
    const want = String(args.page || "").trim().toLowerCase();
    const hit =
      idx.pages.find((p) => p.markdown.toLowerCase() === want || p.url.toLowerCase() === want) ||
      idx.pages.find((p) => slug(p.markdown).toLowerCase() === want) ||
      idx.pages.find((p) => p.title.toLowerCase().includes(want)) ||
      idx.pages.find((p) => slug(p.markdown).toLowerCase().includes(want));
    if (!hit) throw new Error(`no page matches "${args.page}"`);
    return await get(hit.markdown);
  }

  if (name === "search_docs") {
    const q = String(args.query || "").trim();
    if (!q) throw new Error("query is empty");
    const limit = Math.min(Math.max(parseInt(args.limit ?? 8, 10) || 8, 1), 25);
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    const found = [];
    for (const page of idx.pages) {
      const md = await get(page.markdown);
      for (const para of md.split(/\n{2,}/)) {
        const hay = para.toLowerCase();
        if (terms.every((t) => hay.includes(t)) && para.trim().length > 40) {
          found.push({ score: hay.includes(q.toLowerCase()) ? 2 : 1, page, para: para.trim() });
        }
      }
    }
    if (!found.length) return `Nothing in the IT-RAT docs matches "${q}".`;
    found.sort((a, b) => b.score - a.score);
    return found.slice(0, limit).map((f) => `## ${f.page.title}\n${f.page.url}\n\n${f.para}`).join("\n\n---\n\n");
  }

  throw new Error(`unknown tool: ${name}`);
}

async function rpc(req) {
  const { id, method, params } = req;
  const ok = (result) => ({ jsonrpc: "2.0", id, result });

  if (method === "initialize")
    return ok({
      protocolVersion: params?.protocolVersion || "2025-06-18",
      capabilities: { tools: {} },
      serverInfo: { name: NAME, version: VERSION },
      instructions:
        "Documentation for the IT-RAT agent-governance stack and its guides on running AI agents in production.",
    });
  if (method === "notifications/initialized") return null;
  if (method === "ping") return ok({});
  if (method === "tools/list") return ok({ tools: TOOLS });
  if (method === "tools/call") {
    try {
      return ok({ content: [{ type: "text", text: await call(params?.name, params?.arguments || {}) }] });
    } catch (e) {
      return ok({ content: [{ type: "text", text: `Error: ${e.message}` }], isError: true });
    }
  }
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `unsupported method: ${method}` } };
}

export default {
  async fetch(request) {
    const cors = {
      "access-control-allow-origin": "*",
      "access-control-allow-headers": "content-type, mcp-protocol-version",
      "access-control-allow-methods": "POST, OPTIONS",
    };
    if (request.method === "OPTIONS") return new Response(null, { headers: cors });
    if (request.method !== "POST")
      return new Response("This endpoint speaks MCP over Streamable HTTP. POST a JSON-RPC request.\n", {
        status: 405,
        headers: { "content-type": "text/plain", ...cors },
      });

    let body;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "parse error" } }), {
        status: 400,
        headers: { "content-type": "application/json", ...cors },
      });
    }

    const batch = Array.isArray(body) ? body : [body];
    const out = (await Promise.all(batch.map(rpc))).filter(Boolean);
    if (!out.length) return new Response(null, { status: 202, headers: cors });
    return new Response(JSON.stringify(Array.isArray(body) ? out : out[0]), {
      headers: { "content-type": "application/json", ...cors },
    });
  },
};
