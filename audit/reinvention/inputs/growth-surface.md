# Growth-Surface Audit — Social Perks

Date: 2026-06-12. Repo: `/Users/benzatkulak/Desktop/social-perks/.claude/worktrees/hardcore-meitner-9898b1` @ a1dd716 (post-#108/#109 remediation).
Method: every claim verified against code in this worktree; file:line citations throughout. Status of each mechanism graded on four axes: **code state / UI reachability / durability / loop potential**.

## 0. Inventory at a glance

| Mechanism | Code state | Reachable from UI? | Durable? | Works today? | Loop potential |
|---|---|---|---|---|---|
| Referral (B2B ledger, $10) | Complete API+webhook | Admin page only; modal shows the OTHER system | Yes (prod-verified) | NO — signup never consumes ref code | High, ~1 day to finish |
| Referral (viral share codes) | Complete except conversion write | Yes — "Refer & Earn" modal | Yes (prod-verified) | Clicks only; conversions structurally 0 | High, same fix |
| /c/[id] claim page | Complete, DB-fallback | Yes (QR/links) | Yes | YES — incl. "Powered by Social Perks" footer | Already a loop core |
| InviteUnlock (share-3-friends) | Client-only honor system; real backend orphaned | Yes, on every claim page | localStorage only | "Works" but unverifiable + gameable | Medium |
| QR poster | Real scannable QR generator | **NO — zero UI callers** | n/a (stateless) | Only by hand-typing API URL | Highest — hours to wire |
| Embeddable widget | Complete + snippet UI | Yes (portal home) | **No — config API has no DB fallback** | Breaks on cold start | High |
| OG share images | 4 dynamic card routes | n/a | n/a | **NO — SVG content-type, no platform renders it** | High fix-leverage |
| Welcome/reset/billing emails | Direct-send (queue bypassed) | n/a | n/a | Yes, IF RESEND_API_KEY set | — |
| Onboarding drip (d1/3/7/14) | Cron + route complete | n/a | **Sent-state in-memory → daily re-sends** | Dead or spams; nothing in between | Must fix before enabling |
| Waitlist + d3/d7 nurture | Complete, correct dedupe | Yes (landing + city pages) | Yes (prod-verified, 0 rows) | Yes | Solid funnel piece |
| Dunning / re-engagement | **Does not exist** | — | — | — | Gap |
| SEO surface (~400+ URLs) | Complete, JSON-LD, sitemapped | Public | Static | Yes — but leaderboard + profiles are fabricated | 12-month asset |
| Agent surface (MCP/OpenAPI/llms.txt) | Real, 10 MCP tools, sandbox | Public | Yes (0 usage rows) | Yes | Speculative |
| PostHog funnel | 5 events, full acquisition funnel | n/a | n/a | Yes — founder can see CTA→checkout funnel | Value-loop is dark |
| Achievements/streaks/leaderboards | None real; leaderboard is seed-data fake | — | — | — | Skip |

## 1. Referral system

**Verdict: two parallel referral systems exist, both durable in Postgres, both reachable from the dashboard UI — but the attribution chain is broken at the single most important link: signup never consumes the captured ref code. Clicks are counted; conversions are structurally always zero.**

### 1a. The two systems (yes, two)

| | Loop A — "B2B referral ledger" | Loop B — "viral share-link codes" |
|---|---|---|
| Code | `src/lib/referrals/index.ts` (495 LOC) | `src/lib/referrals/codes.ts` (210 LOC) |
| Code format | `REF-XXXX-XXXX`, $10 flat credit (`DEFAULT_CREDIT_AMOUNT = 10`, index.ts:71) | 6-char no-lookalike code, `/?ref=ABC123` (codes.ts:38-47, 202-210) |
| Who can refer | businesses only (`NOT_A_BUSINESS` 403, `src/app/api/v1/referrals/route.ts:31-33`) | businesses AND influencers (codes.ts:49-52; me/route.ts:25-27) |
| Reward | $10 credit on referee's **paid conversion**, credited by Stripe webhook (`src/app/api/v1/billing/webhook/route.ts:208-222`) | "estimated commission" preview only: conversions × $4.90, explicitly fake until "real subscription→commission joins are wired" (`src/app/api/v1/referrals/me/route.ts:50-54`) |
| Durability | DURABLE — migration `add_referrals_ledger` creates `referrals` + `business_referral_codes` (`src/lib/db/migrations.ts:813-846`), write-through + cold-start hydration (index.ts:296-461) | DURABLE — migration `add_referral_code_tables` creates `referral_codes` + `referral_attributions` (`src/lib/db/migrations.ts:772-806`) |
| API | GET/POST `/api/v1/referrals` (route.ts:24-128) | `/api/v1/referrals/me`, `/code`, `/click` |
| UI surface | only the admin page `src/app/admin/referrals/page.tsx:38` calls `/api/v1/referrals` | "Refer & Earn" card on portal home (`src/components/business/portal-home.tsx:401-417`) → `ReferralModal` (`src/components/business/portal.tsx:526,651`) with copy-link + share-to-Twitter (`referral-modal.tsx:44,80`) |

The post-audit remediation (#108/#109) genuinely fixed durability — both systems persist and rehydrate. That part of the June-2 finding is resolved.

### 1b. The broken attribution chain (the part that matters)

The intended flow: visitor hits `/?ref=CODE` or `/ref/REF-...` → `RefCapture` (mounted globally, `src/app/layout.tsx:238`) writes a 30-day `sp-ref` cookie + localStorage (`src/components/shared/ref-capture.tsx:24-28`) and fires a click bump to `/api/v1/referrals/click` → visitor signs up → attribution recorded.

What actually happens:
1. **Clicks ARE counted** — `recordClick` bumps `uses_count` (codes.ts:164-175).
2. **Signup IGNORES the cookie.** The auth route only reads `body.referralCode` (`src/app/api/v1/auth/route.ts:289-296`); it never reads the `sp-ref` cookie (only cookie it reads is `sp-refresh-token`, auth/route.ts:437). The signup form sends `action: "signup", email, password, name` — no referralCode (`src/components/auth/auth-form.tsx:187`). A repo-wide grep confirms no production code sends `referralCode` to signup.
3. **`recordConversion` (codes.ts:177-200) has ZERO production callers** — only its own tests. `referral_attributions` can never get a row; `conversions_count` is permanently 0; the ReferralModal's "estimated commission" is permanently $0.00.
4. Consequently the Stripe-webhook credit path (webhook/route.ts:208-222) is also dead in practice: `findReferralByReferee` only finds referrals created by `trackReferralSignup`, which only runs if an API client hand-crafts the signup body.

**Bonus bug:** even if signup did read the cookie, `RefCapture` truncates codes to 12 chars (`ref-capture.tsx:19` — `code.toUpperCase().slice(0, 12)`), while Loop A codes (`REF-XXXX-XXXX`) are 13 chars — the last character is silently dropped, so Loop A codes captured via URL would never match.

Also note `/ref/[code]` redirects to `/dashboard#signup?ref=CODE` (`src/app/ref/[code]/page.tsx:14`) — a hash-fragment "signup" route whose handling depends on the dashboard reading `#signup`, another fragile hop.

### 1c. Loop potential

High — this is the cheapest real loop in the codebase to finish. Everything expensive (durable tables, click capture, dashboard UI, webhook crediting, idempotent credit transitions) exists and is tested. The missing piece is ~20 lines: read `sp-ref` cookie server-side in the signup handler (or send it from `auth-form.tsx`), call `recordConversion` + `trackReferralSignup`, fix the 12/13-char truncation, and decide which of the two systems is canonical (having both is sprawl — same disease the June-2 audit flagged, reproduced in miniature inside the remediation).

## 2. Social sharing, OG images, QR poster, /c/[id] claim page

**Verdict: this is the richest growth surface in the product — a genuine B2B2C loop skeleton exists (claim page + poster + embeddable widget, all "Powered by Social Perks"-branded) — but the visual share hook is broken everywhere because every OG image is served as SVG, which no major social platform renders.**

### 2a. /c/[id] claim page — the B2B2C loop core (REAL, reachable, durable)
- `src/app/c/[campaignId]/page.tsx` (358 LOC). Durable: campaign lookup falls back in-memory map → event-store rehydrate → Postgres `loadLifecycle` (page.tsx:62-75), explicitly to stop 404s after cold starts.
- **"Powered by Social Perks — Turn customers into your marketing team" footer with homepage link** (page.tsx:344-353) plus branded header link (page.tsx:187-192). The built-in B2B2C branding loop EXISTS on every customer-facing claim page.
- Dynamic per-campaign metadata with OG title/description (page.tsx:79-113) — but **no OG image at all** and `twitter.card: "summary"` (page.tsx:107), so shared claim links render as bare text cards.
- FTC disclosure block hard-rendered (page.tsx:301-313).

### 2b. InviteUnlock — "share with 3 friends, unlock a bigger perk" (live but honor-system)
- Rendered on every active claim page (`src/app/c/[campaignId]/page.tsx:291-299`): +5% / +$2 perk upgrade for 3 shares.
- Mechanism is **pure client-side self-attestation**: localStorage counter, +1 per share-button click, no verification — clicking "Copy link" 3 times unlocks it (`src/components/campaign/invite-unlock.tsx:16-25, 49-67`). Unlock redemption = "mention code SHARE3 in the notes" honored manually at review time (invite-unlock.tsx:123-128).
- A real server-side replacement exists — `/api/v1/campaigns/invite-track` with per-visitor dedupe and HMAC-signed unlock tokens (`src/app/api/v1/campaigns/invite-track/route.ts:1-52`) — but it is **orphaned: zero callers** (repo-wide grep for `invite-track`/`invitedBy`/`unlockEarned` finds only the route itself). The shared URLs from InviteUnlock carry no `?invitedBy=` param (invite-unlock.tsx:44), so the backend could not attribute even if called. Phase-14 backend shipped; Phase-5 honor-system UI still in production.
- Share channels: copy / SMS / email / Tweet with `@socialperks` mention (invite-unlock.tsx:69-92).

### 2c. OG images — systemically broken share previews
- Four dynamic OG card routes exist: `/api/og/influencer` ("I made $X" card), `/api/og/platform`, `/api/og/business`, `/api/og/action` (`src/app/api/og/*/route.ts`).
- **All serve `Content-Type: image/svg+xml`** (`src/app/api/og/influencer/route.ts:68`, `src/app/api/og/platform/route.ts:62`). Facebook, X/Twitter, LinkedIn, iMessage and Slack do not render SVG `og:image` — they require PNG/JPEG/WebP. The sitewide default is also an SVG (`/og-image.svg`, `src/app/layout.tsx:44-46,58`).
- Net effect: **every share — influencer win cards, business profiles, platform pages, the homepage itself — renders without a preview image on every major social network.** The "primary status / share trigger" (influencer OG route's own words, route.ts:4-5) has never worked. Fix is mechanical: Next.js `ImageResponse` (`next/og`) renders PNG; nothing in the repo uses it (no `ImageResponse` anywhere outside layout metadata).
- `/api/og/action` has zero referencing pages — dead.

### 2d. Shareable wins (influencer side)
- `src/components/influencer/shareable-wins.tsx` — "Just earned $X posting for a local business on @socialperks" tweet intent (lines 56-61), shown on influencer dashboard when lifetime earnings > 0 (lines 53-54). Reachable, but gated on an influencer earnings path that the business context says is half-built; and the tweet links to the bare homepage whose OG image is the non-rendering SVG.

### 2e. QR poster — real generator, unreachable from UI
- `GET /api/v1/businesses/poster` produces a print-ready 8.5×11 SVG poster with a **real scannable QR** (uses the `qrcode` package, error correction M) linking to `/c/{campaignId}` (`src/app/api/v1/businesses/poster/route.ts:1-57`).
- **Zero UI callers.** Repo-wide grep for `businesses/poster` in components/pages finds nothing; portal-home only *talks about* the poster in onboarding copy ("Print the QR code on your poster", `src/components/business/portal-home.tsx:191-192`). A business cannot reach the poster without hand-typing the API URL with query params. This matches the phase1 memory note "Print-poster button (UI)" as a known remainder — still not done.

### 2f. Embeddable widget — second B2B2C surface, real but durability-broken
- `public/widget.js` (490 LOC, dependency-free): floating "Earn a Perk" button + slide-up campaign browser for any third-party site, with a hardcoded **"Powered by Social Perks" backlink** (widget.js:430). Install snippet generator `EmbedCode` is live on the portal home (`src/components/business/portal-home.tsx:7,392`).
- Backing API `GET /api/v1/widget/config` exists (`src/app/api/v1/widget/config/route.ts`) but reads campaigns from the per-process `campaignManager`/`eventStore` with **no Postgres fallback** (no `loadLifecycle`/rehydrate call anywhere in the 156-line route) — unlike the /c/ page which was explicitly fixed. On a cold serverless instance a real business's widget shows no campaigns. The June-2 "deletes itself on cold start" disease survives on this path.
- Widget submissions POST to `/api/v1/submissions` cross-origin (widget.js:276-285).

## 3. Email lifecycle (welcome / drip / dunning / re-engagement) and the queue worker

**Verdict: the June-2 "dead queue" finding was remediated by bypassing the queue (direct sends) and adding 4 real Vercel crons — a genuine improvement. Transactional emails now fire. But the onboarding drip has a re-send bug that makes it either dead or a daily spam cannon, dunning emails don't exist, and a layer of orphaned email modules (digest, QBR, creator-match, notification channels) ships with zero callers.**

All sends go through one provider: Resend if `RESEND_API_KEY` is set, else console logging (`src/lib/email/index.ts:325-332`). Whether `RESEND_API_KEY` is actually set on Vercel prod is NOT verifiable from the repo — every email below silently degrades to console.log without it.

### 3a. What actually fires (direct-send, queue bypassed)
| Email | Trigger | Citation | Status |
|---|---|---|---|
| Welcome (signup) | POST /auth signup, awaited inline with explicit "queue worker is never started in serverless" comment | `src/app/api/v1/auth/route.ts:276-286` | FIRES (if Resend key set) |
| Password reset | POST /auth reset — fire-and-forget `.catch` | `src/app/api/v1/auth/route.ts:540` | FIRES (but fire-and-forget on serverless can be killed post-response — the same bug the welcome-email comment describes was left in here) |
| Subscription-started (paid welcome) | Stripe webhook checkout completed, direct send | `src/app/api/v1/billing/webhook/route.ts:192-206` | FIRES once billing env is live |
| Abandoned-checkout recovery | Stripe `checkout.session.expired`, with recovery URL + UTM | `src/app/api/v1/billing/webhook/route.ts:320-343` | FIRES once billing env is live |
| Waitlist confirmation | POST /waitlist | `src/app/api/v1/waitlist/route.ts:126` | FIRES |

### 3b. Crons are real (vercel.json) — but the onboarding drip is broken
`vercel.json:4-9` schedules 4 daily crons: `waitlist-drip` (14:00), `campaign-sweeps` (09:00), `onboarding-drip` (15:00), `agents` (05:00). All require `CRON_SECRET` (e.g. `src/app/api/v1/cron/onboarding-drip/route.ts:31-43`) — another unverifiable env dependency; without it every cron 503s.

- **Waitlist drip (day-3/day-7): CORRECT.** Durable dedupe via `day3_sent_at`/`day7_sent_at` columns on the `waitlist` table, windowed queries, batch-update after send (`src/app/api/v1/cron/waitlist-drip/route.ts:52-110`; columns in `src/lib/db/schema.ts:745-747`). **Prod-verified:** `waitlist` table exists in the live Supabase DB (project wxvlpewrcvzpbhfnfqjq) with **0 rows** — the machinery works, nobody is in it.
- **Onboarding drip (day-1/3/7/14): BROKEN BY DESIGN.** The cron proxies to `POST /api/v1/drip` (`cron/onboarding-drip/route.ts:19-23`), which loads real users from `auth_users` (`src/app/api/v1/drip/route.ts:90-110`) and computes due steps as `elapsed >= delayDays && !hasSent(...)` (`src/lib/email/drip.ts:311-336`). But `hasSent` reads `const sentState = new Map(...)` — **per-process memory, no table, no migration** (`drip.ts:264-278`; repo-wide grep: no drip table anywhere in `src/lib/db/migrations.ts`, none in prod Supabase). On serverless, every daily cron run is a fresh process where `hasSent` is always false → **every user past day 14 is due for ALL four steps, every single day**. With 21 rows in prod `auth_users` (mostly demo/founder accounts — context says 0 real external users, but the drip doesn't distinguish), turning on `RESEND_API_KEY` + `CRON_SECRET` today would start sending up to 4 duplicate onboarding emails per address per day, forever. The drip is currently saved from spamming only by the same env-unset condition that makes it dead.
- **Campaign sweeps:** auto-archives ended campaigns and inserts "extend?" prompts as `notifications` rows with `status: 'pending'` and a comment "downstream notify channel handles delivery" (`src/app/api/v1/cron/campaign-sweeps/route.ts:53-77`) — **no downstream delivery exists**: nothing in the repo reads pending notifications for delivery (only a dedupe-existence check in `src/lib/email/creator-match-notify.ts:86`, itself orphaned). These notifications go nowhere.

### 3c. Dunning: does not exist
`invoice.payment_failed` only flips the subscription to `past_due` and logs (`src/app/api/v1/billing/webhook/route.ts:262-274`). No dunning/payment-failed email template exists anywhere in `src/lib/email/` (grep: zero hits for paymentFailed/dunning). Churn-by-card-failure will be silent.

### 3d. Orphaned email machinery (written, never called)
- `src/lib/email/digest.ts` (409 LOC weekly digest) — only consumer is `/api/v1/digest` route, which no cron or UI invokes.
- `src/lib/email/business-qbr.ts`, `src/lib/email/creator-match-notify.ts` — zero callers in `src/app` (grep).
- `src/lib/notifications/channels.ts` (Slack/SMS senders) — zero importers.
- `src/lib/jobs/queue.ts` (472-LOC job queue) + `startAllQueues` (`src/lib/jobs/registry.ts:281`) — still never started anywhere; now merely dead weight since routes consciously bypass it.

### 3e. Re-engagement
None. No win-back, no inactivity email, no "your campaign expired" email to the business (the sweep's in-app row is undelivered, 3b). The day-14 drip step is the last touch a user would ever get — and the drip is broken.

## 4. SEO & agent-discovery surface (blog, guides, glossary, compare/vs, llms.txt, MCP, OpenAPI)

**Verdict: the largest and most complete growth surface — roughly 400+ indexable URLs, properly sitemapped, with real JSON-LD and an unusually serious AI-agent discovery layer. It is index-ready. Two honesty problems poison it: fabricated leaderboard/profile pages built from seed data, and the realistic organic play being mismatched to a pre-launch company with zero domain authority.**

### 4a. Page inventory (all statically generated, all in `src/app/sitemap.ts`)
Counted from data files (entries per file):
- **28 static pages** (`sitemap.ts:22-68`): home, pricing, calculator, case-studies, faq, glossary, benchmarks, security, status, changelog, resources, etc.
- **21 industry pages** `/for/[industry]` (`src/lib/industries.ts`, 21 slugs) — with a deliberate coffee-shop priority bump (`sitemap.ts:81-84`)
- **6 city pages** `/in/[city]` + **city×industry long-tail** `/in/[city]/[industry]` for the 4 priority cities × 21 industries = ~84 pages (`sitemap.ts:86-107`)
- **125 action pages** `/actions/[id]` + 5 action-type pages + **25 platform pages** `/platforms/[id]` (verified programmatically: PLATFORMS = 25 platforms / 125 actions; CLAUDE.md's "15 platforms, 107 actions" is stale) (`sitemap.ts:136-152`)
- **8 blog posts** (`src/lib/blog.ts`), **11 platform-vs-platform comparisons** (`src/lib/comparison-data.ts`), **10 HowTo guides** with Schema.org markup (`src/lib/guides-data.ts`), **18 "best" listicles** (`src/lib/best-data.ts`), **9 competitor "vs" pages** (`src/lib/vs-data.ts`), **7 playbooks** (`src/lib/playbook-data.ts`), **28 single-question /answers pages** (`src/lib/answers-data.ts`), **7 glossary entries**, **21 pricing-oracle pages** (`sitemap.ts:176-181`)
- robots.ts is professional: explicit allow-list for 13 named AI crawlers (GPTBot, ClaudeBot, PerplexityBot...), public API paths exposed, `/c/` and `/dashboard` correctly disallowed (`src/app/robots.ts:30-37,40-60`)

### 4b. Agent-discovery layer (real, working, premature)
- **MCP server**: `/api/mcp`, JSON-RPC 2.0, **10 tools** (`src/app/api/mcp/route.ts:230`, count verified), optional API-key auth, manifest on GET. Claimed registered in the official MCP Registry (`public/llms.txt:17`) — registry listing not verified from repo.
- **OpenAPI 3.1 spec**: `/api/v1/openapi` (`src/app/api/v1/openapi/route.ts:1-24`), CDN-cached.
- **llms.txt** (`public/llms.txt`), **AGENTS.md** (`public/AGENTS.md`), **ai-plugin.json** (`public/.well-known/ai-plugin.json` + route `src/app/.well-known/ai-plugin.json/route.ts`).
- **In-browser MCP sandbox** `/agent/test` + `/agents` landing with Claude Desktop install snippet (`src/app/agent/test`, `src/app/agents/page.tsx`; prioritized 0.85 in `sitemap.ts:40-44`).
- This is a coherent bet on "AI agents buying marketing actions" — technically real, but it serves audience #4 when audiences #2 and #3 aren't built. Zero evidence of agent traffic converting (the tables agents would write to — `agent_sessions`, `agent_queries` — have **0 rows in prod Supabase**).

### 4c. Honesty problems on the public surface
- **/leaderboard is fabricated**: ranks seed-data influencers with earnings synthesized from follower count (`estimateEarnings`, `src/app/leaderboard/page.tsx:29-43`), publishes "Real-time ranking by verified posts" in the meta description (line 12) and "Updated weekly. Creators are ranked by reach and verified posts" on-page (line 78), plus ItemList JSON-LD pushing the fake ranking into Google (lines 47-58). This is the June-2 "fabricated metrics" disease, alive on an indexable page, post-#109 "trust/honesty" remediation.
- **Fake profile pages in the sitemap**: `/b/[slug]` and `/i/[slug]` entries are generated from `createSeedData()` (`sitemap.ts:112-124`, with an in-code comment admitting "Once businesses persist via DB, swap createSeedData()") — Google is invited to index ~15 profiles of businesses and influencers that don't exist.
- **llms.txt also overstates**: "businesses, enterprise brands, and influencers exchange perks" — two of those three audiences aren't operational.

### 4d. Realistic organic play
The machinery (sitemap, JSON-LD, canonical tags, crawler grants) is competently built — better than most seed-stage products. But: domain registered ~2 months, zero backlinks strategy in evidence, 8 blog posts, and the highest-volume target queries ("instagram vs tiktok") are owned by DR-90 publishers. The realistic near-term organic surface is (a) the long-tail /answers and /actions value queries ("what is an Instagram story tag worth") where LLM citation is plausible, and (b) local city×industry pages IF the city pages get real businesses on them. SEO here is a 12-month compounding asset, not a launch channel — it cannot be the loop that finds the first 100 customers.

## 5. PostHog instrumentation — what the founder can actually see

**Verdict: surprisingly good for the acquisition funnel — the founder CAN see a complete pricing→signup→checkout funnel today. But the product's actual value loop (campaign launch → claim → submission → redemption) emits zero named events, so retention/activation is invisible.**

### 5a. What's wired
- Loader: `PostHogLoader` in root layout, gated on `NEXT_PUBLIC_POSTHOG_KEY`, autocapture + pageviews on (`src/components/shared/posthog-loader.tsx:25-35`; mounted `src/app/layout.tsx:6`). Memory/context says PostHog project 443648 is live in prod.
- Typed event helper with exactly **5 known events** (`src/lib/analytics.ts:35-40`):

| Event | Fires at | Citation |
|---|---|---|
| `pricing_cta_click` | pricing card CTA + usage-banner upgrade nudge | `src/components/landing/pricing-section.tsx:185`, `src/components/business/usage-banner.tsx:193` |
| `signup_started` | auth form submit | `src/components/auth/auth-form.tsx:174` |
| `signup_completed` (+ `identify(id, {role})`) | business and influencer signup success | `auth-form.tsx:280-281, 295-296` |
| `checkout_started` | post-signup checkout redirect + banner | `auth-form.tsx:248`, `checkout-banner.tsx:36` |
| `checkout_completed` | return from Stripe with `?checkout=success` | `src/components/business/checkout-banner.tsx:32-36` |

So yes — a funnel (CTA → signup start → signup complete → checkout start → checkout complete) is buildable in PostHog today, plus autocaptured pageviews on every page including /c/ claim pages.

### 5b. Gaps
- **No server-side capture at all** (no posthog-node anywhere). `checkout_completed` depends on the buyer returning to the success page in the same browser; the Stripe webhook — the source of truth — emits nothing to PostHog.
- **Zero value-loop events**: no campaign_launched, no claim_page_viewed (named), no submission_created, no perk_redeemed, no widget events. The entire B2B2C loop in Section 2 is analytically dark except generic autocapture.
- Referral attribution events: none (consistent with the broken chain in Section 1).
- GA4 + Meta Pixel: coded in `src/components/shared/tracking-pixels.tsx` but unconfigured (matches prior memory) — dormant, harmless.
- A server-side `analytics_events` Postgres table exists but only the feedback route writes to it (`src/app/api/v1/feedback/route.ts:59`; table at `src/lib/db/schema.ts:539`) — **0 rows in prod**.

## 6. Gamification: waitlist, invites, achievements, streaks, leaderboards

**Verdict: a real durable waitlist with a correct nurture drip (0 people in it), one honor-system invite-unlock widget, one fabricated leaderboard, and no achievements/streaks/badges anywhere. Perk programs have tiered-reward structure that is the closest thing to a real retention game.**

- **Waitlist: REAL and the best-engineered funnel piece.** `POST /api/v1/waitlist` → durable `waitlist` table (ON CONFLICT keeps drip timestamps, `src/app/api/v1/waitlist/route.ts:94-110`); confirmation email (route.ts:126); day-3/day-7 nurture cron with proper durable dedupe (Section 3b). UI: `WaitlistForm` on the landing CTA section and on city×industry pages (`src/components/landing/cta-section.tsx:68`, `src/app/in/[city]/[industry]/page.tsx:6`). Admin view exists (`src/app/admin/`). **Prod-verified: table exists, 0 rows.**
- **Invites:** the InviteUnlock honor-system widget (Section 2b) is the only invite mechanic; the server-side tracked version is orphaned. No team invites, no influencer-invites-influencer.
- **Achievements / streaks / badges: none.** Repo-wide grep for achievement/streak/badge/level finds only content-data files (blog/glossary/faq) and the UI Badge primitive — no mechanics, no storage, no UI.
- **Leaderboard: exists and is fake** (Section 4c). As a gamification mechanic it's worse than absent — it can't reflect real users because it reads `createSeedData()` at build time (`src/app/leaderboard/page.tsx:37-43`).
- **Follower bonus tiers** (0-499/500+/2K+/10K+/50K+, CLAUDE.md) exist as pricing multipliers in campaign math — status-tier mechanics, but no progression UI or notifications attached.
- **Perk programs** (`src/lib/perk-programs.ts:5-28`) have reward tiers + member progress percent + cycle history — a punch-card/loyalty skeleton, durable since #108 (4 `perk_program`/`program_*` tables in prod, all 0 rows). This is the natural home for streaks/levels if anyone ever builds them.
- **A/B experiment engine** (`src/lib/experiments/index.ts`, `/api/v1/experiments`) — real code, zero UI consumers; nothing on the site actually runs an experiment.

## 7. Verdict: which of these can become a real loop

### Ranked by distance-to-working-loop (closest first)

1. **QR poster + /c/ claim page (B2B2C physical loop)** — Already works end-to-end EXCEPT the business can't get the poster (no UI button, Section 2e). One button = a complete loop: business prints poster → customer scans → claims → posts → friends see post → business's footer-branded claim page acquires the next business. This is THE loop that matches the actual ICP (coffee shops). Distance: hours.
2. **Referral program** — durable tables, dashboard UI, webhook crediting all exist; one missing cookie-read at signup + a truncation bug (Section 1b). Distance: a day. But note: a referral program with 0 users refers nobody — sequence it after first customers, not before.
3. **OG images** — every share surface is silently imageless (SVG content-type, Section 2c). Converting four routes to `next/og` ImageResponse makes every existing share button meaningfully better. Distance: a day.
4. **Embeddable widget** — works except cold-start data loss on `/api/v1/widget/config` (Section 2f). Distance: a day (copy the /c/ page's DB-fallback pattern).
5. **Onboarding drip** — must add a durable sent-ledger BEFORE setting CRON_SECRET/RESEND in prod or it spams (Section 3b). Distance: a day, and it's a prerequisite to safely enabling the crons that already ship.
6. **SEO/agent surface** — index-ready but a 12-month asset; delete or truthify the fabricated leaderboard and seed-profile pages first (Section 4c).
7. **Gamification** — nothing real to extend except perk-program tiers; skip until retention data exists.

### The one-sentence summary
The growth codebase is not missing surfaces — it has more growth surfaces than employees by two orders of magnitude; what it's missing is the last 5% of wiring on each (a poster button, a cookie read, a PNG content-type, a sent-emails table) and the honesty cleanup that #109 claimed but didn't finish on public pages.

## Appendix: prod-DB verification (live Supabase, project wxvlpewrcvzpbhfnfqjq, 2026-06-12)
36 tables exist. Growth-relevant rows: `auth_users` **21**, `waitlist` **0**, `referral_codes` **0**, `referral_attributions` **0**, `referrals` **0**, `business_referral_codes` **0**, `analytics_events` **0**, `agent_sessions`/`agent_queries` **0**, all perk-program tables **0**. Every growth mechanism's durable backing exists in prod; none has ever recorded a single real event.
