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
  webServer: [
    {
      command: "npx tsx --tsconfig api/tsconfig.json api/src/index.ts",
      port: 4000,
      reuseExistingServer: true,
      env: { DATABASE_URL: "postgresql://socialperks:socialperks@localhost:5432/socialperks", REDIS_URL: "redis://localhost:6379" },
    },
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
