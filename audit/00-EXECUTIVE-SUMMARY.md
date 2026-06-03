# Social Perks — Comprehensive System Audit
### Executive Summary & Founder's Read
*Date: 2026-06-02 · Scope: full codebase, product, UX, security, reliability, revenue, AI · Method: 7 parallel domain specialists + direct code inspection, every finding traced to file:line*

---

## 0. The one-paragraph truth

Social Perks is a **genuinely well-crafted front end and revenue-plumbing layer wrapped around a back end that is roughly 40% dead code, 40% speculative infrastructure for zero users, and only ~20% the actual product** — and *within that 20%, the single most important thing the company sells (the perk/reward value loop) is stored in memory and deletes itself on every deploy.* The team has real engineering skill — the auth/billing security has clearly survived a serious prior pass, the TypeScript is strict and clean, the campaign onboarding wizard and customer claim page are above pre-launch norms, the health checks are honest. That skill has been spent building an enterprise-scale, "AI-powered" platform (event sourcing, sharding, multi-tenant, SOC2 engine, disaster recovery, an order-book "exchange," a plugin system, a second backend) **before validating a single user or making the core promise durable.** The good news: the product is closer to real than the sprawl suggests, and the highest-value work right now is mostly *deletion and durability*, not building.

**Overall readiness: 5.5 / 10 for real users.** Front-of-funnel and security: 8. Core-loop durability and product focus: 3. Truth-in-advertising (AI/metrics): 3.

---

## 1. Phase 1 — The business, as actually built

| Dimension | Reality (from the code) |
|---|---|
| **Purpose** | Businesses offer *perks* (discounts/rewards) to customers/creators in exchange for verified *social-media marketing actions*. "Turn customers into your marketing team." |
| **Segments** | Three: (1) mom-and-pop small business, (2) influencers/creators, (3) enterprise/multi-location. Only the **small-business path is fully built**; influencer is half-built (no guided onboarding, no monetization); enterprise is **demo-only mock data**. |
| **Core user journey (the one that works)** | Business signs up (4 fields) → 3-step wizard auto-launches a campaign (persisted) → customer/creator hits `/c/[id]` claim page → submits proof → business approves → perk awarded. This path is real and Postgres-backed for campaigns + submissions. |
| **Revenue model** | SaaS subscription (business-side only). **4 tiers: Free / $29 / $49 (Pro) / Custom**, annual −20% toggle. Real Stripe Checkout + webhooks. *Influencer side generates zero revenue and is pure cost.* |
| **Pricing oracle / benchmarks** | Public `/pricing` + `/benchmarks` endpoints return **hardcoded/"simulated" constants** presented as market data. |
| **Feature set** | Campaigns (works) + Perk Programs (parallel duplicate loop, not in portal) + Perk Wallet (in-memory) + Submissions/proof (works) + an **Exchange / order-book "agent trading market"** (in-memory, unlinked, serves no one) + Referrals (in-memory) + a large programmatic-SEO content surface (blog/guides/faq/glossary/answers/`/llm-context`/`/mcp`/OG images — genuinely coherent, just premature). |
| **AI workflows** | Campaign generation, marketing plans, recommendations, submission review, matching, "embeddings," fraud "ML." **None use an LLM** — there is no Anthropic/OpenAI/AI SDK anywhere. All template-fill, keyword regex, lookup tables, hash-based pseudo-"embeddings," and one circular logistic-regression model. |
| **Integrations** | Stripe (real, solid). Stripe Connect for influencer payouts (real transfers). OAuth scaffolding for social platforms (verification is largely **stubbed** — returns fixed confidence with no real API call). No Shopify/Klaviyo/POS/CRM. |
| **Data flows** | Split-brain. Durable in Postgres: auth users, businesses, single campaigns, submissions (write), billing/subs (after a pending migration), waitlist, feedback, influencer earnings, monthly usage, webhook-dedup. **In-memory / lost on cold start: perk wallet, redemptions, perk programs, members, cashback, financial ledger, exchange, referral codes, payout accounts, drip state, campaign *list* views.** |
| **Stage** | Pre-launch, **0 real external users**, live at socialperks.app on Vercel, Postgres on Supabase. |

**Scale reality vs. docs:** CLAUDE.md claims "35 API routes, 14 engines." Reality: **~104 routes, 40+ lib modules, two backends, ~232K LOC** (168K `src/` + 63K abandoned `api/`). *The documentation does not describe the system that exists* — itself a finding.

