---
name: contrast
description: >-
  Audit color contrast for WCAG 2.2 AA across the app's design tokens and
  components. Use whenever the user mentions contrast, color accessibility,
  readability, dark-mode legibility, or asks whether text/buttons are readable
  — even if they never say "WCAG".
argument-hint: "[page-or-component]"
allowed-tools: Read, Grep, Glob
model: haiku
---

# Contrast audit (WCAG 2.2 AA)

Thresholds: 4.5:1 normal text, 3:1 large text (>=24px, or >=19px bold) and for
UI/graphical boundaries. The reason this matters: contrast failures are the
single most common automated-a11y flag and they silently exclude low-vision
users on the exact CTAs you need to convert.

## Where the colors live
- Tokens: `src/app/globals.css` (CSS variables) + `tailwind.config.*`. The theme
  is dark: bg `#0C0F1A`, cyan `#22D3EE`, green `#34D399`, amber `#FBBF24`.
- Usage: search `text-`, `bg-`, `border-`, and `brand-*` classes.

## Steps
1. Extract foreground/background pairs actually rendered together (a token can
   pass on one surface and fail on another).
2. Compute each ratio; flag normal text < 4.5:1, large text < 3:1, and
   focus/hover/disabled states < 3:1.
3. Propose a specific token/hex fix for each failure — not "increase contrast".

## Output
Table: Location | FG/BG | Ratio | Required | Fix. If all pass, say so and name
the closest-to-failing pair. $ARGUMENTS narrows the audit to one page/component.
