# Social Perks — Revenue & Growth Audit (Phases 7 & 8)

**Auditor stance:** Revenue Operations + Growth Director. Evidence-based, founder-facing.
**Date:** 2026-06-02 · **Status:** PRE-LAUNCH, 0 real users · Vercel + Supabase/Postgres + Stripe.
**Scope:** Revenue path, perk/payout value loop, activation funnel, self-referential growth loop, retention, pricing strategy, competitive positioning.

---

## TL;DR — the brutal version

The revenue *plumbing* is genuinely good: real Stripe Checkout, real Stripe Connect payouts, hardened webhook signature verification, a thoughtful "refuse rather than fake it" posture when billing isn't configured, and migration v5 makes *subscriptions* durable. The team has clearly been through a billing-durability fire drill and learned from it.

But the same lesson was **not applied to the rest of the money/value system.** The entire customer-facing value loop — earned perks, perk programs, cash-back payouts to customers, influencer payout accounts, and the referral growth engine — lives in **in-memory `Map`s with zero database persistence.** On Vercel, every deploy and every cold start wipes them. A business funds a campaign, a customer earns a $20 perk, the instance recycles, and the perk is gone. The product's core promise ("turn customers into your marketing team, reward them for it") is not durable.

Second-biggest problem: this is a marketing/referral engine that **does not dogfood durability or measurement.** The referral program — your single most on-brand growth lever — is in-memory, so shared referral links rot on redeploy. And the onboarding drip's "already sent" state is in-memory, so a cold start can re-blast a 2-week-old user with the day-1 + day-3 + day-7 + day-14 emails at once. That's a deliverability/spam-complaint risk before you have a single paying customer.

You can *technically* take a Stripe payment today once you set env vars and run one migration. But you should not invite customers into the value loop until perks/programs/payouts are durable — otherwise you'll be charging for an experience that silently deletes itself.

---

## 1. Can it take money TODAY? (revenue path end-to-end)

**Verdict: Almost — gated on 3 infra steps and one packaging fix. Subscription billing is durable; the *value loop it pays for* is not.**

### What works (verified)
- **Stripe client** lazy-inits only when `STRIPE_SECRET_KEY` is set (`src/lib/stripe.ts:21`). Clean dev/demo fallback.
- **Checkout creation** is real: `stripe.checkout.sessions.create` with customer creation, line items, metadata (`src/app/api/v1/billing/route.ts:133-140`).
- **Open-redirect protection** on success/cancel URLs — restricted to the configured site host (`billing/route.ts:85-101`). Good security instinct that also protects against post-checkout phishing.
- **Refuses to fake it:** if Stripe is live but a price ID is missing, it returns `BILLING_NOT_CONFIGURED` 503 instead of handing Stripe a bogus id or a mock URL (`billing/route.ts:113-119`). In production with no Stripe at all, it hard-errors rather than returning a fake checkout URL (`billing/route.ts:164-170`). This is exactly right and avoids the "burned a real customer at payment time" failure.
- **Webhook signature verification** is mandatory in production — refuses to process unsigned webhooks, preventing forged subscription minting (`billing/webhook/route.ts:58-64`). Failed-signature attempts are audited (`webhook/route.ts:82-88`).
- **Cross-instance idempotency** via Postgres `webhook_events` table + `markEventProcessed` (`webhook/route.ts:126`), replacing the old per-instance Map that a replay to a different cold-start instance would have defeated.
- **Subscription durability:** `persistSubscription` does write-through to `business_subscriptions` (`src/lib/billing/store.ts:111-150`), and `hydrateSubscriptions` warms the cache from Postgres on cold start (`store.ts:209-239`), with `get_subscription` awaiting hydration before reading (`billing/route.ts:251`). This closes the "paying customer silently shows as free after redeploy" hole **— but only after migration v5 runs.**
- **Plan-slug reconciliation done:** `getPlanLimits("professional")` now resolves (`enforcement.ts:49-68`) with a `pro` back-compat alias. The earlier "paying Professional customer capped at free limits" bug is fixed and documented in-code.
- **Usage metering durability:** `recordCompletion`/`recordAiGeneration` write-through to `monthly_usage` (`enforcement.ts:264-282`) so free-tier limits survive cold starts (was a real revenue leak — free users got effectively unlimited usage across redeploys).

### BLOCKERS to charging a real customer

