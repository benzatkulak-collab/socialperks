# Architecture Audit — Social Perks

A principal-engineer pass over the Social Perks repo, focused on workflow traces, hidden coupling, dead code, and concrete refactor priorities. Every claim cites specific files and line numbers in `src/`.

## Table of contents
1. [Workflow traces (the eight core flows)](#workflow-traces)
2. [Concrete pathologies](#concrete-pathologies)
3. [Source-of-truth map](#source-of-truth-map)
4. [Refactor priority matrix](#refactor-priority-matrix)
5. [Closing notes](#closing-notes)

---

<a id="workflow-traces"></a>
## 1. Workflow traces

### 1.1 Influencer onboarding

The frontend wizard is `src/components/influencer/profile-editor.tsx` (plus the four sub-editors `profile-basic-info.tsx`, `profile-platforms-editor.tsx`, `profile-portfolio-editor.tsx`, `profile-rate-card-editor.tsx`). A new influencer enters from the `/i/[slug]` portal at `src/components/influencer/portal.tsx`.

Trace (registration path):
1. Client `POST /api/v1/influencers` with `{displayName, email, niches, followerCount, …}`.
2. `src/app/api/v1/influencers/route.ts:126` (`POST` handler) calls `requireAuth`, `rateLimit`, then validates fields inline.
3. The handler computes a tier locally (`route.ts:158-160`) — micro/mid/macro/mega thresholds are hard-coded here, and **independently** in `src/lib/influencer/tier.ts`.
4. The new record is pushed to `influencerStore` (`route.ts:28`), a module-local `SeedInfluencer[]` initialised from `seed.ts` and never read from anywhere else.
5. No event is emitted, no auth user record is created, no `audit-log.ts` row is written.

The auth user store at `src/app/api/v1/auth/route.ts:37` is a **separate** in-memory `Map<string, UserRecord>`. A POST to `/api/v1/influencers` does not produce a login. The influencer's earnings dashboard later hits `/api/v1/influencers/me/earnings` → `src/lib/earnings/index.ts` (DB-backed when `DATABASE_URL` is set), which has no link back to the in-memory `influencerStore`.

### 1.2 Business onboarding

Frontend: `src/components/business/onboarding-wizard.tsx`. The wizard hard-codes a four-platform shortlist (`onboarding-wizard.tsx:35`: `["ig", "tt", "fb", "yt"]`) and reads the action catalog from `PLATFORMS` via `src/lib/platforms.ts`.

Trace (signup path):
1. `POST /api/v1/auth` with `{action: "signup", email, password, role: "business"}`.
2. `src/app/api/v1/auth/route.ts:54` `ensureSeeded()` re-hashes every demo user on first call.
3. The new user is added to the route-local `users` map (`auth/route.ts:37`).
4. JWT pair created via `createTokenPair()` in `src/lib/auth/index.ts`.
5. After signup, the wizard issues `POST /api/v1/campaigns` to create the first campaign (path 1.3).

The signup path does **not** call `autoIssueOnSignup` from `src/lib/api-keys/auto-issue.ts:44`, even though that function's docstring says it runs on every signup. Grep confirms zero callers. Nor does it call `recordUsage` for the business — `lib/multi-tenant/isolation.ts:138` `usageBuckets` only sees writes from explicit campaign-create paths.

### 1.3 Campaign creation

Trace:
1. `POST /api/v1/campaigns` (`src/app/api/v1/campaigns/route.ts:108`).
2. `withTenant()` from `src/app/api/v1/_tenant.ts` resolves tenant.
3. Plan enforcement via `checkCampaignLimit()` in `src/lib/billing/enforcement.ts:74` (which uses its own module-local `usageMap`).
4. Validation through `src/lib/security/validate.ts`.
5. ToS gate: every action ID is looked up in `src/lib/platforms.ts` via `findAction()` and checked for `action.incentivizable === false` (`campaigns/route.ts:170-184`).
6. `pluginManager.executeHook("campaign.beforeLaunch", …)` from `src/lib/plugin-system.ts:196` (the FTC compliance plugin lives in this same file at line 511 onward).
7. `campaignManager.launch()` in `src/lib/campaign-state-machine.ts:130` writes to its in-memory `Map<string, CampaignLifecycle>` (line 122), then calls `transition()` which appends events via `emitCampaignEvent` from `src/lib/events.ts:316`.
8. `persistLifecycle()` from `src/lib/campaign-state-machine/persist.ts` is fired-and-forgotten (`campaigns/route.ts:254` `void persistLifecycle(...)`).
9. `eventPublisher.publish("campaign.created", …)` from `src/lib/realtime/publisher.ts` for the SSE stream.
10. `recordUsage(tenant.tenantId, "campaigns_created")` from `src/lib/multi-tenant/isolation.ts`.

Three independent state stores are touched on a single create: `campaignManager` (in-memory Map), the event log (`events.ts`), and the DB write-through. There is no transaction.

### 1.4 Social account linking (OAuth)

Trace:
1. `POST /api/v1/oauth/connect` (`src/app/api/v1/oauth/connect/route.ts`) — auth required, picks platform config from the inline `OAUTH_CONFIGS` table at `connect/route.ts:25-84` (11 platforms; `findPlatform()` knows about 15, so 4 platforms in `platforms.ts` cannot OAuth).
2. `generateCsrfToken(user.id)` and `recordPendingOAuthFlow(state, user.id, platformId)` from `src/lib/security/csrf.ts:64` (the `_pendingFlows` Map).
3. Authorization URL returned to client.
4. User completes flow, platform redirects to `GET /api/v1/oauth/[platform]` (`src/app/api/v1/oauth/[platform]/route.ts`).
5. `consumePendingOAuthFlow(state, platformId)` (line 64) atomically pops the entry — single-use.
6. `validateCsrfToken(state, sessionId)` belt-and-suspenders HMAC check (line 76).
7. `exchangeCode()` from `src/lib/oauth/exchange.ts` (real platform API or mock).
8. Response includes raw `accessToken` in the JSON body (line 111). No DB write — the token is given to the client to manage.

Note: a parallel implementation lives at `src/lib/verification/oauth-manager.ts:351` (`tokens = new Map<string, OAuthToken>()`), 600+ lines, never imported.

### 1.5 Payouts

Trace:
1. `POST /api/v1/payouts` (`src/app/api/v1/payouts/route.ts`).
2. Imports `createConnectAccount`, `createPayoutRequest`, etc. from `src/lib/payouts/index.ts`.
3. `payouts/index.ts:36-37` declares `payoutAccounts = new Map<>()` and `payoutRequests = new Map<>()`.
4. When `STRIPE_SECRET_KEY` is set, calls real `stripe.accounts.create()` via `src/lib/stripe.ts`.
5. Webhook callbacks land at `POST /api/v1/payouts/webhook` (`payouts/webhook/route.ts`), which mutates the same Maps.

There is a **second, completely disconnected payments stack** at `src/lib/payments/` — `escrow.ts` (303 LOC), `ledger.ts`, `tax.ts`, `stripe.ts` (a `MockStripeClient`). The `payments/stripe.ts:4-20` doc-comment explicitly admits this:

> ⚠️ TWO STRIPE CODE PATHS EXIST IN THIS REPO. … (THIS FILE) Uses an in-process MockStripeClient. ALL calls are simulated.

`@/lib/payments/*` is referenced only by its own tests. Production runs the `payouts/` stack and `lib/stripe.ts`. `payments/` is ~1500 LOC of dead double-bookkeeping.

`src/lib/financial-ledger.ts:98` is yet a third ledger — actually live, called from `perk-wallet.ts:12` and `exchange.ts:23`, but not connected to the payouts flow. The ledger sees perk redemptions but never sees Stripe transfers.

### 1.6 Notifications

Live path: email only. `src/lib/email/index.ts` exposes `emailProvider` (Resend or console fallback), called from `auth/route.ts`, `submissions/review/route.ts`, `email/digest.ts`, and `email/drip.ts`. Drip state is a module-local `sentState = new Map<string, Set<number>>()` at `src/lib/email/drip.ts:261` — re-deploy wipes who has been emailed which step.

Dead path: `src/lib/notifications/channels.ts` (Slack webhook + Twilio SMS). Grep for `sendSlack|sendSms|notifySubmission|@/lib/notifications` returns only the file itself. The `submissions/review/route.ts` import list does **not** include it, so a new approval never triggers Slack or SMS no matter how the business is configured.

In-app realtime is `src/lib/realtime/publisher.ts` → `GET /api/v1/events` SSE stream. The publisher is in-process only; in a multi-instance deploy each pod sees only its own events.

### 1.7 CRM syncing

There is no CRM in the repo. The closest things are two **dead** sync engines:
- `src/lib/sync-engine.ts` (814 LOC) — referenced only by `src/lib/__tests__/sync-engine.test.ts`.
- `src/lib/sync/index.ts` (1513 LOC) — CRDTs, vector clocks, etc.; only reference is its own test.

Neither connects to HubSpot, Salesforce, Mailchimp, Pipedrive, etc. If a CRM sync is on the roadmap, neither of these is wired up to actual data flows. The combined 2327 LOC of "sync infrastructure" produces zero CRM rows.

### 1.8 AI profile generation

Trace:
1. `POST /api/v1/ai/campaign-agent` (`src/app/api/v1/ai/campaign-agent/route.ts`).
2. `enforceAiLimit(user)` from `src/app/api/v1/ai/_enforce-ai-limit.ts`.
3. `marketingAgent.generatePlan(profile)` — `src/lib/ai-agent/agent.ts:41`.
4. The agent fans out to `analyzeBusinessType`, `analyzeGoals`, `analyzeBudget`, `analyzeCompetition`, `analyzeSocialPresence` from `src/lib/ai-agent/analysis.ts`.
5. `generateRecommendations` from `src/lib/ai-agent/recommendations.ts` (which delegates to `src/lib/ai-agent/recommendation-builder.ts` and `specialized-campaigns.ts`).
6. `agent.ts:11` imports `detectTraits` from the legacy `src/lib/ai-engine.ts` (685 LOC).
7. Plan returned synchronously to the caller. No DB write, no event emit, no per-user cache.

The legacy `ai-engine.ts` is still imported by `ai-agent/agent.ts:11`, so we have two AI surfaces: the structured `ai-agent/` package and the older `ai-engine.ts`. Other callers of `ai-engine.ts` include `/api/v1/ai/generate/route.ts` and `/api/v1/ai/recommend/route.ts`. The two surfaces share no recommendation models — they are independent algorithms producing partly overlapping outputs.

---

<a id="concrete-pathologies"></a>
## 2. Concrete pathologies

### 2.1 Duplicated logic

**A. Influencer tier classification — two implementations.**
- `src/app/api/v1/influencers/route.ts:157-160` computes tier from follower count inline.
- `src/lib/influencer/tier.ts` exports a tier function with the same micro/mid/macro/mega thresholds.

These can drift independently. The route handler does not import the lib helper.

**B. Two API key generators.**
- `src/lib/api-keys/auto-issue.ts:40` (`sk_live_…`, SHA256 hash, in-memory `memoryByOwner` Map at line 18).
- `src/lib/auth/api-keys.ts` (`sp_{env}_{prefix}_{random}`, also SHA256, separate store).

Both compute `crypto.createHash("sha256")` against a plaintext secret with their own format. Only `lib/auth/api-keys.ts` is wired to `/api/v1/api-keys/route.ts`. `auto-issue.ts` has no callers — see 2.5.

**C. Two parallel Stripe wrappers.**
- `src/lib/stripe.ts` (real) + `src/app/api/v1/billing/route.ts`: live customer-facing checkout.
- `src/lib/payments/stripe.ts` (`MockStripeClient`) + `src/lib/payments/index.ts`: in-process simulation, never wired to a route.

The `payments/stripe.ts:4-20` header acknowledges this. `payments/escrow.ts` reimplements escrow logic (303 LOC) that nothing calls.

**D. Two plugin systems.**
- `src/lib/plugin-system.ts` (596 LOC, `pluginManager` singleton, used by `campaigns/route.ts:222`).
- `src/lib/plugins/` directory (8 files, 1990 LOC, with `manager.ts`, `sandbox.ts`, `semver.ts`, `hook-registry.ts`).

Grep for `@/lib/plugins` and `from "./plugins"` returns no matches. The dir is dead.

### 2.2 Hydration risks (in-memory Maps without write-through)

These hold authoritative state in module-local Maps that vanish on cold start:

- `src/app/api/v1/influencers/route.ts:28` — `influencerStore` (a `[…seed]` array). Newly registered influencers are lost on redeploy.
- `src/app/api/v1/auth/route.ts:37` `users` and `:47` `resetTokens`. Password resets disappear on restart even if the email link is still live; new signups disappear.
- `src/lib/payouts/index.ts:36-37` `payoutAccounts`, `payoutRequests`. A redeploy mid-payout drops `payoutRequests` entries; only Stripe holds the truth, and the `webhook/route.ts` rehydrate path requires Stripe to re-deliver.
- `src/lib/billing/store.ts:96` `subscriptions` — explicitly noted in the doc-comment (lines 70-94) as in-memory only with rehydrate via Stripe webhook replay.
- `src/lib/billing/enforcement.ts:74` `usageMap` — plan-limit counters reset to zero on restart, letting users on capped plans temporarily exceed limits.
- `src/lib/email/drip.ts:261` `sentState = Map<string, Set<number>>` — drip step tracker. Restart causes step 1 to be re-sent.
- `src/lib/security/csrf.ts:64` `_pendingFlows` — OAuth state. Restart between `/connect` and the platform redirect breaks the flow with `INVALID_STATE`.
- `src/lib/perk-wallet.ts:17` `wallets`. Has no write-through (the perk-wallet tests confirm this — they `import { ledger }` separately).
- `src/lib/fraud-detection.ts:121` `knownProofUrls`, `:124` `contentFingerprints`, `:132` `shingleIndex` — duplicate-detection corpus is wiped at every cold start.
- `src/lib/programs/store.ts:77-80` `programs`, `programMembers`, `programSubmissions`, `payouts` — all four perk-program stores are pure in-memory Maps. The route handlers read/write them and never persist.
- `src/lib/feature-flags/index.ts:43` `flags` — a pod restart resets a flag flip until someone re-applies it.

### 2.3 Stale state (derived without invalidation)

- `src/lib/campaign-state-machine.ts:122` `campaigns` Map is canonical, while `events.ts` is also claimed to be canonical (`events.ts:1-7`: "Events are the single source of truth — all state is derived from them"). The `rehydrate(campaignId)` method (`campaign-state-machine.ts:565`) replays events to rebuild state, but ordinary writes go to BOTH the Map and the event store. If `emitCampaignEvent` succeeds and the Map mutation throws, or vice versa, they diverge — there is no transactional guarantee.
- `src/lib/billing/enforcement.ts:74` `usageMap` is incremented on each `recordCompletion` call, but the campaign's actual completion count lives at `lifecycle.completions.current` (`campaign-state-machine.ts:280`). If the campaign is `recordCompletion`-ed without `recordUsage`, the two counters drift.
- `src/components/business/portal-analytics.tsx` derives chart data from `campaignManager.listAll()` snapshots. Once the SSE stream pushes a `campaign.updated` event, the chart updates from the patched lifecycle but the in-memory aggregates (totals, completion buckets) are recomputed without any cache invalidation key — every render re-walks the full Map.

### 2.4 Race conditions and mutation hazards

- `src/lib/campaign-state-machine.ts:447` `recordSpend(campaignId, amount)` mutates `lifecycle.budget.spent +=` without taking the budget lock. Only `checkAndSpendBudget()` (line 461) acquires the lock. Anywhere `recordSpend` is called directly skips the lock — grep shows external callers in route handlers can hit it without going through the atomic API.
- `src/app/api/v1/influencers/route.ts:151` duplicate-email check is a `.some()` followed by a non-atomic `.push()` (line 177). Two concurrent POSTs with the same email both pass the check.
- `src/lib/perk-wallet.ts:24` redemption lock is per-perk, not per-wallet. Two redemptions of two different perks in the same wallet that both try to expire the wallet's stale entries can interleave.
- `src/app/api/v1/auth/route.ts:54` `ensureSeeded()` uses a non-atomic `seeded` boolean: two parallel cold requests both see `seeded === false`, both call `seed.businesses.forEach(...)`, both await `hashPassword` — duplicated work, possibly duplicate inserts in the DB-backed path.
- `src/lib/events.ts:133-143` event store eviction (`this.events = this.events.slice(-keepCount)`) is a sync operation on a `push`-mutated array. A concurrent `query()` mid-eviction sees a partial array.

### 2.5 Dead API routes / dead modules (no production callers)

Confirmed by grep across `src/components` and `src/lib` (excluding tests):

- `src/lib/api-keys/auto-issue.ts` — `autoIssueOnSignup` referenced only by itself.
- `src/lib/notifications/channels.ts` — `sendSlack`, `sendSms`, `notifySubmission` have zero callers.
- `src/lib/sync-engine.ts` (814 LOC) — only the test file imports it.
- `src/lib/sync/index.ts` (1513 LOC) — only the test file imports it.
- `src/lib/perk-programs.ts` (1228 LOC, exporting `PerkProgramManager`) — referenced only from `src/lib/__tests__/`. The live programs API at `/api/v1/programs/*` uses `src/lib/programs/store.ts` instead.
- `src/lib/event-sourcing/index.ts` (1326 LOC) — no production importers.
- `src/lib/payments/` (~1500 LOC across `escrow.ts`, `ledger.ts`, `tax.ts`, `stripe.ts`, `helpers.ts`, `types.ts`, `index.ts`) — no production importers.
- `src/lib/plugins/` (1990 LOC across 8 files) — no production importers.
- `src/lib/verification/oauth-manager.ts:351` (~600 LOC) — supplanted by `src/lib/oauth/exchange.ts`.

Total dead code in `src/lib/`: roughly 9000 LOC across these eight clusters. CI typechecks them, the bundler tree-shakes them, but the cognitive cost on every audit is real — half of this audit's grep budget went to disambiguating live vs. dead duplicates.

### 2.6 Scaling bottlenecks

- `src/lib/events.ts:155-194` `EventStore.query()` performs `Array.filter` for every filter dimension across the entire `this.events` array. With the 100k cap (`events.ts:105`), every `getEntityHistory` and every type-filtered scan is O(N). The campaign rehydrate path (`campaign-state-machine.ts:566`) calls `getEntityHistory` per campaign — list-all-campaigns + rehydrate is O(N²).
- `src/lib/campaign-state-machine.ts:497-521` `listByState` and `listByBusiness` walk `this.campaigns.values()`. No secondary indexes by state or business. With 10k campaigns each list call is 10k scans.
- `src/lib/perk-wallet.ts` walks `wallets.values()` for any cross-business query (no business-scoped index alongside the per-user index).
- `src/lib/exchange.ts:917` `actionPrices` and `:949` `demandCounts` are computed by iterating `this.trades.values()` on every `getMarketData` call. The `/api/v1/exchange/market` route is public and rate-limited as `relaxed` — at relaxed-tier QPS this scan dominates CPU.
- `src/lib/billing/enforcement.ts:74` `usageMap` lookup is O(1), but the `checkCompletionLimit` path walks `campaignManager.listByBusiness(businessId)` (synchronous Map scan, see above) for every submission review.
- `src/lib/fraud-detection.ts:124` `contentFingerprints` and `:132` `shingleIndex` grow without bound; there is no eviction policy (compare with `events.ts:135` which at least caps).

### 2.7 Hidden coupling

- `src/lib/perk-wallet.ts:12` imports `ledger` from `./financial-ledger` and writes ledger entries inline as a side effect of awarding a perk. The wallet API surface promises perk semantics; callers don't know they're also writing to a double-entry ledger. A test that mocks `financial-ledger` (see `src/lib/__tests__/perk-wallet.test.ts:21`) has to know this.
- `src/lib/exchange.ts:23` also imports `ledger`. The exchange and the wallet share the ledger as a global mutable singleton (`financial-ledger.ts:98` — class instance exported as `ledger`). Two modules share write access with no contract about which accounts each owns.
- `src/lib/ai-agent/agent.ts:11` imports `detectTraits` from `../ai-engine`. The "new" agent depends on the legacy module's internal trait taxonomy. Renaming `detectTraits` breaks the agent silently if the test for `ai-engine` is the only thing that exercises that path.
- `src/lib/submissions.ts:12` imports `persistSubmission` from `@/lib/submissions/persist` (note: same-name file inside a subdir). The barrel pattern collides — every IDE that auto-imports `submissions` has to disambiguate.
- `src/app/api/v1/_shared.ts:11` re-exports `verifyJWT, sessionStore` from `@/lib/auth`. Then `src/app/api/v1/events/route.ts:14` imports them directly from `@/lib/auth` instead of `_shared`. Two import paths to the same function.
- `src/lib/campaign-state-machine.ts:9-13` imports both `eventStore` and `emitCampaignEvent` from `./events`. The `rehydrate` method then reads from `eventStore` (line 566). The state machine is implicitly entangled with the global event store singleton — you cannot test the state machine in isolation without resetting `eventStore` first.

---

<a id="source-of-truth-map"></a>
## 3. Source-of-truth map (canonical store per domain)

Per-domain, where canonical state lives today, where shadow copies exist, and the migration target.

### Programs (perk programs)
- **Canonical**: `src/lib/programs/store.ts:77-80` — four module-level Maps, used by every `/api/v1/programs/*` route.
- **Shadow**: `src/lib/perk-programs.ts:311-314` — a 1228-LOC `PerkProgramEngine` with its own Maps for programs, members, actions, cash-back. Referenced only from tests.
- **Migration**: drop `perk-programs.ts` (or fold its richer features — cycle resets, cash-back lifecycle — into `programs/store.ts`). Add a Postgres write-through mirroring the schema in `src/lib/db/schema.ts`. Keep the in-memory Map as the read cache.

### Submissions
- **Canonical**: `src/lib/submissions.ts:27` `submissions: Map<string, Submission>`. Has secondary indexes (`userSubmissions`, `campaignSubmissions`) and a write-through via `submissions/persist.ts:29`.
- **Shadow**: `src/lib/programs/store.ts:79` `programSubmissions` — submissions specific to perk programs, not the campaign submissions. Same word, different domain.
- **Migration**: rename `programSubmissions` → `programActions` to disambiguate. The campaign-submission engine is well-shaped already; just promote DB write-through from "best effort" to required-on-create.

### Members (program members / business users)
- **Canonical**: `src/lib/programs/store.ts:78` `programMembers` for perk-program enrollment. `src/app/api/v1/auth/route.ts:37` `users` for platform users.
- **Shadow**: `src/lib/perk-programs.ts:312` `members` (dead). `src/lib/multi-tenant/index.ts:1087` `users` is a yet another Map keyed by tenantId; tenant-tools never see signup events.
- **Migration**: settle on a single `users` table backed by Postgres, exposed via `lib/auth`. Membership is a join table; perk-program enrollment writes there.

### Events
- **Canonical**: `src/lib/events.ts:102` `EventStore.events: PlatformEvent[]` — the single live event log.
- **Shadow**: `src/lib/event-sourcing/index.ts:87` `EventStream.streams: Map<string, DomainEvent[]>` (1326 LOC). Different shape (per-stream) but redundant.
- **Migration**: delete `event-sourcing/index.ts`. If you need replay/snapshot, add to `events.ts`. The `version` field on `PlatformEvent` is already there.

### Sessions
- **Canonical**: `src/lib/auth/index.ts` `sessionStore` (in-memory, with optional Postgres write-through per the file header).
- **Shadow**: `src/app/api/v1/auth/route.ts:37` `users` for the user record itself. `src/lib/multi-tenant/index.ts:1087` `users` for tenant users (separate). `src/lib/security/csrf.ts:64` `_pendingFlows` for OAuth (per-flow, not per-session, but conceptually overlaps).
- **Migration**: the pattern is fine — one cache + one Postgres mirror. The clean-up is to make multi-tenant's `users` view derive from the auth store rather than keeping its own.

### API keys
- **Canonical**: `src/lib/auth/api-keys.ts` (used by `/api/v1/api-keys/[id]/route.ts` and `/api/v1/api-keys/route.ts`).
- **Shadow**: `src/lib/api-keys/auto-issue.ts:18` `memoryByOwner` — never called.
- **Migration**: delete `api-keys/auto-issue.ts`. If "auto-issue on signup" is desired (dead code suggests it is), call `lib/auth/api-keys.ts::createApiKey` from the signup branch of `auth/route.ts`.

### Perks (earned perks in user wallets)
- **Canonical**: `src/lib/perk-wallet.ts:17` `wallets`.
- **Shadow**: `src/lib/financial-ledger.ts:98` accounts mirror perk redemptions as ledger entries. This is a *side-channel* not a duplicate, but the lack of a transaction across the two stores means a crashed redemption can leave wallet `redeemed` while the ledger has no debit (or vice versa).
- **Migration**: add a Postgres `perks` table. The ledger continues to mirror; both writes happen in the same Postgres transaction.

---

<a id="refactor-priority-matrix"></a>
## 4. Refactor priority matrix

Ordered by impact-per-effort, with explicit sequencing.

| # | Issue | Files | Effort | Impact | Sequencing |
|---|-------|-------|--------|--------|------------|
| 1 | Delete dead `perk-programs.ts` (1228 LOC) and consolidate any unique features into `programs/store.ts`. Tests must move or be removed. | `src/lib/perk-programs.ts`, `src/lib/__tests__/perk-programs.test.ts`, `src/lib/__tests__/cashback.test.ts`, `src/lib/__tests__/legal-compliance.test.ts` | M | Correctness — cuts duplication confusion in audits and onboarding | Independent. Do first. |
| 2 | Delete dead `payments/` stack (~1500 LOC mock Stripe). Header already labels it dead. | `src/lib/payments/*` | S | Correctness — kills the second Stripe path | Independent. |
| 3 | Delete dead `sync-engine.ts` + `sync/index.ts` (2327 LOC). Neither participates in any flow. | `src/lib/sync-engine.ts`, `src/lib/sync/index.ts`, related tests | S | Correctness | Independent. |
| 4 | Delete dead `event-sourcing/index.ts` (1326 LOC) or fold any genuinely-needed projections into `events.ts`. | `src/lib/event-sourcing/index.ts` | S | Correctness — events.ts becomes the unambiguous canonical | Independent. |
| 5 | Delete dead `plugins/` directory (1990 LOC). Real plugin manager is `plugin-system.ts`. | `src/lib/plugins/*` | S | Correctness | Independent. |
| 6 | Delete dead `notifications/channels.ts` OR wire `notifySubmission` into `submissions/review/route.ts`. The submission email is sent; Slack/SMS are not. | `src/lib/notifications/channels.ts`, `src/app/api/v1/submissions/review/route.ts` | S | Revenue (multi-channel notify is a sold feature) | Independent. Pick one. |
| 7 | Replace `src/app/api/v1/influencers/route.ts:28` `influencerStore` with a Postgres-backed repo and import `tier()` from `lib/influencer/tier.ts`. Currently new registrations vanish on redeploy and tier logic is duplicated. | `src/app/api/v1/influencers/route.ts`, `src/lib/influencer/tier.ts`, `src/lib/db/schema.ts` | M | Revenue — influencer registration loss | Block #11. |
| 8 | Add transactional write-through for `campaignManager` ↔ `eventStore` so a partial failure cannot diverge them. Today `recordSpend` (`campaign-state-machine.ts:447`) mutates without lock; `checkAndSpendBudget` does. Make `recordSpend` private; force callers through the locked path. | `src/lib/campaign-state-machine.ts` | M | Correctness — budget overspend window | Block #9. |
| 9 | Add per-business and per-state secondary indexes to `campaignManager`. Replace `listByBusiness` and `listByState` linear scans (`campaign-state-machine.ts:497-521`) with O(1) lookups. | `src/lib/campaign-state-machine.ts` | M | Scaling | After #8. |
| 10 | Add an indexed query path on `EventStore`: `byEntity: Map<string, PlatformEvent[]>` and `byType: Map<EventType, PlatformEvent[]>` so `getEntityHistory` and type-filtered queries don't scan the full 100k-cap array. | `src/lib/events.ts` | M | Scaling — campaign rehydrate is currently O(N²) | After #4. |
| 11 | Single user store. Auth, multi-tenant users, and influencer registration all converge on `lib/auth` + Postgres. Remove route-local `users` Map in `auth/route.ts:37` and the parallel one in `multi-tenant/index.ts:1087`. | `src/app/api/v1/auth/route.ts`, `src/lib/multi-tenant/index.ts`, `src/lib/auth/index.ts` | L | Correctness + revenue (signup persistence) | After #7. |
| 12 | Make `billing/enforcement.ts:74` `usageMap` durable. Reset windows from a stored `windowStart` rather than process uptime. Today, restarting a pod resets every paying business's monthly counter. | `src/lib/billing/enforcement.ts`, `src/lib/db/schema.ts` | M | Revenue — quota bypass | Independent. |
| 13 | Wrap perk redemption in a transactional outbox: wallet mutation + ledger entry in one Postgres tx, with the SSE event emitted from the outbox. Today `perk-wallet.ts` mutates the wallet, then writes to `ledger`, then publishes — three independent failure points. | `src/lib/perk-wallet.ts`, `src/lib/financial-ledger.ts`, `src/lib/realtime/publisher.ts` | L | Correctness — financial reconciliation | After #2 (so the ledger isn't ambiguous). |
| 14 | Consolidate the two API-key paths. Decide whether `auto-issue.ts` is alive (and call it from signup) or dead (delete). Currently the signup flow does not auto-issue, contradicting the file's docstring. | `src/lib/api-keys/auto-issue.ts`, `src/lib/auth/api-keys.ts`, `src/app/api/v1/auth/route.ts` | S | Revenue (developer self-service signup) | Independent. |
| 15 | Move OAuth `_pendingFlows` (`csrf.ts:64`) from in-memory Map to Redis or signed-cookie state. A pod restart between `/connect` and the platform redirect produces an `INVALID_STATE` UX failure. | `src/lib/security/csrf.ts`, `src/app/api/v1/oauth/connect/route.ts`, `src/app/api/v1/oauth/[platform]/route.ts` | M | Correctness — visible to every user trying to connect a platform during a deploy | Independent. |

---

<a id="closing-notes"></a>
## 5. Closing notes

**Total dead-code surface in `src/lib/`**: ~9000 LOC across eight shadow modules listed in 2.5. Removing this is mostly mechanical (each cluster has zero non-test importers) and disproportionately reduces audit cost. Items #1–#5 alone trim the lib directory by roughly 30%.

**The single most consequential live bug** is #12 (billing usage counter resets on restart). Every other item in the matrix is either a correctness migration toward Postgres or a deletion. Item #12 is a paying-customer concern.

**Pattern repeated across every domain**: a feature lands as an in-memory Map, a "production: Redis or DB-backed" comment is added, and the migration never happens. The repo is currently built on this assumption — many of the headers acknowledge it (`billing/store.ts:71-94`, `auth/index.ts:51-60`, `payments/stripe.ts:4-20`). The path forward is the schema in `src/lib/db/schema.ts` plus the existing `db/connection.ts` `usingDb` pattern (already followed cleanly by `lib/earnings/index.ts` and `lib/auth/api-keys.ts`). Standardising on that pattern, then deleting the dead duplicates, is the bulk of the work the next quarter.
