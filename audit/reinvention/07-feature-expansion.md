# Feature Expansion Plan (Phase 7)

*Top 50 missing features ranked by composite of (1) revenue, (2) retention, (3) viral potential, (4) effort. Each: user problem → complexity (S ≤2d / M ≤2wk / L >2wk) → est. ROI → priority (P0 build-now / P1 next-quarter / P2 later). Be ruthless: pre-launch, revenue-moving > nice-to-have. Grounded in all 8 inputs.*

## P0 — Build now (close the loop, take money, stop lying)

| # | Feature | Problem solved | Cx | ROI | 
|---|---|---|---|---|
| 1 | **Durable submission read-path** | Pending reviews evaporate on cold start | S | Loop can't work without it |
| 2 | **Business-facing review surface** (queue + approve/reject + badge) | Owner has no way to review submissions | M | Required for the loop |
| 3 | **Fix approve→award→email** | Approval awards no perk, sends nothing | S | Customer finally gets rewarded |
| 4 | **Public magic-link perk wallet + staff redeem screen** | Anonymous customer can't see/redeem | M | Closes the loop at the counter |
| 5 | **File/screenshot upload for proof** | Paste-a-URL kills customer conversion | M | Biggest customer-side lift |
| 6 | **QR-poster button + share on wizard success** | API exists, no UI; activation cliff | S | Unblocks all activation |
| 7 | **Dashboard hydration** (call existing fn) | Day-2 amnesia | S | Saves early retention |
| 8 | **Go-live payments** (env + webhook + migrate) | Can't charge | S | 100% of revenue |
| 9 | **Hard-block incentivized review actions** | FTC/Google landmine | S | Removes existential risk |
| 10 | **Enforced FTC disclosure before payout** | Compliance is advised, not enforced; the wedge | M | Legal shield + differentiation |
| 11 | **Cold-start rehydrate on public submit route** | Submit 404s intermittently | S | Stops silent loss at the money step |
| 12 | **Fix payout balance check (or cut payouts)** | Drain-the-account bug | S | Prevents financial loss |
| 13 | **Re-tier pricing v2 + enforce real gates** | No honest "why pay" | M | Determines if SaaS revenue exists |
| 14 | **Billing link in nav + reachable upgrade** | Willing buyers can't pay | S | Direct revenue |
| 15 | **OG images → PNG** | Every share renders imageless | S | Multiplies viral surfaces |
| 16 | **Referral cookie-read at signup** | Conversions structurally 0 | S | Activates the cheapest loop |
| 17 | **Durable drip-sent ledger** (before enabling crons) | Daily duplicate spam risk | S | Prevents reputation damage |
| 18 | **Value-loop PostHog events (server-side)** | Loop is analytically dark | S | Makes the business measurable |
| 19 | **Remove trust lies** (dispute, social proof, leaderboard, "AI", SMS copy) | Integrity collapse risk | S–M | Protects the brand |
| 20 | **Weekly results email** | No reason to return | M | Core retention driver |

## P1 — Next quarter (distribution, proof, real AI, retention)

| # | Feature | Problem | Cx | ROI |
|---|---|---|---|---|
| 21 | **Square POS integration** | No redemption attribution / ROI proof; distribution | L | Channel + data + money-flow (unlocks 3 revenue models) |
| 22 | **Real vision-model proof verification** | Can't certify a disclosed post exists (legal prereq) | M | The compliance moat; makes "AI" honest |
| 23 | **Real LLM campaign-copy generation** | "AI" is vapor | M | Honest premium feature |
| 24 | **ROI dashboard (real numbers)** | Owner can't see value | M | "Why pay" + retention |
| 25 | **Dunning email sequence** | Silent involuntary churn | S | Recovers 20–40% of card-fail churn |
| 26 | **Subscription lifecycle integrity** (hydrate, plan-sync, one-sub upgrade) | Billing loses money-state | M | Trustworthy billing |
| 27 | **Agency/white-label console** | Need a near-zero-CAC channel + onboarding labor | M | Secondary revenue + growth |
| 28 | **Perk-program streaks/levels** | No retention game | M | Habit formation (Duolingo effect) |
| 29 | **Success-moment upgrade prompts** | Only scarcity-based prompts | S | Higher paid conversion |
| 30 | **Password reset (real page + durable tokens)** | Locked-out users churn | S | Avoidable account loss |
| 31 | **Embeddable widget DB-fallback** | Widget breaks on cold start | S | Restores a B2B2C surface |
| 32 | **Server-side invite-track wiring** (replace honor system) | Gameable, no attribution | M | Real viral mechanic |
| 33 | **Vertical landing pages** (coffee/salon/gym) | Generic positioning | S | Higher visitor→signup |
| 34 | **Record-keeping per submission** (offer/disclosure/verified post/payout) | $53K/violation needs provable compliance | S–M | Legal shield |
| 35 | **Meta app-review submission** | Verification depends on Graph API approval | M | De-risks the moat (lead-time) |
| 36 | **Sentry DSN activation** | Silent failures go nowhere | S | Visibility |
| 37 | **Business onboarding concierge (AI)** | Owners need help setting up a good campaign | M | Activation lift, low token cost |
| 38 | **Campaign templates by vertical** | Blank-page problem | S | Faster activation |
| 39 | **In-store starter kit** (poster + table tent + "ask" script) | Owners don't know how to promote | S | Activation |
| 40 | **Customer SMS perk delivery (real)** | "via SMS" is currently a lie | M | Closes the loop where email fails |

## P2 — Later (network effect, scale, breadth)

| # | Feature | Problem | Cx | ROI |
|---|---|---|---|---|
| 41 | **Local cross-business cross-promo** (Substack-Recommendations style) | No compounding network effect | M–L | The long-term moat |
| 42 | **Success-fee billing rail** (% of attributed redemptions) | SaaS ceiling on a crowded shelf | M | Raises the revenue ceiling |
| 43 | **Toast / Clover / Shopify integrations** | Expand distribution + verticals | M each | More channels |
| 44 | **Benchmarks email** (real, vs category) | Retention via comparison | S | Stickiness |
| 45 | **Multi-staff seats** | One auth user per business | M | Growth-tier value |
| 46 | **Light multi-location** (only if pulled) | Small chains | L | Expansion revenue |
| 47 | **Public "wall of supporters" / status tiers** | Status substitutes for cash reward | M | Cheaper rewards, more sharing |
| 48 | **AEO/long-tail content harvest** | SEO maturing | S ongoing | Compounding channel mo 12+ |
| 49 | **Engagement-prediction / best-time nudges (AI)** | Optimize posting | M | Marginal; only if cheap |
| 50 | **Referral milestone ladders (consumer)** | Boost referral rate ~3× | M | Viral lift |

## How to read this
- **P0 is non-negotiable and mostly S/M** — it's the finishing sprint that makes the product *work* and *charge*. Do all 20 before anything in P1.
- **The single highest-leverage P1 is #21 Square** — one integration unlocks distribution, ROI proof, the success-fee rail, and churn-suppressing stickiness simultaneously.
- **Resist P2 until traction exists.** The network effect (#41) is the moat but needs local density first; building it pre-traction repeats the breadth mistake.

> **Ruthlessness test applied:** every P0 item either closes the loop, takes money, or removes a liability. Nothing on P0 is a "nice feature" — the product doesn't need more features, it needs the ones it has to *work end-to-end and be honest*.
