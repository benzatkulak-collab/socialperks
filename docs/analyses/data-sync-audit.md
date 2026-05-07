# Data sync + event integrity audit

**Scope:** every code path where state replication, cache invalidation, event publication, or aggregate maintenance can silently fall out of sync. Severities reflect blast radius today (~10 paying customers, single-instance deploy, partial Postgres write-through).

**Source-of-truth model:** Stripe for billing; internal store + event log for campaigns/submissions/perks/programs; JWT for short-lived auth, `auth_sessions` table for long-lived. The reconciliation framework (`reliability/reconciliation.ts`) and metrics shelf (`reliability/metrics.ts`) exist but the `jobs[]` registry is empty at runtime — machinery present, no jobs registered.

## Sync guarantee classification

| Entity | Today | Should be |
| --- | --- | --- |
| `campaigns` (lifecycle in `campaignManager`) | Per-process strong; durable write-through to `launched_campaigns` is best-effort and doesn't fail the request on DB error | Per-tenant strong, transactional on launch + state transition |
| `submissions` (`src/lib/submissions.ts`) | Per-process strong; write-through to DB after the in-memory store is updated | Per-tenant strong, transactional with perk award on approval |
| `programs / programMembers / programSubmissions / payouts` (`src/lib/programs/store.ts`) | Per-process eventual at best — pure in-memory `Map`, no schema in `db/schema.ts`, no write-through anywhere | Per-tenant strong, persisted |
| `earnedPerks` (`src/lib/perk-wallet.ts`) | Per-process strong, locked on redemption only; **no DB write-through** despite `earned_perks` table being defined | Per-tenant strong, persisted, locked on redemption AND award |
| `payouts` (Stripe Connect, `src/lib/payouts/index.ts`) | Eventual — Stripe is canonical; in-memory `Map` is a non-durable mirror with no reconciliation | Eventual with mandatory reconciliation job vs Stripe |
| `auth_sessions` | Strong (JWT) + eventual (session token cache hydrated lazily) | Same |
| `api_keys` (`auto-issue.ts`) | Eventual — DB is canonical when configured; in-memory `Map` is a fallback | Strong via DB; remove the in-memory shadow once DB is required |
| `subscriptions` (Stripe) | Eventual via webhook + write-through | Same, but with reconciliation job |
| `monthly_usage` (`billing/enforcement.ts`) | Eventual — in-memory cache + DB write-through with `MAX(local, db)` reconcile on cold start | Same; acceptable given the documented tradeoffs |
| `referrals` (`src/lib/referrals/index.ts`) | Per-process only — no schema, no persistence | Per-tenant strong |
| `feature_flags`, `experiments` | Per-process only — flags evaporate on cold start | Strong via DB |
| `webhooks` outbound (`src/lib/webhooks/index.ts`) | Per-process only — endpoints, deliveries, retry schedule all in `Map` | Strong; durable retry queue |
| `payoutAccounts` / `payoutRequests` | Per-process — Stripe is canonical, our mirror is informational only | Eventual with reconciliation |

## Findings

P0 = silent data loss or financial discrepancy in normal operation. P1 = break under concurrency, cold start, or specific request sequences. P2 = break under degraded conditions or scale-out.

