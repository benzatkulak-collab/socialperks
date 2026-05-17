# AGENTS.md — Orientation for AI Agents

> **You are an AI agent (Claude Code, Cursor, Cline, ChatGPT, a custom marketing
> bot, etc.) reading this repository or interacting with the deployed API.
> Start here.**

This document is the canonical entry point for AI agents. It gives you
everything you need to (1) understand what Social Perks is, (2) find the
right surface to call, (3) authenticate without a human walking you through
a dashboard, and (4) operate against the platform without trial-and-error
API exploration.

---

## What Social Perks is, in one paragraph

Social Perks is a marketing platform where small businesses, enterprise
brands, and influencers exchange **perks** (discounts, free items, cash
back) for **marketing actions** across 25 social platforms. There are 125
pre-defined actions ranging from "post an Instagram Story tag" (low effort,
fully supported) to "post a 60-second TikTok" (higher effort, fully
supported). Businesses launch campaigns; customers and influencers complete
actions; the platform verifies and rewards them. AI agents can be used by
**businesses** (to plan, launch, and optimize campaigns) or by **creators**
(to discover relevant campaigns and submit work).

---

## Try the MCP server right now

The fastest way to confirm everything works:

> 🧪 **In-browser sandbox:** <https://socialperks.app/agent/test>
>
> No signup, no API key. The page loads the live `tools/list` from
> production, lets you pick a tool, fills in the args, and shows the
> real JSON-RPC response — including the `_meta` cost envelope.

---

## How to interact with the platform

Three surfaces, in order of recommendation:

### 1. MCP server (recommended for chat-style agents)

If you are an MCP-capable client (Claude Desktop, Cursor, Cline, custom
agent runtimes), connect to the Social Perks MCP server:

```jsonc
// In your MCP client config (e.g. claude_desktop_config.json)
{
  "mcpServers": {
    "social-perks": {
      "url": "https://socialperks.app/api/mcp"
    }
  }
}
```

The MCP server exposes **10 tools** today:

| Tool | Auth | Cost | Purpose |
|---|---|---|---|
| `getPricing` | none | free | Market-rate pricing for any marketing action |
| `listActions` | none | free | All 125 marketing actions, filterable |
| `getBenchmarks` | none | free | Industry benchmarks (engagement, conversion) |
| `searchInfluencers` | none | free | Find influencers by platform / follower count |
| `listCampaigns` | api-key | free | Caller's campaigns |
| `createCampaign` | api-key | plan: campaigns | Launch a new campaign |
| `submitProof` | api-key | plan: submissions | Submit content proof for a campaign action |
| `reviewSubmission` | api-key | free | Approve or reject a submission |
| `listSubmissions` | api-key | free | Paginate the review queue |
| `getCampaignStats` | api-key | free | Outcome reporting for a campaign |

Tools are also queryable via the **`GET /api/mcp` manifest endpoint** —
returns the full schema + each tool's cost model.

**Every `tools/call` response carries a `_meta` block:**

```jsonc
{
  "content": [...],
  "isError": false,
  "_meta": {
    "durationMs": 142,
    "cost": { "type": "free" },             // or "plan" / "cash"
    "rateLimit": {
      "limit": 100,
      "remaining": 94,
      "resetAt": "2026-05-16T17:00:00Z"
    },
    "downstreamStatus": 200
  }
}
```

Read `_meta.cost` from the manifest **before** invoking to budget;
verify `_meta.rateLimit` **after** to detect headroom exhaustion.

### 2. OpenAPI 3.1 spec (recommended for code-gen agents)

If you are generating client code or auto-discovering APIs, fetch the
machine-readable spec:

```
GET /api/v1/openapi
```

Returns OpenAPI 3.1.0 JSON. Pipe into your code generator of choice.

### 3. Direct REST (recommended for one-off queries)

Standard JSON REST. Auth via `Authorization: Bearer <token>` or
`x-api-key: <key>` header. Public endpoints (pricing, actions,
benchmarks, exchange/opportunities, exchange/market) need no auth.

Base URL: `https://socialperks.app/api/v1/`

