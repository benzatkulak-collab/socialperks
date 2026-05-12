# Social Perks — Full System Inventory

Generated: 2026-05-11

> Exhaustive listing of routes, APIs, components, libraries, integrations, and
> operational surfaces. Source of truth for downstream audit phases. Read-only:
> nothing was modified to produce this document.

---

## 1. Routes (App Router pages)

All `src/app/**/page.tsx` files. Pages with bracketed segments use
`generateStaticParams` for ISR/SSG when paired with `dynamicParams = true`.

### Marketing / Landing

| Path | Type | Purpose |
| --- | --- | --- |
| `/` | static | Marketing home (renders `SocialPerksApp`, multi-audience landing) |
| `/about` | static | About company page |
| `/pricing` | static | Plans + Stripe checkout entry points |
| `/contact` | static | Contact form (POSTs to `/api/v1/contact`) |
| `/privacy` | static | Privacy policy |
| `/terms` | static | Terms of service |
| `/security` | static | Security disclosures |
| `/changelog` | static | Product changelog |
| `/roadmap` | static | Public roadmap |
| `/stats` | static | Public stats / trust metrics |
| `/agents` | static | Agent-first / MCP landing |
| `/ai` | static | AI capabilities landing |
| `/developers` | static | Developer docs hub |
| `/launch` | static | Launch hub |
| `/launch/reddit` | static | Reddit launch copy |
| `/launch/tweets` | static | Tweet launch copy |
| `/site-map` | static | HTML sitemap |

### App Portals & Dashboards

| Path | Type | Purpose |
| --- | --- | --- |
| `/auth` | static | Auth form (login + signup, role select) |
| `/welcome` | static | Post-signup welcome / first-run |
| `/dashboard` | dynamic | Authenticated business dashboard |
| `/dashboard/leads` | dynamic | Lead-finder list view |
| `/dashboard/leads/[id]` | dynamic | Lead detail + outreach generator |
| `/admin` | dynamic | Admin / enterprise panel (role-gated) |
| `/admin/newsletter` | dynamic | Newsletter subscriber admin (admin only) |
| `/upgrade` | dynamic | Plan upgrade / Stripe checkout entry |
| `/upgrade/success` | dynamic | Post-checkout success landing |
| `/marketplace` | dynamic | Marketplace browse |
| `/community` | static | Community landing |

### Demo

| Path | Type | Purpose |
| --- | --- | --- |
| `/demo` | static | Demo hub |
| `/demo/analytics` | static | Demo analytics dashboard |
| `/demo/campaigns` | static | Demo campaigns view |
| `/demo/submissions` | static | Demo submissions view |

### Public Campaign / Widget

| Path | Type | Purpose |
| --- | --- | --- |
| `/campaign/[campaignId]` | ISR | Public campaign page with OG image |
| `/c/[campaignId]` | ISR | Short-link redirect to campaign |
| `/widget/[businessId]` | ISR | Embeddable widget renderer |
| `/embed` | static | Embed landing |
| `/embed/install` | static | Install instructions |
| `/embed/widget/[businessId]` | ISR | Alt widget embed |
| `/webhooks` | static | Webhooks documentation |
| `/extension` | static | Browser extension landing |

### Tools (free calculators / utilities)

| Path | Type | Purpose |
| --- | --- | --- |
| `/tools` | static | Tools index |
| `/tools/break-even-calculator` | static | Break-even calc |
| `/tools/breakeven-on-perks-calculator` | static | Perk break-even calc |
| `/tools/cac-calculator` | static | CAC calc |
| `/tools/customer-lifetime-value-calculator` | static | LTV calc |
| `/tools/google-business-checker` | static | Google Biz profile lookup |
| `/tools/instagram-caption-generator` | static | IG caption tool |
| `/tools/loyalty-program-generator` | static | Loyalty program builder |
| `/tools/marketing-budget-calculator` | static | Budget calc |
| `/tools/profit-margin-calculator` | static | Margin calc |
| `/tools/review-email-generator` | static | Review-request email gen |
| `/tools/review-roi-calculator` | static | Review ROI calc |
| `/tools/sms-review-templates` | static | SMS templates |
| `/tools/social-media-roi-calculator` | static | Social ROI calc |
| `/tools/utm-link-generator` | static | UTM builder |

### Quizzes

| Path | Type | Purpose |
| --- | --- | --- |
| `/quiz` | static | Quiz hub |
| `/quiz/best-platform` | static | "Which platform" quiz |
| `/quiz/brand-voice` | static | Brand-voice quiz |
| `/quiz/influencer-rate-calculator` | static | Rate-card quiz |
| `/quiz/marketing-readiness` | static | Readiness quiz |
| `/quiz/perk-value-optimizer` | static | Perk-value quiz |

### Affiliate / Referral

| Path | Type | Purpose |
| --- | --- | --- |
| `/affiliate` | static | Affiliate program landing |
| `/ref/[code]` | dynamic | Referral redirect + attribution |

### Programmatic SEO (huge generated surface)

The following routes are programmatic-SEO surfaces generated via
`generateStaticParams`. Counts are approximate based on the generators in
`src/lib/seo*/`, `src/lib/local-niche/`, `src/lib/industries.ts`,
`src/lib/locations/`, etc.

| Path pattern | Estimated count | Purpose |
| --- | --- | --- |
| `/alternatives` + `/alternatives/[competitor]` | hub + many | Competitor comparison landing |
| `/vs` + `/vs/[competitor]` | hub + many | "X vs Y" comparison pages |
| `/instead-of` + `/instead-of/[method]` | hub + many | Anti-method landing |
| `/best` + `/best/[slug]` | many | "Best X for Y" listicles |
| `/best-for` + `/best-for/[criteria]` | many | "Best for ..." facet pages |
| `/for` + `/for/[industry]` | many | Industry landing pages |
| `/industries` + `/industries/[slug]` | many | Industry verticals |
| `/services` + `/services/[service]` + `/services/[service]/[city]` | hub + many | Service-area pages |
| `/local` + `/local/[city]` + `/local/[city]/[industry]` | 100s+ | City × industry pSEO |
| `/local-niche` + `/local-niche/[niche]` + `/local-niche/[niche]/[city]` + `/local-niche/[niche]/[city]/[outcome]` | 1000s | Niche × city × outcome pSEO |
| `/local-guide/[topic]` | many | Local-topic guides |
| `/neighborhood` + `/neighborhood/[city]` + `/neighborhood/[city]/[neighborhood]` + `/neighborhood/[city]/[neighborhood]/[industry]` | 1000s | Neighborhood-level pSEO |
| `/state` + `/state/[state]` + `/state/[state]/[industry]` | many | State pages |
| `/communities` + `/communities/[slug]` | many | Community pages |
| `/playbooks` + `/playbooks/[industry]` + `/playbooks/[industry]/[campaign]` | many | Strategic playbooks |
| `/templates` + `/templates/[slug]` | many | Campaign templates |
| `/integrations` + `/integrations/[platform]` + `/integrations/platform/[slug]` + `/integrations/platform` + `/integrations/software` | many | Integrations directory |
| `/topics` + `/topics/[slug]` | many | Topic clusters |
| `/glossary` + `/glossary/[term]` | many | Term glossary |
| `/how-to` + `/how-to/[slug]` | many | How-to guides |
| `/guide/[slug]` + `/guide` | many | Long-form guides |
| `/h/[slug]` + `/h` | many | Hub pages |
| `/answers/[slug]` + `/answers` | many | Q&A pages |
| `/ask/[slug]` + `/ask` | many | Question landing pages |
| `/content/[category]` + `/content/[category]/[topic]` + `/content` | many | Content hub |
| `/blog/[slug]` + `/blog` | many | Blog posts |
| `/case-studies/[slug]` + `/case-studies` | many | Case studies |
| `/stories/[slug]` + `/stories` | many | Success stories |
| `/courses/[slug]` + `/courses/[slug]/lesson/[day]` + `/courses` | many | Email-course landing + per-lesson |
| `/outreach/[slug]` + `/outreach/category/[category]` + `/outreach` | many | Outreach scripts |

