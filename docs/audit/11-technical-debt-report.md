# 11 — Technical Debt Report

Prioritized backlog of known technical debt. Each item has: impact, effort estimate, prerequisite, and target milestone (see [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md)).

Effort: S (≤1 day) · M (1–3 days) · L (1–2 weeks) · XL (>2 weeks).

## P0 — Architectural debt blocking scale

### TD-001 — In-memory stores should move to Prisma/Postgres
- **Scope**: `campaigns`, `submissions`, `users`, `sessions`, `audit log`, `rate-limit state`
- **Impact**: State loss on every restart. Render free tier sleeps after 15 min idle and on each deploy. Causes inconsistent UX, lost audit trail, and breaks any future autoscaling.
- **Effort**: L (per store) — the Prisma schema in `src/lib/db/schema.ts` is already laid out for these tables.
- **Prerequisite**: Confirm Neon connection string in production; align Prisma client init.
- **Target**: M1 (30 days)
- **Re-check**: Restart app, confirm campaigns persist.

### TD-002 — JWT auth should move to httpOnly session cookies with refresh-token rotation
- **Impact**: Current JWT bearer scheme has no server-side revocation list (SEC-004). A leaked token is valid until expiry. Refresh rotation also reduces blast radius on XSS.
- **Effort**: L
- **Prerequisite**: TD-001 (sessions table in Postgres).
- **Target**: M2 (60 days)
- **Re-check**: Revoke session via `/api/v1/auth/sessions`, confirm next request 401s within 1s.

## P1 — Reliability & observability debt

### TD-003 — Wire Sentry (or alternative) for error tracking
- **Impact**: We rely on Render's stdout for errors. No alerting, no aggregation, no source map symbolication. Bugs reach users before we know.
- **Effort**: S (Sentry SDK init) + M (release tracking + source maps)
- **Cost**: Sentry free tier ~5k events/month; paid ~$26/mo
- **Target**: M3 (90 days) — gated on MRR > $200
- **Re-check**: Throw a synthetic error, confirm it appears in Sentry within 60s.

### TD-004 — Some routes still use raw SQL fallback instead of Prisma
- **Impact**: Two sources of truth for schema. Type safety lost in raw-SQL paths. Migration drift risk.
- **Effort**: M per route
- **Target**: M1 (alongside TD-001)
- **Re-check**: `grep -rn "postgres\`" src/app/api/` returns zero outside of one approved escape hatch.

### TD-005 — 5 LOW-severity `console.error` calls in non-critical paths
- **Impact**: Stack traces visible in logs but no structured fields. Won't appear in eventual Sentry as well-formed events.
- **Effort**: S
- **Target**: M3 (paired with Sentry rollout)

## P2 — Build / dependency debt

### TD-006 — AWS SDK marked optional, but bundling warning persists
- **Impact**: Cosmetic warning during `next build`. Bundle size estimate (TBD) likely includes ~200KB of SDK we don't ship.
- **Effort**: S — add to `serverExternalPackages` in `next.config.js` or remove unused imports.
- **Target**: M3

### TD-007 — Build standalone-output copy fails on worktree paths
- **Impact**: Cosmetic. `next build` works; the `.next/standalone` copy step trips on symlinked worktree paths. Production deploys (which build on the deploy machine) are unaffected.
- **Effort**: S — workaround or upstream issue.
- **Target**: M6+ (only matters if we adopt standalone Docker builds)

## P3 — Content / product debt

### TD-008 — 5 of 8 Pillar pages stubbed (data-part-2 etc.)
- **Impact**: SEO ceiling capped until written. Conversion funnels from these pages are dead.
- **Effort**: M per pillar (writing + assets)
- **Target**: M1 — M3 (one per sprint, gated on traffic data)

### TD-009 — 15 of 20 Stories not yet written
- **Impact**: Social proof thin. Sales objection ("show me a real customer like me") harder to answer.
- **Effort**: M per story (interview + write-up)
- **Target**: Continuous — 1–2 per month as customers convert.

### TD-010 — Stripe Payment Link branch can't be unit-tested as written
- **Cause**: Module reads `process.env.STRIPE_PAYMENT_LINK` at module load, so tests can't override.
- **Impact**: One untested branch in billing path. Manual smoke test required on each release.
- **Effort**: S — refactor to lazy read inside the handler.
- **Target**: M2

## Debt Categorized for Quick Triage

| Category | Count | Total est. effort |
|----------|-------|-------------------|
| Data layer migrations | 2 | L+L |
| Auth/Security | 1 | L |
| Observability | 2 | S+M |
| Build/Bundle | 2 | S+S |
| Content/Product | 2 | ongoing |
| Testing | 1 | S |

## Decision rules

- Do not start TD-002 before TD-001 lands — auth needs the sessions table.
- Do not start TD-003 before TD-001 lands — Sentry alerts on noisy in-memory issues that resolve themselves.
- TD-006 and TD-007 are explicitly deprioritized; close as "won't fix" if still cosmetic at next audit.

See [10-risk-severity-matrix.md](./10-risk-severity-matrix.md) for risk-weighted view of the same items, and [19-next-milestones.md](./19-next-milestones.md) for time-boxed execution plan.
