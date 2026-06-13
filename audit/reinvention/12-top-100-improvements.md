# Top 100 Prioritized Improvements

*Globally ranked by (revenue impact × retention impact × feasibility ÷ effort), deduplicated across all sections. Impact class: REV / RET / VIRAL / TRUST / VELOCITY / LEGAL. Effort: S ≤2d / M ≤2wk / L >2wk. Top 20 carry a sequencing note. Source section in (parens).*

## The first 20 (with sequencing) — do these in order; they are the company's critical path

1. **Set the 6 go-live env vars + register webhook + run migrate** — REV, S (00/10). *First: nothing earns until this is done; it's hours.*
2. **Hard-block incentivized review actions** (Google/Yelp/TripAdvisor) — LEGAL, S (03/02). *Before any traffic: $53K/violation exposure is live in shipped code.*
3. **Add durable read-path for submissions** — REV/RET, S (03). *Loop step 1: pending reviews must survive cold start.*
4. **Build the business-facing review surface** (queue/approve/reject/badge) — REV/RET, M (03/09). *Loop step 2: owner must be able to review.*
5. **Fix approve→award→email** so approval actually grants the perk + notifies — REV/RET, S (03/09). *Loop step 3.*
6. **Public magic-link perk wallet + staff redeem screen** — REV/RET, M (03/09). *Loop step 4: the customer must redeem at the counter.*
7. **Add file/screenshot upload for proof** — REV, M (03/09). *Loop step 5: paste-a-URL kills customer conversion.*
8. **Rehydrate campaign on the public submit route** — REV, S (03). *Stops intermittent 404 at the money step.*
9. **Wire the QR-poster button + share on wizard success** — REV/VIRAL, S (03/04). *The activation cliff; API already exists.*
10. **Fix dashboard amnesia** (call existing `loadLifecyclesForBusiness`) — RET, S (03/09). *Saves day-2 retention.*
11. **Port campaigns/submissions persistence to the flat-TEXT-table pattern** — REV/TRUST, M (03). *Closes the invisible silent-data-loss bug.*
12. **Fix payout balance check (or cut payouts)** — LEGAL/REV, S (03). *Drain-the-account bug the day Stripe goes live.*
13. **Kill trust lies** (dispute theater, fabricated social proof, fake leaderboard, false "AI/SMS/auto-review" copy) — TRUST, S–M (03/11). *Cheap; exposure is fatal.*
14. **Re-tier pricing v2 around enforceable real value + enforce kept gates** — REV, M (05). *Creates the "why pay."*
15. **Billing link in nav + one-sub upgrade path** — REV, S (05/09). *Let willing buyers pay.*
16. **OG images → PNG via next/og** — VIRAL, S (04). *Multiplies every share surface at once.*
17. **Referral cookie-read at signup + pick one system + fix truncation** — VIRAL, S (04). *Activates the cheapest loop.*
18. **Durable drip-sent ledger before enabling lifecycle crons** — RET, S (03). *Prevents daily duplicate spam.*
19. **Default `#signup` to the signup screen** — REV, S (03/09). *Trivial top-of-funnel fix.*
20. **Instrument the value loop in PostHog (server-side)** — RET, S (09). *Makes activation/retention measurable.*

## 21–40 — Revenue integrity, retention engine, real AI

21. Subscription lifecycle integrity: hydrate subs before webhook + enforcement — REV, M (05).
22. Sync Stripe plan changes (price→plan) — REV, S (05).
23. Dunning email sequence + grace period — REV, S (05).
24. Weekly results email (real numbers) — RET, M (04/07).
25. Real vision-model proof verification — LEGAL/TRUST, M (08). *The moat + compliance prerequisite.*
26. Enforced FTC disclosure before payout — LEGAL, M (07/08).
27. Real LLM campaign-copy generation (make "AI" honest) — REV, M (08).
28. Remove "AI/SSO/CSV/priority/multi-location" vapor from pricing — TRUST, S (05/06).
29. Delete the stale third plan definition (lib/stripe.ts) — VELOCITY, S (05).
30. Success-moment upgrade prompts — REV, S (09).
31. Perk-program streaks/levels v1 — RET, M (04).
32. Password reset: real page + durable tokens — RET, S (07).
33. Remove demo accounts + PIN from prod login — TRUST, S (03).
34. Replace fabricated social proof with "founding businesses" framing — TRUST, S (03).
35. Honest onboarding concierge (AI, once/signup) — RET, M (08).
36. Campaign templates by vertical — REV, S (07).
37. Sentry DSN activation — VELOCITY, S (03).
38. Embeddable widget DB-fallback — VIRAL, S (04).
39. Server-side invite-track wiring (replace honor system) — VIRAL, M (04).
40. Record-keeping per submission (offer/disclosure/verified post/payout) — LEGAL, S–M (07).

## 41–60 — Distribution, focus/subtraction, channel

