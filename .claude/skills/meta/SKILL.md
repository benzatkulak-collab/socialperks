---
name: meta
description: >-
  Audit per-page title tags, meta descriptions, Open Graph, and Twitter cards —
  ensuring every page has a unique title (<=60 chars), a ~150–160 char
  description, and OG/Twitter tags WITH an image. Use whenever the user mentions
  titles, meta descriptions, social preview, OG image, Twitter cards, link
  unfurls, "how it looks when shared", or a page's search snippet — even without
  saying "metadata". Also fire when a new page/route is added.
argument-hint: "[page]"
allowed-tools: Read, Grep, Glob
model: haiku
---

# Metadata & social-card audit

Why this matters: a missing OG image makes shared links unfurl as bare text and
tanks click-through; duplicate or truncated titles waste the highest-leverage
SERP real estate. The repo already has helpers to get this right — the failure
mode is pages that bypass them.

## The one rule that prevents most bugs
Every page MUST build its metadata through `src/lib/seo.ts`:
- `buildMetadata({ title, description, path, ... })` — canonical + robots + OG.
- `metaTitle()` — enforces the brand suffix and length.
- `clampDescription()` — clamps to ~158 chars.
- `ogImages()` — attaches the OG/Twitter image (defaults to `DEFAULT_OG_IMAGE`).

A page that hand-rolls `export const metadata = { openGraph: {...} }` without an
`images` entry is the classic defect. Flag it.

## Steps
1. Find pages setting metadata directly instead of via the helper:
   `grep -rn "export const metadata\|generateMetadata\|openGraph" src/app` —
   cross-check each against a `buildMetadata(` / `ogImages(` call.
2. **Titles**: unique per page, <=60 chars including the brand suffix. Flag
   duplicates and over-length titles.
3. **Descriptions**: present, ~150–160 chars, unique, not truncated mid-word.
4. **OG + Twitter**: both present WITH an image; `twitter.card` is
   `summary_large_image`. No page ships OG tags with no image.
5. **Favicon**: confirm the icon set is wired in `src/app/layout.tsx` (icons /
   apple-touch) and not 404ing.

## Output
Table: Page | Title (len) | Desc (len) | OG image? | Routes via seo.ts? | Fix.
Flag every direct-metadata page as a must-fix with the exact `buildMetadata()`
call to replace it. $ARGUMENTS narrows the audit to a single page/route.
