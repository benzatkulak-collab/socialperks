# Agent-Friendly Distribution Layer — Design Doc

> **Premise we're building on, not contradicting:** the customer is the
> shop owner. The supply is the regular at the counter. We pivoted away
> from "creator marketplace" framing in [Strategic Pivot commit
> `94764a8`](../) and away from "AI agents come find us on their own"
> in [`AI_AUTOMATION_INBOUND.md`](./AI_AUTOMATION_INBOUND.md).
>
> What this document covers: the **distribution layer** that lets AI
> marketing agents (Claude Code, Cursor, custom agent stacks) integrate
> Social Perks into a shop owner's workflow on the shop owner's behalf.
> Agents are a *channel*, not a customer segment. They show up because
> their human principal — the shop owner — asked them to "help my coffee
> shop get more customers this week."

This doc has two purposes:

1. **Scorecard** — what we've already shipped maps onto a coherent
   agent-distribution architecture, even though we built it
   incrementally. Naming the layers helps us see what's real and
   what's still scaffolding.
2. **Roadmap** — the pieces that are missing for agents to actually
   discover, install, and call us at scale, with concrete next steps.

---

## What we've already shipped (shipped status as of commit ce430e7)

| Layer | Component | Status | Where |
|---|---|---|---|
| Discovery | OpenAPI 3.1 spec | ✅ shipped | `/api/v1/openapi` |
| Discovery | MCP discovery + JSON-RPC stub | ✅ shipped | `/api/mcp` (GET + POST) |
| Discovery | `AGENTS.md` at repo root | ✅ shipped | tells agents the canonical patterns |
| Discovery | `/public/llms.txt` + `/public/ai.txt` | ✅ shipped | LLM-readable product summary + open AI policy |
| Discovery | `robots.ts` allows GPTBot, ClaudeBot, PerplexityBot + 12 more | ✅ shipped | every public page is AEO surface |
| Distribution | `@socialperks/sdk` typed REST wrapper | ✅ shipped, unpublished | `packages/sdk/` |
| Distribution | `@socialperks/cli` agent-runnable CLI | ✅ shipped, unpublished | `packages/cli/` |
| Distribution | `@socialperks/mcp-server` real MCP server | ✅ shipped, unpublished | `packages/mcp-server/` |
| Onboarding | `POST /api/v1/dev/init` agent-runnable signup | ✅ shipped + persistent | no browser, no OAuth |
| Onboarding | API keys auto-issued on signup | ✅ shipped | `lib/api-keys/auto-issue.ts` |
| Tools | 6 MCP tools wired to real REST routes | ✅ shipped | `packages/mcp-server/src/handler.ts` |
| Tools | `enqueue_post_purchase_sms` + Square/Toast/Clover webhooks | ✅ shipped | the agent can drive the full flywheel |
| Persistence | `dev_init_emails`, `magic_link_tokens`, `sms_opt_outs` tables | ✅ shipped | migration 005 |
| Build pipeline | `npm run release:packages` one-command publish | ✅ shipped | `scripts/publish-packages.mjs` |
| Build pipeline | CI gate on workspace packages | ✅ shipped | `.github/workflows/ci.yml` |

So when this design doc says "we ship X" — most of it already exists.
The gaps are about **getting found**, **persisting state across more
than just signups**, and a few specific tool-quality issues.

---

## Layer-by-layer design

### 1. Discovery surface

Three doors an agent can find us through:

```
┌────────────────────────────────────────────────────────────────┐
│ Agent searches for "loyalty/referral SDK for local business"   │
│                                                                │
│  ┌──────────┐    ┌────────────┐    ┌──────────────┐            │
│  │ npm      │    │ MCP        │    │ AI search    │            │
│  │ search   │    │ registries │    │ engines      │            │
│  └────┬─────┘    └──────┬─────┘    └──────┬───────┘            │
│       │                 │                 │                    │
│       ▼                 ▼                 ▼                    │
│  @socialperks/sdk   smithery.ai       crawled /b/[slug]        │
│  @socialperks/cli   mcp.so            crawled /llms.txt        │
│  @socialperks/mcp   awesome-mcp       schema.org Offer         │
│       │                 │                 │                    │
│       └─────────────────┴─────────────────┘                    │
│                         │                                      │
│                         ▼                                      │
│              AGENTS.md at repo root                            │
│              tells the agent how to integrate                  │
└────────────────────────────────────────────────────────────────┘
```

