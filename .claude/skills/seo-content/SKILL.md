---
name: seo-content
description: >-
  Audit ON-PAGE content SEO (complements the technical /seo pass): exactly one
  h1 per page, logical h2/h3 nesting, keyword coverage for the page's target
  query, and content depth/uniqueness across templated pages. Use whenever the
  user mentions content SEO, heading structure, h1/h2, keyword coverage, thin
  content, duplicate/templated pages, content depth, or "will this page rank"
  — even without naming SEO. $ARGUMENTS narrows to one page.
argument-hint: "[page]"
model: opus
allowed-tools: Read, Grep, Glob
---

# On-page content SEO audit

This is the **content** half of SEO — heading semantics, keyword coverage, and
depth/uniqueness. The technical half (metadata, canonicals, OG, sitemap) lives
in `src/lib/seo.ts` and is a separate pass; don't re-audit metadata plumbing
here beyond confirming the page routes through `buildMetadata`/`metaTitle`/
`clampDescription`. Why it matters: the app ships hundreds of programmatic pages
(the sitemap has ~595 URLs), so a single bad template stamps the same thin-content
or missing-h1 defect across every generated page at once.

## Where content comes from
Content is data-driven — copy lives in arrays, templates under `src/app` render
them:
- `src/lib/answers-data.ts`, `src/lib/industries.ts`, `src/lib/guides-data.ts`,
  `src/lib/best-data.ts`, `src/lib/vs-data.ts`, `src/lib/playbook-data.ts`,
  `src/lib/blog.ts`, `src/lib/cities.ts`.
- Their rendering templates are the `page.tsx` files under `src/app` (city /
  industry / guides / best / vs / blog / answers routes).

Audit the **template** for structural defects (they replicate across every row)
and **spot-check the data** for depth/uniqueness.

## Checks
1. **Exactly one h1**: grep the target template for `<h1`. Flag zero h1s (common
   when the hero uses a styled `<div>`) and flag two-or-more h1s. Subheads must
   be h2/h3.
2. **Heading nesting**: h2 before any h3, no skipped levels (h1 → h3). Flag
   headings chosen for font size rather than document outline.
3. **Keyword coverage**: derive the page's target query from its slug/data row
   (e.g. `[industry]` + core value prop). Confirm that query and close variants
   appear in the h1, first paragraph, and at least one h2 — without keyword
   stuffing.
4. **Depth / uniqueness**: flag templated pages that are near-identical except a
   swapped noun (thin/doorway-page risk). Each generated page needs materially
   unique body copy, not just a find-replaced token.

## Output
Report per page (or per template): h1 count (must be 1) | heading-order issues |
target query + where it's covered/missing | thin-vs-unique verdict. Give
concrete fixes (which data array/template line to change). If `$ARGUMENTS` names
a page, scope the whole audit to it; otherwise sample one representative page per
content template and call out systemic defects.