Programmatic-SEO data tables live under `src/lib/seo*/`, `src/lib/listicles/`,
`src/lib/comparison/`, `src/lib/local-niche/`, `src/lib/programmatic-seo/`,
`src/lib/howto/`, `src/lib/answers/`, `src/lib/ask/`, `src/lib/best-for/`,
`src/lib/alternatives/`, `src/lib/case-studies/`, `src/lib/communities/`,
`src/lib/content/`, `src/lib/glossary/`, `src/lib/industry-pages/`,
`src/lib/instead-of/`, `src/lib/integrations/`, `src/lib/playbooks/`,
`src/lib/outreach/`, `src/lib/pillars/`, `src/lib/seo-niches/`,
`src/lib/seo-pillars/`, `src/lib/services/`, `src/lib/stories/`,
`src/lib/templates/`.

---

## 2. API Routes

All `src/app/api/**/route.ts`. Methods discovered via `export const GET/POST/...`.
Auth column: `req` = requires Bearer JWT or API key (calls `requireAuth`);
`public` = no auth required (CSRF still enforced on writes).
Rate-limit tier column reflects `rateLimit(req, '<tier>')` calls.

### `/api/v1/auth/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/auth` | req (validates session) | strict |
| POST | `/api/v1/auth` | varies by action | strict |
| POST | `/api/v1/auth/totp` | req | strict |
| GET | `/api/v1/auth/sessions` | req | standard |
| POST | `/api/v1/auth/sessions` | req | standard |
| POST | `/api/v1/auth/oauth/connect` | public | strict |
| GET | `/api/v1/auth/oauth/[provider]/callback` | public | strict |

### `/api/v1/campaigns/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/campaigns` | req | relaxed |
| POST | `/api/v1/campaigns` | req | standard |
| GET | `/api/v1/campaigns/[campaignId]` | req | relaxed |
| PUT | `/api/v1/campaigns/[campaignId]` | req | standard |
| DELETE | `/api/v1/campaigns/[campaignId]` | req | standard |
| GET | `/api/v1/campaigns/experiments` | req | relaxed |
| POST | `/api/v1/campaigns/experiments` | req | standard |

### `/api/v1/submissions/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/submissions` | req | relaxed |
| POST | `/api/v1/submissions` | req | standard |
| GET | `/api/v1/submissions/[submissionId]` | req | relaxed |
| DELETE | `/api/v1/submissions/[submissionId]` | req | standard |
| POST | `/api/v1/submissions/review` | req | standard |

### `/api/v1/influencers/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/influencers` | optional | relaxed |
| POST | `/api/v1/influencers` | req | standard |
| GET | `/api/v1/influencers/[influencerId]` | optional | relaxed |
| PUT | `/api/v1/influencers/[influencerId]` | req | standard |
| DELETE | `/api/v1/influencers/[influencerId]` | req | standard |

### `/api/v1/ai/*` (backend-only)

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| POST | `/api/v1/ai/generate` | req | standard |
| POST | `/api/v1/ai/recommend` | req | standard |
| POST | `/api/v1/ai/review` | req | standard |
| POST | `/api/v1/ai/campaign-agent` | req | standard |
| POST | `/api/v1/ai/quick-start` | req | standard |

### `/api/v1/billing/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| POST | `/api/v1/billing` | req | standard |
| POST | `/api/v1/billing/checkout` | req | strict |
| POST | `/api/v1/billing/portal` | req | strict |
| POST | `/api/v1/billing/webhook` | public (Stripe HMAC sig) | none |

### `/api/v1/programs/*` (Perk programs)

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET / POST | `/api/v1/programs` | req | standard |
| GET / PUT / DELETE | `/api/v1/programs/[programId]` | req | standard |
| GET | `/api/v1/programs/[programId]/progress` | req | relaxed |
| POST | `/api/v1/programs/[programId]/submit` | req | standard |
| GET / POST | `/api/v1/programs/[programId]/cashback` | req | standard |
| GET / POST | `/api/v1/programs/[programId]/members` | req | standard |

### `/api/v1/exchange/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/exchange/opportunities` | public | public |
| GET | `/api/v1/exchange/market` | public | public |
| GET / POST | `/api/v1/exchange/orders` | req | standard |
| GET / POST | `/api/v1/exchange/trades` | req | standard |
| POST | `/api/v1/exchange/enroll` | req | standard |

### `/api/v1/leads/*` (Lead finder)

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET / POST | `/api/v1/leads` | req | standard |
| GET | `/api/v1/leads/search` | req | standard |
| GET | `/api/v1/leads/export` | req | standard |
| POST | `/api/v1/leads/[id]/outreach` | req | standard |

