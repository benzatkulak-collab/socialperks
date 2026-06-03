import { defineConfig, configDefaults } from "vitest/config";
import path from "path";

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "node",
    environmentMatchGlobs: [
      ["src/components/**", "happy-dom"],
    ],
    setupFiles: ["src/__tests__/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    // Never traverse agent/editor scratch worktrees that get nested under the
    // tree — they carry stale copies of the source whose tests pollute the run
    // (and aren't in the git repo at all). Keeps local `npm test` == CI.
    exclude: [...configDefaults.exclude, "**/.claude/**", "**/.next/**"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
