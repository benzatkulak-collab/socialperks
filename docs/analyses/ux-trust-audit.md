# UX audit: trust signals, friction points, and the "looks like a billion-dollar platform" gap

> **Scope caveat — read before everything else.** This audit is a static read of JSX/Tailwind across `src/app/` and `src/components/`. I did not run the dev server, take screenshots, click anything, or watch a real user. Where rendered behavior is the deciding factor — animation timing, contrast at 200% zoom, real-device mobile feel, motion sickness, perceived latency on slow networks — I flag it as **needs visual review** instead of guessing. Code-visible facts (class names, copy, conditional renders, ordering of elements, what the empty state says) are fair game; the rest is honestly hedged.

---

## 1. The headline read

Social Perks is legible as **"competent indie product, week-1 of public launch"**, not as a dominant platform. The bones are good: Tailwind discipline is consistent, design tokens applied uniformly, every portal has a `SectionErrorBoundary`, every list has a skeleton, every fetch has an `AbortController` with a 10s timeout, every async surface has an SR-only `aria-live`. Someone has been thinking.

What it does *not* yet feel like — based on static evidence — is inevitable. Three macro reasons:

1. **The hero positions a tactic, not a category.** `"Your customers love you. Pay them to say it online."` ([`hero.tsx:25-31`](../../src/components/landing/hero.tsx#L25-L31)) vs Stripe's `"Financial infrastructure for the internet"`. The Real-example card ([`hero.tsx:74-92`](../../src/components/landing/hero.tsx#L74-L92)) shows `Maria's Coffee Shop. 89 posts. $0 ad spend.` — concrete, but small. There is no platform-aggregate number ("$X processed in customer-paid marketing"). Until that number exists, the page must compensate; right now it doesn't.

2. **The dashboards have the right widgets but the wrong density.** `BusinessPortal` is centered in `max-w-3xl` ([`portal.tsx:424`](../../src/components/business/portal.tsx#L424)) — narrower than Stripe's overview, Linear's main pane, Mercury, or Vercel. Enterprise gets `max-w-7xl` ([`enterprise/portal.tsx:154`](../../src/components/enterprise/portal.tsx#L154)), correct — but the $49/mo Pro user also needs to feel they're operating something serious.

3. **The trust scaffolding is defensively honest.** Pricing reassurance strip is `"FTC-compliant"`, `"30-day money-back"`, and candidly `"Onboarding the first 10 coffee shops by hand"` ([`pricing-section.tsx:163-176`](../../src/components/landing/pricing-section.tsx#L163-L176)). Third pill is right for *this* stage. `social-proof.tsx` results are all anonymized — code comment says `// Using anonymized results instead of fake testimonials` ([`social-proof.tsx:6-9`](../../src/components/landing/social-proof.tsx#L6-L9)). Morally right. Competitively, it needs to be *replaced*, not just rationalized.

---

## 2. Surface-by-surface audit

### 2.1 Marketing landing — `src/app/page.tsx`

| Axis | Finding | Cite |
|---|---|---|
| Trust signals | Pricing strip uses "Onboarding the first 10 coffee shops by hand" as a virtue. Smart at this stage; needs a sunset plan. No customer logos anywhere. No SOC2 / GDPR / "data hosted in US" badges. | [`pricing-section.tsx:163-176`](../../src/components/landing/pricing-section.tsx#L163-L176) |
| Information hierarchy | Hero → PlatformShowcase → HowItWorks → AudienceSections → SocialProof → Pricing → CTA. Pricing is fifth. For a "free to start" product that is fine, but it means every prospect sees *four* "examples" sections before a price. Examples appear in `audience-sections.tsx` AND `social-proof.tsx` AND embedded in `hero.tsx`. Same coffee-shop story is told three times with slightly different numbers (`89 posts/3mo` in hero vs `200+ stories/month` in social-proof for the same "Coffee shop" archetype). | [`page.tsx:14-22`](../../src/app/page.tsx#L14-L22), [`hero.tsx:82`](../../src/components/landing/hero.tsx#L82) vs [`social-proof.tsx:27`](../../src/components/landing/social-proof.tsx#L27) |
| Onboarding friction (visible) | Two CTAs on hero: `Create Your First Campaign` → `/dashboard#signup`, and `join the early-access list →` to a waitlist. Two paths is one too many for a hero — needs visual review for which dominates eye. | [`hero.tsx:42-64`](../../src/components/landing/hero.tsx#L42-L64) |
| Emotional response | Copy is warm ("your customers love you"). Page is dark and monospace-accented. The combination is unusual but coherent — feels like Bloomberg-for-bodega, which is on-brand. The agent ticker on the enterprise portal ([`enterprise/portal.tsx:173`](../../src/components/enterprise/portal.tsx#L173)) reinforces this; it does NOT exist on the small-biz portal, where it could and probably should — the live feed of "Maria's Coffee just paid $4 to Sarah for an Instagram story" creates platform-density. | — |
| Speed perception | Hero uses `animate-fade-up` with delays of 100/200/300/400ms ([`hero.tsx:33-67`](../../src/components/landing/hero.tsx#L33-L67)). Total LCP-equivalent stagger is 400ms+ before the `Real example` card lands. Opinion: the stagger is too leisurely for a pitch page. Stripe's hero is essentially instant. **Needs visual review on a slow connection.** | [`hero.tsx:67`](../../src/components/landing/hero.tsx#L67) |
| Status signaling | Pricing toggle defaults to annual (line 89 comment is honest about why: 20% revenue uplift). `Save 20%` pill is shown but the absolute dollar savings only renders inside each card ("Save $118/yr vs. monthly"). Strong move — most SaaS hides the absolute number. | [`pricing-section.tsx:234-238`](../../src/components/landing/pricing-section.tsx#L234-L238) |

**Specific issues:**

- **The hero Real-example card ([`hero.tsx:67`](../../src/components/landing/hero.tsx#L67)) is too quiet** — `bg-brand-surface/40` and `border-brand-border/50` is the generic-content-card treatment. The page's single most persuasive visual gets divider weight.
- **Numbers contradict across sections.** `audience-sections.tsx` and `social-proof.tsx` both feature Coffee shop, Yoga, and Salon archetypes with subtly different numbers (`89` vs `200+/month` for the same coffee-shop story). Subconscious discount.
- **No SOC2/GDPR/data-residency pills** outside the FAQ. ~20 lines of code; meaningful enterprise signal.

---

### 2.2 Business portal — `src/components/business/portal.tsx` + `portal-home.tsx`

| Axis | Finding | Cite |
|---|---|---|
| Trust signals | SSE-connected indicator is a 2px green pulse with `title="Live"` ([`portal.tsx:398`](../../src/components/business/portal.tsx#L398)). Linear/Vercel pair the same dot with a text label. The pulse alone reads as decoration. | — |
| Information hierarchy | Top-left: logo + Dashboard/Analytics tabs. Top-right: avatar + dot + bell + Log Out. Center H1 `{biz.name}` at `text-2xl/3xl italic` ([`portal.tsx:431`](../../src/components/business/portal.tsx#L431)). | — |
| Onboarding friction | `OnboardingWizard` is 3 steps × 2-4 fields. Min interactions: 4 clicks + 1 numeric input. Linear-grade tight. | [`onboarding-wizard.tsx:208-510`](../../src/components/business/onboarding-wizard.tsx#L208-L510) |
| Onboarding friction (subtle) | Wizard mounts unconditionally on cold start as a `fixed inset-0 z-50` modal blocking the dashboard ([`portal.tsx:365`](../../src/components/business/portal.tsx#L365)). Code comment notes "user testing surfaced the wizard as a friction point" ([`onboarding-wizard.tsx:226-229`](../../src/components/business/onboarding-wizard.tsx#L226-L229)) — they raised the skip-link prominence in response. The mount-blocking remains. | — |
| Emotional response | `ConfettiEffect` on first launch ([`onboarding-wizard.tsx:84-105`](../../src/components/business/onboarding-wizard.tsx#L84-L105)) is right for a coffee shop. The wizard doesn't branch by audience — same confetti for enterprise. | — |
| Enterprise readiness (in business portal) | None. No team invites, no roles, no audit-log surface, no SSO toggle, no test/live switcher. | — |
| Speed perception | `DashboardSkeleton` renders on initial load. Optimistic UI on launch even if the network call silently fails ([`portal.tsx:236-242`](../../src/components/business/portal.tsx#L236-L242)). Aggressive but defensible. | — |
| Status signaling | Launch toast: `"${name}" is live!` ([`portal.tsx:265`](../../src/components/business/portal.tsx#L265)), 4s timeout, no CTA. Successful action with nowhere to go. Stripe/Linear toasts always carry a CTA. | — |
| Conversion-flow weakness | The big dashed-border "Create a new campaign" button ([`portal-home.tsx:203-210`](../../src/components/business/portal-home.tsx#L203-L210)) is duplicated by a "Build a campaign →" button in the empty state below. Two CTAs, one redundant. | — |

**Specific issues:**

- **H1 `text-2xl italic` mobile / `text-3xl` desktop** ([`portal.tsx:431`](../../src/components/business/portal.tsx#L431)). Two-to-three size steps below Stripe/Vercel for workspace identity. Token is right; size is timid.
- **Top bar in `max-w-5xl`** ([`portal.tsx:377`](../../src/components/business/portal.tsx#L377)) holding logo + tabs + avatar + live dot + bell + Log Out reads as cramped on 14"+ displays. **Needs visual review.**
- **Six action buttons per campaign row** (Edit/Pause/Resume/End/Share + status pill, [`portal-home.tsx:240-345`](../../src/components/business/portal-home.tsx#L240-L345)). Stripe collapses to a kebab when >3.
- **`window.confirm()` for "End campaign"** ([`portal-home.tsx:299`](../../src/components/business/portal-home.tsx#L299)). The single biggest "hobby project" tell in the codebase. Every serious platform replaced native confirms in 2018.

---

### 2.3 Influencer portal — `src/components/influencer/portal.tsx`

| Axis | Finding | Cite |
|---|---|---|
| Information hierarchy | H1 `Hey, {displayName}` in pink ([`portal.tsx:373-375`](../../src/components/influencer/portal.tsx#L373-L375)) → 4 stats → platforms → pink "Get Started" card. `Hey,` is creator-coded, not operator-coded. A creator at $5K MRR doesn't want greeting; they want MRR. | — |
| Trust signals | Tier badge next to logo ([`portal.tsx:342`](../../src/components/influencer/portal.tsx#L342)) is good. No verification badge, no "Trusted by N brands". Dispute flow exists ([`portal.tsx:592-613`](../../src/components/influencer/portal.tsx#L592-L613)) but "Dispute sent" goes nowhere — no status, no SLA, no ticket number. Shouted-into-a-void energy. | — |
| Onboarding friction | There is **no** influencer onboarding wizard equivalent to `OnboardingWizard`. New influencer lands directly on dashboard with empty stats. The "Get Started" card on line 403-410 is the only nudge. | [`portal.tsx:403-411`](../../src/components/influencer/portal.tsx#L403-L411) |
| Status signaling | Submission status is one of `pending / approved / rejected` ([`portal.tsx:573`](../../src/components/influencer/portal.tsx#L573)). No SLA shown ("typical review time: 4 hours"). No "in review by AI / in review by human" granularity even though the AI review pipeline exists per `CLAUDE.md`. The creator sees a binary outcome with no visibility into what's happening. | — |
| Enterprise readiness | n/a for creators; but there's also no team-account concept (a creator agency managing 5 creators has nowhere to go). | — |

**Specific issues:**

- **Discover filters are only search + platform + effort** ([`portal.tsx:429-461`](../../src/components/influencer/portal.tsx#L429-L461)). No reward-value filter, no business-type filter, no saved searches, no sort. The creator's primary money-finding surface has fewer filters than a job board.
- **The "no submissions" empty state describes what the user should do**; Linear-grade empty states *demonstrate the product* with a fake row.
- **Dispute textarea is `rows={2}`** ([`portal.tsx:599-602`](../../src/components/influencer/portal.tsx#L599-L602)) with no proof-upload, no preset reasons. A wronged creator hits this with rage-fuel; the constraint reads as "we're not really reading this."
- **`Hey, marcus` never evolves.** Good for month 1, bad for month 12. Stripe/Linear shift greetings by user maturity.

---

### 2.4 Enterprise portal — `src/components/enterprise/portal.tsx` + `dashboard.tsx`

| Axis | Finding | Cite |
|---|---|---|
| Information hierarchy | Top bar: Logo + `Enterprise` purple badge + company name. Sub-nav tabs: Dashboard / Locations / Reports / Brand / API. `AgentTicker` plays underneath. This is correct enterprise vocabulary. | [`portal.tsx:153-173`](../../src/components/enterprise/portal.tsx#L153-L173) |
| Trust signals | The plan badge ("Professional", "Enterprise") in `dashboard.tsx:101-108` is well-handled. The brand-compliance score is a circular ring with traffic-light coloring ([`dashboard.tsx:152-184`](../../src/components/enterprise/dashboard.tsx#L152-L184)) — good. No SOC2/audit-log/SSO mention in chrome. The data model has `sso: true/false` flags ([`src/lib/multi-tenant/index.ts:206`](../../src/lib/multi-tenant/index.ts#L206)) but **no SSO toggle in any visible UI**. SSO exists only in tests and seed data. | — |
| Onboarding friction | None visible. There's no enterprise onboarding flow at all — no "schedule kickoff", no "configure your tenant", no "invite teammates" first-run experience. Code uses `useEnterpriseData` to materialize a tenant, but the onboarding handshake is invisible. | [`portal.tsx:101-115`](../../src/components/enterprise/portal.tsx#L101-L115) |
| Enterprise readiness | The `API` tab exists with `apiKeys`, `webhooks`, `usage` ([`portal.tsx:230-241`](../../src/components/enterprise/portal.tsx#L230-L241)) — strong. No team-member listing, no roles, no audit-log viewer (despite `audit-log.ts` existing in `src/lib/`), no IP allowlist, no SAML config. The enterprise customer sees marketing data only. | — |
| Status signaling | `ErrorBanner` ([`portal.tsx:65-81`](../../src/components/enterprise/portal.tsx#L65-L81)) is non-blocking with a Retry button. Excellent pattern. `EnterpriseSkeleton` is real and has the right structure ([`portal.tsx:24-61`](../../src/components/enterprise/portal.tsx#L24-L61)). | — |

**Specific issues:**

- **Enterprise card routes to `/contact?intent=enterprise`** ([`pricing-section.tsx:67-83`](../../src/components/landing/pricing-section.tsx#L67-L83)). No Calendly, no SLA promise (99.9% uptime mentioned once, [`pricing-section.tsx:290`](../../src/components/landing/pricing-section.tsx#L290)). Prospect has zero confidence anyone is on the other end.
- **`Add Location` is a noop**: `onAddLocation={() => { /* In production this would persist via API */ }}` ([`portal.tsx:194-196`](../../src/components/enterprise/portal.tsx#L194-L196)). If the demo is what closes the deal, this stub is the deal-killer.
- **No environment switcher (test/live mode)** anywhere in chrome. The QA story is "trust us." That doesn't ship to enterprise.

---

### 2.5 Authentication — `src/components/auth/auth-form.tsx`

| Axis | Finding | Cite |
|---|---|---|
| Trust signals | Form has email + password (with min-8 validation). PIN auth is still wired as fallback (`pinJson` block, [`auth-form.tsx:126-141`](../../src/components/auth/auth-form.tsx#L126-L141)) per `CLAUDE.md` "PIN auth deprecated". The fallback is invisible to users but the existence in code is a tell. | — |
| Onboarding friction | The plan-intent handoff is genuinely good — pricing CTA → `/dashboard#signup?plan=professional&period=annual` → form pre-routes to business signup → after signup, immediately POSTs to `/api/v1/billing` for checkout creation ([`auth-form.tsx:180-210`](../../src/components/auth/auth-form.tsx#L180-L210)). That funnel is properly stitched. Comment on line 184-189 explicitly notes "the funnel was previously broken here." | — |
| Status signaling | Generic `"Invalid email or password."` on failure ([`auth-form.tsx:143`](../../src/components/auth/auth-form.tsx#L143)). Acceptable for security; no "did you mean to sign up?" affordance though. | — |

---

### 2.6 Empty states — fragmented

`ui/empty-state.tsx` is a primitive (`icon/title/description/actionLabel`). It's used inconsistently — five different empty-state implementations:

- Business analytics ([`analytics-overview.tsx:79-110`](../../src/components/business/analytics-overview.tsx#L79-L110)) inlines its own.
- Influencer earnings ([`influencer/portal.tsx:552-558`](../../src/components/influencer/portal.tsx#L552-L558)) inlines its own with an emoji.
- Influencer filter "no results" ([`influencer/portal.tsx:507-511`](../../src/components/influencer/portal.tsx#L507-L511)) is a bare `<Card>` with one line.
- Notifications ([`notification-center.tsx:225-254`](../../src/components/shared/notification-center.tsx#L225-L254)) inlines a bell SVG.

Five shapes. They share a vibe but not a structure. Linear's empty states are unforgettable because they always do the same three things in the same order. Social Perks' tell the user "different teams shipped different sections."

### 2.7 Notifications — `notification-center.tsx`

Competent. Connection indicator dot on the bell ([`:159-164`](../../src/components/shared/notification-center.tsx#L159-L164)) is good. Unread badge is `bg-red-500` ([`:148`](../../src/components/shared/notification-center.tsx#L148)) — the only raw Tailwind color outside `brand-*` tokens. Tiny break from the design system. `relativeTime` ([`:33-49`](../../src/components/shared/notification-center.tsx#L33-L49)) maxes out at "Nd ago" — a 30-day-old notification reads `30d ago` instead of a date. No filter, no group-by-type, no clear-all. 50+ notifications is a scrolling tunnel.

### 2.8 Mobile — pattern review

Coverage is uneven:

- `OnboardingWizard` is `max-w-xl mx-4 max-h-[90vh]` ([`onboarding-wizard.tsx:222-225`](../../src/components/business/onboarding-wizard.tsx#L222-L225)). On 360px wide with step indicator + skip + scrolling content, the indicators may wrap awkwardly. **Needs visual review on iPhone SE.**
- `EnterpriseDashboard` stat grid is `grid-cols-2 lg:grid-cols-4` ([`dashboard.tsx:120`](../../src/components/enterprise/dashboard.tsx#L120)) — on 768-1024px tablets, sits at 2 cols when 3-4 would fit.
- Notification panel `w-80` with no mobile breakpoint ([`notification-center.tsx:172-178`](../../src/components/shared/notification-center.tsx#L172-L178)). Edges out on 320px iPhone SE. **Needs visual review.**
- `enterprise/portal.tsx:160` hides the company name on mobile (`hidden sm:block`). For a multi-location enterprise switching tenants, that's a problem — confusing tenants is expensive.
- `sw-register.tsx` registers a service worker but there's no install-prompt UI.

---

## 3. The "vs Stripe / Linear / Vercel" comparison — five micro-interactions

**3.1 The create button.** Vercel: a single `+` opens a cmd-K-style overlay. Linear: `C` shortcut, global. Social Perks has *two* "Create" CTAs on the business home — the 184px dashed card and a duplicate button in the empty state ([`portal-home.tsx:203-210`](../../src/components/business/portal-home.tsx#L203-L210), `portal-home.tsx:408-413`) — plus a templates grid plus the forced-modal wizard. Grep confirms **zero** `kbd`/`⌘`/`cmd` references in components. The dashboard's primary verb has no keyboard shortcut.

**3.2 The empty dashboard.** Stripe shows a fake transaction list ("this is what your data will look like") + 3 setup tasks with progress bars. Social Perks stacks five sections: welcome card → templates → create button → empty list → reassurance card ([`portal-home.tsx:130-415`](../../src/components/business/portal-home.tsx#L130-L415)). The reassurance card duplicates the primary CTA.

**3.3 The error toast.** Linear toasts persist + offer Retry/Report inline. Vercel includes a request ID. Social Perks: `"Failed to launch campaign. Please try again."` ([`portal.tsx:232`](../../src/components/business/portal.tsx#L232)), 4s auto-dismiss, no retry, no error code, no support link. Plan-limit failures get a modal (`reportPlanLimit`, line 228) — everything else, the user is dropped.

**3.4 The status pill.** Stripe pills are rounded-full, dot-leading, four explicit states. Social Perks campaign pills `active / paused / ended` ([`portal-home.tsx:336-344`](../../src/components/business/portal-home.tsx#L336-L344)) have no leading dot — but the SSE "Live" indicator on the top bar ([`portal.tsx:398`](../../src/components/business/portal.tsx#L398)) IS a dot with no text. Two visual languages for "status".

**3.5 The login screen.** Stripe login lives on a page bigger than the form, padded with "Trusted by 1.5M businesses" + customer logos. Social Perks `auth-form.tsx` is just the form — no logos, no statistic, no "secured by" line. **Needs visual review** for what fills the viewport, but nothing in the JSX surfaces proof at the highest-anxiety moment in the funnel.

---

## 4. Conversion-critical paths, ranked

| # | Path | Cite | What to change | Expected impact |
|---|---|---|---|---|
| 1 | **Pricing card → signup → checkout** | `pricing-section.tsx:264-282` → `auth-form.tsx:180-210` | The funnel is wired well, but the pricing card "Most Popular" bar and the *absence of a trial* could hurt. CTA on the Pro card is "Start Free" same as the Free tier card — the only differentiator is the absolute price. Make Pro card CTA "Try Pro free for 14 days" or differentiate visually, since identical CTAs flatten the choice. | High. Pricing-page→checkout is THE conversion event. Same CTA on Free and Pro is reading-disambiguation friction. |
| 2 | **Hero CTA → first campaign launched** | `hero.tsx:42-47` → `app.tsx` (router) → `OnboardingWizard` | Wizard is forced-modal and can't be reopened from the dashboard later. If a user skips, the create-campaign flow is the 3-step `PortalCreate` ([`portal-create.tsx:80-287`](../../src/components/business/portal-create.tsx#L80-L287)) which is *more* steps than the wizard (it adds a separate platform-then-action selection on step 1, 8 platforms × 5 actions = 40 buttons). | High. Add a "show me the wizard again" affordance and make the platform/action picker on `portal-create.tsx` step 1 use the same 4-platform shortlist as the wizard does. |
| 3 | **Empty analytics → "what should I do?"** | `analytics-overview.tsx:79-110` | Current empty state shows 4 stat cards all reading `0` with descriptive subtext, then a chart-icon empty state with one CTA. Show ONE benchmark line for the user's industry instead — "Coffee shops typically see 47 completions in their first month. You have 0 because you haven't launched yet." | High. Activation. |
| 4 | **Submission → approval/rejection** | `influencer/portal.tsx:573-585` → no-op | Influencer waits in opaque limbo. No SLA shown, no "ETA: ~4 hours", no AI-vs-human label. When rejected, the dispute textarea is 2 rows with no presets. | High. Creator retention. |
| 5 | **Enterprise contact → first conversation** | `pricing-section.tsx:79` → `/contact?intent=enterprise` | The contact form is the entire enterprise pipeline. No Calendly embed, no "schedule a 15-min demo" surface, no SOC2 link. | Medium-high — small N, large $ per N. |
| 6 | **Campaign launched → first customer scan** | `portal-home.tsx:203-210` → no follow-up | After launch, the toast says `live!` for 4s. There is no "Print your QR code" call-to-action *immediately after launch* — the QR generator exists at `business/qr-generator.tsx` but isn't surfaced post-launch. | Medium. Activation. |
| 7 | **Notification → action** | `notification-center.tsx:265-303` | Click marks as read, no navigation. A `submission.created` notification doesn't link to that submission. The user manually navigates. | Medium. Daily-active retention. |
| 8 | **Free → Pro upgrade trigger** | `plan-limit-modal.tsx` (referenced from `portal.tsx:413`) | The plan-limit modal exists and is summoned on 403 responses. Not seen — but the `reportPlanLimit` integration is the right shape. The risk is: *if* the modal triggers only at the limit (50 completions), the user has already had the success — they can wait. Consider a soft nudge at 70-80% of limit. | Medium. Revenue. |

---

## 5. The redesign brief (≤500 words)

If I could change three things to move perceived-platform-value the most:

### 5.1 Make the workspace feel inhabited

The single biggest "this is small" tell is the empty `max-w-3xl` business dashboard ([`portal.tsx:424`](../../src/components/business/portal.tsx#L424)) on cold start. The fix is not "bigger container." The fix is: **make it impossible for the dashboard to be empty.**

On day 0, before any campaign, populate the dashboard with: (a) an industry benchmark widget ("Coffee shops in DC averaged 47 completions last week — yours can match this"), (b) an `AgentTicker` showing other live businesses' activity (the component already exists at `src/components/shared/agent-ticker.tsx`, used only on Enterprise), (c) a "what's happening on the platform" feed sourced from the SSE stream that's already running. Take the *three things that already exist* and put them on the empty dashboard. The user immediately senses they're a node in a network, not a lone wolf.

Code locations: `portal.tsx:427-456` is the home render; the ticker import would go right after the toast block on line 422. The benchmark API is `/api/v1/benchmarks` per `CLAUDE.md`. Effort: ~1 day.

### 5.2 Build a single chrome-level command surface

Add a global cmd-K palette and a persistent "+ New" button in the top bar. Every primary action — create campaign, view analytics, search submissions, switch business, contact support — accessible from one keystroke. This is the single highest-leverage change to make Social Perks feel like Linear/Vercel rather than a Webflow site.

Concrete implementation: a new `<CommandPalette />` mounted in `portal.tsx` parallel to `<NotificationCenter />`, listening for `Cmd+K`. Add `data-shortcut="c"` annotations on the create buttons in `portal-home.tsx:203` and `portal.tsx:381`. Effort: ~3-5 days.

This also kills the duplicate-create-CTA problem in section 4.

### 5.3 Replace the candor with calibrated authority

The `"Onboarding the first 10 coffee shops by hand"` strip ([`pricing-section.tsx:174`](../../src/components/landing/pricing-section.tsx#L174)) is right for the next 30 days and wrong for month 4. Replace it with three rotating slots: (1) cumulative platform stats ("$X processed in customer-paid marketing in the last 30 days"), (2) one named customer with a real quote and a face (not anonymized), (3) a security/compliance badge cluster (SOC2 in progress, FTC, GDPR, US-hosted).

The data already exists — `analytics-engine.ts` aggregates events; the financial ledger tracks dollars. Wire `/api/v1/benchmarks` (or a new `/api/v1/platform-stats` route) into a stats strip on landing and inside the dashboard chrome. Until you have one named coffee shop willing to say their name, the candor strip stays — but the moment Maria says yes, she goes on the homepage.

This also fixes the "every example is anonymized" problem in section 2.1.

— end —
