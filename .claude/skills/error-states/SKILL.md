---
name: error-states
description: >-
  Check App Router error/loading/not-found coverage per route segment, confirm a
  global 500 + 404 render, and verify data routes degrade gracefully when
  Postgres is unreachable. Use whenever the user mentions error boundaries,
  error.tsx, loading states, 404/500 pages, "what happens when it crashes", or
  graceful degradation.
argument-hint: "[route-segment]"
allowed-tools: Read, Glob
model: haiku
---

# Error-state coverage

Why this matters: without an `error.tsx`, a thrown render error takes down the
whole segment with an unstyled Next.js crash screen — on the exact page the user
was mid-flow. And because this app falls back to `InMemoryConnection` when the DB
is down, a data route that assumes Postgres is always up will throw instead of
degrading. Both are silent until a real user hits them.

## Scope
Walk `src/app` (narrow to `$ARGUMENTS`, e.g. `business` or `programs`). App
Router special files: `error.tsx`, `not-found.tsx`, `loading.tsx`, plus the
root-level global boundaries.

## Checks
1. **Per-segment coverage.** For each meaningful route segment under `src/app`,
   note whether it has `error.tsx` (catches render throws) and `loading.tsx`
   (suspense fallback). Segments with async data fetching most need both.
2. **Global 500 + 404.** Confirm a root `error.tsx` (or `global-error.tsx`) and a
   root `not-found.tsx` exist and render branded, human-readable pages — not the
   default Next.js screens.
3. **DB-down degradation.** For data routes (`src/app/api/v1/**/route.ts`),
   confirm the `InMemoryConnection` fallback path in `src/lib/db/connection.ts`
   means a Postgres outage returns a handled response, not an unhandled 500 /
   crash. Flag any route that assumes the connection always succeeds.

## Output
Coverage table: Segment | error.tsx | loading.tsx | not-found.tsx. Then a
one-line verdict on global 500/404, and a list of data routes that would hard-
crash (rather than degrade) if Postgres were unreachable, each with its fix.
