---
name: a11y
description: >-
  Run axe-core (and Lighthouse a11y) against a running page and audit keyboard
  navigation, focus order, focus traps, ARIA correctness, and landmark
  structure to WCAG 2.2 AA. Manual-only: it needs a running server and fetches
  @axe-core/cli via npx. Invoke when the user mentions accessibility, a11y,
  screen readers, keyboard nav, focus, ARIA, WCAG, or "can people with
  disabilities use this".
argument-hint: "[url]"
allowed-tools: Read, Glob, Bash(npx @axe-core/cli:*)
model: sonnet
disable-model-invocation: true
---

# Accessibility audit (WCAG 2.2 AA)

Accessibility failures are both an exclusion problem and a legal exposure (ADA).
Automated scanners catch ~40% of issues cheaply; the rest need a human driving
the keyboard. This skill does both — run the scanner, then verify the flows a
scanner can't see.

Note: a skip-to-content link already exists in `src/app/layout.tsx` — verify it
still targets a real `#main`/`id` and is the first focusable element, don't
re-add it.

## Automated pass
Start the server (`npm run dev`, port 3000) or use a deployed URL, then:

!`npx @axe-core/cli --version 2>&1 | head -2`

Run `npx @axe-core/cli $ARGUMENTS --tags wcag2a,wcag2aa,wcag22aa` (the tool is
fetched on first run). Optionally add a Lighthouse a11y pass via
`npx lighthouse <url> --only-categories=accessibility` for a second opinion.

## Manual pass (the part the scanner misses)
1. **Keyboard nav**: Tab through the whole page — every interactive control must
   be reachable and operable with Enter/Space, in a logical order.
2. **Focus order & visibility**: focus ring always visible (dark theme —
   `#22D3EE` outline reads well on `#0C0F1A`); DOM order matches visual order.
3. **Focus traps**: modals/dialogs must trap focus while open and restore it to
   the trigger on close; nothing off-screen should be focusable.
4. **ARIA correctness**: no redundant/invalid roles, `aria-label` on icon-only
   buttons, `aria-expanded`/`aria-controls` on disclosures, live regions for
   async status (see `src/lib/hooks/use-notifications.ts`).
5. **Landmarks**: exactly one `<main>`, plus `<nav>`/`<header>`/`<footer>` — check
   `src/app/layout.tsx` and `src/components/shared`.

## Output
Table: Rule (WCAG SC) | Location | Severity | What's broken | Fix. List axe
violations first, then manual findings. Note this is also enforced in CI via
`.github/workflows/launch-gate.yml`. $ARGUMENTS sets the URL (default:
http://localhost:3000).
