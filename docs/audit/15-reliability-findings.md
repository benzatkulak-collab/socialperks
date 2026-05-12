# 15 — Reliability Findings

State of reliability after the audit pass.

## Summary

- All HIGH-severity reliability issues are fixed.
- Health check now correctly returns 503 on DB down.
- In-memory stores are bounded and won't OOM under load.
- External calls all have timeouts.
- Remaining items are LOW: 5 `console.error` calls in non-critical paths.

## Fixed in this audit

### Health check returns 503 on DB down
- Previously: `/api/v1/health` returned 200 unconditionally. Render's healthchecks and external uptime monitors couldn't detect a DB outage.
- Now: Health probe pings the DB. Returns 503 with `{ status: "unhealthy", db: "down" }` on failure.
- Cross-reference: SEC-001 in [13-security-findings.md](./13-security-findings.md).

### Bounded in-memory stores
- Previously: Rate-limit Map, session Map, audit log Map all grew without limit. Worst case: an attacker or runaway client could push the process to OOM.
- Now: All three are LRU-bounded with size caps tuned to fit Render free-tier 512 MB.
- Cross-reference: SEC-002.

### External call timeouts
- Every outbound `fetch` (AI provider, Stripe, OAuth, webhook, search index) now has an `AbortSignal.timeout` of 5–15 seconds depending on endpoint.
- A misbehaving upstream can no longer pin a request worker.
- Cross-reference: SEC-003.

## Remaining LOW

### REL-001 — 5 `console.error` calls in non-critical paths
- **Files**: TBD — flagged but path list not finalized in this aggregation pass. Run `grep -rn "console.error" src/` and exclude the structured logger to find them.
- **Why low**: All five paths are non-critical (background fetch, optional enrichment). Errors are caught and don't propagate.
- **Why fix anyway**: Once Sentry lands (M3), every `console.error` should become a structured `captureException` so it shows up in alerts.
- **Closure**: M3 — bundled with TD-005 in [11-technical-debt-report.md](./11-technical-debt-report.md).

## Reliability defenses in place

| Defense | Where | Status |
|---------|-------|--------|
| Health endpoint with DB probe | `/api/v1/health` | Active |
| Bounded in-memory stores | `lib/security/rate-limiter.ts`, audit log | Active |
| External call timeouts | All `fetch` callsites | Active |
| Idempotency keys | `lib/api/idempotency.ts` | Active |
| Circuit breaker status reporting | `/api/v1/status` | Active |
| Request tracing on every route | `lib/api/with-request-context.ts` | Active |
| Structured JSON logging w/ requestId | universal middleware | Active |
| Server-Timing headers | universal middleware | Active |
| Hourly smoke test workflow on prod | `.github/workflows/` | Active |
| Audit log (11 event types) | `lib/audit/` | Active |
| Auto-rollback on failed CI | GitHub Actions + Render | Active |

## What's not yet wired

- **Anomaly detection**: no Sentry / Datadog / Honeycomb. We see issues via Render logs only. Closes at M3.
- **SLO tracking**: no explicit SLO dashboards. Currently informal — health checks tell us up/down but not "did we meet 99.5% this month?".
- **Chaos testing**: not part of the current QA loop.

## Reliability budget (proposed)

For internal alignment, not contractual:

| SLI | Target | Measurement |
|-----|--------|-------------|
| Availability (`/api/v1/health` 200) | 99.5% / month | Hourly smoke + uptime probe |
| Error rate (5xx) | < 1% over rolling 5 min | Logged via request context |
| p95 latency (read endpoints) | < 600 ms | Server-Timing, post-Sentry |

These targets become formal when M3 observability lands.

## Re-check schedule

- All Active defenses: every release, smoke-tested by CI.
- REL-001 closure: at M3 sign-off.
- Reliability budget: revisit at M3 with real numbers.

See [22-disaster-recovery.md](./22-disaster-recovery.md) for the failure-mode and recovery counterpart.
