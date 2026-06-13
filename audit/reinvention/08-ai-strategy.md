# AI Strategy (Phase 8)

*Current state: NO real LLM anywhere in the dependency tree, while the product sells "AI insights / AI generations" and fabricates "Instagram Graph API" verification evidence from URL substrings. Step 1 of any AI strategy is making the claims true. Grounded in `delta-remediation.md §2`, `influencer-enterprise-agents.md §4.2`, `market-legal-ftc.md`, plus 2026 token economics.*

## 0. The honest-labeling migration (do this first)
Before building any AI, **stop calling non-AI "AI"**: remove "AI insights," "AI campaign generations," and the OpenAPI "AI-powered" tag until a real model backs them; relabel the verification engine's faked "Graph API" evidence. The company is exactly the software-layer the FTC targets (Rytr/Sitejabber) — *misdescribing* AI/compliance machinery is itself an enforcement vector. Truthful labeling is not optional; it's legal hygiene.

## 1. The AI opportunities, ranked by (ROI × low-cost × user-value)

| Rank | AI feature | What it does | Real 2026 cost/unit (est.) | User value | Effort | Margin risk at $39/mo | Verdict |
|---|---|---|---|---|---|---|---|
| **1** | **Proof verification (vision)** | A vision model confirms a screenshot/post is a real, live, **disclosed** post for the right business/action | ~$0.003–0.02 per check (Haiku/Sonnet vision, one image) | **Decisive** — it's the trust + legal core; without it you can't honestly certify a disclosed post exists | M | Low (cents; cap at plan quota) | **Ship first.** This is the AI product. Converts the audit's "verification stub" from a quality bug into the compliance moat. |
| **2** | **Campaign-copy generation** | Real LLM writes the ask, the perk framing, the customer-facing post suggestion, FTC-safe disclosure wording | ~$0.005–0.03 per generation (Haiku/Sonnet text) | High — replaces templates; genuinely better copy; makes "AI generations" honest | S–M | Low (gate per tier) | **Ship second.** Cheap, honest, demoable. |
| **3** | **Onboarding concierge** | Conversational setup: "What kind of business? → here's your campaign + poster" | ~$0.01–0.05 per onboarding | High — activation lift for non-technical owners | M | Low (once per signup) | **Ship third.** High activation ROI, trivial volume. |
| **4** | **Disclosure/compliance checker** | LLM/vision verifies `#ad` is present, prominent, in-video for video; flags sentiment-conditioning in campaign setup | bundled with #1 | High — automates the advertiser's monitoring duty | M | Low | **Bundle with #1.** Part of the moat. |
| **5** | **Results summarizer / ROI narrator** | Turns real loop data into a plain-English weekly "here's what your customers did" email | ~$0.002 per summary | Med-High — retention via insight | S | Low | **Build with the weekly results email** (needs real data first). |
| **6** | **Campaign-matching / best-action recommender** | Suggests which actions/platforms fit this business | ~$0.005 per rec | Med | S | Low | **Light version OK** (can be heuristic + LLM polish). |
| **7** | **Engagement/best-time prediction** | When to post / which perk converts | model + data | Low-Med (needs data) | M | Med | **Later** — only once there's real data; don't overbuild. |
| **8** | **Influencer discovery (AI)** | Match creators to briefs | — | Low (no creator side) | — | — | **Don't build** — the influencer side is cut. |
| **9** | **AI community management** | Auto-moderate/respond | — | Low | — | Med | **Don't build** — no community yet. |
| **10** | **Autonomous agent fleet** (existing 10) | Auto-run back office | can't run on serverless | none today | — | — | **Don't ship live.** Keep MCP as docs; revisit as internal automation post-launch only with durable state. |

## 2. The three to ship first (and why)
1. **Vision proof-verification** — the single most important AI build in the company. It's the trust mechanism, the legal prerequisite (you cannot enforce disclosure without verifying the post), and the defensible "compliance-certified UGC" story an AI-native investor would actually fund. Cost is cents; gate by plan quota.
2. **LLM campaign-copy generation** — makes the existing "AI generations" gate honest, demos beautifully to SMBs, near-zero cost.
3. **Onboarding concierge** — converts the strong-but-manual wizard into a conversational activation lift for non-technical owners; once-per-signup cost.

## 3. What to explicitly NOT build
- Engagement prediction, AI community management, AI influencer discovery — no data, no audience, or cut entirely.
- The autonomous agent fleet as a live product — architecturally impossible on serverless and strategically misaimed (sells to devs, not the ICP); the agent-as-*supply* framing literally describes the fraud the product must detect.
- Any "AI" that can't be priced under the $39 margin or that re-introduces fabricated outputs.

## 4. Margin guardrails (so AI doesn't break the 99% margin)
- Use **Claude Haiku** for high-volume, latency-tolerant calls (verification, copy) and **Sonnet** only where quality demands it; batch where possible.
- **Cap AI usage by plan quota** (verification checks/mo, generations/mo) — already the enforcement pattern; now it gates a *real* cost, which finally makes the quota an honest paywall.
- Worst case at scale: ~$0.02/verified post × (say) 30 posts/business/mo ≈ **$0.60/business/mo** — against $39 ARPU that's ~98%+ margin retained. AI is affordable here precisely because volume per business is low.
- Cache deterministic pieces (disclosure rules, templates); only spend tokens on the genuinely generative/perceptual step.

## 5. The strategic reframe
The product has been **claiming** AI to seem modern while the *actual* AI-shaped opportunity sat unbuilt: **certifying, at scale, that a disclosed customer post is real.** That is a perception problem (vision) + a compliance problem (FTC) + a trust problem (the whole product) collapsed into one model call. Build *that*, label everything else honestly, and Social Perks goes from "AI-washing risk" to "the AI that keeps local businesses out of $53K/violation trouble" — a defensible, fundable, genuinely-AI position.

> **One line:** Stop selling AI you don't have; build the one AI feature that is simultaneously your moat, your legal shield, and your trust mechanism — vision-based proof-of-disclosed-post verification — and bundle honest LLM copy + concierge around it.
