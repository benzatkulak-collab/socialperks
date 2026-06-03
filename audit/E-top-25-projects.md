# Report E — Top 25 Highest-Leverage Projects
*The second pass: from "finding problems" to "building the roadmap." Ranked by ROI (value ÷ effort × confidence). Each: **Why it's leverage · Plan · Dependencies · Risks · Effort · Expected outcome.** Effort: S(<½ day) · M(½–3 days) · L(3–10 days) · XL(>2 weeks).*

> Read with `C-90-day-plan.md` (sequencing) and `A-top-100-issues.md` (the underlying issues). Projects 1–8 are the "must" tier; 9–18 compound; 19–25 are strategic bets for after product-market signal.

---

## TIER 1 — Survival & revenue (do before any growth)

### 1. Durable Value Loop (perks · programs · redemptions · referrals · payouts)
- **Leverage:** This *is* the product. Today it deletes itself on every deploy — the single highest-ROI fix in the repo.
- **Plan:** (a) Schema: add `perks`, `perk_balances`, `redemptions`, `perk_programs`, `program_members`, `cashback_payouts`, `referral_codes`, `referral_credits`, `payout_accounts` tables. (b) Build repos following the proven billing pattern (write-through + cold-start hydration). (c) Replace the `Map` stores in `perk-wallet.ts`, `programs/store.ts`, `referrals/index.ts`, `payouts/index.ts`. (d) Migrate tests to assert against the DB path. (e) Extend the readiness probe to all new tables.
- **Dependencies:** Billing migration pattern (exists); DB connection pooler (exists).
- **Risks:** Schema churn if the product model isn't settled — do Project 9 (collapse to one loop) in parallel to avoid building tables for a concept you'll cut.
- **Effort:** L–XL. **Outcome:** A perk earned Monday is claimable after Friday's deploy; you can charge for it honestly.

### 2. Billing Go-Live + Idempotent Migrations
- **Leverage:** ~1 sprint from "can't take money" to "takes money."
- **Plan:** Set `STRIPE_SECRET_KEY`/`STRIPE_WEBHOOK_SECRET`; create prices + `STRIPE_PRICE_*`; make `/migrate` authoritative, authed (Bearer secret), idempotent, and run-on-deploy; fix the false `setup-stripe-billing.sh` runbook; validate `metadata.plan` in the webhook; readiness probe gates the billing table.
- **Dependencies:** Stripe account/prices; Vercel env access.
- **Risks:** Running migrations from a public-ish endpoint — gate it; prefer a deploy hook.
- **Effort:** M. **Outcome:** A real card completes checkout and the subscription survives redeploys.

### 3. The Great Deletion (remove ~40% of the repo)
- **Leverage:** Every future change gets ~2–5× faster; security surface halves; "AI/enterprise" claims stop being contradicted by dead code.
- **Plan:** Delete `api/` (63K), `infrastructure/*` (14.7K), `exchange.*`, `graph-engine`, `sync-engine`+`sync/`, `analytics-engine`, `financial-ledger` (unless Project 1 keeps it), API v2 + `versioning.ts`, dead ML/embedding twins, `ideas.ts`, the nested worktree. Tighten tsconfig; rewrite CLAUDE.md/API.md.
- **Dependencies:** Confirm 0-importers per file (audit already did; re-verify before each delete).
- **Risks:** Deleting something with a hidden dynamic import — mitigate by keeping the build+2,483 tests green after each batch and deploying to a preview.
- **Effort:** M. **Outcome:** ~91K LOC gone, build green, one source of truth per concept.

### 4. Observability & Alerting (Sentry + write-failure alerts)
- **Leverage:** You currently cannot see production errors at all. Everything else is riskier without this.
- **Plan:** Add Sentry (client + server + edge); wrap DB writes to alert on failure instead of swallowing; route the in-memory `alerts.ts` to a real channel (Slack/email); add uptime checks on `/health`.
- **Dependencies:** Sentry project.
- **Risks:** PII in error payloads — pair with logger redaction (Project 8).
- **Effort:** M. **Outcome:** Failures page you instead of silently corrupting state.

