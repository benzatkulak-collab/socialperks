# Social Perks — Security Audit (Phase 5)

**Auditor stance:** Principal Security Engineer, evidence-based, read-only.
**Date:** 2026-06-02 · **Commit:** 8efd1dc · **Status:** PRE-LAUNCH, 0 real users, Vercel + Supabase Postgres.

## TL;DR for the founder

This codebase has clearly already been through a serious security pass (the dev comments literally narrate previously-fixed holes: tautological OAuth state, decorative CSRF, XFF spoofing, mock-mode webhook bypass, null-businessId IDOR). The **core auth and money paths are genuinely solid**: JWT is HS256 with alg-pinning + timing-safe verify + prod-mandatory secret; Stripe webhooks verify real signatures with raw body and refuse to run in mock mode in prod; API keys are SHA-256 hashed with constant-time compare; admin routes uniformly enforce `role === "admin"`; SQL is parameterized with an allowlisted ORDER BY; no secrets are committed.

The remaining issues are real but mostly **operational / second-order**, not "anyone is admin" catastrophes:

- **Rate limiting is in-memory per serverless instance** — effectively non-functional on Vercel. This is the single most important finding because it silently defeats the brute-force / enumeration protection on auth, password reset, and credential minting. A durable limiter exists in the repo but is *not wired in*.
- **SSRF in the proof-URL verifier** — an authenticated user can make the server fetch internal IPs / cloud-metadata-style hosts via DNS that the synchronous guard doesn't resolve. The DNS-resolving guard exists but isn't used on this path.
- **`/api/v1/migrate` has zero authentication** — it's gated only by `NODE_ENV` + an `ALLOW_MIGRATIONS` env flag; if that flag is ever set in prod to run a migration, the endpoint is open to the world (blast radius is bounded — DDL is additive/idempotent, no DROP).
- **CSRF is applied to ~half of mutating routes** — the gaps that matter are the cookie-authenticated admin mutations (suspend user, change role, force-mutate campaign, impersonate).
- **Founder admin email is hardcoded in source** (`benzatkulak@gmail.com`), turning the admin account into a known target for the (currently ineffective) rate limiter.

None of these are "drop everything tonight," but **fix the rate limiter and the SSRF before you take real users**, and **never set `ALLOW_MIGRATIONS=true` on the production deployment** (run migrations from CI / a one-off, or add a secret to that route).

---

## Severity-ranked findings

Legend: effort **S** (<1h) / **M** (a few h) / **L** (day+). ⚡ = quick win.

---

### HIGH

#### H1 — Rate limiting is in-memory per instance → non-functional on Vercel serverless ⚡(partial)
**File:** `src/lib/security/rate-limiter.ts:20` (`const store = new Map<string, RateLimitEntry>()`), consumed by every route via `src/app/api/v1/_shared.ts:262` `rateLimit()`.
**Evidence:** The limiter state is a module-level `Map`. On Vercel each serverless invocation may run in a *different* instance (and instances are recycled), so counters don't aggregate. A `distributed-rate-limiter.ts` exists (`src/lib/security/distributed-rate-limiter.ts`) but `grep` shows **zero route imports of it** — nothing uses it.
**Exploit:** Brute-force `/api/v1/auth` login/password-reset, enumerate, or hammer `agent-auth/approve` (credential minting) — the "strict 5/min" cap resets per cold instance and never sees a global count, so an attacker spreading requests (or just benefiting from Vercel fan-out) blows past it.
**Impact:** Defeats the primary control protecting auth, password reset, and key minting. Especially bad because the admin email is known (see M4).
**Fix (M):** Wire the distributed limiter (Postgres- or Upstash/Redis-backed) into `rateLimit()` in `_shared.ts`, at least for the `strict` tier on auth/reset/agent-auth/approve. Keep the in-memory one as an L1 cache only.

