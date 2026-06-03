# Social Perks — Full UX Audit (Phase 3)

**Auditor role:** Principal UX Designer (brutally honest, evidence-based)
**Method:** READ-ONLY static review of JSX/classes/handlers/state. App was not run.
**Status of product:** PRE-LAUNCH, 0 users. Many backend stores are in-memory, so dashboards render empty/placeholder data in practice — empty/loading/error handling is therefore weighted heavily.

---

## 1. The real page surface (routes under `src/app`, excluding `/api`)

There are **~80 page files**. This is a vast public surface for a 0-user product. Grouped:

### Core product (the actual app)
- `/` (`app/page.tsx`) — **static** marketing landing (server component). Renders `Nav`, `Hero`, `PlatformShowcase`, `HowItWorks`, `AudienceSections`, `SocialProof`, a developer/MCP strip, `PricingSection`, `CtaSection`, `Footer`.
- `/dashboard` (`app/dashboard/page.tsx`) — renders `<SocialPerksApp/>`, the **client SPA shell** that switches between landing / auth / business / influencer / enterprise *screens* via React state (`src/components/app.tsx`). This is where login/signup actually happens.
- `/dashboard/billing`, `/dashboard/api-keys`, `/dashboard/agents` — standalone authed sub-pages (client.tsx + page.tsx pairs).
- Auth: there is **no `/login`, `/signup`, or `/reset` route**. Auth is a state machine inside `auth-form.tsx` reached via `/dashboard#login` / `/dashboard#signup`.

### Audience portals (rendered inside the SPA, not their own routes)
- Business portal: `components/business/portal.tsx`
- Influencer portal: `components/influencer/portal.tsx`
- Enterprise portal: `components/enterprise/portal.tsx`

### Admin (real routes, 19 pages)
`/admin` + `/admin/{agents,users,businesses,influencers,campaigns,submissions,programs,exchange,billing,referrals,fraud,compliance,audit,system,api-keys,feature-flags,settings,founder}`. Most are real (fetch + tables). `/admin/settings` is a `ComingSoon` placeholder. `/admin/founder` exists outside the nav registry.

### Public / shareable
- `/c/[campaignId]` — customer campaign claim page (real, server-rendered, DB fallback). **This is the most important conversion surface and it's well built.**
- `/i/[slug]` — public influencer profile (seed-data only; earnings are heuristic placeholders).
- `/b/[slug]` — public business profile.
- `/ref/[code]` — referral capture.
- `/agent/{authorize,test}`, `/agents`, `/docs/mcp` — developer/MCP surface.

### Reference / standalone product pages
`/pricing`, `/calculator`, `/contact`, `/programs`, `/exchange`, `/analytics`, `/leaderboard`, `/platforms`(+`/[platformId]`), `/actions`(+`/[actionId]`,`/type/[type]`), `/benchmarks`, `/pricing-oracle`(+`/[businessType]`), `/campaigns/[campaignId]`.

### SEO / content (large, mostly programmatic — likely thin/placeholder)
`/blog`(+`/[slug]`), `/guides`(+`/[slug]`), `/playbook`(+`/[slug]`), `/answers`(+`/[slug]`), `/best`(+`/[slug]`), `/compare`(+`/[slug]`), `/vs`(+`/[slug]`), `/for`(+`/[industry]`,`/[industry]/on/[platform]`), `/in/[city]`(+`/[industry]`), `/case-studies`, `/changelog`, `/glossary`, `/faq`, `/resources`, `/status`, `/security`, `/about`, `/accessibility`, `/privacy`, `/terms`.

### Infra
`/error.tsx`, `/global-error.tsx`, `/not-found.tsx`.

> **IA verdict at a glance:** the *core* funnel (landing → claim page → portal) is solid and thoughtfully built. But the product is buried under a giant SEO/content + developer/agent + exchange/programs surface that has no coherent place in the primary navigation, and the multi-audience model is hidden behind ambiguous entry points.

