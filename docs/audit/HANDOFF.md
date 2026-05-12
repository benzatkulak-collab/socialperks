# Handoff — Live Click-Through Audit Session

**Date:** 2026-05-11
**Branch:** `claude/friendly-liskov`
**HEAD:** `79e9ca0` — Type OAuth provider responses + surface HTTP errors (lib audit M7)
**Tests:** 2546 / 2546 passing on every commit
**Status:** Code paused mid-walk-through. Chrome extension was unreachable; user rebooting to restore it.

---

## How to resume

1. After reboot, verify the Claude Chrome extension shows **Connected** (click the orange Claude icon in the Chrome toolbar).
2. Tell the assistant **"ready"** to resume.
3. Resume point: dashboard verification on https://socialperks.app/dashboard — confirm the campaign launched mid-session (`camp_c5ff57e2-a880-493a-8a6d-7ee9c49b0ee8`, "Smoke A — Essential", Instagram Story Tag, 5% off) appears in the UI.

### Demo login

| Field | Value |
|---|---|
| Email | `yoga@demo.com` |
| Password | `1234` |
| Role | `business` |
| businessId | `b1` |

Other demos: `sol@demo.com`, `glow@demo.com`, `iron@demo.com`, `baked@demo.com`, `ink@demo.com`, `vet@demo.com`, `bloom@demo.com`, `smith@demo.com`, `spark@demo.com` — all `1234`.

Influencer demos: `priya@demo.com`, `marcus@demo.com`, `style@demo.com`, `photo@demo.com`, `wellness@demo.com`.

---

## Shipped this session — 8 commits on `claude/friendly-liskov`

```
79e9ca0  Type OAuth provider responses + surface HTTP errors (M7)
ebd46a4  idempotency eviction + env-var URLs (M6, M8)
1a2b4c4  dashboard flash + campaign name persistence + stat caps (M4, M5)
099c4bd  drip sentState eviction (M2)
6a944c8  Round 2: anon subs + OAuth state + SSRF + bounds + caps
889a629  CRITICAL: CSRF token never sent — every authed write 403'd silently
27c3d56  7 audit fixes: HIGH AI quota + 2 HIGH cron + 4 MEDIUM
```

### Critical money-path bugs surfaced by live click-through (all fixed)

1. **CSRF gap site-wide.** Frontend never called `/api/v1/csrf` so every authenticated write (`POST /campaigns`, `PUT /campaigns`, `POST /submissions/review`, edit modal, influencer submit) returned `403 CSRF_TOKEN_MISSING`. The wizard's optimistic UX hid the failure — users saw "Campaign launched!" while no campaign existed on the server. Fixed in `889a629` with new `src/lib/api/csrf-fetch.ts` helper that lazily fetches and caches the token, retries once on `CSRF_TOKEN_INVALID`, and throws on non-2xx so callers can no longer swallow.

2. **Anonymous submissions broken.** Public campaign page (`/c/[campaignId]`) and embeddable widget both POSTed to `/api/v1/submissions` which requires `requireAuth` + `requireCsrf`. Anonymous customers could never actually submit proof. Fixed in `6a944c8` with new no-auth endpoint `POST /api/v1/submissions/public` (strict rate limit, honeypot, email-derived userId, campaign-state guard).

3. **Wizard Launch was a fake button.** `handleLaunch` swallowed `!res.ok` and `catch` blocks both, showing the success screen no matter what. Fixed in `889a629`.

4. **Dashboard never hydrated `myCampaigns`.** `portal.tsx` initialized to `[]` and had no `useEffect` to load from the API, so even successful launches showed "No campaigns yet" on reload. Fixed in `889a629` with a hydration effect.

5. **`/dashboard` flashed marketing homepage when authed.** `AppContext` defaults `screen: 'landing'` so initial paint of `/dashboard` showed the public landing before role-switch effect fired. Fixed in `1a2b4c4`.

6. **Campaign `name` never persisted.** `CampaignLifecycle` was missing the `name` field. GET `/campaigns` returned `name: null` for every row. Fixed in `1a2b4c4`.

### Security fixes

