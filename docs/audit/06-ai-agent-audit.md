# AI Agent + Automation Audit

Generated: 2026-05-11
Phase: 5 of system audit (AI agent + automation hardening)

## Note on scope of changes

This audit was performed under environment constraints that required analysis-only
output (no code edits). All findings below include the recommended remediation so
they can be applied in a follow-up commit. Severity ratings reflect impact under
the assumption a real LLM provider gets wired in behind these surfaces; today the
codebase contains deterministic, rule-based "AI" with no external LLM calls,
which substantially de-risks several categories (cost, prompt injection,
hallucination).

## Systems reviewed

- `src/lib/ai-engine.ts` — deterministic campaign suggestion generator
- `src/lib/ai-review/index.ts` — submission review orchestrator (rule-based)
- `src/lib/ai-agent/` — marketing-plan generator (rule-based)
- `src/app/api/v1/ai/generate/route.ts`
- `src/app/api/v1/ai/recommend/route.ts`
- `src/app/api/v1/ai/review/route.ts`
- `src/app/api/v1/ai/campaign-agent/route.ts`
- `src/app/api/v1/ai/quick-start/route.ts`
- `src/lib/cron/tasks.ts` and `src/app/api/v1/cron/route.ts`
- `src/lib/webhooks/index.ts`

## Issues by severity

- CRITICAL: 0
- HIGH: 4
- MEDIUM: 7
- LOW: 6

## Critical issues fixed
(none — see HIGH below)

---

## HIGH-severity findings

### H1. AI generation quota not refunded on downstream failure
**File:** `src/app/api/v1/ai/generate/route.ts:92-95`
**Risk:** `recordAiGeneration(businessId)` runs unconditionally after
`generateCampaigns()`. If the route later throws (e.g., during JSON serialization
or category filtering with a malformed `excludeCategories`), the user's monthly
quota is consumed but they receive no successful response. Today this generator
is deterministic so the risk is small, but it locks in bad behavior for when a
real LLM provider is wired in.
**Recommendation:** Move `recordAiGeneration` after the `excludeCategories`
filter and wrap the whole generation in a try/catch — only record on the success
path. Alternatively, expose a `refundAiGeneration(businessId)` helper and call
it from a catch block.

### H2. Webhook deliveries lack idempotency keys on the receiver side
**File:** `src/lib/webhooks/index.ts:377-441`
**Risk:** Each retry generates a fresh delivery attempt but the payload does not
include a stable `Idempotency-Key` header that receivers can use to dedupe. The
`X-SocialPerks-Delivery` header is the delivery row id (created once per
event-webhook pair) and IS stable across retries — but it is not documented as
the idempotency key, and receivers commonly look for `Idempotency-Key`.
**Recommendation:** Add `"Idempotency-Key": delivery.id` to the outbound headers
in `attemptDelivery`, and document both headers in the webhook docs.

### H3. Cron tasks have no per-run idempotency persistence
**File:** `src/lib/cron/tasks.ts:46-107` (trial-expiring),
`src/lib/cron/tasks.ts:114-148` (weekly-digest),
`src/lib/cron/tasks.ts:227-278` (newsletter-drip)
**Risk:** `runTrialExpiring` admits in its own comment that two runs within the
window will re-send the reminder. `runWeeklyDigest` has no `lastDigestSentAt`
guard either. If GitHub Actions retries a failed cron job (transient 5xx), real
emails go out twice. `runNewsletterDrip` is safer because `markLessonSent`
advances state per-lesson — but only after a successful send. A crash *between*
`emailProvider.send` returning `success=true` and `markLessonSent` returning
will produce a re-send on the next cron tick.
**Recommendation:**
1. For `trial-expiring` and `weekly-digest`: add a `lastSentAt` field to
   `Subscription` / a per-business "last digest" record. Skip subscriptions
   whose `lastSentAt` is within the cron cadence (24h / 7d).
2. For `newsletter-drip`: write `markLessonSent` BEFORE the send call (optimistic
   advance), and on send failure, write a `failedSendAt` field rather than
   rolling back the lesson day. Or wrap the send+mark in a transactional helper.

### H4. AI-driven email blasts have no global confirmation flag
**File:** `src/lib/cron/tasks.ts:89-100` (trial-expiring),
`src/lib/cron/tasks.ts:133-145` (weekly-digest),
`src/lib/cron/tasks.ts:252-271` (newsletter-drip)
**Risk:** The cron route is reachable by anyone with `CRON_SECRET`. There is no
"dry-run" mode and no `confirm=true` requirement for tasks that send real
emails to real users. A compromised secret or a misconfigured GitHub workflow
fires real emails immediately. There is also no kill switch.
**Recommendation:** Add a `dryRun=true` query parameter that short-circuits
email sends and returns the would-be send list. Add `CRON_TASKS_ENABLED` env
var (default `true`) that, when `false`, returns a 503 before invoking tasks.
Add per-task allow-list of which tasks are currently safe to run in prod.