---

## 2. Onboarding & registration walk-through

### Signup path (business)
`Nav "Get Started"` / `Hero "Create Your First Campaign"` → `/dashboard#signup` → `auth-form.tsx`:
1. **Screen `signup` (role picker):** "I'm a business" / "I'm a creator" + a tertiary "Enterprise? See a demo" link.
2. **Screen `signup-form`:** Business Name, Business Type (free-text), Email, Password (min 8). One screen, 4 fields. Good.
3. On submit → `POST /api/v1/auth` → if a `planIntent` exists, hands off to Stripe checkout; else drops into the business portal.
4. **First-run:** `OnboardingWizard` (`components/business/onboarding-wizard.tsx`) auto-opens as a modal for businesses with 0 campaigns — a real 3-step guided wizard (pick platforms → set rewards → launch) with a confetti success state. **This is genuinely good onboarding.**

**Counts:** role-pick (1 click) → form (4 fields) → wizard (3 steps). Reasonable. Friction is low. Copy is plain-spoken and on-brand for mom-and-pop.

### Strengths
- Plan-intent persistence (`sp:planIntent`) survives navigation; pricing → signup → checkout funnel is wired (`auth-form.tsx:202–273`).
- Wizard pre-fills campaign names, validates per-platform rewards, has a live preview, and persists "dismissed" per business (`portal.tsx:138–145`).
- Welcome card with a numbered 3-step path on the empty dashboard (`portal-home.tsx:166–202`).

### Problems
- **No business-type structure.** "Business Type" is free text (`auth-form.tsx:631`). This feeds template selection and AI; free text → inconsistent data and weaker template matching. Should be a select/typeahead.
- **No email verification / no password confirm field.** A typo'd email = a locked-out account with no recovery path that works (reset emails go nowhere). For a paid product this is risky.
- **Login is brittle and confusingly dual-pathed.** `handleLogin` (`auth-form.tsx:93–162`) tries password, and on failure silently retries the *same* credential as a PIN. PIN auth is deprecated (per CLAUDE.md) yet still the documented demo path ("Password for all: 1234"). Mixed mental model.
- **Reset password is a dead end UX.** `forgot-success` always claims "We sent a reset link" (`auth-form.tsx:472–495`) — correct for enumeration safety, but there is **no actual reset-token entry page** anywhere in `src/app`. A user who clicks the email link has nowhere coherent to land.
- **Influencer onboarding is thin.** Influencers get a basic signup (name/email/password) and land on a dashboard, but there's **no guided first-run** equivalent to the business wizard — just a static "Get Started → Discover Campaigns" card (`influencer/portal.tsx:424–432`). Profile (bio, niches, platforms, rate card) is empty and there's no prompt to complete it, even though completeness drives matching.
- **Enterprise has no signup at all** — only "See a demo" which jumps straight into the portal with no auth (`app.tsx:319, 377–382`). Fine as a sales demo, confusing as a product path.

---

## 3. Navigation & IA

