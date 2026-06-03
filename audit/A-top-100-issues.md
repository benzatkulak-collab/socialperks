# Report A — Top 100 Issues
*Globally ranked by (severity × user/revenue impact × urgency). Every item traced to file:line. Legend — Sev: 🔴 Critical / 🟠 High / 🟡 Medium / ⚪ Low. Effort: S(<½ day) / M(½–3 days) / L(>3 days).*

> Verified at audit time: `npm run build` ✅ passes · `npm test` ✅ 2,483 tests green · the green suite masks the data-loss issues below because tests assert in-memory behavior.

---

## 🔴 CRITICAL (1–13) — block real users / charging money

| # | Issue | Domain | Impact | Evidence | Fix | Eff |
|---|---|---|---|---|---|---|
| 1 | **Perk wallet / earned perks / redemptions have zero DB persistence** | Reliability | The reward ledger the product *is about* is wiped on every cold start & not shared across instances | `perk-wallet.ts:17,249` (0 db refs in file) | Build `perks`/`redemptions` tables + repo; write-through + hydrate | L |
| 2 | **Perk programs / members / cash-back payouts are in-memory AND have no schema table** | Reliability/Revenue | Entire loyalty product + customer payouts volatile; can't even migrate as-is | `programs/store.ts:77-80`; `perk_programs` absent from `db/schema.ts` | Add tables + repo; migrate store | L |
| 3 | **Financial ledger (double-entry) is in-memory** | Reliability/Revenue | Books reset on deploy; money math unauditable | `financial-ledger.ts:8,98` | Persist or remove until needed | M |
| 4 | **"AI" is metered & billed but is template-fill (no LLM anywhere)** | AI/Legal | Charging for "AI" with no model = false-advertising exposure | `_enforce-ai-limit.ts` gates `ai-engine.ts:233`; no LLM SDK in any package.json | Wire a real LLM behind it OR relabel + stop metering | M |
| 5 | **Fabricated ROI/reach/CPA shown to businesses as projections** | AI/Trust | Customers make spend decisions on invented constants | `recommendation-builder.ts:74` (`reach×0.012`); `agent.ts:60` "Expected ROI: Nx" | Use measured data or label "rough estimate" | M |
| 6 | **Verification engine returns 0.95 confidence with no API call** | AI/Fraud | Core "did they do the action?" check is theater; fraud passes on a client-sent string | `verification-engine.ts:144,189` (fake `simulateLatency`) | Real OAuth/webhook verification or remove the confidence claim | L |
| 7 | **Cannot take money: Stripe price IDs unset → checkout 503s** | Revenue | Nobody can buy | `billing/route.ts:113-119`; `.env.example` | Create prices, set `STRIPE_PRICE_*` | S |
| 8 | **Stripe secret/webhook keys + billing migration (v5) not applied in prod** | Revenue | No sellable billing; subs revert to free on cold start | `stripe.ts:12`; `migrations.ts:629` | Set keys on Vercel; run migration | S |
| 9 | **Migration runbook is false; hand-written migrations never run** | Reliability | Founder believes billing tables/migrations are applied when they may not be | `setup-stripe-billing.sh:35-38` (claims Bearer `MIGRATION_SECRET`, "v1..v5") vs `migrate/route.ts:19-43` (reads neither); `ensureDatabase()` 0 callers | Fix runbook + make migrate authoritative & idempotent | M |
| 10 | **63K-LOC abandoned `api/` backend still in repo** | Architecture | Doubles maintenance + security surface; security fixes must be done twice | `.vercelignore:/api/`; not in Dockerfile/tsconfig; 50/53 files dup `src/lib` | Delete `api/` | M |
| 11 | **Landing-page primary CTA "Get Started" is dead** | UX/Growth | Top-of-funnel button does nothing on static `/` | `shared/nav.tsx:152,277` (`href="#signup"`, no listener mounted) vs `components/app.tsx:274` | Point to `/dashboard#signup` | S |
| 12 | **Dead job-queue worker → engagement + dunning emails silently dropped** | Reliability/Revenue | "First customer post" email + all agent outreach/billing-recovery emails never send | `jobs/queue.ts:192` (`startAllQueues()` 0 callers, `setInterval` dead on serverless); `submissions/route.ts:273` | Direct-send or cron-drain the queue | M |
| 13 | **No error tracking / alerting anywhere (no Sentry)** | Reliability | Prod errors invisible; swallowed DB-write failures never surface; no paging | only `console.error` + in-memory `alerts.ts` | Add Sentry + alert on write failures | M |

