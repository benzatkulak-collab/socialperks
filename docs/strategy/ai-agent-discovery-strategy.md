# AI Agent Discovery & Adoption Strategy

> How Social Perks becomes a default destination that AI agents naturally discover, understand, trust, and choose — without marketing *to* agents.
>
> Grounded in a full audit of what Social Perks already exposes to machines (as of the current tree) and research across the 2026 agent-discovery landscape (MCP registries, ChatGPT/Claude directories, answer-engine citation, agentic-commerce rails). Prepared for the founder.

---

## 0. The one-paragraph thesis

**Social Perks does not have an agent-*building* problem. It has an agent-*integrity* problem.** It already ships more agent infrastructure than ~99% of SMB SaaS: a real JSON-RPC MCP server at `/api/mcp` with 10 typed tools and a per-call cost meter, an OpenAPI 3.1 spec, an agent OAuth flow, a `WebAPI` JSON-LD node, `llms.txt`, `AGENTS.md`, a TypeScript SDK, and an agent sandbox. But those surfaces currently *contradict reality* — phantom `/exchange/*` endpoints that 404 on an agent's first call, an `npm` SDK advertised as installable that cannot install, a "live registry entry" that was never published, two divergent `ai-plugin.json` manifests, and "107 actions" vs "125" drift. **For a human that's a stale doc; for an agent it is permanent de-selection** — agents don't file bugs, they silently pick a competitor and never come back. So the strategy is, in order: **(1) make every machine-readable claim true, (2) get *actually listed* where agents pick tools (the MCP Registry + Claude/ChatGPT directories) under a verified identity, and (3) weaponize the two things no competitor has — a machine-callable *compliance oracle* and agent-native *payment resolution* — so an agent that finds Social Perks keeps choosing it.** De-prioritize `llms.txt` polishing; the citation wins are JSON-LD + entity resolution + registry presence.

---

## 1. How AI agents actually discover and choose tools in 2026

Discovery runs on a **two-tier stack**, plus a parallel **citation channel**. You must win all three.

### Tier 1 — The canonical index (machine namespace)
- **The official MCP Registry** (`registry.modelcontextprotocol.io`), community-owned, backed by Anthropic/GitHub/Microsoft/PulseMCP (MCP was donated to the new Agentic AI Foundation). ~9,650 servers by May 2026; the broader indexed ecosystem (official + Glama + Smithery + mcp.so + PulseMCP) is ~73.8k servers. It uses **GitHub/DNS-verified reverse-DNS namespaces** (e.g. `com.socialperks/perks` or `io.github.<org>/socialperks`) — verification *is* a free provenance/trust signal.
- Secondary catalogs/aggregators developers and agents browse: **Smithery, Glama, mcp.so, PulseMCP, mcpservers.org, `wong2/awesome-mcp-servers`.**

### Tier 2 — The end-user "shelves" (where an agent actually picks)
- **Claude Connectors Directory** — self-serve *manual review*; acceptance is itself the trust signal. Hard gates: **OAuth 2.0 + PKCE (S256)** (no bearer-token pasting), every tool has a ≤64-char human-readable title and **exactly one** read/write safety annotation, reads and writes are **separate tools** (no `do_everything(action)` mega-tool), a real privacy policy, non-promotional tool descriptions.
- **ChatGPT App Directory** — opened to third-party submissions **Dec 17 2025** (Apps SDK, built on MCP); requires business/identity verification; MCP write support rolling out to Business/Enterprise.
- **Framework toolkits** — Stripe's template: an official MCP server *plus* an "agent toolkit" that plugs into OpenAI Agents SDK, LangChain, CrewAI, Vercel AI SDK.

### Parallel channel — Answer-engine citation (GEO)
- **~12–18% of English informational queries** already route through AI search (Q1 2026). Engines **expand a query into sub-questions, retrieve the cleanest self-contained *chunk*, and stitch an answer** — it's a retrieval game, not a ranking game. To be cited you must be *the most quotable chunk* for a sub-question.
- Engines diverge: **Perplexity** cites heavily (~13% of responses), recency-obsessed; **ChatGPT search** dominates usage (~70%) but cites rarely (~0.6%) and rewards comprehensive, entity-clear sources; **Google AI Overviews** grounds in the Knowledge Graph and refuses `llms.txt`.

### The uncomfortable truth about `llms.txt`
- **~10% adoption; ~97% of `llms.txt` files received *zero* AI-bot requests** (Ahrefs, May 2026); across 500M+ AI-bot visits only ~408 hit `/llms.txt`. **Google publicly refuses to use it** (compared it to the dead `keywords` meta tag). It *is* read by IDE/coding agents (Cursor, Claude Code, Copilot, Cline, Aider). **Verdict: keep it, stop investing in it as a discovery lever.**

