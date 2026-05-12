# 12 — Architecture Improvement Roadmap

3-, 6-, and 12-month plan for graduating Social Perks from "audited free-tier MVP" to "production-credible SaaS."

Each milestone has a triggering condition (revenue / traffic / load) so we don't pre-spend.

## M1 — Database Migration (Month 1) {#m1}

**Goal**: Eliminate state loss on restart. All durable state lives in Postgres.

**Scope**:
- Move `campaigns`, `submissions`, `users`, `sessions`, `audit_log`, `rate_limit_state` from in-memory Maps to Prisma models.
- Schemas already exist in `src/lib/db/schema.ts` — finish wiring.
- Keep in-memory fallback for local dev when `DATABASE_URL` is unset.
- Add a `npm run db:check` script to verify connectivity in CI.

**Exit criteria**:
- Restart Render service, confirm campaigns/submissions persist.
- All routes that touched in-memory Maps now use Prisma client.
- Single migration applied cleanly via `prisma migrate deploy`.

**Risks**: Render free Neon DB is 0.5 GB. Sized for tens of thousands of rows. Plan to upgrade when row count > 100k.

## M2 — Authentication Rework (Month 2) {#m2}

**Goal**: Make logout, session revocation, and multi-device session listing all real.

**Scope**:
- Move from bearer JWT to httpOnly session cookies for browser flows; keep JWT for API clients.
- Add refresh-token rotation table (sessions table from M1 doubles for this).
- Implement server-side revocation: revoke session → next request returns 401 within the request itself, not at next JWT expiry.
- Update `/api/v1/auth/sessions` to actually invalidate.
- Bind CSRF token to user-agent + session (closes SEC-005).

**Exit criteria**:
- Revoke session in one tab; confirm second tab gets logged out on its next request.
- Penetration smoke: copied bearer token from one device fails after revocation.

**Risks**: Mobile clients using bearer auth need a versioned auth response. Coordinate via API versioning.

## M3 — Observability & Anomaly Detection (Month 3)

**Goal**: We know about problems before users tell us.

**Scope**:
- Wire Sentry (`@sentry/nextjs`) — DSN in env, source maps on deploy.
- Migrate the 5 stray `console.error` calls to `Sentry.captureException` + structured logger.
- Add a `/api/v1/status` page that's actually a status page (not just JSON).
- Alert on: 5xx rate > 1% over 5m, p95 latency > 2s, DB connection failures.

**Exit criteria**:
- Synthetic error in staging triggers an alert in < 60s.
- p95 latency graph available for the past 7 days.

**Trigger**: MRR ≥ $200/mo (covers Sentry team tier).

## M6 — Multi-Region & Real-Time (Month 6)

### M6a — Multi-region deploy

**Goal**: Reduce p95 latency for non-US-East users; remove single-region SPOF.

**Scope**:
- Migrate from Render to Vercel Edge or Cloudflare Workers.
- Static and ISR pages serve from edge regardless.
- Database stays in single region (Neon US-East) — reads via read replica when warranted.

**Exit criteria**: p95 latency from EU/AP < 600ms.

**Trigger**: MRR ≥ $500/mo and > 10% of traffic outside North America.

### M6b — Real-time features via Cloudflare Durable Objects

**Goal**: Replace polling for live campaign metrics and exchange order book with push.

**Scope**:
- One Durable Object per active campaign session.
- WebSocket connection from dashboard widgets.
- Replaces or augments current SSE endpoint at `/api/v1/events`.

**Exit criteria**: Submission state changes visible in dashboard < 500ms after backend write.

**Trigger**: Sustained > 50 concurrent live-dashboard viewers OR exchange volume > 100 trades/day.

## M12 — Mobile / PWA Upgrade (Month 12)

**Goal**: Native-feeling mobile experience without a separate codebase.

**Scope** (choose one):
- **Option A**: Upgrade existing PWA. Push notifications, install banner, offline sync via `src/lib/sync-engine.ts`.
- **Option B**: Native shell (Capacitor) wrapping the PWA. App Store / Play Store presence.

**Exit criteria**:
- Install rate > 5% of weekly active users.
- Offline mode survives airplane-mode test for primary read flows.

**Trigger**: MRR ≥ $2000/mo AND user research confirms mobile is the primary access pattern.

## Milestone Summary

| Milestone | Month | Trigger | Cost impact |
|-----------|-------|---------|-------------|
| M1 Database migration | 1 | None — required for scale | $0 (Neon free) |
| M2 Auth rework | 2 | After M1 | $0 |
| M3 Observability | 3 | MRR ≥ $200 | ~$26/mo Sentry |
| M6a Multi-region | 6 | MRR ≥ $500 + intl traffic | $20–$50/mo |
| M6b Real-time | 6 | 50 concurrent live viewers | $5/mo CF Workers |
| M12 PWA/Mobile | 12 | MRR ≥ $2000 | $99/yr Apple + $25 Google |

## Cross-cutting concerns

These apply at every milestone:

- **Backwards compatibility**: never break an existing API version without a 90-day deprecation notice.
- **Migration runbooks**: every milestone gets a runbook in `docs/runbooks/` before rollout.
- **Feature flags**: every major change ships behind a flag in `/api/v1/flags`, allowing instant rollback.
- **Audit log**: every architectural change is recorded in the audit log with the relevant event type.

See [19-next-milestones.md](./19-next-milestones.md) for the business-side counterpart (revenue/marketing milestones that gate these).
