# Stay Signed In Across Reloads Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A session check with an expired access cookie but a good refresh cookie answers "signed in" and sets a new cookie pair, a reload asks the server for 7 days, and session checks no longer use up sign-in's rate limit.

**Architecture:** All server-side in `src/app/api/v1/auth/route.ts`. One renewal routine is shared by the refresh action, `GET /api/v1/auth` and `POST {action: "session"}`. The `sp-session` marker takes the refresh cookie's lifetime. `rateLimit()` in `src/app/api/v1/_shared.ts` gains an optional bucket name, so session checks and the refresh count apart from sign-in. No browser code changes; only one comment in `src/lib/api/csrf-fetch.ts`.

**Tech Stack:** Next 15 route handlers, `NextRequest`, vitest (route tests call the exported handlers directly).

**Spec:** `docs/superpowers/specs/2026-11-26-session-renewal-design.md`

## Global Constraints

- Account rules exactly as PR #252's refresh action:
  - suspended → `401 ACCOUNT_SUSPENDED` with `clearCookieHeaders()`;
  - not on file → `401 INVALID_REFRESH_TOKEN` with **no** Set-Cookie;
  - otherwise a new pair built from the account record (`buildCookieHeaders(account.id, account.role, account.email, account.businessId)`).
- A session check that already has a good access credential answers exactly as today and sets **no** cookies.
- `sp-session` set by sign-in, sign-up and refresh lives as long as `sp-refresh-token` (604800 s). Impersonation's marker (`src/app/api/v1/admin/impersonate/route.ts`, 900 s) is unchanged.
- Rate limits:
  - bucket `"session"` with tier `"standard"` (30 a minute per address) for `GET /api/v1/auth` and the `refresh` and `session` actions;
  - every other auth action keeps tier `"strict"` (5 a minute) in the default bucket;
  - a body that is not JSON counts in the default (sign-in) bucket.
- Tests first, made-up data only (`@example.test` emails, `usr_test_*` ids); each request in a test gets its own `x-real-ip` unless the test is about one address's limit.
- No `[deploy]` in commit messages.

## Review Focus

- Two session checks from one page load at the same moment (`AdminGuard` and the admin top bar) must both answer signed in. Test in Task 1.
- An open tab of a suspended account: its next session check must sign it out and clear the 7-day marker. Test in Task 1.
- Sign-out must clear the 7-day marker, or a reload would try to restore a signed-out session. Test in Task 2.
- A malformed POST body must not slip past sign-in's limit by being parsed before the limit. Test in Task 3.
- A session check with a good access cookie must not rotate cookies on every page load. Test in Task 1.

---

### Task 1: Session checks renew from the refresh cookie

**Files:**
- Modify: `src/app/api/v1/auth/route.ts` (GET handler; POST `case "refresh"`; POST `case "session"`)
- Create: `src/app/api/v1/auth/__tests__/session-renewal.test.ts`

**Interfaces:**
- Produces (module-private in `route.ts`):
  - `async function renewFromRefreshCookie(req: NextRequest): Promise<Renewal>`
  - `type Renewal = { ok: true; account: UserRecord; accessToken: string; headers: Record<string, string> } | { ok: false; noCookie: boolean; response: NextResponse }`
  - `noCookie` is true only when the request carries no `sp-refresh-token`.
- `case "refresh"`: answers `ok({ user, accessToken }, 200, headers)` on success, otherwise `response` (behaviour unchanged).
- GET:
  - when `getUser(req)` is null, it renews;
  - on success: `ok({ user: { id, email, role, businessId }, expiresAt }, 200, headers)`, where `expiresAt` is the new access token's `exp` as ISO;
  - on failure with `noCookie`: today's `NO_TOKEN` 401;
  - otherwise: `response`.
- POST `session`:
  - a valid token (Bearer, cookie or body) answers as today;
  - otherwise it renews;
  - on failure with `noCookie`: today's answer (`NO_TOKEN` when no token was given, `INVALID_SESSION` when one was).

- [ ] **Step 1: Write the failing tests** in `session-renewal.test.ts`. Set up accounts with `ensureUsersSeeded()` + `putUser()`; mint tokens with `createTokenPair()`; read cookies with `res.headers.getSetCookie()`.
  - `GET answers a request with only the refresh cookie as signed in, with a new cookie pair`: status 200; `data.user.id` is the account's; `sp-access-token` verifies with `verifyJWT(v, "access")` to the account's `sub` and `role`; `sp-refresh-token` is set and non-empty.
  - `GET with a good access cookie sets no cookies`: 200; `setCookie(res, "sp-access-token")` is undefined.
  - `GET refuses a suspended account and clears its cookies`: 401, code `ACCOUNT_SUSPENDED`, `Max-Age=0` on `sp-access-token`, `sp-refresh-token`, `sp-session`.
  - `GET with no cookies answers 401 NO_TOKEN as before`.
  - `POST session renews from the refresh cookie`: 200 and a new `sp-access-token` for the account.
  - `two session checks at once both answer signed in`: `Promise.all` of two GETs with only the refresh cookie; both 200.
