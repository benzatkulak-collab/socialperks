# Funnel Walkthrough — Brutal Conversion Audit (verified against code 2026-06-12)

Repo root: `/Users/benzatkulak/Desktop/social-perks/.claude/worktrees/hardcore-meitner-9898b1` (branch `claude/hardcore-meitner-9898b1`, post-PR #108/#109).
Method: every claim below cites file:line from the current tree (verified with Read/grep on 2026-06-12, not inherited from the June-2 audit). Status: COMPLETE.

## 0. TL;DR / First Value Moment

**The funnel is a beautifully-built ramp into a void.** Landing → signup → onboarding wizard → "campaign live" confetti is genuinely strong (~4-6 min, mobile-competent, honest pricing handoff, PostHog-instrumented). Everything AFTER the confetti is broken: there is no QR-poster button (the API exists, no UI calls it), the customer proof form demands a pasted URL with no upload, the public submit endpoint 404s live campaigns on cold lambdas, the submission queue is write-only to Postgres and evaporates from every read path on cold start, the business has NO review UI (only an admin console it can't access), the only approve button awards no perk and sends no email (missing request fields), and an anonymous customer has no surface to ever view or redeem a perk. **The product's true First Value Moment — a real customer post redeemed for a real perk — is unreachable in the shipped code.** Day-2 retention is additionally killed by dashboard amnesia: campaign lists/stats/analytics read in-memory state that resets on every deploy, so a returning owner sees their work erased. Re-engagement exists (welcome email + cron'd day-1/3/7/14 drip) but its dedup state is an in-memory Map, so once real users exist it would re-send the same emails daily. PR #108/#109 fixed durability for the /c/ page render and the (auth-only) perk wallet, and replaced fake named testimonials with fake *anonymized* ones — the June-2 cold-start finding is at best one-third remediated, and fabricated social proof still headlines the landing page as "Real numbers from real campaigns."

**Verdict for the reinvention decision**: keep the wizard + claim-page + billing scaffolding; the loop's back half (submission → review → award → redeem) needs to be rebuilt on durable reads with a business-facing review surface and a customer-facing perk surface — roughly 5 fatal breaks, none of which is large individually, but all five must land before a single real customer can complete the journey the homepage sells.

## 1. Step 1 — Visitor lands (/, landing page)

**What renders** (`src/app/page.tsx:13-66`): Nav → Hero → PlatformShowcase → HowItWorks → AudienceSections → SocialProof → developer/MCP strip → PricingSection → CtaSection → Footer.

**Hero** (`src/components/landing/hero.tsx`):
- Headline: "Your customers love you. / Pay them to say it online." (hero.tsx:25-31). Clear, concrete, good.
- Primary CTA "Create Your First Campaign" → `/dashboard#signup` (hero.tsx:43-47). NOT a dead link anymore (June-2 audit found dead "Get Started") — verified it points to dashboard with `#signup` fragment.
- Risk-reversal line: "Free to start. No credit card. Takes 5 minutes." (hero.tsx:56-57) plus a waitlist escape hatch (`#waitlist`, hero.tsx:58-63).
- **FABRICATED SOCIAL PROOF**: "Real example — Maria's Coffee Shop … 89 customer posts, $0 ad spend, 3 mo" (hero.tsx:69-93). There are 0 real users; this is invented and labeled "Real example". Trust landmine for any diligent visitor.

**Other landing sections**:
- SocialProof (`src/components/landing/social-proof.tsx:21-58`): four "results" cards — "Coffee shop, Washington DC, 200+ stories/month", "Hair salon +180% bookings", "Taqueria 4x ROI vs ads" — headed by "Real numbers from real campaigns" (social-proof.tsx:83). The file's own comment admits these are invented: "Using anonymized results instead of fake testimonials with fake names. Replace with real testimonials when you have them" (social-proof.tsx:6-8). With 0 users, this is still fabricated social proof presented as real — the June-2 "AI-washing/fabricated metrics" finding survives on the landing page in anonymized form.
- CtaSection (`src/components/landing/cta-section.tsx:48-53`): second "Create Your First Campaign" → `/dashboard#signup`; plus an honest, well-scoped waitlist: "We're onboarding the first 10 independent coffee shops by hand" (cta-section.tsx:61-69, WaitlistForm `vertical="coffee_shops"`). This is the single most honest piece of copy in the funnel and contradicts the fabricated results cards two scrolls above it.
- Trust chips: "Free to start / 5-minute setup / No credit card / Works for any business" (cta-section.tsx:72-89). "Works for any business" clashes with the coffee-shops-only waitlist positioning.
- Developer/MCP strip on the marketing homepage (`src/app/page.tsx:27-59`) — "For developers + AI agents", "Try MCP in browser" — audience confusion injected between social proof and pricing for a mom-and-pop visitor.

**Mobile**: hero and sections use responsive classes throughout (`sm:` breakpoints, full-width CTA buttons `w-full sm:w-auto`, hero.tsx:44,50). Landing mobile experience is competent.

## 2. Step 2 — Signup (auth flow)

**Routing**: `/dashboard` renders the entire client SPA `SocialPerksApp` (src/app/dashboard/page.tsx:5-7). Default screen is `"landing"` (app.tsx:157) — i.e. /dashboard without a session shows a SECOND COPY of the landing page (app.tsx:133-148,351). A hash listener flips to the auth screen for `#login`/`#signup` (app.tsx:274-287), after a "Loading Social Perks..." gate while localStorage + session restore resolve (app.tsx:332-346, 5s restore timeout app.tsx:85).

**CONVERSION BUG — signup CTA lands on the LOGIN screen.** `#signup` and `#login` are handled identically (app.tsx:277) and `AuthForm`'s internal state initializes to `"login"` (src/components/auth/auth-form.tsx:34). A first-time visitor who clicks "Create Your First Campaign" sees "Welcome back — Log in to your account" (auth-form.tsx:386-387) and must find the small "Sign up free" link at the bottom (auth-form.tsx:411-415) to actually sign up. Exception: pricing-page CTAs encode `#signup?plan=...` which fast-paths to the business signup form (auth-form.tsx:73-90). The PRIMARY hero CTA has no plan param, so the main funnel entrance is mislabeled.

**Signup flow once found**: role picker (business vs creator, auth-form.tsx:498-604) → 4-field form (Business Name, Business Type free-text, Email, Password ≥8 chars; auth-form.tsx:622-635). Minimal and good. Terms/Privacy links present (auth-form.tsx:643-648). Plan-intent → Stripe checkout handoff is wired (auth-form.tsx:208-273) with graceful degradation copy if billing is unconfigured: "Billing isn't quite set up yet — we'll email you when it's live" (auth-form.tsx:262) — honest, but it means a BUYER WITH A CREDIT CARD OUT cannot pay today (price IDs still unset per business context).

**Friction/risks**:
- Role picker is an extra decision gate; "I'm a creator" path leads to the half-built influencer portal — a leak for the only monetizable audience.
- Demo accounts advertised on the production login screen: "Try a demo account … Password for all: 1234, yoga@demo.com…" (auth-form.tsx:418-433). Signals "toy product" to a real SMB owner; also the demo accounts log into the same prod backend.
- Business Type is a free-text field (auth-form.tsx:631) feeding tip personalization that only matches 10 hardcoded strings (`TIPS` map, src/components/business/dashboard.tsx:33-54) — "coffee shop" lowercase or "Café" gets the generic fallback.
- PostHog funnel events exist: `signup_started` (auth-form.tsx:174), `signup_completed` (auth-form.tsx:281), `checkout_started` (auth-form.tsx:248). Good.
- Password reset UI is complete (auth-form.tsx:441-495) with anti-enumeration always-success (auth-form.tsx:317) — backend send path needs verification (see §12).

## 2a. STATE ARCHITECTURE CAVEAT (affects every step below)

The portal's user object and campaign list live in localStorage (`useLocalStorage("sp-v2")`, app.tsx:153-156) merged with API hydration. On session restore the business name/type fall back to email prefix unless found in seed (app.tsx:232-254). Campaigns DO hydrate from the server (portal.tsx:182-251) — the June-2 "deletes itself on cold start" finding is meaningfully remediated for campaigns; durability of the rest is checked per-step below.

## 3. Step 3 — Onboarding / first campaign (wizard)

**This is the strongest part of the product.** A modal wizard auto-opens for any business with zero campaigns (`portal.tsx:529-537`, dismiss persisted per-business in localStorage portal.tsx:138-145).

- Step 1: pick platforms — 5 "most popular" (IG/TikTok/FB/YT/X, onboarding-wizard.tsx:42) + "show more" toggle; Google/Yelp deliberately excluded with a thoughtful ToS rationale in comments (onboarding-wizard.tsx:44-50). Compliance-aware by construction.
- Step 2: per-platform reward (%/$ off or free item with description, onboarding-wizard.tsx:548-667) with live preview "Customers who Post an Instagram Story get 15% off" (onboarding-wizard.tsx:643-648). Defaults pre-filled (15% — onboarding-wizard.tsx:101); campaign name auto-generated (onboarding-wizard.tsx:202-210).
- Step 3: review → "Launch Campaign" → real `POST /api/v1/campaigns` per platform (onboarding-wizard.tsx:304-320), error surfaced inline (724-731), 15s timeout (289).
- Success: confetti + "Your first campaign is live! Customers can start earning rewards right away." → "Go to Dashboard" (onboarding-wizard.tsx:750-786).

Time from signup-form-submit to live campaign: ~60-90 seconds, 3 screens. Genuinely good.

**THE CRITICAL GAP — the wizard celebrates and then drops the user at the exact moment of peak motivation.** The success screen has no share link, no QR code, no poster — only "Go to Dashboard" (onboarding-wizard.tsx:781-783). A live campaign is worthless until a customer sees it; the product's own welcome card says step 2 is "Print the QR code on your poster" (portal-home.tsx:190-193), but:

## 4. Step 4 — Sharing with customers (QR poster, link)

**THE FUNNEL'S BROKEN LINK: the QR poster has an API but NO BUTTON.**
- A real, well-built poster generator exists: `GET /api/v1/businesses/poster?campaignId=...` returns a printable 8.5"×11" SVG with a scannable QR (errorCorrectionLevel M) pointing at the claim URL (src/app/api/v1/businesses/poster/route.ts:2-92, uses the `qrcode` package, route.ts:17).
- ZERO UI references to it. The only mention outside the route itself is marketing copy in a blog post claiming a "Print Poster button" exists in the dashboard (src/lib/blog.ts:220). `grep -rn "businesses/poster" src` confirms no component calls it.
- The onboarding welcome card explicitly instructs: "Print the QR code on your poster — Stick it where customers will see it" (portal-home.tsx:190-193) and the empty state promises "your first scan usually happens within a day of putting the QR code up" (portal-home.tsx:439-442). The user is told to do something the UI provides no way to do.
- The ONLY sharing affordance is a small icon button per campaign card that copies `{origin}/c/{campaignId}` to clipboard (portal-home.tsx:348-368, URL built at 74-80). It's an unlabeled icon among 4 other icon buttons (edit/pause/resume/end) — easy to miss, and `navigator.clipboard` requires a secure context and can silently fail (no `.catch` on portal-home.tsx:139-143).

**Second copy-vs-reality lie at this step**: welcome step 3 says "the customer gets their perk via SMS" (portal-home.tsx:197). SMS sending is a Twilio wrapper that no-ops with `twilio_not_configured` when env vars are absent (src/lib/notifications/channels.ts:12,57) — pre-launch, Twilio is not configured, so this promise is false in production.

**Dead widget**: the "Website Widget" embed-code card renders only when `plan && plan !== "free"` (portal-home.tsx:389-398) but `portal.tsx` never passes a `plan` prop (grep "plan" in portal.tsx → only PlanLimitModal at portal.tsx:16,607) — so the embed widget can never render for anyone. Dead feature behind a prop that's never wired.

## 5. Step 5 — Customer claim page /c/[id]

**The page itself is good — and it's the ONLY durable read in the loop.** Server-rendered, mobile-first (max-w-lg), business identity + big reward card + days-remaining + FTC disclosure (src/app/c/[campaignId]/page.tsx:182-356). Campaign lookup falls back in-memory → event-store rehydrate → Postgres `loadLifecycle` (page.tsx:62-75) — survives cold starts. Real business names resolve via auth_users fallback (page.tsx:33-55). Action picker correctly scoped to the campaign's own actions (page.tsx:144-155). Ended/expired campaigns get a graceful state (page.tsx:245-269). A viral InviteUnlock loop offers +5%/+$2 for sharing (page.tsx:287-299). OG metadata for link sharing (page.tsx:79-113).

**But the customer ask is enormous relative to the reward**: "Post about [business] on social media, then share the link below" (page.tsx:277-280). The customer must leave the page, create an Instagram story/post, figure out how to get a LINK to it (IG stories don't have user-visible URLs), come back, and paste it. For "screenshot" proof the form demands a hosted URL — placeholder literally says "https://imgur.com/..." (submit-form.tsx:245-247). **There is no file upload anywhere.** A coffee-shop customer will not upload a screenshot to imgur to get 10% off. This single design choice probably kills the majority of organic customer conversions.

## 6. Step 6 — Proof submission

Form: email + proof-type toggle + proof URL + optional notes + honeypot (submit-form.tsx:135-318). Posts to `POST /api/v1/submissions/public` (submit-form.tsx:67). Success state: "Submission Received! You'll be notified when it's reviewed. Check your email for updates." (submit-form.tsx:122-128). **The customer walks away with nothing in hand** — no perk code, no wallet link, no timeline. Whether that promise is kept is examined below (spoiler: it is not).

**COLD-START 404 ON THE MONEY PATH**: the public route validates the campaign with `campaignManager.getState(cv.data)` ONLY (src/app/api/v1/submissions/public/route.ts:67) — no `rehydrate()`, no `loadLifecycle()` DB fallback (contrast with the page, page.tsx:62-75). `getState` is a pure in-memory Map read (src/lib/campaign-state-machine.ts:491-493). On Vercel, the API lambda that receives the POST is routinely a different/cold instance from the one that rendered the page → "Campaign not found" (404) for a perfectly live campaign. The customer sees the reward, does the work, and the submit button errors.

**Submissions are write-only durable**: the engine is "in-memory Map (canonical) + DB write-through" (src/lib/submissions.ts:8-9,27), `persistSubmission` fires-and-forgets (submissions.ts:300), and `src/lib/submissions/persist.ts` exports ONLY `persistSubmission` (persist.ts:29) — there is no load function and no call site reads submissions back from Postgres. Any cold start erases the pending review queue from every read path (`GET /api/v1/submissions` reads the Map via `getSubmissions`, src/app/api/v1/submissions/route.ts:106).

## 7. Step 7 — Business approval

**THE BUSINESS HAS NO REVIEW UI AT ALL.** The business portal has exactly three surfaces: Dashboard, Analytics, Programs link (portal.tsx:554-577). Grep for approve/reject across `src/components/business/` returns nothing but comments (portal.tsx:63, portal-analytics.tsx:154). The only approve/reject UI in the product lives in the ADMIN console (`src/app/admin/submissions/page.tsx:300-310`), which is gated to `role === "admin" || role === "enterprise"` (src/components/admin/admin-guard.tsx:49) — a normal business owner cannot reach it.

What the business gets instead: a transient SSE toast "New submission received!" if they happen to have the dashboard open at that moment (portal.tsx:170-174). No queue, no list, no email, no badge. **The welcome card papers over this with "Submissions are reviewed automatically" (portal-home.tsx:197) — there is no automatic review pipeline wired to the public submission path** (no call from `createSubmission` or the public route into `/api/v1/ai/review`; grep confirms zero auto-review triggers in submissions.ts / public/route.ts).

## 8. Step 8 — Perk award

**Approval doesn't award perks in practice.** `POST /api/v1/submissions/review` only awards a perk `if (decision === "approve" && body.campaign)` — the caller must POST the full campaign object (src/app/api/v1/submissions/review/route.ts:115). It only emails the customer `if (body.submitterEmail)` (review/route.ts:175). The ONLY existing client — the admin console — sends `{submissionId, reviewerId, decision, note}` and neither field (src/app/admin/submissions/page.tsx:304-309). Therefore, end to end:

- approve in the only UI that exists → submission flips to "approved" → **no perk is created, no email is sent, the event publisher fires and nothing else happens** (review/route.ts:191-198).
- The customer who was told "Check your email for updates" never receives anything.

The award/persist machinery itself is real and durable when invoked (`awardPerk` + `persistPerk` → `perk_wallet_entries`, review/route.ts:148-162; wallet hydration src/app/api/v1/wallet/route.ts:26) — it is simply never invoked correctly by any UI.

## 9. Step 9 — Redemption

**An anonymous customer can never see or redeem a perk.** Perks are awarded to `submission.userId`, which for /c/ submissions is a synthetic `cust_<sha256(email)>` id (public/route.ts:107-108). The wallet API requires an authenticated session (`requireAuth`, wallet/route.ts:22) and the only wallet UI is inside the logged-in influencer portal (src/components/influencer/perk-wallet.tsx). There is no public wallet page, no magic-link, no "show this code at the register" surface, no staff-side verification screen (`ls src/app` shows no wallet/redeem/perk route). PR #108's "durable perk-wallet vertical" closes the loop only for registered influencers — NOT for the QR-scanning customers the entire SMB pitch is built on.

**Net: the core value loop is broken in four independent places downstream of campaign launch** (cold-start 404 on submit; review queue evaporates; approval awards nothing; redemption unreachable). The product, as shipped, is a campaign-launcher with a well-decorated dead end behind it.

## 10. Step 10 — Repeat usage / day-2 & day-7 return reasons

**There is no reliable reason to return, and a strong reason NOT to.**

- Day-2 reality: the dashboard stats and campaign list both come from `GET /api/v1/campaigns`, which reads the in-memory `campaignManager.listByBusiness()` (campaigns/route.ts:67,77) — `loadLifecyclesForBusiness` exists in src/lib/campaign-state-machine/persist.ts:62 but has ZERO call sites (grep across src). The event store rehydrate path is also in-memory (`private events: PlatformEvent[] = []`, src/lib/events.ts:102, comment "In-memory store now" events.ts:5). So after any redeploy/cold start, a returning business sees **0 active campaigns, 0 completions, "No analytics yet"** (portal-analytics.tsx:282, which also reads /campaigns at :120; use-business-dashboard.ts:26 same). Their campaign still exists in Postgres (the /c/ page works) but the dashboard says their work vanished. This is the single most retention-toxic bug in the product.
- Even if state survived: stats would be 0 anyway because no submission can complete the loop (§6-9). Nothing accumulates, so there's nothing to check on.
- The Analytics tab is derived arithmetic over the same campaign list ("Approval rate" is *estimated* from completions, portal-analytics.tsx:154-156) — no real event data.
- Notifications: `NotificationCenter` is SSE-only (notification-center.tsx:4,55); no history store, nothing persists across sessions. Closed tab = notification never existed.
- Programs tab links to /programs (portal.tsx:571-576) — a separate perk-program surface unrelated to the campaign funnel the wizard just set up; a second mental model for a day-1 user.

## 11. Step 11 — Upgrade-to-paid prompt

The upgrade machinery is unusually well-designed *on paper*:
- Pricing CTAs encode plan intent: `/dashboard#signup?plan=X&period=Y`, default-annual (pricing-section.tsx:169,415-428) → signup fast-path → Stripe checkout handoff (auth-form.tsx:208-254) → `CheckoutBanner` confirms on return (checkout-banner.tsx:29-54).
- `UsageBanner` is a proactive pre-limit prompt with informational/warning/blocking tiers (usage-banner.tsx:4-23) fetching `get_usage` from billing (usage-banner.tsx:98; route handler api/v1/billing/route.ts:276).
- `PlanLimitModal` catches 403 PLAN_LIMIT_EXCEEDED globally and routes to upgrade (plan-limit-modal.tsx:72,132-149; mounted portal.tsx:610).

But in practice:
- **Checkout cannot complete**: Stripe price IDs/keys unset in prod (business context, unchanged since 2026-06-02); the code's own fallback says "Billing isn't quite set up yet — we'll email you when it's live" (auth-form.tsx:262). A motivated buyer hits a polite wall.
- **No persistent path to billing**: the portal nav is Dashboard/Analytics/Programs/Logout only (portal.tsx:554-597). `/dashboard/billing` exists (src/app/dashboard/billing/page.tsx) but is linked only from inside the plan-limit modal fine print (plan-limit-modal.tsx:148-149) and usage-banner CTAs. A user who simply *wants* to pay can't find the door.
- **Limits under-count**: plan enforcement counts campaigns via the in-memory manager (src/lib/billing/enforcement.ts:179) — after cold starts, usage resets to 0, so the upgrade triggers (80%/100% banners) may rarely fire. The free tier is effectively unlimited by accident.

## 12. Re-engagement (email lifecycle, notifications)

- **Welcome email (day 0)**: real, sent inline on signup (src/app/api/v1/auth/route.ts:282), via Resend when `RESEND_API_KEY` is set, else console no-op (src/lib/email/index.ts:325-330).
- **Onboarding drip (day 1/3/7/14)**: sequences defined (src/lib/email/drip.ts:78 "Don't miss out — create your first campaign today", etc.), and a real Vercel cron schedules it daily at 15:00 (vercel.json:7 → src/app/api/v1/cron/onboarding-drip/route.ts), gated on CRON_SECRET (route.ts:31-38; 503 if unset — whether it's set in prod is unverifiable from code).
- **DRIP DEDUP IS IN-MEMORY → daily duplicate spam risk**: `markSent`/`hasSent` use a module-level `Map` (drip.ts:264-285) with no durable table anywhere (grep `drip_sends|sent_state` → nothing). Every cron run lands on a fresh lambda where `hasSent()` is always false, so a day-8 user is "due" day-1, day-3 AND day-7 emails **every single day**. The first real users would be carpet-bombed.
- **Drip conditions read in-memory campaign state**: `hasCampaigns` comes from `campaignManager.listByBusiness` (api/v1/drip/route.ts:91-94) — empty on the cron's cold lambda, so "you haven't created a campaign yet" nags would go to users who have.
- **Password reset**: UI complete; backend issues a token and emails a link (auth/route.ts:493-539) — but tokens live in an in-memory `Map` (auth/route.ts:40). A cold start between "send" and "click" invalidates every outstanding reset link. On Vercel this makes reset a coin flip.
- **Submission review notifications**: only sent if the caller passes `submitterEmail` (review/route.ts:175) — no caller does (§8). Dead.
- No re-engagement push/SMS (Twilio unconfigured no-op, channels.ts:57); no digest actually wired to business users' real activity (digest exists as `/api/v1/digest` but is not on the cron schedule — vercel.json:4-9 lists only waitlist-drip, campaign-sweeps, onboarding-drip, agents).

## 13. Error states / empty states / mobile

- Mobile: consistently competent — responsive classes throughout landing (hero.tsx:23,41), wizard grid `grid-cols-2 sm:grid-cols-3` (onboarding-wizard.tsx:448), claim page is mobile-first `max-w-lg` (page.tsx:207). No hamburger-menu audit done but Nav has a mobile branch (nav.tsx:241+).
- Error handling: ErrorBoundary at app root (app.tsx:94-129), SectionErrorBoundary per portal section (portal.tsx:625,662,698), launch errors inline in wizard (onboarding-wizard.tsx:724-731), timeouts on launch (10s portal.tsx:337, 15s wizard:289). Above average.
- Empty states: dashboard empty state with encouraging copy (portal-home.tsx:434-449) — but the copy lies about the QR code (§4). Analytics has "No analytics yet" (portal-analytics.tsx:282).
- `?demo=1` query param flips the whole app into seeded fake-data mode and persists via `sp-demo-mode` (app.tsx:65-79) — handy for demos, a confusing landmine if a user ever lands on a ?demo=1 link and later wonders why fake businesses are in their marketplace.
- Clipboard copy has no failure handler (portal-home.tsx:139-143) — on non-HTTPS/denied-permission contexts the "Copy link" silently does nothing.

## 14. First Value Moment + funnel timing

- Steps from landing to "campaign live" confetti: land → CTA → (mislabeled login screen → find "Sign up free") → role pick → 4 fields → wizard 3 steps → confetti. **~4-6 minutes, 8-10 interactions.** The "5-minute setup" claim (cta-section.tsx:79) is roughly honest.
- But "campaign live" is a SYNTHETIC value moment — value = a real customer post + redemption, and that can currently never happen end-to-end (§5-9). The true First Value Moment is **unreachable in the shipped product**. Everything before it is excellent stagecraft.
- Effort-before-value asks: account creation before seeing any campaign preview (no sandbox/guest mode — the demo accounts partially serve this but are hidden behind a "Try a demo account" toggle on the login screen, auth-form.tsx:418-433, and advertise PIN 1234 which undercuts credibility).
- For the CUSTOMER side, effort-before-value is extreme: make a public social post BEFORE receiving any perk, with manual URL-paste proof and an unverifiable email promise afterwards (§5-6).

## 15. Friction inventory (ranked by funnel damage)

1. **Loop never closes** — submission 404s on cold lambda (public/route.ts:67), review queue evaporates (submissions/persist.ts has no reader), business has no review UI (only /admin, admin-guard.tsx:49), approval awards nothing (admin page omits `campaign`/`submitterEmail`, admin/submissions/page.tsx:304-309 vs review/route.ts:115,175), anonymous customers can't see/redeem perks (wallet requires auth, wallet/route.ts:22). FATAL × 5.
2. **Dashboard amnesia** — campaign list/stats/analytics all read in-memory state that dies on every deploy (campaigns/route.ts:67; loadLifecyclesForBusiness never called). Kills day-2 retention. FATAL.
3. **No QR poster button** — the product's own onboarding instructs printing a QR poster (portal-home.tsx:190-193); the API exists (api/v1/businesses/poster/route.ts) but no UI calls it. The bridge from "campaign live" to "customer sees it" is missing. FATAL for activation.
4. **Customer proof = paste-a-URL** — no upload, imgur placeholder (submit-form.tsx:245-247); IG-story links are not a thing normal customers can produce. SEVERE.
5. **#signup lands on login screen** (app.tsx:277 + auth-form.tsx:34). SEVERE, trivial fix.
6. **Drip dedup in-memory → daily duplicate emails** (drip.ts:264). SEVERE the moment real users exist.
7. **Checkout 503 / billing unset** (auth-form.tsx:260-263 fallback; env unset per context). SEVERE for revenue, known.
8. **Fabricated "Real numbers from real campaigns"** on landing (social-proof.tsx:83,21-58) + "Real example" hero card (hero.tsx:69-93). Trust risk, contradicts the honest 10-coffee-shops waitlist (cta-section.tsx:66).
9. Copy promises unbuilt features: SMS perk delivery (portal-home.tsx:197 vs channels.ts:57), automatic review (portal-home.tsx:197), blog's "Print Poster button" (blog.ts:220). MODERATE.
10. Password reset tokens in-memory (auth/route.ts:40). MODERATE.
11. No billing link in portal nav (portal.tsx:554-577). MODERATE.
12. Dead embed-widget card (plan prop never passed, portal-home.tsx:389 vs portal.tsx:631-654). MINOR.
13. Demo accounts + PIN advertised on prod login (auth-form.tsx:425-431). MINOR.
14. Developer/MCP strip mid-landing-page for an SMB audience (page.tsx:27-59). MINOR.
