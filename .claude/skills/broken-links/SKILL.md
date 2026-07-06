---
name: broken-links
description: >-
  Crawl the site for 404s, broken images, redirect chains, and dead external
  links, seeded from the generated sitemap and internal <Link>/<a> targets. Use
  whenever the user mentions broken links, 404s, dead links, link checker, broken
  images, redirect chains, or "are all the links working".
argument-hint: "[base-url]"
allowed-tools: Read, Grep, Glob, Bash(npx:*)
model: haiku
---

# Broken-link crawl

Dead internal links and broken images quietly tank SEO and trust — and this site
has ~595 URLs across programmatic content pages, so a broken template link
multiplies fast. The goal is to catch them before Google (or a customer) does.

## Seed the crawl
1. **Sitemap URLs.** Read `src/app/sitemap.ts` (≈595 URLs) to get the canonical
   URL set — these are the pages that MUST resolve.
2. **Internal link targets.** `grep -rn '<Link href=\|href="/' src` and collect
   internal targets, then confirm each maps to a real route/segment under
   `src/app`. A `href` to a path with no matching route is a guaranteed 404.
3. **Content-data links.** Check the content arrays that feed programmatic pages
   (`src/lib/{answers-data,industries,guides-data,best-data,vs-data,playbook-data,blog,cities}.ts`)
   for internal URLs that must resolve.

## Live crawl (optional, when a base URL is given)
If `$ARGUMENTS` is set, crawl it with a link checker via npx (fetched on first
run), e.g. `npx linkinator $ARGUMENTS --recurse --silent` (or `npx broken-link-checker`).
Classify: 404 (dead), 3xx redirect chains (fix to the final URL), broken `<img>`
sources, and dead EXTERNAL links (report separately — those rot on their own).

## Output
Grouped list: Internal 404s (link source file:line → dead target) — highest
priority; Broken images; Redirect chains (from → final); Dead external links.
Cross-check counts against the sitemap so nothing in the ~595 is unreachable. If
no base URL was given, report the static grep/sitemap findings and note that a
live crawl needs `$ARGUMENTS`.
