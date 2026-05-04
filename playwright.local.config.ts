import { defineConfig } from "@playwright/test";

/**
 * Local-only Playwright config: runs against the Next dev server only,
 * skipping the Hono API server (which needs Postgres + Redis).
 *
 * Use: npx playwright test --config=playwright.local.config.ts
 */
export default defineConfig({
  testDir: "./e2e",
  // api.spec.ts targets /api/v1/* which are Next.js routes — works without
  // the Hono backend on :4000 thanks to in-memory storage in dev.
  timeout: 30_000,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
  },
  projects: [{ name: "chromium", use: { browserName: "chromium" } }],
  webServer: [
    {
      command: "npx next dev",
      port: 3000,
      reuseExistingServer: true,
      timeout: 60_000,
      env: { RATE_LIMIT_BYPASS: "1" },
    },
  ],
});
