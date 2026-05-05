# Architecture

The single document that explains how Social Perks is built. Read
this first; the other docs in this folder are historical or
reference material that this doc supersedes for orientation.

## What it is

A QR-code-driven customer-marketing platform for small shops:
shop prints one QR code → customer scans + posts about the shop →
customer earns a perk → friends see the post → flywheel.

Three audiences, one stack:

- **Shop owners** (primary customer): coffee shops, salons, gyms,
  restaurants — sub-50-employee local businesses
- **Customers** (the supply): the regular at the counter, not
  influencers
- **AI marketing agents** (distribution channel): Claude Code,
  Cursor, custom agent stacks integrating us via SDK + MCP

The strategic frame and why agents are a channel-not-a-customer
is in [AI_AUTOMATION_INBOUND.md](./AI_AUTOMATION_INBOUND.md) +
[AGENT_DISTRIBUTION_DESIGN.md](./AGENT_DISTRIBUTION_DESIGN.md).

## Stack

```
Next.js 15 App Router · React 19 · TypeScript strict
Tailwind + custom CSS variables (Infrastructure Luxury aesthetic)
Postgres write-through with in-memory fallback
Vercel functions + crons
JWT auth (httpOnly cookies + Bearer tokens) + agent OAuth
14 backend engines (event sourcing, fraud, FTC, perk wallet, etc.)
```

Three separately-publishable workspace packages:

- `@socialperks/sdk` — typed REST wrapper, zero deps, native fetch
- `@socialperks/cli` — agent-runnable CLI (no browser, no OAuth ceremony)
- `@socialperks/mcp-server` — Model Context Protocol server, stdio + HTTP transport

## Top-level layout

```
src/
├── app/                                Next.js routes
│   ├── api/v1/*                        Public REST surface (~50 routes)
│   ├── api/mcp/                        HTTP transport for the MCP server
│   ├── dashboard/                      Shop-owner UI
│   │   ├── webhooks/                   P12 — manage subscriptions
│   │   ├── api-keys/                   P14 — self-service keys
│   │   └── integrations/               P14 — manage agent OAuth grants
│   ├── oauth/authorize/                Consent screen for agent OAuth
│   ├── b/[slug]/                       Public business profile
│   ├── c/[campaignId]/                 Customer redemption page
│   ├── wallet/                         Customer perks
│   ├── demo/                           Interactive sandbox (no signup)
│   └── auth/verify/                    Magic-link landing
├── components/
│   ├── business/                       Shop-owner dashboard components
│   ├── customer/                       Customer-side components
│   ├── landing/                        Marketing-site sections
│   ├── auth/                           Auth UI
│   └── shared/                         Cross-audience (Nav, Footer, CookieBanner, etc.)
└── lib/
    ├── api-keys/                       Bearer-key issue + verify
    ├── auth/                           JWT + magic-link store
    ├── oauth/                          Multi-tenant agent OAuth (Stripe-Connect-style)
    ├── webhooks/                       Outbound delivery + persistence
    ├── verification/                   Real-vs-mock platform adapters
    │   └── platforms/                  IG, TikTok (planned), FB (planned)
    ├── sms/                            Twilio + post-purchase pipeline
    ├── actions/                        Goal-based action library v2
    ├── notifications/                  Multi-channel (email, slack, sms)
    ├── observability/                  Sentry scaffold (DSN-driven)
    ├── security/                       Rate limit, CSRF, validate, sanitize
    ├── db/                             Connection + migrations + repos
    └── (14 engines)                    submissions, perk-wallet, fraud-detection,
                                         compliance, financial-ledger, sync-engine,
                                         verification-engine, plugin-system,
                                         graph-engine, embedding-engine, etc.

packages/
├── sdk/                                @socialperks/sdk
├── cli/                                @socialperks/cli
├── mcp-server/                         @socialperks/mcp-server
└── shared/                             Internal — types + seed shared with the app
```

## Data architecture

Persistent state lives in Postgres (write-through with in-memory
cache for 0-latency reads). When `DATABASE_URL` is unset everything
runs from in-memory Maps — fine for dev, **never for production**.
The readiness probe surfaces missing `DATABASE_URL` as a warning.

