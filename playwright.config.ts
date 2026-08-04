import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
  ],
  // Next only. There used to be a second entry booting a Hono API on :4000
  // from `api/src/index.ts`, but no `api/` directory exists in this repo —
  // so `npm run test:e2e` failed at webServer startup before a single test
  // ran. Nothing in e2e/ targets :4000 either; every spec goes through
  // baseURL (:3000) to the Next route handlers under /api/v1/*.
  webServer: [
    {
      command: "npx next dev",
      port: 3000,
      reuseExistingServer: true,
      // Disable rate limiting for e2e tests so the auth suite (which makes
      // many login/signup attempts) doesn't trip the strict 5-req/60s tier.
      // Bypass is gated on NODE_ENV !== 'production' in rate-limiter.ts.
      env: { RATE_LIMIT_BYPASS: "1" },
    },
  ],
});
