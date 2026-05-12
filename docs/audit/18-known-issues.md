# 18 — Known Issues

All remaining known issues at the close of Phase 8 audit. Items are documented, accepted, and tracked — none are surprises.

## Architectural (deferred)

### KI-001 — In-memory stores not yet on Prisma
- Campaigns, submissions, users, sessions, audit log, rate-limit state.
- Closes at M1 — see [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md#m1).
- Workaround: cron-warmer keeps instance alive; restart loses data but at current scale recovery is fast.

### KI-002 — JWT logout has no server-side revocation
- Mitigated by short access-token TTL.
- Closes at M2.
- See SEC-004 in [13-security-findings.md](./13-security-findings.md).

### KI-003 — Some routes still use raw SQL fallback instead of Prisma
- Two sources of truth for schema. Type safety not enforced in raw-SQL paths.
- Closes at M1.

## Build / tooling (cosmetic)

### KI-004 — AWS SDK optional-dep warning during build
- `next build` prints a warning about AWS SDK being marked optional but still resolvable.
- Bundle includes ~200 KB of unused SDK.
- Effort to fix: S — add to `serverExternalPackages` in `next.config.js`.
- Closes at M3 alongside bundle-analyzer rollout.

### KI-005 — Build standalone-output copy fails on worktree paths
- When building from a git worktree (e.g. `.claude/worktrees/*`), the `.next/standalone` copy step trips on symlink paths.
- Cosmetic — production deploys build on the deploy machine, not from a worktree.
- Won't fix unless we adopt standalone Docker builds.

## Testing

### KI-006 — Stripe Payment Link branch can't be unit-tested as written
- The module reads `process.env.STRIPE_PAYMENT_LINK` at module-load time, so tests can't override.
- One billing branch is exercised only by manual smoke test.
- Effort to fix: S — refactor to lazy-read inside the handler.
- Closes at M2.

## Content / product

### KI-007 — 5 of 8 Pillar pages stubbed (data-part-2 etc.)
- Three pillar pages are live and SEO-indexed; five remain placeholder.
- Impact: SEO ceiling on those topic clusters; conversion funnels dead.
- Effort: M per pillar.
- Plan: one per sprint when traffic data justifies (see [19-next-milestones.md](./19-next-milestones.md)).

### KI-008 — 15 of 20 Stories incomplete
- 5 customer stories live; 15 unwritten.
- Impact: thin social proof.
- Plan: 1–2 per month as customers convert.

## UX

### KI-009 — Full keyboard-navigation audit not yet run
- Spot checks pass; comprehensive per-page tab-order + focus-trap audit pending.
- Effort: M.
- See UX-003 in [16-ux-findings.md](./16-ux-findings.md).

## Observability

### KI-010 — Five `console.error` calls in non-critical paths
- All in caught-error branches that don't propagate.
- Will become `Sentry.captureException` at M3.

### KI-011 — No anomaly detection / structured error tracking
- We rely on Render stdout. No alerts, no aggregation.
- Closes at M3 (Sentry rollout, gated on MRR ≥ $200).

## Scalability

### KI-012 — Render free-tier cold start (~50s after 15 min sleep)
- Mitigated by hourly smoke-test cron.
- Closes when Render is upgraded to paid (trigger: first paid customer).

### KI-013 — Single-region deploy
- All traffic served from US-East.
- Closes at M6a (trigger: MRR ≥ $500 and intl traffic > 10%).

## Status snapshot

| Severity | Count | All have remediation plan? |
|----------|-------|---------------------------|
| HIGH (architectural) | 2 | Yes — M1, M2 |
| MEDIUM | 6 | Yes — M1–M3 |
| LOW / cosmetic | 5 | Some won't-fix; documented |

## Hard "won't fix" list

- KI-005 (worktree standalone build) — cosmetic, niche.
- "Make demo data dynamic per request" — explicit decision: demo accounts are static for shareability.

## Re-check at next audit

When the next audit runs, the expected closures by then are:

- KI-001 / KI-003 (M1)
- KI-002 / KI-006 (M2)
- KI-010 / KI-011 (M3)

Items expected to remain open: KI-007 / KI-008 (content), KI-009 (depends on UX sprint), KI-012 / KI-013 (revenue-gated).

See [10-risk-severity-matrix.md](./10-risk-severity-matrix.md) for cross-reference.