---

## 2. Where Social Perks stands today (audit)

### Genuinely strong — keep and protect
| Surface | Evidence | Note |
|---|---|---|
| AI-crawler allow-list | `src/app/robots.ts` | 13 AI agents named + agent API paths allowed. Best-practice. |
| **Real MCP server** | `src/app/api/mcp/route.ts` | 10 typed tools, JSON-RPC, per-tool cost model + `_meta` envelope with `durationMs`/`rateLimit`. Genuinely agent-native. |
| OpenAPI 3.1 | `src/app/api/v1/openapi/route.ts` | Proper security schemes + envelopes, but partial/drifting (see below). |
| JSON-LD incl. `WebAPI` node | `src/app/layout.tsx` | `SoftwareApplication`, `WebSite+SearchAction`, `Organization` w/ `knowsAbout`, `WebAPI`→`AGENTS.md`/openapi. XSS-safe. |
| Agent OAuth key issuance | `src/app/api/v1/agent-auth/token/route.ts` | Consent page + single-use code + RFC-6749-shaped token. Real. |
| Uniform envelope + `X-Request-Id` | `src/app/api/v1/_shared.ts` | Typed error codes, request tracing on every response. |
| Reference JSON APIs | `pricing`, `actions`, `benchmarks`, `legal`, `recommendations` | "Return the full catalog on a bare GET" convention — an agent walking the API never hits a 400. Strongest part. |
| Agent sandbox + docs | `/agent/test`, `/docs/mcp`, `llm-context`, `feed.json` | Good human+machine on-ramps. |

### The trust debt — every item here actively *reduces* AI adoption
1. **Phantom `/exchange/*` endpoints** in OpenAPI + `AGENTS.md` + the SDK — routes that don't exist. An agent's first "browse open campaigns" call **404s**. Single biggest trust leak.
2. **SDK advertised as installable but is not** — `packages/sdk` is `private:true`, `UNLICENSED`, `main`→raw TS, no `dist`. `npm install @social-perks/sdk` fails.
3. **"Live registry entry" claimed, never published** — `llms.txt` cites a registry URL; there is **no `server.json`** in the repo. Declaration ≠ discovery.
4. **Two divergent `ai-plugin.json`** — static `public/` (correct) vs a route handler with a placeholder `agents@socialperks.example.com` and no OAuth/MCP block. Coin-flip which resolves.
5. **Count/tool/param drift** — MCP says "107 actions", everything else "125"; `AGENTS.md`/`llm-context` list 5 MCP tools, server has 10; MCP `getBenchmarks` sends `industry`, route reads `businessType` (filter silently dropped).
6. **`SoftwareApplication` price hardcoded `"0"`; `/pricing` has zero Product/Offer schema** — agents can't answer "how much does it cost" and guess or omit SP.
7. **Empty `sameAs` / no entity graph** — the brand isn't resolvable, so AI paraphrases SP's facts *without attribution*.
8. **Deprecated `ai-plugin.json` treated as first-class** (ChatGPT-plugins format, dead since 2024).
9. **`docs/mcp.md` wrong key prefix** (`sk_live_` vs real `sp_live_`, 3×).
10. **Purpose-built agent endpoints hidden** (`/api/llm-context`, `/api/feed.json`, `/api/v1/stats/public` not in the robots allow-list → blocked from general crawlers).

---

## 3. Ranked AI trust signals (what makes an agent *re-choose* you)

From most to least important for AI adoption:

1. **Honest, machine-readable capability discovery** — tool/param descriptions that match real behavior. *The single biggest lever.* (SP is violating this today via drift/phantoms.)
2. **First-call success** — public reference data, no auth wall to *discover*, no 404 on a documented path.
3. **Idempotency + retry-safety on writes** — agents retry on timeout; a double-create permanently down-weights the tool.
4. **Read/write separation + explicit safety annotations & scopes** — required by Claude's review; lets a model reason about safety.
5. **Self-serve / test-mode onboarding** — no human-in-the-loop or sales call to get *any* key.
6. **Typed, actionable JSON errors with stable codes** (not HTML/opaque 500s) — recoverability.
7. **Cost/rate transparency** — SP's `_meta.cost` (free/plan/cash) + rate-limit headers is a genuine differentiator few tools have.
8. **Stable URLs + semantic versioning** — never break `/api/v1` in place.
9. **Entity resolution + reputation/citations** — `sameAs`, Knowledge Graph/Wikidata, being cited by answer engines.
10. **Verified identity** — DNS/business verification in registries & directories.
11. **Uptime/latency + a machine-readable status/changelog.**
12. **Open-source examples + a working SDK.**

