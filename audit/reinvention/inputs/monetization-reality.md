# Monetization Reality Audit — Social Perks

Date: 2026-06-12. Repo: `/Users/benzatkulak/Desktop/social-perks/.claude/worktrees/hardcore-meitner-9898b1` (branch `claude/hardcore-meitner-9898b1`, post-PR #108/#109).
Status: COMPLETE. Every claim verified against current code with file:line citations.

## 1. Pricing tiers and gates (VERIFIED)

### Plan price definitions — `src/lib/billing/store.ts:22-53`
| Plan slug | Monthly | Annual | Stripe price IDs |
|---|---|---|---|
| `starter` | $29 | $290 | `STRIPE_PRICE_STARTER_MONTHLY/ANNUAL` env (null fallback) — store.ts:25-26 |
| `professional` | $49 | $490 | `STRIPE_PRICE_PROFESSIONAL_*` env — store.ts:33-34 |
| `enterprise` | $249 | $2,490 | `STRIPE_PRICE_ENTERPRISE_*` env — store.ts:41-42 |

Note: there is NO `free` entry in `PLANS` — free is implicit (no subscription ⇒ `getBusinessPlan` returns `"free"`, enforcement.ts:116-123). Enterprise has a hard $249 price in code despite "Custom" positioning elsewhere.

### Enforcement limits — `src/lib/billing/enforcement.ts:26-78`
| Limit | free | starter ($29) | professional ($49) | enterprise ($249) |
|---|---|---|---|---|
| maxCampaigns (active+paused) | 1 | 10 | 50 | ∞ |
| maxCompletionsPerMonth | 50 | 500 | 5,000 | ∞ |
| maxActions | 5 | 20 | 107 | 107 |
| aiGenerations/mo | 3 | 50 | 500 | ∞ |
| hasAnalytics | no | yes | yes | yes |
| hasApiAccess | no | no | yes | yes |
| hasQrCodes | no | yes | yes | yes |

- `pro` kept as back-compat alias of `professional` (enforcement.ts:58-68); comment at enforcement.ts:45-48 documents the previous slug-mismatch bug where paying Professional customers were silently capped at free limits.
- **Marketing copy contradicts enforcement**: store.ts:29 sells Starter as "5 active campaigns" but enforcement grants 10 (enforcement.ts:37); store.ts:37 sells Professional as "25 active campaigns" but enforcement grants 50 (enforcement.ts:50).

### Usage metering durability
- Counters (aiGenerations, completions) are in-memory `Map` with Postgres write-through (`monthly_usage` table, enforcement.ts:264-282) and lazy background hydration (enforcement.ts:321-332). Known race window on cold start documented in code (enforcement.ts:315-319) — limit checks can pass that should fail; bounded ~50ms.
- Subscriptions: in-memory `Map` (store.ts:97) + write-through to `business_subscriptions` (store.ts:112-151) + module-load hydration (store.ts:240). Comment at store.ts:72-77 still calls it "NOT durable" but the hydration path exists.

### THREE conflicting plan definitions exist
1. `src/lib/billing/store.ts:22-53` — prices + marketing features (used by checkout/webhook).
2. `src/lib/billing/enforcement.ts:26-78` — actual enforced limits.
3. `src/lib/stripe.ts:41-66` — a third, stale `PLANS` const: free gets `maxCampaigns: 3` (stripe.ts:45) vs enforcement's 1 (enforcement.ts:28); uses old `pro` slug and different env var names (`STRIPE_PRICE_PRO` stripe.ts:56 vs `STRIPE_PRICE_PROFESSIONAL_MONTHLY` store.ts:33). Nothing imports `PLANS` from stripe.ts (only `stripe`/`isStripeConfigured` are imported — verified via grep), so it's dead-but-confusing.

### Which limits are actually ENFORCED (call-site verification)
- Campaign cap: enforced at create — `src/app/api/v1/campaigns/route.ts:222-226` (`checkCampaignLimit` → 403 PLAN_LIMIT_EXCEEDED).
- Completion cap: enforced at submission approval — `src/app/api/v1/submissions/review/route.ts:121-165` (`checkCompletionLimit` → 403; `recordCompletion` on success).
- AI generation cap: enforced — `src/app/api/v1/ai/generate/route.ts:74-100` and shared helper `src/app/api/v1/ai/_enforce-ai-limit.ts:36-57`.
- **NOT enforced anywhere: `checkFeatureAccess` (analytics / API access / QR codes) has ZERO call sites** — grep across src shows the only consumers of `hasAnalytics/hasApiAccess/hasQrCodes` are display surfaces: `src/app/dashboard/billing/client.tsx:279-281` (feature checklist UI) and `src/app/api/v1/billing/route.ts:303-305` (echoes flags in usage payload). Free users get analytics, QR codes, and API access in practice. The differentiation is decorative.
- **NOT enforced: `maxActions`** — only read back in the billing usage payload (`src/app/api/v1/billing/route.ts:301`); no campaign-creation path checks action count against plan.

## 2. Upgrade prompts / in-product triggers (VERIFIED)

There ARE real, well-designed in-product upgrade surfaces — this is one of the stronger parts:
- **`UsageBanner`** (`src/components/business/usage-banner.tsx:1-220`): proactive. Fetches usage from `/api/v1/billing {action:"get_usage"}` (line 95-98); variants: informational (free, always shown, "Starter starts at $29" — line 67), warning at ≥80% of campaigns/completions (line 64), blocking at ≥100% (line 63) with direct upgrade CTA; PostHog `pricing_cta_click` tracking (line 193-197). Mounted on the business portal home (`src/components/business/portal-home.tsx:150`).
  - Gap: banner only watches campaigns + completions (line 61) — AI-generation exhaustion never triggers a banner.
- **`PlanLimitModal`** (`src/components/business/plan-limit-modal.tsx`): reactive — server 403 `PLAN_LIMIT_EXCEEDED` pops an upgrade modal; mounted at `src/components/business/portal.tsx:610` via `reportPlanLimit`.
- Server errors carry `upgradeUrl: "/pricing"` (`src/lib/billing/enforcement.ts:163`) so the frontend can deep-link.
- Gap: no upgrade trigger tied to a *positive value moment* (e.g., "your campaign got 40 completions this week — Pro unlocks X"). All triggers are scarcity/limit-based, none are success-based.

## 3. What $29/$49 actually buys (VERIFIED, with false advertising)

Pricing page tiers (`src/components/landing/pricing-section.tsx:79-152`):
- Free "$0 forever": 1 campaign, 50 completions/mo, **"Basic analytics"** (line 89), email support.
- Starter $29: 10 campaigns, 500 completions/mo, "Full analytics + CSV export", "QR codes", email support (lines 103-109).
- Pro $49 ("Most Popular"): 50 campaigns, 5,000 completions/mo, "Advanced analytics + AI insights", "API access", "Priority verification", priority support (lines 121-128).
- Enterprise "Custom" → "Talk to Sales" (lines 136-148): unlimited campaigns, "Multi-location management", "Team permissions + SSO", account manager, "Custom integrations + SLA". Note billing engine hard-codes Enterprise at $249/mo / $2,490/yr (`src/lib/billing/store.ts:43-44`), contradicting "Custom".
- Annual toggle defaults ON, computes 20% off client-side (pricing-section.tsx:171, 341-349).

Truth-in-advertising problems (each verified against enforcement/feature code):
- Free page promises "Basic analytics" but `PLAN_LIMITS.free.hasAnalytics = false` (enforcement.ts:32) — except the gate is never enforced, so accidentally true.
- Starter sells "CSV export" — no plan-gated CSV export exists in the analytics surface (no `checkFeatureAccess` call sites at all).
- Pro sells "Priority verification" and "Priority support" — no code path implements either (verification pipeline has no plan-priority concept).
- Pro sells "AI insights" — the "AI" is templates/lookup tables (per June-2 audit; engine unchanged at `src/lib/ai-engine.ts`).
- Enterprise sells "SSO", "Team permissions", "Multi-location" — none implemented (enterprise UI is demo mock data per June-2 audit).
- store.ts marketing strings disagree with both: "5 active campaigns" for Starter (store.ts:29) vs 10 enforced; "25" for Pro (store.ts:37) vs 50 enforced.

**Would a rational SMB pay?** The only REAL paid deltas are quota raises: 1→10→50 campaigns and 50→500→5,000 completions/mo. With 0 external users, 50 completions/mo free is far above what an early mom-and-pop will hit (≈12/week of customers doing social actions); free tier is generous enough that the genuine upgrade pressure point (completions) may take months to reach. Everything else on the paid cards is either unenforced (analytics/QR/API) or vapor (CSV, priority anything, SSO).

### Free tier verdict
On paper free is: 1 campaign, 50 completions/mo, 3 AI generations, NO analytics/QR/API. In practice (gates unenforced) free is: 1 campaign, 50 completions/mo, 3 AI gens, plus full analytics, QR codes, and API access. Two-sided problem:
- **Too generous in practice**: the only working differentiators are quotas, and a pre-launch mom-and-pop will not hit 50 approved completions/mo for months. There is no reason to pay.
- **Too crippled if the design were enforced**: `hasQrCodes: false` on free (enforcement.ts:34) would break the core acquisition demo — the QR poster is how an in-store customer claims a perk at all. Enforcing the designed gates as-is would kill the free tier's ability to demonstrate value; not enforcing them kills the reason to upgrade. Neither configuration was thought through.

## 4. Stripe wiring end-to-end (VERIFIED)

### What is genuinely good
- **Checkout** (`src/app/api/v1/billing/route.ts:57-187`): plan/period validation (60-69), tenant isolation so you can only buy for your own business (74-75), open-redirect protection on success/cancel URLs (81-101), clean 503 `BILLING_NOT_CONFIGURED` when price IDs are missing instead of a 502 mid-checkout (113-119), hard refusal to return mock checkout URLs in production (164-170), test/live mode indicator derived from key prefix (144-146).
- **Webhook** (`src/app/api/v1/billing/webhook/route.ts`): signature verification with production hard-fail if secret missing (58-64), audit-logging of forged-signature attempts (82-88), cross-instance event dedup via Postgres (`markEventProcessed`, line 126), handles `checkout.session.completed` (140-226) incl. direct-send welcome email (199-202, consciously bypassing the dead job queue) and referral crediting at paid conversion (211-223), `customer.subscription.updated` (228-246), `customer.subscription.deleted` (248-260), `invoice.payment_failed` → past_due (262-274), and `checkout.session.expired` → abandoned-cart recovery email with Stripe `recovery_url` (276-346).
- **Post-checkout UX**: confirmation/cancel banner with funnel events (`src/components/business/checkout-banner.tsx:22-117`).
- Funnel entry: pricing CTA links to `/dashboard#signup?plan=<key>&period=<annual|monthly>` (pricing-section.tsx:416-420).

### The lifecycle gaps (each verified)
1. **Plan changes never sync.** The `customer.subscription.updated` handler copies only `status` and `cancel_at_period_end` (webhook/route.ts:235-241) — it ignores the price/plan in `items`. A customer who upgrades Starter→Pro in the Stripe billing portal pays $49 but keeps Starter limits forever; a downgrader keeps Pro limits while paying $29.
2. **Webhook events can be silently dropped on cold start.** The updated/deleted/payment_failed handlers look up `subscriptions.get(subscriptionId)` (webhook/route.ts:233, 253, 267) but the webhook route never awaits `hydrateSubscriptions()` (grep verified: only `get_subscription` in billing/route.ts:251 awaits it). On a cold instance racing the module-load hydration (store.ts:240, fire-and-forget), `existing` is undefined → the handler `break`s → returns 200 OK → **Stripe never retries → a cancellation or payment-failure can be permanently lost** while the customer's DB plan stays active.
3. **No in-product upgrade/proration path.** A second checkout for a different plan creates a *second* Stripe subscription (checkout.sessions.create at billing/route.ts:133-140 — no existing-sub lookup, no `subscription_update`). `getBusinessPlan` then returns whichever active sub Map iteration yields first (enforcement.ts:117-121) — nondeterministic plan, possible double-billing.
4. **Paying customers can be enforced as free.** None of the enforcement call sites (campaigns/route.ts, submissions/review/route.ts, ai/generate/route.ts, _enforce-ai-limit.ts) await `hydrateSubscriptions()` (grep verified, zero matches). Right after a cold start a Pro customer creating a campaign can resolve to `"free"` (enforcement.ts:122) → blocked at the 1-campaign cap → shown an upgrade modal for the plan they already pay for.
5. **Dunning is a cliff, not a flow.** `invoice.payment_failed` → status past_due (webhook/route.ts:269); `getBusinessPlan` requires `status === "active"` (enforcement.ts:118), so a single failed card instantly drops a paying customer to free limits. No grace period, no dunning email (no email send in the 262-274 branch). Recovery rides entirely on Stripe Smart Retries + portal.
6. **Renewal dates drift.** Period start/end are computed locally from "now" at checkout (webhook/route.ts:163-165) and never updated on renewal (no `invoice.paid`/`payment_succeeded` handler). Cosmetic today since enforcement only checks status.
7. Cancellation & invoices: Stripe-portal-only (`create_portal` billing/route.ts:189-235; dashboard button at `src/app/dashboard/billing/client.tsx:133`). Acceptable at this stage.
8. Per the 2026-06-02 ops facts (unverifiable from code): price-ID env vars and webhook secret still unset in prod → checkout 503s by design (billing/route.ts:113-119). Code-side go-live readiness is real; config isn't.

## 5. Other monetization hooks in code (VERIFIED)

- **Transaction fees: scaffolded, never charged.** `chargePlatformFee` exists in the double-entry ledger (`src/lib/financial-ledger.ts:412-440`) with a `platform_fee` transaction type (line 20) — **zero call sites** anywhere (grep verified). The ledger itself is only imported by `src/lib/perk-wallet.ts`.
- **Cashback is bookkeeping, not money.** `src/app/api/v1/programs/[programId]/cashback/route.ts` creates/updates `Payout` records in a store (lines 170-194) with no Stripe involvement — the business settles with the customer outside the platform. The platform never touches the perk/cashback transaction, so a take-rate is structurally impossible on the core value loop as built.
- **Influencer payouts: real Stripe Connect rail, no revenue, and a money-loss hole.** `createConnectAccount` (lib/payouts/index.ts:286-300), onboarding links (354-380), and `stripe.transfers.create` for the full amount (payouts/index.ts:468-476) — **no application fee, no take-rate** (grep "fee|cut|margin" in payouts: zero hits). Worse: `request_payout` (src/app/api/v1/payouts/route.ts:127-152) validates only `amount >= 1000` cents — **no earnings/balance check exists anywhere** (grep "earnings|balance|available" across route + lib: zero matches). Any authenticated influencer who completes Connect onboarding can transfer arbitrary amounts from the platform's own Stripe balance. Today it's inert (no STRIPE_SECRET_KEY in prod) but it is a critical pre-go-live bug. There is also no inbound rail: businesses never fund influencer work through the platform (`src/lib/payments/escrow.ts` has zero app-route importers — dead code).
- **Referrals are a cost hook, not revenue**: "10% MRR for 12 months" promised (`src/app/api/v1/referrals/me/route.ts:8`), estimated at a hardcoded $4.90/conversion (lines 50-53); webhook credits referrals at paid conversion (billing/webhook/route.ts:211-223); no mechanism to actually pay referrers exists.
- **Exchange: deleted.** `src/app/api/v1/` contains no `exchange/` directory (verified by `ls`) — the order-book monetization surface from the June-2 audit is gone. CLAUDE.md still documents it (stale).
- **API/agent access is not monetized**: `src/app/api/v1/api-keys/route.ts` has no plan gate (grep: zero plan/feature-access references); the MCP agent surface consumes the same plan usage buckets (`src/app/api/mcp/route.ts:71, 358`) rather than separate API pricing — despite `hasApiAccess` being a Pro selling point.
- **ROI calculator hard-codes the anchor**: "$49 Pro plan monthly" baked into the public cost calculator (`src/app/calculator/client.tsx:22-23`).

Net: the ONLY live monetization mechanism is the SaaS subscription. Every marketplace-shaped hook is either bookkeeping-only, dead, uncalled, or a liability.

## 6. Unit-economics surface (VERIFIED where code-determinable)

- **Zero AI marginal cost**: no LLM SDK anywhere — grep for anthropic/openai/llm in `package.json` and `src/lib/ai-engine.ts` returns nothing. "AI insights" (a Pro selling point) costs $0 to serve because it's templates/lookup tables.
- **Email**: Resend via raw HTTPS API (`src/lib/email/index.ts:66-67`), provider selected only when `RESEND_API_KEY` set (index.ts:326-327), console-mock otherwise. Sends per business: welcome, subscription-started, abandoned-checkout, drips, QBR digests.
- **Scheduled load**: 4 daily Vercel crons (`vercel.json:4-8` — waitlist-drip, campaign-sweeps, onboarding-drip, agents). Fan-out scales with user count, not traffic.
- **Cost shape**: Vercel serverless + Supabase Postgres (Supavisor pooler, live per 2026-06-12 health check) + Resend. Fixed floor fits hobby/low tiers (~$0 now; ~$45-70/mo once on Vercel Pro + Supabase Pro + Resend paid). Marginal cost per active business is cents/month: a few hundred function invocations, a handful of Postgres rows, <20 emails.
- **First thing to blow up the bill**: the SSE stream `src/app/api/v1/events/route.ts` holds open `ReadableStream` connections (verified present) — long-lived serverless function duration is billed per-second on Vercel; plus 100% request tracing with structured JSON logging on every route (log volume).
- **The real unit-economics risks are not infra**: (a) the unguarded Connect transfer above = unbounded loss the day Stripe payouts go live; (b) referral liability of 10% MRR x 12 months (= 1.2 months of revenue per referred customer — sane, but no cap and no payout mechanism); (c) at $29-49/mo with cents of COGS, gross margin is ~99% — the constraint is entirely acquisition + reasons-to-pay, not cost.

## Conclusions: the 3 biggest monetization design flaws

### Flaw 1 — The paid tiers sell features that are unenforced, contradictory, or nonexistent
`checkFeatureAccess` has zero call sites: analytics, QR codes, and API access are identical on free and paid (display-only flags at dashboard/billing/client.tsx:279-281). Starter's "CSV export", Pro's "Priority verification"/"Priority support", and Enterprise's "SSO/Team permissions/Multi-location" do not exist in code. Three mutually contradicting plan definitions live in the repo (store.ts:22-53 vs enforcement.ts:26-78 vs the stale lib/stripe.ts:41-66), and the pricing page contradicts the checkout layer's own feature strings ("10 campaigns" vs "5 active campaigns" for the same $29). The only real product is quota raises — which a zero-traction SMB won't hit for months. **There is currently no honest answer to "why pay?"**

### Flaw 2 — The subscription lifecycle silently loses state in exactly the cases that cost money
Plan changes via the Stripe portal never sync (webhook copies only status + cancelAtPeriodEnd, webhook/route.ts:235-241); cancellations and payment failures can be dropped with a 200 on cold instances because the webhook never hydrates the subscription cache (no retry from Stripe = permanent divergence); there is no upgrade path that doesn't risk a second concurrent subscription with nondeterministic plan resolution (enforcement.ts:117-121); enforcement call sites can treat paying customers as free right after cold start and show them upgrade modals for plans they already bought. Individually small; together they mean the billing system cannot yet be trusted to track who paid for what — the one thing a billing system must do.

### Flaw 3 — The platform is structurally outside its own money flow
The pitch is marketplace-shaped (businesses pay customers/influencers for marketing actions) but every transaction settles off-platform: cashback is a ledger entry the business pays in person, escrow is dead code, `chargePlatformFee` is never called, and the one live money rail (Stripe Connect influencer transfers) takes 0% — and would transfer arbitrary unearned amounts out of the platform's own balance (no earnings check, payouts/route.ts:127-152 + payouts/index.ts:468). Take-rate monetization — the natural model for this product and the one that scales with customer success rather than seat count — is impossible without re-architecting money movement through the platform. Until then, 100% of revenue depends on SaaS subscriptions whose differentiation (Flaw 1) doesn't exist.