---

## MEDIUM-severity findings

### M1. AI review pipeline trusts unsanitized user content
**File:** `src/lib/ai-review/index.ts:498-555`
**Risk:** `contentText` is passed straight to `contentScanner.scan()` and into
quality heuristics. There is no length cap, no encoding normalization, no
control-character stripping. If a future Anthropic/OpenAI integration is added
to this pipeline (per `ai-engine.ts` docstrings), an attacker can embed
`</prompt>` or `[INST]` style sequences to disrupt downstream LLM calls.
**Recommendation:** Cap `contentText` at 8 KB before further processing, strip
ASCII control chars (0x00-0x08, 0x0B-0x0C, 0x0E-0x1F), and (when an LLM is
wired in) HTML-escape angle brackets before passing to a prompt template.

### M2. No structured logging on AI invocations
**Files:** All five routes in `src/app/api/v1/ai/`
**Risk:** Routes invoke `generateCampaigns`, `getRecommendations`,
`marketingAgent.generatePlan`, `reviewOrchestrator.review` with NO log line
capturing: model identifier (today: "deterministic-v1"), prompt template
version, input hash, output hash, duration, or cost. When LLM calls are wired
in, there will be no audit trail for "why did the AI suggest X for business Y on
date Z?".
**Recommendation:** Add a `logAiInvocation({ route, model, version, inputHash,
outputHash, durationMs, costUsd? })` helper and call from each route after the
generator returns. Use the existing `@/lib/logging` module.

### M3. AI review route uses stateless `userHistory`
**File:** `src/app/api/v1/ai/review/route.ts:91-102`
**Risk:** The route builds `userHistory.submissions = []` and
`userHistory.accountCreatedAt = 90 days ago` regardless of the real user. This
defeats fraud detection: a brand-new sock-puppet account gets the same trust
score as a 5-year veteran. The comment ("in production, fetched from DB")
acknowledges this but the code ships as-is.
**Recommendation:** Wire `userHistory` from the submissions store
(`@/lib/submissions` or wherever real submissions live). Until that is done,
add a banner in the response: `"warning": "fraud scoring used stateless
defaults"`.

### M4. AI review pipeline has no output validation
**File:** `src/lib/ai-review/index.ts:147-284`
**Risk:** The `review()` method returns a `ReviewVerdict` without bounds checks
on `confidence` (could be NaN if `signals.length === 0` *and* something divides
by zero) or `overallScore`. The decision branch `decision === "auto_approve"`
flows directly into the audit-trail `passed` field — and from there can be
trusted by callers without re-checking. If a future LLM-driven scorer ever
replaces `runFraudCheck`, malformed output (negative scores, scores > 100) gets
through.
**Recommendation:** Clamp `overallScore`, `confidence`, and all four sub-scores
to `[0, 100]` / `[0, 1]` before returning. Throw on NaN. Add a Zod schema for
`ReviewVerdict` and validate before returning from `review()`.

### M5. Campaign agent doesn't bound `discountValue`
**File:** `src/lib/ai-engine.ts:233-474`
**Risk:** Various `add()` calls in `generateCampaigns` apply
`Math.round(N * sizeMods.budgetMultiplier)` for `discountValue`. The
`budgetMultiplier` is bounded (max 2.0 for enterprise) so today this caps
around $20. But the *type* (`pct` vs `dol`) is decided by hardcoded literals,
and there is no defense-in-depth: an LLM replacement could return
`discountValue: 1000000, discountType: "dol"`. Nothing in the API routes
clamps before returning to the client.
**Recommendation:** Add `assertBoundedPerk(suggestion)` after generation:
- `discountType === "pct"` → `discountValue` ∈ `[0, 100]`
- `discountType === "dol"` → `discountValue` ∈ `[0, 500]`
Drop suggestions that fail; log a warning.

### M6. Recommendation engine `score > 20` threshold is unvalidated input
**File:** `src/lib/ai-engine.ts:550-562`
**Risk:** The score-20 cutoff is a magic number tied to goal weights (30, 25,
20, 15). If goals are mistuned (e.g., an empty `goals` array passed from the
route), nearly every recommendation gets only the `essential` + completion-rate
bonus, which can still exceed 20. The route at `recommend/route.ts:79` defaults
`goals` to `["reviews", "social-reach"]` but a client can pass `goals: []` and
get 10 essential-only recommendations.
**Recommendation:** In `recommend/route.ts`, reject `goals: []` with a 400 or
fall back to the default. Same fix for `quick-start/route.ts:59`.

