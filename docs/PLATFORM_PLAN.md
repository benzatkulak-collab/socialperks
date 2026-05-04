# Social Perks — 50-Phase Platform Plan

**Anchor:** This is not generic SaaS advice. Every phase references actual
files, schema rows, and engines that exist in this repo today.
Phases 1-10 are already shipped (commit `5ab3b11`). Phases 11-50
extend from there.

**Format per phase:**

1. Name
2. Objective (growth / revenue / network effect)
3. Core problem solved
4. Implementation (files / endpoints / flows)
5. Why it unlocks growth
6. Success metric
7. Dependencies
8. Speed estimate

**Self-evaluation cadence:** revisit at phase 10 (✅ done — see commit
`5ab3b11`), 25, and 50.

---

## ALREADY SHIPPED (Phases 1–10) — see commit `5ab3b11`

1. Referral codes — `src/lib/referrals/codes.ts`, `referral_codes` table, `RefCapture` component
2. `/b/[slug]` business public profiles — LocalBusiness JSON-LD
3. `/i/[slug]` influencer profiles — Person JSON-LD, status band
4. `/leaderboard` — top creators + businesses, ItemList JSON-LD
5. Invite-to-unlock viral loop — `<InviteUnlock>` on `/c/[campaignId]`
6. `/in/[city]` programmatic city pages — `src/lib/cities.ts`
7. Dynamic OG cards — `/api/og/business`, `/api/og/influencer`
8. 30-second signup fast path — auth-form skip-role-picker on plan intent
9. Matching engine surface — `/api/v1/matching/suggest`
10. Redemption tracking — `/api/v1/businesses/redemptions`

---

## CHECKPOINT — what we learned from 1-10

- The compliance gate already shipped earlier (commit `1e74809`) means
  the marketplace can't be poisoned by businesses incentivizing Google
  reviews. That's the foundation everything else stands on.
- Public profiles + city pages + leaderboard create a **read surface**
  that is currently ~30 indexable pages. By phase 25 we want that to
  be 1,000+ via city × industry × business combinations.
- Invite-unlock is purely client-side trust right now. Phase 14 makes
  it server-validated.

---

## PHASES 11–25 — Real-customer attribution + first revenue

### Phase 11 — Persist campaign state to Postgres
- **Objective:** revenue blocker
- **Problem:** `campaignManager` (`src/lib/campaign-state-machine.ts`) is in-memory. Every redeploy loses every campaign.
- **Implementation:** new `campaign_lifecycles` table; write-through pattern (mirror `persistSubscription` in `src/lib/billing/store.ts`); `rehydrate()` reads from DB on cold start.
- **Why:** without this, a paying customer's campaign vanishes on Vercel deploy. Existential.
- **Metric:** zero campaign-data loss across 10 consecutive deploys.
- **Dependencies:** `DATABASE_URL` set + `npm run db:migrate` run.
- **Speed:** 4h

### Phase 12 — Persist submissions to Postgres
- **Objective:** revenue blocker
- **Problem:** `src/lib/submissions.ts` uses module-scoped Map.
- **Implementation:** `submissions` table (already in schema); wrap `getSubmissionById`/`reviewSubmission` to read/write through.
- **Metric:** submission survives redeploy.
- **Dependencies:** Phase 11 (so submission FKs to campaign_id work).
- **Speed:** 3h

### Phase 13 — Stripe Connect for influencer payouts
- **Objective:** revenue + status
- **Problem:** when an influencer earns, there's no actual money movement.
- **Implementation:** `connectedAccounts` table; `POST /api/v1/payouts/onboard` creates a Stripe Express account; webhook listener for `account.updated`; `payoutEngine.executePayout` triggers `stripe.transfers.create` instead of the mock.
- **Metric:** first real $ paid to an influencer (target: 1 by phase 25).
- **Dependencies:** Stripe Connect approved on the platform account (you).
- **Speed:** 6h code + 2 weeks Stripe review

### Phase 14 — Server-validated invite-unlock
- **Objective:** trust
- **Problem:** Phase 5 unlock is localStorage-only — easy to game.
- **Implementation:** new `referral_attributions.invited_by_share` flag. Each share generates a unique URL `?via=<campaignId>:<shareToken>`. When that URL produces a verifiable view (cookie set, IP differs from sharer), bump count server-side.
- **Metric:** % of unlocked perks that came from real distinct visitors > 60%.
- **Dependencies:** Phase 11 (campaigns persisted), Phase 1 (referrals).
- **Speed:** 4h

