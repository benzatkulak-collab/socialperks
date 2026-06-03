# Social Perks — Product & Feature Inventory (Phase 2)

**Auditor role:** Chief Product Officer. **Stance:** brutally honest, evidence-based.
**State:** PRE-LAUNCH, 0 real users. ~169K LOC in `src/` + a fully **abandoned 63K-LOC `api/`** backend at repo root.
**Surface:** 78 pages, 104 API routes, ~50 `src/lib` engine modules.

---

## 0. TL;DR for the founder

You have built a **localStorage-backed marketing-perks SPA** (the real product, ~16 API routes wired) wrapped inside a **simulated enterprise platform** (the other ~88 routes + ~30 engines, mostly dead or in-memory). The core loop is sound but buried. The "10-year architecture" is overwhelmingly speculative-for-0-users; large chunks are literally imported by **zero** files.

**The product actually does one thing well:** a business creates a perk campaign → a customer/influencer does a social action + submits proof → business approves → customer earns a perk. That loop is durable (Postgres-backed via the campaign state machine) and wired end-to-end. **Everything else is scaffolding.**

---

## 1. The Real App vs. The Simulated Platform

### Evidence: what the frontend actually calls
Across all of `src/components` + `src/lib/hooks`, the entire UI calls only ~16 distinct API endpoints:

```
9  /api/v1/auth            6  /api/v1/campaigns        2  /api/v1/submissions
2  /api/v1/referrals/me    2  /api/v1/payouts          2  /api/v1/experiments
2  /api/v1/billing         1  /api/v1/waitlist         1  /api/v1/stats/public
1  /api/v1/search          1  /api/v1/referrals/click  1  /api/v1/influencers/me/earnings
1  /api/v1/influencers     1  /api/v1/flags            1  /api/v1/agent-auth/approve
1  /api/v1/admin/impersonate   (+ /discover from influencer portal)
```

That's **~17 of 104 routes (16%)** touched by the product UI. The other 84% are: admin tooling, SEO/LLM endpoints, cron, webhooks, and **speculative engine routes that no human-facing screen calls**.

### The "main app" is a localStorage SPA
`src/components/app.tsx` is the entire authenticated product: it holds state in `localStorage` (`sp-v2` key via `useLocalStorage`) and renders one of {landing, auth, business portal, influencer portal, enterprise portal}. Data durability for the *demo experience* is the browser, not the DB. (Campaigns specifically DO persist server-side — see §3.)

---

## 2. Core Loop Verdict

**There is ONE coherent core loop, and it is buried under competing concepts.**

The working loop (durable, wired, real):
1. Business signs up (`/api/v1/auth`) → 2. Creates/launches a campaign (`/api/v1/campaigns`, persisted to `launched_campaigns`) → 3. Influencer/customer discovers it (`/discover`, `/campaigns`) → 4. Submits proof (`/api/v1/submissions`) → 5. Business approves (`/api/v1/submissions/review`) → 6. Perk awarded (`perk-wallet` → `earned_perks`) + lifecycle event published.

**Competing/overlapping concepts that confuse the mental model:**
- **Campaigns** (`campaign-state-machine`) — the real primitive.
- **Perk Programs** (`perk-programs.ts`, 43KB) — a *second*, parallel "loyalty program" primitive with its own CRUD, members, progress, cashback. Only reachable via `/programs` (a retrofitted standalone page that exists "so the route doesn't 404") and `/api/v1/admin/programs`. **Not in the business portal.** This is a duplicate core loop.
- **Exchange** (`exchange.ts`, 53KB) — a *third* model: an order-book marketplace where "agents" place buy/sell orders for marketing actions. Orphaned (see §4).
- **Perks/Wallet** — the reward artifact (fine, supports the loop).
- **Referrals** — a 4th growth mechanic, wired into both portals (legitimate).
- **Submissions** — supports the loop (fine).