| # | Blocker | Evidence | Severity |
|---|---------|----------|----------|
| B1 | **Stripe price IDs not set.** All `STRIPE_PRICE_*` are commented out. With Stripe live but no price ID, checkout returns 503 `BILLING_NOT_CONFIGURED` — no one can buy. | `.env.example` (all `STRIPE_PRICE_*` lines commented); `billing/store.ts:24-43` reads them as `?? null`; `billing/route.ts:113-119` | **Critical** |
| B2 | **`STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` must be set on Vercel.** Without the secret, production checkout hard-errors (correct) and webhooks refuse to process (correct) — but nothing is sellable. | `stripe.ts:12`, `webhook/route.ts:51,58-64` | **Critical** |
| B3 | **Migration v5 must be applied in prod.** Until `business_subscriptions`/`monthly_usage`/`webhook_events` exist, every write-through silently fails (caught + logged, `store.ts:143-149`) and subscriptions fall back to volatile in-memory only — i.e., paying customers revert to "free" on the next cold start while Stripe keeps billing. Apply via `POST /api/v1/migrate` (Bearer `MIGRATION_SECRET`). | `migrations.ts:629-674` (v5 defined); memory note "v5 PENDING" | **Critical** |
| B4 | **Webhook → enforcement plan-slug drift risk.** Webhook defaults plan to `"starter"` from metadata (`webhook/route.ts:148`), and checkout writes `metadata.plan` from the client-supplied `plan` (`billing/route.ts:139`). The pricing UI sends `planKey` values `starter`/`professional`/`enterprise` (`pricing-section.tsx:67,99,117,137`). These line up with `enforcement.ts` keys now, but there is **no server-side validation** that `metadata.plan` ∈ known plans at webhook time — a malformed/old client could persist a junk plan that resolves to free limits. | `webhook/route.ts:148`, `billing/route.ts:60-66` (validated at checkout) vs webhook (not re-validated) | **Medium** |

> **Note on the memory:** the "single $49 Pro plan" note is stale. The live pricing is a real 4-tier ladder: Free $0 / Starter $29 / Pro (`professional`) $49 / Enterprise Custom (`pricing-section.tsx:80-150`), with an annual toggle defaulting to annual at −20% (`pricing-section.tsx:171,341-349`). See §6.

**Is subscription state durable?** Yes — *conditional on B3*. The code is correct; the table just has to exist in prod.

---

## 2. Perk redemption value loop — DOES VALUE ACTUALLY MOVE?

**Verdict: The mechanics are real and well-built, but NONE of it is durable. This is the single most damaging finding in the audit.**

### The loop is wired correctly (in memory)
- Submission approval → `awardPerk(...)` (`submissions/review/route.ts:17,148`). Value accrues to a wallet.
- Redemption has a real **double-redemption lock** (`perk-wallet.ts:24-39`, `safeRedeemPerk`) and rejects non-`available` statuses explicitly (`perk-wallet.ts:312-336`).
- Redemption posts to the **double-entry financial ledger** (`perk-wallet.ts:355`, `ledger.redeemPerk`).
- The redemption-401 auth bug (per memory) is resolved — redemptions route is tenant-isolated via `checkResourceAccess` (`businesses/redemptions/route.ts:37`), and cashback uses explicit `requireOwnership` to close the IDOR/financial-fraud vector (`programs/[programId]/cashback/route.ts:54`).

### The fatal flaw: it all evaporates
- **Perk wallets: zero DB persistence.** `grep` for `db.query` in `perk-wallet.ts` → **0 matches.** Storage is `const wallets = new Map(...)` (`perk-wallet.ts:17`). A DB schema *exists* (`perk_wallets`, `earned_perks` in `migrations.ts:253-289`) but **nothing reads or writes it.** The engine comment even says "ready for Postgres migration" — it was never done.
- **Financial ledger: in-memory.** `private accounts: Map<string, Account>` (`financial-ledger.ts:98`), comment "Storage: in-memory Maps" (`financial-ledger.ts:8`). Your double-entry books reset to zero on every deploy.
- **Perk programs + cash-back payouts: in-memory.** `programs`, `programMembers`, `programSubmissions`, `payouts` are all `Map`s (`src/lib/programs/store.ts:77-80`). The entire loyalty-program product is volatile.

**Revenue/trust impact:** A business pays $49/mo, runs a campaign, customers do real social posts and earn real perks — then a routine Vercel deploy silently deletes every earned perk, wallet balance, and ledger entry. The customer shows up to redeem and the perk is "gone." This is a refund-magnet and a reputation killer, and it directly contradicts the product's core promise. **Do not onboard paying customers into the perk loop until this is durable.**

