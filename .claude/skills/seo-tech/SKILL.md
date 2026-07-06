---
name: seo-tech
description: >-
  Audit technical SEO crawlability — sitemap.xml + robots.txt in sync,
  self-referencing canonicals, and no stray noindex on public pages. Use
  whenever the user mentions crawling, indexing, sitemap, robots.txt, canonical
  tags, "why isn't Google indexing", noindex, or search-engine discoverability
  — even if they never say "technical SEO". This is a launch gate, so run it
  before any deploy that touches routes, metadata, or the sitemap.
argument-hint: ""
allowed-tools: Read, Grep, Glob, Bash(npm run build:*)
model: sonnet
---

# Technical SEO audit (crawlability gate)

Why this matters: a single stray `noindex` or a sitemap/robots mismatch can
silently de-index money pages. Prior SEO hardening already shipped (canonicals,
OG PNGs, scoped noindex) — your job is to catch **regressions**, not re-report
solved items. This check is also enforced in CI via
`.github/workflows/launch-gate.yml`.

## Where the truth lives
- `src/app/sitemap.ts` — the generated sitemap (~595 URLs, built from content
  arrays like `src/lib/{answers-data,industries,guides-data,best-data,vs-data,
  blog,cities}.ts`).
- `src/app/robots.ts` — allow/disallow rules + `sitemap:` + `host:` pointers.
- `src/lib/seo.ts` — `buildMetadata()` sets canonical + robots per page;
  `SITE_URL` is the canonical origin every URL must use.

## Steps
1. **Build so the sitemap is real** — never eyeball the arrays:
   !`npm run build 2>&1 | tail -40`
2. **Sitemap ↔ robots sync**: every path `disallow`ed in `robots.ts`
   (`/dashboard`, `/programs`, `/campaigns`, `/admin`, `/reset-password`,
   `/confirm-reset`) must NOT appear in the sitemap. Conversely, no public
   sitemap URL may be blocked by a disallow rule.
3. **noindex scope**: confirm `noindex` is applied ONLY to auth/token/private
   pages (dashboard, reset, confirm, member portals). Grep `robots:` / `index:
   false` in `src/app/**` and flag any hit on a public marketing/content page.
4. **Canonicals**: every public page routes through `buildMetadata()` and gets a
   self-referencing canonical on `SITE_URL` (not `localhost`, not a preview
   host, no trailing-slash drift). Flag pages that set `alternates`/`canonical`
   by hand.
5. **robots.txt sanity**: `sitemap:` and `host:` resolve to `SITE_URL`; the
   agent-discoverable API allowlist is intact.

## Output
Report as PASS/FAIL per check (sitemap-sync, noindex-scope, canonicals,
robots-pointers). For each FAIL: file + line, the exact offending path/rule, and
the one-line fix. If all pass, say so and name the riskiest area to watch (e.g. a
newly added route not yet wired into `sitemap.ts`).
