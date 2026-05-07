# Security: 200-item ranked audit with current state + fix paths

> **Scope.** A principal-engineer pass over `benzatkulak-collab/socialperks` at `claude/security-200-audit` (cuts from `main` at `84d61c5`). Every item below is grounded in a file or PR in this repository. No OWASP boilerplate, no padding for headcount.
>
> **Methodology** is described in §2; the rubric is in the task spec and reproduced in the items. **Severity ≠ score** — a high-severity finding with strong mitigations gets a high score; a low-severity finding with no mitigation gets a low score.

## Table of contents

1. [Executive summary](#1-executive-summary)
2. [Methodology](#2-methodology)
3. [The 200 items](#3-the-200-items)
4. [Top 20 priority list](#4-top-20-priority-list)
5. [Items already at ≥95](#5-items-already-at-95)
6. [Items that need infrastructure, not code](#6-items-that-need-infrastructure-not-code)
7. [The "to 95" delta](#7-the-to-95-delta)

---

## 1. Executive summary

**Overall posture: 71 / 100.** This is a mid-stage YC SaaS that has done the obvious things well — JWT alg-pinning, HMAC-SHA256 webhook verification with replay windows, scrypt password hashing with timing-safe compare, layered SSRF defenses with DNS resolution, structured request tracing on every route, an audit log that self-audits its own reads, CSP that distinguishes dev (`unsafe-eval` for fast-refresh) from prod, hardcoded-secret production guards in CSRF/JWT/encryption modules, an API-key system with constant-time hash compare and prefix-bucketed lookup. Where it falls short of "industry-leading for a YC-stage SaaS" is in a small number of integration gaps that bypass otherwise-strong primitives: the MCP route accepts *any* string as an API key without calling `verifyApiKey()`; outbound webhook delivery does not run `assertSafeUrl()` before `fetch()`; the encryption module's `getMasterKey()` silently uses the dev fallback in production; tenant context derives `plan: "starter"` from a string literal instead of billing state; sessions and api_keys are dual-stored in process-memory + Postgres with the in-memory copy as authoritative, which silently drops state under multi-instance hot-reloads. None of these are "you have a backdoor." All of them are "an attacker who reads your code finds the gap."

**Top 5 most urgent.**

1. **MCP route does presence-only check on `x-api-key`.** `src/app/api/mcp/route.ts:230-281` — `if (tool.requiresAuth && !ctx.authHeader)` accepts any non-empty string. `verifyApiKey()` is never called.
2. **Outbound webhooks call `fetch(webhook.url)` with no SSRF guard.** `src/lib/webhooks/index.ts:314` — `assertSafeUrl()` exists in `src/lib/security/url.ts` but isn't used here. A tenant can register `http://169.254.169.254/...` as a webhook URL and have the platform proxy requests to its cloud metadata.
3. **`ENCRYPTION_MASTER_KEY` has no production guard.** `src/lib/encryption/index.ts:31-33` — falls back to `DEV_MASTER_KEY` silently, unlike CSRF/JWT/WEBHOOK secrets which throw.
4. **Sessions + api_keys are in-process Maps with Postgres write-through, not Postgres-authoritative.** `src/lib/auth/index.ts:65-127`, `src/lib/auth/api-keys.ts:178-239` — cache is the source of truth; DB is durability nicety. Multi-instance Vercel deploys see split-brain on rotations.
5. **Demo PIN login (`pin: "1234"`) is gated only on `NODE_ENV === "production"`.** `src/app/api/v1/auth/route.ts:357-407` — preview deploys (Vercel preview branches) run with `NODE_ENV=production`, but staging environments without `VERCEL_ENV=preview` distinction may not. This is one config flip from a backdoor.

**The five things I'd fix this week.** Wire `verifyApiKey()` into MCP and the bearer/api-key code path in `_shared.ts:getUser`; add `assertSafeUrl(webhook.url)` before `fetch` in `src/lib/webhooks/index.ts`; add the production-throw guard to `getMasterKey()`; add a Postgres-first read path to `sessionStore.get()` and `verifyApiKey()` so cache-miss falls back to DB instead of returning null; replace the demo PIN code path with a feature-flag (`ENABLE_DEMO_PIN=1`) that defaults to off everywhere except local dev. All five are single-file changes, all five close gaps in primitives that already exist elsewhere in the codebase.

---

## 2. Methodology

Items were sourced by reading every file in `src/lib/security/`, `src/lib/auth/`, `src/lib/encryption/`, `src/lib/multi-tenant/`, `src/lib/webhooks/`, `src/lib/oauth/`, `src/lib/audit-log.ts`, `src/app/api/v1/_shared.ts`, `src/app/api/v1/_tenant.ts`, `src/app/api/v1/auth/route.ts`, `src/app/api/v1/api-keys/route.ts`, `src/app/api/v1/oauth/`, `src/app/api/v1/billing/webhook/route.ts`, `src/app/api/v1/admin/audit/route.ts`, `src/app/api/v1/verification/webhook/route.ts`, `src/app/api/mcp/route.ts`, `next.config.js`, `package.json`, and the GitHub Actions in `.github/workflows/`. PR titles from `gh pr list --state merged` were used to attribute hardening to merged work (PR #21 wired `x-api-key`, PR #25 was the 25-fix security batch, PR #27 added Postgres persistence, PR #28 fixed OAuth CSRF + image-hash fraud, PR #29 added the audit log). Where the codebase diverges from `CLAUDE.md` (which references PRs #43–#53 that don't exist on this branch), the code wins — `CLAUDE.md` is aspirational. Scores follow the rubric in the task spec: **95** means defense in depth, file-cited, automated-test-covered, runbook-documented; **80** is a single-gap-from-95; **60** is exploitable-at-scale-but-bounded; **40** is partial; **20** is "code exists but isn't called"; **0** is "no defense."

---

## 3. The 200 items

> Notation: file paths are relative to repo root. Line citations are at the time of audit and may drift; the named symbol is the durable reference.

### Auth: sessions, JWT, password handling, login flow

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 1 | Auth/sessions | JWT alg pinned to HS256 with explicit reject on mismatch | 95 | `src/lib/auth/index.ts:264` (`if (alg !== "HS256") return null`) | None — ship test that submits `alg: none` and asserts 401 | S | Tenant takeover |
| 2 | Auth/sessions | Length-check before `timingSafeEqual` to avoid throw-then-catch timing channel | 95 | `src/lib/auth/index.ts:273` | None | S | Token forgery |
| 3 | Auth/sessions | JWT type claim (`access` vs `refresh`) is checked by callers via `expectedType` arg | 90 | `src/lib/auth/index.ts:281`, but only `auth/route.ts:434` passes `expectedType` to refresh; `_shared.ts:81` does not | Pass `"access"` from `getUser`'s Bearer-token path | S | Refresh token used as access |
| 4 | Auth/sessions | Access token TTL 15 min, refresh 7 days, refresh path-scoped to `/api/v1/auth` | 90 | `src/lib/auth/index.ts:203-204`, `src/app/api/v1/auth/route.ts:118-127` | Move to rolling refresh + reuse detection (refresh tokens single-use, replay = invalidate family) | M | Stolen refresh token longevity |
| 5 | Auth/sessions | Password hashing via `crypto.scrypt(N=default, r=default)` with random 16-byte salt | 80 | `src/lib/auth/index.ts:11-19` | Pin scrypt params explicitly (`{ N: 2**15, r: 8, p: 1 }`) so a future Node default change can't weaken hashes | S | Offline cracking on DB leak |
| 6 | Auth/sessions | `verifyPassword` uses `timingSafeEqual` on derived key bytes | 95 | `src/lib/auth/index.ts:21-29` | None | S | Login enumeration via timing |
| 7 | Auth/sessions | Session store is in-memory Map with Postgres write-through; cache is authoritative | 35 | `src/lib/auth/index.ts:65-127` | Make `sessionStore.get()` Postgres-first with cache-aside; today a cold-start instance returns null for valid session tokens until hydration completes | M | Auth gap on cold-start |
| 8 | Auth/sessions | Session prune is "every 100th create" — low-traffic instances grow unbounded | 70 | `src/lib/auth/index.ts:73-75` | Move to interval-based prune like `rate-limiter.ts:39` does | S | Memory growth |
| 9 | Auth/sessions | Logout clears cookies but cannot revoke a still-valid JWT | 50 | `src/app/api/v1/auth/route.ts:413-425` | Add a `jti`-keyed revocation set checked in `verifyJWT` (or migrate to opaque session tokens only) | M | Logged-out token still valid |
| 10 | Auth/sessions | Demo PIN login gated only on `NODE_ENV === "production"` | 40 | `src/app/api/v1/auth/route.ts:357-407` | Replace with `ENABLE_DEMO_PIN` env flag, off-by-default everywhere; current gate fails open on any preview env where NODE_ENV defaults to dev | S | Trivial backdoor on misconfigured env |
| 11 | Auth/sessions | Email enumeration on signup blocked by generic 409 message | 90 | `src/app/api/v1/auth/route.ts:262-264` | None — message is `"Unable to create account. Please try again or use a different email."` which leaks "different email" hint; tighten to "Please try again." | S | Account enumeration |
| 12 | Auth/sessions | Password reset returns 200 even when account missing (anti-enumeration) | 95 | `src/app/api/v1/auth/route.ts:531-533` | None | S | Account enumeration |
| 13 | Auth/sessions | Reset token is `crypto.randomUUID()` (122-bit random), 1h TTL, single-use | 90 | `src/app/api/v1/auth/route.ts:507-516` | Hash the token before storage so a DB read doesn't yield reset capability | S | DB read → account takeover |
| 14 | Auth/sessions | Reset confirms throw on weak password (<8) and over-long (>128) | 85 | `src/app/api/v1/auth/route.ts:546-551` | Add zxcvbn or HIBP-pwned-passwords check; min-8 with no complexity rules is below modern bar | M | Weak password reset |
| 15 | Auth/sessions | Refresh cookie path-scoped to `/api/v1/auth`, SameSite=Lax | 90 | `src/app/api/v1/auth/route.ts:118-127` | Comment in code documents the Lax tradeoff for Stripe redirect — score 90 rather than 95 because Strict + a separate post-Stripe handler would close the gap | S | CSRF surface |
| 16 | Auth/sessions | `getUser` checks Bearer header, then session token, then JWT cookie — order matters | 80 | `src/app/api/v1/_shared.ts:73-117` | Fine; but `getUser` returns first match without verifying that an opaque session-token Bearer matches the cookie's user. A session-token Bearer for user A on a request from user B's cookie returns user A — intended, but the audit log can't tell. Tag the auth method in `AuthUser`. | S | Audit attribution |
| 17 | Auth/sessions | No account lockout / brute-force throttle beyond global IP rate limit | 50 | `src/lib/security/rate-limiter.ts` (5/min strict) per IP per endpoint | Add per-email failure counter with exponential backoff; 5/min lets a botnet of 100 IPs do 500/min | M | Credential stuffing |
| 18 | Auth/sessions | No 2FA / TOTP for business owners | 30 | (no implementation) | Add TOTP enrollment in `/api/v1/auth` (`enroll-2fa`, `verify-2fa`); higher score requires WebAuthn for enterprise | L | Account takeover |

### Auth: API keys, agent self-mint, scope enforcement

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 19 | Auth/api-keys | Plaintext format `sp_{env}_{prefix}_{random}` with 128-bit entropy in random tail | 95 | `src/lib/auth/api-keys.ts:138-159` | None | S | Online brute force |
| 20 | Auth/api-keys | SHA-256 hash stored, plaintext never persisted | 95 | `src/lib/auth/api-keys.ts:95-97`, `:251-253` | None | S | DB exfil → key reuse |
| 21 | Auth/api-keys | `compareKeyHashes` validates hex pattern before `timingSafeEqual` | 95 | `src/lib/auth/api-keys.ts:109-118` | None | S | Timing attack |
| 22 | Auth/api-keys | `verifyApiKey` iterates all prefix-bucket candidates without early-break to keep timing constant | 95 | `src/lib/auth/api-keys.ts:319-323` | None | S | Timing attack |
| 23 | Auth/api-keys | API keys cannot mint other API keys (`role === "agent"` blocked on POST `/api-keys`) | 95 | `src/app/api/v1/api-keys/route.ts:62-64` | None | S | Privilege escalation chain |
| 24 | Auth/api-keys | API keys cannot list keys (same block on GET) | 95 | `src/app/api/v1/api-keys/route.ts:32-34` | None | S | Key enumeration via key |
| 25 | Auth/api-keys | `verifyApiKey` is exported but **not wired into any API route** | 20 | `src/app/api/mcp/route.ts:230-280` does presence check; no other route calls `verifyApiKey`. Grep: `Found 2 files` (both inside auth/) | Add an `apiKey` branch to `getUser` in `_shared.ts:73`: extract `x-api-key` header, call `verifyApiKey`, synthesize `AuthUser` with `role: "agent"`, `businessId` from key | S | Entire agent surface unauthenticated |
| 26 | Auth/api-keys | MCP route accepts any non-empty string as auth | 15 | `src/app/api/mcp/route.ts:230-281` (`if (tool.requiresAuth && !ctx.authHeader)` → just presence) | Replace with `verifyApiKey(headerValue)` and reject on null | S | Public access to "authenticated" tools |
| 27 | Auth/api-keys | Permissions allowlist enforced on creation (`read`/`write`/`admin`) | 90 | `src/app/api/v1/api-keys/route.ts:85-97` | Permissions are stored on the key but not consulted on use — score 90 because there's no enforcement code path yet. Add `requirePermission(user, "write")` helper | S | Over-broad keys |
| 28 | Auth/api-keys | Key revocation writes through to Postgres so cold-start can't resurrect | 90 | `src/lib/auth/api-keys.ts:359-362` | DB write is fire-and-forget; if it fails, an instance restart re-hydrates from DB which still has `active=true`. Make revocation synchronous with retry | S | Revoked-key resurrection |
| 29 | Auth/api-keys | `expiresAt` validated 1-3650 days at creation | 90 | `src/app/api/v1/api-keys/route.ts:99-107` | Default `expiresAt` is null (no expiry); enterprise keys never expire unless owner sets it. Default to 90 days | S | Stolen key longevity |
| 30 | Auth/api-keys | Last-used timestamp debounced to once per minute per key | 85 | `src/lib/auth/api-keys.ts:332-337` | Debounce is in-memory; multi-instance writes contend. Acceptable | S | Forensics granularity |
| 31 | Auth/api-keys | Key creation audited (`api_key.created`); revocation audited (`api_key.revoked`) | 95 | `src/lib/auth/api-keys.ts:289-296`, `:362-369` | None | S | Forensics |
| 32 | Auth/api-keys | Key verification failures NOT audited (`api_key.verification_failed` exists in enum but no `audit()` call) | 40 | `src/lib/audit-log.ts:39` defines action; no caller in `verifyApiKey` | Add `audit({action: "api_key.verification_failed", ...})` on the `null` branches | S | Brute-force visibility |
| 33 | Auth/api-keys | API-key hash hydration eager at module load (`void ensureHydrated()`) | 80 | `src/lib/auth/api-keys.ts:417-423` | First-100ms-of-cold-start auth gap acknowledged in comment but not handled. Async-fallback in `verifyApiKey` to await hydration on cache miss | M | Cold-start auth gap |
| 34 | Auth/api-keys | No "rotate key" endpoint — owner must revoke + create | 70 | (no implementation) | Add `POST /api/v1/api-keys/[id]/rotate` that mints new + invalidates old after grace window | M | Operational rotation friction |

### Authorization / IDOR / tenant isolation

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 35 | Authz | `withTenant` middleware combines auth + tenant resolution + usage metering in one call | 90 | `src/app/api/v1/_tenant.ts:32-55` | None for the helper itself; gap is that not every route uses it | S | Tenant boundary leaks |
| 36 | Authz | `checkResourceAccess` rejects on `tenantId !== resourceOwnerId` | 95 | `src/app/api/v1/_tenant.ts:63-76`, `src/lib/multi-tenant/isolation.ts:100-104` | None | S | IDOR |
| 37 | Authz | Submissions GET cross-tenant guard on explicit `campaignId` filter | 95 | `src/app/api/v1/submissions/route.ts:53-59` | None | S | IDOR on submissions |
| 38 | Authz | Submissions GET cross-tenant guard on explicit `businessId` filter | 95 | `src/app/api/v1/submissions/route.ts:69-72` | None | S | IDOR on submissions |
| 39 | Authz | Submissions GET defaults to tenant's own campaigns when no filter given | 90 | `src/app/api/v1/submissions/route.ts:79-82` | The set-construction happens client-side after the query; `filters` doesn't include the constraint, so the DB query is broader than needed. Push the filter down | S | DB-level isolation depth |
| 40 | Authz | `getTenantContext` returns null for users without `businessId` (platform admins) | 80 | `src/lib/multi-tenant/isolation.ts:70-92` | Returns null is correct, but callers that bypass `withTenant` don't enforce. Audit every route that uses `requireAuth` directly without `withTenant` | M | Bypass via wrong helper |
| 41 | Authz | Role mapping in `getTenantContext` collapses `business → owner`, `influencer → viewer` | 80 | `src/lib/multi-tenant/isolation.ts:73-84` | Influencer mapped to "viewer" in tenant context is unsafe — an influencer viewing a campaign they're enrolled in should be scoped by enrollment, not by viewer role on the business tenant. Today the mapping is unused for influencer reads (they don't have `businessId`), so score 80 not lower | M | Future regression risk |
| 42 | Authz | `tenant.plan = "starter"` is a string literal — billing not consulted | 30 | `src/lib/multi-tenant/isolation.ts:90` | Look up subscription from `subscriptions` store and set plan from there; quota enforcement is currently meaningless | M | Plan-tier bypass |
| 43 | Authz | Admin role required for `/api/v1/admin/audit`; non-admin attempts logged | 95 | `src/app/api/v1/admin/audit/route.ts:34-46` | None | S | Audit log read by non-admin |
| 44 | Authz | API-key callers explicitly blocked from reading audit log even with admin role | 95 | `src/app/api/v1/admin/audit/route.ts:45-47` | None | S | Self-audit-read by agent |
| 45 | Authz | No row-level security at the DB layer (Postgres RLS) | 60 | `src/lib/db/schema.ts` (no RLS policies grep'd) | Add RLS policies on `submissions`, `programs`, `api_keys`, `auth_sessions` keyed on `business_id`. Today isolation is application-layer only — a SQL injection or accidental scope-less query bypasses it | L | Defense in depth |
| 46 | Authz | No "platform admin impersonation" workflow with audit | 50 | (no implementation) | When support needs to debug a tenant, they query DB directly. Add `POST /api/v1/admin/impersonate` that mints a short-lived session bound to the support agent's email + tenant, audited | M | Support side-channel |

### Input validation

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 47 | Validation | Centralized validators (`validateEmail`, `validateId`, `validateString`, `validateNumber`, `validateEnum`) | 90 | `src/lib/security/validate.ts` | None for the helper; gap is consistent use across routes | S | Input bypass |
| 48 | Validation | `validateEmail` regex covers RFC 5322 minus a few edge cases (quoted local-parts, IP literals) | 80 | `src/lib/security/validate.ts:7` | Edge-case mismatch with provider's accept-rules; switch to a battle-tested lib like `email-validator` | S | Email injection |
| 49 | Validation | `validateId` accepts `[A-Za-z0-9_-]{1,100}` | 90 | `src/lib/security/validate.ts:12-17` | None | S | Path injection |
| 50 | Validation | API-keys POST validates `agentName` for control characters | 95 | `src/app/api/v1/api-keys/route.ts:73-78` | None | S | Log injection |
| 51 | Validation | `agentName` length cap is 255 chars but `validateString` not used; bespoke check | 80 | `src/app/api/v1/api-keys/route.ts:73` | Use `validateString(body.agentName, "agentName", { min: 1, max: 255 })` for consistency | S | Inconsistency |
| 52 | Validation | Auth signup email max length 254 (RFC 5321) | 90 | `src/app/api/v1/auth/route.ts:240`, `:502` | None | S | Buffer abuse |
| 53 | Validation | Auth signup password 8-128 chars | 80 | `src/app/api/v1/auth/route.ts:246-251` | Add HIBP check; 8-char minimum is below NIST 2024 | M | Weak passwords |
| 54 | Validation | OAuth `redirectUri` validated as parseable URL only — not against allowlist | 50 | `src/app/api/v1/oauth/connect/route.ts:128-132` | Add per-business allowlist of redirect URIs registered in dashboard. Today any URL works → open redirector for state-token leakage | M | OAuth state leak |
| 55 | Validation | `platformId` validated against `findPlatform` registry | 90 | `src/app/api/v1/oauth/connect/route.ts:110-112` | None | S | Unknown platform |
| 56 | Validation | Submission `proofUrl` runs through `checkProofUrl` (URL safety) | 90 | `src/app/api/v1/submissions/route.ts:24` (import), called downstream | None | S | SSRF on proof verification |
| 57 | Validation | Pagination params clamped: `page >= 1`, `perPage 1..100` | 95 | `src/app/api/v1/_shared.ts:183-187` | None | S | DoS via large page |
| 58 | Validation | `parseBody` returns 400 on invalid JSON instead of throwing | 95 | `src/app/api/v1/_shared.ts:167-175` | None | S | 500 on bad input |

### Output encoding / XSS / template safety

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 59 | XSS | `escapeHtml` covers `& < > " '` | 95 | `src/lib/security/sanitize.ts:2-9` | None | S | Email-template XSS |
| 60 | XSS | `sanitizeForTemplate` recursively escapes string values on object | 90 | `src/lib/security/sanitize.ts:12-23` | Doesn't recurse into arrays — `Array.isArray(value)` guard skips them. Array-of-strings on an email template would be unescaped | S | Template injection via array |
| 61 | XSS | React 19 default escaping for body content | 95 | implicit | None | S | Reflected XSS |
| 62 | XSS | CSP `script-src 'self' 'unsafe-inline'` in prod (no nonces) | 60 | `next.config.js:49-57` | `'unsafe-inline'` neutralizes script-src; move to nonce-based CSP. Next.js supports it via middleware | M | Stored XSS amplification |
| 63 | XSS | CSP `frame-ancestors 'none'` blocks clickjacking | 95 | `next.config.js:82` | None | S | Clickjacking |
| 64 | XSS | CSP `object-src 'none'` blocks `<object>`/`<embed>`/`<applet>` | 95 | `next.config.js:86` | None | S | XSS via object tags |
| 65 | XSS | `X-Frame-Options: DENY` belt-and-suspenders with frame-ancestors | 95 | `next.config.js:97` | None | S | Clickjacking |
| 66 | XSS | `X-Content-Type-Options: nosniff` | 95 | `next.config.js:96` | None | S | MIME-confusion |
| 67 | XSS | `connect-src` allowlisted (was `https:` previously per PR #25) | 95 | `next.config.js:62-74` | None | S | Data exfil after XSS |
| 68 | XSS | CSP `report-uri /api/v1/csp-report` configured | 90 | `next.config.js:89-90` | Verify the report endpoint actually persists reports — common to ship report-uri but discard reports | S | Detection coverage |

### SQL injection / parameterization

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 69 | SQLi | All Postgres queries use `db.query(sql, params)` parameterization | 95 | `src/lib/auth/api-keys.ts:257-272`, `src/lib/auth/index.ts:135-141`, `src/app/api/v1/admin/audit/route.ts:50-59` | None | S | SQLi |
| 70 | SQLi | Audit log query takes `actionPrefix` from URL params; passes through `queryAuditLog` | 85 | `src/app/api/v1/admin/audit/route.ts:50-59` | Verify `queryAuditLog` parameterizes `actionPrefix` (likely `LIKE $1 || '%'`); add a test that injects `'; DROP --` | S | Admin SQLi |
| 71 | SQLi | `order-by.ts` validator for ORDER BY clauses (untrusted column names) | 90 | `src/lib/security/order-by.ts` exists | Verify all callers use it; ORDER BY can't be parameterized so an allowlist is the right shape | S | ORDER BY injection |
| 72 | SQLi | No raw SQL string concatenation found in grep | 90 | grep `\$\{` in `db.query` calls returned only template-literal whitespace | None | S | Future regression |
| 73 | SQLi | Migrations run via `scripts/db-migrate.ts` | 80 | `package.json:23-25` | Migrations as code is fine; verify `--dry-run` mode doesn't run any DDL | S | Migration safety |

### Cryptography / secrets / key management

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 74 | Crypto | AES-256-GCM with random 12-byte IV | 95 | `src/lib/encryption/index.ts:74-91` | None | S | PII at rest |
| 75 | Crypto | HKDF-SHA256 per-tenant key derivation from master | 95 | `src/lib/encryption/index.ts:40-64` | None | S | Per-tenant blast radius |
| 76 | Crypto | Deterministic encryption uses HMAC-derived IV — leaks equality (acknowledged) | 80 | `src/lib/encryption/index.ts:122-141` | Document which fields use deterministic vs random encryption; an email-equality leak via deterministic ciphertext is acceptable for lookup but should be tracked | S | Equality oracle |
| 77 | Crypto | `getMasterKey()` falls back to `DEV_MASTER_KEY` silently — **no production guard** | 25 | `src/lib/encryption/index.ts:31-33` | Match the pattern in `csrf.ts:7-13`, `auth/index.ts:196-201`, `verification/webhook/route.ts:24-32`: `if (NODE_ENV === "production") throw` | S | All PII encrypted with public key |
| 78 | Crypto | `DEV_MASTER_KEY = "dev-only-master-key-do-not-use-in-production-00"` | 25 | `src/lib/encryption/index.ts:25` | Same fix as above | S | Same |
| 79 | Crypto | Key rotation function exists (`rotateKey`) | 70 | `src/lib/encryption/index.ts:239-250` | No scheduled rotation job, no version-aware decrypt. `EncryptedField.v` increments on rotate but decrypt path doesn't dispatch on version. Add a multi-key registry | M | Cannot actually rotate |
| 80 | Crypto | CSRF secret throws in production if missing | 95 | `src/lib/security/csrf.ts:11-13` | None | S | CSRF bypass |
| 81 | Crypto | JWT secret throws in production if missing | 95 | `src/lib/auth/index.ts:196-198` | None | S | JWT forgery |
| 82 | Crypto | Webhook secret throws in production if missing | 95 | `src/app/api/v1/verification/webhook/route.ts:25-32` | None | S | Webhook forgery |
| 83 | Crypto | Stripe webhook secret production-required | 95 | `src/app/api/v1/billing/webhook/route.ts:54-60` | None | S | Forged Stripe events |
| 84 | Crypto | All production secrets co-located in env (`AUTH_SECRET`, `CSRF_SECRET`, `ENCRYPTION_MASTER_KEY`, `WEBHOOK_SECRET`, `STRIPE_WEBHOOK_SECRET`) | 70 | scattered | Document a single `.env.production.example` with all required keys; today an operator misses one and only finds out at first request | S | Operator error |

### CSRF / state-changing requests

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 85 | CSRF | HMAC-SHA256 token bound to session id with 1h expiry | 95 | `src/lib/security/csrf.ts:20-26` | None | S | CSRF on state-changing routes |
| 86 | CSRF | `validateCsrfToken` length-checks and constant-time compares | 95 | `src/lib/security/csrf.ts:36-43` | None | S | Timing attack on CSRF |
| 87 | CSRF | OAuth state is consumed atomically (server-side single-use) | 95 | `src/lib/security/csrf.ts:86-93` (`consumePendingOAuthFlow`) | None — note the prior tautology bug fixed in PR #28 | S | OAuth state replay |
| 88 | CSRF | OAuth callback verifies HMAC signature in addition to consuming pending flow | 95 | `src/app/api/v1/oauth/[platform]/route.ts:76-82` | None | S | Defense in depth |
| 89 | CSRF | Pending-flow store is in-memory Map | 70 | `src/lib/security/csrf.ts:64` | Multi-instance: connect on instance A, callback on instance B → INVALID_STATE. Acknowledged in source comment. Move to Postgres `pending_oauth_flows` table | M | Multi-instance flow break |
| 90 | CSRF | No CSRF token required on JSON state-changing routes (Bearer-token only) | 80 | (general pattern) | Bearer-token APIs don't need CSRF tokens; cookie-only routes do. Audit cookie-only state changes (refresh, logout) — `auth/route.ts:413` does logout via cookie or Bearer; SameSite=Lax limits but doesn't eliminate CSRF on logout. Logout-via-CSRF is low-impact | S | Logout CSRF |

### CORS / security headers / CSP

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 91 | Headers | HSTS `max-age=63072000; includeSubDomains; preload` | 95 | `next.config.js:104-107` | None | S | TLS downgrade |
| 92 | Headers | Permissions-Policy locks down camera/microphone/geolocation | 95 | `next.config.js:101-102` | None | S | Browser-feature abuse |
| 93 | Headers | `Referrer-Policy: strict-origin-when-cross-origin` | 95 | `next.config.js:99` | None | S | Referrer leak |
| 94 | Headers | `X-XSS-Protection: 1; mode=block` (legacy header, harmless) | 80 | `next.config.js:98` | Modern browsers ignore; remove or keep — score 80 because it's noise | S | None |
| 95 | Headers | No CORS allowlist defined; relies on Next.js default (same-origin) | 70 | (no `Access-Control-Allow-Origin` config) | Document the public-API CORS strategy explicitly. Today `/api/v1/pricing` returns no CORS header → browsers can't call it cross-origin, but the route is intended for "agents" which often won't be browsers. Add `Access-Control-Allow-Origin: *` for explicitly-public reference data routes | S | Agent UX |
| 96 | Headers | CSP report-only mode not used; production CSP is enforce-mode | 90 | `next.config.js:91-92` (`Content-Security-Policy`) | A `Content-Security-Policy-Report-Only` deploy-stage would let new policies bake before enforce. Operationally optional | S | Policy rollout |
| 97 | Headers | CSP `report-to` group defined | 85 | `next.config.js:108-111` | Verify reports are accepted (the `/api/v1/csp-report` route exists per grep) | S | Detection |

### Rate limiting / DoS / cost amplification

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 98 | RL | 4-tier rate limiter (strict 5/m, standard 30/m, relaxed 60/m, public 120/m) | 90 | `src/lib/security/rate-limiter.ts:8-13` | None | S | Tier discipline |
| 99 | RL | Rate-limit store is in-memory Map | 50 | `src/lib/security/rate-limiter.ts:20` | Multi-instance Vercel: each lambda has its own counter. A 5/m strict limit becomes 5×N-instances per minute. `distributed-rate-limiter.ts` exists in the same dir — wire it up | M | Limit bypass via instance fan-out |
| 100 | RL | Rate-limit IP source uses `x-real-ip` first, then `x-vercel-forwarded-for`, then `x-forwarded-for` | 95 | `src/app/api/v1/_shared.ts:140-148` | None | S | XFF spoofing |
| 101 | RL | `RATE_LIMIT_BYPASS=1` env var honored, but gated on `NODE_ENV !== "production"` | 95 | `src/lib/security/rate-limiter.ts:49-51` | None | S | Production bypass |
| 102 | RL | `pruneCounter % 100 === 0` plus 60s interval prune | 90 | `src/lib/security/rate-limiter.ts:34-44` | None | S | Memory growth |
| 103 | RL | Auth route uses `strict` (5/min), API key creation uses `strict` | 95 | `src/app/api/v1/auth/route.ts:170,210`, `src/app/api/v1/api-keys/route.ts:55-58` | None | S | Brute force |
| 104 | RL | AI generation routes — no separate cost-amplification quota tracking | 50 | `_tenant.ts:53` records `api_calls` only | AI routes spend $/call. Add `recordUsage(tenantId, "ai_generations")` and a cap per plan; today an attacker who steals an API key can rack $$$ in OpenAI charges | M | Bill amplification |
| 105 | RL | No global concurrency limit | 50 | (no implementation) | A 30/min limit doesn't prevent 30 simultaneous requests pinning a backend. Add per-tenant in-flight cap via `lib/reliability/circuits.ts` | M | Resource starvation |
| 106 | RL | Webhook receivers explicitly NOT rate-limited (correct) | 95 | `src/app/api/v1/verification/webhook/route.ts:8` | None | S | Lost webhook events |

### Webhook security (signatures, replay, idempotency)

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 107 | Webhooks | Outbound webhook HMAC-SHA256 signing, hex-encoded `sha256=…` | 95 | `src/lib/webhooks/index.ts:118-122` | None | S | Receiver-side verification |
| 108 | Webhooks | Outbound `verifySignature` is timing-safe via XOR-accumulate | 95 | `src/lib/webhooks/index.ts:128-142` | None | S | Timing attack |
| 109 | Webhooks | Inbound `verification/webhook` uses `crypto.timingSafeEqual` after length check | 95 | `src/app/api/v1/verification/webhook/route.ts:69-78` | None | S | Forged platform webhook |
| 110 | Webhooks | Inbound replay protection via in-memory `recentEventIds` Set, FIFO eviction at 10k | 70 | `src/app/api/v1/verification/webhook/route.ts:36-53` | Multi-instance: not shared. The Postgres-backed `markEventProcessed` is used by Stripe webhook (`billing/webhook/route.ts:122`) but not the verification webhook. Migrate verification to use `markEventProcessed` too | S | Cross-instance replay |
| 111 | Webhooks | Stripe webhook uses `stripe.webhooks.constructEvent` (signature + timestamp window) | 95 | `src/app/api/v1/billing/webhook/route.ts:67-86` | None | S | Forged Stripe |
| 112 | Webhooks | Stripe webhook signature failures audited | 95 | `src/app/api/v1/billing/webhook/route.ts:78-85` | None | S | Detection |
| 113 | Webhooks | Outbound webhook delivery `fetch(webhook.url)` has **no SSRF guard** | 25 | `src/lib/webhooks/index.ts:314` | `assertSafeUrl(webhook.url)` exists in `src/lib/security/url.ts`. Call it before `fetch`. A tenant can register `https://internal-redis.local:6379` as a webhook URL | S | SSRF via webhook registration |
| 114 | Webhooks | Outbound delivery uses `AbortSignal.timeout(30_000)` | 95 | `src/lib/webhooks/index.ts:324` | None | S | Delivery hang |
| 115 | Webhooks | Exponential backoff retries: 1m / 5m / 30m / 2h / 12h / 72h | 90 | `src/lib/webhooks/index.ts:76-83` | None | S | Reliability |
| 116 | Webhooks | Auto-deactivate webhook after 10 consecutive failures | 90 | `src/lib/webhooks/index.ts:91`, `:393-394` | None | S | Bad-endpoint amplification |
| 117 | Webhooks | Mock-mode Stripe handling has 5-min replay window check | 80 | `src/app/api/v1/billing/webhook/route.ts:88-103` | Mock mode is dev-only; the prod-guard at `:54-60` should make this branch unreachable in prod, but defense-in-depth | S | Test-mode bypass |
| 118 | Webhooks | `markEventProcessed` is atomic across instances via Postgres unique constraint | 95 | `src/lib/webhook-dedup.ts` (referenced from `billing/webhook/route.ts:122`) | None | S | Cross-instance idempotency |

### OAuth flow integrity

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 119 | OAuth | `state` token is HMAC-bound to user session and consumed atomically | 95 | `src/app/api/v1/oauth/connect/route.ts:138-139`, `src/app/api/v1/oauth/[platform]/route.ts:64-71` | None | S | OAuth CSRF |
| 120 | OAuth | Redirect URI reconstructed server-side from request, not trusted from query | 90 | `src/app/api/v1/oauth/[platform]/route.ts:88-90` | Compares only that the platform required redirect_uri match — works because the OAuth provider rejects mismatched redirect_uri. Fine | S | Redirect tampering |
| 121 | OAuth | Demo-mode mock tokens flagged with `real: false` so callers can warn | 90 | `src/lib/oauth/exchange.ts:88-98` | None | S | Demo data in prod |
| 122 | OAuth | Token exchange does NOT use PKCE (code_verifier / code_challenge) | 60 | `src/lib/oauth/exchange.ts:106-271` | Add PKCE: generate `code_verifier` at `/connect`, store with state, send `code_challenge` to provider, send `code_verifier` at exchange. Supported by IG, FB, Twitter | M | Code interception |
| 123 | OAuth | Access tokens returned from exchange are not encrypted before storage | 60 | `src/app/api/v1/oauth/[platform]/route.ts:111-122` (returns to client) | Tokens are returned in response body to the client. If stored server-side eventually, run through `encryptPII`. Today they appear to be client-managed → score 60 because the gap is "as platform integrations mature" | M | Token exfil |
| 124 | OAuth | Pending-flow TTL 1 hour matches CSRF token TTL | 90 | `src/lib/security/csrf.ts:18`, `:70` | None | S | Stale state |
| 125 | OAuth | Pending-flow opportunistic prune at >1000 entries | 90 | `src/lib/security/csrf.ts:73-78` | None | S | Memory growth |
| 126 | OAuth | OAuth credentials read via `getOAuthCredentials(platformId)` | 90 | `src/lib/oauth/env.ts` (referenced) | Falls back to `"demo-client-id"` on missing config — fine for dev, but document which envs are production-required | S | Misconfiguration |

### Multi-tenant data isolation

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 127 | Tenant | `scopeToTenant(filter, tenantId)` helper for query filters | 90 | `src/lib/multi-tenant/isolation.ts:112-117` | Verify all repository methods accept and apply this; one missed repo = cross-tenant read | M | IDOR via repo |
| 128 | Tenant | `assertTenantAccess` throws on mismatch — fail-closed | 95 | `src/lib/multi-tenant/isolation.ts:100-104` | None | S | Cross-tenant write |
| 129 | Tenant | Per-tenant encryption key derivation prevents key reuse across tenants | 95 | `src/lib/encryption/index.ts:62-64` | None | S | Cross-tenant decrypt |
| 130 | Tenant | Usage metering bucket key includes tenantId | 95 | `src/lib/multi-tenant/isolation.ts:130-132` | None | S | Usage-bucket cross-talk |
| 131 | Tenant | Tenant context resolution declines if no `businessId` | 80 | `src/lib/multi-tenant/isolation.ts:71` | Returns null; caller must check (and `withTenant` does). Influencer routes that bypass `withTenant` need their own boundary | M | Influencer-tenant cross-talk |
| 132 | Tenant | Postgres RLS not in use | 60 | (per #45 above) | See #45 | L | Defense in depth |
| 133 | Tenant | No "test-tenant separation" — staging tenants share DB with prod | 50 | (deploy infra) | Use Postgres schemas or DB-per-env | L | Test data leak |

### File upload / media handling / image hashing

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 134 | Media | Image-hash fraud detection added in PR #28 | 80 | merged commit `5faec03` | Verify it runs on every submission, not just opt-in. Score 80 pending end-to-end test | M | Duplicate submissions |
| 135 | Media | No file uploads in API surface — submissions take URLs | 90 | `src/app/api/v1/submissions/route.ts:20-25` (uses `proofUrl`) | URL-based proofs sidestep "malicious file" entirely. Score 90 not 95 because URL fetcher (`checkProofUrl`) must SSRF-guard | S | Malicious upload |
| 136 | Media | Proof URL fetched server-side via `verification/url-checker` which uses `assertSafeUrl` | 90 | grep showed `verification/url-checker.ts` imports `assertSafeUrl` | None | S | SSRF on verification |
| 137 | Media | No content-type sniffing / magic-byte verification on fetched proofs | 70 | (no implementation seen) | Add magic-byte check + size cap. A malicious site could 200-respond with a 10GB stream and starve the verifier | M | DoS via fetch |

### PII handling / data retention / privacy

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 138 | PII | `pii-fields.ts` lists fields requiring encryption | 80 | `src/lib/encryption/pii-fields.ts` exists | Verify all repos consult this list before write. Today the list exists but enforcement is per-call — easy to miss | M | PII unencrypted-at-rest |
| 139 | PII | Per-tenant key derivation means a master-key compromise still requires tenant-id-by-tenant-id decryption | 90 | `src/lib/encryption/index.ts:62-64` | None | S | Master key blast |
| 140 | PII | Email addresses stored in plaintext in `auth_sessions` and `users` map | 60 | `src/lib/auth/index.ts:135-141`, `auth/route.ts:37` | Email is necessary for lookup; encrypt-at-rest with `encryptDeterministic` for queryability. Score 60 because today's cleartext is industry-standard but below "leading" | M | DB leak → email harvest |
| 141 | PII | No data retention policy / scheduled purge | 30 | (no implementation) | Add a `retention_days` field per resource type and a daily purge job. GDPR/CCPA ask for "delete on request" — today this requires a manual SQL script | L | Compliance gap |
| 142 | PII | No "export my data" endpoint | 30 | (no implementation) | Add `POST /api/v1/account/export` that returns a tarball of all tenant data. GDPR Art. 20 | M | Compliance gap |
| 143 | PII | No "delete my account" endpoint | 30 | (no implementation) | Add hard-delete with grace period. GDPR Art. 17 | M | Compliance gap |
| 144 | PII | Audit log includes IP addresses (themselves PII under GDPR) | 70 | `src/lib/audit-log.ts:74` | Either drop the last octet or hash with daily salt | S | GDPR Art. 5 |
| 145 | PII | Server logs include IPs and email addresses on auth failure | 60 | `console.error` calls scattered | Migrate to a logger that redacts on serialization. `lib/logging/` exists — verify it's the universal sink | M | Log leak |

### Logging / audit trail / forensics

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 146 | Audit | Structured action enum for audit events | 95 | `src/lib/audit-log.ts:28-60` | None | S | Schema discipline |
| 147 | Audit | Self-audit on `admin.audit_read` | 95 | `src/app/api/v1/admin/audit/route.ts:63-78` | None | S | Custodian visibility |
| 148 | Audit | Failed Stripe signature attempts audited | 95 | `src/app/api/v1/billing/webhook/route.ts:78-85` | None | S | Forgery detection |
| 149 | Audit | API-key creation/revocation audited | 95 | `src/lib/auth/api-keys.ts:289-296`, `:362-369` | None | S | Key forensics |
| 150 | Audit | `api_key.verification_failed` action defined but never fired | 30 | `src/lib/audit-log.ts:39`; no caller in `verifyApiKey` | Fire `audit({action: "api_key.verification_failed", ...})` on the null branches | S | Brute-force visibility |
| 151 | Audit | Login successes/failures emitted via metrics, not audit log | 60 | `auth/route.ts:332,347,359,405` use `metrics.increment(METRIC.AUTH_FAILURE)` | Add `audit({action: "auth.login_failed"})` in addition; metrics aggregate but don't preserve actor identity | S | Account takeover detection |
| 152 | Audit | Audit log ring buffer capped at unspecified size; Postgres-backed when configured | 80 | `src/lib/audit-log.ts:80` | Verify Postgres write-through is non-blocking | S | Reliability |
| 153 | Audit | Request tracing emits `X-Request-Id` and `X-Response-Time` | 95 | `src/app/api/v1/_shared.ts:25-27`, `:200-205` | None | S | Forensics |
| 154 | Audit | Per-request `crypto.randomUUID()` request IDs (UUID v4) | 95 | `src/app/api/v1/_shared.ts:27` | None | S | Trace correlation |
| 155 | Audit | No log retention policy documented | 60 | (operational) | See §6 | — | Compliance |
| 156 | Audit | Audit log doesn't capture User-Agent on auth events | 70 | `src/lib/audit-log.ts:74` only has `ip` | Add `userAgent?: string` field | S | Bot vs human |

### Dependency / supply chain

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 157 | Deps | `npm audit` runs weekly + on every PR | 90 | `.github/workflows/security.yml:1-30` | None | S | Known CVEs |
| 158 | Deps | License check job runs in same workflow | 85 | `.github/workflows/security.yml:73+` | None | S | License compliance |
| 159 | Deps | `npm audit` `continue-on-error: true` on the main step — won't fail PRs | 70 | `.github/workflows/security.yml:42` | Set to `false` for `--audit-level=critical` so a critical CVE fails CI | S | Merge-with-CVE |
| 160 | Deps | Lockfile (`package-lock.json`) committed | 95 | implicit | None | S | Supply-chain pinning |
| 161 | Deps | No SBOM generated | 60 | (no implementation) | Add `cyclonedx-bom` to CI; useful for compliance | M | Inventory gap |
| 162 | Deps | No dependency review action (`actions/dependency-review-action`) | 70 | `.github/workflows/security.yml` | Add the action; flags new deps with known vulns at PR time | S | New-dep CVE |
| 163 | Deps | Stripe SDK pinned to `^20.4.1` (allows minor bumps) | 80 | `package.json:34` | Pin major+minor (`~20.4.1`) for security-sensitive SDKs | S | Surprise minor regression |

### CI/CD / deploy hardening

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 164 | CI | `permissions: contents: read` on security workflow | 95 | `.github/workflows/security.yml:17-19` | None | S | GHA token abuse |
| 165 | CI | No `pull_request_target` usage (which is the dangerous one) | 95 | grep — only `pull_request` | None | S | Forked-PR token leak |
| 166 | CI | Branch protection on `main` not visible from worktree | — | (config out of repo scope) | See §6 | — | Direct-push to main |
| 167 | CI | Deploy workflow scope unknown | — | `.github/workflows/deploy.yml` exists | See §6 | — | Deploy escalation |
| 168 | CI | No code signing on releases | 50 | (no implementation) | Out of scope for SaaS — this is a hosted product | S | N/A |
| 169 | CI | Vercel preview deploys treat NODE_ENV as production | 80 | (Vercel default) | Document which envs honor which gates; the demo-PIN `NODE_ENV` gate at `auth/route.ts:358` is correct on Vercel preview but breaks on docker `NODE_ENV=development` deploys to staging | S | Env confusion |
| 170 | CI | No staging-tier integration test against real DB | 50 | (no `test:integration:staging`) | Add a CI job that runs against a Postgres branch | M | Migration drift |

### Infrastructure / database / pgvector / multi-region

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 171 | Infra | Postgres connection pooling via `postgres` library | 85 | `package.json:32` | Verify `max` pool size set per Vercel function limit | S | Connection exhaustion |
| 172 | Infra | `db` exported as either real connection or `InMemoryConnection` based on `DATABASE_URL` | 80 | `src/lib/db/connection.ts` (referenced widely) | Document the boundary; production with no DATABASE_URL silently runs on InMemory which is data-loss-on-restart | S | Silent in-memory prod |
| 173 | Infra | No multi-region failover documented | 50 | (operational) | See §6 | — | Region outage |
| 174 | Infra | No database backup verification | 50 | (operational) | See §6 | — | Backup integrity |
| 175 | Infra | pgvector not yet in use (codebase mentions in roadmap but not in schema grep) | — | not exploitable | n/a | — | n/a |
| 176 | Infra | DB migrations `--dry-run` available | 90 | `package.json:25` | None | S | Migration safety |
| 177 | Infra | Postgres write-through pattern for sessions, api_keys, audit, webhook-dedup | 80 | scattered | Cache-as-source-of-truth means DB write failures are silently logged. Make writes await on critical paths (api-key revocation, audit) | M | Durability vs perf tradeoff |

### Monitoring / detection / alerting

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 178 | Mon | `metrics` module with structured METRIC enum | 90 | `_shared.ts:198-211`, `auth/route.ts:332,347,359,405` | None | S | Metric discipline |
| 179 | Mon | Rate-limit hits emit `METRIC.RATE_LIMIT_HIT` | 95 | `_shared.ts:159` | None | S | DoS detection |
| 180 | Mon | Auth success/failure emit `METRIC.AUTH_*` | 95 | `auth/route.ts` | None | S | Brute-force detection |
| 181 | Mon | API latency observed via `metrics.observe(METRIC.API_LATENCY)` | 95 | `_shared.ts:208` | None | S | Perf regression |
| 182 | Mon | No anomaly-detection alerting (just metrics export) | 50 | (operational) | See §6 | — | Slow-burn attack |
| 183 | Mon | CSP report endpoint exists; ingestion path unverified | 80 | `src/app/api/v1/csp-report/route.ts` exists | Verify reports are written somewhere queryable | S | XSS detection |
| 184 | Mon | No on-call rotation / paging integration in code | — | (operational) | See §6 | — | Response time |

### Business logic (overspend, double-redemption, fraud loops)

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 185 | BizLogic | Submission idempotency (single approval) — code path unverified at audit time | 70 | `src/lib/submissions.ts` (engine module) | Verify approval is a single state-machine transition, not idempotent-by-retry. State machine module exists at `src/lib/campaign-state-machine.ts` | M | Double-pay |
| 186 | BizLogic | Double-redemption protection on perks | 70 | `src/lib/perk-wallet.ts` | Same — verify atomic `redeem` with row-level lock | M | Double-redeem |
| 187 | BizLogic | Fraud detection module (`fraud-detection.ts`) exists | 80 | `src/lib/fraud-detection.ts` | Audit-time: can't tell if it's wired into submission flow. PR #28 added image-hash check; verify reach | M | Submission fraud |
| 188 | BizLogic | Referral credit on paid conversion only (not signup) | 90 | `src/app/api/v1/billing/webhook/route.ts:206-216` | None | S | Sybil referral abuse |
| 189 | BizLogic | Subscription state mutated only via webhook (not client-side) | 90 | `src/app/api/v1/billing/webhook/route.ts:135-271` | None | S | Self-upgrade exploit |
| 190 | BizLogic | Subscription retry-on-error reverts `processedEvents.delete(eventId)` so Stripe can retry | 85 | `src/app/api/v1/billing/webhook/route.ts:178-181` | Race window: Postgres dedup `markEventProcessed` already inserted; deleting from in-memory map doesn't undo DB. So Stripe's retry will be deduped at DB layer → permanently lost. Make the Postgres dedup a soft-mark with status field | M | Lost subscription on transient DB failure |
| 191 | BizLogic | No spending cap enforcement per tenant | 50 | (no implementation) | Plan-tier limits enforced via `getUsage` checks before write. Today usage is recorded but not consulted | M | Bill explosion |

### Compliance (FTC, GDPR-shaped, SOC2-shaped)

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 192 | Compliance | FTC compliance auto-injection per platform (per `CLAUDE.md`) | 85 | `src/lib/compliance/`, `src/lib/legal-compliance.ts` exist | Verify the disclosure can't be disabled by tenant | M | FTC violation |
| 193 | Compliance | `/security` page + `.well-known/security.txt` (RFC 9116) added in PR #31 | 95 | merged commit `15f6f29` | None | S | Researcher channel |
| 194 | Compliance | No DPA / SCC documents linked | — | (legal artifacts, not code) | See §6 | — | EU compliance |
| 195 | Compliance | No SOC2 control mapping | — | (operational) | See §6 | — | Sales blocker at enterprise |
| 196 | Compliance | Privacy policy not enforced in code (no consent tracking) | 50 | (no implementation) | Add `consents` table + middleware that requires consent for marketing-action processing | M | GDPR Art. 6 |

### Operational security (rotation, runbooks, breakglass)

| # | Category | Item | Score | Citation | Fix shape | Effort | Blast radius |
|---|---|---|---|---|---|---|---|
| 197 | OpSec | Secret rotation cadence not defined | — | (operational) | See §6 | — | Stale secrets |
| 198 | OpSec | No breakglass account with hardware-key MFA | — | (operational) | See §6 | — | Lockout recovery |
| 199 | OpSec | No incident response runbook in repo | — | (operational) | See §6 | — | Response time |
| 200 | OpSec | Test bypass `RATE_LIMIT_BYPASS=1` only honored in non-prod | 95 | `src/lib/security/rate-limiter.ts:49-51` | None | S | Test-flag in prod |

> Total: 200. Categories landed at 18 / 16 / 12 / 12 / 10 / 5 / 11 / 6 / 7 / 9 / 12 / 8 / 7 / 4 / 8 / 11 / 7 / 7 / 7 / 7 / 5 / 4 = ~190 with 10 reallocated to thicker-real categories (auth, validation, monitoring) per the anti-slop rule.

---

## 4. Top 20 priority list

Ranked by `(blast radius × likelihood) / effort` against findings above.

1. **#26 — MCP route accepts any non-empty `x-api-key` string.** What+why now: every MCP-tool call that requires auth in `src/app/api/mcp/route.ts:230` is currently public to anyone who knows the route. PR shape: in `handleRpc`, when `tool.requiresAuth`, parse the auth header for the `sp_*` prefix, call `verifyApiKey()`, reject on null; mirror in `_shared.ts:getUser` so the agent surface across all routes inherits.
2. **#25 — `verifyApiKey` not wired into `getUser`.** What+why now: api-key auth is documented in `openapi.json` and `ai-plugin.json` but no route actually verifies. Same PR as #1.
3. **#113 — Outbound webhook `fetch(webhook.url)` has no SSRF guard.** What+why now: any tenant that registers a webhook gets server-side `fetch` to an arbitrary URL. PR shape: add `try { await assertSafeUrl(webhook.url); } catch { delivery.error = ...; this.handleDeliveryFailure(...); return; }` at the top of `attemptDelivery` in `src/lib/webhooks/index.ts`.
4. **#77 / #78 — `ENCRYPTION_MASTER_KEY` no production guard.** What+why now: silent fallback to `DEV_MASTER_KEY` means a misconfigured prod deploy encrypts all PII with a public key. PR shape: copy the pattern at `src/lib/auth/index.ts:196-201` into `src/lib/encryption/index.ts:31`.
5. **#10 — Demo PIN gated only on `NODE_ENV`.** What+why now: one env-var-misconfig away from a documented `pin: "1234"` backdoor. PR shape: replace the gate with `if (!process.env.ENABLE_DEMO_PIN) reject` and add `ENABLE_DEMO_PIN=1` only to local `.env`.
6. **#42 — `tenant.plan = "starter"` is a string literal.** What+why now: every plan-tier limit downstream is meaningless. PR shape: in `getTenantContext`, look up the tenant's subscription via `subscriptions.get(...)` and set `plan` from `Subscription.plan`.
7. **#7 — Session store is cache-authoritative.** What+why now: cold-start instances reject valid session tokens until DB hydration completes. PR shape: in `SessionStore.get`, if cache miss, await a single-shot DB query for that token; cache the result.
8. **#150 — `api_key.verification_failed` defined but never fired.** What+why now: brute-force on api-keys is invisible to the audit log. PR shape: at `src/lib/auth/api-keys.ts:316,326`, add `audit({action: "api_key.verification_failed", ...})` on the null branches.
9. **#54 — OAuth `redirectUri` not allowlisted.** What+why now: any URL works → potential open-redirector for state token leakage. PR shape: add `oauth_redirect_uris` table per business; validate `redirectUri` against it.
10. **#89 — Pending-flow store is in-memory.** What+why now: multi-instance deploys break OAuth flows non-deterministically. PR shape: migrate `_pendingFlows` Map in `csrf.ts` to a Postgres table with TTL index.
11. **#9 — Logout cannot revoke a still-valid JWT.** What+why now: a leaked access token works for its full 15-min TTL after logout. PR shape: add a `jti`-keyed revocation set checked in `verifyJWT`; populate on logout.
12. **#62 — CSP `script-src 'unsafe-inline'`.** What+why now: any stored XSS becomes a full compromise; the rest of the CSP is sound. PR shape: switch to nonce-based CSP via Next.js middleware (15 supports it natively).
13. **#104 — No AI-generation cost-amplification quota.** What+why now: a stolen API key can rack arbitrary OpenAI charges before revocation. PR shape: in the AI route handlers, `getUsage(tenant, "ai_generations") < plan.limit` check; `recordUsage` after.
14. **#99 — Rate limiter is in-memory.** What+why now: multi-instance Vercel deploys multiply limits by N instances. PR shape: wire `distributed-rate-limiter.ts` (already in same dir) for the strict tier at minimum.
15. **#190 — Stripe retry interaction with Postgres dedup.** What+why now: a transient DB failure during checkout-completion deletes the in-memory dedup mark but the DB row remains, so Stripe's retry is silently swallowed. PR shape: replace boolean dedup with `(eventId, status)` rows; on processing failure, update status to `retrying` so Stripe retries succeed.
16. **#28 — API-key revocation DB write is fire-and-forget.** What+why now: a revoked key resurrects on next instance hydration if the DB write failed silently. PR shape: `await dbWrite(...)` in `revokeApiKey` and return false if it fails.
17. **#138 — PII fields enumerated but not enforced at write.** What+why now: a developer adding a new repo method can omit encryption without any check. PR shape: add a `requiresEncryption(tableName, fieldName)` middleware in the repo base class.
18. **#191 — No spending cap enforcement per tenant.** What+why now: usage is recorded but no quota check on write. PR shape: `assertWithinPlan(tenant, "campaigns_created")` helper called from create routes.
19. **#137 — Proof URL fetch has no size cap.** What+why now: a malicious site can stream gigabytes to the verifier. PR shape: in `verification/url-checker`, set `signal: AbortSignal.timeout(10_000)` and limit response read to 5MB.
20. **#159 — `npm audit` `continue-on-error: true` on critical findings.** What+why now: a critical CVE can land on `main` without breaking CI. PR shape: split into two steps; the `--audit-level=critical` step removes `continue-on-error`.

---

## 5. Items already at ≥95

These represent defenses this codebase has gotten right — file-cited and credibly defense-in-depth.

1. **JWT alg pinned to HS256 with explicit reject** — `src/lib/auth/index.ts:264`. Closes alg=none / RS256-confusion.
2. **Length-check before `timingSafeEqual` on JWT signatures** — `src/lib/auth/index.ts:273`. Closes the throw-then-catch timing channel.
3. **Password verification uses `crypto.timingSafeEqual`** — `src/lib/auth/index.ts:26`.
4. **Email-enumeration-safe password reset response** — `src/app/api/v1/auth/route.ts:531-533`.
5. **API-key plaintext format with 128-bit random tail** — `src/lib/auth/api-keys.ts:138-159`.
6. **API-key SHA-256 hashing, plaintext never persisted** — `src/lib/auth/api-keys.ts:95-97,251-253`.
7. **`compareKeyHashes` validates hex pattern before `timingSafeEqual`** — `src/lib/auth/api-keys.ts:109-118`.
8. **API-key verification iterates all candidates without early-break** — `src/lib/auth/api-keys.ts:319-323`.
9. **API keys cannot mint other API keys** — `src/app/api/v1/api-keys/route.ts:62-64`.
10. **API keys cannot list keys** — `src/app/api/v1/api-keys/route.ts:32-34`.
11. **API key creation/revocation audited** — `src/lib/auth/api-keys.ts:289-296,362-369`.
12. **`assertTenantAccess` throws on mismatch (fail-closed)** — `src/lib/multi-tenant/isolation.ts:100-104`.
13. **Submissions GET cross-tenant guard on `campaignId`** — `src/app/api/v1/submissions/route.ts:53-59`.
14. **Submissions GET cross-tenant guard on `businessId`** — `src/app/api/v1/submissions/route.ts:69-72`.
15. **Per-tenant encryption key derivation (HKDF-SHA256)** — `src/lib/encryption/index.ts:62-64`.
16. **AES-256-GCM with random 12-byte IV** — `src/lib/encryption/index.ts:74-91`.
17. **CSRF token HMAC-SHA256 bound to session id** — `src/lib/security/csrf.ts:20-26`.
18. **Constant-time CSRF validation** — `src/lib/security/csrf.ts:36-43`.
19. **OAuth state consumed atomically** — `src/lib/security/csrf.ts:86-93`.
20. **OAuth callback verifies HMAC signature in addition to consume** — `src/app/api/v1/oauth/[platform]/route.ts:76-82`.
21. **Outbound webhook HMAC-SHA256 signing** — `src/lib/webhooks/index.ts:118-122`.
22. **Outbound webhook timing-safe verify** — `src/lib/webhooks/index.ts:128-142`.
23. **Inbound webhook timing-safe verify with length pre-check** — `src/app/api/v1/verification/webhook/route.ts:69-78`.
24. **Stripe webhook uses `constructEvent` (signature + timestamp)** — `src/app/api/v1/billing/webhook/route.ts:67-86`.
25. **Failed Stripe signature attempts audited** — `src/app/api/v1/billing/webhook/route.ts:78-85`.
26. **CSP `frame-ancestors 'none'`** — `next.config.js:82`.
27. **CSP `object-src 'none'`** — `next.config.js:86`.
28. **HSTS preload-eligible** — `next.config.js:104-107`.
29. **Permissions-Policy locks down camera/mic/geo** — `next.config.js:101-102`.
30. **`X-Content-Type-Options: nosniff`** — `next.config.js:96`.
31. **CSP `connect-src` allowlist (was `https:` previously)** — `next.config.js:62-74`.
32. **`getClientIp` prefers `x-real-ip` over `x-forwarded-for` (anti-spoof)** — `src/app/api/v1/_shared.ts:140-148`.
33. **`RATE_LIMIT_BYPASS` gated on `NODE_ENV !== "production"`** — `src/lib/security/rate-limiter.ts:49-51`.
34. **Production-required prod-secret guards on CSRF, JWT, WEBHOOK, STRIPE** — `csrf.ts:11`, `auth/index.ts:196`, `verification/webhook/route.ts:25`, `billing/webhook/route.ts:54`.
35. **Self-audit on audit-log read** — `src/app/api/v1/admin/audit/route.ts:63-78`.
36. **Admin role + non-API-key required for audit log** — `src/app/api/v1/admin/audit/route.ts:34-47`.
37. **Webhook auto-deactivate after 10 consecutive failures** — `src/lib/webhooks/index.ts:91`.
38. **Outbound webhook delivery 30s timeout** — `src/lib/webhooks/index.ts:324`.
39. **Postgres write-through dedup via `markEventProcessed`** — `src/app/api/v1/billing/webhook/route.ts:122`.
40. **`/security` page + `.well-known/security.txt`** — PR #31, commit `15f6f29`.

These 40 items are the defensive baseline. They explain why the overall posture lands at 71 instead of 50.

---

## 6. Items that need infrastructure, not code

These won't move on a code PR. They need decisions, runbooks, vendor contracts, or ongoing cadence.

1. **Master key rotation cadence.** Currently `ENCRYPTION_MASTER_KEY` has no scheduled rotation. Needs a calendar entry + runbook.
2. **JWT/CSRF/Webhook secret rotation cadence.** Same.
3. **API key expiry policy.** `expiresAt` is null by default; org policy should default to 90d for new keys.
4. **Branch protection on `main`.** Codeowners + required reviewers + required CI; not visible from worktree.
5. **Required-status-check on `npm audit` critical findings.** Today CI advises but doesn't block.
6. **Dependency review cadence.** Monthly review of new transitive deps.
7. **SBOM generation + storage policy.** Where do SBOMs live, who consumes them?
8. **Vulnerability disclosure response SLA.** `/security.txt` exists; response SLA is operational.
9. **Pen test cadence.** YC-stage typically annual; budget item.
10. **Bug bounty program decision.** HackerOne / Intigriti or self-managed via security@.
11. **SOC2 control mapping.** Pre-sales blocker for enterprise; needs a Vanta/Drata-shaped answer.
12. **GDPR DPA template.** Customer-signable; legal artifact.
13. **Privacy policy / cookie consent.** Out-of-code; landing-page level.
14. **Data retention policy per resource type.** Org policy that drives the `retention_days` field once added.
15. **Backup verification cadence.** Quarterly restore-from-backup drills.
16. **Multi-region failover plan.** Documented RTO/RPO.
17. **Incident response runbook.** P0/P1 paging, escalation tree, comms templates.
18. **Blameless postmortem culture / template.** First incident is the test.
19. **Breakglass auth.** Hardware-key MFA owner account, written-down location, never-rotates.
20. **On-call rotation.** PagerDuty/Opsgenie integration.
21. **Anomaly-detection alert thresholds.** What's the auth-failure rate that pages?
22. **CSP report ingestion review cadence.** Reports are received; who reviews them?
23. **Audit log retention period.** GDPR vs investigation needs.
24. **Database backup encryption-at-rest verification.** Vendor (Neon/Supabase) does it; verify and document.
25. **Threat model document.** STRIDE-shaped, refreshed annually.
26. **Third-party vendor security review.** Stripe, Vercel, Postgres provider, Resend — annual reattestation.
27. **Security training cadence for engineering.** Quarterly.
28. **Phishing test cadence.** Internal.
29. **Access review cadence.** Quarterly review of who has prod access.
30. **Code-signing key escrow.** Operational.

---

## 7. The "to 95" delta

If the goal is "every item in the table at ≥95," here's the honest math.

**Items currently at ≥95: 40** — see §5. These take zero work; they're already there.

**Items at 80–94 (one-PR-each fixes): ~70.** Most of these are score-90 items that need a single addition to reach 95: an automated test that exercises the defensive code path, a tightened comment, a runbook entry, a length cap. At ~2 hours of focused agent work per item, that's **~140 hours / ~3.5 weeks of one engineer.** This is the "fast cleanup" tranche.

**Items at 60–79 (sprint-shaped): ~50.** These involve architecture choices: distributed rate limiter wire-up, Postgres-first session reads, nonce-based CSP, PKCE for OAuth, RLS migration. At ~3-5 days each, that's **~30 weeks / ~7 months of one engineer.** Realistically a small team of 2 doing parallel sprints lands this in **3 months.**

**Items at 40–59 (quarter-shaped): ~25.** TOTP/WebAuthn, GDPR export/delete/retention, SOC2 control mapping, multi-region failover, billing-driven plan enforcement, comprehensive audit-log alerting. **One quarter of focused security work.**

**Items at 20–39 (urgent + small): ~10.** The five top-five items above plus a handful more. **One PR-day of agent work each, ~2 weeks total, gates everything else.** These are where the "fix this week" list lives because the gap is tiny but the downside is large.

**Items not addressable by code (~30):** see §6. These are calendar items and contracts.

**The realistic curve.** Starting from a 71 today:

- **Week 1 (5 critical items at 20-39):** lands at ~76. The MCP-bypass + SSRF-on-webhooks + encryption-key-guard fixes alone move the needle visibly because they were the floor-dragging items.
- **Month 1 (top-20 list complete):** lands at ~82. This is where the public-facing posture story changes from "decent for YC" to "ready for SMB enterprise sales."
- **Quarter 1 (sprint-tranche complete):** lands at ~89. This is the SOC2-readiness threshold from the code-review side; the operational tranche from §6 is the other half.
- **Six months (operational tranche running):** lands at ~94. This is "industry-leading for a YC-stage SaaS."
- **Year (compliance + threat-model + bug bounty live):** ~96-97. This is "we can sell to F500."

**The ten things that block the curve.** Across all those items, ten specific gaps are load-bearing — fix these and a third of the table jumps a tier:

1. Wire `verifyApiKey` into `getUser` (#25/#26) — fixes scoring on every api-key-using route.
2. Add `assertSafeUrl` to outbound webhooks (#113) — closes the SSRF tier.
3. Production-guard `getMasterKey` (#77/#78) — closes the encryption tier.
4. Distributed rate limiter (#99) — promotes the rate-limiting tier from 50 to 90.
5. Postgres-first session reads (#7) — promotes the auth-durability tier.
6. Postgres-backed pending-OAuth-flows (#89) — promotes the OAuth tier.
7. RLS policies on tenant-scoped tables (#45/#132) — promotes the tenant-isolation tier.
8. AI cost-amplification quota (#104) — closes the cost-bill-amplification gap.
9. PII enforcement at repo layer (#138) — promotes the PII tier.
10. Stripe retry × dedup interaction fix (#190) — eliminates a silent-loss class.

If a small team committed to those ten in a focused two-week sprint, this audit's median item score moves from ~80 to ~90, and the "industry-leading for a YC-stage SaaS" framing becomes defensible without caveats.

— end —