### `/api/v1/embed/*` (public iframe/badge widgets)

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/embed/badge` | public | public |
| GET | `/api/v1/embed/reviews` | public | public |
| GET | `/api/v1/embed/stars` | public | public |
| GET | `/api/v1/widget/embed` | public | public |
| GET | `/api/v1/widget/config` | public | public |

### `/api/v1/affiliate/*`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET / POST | `/api/v1/affiliate` | req | standard |
| GET | `/api/v1/affiliate/track` | public | public |
| GET / POST | `/api/v1/referrals` | req | standard |

### Admin / Audit / Internal

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET / POST | `/api/v1/admin/rate-limits` | req (admin/enterprise) | standard |
| GET | `/api/v1/audit` | req (admin) | standard |
| POST | `/api/v1/migrate` | req (admin) | strict |
| POST | `/api/v1/seed` | dev-only | strict |
| POST | `/api/v1/ml/train` | req (admin) | strict |
| GET | `/api/v1/jobs` | req | standard |
| GET | `/api/v1/circuits` | req | relaxed |
| POST | `/api/v1/log/error` | public | public |

### Cron / Scheduled

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/cron` | shared secret `?key=` | standard |
| GET | `/api/v1/cron/status` | req | relaxed |

### Webhooks (outgoing + incoming)

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET / POST | `/api/v1/webhooks` | req | standard |
| GET | `/api/v1/webhooks/deliveries` | req | relaxed |
| POST / GET | `/api/v1/verification/webhook` | HMAC sig | none |
| POST | `/api/v1/payouts/webhook` | HMAC sig | none |

### Reference / Public Data

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/pricing` | public | public |
| GET | `/api/v1/actions` | public | public |
| GET | `/api/v1/benchmarks` | public | public |
| GET | `/api/v1/recommendations` | public | public |
| GET | `/api/v1/legal` | public | public |
| GET | `/api/v1/templates` | public | public |

### Search / Discover / Export

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/search` | optional | relaxed |
| GET | `/api/v1/discover` | optional | relaxed |
| POST | `/api/v1/export` | req | standard |

### Other / Infra

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/v1/health` | public | none |
| GET | `/api/v1/status` | public | public |
| GET | `/api/v1/csrf` | public | public |
| GET | `/api/v1/capabilities` | public | public |
| GET | `/api/v1/docs` | public | public |
| GET | `/api/v1/docs/ui` | public | public |
| GET | `/api/v1/mcp` | public | public |
| GET | `/api/v1/sdk/python` | public | public |
| POST | `/api/v1/sandbox` | req | standard |
| GET | `/api/v1/events` | optional (SSE) | n/a |
| GET / POST | `/api/v1/flags` | req | standard |
| GET / POST | `/api/v1/experiments` | req | standard |
| GET / POST | `/api/v1/graph` | req | standard |
| GET | `/api/v1/usage` | req | relaxed |
| GET / POST | `/api/v1/digest` | req | standard |
| GET / POST | `/api/v1/drip` | req | standard |
| GET / POST | `/api/v1/newsletter` | public + CSRF | strict |
| POST | `/api/v1/contact` | public + CSRF | strict |
| POST | `/api/v1/images` | req | standard |
| GET | `/api/v1/images` | req | relaxed |
| POST | `/api/v1/batch` | req | standard |
| POST | `/api/v1/oauth/connect` | public | strict |
| GET | `/api/v1/oauth/[platform]` | public | strict |
| GET | `/.well-known/ai-plugin.json` | public | public |

### `/api/graphql`

| Method | Path | Auth | Rate-limit |
| --- | --- | --- | --- |
| GET | `/api/graphql` | public (playground) | public |
| POST | `/api/graphql` | optional | standard |

### `/api/v2/*` (next-gen, migration)

| Method | Path | Notes |
| --- | --- | --- |
| `/api/v2/auth` | parity with v1 with newer envelope |
| `/api/v2/campaigns` | parity with v1 |
| `/api/v2/submissions` | parity with v1 |
| `/api/v2/migration` | data migration utility |

---

## 3. Components

### `src/components/landing/`

- `hero.tsx` — top-of-page hero with audience switcher
- `audience-sections.tsx` — section blocks per audience (biz / influencer / enterprise)
- `how-it-works.tsx` — three-step explainer
- `platform-showcase.tsx` — 15-platform marquee
- `pricing-section.tsx` — pricing tiles
- `pricing-table.tsx` — feature comparison table
- `pricing-faq.tsx` — pricing FAQ
- `social-proof.tsx` — logo bar + counter
- `testimonials.tsx` — testimonials carousel
- `cta-section.tsx` — closing CTA block
- `ai/` — AI-specific landing blocks

### `src/components/business/`

- `dashboard.tsx` — business portal dashboard shell
- `portal.tsx` — multi-tab business portal
- `portal-home.tsx` — portal home tab
- `portal-create.tsx` — campaign creation flow
- `portal-analytics.tsx` — portal analytics tab
- `analytics-dashboard.tsx` — full analytics view
- `analytics-overview.tsx` — KPI cards
- `active-campaigns.tsx` — running-campaigns list
- `campaign-browser.tsx` — picker / browser
- `campaign-card.tsx` — campaign card primitive
- `campaign-detail.tsx` — single-campaign view
- `campaign-edit-modal.tsx` — edit modal
- `launch-modal.tsx` — launch flow
- `template-picker.tsx` — template chooser
- `qr-generator.tsx` — QR code generator UI
- `embed-code.tsx` — embed snippet generator
- `referral-panel.tsx` — referral tracker
- `upgrade-prompt.tsx` — gated-feature upgrade prompt
- `settings.tsx` — business settings
- `sidebar.tsx` — portal sidebar
- `onboarding-checklist.tsx` — first-run checklist
- `onboarding-wizard.tsx` — multi-step setup wizard

### `src/components/influencer/`

- `portal.tsx` — influencer portal shell
- `dashboard.tsx` — influencer dashboard
- `dashboard-components.tsx` — dashboard sub-blocks
- `earnings.tsx` — earnings page
- `earnings-chart.tsx` — earnings chart
- `campaign-discovery.tsx` — campaign browse
- `perk-wallet.tsx` — perk wallet view
- `media-kit.tsx` — media-kit generator
- `profile-editor.tsx` — top-level profile editor
- `profile-basic-info.tsx` — basic info editor
- `profile-platforms-editor.tsx` — platform handles
- `profile-portfolio-editor.tsx` — portfolio links
- `profile-rate-card-editor.tsx` — rate card editor
- `profile-preview.tsx` — public-profile preview
- `submission-modal.tsx` — submission entry modal
- `settings.tsx` — influencer settings
- `marketplace-utils.ts` — shared utilities

### `src/components/enterprise/`

- `portal.tsx` — enterprise portal shell
- `dashboard.tsx` — enterprise dashboard
- `multi-location.tsx` — multi-location management
- `brand-manager.tsx` — brand management page
- `brand-guidelines-editor.tsx` — guidelines editor
- `brand-templates-panel.tsx` — brand-template list
- `brand-content-review.tsx` — content approval queue
- `brand-compliance-table.tsx` — compliance dashboard
- `reports.tsx` — enterprise reports
- `report-charts.tsx` — chart primitives
- `report-types.ts` — report-typing helpers
- `api-console.tsx` — in-app API console
- `api-console-types.ts` — console types
- `api-keys-section.tsx` — API key management
- `api-usage-section.tsx` — API usage charts
- `api-docs-section.tsx` — embedded docs
- `webhooks-section.tsx` — webhook config
- `webhook-dashboard.tsx` — webhook delivery log
- `audit-log.tsx` — audit-log viewer
- `feature-flags-panel.tsx` — flag admin panel

### `src/components/widget/`

- `perk-widget.tsx` — embeddable perk widget body

### `src/components/auth/`

- `auth-form.tsx` — login + signup form (role select)
- `signup-trust-bar.tsx` — trust signals on signup
- `social-proof-block.tsx` — social proof on auth pages

### `src/components/onboarding/`

- `wizard.tsx` — onboarding wizard (post-signup, multi-step)

### `src/components/courses/`

- `course-signup-form.tsx` — email-course opt-in form

### `src/components/dashboard/`

- `affiliate-section.tsx` — affiliate stats block

### `src/components/shared/`

- `nav.tsx` — top nav
- `footer.tsx` — footer
- `site-mega-footer.tsx` — long pSEO footer
- `global-chrome.tsx` — outer chrome wrapper
- `skip-links.tsx` — a11y skip links
- `language-selector.tsx` — i18n switcher
- `notification-center.tsx` — bell + drawer
- `activity-ticker.tsx` — live activity ticker
- `agent-ticker.tsx` — agent-traffic ticker
- `exit-intent.tsx` — exit-intent modal
- `social-proof-popup.tsx` — recent-signup popup
- `sticky-cta.tsx` — bottom-of-screen CTA
- `trust-bar.tsx` — homepage trust bar
- `share-buttons.tsx` — share buttons
- `search-bar.tsx` — global search
- `influencer-search.tsx` — influencer search bar
- `newsletter-form.tsx` — newsletter signup
- `related-links.tsx` — pSEO related-links block
- `animate-on-scroll.tsx` — scroll animation wrapper
- `offline-indicator.tsx` — offline banner
- `sw-register.tsx` — service worker registration

### `src/components/ui/`

- `badge.tsx`, `button.tsx`, `card.tsx`, `tabs.tsx`, `toast.tsx`, `modal.tsx`,
  `pagination.tsx`, `skeleton.tsx`, `chart.tsx`, `confirm-dialog.tsx`,
  `empty-state.tsx`, `export-button.tsx`, `field.tsx`, `logo.tsx`, `qr-code.tsx`,
  `responsive-helpers.tsx`, `search.tsx`, `stat.tsx`, `dots.tsx`,
  `portal-skeletons.tsx`, `section-error-boundary.tsx`
- Storybook stories: `badge.stories.tsx`, `card.stories.tsx`,
  `pagination.stories.tsx`, `tabs.stories.tsx`, `toast.stories.tsx`

### Top-level

- `src/components/app.tsx` — multi-audience root client component
- `src/components/error-boundary.tsx` — global error boundary

---

## 4. Hooks

All `src/lib/hooks/*.ts*`.

- `use-store.ts` — generic localStorage hook
- `use-auth.ts` — auth state + role helpers (isBusiness/isInfluencer/isAdmin)
- `use-api.ts` — generic fetch wrapper
- `use-campaigns.ts` — campaign list/create/update
- `use-submissions.ts` — submissions list/create/review
- `use-business-dashboard.ts` — aggregated business dashboard data
- `use-enterprise-data.ts` — enterprise dashboard data
- `use-feature-flag.ts` — feature flag eval
- `use-experiment.ts` — A/B experiment assignment
- `use-notifications.ts` — notification list / unread
- `use-notifications-sse.ts` — SSE-driven notification stream
- `use-realtime.ts` — generic SSE channel hook
- `use-offline.ts` — online/offline detection
- `use-keyboard-shortcuts.ts` — keyboard shortcut binding
- `use-in-view.ts` — IntersectionObserver hook
- `use-theme.ts` — theme (currently dark-only) hook
- `use-toast.ts` — toast notifications
- `data.ts` — shared data helpers (not a hook directly)
- `index.ts` — barrel export

---

## 5. Utilities & Libraries

Grouped by subdirectory under `src/lib/`. Test directories (`__tests__/`) are
omitted from the listing for brevity.

### Engines (root-level)

- `ai-engine.ts` — campaign-generation engine (backend-only)
- `ai-agent.ts` — agent runner entry
- `analytics-engine.ts` — real-time analytics from event stream
- `campaign-state-machine.ts` — campaign lifecycle FSM + `campaignManager`
- `campaign-templates.ts` — built-in campaign templates
- `compliance-engine.ts` — FTC compliance automation
- `embedding-engine.ts` — vector embeddings for ML matching
- `events.ts` — event-sourcing primitives
- `exchange.ts` — campaign exchange engine
- `financial-ledger.ts` — double-entry bookkeeping
- `fraud-detection.ts` — content fraud detection
- `graph-engine.ts` — social-graph engine
- `legal-compliance.ts` — legal-brief generation
- `matching-engine.ts` — influencer↔business match
- `perk-programs.ts` — perk-program logic
- `perk-wallet.ts` — perk wallet + expiry
- `plugin-system.ts` — plugin/extension architecture
- `submissions.ts` — submission lifecycle
- `sync-engine.ts` — offline sync engine
- `verification-engine.ts` — proof verification

### Reference data

- `platforms.ts` — 15 platforms × 107 actions × tiers
- `ideas.ts` — 1000 platform ideas
- `industries.ts` — industry taxonomy
- `seed.ts` — demo seed data
- `stripe.ts` — Stripe client + price IDs
- `config.ts` — runtime config
- `types.ts` — top-level types (re-exports `types/index.ts`)
- `types/index.ts` — TypeScript type definitions

### `src/lib/security/`

- `index.ts` — barrel
- `csrf.ts` — HMAC-SHA256 CSRF tokens
- `rate-limiter.ts` — 4-tier in-memory rate limiter
- `rate-limit-stats.ts` — hit/block counters
- `distributed-rate-limiter.ts` — Redis-backed version
- `sanitize.ts` — HTML entity escape
- `validate.ts` — input validators (email, ID, string, number, enum)

### `src/lib/auth/`

- `index.ts` — JWT issue/verify, `requireAuth`, password hashing
- `totp.ts` — TOTP (Google Authenticator-compatible)
- `oauth-providers.ts` — Google/GitHub/Instagram/TikTok/etc. OAuth config

### `src/lib/db/`

- `connection.ts` — pg Pool factory + PgBouncer awareness
- `prisma.ts` — Prisma client singleton
- `init.ts` — migration bootstrap
- `migrate.ts` — migration runner
- `migrations.ts` — registered migrations
- `migrations/001_initial.sql` — initial schema
- `schema.ts` — Prisma-ready schema description
- `seed-data.ts` — DB seed
- `repositories.ts` — barrel
- `repositories/business-repository.ts`
- `repositories/campaign-repository.ts`
- `repositories/influencer-repository.ts`
- `repositories/submission-repository.ts`
- `repositories/user-repository.ts`
- `repositories/shared.ts`
- `repositories/index.ts`

### `src/lib/api/`

- API helpers (`client.ts`, `sdk.ts`, `middleware.ts`,
  `with-request-context.ts`, `idempotency.ts`, `edge-cache.ts`,
  `response-cache.ts`)

### `src/lib/email/`

- `index.ts` — barrel + `emailProvider` (Resend wrapper)
- `sender.ts` — low-level send
- `templates.ts` — template registry
- `templates/newsletter-confirmation.ts` — newsletter confirm
- `triggers.ts` — event → email trigger map
- `drip.ts` — drip-campaign sequencer (welcome / nurture)
- `digest.ts` — weekly digest builder

### `src/lib/billing/`

- `enforcement.ts` — plan-limit enforcement
- `store.ts` — subscription in-memory store + Stripe sync

### `src/lib/payments/`

- `index.ts` — barrel
- `stripe.ts` — Stripe client wrapper
- `escrow.ts` — escrow account logic
- `ledger.ts` — payments ledger
- `tax.ts` — tax computation
- `helpers.ts`, `types.ts`

### `src/lib/payouts/`

- `index.ts` — payout orchestration + Stripe Connect

### `src/lib/affiliate/`

- `index.ts` — affiliate program tracking + payouts

### `src/lib/referrals/`

- `index.ts` — barrel
- `tracker.ts` — referral attribution

### `src/lib/leads/` (Lead finder)

- `types.ts` — Lead, LeadSearchParams
- `google-places.ts` — Places API client (returns mocks if no key)
- `scorer.ts` — lead scoring algorithm
- `store.ts` — in-memory lead store

### `src/lib/ai-agent/`

- `agent.ts` — agent runner
- `analysis.ts` — business analysis
- `business-profiles.ts` — profile templates
- `helpers.ts`, `index.ts`, `types.ts`
- `recommendation-builder.ts`
- `recommendations.ts` — recommendation catalog
- `specialized-campaigns.ts` — specialized campaign templates

### `src/lib/ai-review/`

- `index.ts` — AI submission-review pipeline

### `src/lib/cache/`

- `index.ts` — barrel
- `middleware.ts` — response-cache middleware

### `src/lib/feature-flags/`

- `index.ts` — feature flag CRUD + evaluation

### `src/lib/jobs/`

- `queue.ts` — in-memory job queue
- `bullmq-adapter.ts` — BullMQ adapter for Redis
- `registry.ts` — pre-configured queues (email/verification/payout/analytics/webhook)
- `index.ts` — barrel

### `src/lib/cron/`

- `tasks.ts` — task handlers + `TASKS` registry

### `src/lib/images/`

- `optimizer.ts` — image optimization
- `storage.ts` — S3 / local storage adapter

### `src/lib/i18n/`

- `locales/` — EN, ES, PT translation tables
- (root files) — `useTranslation` hook + interpolation

### `src/lib/audit/`

- Audit log (11 event types) + query helpers

### `src/lib/analytics/`

- `plausible.ts` — Plausible event helper + named events

### `src/lib/multi-tenant/`

- `index.ts` — multi-tenant isolation, tenant export/restore

### `src/lib/logging/`

- Structured JSON logger + `logError`

### `src/lib/resilience/`

- Circuit breakers, retries

### `src/lib/realtime/`

- SSE channel manager

### `src/lib/sync/`

- Offline sync primitives

### `src/lib/offline/`

- Service worker helpers

### `src/lib/encryption/`

- AES / HMAC utilities

### `src/lib/webhooks/`

- Outgoing webhook signing + delivery

### `src/lib/verification/`

- Platform proof verification primitives

### `src/lib/sandbox/`

- Sandbox environment for safe API testing

### `src/lib/search/`

- Full-text search (TF-IDF + fuzzy)

### `src/lib/seo/`

- JSON-LD structured data generators

### `src/lib/ml/`

- Recommendation model + training pipeline

### `src/lib/experiments/`

- A/B test assignment + variants

### `src/lib/event-sourcing/`

- Event-sourcing infra (separate from `events.ts`)

### `src/lib/graph/`

- Graph data structures + traversal

### `src/lib/graphql/`

- GraphQL schema + resolvers

### `src/lib/mcp/`

- MCP server definition

### `src/lib/infrastructure/`

- `api-gateway/` — API gateway primitives

### `src/lib/invoices/`

- Invoice generation

### `src/lib/onboarding/`

- Onboarding step config

### `src/lib/scheduling/`

- Scheduling logic for campaigns

### `src/lib/courses/`

- Email-course definitions + `sender.ts` (getDueLessons, markLessonSent, listSubscribers)

### `src/lib/newsletter/`

- Newsletter subscriber store

### `src/lib/qr/`

- QR code generation

### `src/lib/demo/`

- Demo data fixtures

### `src/lib/plugins/`

- Built-in plugins

### `src/lib/platform-integrations/`

- Per-platform integration shims

### `src/lib/programs/`

- Perk program internals

### `src/lib/compliance/`

- Compliance helpers

### `src/lib/export/`

- CSV / PDF export

### `src/lib/context/`

- React Context providers (app state)

### `src/lib/shared/`

- `constants.ts`, `formatters.ts`, `validation.ts`,
  shared with mobile via `mobile-interop`

### pSEO content generators

`src/lib/alternatives/`, `src/lib/answers/`, `src/lib/ask/`,
`src/lib/best-for/`, `src/lib/blog/`, `src/lib/case-studies/`,
`src/lib/communities/`, `src/lib/comparison/`, `src/lib/content/`,
`src/lib/glossary/`, `src/lib/howto/`, `src/lib/industry-pages/`,
`src/lib/instead-of/`, `src/lib/integrations/`, `src/lib/listicles/`,
`src/lib/local-niche/`, `src/lib/locations/`, `src/lib/outreach/`,
`src/lib/pillars/`, `src/lib/playbooks/`, `src/lib/programmatic-seo/`,
`src/lib/seo-niches/`, `src/lib/seo-pillars/`, `src/lib/services/`,
`src/lib/stories/`, `src/lib/templates/` — each ships a topic table +
generator and feeds the corresponding App Router segment via
`generateStaticParams`.

---

## 6. Database

- **Primary**: Supabase Postgres (PgBouncer 6543, direct 5432)
- **ORM**: Prisma
- **Schema**: `prisma/schema.prisma` — 18 models
- **TS schema mirror**: `src/lib/db/schema.ts`
- **Seed**: `prisma/seed.ts` + `src/lib/db/seed-data.ts`

### Models (from `prisma/schema.prisma`)

1. `User`
2. `Business`
3. `Influencer`
4. `InfluencerPlatform`
5. `Campaign`
6. `LaunchedCampaign`
7. `CampaignSubmission`
8. `PerkWallet`
9. `EarnedPerk`
10. `ApiKey`
11. `Webhook`
12. `AnalyticsEvent`
13. `Notification`
14. `AgentSession`
15. `AgentQuery`
16. `PlatformConnection`
17. `OauthAccount`
18. `Session`

### Repositories (`src/lib/db/repositories/`)

- `business-repository.ts`
- `campaign-repository.ts`
- `influencer-repository.ts`
- `submission-repository.ts`
- `user-repository.ts`
- `shared.ts` (base class)
- `index.ts` (barrel)

### Migrations

- `src/lib/db/migrations/001_initial.sql` — initial SQL migration
- `src/lib/db/migrate.ts` — runner
- `src/lib/db/migrations.ts` — registry
- Prisma migrations are not yet committed under `prisma/migrations/` (folder
  absent). Migration state currently lives in the raw SQL file.

---

## 7. Edge Middleware

`src/middleware.ts` — runs on `/api/:path*` only.

Responsibilities:

- CORS: `Access-Control-Allow-Origin: *`, allow methods GET/POST/PUT/DELETE/
  PATCH/OPTIONS, allow headers including `X-CSRF-Token`, `X-API-Version`,
  `X-Request-Id`, `X-Api-Key`; allow-credentials true; max-age 86400.
- Handles `OPTIONS` preflight (204).
- Security headers on every API response: `X-Content-Type-Options: nosniff`,
  `X-Frame-Options: DENY`, `X-XSS-Protection: 1; mode=block`,
  `Referrer-Policy: strict-origin-when-cross-origin`,
  `Permissions-Policy: camera=(), microphone=(), geolocation=()`.
- Structured JSON request log emitted via `console.warn` (level=info).

CSP / HSTS are advertised in `CLAUDE.md` but are not present in the current
`middleware.ts` — flagged for the security audit phase.

---

## 8. Cron Jobs

### Schedule — `.github/workflows/cron.yml`

| Cron (UTC) | Tasks fired |
| --- | --- |
| `*/15 * * * *` | `newsletter-drip` |
| `0 * * * *` (hourly) | `trial-expiring`, `cleanup-expired` |
| `0 14 * * 1` (Mon 14:00 UTC) | `weekly-digest` |
| `0 3 * * *` (daily 03:00 UTC) | `lead-status-sync` |

GitHub Actions hits `${BASE_URL}/api/v1/cron?task=<name>&key=$CRON_SECRET`.
Default `BASE_URL`: `https://socialperks.onrender.com`.