Response shape: `{ "success": true, "data": <payload> }` or
`{ "success": false, "error": { "code": "...", "message": "..." } }`.

---

## High-value endpoints for agents

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/v1/pricing` | none | Pricing oracle |
| `GET /api/v1/actions` | none | List all 125 actions |
| `GET /api/v1/benchmarks` | none | Industry benchmarks |
| `GET /api/v1/stats/public` | none | Platform aggregate counts |
| `POST /api/v1/ai/quick-start` | bearer | One-shot: give me a campaign for this business |
| `POST /api/v1/ai/campaign-agent` | bearer | Full marketing plan with budget + tactics |
| `POST /api/v1/campaigns` | api-key/bearer | Create + launch a campaign |
| `POST /api/v1/submissions` | api-key/bearer | Submit proof |
| `POST /api/v1/submissions/review` | api-key/bearer | Approve / reject |
| `POST /api/v1/agent-auth/token` | code | Exchange OAuth code for API key |
| `GET /api/v1/agent-activity` | bearer | Per-agent activity rollup (for dashboard) |
| `GET /api/v1/usage` | bearer | Current-month usage vs. plan limits |
| `GET /api/v1/exchange/opportunities` | none | Browse open campaigns |

For the full list, see `API.md` or fetch `/api/v1/openapi`.

---

## Authentication for agents

Two paths, depending on who's driving:

### A. **OAuth-style consent flow** (the right path for most agents)

For agents acting on behalf of a user, use the OAuth-style
authorization-code flow:

1. **Direct the user** to the consent screen:

   ```
   https://socialperks.app/agent/authorize
     ?agent_name=Your%20Agent%20Name
     &scope=read.campaigns,write.campaigns,read.submissions
     &redirect_uri=https://your.agent/callback
     &state=an-opaque-token
   ```

2. **User signs in** (if not already) and approves the scopes shown.

3. **Browser redirects** to `{redirect_uri}?code=...&state=...` —
   the `code` is single-use, 60-second TTL.

4. **Exchange the code** for an API key:

   ```
   POST https://socialperks.app/api/v1/agent-auth/token
   Content-Type: application/json

   { "code": "...", "grant_type": "authorization_code" }
   ```

   Returns:

   ```jsonc
   {
     "success": true,
     "data": {
       "access_token": "sp_live_...",
       "token_type": "bearer",
       "scope": "read.campaigns write.campaigns read.submissions",
       "business_id": "biz_...",
       "agent_name": "Your Agent Name"
     }
   }
   ```

5. **Use the key** as `x-api-key: sp_live_...` or `Authorization:
   Bearer sp_live_...` on every subsequent call.

**Valid scopes:**
`read.campaigns`, `read.submissions`, `read.analytics`,
`write.campaigns`, `write.submissions`, `review.submissions`.

**Available example:**
[`examples/full-flow.ts`](./examples/full-flow.ts) — TypeScript, ~200
lines, no Anthropic SDK. Runs the entire flow including a local
callback server.

### B. **Pre-issued API key** (dashboard path, lower friction for solo developers)

A human user can sign in and create a key in the business dashboard at
`/dashboard/settings/api-keys`. Useful for solo developers building
their own agent against their own account.

---

## Cost-meter cheat sheet

Every tool has a declared cost model. Agents should reason about it
before invoking:

```jsonc
// From tools/list response (or GET /api/mcp manifest)
{
  "name": "createCampaign",
  "_meta": {
    "cost": {
      "type": "plan",
      "resource": "campaigns",
      "consumedPerCall": 1
    }
  }
}
```

Three cost categories:

- **`free`** — Catalog/reference reads. No quota consumed.
- **`plan`** — Consumes a unit of plan capacity (campaigns,
  submissions, AI generations). Returns 403 `PLAN_LIMIT_EXCEEDED` when
  the quota is exhausted; the response includes the plan name,
  current usage, and upgrade URL.
- **`cash`** — Reserved for tools that move real money (cashback
  payouts). Not currently exposed via MCP.

Pre-check usage at `GET /api/v1/usage` to avoid hitting a hard limit
mid-workflow.

---

## What the user sees on their side

When an agent acts on behalf of a user, the user can audit the
activity at:

- **`/dashboard/agents`** — per-agent activity dashboard:
  every campaign created, every submission filed, every review
  decision, with timestamps and revoke buttons
- **`/dashboard/settings/api-keys`** — list and revoke API keys
- **Audit log** — every action is logged with
  `actor: "agent:<api-key-id>"` for tenant attribution

If you're building an agent that uses Social Perks, **link both
dashboard pages in your agent's UI** so the user can audit and
revoke at any time.

---

## SDK (TypeScript)

```bash
npm install @social-perks/sdk
```

```ts
import { SocialPerks } from "@social-perks/sdk";