---

## 🟠 HIGH (14–46)

| # | Issue | Domain | Impact | Evidence | Fix | Eff |
|---|---|---|---|---|---|---|
| 14 | In-memory rate limiter is per-instance → bypassable on serverless | Security | "strict 5/min" on login/reset/key-mint never aggregates; brute-force viable | `security/rate-limiter.ts:20` used via `_shared.ts:262`; durable limiter exists but 0 imports | Use the distributed limiter (or Upstash) | M |
| 15 | SSRF in proof-URL verifier (DNS not resolved) | Security | Authed user submits proofUrl → server fetches `169.254.169.254`/localhost, stores response as oracle | `submissions/route.ts:200`→`url-checker.ts:203,221`; `assertSafeUrl` exists, unused | Resolve DNS + IP-pin; use `assertSafeUrl` | S/M |
| 15.5 | Referral codes in-memory → shared `/ref/CODE` links rot on deploy | Growth | Flagship growth loop leaks; referrers uncredited | `referrals/index.ts:33-87` | Persist referral codes/credits | M |
| 16 | Campaign **list** views read Map only, never `launched_campaigns` | Reliability | After cold start, business redemption dashboard + founder overview under-report to ~0 despite rows in PG | `campaign-state-machine.ts listByBusiness`; `businesses/redemptions:40`; `founder-overview:77,157` | Read-back from DB | M |
| 17 | Influencer payout accounts/history in-memory; no table; no `STRIPE_CONNECT` env | Revenue | Lose influencer→Connect mapping + payout history on restart | `payouts/index.ts:36-37` | Persist payout accounts | M |
| 18 | Drip "sent" state in-memory → cold start re-blasts day-1/3/7/14 at once | Growth/Deliverability | Spam complaints / Resend reputation damage pre-launch | `drip.ts:264,321-332` | Persist drip state; idempotent send | M |
| 19 | Weekly digest (only recurring retention email) has no cron | Growth/Retention | The one stickiness loop never fires → churn | absent from `vercel.json`; `digest/route.ts` exists | Add cron | S |
| 20 | `infrastructure/*` (SOC2, sharding, DR, edge, observability, ml-pipeline) — ~14.7K LOC, 0 importers | Architecture | Dead weight; slows build/audit; inflates "enterprise" claims | 0-importer grep across all 9 files | Delete | S |
| 21 | Exchange (engine + 5 routes + page) is dead, in-memory, unlinked | Product | "Flagship 10-yr feature" serves nobody; routes don't even import `exchange.ts` | `exchange.ts` 0 importers; `/exchange` not in nav | Delete | S |
| 22 | Three competing core loops (campaigns / programs / exchange) | Product | No coherent mental model for an SMB owner | `app.tsx` uses ~17/104 routes; programs + exchange parallel | Cut programs+exchange or merge into campaigns | M |
| 23 | ~84% of API routes unreachable from the UI | Product | Maintenance + cognitive load, zero user value | route-vs-import audit | Cut/defer per inventory | L |
| 24 | Disaster recovery is a stub; backups unverified | Reliability | No code-level backup/restore; a bad migration may be unrecoverable | `infrastructure/disaster-recovery.ts` (types + sim) | Verify Supabase PITR tier; document restore | S→L |
| 25 | Tests assert volatile in-memory behavior for data-loss modules | Reliability | False "redemption works" green masks #1/#2 | `__tests__/perk-wallet`, `perk-programs`, `cashback` | Test against the DB-backed path | M |
| 26 | CSRF on only ~23/47 mutating routes (admin unprotected) | Security | Phished admin can suspend accounts / change roles / impersonate | `_shared.ts:204` | Apply CSRF to all cookie-auth mutations | S |
| 27 | Password reset leads to a non-existent page | UX | Locked-out users genuinely can't recover | `auth/auth-form.tsx:472`; no `/reset/[token]` page | Build the token page | M |
| 28 | Admin console has no mobile nav (sidebar `hidden lg:flex`) | UX | Admin unusable <1024px | `admin/admin-sidebar.tsx:12`; topbar has no hamburger | Add drawer toggle | M |
| 29 | Influencer side has no plan / take-rate | Revenue | Creator audience is pure cost, zero revenue | `pricing-section.tsx` all business-side | Add creator monetization or descope | M |
| 30 | WCAG AA contrast failures site-wide (`brand-muted` ~3.4:1, `brand-subtle` ~1.9:1) | UX/a11y | Low-vision users can't read captions/labels/footer | `globals.css:132-134` | Lighten tokens | S |
| 31 | "AI campaign agent" returns hardcoded object literals | AI/Trust | Brand promise unbacked | `ai-engine.ts` literals; no model call | Wire LLM or relabel | M |
| 32 | AI review pipeline (fraud/verify/compliance) orphaned from live approve path | AI/Fraud | False sense of fraud protection; real approve uses toy `quickScore` | `submission-reviewer:49`; live path ≠ `/ai/review` | Wire `checkSubmission` into approve | M |
| 33 | Pricing/benchmarks public endpoints return hardcoded "simulated" constants | AI/Trust | Presents fiction as market intelligence | `ai-engine.ts:591,650` | Relabel as estimates or compute real | M |
| 34 | Root-engine vs subdir duplication (sync both dead; graph 3 impls; embedding/compliance subdir copies dead) | Architecture | 2–3 impls per concept, no source of truth, will drift | Finding 4 table in `architecture.md` | Delete dead twins | M |
| 35 | CSP allows `script-src 'unsafe-inline'` in prod | Security | Any future XSS is fully weaponizable | `next.config.js:49-57` | Nonce-based CSP | M |
| 36 | Speculative scale infra (event-sourcing, CRDT, multi-tenant 1580, sharding 1114) for 0 users | Architecture | Huge sunk effort now slows iteration + hides bugs | per-module 0–6 importers | Delete/defer | L |
| 37 | API v2 (4 routes) — frontend runs v1; `versioning.ts` calls v1 "deprecated" | Architecture | Self-contradictory ghost API | `src/app/api/v2/*` 0 frontend callers | Delete v2 | S |
| 38 | e2e Playwright tests exist but don't run in CI | Reliability | Real user-flow regressions not enforced | `ci.yml` has no `test:e2e` job; `e2e/*.spec.ts` real | Add e2e job (smoke subset) | S |
| 39 | Founder admin email hardcoded | Security | Known highest-priv account for password-spray; with #14 it's unthrottled | `auth/user-store.ts:150` | Move to env; enforce MFA | S |
| 40 | Logger has no secret/PII redaction | Security | One careless `logger.info({body})` leaks creds to Vercel logs | `logging/index.ts:70-82` | Add redaction allow/deny list | S |
| 41 | ML fraud model trains on synthetic data from its own rules (circular) | AI | "ML-powered fraud" unsupported; AUC meaningless | `fraud-training.ts:102` | Drop ML framing; keep rules | M |
| 42 | Onboarding wizard modal doesn't trap/restore focus | UX/a11y | Keyboard/AT users tab behind the first-run modal | `business/onboarding-wizard.tsx:367` vs `ui/modal.tsx` | Reuse modal trap | M |
| 43 | No multi-audience entry in nav; two divergent landing pages | UX | 3-audience promise isn't navigable; inconsistent first impression | `app/page.tsx` vs `components/app.tsx:133` | One landing + audience nav | M |
| 44 | `ideas.ts` (177KB) and other dead data blobs (0 importers) | Architecture | Pure deletable weight | `ideas.ts` 0 importers | Delete | S |
| 45 | Migrate route guarded only by `ALLOW_MIGRATIONS` env flag, no token | Security | Unauthenticated DDL endpoint while flag is on | `migrate/route.ts:21-43` | Require Bearer secret | S |
| 46 | Public profile shows fabricated "~$4,800" earnings as real | UX/Trust | Reads as invented | `i/[slug]/page.tsx:31` | Hide $ until real ledger | S |

