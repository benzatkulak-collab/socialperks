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
    },
  ],
});
