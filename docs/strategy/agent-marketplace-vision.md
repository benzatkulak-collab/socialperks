# Social Perks — The Operating System for Creator Commerce
## Strategic vision, honestly sequenced

*Prepared 2026-07-02. Status: DRAFT — research findings being integrated. Grounded in: live production state (money path went live today), the June 2026 audit corpus (`audit/`, `audit/reinvention/`), the repo's own git history, and a 4-agent research sweep (cold-start law, 2026 agentic-commerce rails, competitor whitespace, creator-side economics).*

---

## 0. The honest frame (read this first)

Three facts every strategic decision in this document must respect:

1. **This vision was already built here once — and it produced zero users.** PRs #90–#96 shipped an "agent-native platform": 10 autonomous agents, MCP docs, agent discovery surfaces, an exchange with buy/sell orders. The June audits found the agent fleet couldn't run on serverless, the influencer side was a facade (~3,400 LOC of dead components), and ~80% of the codebase was dead or speculative mass burying a real product. Most of it was deleted. The lesson is not "the vision is wrong" — it's that **a marketplace built before its participants is scenery**.

2. **The agent-facing bones already exist and are live.** Verified today at HEAD and in production: `POST /api/mcp` (200), `GET /api/v1/openapi` (200), `/llms.txt` (200), `AGENTS.md`, exchange routes, agent-enrollment endpoint. The API surface was never the gap. **The gap is liquidity: there is no money on the platform for any agent or creator to earn.**

3. **No one can make a frontier model "route its clients" here.** Claude/GPT sessions are isolated; model providers do not steer agents to partner platforms by default, and any strategy assuming that mechanism is built on sand. The achievable version of "agents default here" is: **discoverable** (MCP registries, llms.txt, SEO — largely shipped) + **usable end-to-end by a machine** (partially shipped) + **worth using** (real budgets, real payouts — not shipped, because there are zero participants). Agents go where money is. That makes the demand test — real businesses paying — not a competing priority but **Phase 0 of this exact vision**.

**The one-sentence strategy:** win the wedge where the business brings its own supply (its customers are the creators), let verified perk-earners accumulate into a creator graph, open cross-business discovery when the graph is dense enough, and only then expose the full agent transaction layer — each phase gated on hard liquidity metrics, not on ambition.

---

## 1. Why the wedge solves the cold-start problem (the structural insight)

Every failed influencer marketplace died the same way: launch two empty sides, spend to fill both, watch quality collapse or money run out. Social Perks' existing product contains the cold-start cheat code:

> **The business's own customers are the supply side.** A coffee shop that signs up brings its own creators (its regulars) with it. Single-player mode is complete: one business + its customers = a working loop with zero marketplace liquidity required.

This inverts the chicken-and-egg:
- Every paying business adds demand (perk budgets) **and** recruits supply (customers who post, verify, and redeem).
- Every verified redemption mints a **transaction-verified creator record** — a real reputation primitive (deliverable → proof → approval → payout), not a self-reported media kit.
- Customers who earn perks at 2+ businesses become the seed of the **cross-business network** ("supporters of Luna Café also earn at Iron Gym") — the compounding mechanic no loyalty or influencer platform has.
- Only *after* that graph exists does opening it to outside creators (human or agent-assisted) add value instead of noise.

**Implication:** the coffee-shop demand test is not a distraction from the marketplace vision. It is the only known-good entry ramp to it.

---

## 2. Answers to the eight key questions

**Q1. What makes Social Perks the obvious platform for AI agents to create accounts?**
In order of actual causal power: (1) **money that an agent can earn or deploy programmatically** — campaigns with real budgets, instant machine payouts; (2) **full-lifecycle machine operability** — discover → enroll → apply → submit proof → get approved → get paid, all via MCP/API with zero human bottleneck on the platform side; (3) **compliance as a service** — FTC 16 CFR 465 liability lands on whoever runs the campaign; a platform that makes non-compliant actions *structurally impossible* (already true here: incentivized-review actions are hard-blocked, disclosure auto-injected) removes the scariest legal risk for agent operators; (4) **agent-grade account primitives** — scoped API keys, spend caps, audit logs, human-approval checkpoints (partially built: API keys, audit-log, review gates exist); (5) discoverability (shipped). Note what's *not* on the list: model-provider favoritism — it doesn't exist as a mechanism.

