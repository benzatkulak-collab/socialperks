# 10 — Risk Severity Matrix

Master matrix of all findings aggregated across audit phases. Items are deduplicated, normalized to a common severity scale, and tracked from open through close.

## Severity Scale

| Severity | Definition |
|----------|------------|
| CRITICAL | Active exploit/data-loss potential or outage in flight. Block release. |
| HIGH | Realistic exploit path or recoverable outage cause. Fix before next release. |
| MEDIUM | Deferred fix acceptable; mitigation in place. Track to closure. |
| LOW | Cosmetic, minor optimization, or future-proofing. Best-effort. |

## Source phases

The following prior-phase documents were considered when building this matrix:

- 01-system-inventory.md — **(pending)**
- 02-architecture-maps.md — **(pending)**
- 03-api-routes-audit.md — **(pending)**
- 04-lib-audit.md — **(pending)**
- 05-components-audit.md — **(pending)**
- 06-ai-agent-audit.md — **(pending)**

Findings below are reproduced from the consolidated audit notes that fed this phase. Where a prior document is later filled in, individual rows should be updated with deep links.

## Master Matrix

| ID | Description | Severity | Status | Owner | Date Fixed | Re-check method |
|----|-------------|----------|--------|-------|------------|-----------------|
| SEC-001 | Health check did not return 503 on DB down — masked outages | HIGH | Fixed | platform | 2026-03-23 | `curl /api/v1/health` with DATABASE_URL pointed at a dead host |
| SEC-002 | Unbounded in-memory stores (rate-limit, sessions, audit) could OOM | HIGH | Fixed | platform | 2026-03-23 | k6 load test `k6/auth-stress.js` watches RSS |
| SEC-003 | External fetch calls had no timeout — could hang request workers | MEDIUM | Fixed | platform | 2026-03-23 | Code review for `fetch(` with `signal:` or `AbortSignal.timeout` |
| SEC-004 | JWT logout has no server-side revocation list | MEDIUM | Deferred | platform | — | See [13-security-findings.md](./13-security-findings.md#deferred) |
| SEC-005 | CSRF token bound to session but not to user-agent | MEDIUM | Deferred | platform | — | Manual replay test from a different UA |
| SEC-006 | Webhook secrets stored in env, not rotated automatically | MEDIUM | Deferred | platform | — | Quarterly secrets review |
| SEC-007 | No real penetration test performed | — | Out of scope | n/a | — | Schedule when MRR funds it |
| SEC-008 | No SOC 2 / GDPR formal compliance | — | Out of scope | n/a | — | Schedule when enterprise pipeline funds it |
| REL-001 | Console.error calls in 5 non-critical paths leak stack traces | LOW | Documented | platform | — | grep `console.error` in non-critical handlers |
| PERF-001 | AWS SDK pulled into bundle despite being optional | LOW | Documented | platform | — | `next build` output inspection |
| PERF-002 | Standalone output copy fails on worktree paths (cosmetic build warning) | LOW | Documented | platform | — | `next build` in worktree |
| UX-001 | 35 stale signup CTAs pointed at deprecated route | MEDIUM | Fixed | product | 2026-03-22 | grep for `href="/signup"` confirms zero |
| UX-002 | Domain references inconsistent (socialperks.io vs .app) | MEDIUM | Fixed | product | 2026-03-22 | grep `socialperks.io` should return zero hits |
| UX-003 | Full keyboard navigation audit per page not yet run | LOW | Deferred | product | — | Per-page tab order pass |
| DOC-001 | 5 of 8 Pillar pages stubbed (data-part-2) | MEDIUM | Documented | content | — | See [18-known-issues.md](./18-known-issues.md) |
| DOC-002 | 15 of 20 Stories not yet written | MEDIUM | Documented | content | — | See [18-known-issues.md](./18-known-issues.md) |
| ARCH-001 | In-memory stores (campaigns, submissions, users, sessions) should move to Prisma | HIGH | Deferred | platform | — | See [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md#m1) |
| ARCH-002 | JWT auth should move to httpOnly session cookies w/ refresh rotation | HIGH | Deferred | platform | — | See [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md#m2) |
| ARCH-003 | No anomaly detection / structured error tracking (Sentry) | MEDIUM | Deferred | platform | — | M3 milestone |
| ARCH-004 | Single-region deploy on Render | MEDIUM | Deferred | platform | — | M6 milestone |
| TEST-001 | Stripe Payment Link branch can't be unit-tested (module-load env read) | LOW | Documented | platform | — | Refactor to lazy-read env |

## Status Roll-up

| Severity | Open | Fixed | Deferred | Documented | Out of scope |
|----------|------|-------|----------|------------|--------------|
| CRITICAL | 0 | 0 | 0 | 0 | 0 |
| HIGH | 0 | 2 | 2 | 0 | 0 |
| MEDIUM | 0 | 3 | 4 | 2 | 2 |
| LOW | 0 | 0 | 1 | 4 | 0 |

## Notes

- "Deferred" means: known, accepted, with a roadmap entry. Not "ignored."
- "Documented" means: known, accepted, no remediation planned (cosmetic or out of scope for current stage).
- Re-check methods describe the simplest verification step at the next audit pass.

See [11-technical-debt-report.md](./11-technical-debt-report.md) for the work-prioritized view of the same data.