---

## 🟡 MEDIUM (47–80)

| # | Issue | Domain | Evidence | Fix | Eff |
|---|---|---|---|---|---|
| 47 | Billing durability depends on an unapplied migration; readiness catches it but it's manual | Reliability | `readiness/route.ts:126-145` | Automate migration on deploy | S |
| 48 | Webhook doesn't re-validate `metadata.plan` | Revenue | `webhook/route.ts:148` | Validate slug → free limits for a payer | S |
| 49 | Submissions write-through has no hydration read-back | Reliability | `submissions.ts`/`persist.ts` | Read lists from DB | M |
| 50 | Readiness probe omits campaign/perk tables | Reliability | `readiness/route.ts:126-145` | Probe all critical tables | S |
| 51 | Deploy is Vercel git-integration, not CI-gated; `deploy.yml` builds orphan Docker image | Reliability | `ci.yml`/`deploy.yml` | Enforce branch protection on checks | S |
| 52 | `lib/config.ts` has 0 importers; `process.env` read directly in 92 files | Architecture | `config.ts` (119 LOC) | Central validated config at boot | M |
| 53 | tsconfig excludes tests from typecheck (+ `api/`) | Architecture | `tsconfig.json` | Typecheck tests in CI | S |
| 54 | `exchange.ts` (1312 LOC) dead; 5 routes reimplement order/trade inline | Architecture | `exchange/*` | Delete | S |
| 55 | Three inconsistent persistence patterns (repo vs feature store vs inline Map) | Architecture | repos vs `store.ts` vs route Maps | Standardize on repo pattern | M |
| 56 | `billing/store.ts` subscriptions Map with "wire it up & migrate" TODO | Revenue | `billing/store.ts:96` | Finish durability | M |
| 57 | Value metric (campaigns/completions) decoupled from value delivered | Revenue | pricing logic | Re-tie metering to value | M |
| 58 | No mid-market tier between $49 and Custom | Revenue | `pricing-section.tsx` | Add a tier | S |
| 59 | No paid-tier trial (Free↔paid only) | Revenue | pricing flow | Add trial | S |
| 60 | Login silently retries password as deprecated PIN | UX | `auth/auth-form.tsx:139-154` | Remove PIN fallback | S |
| 61 | Business Type is free text → dirty data for matching/templates | UX/AI | `auth/auth-form.tsx:631` | Select/typeahead | S |
| 62 | Dead "Add Location" button (enterprise) | UX | `enterprise/portal.tsx:193` | Wire or hide | S |
| 63 | Admin submission review fails silently (no toast) | UX | `admin/page.tsx:670` | Add feedback | S |
| 64 | Native `confirm()`/`alert()` in 6+ files | UX | portal-home, billing/api-keys, 4 admin pages | Use Modal | M |
| 65 | No email verification / no password-confirm at signup | UX | `auth/auth-form.tsx:622-635` | Add confirm + verification | M |
| 66 | Influencer has no guided first-run; empty profile not prompted | UX/Growth | `influencer/portal.tsx:424` | Profile-completion wizard | M |
| 67 | `submission-reviewer` autonomous agent uses toy `quickScore` not the real fraud engine | AI | `submission-reviewer:49` | Wire to `checkSubmission` | M |
| 68 | Dead ML/embedding code ~4K LOC (`ml/embedding-system.ts` 1146, `ml/fraud-pipeline.ts` 1636) imported only by tests | AI/Arch | 0 non-test importers | Delete | S |
| 69 | Two parallel hash-based "embedding" impls; only one wired, both misnamed | AI | `embedding-engine.ts` vs `embedding-system.ts` | Delete dead; rename "vector match" | S |
| 70 | FTC "auto-injected, cannot be disabled" claim false (code only validates) | AI/Legal | `compliance-engine.ts:620,676` | Actually inject or fix docs | M |
| 71 | Enterprise role can trigger chaos/ops + read job queues | Security | `reliability/route.ts:117`, `jobs/route.ts:32` | Restrict to staff role | S |
| 72 | In-memory reset tokens + OAuth-state (per-instance) | Security | `auth/route.ts:40`, `csrf.ts:64` | Persist tokens | M |
| 73 | Webhook URL registration uses sync `isSafeUrl` (SSRF at delivery) | Security | `webhooks/route.ts:41` | Use `assertSafeUrl` | S |
| 74 | Agent scheduler state in-memory | Reliability | `agents/registry.ts:21-22,162` | Persist or accept ephemeral | M |
| 75 | Programmatic SEO/LLM surface (6K LOC) premature for 0 traffic | Product | data files + `/llm-context` etc. | Defer/trim expansion | — |
| 76 | `matching-engine.ts` (23KB) mostly unused (only `getNicheAffinity`) | AI/Arch | `matching-engine.ts` | Remove unused exports | S |
| 77 | `cron/agents` ticks daily against volatile state | AI/Reliability | `vercel.json` crons[3]; `agents/route.ts:7` | Disable until durable | S |
| 78 | Portal "tabs" lack `tablist`/`tab` ARIA | UX/a11y | `business/portal.tsx:554` | Add roles | S |
| 79 | Stale nested worktree under `src/.claude/worktrees/` pollutes greps, may ship | Reliability/Arch | nested dir | Delete | S |
| 80 | happy-dom `AbortError` during test teardown (real fetches aborted) | Reliability | test output | Mock fetch in unit tests | S |

