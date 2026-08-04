---
name: smoke
description: >-
  Run the Playwright E2E suite against the critical user paths (auth, core CRUD,
  business + influencer flows, landing, API) and triage failures. Manual-only:
  it spins a browser run and should be invoked explicitly before a merge/deploy,
  not auto-fired.
argument-hint: "[base-url]"
allowed-tools: Read, Glob, Bash(npm run test:e2e:*), Bash(npx playwright test:*)
model: sonnet
disable-model-invocation: true
---

# Smoke test (Playwright E2E)

Run the REAL suite and read its output — never claim a path works without a run.
The reason this gate exists: unit tests pass on mocked data, but the paths that
actually take money (login → campaign → submission → billing) only break at the
integration seam, which is exactly what these specs cover.

!`npm run test:e2e 2>&1 | tail -40`

The specs live in `e2e/`:
- `e2e/auth.spec.ts` — login/signup/logout, JWT session
- `e2e/business-flow.spec.ts` — business portal core CRUD
- `e2e/influencer-flow.spec.ts` — influencer profile + discovery
- `e2e/landing.spec.ts` — public landing renders + CTAs
- `e2e/api.spec.ts` — `/api/v1/*` contract smoke
Config: `playwright.config.ts`. $ARGUMENTS overrides the base URL — pass it as
`PLAYWRIGHT_BASE_URL=$ARGUMENTS npx playwright test` (check the config for the
exact env var name before overriding).

## Fail criteria (any of these is a FAIL, not a warning)
- Any 4xx/5xx on a critical path request (auth, CRUD, billing, API).
- Console `error` messages during the run.
- Unhandled promise rejections.
- React hydration mismatches (text-content-did-not-match / hydration warnings).
- A spec that times out waiting on a selector that should exist.

## Steps
1. Read the injected tail. If green, confirm which specs ran and stop.
2. For each failure, open the failing spec and identify the exact
   assertion/step, then classify: app bug vs. flaky selector vs. env/setup.
3. Do NOT rewrite specs to pass — report the underlying defect.

## Output
Per failing spec: file:line, the step that failed, the classification (app bug /
flake / env), and the smallest fix. If all green, state which specs ran and the
slowest one. This is also enforced in CI via `.github/workflows/launch-gate.yml`.
