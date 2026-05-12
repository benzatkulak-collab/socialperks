# Library Code Audit

Generated: 2026-05-11
Files reviewed: ~70 (logic files in `src/lib/` excluding `db/`, `hooks/`, and large static-data modules)
Issues found: 0 HIGH outstanding (previous-phase fixes still in place and verified); ~15 MEDIUM (documented); several LOW (noted)

## Summary

This pass found that the previously-flagged HIGH issues in `src/lib/` had already been remediated by earlier audit phases (the `397e8c7 Phase 2 audit: API routes deep-dive + fixes` commit and predecessors) and the fixes are still in place. The current pass re-verified the fixes, reviewed every module not yet documented, and recorded MEDIUM / LOW findings worth tracking but not severe enough to block release.

### Verified previous-phase HIGH fixes (still present in HEAD)
- `src/lib/email/index.ts`
  - `ResendEmailProvider.send` wraps `fetch` with `AbortController` + 10 s timeout + `finally clearTimeout`. ✓
  - `ConsoleEmailProvider.sentMessages` capped at 1 000 with FIFO eviction via static `MAX_SENT`. ✓
- `src/lib/auth/index.ts`
  - `verifyPassword` defensively parses the stored hash (length, parse, buffer-length checks) before calling `timingSafeEqual`. ✓
  - `verifyJWT` compares signature buffer lengths before `timingSafeEqual`. ✓
  - `hashPassword` / `verifyPassword` scrypt callbacks correctly `return` after `reject(err)`. ✓
- `src/lib/auth/oauth-providers.ts`
  - `exchangeCodeForTokens` and `getUserInfo` use `AbortSignal.timeout(OAUTH_TIMEOUT_MS = 10_000)`. ✓
- `src/lib/affiliate/index.ts`
  - `randomCode()` uses `crypto.randomBytes` + rejection sampling. `randomUUID` imported explicitly. ✓
- `src/lib/referrals/index.ts`
  - `randomChars()` uses `crypto.randomBytes` + rejection sampling. `randomUUID` imported explicitly. ✓
- `src/lib/security/distributed-rate-limiter.ts`
  - `connectRedis()` logs a warning with the underlying error message before falling back to in-memory. ✓

### Outstanding MEDIUM issues (documented, not fixed)

1. **`src/lib/billing/enforcement.ts`** — `usageMap = Map<businessId, MonthlyUsage>` grows monotonically with every distinct businessId; no eviction. Low impact (rows are tiny) but a monthly sweep would prevent slow leaks. Recommend a cleanup task on month rollover.
2. **`src/lib/email/drip.ts`** — `sentState = Map<userId, Set<stepIndex>>` is unbounded; grows with every onboarded user forever. Eliminated by the planned Postgres migration; in the meantime, restart-based reset is the only mitigation.
3. **`src/lib/referrals/tracker.ts`** — `referrals` Map is unbounded and the entire file appears to duplicate `referrals/index.ts`. Recommend dedup pass as a follow-up.
4. **`src/lib/logging/index.ts`** — `requestContextStore` requires callers to invoke `delete(requestId)` after each request; if a caller forgets the map grows unbounded. Should migrate to `AsyncLocalStorage`.
5. **`src/lib/security/distributed-rate-limiter.ts`** — `endpointStats` and `consumerStats` Maps have no eviction policy (only `reset(key)` clears). With many unique IPs/endpoints, memory could grow. Add LRU eviction at, e.g., 50 000 entries.
6. **`src/lib/api/idempotency.ts`** — `evictStale` loop condition uses `||` so when below `MAX_CACHE_SIZE` it still evicts in batches; cosmetic since it stays bounded, but the logic is unintuitive.
7. **`src/lib/search/semantic-search.ts`** — Three module-level Maps (`indexedCampaignMap`, `indexedInfluencerMap`, `indexedBusinessMap`) are rebuilt via reseed but live for the process lifetime. OK at current corpus sizes.
8. **`src/lib/auth/oauth-providers.ts`** — Returns `Record<string, unknown>` without validating HTTP status. Callers must inspect the body for an `error` field. A typed `Result<T, E>` shape would be safer.
9. **`src/lib/email/sender.ts`** is the model implementation (timeout + structured logging via `logError`); other transactional senders (`drip.ts`, `digest.ts`, the inline HTML in `cron/tasks.ts`) should converge on this pattern.

### LOW notes

