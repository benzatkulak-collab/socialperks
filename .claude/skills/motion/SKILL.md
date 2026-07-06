---
name: motion
description: >-
  Audit CSS/Tailwind animations for two things: honoring
  prefers-reduced-motion, and running at 60fps by animating only compositor-
  friendly properties (transform/opacity) instead of layout-thrashing ones
  (width/height/top/left/margin/box-shadow). Use whenever the user mentions
  animation, motion, transitions, keyframes, jank, "feels laggy", reduced
  motion, vestibular/accessibility of movement, or animate- classes.
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: haiku
---

# Motion audit (reduced-motion + 60fps)

Two failure modes, both cheap to catch and important:
- **Accessibility**: users with vestibular disorders set
  `prefers-reduced-motion: reduce`. Animations that ignore it can cause nausea
  and are a WCAG 2.3.3 concern. Every non-essential animation must be disabled
  or reduced under that media query.
- **Performance**: only `transform` and `opacity` are composited on the GPU.
  Animating `width`, `height`, `top`, `left`, `margin`, `padding`, or
  `box-shadow` forces layout/paint every frame and drops below 60fps on mid-tier
  phones — exactly the SMB audience on cheap Android.

## Where motion lives
- Keyframes + animation utilities: `src/app/globals.css` (search `@keyframes`,
  `animation:`, `transition:`, and any `@media (prefers-reduced-motion`).
- Tailwind usage: grep components for `animate-`, `transition`, `duration-`,
  `motion-safe:`, `motion-reduce:` across `src/components/**`.

## Steps
1. List every `@keyframes` block and `animation`/`transition` declaration.
2. For each, check the animated property. Flag any that touch layout/paint props
   (width/height/top/left/margin/padding/box-shadow/`filter` blur) and propose
   the transform/opacity equivalent (e.g. animate `translateX` not `left`,
   `scale` not `width`).
3. Confirm a global `@media (prefers-reduced-motion: reduce)` guard exists in
   `globals.css` and that it actually neutralizes animations (e.g.
   `animation: none`/`transition: none` or near-zero duration). Flag any
   keyframe animation or `animate-*` element not covered by it — or recommend
   `motion-safe:` prefixes so Tailwind gates them automatically.

## Output
Table: Animation/selector | Location | Issue (layout-thrash prop OR ignores
reduced-motion) | Fix. Note whether a `prefers-reduced-motion` guard exists at
all. If everything animates transform/opacity and is reduced-motion-safe, say so
and name the heaviest remaining animation.