#### H2 — SSRF in proof-URL verification (server fetches user-controlled host without DNS-resolving guard)
**Files:** `src/app/api/v1/submissions/route.ts:200` `checkProofUrl(proofUrl, platformId)` → `src/lib/verification/url-checker.ts:203` (`const safety = isSafeUrl(url)`) → `:221` `await fetch(url, { method:"HEAD", redirect:"manual" })`. Same pattern in `src/lib/verification/screenshot-analyzer.ts:139,144`.
**Evidence:** The guard used is `isSafeUrl` (`src/lib/security/url.ts:71`), which only validates the scheme and **literal-IP** hosts — it explicitly does *not* resolve DNS (the file documents this and provides `assertSafeUrl` for fetch-time DNS validation, which is **not** used here). `redirect:"manual"` only blocks redirect-based pivots, not a first-hop hostname that resolves to a private IP.
**Exploit:** An authenticated user submits a proof with `proofType:"url"` and `proofUrl:"https://attacker-controlled-host/"` where the host's DNS A-record points at `169.254.169.254`, `127.0.0.1`, or an internal Supabase/Vercel address. The server fetches it; the result (`statusCode`, `contentType`, `redirectedUrl`) is written to `submission.metadata.urlVerification` (`submissions/route.ts:204-207`) and is readable back by the submitter → blind/semi-blind SSRF with response oracle.
**Impact:** Internal service probing and cloud-metadata exposure (token theft on metadata-bearing platforms). Mitigated by: requires a valid account, HEAD-only, limited response surface.
**Fix (S/M):** Replace `isSafeUrl` with `await assertSafeUrl(url)` on these fetch paths and pin the connection to the resolved public IP (pass a custom `lookup`/agent) to close the resolve-then-fetch race. The helper already exists.

---

### MEDIUM

#### M1 — `/api/v1/migrate` is unauthenticated; only gated by NODE_ENV + `ALLOW_MIGRATIONS`
**File:** `src/app/api/v1/migrate/route.ts:21-38` (`isProduction()` returns false when `ALLOW_MIGRATIONS==="true"`; POST then runs with **no auth check** — confirmed: no `requireAuth`, no Bearer/secret, no role).
**Evidence:** Handler logic: `if (isProduction()) return 404;` else run `runMigrations()`. There is no credential anywhere in the route.
**Exploit:** If an operator ever sets `ALLOW_MIGRATIONS=true` on the prod deployment to apply a migration (a documented pattern — `phase1_status.md` describes needing to run migrations in prod), the endpoint becomes a fully public DB-DDL trigger; anyone can `POST /api/v1/migrate`.
**Blast radius:** **Bounded.** `generateSQL()` emits only `CREATE TABLE/INDEX IF NOT EXISTS`, guarded `DO $$` blocks, and `ENABLE RLS` — additive and idempotent, **no DROP/ALTER-destructive**. Worst case is repeated DDL execution / lock contention / mild DoS, not data loss. (Memory note also references a `/api/v1/migrate` protected by `MIGRATION_SECRET`; this committed route has no such check.)
**Fix (S):** Add a `constantTimeEqual(authHeader, "Bearer " + process.env.MIGRATION_SECRET)` gate to the POST handler regardless of env, and prefer running migrations from CI rather than via a live HTTP route. Never set `ALLOW_MIGRATIONS=true` on prod.

#### M2 — CSRF only applied to ~half of mutating routes; cookie-auth admin mutations are unprotected
**Evidence:** 23 of 47 route files with POST/PUT/PATCH/DELETE call `requireCsrf` (`src/app/api/v1/_shared.ts:204`). Mutating routes **without** CSRF that are reachable with browser **cookie** auth and change state:
- `src/app/api/v1/admin/users/route.ts` (PATCH: suspend / change-role / reset-password)
- `src/app/api/v1/admin/campaigns/route.ts` (force-mutate)
- `src/app/api/v1/admin/agents/route.ts`
- `src/app/api/v1/admin/impersonate/route.ts` (POST starts impersonation)
- `src/app/api/v1/billing/route.ts` (checkout/portal — tenant-scoped, lower value)
- `src/app/api/v1/webhooks/route.ts` (register webhook URL — also an SSRF sink, guarded by `isSafeUrl`)
**Exploit:** A logged-in admin who visits a malicious page could have their browser POST to `admin/users` (suspend an account, change a role) or `admin/impersonate` — the HttpOnly cookie rides along, and no `X-CSRF-Token` is required. (Webhooks/cron/agent-token routes legitimately skip CSRF — they use Stripe signatures, `CRON_SECRET`, or the single-use OAuth code, so those omissions are fine.)
**Impact:** State-changing CSRF on the most privileged endpoints. Lower likelihood (needs an authenticated admin to be phished; admin is a single founder account) but high impact.
**Fix (S):** Add `const c = requireCsrf(req); if (c) return c;` to the admin mutation handlers and `billing`/`webhooks` POST. The helper already bypasses API-key callers, so agents are unaffected.

