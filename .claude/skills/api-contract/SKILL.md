---
name: api-contract
description: >-
  Walk every API route handler and check input validation, status codes, a
  consistent error envelope, and — most importantly — that auth is enforced on
  every protected/data route (this IS the security boundary). Use whenever the
  user mentions API contract, route auth, endpoint validation, error handling,
  status codes, or asks "is this endpoint safe / does it validate input".
argument-hint: "[route-glob]"
allowed-tools: Read, Grep, Glob
model: opus
---

# API contract audit

The load-bearing reason this matters: in this app the security boundary is
APP-LAYER auth, not RLS. A data-mutating route that skips `requireAuth` is a
direct hole — no database policy will save it. So auth-on-every-data-route is the
headline check here, above cosmetics.

## Scope
Walk `src/app/api/v1/**/route.ts` (narrow to `$ARGUMENTS` if given, e.g.
`programs/**`). Shared helpers live in `src/app/api/v1/_shared`: `ok` / `err`
(the error envelope), `requireAuth`, `rateLimit`, `withTiming` /
`withRequestContext`. Validators live in `src/lib/security/validate.ts`
(plus any zod schemas).

## Per-route checks
1. **Auth enforced.** Every route that reads user/tenant data or mutates state
   calls `requireAuth` (or an equivalent guard) BEFORE doing work. Flag any
   mutating handler (POST/PUT/PATCH/DELETE) or private-data GET with no auth.
   Note truly-public routes (health, pricing, actions, benchmarks, sitemap-data)
   as intentionally unauthenticated — don't false-flag them.
2. **Input validated.** Body/query/params run through `src/lib/security/validate.ts`
   or a zod schema before use — no raw `body.x` reaching the DB or business logic.
3. **Status codes.** 400 on bad input, 401 unauth, 403 forbidden, 404 missing,
   429 rate-limited, 5xx only on real server faults — not 200-with-error-body.
4. **Consistent envelope.** Responses go through `ok` / `err` from `_shared`;
   flag any `NextResponse.json` that leaks a raw `Error`/stack or an ad-hoc shape.
5. **Rate limiting** applied on sensitive/write routes (`rateLimit` /
   `src/lib/security/rate-limiter.ts`).

## Output
Table: Route | Method | Auth? | Validated? | Envelope? | Status codes | Finding.
Rank findings: (1) mutating/data route with NO auth, (2) unvalidated input to
DB/logic, (3) raw error leakage, (4) wrong status codes. If clean, say so and
name the closest-to-risky route.