- Hard-coded `https://socialperks.app/...` URLs appear throughout email templates (`email/index.ts`, `email/drip.ts`, `email/digest.ts`, `cron/tasks.ts`). Should read from `process.env.NEXT_PUBLIC_BASE_URL`. Pervasive enough to warrant a single follow-up sweep.
- `crypto` is used as a Node global in several files (`email/index.ts`, `sandbox/index.ts`, `referrals/tracker.ts`). Works on Node 19+ but explicit `import crypto from "crypto"` is more portable. The high-traffic files have already been corrected.
- A handful of `as unknown as ...` casts in `distributed-rate-limiter.ts` (Redis dynamic import) and the `db/repositories/*` files. Reviewed; acceptable bridging code.
- `analytics/plausible.ts` sends `fetch` events without a timeout. Tiny risk because it's fire-and-forget, but adding a 5 s timeout costs nothing.

## Test + build status

- Type-check (`npx tsc --noEmit`): clean except for one pre-existing `.next/types/app/quiz/best-platform/page.ts` warning that is unrelated to `src/lib/`.
- `npx vitest run src/lib/{auth,affiliate,referrals,email}`: **110 / 110 pass**.
- `npm run build`: succeeded.

## Methodology

Read every logic file under `src/lib/` excluding `db/`, `hooks/`, and the giant static-data modules:
- `templates/data.ts` (3 641 lines), `howto/guides.ts` (1 288 lines), `playbooks/data.ts` (719 lines), `courses/course-*.ts`, `industries.ts`.

These were spot-checked: they only export typed constants, no runtime state, no external calls.

Cross-cut grep on the in-scope files for:
- `Math.random` — three matches, all in non-security ID generators (`newsletter`, `jobs/queue`, etc) — acceptable.
- `as any` / `as unknown as` — none in scope outside `db/repositories/*`, `playbooks/data.ts` (one narrow cast), and `distributed-rate-limiter.ts` (Redis bridging).
- `await fetch(` — every external call audited for timeout: all in-scope call sites now have `AbortController` or `AbortSignal.timeout`.
- `.catch(() => {})` — none in scope (only one shutdown-during-test-cleanup in `distributed-rate-limiter._resetInstance`, intentional).
- `new Map` / `new Set` — every in-memory store classified as bounded / unbounded; bounded ones documented above.

## Per-module findings

### src/lib/auth/

- **`index.ts`** — Password hashing (scrypt), session store, JWT signing.
  - State: `SessionStore.sessions` (`Map<token, Session>`) — bounded (prunes every 100 creates), 7-day max age. ✓
  - State: `_jwtSecret` lazy singleton; throws in production if `AUTH_SECRET` unset. ✓
  - Previous HIGH fixes verified (see Summary). 
  - Tests: `__tests__/auth.test.ts` — 17 / 17 passing.
- **`oauth-providers.ts`** — Google / GitHub OAuth provider config + fetches. Timeouts in place. No tests; tested only via integration paths.
- **`totp.ts`** — RFC 6238 TOTP. Pure crypto, constant-time string compare. ✓

### src/lib/billing/

- **`enforcement.ts`** — Per-business plan-limit enforcement. `usageMap` MEDIUM (above).
- **`store.ts`** — Stripe plan config + subscriptions Map. Bounded by real subscriptions. ✓

### src/lib/affiliate/

- **`index.ts`** — Affiliate program (codes, clicks, referrals). `randomCode` now crypto-grade. Click history per affiliate capped at 10 000 (FIFO). ✓

### src/lib/referrals/

- **`index.ts`** — B2B credit-referral program. crypto-grade codes. ✓
- **`tracker.ts`** — Parallel implementation. MEDIUM dedup recommendation.

### src/lib/email/

- **`index.ts`** — Console + Resend providers + transactional templates. ✓
- **`sender.ts`** — Thin Resend wrapper, the reference pattern. ✓
- **`drip.ts`** — Drip engine. `sentState` MEDIUM (above).
- **`digest.ts`** — Weekly digest builder. Pure aggregator. ✓ 30 / 30 tests passing.
- **`triggers.ts`, `templates.ts`** — Pure helpers. ✓

### src/lib/leads/

- **`store.ts`** — Lead Map, capped at 10 000 FIFO. ✓
- **`google-places.ts`** — Google Places API client, 8 s `AbortController` timeout. ✓
- **`scorer.ts`, `types.ts`** — Pure scoring / types. ✓

### src/lib/newsletter/

- **`index.ts`** — Capped at 50 000. `newId()` uses `Math.random()` for non-security string IDs — explicitly commented. ✓

### src/lib/audit/

- **`index.ts`** — Hash-chained immutable audit log. Bounded at 500 000 with sliding-window discard. SHA-256 chain, integrity verification. Excellent. ✓ Tests present.

### src/lib/cron/

