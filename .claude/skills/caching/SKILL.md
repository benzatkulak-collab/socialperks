---
name: caching
description: >-
  Audit static-vs-dynamic route boundaries so rendering strategy is intentional:
  catch accidental force-dynamic, missing/incorrect revalidate/ISR, and places
  that should use CDN or DB-query caching. Use whenever the user mentions
  caching, ISR, revalidate, force-dynamic, static generation, stale content, or
  "why is this page not cached".
argument-hint: ""
allowed-tools: Read, Grep, Glob
model: opus
---

# Caching & render-strategy audit

The site leans hard on static generation — `generateStaticParams` produces ~595
static pages (see `src/app/sitemap.ts` for the URL universe) — with a handful of
genuinely dynamic (ƒ) routes. The failure mode is *accidental* dynamism: one
stray export flips a page that should be a cached, CDN-served static asset into a
per-request render, silently killing TTFB and cache hit rate at scale. The goal
is that every route's strategy is a deliberate choice.

## Steps
1. **Find dynamic opt-outs**: grep `src/app` for route-segment config exports —
   `grep -rn "export const dynamic\|export const revalidate\|export const fetchCache\|generateStaticParams" src/app`.
   Flag every `dynamic = 'force-dynamic'` on a content/marketing page — those
   (blog, best, vs, guides, industries, cities pages backed by
   `src/lib/{answers-data,industries,guides-data,best-data,vs-data,blog,cities}.ts`)
   should be static or ISR, not force-dynamic.
2. **Check ISR freshness**: content pages that change occasionally should set a
   `revalidate` (ISR) rather than being pinned fully static (never updates) or
   force-dynamic (never cached). Flag missing/absent `revalidate` where content is
   editable, and over-eager `revalidate` (e.g. seconds) that defeats caching.
3. **API routes**: handlers under `src/app/api/v1/**` are correctly dynamic (they
   read auth/DB). Do NOT flag those — but note reference/public GETs
   (`/api/v1/pricing`, `/api/v1/actions`, `/api/v1/benchmarks`) are cache-friendly
   and should send `Cache-Control` / CDN headers rather than recomputing per call.
4. **DB query caching**: for hot read paths through `src/lib/db/connection.ts`,
   note where a short-TTL cache in front of the Supabase pooler would cut load —
   but never cache authenticated/per-user reads.

## Output
Table: Route/file | Current strategy (static / ISR / ƒ dynamic) | Intended |
Fix. Lead with any accidental `force-dynamic` on a static-eligible page — that is
the highest-impact finding. If all boundaries are intentional, say so and name
the one route whose strategy is most worth revisiting.
