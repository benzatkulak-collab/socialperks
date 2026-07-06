---
name: copy-pass
description: >-
  Proofread user-facing microcopy and CTAs for consistent casing/tone, kill any
  placeholder/lorem/TODO copy, and catch strings that will truncate or overflow.
  A launch-time pass. Invoke when the user mentions copy, microcopy, wording,
  proofreading, CTA text, typos, "polish the text", placeholder text, or lorem
  ipsum.
argument-hint: "[page]"
allowed-tools: Read, Grep, Glob
model: haiku
---

# Copy pass (launch polish)

Shipping "Lorem ipsum", a stray "TODO: real headline", or three different
casings of the same button reads as unfinished and kills trust on the exact
pages meant to convert. This is a mechanical sweep of every user-facing string
before launch.

## Where the copy lives
- **UI strings**: `src/components` (landing/, business/, influencer/,
  enterprise/, shared/) — headings, buttons, labels, tooltips, form helper text.
- **SEO/meta copy**: routed through `src/lib/seo.ts` (`metaTitle`,
  `clampDescription`) — titles ≤60 chars, descriptions ~140.
- **Content data arrays**: `src/lib/{answers-data,industries,guides-data,
  best-data,vs-data,playbook-data,blog,cities}.ts`.

## What to check
1. **Placeholder / unfinished copy**: grep for `lorem`, `ipsum`, `TODO`,
   `FIXME`, `Placeholder`, `xxx`, `Lorem`, `TBD`, dummy names — none may ship.
2. **Casing & tone consistency**: pick one convention (sentence case for
   buttons/headings is typical here) and flag deviations — "Get started" vs "Get
   Started" vs "GET STARTED"; consistent product voice (approachable, not
   corporate).
3. **CTA clarity**: buttons say what happens ("Launch campaign", not "Submit" or
   "Click here"); no two primary CTAs competing on one screen.
4. **Truncation / overflow**: long labels in fixed-width buttons/badges/table
   headers; verify SEO titles/descriptions respect the `seo.ts` clamps.
5. **Typos & grammar**: straightforward proofreading of visible strings.

## Compliance guardrail
Do NOT introduce any "perk for a review" phrasing — incentivized Google/Yelp/
TripAdvisor reviews are banned by design (see CLAUDE.md Gotchas). Flag any
existing copy that implies it.

## Output
Table: File | String (current) | Issue (placeholder / casing / CTA / overflow /
typo) | Suggested copy. Group by page. Note: this is a launch-time pass and can
be retired once the copy is locked. $ARGUMENTS narrows to one page.
