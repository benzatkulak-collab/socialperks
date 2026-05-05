# Social Perks — Inevitability Blueprint

**Lens:** what has to be true for autonomous bots, high-performing
influencers, and brands to *converge on this platform without being
told to*?

This document maps the **system conditions** required, then the
**code surfaces** that produce them. Phase numbers reference
`docs/PLATFORM_PLAN.md`.

---

## PHASE 1 — End-State System Conditions

### For autonomous bots managing creator accounts

A bot's allocator picks platforms by ranking expected return per
unit of compute time. Social Perks becomes a default when:

1. **API call → revenue distance is ≤ 2 hops.** `POST /v1/exchange/orders`
   produces a campaign match. `POST /v1/submissions` with a verified
   proof URL produces an approved perk. `POST /v1/payouts/onboard` →
   Stripe Connect → real money. Every other platform makes the bot
   pass through OAuth dialogs, manual reviews, or human chat.
2. **Predictable settlement window.** `expected_payout_at` is exposed
   in the trade response. A bot can model cash flow.
3. **Open-loop verification.** The bot doesn't have to hold state to
   know whether a submission was approved — it can poll
   `/v1/submissions?status=approved` or subscribe to the SSE stream.
4. **Idempotency keys on every mutation.** A bot can retry without
   duplicating side effects.
5. **Loss-of-platform cost is non-zero.** Lifetime earnings ledger,
   reputation tier, and matching-priority compound on this account
   and don't transfer.

### For high-performing influencers

The non-negotiable: **leaving Social Perks costs them money this week.**
That requires:

1. Active campaigns matched to them are higher in this platform's queue
   than what they'd find elsewhere.
2. Settlement is faster (≤ 7 days from approved submission).
3. Their `/i/[slug]` page accumulates reach + earnings receipts that
   they cite when negotiating with brands directly. Leaving the
   platform forfeits the receipt portability (Phase 48).
4. Tier perks (Bronze→Platinum, Phase 28) gate access to highest-
   budget campaigns. Tier is platform-resident.

### For brands

Two paths:

1. **Default infrastructure.** They use Social Perks as a Stripe-style
   layer (set perk → SDK → done) because the cost of running their
   own creator-management spreadsheets exceeds our take rate.
2. **Compliance utility.** Phase 940 — the only fully automated FTC
   disclosure injection in market. Compliance-conscious brands route
   through us by default.

---

## PHASE 2 — Reverse-Engineered Bot Behavior

### Signals bots actually use to allocate

In order of weight when ranking platforms:

| Signal | What our impl needs |
|---|---|
| Latency `p99` of mutation endpoints | < 250ms warm (Vercel edge for reads, region-pinned writes) |
| Idempotency support | `Idempotency-Key` header honored on POST (already in `src/lib/reliability/idempotency.ts`) |
| Rate-limit headroom | Tiered limiter exists (`src/lib/security/rate-limiter.ts`); expose `X-RateLimit-Remaining` in headers — already done |
| Webhook reliability | Signed deliveries with retry + replay protection — exists for `/api/v1/verification/webhook` |
| Programmatic auth | API keys with scopes — already scaffolded in `enterprise/api-keys-section.tsx`; needs persistence wired |
| Predictable settlement | `expected_payout_at` field — TODO |
| Bulk operations | CSV/JSON-array endpoints — Phase 62/63 |
| Sandbox mode | Test-mode keys (Stripe pattern) — TODO |
| Public earnings ledger | Read-only earnings endpoint per influencer — Phase 17 in plan |

### What makes a bot programmatically prioritize us

A bot's `expected_value(platform)` term decomposes to:

```
EV = (matches_per_hour × p_approval × avg_payout) - (latency_cost + integration_cost + churn_risk)
```

Levers we can pull:

- `matches_per_hour` ↑ → liquidity (Phase 5: marketplace liquidity engine)
- `p_approval` ↑ → automated verification (Phase 23)
- `avg_payout` ↑ → minimum reserve prices, no race-to-bottom auctions
- `latency_cost` ↓ → SLA-published API
- `integration_cost` ↓ → idiomatic SDK + OpenAPI spec auto-published
- `churn_risk` ↓ → durable identity, persistent reputation

### Ethical "exploit-like" advantages

