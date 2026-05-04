import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [
    tsconfigPaths({ root: ".." }),
    tsconfigPaths({ root: "." }),
  ],
  test: {
    globals: true,
    environment: "node",
    include: ["__tests__/**/*.test.ts"],
    env: {
      // Bypass CSRF + rate limiting for tests. Both bypasses are gated on
      // NODE_ENV !== 'production' and physically cannot be enabled in prod.
      CSRF_BYPASS: "1",
      RATE_LIMIT_BYPASS: "1",
      ALLOW_DEMO_TOKENS: "true",
      NODE_ENV: "development",
    },
  },
});