---

## 4. Top 10 mistakes that would *reduce* AI discoverability

1. **Letting machine facts drift from reality** (phantom endpoints, 107-vs-125, unpublished-but-advertised SDK/registry). *This is SP's current #1 risk.*
2. **Over-investing in `llms.txt`** as if it were a ranking/answer-engine signal (Google ignores it; 97% get zero AI traffic).
3. **Non-idempotent writes / no advertised `Idempotency-Key`** on `createCampaign`/`submitProof`/`reviewSubmission`.
4. **A `do_everything(action)` mega-tool mixing read & write** — hard-rejected by Claude's directory; agents can't reason about safety.
5. **Requiring a human/sales call for *any* key** — no self-serve/test path = agents route around you.
6. **Dead-ending an agent at a paywall** with no machine-actionable payment path in the error body.
7. **Fabricated stats / fake testimonials / fake "live activity"** — answer engines de-rank unverifiable claims *and* it corrodes SP's compliance-trust moat.
8. **Blocking AI crawlers** (a careless `robots`/middleware change removing GPTBot/ClaudeBot/PerplexityBot) or regressing content to **client-side-only rendering** (invisible to crawlers).
9. **Bearer-token pasting instead of OAuth 2.0 + PKCE**, or a missing privacy policy — halts Claude directory review.
10. **Promotional tone in tool descriptions / burying the answer below marketing prose** — reduces AI citation ~26% and fails connector review.

---

## 5. Top 10 technical features to build first

1. **A single, remote, streamable-HTTP MCP server** as the canonical agent entry point (consolidate `/api/mcp`), with reads and writes as separate, outcome-named tools.
2. **`server.json`** committed to the repo + published to the official MCP Registry under a **DNS-verified** namespace.
3. **`Idempotency-Key`** support on every write tool/POST (MCP inputSchema + OpenAPI + route middleware).
4. **A machine-actionable payment challenge** inside `PLAN_LIMIT_EXCEEDED` (and any paywalled error): a structured `payment_required` object → Stripe checkout / Shared Payment Token.
5. **A `check_compliance` tool** (the compliance oracle) — read-only, `{platform, action, jurisdiction}` → `{compliant, reason, requiredDisclosure, suggestedAlternativeActionId}`.
6. **Self-serve sandbox key minting** (`sp_test_` keys, no human consent redirect, auto-approve submissions, moves no money).
7. **OAuth 2.0 Authorization-Server metadata** at `/.well-known/oauth-authorization-server` (+ protected-resource metadata) so generic OAuth/MCP clients auto-configure.
8. **Auto-generated OpenAPI 3.1** covering *all* `/api/v1` routes with response + error examples (kill drift at the source).
9. **A publishable, built SDK** (`@social-perks/mcp` and/or `@social-perks/sdk` with `dist`, MIT, no phantom methods).
10. **Outbound webhooks** (`submission.approved`, `perk.redeemed`, `campaign.completed`, `plan.limit_reached`) so agents can subscribe instead of poll.

---

## 6. Top 20 highest-ROI actions (ranked by impact ÷ effort)

| # | Action | Impact | Effort | Confidence |
|---|---|---|---|---|
| 1 | Delete phantom `/exchange/*` from OpenAPI, `AGENTS.md`, SDK (or implement) — stop the first-call 404 | High | S | High |
| 2 | Collapse the two `ai-plugin.json` into one authoritative manifest; fix placeholder email | High | S | High |
| 3 | Reconcile counts/tools everywhere (compute `125` from `ALL_ACTIONS.length`; list all 10 MCP tools) | High | S | High |
| 4 | Fix `getBenchmarks` param (`businessType`) + `docs/mcp.md` key prefix (`sp_live_`) | High | S | High |
| 5 | Commit `server.json` + publish to the official MCP Registry (DNS-verified) | High | M | High |
| 6 | Add real `Product`/`AggregateOffer` JSON-LD to `/pricing` from one price constant | High | S | High |
| 7 | Add `sameAs` + stable `@id` to `Organization` JSON-LD; create a Wikidata item | High | S | High |
| 8 | Single-source pricing across all machine surfaces (kill price drift) | High | S | High |
| 9 | Add `Idempotency-Key` to all write tools/POSTs | High | S | High |
| 10 | Machine-actionable `payment_required` object in `PLAN_LIMIT_EXCEEDED` | High | S | Med |
| 11 | Ship the `check_compliance` oracle tool (the differentiator) | High | M | High |
| 12 | Submit to Claude Connectors Directory + ChatGPT App Directory (after verification) | High | M | Med |
| 13 | Front-load a 2–4 sentence definitive answer under the H1 on every programmatic template | High | M | High |
| 14 | Add `FAQPage` schema + a 3–5 Q&A block to every programmatic page type | High | M | High |
| 15 | Publish an original, dated **"Perk-Pricing / Action-Value Index"** (proprietary data → citations) | High | M | High |
| 16 | Publish/`dist` a real SDK; remove phantom methods | Med | M | High |
| 17 | Add `/api/llm-context`, `/api/feed.json`, `/api/v1/stats/public` to the robots allow-list | Med | S | Med |
| 18 | Self-serve `sp_test_` sandbox key endpoint (no consent redirect) | High | M | Med |
| 19 | Auto-generate the OpenAPI spec (full coverage + examples + `ErrorEnvelope` on 4xx) | Med | M | High |
| 20 | Outbound webhooks for the core lifecycle events | High | L | High |

