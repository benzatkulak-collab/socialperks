# Report C — 90-Day Transformation Plan
*Week-by-week. Three arcs: **Stabilize (W1–4)** → **Focus (W5–8)** → **Grow (W9–13)**. Sequenced so revenue + trust + durability come before any new building. Assumes 1–2 engineers.*

> Guiding principle: **subtract, make durable, tell the truth, then grow.** Do not build a single new feature until the value loop is durable and you can take money.

---

## ARC 1 — STABILIZE (Weeks 1–4)
*Goal: take money safely, stop losing data, stop misrepresenting the product, halve the codebase.*

### Week 1 — Revenue on, harm off
- **Go-live billing:** set `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`, create prices + `STRIPE_PRICE_*`, run & verify the billing migration, fix the false runbook. *(Quick wins 2–5)*
- **Fix the dead landing CTA** and the password-reset dead end's first half (route stub). *(QW1, issue 27)*
- **Kill active trust/legal exposure:** stop metering "AI," relabel fabricated ROI/benchmark numbers, hide invented profile earnings, fix FTC docs. *(QW6–9)*
- **Add Sentry** + alert on DB-write failures. *(QW11)*
- ✅ *Exit check:* a test card completes checkout, the subscription persists across a redeploy, and no screen shows an invented number presented as real.

### Week 2 — The Great Deletion
- **Delete `api/` (63K), `infrastructure/*` (14.7K), `ideas.ts` (177KB), exchange, graph/sync/analytics engines, API v2, dead ML twins, the nested worktree.** ~91K LOC / ~40% of repo. *(QW21–28)*
- Rewrite `CLAUDE.md`/`API.md` to describe the system that actually exists. *(QW49)*
- Tighten `tsconfig` to typecheck tests; enforce branch protection so red CI can't ship. *(QW17, 19)*
- ✅ *Exit check:* build + 2,483 tests still green on a repo ~40% smaller; one source of truth per concept.

### Week 3 — Durable value loop, part 1 (the wallet)
- Design + ship Postgres tables + repo for **perks earned, perk balances, redemptions** (write-through + cold-start hydration, mirroring the billing pattern that already works). *(Issue 1)*
- Move the perk-wallet tests to assert against the DB-backed path. *(Issue 25)*
- ✅ *Exit check:* a perk earned before a redeploy is still claimable after it; readiness probe covers the perk tables.

### Week 4 — Durable value loop, part 2 (programs, referrals, payouts) + security batch
- Persist **perk programs / members / cash-back** (add the missing schema tables) and **referral codes/credits** and **influencer payout accounts**. *(Issues 2, 15.5, 17)*
- Decide on the **financial ledger**: persist it or remove it until needed. *(Issue 3)*
- Security batch: distributed rate limiter, SSRF fix (`assertSafeUrl`+IP-pin), CSRF on admin/billing, founder email→env, logger redaction. *(QW41–45)*
- ✅ *Exit check:* every core entity in the durability table reads YES; the security HIGHs are closed.

> **End of Arc 1:** You can take money, the product no longer deletes itself, the worst trust/security issues are gone, and the repo is half the size. This is the real "launch-ready" line.

---

## ARC 2 — FOCUS (Weeks 5–8)
*Goal: one coherent product, one strong funnel, honest "AI," real verification.*

### Week 5 — Collapse to one core loop
- **Cut or merge Perk Programs into Campaigns** so there's a single mental model (campaign → action → proof → perk). Remove the competing concepts from nav/IA. *(Issue 22)*
- Audit remaining routes; delete/defer everything still unreachable from the UI. *(Issue 23)*
- ✅ *Exit check:* an SMB owner can describe the product in one sentence; nav reflects exactly what's shippable.