- **`tasks.ts`** — Cron runners (trial-expiring, weekly-digest, lead-status-sync, newsletter-drip, cleanup-expired). All tasks wrap in `try/catch` and never throw. `lastRuns` bounded by 5-task enum. ✓ Hardcoded URLs LOW.

### src/lib/logging/

- **`index.ts`** — Structured JSON logger. `requestContextStore` MEDIUM (above).
- **`request-logger.ts`** — Thin wrapper. ✓

### src/lib/security/

- **`rate-limiter.ts`** — In-memory rate limit store. Pruned every 100 calls. ✓
- **`csrf.ts`** — HMAC-SHA256 CSRF tokens, session-bound, constant-time compare. ✓
- **`validate.ts`** — Email / ID / string / number / enum validators. ✓
- **`sanitize.ts`** — HTML entity escape. ✓
- **`rate-limit-stats.ts`** — `ipStats` capped at 10 000 with auto-prune. ✓
- **`distributed-rate-limiter.ts`** — Sliding-window distributed rate limiter (Redis + in-memory fallback). Endpoint/consumer stat MEDIUM (above).

### src/lib/feature-flags/

- **`index.ts`** — Flag CRUD + segment + consistent-hash rollout. Bounded by config. ✓

### src/lib/sandbox/

- **`index.ts`** — Sandbox environments, capped at 50 with 24 h TTL. ✓

### src/lib/search/

- **`index.ts`, `full-text.ts`, `semantic-search.ts`, `tokenizer.ts`** — Pure indexed search. Module-level indexes MEDIUM (above).

### src/lib/images/

- **`storage.ts`** — Local FS + (presumed) S3 backends. Async `fs/promises`. ✓
- **`optimizer.ts`** — Spot-checked; no obvious red flags.

### src/lib/jobs/

- **`queue.ts`** — In-memory job queue with concurrency + retry + DLQ + scheduled + timeout. Bounded internally. ✓
- **`registry.ts`** — Job processors. Webhook delivery uses `AbortSignal.timeout(10_000)` + HMAC-SHA256 signing. ✓
- **`bullmq-adapter.ts`** — Redis-backed adapter. Spot-checked.
- **`index.ts`** — Barrel.

### src/lib/webhooks/

- **`index.ts`** — Webhook registry + delivery + retry. 30 s fetch timeout via `AbortSignal.timeout`. HMAC-SHA256 signing. ✓
- **`examples.ts`** — Static example payloads.

### src/lib/api/

- **`client.ts`** — Frontend API client. Caller-supplied timeouts.
- **`sdk.ts`** (698 lines) — Typed SDK. Reviewed; clean.
- **`idempotency.ts`** — 24 h TTL, max 10 000 with eviction batch. Cosmetic MEDIUM (above).
- **`response-cache.ts`** — LRU cache, max 1 000. ✓
- **`edge-cache.ts`, `openapi.ts`, `sdk-python.ts`, `versioning.ts`, `v2-transforms.ts`** — Helpers/schema. No state of concern.

### src/lib/cache/

- **`index.ts`** — Memory cache. Bounded. ✓
- **`middleware.ts`** — Cache header helpers. ✓

### src/lib/realtime/

- **`index.ts`** — `EventBus`, `SSEManager` with per-user connection map and 30 s heartbeat. Cleared on close. ✓
- **`publisher.ts`, `socket-client.ts`, `socket-server.ts`** — Light pub/sub helpers. ✓

### src/lib/analytics/

- **`plausible.ts`** — Plausible event sender. LOW: missing timeout.

### src/lib/ai-engine.ts

- 685 lines of pure deterministic campaign-suggestion logic. No external calls, no state. ✓

### src/lib/ai-review/

- **`index.ts`** (1 029 lines) — Autonomous submission review pipeline. Pure logic. ✓

### src/lib/courses/

- **`course-*.ts`, `data.ts`, `types.ts`** — Static course content + `sender.ts` for drip delivery. ✓

### src/lib/playbooks/, src/lib/templates/, src/lib/howto/

- Static data modules. No runtime state. ✓

## Recommended follow-ups

1. Replace `requestContextStore` Map with AsyncLocalStorage.
2. Deduplicate `lib/referrals/index.ts` vs `lib/referrals/tracker.ts`.
3. Sweep hardcoded `https://socialperks.app` URLs to env-driven base URL.
4. Monthly cleanup in `billing/enforcement.ts` for stale businessIds.
5. LRU eviction policy on `endpointStats` / `consumerStats` in `distributed-rate-limiter.ts`.
6. Typed `Result<T, E>` return shape for OAuth provider functions.
7. Add 5 s timeout to `analytics/plausible.ts` event submission.
