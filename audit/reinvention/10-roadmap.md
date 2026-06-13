# Profitability Roadmap (Phase 10)

*Constraints: solo founder + AI-agent dev capacity, $0 significant ad spend, ~99% gross margin, must reach first paying customer ASAP and ramp to $10k→$50k→$100k MRR. Sequenced ruthlessly by what unblocks revenue. Grounded in all 8 inputs.*

## 30 days — "Take money and close the loop"

**Theme: stop leaking; make the product actually work end-to-end and able to charge.**

- **Features (build):** (1) Go-live config — Stripe keys/prices/webhook + Resend + run migrate (hours). (2) Close the 5 loop breaks: durable submission read-path, business review surface, fix approve→award→email, public magic-link perk wallet, file-upload proof. (3) Wire the **QR-poster button** + put poster/share on the wizard success screen. (4) Fix **dashboard amnesia** (call the existing hydration fn). (5) Port campaigns/submissions persistence to the proven flat-TEXT-table pattern (close the silent data-loss bug).
- **Features (cut/block):** hard-block incentivized review actions (legal); kill dispute theater + false "AI/SMS/auto-review" copy + fabricated social proof/leaderboard; fix the payout balance-check (or cut payouts with the influencer side).
- **Revenue:** first dollar — onboard the founding 10 businesses by hand (the honest waitlist already exists); turn on checkout.
- **Retention:** weekly results email scaffold; PostHog value-loop events.
- **Growth:** finish the referral cookie-read; OG→PNG.
- **KPIs:** ready:true in prod; ≥10 businesses with a *closed* loop (real claim→redeem); first paid subscription; activation (claim within 7d) measurable.
- **Expected ROI:** unblocks 100% of revenue and retention; this month is worth more than the prior 6 of building.

## 60 days — "Activation + the first real channel"

**Theme: make activation reliable and open the first near-zero-CAC channel.**

- **Features:** low-effort proof polish (deep-links); real **vision-model verification** v1 (compliance prerequisite + makes "AI" honest); re-tier pricing to v2 ($39 Core / $99 Growth) with enforceable gates; billing link in nav + success-moment upgrade prompts; durable drip ledger before enabling lifecycle crons.
- **Revenue:** convert founding cohort to paid at value moment; publish the **Square App Marketplace** listing (submission + review lag starts now).
- **Retention:** weekly results email live; perk-program streaks v1; dunning sequence.
- **Growth:** local founder-led sales to ~30–50 logos; referral loop harvesting; vertical landing pages (coffee, salon, gym).
- **KPIs:** activation rate ≥40%; ≥30 paying; week-4 retention ≥55%; churn measured.
- **Expected ROI:** turns a working product into a *converting* one; Square listing seeds the compounding channel.

## 90 days — "Repeatable acquisition + prove ROI"

**Theme: a channel that compounds and data that justifies the price.**

- **Features:** Square POS integration (redemption attribution = real ROI proof, replaces fabricated projections); real LLM campaign-copy generation; local cross-business cross-promo v1.
- **Revenue:** Square integration → Growth-tier upsells; first **agency/white-label** partner conversations.
- **Retention:** ROI dashboard (real numbers); cross-promo network seeded in 1–2 local clusters.
- **Growth:** Square marketplace live; referral + B2B2C footer compounding; AEO/long-tail SEO harvest begins.
- **KPIs:** **$10k MRR trajectory**; CAC < $100 blended; LTV:CAC > 5:1; churn < 4%/mo.
- **Expected ROI:** establishes the distribution + proof flywheel that carries to $50k.

## 6 months — "Channel leverage"

- **Features:** agency white-label console; multi-staff seats; Toast/Clover integrations; success-fee billing rail (% of attributed redemptions) in beta.
- **Revenue:** agency channel live (20–40% margin, partner-led onboarding); success-fee pilot with high-volume customers.
- **Retention:** network effect deepening in 3–5 local clusters; benchmarks email.
- **Growth:** partner-sourced logos > founder-sourced; SEO maturing.
- **KPIs:** **$10k → $25k MRR**; partner-sourced share rising; churn trending to 3%.

## 12 months — "Scale the engine"

- **Features:** success-fee GA; light multi-location (only if demand pulls); more verticals + integrations; defensible local network density.
- **Revenue:** stacked model (SaaS + agency + success-fee) carrying past seat-count ceilings.
- **Growth:** marketplace + partner + referral + network effect, all compounding; SEO now a real channel.
- **KPIs:** **$50k MRR**; LTV:CAC > 6:1; net revenue retention > 100% (success-fee + expansion).

## Financial model (illustrative — conservative / base / optimistic)

Assumptions: ARPU ramps $39→$45 (mix shift to Growth + success-fee); churn 5%→3%; net-new paying SMBs/mo ramps with channels; $0 ads. *Estimates with stated assumptions, not forecasts.*

| Month | Conservative paying / MRR | Base paying / MRR | Optimistic paying / MRR |
|---|---|---|---|
| 3 | 25 / ~$1.0k | 35 / ~$1.4k | 55 / ~$2.2k |
| 6 | 70 / ~$2.9k | 110 / ~$4.6k | 180 / ~$7.5k |
| 9 | 130 / ~$5.4k | 210 / ~$9.0k | 330 / ~$14k |
| 12 | 200 / ~$8.6k | 320 / ~$14k | 520 / ~$23k |
| 18 | 420 / ~$19k | 720 / ~$33k | 1,250 / ~$58k |
| 24 | 720 / ~$33k | 1,250 / ~$58k | 2,300 / ~$110k |
| 30 | 1,050 / ~$50k | 1,950 / ~$95k | 3,400 / ~$165k |

**Milestone timing (base case):** $1k MRR ≈ **month 3**, $10k ≈ **month 8–9**, $50k ≈ **month 18–22**, $100k ≈ **month 28–32**. Conservative pushes each ~6–10 months later; optimistic pulls each ~4–8 months earlier.

**The single biggest swing factor is churn.** At 5%/mo the base case stalls near $40k; at 3%/mo it clears $100k. Everything sticky — the Square integration, the local network effect, real ROI proof, the agency channel doing retention — exists to push churn down. **Capital efficiency holds throughout** (99% margin, near-zero CAC); the company can reach $100k MRR without outside capital if it never reaches for paid ads.

> **Sequencing rule:** never build month-N+1 growth before month-N's revenue is unblocked. The ONLY thing standing between today and the first dollar is an afternoon of config and two weeks of loop-closing — do that before anything else on this roadmap.
