# 13 — Security Findings

Re-aggregated from prior security audit notes. Severity scale matches [10-risk-severity-matrix.md](./10-risk-severity-matrix.md).

## Summary

- **1 HIGH** confirmed and fixed.
- **2 MEDIUM** confirmed and fixed.
- **3 MEDIUM** deferred with explicit roadmap entries.
- **2 items** flagged out of scope (real pen test, formal compliance).

The platform is past the "obvious vulnerability" bar. Remaining items are architectural and require investment rather than a hotfix.

## Fixed

### SEC-001 — Health check did not return 503 on DB down (HIGH)
- **Cause**: `/api/v1/health` reported 200 even when the DB connection failed; load balancers and uptime checks couldn't see real outages.
- **Fix**: Health endpoint now probes DB before returning. Returns 503 with structured error when probe fails.
- **Verification**: Point `DATABASE_URL` at a non-responsive host, hit `/api/v1/health`, confirm 503.

### SEC-002 — Unbounded in-memory stores (MEDIUM)
- **Cause**: Rate-limit, session, audit-log Maps grew without bound. Long-running process would OOM under sustained load or attack.
- **Fix**: LRU-bounded with size caps; oldest entries evicted when cap reached. Caps tuned to fit comfortably in Render free-tier 512 MB.
- **Verification**: `k6/auth-stress.js` exercises 100k requests and confirms RSS stabilizes.

### SEC-003 — External fetch calls had no timeout (MEDIUM)
- **Cause**: AI provider, Stripe, OAuth, and webhook receivers all called `fetch` without `AbortSignal.timeout`. Slow upstream could pin request workers indefinitely.
- **Fix**: All outbound calls wrapped with timeouts (5–15s depending on endpoint).
- **Verification**: Code review for any unbounded `fetch(` invocation.

## Deferred

These are real issues with mitigations in place; remediation is planned with a roadmap entry.

### SEC-004 — JWT logout has no server-side revocation list (MEDIUM) {#deferred}
- **Status**: Mitigated by short token TTL (15 min access, 7 day refresh). Real revocation depends on M2 (auth rework) — see [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md#m2).
- **Mitigation today**: Logout clears the cookie; refresh tokens are checked against a denylist in memory; access tokens self-expire fast.
- **Target close**: M2.

### SEC-005 — CSRF token not bound to user-agent (MEDIUM)
- **Status**: Token is bound to session, but not to UA. A copied session cookie + token from one device would work on another.
- **Mitigation today**: Httponly + Secure + SameSite=Lax on session cookies; cookie theft is the hard part of the attack chain.
- **Target close**: M2 (bundled with auth rework).

### SEC-006 — Webhook secrets not auto-rotated (MEDIUM)
- **Status**: Stripe and platform-provider webhook signing keys stored in env. Manual rotation only.
- **Mitigation today**: HMAC verification on every webhook; replay-protection via timestamp window.
- **Target close**: Quarterly manual rotation process documented; tooling deferred to post-M6.

## Out of Scope

### SEC-007 — Real penetration test
- This audit is a code/architecture audit, not a paid pen test. A real pen test by a qualified firm typically runs $5k–$25k.
- **Trigger to schedule**: MRR ≥ $2k/mo OR first enterprise customer requests it.

### SEC-008 — Formal compliance (SOC 2, GDPR, etc.)
- Not in scope at MVP stage. Vendor security questionnaires can be answered with our internal posture; formal certification is multi-month and multi-thousand-dollar.
- **Trigger to schedule**: First enterprise deal contingent on SOC 2 Type 1, OR EU user count > 100.

## Layered Security in Place Today

For reference, the existing defenses (audit confirmed, no changes needed):

- 4-tier rate limiting (strict/standard/relaxed/public)
- CSRF tokens on all writes (HMAC-SHA256)
- Global middleware: CORS, CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- Input validation (email, ID, string, number, enum)
- HTML entity escaping for email templates
- JWT httpOnly cookies + bearer + scoped API keys
- 2FA / TOTP support
- Session listing and revocation API
- Idempotency keys on mutations
- HMAC-signed webhooks with replay protection

## Re-check Schedule

| Item | Frequency | Method |
|------|-----------|--------|
| SEC-001 | Quarterly | DB-down smoke |
| SEC-002 | Quarterly | k6 stress |
| SEC-003 | On dependency upgrade | grep + code review |
| SEC-004/005 | At M2 close | Manual replay test |
| SEC-006 | Quarterly | Calendar reminder for rotation |

See [10-risk-severity-matrix.md](./10-risk-severity-matrix.md) for the unified tracking matrix.