Migrations are numbered; current head is **009**. Every new table
is added via a new migration file in `src/lib/db/migrations.ts`
(not by editing existing ones). Run with `npm run db:migrate`.

Tables (by migration):

| # | Tables | Purpose |
|---|---|---|
| 001 | businesses, campaigns, submissions, perks, users, api_keys, webhooks, … | Initial schema (~20 tables) |
| 002-003 | (data fixes + GIN indexes) | |
| 004 | sessions | Persistent JWT sessions |
| 005 | magic_link_tokens, dev_init_emails, sms_opt_outs | Agent-substrate persistence |
| 006 | sms_queue | Post-purchase SMS queue (cron-drained) |
| 007 | webhook_deliveries | Outbound webhook delivery audit trail |
| 008 | agent_apps, agent_authorizations, agent_access_tokens | Multi-tenant agent OAuth |
| 009 | platform_post_cache | Verification-engine cache for IG/TikTok/FB posts |

## Auth model

Three credential types. Every Bearer-authed route accepts all of
them through `verifyFromHeaders` in `src/lib/api-keys/verify.ts`.

| Token | Format | Issued by | Verifies via |
|---|---|---|---|
| **Per-business API key** | `sk_live_…` | `/api/v1/dev/init` or dashboard `/api-keys` | `api_keys.key_hash` |
| **Agent OAuth access token** | `at_…` | `/api/v1/oauth/token` (authorization_code) | `agent_access_tokens.access_token_hash` |
| **Agent OAuth refresh token** | `rt_…` | Issued alongside access token; rotated on refresh | `agent_access_tokens.refresh_token_hash` |

Plus three session types:

- **JWT cookie** (`sp-access-token`) — shop-owner dashboard sessions
- **Magic-link tokens** — single-use 15-min for passwordless sign-in
- **CSRF tokens** — HMAC-SHA256, session-bound

## API surface (~50 public routes)

Grouped by audience.

### Reference data (public, cached)
```
GET  /api/v1/openapi          OpenAPI 3.1 spec
GET  /api/v1/actions          Filterable action library
GET  /api/v1/actions/full     Bulk export with ETag (P13)
GET  /api/v1/actions/by-goal  Outcome-based goal taxonomy (P14)
GET  /api/v1/pricing          Pricing oracle
GET  /api/v1/benchmarks       Industry benchmarks
GET  /api/v1/legal            FTC briefings
GET  /api/v1/health           Liveness
GET  /api/v1/health/readiness Detailed config diagnostic (admin-gated)
```

### Auth + onboarding
```
GET/POST /api/v1/auth                 Validate + login/signup/refresh
POST     /api/v1/auth/magic-link      Request a sign-in link (P8)
POST     /api/v1/auth/magic-link/verify  Consume the token, set session (P8)
POST     /api/v1/dev/init             Agent-runnable signup (P9)
```

### Campaigns + submissions
```
GET/POST /api/v1/campaigns            CRUD
GET/POST /api/v1/submissions          Submission with proof
POST     /api/v1/submissions/review   Approve / reject
```

### AI (backend-only — frontend never imports model code)
```
POST /api/v1/ai/generate         Campaign suggestions
POST /api/v1/ai/recommend        Optimization recommendations
POST /api/v1/ai/quick-start      One-shot best campaign
POST /api/v1/ai/campaign-agent   Full marketing plan
POST /api/v1/ai/review           Submission review pipeline
```

### Perk programs (multi-customer enrolled programs)
```
GET/POST /api/v1/programs                    CRUD
GET      /api/v1/programs/[id]               Detail
PUT      /api/v1/programs/[id]               Update
DELETE   /api/v1/programs/[id]               End
GET      /api/v1/programs/[id]/progress      Member progress
POST     /api/v1/programs/[id]/submit        Action submission
GET/POST /api/v1/programs/[id]/cashback      Payouts
GET/POST /api/v1/programs/[id]/members       Enrollment
```

### Webhooks (outbound to agents)
```
GET/POST/DELETE /api/v1/webhooks            Manage subscriptions
GET             /api/v1/webhooks/deliveries Delivery audit log
POST            /api/v1/webhooks/[id]/test  Fire synthetic event (P13)
```