### 5. Email Reliability (kill the dead queue)
- **Leverage:** Restores the entire lifecycle/engagement/dunning email system, which is currently silently dropped.
- **Plan:** Replace the dead `setInterval` worker with either direct-send at call sites or a cron that drains a *durable* queue table; persist drip "sent" state (idempotent); add the missing **digest cron**; verify Resend domain/reputation.
- **Dependencies:** Resend config; durable store (Project 1 pattern).
- **Risks:** Cold-start re-blast (already a bug) — fix idempotency first.
- **Effort:** M. **Outcome:** "First post!" + dunning + weekly digest actually send, exactly once.

### 6. Stop AI-Washing + Fabricated Numbers
- **Leverage:** Removes the highest legal/trust exposure for near-zero effort.
- **Plan:** Feature-flag off "AI" metering until real; relabel ROI/reach/CPA as clearly-marked estimates (or remove); hide invented profile earnings; fix FTC "auto-inject" docs; rename "embeddings/ML/autonomous agents" to honest terms across UI + docs.
- **Dependencies:** None.
- **Risks:** Marketing pushback — frame as "make it true, then claim it."
- **Effort:** S–M. **Outcome:** Nothing in the product is a number you made up.

### 7. Security HIGHs Batch (rate limiter · SSRF · CSRF · admin hardening)
- **Leverage:** Closes the only exploitable-today issues before real users arrive.
- **Plan:** Swap to the existing distributed rate limiter (or Upstash); use `assertSafeUrl`+IP-pin in proof/webhook fetchers; apply CSRF to admin/billing mutations; move founder email to env + plan MFA; restrict enterprise role from ops endpoints.
- **Dependencies:** Upstash/Redis if chosen.
- **Risks:** Rate-limit false positives — tune thresholds.
- **Effort:** M. **Outcome:** Brute-force, SSRF, and phished-admin paths closed.

### 8. Funnel Completion (reset · email verify · mobile admin · toasts)
- **Leverage:** Fixes the leaks that make a working funnel feel broken.
- **Plan:** Build `/reset/[token]` page + flow; add email verification + password-confirm; add admin mobile drawer; replace `confirm()/alert()` with the design-system Modal; add review toasts; remove PIN fallback; logger redaction.
- **Dependencies:** Email reliability (Project 5).
- **Risks:** Low.
- **Effort:** L. **Outcome:** No dead-end flows; recoverable accounts; usable admin on mobile.

---

## TIER 2 — Focus & honest differentiation

### 9. Collapse to One Core Loop
- **Leverage:** The product becomes *understandable*, which fixes activation more than any UI tweak.
- **Plan:** Choose the campaign loop as the single primitive; merge the useful parts of Perk Programs into it; delete the rest from code + nav; rewrite the object model in copy ("campaign," "action," "perk" — one vocabulary). Do *before* Project 1 finalizes schema.
- **Dependencies:** Founder product decision.
- **Risks:** Cutting a loop a future customer wanted — validate with the design-partner cohort (Project 17).
- **Effort:** L. **Outcome:** One sentence describes the product; nav = what's shippable.

### 10. Real LLM Behind Campaign Strategy/Copy
- **Leverage:** Makes the brand promise true at the point of highest perceived value and lowest risk.
- **Plan:** Integrate Anthropic SDK; keep the rules engine as structured scaffolding; have the model write tailored strategy/copy; add prompt caching, structured output, logging, and a guardrail/fallback to templates; meter *this* (now honestly).
- **Dependencies:** Anthropic API key; Project 6 (relabeling).
- **Risks:** Cost/latency — cache aggressively; cap tokens.
- **Effort:** M–L. **Outcome:** "AI" is real exactly where users feel it; metering is defensible.

### 11. Real Verification for the Top Platform
- **Leverage:** Turns the core "did they actually do it?" check from theater into a moat.
- **Plan:** Pick the highest-volume platform; implement OAuth or platform-webhook verification of the action; compute real confidence; keep human-review fallback; measure precision/recall.
- **Dependencies:** Platform API access; OAuth scaffolding (exists).
- **Risks:** Platform API limits/policy — start with one, design for more.
- **Effort:** L. **Outcome:** Fraud can no longer pass on a client-sent string; verification is a selling point.