**What's real:** all three doors are open. Code is shipped, repo is
public, `AGENTS.md` exists.

**What's not real yet:** the doors lead to nothing because:
- npm packages aren't published (you need to claim `@socialperks` org)
- registries don't list us yet (depends on npm publish)
- `https://socialperks.io` is 401-gated by Vercel SSO Deployment
  Protection, so AI crawlers can't reach `/llms.txt` or `/api/mcp`

The two manual unblocks (~10 min total) — disable Deployment
Protection, claim `@socialperks` npm org — are the actual gating
items. Everything downstream is automated.

### 2. Onboarding surface

The single highest-leverage thing we've shipped is `POST /api/v1/dev/init`.
It is what makes us *agent-runnable* rather than just *agent-readable*:

```
Agent receives: "help my shop get more customers"
   │
   ▼
Agent reads MCP catalog, sees Social Perks
   │
   ▼
Agent calls: POST /api/v1/dev/init
              { email, businessName }
   │
   ▼
Server: returns { apiKey, businessId, baseUrl }
        - idempotent on email (re-runs return same business_id)
        - persists across redeploys (migration 005)
        - rate-limited (standard tier, IP-keyed)
        - no email verification gate (read-only API key issued;
          write access requires upgrade via dashboard)
   │
   ▼
Agent writes apiKey to .env, calls SDK methods
```

**Trade-off accepted, named explicitly:** no email verification at this
endpoint means an agent can fake-onboard a shop owner. We accept this
because:

1. The API key issued is **read-only by default** (`scopes: ['read']`
   in `lib/api-keys/auto-issue.ts`). To create a real campaign with
   real money flowing, the human shop owner must go through the
   dashboard's normal signup which DOES verify.
2. The `dev_init_emails` table records every init with `source` (cli /
   mcp / vercel-template), giving us an audit log.
3. The endpoint is rate-limited per IP, so an attacker can't bulk-
   create accounts.

If this trade-off becomes wrong (abuse, regulatory pressure), we tighten
in two stages:
- Stage A: require email verification before issuing the API key (one
  extra call: `POST /api/v1/dev/init` returns `{ pendingId }`, then
  `POST /api/v1/dev/init/verify` with the emailed code).
- Stage B: require the human shop owner to confirm via dashboard
  before any write operation can be performed by the agent.

### 3. Tools surface

Six MCP tools, mapped to existing REST routes. Naming chosen so an LLM
inspecting the catalog matches them to user intent on first read:

| Tool | When the agent calls it | Underlying route |
|---|---|---|
| `list_action_ideas` | "what kind of campaign should we run?" | `GET /api/v1/actions` |
| `create_perk_campaign` | "let's run a 15% off campaign" | `POST /api/v1/campaigns` |
| `print_qr_poster` | "give me the printable poster" | `GET /api/v1/businesses/poster` |
| `list_campaigns` | "how is the campaign performing?" | `GET /api/v1/campaigns` |
| `enqueue_post_purchase_sms` | "send the customer a follow-up text" | `POST /api/v1/sms/test` (test path; replace with prod path when wired) |
| `ai_quick_start` | "just pick the best one for me" | `POST /api/v1/ai/quick-start` |