### Phase 15 — Pre-built campaign templates per city × industry
- **Objective:** activation, programmatic content
- **Problem:** new businesses still face "what should I run?"
- **Implementation:** generate per-city defaults — DC coffee shops get Instagram-story templates with example copy; Arlington salons get TikTok before/after templates. Source: `src/lib/campaign-templates.ts` × `src/lib/cities.ts` cross-product.
- **Metric:** time-to-first-launched-campaign median < 90 seconds.
- **Speed:** 6h

### Phase 16 — `/in/[city]/[industry]` 2D city × industry pages
- **Objective:** programmatic SEO
- **Problem:** there's only ~24 cities × 1 page each. The keyword volume is in long-tail — "social media marketing for coffee shops in DC" has more total searches than the top 1,000 head queries combined.
- **Implementation:** new dynamic route. Reuse `INDUSTRY_MAP` × `listCities()` cross-product. ~480 indexable pages.
- **Metric:** indexed pages > 500 within 60 days of launch.
- **Speed:** 3h

### Phase 17 — Real influencer earnings ledger
- **Objective:** status (replaces the Phase 3 estimate with actual numbers)
- **Implementation:** `influencer_earnings` table; insert row on every approved submission with `amount`, `campaign_id`, `business_id`, `awarded_at`. The `/i/[slug]` page reads from it instead of estimating.
- **Metric:** estimated-vs-actual delta < 20%.
- **Dependencies:** Phase 12.
- **Speed:** 3h

### Phase 18 — Influencer dashboard: "shareable wins"
- **Objective:** virality
- **Implementation:** `/dashboard` for influencers gets a "Last paid: $X from {business}" card with a one-click share button → opens a Twitter/IG-story compose with the OG card from `/api/og/influencer`.
- **Metric:** share-button click rate > 8% per session.
- **Dependencies:** Phase 17.
- **Speed:** 3h

### Phase 19 — Auto-suggest top-3 influencers in launch modal
- **Objective:** liquidity
- **Implementation:** when a business hits "Customize & Launch" (`src/components/business/launch-modal.tsx`), call `/api/v1/matching/suggest` (Phase 9) with the campaign's platform + business location, surface the matches as a "We'll notify these creators" preview.
- **Metric:** influencer-side notification-to-submission conversion > 12%.
- **Speed:** 4h

### Phase 20 — Email influencers when a matched campaign launches
- **Objective:** liquidity (the missing supply-side trigger)
- **Implementation:** when `campaign.created` event fires, run matching, dispatch Resend emails to top-N matched creators. Reuse `src/lib/email/index.ts`. Deduplicate so a creator gets at most 1 email per business per week.
- **Metric:** time from campaign launch → first influencer view < 4h.
- **Dependencies:** `RESEND_API_KEY`, Phase 19.
- **Speed:** 4h

### Phase 21 — In-store QR poster with auto-generated copy
- **Objective:** SMB activation
- **Implementation:** `qr-generator.tsx` already exists; extend it to render a printable PDF with QR + brand-aware copy ("Scan to claim 15% off — post about us"). Endpoint `/api/v1/businesses/poster?campaignId=`.
- **Metric:** print-to-scan ratio (track via QR with referral code).
- **Speed:** 4h

### Phase 22 — Slack/SMS notifications for businesses on submissions
- **Objective:** retention
- **Implementation:** SSE `/api/v1/events` (exists). Add SMS via Twilio (new env vars), Slack via incoming webhook URL. User picks one in settings.
- **Metric:** business-side review latency from submission < 6h median.
- **Speed:** 6h

### Phase 23 — Verification by webhook from Instagram + TikTok
- **Objective:** trust + automation
- **Implementation:** Phase 4 OAuth (already shipped) lets businesses connect their Instagram. Use it to call IG Graph API to verify the proof URL actually exists, the post mentions the business, and disclosures are present. `src/lib/verification/` has the rate-limited fetcher already.
- **Metric:** verification time < 5 min for 95% of submissions.
- **Dependencies:** OAuth credentials registered (you).
- **Speed:** 8h

### Phase 24 — Programmatic blog: city × industry case-study scaffolding
- **Objective:** SEO + trust
- **Implementation:** new `/blog/[slug]` route. Each post is a structured doc auto-rendered from a campaign that has > 50 completions. Title format: "How [Business Name] in [City] got [N] customer posts in [N] days using Social Perks". Initially gated behind a manual `featured: true` flag.
- **Metric:** organic blog traffic > 5k/mo by phase 50.
- **Speed:** 5h

### Phase 25 — CHECKPOINT
Re-evaluate. Likely findings:
- Liquidity bottleneck: do we have enough creators in city X for the campaigns there?
- Conversion drop-off: is the influencer email landing in spam? CTR < 5% means yes.
- Real-money latency: how long from approved submission → Stripe payout? Should be <24h.

