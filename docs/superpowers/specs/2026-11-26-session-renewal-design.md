# Stay signed in across reloads and new tabs (Social Perks)

Status: **approved by Ben on 2026-11-26.** It builds on PR #252 and ships as its own PR on top of it.

## What you asked for

A signed-in user should stay signed in while the 7-day refresh cookie is good. At the moment, a reload, a new tab, the founder console's gate or the billing page's first check says "not signed in" once the 15-minute access cookie has gone.

## How it works today
- **Session checks.** Five places ask the server who is signed in. Four use `GET /api/v1/auth`: the app's restore on load, `AdminGuard`, the admin top bar and `/dashboard/billing`. `/programs` uses `POST {action: "session"}`. After 15 minutes all of them get 401.
- **No renewal there.** PR #252 renews on a 401 everywhere except the auth route, so these checks still fail.
- **Reloads don't even ask.** The app sends its restore request only while the `sp-session` marker cookie exists, and that cookie lives 15 minutes.
- **Two facts that shape the design:**
  - The refresh cookie is scoped to `/api/v1/auth`, so the browser already sends it with every session check.
  - Every request to `/api/v1/auth` from one address shares one rate-limit counter of 5 a minute: session checks, sign-in and the refresh. The counter is keyed on address and path, whatever the method, and each server instance keeps its own. Three reloads of the founder console in a minute (two checks each) can already push a check to 429. When the gate's check is the one refused, the page shows "Access Denied".

## Approaches
- **A. The browser renews the session check** (401, then refresh, then retry). That's three requests per check, all on the 5-a-minute counter, and it changes five callers. Rejected.
- **B. The session check renews on the server (recommended).** A session check with no good access cookie but a good refresh cookie answers with the user and sets a new cookie pair. That's one request, the same as today, and no caller changes.
- **C. A 7-day access cookie.** No renewal would be needed, but a suspension or a role change would take up to a week to apply. Rejected.

## Design (B)
1. **One renewal routine** in `src/app/api/v1/auth/route.ts`, used by the refresh action, `GET /api/v1/auth` and `POST {action: "session"}`. It applies #252's account rules:
   - suspended: 401 and the cookies are cleared;
   - not on file: 401, and the cookie is kept;
   - otherwise: a new pair built from the account record.
2. **A good access cookie** answers exactly as today, with no new cookies.
3. **The `sp-session` marker** lives as long as the refresh cookie (7 days) when sign-in, sign-up or a refresh sets it, so a reload asks the server. Impersonation keeps its 15 minutes.
4. **Rate limits:** session checks and the refresh get their own counter (30 a minute per address). Sign-in, sign-up and password reset keep 5 a minute to themselves. `rateLimit()` gains an optional bucket name, and the POST handler reads the action before it applies the limit. *(My call: this isn't strictly needed for renewal, but session checks become what keeps people signed in, and they already trip the shared counter.)*
5. **Sessions slide.** Every renewal sets a fresh 7-day refresh cookie, so an active user stays signed in, and after 7 idle days they sign in again. There's no absolute cap. *(My call. A cap such as "re-enter the password every 30 days" would need an issued-at claim checked at renewal.)*
6. **Its own PR, on top of #252,** so #252 can merge first. #250 is live, and stale tabs fail in production until #252 ships.

## Tests (written first)
Route tests:
- a check with only the refresh cookie gets 200 and a new pair;
- a good access cookie gets no new cookies;
- a suspended account gets 401 and its cookies are cleared;
- no cookies gets 401;
- the marker lives exactly as long as the refresh cookie;
- five sign-ins don't block a session check, and session checks don't block sign-in.

## Not in this change
- Revoking refresh tokens on the server at logout.
- Coordinating sign-outs across tabs.
- An absolute session cap, unless you want one.
