# AGENTS.md — Orientation for AI Agents

> **You are an AI agent (Claude Code, Cursor, Cline, ChatGPT, a custom marketing
> bot, etc.) reading this repository or interacting with the deployed API.
> Start here.**

This document is the canonical entry point for AI agents. It gives you
everything you need to (1) understand what Social Perks is, (2) find the
right surface to call, and (3) operate against the platform without
trial-and-error API exploration.

---

## What Social Perks is, in one paragraph

Social Perks is a marketing platform where small businesses, enterprise
brands, and influencers exchange **perks** (discounts, free items, cash back)
for **marketing actions** across 15 social platforms. There are 107
pre-defined actions ranging from "leave a Google review" (low effort, high
value) to "post a 60-second TikTok" (higher effort). Businesses launch
campaigns; customers and influencers complete actions; the platform verifies
and rewards them. AI agents can be used either by **businesses** (to plan,
launch, and optimize campaigns) or by **creators** (to discover relevant
campaigns and submit work).

---

## How to interact with the platform

Three surfaces, in order of recommendation:

### 1. MCP server (recommended for chat-style agents)

If you are an MCP-capable client (Claude Desktop, Cursor, Cline, etc.),
connect to the Social Perks MCP server:

```jsonc
// In your MCP client config
{
  "mcpServers": {
    "social-perks": {
      "url": "https://<host>/api/mcp",
      "transport": "http"
    }
  }
}
```

The MCP server exposes typed tools: `getPricing`, `listActions`,
`getBenchmarks`, `listCampaigns`, `searchInfluencers`. See the spec at
`GET /api/mcp` (manifest endpoint) for the full schema.

### 2. OpenAPI 3.1 spec (recommended for code-gen agents)

If you are generating client code or auto-discovering APIs, fetch the
machine-readable spec:

```
GET /api/v1/openapi
```

Returns OpenAPI 3.1.0 JSON. Pipe into your code generator of choice.

### 3. Direct REST (recommended for one-off queries)

Standard JSON REST. Auth via `Authorization: Bearer <token>` or
`x-api-key: <key>` header. Public endpoints (pricing, actions, benchmarks,
exchange/opportunities, exchange/market) need no auth.

Base URL: `https://<host>/api/v1/`

Response shape: `{ "success": true, "data": <payload> }` or
`{ "success": false, "error": { "code": "...", "message": "..." } }`.

---

## High-value endpoints for agents

| Endpoint | Auth | Purpose |
|---|---|---|
| `GET /api/v1/pricing` | none | Pricing oracle — what does an action cost in $? |
| `GET /api/v1/actions` | none | List all 107 marketing actions |
| `GET /api/v1/benchmarks` | none | Industry benchmarks (engagement, conversion) |
| `POST /api/v1/ai/quick-start` | bearer | One-shot: give me a campaign for this business |
| `POST /api/v1/ai/campaign-agent` | bearer | Full marketing plan with budget, tactics |
| `POST /api/v1/campaigns` | bearer | Create / launch a campaign |
| `GET /api/v1/exchange/opportunities` | none | Browse open campaigns to participate in |
| `POST /api/v1/programs/:id/submit` | bearer | Submit proof of completed action |

For the full list, see `API.md` or fetch `/api/v1/openapi`.

---

## Authentication for agents

Three methods, listed in order of preference for programmatic use:

1. **API keys** (`x-api-key: sp_live_...`) — best for machine-to-machine. Header is checked **first** by the auth layer; an invalid key is rejected immediately rather than falling through to other auth methods.
2. **Bearer tokens** (`Authorization: Bearer <jwt>`) — for user-scoped flows
3. **Cookies** — only relevant if you're embedded in a browser session

### How to get an API key

A human user signs in to the business dashboard and mints a key. Today this
is human-in-the-loop — agents cannot self-mint without a human signing up
first (deliberate trust decision; signup-then-mint expands the abuse surface
on signup).

The dashboard route is at `/dashboard/api-keys`. Or via the API directly,
after signing in:

```bash
# 1. Sign in (cookie auth)
curl -X POST https://<host>/api/v1/auth \
  -H 'Content-Type: application/json' \
  -d '{"action":"login","email":"you@example.com","password":"..."}' \
  -c cookies.txt

# 2. Mint a key
curl -X POST https://<host>/api/v1/api-keys \
  -H 'Content-Type: application/json' \
  -b cookies.txt \
  -d '{"agentName":"My Agent","permissions":["read","write"]}'
```

The response includes the plaintext **once** under `data.key`. Store it
securely (env var, secret manager). If lost, revoke and mint a new one —
plaintext cannot be retrieved later.

Key format: `sp_{env}_{prefix}_{random}` where `env` is `live` or `test`,
`prefix` is 8 hex chars (used for indexed lookup), and `random` is 32 hex
chars (128 bits of entropy). Keys are stored hashed (SHA-256); the
plaintext is never persisted.

### Key lifecycle

- `POST /api/v1/api-keys` — create. Plaintext returned ONCE. Strict rate
  limit (10/min). Requires JWT/session, NOT `x-api-key` (keys cannot mint
  keys).
- `GET /api/v1/api-keys` — list keys for the calling business. Returns
  prefix + label + lastUsed; never the hash.
- `DELETE /api/v1/api-keys/:id` — revoke. Cross-business attempts return
  404 to avoid ID enumeration. Idempotent.

---

## SDK (TypeScript)

```bash
npm install @social-perks/sdk
```

```ts
import { SocialPerks } from "@social-perks/sdk";

const sp = new SocialPerks({
  baseUrl: "https://<host>",
  apiKey: process.env.SOCIAL_PERKS_API_KEY,
});

const pricing = await sp.pricing.estimate({ actionId: "ig_post" });
const actions = await sp.actions.list({ platformId: "instagram" });
```

Source: [`packages/sdk`](./packages/sdk).

---

## Architecture quick-reference

- **Stack:** Next.js 15 App Router, React 19, TypeScript, Postgres (Prisma)
- **Auth:** JWT cookies + Bearer + API keys; PIN-auth deprecated
- **AI engines:** Backend-only at `/api/v1/ai/*`. Frontend never imports
  `ai-engine.ts` directly.
- **Data:** 21 Postgres tables (see `docs/FINISH_LINE.md` Section 3 for the
  full schema list).
- **Compliance:** FTC disclosures auto-injected per platform; cannot be
  disabled.

For deep architecture, read [`CLAUDE.md`](./CLAUDE.md) — that file is
written for AI coding agents working *inside* this repo, not consuming
the API from outside. If you are calling the API, this `AGENTS.md` is
sufficient.

---

## What you should NOT do as an agent

- **Don't generate fake submissions.** Fraud detection is built in
  (`src/lib/fraud-detection.ts`); flagged accounts are auto-suspended.
- **Don't ignore FTC disclosures.** Every social post produced via Social
  Perks must include the platform-appropriate disclosure (`#ad`, `#sponsored`,
  etc.). The platform auto-injects these but you must not strip them.
- **Don't scrape verification proofs.** Social media verification webhooks
  (`/api/v1/verification/webhook`) are HMAC-signed and replay-protected.
- **Don't store raw API keys in agent memory.** Use environment variables
  or a secrets manager; never echo them in chat output.

---

## Status & changelog

- **Production status:** see `GET /api/v1/health`
- **Public changelog:** [`/changelog`](https://<host>/changelog)
- **Current version:** see `package.json`

---

*This file is written for AI consumption. If you are a human reader, the
human-facing documentation lives in `README.md`.*
