---
name: security
description: >-
  Audit the app's runtime security posture: the Content-Security-Policy and
  security headers in next.config.js, rate-limiting coverage on every public
  API route, and dependency CVEs. Use whenever the user mentions security,
  CSP, headers, XSS/clickjacking, unsafe-inline, rate limiting, abuse
  protection, npm audit, vulnerable dependencies, or "is this route
  protected" — even if they never say the word "security".
argument-hint: ""
allowed-tools: Read, Grep, Glob, Bash(npm audit:*)
model: opus
---

# Security posture audit

Rank every finding by **exploitability** (how easily a remote attacker triggers
real harm), not by category. This complements `.github/workflows/security.yml`
(npm audit / license / dependency-review) — don't just re-run those; audit the
app-layer controls CI can't reason about. This audit is also enforced at merge
time via `.github/workflows/launch-gate.yml`.

Remember the real boundary: the frontend never talks to Supabase directly — it
calls `/api/v1/*` route handlers, and the security boundary is **app-layer JWT
auth** (`src/lib/auth`, `requireAuth`), not Supabase RLS. RLS is defense-in-depth
only, so an unauthenticated or unthrottled route handler IS the exposure.

## 1. CSP + security headers (they already exist — audit, don't add)
Headers live in `next.config.js` `headers()` (~line 112). There is no
`middleware.ts`. Read that block and check:
- **CSP**: flag `'unsafe-inline'` / `'unsafe-eval'` in `script-src` (biggest win
  — they neuter XSS protection). Note if `style-src` needs `'unsafe-inline'` and
  whether a nonce/hash would remove it. Check `frame-ancestors`, `default-src`,
  `connect-src` (must allow PostHog/Vercel but nothing wildcard).
- **Presence** of: `X-Frame-Options` (or CSP `frame-ancestors`),
  `Referrer-Policy`, `Permissions-Policy`, `Strict-Transport-Security` (HSTS
  with a real max-age + `includeSubDomains`), `X-Content-Type-Options: nosniff`.
  Flag any missing one and give the exact header line to add.

## 2. Rate-limit coverage on public endpoints
The 4-tier limiter is `src/lib/security/rate-limiter.ts` (strict / standard /
relaxed / public). Enumerate handlers under `src/app/api/v1/**/route.ts` (~92
route files) and verify each **public / unauthenticated** one actually invokes
the limiter (via `rateLimit` in `src/app/api/v1/_shared` or the limiter直接).
Highest priority: auth (`auth/route.ts`), AI routes (`ai/*` — expensive),
billing/webhook, seed, and anything that writes. Flag any public route with no
throttle as a DoS / brute-force / cost-abuse vector.

## 3. Dependency CVEs
!`npm audit --audit-level=high 2>&1 | tail -40`

Summarize only **high/critical** advisories that are reachable from app code
(ignore dev-only/build-only unless exploitable in CI). For each: package, severity,
whether a fix version exists, and the upgrade command.

## Output
Findings table ranked by exploitability: Finding | Location (file:line) | Why
exploitable | Fix. Lead with the single most dangerous gap (e.g. `unsafe-inline`
in `script-src` or an unthrottled auth route). If a category is clean, say so
explicitly so the pass reads as complete rather than skipped.