### POS receivers (inbound from Square / Toast / Clover)
```
POST /api/v1/pos/square/webhook
POST /api/v1/pos/toast/webhook
POST /api/v1/pos/clover/webhook
```

### Agent OAuth (P14)
```
POST   /api/v1/oauth-apps          Register an agent app (admin-gated for now)
POST   /api/v1/oauth/authorize     Issue auth code (cookie-authed)
POST   /api/v1/oauth/token         Exchange code OR refresh — Basic auth
GET    /oauth/authorize            Consent screen (page, not API)
```

### Self-service key + integration management (P14)
```
GET/POST/DELETE /api/v1/api-keys              Personal API keys
GET/DELETE      /api/v1/integrations          Authorized agent OAuth grants
```

### SMS pipeline
```
POST /api/v1/sms/enqueue          Production SMS scheduling (P11)
POST /api/v1/sms/test             Admin-only, fires immediately
POST /api/v1/sms/inbound          Twilio inbound (signature-verified, P13)
```

### MCP transport
```
GET  /api/mcp                     Discovery (catalog)
POST /api/mcp                     JSON-RPC 2.0 (tools/list, tools/call, …)
```

### Cron-drained background jobs
```
GET /api/v1/cron/waitlist-drip     Daily 14:00 UTC
GET /api/v1/cron/campaign-sweeps   Daily 09:00 UTC
GET /api/v1/cron/sms-drain         Every 2 minutes
GET /api/v1/cron/webhook-redrive   Every 5 minutes
```

### Admin diagnostics
```
GET /api/v1/admin/mcp-telemetry    Per-tool agent call stats
GET /api/v1/admin/webhook-health   Cross-tenant subscription health
```

## MCP catalog (10 tools as of P14)

```
list_action_ideas              Browse 125 actions across 25 platforms
create_perk_campaign           Create a (platform, action, reward) campaign
print_qr_poster                Get the printable 8.5×11 SVG URL
list_campaigns                 Read campaign state
enqueue_post_purchase_sms      Schedule a customer SMS
ai_quick_start                 One-shot best campaign for a business type
subscribe_to_campaign_events   Outbound webhook subscribe (P12)
list_webhook_subscriptions     Read your own webhook health (P12)
list_campaign_goals            Browse outcome-based goals (P14)
recommend_for_goal             Ranked actions for a specific goal (P14)
```

## Verification engine (P14 scaffold; live IG when credentials arrive)

```
src/lib/verification/
├── platforms/
│   ├── types.ts            Shared interface: PlatformVerifier
│   ├── matchers.ts         hashtag/mention/disclosure/business detectors
│   ├── cache.ts            platform_post_cache helper (5min TTL)
│   ├── instagram-mock.ts   Deterministic demo (no creds)
│   └── instagram.ts        Real Graph API client
├── platform-router.ts      Picks real-vs-mock based on env
├── oauth-manager.ts        Per-customer platform OAuth (existing)
└── (the 1,776-LOC verification-engine.ts orchestrator)
```

When `OAUTH_IG_CLIENT_ID + SECRET` are set, the router picks
`instagram.ts` (real). Otherwise `instagram-mock.ts`. The engine
reads `verifier.isMock` and **refuses to issue real-money
redemptions** in mock mode unless an admin manually approves —
the guarantee from [VERIFICATION_ENGINE_REAL_API.md](./VERIFICATION_ENGINE_REAL_API.md).

TikTok and Facebook adapters are next (same shape; one-day-each
after IG ships). Both currently route to the IG mock — sufficient
for development, blocked from production by `isMock`.

## Background jobs

| Cadence | Route | Purpose |
|---|---|---|
| `*/2 * * * *` | `cron/sms-drain` | Drain pending `sms_queue` rows past their `scheduled_for` |
| `*/5 * * * *` | `cron/webhook-redrive` | Retry failed webhook deliveries |
| `0 14 * * *` | `cron/waitlist-drip` | Daily drip campaigns |
| `0 9 * * *` | `cron/campaign-sweeps` | Expiry transitions, sweep stale campaigns |

All cron routes require `Authorization: Bearer ${CRON_SECRET}` —
without the env var they return 503 (we don't want anonymous
internet traffic triggering jobs).

## Observability