---

## 2. The five things that define the audit

### 🔴 1. The core value loop deletes itself (data-loss)
Perks earned, perk programs, members, redemptions, cash-back payouts, the double-entry **financial ledger**, referral codes, and influencer payout accounts are all stored in module-level `Map`/array objects. On Vercel, each cold start is a fresh instance — **a customer earns a reward Monday and it's gone Tuesday**, and two simultaneous users may hit two instances with different data. `perk-wallet.ts` has *zero* database references in the entire file; `perk_programs` has no table in the schema at all. Tests assert the in-memory behavior, so CI is *green while the product loses data*. This is the #1 issue and it invalidates charging money until fixed.
*Evidence: `src/lib/perk-wallet.ts:17,249`; `src/lib/programs/store.ts:77-80`; `src/lib/financial-ledger.ts:8,98`; `src/app/api/v1/exchange/orders/route.ts:25`.*

### 🔴 2. AI-washing + fabricated numbers (truth-in-advertising)
The "backend AI engine" is templates and regex. Worse than harmless: the app **meters and charges for "AI"** that is template-fill; it shows businesses **invented ROI / reach / CPA "projections"** built from hardcoded coefficients (`reach × 0.012`); the **verification engine returns 0.95 "confidence" with no API call** (fraud passes on a client-sent string); and the docs claim FTC disclosure is "auto-injected, cannot be disabled" when the code only *validates/advises*. Fix before a paying customer or a regulator sees it.
*Evidence: `ai-engine.ts:233,591`; `recommendation-builder.ts:74`; `verification-engine.ts:144,189`; `compliance-engine.ts:620,676`.*

### 🔴 3. The sprawl tax (40% of the repo is removable)
A **63K-LOC abandoned second backend** (`api/`) duplicates 50 of 53 engines and must be patched twice for every security fix. `infrastructure/*` (SOC2, sharding, disaster-recovery, edge, observability, ml-pipeline — ~14.7K LOC) has **zero importers**. The Exchange, graph-engine, sync-engine, analytics-engine, and API v2 are each dead. **~84% of API routes are unreachable from the UI.** ~91K LOC (~40% of the repo) is deletable *now*; another ~17.6K deferrable. Every feature ships ~5× slower than it should because of the noise.
*Evidence: `.vercelignore:/api/`; 0-importer greps across `infrastructure/*`, `exchange.ts`, `graph-engine.ts`, `sync-engine.ts`, `analytics-engine.ts`.*

### 🟠 4. You cannot take money today (but you're ~1 sprint away)
The Stripe code is genuinely good. But: price IDs aren't set (checkout 503s), `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET` aren't on Vercel, the billing migration (v5) isn't applied in prod, and the **migration runbook is false** — `setup-stripe-billing.sh` tells you to call `/migrate` with a Bearer `MIGRATION_SECRET` that the route doesn't read, and `ensureDatabase()` has no caller. So the founder may *believe* billing tables exist when they don't.
*Evidence: `billing/route.ts:113-119`; `stripe.ts:12`; `migrations.ts:629`; `scripts/setup-stripe-billing.sh:35-38` vs `migrate/route.ts:19-43`.*

### 🟠 5. The funnel leaks at the very top, and ops is blind
The landing page's primary **"Get Started" button is dead** (`href="#signup"` with no listener on the static route). **Password reset leads to a page that doesn't exist.** Admin is **unusable on mobile**. Meanwhile there is **no error tracking (no Sentry)** and the **job-queue worker is dead** (`startAllQueues()` has zero callers; `setInterval` never fires on serverless), so the "you got your first customer post!" email and all agent dunning/outreach emails are *silently dropped*.
*Evidence: `shared/nav.tsx:152,277`; `auth/auth-form.tsx:472`; `admin/admin-sidebar.tsx:12`; `jobs/queue.ts:192`, `submissions/route.ts:273`.*

---

## 3. What's genuinely good (do not "fix" these)