- **OAuth state validation.** `/auth/oauth/[provider]/callback` was accepting any string as state. Now validated via HMAC against `oauth:<provider>` session. Legacy `/oauth/[platform]` was reading session id from inside the state itself (circular — attacker controls both); now reads from `sp-oauth-flow` httpOnly cookie set by `/oauth/connect`. (`6a944c8`)
- **JWT in URL → httpOnly cookie.** OAuth callback used to redirect with `?token=<JWT>` exposing it to history/Referer/logs. Now `Set-Cookie sp-access-token` HttpOnly+SameSite. (`6a944c8`)
- **SSRF guard.** `checkProofUrl` did `fetch(url)` on any HTTPS URL — attacker could submit `https://169.254.169.254/...` to read AWS metadata. New `isFetchableUrl` blocks loopback, RFC1918, link-local, CGNAT, IPv6 ULA/link-local, `.local`/`.internal`, basic-auth URLs. (`6a944c8`)
- **TOTP backup codes.** `Math.random()` → `crypto.randomBytes(5).toString("hex")` for 40-bit per-code entropy. (`27c3d56`)
- **Submission spoofing.** POST `/submissions` trusted `body.userId`. Now derived from session; admins only may attribute on behalf of another user. (`27c3d56`)
- **Program members PII leak.** GET `/programs/[id]/members` was anon; now requires auth + program ownership. POST blocks enrolling others unless caller owns program. GET `/progress` blocks cross-tenant lookups. (`27c3d56`)
- **Audit log enumeration.** `business` role could query any actor's events. Now forced to `actorId === user.id` unless admin. (`27c3d56`)

### Stability + cost-correctness

- AI generate quota consumed on serialization failure → build response before `recordAiGeneration`. (`27c3d56`)
- Trial-reminder + weekly-digest cron tasks re-fired on same-day reruns → per-(subId, UTC day) and per-(businessId, ISO week) dedup. (`27c3d56`)
- Stripe webhook idempotency window 5 min → 7 days (Stripe retries up to 72h). (in earlier round before this session)
- Discount value upper bounds (100% for pct, $10k for dol) — stops 9_999_999% coupon bug. (`6a944c8`)
- Webhook payload 1 MiB cap (was unbounded). (`6a944c8`)
- AI review `content` field 10 KiB cap. (`6a944c8`)

### Memory leaks plugged (lib audit MEDIUMs)

| Where | Cap | Eviction |
|---|---|---|
| `billing/enforcement.ts` usageMap | 50k | stale-month first, FIFO fallback |
| `email/drip.ts` sentState | 50k | FIFO |
| `security/distributed-rate-limiter.ts` endpointStats | 5k | FIFO |
| `security/distributed-rate-limiter.ts` consumerStats | 50k | FIFO |
| `logging/index.ts` requestContextStore | 10k | FIFO |
| `api/idempotency.ts` cache | existing | now actually TTL-first then FIFO (was FIFO regardless of TTL) |

### Other cleanups

- Deleted `src/lib/referrals/tracker.ts` (unused duplicate of `index.ts`).
- 8 hardcoded `https://socialperks.app/...` in `email/drip.ts` → `${APP_URL}` from `NEXT_PUBLIC_APP_URL`.
- OAuth provider helpers now return typed `OAuthTokenResponse` / `OAuthUserInfo` and surface HTTP errors instead of silently returning malformed bodies.
- CLAUDE.md: `15 platforms / 107 actions` → `25 platforms / 125 actions` (matches actual data).

---

## Live-verified

- `GET /api/v1/csrf` returns 200 + token ✅
- `POST /api/v1/campaigns` (with X-CSRF-Token + Bearer): **201 Created**, persists ✅
- `GET /api/v1/campaigns?businessId=b1` returns the persisted campaign ✅
- Plan enforcement working: free plan = 1 campaign, follow-ups return `PLAN_LIMIT_EXCEEDED` ✅
- Logged in as `yoga@demo.com` and successfully created `camp_c5ff57e2-a880-493a-8a6d-7ee9c49b0ee8` ✅
- 2546/2546 vitest tests pass on `79e9ca0` ✅

## NOT yet verified by click-through

Pending Chrome extension reconnect:

