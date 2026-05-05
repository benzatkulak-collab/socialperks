# 50 Things Tonight — Tactical Execution List

Categorized so they can be parallelized. ✅ = done in this session.
Each is meant to be ≤30 minutes; most are 2-5 min. Refresh this doc after each batch.

## A. Strategic copy reframe (1-10)

1. ✅ Hero headline → QR-on-the-cup
2. ✅ How-it-works rewrite → 4 QR-flow steps
3. ✅ CTA section copy → "One QR. Hundreds of ads."
4. ✅ Layout metadata title + description → QR framing
5. ✅ Footer: remove Leaderboard
6. ✅ Pricing-section rewrite (background agent, P7)
7. About page: rewrite intro to emphasize regulars-not-creators (deferred)
8. Open-graph image text update for new headline (deferred — image is SVG, copy is in src)
9. ✅ Manifest description match
10. Status page tagline (deferred)

## B. SEO + AEO surface (11-20)

11. JSON-LD `Offer` schema on `/c/[campaignId]` (deferred — needs route audit)
12. ✅ Sitemap already includes /b/[slug] generation; removed /leaderboard + /i/* per pivot
13. ✅ robots.ts: explicit allow for GPTBot/ClaudeBot/PerplexityBot + 12 more AI crawlers
14. ✅ Canonical on /b/[slug] (already done)
15. Article schema on /blog posts (deferred — verify if blog already emits it)
16. /trends page stub (deferred — net new page)
17. /local/[city]/coffee-shops generator stub (deferred — `/in/[city]/[industry]` already exists)
18. FAQ schema on /pricing FAQ (deferred — depends on P7 FAQ structure)
19. BreadcrumbList JSON-LD (deferred)
20. Submit sitemap to Search Console (manual — needs user)

## C. Onboarding friction reduction (21-30)

21. ✅ QR poster as dashboard hero (P2)
22. ✅ Dashboard empty-state copy → "Print your first QR code"
23. Onboarding wizard: poster on final step (deferred — wizard audit needed)
24. /dashboard#signup vertical preselect (deferred — needs auth-form audit)
25. Magic-link signup (deferred — needs RESEND_API_KEY)
26. Sample campaign auto-seed for new accounts (deferred)
27. "I'm a coffee shop" segment toggle (deferred)
28. Welcome email with poster attached (deferred — needs Resend)
29. SMS opt-in copy in onboarding (deferred)
30. Inline POS picker during onboarding (deferred — POS routes just shipped via P5)

## D. Distribution + AI inbound (31-40)

31. ✅ /agents page metadata rewritten for MCP/agents framing
32. ✅ OpenAPI 3.1 spec at `/api/v1/openapi`
33. ✅ MCP server stub at `/api/mcp` with tool catalog + JSON-RPC
34. ✅ `<meta name="ai-content-policy" content="open">` in layout
35. ✅ /public/ai.txt with permissive AI policy
36. ✅ /public/llms.txt with structured product summary
37. Producthunt-style directory submission prep (manual, doc only)
38. smithery.ai listing (manual — needs MCP transport on a subdomain first)
39. awesome-mcp GitHub PR (manual — same)
40. Tweet thread template (manual, deferred — comms work, not code)

## E. Trust + conversion (41-50)

41. Testimonial placeholder strip on landing (deferred)
42. "5 coffee shops onboarded so far" live counter (deferred — needs waitlist DB read)
43. Footer trust line "built by..." (deferred)
44. /security page stub (deferred — security.txt already exists)
45. /case-studies stub (deferred — page already exists per sitemap)
46. Annual-pricing toggle (deferred — P7 agent may add)
47. ROI calculator coffee-shop preset (deferred)
48. ✅ Creator surfaces de-emphasized in nav (NAV_LINKS already clean)
49. ✅ /leaderboard + /i/* still resolve but out of search (verified)
50. ✅ noindex on /leaderboard + /i/[slug] (page metadata)

---

## Tonight execution plan

**Batch 1 (this session, ~now):** 1-5 ✅, 6, 9, 13, 14 ✅, 21 ✅, 31-36, 48-50

**Batch 2 (parent agent):** 7, 8, 10, 11, 12, 15, 18, 19, 22, 23, 24,
26, 27, 29, 30, 41, 42, 43, 44, 45, 46, 47

**Manual / deferred (need user):** 20, 25, 28, 37, 38, 39, 40

The batch 1 items are completable in pure-code edits without external
accounts. Batch 2 items take a few hours and follow naturally from the
P3-P5 + P7 work the sub-agent is finishing. Manual items need outside
accounts (Search Console, Resend, Twitter, etc.).