### Week 6 — Finish the funnel
- Complete **password reset** (token page + flow), add **email verification + password-confirm**, remove **PIN fallback**. *(Issues 27, 65, 60)*
- **Admin mobile nav**; replace `confirm()/alert()` with the design-system Modal; add review toasts. *(Issues 28, 64, 63)*
- Restore email reliability: cron-drain queue or direct-send; add the **digest cron**; fix drip idempotency. *(Issues 12, 19, 18)*
- ✅ *Exit check:* signup → first campaign → claim → approve → perk works end-to-end on mobile and desktop, with recovery flows.

### Week 7 — Make "AI" honest (and partly real)
- Rename all "AI/embeddings/ML/autonomous-agent" UI + docs to honest labels. *(QW48)*
- Wire **one real LLM (Anthropic)** behind campaign-copy/quick-start: keep the rules engine as the structured backbone, let the model write the tailored strategy prose. Add caching, guardrails, logging. *(Issues 4, 31)*
- Replace the **verification stub** with at least one real signal (OAuth or platform webhook) for the top platform; keep human-review fallback. *(Issue 6, 32)*
- ✅ *Exit check:* "AI" features either are real or are labeled as templates; verification reflects a real check for ≥1 platform.

### Week 8 — Accessibility, polish, e2e
- WCAG AA contrast, focus traps, ARIA on tabs, footer IA. *(Issues 30, 42, 78, 81)*
- Add the **e2e smoke job** to CI (signup→campaign→claim→approve). *(Issue 38)*
- Tidy: `config.ts` central validated env at boot; standardize the persistence pattern. *(Issues 52, 55)*
- ✅ *Exit check:* Lighthouse a11y ≥ 90 on key pages; e2e smoke gates merges.

> **End of Arc 2:** One coherent, durable, honest product with a complete funnel and real (if minimal) AI + verification.

---

## ARC 3 — GROW (Weeks 9–13)
*Goal: only now, add growth surface — and only what compounds.*

### Week 9 — Activation instrumentation
- Define and instrument the activation funnel (signup → launch → first claim → first approve) with a real product-analytics path (PostHog is already live per project notes). Identify the true drop-off.
- ✅ *Exit check:* a funnel dashboard shows where users fall off.

### Week 10 — The dogfooded referral loop
- Make the **referral program** a first-class, two-sided, durable growth loop and surface it in-product (the company's own thesis, finally dogfooded). *(Issues 15.5, 82)*
- ✅ *Exit check:* a referred signup is attributed and rewarded across deploys.

### Week 11 — First real integration
- Ship **one** integration that removes setup friction for the target wedge (e.g. Shopify app *or* a POS/Square hook for local SMBs, or Klaviyo for DTC). Pick by where the first 10 customers are.
- ✅ *Exit check:* a business can connect their store and auto-issue perks.

### Week 12 — Pricing & packaging
- Add a **paid trial**, a **mid-market tier** between $49 and Custom, and tie metering to delivered value. Decide influencer-side monetization or formally descope it. *(Issues 58, 59, 57, 29)*
- ✅ *Exit check:* pricing matches the segments you're actually selling to.

### Week 13 — Hardening & first cohort
- Verify backups/PITR (replace the DR stub with a documented, tested restore). *(Issue 24)*
- Onboard a small **design-partner cohort** of real businesses; watch the funnel dashboard; fix what they hit.
- ✅ *Exit check:* real businesses running real campaigns with durable perks, observable funnel, and a working referral loop.

---

## What's explicitly NOT in 90 days
Enterprise portal, the exchange, plugin system, multi-tenant/sharding, offline sync, programmatic-SEO expansion, a mobile app, "real ML" fraud. **All deferred until paying businesses justify them.**

## Success metrics by day 90
- ✅ Takes money; subscriptions durable across deploys.
- ✅ Zero in-memory core-product state (durability table all YES).
- ✅ Repo ~40% smaller; one core loop; honest AI labeling.
- ✅ Funnel instrumented; reset/verify/mobile-admin complete; a11y ≥ 90.
- ✅ Sentry + e2e + branch protection guarding prod.
- ✅ A real design-partner cohort live.
