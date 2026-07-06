---
name: schema
description: >-
  Audit JSON-LD structured data — Organization, SoftwareApplication/Product,
  BreadcrumbList, FAQPage/QAPage, HowTo — validating required fields and finding
  GAPS where a page type should emit schema but doesn't. Use whenever the user
  mentions structured data, JSON-LD, schema.org, rich results/snippets, FAQ
  markup, breadcrumbs, or "why don't we show up as a rich result" — even without
  saying "schema".
argument-hint: "[page]"
allowed-tools: Read, Grep, Glob
model: opus
---

# Structured-data (JSON-LD) audit

Why this matters: valid JSON-LD is what earns rich results (FAQ accordions,
breadcrumbs, sitelinks) and feeds AI answer engines that increasingly drive
discovery. Invalid or missing blocks are pure lost surface area — the content is
already there, only the machine-readable wrapper is absent.

## What the repo already emits (verify, don't assume)
Several page families already inject JSON-LD (industry pages, answers/Q&A,
guides, blog, compare/vs). Grep for existing emitters first:
`grep -rln "application/ld+json\|@context\|@type" src/app src/components` — read
each block and validate it before hunting for gaps.

## Validate existing blocks for required fields
- **Organization**: `name`, `url`, `logo`, `sameAs`.
- **SoftwareApplication / Product**: `name`, `applicationCategory` or
  `category`, and an `offers` block with `price` + `priceCurrency` (Product) or
  `aggregateRating` only if real ratings exist — never fabricate ratings.
- **BreadcrumbList**: ordered `itemListElement` with `position` + `item`.
- **FAQPage / QAPage**: each `Question` has an `acceptedAnswer` with text.
- **HowTo**: `step` array with `name` + `text`.

## Find the gaps (known backlog)
- `/pricing` is known to LACK Product/Offer schema despite listing paid tiers —
  verify and, if missing, specify the exact block (tiers/prices come from the
  pricing data; keep price in sync to avoid drift).
- Any page with visible breadcrumbs but no `BreadcrumbList`.
- Any FAQ-style content rendered as plain markup with no `FAQPage`.

## Output
Two sections: (1) **Invalid** — existing blocks missing required fields, with
file:line and the missing key; (2) **Missing** — page/type that should emit
schema but doesn't, with a ready-to-paste JSON-LD block. $ARGUMENTS narrows to
one page or one schema type.
