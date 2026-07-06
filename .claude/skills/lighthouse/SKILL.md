---
name: lighthouse
description: >-
  Run Lighthouse CI (mobile + desktop) against a production build and FAIL on
  any budget regression rather than merely reporting scores. Use this manually
  before a launch or when the user mentions Lighthouse, PageSpeed, performance
  scores, web-vitals budgets, or a "perf gate".
argument-hint: "[url]"
allowed-tools: Read, Bash(npm run build:*), Bash(npx @lhci/cli:*)
model: sonnet
disable-model-invocation: true
---

# Lighthouse CI (budget-gated)

This is a GATE, not a report: the point is to block regressions before they ship,
so treat any budget breach as a failure the user must fix — do not soften it into
a "score summary". Also enforced in CI via `.github/workflows/launch-gate.yml`.

Lighthouse needs a real production build to measure against — dev-mode numbers are
meaningless (no minification, no RSC streaming, HMR overhead). `@lhci/cli` is not
installed; `npx --yes` fetches it on first run (expect a one-time download).

## Run it
Build first, then autorun (LHCI collects mobile + desktop and asserts budgets):

!`npm run build 2>&1 | tail -20`

!`npx --yes @lhci/cli autorun 2>&1 | tail -40`

If `$ARGUMENTS` is provided, treat it as the target URL to audit instead of the
default LHCI collect URL (pass it via `--collect.url=$ARGUMENTS` when re-running).

## Judge the output
- Read the assertion section. Any `error`-level assertion = the gate FAILS.
- Core budgets to hold: Performance >= 0.9, LCP < 2.5s, CLS < 0.1, TBT low
  (TBT is the lab proxy for INP responsiveness).
- Compare mobile vs desktop — mobile is the stricter, launch-relevant profile.
- If the run cannot start a server, confirm `.next/` exists (build succeeded) and
  that the URL is reachable before blaming the metrics.

## Output
State PASS or FAIL up front. For a FAIL, list each breached assertion:
metric | measured | budget | which profile (mobile/desktop). For each, name the
single highest-leverage fix and the real file to change (e.g. an image in a
landing section under `src/components/landing/`, a token in `src/app/globals.css`,
or a route's client bundle). If PASS, report the closest-to-budget metric so the
user knows the margin.