**Can a mom-and-pop owner understand this?** No. A coffee-shop owner is presented with: campaigns, perk programs, a wallet, an exchange, referrals, an "AI campaign agent," API keys, MCP, and an agent marketplace. **Three of those (programs, exchange, agent-marketplace) are entirely different conceptual models of the same "reward people for marketing" idea.** Pick ONE.

---

## 3. Data Durability Reality Check

Two schemas exist:
- **`src/lib/db/migrations.ts`** — the *actually-applied* migrations (v1–v4 live in prod per project memory; v5 billing pending). v1 creates the full real table set: `businesses, influencers, users, campaigns, launched_campaigns, campaign_submissions, perk_wallets, earned_perks, api_keys, webhooks, analytics_events, notifications, agent_sessions, agent_queries, platform_connections`. **So the core loop is genuinely durable.**
- **`src/lib/db/schema.ts`** (17 Prisma-style models) — referenced only by `architecture-roadmap.ts` and `billing/store.ts`; largely aspirational/parallel.

**12 routes use in-memory `Map` stores** (wiped on every serverless cold start — effectively non-functional in prod):
`auth, billing/webhook, campaigns/invite-track, drip, exchange/{enroll,market,opportunities,orders,trades}, payouts/webhook, recommendations, waitlist`.
The **entire exchange** is in-memory Maps → even if someone reached it, orders/trades vanish between requests.

---

## 4. The "10-Year Architecture" — Honest Classification

Verified by `grep`-ing every non-test importer of each module.