---

## ⚪ LOW (81–100)

| # | Issue | Domain | Evidence | Fix |
|---|---|---|---|---|
| 81 | Footer is a flat 14-link dump incl. dev/MCP links | UX | `shared/footer.tsx:7` | Group by audience |
| 82 | In-product referral prompt underweight ($10 flat, one-sided) | Growth | `referrals/index.ts:62` | Two-sided framing |
| 83 | Stripe webhook mock-mode skips signature in non-prod | Security | `billing/webhook:91` | Ensure previews set NODE_ENV=production |
| 84 | Dead authz guard `startsWith("api-key:")` never matches | Security | `admin/users:63` | Remove misleading code |
| 85 | `/ai/review` ML features hardcoded in stateless path → near-constant score | AI | `route.ts:120-140` | Pass real history |
| 86 | `packages/sdk` imported by only 2 files, not copied in Dockerfile | Architecture | Dockerfile | Latent build break — fix or drop |
| 87 | Giant SEO data blobs no lint-guard against client import | Architecture | `answers-data` 96KB | Add `server-only` import guard |
| 88 | Demo/PIN accounts exist in code (disabled in prod) | Security | seed/demo | Keep gated; document |
| 89 | OG image routes + `/feed.json` + `/.well-known/ai-plugin.json` unmonitored | Product | `og/*` routes | Confirm cache headers |
| 90 | `analytics-engine.ts` (0 importers) dead | Architecture | grep | Delete |
| 91 | `graph-engine.ts` (0 importers) dead | Architecture | grep | Delete |
| 92 | `sync-engine.ts` + `sync/` (both dead) | Architecture | grep | Delete |
| 93 | Stale comment: `cron/agents` "not in vercel.json" but it is | Reliability | `agents/route.ts:7` | Fix comment / disable |
| 94 | CLAUDE.md/API.md describe "35 routes/14 engines" — wildly stale | Docs | CLAUDE.md | Rewrite to match reality |
| 95 | No `robots`/rate strategy for the public "simulated" data endpoints | Trust | `pricing`/`benchmarks` | Label data provenance |
| 96 | Heuristic earnings on public profiles inflate trust signals | Trust | `i/[slug]/page.tsx:31` | Remove until real |
| 97 | Notification system exists but tied to dead queue | Reliability | `notifications/*` | Re-point to direct send |
| 98 | `event-sourcing/` (1 real use: FTC inject) over-abstracted | Architecture | `event-sourcing/index.ts` | Collapse to a function |
| 99 | `plugin-system.ts` (26KB) for 0 third-party plugins | Architecture | `plugin-system.ts` | Defer |
| 100 | Mobile-interop layer untested against a real mobile client | Reliability | `shared/mobile-interop.ts` | Defer until mobile app exists |

---

### Severity tally
- 🔴 Critical: **13** (data-loss ×3, AI-washing/fabrication ×3, can't-charge ×3, sprawl ×1, funnel/ops ×3)
- 🟠 High: **33**
- 🟡 Medium: **34**
- ⚪ Low: **20**

**The pattern:** almost every Critical/High is *durability*, *truth*, or *focus* — not "build a new feature." The cheapest path to a great product here is subtraction plus a handful of persistence + honesty fixes.
