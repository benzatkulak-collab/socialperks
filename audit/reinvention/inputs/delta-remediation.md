# Post-Remediation Delta Audit (June-2 findings vs. repo state on 2026-06-12)

Scope: verify the exact current status of the five defining findings from the 2026-06-02 audit after PRs #106–#109. Repo: `/Users/benzatkulak/Desktop/social-perks/.claude/worktrees/hardcore-meitner-9898b1`, branch `claude/hardcore-meitner-9898b1` (tracks main through a1dd716, PR #109).

Method: every claim cites file:line in the current tree or a specific commit. Prior audit claims were re-verified, not trusted.

## TL;DR status table

| June-2 finding | Status | Notes |
|---|---|---|
| 1. Value loop in-memory, deleted on cold start | **~70% FIXED**: perks/redemptions/payouts/referrals/programs durable in Postgres (migrations v6-v10 written, v5-v6 confirmed applied in prod via live readiness probe). **Campaigns + submissions STILL ephemeral** — their write-through targets the incompatible v1 UUID schema and fails silently; financial ledger still 100% in-memory | §1 |
| 2. AI-washing / fabricated metrics | **HONESTY FIXED, SUBSTANCE NOT**: ROI/benchmarks/earnings now labeled "illustrative estimates"; FTC claim re-verified TRUE. Still zero LLM in the dependency tree while pricing page sells "AI insights"/"AI campaign generations"; 0.82-0.9 heuristic verification confidence deferred (orphaned path) | §2 |
| 3. Sprawl (~40% deletable) | **SUBSTANTIALLY FIXED**: ~90K lines deleted in #108 (api/ backend, infrastructure/, exchange, sync, ml, analytics-engine, ideas.ts, API v2). 236K→146K TS LOC (-38%). But 96 API routes remain (vs ~104) — reachability sprawl not systematically addressed | §3 |
| 4. Billing one sprint from go-live | **CODE DONE, STILL CANNOT TAKE MONEY**: live prod probe (2026-06-13) shows `ready:false` — STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRICE_*, RESEND_API_KEY all missing. v5 billing tables ARE applied. Remaining work is purely Stripe/Vercel dashboard config | §4 |
| 5. Funnel/ops leaks | **MIXED**: CTA fixed; SSRF + IDOR + open-migrate closed; Sentry shipper added (DSN activation unverified). Password reset STILL 404s (no page exists) and no email of any kind can send in prod (resend missing); job queue still dead (direct-send workaround); admin/mobile untouched; NEW leak: silent persist failures on campaigns/submissions | §5 |

---

## 0. What merged since June 2 (commit evidence)