| Engine / Subsystem | LOC | External importers (non-test) | Wired to a real user feature? | Verdict |
|---|---|---|---|---|
| **exchange.ts** | 1,312 | **0** | No. Routes reimplement w/ synthetic data + Maps; `/exchange` page not in any nav/footer/sidebar | **CUT** |
| **graph-engine.ts** | 898 | **0** | No. `/api/v1/graph` called by no component | **CUT** |
| **financial-ledger.ts** | 892 | **0** | No double-entry accounting used anywhere | **CUT (defer)** |
| **sync-engine.ts** | 814 | **0** | No. Offline sync for a web SPA w/ 0 users | **CUT** |
| **analytics-engine.ts** | 772 | **0** | No. Real analytics come from `/api/v1/campaigns` aggregation | **CUT** |
| **infrastructure/** (soc2, disaster-recovery, sharding, edge, observability, ml-pipeline, media, i18n, search) | 14,735 | **0** for every file | None imported outside the dir | **CUT** (all 26 files) |
| **multi-tenant/** | 2,445 | isolation used by campaigns route (`recordUsage`, `withTenant`) | Partial — usage metering is real; full multi-tenancy is not | **DEFER** (keep isolation shim) |
| **ml/** (embedding-system, fraud-model/pipeline/training, social-graph, model-singleton) | 6,328 | only `/api/v1/ml/train` + `/api/v1/ai/review` | `ml/train` is an admin/cron toy; ai/review not in submission flow (§5) | **DEFER** (keep embedding-system; cut the rest) |
| **embedding-engine.ts** | 1,045 | 1 (`search/semantic-search`) | Indirect: powers `/search` + `/discover` which the influencer portal calls | **KEEP (thin)** |
| **plugin-system.ts** | 803 | 1 (campaigns route calls `pluginManager`) | Marginal — FTC-compliance injection runs through it | **DEFER** (extract the one real use, drop plugin abstraction) |
| **fraud-detection.ts** | 856 | 1 (`ai/review`) | Only via ai/review, which isn't in the live approve flow | **DEFER** |
| **verification-engine.ts** | 1,400+ | 1 (`ai/review`) | Same — not in live flow; no real platform API creds | **DEFER** |
| **compliance-engine.ts** | 1,100+ | 2 (`ai/review`, `legal`) | `/legal` page is real; engine is heavy for what's shown | **DEFER (trim)** |
| **sandbox/** | 44 | — | 44-line stub | **CUT** |
| **event-sourcing/** + `events.ts` | ~3,500 | events.ts used by 1 route + realtime | Real-time SSE works; full event-sourcing is overkill | **DEFER (keep realtime, drop ES)** |
| **campaign-state-machine** | 1,000+ | **12 routes** | YES — the core loop | **KEEP** |
| **submissions.ts** | 660 | **10** | YES — core loop | **KEEP** |
| **perk-wallet.ts** | 480 | 1 (review route) | YES — core loop | **KEEP** |

### What is the "exchange" even for?
Reading `exchange.ts` + `/api/v1/exchange/*`: it models a **financial order book** (`BuyOrder`, `SellOrder`, `Trade`, `MarketDepth`, implied "market makers") where **AI agents auto-enroll and auto-generate sell orders** from their capabilities (`/exchange/enroll`), and businesses "buy" marketing actions. The thesis (from `/agents` page copy): *AI bots do social posts for businesses and get paid via API/MCP; the exchange is the clearing market.*

**Does it map to a real user need? No — not for the stated 3 audiences (mom-and-pop, influencer, enterprise).** None of them wants a Bloomberg terminal for tweets. It's a bet on a future "agent economy" with zero present demand, zero durability (in-memory), and zero discoverability (unlinked). It is the single clearest example of speculative sprawl.

---

## 5. Dead / Duplicate / Not-Wired Features

| Item | Evidence | Status |
|---|---|---|
| **Exchange (engine + 5 routes + page)** | `exchange.ts` 0 importers; routes use synthetic data + Maps; `/exchange` unlinked | **DEAD** (built, unreachable, non-durable) |
| **AI submission-review pipeline** (`/api/v1/ai/review`, fraud + verification + compliance + ml) | The live approve path (`/api/v1/submissions/review`) imports `submissions`, `perk-wallet`, `campaign-state-machine` — **NOT** ai/review. ai/review is orphaned from the UI | **DEAD** (parallel pipeline never invoked by the product) |
| **Perk Programs** (43KB engine + 6 routes) | Only `/programs` standalone page (retrofitted) + admin; not in business portal | **DUPLICATE core loop** |
| **`infrastructure/*` (14.7K LOC)** | 0 external importers, every file | **DEAD** |
| **graph-engine, financial-ledger, sync-engine, analytics-engine** | 0 importers each | **DEAD** |
| **matching-engine** (`/api/v1/matching/suggest`) | route called by no component | **DEAD (route)** |
| **`/api/v1/graph`** | called by no component | **DEAD (route)** |
| **API v2** (`/api/v2/{auth,campaigns,submissions,migration}`) | Frontend calls v1 exclusively; `versioning.ts` declares **v1 deprecated, "migrate to v2"** — backwards. v2 is the ghost, v1 is the product | **DEAD / mislabeled** |
| **Abandoned root `api/` backend** | 63K LOC, separate package.json/Dockerfile, not deployed (Vercel runs Next.js `src/app`) | **DEAD (delete entirely)** |
| **"AI" engine** | `ai-engine.ts` returns hardcoded object literals — no LLM call. `/ai/generate`, `/ai/campaign-agent` are deterministic templating | **MISLABELED** (works, but it's rules, not AI) |
| **Background agents** (`lib/agents/*`, 13 files) | Wired to `/api/v1/cron/agents` (daily). acquisition/outreach/billing-recovery/fraud-sentinel/payout-runner | **SPECULATIVE** (running cron for 0 users; many depend on dead engines) |

---

## 6. SEO / LLM-Discovery Content Surface

**This is the most defensible "extra."** Unlike the engines, it's coherent and pre-launch-appropriate.

- **Data files:** `ideas.ts` (1,075 LOC), `answers-data.ts` (1,004), `industries.ts` (1,264), plus blog/best/faq/guides/vs/playbook/glossary/comparison (~3,600 combined). ~6K LOC of content data.
- **Programmatic pages (all use `generateStaticParams`):** `/blog`, `/guides`, `/answers`, `/best`, `/vs`, `/compare`, `/for/[industry]/on/[platform]`, `/in/[city]/[industry]`, `/playbook`, `/glossary`, `/actions/[id]`, `/platforms/[id]`, `/i/[slug]`, `/pricing-oracle/[type]`. These statically generate hundreds of long-tail SEO pages from the data files — a **real programmatic-SEO play**.
- **LLM-discovery:** `/api/feed.json`, `/api/llm-context`, `/api/mcp`, `/.well-known/ai-plugin.json`, `/api/og/*` (dynamic OG images), `/api/openapi`. Coherent "be discoverable by both Google and LLMs" strategy.

**Verdict: KEEP, but it's premature leverage.** Programmatic SEO only pays off with domain authority + a product worth ranking for. For a 0-user pre-launch, the ROI is months out, and it's a maintenance surface (every data file is a liability if facts drift). It is **sprawl in timing, not in concept.** Trim depth (you do not need 1,000 ideas or 1,000 answers to launch); keep the machinery.

---

## 7. Full Feature Catalog

Status legend: **shipped** (wired+working) · **partial** · **broken** · **dead** (built, not reachable from UI) · **spec** (speculative-for-0-users).
Value/Complexity/Adoption: H/M/L.

### A. User-facing — Business portal
| Feature | Purpose | Status | Val | Cmplx | Adopt | Evidence |
|---|---|---|---|---|---|---|
| Auth (signup/login/session) | Account access | shipped | H | M | H | `src/components/auth/auth-form.tsx`, `/api/v1/auth` |
| Business dashboard (stats) | Overview of campaigns | shipped | H | L | H | `business/portal-home.tsx`, `use-business-dashboard.ts` |
| Campaign create (wizard + templates) | Launch a perk campaign | shipped | H | M | H | `business/portal-create.tsx`, `template-picker.tsx`, `/api/v1/campaigns` |
| Campaign templates | Pre-built campaigns | shipped | H | L | H | `campaign-templates.ts` (4 importers) |
| Active campaigns / edit | Manage live campaigns | shipped | H | M | H | `active-campaigns.tsx`, `campaign-edit-modal.tsx` |
| Submission review (approve/reject) | Approve proof → award perk | shipped | H | M | H | `/api/v1/submissions/review` |
| Onboarding wizard | First-run setup | shipped | M | L | M | `business/onboarding-wizard.tsx` |
| Embed code / widget | Put perk widget on own site | partial | M | M | M | `business/embed-code.tsx`, `/api/v1/widget/config` |
| QR poster | Printable acquisition poster | shipped | M | L | M | `/api/v1/businesses/poster` |
| Referral modal | Refer other businesses | shipped | M | L | M | `business/referral-modal.tsx`, `/api/v1/referrals/*` |
| Billing / checkout ($49 Pro) | Subscribe | partial (v5 migration pending) | H | M | M | `checkout-banner.tsx`, `/api/v1/billing` |
| Plan-limit gating | Enforce tier limits | shipped | M | M | M | `plan-limit-modal.tsx`, `billing/enforcement` |
| Redemptions view | See perk redemptions | shipped | M | L | M | `/api/v1/businesses/redemptions` |
| Notifications center | In-app alerts | shipped | M | M | M | `shared/notification-center.tsx` |
| Analytics overview | Campaign performance | partial | M | M | M | `business/portal-analytics.tsx` (client aggregation) |

### B. User-facing — Influencer portal
| Feature | Purpose | Status | Val | Cmplx | Adopt | Evidence |
|---|---|---|---|---|---|---|
| Campaign discovery | Find campaigns to do | shipped | H | M | H | `influencer/campaign-discovery.tsx`, `/discover` |
| Submission modal (proof) | Submit completed action | shipped | H | M | H | `influencer/submission-modal.tsx`, `/api/v1/submissions` |
| Perk wallet | Track earned perks | shipped | H | L | H | `influencer/perk-wallet.tsx` |
| Earnings + chart | Track income | shipped | M | M | M | `influencer/earnings.tsx`, `/influencers/me/earnings` |
| Profile editor (rate card, platforms, portfolio) | Creator profile | shipped | M | M | M | `influencer/profile-*.tsx` |
| Media kit | Shareable creator kit | shipped | M | L | M | `influencer/media-kit.tsx` |
| Shareable wins | Social proof of earnings | shipped | L | L | L | `influencer/shareable-wins.tsx` |
| Payouts | Cash out earnings | partial | H | M | M | `/api/v1/payouts` (webhook in-memory) |

### C. User-facing — Enterprise portal
| Feature | Purpose | Status | Val | Cmplx | Adopt | Evidence |
|---|---|---|---|---|---|---|
| Multi-location mgmt | Manage many stores | partial | M | H | L | `enterprise/multi-location.tsx` |
| Brand manager (guidelines/templates/review/compliance) | Brand control | partial | M | H | L | `enterprise/brand-*.tsx` |
| Reports + charts | Enterprise reporting | partial | M | M | L | `enterprise/reports.tsx` |
| API console / docs / keys / usage | Developer access | shipped | M | M | L | `enterprise/api-*.tsx`, `/api/v1/api-keys` |
| Webhooks section | Event subscriptions | partial | L | M | L | `enterprise/webhooks-section.tsx`, `/api/v1/webhooks` |

> Enterprise portal is **demo-accessible without a real enterprise account** (`onEnterpriseDemo`), and most panels render mock/partial data. For 0 users with no enterprise pipeline, this is **premature**.

### D. User-facing — Agent / MCP surface
| Feature | Purpose | Status | Val | Cmplx | Adopt | Evidence |
|---|---|---|---|---|---|---|
| `/agents` landing | Pitch AI-agent integration | shipped (marketing) | L | L | L | `app/agents/page.tsx` |
| Agent authorize / token | OAuth-style agent auth | shipped | L | M | L | `/agent/authorize`, `/api/v1/agent-auth/*` |
| MCP server (`/api/mcp`, `/docs/mcp`) | Expose product to LLM agents | shipped | L | M | L | `app/api/mcp/route.ts`, `agent/mcp-sandbox.tsx` |
| Claude Desktop install guide | Onboard agents | shipped | L | L | L | `agent/claude-desktop-install.tsx` |

> Coherent bet, but it's a **bet on agent customers before any human customers**. Defer.

### E. User-facing — SEO / content (programmatic)
| Feature | Purpose | Status | Val | Cmplx | Adopt | Evidence |
|---|---|---|---|---|---|---|
| Blog / guides / playbook | Content marketing | shipped | M | M | L(now) | `app/{blog,guides,playbook}`, data files |
| Answers (`/answers/[slug]`) | AEO / FAQ-style ranking | shipped | M | M | L(now) | `answers-data.ts` (1K LOC) |
| Best / vs / compare | Comparison SEO | shipped | M | M | L(now) | `best-data.ts, vs-data.ts, comparison-data.ts` |
| For [industry] / In [city] | Local + vertical SEO | shipped | M | M | L(now) | `industries.ts, cities.ts` |
| Glossary / FAQ | Long-tail terms | shipped | L | L | L | `glossary-data.ts, faq-data.ts` |
| Ideas (1,000) | Idea-bank SEO | shipped | L | M | L | `ideas.ts` (1,075 LOC) |
| Calculator / pricing-oracle / benchmarks | Lead-gen tools | shipped | M | M | L | `app/{calculator,pricing-oracle,benchmarks}` |
| Leaderboard / case-studies / resources | Social proof | shipped | L | L | L | `app/{leaderboard,case-studies,resources}` |
| OG image routes (`/api/og/*`) | Share previews | shipped | M | L | M | `app/api/og/*` |
| Feed / llm-context / openapi / ai-plugin | LLM discovery | shipped | L | L | L(now) | `app/api/{feed.json,llm-context,openapi}` |

### F. User-facing — Admin
| Feature | Purpose | Status | Val | Cmplx | Adopt | Evidence |
|---|---|---|---|---|---|---|
| Admin dashboard + 17 sub-pages | Internal ops | shipped (mostly real) | M | M | M(internal) | `app/admin/*` (only `/settings` uses ComingSoon) |
| Founder overview | Top-level metrics | shipped | M | L | M | `admin/founder`, `/api/v1/admin/founder-overview` |
| Impersonate | Support tooling | shipped | M | M | L | `/api/v1/admin/impersonate` |

> 18 admin pages for 0 users is heavy, but admin is cheap leverage and mostly real. Keep a thin slice (users, businesses, campaigns, submissions, billing); the rest (exchange/fraud/agents admin) shadow dead engines → cut with them.

### G. Backend engines / capabilities (summary — full classification in §4)
| Engine | Status | Val | Cmplx | Evidence |
|---|---|---|---|---|
| campaign-state-machine | shipped (core) | H | M | 12 importers |
| submissions | shipped (core) | H | L | 10 importers |
| perk-wallet | shipped (core) | H | L | review route |
| campaign-templates | shipped | H | L | 4 importers |
| billing/enforcement + stripe | partial | H | M | campaigns route, `/billing` |
| referrals | shipped | M | L | portals |
| realtime (SSE) | shipped | M | M | `/api/v1/events`, publisher |
| search + embedding-engine | shipped (thin) | M | M | `/search`, `/discover` |
| email (direct-send) | shipped | M | M | review route, drip crons |
| multi-tenant/isolation | partial | M | M | campaigns `recordUsage` |
| ai-engine (templated) | shipped (mislabeled) | M | L | `/ai/generate` |
| perk-programs | dead/duplicate | L | H | admin + `/programs` only |
| compliance-engine | spec/defer | M | H | `ai/review`, `legal` |
| verification-engine | spec/defer | M | H | `ai/review` only |
| fraud-detection + ml/* | spec/defer | M | H | `ai/review`, `ml/train` |
| plugin-system | spec/defer | L | M | 1 use (FTC inject) |
| event-sourcing | spec/defer | L | M | adjacent to realtime |
| exchange | **dead** | L | H | 0 importers |
| graph-engine | **dead** | L | M | 0 importers |
| financial-ledger | **dead** | L | M | 0 importers |
| sync-engine / offline | **dead/spec** | L | M | 0 importers |
| analytics-engine | **dead** | L | M | 0 importers |
| infrastructure/* (soc2, DR, sharding, edge, observability, ml-pipeline, media, i18n) | **dead/spec** | L | H | 0 importers (all) |
| background agents (lib/agents/*) | spec | L | H | cron/agents |
| root `api/` backend (63K LOC) | **dead** | L | H | not deployed |
| API v2 | **dead/mislabeled** | L | M | frontend uses v1 |

---

## 8. What Should NOT Exist — Ranked by (User Value − Complexity Cost)

Sorted worst-first (highest cost, lowest present value). LOC = approximate removable lines.

| Rank | Item | LOC saved | Rationale | Action |
|---|---|---|---|---|
| 1 | Root `api/` abandoned backend | ~63,000 | Not deployed, duplicate of `src/app/api`, separate toolchain. Pure liability. | **DELETE** |
| 2 | `infrastructure/*` (soc2, DR, sharding, edge, observability, ml-pipeline, media, i18n, search) | ~14,700 | 0 importers, every file. SOC2/sharding/DR for 0 users. | **DELETE** |
| 3 | Exchange (engine + 5 routes + page + admin) | ~3,500 | 0 importers, in-memory, unlinked, no user need. Bloomberg-for-tweets. | **DELETE** |
| 4 | ml/* + fraud + verification (minus embedding) | ~9,000 | Only feed orphaned `ai/review`; no platform creds; not in live flow. | **DEFER** (archive) |
| 5 | Perk Programs (engine + routes + page) | ~5,000 | Duplicate of campaigns; not in portal. Fold into campaigns. | **DELETE/MERGE** |
| 6 | graph-engine + financial-ledger + sync-engine + analytics-engine | ~3,400 | 0 importers each. | **DELETE** |
| 7 | API v2 (4 routes) + versioning "deprecate v1" logic | ~1,500 | Ghost API; mislabels the live product as deprecated. | **DELETE** |
| 8 | Background agents (lib/agents/* + cron/agents) | ~2,000 | Running daily cron for 0 users; depend on dead engines. | **DEFER** |
| 9 | event-sourcing + plugin-system | ~3,600 | Over-abstraction; extract the 1 real plugin use (FTC), drop the rest. | **DEFER** |
| 10 | Enterprise portal (until a real enterprise lead) | ~3,000 (UI) | Demo-only, mock data, no pipeline. | **DEFER** (hide behind flag) |
| 11 | SEO depth (ideas 1K, answers 1K) — keep machinery, cut volume | ~1,500 (data) | Premature; trim to a launch-sized set. | **TRIM** |

**Estimated removable now (cut, ranks 1–3,5,6,7): ~91,000 LOC (~40% of the repo).**
**Defer/archive (ranks 4,8,9,10): ~17,600 LOC behind a flag or in a branch.**

---

## 9. Top 10 Product Findings (severity-ranked)

| # | Severity | Finding | Why it matters | Action |
|---|---|---|---|---|
| 1 | **Critical** | Three competing core-loop concepts (campaigns vs perk-programs vs exchange) | A mom-and-pop can't form a mental model; you'll lose them at onboarding. There must be ONE loop. | **CUT** programs + exchange; keep campaigns |
| 2 | **Critical** | ~84% of API routes & ~30 engines unreachable from the product UI | Massive maintenance + cognitive load with zero user value pre-launch. | **CUT** dead engines |
| 3 | **Critical** | 63K-LOC root `api/` backend abandoned but still in repo | Confuses contributors, doubles attack/maint surface, not even deployed. | **CUT** (delete) |
| 4 | **High** | `infrastructure/*` (14.7K LOC: SOC2, DR, sharding, edge) has 0 importers | Enterprise-scale plumbing for 0 users; pure speculation. | **CUT** |
| 5 | **High** | Exchange is non-durable (in-memory), unlinked, 0 importers, no user need | The flagship "10-year" feature serves nobody and can't survive a cold start. | **CUT** |
| 6 | **High** | "AI" engine is hardcoded templates, not an LLM | Brand promise ("AI campaign agent") isn't backed by AI; risk if marketed as such. | **DEFER** (relabel or wire a real model) |
| 7 | **High** | AI review pipeline (fraud/verification/compliance/ml) is orphaned from the live approve flow | Big build, never invoked; gives false sense of "fraud-protected." | **DEFER** (archive) |
| 8 | **Medium** | Billing tables (migration v5) pending in prod | Can't durably take money until applied. | **KEEP/FIX** (apply v5) |
| 9 | **Medium** | API v2 marked "successor," frontend runs on v1; versioning calls v1 "deprecated" | Self-contradictory; v2 is the ghost. | **CUT** v2 |
| 10 | **Medium** | Programmatic SEO/LLM surface is real but premature (6K LOC content for 0 traffic) | Right idea, wrong time; maintenance liability that pays off only post-traction. | **DEFER/TRIM** |

---

## 10. Recommendation

**Collapse to the one loop.** Ship: business → campaign (templates) → discover → submit proof → approve → perk → (billing). Keep: auth, campaigns, submissions, perk-wallet, referrals, billing (apply v5), realtime, thin search, a thin admin, and the SEO machinery (trimmed). **Delete ~91K LOC of dead/duplicate/speculative code** (root `api/`, infrastructure, exchange, programs, graph/ledger/sync/analytics engines, v2). **Defer behind a feature branch/flag**: enterprise portal, agent/MCP economy, AI-review pipeline, ml/fraud/verification, plugin/event-sourcing. Revisit only when real-user demand or an enterprise contract justifies each.