### Public nav (`components/shared/nav.tsx`)
- Only 4 links: How It Works, Examples, Pricing, Contact. Clean.
- **CRITICAL bug — dead "Get Started" on the homepage.** Nav "Get Started" uses `href="#signup"` (`nav.tsx:152`) and the mobile one too (`nav.tsx:277`). The **only** `hashchange` listener that converts `#signup`→auth lives inside `SocialPerksApp` (`app.tsx:274–287`), which is **not mounted on the static `/` page**. So on the homepage, clicking the primary "Get Started" CTA scrolls to a non-existent `#signup` anchor and does nothing. (Hero's CTA is fine — it uses `/dashboard#signup`.) Log In correctly uses `/dashboard#login`. **The single most prominent nav CTA is broken on the landing page.**
- Mobile menu is well done: focus styles, `aria-expanded`, body-scroll lock, resize-close.

### Footer (`components/shared/footer.tsx`)
- 14 links in one flat wrap including "For developers" and "Try MCP" — re-surfaces the developer audience the homepage tried to de-emphasize. No grouping/columns; reads as a link dump.

### Multi-audience switch
- There is **no explicit audience switch in the UI.** Audience is inferred at signup (role picker) and at login (JWT role → screen). A logged-out visitor cannot say "I'm a creator" from the nav — they must click Get Started → role picker. The landing's `AudienceSections` describe three audiences but there's no persistent "For Businesses / For Creators / For Enterprise" nav, so the three-audience promise isn't navigable.
- **Two landing pages exist and diverge** (`app/page.tsx` vs the `Landing` component in `app.tsx:133–148`). The static one has `PlatformShowcase` + the MCP strip; the SPA one doesn't. Maintenance hazard and inconsistent first impression depending on entry route.

### In-portal nav
- Business portal top bar: Dashboard / Analytics tabs + Programs + Exchange links + notifications + logout (`portal.tsx:554–584`). Logo and business badge are now clickable "home" affordances (good, recent fix). Only 2 real tabs — lean and clear.
- Influencer: 5 tabs (Dashboard/Discover/Earnings/Wallet/Profile) with count badges — good.
- Enterprise: 5 tabs (Dashboard/Locations/Reports/Brand/API) — good.

### Admin IA — **major problem on mobile**
- `AdminSidebar` is `hidden lg:flex` (`admin-sidebar.tsx:12`) with **18 nav items across 6 groups**, and **there is no mobile nav fallback** — the `AdminTopbar` has only a title + logout, **no hamburger/drawer** (`admin-topbar.tsx`). On any screen <1024px the entire admin console is **unnavigable** except by typing URLs. (Grep for drawer/hamburger in admin returns only detail-panel `UserDrawer`/`InfluencerDrawer`, not navigation.)
- 18 flat items is also a lot; the grouping helps but several pages are stubs/placeholder, inflating perceived surface.

> **IA verdict:** coherent *inside* each portal, incoherent *across* the product. The three-audience story isn't navigable, the primary landing CTA is dead, two landings diverge, and admin has no mobile navigation.

---

## 4. Dashboards (empty / loading / error handling)

This is the strongest area, and it matters most given in-memory stores.

### Business (`portal.tsx`, `portal-home.tsx`)
- **Loading:** `DashboardSkeleton` while `useBusinessDashboard` loads (`portal.tsx:633`). Good.
- **Empty:** Stats hidden until campaigns exist; welcome card + template picker + dashed "Create campaign" + a reassurance empty-state card (`portal-home.tsx:153–450`). Genuinely thoughtful cold-start.
- **Error:** `SectionErrorBoundary` wraps each page region; campaign reload is fail-soft (`portal.tsx:236–239`). Toasts via `role="status"`.
- **Prioritization:** clear single primary action (create campaign). Not a wall of widgets. 
- Minor: `confirm()` native dialog for "End campaign" (`portal-home.tsx:334`) — jarring vs the otherwise-custom UI.

### Influencer (`influencer/portal.tsx`)
- Loading skeletons (`DashboardSkeleton`/`EarningsSkeleton`), per-section error boundaries, explicit empty states for Discover ("No campaigns match your filters") and Earnings ("No submissions yet" with CTA). Strong.
- `aria-live` announcement of result counts on Discover (`portal.tsx:445`). Nice.

### Enterprise (`enterprise/portal.tsx`)
- Dedicated `EnterpriseSkeleton`, a **non-blocking** `ErrorBanner` with Retry that still shows fallback data (`portal.tsx:63–81, 176`). Best-in-class pattern here.
- Caveat: "Add Location" is a no-op (`portal.tsx:193–197`) — a dead button.

### Admin (`admin/page.tsx`)
- `Promise.allSettled` so one failing endpoint doesn't blank the page; every sub-section has its own "unavailable/none" empty state; 20s live-poll with a toggle. Solid.
- But `handleReview` swallows failures silently (`admin/page.tsx:670–672`) — an admin can click Approve, get no feedback, and the action may have failed.

> **Dashboard verdict:** the empty/loading/error discipline here is genuinely good and well above typical pre-launch quality. The risk is *dead buttons* (Add Location) and *silent failures* (admin review), not missing states.

---

## 5. Conversion paths & CTAs

- **Landing → signup is broken at the most prominent point** (Nav "Get Started", see §3). Hero CTA and pricing CTAs are correct.
- **Pricing → checkout** is well-built: cards encode `data-plan`/`data-period`, link to `/dashboard#signup?plan=…&period=…`, intent persists, annual upsell offered inline at signup. Enterprise routes to `/contact?intent=enterprise`. (`pricing-section.tsx:414–432`, `auth-form.tsx:520–563`).
- **Dashboard → activation** is strong: wizard + templates + dashed CTA + QR/share. Multiple converging paths to "launch a campaign."
- **Claim page → submission** (`/c/[campaignId]`) is excellent: scoped action list, reward card, days-left, viral invite-unlock, FTC disclosure, graceful ended/expired state, DB fallback so links survive redeploys.
- Abandonment risks: free-text business type (weakens downstream value), no password confirm, reset link with no landing page.

---

## 6. Mobile / responsive

- Responsive discipline is generally good: `sm:`/`md:`/`lg:` breakpoints throughout, `overflow-x-hidden` on landing wrappers, tables wrapped in `overflow-x-auto`, tap targets mostly ≥ 32–40px (icon buttons are `w-8 h-8` = 32px, slightly under the 44px guideline but acceptable).
- **Admin = unusable on mobile** (no nav, §3). Highest-impact responsive defect.
- Public nav, portal top bars, pricing cards, claim page all collapse sensibly.
- `mobile-interop.ts` exists as a shared layer (per CLAUDE.md) but the web app doesn't appear to consume it for layout decisions — out of scope to verify behavior without running.
- Icon-only action buttons in the campaign list (edit/pause/resume/end/share) are 32px and tightly packed (`portal-home.tsx:273–368`) — fiddly on touch; rely entirely on `title`/`aria-label` with no visible labels.

---

## 7. Accessibility (a11y)

**Generally above average** — 182 `aria-label`s, 132 `role`s, a skip-link (`nav.tsx:72`), focus-visible rings nearly everywhere, a proper focus-trapping `Modal` (`ui/modal.tsx:52–105`, restores focus on close).

Issues, with citations:

- **Color contrast — `brand-muted` (#636B8A) fails WCAG AA.** Ratio ~3.4:1 on `--surface`, ~3.6:1 on `--bg` (computed). It's used pervasively for small captions, table headers, hints, timestamps, "perk value" labels, etc. Below the 4.5:1 requirement for normal text. **`brand-subtle` (#3D4362) ~1.8–2:1** fails everything and is used for footer copyright and placeholder text. (`globals.css:132–134`). `brand-dim` (#8E95B4 ~6:1) is fine. **Fix: bump muted to ≥ #7E86A8 and stop using subtle for text.**
- **The onboarding wizard modal is not a focus trap.** It's a hand-rolled `role="dialog" aria-modal` (`onboarding-wizard.tsx:367–373`) that does **not** trap Tab or restore focus like `ui/modal.tsx` does. Keyboard users can tab into the page behind the backdrop. It also doesn't `aria-labelledby` its visible heading.
- **`confirm()` / `alert()` native dialogs** in: `portal-home.tsx`, `dashboard/api-keys/client.tsx`, `dashboard/billing/client.tsx`, and 4 admin pages. These break the design system and are inconsistent for AT users vs the custom Modal.
- **Tabs nav semantics:** portal top-bar "tabs" are plain `<button>`s in a `<nav>` (`portal.tsx:554–567`) without `role="tablist"/tab"` + `aria-selected`. Functional but not announced as a tab set.
- **Icon-only controls rely solely on `aria-label`/`title`** with no visible text (campaign action buttons) — fine for AT, but low discoverability for everyone; consider labels or a kebab menu.
- **Decorative emoji** are mostly correctly `aria-hidden`; good. The single `<img>` in the codebase has the single `alt=` — so raster imagery is basically absent (icons are inline SVG/emoji), which sidesteps most alt-text debt.
- Forms are well-labeled (`htmlFor`/`id` pairs in auth, contact, wizard, profile). Error regions use `role="alert"`/`aria-live`. 

> **a11y verdict:** structurally solid; the real defects are **contrast (muted/subtle text)** and **the wizard not trapping focus**, both fixable quickly.

---

## 8. Perceived performance & states

- **Skeletons** everywhere (`portal-skeletons.tsx`, `EnterpriseSkeleton`, admin `SkeletonCard`). Good.
- **Optimistic UI** in campaign launch and submission flows with fail-soft fallbacks (`portal.tsx:380–416`, `influencer/portal.tsx:219–288`).
- **Error boundaries:** app-level `ErrorBoundary` (`app.tsx:94–129`), `SectionErrorBoundary` per region, plus `error.tsx`/`global-error.tsx`/`not-found.tsx`. Strong.
- **Toasts** are custom, `role="status"`, auto-dismiss with cleanup. Good.
- **Blocking risk:** session restore (`app.tsx:176–270`) shows a full-screen loader and only skips the network call when the non-HttpOnly `sp-session` marker is absent. If that marker is set but the network is slow, users wait up to the 5s `SESSION_RESTORE_TIMEOUT` on a blank loader before seeing anything. Acceptable but it's a 5s worst-case white screen.
- **Janky bit:** the onboarding wizard renders 40 confetti particles with an injected `<style dangerouslySetInnerHTML>` (`onboarding-wizard.tsx:790–813`) — fine functionally, minor.

---

## Ranked findings (Critical → Low)

| # | Sev | Finding (file:line) | User impact | Fix | Effort | Quick win |
|---|-----|---------------------|-------------|-----|--------|-----------|
| 1 | **Critical** | Homepage "Get Started" CTA is dead — `href="#signup"` with no listener on static `/` (`nav.tsx:152,277` vs `app.tsx:274`) | Primary top-of-funnel CTA does nothing on the landing page | Change to `/dashboard#signup` (match Hero) | S | ✅ |
| 2 | **Critical** | Admin has no mobile navigation — sidebar `hidden lg:flex`, topbar has no hamburger (`admin-sidebar.tsx:12`, `admin-topbar.tsx`) | Entire admin console unnavigable <1024px | Add a mobile drawer toggle in `AdminTopbar` | M | |
| 3 | **High** | Password reset has no token-entry landing page anywhere in `src/app` (`auth-form.tsx:472`) | Reset emails lead nowhere; locked-out users can't recover | Build `/reset/[token]` page wired to auth reset | M | |
| 4 | **High** | `brand-muted`/`brand-subtle` text fail WCAG AA contrast (~3.4:1 / ~1.9:1) (`globals.css:132–134`) | Low-vision users can't read captions/labels/footers used site-wide | Lighten muted to ≥ #7E86A8; stop using subtle for text | S | ✅ |
| 5 | **High** | Onboarding wizard modal doesn't trap focus or restore it (`onboarding-wizard.tsx:367`) | Keyboard/AT users tab behind the modal during first-run | Reuse `ui/modal.tsx` trap or port its keydown logic | M | |
| 6 | **High** | No explicit multi-audience entry in nav; two divergent landing pages (`app/page.tsx` vs `app.tsx:133`) | 3-audience promise isn't navigable; inconsistent first impression | Add For Business/Creators/Enterprise nav; collapse to one landing | M | |
| 7 | **Med** | Login silently retries password as deprecated PIN (`auth-form.tsx:139–154`) | Confusing mental model; deprecated path still primary for demos | Drop PIN fallback or make demo login explicit | S | ✅ |
| 8 | **Med** | Business Type is free text (`auth-form.tsx:631`) | Inconsistent data weakens template/AI matching | Convert to select/typeahead of known types | S | ✅ |
| 9 | **Med** | Dead "Add Location" button in enterprise (`enterprise/portal.tsx:193`) | Click does nothing; erodes trust | Wire to API or hide until implemented | S | ✅ |
| 10 | **Med** | Admin submission review fails silently (`admin/page.tsx:670`) | Admin approves, gets no feedback, may have failed | Surface success/error toast on review | S | ✅ |
| 11 | **Med** | Native `confirm()`/`alert()` in 6+ files (portal-home, billing/api-keys clients, 4 admin pages) | Breaks design system; inconsistent for AT | Replace with `Modal` confirm pattern | M | |
| 12 | **Med** | No email verification / no password-confirm field at signup (`auth-form.tsx:622–635`) | Typo'd email = unrecoverable paid account | Add confirm field + verification step | M | |
| 13 | **Med** | Influencer has no guided first-run; empty profile not prompted (`influencer/portal.tsx:424`) | Creators land with empty profiles → poor matching, slow activation | Add a short profile-completion wizard | M | |
| 14 | **Low** | Portal "tabs" lack tablist/tab ARIA semantics (`portal.tsx:554`) | Tab set not announced to screen readers | Add `role=tablist/tab` + `aria-selected` | S | ✅ |
| 15 | **Low** | Campaign action buttons are 32px, icon-only, tightly packed (`portal-home.tsx:273–368`) | Fiddly on touch; low discoverability | Bump to 44px or move to a kebab menu | S | |
| 16 | **Low** | Public influencer profile earnings are heuristic placeholders (`i/[slug]/page.tsx:31–38`) | "~$4,800" shown for seed accounts reads as fabricated | Hide $ until a real ledger exists | S | ✅ |
| 17 | **Low** | Footer is a flat 14-link dump incl. dev/MCP (`footer.tsx:7–22`) | Hard to scan; re-surfaces wrong audience | Group into columns by audience | S | ✅ |
| 18 | **Low** | 5s blank-loader worst case on session restore (`app.tsx:85,176`) | Returning users may see white screen up to 5s on slow nets | Lower timeout / show landing immediately and hydrate | S | |

---

## Verdict — Onboarding (3 bullets)
- **The business path is genuinely good:** low-friction 4-field signup → an auto-launching 3-step wizard with live preview, per-platform rewards, and a confetti payoff. Above typical pre-launch quality.
- **The supporting auth flows are half-finished:** password reset leads to a non-existent landing page, login silently falls back to a deprecated PIN, there's no email verification or password confirm, and a typo'd email is unrecoverable.
- **Influencer and enterprise onboarding lag badly:** creators get no guided first-run and aren't prompted to complete the profile that drives matching; enterprise has no real signup at all (demo-only).

## Verdict — Overall IA / coherence (3 bullets)
- **Coherent inside each portal, incoherent across the product:** the three-audience promise isn't navigable (no audience switch in nav), two divergent landing pages exist, and the most prominent landing CTA ("Get Started") is dead.
- **The core funnel is strong and well-instrumented** (landing → pricing → checkout → portal → `/c/[id]` claim page), with excellent empty/loading/error discipline — the product's real strength.
- **The surface is wildly oversized for 0 users:** ~80 routes including a large programmatic SEO tree, a developer/MCP/agent surface, and an exchange/programs marketplace, none of which has a clear home in primary navigation — and admin is entirely unusable on mobile.
