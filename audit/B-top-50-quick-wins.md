# Report B — Top 50 Quick Wins
*High ROI ÷ low effort. Each: **Effort** (S <½ day · M ½–3 days), **ROI**, **Systems touched**. Ordered by ROI/effort. ⚡ = do this week.*

> These are deliberately *not* the big rebuilds (those are in `E-top-25-projects.md`). They're the cheap, high-leverage fixes — many are one-line or config changes that unblock revenue, stop trust/legal exposure, or remove dead weight.

---

## Tier 1 — unblock revenue & stop active harm (do first) ⚡

| # | Quick win | Effort | ROI | Systems |
|---|---|---|---|---|
| 1 | ⚡ Fix dead landing CTA: `href="#signup"` → `/dashboard#signup` | S | **Huge** — restores the top-of-funnel button; every signup flows through it | `shared/nav.tsx:152,277` |
| 2 | ⚡ Set `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` on Vercel | S | Unblocks all billing | Vercel env, `stripe.ts:12` |
| 3 | ⚡ Create Stripe prices, set `STRIPE_PRICE_*` env | S | Checkout stops 503-ing → first dollar possible | `billing/route.ts:113-119` |
| 4 | ⚡ Run/repair the billing migration in prod; make `/migrate` authoritative + idempotent | M | Subs persist instead of reverting to free | `migrate/route.ts`, `migrations.ts:629` |
| 5 | ⚡ Fix the false migration runbook (`setup-stripe-billing.sh`) | S | Prevents founder shipping on a false belief tables exist | `setup-stripe-billing.sh:35-38` |
| 6 | ⚡ Stop metering/charging for "AI" until it's real (feature-flag off or relabel "templates") | S | Removes false-advertising exposure | `_enforce-ai-limit.ts`, `ai-engine.ts:233` |
| 7 | ⚡ Label or remove fabricated ROI/reach/CPA numbers ("estimate," not "projection") | S | Removes trust/liability risk on spend decisions | `recommendation-builder.ts:74`, `agent.ts:60` |
| 8 | ⚡ Hide the fabricated "~$4,800" earnings on public profiles | S | Stops showing invented numbers as real | `i/[slug]/page.tsx:31` |
| 9 | ⚡ Fix FTC "auto-injected, cannot be disabled" docs to match code (validate-only) | S | Removes compliance misrepresentation | `compliance-engine.ts:620,676` |
| 10 | ⚡ Validate `metadata.plan` slug in Stripe webhook | S | Stops a payer silently dropping to free limits | `webhook/route.ts:148` |

## Tier 2 — durability & ops safety (cheap protections)

| # | Quick win | Effort | ROI | Systems |
|---|---|---|---|---|
| 11 | Add Sentry (or equivalent) + alert on DB write failures | M | Makes prod failures *visible* — currently zero observability | app-wide, `logging/` |
| 12 | Add a cron to drain queued emails (stopgap for dead worker) OR switch lifecycle emails to direct-send | M | Engagement + dunning emails actually send | `jobs/queue.ts:192`, `vercel.json` |
| 13 | ⚡ Add the weekly-digest cron to `vercel.json` | S | Restores the only retention email loop | `digest/route.ts` |
| 14 | ⚡ Persist drip "sent" state (or guard by DB timestamp) | M | Prevents cold-start email re-blast / spam complaints | `drip.ts:264,321-332` |
| 15 | ⚡ Require a Bearer secret on `/migrate`; never set `ALLOW_MIGRATIONS=true` in prod casually | S | Closes unauthenticated DDL endpoint | `migrate/route.ts:21-43` |
| 16 | ⚡ Expand readiness probe to campaign/perk tables | S | Ops tool stops hiding data-loss modes | `readiness/route.ts:126-145` |
| 17 | ⚡ Enforce branch protection so red CI can't deploy | S | Prevents shipping broken builds | GitHub settings, `ci.yml` |
| 18 | Add an e2e smoke job (signup→campaign→claim) to CI | S | Catches funnel regressions pre-merge | `e2e/*.spec.ts`, `ci.yml` |
| 19 | ⚡ Typecheck tests + remove `__tests__`/`api` excludes from tsconfig | S | Stops silent test rot | `tsconfig.json` |
| 20 | ⚡ Mock fetch in unit tests to kill the happy-dom `AbortError` noise | S | Clean signal in CI | test setup |

## Tier 3 — delete dead weight (pure subtraction, ROI = velocity) ⚡

