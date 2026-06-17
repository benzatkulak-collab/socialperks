# Agent attraction layer audit: what we have vs what an AI agent would actually adopt

**Author:** Principal product engineer
**Date:** 2026-05-06
**Scope:** Honest assessment of whether Social Perks is *infrastructure* an autonomous AI agent would choose, or a website with an "AI-friendly" sticker.

---

## TL;DR — the thesis

**Social Perks has done the easy half of the agent attraction layer well, and the hard half not at all.** The discoverability surfaces — `AGENTS.md`, `/api/mcp`, `/api/v1/openapi`, `/llms.txt`, the SDK, robots-allowlisted AI crawlers, JSON-LD on every public page — are competently built. An agent can find the platform, read its schemas, and call its public reference data without trial-and-error. That is real, and most competitors don't have it.

What's missing is the part that would make an agent *choose this platform over alternatives in production*: autonomous-loop completeness (today an agent can't go from `goal → influencer → booking → settlement` without a human minting an API key), trust signals that an agent can actually reason about (no per-creator reputation score, no cryptographic attestation of completed work, exchange `/market` data is *synthetic*), and machine-readable contracts on the entities themselves (no `/api/v1/businesses/{id}.json` or `/api/v1/influencers/{id}/media-kit.json`). Discoverability is a hygiene factor; gravity comes from being the only place where an agent can *finish a job*. Today, Social Perks is great at being found and decent at being read — it's not yet great at being relied on.

---

## 1. Inventory: every machine-readable surface that exists today

This is not the whole API; this is what a remote agent can hit without prior context, plus the docs/discovery layer that points there.

### 1.1 Discovery & orientation

| Surface | File | Purpose |
|---|---|---|
| `AGENTS.md` (repo + `/AGENTS.md` on site) | `AGENTS.md` | Canonical orientation for AI agents. Lists MCP, OpenAPI, REST surfaces, auth methods, sample SDK call. |
| `/llms.txt` | `public/llms.txt` | llms.txt-style index of citable surfaces, including the `/api/v1/openapi` and `/api/mcp` URLs. |
| `/.well-known/ai-plugin.json` | `src/app/.well-known/ai-plugin.json/route.ts` | Legacy ChatGPT-plugin manifest. `name_for_model: "social_perks"`, points to OpenAPI. |
| `/api/llm-context` | `src/app/api/llm-context/route.ts` | Single-fetch dense context: summary, agent surfaces, citable pages, top-10 actions by value, sample queries, welcomed crawler list. Cached 1 day. |
| `/api/feed.json` | `src/app/api/feed.json/route.ts` | JSON Feed 1.1 of guides, comparisons, FAQ, glossary, best-of, benchmarks. |
| `/sitemap.xml` | `src/app/sitemap.ts` (239 lines) | Static + dynamic sitemap covering content pages. |
| `/robots.txt` | `src/app/robots.ts` | Explicit allow-list for `GPTBot`, `ChatGPT-User`, `OAI-SearchBot`, `ClaudeBot`, `Claude-Web`, `anthropic-ai`, `PerplexityBot`, `Google-Extended`, `Applebot-Extended`, `CCBot`, `cohere-ai`, `Bytespider`, `DuckAssistBot`, plus the public-API allowlist. |

### 1.2 Machine-callable APIs

Public/relaxed (no human auth required):