### Endpoint — `src/app/api/v1/cron/route.ts`

- GET-only; rate-limit tier `standard`.
- `key` validated with `timingSafeEqual` against `process.env.CRON_SECRET`.
- Returns 503 if `CRON_SECRET` unset, 401 if mismatch, 400 if unknown task.
- Dispatches to handlers in `src/lib/cron/tasks.ts`.
- Companion `GET /api/v1/cron/status` returns last-run metadata.

### Handlers — `src/lib/cron/tasks.ts`

| Task name | Function | Behavior |
| --- | --- | --- |
| `trial-expiring` | `runTrialExpiring` | Find `trialing` subs ending in ≤3 days; send reminder via `emailProvider` |
| `weekly-digest` | `runWeeklyDigest` | Build digest data per business and send via `emailProvider` |
| `lead-status-sync` | `runLeadStatusSync` | Re-fetch Google Places data for leads + persist updates |
| `newsletter-drip` | `runNewsletterDrip` | Send due lessons from `getDueLessons` + mark `markLessonSent` |
| `cleanup-expired` | `runCleanupExpired` | Expire perks (`expirePerks`) + clean stale state |

Each handler returns a `TaskResult` `{ processed, succeeded, failed, errors[], notes? }`.
Handlers never throw — errors are captured in `errors[]`.

