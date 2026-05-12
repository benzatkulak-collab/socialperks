# 17 — Scalability Findings

State of scalability and where the cliffs are.

## Current capacity (free-tier limits)

| Resource | Provider | Limit | Notes |
|----------|----------|-------|-------|
| App instance | Render free | 1 instance, no autoscale | Sleeps after 15 min idle |
| App memory | Render free | 512 MB RAM | Currently ~220 MB RSS steady |
| App CPU | Render free | 0.1 CPU | Bursts allowed; sustained throttled |
| Database | Neon free | 0.5 GB | Sized for ~tens of thousands of rows |
| Database connections | Neon free | ~100 | PgBouncer pooling on port 6543 |
| CI minutes | GitHub Actions free | 2,000 min/mo | ~6.5 min per push at current size |
| Email | Resend free | 100/day, 3k/mo | Welcome + verification + receipts |
| Object storage | n/a / R2 free | 10 GB | For uploaded images |

## Known cliffs

### Cold start after sleep
- Render free tier puts the instance to sleep after 15 minutes of no traffic.
- First request after sleep takes ~50s to return.
- **Mitigation**: hourly smoke-test workflow + (optional) every-10-min cron during business hours keeps it warm.
- **Real fix**: paid Render plan ($7+/mo) — trigger at MRR ≥ $200.

### In-memory state loss across restarts
- Campaigns, submissions, sessions, audit log, rate-limit state all live in process memory.
- Every Render deploy and every sleep/wake cycle clears them.
- **Mitigation**: this is the M1 milestone — see [12-architecture-improvement-roadmap.md](./12-architecture-improvement-roadmap.md#m1).
- **Severity**: tolerable at 0–10 customers; breaks trust at 50+.

### Single region
- Render free deploys to one US-East region.
- Users in EU/AP see ~150–300ms additional latency on every request.
- **Mitigation**: Deferred to M6a — only triggers when international traffic > 10%.

### Connection pool starvation under burst
- Neon free supports ~100 concurrent connections via PgBouncer.
- Our pool is sized at 10 by default in Prisma client.
- At 50+ concurrent users with heavy dashboards, we may queue.
- **Mitigation**: tune Prisma pool after M1; consider per-route timeouts.

### GitHub Actions minutes
- 2,000 free minutes/month.
- Current usage: ~6.5 min/push × N pushes/month. At 100 pushes/month, ~650 min — well within budget.
- Cliff hits at ~300 pushes/month, which would mean an active multi-developer cadence.

## Capacity planning by stage

| Stage | Customers | MRR | What breaks first | Trigger to upgrade |
|-------|-----------|-----|-------------------|---------------------|
| Pre-revenue | 0–5 | $0 | Cold starts annoy demos | Use cron-warmer; ignore |
| Early | 5–25 | $50–$250 | In-memory state loss on deploy | Land M1 (Prisma) |
| Growing | 25–100 | $250–$1k | Render free CPU throttle | Render Starter ($7/mo) |
| Established | 100–500 | $1k–$5k | Single region latency for intl | Render Pro or migrate to Vercel/CF |
| Scale | 500+ | $5k+ | Connection pool, email cap | Neon Pro, Resend Pro |

## Recommendations

### Now (cost: $0)
- Keep the smoke-test cron running.
- Document the in-memory-loss behavior so support knows what to tell users.
- Add a "last restart" timestamp to `/api/v1/status` for debugging.

### Trigger: first paid customer
- Upgrade Render to Starter ($7/mo) to kill cold starts.
- Land M1 (Prisma migration) so state survives deploys.

### Trigger: MRR ≥ $500
- Upgrade Neon to Launch tier (~$19/mo) for 10 GB and longer backup retention.
- Upgrade Resend to paid tier ($20/mo) for 50k email/mo.

### Trigger: MRR ≥ $2k
- Multi-region deploy (M6a) — Vercel Edge or Cloudflare Workers.
- Consider Postgres read replicas if dashboard p95 > 600ms.

## Scalability defenses already in place

- 4-tier rate limiting blunts most thundering-herd issues.
- LRU bounds on in-memory stores prevent runaway memory growth.
- External call timeouts prevent upstream slowdown from cascading.
- Idempotency keys allow safe client retries without amplification.
- CDN caching on read endpoints reduces app-server load.
- Edge cache headers via `src/lib/api/edge-cache.ts`.

## Re-check schedule

- Free-tier headroom: monthly.
- Connection pool saturation: at M1 close, then quarterly.
- Email volume vs cap: monthly when paying customers exist.

See [14-performance-findings.md](./14-performance-findings.md) for latency view; [22-disaster-recovery.md](./22-disaster-recovery.md) for what happens when a tier limit is hit.