---

## 7. The Top 100 opportunities (ranked, tiered)

Ordered by leverage. Tiers are the sequence; items within a tier are roughly ranked.

### Tier A — Integrity & truth (make every machine claim true) — do first
1. Remove/implement phantom `/exchange/opportunities` + `/exchange/market` everywhere.
2. Merge the two `ai-plugin.json` sources into one; fix `socialperks.example.com`.
3. Compute action count (`125`) dynamically in the MCP `listActions` description.
4. List all 10 MCP tools in `AGENTS.md` + `/api/llm-context` (drop "5 tools").
5. Fix MCP `getBenchmarks` to send `businessType` (or accept `industry` server-side).
6. Fix `docs/mcp.md` key prefix `sk_live_`→`sp_live_` (3×).
7. Build self-service key provisioning for agents, THEN delete the "on the
   roadmap" line in `public/AGENTS.md`. It is genuinely still on the roadmap —
   `/api/v1/api-keys` calls `requireAuth`, so a human must sign in to mint a
   key. Deleting the disclaimer first would put a false claim on the surface
   agents read to decide whether they can onboard themselves.
8. Set `SoftwareApplication` price from the real price constant, not `"0"`.
9. Single-source pricing (`PLANS` constant) across schema, `llm-context`, `llms.txt`, UI.
10. Remove phantom `sp.exchange.*` methods from the SDK.
11. Add a machine-readable **error-code catalog** (`/api/v1/errors` or OpenAPI enum).
12. Bump MCP `PROTOCOL_VERSION` from the stale `2025-03-26`.
13. Add `retryable` + `docs` URL fields to the JSON error envelope.
14. Ensure `X-Request-Id` echoes in every MCP tool response `_meta`.
15. CI check: fail the build if any machine surface's counts/tool-list drift from source.

### Tier B — Get actually listed (where agents pick) — do second
16. Commit `server.json` (name, `/api/mcp` streamable-HTTP endpoint, capabilities, auth).
17. DNS-verify `socialperks.app` for a reverse-DNS namespace (`com.socialperks/perks`).
18. Publish via `mcp-publisher` to the official MCP Registry.
19. Complete **business/identity verification** for "Social Perks" (gate for ChatGPT/Claude).
20. Submit to the **Claude Connectors Directory** (OAuth+PKCE, ≤64-char titles, read/write split).
21. Submit to the **ChatGPT App Directory** (Apps SDK).
22. List on Smithery.
23. List on Glama.
24. List on mcp.so.
25. List on PulseMCP.
26. List on mcpservers.org.
27. PR into `wong2/awesome-mcp-servers` + `best-of-mcp-servers`.
28. Publish `@social-perks/mcp` npm package (keywords: `mcp`, `model-context-protocol`).
29. Open-source the MCP server repo with GitHub topics (`mcp`, `mcp-server`).
30. Provide framework quickstarts (OpenAI Agents SDK, LangChain, CrewAI, Vercel AI SDK).