| Endpoint | File | Tier |
|---|---|---|
| `GET /api/v1/openapi` | `src/app/api/v1/openapi/route.ts` (397 lines, OpenAPI 3.1) | static, 1h cache |
| `GET /api/v1/pricing` | `src/app/api/v1/pricing/route.ts` | public |
| `GET /api/v1/actions` | `src/app/api/v1/actions/route.ts` | public |
| `GET /api/v1/benchmarks` | `src/app/api/v1/benchmarks/route.ts` | public |
| `GET /api/v1/influencers` | `src/app/api/v1/influencers/route.ts` | relaxed |
| `GET /api/v1/exchange/opportunities` | `src/app/api/v1/exchange/opportunities/route.ts` | public, 60s cache, includes a `supplyDeficit` 0..1 signal |
| `GET /api/v1/exchange/market` | `src/app/api/v1/exchange/market/route.ts` | public, 60s cache (**synthetic data** — see gap §3.4) |
| `GET /api/v1/exchange/orders` | `src/app/api/v1/exchange/orders/route.ts` | relaxed |
| `GET /api/v1/discover` | `src/app/api/v1/discover/route.ts` | relaxed; semantic recommendations for an `influencerId` |
| `GET /api/v1/search` | `src/app/api/v1/search/route.ts` | relaxed; full-text fuzzy search over campaigns/businesses/influencers/submissions |
| `GET /api/v1/matching/suggest` | `src/app/api/v1/matching/suggest/route.ts` | relaxed; **publishes its scoring formula in the response** so agents don't have to reverse-engineer |
| `GET /api/v1/transparency` | `src/app/api/v1/transparency/route.ts` | public; aggregate creator earnings, active campaigns, businesses |
| `GET /api/v1/health` | `src/app/api/v1/health/route.ts` | public |
| `GET /api/v1/legal` | `src/app/api/v1/legal/route.ts` | requires auth (auth-gated reference data — slight oddity) |
| `POST /api/mcp` | `src/app/api/mcp/route.ts` | JSON-RPC 2.0 / MCP 2025-03-26 with 5 tools |

Auth-gated mutating endpoints (the loop closes here, but only with an API key):

