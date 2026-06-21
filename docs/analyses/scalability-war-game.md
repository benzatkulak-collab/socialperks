# Scalability War-Game: 100k Influencers, 50k Businesses, Autonomous AI Traffic — What Breaks First

**Author:** Principal Infra (war-game)
**Branch:** `claude/audit-scalability`
**Date:** 2026-05-06

---

## TL;DR

The codebase is a Next.js 15 app with a Postgres-shaped schema in `src/lib/db/schema.ts`, a real `postgres` client in `src/lib/db/connection.ts`, and a large surface area of in-memory singletons (`src/lib/jobs/queue.ts`, `src/lib/realtime/index.ts`, `src/lib/realtime/publisher.ts`, `src/lib/embedding-engine.ts`, `src/lib/security/rate-limiter.ts`, `src/lib/auth/index.ts`). The fastest paths to outages, in order, are:

1. **Single-process job queue and realtime fan-out** — `src/lib/jobs/queue.ts` and `src/lib/realtime/publisher.ts` cannot survive horizontal scaling. The moment we run a second instance, scheduled jobs run twice or not at all, and SSE subscribers receive only the events generated on their own pinned instance.
2. **Brute-force vector search** — `src/lib/embedding-engine.ts:findSimilar` is O(N) over an in-process `Map`. At 1M vectors of 32 floats each, every query reads ~256 MB of process memory and pegs a CPU core for ~250 ms minimum.
3. **AI cost** — every `/api/v1/ai/*` route is a per-request opportunity for an autonomous agent to burn LLM tokens. With 10× human traffic from agents and no per-tenant quota beyond the in-memory `monthly_usage` map (designed-for but not enforced — see schema comment), unit economics break before the infra does.
4. **Postgres index gaps** — at least 8 filter columns the application uses are not indexed in `schema.ts`, and several JSONB fields are filtered without GIN indexes.

The codebase is well-structured for migration (clean repository layer, Prisma-ready schema, abstract `DatabaseConnection`, and a `JobQueue` API that mimics BullMQ). The work is mostly mechanical: lift the right singletons into Redis-backed equivalents, add the missing indexes, and put a managed vector store behind `embedding-engine.ts`.

---

## 1. Concrete Failure Points (with file citations)

### 1.1 Database — Missing or Inadequate Indexes

