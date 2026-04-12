import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Developers — Social Perks",
  description:
    "Build with Social Perks. API-first platform for social media marketing automation. Full REST API, TypeScript SDK, Python SDK, MCP support, and webhook integrations.",
  openGraph: {
    title: "Developers — Social Perks",
    description:
      "API-first platform for social media marketing. SDKs, webhooks, and agent-ready endpoints.",
  },
};

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

const ENDPOINTS = [
  {
    category: "Authentication",
    routes: [
      { method: "GET", path: "/api/v1/auth", description: "Validate current session (Bearer token)" },
      { method: "POST", path: "/api/v1/auth", description: "Login, signup, logout, refresh, or reset password" },
    ],
  },
  {
    category: "Campaigns",
    routes: [
      { method: "GET", path: "/api/v1/campaigns", description: "List campaigns with filters and pagination" },
      { method: "POST", path: "/api/v1/campaigns", description: "Create and launch a new campaign" },
      { method: "PUT", path: "/api/v1/campaigns", description: "Update campaign or change lifecycle state" },
    ],
  },
  {
    category: "Submissions",
    routes: [
      { method: "GET", path: "/api/v1/submissions", description: "List submissions with filters" },
      { method: "POST", path: "/api/v1/submissions", description: "Create submission with proof" },
      { method: "POST", path: "/api/v1/submissions/review", description: "Approve or reject a submission" },
    ],
  },
  {
    category: "AI (Backend-Only)",
    routes: [
      { method: "POST", path: "/api/v1/ai/generate", description: "Generate campaign suggestions" },
      { method: "POST", path: "/api/v1/ai/recommend", description: "Optimization recommendations" },
      { method: "POST", path: "/api/v1/ai/review", description: "AI submission review pipeline" },
      { method: "POST", path: "/api/v1/ai/campaign-agent", description: "Full AI marketing plan" },
      { method: "POST", path: "/api/v1/ai/quick-start", description: "Quick-start single recommendation" },
    ],
  },
  {
    category: "Perk Programs",
    routes: [
      { method: "GET", path: "/api/v1/programs", description: "List perk programs" },
      { method: "POST", path: "/api/v1/programs", description: "Create a perk program" },
      { method: "GET", path: "/api/v1/programs/:id", description: "Get program details" },
      { method: "PUT", path: "/api/v1/programs/:id", description: "Update a program" },
      { method: "DELETE", path: "/api/v1/programs/:id", description: "End a program" },
      { method: "GET", path: "/api/v1/programs/:id/progress", description: "Member progress tracking" },
      { method: "POST", path: "/api/v1/programs/:id/submit", description: "Submit an action" },
      { method: "GET", path: "/api/v1/programs/:id/cashback", description: "List payouts" },
      { method: "POST", path: "/api/v1/programs/:id/cashback", description: "Request or manage cashback" },
      { method: "GET", path: "/api/v1/programs/:id/members", description: "List enrolled members" },
      { method: "POST", path: "/api/v1/programs/:id/members", description: "Enroll a member" },
    ],
  },
  {
    category: "Exchange",
    routes: [
      { method: "GET", path: "/api/v1/exchange/opportunities", description: "Market opportunities (public)" },
      { method: "GET", path: "/api/v1/exchange/market", description: "Real-time market data (public)" },
      { method: "GET", path: "/api/v1/exchange/orders", description: "List orders" },
      { method: "POST", path: "/api/v1/exchange/orders", description: "Place buy/sell order" },
      { method: "GET", path: "/api/v1/exchange/trades", description: "List trades" },
      { method: "POST", path: "/api/v1/exchange/trades", description: "Trade lifecycle actions" },
      { method: "POST", path: "/api/v1/exchange/enroll", description: "Agent auto-enrollment" },
    ],
  },
  {
    category: "Billing",
    routes: [
      { method: "POST", path: "/api/v1/billing", description: "Subscription management" },
      { method: "POST", path: "/api/v1/billing/webhook", description: "Stripe webhook handler" },
    ],
  },
  {
    category: "Reference Data",
    routes: [
      { method: "GET", path: "/api/v1/pricing", description: "Pricing oracle (public, cached)" },
      { method: "GET", path: "/api/v1/actions", description: "Action library — 107 marketing actions" },
      { method: "GET", path: "/api/v1/benchmarks", description: "Industry benchmarks (public, cached)" },
      { method: "GET", path: "/api/v1/influencers", description: "Search influencers" },
      { method: "POST", path: "/api/v1/influencers", description: "Register an influencer" },
      { method: "GET", path: "/api/v1/recommendations", description: "ML-powered recommendations" },
      { method: "GET", path: "/api/v1/legal", description: "Legal compliance briefings" },
    ],
  },
  {
    category: "Infrastructure",
    routes: [
      { method: "GET", path: "/api/v1/events", description: "SSE real-time event stream" },
      { method: "GET", path: "/api/v1/health", description: "Health check" },
      { method: "GET", path: "/api/v1/docs", description: "OpenAPI 3.1 specification" },
      { method: "GET", path: "/api/v1/mcp", description: "MCP server definition" },
      { method: "POST", path: "/api/v1/oauth/connect", description: "Start OAuth flow" },
      { method: "GET", path: "/api/v1/oauth/:platform", description: "OAuth callback" },
      { method: "POST", path: "/api/v1/verification/webhook", description: "Platform webhook receiver" },
    ],
  },
] as const;

