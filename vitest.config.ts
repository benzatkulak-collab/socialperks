import { defineConfig } from "vitest/config";
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
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/lib/**", "src/app/api/**"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // Mirror the tsconfig `paths` mapping. Vitest has no tsconfig-paths
      // plugin and the workspace package isn't symlinked into node_modules,
      // so without this any test importing a module that pulls in
      // `@social-perks/shared/*` (e.g. the user-store) fails to resolve.
      "@social-perks/shared": path.resolve(__dirname, "./packages/shared/src"),
    },
  },
});