### 12. Activation Analytics & Funnel Dashboard
- **Leverage:** You can't improve what you can't see; unlocks every later growth decision.
- **Plan:** Instrument signup → launch → first claim → first approve in PostHog (already live); build a funnel dashboard; define the "aha" metric; set up cohort retention.
- **Dependencies:** PostHog (live).
- **Risks:** Event sprawl — define a minimal taxonomy first.
- **Effort:** M. **Outcome:** The real drop-off point is visible and ownable.

### 13. Accessibility & Polish Pass
- **Leverage:** Cheap credibility + inclusivity + SEO.
- **Plan:** Fix contrast tokens; focus traps; ARIA on tabs/modals; footer IA by audience; consistent empty/error patterns everywhere.
- **Dependencies:** None.
- **Risks:** Low.
- **Effort:** M. **Outcome:** Lighthouse a11y ≥ 90; product feels considered throughout.

### 14. CI/CD Hardening (e2e gate + branch protection)
- **Leverage:** Protects all the above from regressing.
- **Plan:** Add an e2e smoke job (signup→campaign→claim→approve); enforce branch protection on lint/typecheck/test/build/e2e; typecheck tests; fix the orphan Docker `deploy.yml`.
- **Dependencies:** Playwright (exists).
- **Risks:** Flaky e2e — keep the smoke set tiny and deterministic.
- **Effort:** M. **Outcome:** Red CI cannot ship; core flow regressions caught pre-merge.

