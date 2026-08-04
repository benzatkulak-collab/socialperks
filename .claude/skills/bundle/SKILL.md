---
name: bundle
description: >-
  Analyze the production bundle for oversized chunks, duplicate deps, "use
  client" leakage on components that should be Server Components, and
  un-tree-shaken libraries. Use when the user mentions bundle size, JS weight,
  slow first load, "use client", RSC boundaries, or code-splitting.
argument-hint: ""
allowed-tools: Read, Grep, Glob, Bash(npm run build:*)
model: opus
disable-model-invocation: true
---

# Bundle analysis

Read REAL build output — never guess sizes:

!`npm run build 2>&1 | tail -60`

## Look for
- **First Load JS** per route from the table above; flag routes materially above
  the shared baseline and identify what they import that others don't. With ~595
  static pages here, a few heavy shared imports multiply across the whole site.
- **"use client" leakage**: `grep -rl '"use client"' src/components`, then flag any
  with no `useState`/`useEffect`/`on*` handler — convert to RSC to shrink the
  client bundle. Landing/content sections under `src/components/landing/` are prime
  suspects (mostly static markup that need not ship JS).
- **Heavy/duplicate deps** pulled client-side (date/icon/chart libs); prefer
  per-function imports or RSC-only usage. Watch for a lib imported both in a
  client component and server code, doubling the payload.
- **Un-tree-shaken** `import * as X` / whole-lib default imports for one function.

## Output
The 3–5 highest-impact wins: offending file, measured cost, specific change,
tied to a route's First Load JS number so impact is concrete.
