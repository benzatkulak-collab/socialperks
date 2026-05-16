import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "MCP Server — Social Perks for AI Agents",
  description:
    "Social Perks exposes a Model Context Protocol (MCP) server so AI agents — Claude, ChatGPT, Cursor — can manage customer-marketing campaigns autonomously.",
  openGraph: {
    title: "Social Perks · MCP-native customer marketing",
    description:
      "Plug Claude/ChatGPT/Cursor directly into your customer-marketing platform. 7 tools, streamable HTTP, tenant-scoped.",
  },
};

const TOOLS: Array<{ name: string; auth: "no" | "yes"; description: string }> = [
  // Names match the live server at /api/mcp. Tool list source of truth
  // is src/app/api/mcp/route.ts — keep this table in sync when adding
  // or renaming a tool there.
  { name: "getPricing",         auth: "no",  description: "Market-rate pricing for a marketing action (USD value + recommended perk)" },
  { name: "listActions",        auth: "no",  description: "107 marketing actions across 15 platforms" },
  { name: "getBenchmarks",      auth: "no",  description: "Industry benchmarks (engagement, conversion) by industry" },
  { name: "listCampaigns",      auth: "yes", description: "List campaigns owned by the API key's business" },
  { name: "searchInfluencers",  auth: "no",  description: "Search influencers by platform / follower count" },
  { name: "createCampaign",     auth: "yes", description: "Launch a new campaign for the API key's business" },
  { name: "submitProof",        auth: "yes", description: "Submit proof of completion for a campaign action" },
  { name: "reviewSubmission",   auth: "yes", description: "Approve or reject a pending submission" },
  { name: "listSubmissions",    auth: "yes", description: "List submissions (filterable by status, campaign)" },
  { name: "getCampaignStats",   auth: "yes", description: "Aggregate stats for a campaign — completions, conversion, spend" },
];

export default function McpDocsPage() {
  const endpoint =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "https://socialperks.app";

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text">
      <div className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-2xs uppercase tracking-wider font-mono text-brand-muted mb-3">
          Developer Docs
        </p>
        <h1 className="font-heading text-4xl italic text-brand-white font-semibold mb-3">
          MCP Server
        </h1>
        <p className="text-lg text-brand-dim mb-8">
          Social Perks ships a Model Context Protocol server so AI agents can drive customer
          marketing the same way an admin would.
        </p>

        <Card>
          <Label>Endpoint</Label>
          <Code>{endpoint}/api/mcp</Code>
          <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
            <Meta label="Transport" value="streamable-http (stateless JSON-RPC)" />
            <Meta label="Protocol" value="2025-03-26" />
            <Meta label="Auth" value="Authorization: Bearer <key>" />
            <Meta label="Anonymous" value="read-only tools only" />
          </div>
        </Card>

        <h2 className="font-heading text-2xl italic text-brand-white mt-12 mb-4">
          Quick start — Claude Desktop
        </h2>
        <Code multi>{`{
  "mcpServers": {
    "social-perks": {
      "url": "${endpoint}/api/mcp",
      "headers": {
        "Authorization": "Bearer sk_live_your_key_here"
      }
    }
  }
}`}</Code>
        <p className="text-sm text-brand-dim mt-3">
          Drop this in <code className="font-mono text-brand-cyan">~/Library/Application
          Support/Claude/claude_desktop_config.json</code>, restart Claude, and the 7 tools below
          appear in any chat.
        </p>

        <h2 className="font-heading text-2xl italic text-brand-white mt-12 mb-4">
          Tools
        </h2>
        <Card padded={false}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-2xs uppercase font-mono text-brand-muted">
                <th className="text-left px-4 py-3">Name</th>
                <th className="text-left px-4 py-3">Auth</th>
                <th className="text-left px-4 py-3">Description</th>
              </tr>
            </thead>
            <tbody>
              {TOOLS.map((t) => (
                <tr key={t.name} className="border-b border-brand-border/50">
                  <td className="px-4 py-3 font-mono text-brand-cyan">{t.name}</td>
                  <td className="px-4 py-3">
                    {t.auth === "yes" ? (
                      <span className="text-2xs font-mono uppercase text-brand-amber">required</span>
                    ) : (
                      <span className="text-2xs font-mono uppercase text-brand-muted">none</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-brand-dim">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <h2 className="font-heading text-2xl italic text-brand-white mt-12 mb-4">
          Get an API key
        </h2>
        <p className="text-brand-dim mb-3">
          Sign in, then go to{" "}
          <a className="text-brand-cyan hover:underline" href="/admin/api-keys">
            /admin/api-keys
          </a>{" "}
          and click <span className="font-mono text-brand-text">Issue</span>. The plaintext token is
          shown once.
        </p>

        <h2 className="font-heading text-2xl italic text-brand-white mt-12 mb-4">
          Why MCP-native?
        </h2>
        <p className="text-brand-dim mb-3">
          Small business owners are starting to delegate operations to AI assistants. The platforms
          those assistants use have to be addressable by agents directly — not just by humans
          clicking buttons.
        </p>
        <p className="text-brand-dim mb-3">
          Every admin workflow on Social Perks is reachable through these 7 tools. The same audit
          log records both human and agent actions. The same tenant boundaries apply.
        </p>

        <h2 className="font-heading text-2xl italic text-brand-white mt-12 mb-4">
          Listed in
        </h2>
        <ul className="text-brand-dim space-y-1">
          <li>
            ·{" "}
            <a
              className="text-brand-cyan hover:underline"
              href="https://github.com/modelcontextprotocol/registry"
              target="_blank"
              rel="noopener noreferrer"
            >
              Anthropic MCP Registry
            </a>
          </li>
          <li>
            ·{" "}
            <a className="text-brand-cyan hover:underline" href="https://smithery.ai" target="_blank" rel="noopener noreferrer">
              Smithery
            </a>
          </li>
          <li>
            ·{" "}
            <a className="text-brand-cyan hover:underline" href="https://mcp.so" target="_blank" rel="noopener noreferrer">
              MCP.so directory
            </a>
          </li>
        </ul>

        <p className="text-2xs text-brand-muted font-mono mt-16">
          v1.0.0 · protocol 2025-03-26 · streamable-http
        </p>
      </div>
    </div>
  );
}

function Card({ children, padded = true }: { children: React.ReactNode; padded?: boolean }) {
  return (
    <div className={`rounded-lg border border-brand-border bg-brand-surface/30 ${padded ? "p-5" : ""}`}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-2xs uppercase tracking-wider font-mono text-brand-muted mb-2">{children}</p>
  );
}

function Code({ children, multi = false }: { children: React.ReactNode; multi?: boolean }) {
  return (
    <pre
      className={`bg-brand-bg border border-brand-border rounded-md px-4 py-3 font-mono text-xs text-brand-cyan overflow-x-auto ${
        multi ? "whitespace-pre" : "whitespace-nowrap"
      }`}
    >
      {children}
    </pre>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-2xs uppercase font-mono text-brand-muted mb-1">{label}</p>
      <p className="text-brand-text font-mono">{value}</p>
    </div>
  );
}
