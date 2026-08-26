import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  retries: 1,
  use: {
    baseURL: "http://localhost:3000",
    headless: true,
    // The onboarding wizard's container animates in over 500ms
    // (contentScaleIn), and its "Skip for now" button is absolutely
    // positioned INSIDE that container — so the button's bounding box is
    // still moving while Playwright runs its actionability check, which
    // waits for the element to be "visible, enabled and stable". The click
    // retried until the 30s timeout and the node detached mid-retry.
    //
    // That produced 3 intermittent failures in the launch gate's smoke job
    // and was read as a flaky selector; the locator always resolved fine.
    //
    // globals.css:1179 already ships a complete prefers-reduced-motion
    // reset (animation-duration: 0.01ms !important), and an author
    // !important beats the wizard's inline style attribute — so emulating
    // the preference here is enough on its own. No component change needed:
    // this makes the tests exercise the reduced-motion path real users with
    // that OS setting already get, rather than bypassing the stability
    // check with force-click.
    // Via contextOptions, not a top-level `use` key: `reducedMotion` is a
    // browser-context option and is NOT part of PlaywrightTestOptions in
    // @playwright/test 1.58.2 (verified against the installed types).
    // It matters here because tsconfig includes this file, so `next build`
    // typechecks it — an invalid key fails the BUILD, which takes the
    // Lighthouse job down with it before it ever runs.
    contextOptions: { reducedMotion: "reduce" },
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
      // `npm run dev`, not `npx next dev`: npx will silently FETCH a newer
      // Next from the registry when local resolution hiccups (observed it
      // pull next@16 against this Next 15 app, which 500s every route and
      // fails the whole gate for reasons that look like app bugs). The npm
      // script always uses node_modules/.bin/next — the pinned version.
      command: "npm run dev",
      port: 3000,
      reuseExistingServer: true,
      // Disable rate limiting for e2e tests so the auth suite (which makes
      // many login/signup attempts) doesn't trip the strict 5-req/60s tier.
      // Bypass is gated on NODE_ENV !== 'production' in rate-limiter.ts.
      env: { RATE_LIMIT_BYPASS: "1" },
    },
  ],
});