- `aafc622` PR #106 — Phase 0 revenue path (redemption 401, billing durability v5, pricing).
- `8efd1dc` PR #107 — idempotent prod migrations fix (`set_updated_at` guard).
- `df4a18c` PR #108 (2026-06-03) — the big one: audit reports committed; durable perk wallet (migration v6), durable payouts (v7), referral tables + durable ledger (v8); wallet API + UI; payout CSRF/IDOR fixes; dead-CTA fix; **94,539 lines deleted / 4,638 added across 237 files** (commit stat). Deletions include the entire `api/` second backend, `src/lib/infrastructure/`, `src/lib/exchange.ts` + all 5 exchange routes + exchange pages, `src/lib/sync*`, `src/lib/ml/`, `src/lib/analytics-engine.ts`, `src/lib/ideas.ts` (1,075 lines), `src/app/api/v2/*`.
- `a1dd716` PR #109 (2026-06-03) — trust/honesty (ROI labeled as estimates), security (logger PII redaction, `/migrate` Bearer-gated, SSRF DNS resolution in proof-URL checker), test hygiene.
- Nothing has merged after a1dd716 (git log; HEAD == #109).

## 1. Value loop durability (perk wallet / programs / redemptions / referrals / cashback / ledger)

**Verdict: ~70% fixed. Perks, redemptions, payouts, referrals, and perk programs are genuinely Postgres-durable (write-through + cold-start hydration). But the FRONT of the loop — launched campaigns and campaign submissions — is still ephemeral in prod: their "write-through" code targets the incompatible v1 UUID schema and fails silently on every write, with zero hydration callers. The financial ledger is still 100% in-memory.**

### 1a. Now durable (write-through cache + cold-start hydration + matching migration)

| Entity | Code | Migration/table | Hydration |
|---|---|---|---|
| Earned perks + redemptions | `src/lib/perk-wallet.ts:7-19` (header documents the pattern), Map declared as write-through cache at `perk-wallet.ts:31-38`, table const `PERK_TABLE = "perk_wallet_entries"` at `:38` | v6 `perk_wallet_entries` (`src/lib/db/migrations.ts:695-698`) | `hydrateWallets()` awaited by wallet routes |
| Wallet read/redeem API | `src/app/api/v1/wallet/route.ts` (42 lines), `src/app/api/v1/wallet/redeem/route.ts` (54 lines) — new in #108, with 126-line route test `src/app/api/v1/wallet/__tests__/wallet-routes.test.ts` | — | GET awaits hydrate so cold instance never returns empty wallet (per #108 commit msg, df4a18c) |
| Payout accounts + history (Stripe Connect) | `src/lib/payouts/index.ts` (+297 net lines in #108: persistAccount/persistRequest + hydratePayouts) | v7 `payout_accounts` (`migrations.ts:736`), `payout_requests` (`migrations.ts:746`) | hydratePayouts() awaited in payouts GET/POST + webhook routes (df4a18c msg) |
| Referral codes/attributions | tables match `src/lib/referrals/codes.ts` queries | v8 `referral_codes` (`migrations.ts:779`), `referral_attributions` (`migrations.ts:793`) — these tables were queried in prod but NEVER created before #108, so /referrals/* routes 500'd against Postgres (admitted in migration comment `migrations.ts:773-777`) | n/a (direct queries) |
| Referral ledger | `src/lib/referrals/index.ts` (+201 lines in #108) | v9 `referrals`, `business_referral_codes` (`migrations.ts:812-839`) | yes (durability test `src/lib/referrals/__tests__/referrals-durability.test.ts`) |
| Perk programs / members / program submissions / cash-back payouts | `src/lib/programs/store.ts:5-7` ("rows persist to Postgres (migration 010) and the cache is rehydrated on cold start via hydratePrograms()"); persistProgram/Member/Submission/Payout at `store.ts:211-266`; `hydratePrograms()` at `store.ts:276`, fired at module load `store.ts:311` and awaited in the programs routes | v10 `perk_programs`, `program_members`, `program_submissions`, `program_payouts` (`migrations.ts:853-902`) | yes |
| Auth users / sessions / billing subscriptions | pre-existing from #101/#102/#106: `auth_users` write path, v4 `sessions` (`migrations.ts:592`), v5 `business_subscriptions`/`monthly_usage`/`webhook_events` (`migrations.ts:630-660`) | — | yes (billing/store.ts pattern, which #108 explicitly mirrors) |

Durability is test-covered, not just claimed: `src/lib/__tests__/perk-wallet-durability.test.ts` (116 lines), `src/lib/payouts/__tests__/payouts-durability.test.ts`, `src/lib/programs/__tests__/programs-durability.test.ts`, `src/lib/referrals/__tests__/referrals-durability.test.ts` — all simulate a cold start. The in-memory connection exercises the same persist code path (per `perk-wallet.ts:11-13`), so it is not mocked out.

### 1b. STILL BROKEN: launched campaigns and campaign submissions are not durable in prod

This is the sharpest remaining hole, and it is masked by code that *looks* durable:

- **Campaigns**: `src/app/api/v1/campaigns/route.ts:288` fire-and-forgets `void persistLifecycle(lifecycle, ...)`. But `persistLifecycle` (`src/lib/campaign-state-machine/persist.ts:23-60`) INSERTs columns `state, budget_allocated, budget_type, completions, launched_at, transitions` into `launched_campaigns` — and the only schema for that table (migration v1, `migrations.ts:191-213`) has NONE of those columns and declares `id UUID PRIMARY KEY` + `business_id UUID REFERENCES businesses(id)`. Campaign ids are text — `` `camp_${crypto.randomUUID()}` `` (`campaigns/route.ts:236`) — and business ids are `biz_...`. **Every prod insert fails (bad column + uuid cast + FK), the catch swallows it (`persist.ts:56-59` "Don't throw"), and nothing alerts.** No migration ALTERs this table (only ALTER in migrations.ts is `influencers` at `migrations.ts:142`).
- **No hydration either**: `loadLifecyclesForBusiness` / `rehydrateCampaign` have ZERO callers outside `persist.ts` (repo-wide grep). Even if writes worked, nothing reads them back on cold start.
- **Campaign submissions (the customer's proof)**: `src/lib/submissions.ts:8-9` says "in-memory Map (canonical) + DB write-through"; `src/lib/submissions.ts:300` calls `void persistSubmission(...)`, which INSERTs `perk_awarded`, `metadata` etc. into v1 `campaign_submissions` (`migrations.ts:224-240`) — a table with UUID PK/FKs and no `perk_awarded`/`metadata` columns. Same silent failure (`persist.ts:60-62` catches to console.error). And `submissions/persist.ts` contains no SELECT/hydrate at all — grep for hydrate across `src/lib/submissions*` returns nothing.
- **Consequence**: a business launches a campaign, a customer submits proof → next cold start (minutes on Vercel), **the campaign and the pending submission both vanish**. The perk only becomes durable *after* approval (review route persists the award, df4a18c). The #108 work fixed stages 3-6 of the loop (perk→redeem→payout→referral) but stages 1-2 (campaign→submission) still have the exact bug pattern the June-2 audit flagged — made worse by the fact that it now *looks* fixed.
- This is precisely the incompatibility #108's own migration comment identified for perks ("v1's earned_perks is UUID+FK and incompatible with real biz_usr_/perk_ ids" — df4a18c commit msg) — the same reasoning was never applied to `launched_campaigns`/`campaign_submissions`.

### 1c. Financial ledger: still 100% in-memory

`src/lib/financial-ledger.ts:9`: "Storage: in-memory Maps (ready for Postgres + Prisma migration)"; `private accounts: Map<string, Account>` at `financial-ledger.ts:98`. No persist/hydrate/db import anywhere in the file. Every "double-entry bookkeeping" entry evaporates on cold start. Since perk awards/redemptions call `ledger` (`perk-wallet.ts:24`), the platform's books are decorative.

### 1d. Are the new migrations applied in PROD?

The repo cannot answer this; it can only show the mechanism. `POST /api/v1/migrate` exists and (post-#109) requires `ALLOW_MIGRATIONS=true` + constant-time Bearer `MIGRATION_SECRET` in production, fail-closed when unset (`src/app/api/v1/migrate/route.ts`, changed in a1dd716). Memory/prior context says prod had migrations 1-4 applied and v5 PENDING as of June 2; #108's commit messages repeatedly say "PROD: run POST /api/v1/migrate to apply v5+v6 / v7 / v8". **Unless someone ran the migrate endpoint after deploying #108/#109, prod is missing v5-v10 and ALL of §1a is durable only in code, not in the live database.** The live health/readiness probe checks `perk_wallet_entries` (`src/app/api/v1/health/readiness/route.ts`, modified in #108) — hitting `/api/v1/health/readiness` on prod would answer this definitively in one request.

## 2. AI-washing / fabricated metrics

**Verdict: the *dishonesty* is mostly fixed; the *absence of AI* is not. Numbers users see are now labeled as illustrative estimates, but the product still sells "AI" tiers with zero LLM anywhere in the dependency tree.**

Fixed in #108/#109:
- **ROI projections labeled**: `projectedResults` now carries `isEstimate: true` + `basis` (`src/lib/ai-agent/recommendation-builder.ts:100-101`, type at `src/lib/ai-agent/types.ts:57-58` with the honest comment at `:48`). The marketing-plan summary now reads "Estimated ROI (illustrative — based on category assumptions, not your historical data): ~Nx" (`src/lib/ai-agent/agent.ts:60`).
- **Benchmarks labeled**: `Benchmark` gained `basis: "estimate"` + a disclaimer string — "Illustrative category estimates, not measured industry data. Pre-launch defaults…" (`src/lib/ai-engine.ts:639-641` and `:687-691`, added in a1dd716).
- **Fake influencer earnings reframed**: public profile now shows "Earning potential / illustrative estimate" instead of presenting seed-data dollars as money earned (`src/app/i/[slug]/page.tsx:140-145`, changed in df4a18c).
- **FTC claim re-verified as TRUE** (June-2 audit was wrong on this one): `src/app/api/v1/campaigns/route.ts:239-270` runs `pluginManager.executeHook("campaign.beforeLaunch")`, which injects disclosures and blocks non-compliant launches with a 422 (`:269-270`). #109's commit message explicitly corrects the earlier "validate-only" audit note.

NOT fixed:
- **Still no LLM anywhere**: `package.json` has zero matches for anthropic/openai/@ai-sdk/langchain (grep, this session). `src/lib/ai-engine.ts:1-8` remains "trait detection, business size awareness, seasonal relevance" — templates and lookup tables.
- **"AI" still sold on the pricing page**: "Advanced analytics + AI insights" (`src/components/landing/pricing-section.tsx:124` and `:497`), "AI campaign generations: 3/mo–Unlimited" as a paid tier differentiator (`pricing-section.tsx:494`), FAQ copy "Pro … adds AI insights" (`pricing-section.tsx:620`), OpenAPI tag "AI-powered campaign generation" (`src/app/api/v1/openapi/route.ts:47`). Customers would be paying for "AI" that is a rules engine.
- **Verification confidence theater still present but quarantined**: `src/lib/verification-engine.ts:146-182` still assigns 0.82–0.9 confidence from URL-substring matches and 0.55 for screenshots ("realistic confidence scores", `:7`). #109 explicitly DEFERRED this, noting it only feeds `/api/v1/ai/review` — and grep confirms `verification-engine` is imported only by `src/app/api/v1/ai/review/route.ts`, `src/lib/glossary-data.ts`, and `src/lib/verification/job-queue.ts`, with no UI/client references to `ai/review` — i.e., it is NOT on the live approval path. The fixed-0.95 stub the June-2 audit described is not what's in the file today (it is 0.82–0.9 heuristics), but the substance — verification "confidence" not backed by real verification — stands.

## 3. Sprawl

**Verdict: substantially fixed — the single biggest delta. PR #108 deleted ~90K lines (94,539 deletions / 4,638 insertions across 237 files, `git show df4a18c --stat`).**

Confirmed deleted (checked in working tree this session):
- `api/` second backend — **directory gone** (deleted files include `api/src/routes/*` per df4a18c stat).
- `src/lib/infrastructure/` — **gone** (api-gateway, disaster-recovery 1,168 LOC, edge 1,123, i18n 1,193, media 1,158, ml-pipeline 1,288, observability 1,076, search 949, sharding 1,114, soc2 1,424 — all in df4a18c stat).
- Exchange order book — **gone**: `src/lib/exchange.ts` (1,312 LOC), all 5 `/api/v1/exchange/*` routes, `/exchange` page, `/admin/exchange` page.
- Also deleted: `src/lib/sync-engine.ts` (814) + `src/lib/sync/` (1,513), `src/lib/ml/` (embedding-system 1,146 + fraud-pipeline 1,636), `src/lib/analytics-engine.ts` (772), `src/lib/ideas.ts` (1,075), API v2 (`src/app/api/v2/*`) and versioning layer.

Numbers today vs June 2:
- TS/TSX LOC: **146,447 now** (`git ls-files '*.ts' '*.tsx' | xargs wc -l`) vs ~236K pre-#108 — a ~38% cut, almost exactly the audit's "~40% deletable" estimate.
- TS/TSX files: **571 now** vs 744 before #108 (`git ls-tree -r df4a18c^`).
- API route files: **96 `route.ts` under `src/app/api`** now (find, this session) vs ~104 on June 2. Only net ~8 fewer routes: exchange (5) and v2 (4) went, wallet (+2) arrived. **The "84% of routes unreachable from UI" finding was NOT systematically addressed** — 96 routes is still an enormous surface for a pre-launch SMB product (admin hub, agents/MCP surface, SEO data routes, etc. remain).
- Residual speculative code still in-tree: `src/lib/graph-engine.ts`, `src/lib/embedding-engine.ts`, `src/lib/plugin-system.ts`, `src/lib/matching-engine.ts`, `src/lib/fraud-detection.ts`, the 60+ programmatic-SEO page trees (`/for/[industry]/on/[platform]`, `/in/[city]/[industry]`, `/best`, `/compare`, `/answers`…) — see page list via `git ls-files 'src/app/**/page.tsx'`.

## 4. Billing go-live

**Verdict: code is done; the company still cannot take a dollar. Every remaining blocker is a Vercel dashboard/Stripe dashboard task, not engineering. Verified LIVE against prod on 2026-06-13.**

Live readiness probe (`curl https://socialperks.app/api/v1/health/readiness`, this session): `ready: false`, 8 ok / 4 missing / 3 warnings:
- `stripe`: **missing** → `STRIPE_SECRET_KEY` not set on Vercel.
- `stripe_webhook_secret`: **missing** → webhook handler can't verify events.
- `stripe_prices`: **missing** → no `STRIPE_PRICE_*_MONTHLY` configured; per the probe's own copy, "every checkout returns 503" (`src/app/api/v1/health/readiness/route.ts:110-118`).
- `resend`: **missing** → `RESEND_API_KEY` unset; "email falls back to console provider; reset-password will 503 in prod" (`readiness/route.ts:63-66`).
- `billing_tables`: **ok** → migration **v5 IS applied in prod** (probe checks `business_subscriptions`/`monthly_usage` via `to_regclass`, `readiness/route.ts:135`).
- `perk_tables`: **ok** → `perk_wallet_entries` exists in prod, so **v6 is applied**; since the runner applies pending migrations in order and v6–v10 all shipped in #108, v7–v10 are almost certainly applied too (the probe only checks `perk_wallet_entries`, `readiness/route.ts:135-144`, so v7–v10 are inferred, not directly probed).
- Warnings: `waitlist_notify`, `oauth_instagram`, `oauth_tiktok` (social OAuth verification unconfigured).

Exact remaining to take money: (1) create Stripe products/prices; (2) set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and `STRIPE_PRICE_STARTER_MONTHLY` / `STRIPE_PRICE_PROFESSIONAL_MONTHLY` / `STRIPE_PRICE_ENTERPRISE_MONTHLY` (+ `_ANNUAL` variants) on Vercel (`src/lib/billing/store.ts:25-42`); (3) register the Stripe webhook endpoint; (4) set `RESEND_API_KEY` so receipts/lifecycle emails actually send. Footgun to note: a second, parallel price-env family (`STRIPE_PRICE_FREE/STARTER/PRO/ENTERPRISE`) lives in `src/lib/stripe.ts:44-62` and `src/lib/config.ts`, while checkout uses the `_MONTHLY/_ANNUAL` family from `billing/store.ts` (imported by `src/app/api/v1/billing/route.ts:27`) — easy to configure the wrong set.

## 5. Funnel/ops leaks

| June-2 leak | Status today | Evidence |
|---|---|---|
| Dead "Get Started" CTA | **FIXED** (#108) | `src/components/shared/nav.tsx:152` and `:278` — `href="/dashboard#signup"` (was inert `#signup` on static pages, per df4a18c msg) |
| Password reset → nonexistent page | **STILL BROKEN, triply** | (a) `git ls-files | grep -i reset` → zero files; no `/reset-password` page exists, yet the auth route emails `${siteUrl}/reset-password?token=` (`src/app/api/v1/auth/route.ts:538`) → guaranteed 404. (b) Reset tokens live in a module-level Map (`auth/route.ts:40`) → lost on cold start anyway. (c) `RESEND_API_KEY` missing in prod → the email never actually sends (console provider fallback, `src/lib/email/index.ts:326-330`; readiness says reset "will 503 in prod") |
| Admin unusable on mobile | **UNTOUCHED** | `git log df4a18c..HEAD -- src/app/admin src/components/admin` → empty; no admin change since #108, and #108 only deleted the exchange admin page |
| No Sentry / error tracking | **CODE FIXED, ACTIVATION UNKNOWN** | #108 added `src/lib/monitoring/index.ts` (155 lines): dependency-free Sentry envelope shipper, gated on `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN` (`monitoring/index.ts:7-16,92-101`), wired into `global-error.tsx`/`error.tsx` and all the new persist paths (`captureError` imported in `perk-wallet.ts:26`, `programs/store.ts` etc.). The readiness probe does NOT check SENTRY_DSN, so whether prod has a DSN set is unverified — if not, errors (including the silent persist failures in §1b) still go nowhere |
| Dead job-queue worker → lifecycle emails dropped | **WORKED AROUND, not fixed** | Emails now direct-send, explicitly bypassing the dead queue: "Direct send — the job queue worker (startAllQueues) is never started in serverless" (`src/app/api/v1/billing/webhook/route.ts:195`, same note at `src/app/api/v1/auth/route.ts:277`). `startAllQueues` still exists with no production caller (`src/lib/jobs/registry.ts:281`). **But with `resend: missing` in prod, every email — welcome, lifecycle, dunning, reset — is still silently dropped to console today** |
| Silent durability failures (new, post-remediation) | **NEW LEAK** | The campaign/submission persist paths in §1b fail on every prod write and only `console.error` (`src/lib/campaign-state-machine/persist.ts:56-59`, `src/lib/submissions/persist.ts:60-62`); without a Sentry DSN nobody will ever see it |

Also fixed in #109 (security, not funnel): live proof-URL SSRF now DNS-resolves and re-checks every IP (`src/lib/verification/url-checker.ts`, a1dd716); logger redacts secrets by key name (`src/lib/logging/index.ts`); `/api/v1/migrate` requires constant-time Bearer `MIGRATION_SECRET` in prod, fail-closed (`src/app/api/v1/migrate/route.ts`, changed in a1dd716 — it had been an unauthenticated DDL trigger when `ALLOW_MIGRATIONS=true`).

## 6. Other material changes since June 2 / open observations

- **Nothing merged after #109** — `git log --oneline`: HEAD is a1dd716 (2026-06-03). The nine days since have produced no further remediation; this branch (`claude/hardcore-meitner-9898b1`) only adds `audit/reinvention/` research docs (untracked).
- **#107** (`8efd1dc`) made prod migrations idempotent (guarded `set_updated_at` trigger creation) — that unblocked applying v5+ to prod, which evidently happened (§4).
- **Wallet vertical is the first end-to-end durable + tested slice**: durable storage → `GET /api/v1/wallet` + `POST /api/v1/wallet/redeem` → "Redeemable Perks" section in the influencer PerkWallet UI (`src/components/influencer/perk-wallet.tsx`, +135 lines in #108), with the repo's first route-handler tests (`src/app/api/v1/wallet/__tests__/wallet-routes.test.ts`, 126 lines).
- **Payout IDOR closed** (#108): `/api/v1/payouts` GET/POST previously took `influencerId` from the client (`?? user.id`), letting any authenticated user read/act on another creator's payout account; identity now derived from session only (df4a18c msg; `src/app/api/v1/payouts/route.ts` modified).
- **Payout CSRF bug closed** (#108): "Set Up Payouts" / "Request Cash Out" were silently 403ing (plain fetch, no X-CSRF-Token); now use the CSRF-aware helper (df4a18c msg).
- **Test suite**: ~2,030 passing per #109 commit msg (vitest now excludes `.claude` scratch worktrees, a1dd716 `vitest.config.ts`); 4 new durability test files prove cold-start survival for perks/payouts/referrals/programs.
- Known flaky: `payments.test` under full run (shared in-memory ledger) — pre-existing, noted in a1dd716.

## 7. Bottom line for the reinvention decision

1. **Remediation was real, fast, and honest** — ~90K LOC deleted, the back half of the value loop made durable with tests, security holes (IDOR, SSRF, open DDL endpoint) closed, fabricated numbers labeled. Two days of work (June 3) addressed roughly 3 of 5 headline findings.
2. **The core loop is still not safe end-to-end**: campaigns and customer proof submissions remain cold-start-ephemeral behind silently-failing write-through code (§1b) — the most dangerous kind of bug, because it looks fixed and tests pass (in-memory connection accepts what Postgres rejects). The financial ledger is decorative (§1c).
3. **Revenue remains blocked by ~an afternoon of dashboard config** (Stripe keys/prices/webhook + Resend on Vercel), unchanged since June 2 — the constraint is operator follow-through, not code (§4).
4. **The funnel still leaks at the same three points a paying user would hit**: password reset 404s (and its email never sends), no email of any kind actually leaves prod (`resend: missing`), and "AI" tiers are still sold without any AI (§2, §5).
5. Momentum stopped on June 3. Whatever the reinvention decision is, the two highest-leverage hours available are: (a) wire the 6 missing env vars, (b) port the §1b persist paths to the proven flat-TEXT-table pattern that #108 already established for perks.