### Tier C — Differentiated agent tools (why agents *choose* SP) — the moat
31. `check_compliance(platform, action, jurisdiction)` read-only oracle tool.
32. Return `requiredDisclosure` + `suggestedAlternativeActionId` on `PROHIBITED_ACTION`.
33. `recommend_campaign(businessType, goal, budget)` → ranked, compliant plan.
34. `estimate_perk_value(action, followerCount)` (the bonus-tier logic, machine-callable).
35. `get_pricing_oracle(businessType)` as a first-class tool (not just an endpoint).
36. `list_actions(platform?, type?, maxEffort?)` with rich filters (never dump all 125).
37. `create_perk_campaign` (outcome-named, write, idempotent, consent-scoped).
38. `enroll_customer` / `record_action` write tools with clear scopes.
39. Compliance data as a **citable public dataset** (`Dataset` JSON-LD) for RAG.
40. A machine-readable "what agents should NOT do" policy (safety posture as a trust signal).

### Tier D — Agent-native money rails (resolve the paywall dead-end) — the profit link
41. `payment_required` object in `PLAN_LIMIT_EXCEEDED` (Stripe checkout URL + amount + plan).
42. Accept **Stripe Shared Payment Tokens** (Agentic Commerce Suite) for agent-driven upgrades.
43. Implement **ACP** (OpenAI+Stripe) checkout-session endpoints for the SP subscription.
44. Product/plan feed for ChatGPT Instant Checkout.
45. Evaluate **x402** (HTTP 402 + USDC on Base) for premium metered endpoints, reusing `_meta.cost`.
46. Support **AP2** signed consent mandates; store the Payment Mandate in the audit ledger.
47. Map SP perk programs onto **UCP Identity Linking** (loyalty integration in Shopify/Google flows).
48. `create_subscription` / `upgrade_plan` write tools (delegated authorization).
49. Metered per-call billing option for high-volume agents.
50. A "sandbox money" mode where `sp_test_` keys simulate the whole payment path.

### Tier E — Write-path trust (make agents re-use, not abandon)
51. `Idempotency-Key` on every write (MCP + OpenAPI + middleware, backed by request-dedup).
52. Self-serve `sp_test_` sandbox key endpoint (no human consent redirect).
53. Documented sandbox semantics (auto-approve, no real money) in `AGENTS.md`.
54. Outbound webhooks + subscription resource.
55. Bulk write ops (`createCampaigns`, `reviewSubmissions`) with per-item results.
56. Pagination + scoping on every list response (never dump full catalogs).
57. Machine-readable status/uptime feed (leverage `/status` + `/api/v1/reliability`).
58. Versioned changelog for `/api/v1`, linked from `AGENTS.md` + OpenAPI `info`.
59. Semantic-versioning commitment (never break `/api/v1` in place).
60. Read-only scoped keys distinct from write keys.