### Influencer payouts — real Stripe Connect, but the records are volatile
- **Real money movement:** `stripe.transfers.create` to a Connect Express account (`payouts/index.ts:256-265`); real account creation + onboarding links (`payouts/index.ts:75-101,148-161`); $10 minimum enforced (`payouts/index.ts:246`). This is NOT a stub — it can actually pay influencers.
- **But:** `payoutAccounts` / `payoutRequests` are `Map`s (`payouts/index.ts:36-37`) with **no DB table in any migration.** A redeploy loses the mapping of influencer → Stripe Connect account and all payout history. `STRIPE_CONNECT*` isn't even in `.env.example`. So payout *history*, *pending amounts*, and *account status cache* are all volatile, and `GET /api/v1/payouts` will under-report `totalPaid`/`pendingAmount` after any restart.
- **No webhook persistence either:** `handleTransferPaid`/`handleAccountUpdated` mutate the in-memory Maps (`payouts/index.ts:354-432`), so Connect status updates are lost on cold start.

---

## 3. Activation / onboarding funnel

**Verdict: The wizard is good and short. The drip that backs it has a serious resend bug.**

### The "aha" path is solid
- `onboarding-wizard.tsx` is a tight **3-step** flow: pick platforms → set rewards → launch (`onboarding-wizard.tsx:173,431,549,670`), and step 3 actually POSTs to `/api/v1/campaigns` to launch a real campaign (`onboarding-wizard.tsx:304`). The aha moment ("your customers do the marketing, you reward them") is concrete and reachable in ~60 seconds. Good.
- Friction count, signup → first campaign: signup → wizard step1 → step2 → step3/launch. That's a strong, low-friction funnel.

### Drip emails are real but the scheduler is broken in two ways
- **It's wired:** `onboarding-drip` cron runs daily (`vercel.json`), authed with `CRON_SECRET` (`cron/onboarding-drip/route.ts:31-43`), proxying to `/api/v1/drip` which fetches **real users** from Postgres with real `created_at`-based elapsed-time windows (`drip/route.ts:71-78`). The earlier "every user stuck at day 0" bug is fixed.
- **BUG (High): sent-state is in-memory.** `const sentState = new Map(...)` (`drip.ts:264`). `getDueEmails` returns every step where `elapsed >= delayDays && !hasSent(...)` (`drip.ts:321-332`). On a serverless cold start `sentState` is empty, so a user who's been signed up 14 days qualifies for **all four** steps (day-1/3/7/14) at once and gets blasted on the next cron tick after any deploy. Repeats every redeploy. This is a spam-complaint and Resend-reputation risk. Fix: persist sends to a `drip_sends(user_id, step_index)` table (mirror the `webhook_events` pattern already in v5).
- **Gap (Medium): drip only targets `email_verified = true` users** (`drip/route.ts:76`). If email verification isn't enforced/working, the entire activation sequence silently sends to no one.

---

## 4. Self-referential growth loop (the product IS a referral engine — is it dogfooded?)

**Verdict: Functional logic, but in-memory = not durable. For a referral company, this is an embarrassing own-goal.**

- **Referral engine is in-memory.** `referrals`, `codeIndex`, `referrerIndex`, `businessCodeIndex`, `refereeIndex` are all `Map`s (`referrals/index.ts:33-48`). No DB table exists.
- **Consequence (High):** `generateReferralCode` returns a fresh random code per business and stores it only in memory (`referrals/index.ts:71-87`). After a redeploy the `businessCodeIndex` is empty, so the next call generates a *different* code — meaning **a referral link a customer shared yesterday (`/ref/REF-XXXX-XXXX`) no longer resolves** (`getReferralByCode` → `codeIndex.get` → null, `referrals/index.ts:115-120`). Pending referrals and earned credits vanish too. Your flagship growth loop leaks on every deploy.
- **Credit-on-paid-conversion is correct logic** — the billing webhook credits the referrer when the referee converts (`webhook/route.ts:211-221`, `creditReferral`), idempotent (`referrals/index.ts:177-200`). But since referrals are volatile, `findReferralByReferee` will usually miss after a cold start, so referrers won't get credited for conversions that happen post-deploy.
- **Waitlist is the bright spot — actually durable.** `POST /api/v1/waitlist` writes to a `waitlist` table with `ON CONFLICT (email) DO NOTHING` (`waitlist/route.ts:101-110`), falls back to in-memory only on DB failure, and the admin count reads from DB (`waitlist/route.ts:170-180`). The waitlist-drip cron is wired (`vercel.json`). This is the model the rest of the system should follow.
- **Dogfooding gap:** there's a referral *modal* and `/ref/[code]` page, but nothing surfaces "invite a business, you both get credit" prominently in the core dashboard loop, and credits are $10 flat (`referrals/index.ts:62`) with no two-sided framing in the product surface I can see. For a company whose entire thesis is referral-driven growth, the in-product referral prompt is underweight.