---

## 9. Background Jobs / Queue Workers

`src/lib/jobs/`:

- `queue.ts` — in-memory `JobQueue<T>` with retries, dead-letter
- `bullmq-adapter.ts` — Redis-backed BullMQ adapter (used when `REDIS_URL` set)
- `registry.ts` — pre-configured queues + processors

Registered queues (`registry.ts`):

| Queue | Job data |
| --- | --- |
| `emailQueue` | `welcome`, `password-reset`, `digest`, `drip`, `transactional` |
| `verificationQueue` | platform proof verification |
| `payoutQueue` | Stripe Connect payouts |
| `analyticsQueue` | analytics-event aggregation |
| `webhookQueue` | outgoing webhook delivery |

`allQueues` exports the full list. Retry policy + backoff are passed via
`QueueOptions`.

Monitoring endpoint: `GET /api/v1/jobs` reports queue depth and recent failures.

---

## 10. Integrations

| Integration | Purpose | Required env vars |
| --- | --- | --- |
| **Stripe** | Subscriptions, Connect payouts, webhooks | `STRIPE_SECRET_KEY` (required), `STRIPE_WEBHOOK_SECRET` (required), optional `STRIPE_PLATFORM_ACCOUNT_ID`, `STRIPE_PRICE_*` (per plan / interval) |
| **Resend** | Transactional + drip email | `RESEND_API_KEY` (optional), `EMAIL_FROM` (optional) |
| **Google Places** | Lead finder | `GOOGLE_PLACES_API_KEY` (optional — returns mocks if unset) |
| **AWS S3** | Image + proof storage | `S3_BUCKET`, `S3_REGION` (optional), `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY` (optional — IAM role fallback) |
| **Supabase / Neon Postgres** | Primary DB | `DATABASE_URL` (required), optional `DIRECT_URL` for migrations |
| **Redis** | Rate limiting + BullMQ | `REDIS_URL` (optional) |
| **Plausible** | Web analytics | `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` (optional) |
| **Cloudflare Web Analytics** | Free analytics alt | `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` (optional) |
| **Google OAuth** | Social login | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` |
| **GitHub OAuth** | Social login | `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` |
| **Instagram Basic Display** | Proof verification | `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` |
| **TikTok for Developers** | Proof verification | `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` |
| **YouTube Data API** | Proof verification | `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` |
| **X (Twitter) OAuth 2.0** | Proof verification | `X_CLIENT_ID`, `X_CLIENT_SECRET` |
| **Facebook Login** | Page verification | `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` |
| **LinkedIn OAuth** | Social login | `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` |
| **Telegram Bot** | Submission verification | `TELEGRAM_BOT_TOKEN` |
| **Twitch** | Stream verification | `TWITCH_CLIENT_ID` |
| **Render** | Hosting | configured via `render.yaml`; needs `AUTH_SECRET`, `CSRF_SECRET`, `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL` set in dashboard |
| **Vercel** | Hosting (alt) | configured via `vercel.json`; same secret set |
| **Cloudflare** | DNS / CDN (implicit) | n/a |
| **GitHub Actions** | CI + external cron | `CRON_SECRET` repo secret; optional `CRON_BASE_URL` |

Note: the user prompt mentions "Cloudflare" and "Neon Postgres" as targeted
integrations — code uses Supabase + Render today, with provider-agnostic
configuration via `DATABASE_URL`.

---

## 11. Analytics Events

Source: `src/lib/analytics/plausible.ts` (named helpers) plus inline
`trackEvent()` calls. Helper names follow `<thing>_<verb>` snake_case in most
places, with a few legacy TitleCase events kept for back-compat.

| Event name | Fired in | Props |
| --- | --- | --- |
| `signup_started` | `trackSignupStarted` (auth form) | `role` |
| `signup_completed` | `trackSignupCompleted`, `trackSignup` | `role` or `plan` |
| `Signup` (legacy) | `trackSignup` | `plan` |
| `upgrade_clicked` | `trackUpgradeClicked` (upgrade prompts) | `plan`, `source` |
| `checkout_started` | `trackCheckoutStarted` (pricing/upgrade) | `plan`, `interval` |
| `checkout_completed` | `trackCheckoutCompleted` (upgrade/success) | `plan`, `mock` |
| `trial_started` | `trackTrialStarted` | `plan` |
| `subscription_active` | `trackSubscriptionActive` (Stripe webhook + success page) | `plan` |
| `lead_search_used` | `trackLeadSearchUsed` (lead finder) | `query` (truncated) |
| `Campaign Created` (legacy) | `trackCampaignCreated` | `platform` |
| `Tool Used` (legacy) | `trackToolUsed` (free tools) | `tool` |
| `tool_used` | `trackToolUsed` (free tools) | `tool` |
| `onboarding_step_completed` | `wizard.tsx` step-advance | step metadata |
| `onboarding_platform_connected` | `wizard.tsx` OAuth connect | `platform` |
| `onboarding_platform_skipped` | `wizard.tsx` skip-platform | — |
| `onboarding_campaign_created` | `wizard.tsx` create-from-template | `platform` |
| `onboarding_share_link_copied` | `wizard.tsx` copy CTA | — |
| `onboarding_share_twitter` | `wizard.tsx` share buttons | — |
| `onboarding_share_email` | `wizard.tsx` share buttons | — |
| `onboarding_completed` | `wizard.tsx` final step | completion summary |

Tracking is no-op when `window.plausible` is absent (e.g. dev, SSR, ad-block).
A wider event coverage gap exists — many user actions (campaign launch outside
onboarding, perk redemption, submission upload) are not currently instrumented.

---

## 12. Auth Flows

Source: `src/app/api/v1/auth/route.ts` — single POST endpoint with
`action`-keyed switch.

| Action | Behavior |
| --- | --- |
| `signup` | Create user, create Business or Influencer record per `role`, issue JWT cookie + refresh, send welcome email |
| `login` | Validate email + password (bcrypt), issue token pair |
| `logout` | Clear cookies, revoke refresh token |
| `refresh` | Rotate access + refresh tokens from refresh-cookie |
| `reset-password` | Trigger password-reset email |
| `confirm-reset` | Verify reset token and set new password |

Other auth surfaces:

- `GET /api/v1/auth` — returns the current session (validates Bearer / cookie).
- `POST /api/v1/auth/totp` — TOTP setup / verify / disable (2FA).
- `GET /api/v1/auth/sessions` — list active sessions.
- `POST /api/v1/auth/sessions` — revoke a session.
- `POST /api/v1/auth/oauth/connect` — start OAuth (Google/GitHub/etc.).
- `GET /api/v1/auth/oauth/[provider]/callback` — finish OAuth, attach to user.
- Legacy `POST /api/v1/oauth/connect` + `GET /api/v1/oauth/[platform]` —
  pre-`/auth/oauth` flow, retained for platform-token connect.

Token primitives: `src/lib/auth/index.ts` (`createTokenPair(userId, role,
email, businessId)`, `requireAuth`, password hashing). TOTP in
`src/lib/auth/totp.ts`. OAuth provider config in
`src/lib/auth/oauth-providers.ts`.

---

## 13. AI Agent Systems

Frontend never imports these directly; access is via `/api/v1/ai/*` routes.

### Files

- `src/lib/ai-engine.ts` — root AI engine entrypoint
- `src/lib/ai-agent.ts` — top-level agent runner (re-export of agent module)
- `src/lib/ai-agent/agent.ts` — core agent loop
- `src/lib/ai-agent/analysis.ts` — business analysis
- `src/lib/ai-agent/business-profiles.ts` — profile templates per vertical
- `src/lib/ai-agent/recommendations.ts` — recommendation catalog
- `src/lib/ai-agent/recommendation-builder.ts` — recommendation assembly
- `src/lib/ai-agent/specialized-campaigns.ts` — vertical-specific templates
- `src/lib/ai-agent/helpers.ts`, `types.ts`, `index.ts`
- `src/lib/ai-review/index.ts` — AI submission review pipeline
- `src/lib/embedding-engine.ts` — vector embeddings (matching)
- `src/lib/matching-engine.ts` — influencer↔business matcher

### Routes (`src/app/api/v1/ai/`)

| Route | Purpose |
| --- | --- |
| `POST /api/v1/ai/generate` | Generate campaign suggestions |
| `POST /api/v1/ai/recommend` | Optimization recommendations |
| `POST /api/v1/ai/review` | AI submission review |
| `POST /api/v1/ai/campaign-agent` | Full multi-step marketing plan |
| `POST /api/v1/ai/quick-start` | Single quick-start recommendation |

All five are POST, `req` auth, rate-limit `standard`.

---

## 14. Influencer / Business / Enterprise Workflows

### Business

- Portal: `src/components/business/portal.tsx` + `portal-home.tsx`,
  `portal-create.tsx`, `portal-analytics.tsx`
- Dashboard: `src/components/business/dashboard.tsx` (consumed at `/dashboard`)
- Campaigns: `active-campaigns.tsx`, `campaign-browser.tsx`,
  `campaign-card.tsx`, `campaign-detail.tsx`, `campaign-edit-modal.tsx`,
  `launch-modal.tsx`, `template-picker.tsx`
- Analytics: `analytics-dashboard.tsx`, `analytics-overview.tsx`
- Settings: `settings.tsx`, `sidebar.tsx`
- Tools: `qr-generator.tsx`, `embed-code.tsx`, `referral-panel.tsx`
- Upgrade: `upgrade-prompt.tsx`
- Lead finder: `/dashboard/leads`, `/dashboard/leads/[id]` (uses
  `src/lib/leads/` + `/api/v1/leads/*`)

### Influencer

- Portal: `src/components/influencer/portal.tsx` + `dashboard.tsx`,
  `dashboard-components.tsx`
- Discovery: `campaign-discovery.tsx`, `submission-modal.tsx`
- Wallet: `perk-wallet.tsx`, `earnings.tsx`, `earnings-chart.tsx`
- Profile: `profile-editor.tsx`, `profile-basic-info.tsx`,
  `profile-platforms-editor.tsx`, `profile-portfolio-editor.tsx`,
  `profile-rate-card-editor.tsx`, `profile-preview.tsx`
- Media kit: `media-kit.tsx`
- Settings: `settings.tsx`
- Utility: `marketplace-utils.ts`

### Enterprise

- Portal: `src/components/enterprise/portal.tsx` + `dashboard.tsx`
- Multi-location: `multi-location.tsx`
- Brand: `brand-manager.tsx`, `brand-guidelines-editor.tsx`,
  `brand-templates-panel.tsx`, `brand-content-review.tsx`,
  `brand-compliance-table.tsx`
- API access: `api-console.tsx`, `api-keys-section.tsx`,
  `api-usage-section.tsx`, `api-docs-section.tsx`
- Webhooks: `webhooks-section.tsx`, `webhook-dashboard.tsx`
- Reports: `reports.tsx`, `report-charts.tsx`, `report-types.ts`
- Compliance / governance: `audit-log.tsx`, `feature-flags-panel.tsx`

---

## 15. Onboarding Flows

- `src/components/business/onboarding-checklist.tsx` — persistent first-run
  checklist shown in the business portal
- `src/components/business/onboarding-wizard.tsx` — single-page wizard variant
- `src/components/onboarding/wizard.tsx` — primary multi-step wizard (used by
  `/welcome`); fires `onboarding_*` analytics events
- `src/app/welcome/page.tsx` — wraps the wizard for the post-signup landing
- Config: `src/lib/onboarding/`

---

## 16. Payment & Billing

### Code

- `src/lib/stripe.ts` — Stripe client factory + plan price IDs
- `src/lib/billing/enforcement.ts` — plan-limit checks
- `src/lib/billing/store.ts` — subscription store + Stripe-state sync
- `src/lib/payments/` — escrow, ledger, tax, payment helpers
- `src/lib/payouts/` — Stripe Connect payouts
- `src/lib/invoices/` — invoice rendering

### Routes

| Route | Purpose |
| --- | --- |
| `POST /api/v1/billing` | Subscription management (subscribe/cancel/upgrade) |
| `POST /api/v1/billing/checkout` | Create Stripe Checkout session / Payment Link |
| `POST /api/v1/billing/portal` | Stripe customer portal session |
| `POST /api/v1/billing/webhook` | Stripe webhook handler (HMAC) |
| `GET /api/v1/payouts` | List payouts |
| `POST /api/v1/payouts` | Trigger payout |
| `POST /api/v1/payouts/webhook` | Stripe Connect payout webhook |
| `GET /api/v1/usage` | Usage metering |

### Pages

- `/pricing` — public plans
- `/upgrade` — in-app upgrade entry
- `/upgrade/success` — post-checkout landing
- `/admin` (admin/enterprise) — view billing across tenants

### Plans (from `.env.example` Stripe price IDs)

Free, Starter, Pro, Enterprise — each with monthly / annual variants.
Two legacy aliases: `STRIPE_PRICE_PROFESSIONAL_*` parallels `STRIPE_PRICE_PRO_*`.

---

## 17. Referral Systems

- `src/lib/affiliate/index.ts` — affiliate program (tracking, payouts)
- `src/lib/referrals/index.ts` + `tracker.ts` — referral attribution
- Pages: `/affiliate` (program landing), `/ref/[code]` (redirect + attribution)
- API: `GET/POST /api/v1/affiliate`, `GET /api/v1/affiliate/track`,
  `GET/POST /api/v1/referrals`
- UI: `src/components/dashboard/affiliate-section.tsx`,
  `src/components/business/referral-panel.tsx`

---

## 18. Notification Systems

### Email (`src/lib/email/`)

- `index.ts` — `emailProvider` (Resend wrapper, no-op if unset)
- `sender.ts` — low-level send (signs + retries)
- `templates.ts` — registered templates
- `templates/newsletter-confirmation.ts` — newsletter double-opt-in
- `triggers.ts` — event → email triggers (signup welcome, submission approved,
  etc.)
- `drip.ts` — drip sequences (business + influencer paths via `getSequence`)
- `digest.ts` — weekly digest builder (`buildDigestData`, `generateDigestHtml`)

### In-app

- `src/components/shared/notification-center.tsx` — bell + drawer
- `src/lib/hooks/use-notifications.ts` — list/unread state
- `src/lib/hooks/use-notifications-sse.ts` — SSE live stream
- `GET /api/v1/events` — SSE channel for real-time push
- `src/lib/realtime/` — SSE channel manager

### Newsletter

- `src/lib/newsletter/` — subscriber store
- `GET/POST /api/v1/newsletter` — subscribe / unsubscribe / confirm
- `/admin/newsletter` — admin viewer

---

## 19. Upload / Media

- `src/lib/images/optimizer.ts` — image optimization (resize, format conversion)
- `src/lib/images/storage.ts` — storage adapter (S3 / local)
- `GET/POST /api/v1/images` — list + upload with optimization
- Submission proofs (screenshots, video) also flow through the image pipeline.

---

## 20. Admin Systems

- `src/app/admin/layout.tsx` — admin chrome
- `src/app/admin/page.tsx` — top-level admin panel (role-gated:
  `role === "enterprise" || role === "admin"`)
- `src/app/admin/newsletter/page.tsx` — newsletter subscriber admin
  (gated to `role === "admin"`)
- Admin-only API:
  - `GET/POST /api/v1/admin/rate-limits` — view + reset rate limits
  - `GET /api/v1/audit` — audit log
  - `POST /api/v1/migrate` — run pending DB migrations
  - `POST /api/v1/ml/train` — retrain recommendation model
  - `POST /api/v1/seed` — dev seed
- Enterprise-tier admin features: `src/components/enterprise/audit-log.tsx`,
  `feature-flags-panel.tsx`, `api-keys-section.tsx`

---

## 21. Mobile-specific Logic

- `docs/mobile-interop.ts` — interop layer description
- `src/lib/shared/` — `constants.ts`, `formatters.ts`, `validation.ts` shared
  between web + mobile clients
- `src/components/ui/responsive-helpers.tsx` — responsive helpers (replaces
  the `useIsMobile` / `MobileOnly` / `DesktopOnly` pattern)
- No explicit `useIsMobile`, `MobileOnly`, or `DesktopOnly` exports were
  located — the codebase uses Tailwind responsive utilities + the helpers in
  `responsive-helpers.tsx`.
- Service worker: `public/sw.js`; PWA manifest: `public/manifest.json`;
  registered via `src/components/shared/sw-register.tsx`.
- Offline state: `src/lib/hooks/use-offline.ts`,
  `src/components/shared/offline-indicator.tsx`, `src/lib/offline/`.

---

## 22. Feature Flags

- Implementation: `src/lib/feature-flags/index.ts` (CRUD + evaluation)
- API: `GET/POST /api/v1/flags`
- Hook: `src/lib/hooks/use-feature-flag.ts`
- Admin UI: `src/components/enterprise/feature-flags-panel.tsx`

---

## 23. Environment Variables

From `.env.example`. `[R]` = required; `[O]` = optional.

### App

- `NODE_ENV` `[O]` — `development` | `production` | `test`
- `NEXT_PUBLIC_APP_URL` `[R]` — Public URL used for OAuth, emails, widget embeds
- `NEXT_PUBLIC_API_URL` `[O]` — Override API base URL for frontend client

### Auth

- `AUTH_SECRET` `[R]` — JWT signing secret
- `CSRF_SECRET` `[O]` — CSRF HMAC secret (falls back to `AUTH_SECRET`)

### Database

- `DATABASE_URL` `[R]` — Postgres connection string (Prisma-compatible)
- `DIRECT_URL` `[O]` (referenced by `render.yaml`) — direct (non-pooled) URL for migrations

### Redis

- `REDIS_URL` `[O]` — Rate-limit + BullMQ + session store

### Stripe

- `STRIPE_SECRET_KEY` `[R]` — `sk_live_...` / `sk_test_...`
- `STRIPE_WEBHOOK_SECRET` `[R]` — `whsec_...`
- `STRIPE_PLATFORM_ACCOUNT_ID` `[O]` — Connect account ID (default mock)
- `STRIPE_PRICE_FREE` / `STARTER` / `PRO` / `ENTERPRISE` `[O]`
- `STRIPE_PRICE_STARTER_MONTHLY` / `STARTER_ANNUAL` `[O]`
- `STRIPE_PRICE_PROFESSIONAL_MONTHLY` / `PROFESSIONAL_ANNUAL` `[O]`
- `STRIPE_PRICE_PRO_MONTHLY` / `PRO_ANNUAL` `[O]`
- `STRIPE_PRICE_ENTERPRISE_MONTHLY` / `ENTERPRISE_ANNUAL` `[O]`

### Email

- `RESEND_API_KEY` `[O]` — Resend transactional email key
- `EMAIL_FROM` `[O]` — Sender address

### Object Storage

- `S3_BUCKET` `[O]`, `S3_REGION` `[O]`
- `S3_ACCESS_KEY_ID` `[O]`, `S3_SECRET_ACCESS_KEY` `[O]`

### OAuth

- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` `[O]`
- `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET` `[O]`
- `INSTAGRAM_CLIENT_ID`, `INSTAGRAM_CLIENT_SECRET` `[O]`
- `TIKTOK_CLIENT_KEY`, `TIKTOK_CLIENT_SECRET` `[O]`
- `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET` `[O]`
- `X_CLIENT_ID`, `X_CLIENT_SECRET` `[O]`
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET` `[O]`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET` `[O]`

### Platform tokens

- `TELEGRAM_BOT_TOKEN` `[O]`
- `TWITCH_CLIENT_ID` `[O]`

### Lead finder

- `GOOGLE_PLACES_API_KEY` `[O]` — Returns mocks when unset

### Analytics

- `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` `[O]` — defaults to `socialperks.onrender.com`
- `NEXT_PUBLIC_CLOUDFLARE_ANALYTICS_TOKEN` `[O]`

### Cron

- `CRON_SECRET` `[R for scheduled tasks]` — must match value in GitHub Actions secrets

### Infrastructure

- `ALLOWED_ORIGINS` `[O]` — Comma-separated CORS allow-list
- `LOG_LEVEL` `[O]` — `debug` | `info` | `warn` | `error`

---

## 24. Deployment Configs

### `render.yaml`

- Service `socialperks`, runtime `node`, plan `free`, region `oregon`
- Tracks branch `claude/friendly-liskov`
- Build: `npm ci --include=dev && npx prisma generate && npm run build`
- Start: `npm start`
- Health check: `/api/v1/health`
- Env vars synced from dashboard: `AUTH_SECRET`, `CSRF_SECRET`,
  `DATABASE_URL`, `DIRECT_URL`, `NEXT_PUBLIC_APP_URL`
- Pinned `NODE_VERSION=20.11.1`

### `vercel.json`

- Framework `nextjs`, region `iad1`
- `/api/(.*)` gets `X-Robots-Tag: noindex`
- Rewrite: `/health` → `/api/v1/health`

### `.github/workflows/`

- `ci.yml` — lint + typecheck + test + build on push (`main`, `claude/*`) and PR.
  Sets dummy `AUTH_SECRET` / `CSRF_SECRET` so build doesn't fail on missing
  secrets. Caches `.next/cache`.
- `cron.yml` — external cron runner (see §8)
- `deploy.yml` — deployment workflow
- `security.yml` — security scanning workflow
- `smoke.yml` — smoke-test workflow

### Other

- `Dockerfile`, `docker-compose.yml` — container builds for local + self-host
- `next.config.js`, `tailwind.config.js`, `postcss.config.js` — build configs
- `playwright.config.ts` — E2E config (`e2e/`)
- `vitest.config.ts` — unit-test config
- `scripts/smoke-test.sh` — smoke-test runner

---

## 25. Caching Layers

- **Response cache (LRU)**: `src/lib/api/response-cache.ts` — per-route LRU.
- **Edge cache headers**: `src/lib/api/edge-cache.ts` — CDN cache-control helpers.
- **Generic cache barrel**: `src/lib/cache/index.ts`,
  `src/lib/cache/middleware.ts` — middleware wrapper that injects cache.
- **Next.js build cache**: `.next/cache`, cached in CI via `actions/cache@v4`.
- **Public data caching**: pricing / actions / benchmarks routes set CDN
  cache headers via `edge-cache.ts`.

---

## 26. Rate Limiting

Source: `src/lib/security/rate-limiter.ts` — in-memory token-bucket per
`(ip, endpoint)` pair. Tier configurations:

| Tier | Max requests | Window | Use case |
| --- | --- | --- | --- |
| `strict` | 5 | 60 s | Auth, password reset, billing checkout |
| `standard` | 30 | 60 s | Authenticated API calls |
| `relaxed` | 60 | 60 s | Read-only endpoints |
| `public` | 120 | 60 s | Pricing, actions, public data |

Stats: `src/lib/security/rate-limit-stats.ts` records hits + blocks per
`(ip, tier)`; exposed at `GET /api/v1/admin/rate-limits`. Distributed variant
in `src/lib/security/distributed-rate-limiter.ts` (Redis-backed, used when
`REDIS_URL` is set). Headers emitted on every response:
`X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`.

---

## 27. Permissions / Roles

Source of truth: `user.role` on the JWT (issued by `createTokenPair`).
Observed role values in code:

- `business` (canonical), with legacy `business_owner` checked in `use-auth.ts`
- `influencer`
- `enterprise`
- `admin`

### Role gates in code

- `src/lib/hooks/use-auth.ts`
  - `isBusiness = role === "business_owner" || role === "business"`
  - `isInfluencer = role === "influencer"`
  - `isAdmin = role === "admin"`
- `src/app/admin/page.tsx` — gates page on
  `role === "enterprise" || role === "admin"`
- `src/app/admin/newsletter/page.tsx` — gates on `role === "admin"`
- `src/app/api/v1/admin/rate-limits/route.ts` — gates GET + POST on
  `user.role !== "admin" && user.role !== "enterprise"` → 403
- `src/lib/multi-tenant/index.ts` — admin-promotion / last-admin protection
  logic (`role === "admin"`)
- `src/lib/email/drip.ts` — sequence selection by
  `role === "business"` vs influencer

### Auth primitive

`requireAuth(req)` in `src/lib/auth/index.ts` validates Bearer JWT / API key /
cookie and returns the decoded user `{ sub, role, email, businessId }`.
Route handlers then enforce role-specific checks inline.

### Gaps surfaced for the audit phase

- "business" vs "business_owner" duplication in role string set.
- No central RBAC matrix — every route does its own `role !== X` check.
- "enterprise" is treated as a near-admin tier in
  `/api/v1/admin/rate-limits/route.ts` (granted admin-equivalent visibility)
  but not gated everywhere — worth a dedicated review.
