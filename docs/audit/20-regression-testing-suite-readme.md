# 20 — Regression Testing Suite README

How the test suite is organized, how to run it, and how to extend it.

## At a glance

- **Test files**: ~75 (as of audit close)
- **Total tests**: ~2,546
- **Runner**: Vitest (unit/integration), Playwright (E2E), k6 (load)
- **CI**: Full suite runs on every push and PR
- **Production smoke**: hourly workflow against prod

## Test categories

### Unit tests (most of the suite)
- Location: alongside source, `*.test.ts` siblings
- Cover: pure functions, hooks, engine logic, formatters, validators
- Examples:
  - `src/lib/security/*.test.ts` — rate limiter, CSRF, validators
  - `src/lib/ai-engine.test.ts` — campaign generation logic
  - `src/lib/platforms.test.ts` — platform / action library
  - `src/lib/perk-wallet.test.ts` — earning, redemption, expiry
- Style: fast (< 50ms per test), no I/O, fully deterministic.

### Integration tests (API)
- Location: `src/app/api/v1/**/*.test.ts` or `tests/integration/`
- Cover: route handlers with realistic request/response cycles
- May spin up Prisma against an ephemeral test DB (when DATABASE_URL is set in CI) or the in-memory store.
- Style: tests exercise the full handler including middleware (rate limit, CSRF, auth).

### E2E tests (Playwright)
- Location: `e2e/`
- Cover: real browser flows — signup, login, campaign creation, demo accounts
- Run against a locally-started dev server in CI; against staging on `workflow_dispatch`.
- Style: slow (10s+ per test), use sparingly for happy-path coverage.

### Load tests (k6)
- Location: `k6/`
- Cover: auth stress, rate-limit cap behavior
- Not in regular CI — run on demand or before infra changes.

## How to run

```bash
# Unit + integration (default test command)
npm test

# Watch mode for active development
npm run test:watch

# With coverage
npm run test:coverage

# E2E
npm run test:e2e

# E2E with UI for debugging
npm run test:e2e:ui

# Load tests (k6 must be installed)
k6 run k6/auth-stress.js

# Combined: unit + api
npm run test:all
```

## CI orchestration

```
Push or PR
  └─> .github/workflows/ci.yml
        ├─> Job: lint     (npm run lint)
        ├─> Job: typecheck (tsc --noEmit)
        ├─> Job: test      (npm run test)
        ├─> Job: build     (npm run build)
        └─> Job: deploy    (only on main, after all above green)
```

Each job has a 15-minute timeout. Concurrency group cancels in-progress runs when a new push lands on the same ref.

A separate **scheduled hourly workflow** hits production health checks and critical-path endpoints. On failure, it opens an issue tagged `prod-smoke`.

## How to add a new test

### Unit test
1. Create `mything.test.ts` next to `mything.ts`.
2. Import the function. Use Vitest's `describe`/`it`/`expect`.
3. No I/O, no globals. Mock external dependencies.

```ts
import { describe, it, expect } from 'vitest';
import { computePerkValue } from './perk-wallet';

describe('computePerkValue', () => {
  it('applies 5% bonus for 500+ followers', () => {
    expect(computePerkValue({ base: 100, followers: 600 })).toBe(105);
  });
});
```

### API integration test
1. Place in same directory as the route or under `tests/integration/`.
2. Import the route handler directly OR use `fetch` against a test server.
3. Set up CSRF + auth headers as needed.

### E2E test
1. Place in `e2e/`.
2. Use Playwright's `page` fixture. Prefer `data-testid` selectors.
3. Reset state between tests via demo accounts.

## Coverage policy

- **Target**: > 80% line coverage on `src/lib/` (the engines).
- **Floor**: don't merge below current branch coverage.
- **Excluded**: pure type files, generated code, third-party adapters.

Run `npm run test:coverage` and inspect `coverage/index.html`.

## What's NOT tested (intentional)

- **Visual regression**: Storybook exists; visual diff tooling not yet wired.
- **Real Stripe webhooks**: stubbed in tests. Real flow tested manually before each release that touches billing.
- **Real LLM responses**: AI engine tests mock the upstream call.
- **Real email delivery**: Resend stubbed in tests. Manual smoke via Mailtrap.

## Conventions

- File naming: `*.test.ts`, not `*.spec.ts`.
- One `describe` per exported symbol, nested `describe`s for behavior groups.
- Test data lives inline unless reused across files; then under `tests/fixtures/`.
- Snapshots: avoid except for stable JSON shape assertions (API responses).

## Troubleshooting

- **Tests hang in CI**: probably a missed mock on `fetch` or `setTimeout`. Run with `--reporter=verbose` to find the suite.
- **Flaky E2E**: usually a race condition with hydration. Use `page.waitForLoadState('networkidle')` before assertions.
- **"Cannot find DATABASE_URL"** in integration tests: set `DATABASE_URL` in CI secrets or run against in-memory fallback.

## Re-check at next audit

- Test count growth (target: keep parity with feature growth).
- Coverage trend (target: monotonically increasing or stable).
- CI duration (target: keep under 6 min total).

See [21-cicd-hardening-plan.md](./21-cicd-hardening-plan.md) for the pipeline-side view.
