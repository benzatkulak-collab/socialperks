# Social Perks — Reinvention & Profitability Audit
## Executive Summary + The From-Scratch Answer

*Prepared as an elite executive team (CEO/CPO/CRO/Growth/Behavioral/Marketplace/Monetization/AI). Date: 2026-06-13. Grounded in 8 verified research inputs under `audit/reinvention/inputs/` (5 codebase ground-truth audits + 3 web/market/legal research files) and the June-2 engineering audit under `audit/`. Every codebase claim is file:line-cited in the source inputs.*

---

## 1. The one-paragraph thesis

Buried inside Social Perks is a **real, narrow, defensible product**: the only self-serve tool that lets a local business turn its everyday customers into a compliant social-media marketing team — *post about us, prove it, redeem a perk at the counter*. That product is surrounded by three half-built audiences (influencers, enterprise, AI agents) that together account for most of the codebase and **none** of the plausible revenue, and its core value loop **breaks in five independent places the moment a campaign goes live**. The June-2→June-3 remediation (PRs #106–#109) was real, fast, and honest — ~90K lines of dead code deleted, the back half of the loop made durable, security holes closed — but momentum stopped on June 3, the company **still cannot accept a single dollar** (Stripe/Resend env vars unset — an afternoon of dashboard work), and the marketing still sells "AI" that contains no AI and "real results" from a product with **zero real users**. The market timing is genuinely good and the whitespace is empirically empty. The path to profitability is not more building — it is **brutal subtraction to one audience and one loop, an afternoon of go-live config, two weeks closing the loop, and a compliance wedge no incumbent will copy.**

---

## 2. What's actually true right now (verified 2026-06-12/13)

**The good (do not relitigate):**
- Auth + billing **security** is genuinely strong: CSRF, tiered rate limiting, IDOR/SSRF fixed in #108/#109, constant-time secrets, Stripe signature verification with prod hard-fail. (`delta-remediation.md §5`)
- The **acquisition funnel front half is excellent**: landing → 4-field signup → a 3-step auto-launching campaign wizard → "campaign live" confetti in ~4–6 minutes, mobile-competent, PostHog-instrumented. (`funnel-walkthrough.md §1–3`)
- The **`/c/[id]` claim page** is the one durable, well-built, on-thesis surface — server-rendered, mobile-first, FTC disclosure baked in, and carries a **"Powered by Social Perks" footer = a built-in B2B2C acquisition loop**. (`growth-surface.md §2a`)
- Remediation deleted the right things (api/ second backend, infrastructure/, exchange, sync, ml) — 236K→146K TS LOC, −38%. (`delta-remediation.md §3`)

**The fatal (what actually blocks revenue and retention):**
1. **The loop never closes.** After "campaign live," there are 5 breaks, each individually small, all blocking: (a) the public submit endpoint 404s live campaigns on cold serverless instances; (b) submissions persist write-only and evaporate from every read path on cold start; (c) the business has **no review UI at all** (approve/reject lives only in an admin console they can't reach); (d) the only approve button awards **no perk and sends no email** (missing request fields); (e) an anonymous QR-scanning customer has **no surface to ever see or redeem a perk**. The product's true First Value Moment — a real customer post redeemed for a real perk — **is unreachable in shipped code.** (`funnel-walkthrough.md §5–9`, `influencer-enterprise-agents.md §4`)
2. **Dashboard amnesia kills day-2 retention.** Campaign lists, stats, and analytics all read in-memory state that resets on every deploy; a returning owner sees their work erased even though it survives in Postgres. (`funnel-walkthrough.md §10`)
3. **Cannot take money.** Live prod readiness probe: `ready:false` — `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_*`, `RESEND_API_KEY` all missing. Billing **code** is done; every blocker is a dashboard task. (`delta-remediation.md §4`)
4. **"AI" is sold but doesn't exist.** Zero LLM in the dependency tree, while the pricing page sells "AI insights" and "AI campaign generations" as paid differentiators; verification "confidence" is URL-substring matching dressed as "Instagram Graph API" evidence. (`delta-remediation.md §2`, `influencer-enterprise-agents.md §4.2`)
5. **A live legal landmine.** `src/lib/ai-engine.ts:246-253` still generates a "Google Review Drive" campaign attaching perks to Google review actions — directly contradicting the product's own public claim that it blocks this, and pointing customers at a **$53,088-per-violation** FTC exposure plus a Google/Yelp ban. (`platforms-comparison.md`, `market-legal-ftc.md §1`)
6. **Trust theater.** The influencer dispute flow renders "Dispute sent" while discarding the text client-side with no API call; "submissions reviewed automatically + perk via SMS" is false; the public leaderboard and profile pages are fabricated from seed data and indexed for Google. (`influencer-enterprise-agents.md §4.3`, `growth-surface.md §4c`)

**The wasted mass:** the influencer side is a facade (~3,400 LOC of dead components, profile saves 404 for real users, payouts have **no balance check** = drain-the-account bug once Stripe goes live); enterprise is demo-only (**no human can hold the enterprise role in prod**); the 10-agent "autonomous" fleet **cannot ever run live** on serverless (mode is process-local memory). (`influencer-enterprise-agents.md §1–3`)

---

## 3. The market verdict (why this is worth doing at all)

- **The target quadrant is empirically empty.** Nobody sells self-serve "reward local customers for social posts, redeem at the counter" at $29–79/mo. Review SaaS (Birdeye ~$299/mo, Podium $399–599/mo real-spend, NiceJob $75–125/mo) owns the local buyer but does **only reviews**. POS loyalty (Square Loyalty $49, Toast, TapMango) owns redemption but rewards **only purchases**. Ambassador platforms (Brandbassador $500–3,000/mo, Roster $599/mo, SocialLadder) run the **exact loop** but packaged for **mid-market DTC on annual contracts** — 10–60× the price. (`competitors-direct.md`)
- **Incentivized reviews are now radioactive — and that is the opportunity.** FTC 16 CFR Part 465 (effective Oct 2024; first warning letters Dec 2025; first $4M penalty Apr 2026) bans sentiment-conditioned incentives, and **disclosure does not cure it**; Google/Yelp/TripAdvisor ban incentivized reviews **entirely**. But perks-for-**UGC/social-posts** with enforced `#ad` disclosure is **legal**. Incumbents deliberately stop at unincentivized review requests. **"The only perk platform that makes FTC compliance structural" is a truthful, defensible wedge** every SMB now needs ($53K/violation each). (`market-legal-ftc.md §1`)
- **Timing tailwind:** influencer spend hit **$32.55B in 2026, 45.5% to nano/micro creators, 73% of brands prefer them**; Later paid **$250M for Mavely** (everyday-creators-as-affiliates) in Jan 2025. The "customer as nano-creator" wave is cresting; the whitespace won't stay empty. (`competitors-direct.md`)
- **The economics are knife-edge and dictate strategy.** 36.2M US SMBs but only ~6.4M with employees; micro-business marketing budgets cluster ≤$500/mo; **SMB SaaS churn is 3–7%/month** → LTV ≈ $490 (at $29) to $830 (at $49), so blended **CAC must stay under ~$165–275**. That **rules out paid acquisition entirely** and forces marketplace + partner + referral + local channels. **Distribution and stickiness decide this business, not features.** (`market-legal-ftc.md §2–3`)

---

## 4. The reinvention in one move: subtract to one audience, one loop, one integration

| Decision | Action |
|---|---|
| **One audience** | Local, consumer-facing SMBs (coffee, salons, gyms, restaurants, boutiques). Kill influencer marketplace, enterprise portal, agent-supply pitch. |
| **One loop** | QR poster → customer scans `/c/[id]` → posts with **enforced** disclosure → **real** verification → perk lands on their phone → **redeem at counter** → branded claim page acquires the next business. |
| **One integration** | **Square first** (then Toast/Clover/Shopify): it is simultaneously the distribution channel (near-zero CAC marketplace) *and* the missing product capability (redemption/transaction data to verify ROI and replace fabricated projections). |
| **One honest pricing model** | Free (1 campaign, real value demo) → **$39 Core** (unlimited campaigns, QR, verification, compliance) → **$99 Growth** (multi-staff, integrations, success analytics). Add a success-fee tier only after POS attribution exists. Stop selling "AI," "SSO," "CSV," "priority" — none exist. |

**The defensibility stack (the only durable moat):** (1) **Compliance-by-design** — structural FTC-safe flows incumbents won't build; (2) **Real Meta-verified post checking** — a gated capability since Meta shut the Basic Display API in Dec 2024; (3) **Local redemption UX + POS data**; (4) the **local cross-business network effect** (Substack-Recommendations-style "supporters of Luna Cafe also earn at Iron Gym" — the one mechanic that compounds and no loyalty competitor has). (`platforms-comparison.md`, `competitors-direct.md`)

---

## 5. The fastest path to $10k → $50k → $100k MRR (capital-efficient)

**Cost reality:** ~99% gross margin (cents of COGS per business), solo-founder + AI dev capacity, ~$45–70/mo infra floor. The constraint is **acquisition + retention, never cost.** So the plan optimizes for near-zero-CAC channels and sub-3%/mo churn, and never spends on ads.

### First dollar — Weeks 1–4
- **Afternoon:** set the 6 env vars (Stripe keys/prices/webhook + Resend), register the webhook, run `/api/v1/migrate`. Company can now charge. (`delta-remediation.md §4`)
- **~2 weeks:** close the 5 loop breaks (durable submissions read-path, business review UI, fix approve→award→email, public perk wallet via magic-link, file upload for proof) + wire the **QR-poster button** (API already exists, no UI calls it) + fix dashboard amnesia (call the `loadLifecyclesForBusiness` that exists with zero callers). (`funnel-walkthrough.md §15`, `growth-surface.md §7`)
- **Kill the legal landmine** (hard-block incentivized review actions) and the trust lies (dispute theater, false copy, fabricated social proof/leaderboard). Cheap; cost of being caught is total. (`market-legal-ftc.md §1.6`)

### $0 → $10k MRR — Months 1–9 (≈200–350 paying SMBs @ ~$35–49 blended)
- **Channel mix:** founder-led local sales for the first ~50 logos (Main Street, chambers, BNI, local FB groups — proof not scale); then **Square App Marketplace** listing (qualified intent, ~0 CAC); then the **product's own referral loop** finished (20 lines: read the `sp-ref` cookie at signup — durable tables, dashboard UI, webhook crediting already exist). (`market-legal-ftc.md §3`, `growth-surface.md §1`)
- **Activation metric:** "first customer claim within 7 days." **Aha-moment:** owner watches a real customer post → redeem at their own counter.
- **Retention:** weekly "results" email (real numbers, once the loop closes) + the perk-program punch-card skeleton (already durable). Get churn under segment norm via the Square integration's stickiness.

### $10k → $50k MRR — Months 9–18 (≈1,200–1,700 customers)
- Square marketplace compounding + **agency/white-label reseller channel** (the historically dominant SMB-SaaS model — Vendasta/Yext pattern; 20–40% partner margin beats any paid CAC and the agency absorbs onboarding/retention labor).
- Turn on the **local cross-business network effect** (cross-perk recommendations at claim time) — the compounding, defensible loop.
- Layer **AI where it's real and cheap**: LLM campaign-copy generation + **real vision-model proof verification** (the trust-critical, compliance-prerequisite feature) at Haiku/Sonnet token economics that survive a $39/mo price.

### $50k → $100k MRR — Months 18–30 (≈2,500–3,500 customers, OR fewer + success-fee + partners)
- Add the **success-fee revenue layer** ("$39 + % of attributed redemption value") once POS attribution makes it honest — revenue that scales with customer success instead of seat count, the natural model for this product.
- Multi-location/light-enterprise *only if* pulled by real demand; expand verticals via the programmatic-SEO surface (now a maturing 12–24-month asset) and the agency channel.

**Conservative/base/optimistic** (full model in `10-roadmap.md`): base case reaches **$10k MRR ~month 8, $50k ~month 18, $100k ~month 28**, assuming ~40 net new paying SMBs/mo ramping, ~4–5%/mo churn trending to 3%, ARPU ~$42. The single biggest swing factor is **churn**, which the POS integration and the network effect exist to suppress.

---

## 6. The five things to do this week (in order)

1. **Go live on payments** — 6 env vars + webhook + migrate. (Hours. Unblocks 100% of revenue.)
2. **Close the loop** — the 5 breaks + QR-poster button + dashboard-amnesia fix. (≈2 weeks. Makes the product *work*.)
3. **Remove the landmine and the lies** — hard-block incentivized reviews; kill dispute theater, false "AI"/"SMS"/"auto-review" copy, fabricated social proof. (Days. Prevents catastrophe.)
4. **Subtract** — cut influencer marketplace, enterprise portal, agent-supply pitch, second referral system, fake leaderboard/profiles. (Reclaims focus + closes the payout drain-the-account bug.)
5. **Point the wedge** — reposition every surface to "compliant customer-advocacy for local business," finish the referral cookie-read, ship the Square listing.

> **Bottom line for the founder:** You do not have a building problem — you have a **finishing-and-focus** problem. The product that wins is already 90% in the repo; it is hidden behind 60% that should be deleted and blocked behind five small breaks and one afternoon of config. Ship the loop, take money, point everything at compliant local-customer advocacy, and let the "Powered by Social Perks" footer and the Square shelf do the acquiring. The rest of this report is the evidence and the sequencing.

*See companion deliverables: `01-product-audit.md`, `02-competitive-analysis.md`, `03-top-50-weaknesses.md`, `04-viral-growth.md`, `05-revenue-engine.md`, `06-feature-elimination.md`, `07-feature-expansion.md`, `08-ai-strategy.md`, `09-conversion-funnel.md`, `10-roadmap.md`, `11-risk-investor-reality.md`, `12-top-100-improvements.md`.*
