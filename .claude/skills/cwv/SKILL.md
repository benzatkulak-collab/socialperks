---
name: cwv
description: >-
  Diagnose Core Web Vitals — LCP, INP, and CLS — by finding the specific LCP
  element, the worst layout-shift sources, and interaction-latency risks, then
  tying each to a concrete fix in real files. Use whenever the user mentions
  Core Web Vitals, LCP, INP, CLS, layout shift, jank, slow first paint, or
  "the page feels laggy".
argument-hint: "[url]"
allowed-tools: Read, Grep, Glob, Bash(npx:*)
model: opus
---

# Core Web Vitals diagnosis

Targets (the field thresholds Google grades on): **LCP < 2.5s**,
**INP < 200ms**, **CLS < 0.1**. Note INP replaced FID in 2024 as the
responsiveness metric — it measures the latency of the *worst* interaction, not
just the first, so a single slow click handler tanks the score. These matter
because CWV is both a ranking signal and the honest measure of whether the
conversion path feels fast.

## LCP — find the actual element
The LCP element is almost always the largest above-the-fold image or the hero
heading. Inspect the first landing section rendered by `src/components/app.tsx`
and `src/components/landing/`. Flag:
- Hero imagery not using `next/image` with `priority` (it should preload).
- Web-font swap on the Instrument Serif heading causing late text paint —
  check the font setup in `src/app/layout.tsx` / `src/app/globals.css`.
- Render-blocking work or client-only hydration gating first paint.

## CLS — find the shift sources
Grep for the classic causes: `<img` without width/height, ad/banner/notification
slots injected after load (e.g. `src/lib/hooks/use-notifications.ts` consumers),
and any element whose height is set only after data arrives. Reserve space instead.

## INP — find slow interactions
Look for heavy synchronous work in `on*` handlers and effects across
`src/components/**` — large list re-renders, unmemoized context reads from
`src/lib/context/app-context.tsx`, or synchronous localStorage churn in
`src/lib/hooks/use-store.ts`. Recommend deferring, memoizing, or moving off the
interaction's critical path.

Optionally sanity-check with a Lighthouse pass (fetched on first run):
`npx --yes @lhci/cli collect --url=$ARGUMENTS` — but prefer reasoning from source.
`$ARGUMENTS` sets the URL under analysis (default: the homepage).

## Output
Three sections — LCP, INP, CLS. For each: the measured/suspected offender, the
exact file:line, and one concrete fix. End with the single change that moves the
most-failing metric the most.
