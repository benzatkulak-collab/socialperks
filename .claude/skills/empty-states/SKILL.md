---
name: empty-states
description: >-
  Audit every list, table, and dashboard for a designed empty state, error
  state, and first-run (zero-data) state — never a blank screen. Invoke when
  the user mentions empty states, zero state, "nothing shows up", first-run,
  onboarding blanks, error states, "what if there's no data", or a list/table
  that renders nothing.
argument-hint: "[component]"
allowed-tools: Read, Grep, Glob
model: haiku
---

# Empty / error / first-run state audit

A blank panel is the worst first impression a new business gets — it reads as
broken, not "empty". Every data surface needs three designed states: **empty**
(has account, no data yet — with a clear next action), **error** (fetch failed —
with retry), and **first-run** (brand-new user — onboarding nudge). This audit
finds the ones that render nothing.

## Where to look
Check the data-bearing surfaces across all three portals:
- **Business**: `src/components/business` — campaigns list, submissions list,
  members list, dashboard cards.
- **Influencer**: `src/components/influencer` — campaign discovery, earnings,
  profile completeness.
- **Enterprise**: `src/components/enterprise` — multi-location tables, reporting.
- Shared list/table primitives in `src/components/ui`.

Grep for `.map(`, `.length === 0`, `.length ? `, `{items.map`, and ternaries on
array length — each rendering path is a candidate for a missing empty branch.

## What to flag
1. **No empty branch**: a `.map` over a possibly-empty array with no
   `length === 0` fallback — renders a bare container.
2. **Undesigned empty**: an empty branch that's just text ("No data") with no
   icon, no explanation, and no CTA to create the first item.
3. **No error state**: the fetch-failed path falls through to the empty state (so
   a real error looks like "you have no campaigns") instead of an error + retry.
4. **No first-run distinction**: a brand-new account sees the same generic empty
   as an established one — it should onboard (e.g. "Launch your first campaign").

## Design system reference
Empty states use dark surface tokens from `src/app/globals.css`, a muted icon,
one line of guidance, and a single primary CTA in cyan `#22D3EE`.

## Output
Table: Component | Surface (list/table/dashboard) | Missing state (empty /
error / first-run) | Suggested copy + CTA. If a surface covers all three, note
it as the reference pattern others should copy. $ARGUMENTS narrows to one
component.