---

## 5. Retention / churn mechanics

**Verdict: Thin. One real lever (weekly digest) that isn't even scheduled.**

- **Weekly digest exists but has NO cron.** `POST /api/v1/digest` builds and sends per-business weekly digests (`digest/route.ts`), but `vercel.json` has crons for waitlist-drip, campaign-sweeps, onboarding-drip, and agents — **no digest cron.** So the one recurring "come back and check your results" email never fires on a schedule. The only trigger is a manual authenticated POST. Wiring this cron is a quick win with direct retention impact.
- **Digest also depends on volatile state.** It dedupes businesses from `campaignManager.listByState("active")` (`digest/route.ts:64-67`); campaign state machine durability isn't established here, so digests may under-cover after a cold start.
- **No other sticky loop.** There's no streak, no weekly goal, no "your perk is expiring" nudge to customers, no leaderboard for businesses. Perk expiry exists (`expirePerks`, `perk-wallet.ts:453`) but isn't surfaced as a re-engagement email. The product is currently **set-and-forget** for a business after launch — the weakest part of the growth model after durability.

---

## 6. Pricing strategy critique

**Verdict: The ladder is reasonable for SMBs but mis-serves influencers entirely, and the value metric is fuzzy.**

Live tiers (`pricing-section.tsx:80-150`, limits in `enforcement.ts:26-78`):

| Tier | Price | Key limits |
|------|-------|-----------|
| Free | $0 | 1 campaign, 50 completions/mo, no analytics/API/QR |
| Starter | $29/mo | 10 campaigns, 500 completions/mo, analytics + QR |
| Pro (`professional`) | $49/mo | 50 campaigns, 5,000 completions/mo, API, priority |
| Enterprise | Custom | unlimited, multi-location, SSO, AM |

**Strengths:** Free tier with no card is the right top-of-funnel for mom-and-pop. Annual default at −20% (`pricing-section.tsx:171`) is a sensible cash/retention play. The $29→$49 step is well-shaped for a growing single-location SMB.

**Gaps / risks:**
- **One ladder for three wildly different ICPs.** The pricing page and limits are 100% **business-side** (campaigns/completions). There is **no influencer/creator plan or monetization** at all, despite influencers being a named audience with a full payout system. Influencers currently pay nothing and there's no take-rate on their payouts — so the entire creator side is **pure cost, zero revenue.** Decide: is the influencer side a free supply-side magnet (fine, but say so) or should it carry a payout fee / pro creator tier?
- **Value metric is "campaigns + completions," which doesn't map to value delivered.** A coffee shop getting 5,000 Instagram posts/mo at $49 is wildly underpriced vs. the marketing value; a low-volume boutique at the same price overpays. Consider pricing on *redeemed perks* or *verified posts/reach* — the thing the business actually values — rather than campaign count.
- **Enterprise is "Talk to Sales" with no self-serve proof.** Given competitors (GRIN ~$2,500/mo+, Aspire ~$15k/yr) gate enterprise behind sales too, this is fine — but you have no mid-market self-serve tier between $49 and "Custom," which is a revenue air-gap for multi-location regional chains who'd pay $200–500/mo.
- **No usage-based or per-location pricing** for the multi-location story the enterprise tier promises.
- **No trial on paid tiers** — only Free vs paid. A 14-day Pro trial (with the durable perk loop) would lift Starter→Pro conversion.

---

## 7. Competitive analysis (grounded)

Social Perks sits at an unusual intersection: **loyalty/referral (Smile.io, Fivestars), UGC/product-seeding (Stack Influence), and influencer marketing (GRIN, Aspire)** — but its actual mechanic ("customer does a social action → unlocks a perk") is closest to the **Shopify "follow/share for discount" app category** (Webyze, EDD/WooCommerce social-share discounts).

