# Feature Elimination Plan (Phase 6)

*Top 25 to REMOVE. For each: why it exists (charitably) → why it's harmful now → maintenance burden → revenue impact of removal → action. Focus: simplification for a solo founder. Grounded in `influencer-enterprise-agents.md`, `delta-remediation.md`, `growth-surface.md`, `monetization-reality.md`.*

## Principle
This is a **finishing-and-focus** problem. ~60% of the codebase serves three audiences that produce $0 and pull a solo founder off the one that can pay. Deleting them is not loss — it is velocity, a smaller attack surface, and the removal of several active liabilities (the payout drain bug, the false /agents pitch, the FTC landmine). Most "revenue impact of removal" cells read **zero or positive**.

| # | Remove | Why it exists (charitable) | Why harmful now | Burden | Rev impact of removing | Action |
|---|---|---|---|---|---|---|
| 1 | **Influencer marketplace** (profile editor, rate card, media kit, earnings dashboard, discovery) | Bet on a creator supply side | ~3,400 LOC dead/orphaned; profile saves 404 for real users; discovery serves fake businesses; the only "monetizable" audience earns $0; two-sided liquidity is a second startup | ~3,400 LOC + parallel app.tsx architecture | **+** (removes the payout drain bug too) | **Delete** components; retire seed-influencer API; keep auth role dormant only if free |
| 2 | **Payout / Stripe Connect path** (as creator payouts) | Pay creators | **No balance check = drain-the-account** once keys land; nothing earns payouts | payouts lib + routes | + (closes critical bug) | **Cut** with influencer side (re-add only if a funded model exists) |
| 3 | **Enterprise portal** (17 components, 567-LOC hook) | Land big logos | No human can hold the role in prod; API keys/webhooks/locations are hardcoded fakes; 2+ quarters from real | ~heavy | 0 (0 reachable users) | **Park** behind a "Talk to us" form; delete portal |
| 4 | **10-agent autonomous fleet** (1,896 LOC) | Agent-native back-office | Can't run live on serverless (process-local mode); daily cron simulates work forever; acquisition agent burns leads into a dead queue | 11 agents + cron slot | 0 | **Freeze/decommission**; reclaim the cron slot |
| 5 | **/agents "earn money with your bots" pitch** | Agent acquisition channel | False (0 real businesses, mock payouts); sells to devs with zero ICP overlap; invites the fraud the product must block | page + claims | 0 (anti-marketing today) | **Delete/rewrite** the pitch |
| 6 | **Exchange order-book** | Agent trading market | Already deleted in #108 — but **CLAUDE.md still documents 7 endpoints** | stale docs | 0 | **Update docs** (code already gone) |
| 7 | **Second referral system** (keep one) | Two attempts at referral | Sprawl reproduced inside remediation; the 12/13-char truncation mismatch | 2 libs | + (correctness) | **Delete** the redundant one; canonicalize |
| 8 | **Financial ledger** (in-memory) | Double-entry bookkeeping | 100% ephemeral = decorative; blocks nothing real today; resurrect only when money flows through platform | lib | 0 | **Remove** until POS money-flow needs it |
| 9 | **Fake public leaderboard** | Social proof / SEO | Fabricated "Real-time ranking by verified posts" indexed for Google = trust lie | page + JSON-LD | 0 | **Delete** (or gate on real data) |
| 10 | **Seed profile pages** (/b/, /i/ from createSeedData) | SEO surface | Google invited to index ~15 nonexistent businesses/influencers | sitemap entries | 0 | **Delete** from sitemap until real |
| 11 | **Dead embed-widget card** | Upsell widget | `plan` prop never passed → can never render | component | 0 | **Remove** or wire the prop |
| 12 | **Orphaned email machinery** (digest, QBR, creator-match) | Lifecycle richness | Zero callers; dead weight | ~800+ LOC | 0 | **Delete** or wire one (weekly results) |
| 13 | **Dead job queue** (472-LOC) + startAllQueues | Async processing | Never started; routes consciously bypass it | lib | 0 | **Delete** (direct-send is the pattern now) |
| 14 | **A/B experiment engine** | Experimentation | Real code, zero UI consumers; nothing runs an experiment | lib + route | 0 | **Archive** until there's traffic to test |
| 15 | **Graph engine / embedding engine** (home-rolled) | ML matching | Speculative; "semantic search" is hand-rolled vectors over seed data | 2 libs | 0 | **Archive**; real embeddings later if needed |
| 16 | **Matching engine / fraud-detection** (as live features) | Influencer matching, fraud | Wired to orphan routes + dry-run agents; no real submission is fraud-checked | 2 libs | 0 now | **Keep fraud heuristics** but wire to the real submit path when the loop closes; archive matching |
| 17 | **Plugin system** | Extensibility | Premature for pre-launch; the one live use (FTC hook) can be a direct call | lib | 0 | **Inline** the FTC hook; archive the framework |
| 18 | **Creator/role picker at signup** | Multi-audience | Adds a decision gate; routes to dead influencer portal | auth-form branch | + (cleaner funnel) | **Remove**; business-only signup |
| 19 | **Demo accounts + PIN 1234 on prod login** | Easy demos | Signals "toy"; shared prod backend | auth-form block | + (credibility) | **Remove** from prod (keep a ?demo route) |
| 20 | **Developer/MCP strip on the marketing homepage** | Agent discovery | Audience confusion for mom-and-pop between social proof and pricing | page section | + | **Move** to /developers |
| 21 | **"AI insights / AI generations" as paid differentiators** | Premium framing | No AI exists; selling vapor = refund/legal risk | pricing copy | neutral-to-+ | **Remove** the labels until AI is real (then re-add honestly) |
| 22 | **Vapor paid features** (CSV export, priority verification/support, SSO, multi-location, team perms) | Tier differentiation | None implemented; false advertising | pricing copy | + (trust) | **Delete** from pricing until built |
| 23 | **Stale third plan definition** (lib/stripe.ts PLANS) | Legacy config | Conflicts with the two live defs; nothing imports it | const | + (correctness) | **Delete** |
| 24 | **Excess API routes** (96; ~84% unreachable) | Speculative API surface | Cognitive + security + maintenance load on a pre-launch product | many routes | 0 | **Audit reachability; delete/flag** the dead ones |
| 25 | **SMS/Twilio + Slack notification channels** (as promised features) | Omnichannel | No-op without config; "perk via SMS" copy is a lie | channels lib + copy | + (honesty) | **Remove the promise**; keep email; add SMS only when funded by a real need |

## Totals & velocity gain
- **Removable now:** influencer (~3,400 LOC) + enterprise portal + agent fleet (~1,896 LOC) + dead queue (~472) + orphaned email (~800) + graph/embedding/matching/plugin/experiment libs (several thousand LOC) ≈ **another ~10–15K LOC and a large fraction of the 96 routes**, on top of #108's 90K.
- **Liabilities removed:** payout drain bug, FTC landmine, /agents false pitch, trust-theater surfaces, three conflicting plan defs.
- **Velocity gain:** a solo founder maintaining one audience, one loop, one architecture (the /dashboard app-router surface) instead of two parallel apps and four audiences. **Every hour not spent double-patching speculative surface is an hour on closing the loop and selling.**

> **The discipline:** if a surface doesn't serve a *paying local SMB completing the core loop*, it's cut or parked. Breadth was the disease the June-2 audit named; this plan is the cure, applied to the live product and not just the dead code.
