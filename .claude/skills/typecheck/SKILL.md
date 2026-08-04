---
name: typecheck
description: >-
  Run the TypeScript compiler in no-emit mode and report every type error, then
  count the escape hatches (any / @ts-ignore / as casts) that hide future ones.
  Use whenever the user mentions typecheck, tsc, type errors, "does it compile",
  type safety, or before a merge — even if they don't name TypeScript.
argument-hint: ""
allowed-tools: Bash(npx tsc --noEmit:*), Grep
model: haiku
---

# Typecheck

The fast local mirror of the CI typecheck (`.github/workflows/ci.yml` already
runs this on every PR). The point of running it here is a tight local loop —
catch the error before you push, not after CI turns red.

!`npx tsc --noEmit 2>&1 | tail -40`

## Then measure the escape hatches
Every `any`, `@ts-ignore`, and unchecked `as` cast is a place a real error can
hide from the compiler, so a clean `tsc` with hundreds of `any`s is a false
green. Count and locate the worst:
- `grep -rn ': any\|<any>\|as any' src | wc -l` and list the files with the most.
- `grep -rn '@ts-ignore\|@ts-expect-error\|@ts-nocheck' src`.
- `grep -rn ' as [A-Z]' src` for non-`any` assertion casts (spot the risky ones —
  casts around DB rows, `JSON.parse`, and API bodies are the dangerous ones).

## Output
First: PASS/FAIL from the tsc tail, with each error's file:line and the one-line
fix. Then a counts table: `any` | `@ts-ignore` family | `as` casts, plus the top
3 offending files. If tsc is clean, still report the escape-hatch counts so the
green is honest.