### M7. Webhook payload size unbounded
**File:** `src/lib/webhooks/index.ts:315-358`
**Risk:** `deliverEvent` accepts `payload: unknown` and serializes it directly
into the HTTP body. A malicious or buggy event producer could create a 100 MB
payload that blows the 30s HTTP timeout and fills memory on the receiver.
**Recommendation:** Add a 256 KB cap on `JSON.stringify(body).length` in
`attemptDelivery`. If exceeded, mark the delivery as `dead` with
`error: "payload too large"` rather than attempting the HTTP call.

---

## LOW-severity findings

### L1. `webhookCounter` / `deliveryCounter` reset on process restart
**File:** `src/lib/webhooks/index.ts:98-109`
**Risk:** Combined with `crypto.randomUUID().slice(0, 12)` the collision
probability is negligible, but in-memory monotonic counters are not load-balanced
across replicas. Fine for in-memory mode; will need DB sequences post-migration.

### L2. `setTimeout` fallback in `scheduleRetry` survives process death
**File:** `src/lib/webhooks/index.ts:179-184`
**Risk:** If the job queue fails to initialize and a retry is scheduled 72h
out, the timer is lost on the next deploy.
**Recommendation:** Document that the setTimeout fallback is best-effort only;
`retryFailedDeliveries` (line 481) is the durable mechanism. Ensure it is hit by
a cron task.

### L3. `attemptDelivery` does not validate webhook URL scheme/host
**File:** `src/lib/webhooks/index.ts:386-399`
**Risk:** Webhook URLs are user-supplied. There is no SSRF guard preventing
delivery to `http://169.254.169.254/` (AWS metadata) or `http://localhost:6543/`
(PgBouncer). The existing webhook system happily POSTs there.
**Recommendation:** In `registerWebhook` and on each `attemptDelivery`, reject
URLs whose hostname resolves to private IPs (10.0.0.0/8, 172.16.0.0/12,
192.168.0.0/16, 127.0.0.0/8, 169.254.0.0/16, fc00::/7, ::1/128) or that use
schemes other than `https:` (allow `http:` only in non-prod).

### L4. `ai-engine.ts` UID collision risk
**File:** `src/lib/ai-engine.ts:13`
**Risk:** `crypto.randomUUID().replace(/-/g, "").slice(0, 12)` gives ~48 bits of
entropy. At thousands of suggestions per second per server, birthday-bound
collision becomes plausible.
**Recommendation:** Use the full UUID or 16 hex chars (`slice(0, 16)`) — 64 bits.

### L5. Cron route logs `key` query param in some upstream proxies
**File:** `src/app/api/v1/cron/route.ts:45-58`
**Risk:** Query strings are commonly logged by Vercel/Render edge. The
`CRON_SECRET` value can leak into access logs.
**Recommendation:** Move auth to a header (`Authorization: Bearer
$CRON_SECRET`); keep query support for back-compat but log a deprecation.

### L6. Webhook response body read can hang on slow receivers
**File:** `src/lib/webhooks/index.ts:409-417`
**Risk:** `response.text()` after `fetch` has no timeout. A receiver that
returns headers fast but streams the body slowly can tie up the connection past
the 30s `AbortSignal.timeout`.
**Recommendation:** Wrap `response.text()` in its own timeout or limit to a
fixed byte cap via streaming.

---

## Per-system findings

### src/lib/ai-engine.ts
- Purpose: deterministic campaign suggestion + recommendation generation
- Hallucination safeguards: N/A (no LLM) — but no perk-value bounds (M5)
- Output validation: missing bounds + clamp (M5)
- Logging: missing invocation logs (M2)
- Cost protection: N/A (no external calls)
- Prompt injection: N/A (no LLM)
- Failure recovery: synchronous, no partial state
- Idempotency: deterministic inputs → deterministic outputs ✅

### src/lib/ai-review/index.ts
- Purpose: submission review orchestrator
- Hallucination safeguards: rule-based scoring with clamped weighted sum ✅;
  but no bounds on returned `confidence`/`score` if signals are empty (M4)
- Output validation: missing schema validation (M4)
- Logging: writes to `auditTrail.record` ✅ — good
- Human-in-loop: `manual_review` decision path ✅
- Stateless context: `userHistory`, `campaignData` accept undefined → degraded
  decision; signal "limited_fraud_context" is emitted ✅
