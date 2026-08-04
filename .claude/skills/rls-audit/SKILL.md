---
name: rls-audit
description: >-
  Audit database security for this app's REAL architecture: app-layer JWT auth is
  the boundary, RLS is defense-in-depth. Verifies no Supabase anon/service-role
  key leaks to the client and lists tables missing RLS. Use whenever the user
  mentions RLS, row-level security, database security, Supabase policies, data
  isolation, or "is our data locked down".
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: opus
---

# RLS / data-boundary audit

ADAPT to this app before you audit — do not apply a generic Supabase-JS playbook.
Here the frontend NEVER talks to Supabase directly: it calls `/api/v1/*` route
handlers, which use the server-side `postgres` connection in
`src/lib/db/connection.ts` (PostgresConnection as the `postgres` role against the
Supavisor pooler; InMemoryConnection is the dev fallback). The security boundary
is therefore APP-LAYER JWT auth (`src/lib/auth`, `requireAuth` from
`src/app/api/v1/_shared`). RLS is defense-in-depth ONLY. Supabase project ref:
`wxvlpewrcvzpbhfnfqjq`.

The #1 finding class here is **"table without RLS as defense-in-depth"** — NOT
"anon key leaked to browser" (that key isn't part of this architecture).

## Steps
1. **RLS coverage (defense-in-depth).** Use the Supabase MCP tools for project
   `wxvlpewrcvzpbhfnfqjq`: `get_advisors(type: "security")` and `list_tables`.
   List every table with RLS disabled or no policies, with the remediation URL
   each advisor returns. Frame these as defense-in-depth gaps, not live breaches.
2. **No client key leak.** `grep -rn 'NEXT_PUBLIC_' src` and
   `grep -rni 'service_role\|anon.key\|createClient(' src` — there should be
   effectively NO Supabase anon/service-role key usage in client code, because
   data flows through the server-side `postgres` connection. Flag any hit.
3. **Boundary spot-check.** Confirm the REAL boundary holds: sample a few data
   routes under `src/app/api/v1/**/route.ts` and verify they call `requireAuth`
   before reading/writing. Defer the EXHAUSTIVE route-auth sweep to `/api-contract`.

## Output
Two tables. (1) RLS coverage: Table | RLS enabled? | Has policy? | Remediation URL
— labeled clearly as defense-in-depth. (2) Client-key leak: any NEXT_PUBLIC_ or
service_role/anon hit (expected: none). Then a one-line boundary verdict from the
requireAuth spot-check, pointing to `/api-contract` for the full sweep. State
plainly that RLS gaps here are hardening, and the true boundary is JWT auth.
Run this on demand — there is no CI job for it. The Launch Gate covers
static-guards, skills-validate, e2e-smoke and lighthouse only.
