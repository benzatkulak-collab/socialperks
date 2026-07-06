---
name: internal-links
description: >-
  Audit internal linking — find orphan pages (in the sitemap but linked from no
  nav/footer/hub), verify every important page is reachable in <=3 clicks, check
  for descriptive anchor text, and validate hub/spoke topical clustering. Use
  whenever the user mentions internal links, orphan pages, site structure, crawl
  depth, "click here" anchors, link equity, topical clusters, or how pages
  connect — even without naming "internal linking". It's the most underrated
  organic lever, so offer it proactively when SEO comes up.
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: opus
---

# Internal-linking audit

Why this matters: internal links are how crawl budget and link equity flow to
your money pages, and how AI/search understands topical authority. A page with
zero inbound internal links is effectively invisible no matter how good it is.

## The map
- **Full inventory** = every URL in `src/app/sitemap.ts` (~595 URLs, built from
  `src/lib/{answers-data,industries,guides-data,best-data,vs-data,playbook-data,
  blog,cities}.ts`).
- **Content hub** = `/resources` — the intended spine that should link out to
  the deeper families (guides / best / vs / playbook / answers / industries).
- **Global nav/footer** = `src/components/shared/footer.tsx` and the nav. KNOWN
  GAP: the footer only links a few hubs; deeper money-hubs (guides, best, vs,
  playbook) are missing from it.

## Steps
1. **Orphans**: build the set of pages that appear in the sitemap but receive no
   `<Link href=...>` from any nav, footer, `/resources` hub, or sibling page.
   Grep `href=` usages and diff against the sitemap paths.
2. **Depth <=3 clicks**: trace from the homepage — every important page (each
   hub + its top spokes) must be reachable within 3 hops. Flag anything deeper.
3. **Anchor text**: flag generic anchors ("click here", "read more", "learn
   more", bare URLs). Internal links should use descriptive, keyword-bearing
   text.
4. **Hub/spoke integrity**: each hub links to its spokes AND spokes link back up
   to the hub and across to siblings (topical cluster). Flag one-way or broken
   clusters.

## Output
Ranked list of the highest-leverage fixes: (1) orphan pages + the specific
hub/footer/nav link to add for each; (2) money-hubs to add to
`footer.tsx`; (3) generic anchors to rewrite (old → new text). Give concrete
`href` + anchor text, not "add more links".