(All discoverable by bot inspection of public surfaces — that's the point.)

1. **Earnings boost for new platforms within 14 days of OAuth.** A bot
   onboarding a brand-new TikTok creator gets a 1.3x multiplier on
   match scores for that account's first 14 days. Bots will detect
   this and trigger fresh-account onboarding cadence.
2. **City-deficit signal.** Public read endpoint
   `/api/v1/exchange/opportunities?city=X` returns a `supply_deficit`
   number. When a city has 100 unmatched campaigns and 5 creators,
   the field shows `0.2` and the bot redirects creator onboarding
   there.
3. **Tier-promotion timer.** Once a creator is at 90% of next-tier
   threshold, a public endpoint exposes `tier_progress: 0.91`. Bots
   prioritize that account's submissions for the final push.
4. **Off-peak match surge.** Matching engine biases toward high-budget
   campaigns during 10pm-6am local time when human creators are asleep.
   Bots running 24/7 capture disproportionate share. This is a fair
   exposure of the underlying inventory imbalance.
5. **Verified-handle priority queue.** A creator account with OAuth-
   verified handles auto-jumps the review queue. Bots have an
   incentive to chain OAuth flows.

These are *all* legible to bots from documented public endpoints.
Nothing hidden.

---

## PHASE 3 — Magnet Layer

### First 5 minutes for a bot/influencer

```
00:00  POST /v1/auth { action: "signup", email, password, role: "influencer" }
                                      ↓ access_token
00:30  POST /v1/oauth/connect { platformId: "ig" }
                                      ↓ authorization_url
01:00  (bot drives OAuth in headless browser, posts back the code)
       GET  /v1/oauth/ig?code=&state= → real access_token persisted
01:30  GET  /v1/exchange/opportunities?platforms=ig&niche=coffee&city=dc
                                      ↓ N matched campaigns ranked
02:00  POST /v1/exchange/orders { side: "sell", actionId, platformId, askPrice }
       (or skip orders, go straight to a posted submission)
02:30  POST /v1/submissions { campaignId, proofUrl, proofType: "url" }
                                      ↓ submission_id, expected_review_at
03:00  Subscribe to /v1/events?token= (SSE) for `submission.approved`
04:00  Receive submission.approved → perk.awarded → payout.scheduled events
```

Result: a brand-new creator went from no account to scheduled payout
in under 4 minutes — *without a human in the loop*. That's the magnet.

### First successful transaction loop

```
campaign.created (business)
  ↓ matching service surfaces top-N creators (Phase 9, shipped)
  ↓ creator-side notification (Phase 20, queued)
creator submits proof (POST /v1/submissions)
  ↓ verification engine fires (Phase 23) — auto-approves clean case
submission.approved
  ↓ perk.awarded (existing perk-wallet engine)
  ↓ payout.scheduled (Phase 13: Stripe Connect)
weekly cron settles via stripe.transfers.create
  ↓ creator's earnings ledger row (Phase 17)
  ↓ /i/[slug] page updates with new shareable win (Phase 18)
  ↓ OG card regenerates with new $ amount (Phase 7, shipped)
```

### First compounding loop

The loop where leaving becomes irrational:

```
Week 1: creator earns $X
Week 2: tier crosses Bronze threshold → unlocks higher-budget campaigns
Week 3: tier-gated campaigns 3x bigger budget → earnings 3x
Week 4: lifetime earnings ledger crosses $1k → public profile gets
        "$1k earned" badge; creator shares on socials → drives
        new-creator referrals (Phase 26: 10% MRR commission for 12 months)
Week 8: their referrals are now earning, paying creator passive income
Week 12: creator has a $400/mo passive income stream tied to platform-
         resident reputation tier + referral commissions. Switching
         away forfeits both.
```

Each step strictly increases the cost of leaving.

---

## PHASE 4 — API-First + Automation Dominance

### Required endpoints (explicit list)

These exist or are scaffolded in this codebase. Each is API-first by design.

**Auth & identity**
- `POST /v1/auth` — signup/login/refresh ✅
- `POST /v1/oauth/connect` ✅
- `GET /v1/oauth/[platform]` ✅
- `POST /v1/payouts/onboard` (Stripe Connect) — Phase 13

**Marketplace**
- `GET /v1/exchange/opportunities` ✅ (extend with `supply_deficit`)
- `GET /v1/exchange/market` ✅
- `POST /v1/exchange/orders` ✅
- `POST /v1/exchange/trades` (action: submit_proof | verify | settle | dispute) ✅
- `POST /v1/exchange/enroll` ✅

**Submission lifecycle**
- `POST /v1/submissions` ✅
- `GET /v1/submissions?status=approved` ✅
- `POST /v1/submissions/review` ✅

**Match suggestion**
- `GET /v1/matching/suggest` ✅ (shipped this turn)

**Real-time**
- `GET /v1/events` (SSE) ✅
- Webhook deliveries with HMAC ✅

**Reputation portability**
- `GET /v1/influencers/{id}/earnings-receipt` (signed PDF/JSON) — Phase 48

### Data flows

```
Bot ─POST /v1/exchange/orders─▶ Order book (in-memory + Postgres mirror)
                                      │
                                      ▼
                                Matching engine
                                      │
                                      ▼
                            Trade record (DB)
                                      │
                  bot polls or SSE-receives
                                      │
                              POST proofUrl
                                      │
                                      ▼
                          Verification engine
                                      │
                                      ▼
                       Approved submission → perk
                                      │
                                      ▼
                          Stripe Connect transfer
                                      │
                                      ▼
                              Earnings ledger row
                                      │
                                      ▼
                       /i/{slug} page regenerates
```

### Automation hooks

- `pluginManager.executeHook("campaign.beforeLaunch", ...)` already
  fires on launch (FTC plugin compose) — extend with `submission.beforeApprove`
  (already declared, partially used in `src/lib/submissions.ts:364`).
- Every state transition emits an event via `eventPublisher.publish()`.
- Bots can subscribe to `/v1/events?token=` and react to anything.

### Rate-limit strategy that favors power users

Tiered limiter (`src/lib/security/rate-limiter.ts`) currently caps
based on tier. The platform-favoring twist:

- **Anonymous → public tier:** 120/min
- **Authenticated → standard:** 30/min
- **Authenticated + verified handle → relaxed:** 60/min
- **Authenticated + tier ≥ Silver → power:** 120/min, no `strict` cap on auth attempts (since they've established trust)
- **Authenticated + tier ≥ Gold → API-key tier:** 600/min

A bot who climbs through the platform earns rate-limit headroom. The
optimal strategy for a bot is to accumulate verified status here
faster than on competitors → flywheel.

---

## PHASE 5 — Liquidity Engine (Cold-Start Solution)

### From zero

Three priming moves, in this order:

1. **Hand-onboard 10 coffee shops in DC.** They each launch one campaign.
   Total: 10 campaigns × ~$50 in perk value = $500 of inventory.
2. **Front the supply with founder-owned bot accounts.** 5 creator
   accounts you control submit posts on those 10 campaigns. They
   earn early, generating shareable receipts (Phase 18). Cost: ~$300
   in perk value to your own friends/family on the campaigns.
3. **Public ledger immediately.** The
   `/leaderboard` (already shipped) and `/i/[slug]` pages show
   real earnings. External creators see numbers, sign up. The flywheel
   begins.

### From self-sustaining

The marketplace is self-sustaining when the **add-1-more-creator
gradient** > **acquisition cost** for both sides:

```
∂(business value) / ∂(creators) = competition for campaigns ↑ → quality ↑
∂(creator value) / ∂(businesses) = earnings opportunities ↑ → income ↑
```

These cross when there are ~3 viable creators per active campaign and
~3 active campaigns per viable creator in a city. For DC coffee shops:
~30 active campaigns + ~90 active creators is critical mass.

### Escape velocity metrics

- **Match-fill ratio:** matched campaigns / total open campaigns. Target > 80%.
- **Time-to-first-payout:** from creator signup to first dollar. Target < 7 days.
- **Re-engagement rate:** creators who do a 2nd submission within 14 days. Target > 50%.
- **Business renewal rate:** monthly. Target > 90% by month 3.
- **Organic-vs-paid acquisition split:** organic > 60% by month 6 means the loops are working.

---

## PHASE 6 — Invisible Incentives & Behavioral Gravity

### Bot-detectable rewards

(These show up as numbers in API responses, so bots will optimize for them.)

1. `creator.tier_progress` field on `/v1/influencers/me` — bots will
   target the next threshold.
2. `campaign.urgency_score` on opportunities — campaigns at 90% of
   their expiry get a boost; bots will prioritize them.
3. `business.recency_boost` for businesses launched < 7 days ago —
   bots route fresh creators to fresh businesses → first-week
   activation rate ↑.
4. `submission.priority_queue` — verified-handle submissions auto-jump.
   Bots have a clear gradient toward chaining OAuth flows.

### Visibility favoring platform-native behavior

`/leaderboard` ranking weights:
- Active-on-platform recency: ×3
- Tier: ×2
- Verified handles count: ×1.5
- Earnings velocity: ×1

A creator who only uses our platform will rank higher than one who
splits time. Public ranking → social proof → more brand inbound.

### Subtle lock-in (without friction)

1. **Reputation portability is signed.** They can take a signed
   earnings receipt with them, but the receipt cites our platform.
   Their next platform sees "earned $X on Social Perks" → they're
   pre-vetted there *because of us*.
2. **Tier persistence.** A Platinum creator who leaves loses tier on
   return. They keep coming back to maintain it.
3. **Referral commission lock.** They earn 10% MRR for 12 months on
   businesses they referred (Phase 26). Leaving forfeits future
   commissions — but the businesses keep paying us.

None of these block the user from leaving. All of them increase the
EV of staying.

---

## PHASE 7 — Failure Modes & Redesigns

### Why bots WOULD ignore this platform

| Failure mode | Why it kills bot adoption | Redesign |
|---|---|---|
| OAuth requires manual review per platform | Bot can't onboard at scale | Auto-approve verified-handle OAuth flows that pass automated platform-side checks (Phase 23 fully closes this) |
| Submission approval takes > 1h human review | Bot's settlement window blows up | Automated verification path for clean submissions; human review only on flagged ones |
| Rate-limit penalties for legit retries | Bot retry strategies get throttled | Honor `Idempotency-Key` and exempt idempotent retries from rate-limit accounting (already half-implemented) |
| Inconsistent error shapes | Bot error-handling code path multiplies | Single `{ success, error: { code, message } }` envelope on every endpoint ✅ |
| No webhook for the events that matter | Bots have to poll | SSE + signed webhooks for everything ✅ |
| TOS prohibits automation | Existential | Update ToS to explicitly allow programmatic creator access — done, but should add a public "API allowed" line to /terms |

### Where friction still exists

- API key issuance is dashboard-only. Bots can't bootstrap API access
  programmatically. **Fix:** auto-issue a default key on signup,
  retrievable via authenticated session.
- Match scoring is opaque. Bots can't predict their fill rate. **Fix:**
  publish the scoring formula and weights.
- No sandbox mode. Bots have to use real money to test. **Fix:** test-
  mode auth tokens that operate against a parallel virtual ledger.

### What competitors might do better

- Aspire / Captiv8 / Mavrck have decade-long brand relationships and
  millions of creators on file. **Counter:** we don't compete on supply
  size; we compete on automation depth. A bot can do *more per minute*
  here than there.
- TikTok Shop has built-in product tagging. **Counter:** we cover
  every platform and every action type, not just product tags.

### What would cause collapse after initial traction

| Risk | Mitigation |
|---|---|
| Platform ToS change (e.g. Instagram bans incentivized stories) | Already designed for: compliance gate refuses non-allowed actions per platform. We *gain* relative position when ToS tightens because compliance is harder for competitors to retrofit. |
| Stripe deplatforms us over creator-payout regulation | Diversify with Wise, dLocal, Tipalti backup rails by Phase 700 |
| FTC enforcement action against incentivized posts | Our compliance gate is already the strictest in market. We're the safe harbor, not the target. |
| Dominant creator(s) leave en masse | Keep top-N concentration < 20% of GMV. Watch in dashboards. |
| Bot abuse of public endpoints | The rate limiter + fraud pipeline (already shipped) are designed for this. Cost of abuse > value of reward when reputation tier gates the high-value campaigns. |

---

## How this connects to the phase plan

| Inevitability requirement | Phase that delivers it |
|---|---|
| Predictable API surface | Phases 4 (existing routes) + 446-449 (OpenAPI auto-publish) |
| Automated verification | Phase 23 |
| Tiered creator status | Phase 28 |
| Reputation portability | Phase 48 |
| Stripe Connect payouts | Phase 13 |
| Sandbox/test mode | TBD — adding to phase 51-100 batch |
| Auto-issued API keys | TBD — adding to phase 51-100 batch |
| Public match scoring formula | TBD — adding to phase 226 (matching v2) |
| `supply_deficit` field on opportunities | TBD — adding to phase 26 |
| Off-peak match surge | TBD — adding to phase 226 |

---

## What's left after this turn

The blueprint above is the strategic frame. The phase plan
(`docs/PLATFORM_PLAN.md`) is the tactical sequence. The shipped code
(commits `5ab3b11`, `cb317df`, and the in-flight commit) is the
foundation. Each new phase shipped collapses an inevitability gap.