| # | File:Line | Pathology | Concrete failure scenario | Sev | Fix sketch |
|---|-----------|-----------|---------------------------|-----|------------|
| 1 | `perk-wallet.ts:17` | `wallets: Map<string, PerkWallet>` is the only store. `earned_perks` and `perk_wallets` tables exist (`db/schema.ts:382/417`) but nothing writes to them. | `awardPerk()` succeeds → process restart → user reads `/api/v1/perks/wallet`, sees zero perks. **Every wallet of every customer of every business.** Any deploy = mass wipe. | P0 | Add `persistPerk()` write-through after `wallet.perks.push(perk)` (line 225); hydrate by `userId` on first wallet read. |
| 2 | `programs/store.ts:77-80` | `programs`, `programMembers`, `programSubmissions`, `payouts` are pure `Map`s. No tables in `db/schema.ts`. | Business creates program, members enroll & submit, business approves cashback. Process restarts. **Every program, every member, every pending payout gone.** Members submitted social proof for nothing. | P0 | Add `programs`, `program_members`, `program_submissions`, `program_payouts` tables; port routes to repository calls. |
| 3 | `perk-programs.ts:311-314` | `PerkProgramManager.programs/members/actions/cashBackPayouts` — **second** in-memory program store, parallel to #2. | `/api/v1/programs` writes to #2; AI agents and submission flows that import `perkProgramManager` write to this one. Disjoint. A program created via API is invisible to `perkProgramManager.getProgram()`. | P1 | Pick one. The class-based one is richer; gut `programs/store.ts` exports and have routes call the manager. |
| 4 | `perk-programs.ts:879-898` | `processAllCycleResets()` reads from live `Map`s, then writes back via `members.set(key, progress)` inside `resetCycle()` without a lock. | Cron triggers `processAllCycleResets()`. Concurrently `submitAction()` is in flight for `(programId, memberId)` between line 694 (`.push`) and 716 (`.set`). Cron's `resetCycle` snapshots `completedActions`, request appends a new action, cron then overwrites with `carriedActions = []`. **Just-submitted action lost.** | P1 | Per-program lock like `withRedemptionLock` (`perk-wallet.ts:24`). Or transactional SQL UPDATE once persisted. |
| 5 | `perk-programs.ts:535` | `program.currentMembers += 1` is a denormalized counter alongside the `members` map. `unenrollMember` (`:550`) papers over with `Math.max(0, ...)`. | Two concurrent `POST /programs/:id/members` for **different** memberIds race the `currentMembers >= maxMembers` check at `:503`. Both pass, both increment. `currentMembers = maxMembers + 1`. | P2 | CAS or single `INSERT … RETURNING` once persisted. Until then, count at read time. |
| 6 | `perk-programs.ts:701-714` | `submitAction` triggers `requestCashBack` inline on tier completion. Both write in-memory only. **No `eventPublisher.publish` fires.** | Member completes one-time roofer cashback program; payout created; business dashboard subscribed via SSE never sees it. No `payout.requested` event in the emit map. | P1 | Add `eventPublisher.publish("payout.requested", { payoutId, programId, memberId, amount }, program.businessId)` inside `requestCashBack`. |
| 7 | `billing/webhook/route.ts:122-129` | `markEventProcessed` runs **before** `persistSubscription` (`:175`). On DB failure, `processedEvents.delete(eventId)` (`:179`) clears only the local map; the Postgres `webhook_events` row stays. Stripe retries see "duplicate" and skip. | `checkout.session.completed` arrives. DB write fails (transient pool exhaustion). 500 returned. Stripe retries. Postgres dedup says "already processed". **Subscription never created**; customer paid, no plan record. | P0 | Wrap dedup mark + business write in a transaction: `BEGIN; INSERT webhook_events; INSERT business_subscriptions; COMMIT;` with `ON CONFLICT DO NOTHING` on the dedup row. |
| 8 | `submissions/review/route.ts:139-150` | Approve submission, award perk, record completion are **three sequential non-transactional steps**. | `reviewSubmission` succeeds. `awardPerk` succeeds in memory. Process crashes before `recordCompletion` (`:150`). Next deploy loses the perk (#1). Counter never advanced. **Submission approved-but-perkless.** | P1 | Single transaction; or compensating reconciliation that sweeps `status=approved AND perkAwarded=false`. |
| 9 | `submissions/review/route.ts:178` | `eventPublisher.publish("submission.approved")` runs after `reviewSubmission`'s `void persistSubmission(...)` (fire-and-forget). SSE clients receive the event before the row is durable. | Browser receives `submission.approved` SSE event, refetches `/submissions?status=approved`, sees it still pending. UI flips approved → pending. | P2 | Await persist before publish, or include enough payload that client doesn't need to refetch. |
| 10 | `realtime/publisher.ts:34-43` | Publish loop catches and **silently** swallows listener errors. No metric, no log, no DLQ. | SSE controller throws because socket closed but `unsubscribe()` hasn't run yet (between `req.signal.abort` firing and `events/route.ts:102`). Event silently dropped for that subscriber. | P2 | `metrics.increment("realtime.listener.error")` in the catch. |
| 11 | `events/route.ts:74-84` | SSE subscriber receives only events published while connected. **No backfill.** `formatSSE` writes `id: "0"` only on connect (`:23`); `Last-Event-ID` resumption is impossible. | Mobile flips network. Submission approved during gap. Reconnects. UI never updates. User redeems an "available" perk three days later that was actually expired. | P1 | Persist published events with monotonic IDs and replay on `Last-Event-ID`, or have client refetch on reconnect. |
| 12 | `perk-wallet.ts:299-310` | `redeemPerk` lazily transitions `available`→`expired` on read. `getWallet` (`:420`) returns a snapshot but **doesn't write** the expired status. `expirePerks` (`:453`) writes but is never called by any cron. | Perk expired 3 days ago. Reconciliation (if existed) would compare in-memory vs DB and find drift. Status remains stale until a redeem attempt happens to flip it. | P2 | Schedule `expirePerks()` from cron route; emit `metrics.increment(METRIC.PERK_EXPIRED)`. |
| 13 | `perk-wallet.ts:225-242` | Ledger write at `:238` is wrapped in try/catch and logs but doesn't roll back the perk award. | `ledger.awardPerk` throws (invalid account, etc.). Perk in wallet, ledger short by one entry. `verifyBalance()` reports mismatch forever. | P1 | Either remove the try/catch and let the function fail (callers retry), or push failed entry to a "needs replay" queue. |
| 14 | `billing/enforcement.ts:84-91` | `getUsage` returns the in-memory bucket immediately and kicks off `scheduleHydration` async. Comment at `:300-305` acknowledges the race. | Cold start. Free-tier business is at 49/50 in DB. First `checkCompletionLimit()` returns `current=0, allowed=true`. `recordCompletion` writes `1` locally; DB upsert lands `monthly_usage.completions = 50`. Hydration takes `MAX(1, 50) = 50`. **The request between hydration kick-off and arrival was already approved.** Free tier ends at 51. | P2 | `getUsage: Promise<MonthlyUsage>` for the first call per (business, month). ~50ms cold start cost. |
| 15 | `auth/index.ts:86-95` | `sessionStore.get(token)` returns null for any token not in cache, even if it exists in `auth_sessions`. Hydration at `:183` is fire-and-forget. | Cold start. User with session token (not JWT cookie) hits `/api/v1/anything` 1ms after cold start. Hydration incomplete. 401. User logged out. | P2 | `get` falls through to DB on miss; populate cache on hit. |
| 16 | `payouts/index.ts:354-432` | `handleAccountUpdated`, `handleTransferCreated/Paid/Failed` linearly scan in-memory Maps. **No persistence.** | Stripe sends `transfer.paid`. Handler updates in-memory `payoutRequests`. Process restarts. Stripe doesn't double-send. Payout permanently `processing` locally; Stripe shows `paid`. **Influencer thinks unpaid; we think we owe; they were paid.** | P0 | Persist to `influencer_payouts`; reconciliation job vs Stripe `transfers.list`. |
| 17 | `payouts/index.ts:48-52` | `addPayoutToIndex` mutates `influencerPayouts` map sequentially, no lock. | Two concurrent `requestPayout` for same influencer. Both read `existing = ... ?? []`, both `.push` their own copy, both `.set()`. **One ID lost from the index.** Payout itself is in `payoutRequests` so `getPayoutHistory` is silently incomplete. | P2 | Per-influencer lock or compute index lazily on read. |
| 18 | `api-keys/auto-issue.ts:71-72` | DB write at `:57` swallows ALL errors with `/* fall through to memory */`. | DB times out during signup. Key only in `memoryByOwner`. Tomorrow user clicks "show my API key" — looked up by `business_id` from `api_keys` — finds nothing. Secret was returned only at issuance. | P1 | Don't return the key if persistence failed; or retry; or log to `issuance_failures`. |
| 19 | `programs/route.ts:148-161` | `programs.set(program.id, program)` is the entire write path. **No write-through, no event publish, no audit.** | Business creates program. Process restarts. Program gone. Browser refresh shows empty list. | P0 | Persist (see #2). |
| 20 | `programs/[programId]/cashback/route.ts:185/208/232/256` | Each cashback transition is `payouts.set(payoutId, updated)` with status precondition checked **without a lock**. | Two operators click "Mark Paid" simultaneously on an `approved` payout. Both reads see `approved`. Both succeed. Second `set` overwrites first's `processedAt`. **Money sent twice.** | P1 | CAS on status: `if (current.status !== expectedFrom) reject`, in a transaction. |
| 21 | `feature-flags/index.ts:43` | `flags = new Map()` — no persistence, no schema. | Operator turns on a flag in admin UI. Vercel scales out. New instance has no flag. Half of users see flag on, half off. Cold start of the original instance loses it too. | P1 | Persist to `feature_flags` table; refresh on read with short TTL cache. |
| 22 | `experiments/index.ts:77-78` | `experiments` and `assignments` Maps. | After cold start, experiment definitions evaporate. Active assignments persist in client cookies but the server-side variant logic that reads `experiments.get(id)` returns undefined → fall-through behavior. | P1 | Persist; or stateless deterministic assignment via consistent hash. |
| 23 | `referrals/index.ts:34-48` | Five separate in-memory indexes; no persistence. Schema declares `referral_codes` and `referral_attributions` (`db/schema.ts:765/798`) but nothing writes to them. | Business shares referral link. Referee signs up next day after a deploy. `findReferralByReferee` (`billing/webhook/route.ts:207`) returns nothing. **Referrer never credited even though Stripe converted the referee.** | P0 | Wire the in-memory functions to those tables. |
| 24 | `billing/store.ts:96` | `subscriptions = new Map()` has `persistSubscription` write-through but **rehydration on cold start is not eager**. Read directly by `enforcement.ts:102` (plan lookup) and `billing/webhook/route.ts:153` (idempotency). | Cold start. Stripe sends `customer.subscription.updated`. Handler at `:226` reads `subscriptions.get(subId)` → undefined → silently skips. Status stuck since deploy. | P1 | Eager hydrate on module load (mirror auth subsystem). |
| 25 | `campaigns/route.ts:243-256` | `campaignManager.launch(...)` writes in-memory; `persistLifecycle(...)` is `void` (fire-and-forget); `eventPublisher.publish("campaign.created")` runs immediately, **before persist resolves**. | Launch returns 201. Browser navigates to detail page. Different process (or post-restart) doesn't have it in DB yet. 404. | P1 | `await persistLifecycle(...)` — fail-fast latency is better than the silent miss. |
| 26 | `campaign-state-machine.ts:18` | `budgetLocks: Map<string, Promise<void>>` is in-process only. | Single instance today (P2). Multi-instance: two parallel `recordCompletion` on different instances both pass `budget.spent + delta <= budget.allocated`. Budget overrun. | P2 | Distributed lock (`SELECT … FOR UPDATE`) once horizontal. |
| 27 | `fraud-detection.ts:121-133` | `knownProofUrls`, `contentFingerprints`, `shingleIndex`, `submissionContent` cap at `MAX_*` and **silently evict** on overflow. | Fraudster submits proof URL, waits a day until cache rotates past 100k entries, resubmits same URL on a different campaign. Duplicate check passes. Silent fraud. | P1 | DB-backed lookup (one row per `proof_url` with partial unique index). |
| 28 | `verification/webhook/route.ts:36-53` | `recentEventIds: Set<string>` caps at 10000, evicts oldest 1000 on overflow. Postgres dedup at `markEventProcessed` covers prod; dev fallback (no DB) silently allows replay after eviction. | Dev environment, attacker replays a stale event. Set rotated past it. Replay accepted. (Prod has Postgres dedup, blast radius is dev only.) | P2 | Drop in-memory dedup once DB mandatory in prod. |
| 29 | `verification/webhook/route.ts:185-186` | Webhook acks `received: true` but **does no actual processing** ("In production, this would dispatch to event handlers"). | Platform sends `instagram.post.published`. We ack. No mutation to the matching `submissions` row. **The verification webhook is not actually wiring verification to submissions.** Submission stays `pending` until manual review. | P0 | Implement dispatch. Each event type mutates the corresponding submission/campaign and emits a domain event. |
| 30 | `perk-wallet.ts:194-206` | Duplicate-award check is a linear scan of `wallet.perks` on `submissionId`. Not a unique index. | Reviewer double-clicks "approve" within milliseconds. Both requests pass the check (read array before either appended). Both push a perk for the same `submissionId`. Wallet has two perks for one submission. | P1 | Per-`(userId, submissionId)` lock or `UNIQUE(submission_id)` on `earned_perks` once persisted. |
| 31 | `auth/index.ts:91` | `get` deletes from in-memory cache then async-deletes from DB. Concurrent hydrate reads filter by `expires_at > now()` so it skips. | **No drift.** Listed as a near-miss for completeness. | — | No fix needed. |
| 32 | `perk-programs.ts:91/695/824/826` | Aggregates stored separately: `totalActionsAllTime`, `totalCyclesCompleted`, `currentStreak`, `longestStreak`, `currentMembers` updated by hand at every mutation site. | Cycle reset (`:823-830`) sets `currentStreak = 0` only if `metMinimum` is false. Actions later marked `rejected` after reset has counted them — `metMinimum` was true at reset, wrong in retrospect. Streak says "current: 5", history shows broken cycles. | P2 | Compute streaks at read time from `history`. Drop denormalized field. |
| 33 | `billing/webhook/route.ts:188-201` | Welcome-email and referral credit are in independent try/catch blocks that swallow errors. Stripe doesn't retry — we returned 200. | DB write succeeded but `findReferralByReferee` errors. Referrer never credited; no audit row indicating we tried. We owe a credit; no record of owing. | P1 | Push credit-referral to a durable job queue; job retries on its own. |
| 34 | `realtime/index.ts:101-138` | A second SSE manager (`SSEManager`) coexists with `eventPublisher`. They're not wired together. | Code path emitting to `sseManager.sendToBusiness(...)` → /api/v1/events SSE only subscribes to `eventPublisher` → event invisible to browsers. | P2 | Delete `SSEManager` or fan it out from `eventPublisher`. |
| 35 | `programs/store.ts` (no schema) — orphan risk | `programs` Map has `businessId` but no cascade. `db/schema.ts:140` declares businesses as soft-deletable. | Business soft-deletes. Programs remain `active`, members keep submitting, cashback requested against a closed business with no Stripe customer. Stuck. | P1 | `business.deleted` handler that pauses programs and rejects new submissions/cashback. |

35 findings (one near-miss at #31). **Categories with no notable findings:** rate limiter (`security/rate-limiter.ts:20`) and distributed rate limiter (`security/distributed-rate-limiter.ts:68-73`) — ephemeral by design. Metrics collector (`reliability/metrics.ts:49-51`) — monitoring-only, staleness tolerable.

## Event map

```
        domain code (perk-wallet, submissions, campaign-state-machine, perk-programs)
                │                          │                          │
                ▼                          ▼                          ▼
        eventStore.emit          eventPublisher.publish       metrics.increment
        (events.ts — array       (realtime/publisher.ts —     (reliability/metrics.ts)
         cap 100k, evicts)        Set<callback>)
                                          │
                          ┌───────────────┴───────────────┐
                          ▼                               ▼
                /api/v1/events SSE              outbound webhooks
                (per-connection sub)            (NEVER subscribes — gap)
```

### Events emitted via `eventPublisher.publish`

| Event | Producer | Consumers | Single point of failure? |
| --- | --- | --- | --- |
| `user.created` | `auth/route.ts:287` | SSE only | Yes — no DB analytics row, no notification record |
| `submission.created` | `submissions/route.ts:211` | SSE only | Yes |
| `submission.approved` | `submissions/review/route.ts:178` | SSE only; **NOT** the outbound webhook system | Yes — businesses subscribed via outbound webhooks don't receive this |
| `submission.rejected` | `submissions/review/route.ts:178` | SSE only | Yes |
| `campaign.created` | `campaigns/route.ts:256` | SSE only | Yes |
| `campaign.paused/resumed/ended` | `campaigns/route.ts:336/340/344` | SSE only | Yes |

**Critical gap:** outbound `webhooks/index.ts` declares `KNOWN_EVENT_TYPES` (submission.approved, perk.awarded, etc.) but **nothing wires `eventPublisher.publish` to outbound webhook delivery**. `eventPublisher` is imported in `webhooks/index.ts:11` but `subscribe` is never called. Customers who registered webhooks for those events receive nothing. P0 product-surface gap.

**`eventStore.emit` (separate bus):** `emitCampaignEvent/Submission/Perk` (events.ts:316/338/364) push to a 100k array; `events.ts:142` evicts the oldest 20% on overflow. Analytics derives from this store (`analytics-engine.ts:9`). After enough activity, analytics history silently truncates; the `console.warn` is invisible, no metric, no alert.

## Reconciliation jobs that should exist (and don't)

The framework in `src/lib/reliability/reconciliation.ts` is unregistered. Concrete jobs to add:

| Job | What it reconciles | Query / approach | Cadence | Alert threshold |
|-----|--------------------|-----------|---------|-----------------|
| `subscriptions-vs-stripe` | `subscriptions` Map ↔ Stripe `customers.list` + `subscriptions.list` | Page through Stripe subscriptions, compare `status` and `current_period_end`; mark drifts as `manual_review` if our store has `active` but Stripe has `canceled` (revenue leak) | Hourly | Any mismatch where Stripe is canceled/past_due and we are active |
| `transfers-vs-stripe` | `payoutRequests` Map ↔ Stripe `transfers.list` | All transfers in the last 7d; status reconcile; the in-memory map will be empty after a redeploy → repopulate | Hourly | Any transfer paid in Stripe but not `completed` locally |
| `submissions-vs-perks` | Approved submissions where `perkAwarded=false` | Scan submissions store; for each `status=approved` with no matching perk in `wallets` → fix by replaying `awardPerk` (idempotent via `submissionId` check) | Every 15 min | More than 5 unrepaired in 15 min |
| `perks-vs-ledger` | `wallets[*].perks` ↔ `financial-ledger` entries | For each perk, expect one ledger entry of type `perk_awarded` and (if redeemed) one of `perk_redeemed` | Daily | Any missing entry |
| `programs-currentMembers-counter` | `program.currentMembers` ↔ `count(members where programId=p.id)` | Count matching keys in `programMembers` map; compare to `program.currentMembers` | Daily | Any drift |
| `webhook-events-orphans` | Postgres `webhook_events` with no corresponding business state change | LEFT JOIN webhook_events → subscriptions where source='stripe' and event type implies a write | Daily | Any orphan older than 1h |
| `auth-sessions-cache-vs-db` | `sessionStore.sessions` ↔ `auth_sessions` | Count both, compare; flag DB rows missing from cache (cold start gap) and cache entries missing from DB (write-through fail) | Hourly | Drift > 5% |
| `expired-perks-cleanup` | Run `expirePerks()` and verify no `available` perks have `expiresAt < now()` | After running expirePerks, scan for any remaining drift | Hourly | Any remaining drift |
| `program-store-vs-perkProgramManager` | The two parallel program stores from finding #3 | Compare keys in `programs/store.ts` Map vs `perkProgramManager.programs` | Daily | Any divergence |
| `referrals-vs-attributions` | `referrals` Map ↔ business signups since last run | For each new business, check if a referral code was used at signup; if so, ensure a referral row exists | Daily | Any signup with a referral code header but no row |
| `feature-flags-cluster` | (Multi-instance) flag definitions across instances | Hash the in-memory flag set; compare across instances via metric | Every minute | Any divergence |

## Observability gaps

**Today an operator can see:** generic API error rate (`metrics.ts:60`), per-route latency via `withTiming`, active alert count (`alerts.ts:50`), audit rows for security-sensitive ops.

**Needed to detect a desync at 3am, currently missing:**

- `cross.sync.mismatch` metric exists at `metrics.ts:207` but is never incremented (no reconciliation jobs registered).
- No `webhook.dispatch.failed` counter on outbound deliveries — `webhooks/index.ts` retry queue mutates state silently.
- No `eventPublisher.listener.error` counter (finding #10).
- No alert on event store overflow at `events.ts:138`.
- No alert when `subscriptions` Map is empty after cold start — indistinguishable from "no customers".
- No metric for SSE connect/disconnect/publish-failure rate.
- No alert on payout drift vs Stripe (finding #16).
- The alerts engine pulls metrics nobody writes to.

**Wire-in runbook:** (1) `health/route.ts` runs `runAllReconciliations(false)` per minute and surfaces `mismatchCount`. (2) `alerts.ts` registers `sync.mismatch.high` (>0 for 10 min, severity `high`) and `payout.drift` (any Stripe-vs-local drift, `critical`). (3) Plumb `webhook.dispatch.attempt`/`failed` counters through delivery loop. (4) Subscribe a logger to `eventPublisher` that emits `events.published.{type}` counters.

## Severity rollup

- **P0 (silent loss / financial discrepancy):** 6 — wallet wipe (#1), program/member/payout wipe (#2, #19), Stripe dedup race (#7), payout state lost on redeploy (#16), referrals never credited (#23), verification webhooks not wired to submissions (#29).
- **P1 (concurrency / cold start / sequence-dependent):** 16
- **P2 (degraded / scale-out):** 12

**Common root for P0s:** `db/schema.ts` declares the right tables (`perk_wallets`, `earned_perks`, `referral_codes`, `referral_attributions`) but app code doesn't write to them. Only billing, sessions, monthly_usage, audit_log, webhook_events are actually wired through. Everything else is still a Map.

**Fastest path to close P0s in one pass:** add `lib/programs/persist.ts`, `lib/perk-wallet/persist.ts`, `lib/referrals/persist.ts` mirroring `lib/billing/store.ts:111-150` (write-through + eager hydrate on module load), plus the matching tables and migrations.

**Out of scope:** performance (the linear scans in `payouts/index.ts:359` are correctness-irrelevant at this scale), authorization (covered prior, cross-referenced where it intersects sync at #20), multi-region.