- Prompt injection: contentText passed unsanitized to scanner (M1)

### src/app/api/v1/ai/generate/route.ts
- Rate limit: ✅ "standard" tier
- Auth: ✅ requireAuth
- Quota enforcement: ✅ checkAiGenerationLimit / recordAiGeneration
- Issue: quota not refunded on downstream failure (H1)

### src/app/api/v1/ai/recommend/route.ts
- Rate limit: ✅ "standard"
- Auth: ✅
- Quota enforcement: ❌ no plan limit check — recommend can be called unlimited
  times whereas generate is metered. Inconsistent.
- Goals validation: ✅ VALID_GOALS allow-list
- Empty goals edge case: M6

### src/app/api/v1/ai/review/route.ts
- Rate limit: ✅ "standard"
- Auth: ✅
- Stateless fraud scoring: M3
- Output: returns rich verdict object, but no bounds check on aggregate (M4)

### src/app/api/v1/ai/campaign-agent/route.ts
- Rate limit: ✅ "standard"
- Auth: ✅
- Quota enforcement: ❌ no AI generation limit applied; this is the heaviest AI
  endpoint (full plan)
- Bound on profile inputs: ❌ `monthlyBudget` accepts arbitrary numbers (could
  drive perk-value generation off-the-rails if those are passed downstream)

### src/app/api/v1/ai/quick-start/route.ts
- Rate limit: ✅ "standard"
- Auth: ✅
- Quota enforcement: ❌
- Empty goals edge case: M6

### src/lib/cron/tasks.ts
- Idempotency: ⚠ trial-expiring + weekly-digest re-send on multiple runs (H3)
- Failure recovery: ✅ per-record try/catch + errors array; no partial DB writes
- Cleanup-expired: ✅ idempotent (date-based filters)
- Lead-status-sync: ✅ rotating sample, no double-send risk
- Newsletter-drip: ⚠ race between send and markLessonSent (H3)
- Email confirmation: ❌ no dry-run / kill switch (H4)

### src/app/api/v1/cron/route.ts
- Auth: ✅ constant-time compare on CRON_SECRET
- Rate limit: ✅
- Logging: ✅ structured logger calls for start/finish/per-record errors
- Issue: secret leaks via query param to upstream proxies (L5)
- Issue: no dry-run / kill switch (H4)

### src/lib/webhooks/index.ts
- HMAC signing: ✅ SHA-256 with timing-safe verify
- Retry backoff: ✅ 1m → 5m → 30m → 2h → 12h → 72h
- Dead-letter: ✅ after 6 attempts
- Per-webhook failure circuit: ✅ failing → inactive at 10 consecutive failures
- Idempotency: stable `X-SocialPerks-Delivery` header ✅, but no
  `Idempotency-Key` for ergonomic dedup (H2)
- SSRF guard: ❌ (L3)
- Payload size cap: ❌ (M7)
- Body-read timeout: ❌ (L6)
- Counter durability: in-memory only (L1)

---

## Suggested remediation order

1. (HIGH) Add per-task idempotency persistence to `runTrialExpiring` and
   `runWeeklyDigest` (H3). Lowest-risk win — pure additive change.
2. (HIGH) Add `dryRun=true` + `CRON_TASKS_ENABLED` to the cron route (H4).
3. (HIGH) Refund quota on failure in `/ai/generate` (H1).
4. (HIGH) Send `Idempotency-Key` header on webhook deliveries (H2).
5. (MEDIUM) Clamp + Zod-validate `ReviewVerdict` (M4).
6. (MEDIUM) Bound perk values in generated suggestions (M5).
7. (MEDIUM) Cap webhook payload size (M7).
8. (MEDIUM) Cap and sanitize `contentText` length in review pipeline (M1).
9. (MEDIUM) Wire real `userHistory` in `/ai/review` (M3).
10. (MEDIUM) Add `logAiInvocation` to all five AI routes (M2).
11. (MEDIUM) Reject empty `goals` arrays in recommend/quick-start (M6).
12. (LOW) SSRF guard on webhook URLs (L3).
13. (LOW) Move cron auth from query → Authorization header (L5).
14. (LOW) Widen `ai-engine.ts` uid (L4).
15. (LOW) Timeout webhook body reads (L6).
16. (LOW) Document setTimeout fallback durability (L2).
17. (LOW) Document counter-durability migration (L1).

## What was NOT changed in this audit pass

Per the operational constraints in effect during this run, no code edits were
made. The next phase should land H1–H4 plus M1, M4, M5, M7 as a single commit,
verify `npm run build` + `npm run lint` + `npm run test`, and ship.