| Endpoint | File |
|---|---|
| `POST /api/v1/campaigns` | `src/app/api/v1/campaigns/route.ts` |
| `POST /api/v1/submissions` | `src/app/api/v1/submissions/route.ts` |
| `POST /api/v1/exchange/orders` (buy/sell) | `src/app/api/v1/exchange/orders/route.ts` |
| `POST /api/v1/exchange/trades` (proof / verify / settle / dispute) | `src/app/api/v1/exchange/trades/route.ts` |
| `POST /api/v1/exchange/enroll` (creator agent) | `src/app/api/v1/exchange/enroll/route.ts` |
| `POST /api/v1/ai/quick-start` / `campaign-agent` / `recommend` / `review` / `generate` | `src/app/api/v1/ai/*` |
| `POST /api/v1/api-keys` | `src/app/api/v1/api-keys/route.ts` (humans only — keys can't mint keys) |

### 1.3 Authentication paths an agent can use

| Method | Where | Notes |
|---|---|---|
| `x-api-key: sp_live_...` | `src/lib/auth/api-keys.ts` (428 lines: hash, generate, parse, persist, verify, revoke) | The recommended path. `agentName` field is required at creation — every key is bound to a named agent. Permissions allowlist: `read | write | admin`. Optional `expiresInDays` (1..3650). |
| `Authorization: Bearer <jwt>` | `src/app/api/v1/auth/route.ts`, mirrored by `src/app/api/v2/auth/route.ts` | User-scoped flows. |
| Session cookie | Same | Browser-embedded only. |
| OAuth | `src/app/api/v1/oauth/connect/route.ts`, `src/app/api/v1/oauth/[platform]/route.ts` | For social-platform connection on behalf of a *user*, not for agent auth into Social Perks itself. |

### 1.4 Schema.org / structured data on public pages

Every entity page emits JSON-LD via `safeJsonForScript()` (`src/lib/security/json-ld.ts`):

- `LocalBusiness` on `src/app/b/[slug]/page.tsx`
- `Person` on `src/app/i/[slug]/page.tsx` (creator profiles)
- `Service` + `Offer` on `src/app/actions/[actionId]/page.tsx`
- `HowTo` on `src/app/guides/[slug]/page.tsx`
- `FAQPage` on `src/app/faq/page.tsx` and the pricing section
- `Organization` on most marketing pages
- `Article` on blog/comparisons/playbook/best-of/vs/for-industry-platform pages

Notable absences:
- No `Speakable` schema despite `claude/agent-discovery` Phase 4 commit message claiming it. Grep across `src` finds zero `Speakable` literals.
- No `AggregateRating` on creator or business profiles (would be the natural place for a reputation score).
- No `Offer.priceSpecification` with `eligibleQuantity` on action pages — action pages have an `Offer` but no structured terms an agent can act on.

### 1.5 SDK

`packages/sdk/src/index.ts` (203 lines). Wraps `pricing`, `actions`, `benchmarks`, `campaigns`, `submissions`, `exchange.opportunities/market`, `ai.quickStart/campaignAgent`, `health`. Throws typed `SocialPerksError` with `code`, `status`, `requestId`. No retry, no streaming, no idempotency-key helper, no pagination iterator.

---

## 2. Capability scorecard

For each capability an autonomous agent realistically needs to choose Social Perks over scraping HTML or building on Yotpo + a creator marketplace + Stripe.

| Capability | What exists | Gap | Priority |
|---|---|---|---|
| **Machine-readable business profile** | HTML page with `LocalBusiness` JSON-LD at `/b/[slug]` (`src/app/b/[slug]/page.tsx:67`). | No `GET /api/v1/businesses/{id}` JSON endpoint. An agent has to scrape the HTML or pull a single business from `/api/v1/influencers`-style filter, which doesn't exist. | **HIGH** |
| **Machine-readable creator profile** | HTML page with `Person` JSON-LD at `/i/[slug]` and `GET /api/v1/influencers` returns full `SeedInfluencer` records. Authenticated `/api/v1/influencers/me/earnings` returns the creator's own earnings. | No public `GET /api/v1/influencers/{id}` (must filter the list). No structured rate-card endpoint. The `media-kit.tsx` component is UI-only (`src/components/influencer/media-kit.tsx`) — nothing serves the rate card as JSON for an external agent to read. | **HIGH** |
| **Autonomous end-to-end workflow** | `POST /api/v1/campaigns` → `POST /api/v1/exchange/orders` → `POST /api/v1/exchange/trades` (submit_proof / verify / settle) is fully scripted on the order/trade side (`src/app/api/v1/exchange/trades/route.ts`). | A buy-side agent **cannot mint its own API key** — `src/app/api/v1/api-keys/route.ts:33` explicitly returns `FORBIDDEN` if `user.role === "agent"`. Onboarding requires a human dashboard visit. There is no machine-to-machine OAuth client-credentials flow. | **HIGH** |
| **Semantic discoverability** | `GET /api/v1/discover` (semantic, `src/lib/search/semantic-search.ts`), `GET /api/v1/recommendations` (60% semantic + 40% niche affinity), `GET /api/v1/search` (full-text fuzzy), `GET /api/v1/matching/suggest` (publishes formula). Embeddings via `src/lib/embedding-engine.ts`. | Two of these (`discover`, `recommendations`) are *creator → campaign*. The reverse — *campaign → creator agent* — exists only inside `matching/suggest` and isn't exposed via MCP. The MCP server has no `searchCampaigns` or `matchCreators` tool, only `searchInfluencers` (basic platform/follower filter). | MEDIUM |
| **Agent-to-agent negotiation** | None. The exchange has `Order` and `Trade` records with `pricePerUnit`, but no counter-offer state. | An agent placing a buy order at $3.50 against a sell order at $5.00 has no protocol to negotiate; they just don't match. Pricing oracle (`/api/v1/pricing`) gives a single number, not a band. | MEDIUM |
| **Auto-generated media kits** | `media-kit.tsx` UI exists; not API-callable. | No `GET /api/v1/influencers/{id}/media-kit` returning portfolio + verified stats + rate card. This is the *core artifact* a brand-side agent needs to evaluate a creator. | **HIGH** |
| **Reputation / trust signals** | `transparency/route.ts` returns *aggregate* dollars paid out. `matching/suggest` exposes a `freshness_bonus` and `tier_multiplier`. Submissions go through fraud detection (`src/lib/fraud-detection.ts`). | No per-entity reputation: no `completionRate`, `disputeRate`, `avgResponseTimeHours`, `verifiedSinceDate`, `cancelledTradesCount` on either business or creator. Nothing is cryptographically attestable — an agent has to trust whatever number we publish. | **HIGH** |
| **AI-readable campaign briefs** | `Campaign` model (`src/app/api/v1/openapi/route.ts:123`) has `actionId`, `platformId`, `rewardType`, `rewardValue`, `tier`, `status`. | Campaigns expose *terms*, not a *brief*. There's no `goalDescription`, `mustInclude`, `mustNotInclude`, `targetPersona`, `examplePostUrl`, `submissionDeadline` — the things a creator-agent needs to actually produce work. The AI marketing plan (`/api/v1/ai/campaign-agent`) generates these but doesn't persist them on the campaign. | **HIGH** |
| **Pricing intelligence** | `GET /api/v1/pricing` is genuinely good — returns `estimatedValueUsd` + `recommendedPerk` keyed by `actionId`/`platformId`/`businessType`. | Returns a point estimate, no confidence interval, no time-of-day or geographic modifier, no historical price series. The `/api/v1/exchange/market?view=history` endpoint exists but is **synthetic** — `src/app/api/v1/exchange/market/route.ts:25` (`syntheticPrice`, `seededRandom`). | MEDIUM |
| **Memory / session persistence** | None at the SDK or API level. Each call is stateless. | An agent running a multi-day campaign-tuning loop has no `?sessionId=` to attach context to, no place to store its "I tried this last week, it didn't work" notes, no idempotency-key support visible in the SDK. | LOW (skip — agents have their own memory; we just need clean primitives) |
| **Trust verification (attestation)** | `/api/v1/audit` (admin-only) tracks `submission.approved/rejected`, `api_key.created/revoked`, etc. (`src/lib/audit-log.ts`). Webhooks are HMAC-SHA256 signed with replay protection (`src/app/api/v1/verification/webhook/route.ts`). | None of this is publicly verifiable. There is no signed receipt an agent can carry away ("Social Perks attests creator `cre_123` completed campaign `cam_456` on `2026-05-06T...` and was paid $42.00"). No transparency log á la Sigstore/Rekor. No pub-key for verifying submission approvals. | **HIGH** |
| **Bot-operable dashboards** | Most dashboard actions have an API equivalent — campaign CRUD, submission review, programs, payouts, billing all live at `/api/v1/*`. | The API-key creation flow (`src/app/api/v1/api-keys/route.ts:33,63`) is the one explicit bot-blocker, and it's the most important one. Also no programmatic `POST /api/v1/businesses` for self-service business creation by an agent. | MEDIUM |
| **Multi-agent collaboration** | None at the protocol level. | A business-side agent and a creator-side agent currently meet only via the order book — no negotiation channel, no shared workspace, no campaign-scoped chat thread an agent can read or post to. | LOW (skip for now — order book may be enough for v1 if we close §3) |

---

## 3. The killer question: $500, "find an influencer for my client and book them"

You are an autonomous agent in late 2027. A client says: "Find me an Instagram micro-influencer in DC who covers coffee, and book a single Reel post. Budget: $500."

### What you'd do on Social Perks today

1. `GET /api/llm-context` — orient. **Works.** (`src/app/api/llm-context/route.ts`)
2. `GET /api/v1/matching/suggest?platformId=ig&niche=coffee&city=dc&limit=5` — get ranked candidates with explained scoring. **Works** and is genuinely good (`src/app/api/v1/matching/suggest/route.ts`).
3. For your top candidate (call them `i_abc`), you want their rate card, recent work, and reputation:
   - `GET /api/v1/influencers/{id}` — **doesn't exist.** Have to filter `/api/v1/influencers` by something to find them again, or scrape `/i/[slug]`.
   - `GET /api/v1/influencers/{id}/media-kit.json` — **doesn't exist.** Only the React component exists (`src/components/influencer/media-kit.tsx`).
   - No reputation signal beyond `tier` and `engagementRate`.
4. `GET /api/v1/pricing?actionId=ig_rl&platformId=ig` — Reel pricing. **Works.** Returns `$4.00`.
5. Wait — $4.00 is per *completion*, not per *Reel post by a 50K micro-influencer in DC*. The follower bonus tier system (`FOLLOWER_TIERS` in `src/lib/platforms.ts`) adjusts that, and `/api/v1/exchange/opportunities` does compute it for the creator side, but **the buyer-side estimate doesn't blend in follower count or geographic rarity.** Your $500 budget could buy 125 Reels at base rate. That's nonsense.
6. You need an API key. `POST /api/v1/api-keys` returns `FORBIDDEN` if you tried via API key auth (`src/app/api/v1/api-keys/route.ts:62`). **You need a human.** End of autonomous flow.
7. (Assume the human minted you a key.) `POST /api/v1/exchange/orders { side: "buy", actionId: "ig_rl", quantity: 1, pricePerUnit: 50 }` — places a buy order. **Works** (`src/app/api/v1/exchange/orders/route.ts`).
8. Now wait. There is no protocol to *direct-message* `i_abc` and ask "will you take this?". You're hoping they (or their agent) sees an open order and matches. There is no "preferred creator" field on the order.
9. Eventually a `Trade` exists, `i_abc` posts the Reel, submits proof via `POST /api/v1/exchange/trades { action: "submit_proof" }`, you `verify`, then `settle`. **Works** (`src/app/api/v1/exchange/trades/route.ts`).
10. You owe your client a receipt. The platform doesn't issue you a signed attestation. You can show them `/api/v1/transparency` (aggregate, not your specific deal) and `/api/v1/audit` (admin-only — you don't have access).