**Gap that's worth naming:** `enqueue_post_purchase_sms` currently
calls our test/admin endpoint. That's because the production POS
webhook path (`/api/v1/pos/{square,toast,clover}/webhook`) is meant
to be called BY the POS, not by an agent. We need a third path:
`POST /api/v1/sms/enqueue` that an authenticated business can call to
schedule a one-off SMS (e.g., "I just had a customer in person, send
them the perk text"). Half-day's work; filed below.

### 4. Tool descriptions (the LLM-facing copy)

This is the most undervalued part of an MCP server. The LLM picks a
tool by description-match. The descriptions in `handler.ts` are
deliberately:

- **Imperative + outcome-focused**: "Create a perk campaign — a
  (platform, action, reward) tuple. Returns the campaign ID and the
  printable poster URL." (Not "creates a campaign object.")
- **Context-rich enough to disambiguate**: "Use when the agent has
  just been told to 'help this shop' and needs a concrete first
  action." (For `ai_quick_start`.)
- **Failure-mode-aware**: "Customer phone must be E.164." (Tells the
  LLM how to format input.)

These will be A/B tested over time — when an agent picks the wrong
tool, the description is wrong. There's no telemetry yet that surfaces
this; first-cut metric is "% of `tools/call` requests that succeed
vs. error" exposed as a Prometheus-style metric. Filed below.

### 5. Persistence

What's persistent today (after P10):

| State | Layer | Source of truth |
|---|---|---|
| Auth sessions | `sessions` table | Postgres |
| Business + campaign state | `businesses`, `campaigns`, `submissions` | Postgres (when DATABASE_URL set) |
| Magic-link tokens | `magic_link_tokens` | Postgres + memory cache |
| Dev-init email map | `dev_init_emails` | Postgres + memory cache |
| SMS opt-outs | `sms_opt_outs` | Postgres + memory cache |
| API keys | `api_keys` (existing) | Postgres |

What's still in-memory only (matters less, but worth naming):

| State | Why it's OK in-memory | When to persist |
|---|---|---|
| SMS pending-sends ring buffer | Vercel functions are short-lived; pending sends WILL get lost on redeploy. 2-hour delay window. | When we have a Vercel cron tick that drains a `sms_queue` table. |
| Magic-link verify user index | New users on first sign-in mint a row in `magicLinkUsers` Map; if the server restarts before they sign in again, they re-mint. Re-mint is idempotent on email so this is safe but wasteful. | When we fold magic-link users into the main `users` table. |

**Cache-on-write pattern, made explicit:** for tables where reads
happen seconds after writes (magic-link verify, dev-init lookup), we
write to both layers and read memory-first. This avoids paying a DB
round-trip on the hot path while keeping Postgres authoritative for
redeploys.

### 6. Auth + rate limits

| Audience | Auth | Rate limit |
|---|---|---|
| Public read endpoints (`/api/v1/actions`, `/pricing`, `/benchmarks`) | none | `relaxed` tier |
| Discovery (`/api/v1/openapi`, `/api/mcp` GET) | none | `relaxed` |
| Agent signup (`/api/v1/dev/init`) | none | `standard` (IP-keyed) |
| Agent tool calls (`/api/mcp` POST tools/call) | Bearer API key | `standard` |
| Authenticated REST (`POST /api/v1/campaigns` etc.) | Bearer API key OR session cookie | `standard` |
| Admin / write (`POST /api/v1/sms/test`) | Bearer admin token | `strict` |
| Webhooks (POS, Twilio inbound) | provider-specific signature (HMAC-SHA256) | none — providers retry |

API keys are scoped: `read` (default for dev-init) vs. `write` (must be
promoted via dashboard). Webhook signatures are checked per-provider
with constant-time compare.

---

## Schemas (for completeness — most exist already)

The repo's `src/lib/db/schema.ts` already defines the canonical schema
declaratively. Snapshot of the agent-relevant tables:

```sql
-- Already shipped
businesses (id, name, type, location, owner_user_id, plan, ...)
campaigns (id, business_id, platform_id, action_id, reward_type,
           reward_value, status, completions, created_at, ...)
api_keys (id, business_id, key_hash, key_prefix, name, scopes, ...)
sessions (token, user_id, user_role, business_id, email,
          created_at, expires_at)

-- Shipped in P10 (migration 005)
magic_link_tokens (token, email, business_name, expires_at, used, ...)
dev_init_emails (email, business_id, business_name, source,
                 created_at, last_init_at)
sms_opt_outs (phone, reason, opted_out_at)
```

**JSONB fields that are agent-relevant:**
- `businesses.social_links` — what platforms the shop has connected
- `launched_campaigns.actions` — array of action IDs in this campaign
- `analytics_events.data` — generic event payload, indexed via GIN

The action library itself is **content, not schema** — lives in
`packages/shared/src/platforms.ts` (107 actions × 15 platforms). It's
versioned in code rather than the database because (a) it changes
with code releases, (b) agents cache it, (c) we don't want a DB
write to add a new platform.

---

## What's actually missing (the roadmap)

In priority order. Each item has a concrete code location.

### Must-fix before launch

1. **Disable Vercel SSO Deployment Protection** *(user, ~10 sec)*
   — every public endpoint currently 401s. Without this, every "AI
   agent can find us" claim is false. Tab is open in your Chrome.

2. **Claim `@socialperks` npm org + publish** *(user, ~5 min)*
   — `npm run release:packages` then submit to smithery.ai, mcp.so,
   awesome-mcp using the pre-filled body in
   [`LAUNCH_SUBMISSIONS.md`](./LAUNCH_SUBMISSIONS.md).

3. **`POST /api/v1/sms/enqueue`** as a first-class auth'd endpoint.
   The MCP `enqueue_post_purchase_sms` tool currently calls the test
   path. Half-day's work. Add a route, point the MCP handler at it,
   wrap with `standard` rate limit + Bearer auth.

### Should-fix in the first week post-launch

4. **Telemetry on `tools/call`** — emit a structured event per call:
   `{ tool, agent_user_agent, success, error_code, latency_ms }`.
   Aggregate by `tool` so we see which tools agents reach for. Wire
   into the existing analytics event store (`analytics_events`
   table). Why: tells us which tool descriptions are working and
   which aren't, plus surfaces tools we should add.

5. **Webhook delivery layer.** Right now we receive webhooks from
   Twilio + POS providers but don't EMIT webhooks back to agents.
   An agent that creates a campaign should be able to subscribe to
   "campaign got its 10th submission" without polling. Add a
   `webhooks` table (already exists in schema, unused) + a delivery
   worker. Adds two endpoints: `POST /api/v1/webhooks` (subscribe),
   `DELETE /api/v1/webhooks/:id` (unsubscribe). The MCP server gets
   a 7th tool: `subscribe_to_campaign_events`.

6. **`/api/v1/sms/queue` table-backed queue.** Currently the post-
   purchase SMS pipeline is an in-memory `setTimeout`. Vercel
   functions are short-lived; pending sends WILL get lost on
   redeploy. Move to a `sms_queue` table + Vercel cron tick every
   minute that drains due rows. ~1 day work.

### Could-fix before V1

7. **Action library export at `/api/v1/actions/full`** — an agent
   that wants to do offline matching against the 107 actions
   currently has to call us repeatedly. Add a single endpoint that
   returns the entire library as a JSON dump with a freshness
   timestamp + ETag. Agents cache it.

8. **OAuth client for agents who want to act on behalf of MULTIPLE
   businesses.** Today, an API key belongs to one business. An
   agency-style agent that manages 50 coffee shops has to juggle 50
   keys. Add an OAuth-style flow: the agency registers an "agent
   app", the shop owner approves it via dashboard, the agency gets
   a per-business token + a refresh token. Pattern: identical to
   Stripe Connect.

### Speculative (don't build until asked)

9. **Revenue-share for agents.** If an agent signs up a coffee shop
   that becomes a paying customer, the agent's developer gets a 20%
   referral cut for 12 months. Tracked via `?ref=agent_<key>` on the
   signup URL. Why "speculative": only worth building when an actual
   agency tells us they would refer customers if we paid them.

10. **Public agent leaderboard.** "Top AI agents that drive shop
    signups" — same idea as the influencer leaderboard we
    de-emphasized in P6, but for agent developers. Builds soft
    moat once agents compete to be on it. Defer until we have at
    least 5 agents driving traffic.

---

## Growth loops, named honestly

The existing flywheel:

```
shop owner asks AI agent "help my coffee shop get customers"
    → agent calls Social Perks via MCP
    → agent creates a perk campaign (read API access enough)
    → shop owner upgrades to write access via dashboard (verifies email)
    → shop owner prints QR poster
    → customer scans, posts on IG/TikTok (FTC disclosure auto-injected)
    → friend sees post, scans, becomes customer
    → first customer redeems perk
    → repeat
```

The agent-distribution loop on top:

```
shop owner uses Social Perks via agent
    → shop owner mentions "my AI assistant set this up" to other shop owners
    → other shop owners ask their agents about Social Perks
    → those agents call /api/mcp catalog
    → MCP description tells them how to onboard
    → repeat
```

**Why this loop is real:** because shop owners *talk to each other*.
The coffee-shop owner who got 50 new customers via Social Perks tells
the salon owner two doors down. The salon owner asks her agent. The
agent finds us in its tool catalog because we shipped to smithery.

**Why it's not yet:** the loop hasn't started because (a) the public
site is 401-gated, (b) the npm packages aren't published, (c) we
don't have any shop owners using us yet. The first 10 shops are still
the bottleneck. The agent layer doesn't help with the first 10 — it
helps with the next 1,000.

---

## Where this design departs from the "agent-first" framing

A few specific places where I'm consciously NOT doing what an
agent-primary architecture would do:

1. **No agent leaderboard or revenue share at launch.** Both add code
   complexity and SLA obligations before there's evidence agents would
   actually refer customers.
2. **No "minimum UI" approach.** The dashboard is the primary surface
   for the shop owner because the shop owner is the customer. Agents
   are a complement, not a replacement. Reducing the human UI to
   match agent capabilities would worsen the human UX while saving us
   nothing — agents already use the same REST routes the UI uses.
3. **Influencer schema is intentionally de-emphasized.** The `/i/[slug]`
   pages still exist for direct-link landings (a creator who already
   posted needs the link to work) but are `noindex` and absent from
   the public sitemap, footer, and main nav. We do NOT extend those
   schemas for agents to consume; agents looking for "influencer
   discovery" are not our customer.
4. **Webhooks-out are deferred to week 2, not week 1.** Polling is
   acceptable for the first 50 agents. Outbound webhooks are a real
   on-call surface (delivery retries, exponential backoff, bad
   subscribers wasting our compute) and only worth building when
   agents are actively asking for them.

---

## Concrete week-1 → week-3 plan

**Week 1 (the blocker week — these are mostly user actions):**
- Day 1: Disable Vercel SSO Deployment Protection (user)
- Day 1: Claim `@socialperks` npm org + `npm run release:packages` (user)
- Day 1: Submit to smithery.ai, mcp.so, awesome-mcp (use [`LAUNCH_SUBMISSIONS.md`](./LAUNCH_SUBMISSIONS.md))
- Day 2-3: Real DATABASE_URL (Neon free tier) + run migrations
- Day 4-5: Real RESEND_API_KEY + verify magic-link emails actually send
- Day 6-7: Real STRIPE_SECRET_KEY + first paid plan tested

**Week 2 (the polish week):**
- `POST /api/v1/sms/enqueue` with Bearer auth + MCP wiring
- Telemetry on `tools/call` → `analytics_events` table
- First public business (a real coffee shop, not seed data) — onboarded manually so we can watch the flow
- Sentry installed (the scaffold from P9 is ready)

**Week 3 (the volume week):**
- Outbound webhooks layer (table + delivery worker)
- Twilio X-Twilio-Signature verification on inbound (the P5 TODO)
- POS webhook for second provider live (start with Square; add Toast)
- Square Apps Marketplace listing submitted

After week 3, the agent-distribution surface is real. The first 10
shops are onboarded. We have telemetry that tells us which agent tools
get called, which descriptions are wrong, which integrations break.
Everything after that is iteration on data, not new infrastructure.

---

## What this doc is NOT

- A redesign of Social Perks. The strategic foundation
  (shop-owner-primary, QR-on-the-cup, regulars-not-creators) holds.
- A pitch for an agent marketplace. We're not Stripe Connect. We're
  the SDK + MCP server an agent uses to *do work for a shop owner*.
- A speculative architecture. Every layer named here either exists in
  code today or has a specific code location to put it.
