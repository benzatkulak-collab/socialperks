---
name: images
description: >-
  Audit image handling for performance: every image should go through
  next/image with explicit dimensions, modern formats (AVIF/WebP), correct
  sizes, and below-fold lazy-loading. Use whenever the user mentions images,
  next/image, raw <img> tags, image weight, AVIF/WebP, or layout shift from
  media.
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: haiku
---

# Image performance audit

Images are the usual LCP element and the #1 CLS source, so getting them right is
the cheapest large CWV win. The rules: serve through `next/image` (automatic
AVIF/WebP + responsive srcset), always set explicit `width`/`height` (or `fill`
with a sized parent) to reserve space and kill layout shift, and lazy-load
anything below the fold while marking the hero `priority`.

## Steps
1. **Find raw `<img>`**: `grep -rn '<img' src/` — each is a finding (no automatic
   format conversion, no dimension enforcement, no lazy default tuned to LCP).
   Recommend converting to `next/image`.
2. **Check `next.config.js`** for an `images` block (`formats`, `remotePatterns`,
   `deviceSizes`). This repo currently has **no** images config — flag that: without
   `formats: ['image/avif','image/webp']` you fall back to defaults, and any remote
   host must be allow-listed via `remotePatterns` or `next/image` will error.
3. **Dimensions**: flag any `next/image` / `<img>` missing `width`+`height` (or
   `fill` without a positioned, sized parent) — these cause CLS.
4. **Priority vs lazy**: exactly one above-fold hero (in `src/components/landing/`)
   should be `priority`; everything below the fold should lazy-load (the default).
   Flag a `priority` image that is not actually the LCP element.

Note: OG/social images are already handled correctly — they render as PNG via
`next/og` through `src/lib/seo.ts` (`ogImages`). Do not flag those.

## Output
Table: File:line | Issue (raw img / missing dims / wrong priority / no config) |
Fix. Call out the missing `images` config in `next.config.js` as its own line if
present. If everything is clean, say so and name the LCP hero image.