| # | Quick win | Effort | ROI | Systems |
|---|---|---|---|---|
| 21 | ⚡ Delete the entire `api/` backend (~63K LOC) | M | Stops double-maintenance; halves security surface | `api/` |
| 22 | ⚡ Delete `infrastructure/*` (SOC2/sharding/DR/edge/observability/ml-pipeline, ~14.7K LOC, 0 importers) | S | Removes "enterprise theater," speeds builds | `lib/infrastructure/*` |
| 23 | ⚡ Delete `ideas.ts` (177KB, 0 importers) | S | Removes the single largest dead file | `lib/ideas.ts` |
| 24 | ⚡ Delete `exchange.ts` + 5 exchange routes + `/exchange` page | S | Removes a whole unlinked feature | `exchange.ts`, `exchange/*` |
| 25 | ⚡ Delete `graph-engine.ts`, `sync-engine.ts`+`sync/`, `analytics-engine.ts` (0 importers) | S | ~3.4K LOC gone | those files |
| 26 | ⚡ Delete API v2 (4 routes) + `versioning.ts` | S | Removes self-contradictory ghost API | `api/v2/*` |
| 27 | ⚡ Delete dead ML/embedding twins (`ml/embedding-system.ts`, `ml/fraud-pipeline.ts`) | S | ~2.8K LOC, de-clutters "AI" | `lib/ml/*` |
| 28 | ⚡ Delete the stale nested worktree under `src/.claude/worktrees/` | S | Stops grep pollution / accidental ship | nested dir |
| 29 | Remove unused exports from `matching-engine.ts` (keep `getNicheAffinity`) | S | Shrinks AI surface | `matching-engine.ts` |
| 30 | Collapse `event-sourcing/` to the one function actually used (FTC inject) | M | Removes over-abstraction | `event-sourcing/` |

## Tier 4 — UX & accessibility (cheap conversion + inclusivity)

| # | Quick win | Effort | ROI | Systems |
|---|---|---|---|---|
| 31 | ⚡ Lighten `brand-muted`/`brand-subtle` to pass WCAG AA | S | Site-wide readability + a11y | `globals.css:132-134` |
| 32 | ⚡ Remove deprecated PIN fallback on login | S | Clearer auth mental model | `auth/auth-form.tsx:139-154` |
| 33 | ⚡ Convert Business Type free-text → select/typeahead | S | Clean data → better matching/templates | `auth/auth-form.tsx:631` |
| 34 | ⚡ Wire or hide the dead "Add Location" button | S | Removes a dead-end click | `enterprise/portal.tsx:193` |
| 35 | ⚡ Add success/failure toast to admin submission review | S | Admin sees if action worked | `admin/page.tsx:670` |
| 36 | Add `tablist`/`tab`/`tabpanel` ARIA to portal tabs | S | Screen-reader navigability | `business/portal.tsx:554` |
| 37 | ⚡ Group the footer by audience; drop dev/MCP links | S | Scannability; right links to right users | `shared/footer.tsx:7` |
| 38 | Add password-confirm field at signup | S | Prevents typo'd unrecoverable accounts | `auth/auth-form.tsx:622-635` |
| 39 | Reuse `ui/modal.tsx` focus-trap in the onboarding wizard | M | Keyboard/AT users not stranded | `business/onboarding-wizard.tsx:367` |
| 40 | Make the in-product referral prompt two-sided + raise/clarify reward | S | Activates the on-brand growth lever | `referrals/index.ts:62` |

## Tier 5 — security hardening (small, high-value)

| # | Quick win | Effort | ROI | Systems |
|---|---|---|---|---|
| 41 | ⚡ Switch to the existing distributed rate limiter (or Upstash) | M | Brute-force protection actually works on serverless | `rate-limiter.ts:20`, `_shared.ts:262` |
| 42 | ⚡ Use `assertSafeUrl` + IP-pin in proof-URL + webhook fetchers (SSRF) | S/M | Closes SSRF to metadata/internal services | `url-checker.ts:203,221`, `webhooks/route.ts:41` |
| 43 | ⚡ Apply CSRF to admin/billing mutations | S | Closes phished-admin → suspend/role-change | `_shared.ts:204` |
| 44 | ⚡ Move founder admin email to env + plan MFA | S | Hardens the highest-priv account | `auth/user-store.ts:150` |
| 45 | Add secret/PII redaction to the logger | S | Prevents accidental cred leakage to logs | `logging/index.ts:70-82` |
| 46 | Restrict enterprise role out of chaos/ops + job-queue reads | S | Removes customer→ops privilege | `reliability/route.ts:117`, `jobs/route.ts:32` |
| 47 | Remove dead authz guard `startsWith("api-key:")` | S | Removes misleading security code | `admin/users:63` |

## Tier 6 — truth & docs (credibility)

| # | Quick win | Effort | ROI | Systems |
|---|---|---|---|---|
| 48 | ⚡ Rename "AI/embeddings/ML/autonomous-agents" → honest labels where templates/rules/hashes | S | Removes AI-washing across UI + docs | UI copy, `embedding-engine.ts` |
| 49 | ⚡ Rewrite CLAUDE.md/API.md to match reality (routes, engines, what's durable) | S | Stops future devs/agents building on false map | `CLAUDE.md`, `API.md` |
| 50 | Add a `server-only` import guard to giant SEO data files | S | Prevents a future accidental 96KB client-bundle regression | `answers-data.ts` etc. |

---

### If you only do 10 this week
**1, 2, 3, 6, 7** (revenue + stop-harm) · **21, 22, 23** (delete `api/`, `infrastructure/*`, `ideas.ts`) · **13** (digest cron) · **31** (contrast).
Net effect: billing can take money, the worst trust/legal exposure is gone, ~80K LOC of noise disappears, and the funnel + readability improve — in roughly **3–4 focused days**.
