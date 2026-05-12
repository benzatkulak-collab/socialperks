# 19 — Next Milestones

Concrete operational plan. What to do next, in order, with revenue triggers. This is the business-side counterpart to [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md).

## Day 0 — Today

State: platform audited and stable; no paying customers yet; product/onboarding work.

## Days 1–30 — Get the first paying customer

**Activity**:
- Send 5 outbound DMs/day (LinkedIn + Twitter/X + cold email).
- 30 days × 5/day = **150 DMs**.
- Expected funnel: 150 DMs → 10–20 replies → 5–10 demos → **2–5 trials → 1–2 paid**.

**Engineering**:
- Don't start M1 yet. Focus on responding to demo feedback.
- Fix any conversion-blocker bug within 24 hours of report.
- Track which CTAs and pricing tiers actually convert.

**Exit criteria**: At least one paid customer (MRR ≥ $9.99).

## Days 31–60 — If paid customers exist, polish onboarding

**Trigger**: ≥ 1 paid customer.

**Activity**:
- Customer onboarding polish — every paying customer gets a personal Loom walkthrough.
- Reduce time-to-first-campaign to under 10 minutes (measure via funnel analytics if available).
- Aggressive churn reduction: monthly check-in with each paying customer.

**Engineering**:
- **Start M1 (Prisma migration)** — see [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md#m1).
- Upgrade Render to Starter ($7/mo) — eliminates cold starts. Funded by first MRR.
- Write 1 customer story per converted customer (closes KI-008 progressively).

**Exit criteria**: MRR ≥ $50/mo, churn < 10%, M1 landed.

## Days 61–90 — SEO traffic starts to land

**Trigger**: organic search impressions trending up; first non-DM signups.

**Activity**:
- Conversion-optimize the **highest-traffic pages** identified by analytics.
- Write 1–2 pillar pages (closes KI-007 progressively).
- A/B test pricing page headline.

**Engineering**:
- **Start M2 (auth rework)** — refresh-token rotation, real session revocation.
- Add Sentry (M3) if MRR ≥ $200.

**Exit criteria**: MRR ≥ $200/mo, 1+ self-serve signup, M2 in progress.

## Days 91–120 — Infrastructure investment

**Trigger**: MRR ≥ $200/mo.

**Activity**:
- Upgrade Resend to paid tier ($20/mo) — supports 50k email/mo.
- Add Sentry — ~$26/mo. Wire all `console.error` to `captureException`.
- Add Dependabot + gitleaks to the pipeline (see [21-cicd-hardening-plan.md](./21-cicd-hardening-plan.md)).
- Close out remaining content debt at a steady cadence.

**Engineering**:
- **Finish M2, start M3 (observability).**
- Begin instrumenting per-route DB timing.

**Exit criteria**: M2 and M3 landed; alerting active.

## Days 121–180 — Grow the team (if MRR warrants)

**Trigger**: MRR ≥ $1,000/mo.

**Activity**:
- Hire a part-time customer-success contractor (~10 hr/week, ~$30/hr).
- They handle onboarding calls, Loom walkthroughs, churn intervention.
- This unlocks the founder to focus on growth and product.

**Engineering**:
- Evaluate **M6a (multi-region)** trigger: are EU/AP requests > 10% of total?
- Evaluate **M6b (real-time)** trigger: > 50 concurrent live-dashboard viewers?

**Exit criteria**: Founder workload sustainable; growth not bottlenecked on support.

## Beyond Day 180

**Triggered by milestones, not calendar.**

- **MRR ≥ $2,000**: schedule a real pen test (SEC-007). Begin SOC 2 prep if enterprise pipeline materializes.
- **MRR ≥ $5,000**: evaluate hiring first FT engineer.
- **MRR ≥ $10,000**: M12 (PWA/mobile) decision point.

## Critical do-not-do list

In order of how easy it is to mistakenly do these:

1. **Don't start M1 (Prisma) before first paying customer.** Wasted effort if pivot needed.
2. **Don't upgrade infrastructure pre-revenue.** Burn rate kills more startups than scale issues.
3. **Don't write all pillar pages at once.** Write the one with proven search demand first.
4. **Don't add Sentry before MRR ≥ $200.** Noise-to-signal too high.
5. **Don't hire anyone before MRR ≥ $1,000/mo.** Even contractors.
6. **Don't pursue SOC 2 before an enterprise deal requires it.** Multi-month, multi-$k commitment.

## Recurring tasks

| Cadence | Task |
|---------|------|
| Daily | 5 DMs (until product-market fit signal) |
| Weekly | Check Render + Neon usage dashboards |
| Weekly | Review customer-feedback inbox |
| Monthly | Re-run [10-risk-severity-matrix.md](./10-risk-severity-matrix.md) for status changes |
| Monthly | Reconcile Stripe MRR with internal numbers |
| Quarterly | Re-run full audit (lighter version) |
| Quarterly | Rotate webhook secrets (SEC-006) |

See [00-INDEX.md](./00-INDEX.md) for the rest of the audit deliverables.