**Q2. What convinces brands to spend here instead of elsewhere?**
Pre-scale: nothing "marketplace" — they come for the single-player tool (turn my customers into marketers, $10-25/mo, compliance handled). Post-scale: verified-outcome pricing. Because every deliverable on Social Perks is proof-verified and redemption-closed, brands buy **verified acts of advocacy**, not follower counts. That's a fundamentally better unit than any competitor sells, and it only exists because the wedge product verifies everything.

**Q3. What attracts creators before there are many brands?**
Don't recruit creators — *convert* them. Every customer who redeems a perk is already a creator with a verified earning record. Give them a wallet, a public earnings/reputation page (opt-in), and cross-business perk discovery. The minimum viable creator offer pre-liquidity is: "you already earned here; here's everywhere else you can earn."

**Q4. What attracts brands before there are many creators?**
Same answer inverted: the single-player SaaS is complete without any marketplace. Brands never experience an empty marketplace because the product they buy day-1 doesn't need one.

**Q5. How do we solve cold start?**
It's solved by construction (Q3/Q4): both sides are bootstrapped by the wedge product's own usage. The only cold-start problem that remains is the SaaS's own: **getting business #1–#50** — which is the live demand test (`gtm/demand-test-playbook.md`, `gtm/prospect-list.md`).

**Q6. Which features create real network effects?**
Ranked by compounding power: (1) cross-business perk recommendations at claim/redeem time (local density flywheel); (2) the transaction-verified reputation graph (more verified deliverables → better matching → higher completion rates → more budgets); (3) the "Powered by Social Perks" claim-page footer (every campaign markets the platform — already live and now indexable); (4) referral credits (built; disbursement deferred); (5) agent API adoption (each integrated agent operator brings many accounts). Everything else is feature, not network.

**Q7. Which trust & safety systems are essential?**
(1) Business identity via Stripe (KYC comes free with payments — live today); (2) creator verification via OAuth account-linking (routes exist, integrations pending); (3) proof verification: current liveness-check + one-click human approval is honest and sufficient pre-scale; upgrade to platform-API/vision verification only when volume demands it; (4) escrowed/held payouts with dispute flow before any cash (not perk) value moves; (5) the FTC compliance engine — already structural, already test-locked, and *more* valuable in an agent era (agents need guardrails their operators can trust); (6) for AI creators: mandatory AI-disclosure labeling — undisclosed synthetic endorsement is both an FTC violation and a trust-killer. **Rule: no anonymous money movement, ever; reputation only from verified transactions, never self-reported.**

**Q8. How does AI automate the work while humans keep control?**
The pattern is already in the codebase: machine does the legwork (checks, drafts, matching, reports), human owns the irreversible click (approve perk, approve payout, launch campaign). Extend the same pattern to agents-as-users: agents draft/apply/track autonomously within scoped permissions and spend caps; account owners approve at defined checkpoints; everything audit-logged. This is also the honest-marketing position: "AI does the work, you keep the pen."

---

## 3. The phased roadmap (gated, not dated)

Phases unlock on **metrics**, not months. Building a later phase before its gate is the exact failure mode already committed once in this repo.

### Phase 0 — NOW: Prove one business pays (gate to everything else)
- Run the 21-day demand test: 48 prospects listed, outreach templates ready, activation funnel instrumented end-to-end, money path live (verified today).
- **Gate to Phase 1: ≥5 paying businesses AND ≥3 reaching a real redemption within 7 days.**
- Build in this phase: **nothing new.** Fix only what the pilots hit.