### 15. Central Config & Persistence Convention
- **Leverage:** Removes the root cause of the durability gaps and the 502-on-missing-env class.
- **Plan:** Adopt `config.ts` as the single validated env loader (fail fast at boot); document one persistence pattern (repo + write-through + hydrate); refactor stragglers onto it.
- **Dependencies:** Project 3 (delete first so there's less to refactor).
- **Risks:** Low.
- **Effort:** M. **Outcome:** Missing env fails at boot, not mid-request; new features can't accidentally be in-memory.

### 16. Dogfooded, Durable Referral Loop
- **Leverage:** The company's own thesis as its growth engine — compounding and on-brand.
- **Plan:** Make referral codes/credits durable (part of Project 1); two-sided rewards; prominent in-product placement; attribution across deploys; tie into the perk wallet.
- **Dependencies:** Project 1.
- **Risks:** Abuse — reuse the fraud rules.
- **Effort:** M. **Outcome:** Referred signups attributed + rewarded; growth loop live.

### 17. Design-Partner Cohort Program
- **Leverage:** Real usage is the only way to validate the cuts and the loop.
- **Plan:** Recruit ~10 local SMBs (the coffee-shop wedge); white-glove onboard; watch the funnel dashboard; weekly feedback; fix what they hit.
- **Dependencies:** Projects 1, 8, 12.
- **Risks:** Building for outliers — look for patterns across the cohort.
- **Effort:** L (ongoing). **Outcome:** Evidence-based roadmap; first testimonials.

### 18. First Ecosystem Integration (Shopify *or* POS/Square)
- **Leverage:** Distribution + activation in one move; standalone tools don't scale.
- **Plan:** Pick by where the first 10 customers are; build the connect flow; auto-issue perks on a purchase/visit event; list in the partner's app store.
- **Dependencies:** Project 9 (stable model); Project 1 (durable perks).
- **Risks:** App-review timelines — start early.
- **Effort:** XL. **Outcome:** A merchant connects their store and perks flow automatically.

---

## TIER 3 — Strategic bets (after PMF signal)

### 19. Outcome/Commission Pricing Option
- **Leverage:** Blunts Stack Influence's "no SaaS fee, pay-per-post" threat; aligns price to value.
- **Plan:** Add a usage option (% of redeemed-perk value) alongside subscriptions; add a mid-market tier + trial.
- **Dependencies:** Durable ledger (Project 1); metering tied to value.
- **Risks:** Billing complexity — Stripe usage-based billing handles it.
- **Effort:** L. **Outcome:** Pricing matches more buyer types; competitive defense.

### 20. Vision-Based Submission Review (real LLM)
- **Leverage:** Replaces the verification stub with genuine UGC analysis; big trust win.
- **Plan:** Use a vision model to check screenshots/posts against requirements; confidence + human fallback; measure.
- **Dependencies:** Projects 10, 11.
- **Risks:** Cost + false negatives — keep human-in-the-loop.
- **Effort:** L. **Outcome:** Higher-quality verification at scale.

### 21. Influencer-Side Monetization (or formal descope)
- **Leverage:** Today the creator audience is pure cost. Decide deliberately.
- **Plan:** Either build creator monetization (take-rate on payouts, premium discovery) *or* descope influencer to a thin "claim perks" role and focus on businesses.
- **Dependencies:** Project 12 (data on creator value).
- **Risks:** Splitting focus — default to descope until businesses pay.
- **Effort:** L. **Outcome:** Every audience either earns or is intentionally minimal.

### 22. Programmatic SEO/LLM Discovery (re-activate, trimmed)
- **Leverage:** The content engine is well-built; once there's a product to convert traffic, it's cheap acquisition.
- **Plan:** Keep the best programmatic pages + `/llm-context` + OG; trim the rest; point all CTAs at the (now-fixed) funnel; measure conversion.
- **Dependencies:** Project 1 (CTA destination must convert).
- **Risks:** Thin-content penalties — keep quality high.
- **Effort:** M. **Outcome:** Compounding organic + LLM-referral traffic into a working funnel.

### 23. Verified Backups & Tested Restore
- **Leverage:** Replaces the DR stub with a real guarantee before you hold real customer data at scale.
- **Plan:** Confirm Supabase PITR tier; document + *rehearse* a restore; remove the simulation module.
- **Dependencies:** Supabase plan.
- **Risks:** Untested backups = no backups — actually run the restore.
- **Effort:** M. **Outcome:** A bad migration is recoverable; you can say "we have backups" truthfully.

### 24. Honest Benchmarks/Pricing-Oracle from Real Data
- **Leverage:** Turns today's fabricated constants into a genuine data asset (a reason to visit).
- **Plan:** Once the cohort generates data, compute real benchmarks; clearly label sample size; cache; keep estimates flagged until N is meaningful.
- **Dependencies:** Projects 12, 17 (data volume).
- **Risks:** Small-N noise — disclose.
- **Effort:** M. **Outcome:** "Market intelligence" becomes real and defensible.

### 25. Re-introduce Scale Infra *Only When Metrics Demand It*
- **Leverage:** Avoids re-accreting the sprawl you just deleted; reintroduce per real need.
- **Plan:** Maintain a "deferred capabilities" doc (multi-tenant, sharding, plugins, offline, exchange). Add each back *only* when a metric (tenant count, write volume, partner demand) crosses a written threshold.
- **Dependencies:** Real scale.
- **Risks:** Premature re-build — the threshold doc is the guardrail.
- **Effort:** ongoing. **Outcome:** Complexity is earned by usage, never speculative.

---

## ROI map (effort × impact)

| Impact ↓ / Effort → | S–M | L | XL |
|---|---|---|---|
| **Game-changing** | 2 Billing, 6 Anti-AI-wash, 4 Sentry | **1 Durable loop**, 9 One loop, 8 Funnel | 18 Integration |
| **High** | 3 Deletion, 5 Email, 7 Security, 12 Analytics | 10 LLM, 11 Verification, 16 Referral, 17 Cohort | 20 Vision review |
| **Medium** | 13 a11y, 14 CI, 15 Config | 19 Pricing, 21 Influencer, 22 SEO, 23 Backups, 24 Benchmarks | — |

**The single highest-leverage move:** Project **1 (Durable Value Loop)**. Everything else protects, monetizes, or amplifies a product that — until #1 ships — literally erases itself. Do 2, 3, 4, 6 alongside it; they're cheap and unblock the rest.