41. Square POS integration (distribution + ROI data + money-flow) — REV/RET, L (05/07). *Unlocks ranks below.*
42. ROI dashboard with real redemption data — REV/RET, M (07).
43. Agency/white-label reseller console — REV, M (05/10).
44. Cut influencer marketplace (delete ~3,400 LOC dead components) — VELOCITY, S (06).
45. Park enterprise behind a "talk to us" page; delete portal — VELOCITY, M (06).
46. Freeze/decommission the 10-agent fleet; reclaim cron slot — VELOCITY, S (06).
47. Delete/rewrite the false /agents "earn with bots" pitch — TRUST, S (06).
48. Remove the second referral system — VELOCITY, S (06).
49. Vertical landing pages (coffee/salon/gym) — REV, S (07).
50. Move dev/MCP strip off the marketing homepage to /developers — REV, S (03/06).
51. Meta app-review submission (de-risk verification approval) — LEGAL, M (07).
52. In-store starter kit (poster + table tent + ask script) — REV, S (07).
53. Real customer SMS perk delivery — RET, M (07).
54. Audit the 96 routes; delete/flag unreachable — VELOCITY, M (06).
55. Remove "perk via SMS" copy until SMS is real — TRUST, S (06).
56. Update CLAUDE.md (stale exchange/platform counts) — VELOCITY, S (06).
57. Delete fake leaderboard + seed profile pages from sitemap — TRUST, S (06).
58. Inline the FTC plugin hook; archive plugin framework — VELOCITY, M (06).
59. Archive graph/embedding/matching/experiment engines — VELOCITY, S (06).
60. Delete dead job queue + orphaned email modules — VELOCITY, S (06).

## 61–80 — Retention depth, network effect, polish

61. Local cross-business cross-promo v1 (Substack-Recommendations) — RET/VIRAL, M–L (04/02). *The compounding moat.*
62. Behavioral status tiers (Regular→Insider→Ambassador) + wall of supporters — RET, M (02/04).
63. Consumer milestone referral ladders ("refer 3 → unlock") — VIRAL, M (04).
64. Benchmarks email (real, vs category) — RET, S (07).
65. Multi-staff review seats — REV, M (07).
66. Disclosure/compliance checker (sentiment-conditioning guard at setup) — LEGAL, M (08).
67. Monitoring + takedown loop (advertiser duty) — LEGAL, M (08).
68. Results summarizer (AI narration of loop data) — RET, S (08).
69. Light campaign-matching recommender — REV, S (08).
70. AEO/long-tail content optimization (citation-ready) — REV, S ongoing (02).
71. Fix wizard tip personalization (>10 hardcoded strings) — RET, S (01).
72. Add empty-state copy that doesn't lie about the QR poster — TRUST, S (09).
73. Clipboard-copy failure handling on share buttons — VIRAL, S (09).
74. Campaign-sweeps notification delivery (or move to email) — RET, S (07).
75. Toast/Clover/Shopify integrations (after Square) — REV, M each (07).
76. Success-fee billing rail (% of attributed redemptions) beta — REV, M (05/10).
77. Help center / simple support surface — RET, S (01).
78. Reconcile "works for any business" vs vertical positioning — REV, S (01).
79. Remove dead embed-widget card (or wire the plan prop) — VELOCITY, S (03).
80. Onboarding drip conditions read durable (not in-memory) campaign state — RET, S (04).

## 81–100 — Hardening, scale, later-stage

81. Server-side PostHog capture from Stripe webhook (source of truth) — RET, S (09).
82. Net-revenue-retention tracking (expansion/success-fee) — REV, S (10).
83. Cohort churn dashboard — RET, S (10/11).
84. Referral attribution events in PostHog — VIRAL, S (04).
85. Renewal-date sync (invoice.paid handler) — REV, S (05).
86. Cancellation/win-back flow — RET, M (05).
87. Activation email at "first customer claim" milestone — RET, S (09).
88. A/B test the wizard + pricing (reuse the existing engine) — REV, M (06/09).
89. Light multi-location (only if demand pulls) — REV, L (07).
90. Public API/agent pricing (if real demand appears) — REV, M (05).
91. Fraud heuristics wired to the live submit path — TRUST, M (06).
92. Influencer reputation surfaced (only if influencer revived later) — TRUST, M (01).
93. Brand-partnership/sponsored-campaign model (at density) — REV, L (05).
94. Quality-weight perk values by verified engagement — REV/TRUST, M (02).
95. Streak-freeze mechanic (avoid streak anxiety) — RET, S (02/04).
96. Beehiiv-style paid Boosts between neighbor businesses — REV, M (02/04).
97. Mobile admin (only if admin stays in any user path) — VELOCITY, M (03).
98. Internationalization (far later; deferred) — VELOCITY, L (06).
99. SOC2/security posture for enterprise (only if enterprise revived) — TRUST, L (06).
100. Engagement/best-time prediction (only once data exists) — REV, M (08).

## How this list was built
Every item is deduplicated across the 11 sections (each appears once, with its home section noted). The ordering reflects the report's central thesis: **the highest-ROI work is finishing the core loop, taking money, removing liabilities, and pointing the product at one audience — not building new things.** Items 1–20 are the critical path and are overwhelmingly S/M effort; the company's entire near-term value is concentrated there. Items 41 (Square) and 61 (local network effect) are the two structural bets that move it from "working product" to "defensible business." **Silent caps disclosed:** this list prioritizes by ROI-per-effort and intentionally defers all speculative/breadth work (items 89–100) below the focus and finishing work — that deferral is a recommendation, not an omission.