A fair audit names the strengths, because they tell you the team *can* execute:
- **Auth & billing security**: JWT HS256 alg-pinned + timing-safe + prod-mandatory secret; Stripe webhooks use real `constructEvent` with raw body and refuse mock-mode in prod; API keys SHA-256 hashed + constant-time; every admin route enforces `role==="admin"`; impersonation refuses admin→admin and is audited; SQL fully parameterized with allow-listed `ORDER BY`; IDOR fixed (fail-closed ownership). *No auth bypass, no exposed secret, no unverified money-moving webhook.*
- **The business onboarding wizard**: 4-field signup → auto-launching 3-step wizard with live preview, per-platform rewards, confetti payoff. Above typical pre-launch quality.
- **The `/c/[id]` customer claim page + dashboard empty/loading/error discipline** — the best-built parts of the app.
- **Honest health checks**: `/health` runs a live `SELECT 1` and reports a `durable` flag; `/health/readiness` probes for the pending billing table.
- **Subscriptions ARE durable** once the migration runs (write-through + cold-start hydration), and **influencer payouts are real Stripe Connect transfers**, not a stub.
- **TypeScript discipline**: `strict:true`, ~9 `any` in 169K LOC, 0 `@ts-ignore`; hardened CSP/HSTS in `next.config.js` (no `ignoreBuildErrors`).
- **Programmatic SEO surface** is coherent and well-built — just premature.

---

## 4. Phase 10 — The founder audit (if I acquired this today)

**1. Keep:** the campaign core loop, the onboarding wizard, the claim page, the Stripe billing layer, the auth/security foundation, the durable repos (auth/business/campaign/submission/billing/waitlist), the health checks, and the SEO content engine.

**2. Delete now (~91K LOC, ~40%):** the entire `api/` backend; `infrastructure/*`; the Exchange (engine + 5 routes + page); `graph-engine`, `sync-engine`, `analytics-engine`, `financial-ledger` (rebuild durably later if needed); API v2; `ideas.ts` (177KB, 0 importers); dead ML/embedding twins.

**3. Rebuild (small, durable, honest):** perk wallet + perk programs + redemptions + referrals as **Postgres-backed** features (this *is* the product). Replace the verification stub with real OAuth/webhook checks. Replace fabricated ROI numbers with real measured data or clear "estimate" labeling. Wire one **real LLM** (Anthropic) behind the campaign-copy feature so "AI" is true.

**4. Prioritize (next 30 days):** durability of the value loop → finish billing go-live → fix the dead CTA / reset / mobile-admin → add Sentry → kill the AI-washing/fabricated-metrics exposure.

**5. Postpone:** influencer monetization, enterprise portal, exchange, plugin system, multi-tenant/sharding, programmatic-SEO expansion — until there are paying businesses.

**6. Stop spending time on:** maintaining two backends, adding routes/engines nothing calls, "scale" infra for 0 users, and anything that deepens the AI-washing.

**7. Top 25 highest-ROI projects:** see **`E-top-25-projects.md`** (ranked, with plans, dependencies, risks, effort, outcomes).

---

## 5. How to read this audit

| File | Contents |
|---|---|
| **`00-EXECUTIVE-SUMMARY.md`** | This document — business map, the 5 defining issues, founder audit. |
| **`A-top-100-issues.md`** | All 100 issues, globally ranked by severity × impact × urgency, with evidence + fix. |
| **`B-top-50-quick-wins.md`** | 50 high-ROI / low-effort fixes, with effort + expected ROI + affected systems. |
| **`C-90-day-plan.md`** | Week-by-week transformation roadmap (3 phases: Stabilize → Focus → Grow). |
| **`D-world-class-team.md`** | What OpenAI/Stripe/Linear/Notion/Shopify would each change first. |
| **`E-top-25-projects.md`** | The second pass: top 25 highest-leverage projects, ROI-ranked, with implementation plans. |
| **`findings/architecture.md`** | Phase 4 — full architecture & code-health detail. |
| **`findings/security.md`** | Phase 5 — full security detail. |
| **`findings/reliability.md`** | Phase 6 — full reliability + the durability table. |
| **`findings/revenue-growth.md`** | Phases 7–8 — revenue path + competitive analysis. |
| **`findings/product-inventory.md`** | Phase 2 — full feature catalog + cut/defer list. |
| **`findings/ux.md`** | Phase 3 — full UX/a11y detail. |
| **`findings/ai-systems.md`** | Phase 9 — full AI/automation detail + technique table. |

> **Bottom line for the founder:** You have a real product and a capable team trapped inside a codebase that's pretending to be a 10-year-old enterprise platform. The path to "elite SaaS" is not more building — it's **delete 40%, make the value loop durable, tell the truth about the AI, finish billing, and fix five funnel/ops leaks.** That's a focused 90 days, not a rewrite.
