# 14 — Performance Findings

State of performance after the audit pass, with concrete numbers where available and "(estimated)" / "(TBD)" markers where measurement hasn't yet been instrumented.

## Bundle Size

| Surface | Size | Notes |
|---------|------|-------|
| First-load JS (landing) | ~120 KB gzipped (estimated) | Dominated by React 19 + Next.js runtime |
| First-load JS (dashboard) | ~280 KB gzipped (estimated) | Adds charts, dnd, animation libs |
| Largest single chunk | ~95 KB (estimated) | TBD — run `next build` with `ANALYZE=true` |
| AWS SDK contribution | ~200 KB (estimated) | Marked optional but still bundled (TD-006) — see [11-technical-debt-report.md](./11-technical-debt-report.md) |

**Action**: Add `@next/bundle-analyzer` to CI on a manual trigger; publish report alongside builds.

## Static Pages

- **Prebuilt static pages**: ~1,267 at last full build (estimated)
- **ISR pages**: many — campaign pages, widget pages, pillar pages
- **Dynamic SSR**: `/dashboard`, `/auth`, all `/api/v1/*` routes

ISR cache hit rate is the highest single perf lever — but measurement is currently only available via Render logs (paid feature). Mitigation: rely on CDN-level caching headers set by `src/lib/api/edge-cache.ts`.

## Database Query Patterns

A spot-check of API routes did not surface obvious N+1 query issues, but full audit is **(pending)** as part of phase 04-lib-audit.md.

Known concerns:
- Some list endpoints (campaigns, submissions) fetch related entities in separate queries; under low cardinality this is fine, but should be reviewed under realistic data volume.
- The Prisma `include` / `select` pattern should be standardized in a follow-up doc.

**Action**: When TD-001 (in-memory → Prisma) lands, instrument query timing per request and add to Server-Timing header. We already emit Server-Timing, so this is additive.

## Memory Usage

Measured on Render free tier (512 MB cap):

| Metric | Value | Notes |
|--------|-------|-------|
| Heap (steady state) | ~120 MB | (estimated from Node `process.memoryUsage()` snapshots) |
| RSS (steady state) | ~220 MB | Leaves ~290 MB headroom |
| RSS under k6 stress | ~310 MB | Stays under cap; LRU bounds hold |
| Cold start | ~50s after 15-min sleep | Render free-tier behavior; not a memory issue |

We are well within free-tier limits. The cold-start latency is the user-facing pain, not memory pressure.

## Latency

Without paid APM, latency numbers below are estimated from local synthetic tests and Render-side spot checks.

| Endpoint | p50 | p95 | Notes |
|----------|-----|-----|-------|
| `GET /api/v1/health` | ~30 ms | ~80 ms | DB probe included |
| `GET /api/v1/campaigns` | ~80 ms | ~250 ms (estimated) | In-memory mode |
| `POST /api/v1/ai/generate` | ~2.5 s | ~6 s (estimated) | Dominated by upstream LLM call |
| Static landing page | < 20 ms (CDN) | < 50 ms (CDN) | After cold start |
| Cold start (Render wake) | 30 s | 60 s | Free-tier sleeping behavior |

## Recommendations

In rough priority order:

1. **Lazy-load heavy dashboard components**. Charts, dnd, and rich text editors should `next/dynamic` import behind interaction or above-the-fold detection. Estimated savings: 80–120 KB on dashboard first load.
2. **Aggressive image optimization**. `next/image` is used; verify all hero and OG images go through it. Current size budget: keep below 200 KB per hero image.
3. **Move AWS SDK out of bundle**. Add to `serverExternalPackages` in `next.config.js`. Closes TD-006.
4. **CDN cache headers on more endpoints**. Public read-only endpoints (`/api/v1/pricing`, `/api/v1/actions`, `/api/v1/benchmarks`) already cache; audit any others.
5. **Pre-warm Render instance** via a cron-hit on `/api/v1/health` every 10 minutes during US business hours. This sidesteps the 50s cold start without paying for keep-alive. Already partially in place via the smoke-test workflow — confirm interval.
6. **After TD-001 lands**, add per-route DB timing budget alerts (`X-Server-Timing` exposes this; consume in observability layer).

## Re-check schedule

- Bundle size: after every major dependency upgrade.
- p95 latency: monthly, after Sentry/observability lands (M3).
- Memory: monthly, via `process.memoryUsage()` log snapshots.
- Cold-start mitigation: confirm every release that the cron warmer is still hitting.

See [17-scalability-findings.md](./17-scalability-findings.md) for the load-side perspective on the same data.