- Dashboard UI shows the persisted campaign in the campaign list
- Submission proof flow — authed (`/api/v1/submissions`) AND public (`/api/v1/submissions/public`)
- AI flows: `/ai/quick-start`, `/ai/generate`, `/ai/campaign-agent`
- Stripe Payment Link load + prefill verification
- Newsletter subscribe end-to-end (welcome email arrives)
- Lead finder UI
- Perk programs create + enroll + progress lookup
- Exchange opportunities + orders + trades
- Influencer portal end-to-end
- Widget embed page on a test third-party site
- Developer docs + Swagger UI at `/api/v1/docs/ui`
- Public campaign page `/c/[campaignId]` + OG image
- 404 + global-error page
- `/api/v1/health` and `/api/v1/status` with circuit breakers
- Mobile viewport (320px / 375px)
- Cron trigger via `?key=$CRON_SECRET` and verify trial reminder email

---

## Open issues NOT fixed yet

1. **Onboarding checklist** — "Create your first campaign" stays unchecked even after a successful launch. Should be auto-resolved by `myCampaigns` hydration in `1a2b4c4`, but needs visual confirmation.
2. **Wizard preview ellipsis** — "Customers who Story Tag get …" template doesn't interpolate the perk value. Cosmetic.
3. **Render free tier cold start** — ~30 s wake-up on first request after 15 min idle. Product-level decision (upgrade tier to fix).
4. **Auth form** — `form_input` tool sets DOM value without firing React onChange, so subsequent Log In click submits empty fields. Use keyboard `type` / `key Return` instead. Documented for future click-through.
5. **CSRF gap on remaining write routes** — the audit doc claims ~33 write routes lack CSRF; verified only ~7 actually have it (`submissions`, `submissions/review`, `campaigns`, `billing`, `batch`, `export`, plus the new `submissions/public` is intentionally exempt). Need a full sweep to confirm whether more routes should add `requireCsrf` or whether CLAUDE.md was overstating coverage.

---

## Files touched this session

```
NEW   src/lib/api/csrf-fetch.ts
NEW   src/app/api/v1/submissions/public/route.ts
NEW   docs/audit/HANDOFF.md (this file)
DEL   src/lib/referrals/tracker.ts

MOD   src/app/api/v1/ai/generate/route.ts
MOD   src/app/api/v1/ai/review/route.ts
MOD   src/app/api/v1/audit/route.ts
MOD   src/app/api/v1/auth/oauth/[provider]/callback/route.ts
MOD   src/app/api/v1/auth/oauth/connect/route.ts
MOD   src/app/api/v1/auth/totp/route.ts
MOD   src/app/api/v1/campaigns/route.ts
MOD   src/app/api/v1/oauth/[platform]/route.ts
MOD   src/app/api/v1/oauth/connect/route.ts
MOD   src/app/api/v1/programs/[programId]/members/route.ts
MOD   src/app/api/v1/programs/[programId]/progress/route.ts
MOD   src/app/api/v1/submissions/route.ts
MOD   src/app/api/v1/verification/webhook/route.ts
MOD   src/app/c/[campaignId]/submit-form.tsx
MOD   src/components/app.tsx
MOD   src/components/business/campaign-detail.tsx
MOD   src/components/business/campaign-edit-modal.tsx
MOD   src/components/business/onboarding-wizard.tsx
MOD   src/components/business/portal.tsx
MOD   src/components/influencer/portal.tsx
MOD   src/components/widget/perk-widget.tsx
MOD   src/lib/api/idempotency.ts
MOD   src/lib/auth/oauth-providers.ts
MOD   src/lib/billing/enforcement.ts
MOD   src/lib/campaign-state-machine.ts
MOD   src/lib/cron/tasks.ts
MOD   src/lib/email/drip.ts
MOD   src/lib/logging/index.ts
MOD   src/lib/security/distributed-rate-limiter.ts
MOD   src/lib/verification/url-checker.ts
MOD   CLAUDE.md
```

---

## Quick commands to pick up

```bash
# verify state
git status                                   # clean
git log --oneline origin/main..HEAD          # 8 commits ahead of main
npx vitest run --reporter=basic              # 2546 passing
curl https://socialperks.app/api/v1/health   # is the deploy up?

# resume click-through (after Chrome extension reconnects)
# 1. Navigate to https://socialperks.app/auth
# 2. Login yoga@demo.com / 1234
# 3. Verify /dashboard shows the previously-created campaign
# 4. Walk through submission → AI → Stripe → newsletter → lead → programs → exchange → influencer → widget → mobile → docs → 404
```