#### M3 — Production CSP allows `script-src 'unsafe-inline'`
**File:** `next.config.js:49-57` (`isDev ? "'self' 'unsafe-inline' 'unsafe-eval'" : "'self' 'unsafe-inline'"`).
**Evidence:** Even in prod the script policy includes `'unsafe-inline'`. The rest of the CSP is strong (allowlisted `connect-src`, `object-src 'none'`, `frame-ancestors 'none'`, HSTS preload).
**Exploit:** Any future reflected/stored XSS is fully weaponizable because inline `<script>` execution isn't blocked — CSP provides no defense-in-depth against script injection. (No *current* injection sink found — all `dangerouslySetInnerHTML` uses static JSON-LD through `safeJsonForScript`, see "What's solid".)
**Impact:** Removes the CSP safety net that would otherwise contain an XSS. Next.js with the App Router can run without inline scripts using nonces/hashes.
**Fix (M):** Move to nonce-based CSP (`'strict-dynamic'` + per-request nonce) and drop `'unsafe-inline'` for scripts in prod.

#### M4 — Founder admin email hardcoded in source
**File:** `src/lib/auth/user-store.ts:150` (`const ADMIN_EMAIL = "benzatkulak@gmail.com";`).
**Evidence:** The sole admin account's email is a constant in committed source; the admin is bootstrapped from this email + `ADMIN_PASSWORD` env.
**Exploit:** Attackers know exactly which account to target for password spraying / reset abuse / phishing. Combined with H1 (ineffective rate limit), online password guessing against this known account is unthrottled.
**Impact:** Lowers the bar for account takeover of the highest-privilege account.
**Fix (S):** Move the admin email to an env var (`ADMIN_EMAIL`), and ensure H1 is fixed so the account is rate-limited. Consider 2FA for admin before launch.

#### M5 — Structured logger performs no secret/PII redaction
**File:** `src/lib/logging/index.ts:70-82` — `meta` is spread verbatim into the emitted JSON; there is no allow/deny field scrubbing.
**Evidence:** `const entry = { ...meta }` with no redaction layer. Whether this leaks depends entirely on callers. No caller was found logging passwords/tokens directly (auth route logs only metrics; webhooks log `payloadKeys`/event ids), so this is **latent**, not actively exploited.
**Impact:** One careless future `logger.info("login", { body })` would put credentials into Vercel logs / any aggregator.
**Fix (S):** Add a redaction pass in `Logger.log()` that masks keys matching `/pass|secret|token|authorization|api[-_]?key|cookie/i` and obvious PII before output.

---

### LOW

#### L1 — `enterprise` (a customer tier) can trigger ops/chaos and read job queues
**Files:** `src/app/api/v1/reliability/route.ts:117-119` (`role !== "admin" && role !== "enterprise"` → allowed), `src/app/api/v1/jobs/route.ts:32-38` (same), `src/app/api/v1/digest/route.ts`.
**Evidence:** Chaos injection / detector runs / queue inspection are authorized for `enterprise`, which is a paying-customer role, not a staff role.
**Impact:** A future enterprise customer could trigger chaos experiments (TTL-bounded) or view internal queue metadata. Low impact today (no real infra wired behind chaos; likely no-ops) and zero enterprise customers exist.
**Fix (S):** Restrict these to `admin` only.