const RATE_LIMITS = [
  { tier: "Strict", limit: "5 req/min", use: "Auth, password reset", color: "text-brand-red" },
  { tier: "Standard", limit: "30 req/min", use: "Authenticated API calls", color: "text-brand-amber" },
  { tier: "Relaxed", limit: "60 req/min", use: "Read-only endpoints", color: "text-brand-cyan" },
  { tier: "Public", limit: "120 req/min", use: "Public data (pricing, actions, benchmarks)", color: "text-brand-green" },
] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function MethodBadge({ method }: { method: string }) {
  const colors: Record<string, string> = {
    GET: "bg-green-400/15 text-green-400 border-green-400/25",
    POST: "bg-cyan-400/15 text-cyan-400 border-cyan-400/25",
    PUT: "bg-amber-400/15 text-amber-400 border-amber-400/25",
    DELETE: "bg-red-400/15 text-red-400 border-red-400/25",
  };
  return (
    <span
      className={`inline-block w-16 text-center text-xs font-mono font-semibold px-2 py-0.5 rounded border ${colors[method] ?? "bg-neutral-800 text-neutral-300 border-neutral-700"}`}
    >
      {method}
    </span>
  );
}

function CodeBlock({ title, language, children }: { title?: string; language: string; children: string }) {
  return (
    <div className="rounded-lg border border-brand-border overflow-hidden">
      {title && (
        <div className="px-4 py-2 bg-brand-elevated border-b border-brand-border flex items-center gap-2">
          <span className="text-xs font-mono text-brand-dim">{language}</span>
          <span className="text-xs text-brand-muted ml-auto">{title}</span>
        </div>
      )}
      <pre className="p-4 bg-brand-surface overflow-x-auto text-sm leading-relaxed">
        <code className="font-mono text-brand-text">{children}</code>
      </pre>
    </div>
  );
}