### Tier F — Discovery metadata & standards hygiene
61. `/.well-known/oauth-authorization-server` + `/.well-known/oauth-protected-resource`.
62. `/.well-known/agent-card.json` (A2A) + `/.well-known/mcp/server-card.json` (AgentReady).
63. Markdown content negotiation (`Accept: text/markdown` or `/index.md`) for clean RAG.
64. `llms-full.txt` concatenating `/answers` + `/faq` + `/glossary` + `/guides` as clean markdown.
65. Per-answer `.md` variant (`/answers/[slug].md`).
66. Add agent endpoints to `robots.ts` allow-list + sitemap.
67. Demote (don't delete) deprecated `ai-plugin.json` to a thin bridge.
68. Keep `llms.txt` accurate but stop expanding it.
69. Auto-generate OpenAPI from route handlers (full coverage, examples, errors).
70. Reference `ErrorEnvelope` on 400/401/403/422/429 in OpenAPI with real code examples.

### Tier G — GEO / answer-engine citation (the parallel channel)
71. `Product`/`AggregateOffer` on `/pricing` (real tiers/prices/currency).
72. `sameAs` + `@id` on `Organization`; create the **Wikidata** item.
73. Fix NAP/entity consistency. `seo.ts` uses `@socialperks` throughout — pick
    the handle that is actually registered, register it if it is not, and only
    then add it to `sameAs`/`twitter:site`. A `sameAs` URL that 404s hurts
    entity resolution more than omitting it.
74. Front-load a 2–4 sentence definitive answer under every programmatic H1.
75. `FAQPage` schema + Q&A block on `/for`, `/best`, `/vs`, `/compare`, `/guides`, `/platforms`.
76. Reach the **3–4 complementary schema types** threshold on money pages (`Article`/`Service`/`HowTo`+`Breadcrumb`).
77. Named `author` + `reviewedBy` (Person + credential) on `/answers` and Article pages.
78. `datePublished` + `dateModified` + visible "Updated {date}"; a real freshness cadence.
79. Publish the **Perk-Pricing / Action-Value Index** (proprietary, dated, anchored, citable).
80. A reusable "Key stat / cite-this" component with stable anchor ids + attribution.
81. Cover the literal "loyalty program for [vertical]" query pattern (per-vertical pages).
82. Build 3–4 pillar hub pages (FTC-compliance, UGC marketing, influencer pricing, loyalty) with hub/spoke internal linking.
83. `DefinedTerm`/`DefinedTermSet` on `/glossary` + corpus-wide entity linking.
84. Strip promotional tone from answer content (it reduces citation ~26%).
85. Add inline source citations to authoritative third parties (FTC, platform ToS).
86. Ensure all answer content is in server HTML (SSG) — never regress to CSR.
87. Unique, vertical-specific substance on programmatic pages (kill doorway/thin risk).
88. `Service` schema on `/for/[industry]` pages.
89. `Dataset` schema on `/benchmarks` + `/pricing-oracle`.
90. Keep AI crawlers fast-served + a fresh, accurate `sitemap.xml` with real `lastmod`.

### Tier H — Ecosystem presence & developer gravity
91. Public GitHub examples repo (LangChain/CrewAI/Vercel AI SDK using the SP MCP server).
92. A "Build an agent that runs a compliant perk campaign" tutorial (YouTube + blog).
93. Answer real Stack Overflow / Reddit (`r/mcp`, `r/smallbusiness`) questions with working code.
94. A public Postman/Hoppscotch collection for `/api/v1`.
95. Dev-focused changelog/RSS for the API + MCP tools.
96. Cross-list in AI tool directories (There's An AI For That, etc.) with honest capability copy.
97. Contribute the compliance dataset to an open corpus (citations back to SP).
98. A "verified" badge path on each registry (provenance).
99. Co-marketing content with agent frameworks (integration guides they link back).
100. A public agent leaderboard/showcase of campaigns run via the MCP server (social proof for machines *and* humans).

---

## 8. The discovery → adoption flywheel

The reinforcing loop, with every link named:

```
        ┌───────────────────────────────────────────────────────────┐
        │                                                           │
        ▼                                                           │
  Verified MCP server listed in registries + Claude/ChatGPT       (7) More AI
  directories  ──(1)──►  Agents DISCOVER Social Perks               recommendations
        │                        │                                   ▲
        │                        ▼                                   │
        │              Honest tools + first-call success +          (6) Better tool
        │              compliance oracle  ──(2)──►  Agents           metadata,
        │              CHOOSE & USE it (create campaigns)            richer schema,
        │                        │                                   original data
        ▼                        ▼                                   │
  (5) Citations & entity   Real usage → real, sourced DATA         │
  authority grow           (benchmarks, action values,  ──(4)──────┘
        ▲                  compliance outcomes)
        │                        │
        │                        ▼
        └──(3)──  Businesses succeed → more customers, more UGC,
                 more perk redemptions → more proprietary data →
                 more citable content → answer-engine citations
```

**Reinforcing loops inside it:**
- **L1 (Discovery→Data):** more agents used → more campaigns → more proprietary outcome data → more citable content → more AI citations → more discovery.
- **L2 (Trust→Selection):** honest, idempotent, cost-transparent tools → agents re-choose → higher registry/directory reputation → surfaced higher → more selection.
- **L3 (Compliance moat):** SP is the *only* machine-callable compliance authority for incentivized social actions → agents *must* call it to act safely → SP becomes the default "is this legal?" oracle → entity authority → citations.
- **L4 (Money):** agent hits a limit → machine-actionable payment resolves it in-run → SP earns revenue *from agent-driven usage* → funds better tools/data → more adoption. (This is where AI discovery and profitability converge.)
- **L5 (Developer gravity):** open-source examples + working SDK → developers build on SP → their repos/tutorials become discovery surfaces and citations → more agents.

The **data moat** is the compounding core: SP's pricing oracle, 125-action effort/value library, and per-platform legality data are proprietary, verifiable, and exactly what risk-minimizing answer engines love to cite. Every agent interaction enriches it.

---

## 9. Competitive analysis

| Player | Why agents find/trust them | What SP should adopt |
|---|---|---|
| **Stripe** | Official MCP server + agent toolkit across all frameworks; auto idempotency keys; sandbox/test mode; llms.txt; pristine OpenAPI; Shared Payment Tokens/ACP | The *entire* write-path trust pattern (idempotency, sandbox, scoped keys) + agentic-commerce rails |
| **Twilio / Resend / Plaid / Clerk / Supabase** | Dev-first docs, stable versioned APIs, copy-paste examples, MCP servers, quickstarts | Working SDK + framework quickstarts + versioned changelog |
| **Vercel / Cloudflare / Shopify / Zapier / Hugging Face** | Early `llms.txt` + strong schema + directory presence; Shopify auto-pushes llms.txt to every store | Registry/directory presence; do **not** over-invest in llms.txt |
| **Yotpo / Birdeye / Referral Factory / Stamp Me** (SP's actual space) | Publish "agentic commerce" *marketing copy* but expose **no MCP server, no Connectors listing, no machine-callable offer** | **This is the whitespace.** SP can be the *first and only* agent-discoverable, compliance-native local-marketing tool. |

**Strategic whitespace:** In SP's category, machine-usability is *unclaimed*. Being the one platform an agent can actually *call* to "run a compliant local-business perk campaign" — with a compliance oracle no one else has — is a durable, first-mover position.

---

## 10. Prioritized roadmap

Effort key: S ≤ 2 days · M ≤ 1 week · L > 1 week. Each initiative notes impact, dependencies, success metric, and how it moves **AI** and **Human** discoverability.

### Immediate wins (1–2 weeks) — "stop lying to machines" + get listed
| Initiative | Impact | Effort | Deps | Success metric | AI discoverability | Human |
|---|---|---|---|---|---|---|
| Kill phantom `/exchange/*` everywhere | High | S | — | 0 documented endpoints that 404 | Removes the #1 first-call trust leak | Cleaner docs |
| Merge `ai-plugin.json`; fix email | High | S | — | 1 authoritative manifest | Deterministic manifest w/ OAuth+MCP | — |
| Reconcile counts/tools/params (compute from source) | High | S | — | 0 cross-surface contradictions | Machines stop discounting the source | Accurate docs |
| Fix `getBenchmarks` param + `docs/mcp.md` key prefix | High | S | — | Filter works; valid auth header | First calls succeed | Devs copy working code |
| `server.json` + DNS-verify + publish to MCP Registry | High | M | Domain DNS | Live, verified registry entry | *Actual* discovery, not a claim | — |
| `Product`/`Offer` schema on `/pricing` from one constant | High | S | Price constant | Rich result eligible; price in schema | AI can quote correct price | Rich pricing snippet |
| `sameAs` + Wikidata item | High | S | Social profiles | Entity resolves in KG | Attributed citations | Brand knowledge panel |
| Add agent endpoints to robots allow-list | Med | S | — | `llm-context`/`feed` crawlable | Unblocks orientation endpoints | — |

**Dependency to start now (founder):** DNS access for domain verification; business/identity verification for "Social Perks" (gates the directories).

### Short-term (30 days) — write-path trust + the compliance oracle
| Initiative | Impact | Effort | Deps | Metric | AI | Human |
|---|---|---|---|---|---|---|
| `Idempotency-Key` on all writes | High | S | — | 0 double-creates under retry | Agents trust the write path | — |
| `check_compliance` oracle tool | High | M | LegalComplianceEngine | Tool live + cited | The differentiator; "must-call" | Compliance answers on-site |
| `payment_required` in limit errors | High | S | Stripe | Agent can resolve a paywall in-run | Removes the dead-end | Smoother upgrade |
| Self-serve `sp_test_` sandbox key | High | M | key infra | Keys minted w/o human | Zero-friction onboarding | Faster dev trial |
| Submit to Claude + ChatGPT directories | High | M | verification, OAuth+PKCE | Accepted listing | End-user shelf presence | Brand in AI app stores |
| Front-load answers + `FAQPage` on programmatic pages | High | M | — | +citation rate | ~67% higher AI-citation odds | Better SERP snippets |
| Publish + `dist` the SDK; drop phantom methods | Med | M | — | `npm i` works | Codegen path works | Dev adoption |

### Medium-term (90 days) — data moat + agentic commerce
| Initiative | Impact | Effort | Deps | Metric | AI | Human |
|---|---|---|---|---|---|---|
| Perk-Pricing / Action-Value Index (proprietary data) | High | M | data | Inbound citations to `/research` | Original-data citation magnet (~+41% visibility) | PR/backlinks |
| Auto-generated full OpenAPI + examples | Med | M | — | 100% route coverage | Reliable codegen | Dev docs |
| Outbound webhooks | High | L | — | Agents subscribe vs poll | Re-use/retention | Integrations |
| Stripe Shared Payment Token / ACP checkout | High | L | Stripe agentic suite | Agent-driven upgrade works | Money loop (L4) closes | In-chat checkout |
| Pillar hubs + topic clusters + entity linking | Med | M | — | Topical authority ↑ | Cluster-level citation | Organic traffic |
| OAuth AS/PRM `.well-known` + AgentReady cards | Med | M | — | Generic clients auto-config | Standards-native | — |

### Long-term (6–12 months) — network effects & defensibility
| Initiative | Impact | Effort | Deps | Metric | AI | Human |
|---|---|---|---|---|---|---|
| Open compliance dataset + citations back | High | L | data | External sites cite SP | Entity/citation authority | Backlinks/PR |
| Framework toolkits + example repos | Med | L | SDK | Stars/forks, tutorials | Developer gravity | Dev community |
| UCP Identity Linking (loyalty in commerce flows) | Med | L | UCP maturity | Linked in a commerce flow | Distribution via Shopify/Google | New channel |
| x402 / AP2 metered + mandate support | Med | L | wallets/VCs | Agent pays per-call | Agent-native monetization | — |
| Verified-provenance across all registries | Med | M | — | "Verified" everywhere | Trust ceiling raised | — |
| Public agent showcase/leaderboard | Med | M | usage | Campaigns-run count | Social proof for machines+humans | Marketing |

---

## 11. Final strategic assessment (likelihood, confidence, assumptions)

For each pillar: **likelihood it increases organic AI-driven traffic**, **confidence**, and the **assumptions** it rests on.

| Pillar | Likelihood ↑ AI traffic | Confidence | Key assumptions |
|---|---|---|---|
| **Fix the integrity/trust debt** (Tier A) | Very high — it removes active *losses* | **High** | Agents currently hit the phantom endpoints/SDK; today they silently churn. (Prevents loss more than it adds; still the top priority.) |
| **Get actually listed in the MCP Registry + directories** (Tier B) | High | **Med-High** | Registries/directories are where agents pick; SP passes review (OAuth+PKCE, read/write split, privacy policy, verification). Directory acceptance is gated and not fully in SP's control. |
| **Compliance oracle + differentiated tools** (Tier C) | High for *selection & citation* (moderate for raw traffic) | **Med-High** | Agents acting on SMBs' behalf need a legality check; being the only machine-callable authority earns "must-call" status + citations. |
| **Agent-native money rails** (Tier D) | Moderate for traffic, **high for revenue-per-agent** | **Med** | Agentic-commerce standards (ACP/SPT/x402/AP2) keep maturing in 2026; SP already uses Stripe, lowering effort. This is where discovery ↔ profit converge. |
| **Write-path trust** (Tier E) | High for *retention* (re-use), indirect for discovery | **High** | Idempotency/sandbox are proven re-choice levers (Stripe pattern). |
| **GEO / citation** (Tier G) | High for answer-engine traffic | **High** | JSON-LD (~2.5×), FAQ (~67%), original data (~+41%), entity resolution are measured, durable levers; SP already has strong SSG content to build on. |
| **`llms.txt` polishing** | Low | **High (that it's low)** | ~97% get zero AI requests; Google refuses it. Keep accurate, invest elsewhere. |
| **Ecosystem/developer gravity** (Tier H) | Moderate, compounding | **Med** | Requires sustained content/OSS effort; pays off as a flywheel, not immediately. |

**Overall confidence in the strategy:** **High.** The core claim — that Social Perks is over-built and under-trusted, and that integrity + registry presence + the compliance-oracle moat is the winning sequence — rests on a direct code audit (not speculation) and converging 2026 evidence. The largest *external* uncertainties are (a) directory acceptance timing/criteria (partly outside SP's control) and (b) the pace of agentic-commerce standards. Neither blocks the top two tiers, which are entirely within SP's control and are pure trust-recovery + genuine listing.

**The honest through-line:** none of this "games" AI systems — it makes Social Perks genuinely, verifiably easy for an agent to find, understand, trust, and pay. And it dovetails with the company's real constraint: an agent that resolves an SMB's paywall in-run is the same event as a paying customer. **AI discoverability and profitability are the same flywheel — the compliance oracle is the hook, and honest machine-usability is the moat.**

---

### Appendix — assumptions & provenance
- Audit reflects the repository state at the time of writing (`src/app/api/mcp/route.ts`, `robots.ts`, `layout.tsx`, `openapi/route.ts`, `packages/sdk`, `public/llms.txt`, `public/AGENTS.md`, etc.). Re-audit after any refactor.
- Landscape figures (MCP registry counts, `llms.txt` adoption, citation-lift percentages, directory rules, ACP/UCP/AP2/x402 status) are from 2026 research across ~100 sources and should be re-verified quarterly — this is a fast-moving space.
- "Impact/Effort/Confidence" are directional planning estimates, not guarantees.