#### L2 — Dead-code authorization guard (`startsWith("api-key:")` never matches)
**Files:** `admin/users/route.ts:63`, `admin/campaigns/route.ts:40`, `admin/agents/route.ts:48`, `admin/impersonate/route.ts:96` — all check `user.id.startsWith("api-key:")`, but API-key users are minted with `id: \`agent:${record.id}\`` (`_shared.ts:162`) and role `"agent"`.
**Evidence:** Prefix mismatch (`agent:` vs `api-key:`) means this branch is unreachable.
**Impact:** **None today** — agents have role `"agent"`, which already fails the preceding `role !== "admin"` check, so the dead guard is redundant rather than a bypass. Flagged only because it's a misleading "defense" that could rot into a real gap if the role model changes.
**Fix (S):** Change to `user.role === "agent"` (or `user.id.startsWith("agent:")`) for correctness.

#### L3 — Webhook URL registration uses synchronous (non-DNS) SSRF guard
**File:** `src/app/api/v1/webhooks/route.ts:41` (`return isSafeUrl(url) === null`).
**Evidence:** Outbound webhook delivery targets are validated with `isSafeUrl` (no DNS resolution), same class as H2. Rated Low (not High) because it depends on whether/where deliveries actually fire server-side and is admin/owner-scoped registration.
**Fix (S):** Validate with `assertSafeUrl` at delivery time and re-pin per delivery (DNS can change after registration).

#### L4 — In-memory single-use stores for OAuth state, password-reset tokens, webhook dedup (per-instance)
**Files:** `src/lib/security/csrf.ts:64` (`_pendingFlows` Map), `src/app/api/v1/auth/route.ts:40` (`resetTokens` Map), `verification/webhook` `recentEventIds` Set.
**Evidence:** These are module-level Maps/Sets. The code already migrated *webhook dedup* to Postgres (`markEventProcessed`) for cross-instance safety, but OAuth-state consume and password-reset tokens remain in-memory.
**Impact:** On serverless, a password-reset link or OAuth callback that lands on a *different* instance than the one that issued it fails (availability bug), and single-use guarantees aren't globally enforced (a reset token *could* be usable once per instance). Bounded by 1h/60s TTLs. Low security impact, mostly reliability.
**Fix (M):** Back reset tokens and pending OAuth flows with Postgres (the dedup table pattern already exists).

#### L5 — Stripe webhook "mock mode" skips signature verification in non-production
**Files:** `billing/webhook/route.ts:91-117`, `payouts/webhook/route.ts:79-109`.
**Evidence:** When Stripe isn't configured AND `NODE_ENV !== "production"`, the handler parses the body without signature verification. Correctly **blocked in production** (`:58-64`, `:48-54`).
**Impact:** Dev-only. Acceptable, noted for completeness. Ensure preview deployments set `NODE_ENV=production` or configure the webhook secret so previews aren't forgeable.

---

## What's solid (verified, not assumed)

These were checked against actual code and are **correctly implemented** — don't waste time "fixing" them:

