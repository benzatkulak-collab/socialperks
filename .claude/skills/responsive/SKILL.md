---
name: responsive
description: >-
  Screenshot key pages across mobile/tablet/desktop breakpoints and flag
  horizontal overflow, broken grids, cramped or overlapping layouts, touch
  targets under 44px, and missing iOS safe-area-inset handling. Manual-only
  because it spins a browser via Playwright. Invoke when the user mentions
  responsive, mobile layout, breakpoints, "looks broken on my phone", overflow,
  small screens, or tablet.
argument-hint: "[url]"
allowed-tools: Read, Glob, Bash(npx playwright:*)
model: sonnet
disable-model-invocation: true
---

# Responsive layout audit

Real devices hit the marketing + portal pages on small screens first. A single
horizontal scrollbar or a 32px tap target silently tanks mobile conversion, and
these bugs never show up on a desktop dev machine. So drive a real browser at
real breakpoints instead of eyeballing the CSS.

## Breakpoints to test
- **mobile**: 375×812 (iPhone), plus 360×740 (Android) for the tightest case
- **tablet**: 768×1024
- **desktop**: 1280×800 and 1440×900

## How to run
Start the dev server (`npm run dev`, port 3000) or point at a deployed URL, then
drive Playwright headless to screenshot each breakpoint:

!`npx playwright --version 2>&1 | head -2`

Use a short inline script (`npx playwright screenshot` or a throwaway spec) that,
per breakpoint, sets the viewport, navigates, and captures a full-page shot. If
Chromium isn't installed, run `npx playwright install chromium` first.

## What to flag
1. **Horizontal overflow**: check `document.documentElement.scrollWidth >
   window.innerWidth`. The page body must never scroll sideways — hunt the
   offending element (a fixed-width child, an un-wrapped table, a `w-screen`).
2. **Broken grids / overlap**: multi-column grids that don't collapse to 1 col on
   mobile; text overlapping images; cards spilling their container.
3. **Touch targets < 44×44px**: buttons, nav links, icon taps. Measure the
   rendered bounding box, not the font size.
4. **Safe-area insets**: any fixed/sticky top or bottom bar must respect
   `env(safe-area-inset-*)` (notch/home-indicator) — check globals.css and any
   sticky nav/footer in `src/components/shared`.

## Design system reference
Dark theme: bg `#0C0F1A`, cyan `#22D3EE`, green `#34D399`, amber `#FBBF24`.
Tokens live in `src/app/globals.css`; sticky chrome in `src/components/shared`.

## Output
Per breakpoint: a table of Page | Breakpoint | Issue | Element | Fix, ordered by
severity (overflow and unusable tap targets first). Attach or reference the
screenshot paths. If a breakpoint is clean, say so explicitly. $ARGUMENTS sets
the URL or page set to audit (default: home, /pricing, and one portal page).