### What the next-best alternative looks like

A horizontal influencer marketplace (Aspire, GRIN, Mat) probably does not have an OpenAPI spec, an MCP server, an `/llms.txt`, or an exchange. Discovery is HTML scraping or salesperson-mediated.

**Where Social Perks wins right now:** discovery (`/api/llm-context`, MCP, OpenAPI), reference data (`/pricing`, `/actions`, `/benchmarks`), the matching engine with published formula, and the order/trade lifecycle for the *creator → buyer → settlement* leg once you're inside.

**Where we lose:** the agent can't onboard itself (API key gate), can't fetch a single creator's full agent-readable profile, can't read a structured campaign brief (because we don't store one), can't get a defensible price with confidence interval, can't direct-target a creator, and walks away without a verifiable receipt. Five of the ten steps above hit a wall.

That's the gap between "the agent discovers us" and "the agent finishes the job here."

---

## 4. Concrete proposals — five gaps that move the needle

### Proposal A — Self-service agent API keys via OAuth client-credentials

**Schema/route:** `POST /api/v1/oauth/token` with `grant_type=client_credentials`, returning a short-lived `access_token` (15 min) bound to a registered *agent application*. `POST /api/v1/agent-apps` (human-gated, like API keys today) registers the application and yields a `client_id`/`client_secret`.

**Slots into:** `src/lib/auth/api-keys.ts` (extends the issuance path), new `src/lib/auth/oauth-clients.ts`, `src/app/api/v1/api-keys/route.ts:33` (the explicit bot-block) becomes the right behavior because agents now use a different surface entirely.

**Why hard to copy:** This is the difference between "you have to call your sales rep" and "your agent SDK can register itself in 60 seconds with a webhook callback for human consent." Whoever is the easiest place for an autonomous agent to *self-onboard* in the influencer-marketing space will win the long tail of agent-built tools.

**Effort:** **M** — OAuth machinery is well-trodden but auditable issuance + scope-bound tokens + consent UI is real work.

### Proposal B — `GET /api/v1/influencers/{id}/media-kit.json` and the equivalent for businesses

**Schema/route:**
```
GET /api/v1/influencers/{id}/media-kit.json
→ {
    profile: { displayName, bio, niches[], location, joinedAt, tier, verifiedPlatforms[] },
    stats:   { followers, engagementRate, completedCampaigns, completionRate, disputeRate, avgResponseHours },
    portfolio: [{ campaignId, platformId, postUrl, metrics, completedAt }],
    rateCard:  [{ actionId, platformId, basePrice, minQuantity, leadTimeHours }],
    availability: { acceptingNew: bool, capacityRemaining: int, nextSlotAt }
  }
GET /api/v1/businesses/{id}.json  — same idea, brand-side
```

**Slots into:** `src/components/influencer/media-kit.tsx` already has the type model — promote it to a server-rendered JSON endpoint. `src/app/api/v1/influencers/me/earnings/route.ts` is the precedent for serving an authenticated creator their own data; this is the public version. Add MCP tool `getMediaKit`.

**Why hard to copy:** Once agents standardize on this shape, switching cost is the rate cards. A platform without a programmatic media kit forces every brand-side agent to scrape; once Social Perks ships this, every agent SDK will hard-code the URL pattern.

**Effort:** **S** for the v0 (most fields exist on `SeedInfluencer`), **M** to hook in real `completionRate`/`disputeRate` from `audit-log.ts` + `submissions`.

### Proposal C — Structured campaign briefs with `goalDescription`, `mustInclude`, `examplePostUrl`

**Schema/route:** Extend `Campaign` (currently `{ actionId, platformId, rewardType, rewardValue, tier, status }` per `src/app/api/v1/openapi/route.ts:123`) with a `brief: { goal, mustInclude[], mustNotInclude[], targetPersona, examplePostUrls[], submissionDeadline, hashtags[], mentions[] }`. New `GET /api/v1/campaigns/{id}/brief` returns just the brief subset, public if the campaign is in `active` state on the exchange. New MCP tool `getCampaignBrief`.

**Slots into:** `src/app/api/v1/campaigns/route.ts` accepts the new fields on POST. `src/lib/ai-engine.ts` already produces brief-shaped output for `/api/v1/ai/campaign-agent` — wire that as the default brief generator. `src/app/api/v1/exchange/opportunities/route.ts` includes `briefSummary` in its response.

**Why hard to copy:** Today every creator-agent is doing freeform interpretation of a 30-character `Campaign.tier` and a numeric reward. A structured brief is the protocol two agents need to negotiate without a human. First platform to standardize this *for agents* defines the contract.

**Effort:** **M** — schema migration + AI-engine integration + showing the brief in the exchange UI for human readability.

### Proposal D — Per-entity reputation surface + signed completion receipts

**Schema/route:**
```
GET /api/v1/influencers/{id}/reputation
→ {
    completionRate: 0.97, disputeRate: 0.01, totalCompleted: 142,
    avgResponseHours: 4.2, verifiedSinceDate: "2025-11-12",
    asOf: "2026-05-06T18:00:00Z",
    signature: "ed25519:..." // signs (entityId | counters | asOf)
  }
GET /api/v1/.well-known/jwks.json
→ public keys for verifying signatures
GET /api/v1/trades/{id}/receipt
→ signed JWT { sub: tradeId, buyer, seller, action, paidAmount, settledAt, sig }
```

**Slots into:** New `src/lib/reputation/aggregator.ts` derives counters from `audit-log.ts` events (which already track `submission.approved/rejected`, `cashback.paid_out`). `src/lib/security/` adds Ed25519 signing. `src/app/api/v1/exchange/trades/route.ts` issues the receipt on `settle`. AggregateRating JSON-LD on `/i/[slug]` and `/b/[slug]` consumes this.

**Why hard to copy:** This is the only one on the list that's *cryptographically* defensible. Once Social Perks has signed receipts and a public JWKS, an agent presenting "I shipped this campaign through Social Perks" carries a receipt that any other system can verify offline. That's a portable trust primitive — the exact thing that turns a marketplace into infrastructure. Stripe did this with signed webhooks; Sigstore did it with Rekor; nobody in influencer marketing has done it.

**Effort:** **L** — key management + signing + JWKS rotation + UI surfaces + JSON-LD `AggregateRating` + handling counter-revisions when a submission is later disputed.

### Proposal E — Pricing oracle v2 with confidence interval, geo, and follower modifiers (and stop calling synthetic data "market data")

**Schema/route:** `GET /api/v1/pricing?actionId=ig_rl&platformId=ig&followerCount=50000&location=dc&businessType=cafe` returns `{ p50, p25, p75, sampleSize, asOf, factors: [{ name, multiplier }] }`. Factors are explained. Real history available at `GET /api/v1/exchange/market?view=history` once we have actual fills; until then mark `mode: "synthetic"` explicitly.

**Slots into:** `src/app/api/v1/pricing/route.ts` extends. `src/app/api/v1/exchange/market/route.ts:24` (`syntheticPrice`) gets a `mode` field — same fix as `/api/v1/transparency` already does (`mode: "demo" | "live"`). Once the `Trade` table accumulates real fills, swap to real percentiles.

**Why hard to copy:** Pricing intelligence depends on volume. The platform with the most settled trades wins by default. But shipping the *interface* before the volume exists matters because agents code against shape, and that shape is what they expect when the data does become real.

**Effort:** **S** for the interface change + honesty fix; **M** to wire to real trade history.

---

## 5. Skipped capabilities (don't pretend these matter yet)

- **Memory / session persistence on our side.** Skip. Agents have their own memory. We just need stateless primitives that are easy to call repeatedly, plus stable IDs. Adding our own session-context store would be a feature looking for a problem.
- **Multi-agent collaboration channel.** Skip until Proposal C (briefs) and Proposal A (self-service onboarding) are in. Without those, there's nothing for two agents to actually negotiate about.
- **Speakable schema.** The Phase-4 commit message claims it, the code doesn't have it. It's a low-leverage signal compared to the gaps above. Either ship it for one page (FAQ) and move on, or drop the claim from `/api/llm-context`. Skip as a major audit line item.

---

## 6. Why an agent would choose this platform — one paragraph, sharp

If we ship Proposals A through D, the answer becomes: **Social Perks is the only place an autonomous agent can register itself, fetch a structured campaign brief, match against a creator with a programmatically-readable media kit and a cryptographically-signed reputation, settle a trade, and walk away with a verifiable receipt — without ever talking to a human.** Every other influencer marketplace makes the agent scrape HTML, email a salesperson, or hand-roll trust. We are the only one that closed the loop. That is gravity, not feature parity: every agent SDK that integrates the Social Perks media-kit shape and signed-receipt format becomes a distribution channel, and switching to a competitor means re-implementing the contract on top of a worse substrate.

The headline isn't "AI-friendly." The headline is **"settled, signed, and self-serve."**

---

## 7. Citations & evidence index

- AGENTS.md — `AGENTS.md`
- MCP server — `src/app/api/mcp/route.ts`
- OpenAPI 3.1 spec — `src/app/api/v1/openapi/route.ts`
- llm-context dense brief — `src/app/api/llm-context/route.ts`
- llms.txt — `public/llms.txt`
- AI plugin manifest — `src/app/.well-known/ai-plugin.json/route.ts`
- JSON Feed — `src/app/api/feed.json/route.ts`
- robots.txt with named AI crawlers — `src/app/robots.ts`
- API key issuance + agent block — `src/app/api/v1/api-keys/route.ts:33,62`; `src/lib/auth/api-keys.ts`
- Audit log — `src/lib/audit-log.ts`; `src/app/api/v1/audit/route.ts`
- Webhook HMAC + replay protection — `src/app/api/v1/verification/webhook/route.ts`
- Semantic search — `src/lib/search/semantic-search.ts`; `src/app/api/v1/discover/route.ts`
- Full-text search — `src/app/api/v1/search/route.ts`
- Matching engine with published formula — `src/app/api/v1/matching/suggest/route.ts:8-32`
- Recommendations (60% semantic + 40% niche) — `src/app/api/v1/recommendations/route.ts:8`
- Synthetic market data — `src/app/api/v1/exchange/market/route.ts:24-34`
- Exchange order/trade lifecycle — `src/app/api/v1/exchange/orders/route.ts`, `src/app/api/v1/exchange/trades/route.ts`
- Public business profile + LocalBusiness JSON-LD — `src/app/b/[slug]/page.tsx:67`
- Public creator profile + Person JSON-LD — `src/app/i/[slug]/page.tsx:83`
- HowTo / FAQ / Service / Offer JSON-LD — `src/app/guides/[slug]/page.tsx:64`, `src/app/faq/page.tsx:46`, `src/app/actions/[actionId]/page.tsx:137`
- Safe JSON-LD serializer — `src/lib/security/json-ld.ts`
- SDK — `packages/sdk/src/index.ts`
- Transparency endpoint — `src/app/api/v1/transparency/route.ts`
- Media kit UI (no API equivalent) — `src/components/influencer/media-kit.tsx`
- Authenticated creator earnings — `src/app/api/v1/influencers/me/earnings/route.ts`