- **Env validation at boot** (`instrumentation.ts` → `src/lib/env-validation.ts`)
  — logs structured report on missing config
- **Readiness probe** (`/api/v1/health/readiness`) — 16+ checks across
  auth, persistence, billing, email, OAuth, webhooks, crons, SMS, POS;
  P14 added per-platform verification routing diagnostics
- **MCP tool-call telemetry** — every `tools/call` emits a
  `mcp_tool_call` event into `eventStore`; aggregated by
  `/api/v1/admin/mcp-telemetry`
- **Webhook health admin** — cross-tenant aggregation at
  `/api/v1/admin/webhook-health`
- **Sentry scaffold** — DSN-driven, lazy-imports `@sentry/nextjs`
  only when `SENTRY_DSN` is set (no bundle bloat in dev)

## Deployment

Vercel. CI gates every PR on:

```
lint   typecheck   test   api-typecheck   api-test
packages (workspace tsc + 31 vitest tests + release dry-run)
build
```

The `packages` job runs all three workspace package builds plus
the new vitest suites added in P14. A broken retry, auth misroute,
or MCP catalog drift fails the PR before publish.

## Releasing the npm packages

```
npm run release:packages          # patch bump
npm run release:packages:minor
npm run release:packages:major
npm run release:packages:dry      # full pipeline, no publish/push
```

The script bumps versions in lockstep, updates the cross-deps
(cli + mcp-server depend on a pinned sdk version), builds, runs
smoke tests, publishes (sdk first, then cli + mcp in parallel),
and tags + pushes. Documented in [RELEASING.md](./RELEASING.md).

## What's NOT in this codebase

By deliberate exclusion:

- **A creator marketplace.** The supply is the regular at the
  counter; we explicitly de-emphasized influencer surfaces in
  P6 (footer, sitemap, noindex).
- **Real-money redemption with mock verifications.** The
  verification engine refuses to issue real perks in mock mode
  unless an admin manually approves.
- **Bundled `@sentry/nextjs`.** Lazy-loaded only when `SENTRY_DSN`
  is set; saves ~150kb in dev.
- **A custom queue/job library.** The SMS queue + webhook redrive
  are plain Postgres tables drained by Vercel Cron. We chose
  boring infrastructure deliberately.
- **Real-time bidding for influencer placements.** Out of scope.
  An "agent fights another agent for a shop's perk slot" market
  may exist in 2027; we'll ship that when an integrator asks.

## Where to read next

- [`AGENTS.md`](../AGENTS.md) (root) — the single doc for AI coding
  agents reading this repo for the first time
- [`AGENT_DISTRIBUTION_DESIGN.md`](./AGENT_DISTRIBUTION_DESIGN.md) —
  scorecard + roadmap for the agent-distribution layer
- [`VERIFICATION_ENGINE_REAL_API.md`](./VERIFICATION_ENGINE_REAL_API.md)
  — bridge from mock verifications to real Graph API calls
- [`RELEASING.md`](./RELEASING.md) — how to ship the npm packages
- [`POS_WEBHOOK_SETUP.md`](./POS_WEBHOOK_SETUP.md) — Square / Toast
  / Clover provider-side setup
- [`LAUNCH_SUBMISSIONS.md`](./LAUNCH_SUBMISSIONS.md) — pre-filled
  copy for smithery, mcp.so, awesome-mcp, Show HN, Twitter
- [`LIGHTHOUSE_FINDINGS.md`](./LIGHTHOUSE_FINDINGS.md) — a11y/perf
  baseline + fix queue
- [`AI_AUTOMATION_INBOUND.md`](./AI_AUTOMATION_INBOUND.md) —
  three-door agent inbound strategy
- [`INEVITABILITY.md`](./INEVITABILITY.md) — long-term blueprint
  (some sections superseded by the post-pivot framing)
- [`PLATFORM_PLAN.md`](./PLATFORM_PLAN.md) — historical 50-phase
  build plan; superseded by per-phase commit messages
- [`TONIGHT_50.md`](./TONIGHT_50.md) — historical short-term
  action list; superseded
- [`FINISH_LINE.md`](./FINISH_LINE.md) — historical setup notes;
  superseded by `instrumentation.ts` + `.env.example`

The last four are kept for archaeology; this doc is the canonical
entry point.