| Competitor | Capability / price | Relevance to Social Perks |
|---|---|---|
| **Smile.io** | Loyalty points + VIP tiers + **built-in two-sided referrals on every plan**, omnichannel earn/redeem in-store, native Klaviyo/Mailchimp/Loox integrations. Free <200 orders; Growth $199/mo; Plus $999/mo. | The incumbent for the loyalty+referral combo. Table stakes Social Perks lacks: points/VIP tiers, deep e-comm/email integrations. SP's differentiator: rewards for *social marketing actions*, not just purchases. |
| **Stack Influence** | **Closest direct competitor.** Pay micro/nano creators **with products** for guaranteed posts + full-rights UGC. **No monthly fee, ~$30/completed collab.** Fully managed. | This is essentially Social Perks' influencer side, productized and proven. Their **pay-per-outcome (no SaaS fee)** model is a direct threat to a $49/mo SaaS framing. SP must justify a subscription vs. their pay-per-post. |
| **Fivestars (by SumUp)** | Local-business loyalty (phone-number signup on a tablet), SMS/email promos, **bundled into SumUp POS.** | Owns the mom-and-pop brick-and-mortar loyalty wedge SP wants, and it's now attached to payments hardware. SP can't beat distribution here — must win on the *social-action* angle POS loyalty doesn't do. |
| **ReferralCandy** | Self-serve referrals, $39–$799/mo **+ 0.25%–10.5% commission on referred sales.** Live in hours. | Shows the market accepts **performance/commission pricing** for referral-driven revenue — a model SP could adopt on redeemed-perk value. |
| **Mention Me** | Enterprise referral, AI/"name sharing," weeks-long onboarding. | Enterprise referral benchmark; not SP's near-term competitor but defines the high end. |
| **GRIN / Aspire** | Enterprise influencer ops. GRIN ~$2,500/mo+ (12-mo commit), Aspire ~$15k/yr + $2k onboarding. Annual, quote-based, no self-serve. | SP's enterprise tier competes here. SP's edge: self-serve + SMB-friendly; its weakness: no creator CRM/discovery depth, no e-comm product-seeding automation. |