- **JWT** (`src/lib/auth/index.ts:249-293`): HS256 **alg-pinned** (rejects `alg=none`/confusion), **length-check before `timingSafeEqual`** (no timing side-channel), exp checked, optional `type` claim check (refresh-vs-access), secret **mandatory in prod** (throws), dev fallback only in non-prod.
- **CSRF token** (`src/lib/security/csrf.ts`): HMAC-SHA256, session-bound, 1h expiry, constant-time compare, secret mandatory in prod. The `requireCsrf` helper correctly exempts API-key callers.
- **Admin authorization**: every `admin/*` route enforces `user.role !== "admin" → 403` individually (not relying on a single middleware). Verified across all 11 admin route files.
- **Impersonation** (`admin/impersonate/route.ts`): admin-only, **refuses admin→admin** (audited), refuses suspended targets, blocks API keys, records HttpOnly admin-backref cookie, audited on start and exit.
- **Stripe webhooks**: real `stripe.webhooks.constructEvent` (raw body + constant-time + timestamp/replay built in), **refuses mock mode in prod**, cross-instance dedup via Postgres (`markEventProcessed`), failed-signature attempts audited. Money-moving path is sound.
- **Platform/verification webhook** (`verification/webhook/route.ts`): HMAC-SHA256 over raw body, `timingSafeEqual`, length-check, `WEBHOOK_SECRET` mandatory in prod (throws on fallback), `hub.verify_token` checked, cross-instance replay dedup.
- **API keys** (`src/lib/auth/api-keys.ts`): SHA-256 hashed (never stored plaintext), prefix-indexed lookup, constant-time hash compare, active/expiry enforced, hash never leaves the store (`stripHash`).
- **Agent OAuth** (`agent-auth/approve` + `/token`): approve requires **CSRF + JWT** (API keys can't mint keys), validates scopes + `redirect_uri` (https/localhost only), mints scoped key; token exchange uses **single-use 64-hex 60s code**, format-validated before store hit.
- **SQL injection**: `PostgresConnection.query` uses `sql.unsafe(sql, params)` with **bound `$N` params**; repositories build WHERE with `$N` placeholders and gate ORDER BY through `safeOrderBy` (allowlist) + `safeOrder` (ASC/DESC only). `src/lib/security/order-by.ts` is applied in all 5 list repos. No string-concatenated user input into SQL found.
- **XSS**: all `dangerouslySetInnerHTML` are static JSON-LD via `safeJsonForScript` (`src/lib/security/json-ld.ts`), which escapes `</script>`, `<!--`, U+2028/2029. No user input reaches an HTML sink.
- **Signup privilege escalation**: blocked — `auth/route.ts:236-241` constrains self-signup role to `business|influencer`; `enterprise`/`admin` require admin action.
- **Submission impersonation**: blocked — `submissions/route.ts:160-163` forces `userId` from the authed user, ignoring `body.userId`.
- **Demo/PIN backdoor**: PIN login hard-disabled in prod (`auth/route.ts:361-365`); demo accounts not seeded in prod (`user-store.ts:206-209`).
- **IDOR helper** (`src/lib/security/owner.ts`): `requireOwnership` is fail-closed on null `businessId` (fixes the classic short-circuit IDOR); tenant isolation via `_tenant.ts` + `checkResourceAccess`.
- **SSRF guard quality**: `url.ts` blocks RFC1918/loopback/link-local/ULA/metadata + IPv4-mapped IPv6 + DNS-rebinding (via `assertSafeUrl`). The library is good — the bug (H2/L3) is that the *weaker* sync variant is used at the fetch sites.
- **Client IP resolution** (`_shared.ts:252-260`): prefers `x-real-ip`/`x-vercel-forwarded-for` over spoofable XFF.
- **Open redirect**: `billing/route.ts:81-101` restricts Stripe success/cancel URLs to the configured site host.
- **Secrets hygiene**: no `.env` committed (only `.env.example` with empty values); no `sk_live`/`sk_test`/`whsec`/`re_`/AWS/GH keys or private keys in tracked files (only test fixture `whsec_testsecret123`). All secret accessors (`AUTH_SECRET`, `CSRF_SECRET`, `WEBHOOK_SECRET`) **throw in prod** instead of using a hardcoded fallback.
- **Token-gated ops** (`cron/*`, `waitlist` admin peek, `health/readiness`): all use `constantTimeEqual` and refuse when the secret is unset.
- **Abandoned `api/` backend**: its OAuth secrets are env-driven (`?? ""` empties, not hardcoded creds); no leaked secrets. (It has its own `JWT_SECRET` IIFE at `api/src/lib/auth/index.ts:179` — out of scope for prod since it's not the deployed surface, but verify it isn't deployed.)

---

## Recommended fix order (pre-launch)

1. **H1** — wire a durable rate limiter (auth/reset/agent-auth at minimum). *Without this, every other auth control is weaker than it looks.*
2. **H2** — swap `isSafeUrl`→`assertSafeUrl` + IP-pin on `url-checker` / `screenshot-analyzer` (and L3 on webhooks).
3. **M1** — add `MIGRATION_SECRET` gate to `/api/v1/migrate`; never set `ALLOW_MIGRATIONS=true` on prod.
4. **M2** — add `requireCsrf` to admin mutations + billing/webhooks POST.
5. **M4 + M3 + M5** — env-ify admin email (+ 2FA), nonce-based CSP, confirm preview deploys can't run forgeable webhooks.
6. **M5(log redaction), L1, L2, L4** — hardening / hygiene.