function SectionAnchor({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2 id={id} className="scroll-mt-24 mb-6">
      <a href={`#${id}`} className="hover:text-brand-cyan transition-colors">
        {children}
      </a>
    </h2>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function DevelopersPage() {
  return (
    <div className="min-h-screen bg-brand-bg">
      {/* ─── Hero ─────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden border-b border-brand-border">
        <div className="absolute inset-0 gradient-mesh opacity-60" />
        <div className="relative max-w-6xl mx-auto px-6 py-24 md:py-32">
          <p className="text-brand-cyan font-mono text-sm tracking-widest uppercase mb-4">
            Developer Hub
          </p>
          <h1 className="mb-6">Build with Social Perks</h1>
          <p className="text-xl text-brand-dim max-w-2xl leading-relaxed">
            API-first platform for social media marketing automation. 35+ REST
            endpoints, real-time events, AI campaign generation, and
            agent-ready infrastructure.
          </p>
          <nav className="mt-10 flex flex-wrap gap-3" aria-label="Quick links">
            <a
              href="#quick-start"
              className="px-4 py-2 rounded-lg bg-brand-cyan/10 border border-brand-cyan/25 text-brand-cyan text-sm font-medium hover:bg-brand-cyan/20 transition-colors"
            >
              Quick Start
            </a>
            <a
              href="#endpoints"
              className="px-4 py-2 rounded-lg bg-brand-elevated border border-brand-border text-brand-text text-sm font-medium hover:border-brand-border-hover transition-colors"
            >
              API Reference
            </a>
            <a
              href="#sdks"
              className="px-4 py-2 rounded-lg bg-brand-elevated border border-brand-border text-brand-text text-sm font-medium hover:border-brand-border-hover transition-colors"
            >
              SDKs
            </a>
            <a
              href="#webhooks"
              className="px-4 py-2 rounded-lg bg-brand-elevated border border-brand-border text-brand-text text-sm font-medium hover:border-brand-border-hover transition-colors"
            >
              Webhooks
            </a>
            <a
              href="#rate-limits"
              className="px-4 py-2 rounded-lg bg-brand-elevated border border-brand-border text-brand-text text-sm font-medium hover:border-brand-border-hover transition-colors"
            >
              Rate Limits
            </a>
          </nav>
        </div>
      </header>

      {/* ─── Content ──────────────────────────────────────────────────── */}
      <main className="max-w-6xl mx-auto px-6 py-16 space-y-20">
        {/* Quick Start */}
        <section id="quick-start" aria-labelledby="quick-start-heading">
          <SectionAnchor id="quick-start-heading">Quick Start</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            Get up and running in three steps. No credit card required for the
            free tier.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Step 1 */}
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface hover:border-brand-cyan/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-mono text-sm font-bold mb-4">
                1
              </div>
              <h3 className="text-lg mb-2">Get your API key</h3>
              <p className="text-sm text-brand-dim leading-relaxed">
                Sign up and generate an API key from your dashboard, or
                authenticate via <code className="text-brand-cyan">POST /api/v1/auth</code> to
                receive a Bearer token.
              </p>
            </div>

            {/* Step 2 */}
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface hover:border-brand-cyan/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-mono text-sm font-bold mb-4">
                2
              </div>
              <h3 className="text-lg mb-2">Make your first request</h3>
              <p className="text-sm text-brand-dim leading-relaxed">
                Call any endpoint with your token. Try{" "}
                <code className="text-brand-cyan">GET /api/v1/campaigns</code>{" "}
                to list active campaigns or{" "}
                <code className="text-brand-cyan">GET /api/v1/actions</code> to
                browse the 107 marketing actions.
              </p>
            </div>

            {/* Step 3 */}
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface hover:border-brand-cyan/20 transition-colors">
              <div className="w-8 h-8 rounded-full bg-brand-cyan/15 text-brand-cyan flex items-center justify-center font-mono text-sm font-bold mb-4">
                3
              </div>
              <h3 className="text-lg mb-2">Handle the response</h3>
              <p className="text-sm text-brand-dim leading-relaxed">
                Every response follows a consistent{" "}
                <code className="text-brand-cyan">{"{ success, data }"}</code>{" "}
                envelope. Errors include a machine-readable{" "}
                <code className="text-brand-cyan">code</code> and a
                human-readable <code className="text-brand-cyan">message</code>.
              </p>
            </div>
          </div>
        </section>

        {/* Authentication */}
        <section id="authentication" aria-labelledby="auth-heading">
          <SectionAnchor id="auth-heading">Authentication</SectionAnchor>
          <p className="text-brand-dim mb-6 max-w-2xl">
            Social Perks supports two authentication methods. Use whichever
            fits your use case.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-3 text-brand-cyan">Bearer Token (JWT)</h4>
              <p className="text-sm text-brand-dim mb-4 leading-relaxed">
                Authenticate via <code>POST /api/v1/auth</code> with email and
                password. The response includes an <code>accessToken</code> and
                a <code>refreshToken</code>. Pass the access token in the
                Authorization header.
              </p>
              <CodeBlock language="bash" title="Login">
{`curl -X POST https://socialperks.io/api/v1/auth \\
  -H "Content-Type: application/json" \\
  -d '{
    "action": "login",
    "email": "you@example.com",
    "password": "your-password"
  }'`}
              </CodeBlock>
            </div>

            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-3 text-brand-purple">API Key</h4>
              <p className="text-sm text-brand-dim mb-4 leading-relaxed">
                Generate an API key from your business dashboard. Pass it via
                the <code>X-API-Key</code> header or as a{" "}
                <code>Bearer</code> token. API keys are scoped to a single
                business and never expire until rotated.
              </p>
              <CodeBlock language="bash" title="Using API Key">
{`curl https://socialperks.io/api/v1/campaigns \\
  -H "Authorization: Bearer sk_live_abc123..."

# or

curl https://socialperks.io/api/v1/campaigns \\
  -H "X-API-Key: sk_live_abc123..."`}
              </CodeBlock>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-brand-cyan/5 border border-brand-cyan/15">
            <p className="text-sm text-brand-dim">
              <strong className="text-brand-cyan">Response format:</strong>{" "}
              All responses include <code className="text-brand-cyan">X-Request-Id</code> and{" "}
              <code className="text-brand-cyan">X-Response-Time</code> headers for tracing. Rate
              limit headers (<code>X-RateLimit-Limit</code>, <code>X-RateLimit-Remaining</code>,{" "}
              <code>X-RateLimit-Reset</code>) are included on every response.
            </p>
          </div>
        </section>

        {/* API Endpoints Table */}
        <section id="endpoints" aria-labelledby="endpoints-heading">
          <SectionAnchor id="endpoints-heading">API Endpoints</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            35+ RESTful endpoints organized by domain. All routes live under{" "}
            <code className="text-brand-cyan">/api/v1</code>. The full OpenAPI
            3.1 spec is available at{" "}
            <Link href="/api/v1/docs" className="text-brand-cyan hover:underline">
              /api/v1/docs
            </Link>
            .
          </p>

          <div className="space-y-8">
            {ENDPOINTS.map((group) => (
              <div key={group.category}>
                <h3 className="text-lg mb-3 text-brand-white">{group.category}</h3>
                <div className="rounded-lg border border-brand-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-brand-elevated text-brand-muted text-left">
                        <th className="px-4 py-2 font-medium w-20">Method</th>
                        <th className="px-4 py-2 font-medium font-mono">Path</th>
                        <th className="px-4 py-2 font-medium hidden md:table-cell">Description</th>
                      </tr>
                    </thead>
                    <tbody>
                      {group.routes.map((route) => (
                        <tr
                          key={`${route.method}-${route.path}`}
                          className="border-t border-brand-border hover:bg-brand-elevated/50 transition-colors"
                        >
                          <td className="px-4 py-2.5">
                            <MethodBadge method={route.method} />
                          </td>
                          <td className="px-4 py-2.5 font-mono text-brand-text">
                            {route.path}
                          </td>
                          <td className="px-4 py-2.5 text-brand-dim hidden md:table-cell">
                            {route.description}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Examples */}
        <section id="examples" aria-labelledby="examples-heading">
          <SectionAnchor id="examples-heading">Example Requests</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            Common operations with curl. Replace <code>$TOKEN</code> with your
            Bearer token or API key.
          </p>

          <div className="space-y-8">
            <div>
              <h3 className="text-lg mb-3">List active campaigns</h3>
              <CodeBlock language="bash" title="GET /api/v1/campaigns">
{`curl "https://socialperks.io/api/v1/campaigns?state=active&page=1&perPage=10" \\
  -H "Authorization: Bearer $TOKEN"`}
              </CodeBlock>
              <div className="mt-3">
                <CodeBlock language="json" title="Response">
{`{
  "success": true,
  "data": {
    "items": [
      {
        "id": "camp_abc123",
        "name": "Summer Review Drive",
        "state": "active",
        "platform": "google",
        "actionType": "review",
        "reward": { "type": "percentage", "value": 15 },
        "createdAt": "2026-03-01T00:00:00Z"
      }
    ],
    "pagination": { "page": 1, "perPage": 10, "total": 42, "totalPages": 5 }
  }
}`}
                </CodeBlock>
              </div>
            </div>

            <div>
              <h3 className="text-lg mb-3">Create a campaign</h3>
              <CodeBlock language="bash" title="POST /api/v1/campaigns">
{`curl -X POST https://socialperks.io/api/v1/campaigns \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Instagram Story Shoutout",
    "platform": "instagram",
    "actionType": "story",
    "reward": { "type": "fixed", "value": 5.00 },
    "requirements": {
      "minFollowers": 500,
      "hashtags": ["#socialperks", "#ad"]
    }
  }'`}
              </CodeBlock>
            </div>

            <div>
              <h3 className="text-lg mb-3">Submit proof of action</h3>
              <CodeBlock language="bash" title="POST /api/v1/submissions">
{`curl -X POST https://socialperks.io/api/v1/submissions \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "campaignId": "camp_abc123",
    "proofUrl": "https://instagram.com/p/abc123",
    "proofType": "url",
    "notes": "Posted story with required hashtags"
  }'`}
              </CodeBlock>
            </div>

            <div>
              <h3 className="text-lg mb-3">Get AI recommendations</h3>
              <CodeBlock language="bash" title="POST /api/v1/ai/recommend">
{`curl -X POST https://socialperks.io/api/v1/ai/recommend \\
  -H "Authorization: Bearer $TOKEN" \\
  -H "Content-Type: application/json" \\
  -d '{
    "businessId": "biz_xyz789",
    "industry": "food_beverage",
    "goals": ["increase_reviews", "social_engagement"]
  }'`}
              </CodeBlock>
            </div>
          </div>
        </section>

        {/* SDKs */}
        <section id="sdks" aria-labelledby="sdks-heading">
          <SectionAnchor id="sdks-heading">SDKs</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            Official client libraries with full type safety and built-in retry
            logic.
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-cyan-400/15 flex items-center justify-center">
                  <span className="font-mono text-brand-cyan text-sm font-bold">TS</span>
                </div>
                <div>
                  <h4 className="text-brand-white">TypeScript SDK</h4>
                  <p className="text-xs text-brand-muted">Available now</p>
                </div>
              </div>
              <CodeBlock language="typescript" title="Install & usage">
{`import { SocialPerksSDK } from "@socialperks/sdk";

const client = new SocialPerksSDK({
  baseUrl: "https://socialperks.io",
  apiKey: "sk_live_abc123...",
});

const campaigns = await client.listCampaigns({
  state: "active",
  page: 1,
});`}
              </CodeBlock>
            </div>

            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-lg bg-green-400/15 flex items-center justify-center">
                  <span className="font-mono text-brand-green text-sm font-bold">PY</span>
                </div>
                <div>
                  <h4 className="text-brand-white">Python SDK</h4>
                  <p className="text-xs text-brand-muted">Available now</p>
                </div>
              </div>
              <CodeBlock language="python" title="Install & usage">
{`from social_perks import SocialPerksClient

client = SocialPerksClient(
    base_url="https://socialperks.io",
    api_key="sk_live_abc123...",
)

campaigns = client.list_campaigns(state="active")
print(campaigns.data)`}
              </CodeBlock>
              <p className="mt-3 text-xs text-brand-muted">
                Download the generated SDK:{" "}
                <Link href="/api/v1/sdk/python" className="text-brand-cyan hover:underline">
                  /api/v1/sdk/python
                </Link>
              </p>
            </div>
          </div>
        </section>

        {/* Rate Limits */}
        <section id="rate-limits" aria-labelledby="rate-limits-heading">
          <SectionAnchor id="rate-limits-heading">Rate Limits</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            Rate limits are enforced per IP per endpoint. Every response
            includes rate limit headers so you can track your usage.
          </p>

          <div className="rounded-lg border border-brand-border overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-brand-elevated text-brand-muted text-left">
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium">Limit</th>
                  <th className="px-4 py-3 font-medium">Applies To</th>
                </tr>
              </thead>
              <tbody>
                {RATE_LIMITS.map((rl) => (
                  <tr key={rl.tier} className="border-t border-brand-border">
                    <td className={`px-4 py-3 font-mono font-semibold ${rl.color}`}>
                      {rl.tier}
                    </td>
                    <td className="px-4 py-3 font-mono text-brand-text">
                      {rl.limit}
                    </td>
                    <td className="px-4 py-3 text-brand-dim">{rl.use}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 p-4 rounded-lg bg-brand-surface border border-brand-border">
            <p className="text-sm text-brand-dim">
              <strong className="text-brand-white">Rate limit headers:</strong>{" "}
              <code className="text-brand-cyan">X-RateLimit-Limit</code> (max requests),{" "}
              <code className="text-brand-cyan">X-RateLimit-Remaining</code> (requests left),{" "}
              <code className="text-brand-cyan">X-RateLimit-Reset</code> (epoch timestamp when
              the window resets). If you exceed the limit, you will receive a{" "}
              <code className="text-brand-red">429 Too Many Requests</code> response.
            </p>
          </div>
        </section>

        {/* Webhooks */}
        <section id="webhooks" aria-labelledby="webhooks-heading">
          <SectionAnchor id="webhooks-heading">Webhooks</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            Receive real-time notifications when events occur in your account.
            Configure webhook URLs in your dashboard.
          </p>

          <div className="space-y-6">
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-3">Webhook Events</h4>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {[
                  "campaign.created",
                  "campaign.updated",
                  "campaign.ended",
                  "submission.created",
                  "submission.approved",
                  "submission.rejected",
                  "payout.completed",
                  "member.enrolled",
                ].map((event) => (
                  <div
                    key={event}
                    className="px-3 py-1.5 rounded bg-brand-elevated font-mono text-brand-text"
                  >
                    {event}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h4 className="mb-3">Verifying Signatures</h4>
              <p className="text-sm text-brand-dim mb-4">
                Every webhook request includes an{" "}
                <code className="text-brand-cyan">X-Webhook-Signature</code>{" "}
                header containing an HMAC-SHA256 signature of the request body.
                Verify it using your webhook secret.
              </p>
              <CodeBlock language="typescript" title="Signature verification">
{`import { createHmac } from "crypto";

function verifyWebhook(
  body: string,
  signature: string,
  secret: string
): boolean {
  const expected = createHmac("sha256", secret)
    .update(body)
    .digest("hex");
  return signature === \`sha256=\${expected}\`;
}

// In your handler:
const isValid = verifyWebhook(
  rawBody,
  req.headers["x-webhook-signature"],
  process.env.WEBHOOK_SECRET
);`}
              </CodeBlock>
            </div>

            <div className="p-4 rounded-lg bg-brand-amber/5 border border-brand-amber/15">
              <p className="text-sm text-brand-dim">
                <strong className="text-brand-amber">Replay protection:</strong>{" "}
                Each webhook includes an <code className="text-brand-cyan">X-Webhook-Timestamp</code>{" "}
                header. Reject requests older than 5 minutes to prevent replay attacks.
              </p>
            </div>
          </div>
        </section>

        {/* Agent Support */}
        <section id="agents" aria-labelledby="agents-heading">
          <SectionAnchor id="agents-heading">Agent &amp; LLM Support</SectionAnchor>
          <p className="text-brand-dim mb-8 max-w-2xl">
            Social Perks is designed to be consumed by AI agents and LLMs. We
            provide machine-readable definitions for major protocols.
          </p>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-2 text-brand-cyan">MCP Server</h4>
              <p className="text-sm text-brand-dim mb-3 leading-relaxed">
                Model Context Protocol definition with typed tools, input
                schemas, and resource definitions.
              </p>
              <Link
                href="/api/v1/mcp"
                className="text-sm font-mono text-brand-cyan hover:underline"
              >
                /api/v1/mcp
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-2 text-brand-purple">OpenAPI Spec</h4>
              <p className="text-sm text-brand-dim mb-3 leading-relaxed">
                Full OpenAPI 3.1 specification. Import into any API tool,
                agent framework, or code generator.
              </p>
              <Link
                href="/api/v1/docs"
                className="text-sm font-mono text-brand-cyan hover:underline"
              >
                /api/v1/docs
              </Link>
            </div>

            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-2 text-brand-green">AI Plugin Manifest</h4>
              <p className="text-sm text-brand-dim mb-3 leading-relaxed">
                OpenAI-compatible plugin manifest for agent discovery and
                automatic capability registration.
              </p>
              <Link
                href="/.well-known/ai-plugin.json"
                className="text-sm font-mono text-brand-cyan hover:underline"
              >
                /.well-known/ai-plugin.json
              </Link>
            </div>
          </div>
        </section>

        {/* Support */}
        <section id="support" aria-labelledby="support-heading">
          <SectionAnchor id="support-heading">Support &amp; Resources</SectionAnchor>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-3">Useful Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/api/v1/docs" className="text-brand-cyan hover:underline">
                    OpenAPI 3.1 Specification
                  </Link>
                  {" "}<span className="text-brand-muted">-- interactive API docs</span>
                </li>
                <li>
                  <Link href="/api/v1/health" className="text-brand-cyan hover:underline">
                    Health Check
                  </Link>
                  {" "}<span className="text-brand-muted">-- server status and uptime</span>
                </li>
                <li>
                  <Link href="/api/v1/mcp" className="text-brand-cyan hover:underline">
                    MCP Server Definition
                  </Link>
                  {" "}<span className="text-brand-muted">-- for LLM agents</span>
                </li>
                <li>
                  <Link href="/api/v1/sdk/python" className="text-brand-cyan hover:underline">
                    Download Python SDK
                  </Link>
                  {" "}<span className="text-brand-muted">-- generated client library</span>
                </li>
                <li>
                  <Link href="/agents" className="text-brand-cyan hover:underline">
                    AI Agent Guide
                  </Link>
                  {" "}<span className="text-brand-muted">-- connect your agents to businesses</span>
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-xl border border-brand-border bg-brand-surface">
              <h4 className="mb-3">Response Envelope</h4>
              <p className="text-sm text-brand-dim mb-4 leading-relaxed">
                Every API response follows this structure, making it
                predictable to parse for both humans and agents.
              </p>
              <CodeBlock language="json" title="Success">
{`{
  "success": true,
  "data": { ... }
}`}
              </CodeBlock>
              <div className="mt-3">
                <CodeBlock language="json" title="Error">
{`{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests"
  }
}`}
                </CodeBlock>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ─── Footer ───────────────────────────────────────────────────── */}
      <footer className="border-t border-brand-border py-12 text-center text-sm text-brand-muted">
        <p>
          Social Perks Developer Hub{" "}
          <span className="mx-2 text-brand-subtle">|</span>
          <Link href="/" className="text-brand-cyan hover:underline">
            Home
          </Link>
          <span className="mx-2 text-brand-subtle">|</span>
          <Link href="/agents" className="text-brand-cyan hover:underline">
            Agents
          </Link>
          <span className="mx-2 text-brand-subtle">|</span>
          <Link href="/api/v1/docs" className="text-brand-cyan hover:underline">
            API Docs
          </Link>
        </p>
      </footer>
    </div>
  );
}
