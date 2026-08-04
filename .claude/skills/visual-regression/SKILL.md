---
name: visual-regression
description: >-
  Establish and maintain a Playwright screenshot baseline (toHaveScreenshot) for
  key pages so future diffs can't silently break visuals. Manual-only: it drives
  a browser and writes/updates baseline snapshots. Invoke when the user mentions
  visual regression, screenshot testing, snapshot baselines, "make sure the UI
  doesn't change", pixel diffs, or toHaveScreenshot.
argument-hint: ""
allowed-tools: Read, Glob, Bash(npx playwright test:*)
model: sonnet
disable-model-invocation: true
---

# Visual regression baseline

CSS refactors and dependency bumps break layouts silently — nothing fails, the
page just looks wrong in prod. A pixel baseline turns "looks wrong" into a
failing test with a visible diff. This skill sets up (and intentionally updates)
that baseline against the existing Playwright suite in `e2e/`.

## The spec
Add `e2e/visual-regression.spec.ts` alongside the existing specs (`auth.spec.ts`,
`business-flow.spec.ts`, `landing.spec.ts`, etc.), reusing `playwright.config.ts`.
Cover the highest-traffic, highest-stakes pages: home/landing, /pricing, the
auth screen, and one representative page per portal (business/influencer/
enterprise). Pattern per page:

```ts
test('landing visual', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveScreenshot('landing.png', {
    fullPage: true,
    maxDiffPixelRatio: 0.01, // tolerate sub-pixel AA noise
  });
});
```

Mask or freeze dynamic content that will always diff — the live ticker in
`src/components/shared`, any `Date.now()`/animated counters, `@vercel/analytics`
injections — via `mask:` or by stubbing before navigation. Otherwise every run
is a false positive.

## Running it
Start the app, then:

!`npx playwright test --version 2>&1 | head -2`

- **Create/refresh baselines intentionally**: `npx playwright test
  visual-regression --update-snapshots`. Commit the generated `*-snapshots/` PNGs.
- **Check for regressions**: `npx playwright test visual-regression` — fails with
  a diff image if pixels moved.

Only run `--update-snapshots` when the visual change is intended; otherwise you'd
overwrite the very baseline that's supposed to catch the regression.

## Output
Report: which pages are now baselined, the snapshot directory path, any dynamic
regions you masked, and the two commands (check vs. update). Run this on demand — there is no
CI job for it. Flag if masking is incomplete (flaky diffs).