### Phase 1 — 5→50 businesses: Deepen the single-player wedge (weeks→months)
- Onboarding polish, weekly results digest (shipped, dark behind cron), referral disbursement (code path exists; turn on with real Stripe credits), QR/poster flow, Square POS integration (distribution + redemption data).
- Creator wallet grows quietly: every redemption builds the graph.
- **Gate to Phase 2: ~50 paying businesses, ≥2 metros with ≥10 each, churn <5%/mo, ≥500 unique verified perk-earners.**

### Phase 2 — Open the network: cross-business + creator profiles (months 4–9 post-gate)
- Cross-perk recommendations at claim time; opt-in public creator profiles w/ verified earnings; "earn nearby" discovery; multi-shop punch-card mechanics.
- First marketplace revenue: keep SaaS flat, take **0%** on perks (they're the flywheel), introduce paid *placement* (a business paying to appear in "earn nearby") only after recommendations demonstrably drive redemptions.
- **Gate to Phase 3: ≥25% of new redemptions attributable to cross-business discovery; ≥2k verified creators.**

### Phase 3 — The agent layer: open the machine economy (only now)
- Formalize what exists: MCP server → full lifecycle coverage; scoped agent keys with spend caps + human checkpoints; agent-attribution on every action; instant programmatic payouts (Stripe; evaluate x402/AP2-class rails per research findings when volume justifies).
- Invite agent operators (the honest version of "default platform"): publish to MCP registries, agent-framework example repos, revenue-share for integrated operators.
- Revenue: agent/API tier + transaction take on cash (not perk) payouts, 8–12%, undercutting incumbent 15–30% rakes.
- **Gate to Phase 4: ≥100 external agent-initiated transactions/month with <2% dispute rate.**

### Phase 4 — Category leadership: verified-outcome ad exchange
- Brands buy guaranteed verified-advocacy outcomes; escrow + performance pricing; enterprise/white-label; the reputation graph as the moat.
- This is the "OS for creator commerce" — reached by climbing, not by declaring.

---

## 4. Revenue model evolution

| Phase | Primary revenue | Take rate | Rationale |
|---|---|---|---|
| 0–1 | SaaS $10/$25 (+$249 ent.) | 0% on perks | Wedge adoption; perks are the flywheel, never taxed |
| 2 | SaaS + sponsored placement | 0% on perks | Density monetization without taxing the loop |
| 3 | + API/agent tier + cash-payout take | 8–12% cash only | Undercut 15–30% incumbent rakes; agents are margin-sensitive |
| 4 | + escrowed outcome campaigns, enterprise | 10–15% managed | Verified outcomes justify premium vs impression-sellers |

Pricing philosophy: **the loop stays cheap forever; the network and the guarantees are what monetize.** (Deferred per audit: reprice SaaS upward only after demand-test data.)

## 5. Competitive positioning (research-informed summary)

*(Full findings integrated below from the research sweep; audit-era analysis in `audit/reinvention/02-competitive-analysis.md` remains directionally valid: review-SaaS owns SMBs but only does reviews; ambassador platforms run this exact loop at 10–60× the price for mid-market DTC; POS loyalty owns redemption but only rewards purchases.)*

The one position no funded incumbent occupies and a solo founder can: **self-serve, compliance-structural, customer-as-creator advocacy for local business — with a machine-operable transaction layer growing underneath it.** Incumbents can't follow without cannibalizing sales-led pricing (Brandbassador/Roster), rebuilding around verification they don't have (Collabstr/Billo sell gigs, not verified outcomes), or entering SMB price points their CAC can't survive.

## 6. What we will NOT build (and when that changes)

| Not building | Until |
|---|---|
| Open creator marketplace UI | Phase 2 gate |
| Agent negotiation/apply flows | Phase 3 gate |
| Escrow/contracts | First cash-payout campaign |
| AI-creator supply side | Research verdict + Phase 3; AI-disclosure labeling mandatory from day 1 |
| Media kits, talent tools, recruiting | Pulled by paying demand, or never |
| A second vertical | 50-business gate or coffee's hard failure |

---

## 7. The agent-lifecycle gap map (code-verified at HEAD, 2026-07-02)

"Can an autonomous agent complete an entire campaign?" — audited against the actual code, not aspiration.

### What already exists and is live in production
| Capability | Evidence | State |
|---|---|---|
| Discovery metadata | `/llms.txt` 200, `AGENTS.md`, `/.well-known/ai-plugin.json`, robots AI-crawler allowlist | ✅ live |
| OpenAPI spec | `GET /api/v1/openapi` 200 | ✅ live |
| MCP server | `POST /api/mcp` 200 — JSON-RPC 2.0, 10 tools | ✅ live |
| **Per-tool cost models** | `ToolCost` = `free` / `plan` (usage bucket) / `cash` (min/max cents) inlined in tool descriptions so agents reason about spend *before* invoking | ✅ live — genuinely rare |
| Rate-limit metadata | MCP layer captures downstream rate-limit headers + duration into the response envelope | ✅ live |
| **Agent OAuth (delegated auth)** | `agent-auth/approve` + `agent-auth/token`: agent requests scopes → signed-in human clicks consent → 60s auth code → exchanged for a **scoped API key**; API keys cannot mint keys | ✅ built — the exact primitive the agentic-auth world is converging on |
| Agent attribution | `ApiKeyRecord.agentName`, per-key permissions, audit log on all sensitive actions | ✅ built |
| Campaign lifecycle via MCP | `createCampaign`, `listCampaigns`, `submitProof`, `reviewSubmission`, `listSubmissions`, `getCampaignStats` + reference tools (`getPricing`, `listActions`, `getBenchmarks`, `searchInfluencers`) | ✅ built |
| Compliance guardrails | Incentivized-review actions hard-blocked at launch (422) + template filter, test-locked; FTC disclosure auto-injected | ✅ live — structural, not policy |
| Real-time events | SSE stream `/api/v1/events` | ✅ built (dashboard-grade, not integration-grade) |
| Payout plumbing | `payouts/` routes + Stripe webhook | ✅ built (human-paced) |

**Verdict:** after a one-time human consent (correct by design — a human owns the account) and a human-entered payment method, an agent can already run the operational loop end-to-end: create campaign → receive submissions → review/approve → award perks → read stats. The bones are better than any incumbent's public story (see §5). What's missing is not scaffolding — it's the floors people live on.

### The seven real gaps (ranked by how hard they block the vision)
1. **No public opportunities feed.** `exchange/opportunities` was deleted in the June cleanup (404 live today) — there is no machine-readable "here is money you can earn / campaigns you can join" surface. This is *the* surface an agent polls to decide whether the platform is worth its time. Worse: `llms.txt`, `AGENTS.md`, and `robots.txt` still advertise the dead routes — **stale metadata is anti-discoverability** (an agent that hits two 404s writes the platform off).
2. **No agentic payment acceptance.** Upgrading to a paid plan (which gates API access) requires Stripe Checkout in a browser with a human typing a card. An agent cannot autonomously bring budget. (Rails to evaluate per research: Stripe agentic payments / issued agent cards, x402, AP2.)
3. **No programmatic payouts.** Perks (redemption codes) work machine-side, but cash payouts are human-paced; an agent-operated creator can't receive earnings into an account programmatically (needs Stripe Connect Express-class onboarding).
4. **No outbound webhooks.** Agents must poll; `submission.created` / `submission.approved` / `perk.redeemed` webhooks (signed, with the dedup machinery that already exists inbound) are the integration norm.
5. **No sandbox.** `sp_test_` keys exist cosmetically but there's no isolated test environment where a developer/agent can run the whole loop with fake money. Every serious platform-of-record has one.
6. **In-memory-authoritative state.** API keys (and some stores) are in-memory-canonical with best-effort DB write-through. Two agent requests hitting two serverless instances can disagree. Fine for a demo; wrong for a transaction platform. Direction: DB-authoritative for all agent-touched state.
7. **No spend caps / budget ceilings per key.** The permission system scopes *actions* but not *amounts*. Agent operators will demand "this key can spend at most $X/month" before pointing money at anyone.

### Answers to the remaining design questions (not covered in §2)

**Public vs authenticated data:** PUBLIC (no key): pricing catalog, action library, benchmarks, aggregate platform stats, the opportunities feed (campaign title, perk value, requirements, claim URL), opt-in creator reputation summaries (verified deliverable counts, completion rate — never PII). AUTHENTICATED: submission contents, proof URLs, budgets, member lists, review actions, anything PII. NEVER exposed: contact info, pre-approval proof, payment details. Principle: *an agent should be able to fully evaluate the opportunity landscape without a key, and need a key the moment it acts.*

**Minimum onboarding:** Human: 4-field signup → Stripe Checkout (exists; ~4 min). Agent: receive consent URL → human clicks Approve once → scoped key via code exchange (exists!). The design target is already met on paper; the work is making the consent flow discoverable and first-class in docs, and adding `plan=`-intent to the consent page so upgrade friction happens at most once.

**What makes agents *return*:** highest expected value per call — which decomposes into (a) liquidity (real campaigns paying real value — Phase 0/1's job), (b) predictability (cost models ✅, rate-limit transparency ✅, structured errors — partial), (c) verified outcome data to learn from (`getCampaignStats` ✅, per-vertical benchmarks ✅), (d) compliance safety (✅ structural), (e) uptime/consistency (needs gap #6). Agents are ruthless repeat-purchasers: they return to whatever maximized success probability last time. There is no brand loyalty to win — only a scoreboard to top.

**Where the current architecture is actually wrong (first-principles check, per the brief):**
- The deleted "exchange" order-book framing was the correct thing to delete — influencer work is not a fungible order book; the right marketplace primitive is **opportunities + applications + verified deliverables**.
- In-memory-authoritative stores (gap #6) contradict a multi-instance transaction platform.
- SSE-only eventing is dashboard-think; integrations need signed webhooks.
- API access gated at Pro ($25) is right for revenue, but a **free sandbox tier** must exist or the developer funnel dies at hello.
- Everything else — cost-model MCP, agent OAuth, compliance-as-code, human-checkpoint review — is architecturally *ahead* of the market and should be doubled down on, not redesigned.

---

## 8. Prioritized roadmap (every item rated)

Levers: **D**=agent discoverability, **U**=agent usability, **L**=marketplace liquidity, **B**=business acquisition, **C**=creator acquisition, **M**=long-term defensibility (moat).

### Now (compatible with Phase 0 — days, no distraction from the demand test)
| # | Item | Impact | Complexity | Time | Levers | Why it compounds |
|---|---|---|---|---|---|---|
| 1 | **Fix stale agent metadata** — llms.txt/AGENTS.md/robots/CLAUDE.md reference deleted routes ("35 routes", exchange/*) | Med | Trivial | ~2h | D | An agent that hits a 404 doesn't retry next quarter. Metadata integrity IS discoverability. |
| 2 | **Public opportunities feed v1** — `GET /api/v1/opportunities`: live public campaigns (perk value, action, requirements, claim URL), cached, keyless | High | Low (data exists via campaign store) | 1–2d | D, U, L, C | The single surface that turns "a SaaS with an API" into "a marketplace an agent can evaluate." Every future phase reads from it. |
| 3 | **Machine-readable errors + idempotency keys** on all POSTs (problem+json, `Idempotency-Key` honored) | Med | Low | 2–3d | U | Agents retry; double-created campaigns/duplicate reviews poison trust exactly once. |

### Phase 1 gate passed (5+ paying businesses)
| # | Item | Impact | Complexity | Time | Levers | Why |
|---|---|---|---|---|---|---|
| 4 | **Outbound signed webhooks** (submission/approval/redemption events; reuse inbound HMAC + dedup machinery) | High | Med | ~1wk | U, M | Kills polling; the moment an operator wires a webhook they're integrated — integration is retention. |
| 5 | **Sandbox mode** — `sp_test_` keys against isolated data, full loop with fake money | High | Med | 1–2wk | U, D | Developer funnel: try → integrate → bring accounts. Nobody points money at an API they couldn't rehearse. |
| 6 | **DB-authoritative agent state** (api-keys first, then all agent-touched stores) | High (silent-failure class) | Med | ~1wk | U, M | Consistency is table stakes for autonomous transactions across serverless instances. |
| 7 | **Agent quickstart** — "an agent runs a full campaign in 10 calls" doc + example repo + MCP-registry listings | Med | Low | 2–3d | D | The llms.txt of 2026 is a working example an agent can imitate. |

### Phase 2 gate passed (~50 businesses, creator graph forming)
| # | Item | Impact | Complexity | Time | Levers | Why |
|---|---|---|---|---|---|---|
| 8 | **Reputation API** — opt-in, transaction-verified creator + business reliability reads | High | Med | 2wk | L, C, M | Reputation minted from verified deliverables is the dataset no incumbent has and no entrant can backfill. THE moat. |
| 9 | **Cross-business discovery API** ("earn nearby") + creator wallet as first-class product | High | Med | 2–3wk | L, C, M | The compounding local network effect, now machine-readable. |
| 10 | **Spend-capped agent keys + approval-checkpoint API** | Med-High | Med | 1wk | U, M | The control primitive operators demand before delegating budgets. |

### Phase 3 gate passed (agent layer opens)
| # | Item | Impact | Complexity | Time | Levers | Why |
|---|---|---|---|---|---|---|
| 11 | **Agentic payment acceptance** (per research: Stripe agentic rails first; x402/AP2 when volume justifies) | High | High | 3–4wk | U, L, B | Removes the last human step between an agent and bringing budget. First-mover among influencer platforms. |
| 12 | **Programmatic payouts** (Stripe Connect Express onboarding for creators/operators) | High | High | 3–4wk | C, L | Money-out is why agent-operated supply shows up at all. |
| 13 | **Outcome-escrow campaigns** (funds held → released on verified deliverables) | High | High | 4wk+ | B, M | "Buy verified advocacy outcomes" — the unit nobody else can sell, priced on the verification layer built in Phases 0–2. |

**The through-line:** items 1–3 cost under a week combined and make the platform honest to machines *today*; everything heavier is gated behind the same liquidity milestones as §3 — because an agent-perfect API on an empty marketplace changes nothing, while a liquid marketplace with a decent API gets integrated *for* you.

---

## 9. Research evidence (4-agent web sweep, 2026-07-02) — and what it changes

### 9.1 Cold-start law: the record is unambiguous
- **Open self-serve influencer matching fails even with infinite distribution.** When YouTube killed FameBit self-service (2020), it disclosed self-serve was **4% of creator payouts**; creators earned ~30× more on managed deals (TechCrunch). IZEA — the 20-year public-company natural experiment — did **$31.2M FY2025, roughly breakeven**, surviving on managed services, not marketplace rake. TapInfluence sold for **$7.6M with 87K registered creators**; TRIBE stalled at a ~$35M cap after 9 years and 100K+ creators. **Creator headcount ≠ liquidity, ever.**
- **The market is permanently demand-constrained**: ~127M people self-identify as influencers; average brand spend per collab is *falling* (~$202, St. Louis Fed 2026). Subsidizing the creator side is spending on the infinite side.
- **The five laws that held across winners** (OpenTable, Substack, Whatnot, Faire, Airbnb, Collabstr): (1) single-player tool first; (2) atomic network — one niche, one geo (Whatnot did only Funko Pops for a year); (3) seed the scarce side = businesses; (4) near-zero rake early, and **never tax relationships a participant brought themselves** (Faire Direct: 0% forever on brought retailers vs 15% on discovered ones — the exact template for perks vs future discovery); (5) liquidity is hand-made (Airbnb's photographers → our concierge campaign setup).
- **BYOS verdict:** bring-your-own-supply de-risks cold start better than any alternative on record — but no BYOS advocacy platform alone became marketplace-scale (Brandbassador quietly merged away). The marketplace layer is earned **only if** single-player customers start demanding more creators than their own customers provide. That is the Phase 2 gate's real meaning.
- **The only liquidity metric that matters now:** paying businesses launching a **second campaign within 30 days**, and redemptions per campaign. Vanity supply counts killed everyone who tracked them.
- **Proven solo-founder demand channel in this category:** Collabstr — 8-figure revenue, ~14 people, bootstrapped — won via programmatic long-tail transactional SEO. Our `/answers` surface is directionally right; point it at transactional intent ("reward customers for Instagram posts coffee shop").

### 9.2 Agent rails: rent the commodity, build the vertical
- **Payments + spend caps are now rentable, not buildable:** Stripe's Agentic Commerce Suite (Shared Payment Tokens scoped by seller/time/amount), Issuing-for-Agents (single-use virtual cards, programmable caps), Order Intents, Link agent wallet; Google AP2's signed Intent/Cart Mandates (60+ orgs); x402 (~150M+ machine transactions, but $0.001–$0.01/call). **Roadmap item #11 is hereby downgraded from "build" (High complexity) to "integrate Stripe agentic rails" (Med).**
- **The sobering benchmark:** OpenAI's Instant Checkout **flopped** — ~30 live merchants vs the million promised, ~3× *worse* conversion than click-through (Walmart's own measurement), pivoted to route-to-merchant by Mar 2026. **Agent-readiness is positioning + AEO/SEO today, not a demand source.** Nothing about the agent layer justifies delaying the demand test by one day.
- **Agents earning real money exist only in subsidized crypto niches** (Virtuals' "$479M aGDP" runs on ~$1M/mo subsidies) — and **no verified autonomous agent-run creator account earns meaningful money on any mainstream platform.** Platform policy actively blocks it (TikTok bars virtual influencers from Creator Rewards; YouTube demonetizes automated pipelines).
- **The realistic near-term agent participant is the business-side agent** — an owner's AI creating campaigns, checking pricing, reviewing submissions through our existing MCP. Optimize for that buyer.
- **Of the 7 primitives an agent marketplace needs, 4 are commodities to rent** (discovery registries, payment execution, edge agent-identity via Web Bot Auth, delegated-OAuth plumbing) **and 3 are the moat to build** — vertical mandate semantics (campaign brief = Intent Mandate; approved submission = Cart Mandate), outcome-keyed escrow/settlement, and vertical trust/reputation. Our existing stack maps almost 1:1 onto the differentiating three (event sourcing = audit trail; verification + compliance engines = trust layer). **Free move this week:** list the live MCP server in the official MCP Registry (registry.modelcontextprotocol.io, ~2,000 servers) + publish a `.well-known` server card.

### 9.3 Competitive whitespace: the intersection is empty
- Enterprise platforms are $16K–$60K/yr, sales-led, 12-month lock-ins (CreatorIQ ~$30K+, Later Influence $28.5K, Grin ~$25K, Upfluence ~$16K); the recorded pain is **commercial** (opaque pricing, lock-in), not features. Ambassador/advocacy — our closest model — floors at **$599/mo** (Roster), nothing built for local brick-and-mortar. SMB/UGC marketplaces run 8–15% takes with chronic payout-trust complaints. Platform-native marketplaces (TikTok One, Meta, YouTube) are consolidating but serve paid creator deals, not customer advocacy.
- **Every major ads platform shipped an ads MCP in 2026 (TikTok, Meta, Google) — nobody extended agent rails to influencer *deals*.** Incumbent APIs are gated behind $16K+ contracts; no incumbent ships an MCP server, llms.txt, or public agent enrollment. Social Perks is plausibly the only place a third-party agent can discover→enroll→transact today.
- **Position to avoid:** AI-native creator advertising for enterprise — Agentio owns it ($40M Series B, $340M valuation, Uber/DoorDash). Differentiate on OPEN (anyone's agent) + SMB advocacy they structurally ignore.
- **Compliance is the unoccupied moat:** FTC penalties $53,088/violation, June-2025 proposals expanding scope — incumbents sell scan-and-flag to enterprises; SMB marketplaces expose users raw. Nobody else makes non-compliant posts *structurally unable to earn*.
- **The caution flag:** the local advocacy niche's only focused player (Mustard.love, restaurants, hosted-influencer model) repriced downward twice ($799→$399→$299). The whitespace below $100/mo may exist because support/churn economics killed visitors — **only a genuinely zero-touch product-led loop survives there**, which is why activation/self-serve quality decides this, not features.
- Verified positioning sentence (each clause fails ≥2 incumbents): *"The open, compliance-enforced perks marketplace where local businesses turn their own customers into advocates — built so both humans and AI agents can transact."*

### 9.4 Creator side: instant rewards, verified humans, no stars
- **Payout speed is the #1 creator retention lever**: 56% of creators report late payments; ~40% decline partnerships over payment terms; instant payout is a marketed differentiator. Our perks deliver instantly — make **"rewarded instantly, never net-60"** a headline promise and a tracked SLA.
- **Do not ship 5-star ratings.** They inflate to meaninglessness (95% of Airbnb listings at 4.5–5; 99.3% eBay positive). Gate reputation on **verified completed transactions**, publish component outcome metrics (approved-submission rate, on-time, dispute, repeat-collab), keep granular feedback private (Upwork JSS pattern). Every reputation point = a verified, FTC-compliant transaction — the dataset no incumbent can backfill.
- **OAuth account linking before any follower-tier bonus** — self-reported counts are non-credible in 2026 (Phyllo-pattern verification is the norm).
- **AI-creator supply side: resolved — it's a liability, not a market.** An AI persona endorsing a business it never visited is a per-se fake testimonial under 16 CFR 465; TikTok bans virtual influencers from Creator Rewards; YouTube demonetizes synthetic pipelines. For a compliance-by-design company, **structurally excluding synthetic endorsers is the differentiator: "provably human, provably a real customer."** (AI *ad creative* with licensed likenesses, and AI *demand-side* agents, remain legitimate — the constraint is on synthetic endorsers only.)
- Pre-liquidity creator offer that historically works (all four required): free SEO-indexable profile with verified stats → instant reward delivery → creator-set rates when cash arrives → zero creator-side fees until liquidity exists.

### 9.5 Amendments to §3–§8 forced by the evidence
1. §8 item 11: **rent Stripe agentic rails** instead of building payment acceptance (complexity High→Med).
2. §8 "Now" tier gains a fourth near-free item: **MCP Registry listing + `.well-known` server card** (D; ~half a day).
3. §6 table: "AI-creator supply side" resolves from *"research verdict pending"* to **excluded by design** — synthetic endorsers are structurally blocked and marketed as such; AI ad-creative is a separate, clearly-labeled 2027 option at most.
4. Reputation (item 8) design constraint: component outcome metrics only, no star ratings, private granular feedback.
5. Phase-1 activation metric formalized: **second campaign within 30 days** joins first-redemption-within-7-days as the numbers that decide everything.
6. Rake policy hardened per Faire Direct: perks earned by a business's own customers are **0% forever, by policy** — rake only future *discovered* relationships.
7. Expectation-setting: the agent layer is **positioning and optionality** on today's evidence (OpenAI's checkout flop; no agent-deal revenue anywhere) — it earns real investment only at the Phase 3 gate.

*Primary sources: TechCrunch (FameBit), IZEA FY2025 filings, SEC/BusinessWire (TapInfluence), St. Louis Fed "Labor Market for Influencers" (2026), Casey Winters, Lenny's Newsletter marketplace series, Gurley "A Rake Too Far", Faire Direct policy, stripe.com/blog (Agentic Commerce Suite, Sessions 2026), cloud.google.com (AP2), blog.cloudflare.com (x402, Web Bot Auth), CNBC/digitalcommerce360 (Instant Checkout), registry.modelcontextprotocol.io, G2/Trustpilot/pricing pages for CreatorIQ/Later/Grin/Upfluence/Roster/Brandbassador/Collabstr/JoinBrands/Insense/Billo/Mustard.love, TechCrunch/PRNewswire (Agentio), FTC 16 CFR 465 materials, Tipalti/Gigapay payment surveys, Zervas et al. (Airbnb reputation), NFX (Fiverr), Early Stage Journal (Collabstr).*
