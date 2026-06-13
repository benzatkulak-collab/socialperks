# Influencer + Enterprise + Agent-Economy Audit

Date: 2026-06-12. Repo: `/Users/benzatkulak/Desktop/social-perks/.claude/worktrees/hardcore-meitner-9898b1` @ a1dd716 (post-#108/#109 remediation).
Method: every claim verified in current code with file:line citations. Status: COMPLETE.

## 0. TL;DR

1. **Influencer side: cut it.** Real auth, real Stripe Connect plumbing — wrapped around nothing. No durable profile (in-memory seed array, `influencers/route.ts:26-29`), profile-save 404s for real users, discovery serves seed-data campaigns, earnings vanish on cold start (submissions persist write-only), ~66% of the influencer components are orphaned dead code (rate card and media kit included), and the payout endpoint has **no balance check** — with live Stripe keys, any onboarded creator could transfer arbitrary platform funds.
2. **Enterprise: still demo, now with a thin real-data veneer.** Real campaigns/submissions feed the dashboard when a businessId exists, but locations are fake groupings, API keys/webhooks/brand tools are hardcoded demo objects even for logged-in users, and **no human can hold the enterprise role in production**. Park it behind a contact form; build nothing.
3. **Agent bet: best engineering in the repo, structurally inert, strategically misaimed.** The MCP server/OpenAPI/sandbox genuinely work — and return demo data. The 10-agent "autonomous" fleet can never go live: agent mode is process-local memory on serverless, so the daily cron re-runs everything in dry-run forever; and the flagship acquisition agent's live path enqueues email into a worker-less queue and then permanently marks leads contacted. The /agents page promises bot-builders money from "real businesses" that don't exist — while the product's own premise requires blocking bot engagement.
4. **Trust systems are theater at the worst possible spot.** The influencer dispute flow shows "Dispute sent" while discarding the text client-side with no API call (`portal.tsx:341-345`). Fraud heuristics exist but are wired to an orphan route and dry-run agents — no real submission is fraud-checked. Verification still fabricates "Instagram Graph API" evidence from URL substring matches. No business reviews, no surfaced reputation, founder-only submission review.

## 1. Influencer side — walk the actual experience

### 1.1 Signup & auth

- Influencer self-signup is allowed and durable **at the auth layer only**: `allowedSignupRoles = ["business","influencer"]` (`src/app/api/v1/auth/route.ts:236-240`); user row is awaited into Postgres (`route.ts:264-271`). Enterprise role correctly cannot be self-claimed.
- **No server-side influencer profile is ever created on signup.** The auth-form fabricates a `SeedInfluencer` client-side and saves it to localStorage only (`src/components/auth/auth-form.tsx:288-294`). Nothing calls `POST /api/v1/influencers` during signup.
- On session restore, the SPA looks the influencer up in *seed data* and falls back to the email prefix as a display name (`src/components/app.tsx:233-243`). A real creator who signs out and back in on another device has: no bio, no niches, no follower count, no platforms — a blank identity.
- The influencer portal still lives inside the legacy single-page `app.tsx` shell (`src/components/app.tsx:369-376`), not the newer `/dashboard` app-router surface the business side migrated to. Two parallel architectures persist.

### 1.2a Consequence chain

Because `influencerStore` is seed-only in-memory (1.2 below), a *real* signed-up influencer who tries to save their profile gets **404 INFLUENCER_NOT_FOUND** from `PUT /api/v1/influencers` (`src/app/api/v1/influencers/route.ts:218-221`). The "server-side profile persistence" added in PR #72 works only for the 15 demo seed influencers. The real-creator path is broken at step 2 of the journey.

### 1.2 Profile & rate card

- **The influencer registry is still in-memory seed data, post-remediation.** `src/app/api/v1/influencers/route.ts:26-29`: `const influencerStore: SeedInfluencer[] = [...createSeedData().influencers]` with the comment "In production this would be backed by a database." POST register pushes into this array (`route.ts:182`) — evaporates on cold start. PUT self-update mutates the same array (`route.ts:218-237`) and only allows `bio` + `location`; display name, follower count, niches, platforms, rate card are not server-editable.
- So the durable-storage remediation (#108) covered the perk wallet and payouts but **not influencer identity/profile**: a creator who "registers" exists only until the next deploy.
- **~66% of the influencer component code is dead.** Zero importers anywhere in `src/` for: `profile-editor.tsx` + its 5 sub-editors including the rate-card editor (`src/components/influencer/profile-editor.tsx`, `profile-rate-card-editor.tsx`), `media-kit.tsx` (323 LOC), `earnings.tsx` + `earnings-chart.tsx` (597 LOC), `dashboard.tsx` + `dashboard-components.tsx` (794 LOC), `campaign-discovery.tsx` (398 LOC), `shareable-wins.tsx` (116 LOC). Verified by grepping all of `src/` for `influencer/<file>` imports — only `portal.tsx`, `submission-modal.tsx`, `perk-wallet.tsx`, `marketplace-utils.ts` are reachable (via `src/components/app.tsx:8`). **The "rate card" feature exists only as an orphaned component; it is rendered nowhere and saved nowhere.** The polished earnings dashboard with charts is likewise unreachable; the live portal renders a simpler inline earnings list.

### 1.3 Campaign discovery

- The Discover tab fetches `/api/v1/discover?influencerId=...` (`src/components/influencer/portal.tsx:115-118`), falling back to client-side campaigns generated from seed data (`portal.tsx:103`, `buildMarketplaceCampaigns`).
- `/discover` ranks via the home-grown "embedding engine," whose index is populated from `createSeedData()` — fake businesses, fake campaigns, fake influencers (`src/lib/search/semantic-search.ts:72-88, 111-140`). The "semantic similarity" is hand-rolled feature vectors, not embeddings from any model.
- Net: a real creator discovers **demo campaigns from fictional businesses**. There is no real supply of paid campaigns to discover because there are no businesses funding influencer campaigns (the SMB product is perks-for-customers, not creator briefs).

### 1.4 Submissions & earnings

- Proof submission is real-ish: portal POSTs to `/api/v1/submissions` with proof URL (`src/components/influencer/portal.tsx:237-248`); earnings tabs are computed client-side from submission statuses (`portal.tsx:170-199`).
- **Submissions are write-only durable.** `persistSubmission` mirrors writes to Postgres `campaign_submissions` (`src/lib/submissions/persist.ts:29-59`), but there is no hydrate/read-back path — `GET /api/v1/submissions` reads only the in-memory Map (`src/lib/submissions.ts:8-9, 27` canonical Map; `src/app/api/v1/submissions/route.ts:106` calls in-memory `getSubmissions`). After any cold start, an influencer's submission history and therefore their entire earnings view **shows empty** even though rows exist in the database. (Contrast: perk wallet and payouts got hydration in #108; submissions did not.)
- "Earnings" are notional perk values summed from approved submissions; nothing connects them to the payout system (see 1.5) or to any ledger entry.

### 1.4 Submissions & earnings
_(pending)_

### 1.5 Payouts (Stripe Connect)

**The Stripe Connect plumbing is real and durable — but it pays out against thin air.**

- Real Stripe Connect Express integration exists: `stripe.accounts.create({type:"express"...})` at `src/lib/payouts/index.ts:286-296`, onboarding links via `stripe.accountLinks.create` at `src/lib/payouts/index.ts:361-366`, transfers via `stripe.transfers.create` at `src/lib/payouts/index.ts:468-477`. Falls back to mock mode (fake `acct_`/`tr_` ids, `mock:true` flag) when Stripe is unconfigured (`src/lib/payouts/index.ts:321-338, 525-547`). Since Stripe keys are not on Vercel (per billing audit), **prod runs in mock mode today**.
- Post-#108 durability is real: write-through cache to Postgres tables `payout_accounts`/`payout_requests` (migration 007), hydrate-on-cold-start (`src/lib/payouts/index.ts:56-68, 262-263`).
- IDOR/CSRF fixed as claimed: influencerId derived from session, never body (`src/app/api/v1/payouts/route.ts:38-40, 85-87`); CSRF enforced on POST (`src/app/api/v1/payouts/route.ts:69-71`).
- **CRITICAL GAP: no earned-balance check anywhere in the payout path.** `request_payout` validates only `amount >= 1000` cents (`src/app/api/v1/payouts/route.ts:130-140`); `requestPayout()` validates only that the account is onboarded and amount ≥ $10 (`src/lib/payouts/index.ts:443-460`). There is no ledger lookup, no "available balance" concept, nothing connecting payouts to approved submissions. The moment real Stripe keys land, **any onboarded creator can transfer an arbitrary amount from the platform Stripe balance**. The payout system is a faucet with no meter.

### 1.6 Verdict: build vs cut

**The influencer side is a facade with one real vein.** Walking the journey end-to-end as a real creator:

1. Sign up → works (durable auth user), but no profile is created anywhere durable.
2. Edit profile → 404 from the API; rate card UI is orphaned dead code.
3. Discover campaigns → demo campaigns from fictional seed businesses; no real business has any mechanism to publish a creator brief (the SMB product is customer-perks, not creator campaigns).
4. Submit proof → works, lands in admin queue; but history evaporates from the UI on cold start.
5. Get reviewed → only if the founder manually approves in /admin.
6. Get paid → Stripe Connect mock mode; and if real keys ever land, the missing balance check is a drain-the-account vulnerability, while "earnings" were never connected to payouts in the first place.

**What it would take to make creators a real supply side** (not a patch list — the actual product gap): a durable influencer profile entity; a business-side "create a creator campaign with budget" flow (does not exist at all — businesses create customer-perk campaigns); a funded-escrow model so earnings are backed by money; payouts gated on a ledger; marketplace liquidity on both sides. That is a second startup. Two-sided creator marketplaces die on liquidity, and this one is pre-launch with zero businesses.

**Recommendation: cut it.** Keep the auth role dormant if cheap, delete the ~3,400 LOC of orphaned components, remove the seed-influencer API surface, and remove "influencers" from the marketing claims until the SMB side has paying customers. The perk-wallet customer flow (the `/c/[id]` claim page) already covers the "regular customer posts for a perk" use case without marketplace dynamics.

## 2. Enterprise

### 2.1 What the portal actually renders

17 components, ~5 tabs (Dashboard / Multi-location / Reports / Brand Manager / API Console) lazily loaded in `src/components/enterprise/portal.tsx:13-17`, fed by a single hook `useEnterpriseData` (`src/lib/hooks/use-enterprise-data.ts`, 567 LOC).

### 2.2 Demo-only verification — verdict: "demo-plus", mostly still demo

Slightly better than the June-2 "pure mock" claim, but functionally still a demo:

- When a real `businessId` exists, the hook does fetch real `/api/v1/campaigns` and `/api/v1/submissions` and computes location/report aggregates from them (`use-enterprise-data.ts:396-401`). That's the "plus."
- But "locations" are synthesized by grouping campaigns on a `location` field that the campaign-creation flow never sets — everything collapses to a `"Main Location"` fallback (`use-enterprise-data.ts:113`). There is no location entity, no location CRUD, no per-location anything.
- Brand guidelines, campaign templates, pending content reviews, **API keys, webhooks, and API usage stats are hardcoded demo defaults even for a logged-in enterprise user** — `createDemoDefaults()` returns fake `sk_live_****` keys and is merged into the result unconditionally (`use-enterprise-data.ts:46-78, 459-464`), with the comment "Fallback data for features that don't have real API endpoints yet" (`use-enterprise-data.ts:45`). Ironically a real `/api/v1/api-keys` route exists (`src/app/api/v1/api-keys/route.ts:1-15`, built for agent onboarding) — the enterprise console just doesn't call it.
- With no businessId at all (the landing-page "enterprise demo" button, `src/components/auth/auth-form.tsx:595`, `src/components/app.tsx:358`), the entire portal is `createDemoEnterprise()/createDemoLocations()/createDemoReportData()` fabrications (`use-enterprise-data.ts:471-476`).
- There is no path for a real customer to become "enterprise": self-signup forbids the role (`src/app/api/v1/auth/route.ts:236-240` — correct security posture), and the only enterprise login is the dev-only PIN seed account (`route.ts:363-380`, hard-disabled in production at `route.ts:364-368`). **In production, zero humans can hold the enterprise role.**

### 2.3 What real enterprise would need

A location entity + CRUD, real brand-guideline storage and a content-review queue wired to submissions, API keys surfaced from the real route, webhook management against the real webhook infra, role/seat management (multi-user orgs don't exist — one auth user per business), SSO, and contracts/invoicing. That's 2+ quarters of work with zero current demand evidence. Pre-launch with 0 users, this audience is pure distraction; the honest move is to delete the portal or park it behind a "talk to us" page.

## 3. Agent-native platform bet (PRs #86-#100)

### 3.1 Inventory of agent surfaces

| Surface | Where | Reality check |
|---|---|---|
| MCP server | `src/app/api/mcp/route.ts` (710 LOC) | Real hand-rolled JSON-RPC 2.0 implementation; 10 tools (5 public reads, 5 auth'd writes: createCampaign, submitProof, reviewSubmission, listSubmissions, getCampaignStats — `route.ts:232-507`); per-call cost metadata (`route.ts:56-83`) and rate-limit echo. Genuinely well-built. |
| `/api/llm-context` | `src/app/api/llm-context/route.ts:1-14` | JSON orientation doc for agents; 1-day cache. Works. |
| OpenAPI 3.1 | `src/app/api/v1/openapi/route.ts:1-10` | Real spec endpoint. |
| Discovery files | `public/llms.txt`, `public/AGENTS.md`, `public/ai-plugin.json` | Static discovery surface (PR #96). |
| Agent sandbox | `src/components/agent/mcp-sandbox.tsx` at `/agent/test` | In-browser JSON-RPC tester hard-coded to prod endpoint (`mcp-sandbox.tsx:26`). Works. |
| Claude Desktop "install" | `src/components/agent/claude-desktop-install.tsx:34-40` | Not an install — a copy-paste JSON snippet pointing at `https://socialperks.app/api/mcp`. |
| Agent OAuth / scoped keys | `src/app/api/v1/agent-auth/{approve,token}`, `/agent/authorize`, `src/app/api/v1/api-keys/route.ts` | API keys are durably stored + hydrated from Postgres (`src/lib/auth/api-keys.ts:375-416`). One of the few agent pieces with real persistence. |
| Agent activity dashboard | `/dashboard/agents` → `GET /api/v1/agent-activity` (`src/app/api/v1/agent-activity/route.ts`) | Read layer that joins the audit log per API key (`src/lib/agent-activity.ts:14`). Audit log persists to Postgres when DATABASE_URL is set (`src/lib/audit-log.ts:16`). |
| 10+1 autonomous agents | `src/lib/agents/` (1,896 LOC, 11 agents registered in `index.ts:23-35`) | See 3.2 — structurally incapable of running "live" in prod. |
| Agents cron | `vercel.json` crons: `/api/v1/cron/agents` daily 05:00 | Registered (PR #100). The route docstring still claims it is "Not registered in vercel.json by default" (`src/app/api/v1/cron/agents/route.ts:7-12`) — stale. |
| Exchange "agent trading market" | **DELETED.** | Removed inside PR #108 (squash df4a18c; original commit "chore: delete the exchange feature + API v2 (dead code)"). `src/app/api/v1/exchange/` no longer exists. **CLAUDE.md still documents 7 exchange endpoints** (9 mentions) — stale project docs. |

### 3.2 What actually runs

**The 10-agent "autonomous" system cannot ever be live in production.** Chain of evidence:

1. All 11 agents default to `"dry-run"` (`defaultMode: "dry-run"` in every file under `src/lib/agents/`, e.g. `acquisition-agent.ts:164`).
2. The registry that holds agent mode is **process-local in-memory** — its own header says so: "Today this is process-local in-memory state; when the platform moves to multi-instance, this becomes a row in Postgres" (`src/lib/agents/registry.ts:5-7`, Maps at `registry.ts:21-22`).
3. On Vercel serverless, an admin flipping an agent to "live" via `/admin/agents` (`src/app/admin/agents/page.tsx:107-113`) mutates one lambda instance's memory. The next cold start — and the daily cron tick, which runs in whatever instance answers — sees `defaultMode: "dry-run"` again. **"Live" mode survives at most one warm instance's lifetime.**
4. Therefore the daily 05:00 cron does this, forever: every agent appears due (`lastRunAt: null` on a fresh instance), runs in dry-run, writes decisions to the audit log, returns. No action is ever executed. It is a daily simulation.
5. Even if mode were durable, the flagship **Acquisition Agent's live path is broken**: it enqueues invites via `emailQueue.add` (`src/lib/agents/acquisition-agent.ts:201-207`), but `startAllQueues()` is never called anywhere in the codebase (verified: zero call sites outside `src/lib/jobs/`) — the queue has no worker in serverless, so emails are silently dropped. Worse, the agent then stamps `contacted_at` (`acquisition-agent.ts:208`) so the lead is **never retried: live mode would permanently burn every lead it touches without sending anything.**
6. Agent run history/decisions shown on `/admin/agents` come from the same in-memory state (`lastReport`, `recentDecisions` ring buffer, `registry.ts:162-186`) — they too evaporate per instance; only the audit-log copies persist.

What does demonstrably work: the MCP read path end-to-end (tools wrap the platform's own REST API, `src/app/api/mcp/route.ts:124-130` `callRestApiWithMeta`), API-key issuance and the per-key activity rollup. But note what MCP tools return: `searchInfluencers` wraps the seed-data influencer store (Section 1.2), `listCampaigns` reads the in-memory campaign engine. **An agent integrating today gets demo data back through a beautifully engineered pipe.**

### 3.3 Strategic read: agent distribution as 2026 acquisition channel

**Honest call: the engineering is the best in the repo, the bet is mostly speculative, and the current pitch is dishonest.**

What's defensible about the bet (steelman):
- By mid-2026, agent-mediated discovery is real at the margins: LLMs do cite `llms.txt`-style surfaces, MCP servers do get installed, and "be the API an agent reaches for" is a legitimate long-tail SEO analog. The build cost here was low-ish and the surfaces (OpenAPI, MCP, sandbox) double as developer docs.
- The agent OAuth/API-key + per-key activity audit design (`src/app/api/v1/api-keys/route.ts:8-11` "human-in-the-loop step for agent onboarding") is genuinely ahead of most SMB SaaS.

Why it is not an acquisition channel for THIS business:
1. **The buyer is a mom-and-pop business owner.** Coffee shop owners in 2026 do not install MCP servers or paste JSON into `claude_desktop_config.json`. The agent surfaces sell to developers/agent-builders — an audience with zero overlap with the paying ICP.
2. **The /agents page pitch ("Connect your social media agents to our marketplace of real businesses offering real rewards… your agents earn money", `src/app/agents/page.tsx:8,127-128`) is false today**: there are 0 real businesses, discovery returns seed data, and the payout path is mock. An agent-builder who integrates discovers this in minutes. Shipping acquisition surfaces that over-promise to the most technically sophisticated audience possible is reputational anti-marketing.
3. **It's also conceptually confused about which side agents help.** Agents as *demand* (SMBs' assistants managing campaigns) could be real someday — but requires paying SMBs first. Agents as *supply* (bots fulfilling marketing actions) is something the platform should be **detecting and blocking** — FTC-compliant authentic-engagement marketing is the entire product premise; "your bots post and review" (the literal /agents pitch) describes the fraud the fraud-engine exists to catch. The agent-supply bet undermines the core product's integrity story.
4. Measured effort allocation: PRs #84-#100 (17 PRs, 2026-05-15 → 2026-05-28 per git dates of faaa9d8 and e35ad9c — two intense weeks of the repo's recent history) went to agent/SEO surfaces while the influencer profile API still loses data on cold start and disputes go nowhere.

Verdict: keep the MCP server + OpenAPI as cheap docs/distribution hedge (they're built and low-maintenance), **delete or rewrite the /agents "earn money with your bots" pitch, kill the 10-agent autonomous fleet or persist its state and fix the dead queue** (as internal back-office automation it's fine *post*-launch), and spend zero additional effort here until there are paying SMBs.

## 4. Trust & community systems

### 4.1 Business reviews / influencer reputation

- **There is no system for anyone to review or rate a business.** No rating entity, no review CRUD, nothing — searched `src/lib` and `src/app` for rating/reputation systems; "reputation" appears only in SEO marketing copy (`src/lib/vs-data.ts`, `src/lib/answers-data.ts`). Customers/creators choosing whether to trust a business's perk promise have zero signal.
- **Influencer reputation exists only as an in-memory `UserRiskProfile`/trust score inside the fraud engine** (`src/lib/fraud-detection.ts:28-40`, `getUserRiskProfile` at `:789`) — never persisted, never surfaced in any UI, reset on every cold start.

### 4.2 Fraud detection reality

- The fraud engine is a real, decent heuristics library (~900 LOC: duplicate proof URLs, rapid-fire, self-review, account age — `src/lib/fraud-detection.ts:290-636`). **But it is not wired into the live submission path.** `POST /api/v1/submissions` performs a URL plausibility check only (`src/app/api/v1/submissions/route.ts:25` `checkProofUrl`) — zero fraud-engine calls (verified by grep on the route).
- Fraud checks run in exactly two places: (a) `POST /api/v1/ai/review` (`src/lib/ai-review/index.ts:19-25`), a route **no client code calls** (grep across `src/` finds no caller outside the route and openapi spec); (b) the Submission Reviewer / Fraud Sentinel agents — which are permanently dry-run (Section 3.2). **Net: no real submission is ever fraud-checked.**
- The verification engine remains a simulator that fabricates evidence: for an Instagram proof it sets `details.platformApi: "Instagram Graph API", endpoint: "GET /me/media"` while doing nothing but URL substring matching — any URL containing `instagram.com` scores 0.85-0.90 confidence (`src/lib/verification-engine.ts:146-172`); screenshots get a flat 0.55 with a note that OCR "would" be integrated (`:181-185`). The header admits it: "for now they simulate verification with realistic confidence scores" (`verification-engine.ts:5-7`). The June-2 AI-washing finding stands on this surface.
- The business dashboard tells owners "Submissions are reviewed automatically, and the customer gets their perk via SMS" (`src/components/business/portal-home.tsx:197`). Neither half is true as deployed: the auto-reviewer is dry-run-only, and SMS silently no-ops without Twilio env config (`src/lib/notifications/channels.ts:57`).

### 4.3 Disputes — pure theater

The influencer portal renders a full dispute flow for rejected submissions: a "Dispute" button, a required reason textarea, a "Submit Dispute" button, and a "Dispute sent" confirmation (`src/components/influencer/portal.tsx:597-634`). The handler is:

```ts
const handleSubmitDispute = useCallback((subId: string) => {
  setDisputeSubmitted((prev) => new Set(prev).add(subId));
  setDisputeId(null);
  setDisputeReason("");
}, []);   // src/components/influencer/portal.tsx:341-345
```

**No API call. The dispute reason is discarded. No one is notified. "Dispute sent" is a lie rendered to the user.** This is the single worst trust-integrity item found in this audit slice — it survived both remediation PRs including #109 ("trust/honesty").

### 4.4 Submission review is founder-only

Approve/reject UI exists only in the platform admin (`src/app/admin/page.tsx:645-666`, `src/app/admin/submissions/page.tsx:90-97` → `POST /api/v1/submissions/review`). The **business owner has no surface to review submissions against their own campaigns** — their portal just toasts "New submission received!" (`src/components/business/portal.tsx:170-171`). At any scale beyond a handful of users, the founder is the human review queue for every submission on the platform.

## 5. Bottom line

Across all three "other audiences," the pattern is identical: **excellent pipes, no water.** Stripe Connect without balances or earnings, MCP without real inventory, enterprise dashboards without enterprises, fraud engines without fraud checks, dispute buttons without disputes. The June-2 audit's core diagnosis (real product buried under speculative surface area) is not just still true for these verticals — the two remediation PRs (#108, #109) consciously and correctly invested in the SMB perk-wallet vertical and *did not touch* these areas, except to delete the Exchange (good) — though they also left the dispute-theater and the "auto-reviewed + SMS" false copy in place, which #109's "trust/honesty" title implied it would catch.

For the reinvention decision:
- **Influencer**: cut. Delete dead components (~3,400 LOC), retire the seed-influencer API, keep the customer-facing perk wallet (that's a different, real feature). Revisit only after SMB revenue exists, as "customer advocates," not a creator marketplace.
- **Enterprise**: cut to a contact-form page. Delete the portal or accept it as a sales demo with a visible "demo" label.
- **Agents**: freeze. Keep MCP/OpenAPI/llms.txt as zero-maintenance hedges; fix or remove the false /agents marketing pitch; decommission the cron-driven dry-run fleet (it burns a Vercel cron slot simulating work) or move agent state to Postgres only when there's real back-office volume to automate.
- **Trust**: before ANY external user touches the platform, fix the three integrity lies: dispute theater, "reviewed automatically + SMS" copy, and fabricated verification metadata. These are cheap fixes and the cost of being caught is total.

Five must-fix security/integrity items surfaced here, in priority order:
1. Payout balance gating (`src/lib/payouts/index.ts:438-460`) — drain-the-account once Stripe keys land.
2. Dispute flow discards user input while confirming success (`src/components/influencer/portal.tsx:341-345`).
3. Acquisition agent live-mode burns leads into a dead email queue (`src/lib/agents/acquisition-agent.ts:201-208` + no `startAllQueues()` caller).
4. Real-influencer profile writes 404 / evaporate (`src/app/api/v1/influencers/route.ts:26-29, 218-221`).
5. Submissions persisted but never hydrated — user-visible data loss every cold start (`src/lib/submissions/persist.ts` write-only; `src/lib/submissions.ts:27`).