- [ ] **Step 2: Run** `./node_modules/.bin/vitest run src/app/api/v1/auth/__tests__/session-renewal.test.ts`. Expected: the renewal tests FAIL with 401; the access-cookie and no-cookie tests pass.
- [ ] **Step 3: Implement** `renewFromRefreshCookie`, move `case "refresh"` onto it, and add the renewal fallback to GET and to `case "session"`.
- [ ] **Step 4: Run** the new file plus `src/app/api/v1/auth/__tests__/refresh-checks-account.test.ts` and `src/app/api/v1/__tests__/token-type.test.ts`. Expected: all PASS.
- [ ] **Step 5: Commit** `feat(auth): session checks renew the access cookie from the refresh cookie`.

### Task 2: The marker lives as long as the refresh cookie

**Files:**
- Modify: `src/app/api/v1/auth/route.ts` (`buildCookieHeaders`: the `sp-session` Max-Age and its comment)
- Modify: `src/lib/api/csrf-fetch.ts` (the `isAuthRoute` comment: session checks now renew on the server, so a 401 there is final. No code change.)
- Test: `src/app/api/v1/auth/__tests__/session-renewal.test.ts`

**Interfaces:**
- Consumes: Task 1's GET renewal (for the renewal-marker test).
- Produces: one constant in `route.ts`, `REFRESH_COOKIE_MAX_AGE = 604800`, used for both `sp-refresh-token` and `sp-session`.

- [ ] **Step 1: Write the failing tests:**
  - `sign-in sets the marker for as long as the refresh cookie`. Use a made-up account whose `passwordHash = await hashPassword("made-up-password-1")`, sign in with POST `{action:"login", email, password}`, then: `maxAge(res, "sp-session") === maxAge(res, "sp-refresh-token")`.
  - `a renewal sets the marker for as long as the refresh cookie`: the same equality on Task 1's GET renewal response.
  - `sign-out clears the marker`: POST `{action:"logout"}` gives `Max-Age=0` on `sp-session`.
- [ ] **Step 2: Run** the file. Expected: the two marker tests FAIL (900 ≠ 604800); the sign-out test passes.
- [ ] **Step 3: Implement** the constant and the marker Max-Age; update both comments.
- [ ] **Step 4: Run** the file. Expected: PASS.
- [ ] **Step 5: Commit** `feat(auth): the session marker lives as long as the refresh cookie`.

### Task 3: Session checks and the refresh get their own rate-limit counter

**Files:**
- Modify: `src/app/api/v1/_shared.ts` (`rateLimit`)
- Modify: `src/app/api/v1/auth/route.ts` (GET limit; POST: parse the body, then limit by action)
- Create: `src/app/api/v1/auth/__tests__/auth-rate-limits.test.ts`

**Interfaces:**
- Produces: `rateLimit(req: NextRequest, tier: RateLimitTier = "standard", bucket?: string): NextResponse | null`. With `bucket`, the counter key is the path plus `#<bucket>`; without it, exactly today's key.

- [ ] **Step 1: Write the failing tests.** Each test uses its own fixed `x-real-ip`.
  - `refused sign-ins do not block a session check from the same address`: five POST logins with a wrong password give 401; the sixth gives 429; then a GET from the same address is not 429.
  - `session checks do not use up sign-in's five a minute`: six GETs with no cookies are all 401, never 429; then a POST login is 401, not 429.
  - `refresh attempts do not count against sign-in`: six POST `{action:"refresh"}` with no cookie give 401; then a POST login is not 429.
  - `a body that is not JSON counts as a sign-in attempt`: five POSTs with body `not json` give 400; then a POST login gives 429.
- [ ] **Step 2: Run** the file. Expected: the first three FAIL with 429; the fourth passes.
- [ ] **Step 3: Implement** the optional bucket in `rateLimit`. GET uses `rateLimit(req, "standard", "session")`. POST parses the body first, then applies `("standard", "session")` for `refresh` and `session` and `("strict")` for everything else, including an unparseable body. Return the 400 only after the limit check.
- [ ] **Step 4: Run** the file, then the whole suite (`./node_modules/.bin/vitest run`), `./node_modules/.bin/tsc --noEmit` and `npm run lint`. Expected: all PASS; lint shows only the three warnings already on main.
- [ ] **Step 5: Commit** `feat(auth): session checks and the refresh have their own rate-limit counter`.

### Task 4: Ship

- [ ] **Step 1:** `npm run build`. Expected: exit 0.
- [ ] **Step 2:** Push `fix/session-renewal`, and check that `git rev-parse HEAD` equals `origin/fix/session-renewal`.
- [ ] **Step 3:** Open the PR with base `fix/refresh-on-401`.
  - Title: `feat(auth): stay signed in across reloads and new tabs`.
  - The body says it is stacked on #252 (base tip `4c9442d`): after #252 merges, retarget it to `main` and merge `main` in.
  - It also says: "do not delete `fix/refresh-on-401` until then", and that no commit contains `[deploy]`.
- [ ] **Step 4:** Watch CI until every check passes.