### 5-bullet positioning verdict
- **Differentiator that's real:** "customer/micro-creator does a *specific, verified* social action → auto-earns a perk, with FTC disclosure auto-injected and a pricing oracle for action value." No incumbent combines verified social-action → perk → ledger + compliance in one SMB-priced product. That's a defensible wedge **if it's durable** (today it isn't — see §2/§4).
- **Biggest strategic risk:** **Stack Influence's pay-per-outcome model.** Brands increasingly buy *guaranteed posts/UGC* with no SaaS fee. A $49/mo subscription that can't guarantee outcomes (and whose perk loop currently evaporates) is a hard sell against "$30, guaranteed post, you keep the content."
- **Table-stakes gaps:** no Shopify/Klaviyo/POS integration (Smile/Fivestars have deep ones), no points/VIP tiers, no creator discovery/CRM (GRIN/Aspire), no content-rights/UGC repurposing flow (Stack Influence's core deliverable).
- **Realistic positioning:** "The referral + UGC engine for local & DTC SMBs that rewards *any* customer for *verified* social marketing — cheaper and more self-serve than influencer platforms, more social-action-native than loyalty apps." Lead with the SMB wedge (coffee shops, per the waitlist vertical), not enterprise.
- **3 opportunities:** (1) **Shopify app + Klaviyo integration** — meet DTC brands where Smile already is, but on social-action rewards. (2) **Outcome/commission pricing option** (% of redeemed-perk value, ReferralCandy-style) to neutralize Stack Influence's no-SaaS-fee edge and align price with value. (3) **Productize "UGC rights + repurpose"** — you already collect verified posts; package full-rights UGC export so businesses can reuse content in ads (the thing Stack Influence/GRIN charge for).

---

## Ranked findings

Legend: Severity · Effort (S/M/L) · ⚡=quick win

| # | Sev | Finding (file:line / competitor) | Revenue / growth impact | Effort |
|---|-----|-----------------------------------|--------------------------|--------|
| 1 | **Critical** | Perk wallets have zero DB persistence — `Map` only (`perk-wallet.ts:17`; 0 `db.query`); schema exists unused (`migrations.ts:253-289`) | Every earned perk/balance deleted on each deploy → refunds, broken core promise | L |
| 2 | **Critical** | Perk programs + cash-back payouts in-memory (`programs/store.ts:77-80`) | Entire loyalty-program product + customer payouts volatile | L |
| 3 | **Critical** | Financial ledger in-memory (`financial-ledger.ts:8,98`) | Double-entry books reset on deploy; can't reconcile money moved | M |
| 4 | **Critical** | Stripe price IDs not set → checkout 503s (`.env.example`; `billing/route.ts:113-119`) | Nobody can buy until set | S ⚡ |
| 5 | **Critical** | `STRIPE_SECRET_KEY`/`WEBHOOK_SECRET` + migration v5 must be applied in prod (`stripe.ts:12`; `migrations.ts:629`) | No sellable billing; subs revert to free on cold start until v5 | S ⚡ |
| 6 | **High** | Referral codes in-memory → shared `/ref/CODE` links rot on deploy (`referrals/index.ts:33-48,71-87`) | Flagship growth loop leaks; referrers uncredited post-deploy | M |
| 7 | **High** | Influencer payout accounts/history in-memory, no table, no `STRIPE_CONNECT` env (`payouts/index.ts:36-37`) | Lose influencer→Connect mapping + payout history on restart; under-reported totals | M |
| 8 | **High** | Drip "already sent" state in-memory → cold start re-blasts day-1/3/7/14 at once (`drip.ts:264,321-332`) | Spam complaints, Resend domain reputation damage pre-launch | M |
| 9 | **High** | Weekly digest has no cron (`vercel.json` has no digest entry; `digest/route.ts`) | Only recurring retention email never fires → churn | S ⚡ |
| 10 | **High** | Influencer audience has no plan/monetization; payouts carry no take-rate (`pricing-section.tsx` all business-side) | Creator side is pure cost, zero revenue | M |
| 11 | **Medium** | Webhook doesn't re-validate `metadata.plan` ∈ known plans (`webhook/route.ts:148`) | Junk plan slug → silent free-tier limits for a payer | S ⚡ |
| 12 | **Medium** | Value metric (campaigns/completions) decoupled from value delivered; consider redeemed-perk/reach pricing (§6) | Mispriced across SMB volume tiers; leaves money on table | M |
| 13 | **Medium** | No mid-market tier between $49 and Custom (`pricing-section.tsx`) | Revenue air-gap for multi-location regional chains ($200–500/mo) | S |
| 14 | **Medium** | No paid-tier trial (Free↔paid only) | Lower Starter→Pro conversion vs a 14-day Pro trial | S |
| 15 | **Medium** | Drip only targets `email_verified = true` (`drip/route.ts:76`) | If verification is weak, activation sequence sends to no one | S |
| 16 | **Medium** | Strategic: Stack Influence pay-per-outcome (~$30/collab, no SaaS fee) undercuts $49/mo framing | Pricing-model threat to subscription thesis | — |
| 17 | **Low** | In-product referral prompt underweight; $10 flat, no two-sided framing in dashboard (`referrals/index.ts:62`) | Under-utilized on-brand growth lever | S ⚡ |
| 18 | **Low** | No Shopify/Klaviyo/POS integration vs Smile.io/Fivestars table stakes | Distribution/expansion ceiling | L |

---

## "Can we take money today?" — blocker checklist
1. **Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Vercel** (currently nothing sellable). — S
2. **Create Stripe prices and set `STRIPE_PRICE_PROFESSIONAL_MONTHLY/ANNUAL`** (at minimum Pro; ideally Starter too). Without these, checkout 503s. — S
3. **Run migration v5 in prod** (`POST /api/v1/migrate`, Bearer `MIGRATION_SECRET`) so subscriptions/usage/webhook-idempotency are durable. — S
4. **Set `CRON_SECRET`** so drip/cron auth works (and fix finding #8 before drip is allowed to send broadly). — S
5. *(Strongly recommended before onboarding paying customers, not strictly a payment blocker):* **make perks/programs/payouts/ledger durable** (#1–3, #6, #7). Charging for a value loop that deletes itself is a refund/reputation trap.

**Bottom line:** Subscription billing is one env-var-and-migration sprint from live and is built correctly. But the product you'd be selling — the perk/value/referral loop — is not durable. Fix persistence for perks, programs, payouts, ledger, and referrals (mirror the already-correct `waitlist`/`business_subscriptions` patterns) *before* inviting paying customers, then wire the digest cron and fix the drip resend bug to stop leaking the growth you generate.