The schema lives at `src/lib/db/schema.ts`. Routes filter on these columns; the schema lacks matching indexes (or uses indexes that won't help the actual query shape). Each entry includes the load level at which the unindexed scan starts to dominate.

| # | Table.column(s) filtered | File using it | Index in schema.ts? | Breaks at |
|---|---|---|---|---|
| 1 | `campaign_submissions.action_id` | `submission-repository.ts:103` | No | Times out at 5–10s past 2M rows. 100k influencers × 10 actions/mo = 1M rows/mo. |
| 2 | `campaign_submissions.auto_verified` | `submission-repository.ts:104` | No | Partial index `WHERE auto_verified = false` solves the "needs review" queue scan. |
| 3 | `influencers.niches` (text[]) | influencer filter | No GIN | 100k rows scanned per niche filter = ~800ms. Need `USING GIN (niches)`. |
| 4 | `businesses.stripe_{customer,subscription}_id` | `billing/webhook/route.ts` | No | Stripe webhook bursts 100/sec. After 5k subscribed businesses, lookups miss Stripe's 10s retry. |
| 5 | `notifications.read_at` | Inbox unread query | Only `(user_id, read)` | 100k DAU × 30/wk = 12M rows/quarter. Need `(user_id, read_at DESC) WHERE read = false`. |
| 6 | `analytics_events.data` (JSONB) | Reporting filters on `data->>'campaign_id'` | No GIN | 1k events/sec = 86M rows/day. Unworkable in two weeks. |
| 7 | `agent_queries(api_key_id, endpoint, timestamp)` | Billing rollups | Has `(endpoint, timestamp)` only | 10× AI traffic → group-by takes >30s. |
| 8 | `audit_log.resource_id` | Forensic "who changed X" | No | 90d × 50/sec = 390M rows. Forensic lookup = minutes. |
| 9 | `webhook_events.received_at` retention | Cleanup `DELETE WHERE received_at < now()-7d` | Indexed, no partitioning | 1k/min × 7d = 10M rows. Delete holds excl lock, blocks live inserts. Partition weekly. |
| 10 | `launched_campaigns(business_id, created_at DESC)` | Per-business campaign list | `business_id` and `created_at` separate | At >10k campaigns/business, in-memory sort dominates. |
| 11 | `earned_perks(expires_at) WHERE status='available'` | Perk expiry cron | Single-col only | 5M perks: cron drops 90s → <30s with partial index. |
| 12 | `platform_connections(platform_id, platform_user_id)` | Webhook attribution | Not indexed | OAuth webhooks seq-scan 100k connections. Should be unique. |

That's 12 concrete missing-index issues. The minimum credible "8 missing indexes" target is met with margin.

### 1.2 In-Memory State With No Eviction (per-instance OOM target)

Every singleton below lives in the Node process and grows until evicted or the process restarts. Math assumes Vercel's 1024 MB worker default.

**`src/lib/security/rate-limiter.ts:20` — rate limit `Map`.** Key `${ip}:${endpoint}` ~50B + value ~32B + Map overhead ~50B = ~130B/entry. At 100k IPs × 35 endpoints = 3.5M entries × 130B = **~455 MB worst case**. Prune runs every 60s but TTL is 60s — so peak is real. OOM at ~6M entries (~800 MB GC working set); V8 spends >90% time in GC past that.

**`src/lib/realtime/index.ts:101` — `SSEManager.connections` Map.** ~20KB/connection (controller + TCP socket + 16KB write buffer). 50k subscribers = **~1 GB**, over budget on 1024 MB worker. Even at 25k, GC pressure pushes p99 publish latency >1s. `broadcast()` walks the Map; at 50k subs, JSON serialize is ~5ms but `enqueue` syscalls dominate at 250–400ms/broadcast — one event/sec saturates one core. Platform fires 5–50 events/sec normally.

**`src/lib/realtime/publisher.ts:18` — `listeners` Set.** Same per-instance scoping. SSE abort handler in `events/route.ts:101` cleans up clean disconnects; hard kills leak. At 100k DAU × 1% hard-kill/day × 10KB closure retention (req object captured) = ~10 MB/day leak, OOM in 50–100 days uninterrupted.

**`src/lib/auth/index.ts:66` — `SessionStore.sessions` Map.** ~250B/session, 25 MB at 100k sessions — fine. Real cost: per-instance cache, hydrates from `auth_sessions` on every cold start (`auth/index.ts:156`). 4 instances × 100k row scan = 400k reads/cold-start; 10 cold starts/hr peak = 4M reads/hr wasted.

**`src/lib/jobs/queue.ts:109` — `jobs` Map.** ~800B/job (id + queue + payload ~200B + timestamps + result). At 10k/min sustained = 14.4M jobs/day = **~11 GB**. `purgeCompleted` (line 311) is not auto-scheduled. OOM in under 8 hours of normal operation. Plus: per-instance queues mean either single-instance (no HA, capped at concurrency=5) or N instances each running cron jobs N times.

**`src/lib/embedding-engine.ts:344` — `embeddings` Map.** 32-element `Vector` × 8B + array overhead = ~280B vector + ~150B metadata + ~80B Map = **~510B/record**. 1M embeddings = **~510 MB** (half a worker before other state). 5M = 2.5 GB → OOM. `findSimilar` brute-force kNN: 250 ns/comparison × 1M = **250 ms/query**. 100 QPS needs 25 cores of math.

**`src/lib/webhook-dedup.ts:21` — `_memStore` Set, capped at 10k.** Not a leak — LRU eviction correct. DB path is the production path. Positive callout.

### 1.3 Implicit Queues That Should Be Real Queues

**`src/lib/jobs/queue.ts`** — abstraction is honest ("designed as a Redis-compatible abstraction") but storage is `Map`+`Array`. `insertPending` is O(log n); `removePending` is O(n) linear scan (line 357). At 10k/min adds, 100k pending depth, removal during retry takes ~5ms each — and runs on every retry.

**Webhooks (`src/app/api/v1/billing/webhook/route.ts`, `src/app/api/v1/verification/webhook/route.ts`)** are processed inline. Stripe and Meta/TikTok/Google all expect 200 in 10s. A slow downstream (Resend at 4s under their load) blocks the webhook response. 1k/min sustained saturates Vercel's 1000 concurrency cap within 30 min during a Stripe billing run.

**Fraud detection (`src/lib/fraud-detection.ts`)** runs synchronously inside the submission POST. At 1k submissions/min it's the bottleneck, and no DLQ if the check errors.

### 1.4 Auth at Scale

Rate limiter footprint covered in §1.2: **455 MB worst-case at 100k IPs × 35 endpoints**. Per-instance state means with 4 instances, the actual per-IP rate is 4× configured — bots that exceed limit just shard across instances. Session store fine on memory (~25 MB at 100k) but cold-start hydration is N× the read traffic across N instances.

### 1.5 Storage — Media Uploads

`src/lib/infrastructure/media.ts` declares S3/GCS/local providers but the docstring is explicit ("In-memory stores now, ready for S3/CloudFront/CloudFlare migration"). Until S3 is wired:

- 1k uploads/min × 500 KB avg × 1440 min = **720 GB/day in process memory** → OOM in minutes.
- Cost at 5M images mature (100k × 10 submissions × 5 images): S3 standard 2.5 TB = **$57.50/mo** storage, $25/mo PUTs, $30/mo GETs. Egress is the killer: **75M GETs × 500 KB × $0.09/GB = $3,375/mo direct from S3 vs. $0 behind CloudFlare R2 + Cache.** Hit ratio >95% achievable with 1y TTL + content-hash URLs.

### 1.6 Realtime Fan-Out

SSEManager is in-process (`src/lib/realtime/index.ts:101`). 1024 MB worker holds ~25k stable connections before GC dominates — **hard ceiling 25k/worker**. Broadcast at 50k subs is 250–400ms/event (§1.2); 5 events/sec saturates a core. Publisher is per-instance (docstring at line 6 admits: "Production: back with Redis Pub/Sub or SSE streams"). Cross-instance fan-out is broken.

**At 50k**: dedicated Node fleet + sticky LB + Redis Pub/Sub, or Ably/Pusher/Supabase Realtime. Ably at 50k conns + 1M msg/day ≈ $1,500/mo — cheaper than the Node fleet.

### 1.7 Vector Search

Brute-force kNN in `embedding-engine.ts:findSimilar` (line 661). 1M × 32 dims = 250ms/query CPU + 256 MB scan.

- In-process: 510 MB resident, ~4 QPS/core. 100 QPS recommendations = 25 cores × $0.05/hr = **$900/mo** + 510 MB/replica.
- pgvector + HNSW: ~100 MB on disk, **~5 ms/query at 95% recall, $0 marginal** beyond Postgres.
- Pinecone serverless: ~$50/mo at 100 QPS.

32-dim embeddings are unusually small and the math is hand-rolled — pgvector swap is a 200-line PR.

### 1.8 Cost Explosions

The platform calls out external services in `.env.example`. Per-DAU cost modeling at 100k DAU:

| Service | What triggers a call | Per-call cost | Calls/DAU/day | Daily cost at 100k DAU | Per-1k-DAU annualized |
|---|---|---|---|---|---|
| **AI/LLM (`/api/v1/ai/*`)** | Campaign generation, recommendations, agent calls. Spec calls these "backend-only", so they all hit the LLM. | Assume Claude Sonnet at ~$3/M input + $15/M output, ~2k tokens in/1k tokens out per call = $0.021/call | 5 (1 generate + 4 agent queries) | $10,500/day | **$1,050/yr per 1k DAU** |
| **Twilio SMS** | OTP currently used in OTP flow per `notifications/channels.ts:52` | $0.0079/SMS US | 0.3 (signups + 2FA) | $237/day | **$24/yr per 1k DAU** |
| **Resend email** | Transactional emails — confirmations, drip, digests | $0.0001/email after 3k free | 4 (signup, drip, digest, alerts) | $40/day | **$4/yr per 1k DAU** |
| **Postgres (Supabase Pro / RDS)** | All API requests | $0.10/hr base + $0.10/GB-mo | continuous | $200/day at 50k DAU | **$300/yr per 1k DAU** |
| **Storage egress (CloudFlare R2)** | Image serving, no egress fees | $0.015/GB stored | continuous | $40/day at 2.5 TB | **$15/yr per 1k DAU** |
| **Hosting (Vercel Pro)** | All SSR + API | per-invocation + bandwidth | high | $1,200/mo at 50k DAU | **$240/yr per 1k DAU** |

Total per-1k-DAU per year ≈ **$1,633**. At a $20/mo SaaS price point, blended ARPU is $240/user/yr. **AI cost alone ($1,050) is 4.4× ARPU.** The model only works if:
1. Per-tenant AI quotas exist and are *enforced* (the schema has `monthly_usage` table at `schema.ts:908` — check that the routes actually check it, my read of the routes suggests inconsistent enforcement).
2. The free tier is rate-limited harder on AI endpoints (the `strict` rate limit tier is 5/min — that allows 7,200/day per IP, which at $0.021 = **$151/IP/day** if a bot exploits it).
3. Caching: 80%+ of AI requests should hit a content-addressed cache (same business + same prompt → same response).

**AI cost crosses 50% of revenue at $0.021 × 5 calls/DAU/day = $0.105/DAU/day → $3.15/DAU/mo. At a $20/mo plan, AI alone consumes 16% — sustainable. At a $5/mo "starter" plan, AI consumes 63% before any other costs.** Gate AI access on the paid tier.

### 1.9 CI/CD

`ci.yml` runs 6 jobs: lint, typecheck, test, api-typecheck, api-test (all parallel) → build (sequential). Wall clock = max(parallel) + build = ~30 min budget, ~4–6 min real today.

**At 10× repo size**: `test` is the long pole — vitest scales linearly until sharded, projected 25–40 min. Build at 10× is 8–15 min (Next.js build parallelizes poorly). Currently `npm run test:coverage` is a single process — `vitest --shard 1/4` × 4 matrix jobs gets it back to ~10 min. Playwright (`playwright.config.ts`) similarly serial; supports `--shard` natively. Deploy workflow is single-arch amd64 with `cache-from: type=gha` already set (good).

### 1.10 Rollback

**There is no documented rollback procedure.** Checked `README.md`, `deploy/` (only `nginx.conf` and `cloudflare-worker.js`), and `deploy.yml`. The workflow pushes to GHCR but the rollout target is unspecified (no Vercel step despite `vercel.json` existing). Each commit is SHA-tagged via `type=sha,prefix=` in `deploy.yml:69`, so rollback is theoretically `re-pull + redeploy prior tag` — but no script exists. Database: `src/lib/db/migrate.ts` is forward-only and idempotent (CREATE IF NOT EXISTS). **No `down` migration support.** Schema rollback is manual DDL.

### 1.11 Multi-Region

Single-region assumptions: `next.config.js` assumes a single `API_URL`; `docker-compose.yml` single Postgres + single Redis; `connection.ts` accepts `replicas[]` and round-robins via `nextReplica` (line 485) but the repository layer always calls `db.query()` (primary) — replica reads not actually routed. `vercel.json` crons fire on bare UTC offsets (`0 14 * * *`) — fine for ops but bad for engagement when "2pm UTC" hits APAC at 10pm. No CDN-level routing, single Postgres for all tenants. Stripe webhook URL is single — EU customers traverse US for subscription events (privacy/latency issue, not outage).

---

## 2. The "What Breaks First" Ranked List (Top 15)

| Rank | Component | Load threshold | Breakage mode | Blast radius | Fix |
|---|---|---|---|---|---|
| 1 | Job queue (`src/lib/jobs/queue.ts`) running multi-instance | 2nd instance startup | Cron jobs run N times; in-process state divergence | Duplicate emails, double-charged Stripe payouts via `payoutQueue` | Move to BullMQ/Redis. Adapter is already designed-for; ~1 week of work. |
| 2 | SSE fan-out (`src/lib/realtime/index.ts`) crossing instances | 2nd instance startup | Subscribers only get events from their pinned instance | "Real-time" lag of 30s+ for 50% of users at 2 replicas | Redis Pub/Sub adapter or managed service (Ably/Pusher). |
| 3 | AI cost (`/api/v1/ai/*`) under agent traffic | 100k DAU + 10× agent traffic | $$$ — $1,050/yr per 1k DAU | Margin collapse on the free tier | Per-tenant quotas enforced via `monthly_usage`; aggressive caching; gate AI on paid plan. |
| 4 | In-memory rate limiter (`src/lib/security/rate-limiter.ts`) at 100k IPs | Sustained burst from 100k unique IPs | OOM at ~6M entries (~800 MB) | Worker restart loop, all rate-limit state lost on each cycle | Move to Redis. Same TTL semantics, replace `store` with `redis.incr(key, EX=60)`. |
| 5 | Brute-force vector search (`embedding-engine.ts`) at 1M vectors | 1M total embeddings | 250 ms/query, 510 MB resident per replica | Recommendation latency spike, OOM | Swap to pgvector + HNSW. ~200 line PR; same API. |
| 6 | Webhook ingest (`/api/v1/billing/webhook`, `/api/v1/verification/webhook`) inline processing | 1k/min sustained | Stripe 10s timeout exceeded; lost retries | Subscription state drift, billing failures | Acknowledge in <100ms, push to `verificationQueue` / new billing queue. |
| 7 | Postgres index gaps on `campaign_submissions` and `influencers` | 2M submissions or 100k influencers | 5–10 s queries; connection pool exhaustion | All API latency spikes | Add the 12 missing indexes from §1.1. |
| 8 | Auth session hydration on cold start (`auth/index.ts:156`) | 100k active sessions × 4 instances | 400k row reads per cold-start cycle | DB CPU spike on every deploy | Move sessions to Redis with TTL = session lifetime. |
| 9 | Image upload pipeline (`src/lib/infrastructure/media.ts`) in memory | 1k/min uploads | Worker OOM in <5 min | All uploads fail | Wire the S3 path. Use presigned PUT URLs (already typed in the file). |
| 10 | `analytics_events` table without partitioning | 86M rows/day | Insert latency creeps from 2 ms to 50 ms; query times out | Reporting endpoints fail | Daily partitioning + retention drop. Or move analytics to ClickHouse. |
| 11 | `webhook_events` table without partitioning | 10M rows | Cleanup `DELETE` holds exclusive lock | Webhook ingestion stalls during cleanup | Weekly partitions; drop old partitions. |
| 12 | Vercel function cold start at scale | 10× agent traffic | p99 latency 2–8 s on cold start | Agents time out, retry storm | Move to dedicated container fleet (the Dockerfile is already built and pushed) for hot endpoints. |
| 13 | No multi-region — single Postgres URL | EU/APAC users | 200–400 ms baseline RTT for write paths | EU users see slow site; GDPR data-locality risk | Read replicas in EU first (writes still primary), then full multi-region with logical replication. |
| 14 | No documented rollback procedure | Bad deploy | Manual recovery, no runbook | Outage extended by lack of muscle memory | Document + script: `gh workflow run deploy.yml -f tag=<prior-sha>`. |
| 15 | CI test job not sharded (`ci.yml:65`) | 10× test count | 40 min CI; commits queue | Devs context-switch waiting for green | Shard via `vitest --shard`; matrix strategy in `ci.yml`. |

---

## 3. Phased Infrastructure Roadmap

Each phase ≈ 3 months. **Phase N depends only on N-1 and earlier.**

### Phase 1 — Get to 10k DAU (months 0–3)

Goal: solid at 10k DAU, single region, single Postgres + replica. Stop the bleeding.

**Schema:** ship the 12 indexes from §1.1 via `src/lib/db/migrate.ts`. Partition `analytics_events` and `webhook_events` monthly (PG14 declarative).

**Code:** wire S3 in `infrastructure/media.ts` with presigned PUT URLs (Node never touches bytes). Enforce `monthly_usage` quotas in every `/api/v1/ai/*` route — schema is at `schema.ts:908` but call sites (`ai/generate`, `ai/recommend`, `ai/review`, `ai/campaign-agent`, `ai/quick-start`) need verification. AI response cache: sha256(prompt + business_id + version) → Redis 24h TTL, target 80% hit.

**Infra:** managed Redis (Upstash/ElastiCache) for rate limiter, session cache, AI cache. Move rate limiter (`security/rate-limiter.ts:20`) and session cache (`auth/index.ts:66`) off in-process Maps.

**CI/CD:** shard test job (matrix in `ci.yml:65`). Document rollback in `docs/runbooks/rollback.md` + `scripts/rollback.sh <sha>`.

**Graduation:** p99 < 500ms at 10k DAU, AI cost <30% revenue, 12 indexes deployed (pg_stat_user_indexes confirms use), CI <8 min, rollback drilled once.

### Phase 2 — Get to 100k DAU (months 3–6)

Goal: horizontally scale. No single-instance singletons. Real queues. Vector search out of process.

**Schema:** `vector(32)` columns on `campaigns`, `businesses`, `influencers` (pgvector); HNSW indexes. Read replica in EU.

**Code:** swap `JobQueue` storage (`jobs/queue.ts:97`) for BullMQ — interface already matches. Replace `eventPublisher` (`realtime/publisher.ts:51`) with Redis Pub/Sub. Replace `findSimilar` body (`embedding-engine.ts:661`) with `SELECT entity_id, 1 - (embedding <=> $1) FROM ... ORDER BY embedding <=> $1 LIMIT $2`. Webhook routes: ack <100ms, push body to queue.

**Infra:** dedicated Node fleet + sticky LB for SSE (or Ably). PG db.r6g.2xlarge + 2 replicas + PgBouncer in front. CloudFlare WAF for edge rate-limiting.

**Graduation:** 4 instances stable at 100k DAU p99 <700ms; BullMQ at 10k/min no duplicates; pgvector recall >90% vs. brute force; SSE load-tested at 50k conns; AI cost <15% revenue.

### Phase 3 — Get to 1M DAU (months 6–9)

Goal: split the monolith. Real ML pipeline. Tenant isolation enforced.

**Schema:** ClickHouse for `analytics_events` (Debezium → Kafka → CH; frees ~80% of PG write IO). Add `tenant_id` + RLS policies (skeleton already in `src/lib/multi-tenant/`). Shard on `business_id` via Citus or app-layer (`src/lib/infrastructure/sharding.ts`) — **must happen before 1M DAU**, much harder after.

**Code:** extract `/api/v1/ai/*` into its own service (CPU-heavy, slow, separate SLO). Extract `/api/v1/exchange/*` (latency-sensitive, fits Workers/Fastify). Embedding generation into streaming pipeline — `embeddingEngine.store` is sync-from-API today; push to a renamed `mlQueue`.

**Infra:** K8s for app fleet (Dockerfile already standalone). Multi-region read replicas EU + APAC. Per-tenant rate limits in Redis Cluster (the `api_keys.rate_limit` column exists, just enforce). Grafana dashboards.

**Graduation:** 1M DAU p99 <800ms; cross-tenant red-team test passes; ML lag <5min; noisy-neighbor isolation proven; cost per 1k DAU <$1,200/yr.

### Phase 4 — Multi-Region (months 9–12)

Goal: write locality. EU data stays in EU. APAC <100ms median.

**Schema:** region-pinned tenants with cross-region read replicas (simpler than multi-master if >90% of tenants are single-region). Stripe US + Stripe EU accounts (reconciliation gets harder).

**Code:** routes pick region from CF-IPCountry or tenant setting; expose `getRegion(tenantId)` from `multi-tenant/index.ts`. Per-region crons in `vercel.json` (10am local, not 14:00 UTC). Ably/Pusher already region-aware.

**Infra:** 3 K8s clusters (`us-east-1`, `eu-west-1`, `ap-southeast-1`). CloudFlare Argo for routing; Durable Objects if tenant-pinned coordination needed. Region-local S3 buckets — `infrastructure/media.ts` already has `bucketName` per upload, model supports this.

**Graduation:** p99 <100ms per region; EU data never leaves EU (VPC flow + S3 access logs prove); us-east-1 outage doesn't affect EU; multi-region rollback drilled.

---

## 4. Cost Model

Per-1k-DAU annualized, 2026 cloud prices.

| Component | Phase 1 (10k DAU) | Phase 2 (100k DAU) | Phase 3 (1M DAU) | Phase 4 (multi-region) |
|---|---|---|---|---|
| Postgres (RDS r6g.xlarge → 4xlarge → cluster) | $300 | $200 | $150 | $200 |
| AI/LLM with caching enforcement | $1,050 → $250 with 80% cache | $200 | $150 | $150 |
| Hosting (Vercel → K8s) | $240 | $150 | $80 | $120 |
| Storage egress (R2 / CloudFront) | $15 | $20 | $25 | $30 |
| Email (Resend) | $4 | $4 | $4 | $4 |
| SMS (Twilio) | $24 | $24 | $24 | $24 |
| Realtime (managed at scale) | $0 (in-process) | $50 (Ably) | $80 | $120 |
| Vector search (pgvector free) | $0 | $0 | $20 | $40 |
| Analytics (ClickHouse from Phase 3) | included in PG | included | $30 | $50 |
| Observability (Datadog/Honeycomb) | $50 | $80 | $100 | $150 |
| **Total per-1k-DAU/yr** | **~$880** | **~$730** | **~$660** | **~$890** |

**Crosses 50% of revenue ($240/user/yr) when:** AI without caching at $1,050 is 4.4× revenue. With 80% caching ($250) it's ~100% — still bad. Gate AI on paid tier ($20/mo plan = $240/yr revenue; AI cost on paid only ≈ $250/yr; free users get cached templates only). Postgres, hosting, realtime, egress: never cross 50% with the right config (CloudFlare R2, managed realtime).

**One number to watch**: AI cost per paid user per month. Target <$5. Lever: cache hit ratio. Below 60% the unit economics break. Above 90% they're great.

---

## 5. Disaster Recovery Checklist

Specific to this codebase. Reference the migration system at `src/lib/db/migrate.ts`.

### 5.1 Postgres Backup Cadence

- **Continuous WAL archiving** to S3 (managed Postgres handles this — RDS does, Supabase does, raw EC2 needs `wal-g` or `pgBackRest`).
- **Snapshot cadence**: every 6h, retained 14 days. Daily snapshots retained 90 days. Weekly retained 1 year.
- **PITR**: 7-day window minimum. Required for the Phase 2+ scale.

### 5.2 RPO/RTO Targets

- **RPO**: ≤ 5 min. Achievable with continuous WAL.
- **RTO**: ≤ 30 min for single-region failover (read replica promotion). ≤ 4 hours for full restore from snapshot.

### 5.3 Restore Drill Steps (run quarterly)

1. Restore a 24–48h-old snapshot to a sandbox DB in a different VPC.
2. Run `npm run db:migrate:status` (`scripts/db-migrate.ts` per `package.json:24`) to verify schema state.
3. Pick 10 random `business_id`s from prod, diff full graph (campaigns + submissions + perks + audit_log) prod-vs-sandbox. Expect ≤RPO drift.
4. For PITR drills: replay WAL to a known-good timestamp.
5. `DATABASE_URL=<sandbox> npm run test:e2e` should pass green.
6. Document restore time. File a gap ticket if > RTO.

### 5.4 Application Layer DR

App fleet is stateless — restore = redeploy GHCR image. Sessions live in Redis (Phase 1+) and `auth_sessions` Postgres table; Redis loss tolerated via JWT fallback (`auth/index.ts:249`). Job queue (BullMQ) Redis-backed with AOF + replication, RPO ~1s. In-flight HTTP: re-issue.

### 5.5 Game Days

- **PG failover** quarterly: replica promotion, app reconnect.
- **Redis loss**: rate limiter must fail open, not closed. The current limiter (`src/lib/security/rate-limiter.ts`) has no Redis fallback — document fail-open explicitly when migrating.
- **Stripe webhook flood**: replay 10k webhooks in 60s; `webhook_events` dedup must hold.
- **AI provider outage**: `/api/v1/ai/*` should serve cached fallbacks with 503, not 500.
- **CDN poisoning**: confirm invalidation procedure.

### 5.6 SPOFs to Eliminate Before Phase 3

Stripe webhook endpoint (queue it; `webhook-dedup.ts` makes replays safe). Single Postgres URL in `next.config.js` and `docker-compose.yml` (writer/reader split). Single Redis (Cluster or multi-AZ Elasticache). Single CI pipeline (manual deploy path documented).

---

## Appendix: Files Cited

`src/lib/db/schema.ts`, `src/lib/db/connection.ts`, `src/lib/db/migrate.ts`, `src/lib/db/repositories/{influencer,submission}-repository.ts`, `src/lib/security/rate-limiter.ts`, `src/lib/jobs/queue.ts`, `src/lib/realtime/{index,publisher}.ts`, `src/lib/embedding-engine.ts`, `src/lib/auth/index.ts`, `src/lib/webhook-dedup.ts`, `src/lib/infrastructure/media.ts`, `src/lib/notifications/channels.ts`, `src/lib/email/index.ts`, `src/app/api/v1/events/route.ts`, `next.config.js`, `vercel.json`, `docker-compose.yml`, `Dockerfile`, `.github/workflows/{ci,deploy,security}.yml`, `package.json`.