const sp = new SocialPerks({
  baseUrl: "https://socialperks.app",
  apiKey: process.env.SOCIAL_PERKS_API_KEY,
});

const pricing = await sp.pricing.estimate({ actionId: "ig_st" });
const actions = await sp.actions.list({ platformId: "ig" });
```

Source: [`packages/sdk`](./packages/sdk).

---

## Architecture quick-reference

- **Stack:** Next.js 15 App Router, React 19, TypeScript, Postgres (Prisma)
- **Auth:** JWT cookies + Bearer tokens + API keys; PIN-auth deprecated
- **AI engines:** Backend-only at `/api/v1/ai/*`. Frontend never imports
  `ai-engine.ts` directly.
- **Compliance:** FTC disclosures auto-injected per platform; cannot
  be disabled.
- **CSRF:** Required for cookie-bound mutations; **automatically
  bypassed for API-key callers** (out-of-band credentials, no cookie
  attachment, threat model doesn't apply).
- **Tenant isolation:** every API key is bound to a single business;
  REST routes enforce that the resource being modified belongs to
  that business. Agents cannot cross tenants even with a valid key.

For deep architecture, read [`CLAUDE.md`](./CLAUDE.md) — that file is
written for AI coding agents working *inside* this repo, not consuming
the API from outside. If you are calling the API, this `AGENTS.md` is
sufficient.

---

## What you should NOT do as an agent

- **Don't try to incentivize Google / Yelp / TripAdvisor reviews.**
  Their ToS prohibits this. The platform blocks campaigns targeting
  banned actions at the API level (returns 422 `PROHIBITED_ACTION`).
- **Don't generate fake submissions.** Fraud detection is built in
  (`src/lib/fraud-detection.ts`); flagged accounts are auto-suspended.
- **Don't ignore FTC disclosures.** Every social post produced via
  Social Perks must include the platform-appropriate disclosure
  (`#ad`, branded-content tag, etc.). The platform auto-injects these
  but you must not strip them.
- **Don't scrape verification proofs.** Social media verification
  webhooks (`/api/v1/verification/webhook`) are HMAC-signed and
  replay-protected.
- **Don't store raw API keys in agent memory.** Use environment
  variables or a secrets manager; never echo them in chat output.
- **Don't poll** `/api/v1/stats/public` more than once per 5 minutes
  — it's cached server-side at that resolution and excessive polling
  wastes both your rate-limit budget and our cache hit rate.

---

## Discoverability

Social Perks is registered in the official MCP Registry:

- **Registry entry:** `io.github.benzatkulak-collab/socialperks`
- **Browse:** <https://registry.modelcontextprotocol.io/v0/servers?search=socialperks>
- **Listed in:** `punkpeye/awesome-mcp-servers` (Marketing section)

Auto-discovery clients (Claude Desktop's marketplace, ChatGPT Apps
SDK, etc.) will find Social Perks through the registry as they ship
auto-discovery support.

---

## Status & changelog

- **Production status:** <https://socialperks.app/api/v1/health>
- **Public changelog:** <https://socialperks.app/changelog>
- **Current version:** see `package.json`
- **Runnable examples:** [`examples/`](./examples) (TypeScript +
  bash, no Anthropic SDK required for the basic flow)

---

*This file is written for AI consumption. If you are a human reader,
the human-facing documentation lives in [`README.md`](./README.md).*