---

## PHASES 26–35 — Defensible network effects

### Phase 26 — Influencer-to-business referral flywheel
Influencers earn 10% of MRR for businesses they refer for 12 months. New table: `mrr_attributions`. Surface in influencer dashboard.

### Phase 27 — Business → business referral
Existing `referral_codes` already supports this. Add reward: 1 free month per converted referral, capped at 6.

### Phase 28 — Tiered creator status
Bronze/Silver/Gold/Platinum based on lifetime earnings. Visible on `/i/[slug]`. Unlocks early access to high-budget campaigns.

### Phase 29 — Top-of-funnel ad-style "audition" submissions
Influencer can submit a sample post on a sample campaign before any business hires them. Goes to a public showcase. Drives quality + audition energy.

### Phase 30 — Performance-based featuring on `/leaderboard`
Top 3 creators by 7-day momentum (delta in earnings) get a pinned spot. Dynamic, refreshes daily.

### Phase 31 — Submission feed: TikTok-style discover
`/feed` route showing approved submissions across all campaigns. Tap a post → lands on `/c/[campaignId]` to participate.

### Phase 32 — Local-pack scrape protection
Schema: add `served_local_pack_at` to track when our pages enter Google's local pack. Alert on de-rank.

### Phase 33 — Creator earnings transparency report
Monthly: total $ paid out, average per creator, geographic distribution. Public-facing page. Builds trust + recruits creators.

### Phase 34 — Embeddable widget for businesses
`<script src="/widget.js">` already exists in `public/widget.js`. Extend: businesses paste a `<div data-sp-campaign="...">` on their own site to surface their active perk + claim button.

### Phase 35 — Competitor-comparison schema
On `/pricing`, add structured-data table comparing CPC of paid Instagram ads vs. Social Perks cost-per-completion. Real numbers.

---

## PHASES 36–50 — Scale + automation

### Phase 36 — Postgres-backed waitlist drip already exists (`src/lib/email/waitlist-drip.ts`); add day-14 + day-30
### Phase 37 — Campaign auto-extend: when a campaign is at 90% of cap and >50% of expiry, auto-prompt the business to extend
### Phase 38 — Auto-pause on plan downgrade: business drops to Free, oldest campaigns past Free's "1 active" limit auto-pause with email
### Phase 39 — Scheduled QBR emails to paying businesses: campaigns shipped, customers reached, ROI estimate
### Phase 40 — Public Status page (`/status`) reading from `/api/v1/health/readiness`
### Phase 41 — Multi-location for Enterprise tier — `business_locations` table, dashboard switcher
### Phase 42 — Brand compliance review queue (already scaffolded in `src/components/enterprise/brand-content-review.tsx`); wire to real submissions
### Phase 43 — API keys for businesses (already scaffolded in `src/components/enterprise/api-keys-section.tsx`); persist
### Phase 44 — Webhook deliveries for businesses (e.g. POST to your Slack on submission events)
### Phase 45 — Influencer mobile PWA — `manifest.json` exists; add Add-to-Home-Screen prompt + camera capture for proof URL
### Phase 46 — Auto-translate campaign copy (DeepL/OpenAI) for multi-language cities (Miami EN/ES, Montreal EN/FR)
### Phase 47 — Affiliate program for agencies who bring in 10+ businesses (separate from Phase 27 1:1 referrals)
### Phase 48 — Reputation portability: signed receipt of "creator earned $X over Y months on Social Perks" — exportable
### Phase 49 — Marketplace search (`/discover`) — typeahead across businesses + influencers + cities
### Phase 50 — CHECKPOINT — by now: 100+ paying businesses, $50k MRR target, 500+ creators with positive earnings

---

## What this plan deliberately does NOT include

- **Mobile native app** — PWA carries you to phase 50+. Native is post-50 if data justifies.
- **Multi-region deploy** — Vercel edge handles US/EU. Scale later.
- **Custom CRM** — businesses use Stripe + email; your CRM is your DB.
- **AI-generated influencer profiles** — phase-1 trust killer. Real profiles only.
- **Crypto / token / NFT layer** — every variant of this kills SMB conversion.

---

## How to pick up this plan

Each phase has the file paths it touches. Resume by:
1. Read the existing referenced file
2. Add the schema row / table noted in the phase
3. Run `npm run db:migrate`
4. Implement the route / component
5. Verify: `npx tsc --noEmit && npm run lint && npx vitest run`
6. Commit with the phase number in the message
