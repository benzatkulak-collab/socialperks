# Revenue Engine & Monetization Strategy (Phases 5 + 6)

*What to monetize, in what order, at what margin. Grounded in `monetization-reality.md`, `competitors-direct.md`, `market-legal-ftc.md`.*

## 0. The brutal starting truth

Today there is exactly **one** live monetization mechanism — the SaaS subscription — and its differentiation **does not exist**: the only enforced gates are quotas a pre-launch mom-and-pop won't hit for months; analytics, QR codes, and API access are sold as paid but unenforced (`checkFeatureAccess` has zero call sites); "CSV export / priority verification / priority support / SSO / multi-location" are vapor; "AI insights" is templates. Three conflicting plan definitions disagree with each other and with the pricing page. **There is currently no honest answer to "why pay?"** (`monetization §1,3`). Everything below fixes that.

Gross margin is ~**99%** (cents of COGS/business — no LLM cost because there's no LLM; ~$45–70/mo infra floor). So the constraint is never cost; it is **(a) a real reason to pay and (b) near-zero-CAC distribution**. Pricing is **not** the barrier — Social Perks' $29/$49 sits at the *bottom* of the proven adjacent band (Smile $15/$49/$199, NiceJob $75–125, Birdeye $299, Square Loyalty $49). Trust, proof, and integration are the barriers (`market-legal §2.2`).

## 1. Every model evaluated (ranked)

| Rank | Model | 12-mo potential | 24-mo potential | Difficulty | Time-to-launch | Gross margin | Scalability | Verdict |
|---|---|---|---|---|---|---|---|---|
| **1** | **SaaS subscription (redesigned tiers)** | $10–30k MRR | $50–120k MRR | Low (code done) | **Days** (env) + weeks (re-tier) | ~99% | High | **Primary now.** Only working rail; fix the "why pay." |
| **2** | **Success fee — % of attributed redemption value** ("$39 + 1–3%") | $0 (needs POS) | $20–60k MRR add-on | Med-High (needs money-flow + POS attribution) | 6–9 mo | ~90% | **Very high — scales with customer success, not seats** | **The endgame.** The natural model; unlock via Square. |
| **3** | **Agency / white-label reseller** | $3–10k MRR | $20–50k MRR | Med (partner ops) | 2–4 mo | ~80% (20–40% partner margin) | High | **Secondary channel = revenue.** Historically dominant SMB-SaaS model; partner absorbs onboarding/retention. |
| **4** | **POS-marketplace rev-share / paid app** | small | $5–15k MRR | Med (integration) | 3–6 mo | ~90% | Med-High | Comes bundled with the Square integration; distribution first, revenue second. |
| **5** | **Premium analytics / ROI proof** | bundled | bundled | Low once data exists | 3–6 mo | ~99% | Med | **Bundle into Growth tier**, don't sell standalone. Needs real loop data first. |
| **6** | **AI services (real LLM copy + vision verification)** | bundled | $5–15k MRR | Med | 3–6 mo | ~85% (token cost) | Med | Make "AI" true, bundle into Growth; verification is a compliance prerequisite, not an upsell gimmick. |
| **7** | **Sponsored campaigns / brand partnerships** | $0 | speculative | High (needs both sides + scale) | 12+ mo | high | Med | Not for a single-sided SMB tool; revisit only with density. |
| **8** | **Creator tools / influencer take-rate** | $0 | $0 | High (second startup) | — | — | — | **Cut.** Two-sided creator marketplace dies on liquidity; zero supply today (`influencer §1.6`). |
| **9** | **Enterprise plans** | ~$0 | demand-dependent | High | 2+ quarters | high | Med | **Park behind "talk to us."** No human can hold the role today; build only if pulled (`influencer §2`). |
| **10** | **Per-transaction marketplace fee on the perk itself** | structurally impossible today | — | High | — | — | — | Cashback settles off-platform; `chargePlatformFee` never called. Requires routing money through the platform (=#2/#4). |

## 2. Recommended stacked model

- **Primary (now):** redesigned SaaS subscription — the only thing that can earn this quarter.
- **Secondary (mo 2–4):** agency/white-label reseller channel — margin-based, near-zero CAC, brings labor the solo team lacks.
- **Tertiary (mo 6–9):** success fee on attributed redemptions, enabled by the Square/POS money-flow + attribution. This is the model that eventually scales past seat-count ceilings.

This stack deliberately sequences **distribution → revenue**: Square gives the customer (distribution), the redemption data (real ROI proof = the "why pay"), *and* the rail for the success fee — one integration unlocks ranks 2/4/5/6 at once.

## 3. Pricing page v2 (the recommended change)

Stop selling features that don't exist. Price the **real** value: unlimited campaigns, **verified** posts, **enforced compliance**, **redeemable perks at the counter**, and integrations.

| Tier | Price | What it actually delivers (all real) | Gate that's enforceable |
|---|---|---|---|
| **Free** | $0 | 1 active campaign, QR poster, up to ~20 verified claims/mo, FTC-safe disclosure enforcement, claim page | Verified-claim volume (not "completions" — tie the cap to the *valuable* event) |
| **Core** | **$39/mo** ($390/yr) | Unlimited campaigns, unlimited verified claims, full results dashboard, weekly results email, all social actions, branded poster/widget | Single location/seat; no POS integration |
| **Growth** | **$99/mo** ($990/yr) | Everything + Square/Toast POS integration (real redemption ROI), multi-staff review seats, local cross-business cross-promo, real AI campaign copy + priority vision verification | Multi-seat + integrations |
| **Partner/White-label** | wholesale | Agency-managed multi-client console, 20–40% margin | Contract |

Why $39/$99 not $29/$49: the comps prove the ceiling is higher (NiceJob $75–125 flat for owner-operators), the differentiators in Core/Growth are *real*, and a slightly higher ARPU materially improves the LTV:CAC math (LTV at $39 ≈ $660–$790 vs $490 at $29). Keep annual −20% (already built). **Crucially, the free tier must keep QR codes and basic verification** — they are how the in-store acquisition demo works; gating them (as the current design intends) would kill the funnel (`monetization §3 free-tier verdict`).

## 4. Worked unit economics (one typical Core customer)

Assumptions (stated, conservative): ARPU $39/mo, gross margin 92% (post-AI/verification token cost), monthly logo churn 4.5% trending to 3%, CAC near-zero via marketplace/referral but loaded at ~$60 blended (founder time + partner margin amortized).

- **LTV** ≈ $39 × 0.92 ÷ 0.045 ≈ **$797** (≈ $1,196 at 3% churn).
- **LTV:CAC** ≈ 797 ÷ 60 ≈ **13:1** (target ≥3:1) — healthy *only* because CAC is near-zero; at paid-ad CAC of $300–500 it collapses to ~2:1 and fails. This is the entire reason paid acquisition is off the table.
- **CAC payback** ≈ <2 months (target ≤7) — excellent, again contingent on the channel mix.

## 5. The three monetization fixes that gate everything

1. **Make "why pay" real** (Flaw 1): re-tier around enforceable, genuine value; delete vapor features and the two dead plan defs; enforce the gates you keep. Without this, paid conversion ≈ 0 regardless of traffic.
2. **Make billing trustworthy** (Flaw 2): hydrate subs before webhook + enforcement; sync plan changes; one-sub upgrade path; dunning. A billing system that loses cancellations and mis-charges is worse than none.
3. **Get inside your own money flow** (Flaw 3): route redemption value through the platform via POS so a take-rate/success-fee becomes possible — the only model that scales with customer success instead of seat count, and the one that lifts the ceiling past where pure SaaS-on-a-crowded-shelf stalls.

> **Net:** the revenue engine isn't missing models — it's missing an honest reason to pay and a way to be inside the transaction. Fix tiers + billing integrity this month (unlocks SaaS), add the agency channel next quarter (adds revenue + labor), and let one POS integration unlock success-fee + real ROI proof + distribution simultaneously.
