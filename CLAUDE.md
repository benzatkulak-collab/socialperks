# Social Perks — Turn Customers Into Your Marketing Team

## What This Is
Social Perks is a platform where businesses offer perks (discounts/rewards) to customers in exchange for marketing actions across social media. Serves three audiences: mom & pop small businesses, influencers/creators, and enterprise brands. The backend AI engine powers campaign generation and recommendations; the frontend is business-focused and approachable.

## Architecture
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS + custom CSS variables in `globals.css`
- **Fonts**: Instrument Serif (headings), DM Sans (body), JetBrains Mono (data)
- **Database**: Supabase Postgres (18 tables, RLS enabled) with in-memory fallback when `DATABASE_URL` not set
- **Connection Pooling**: PgBouncer on port 6543; direct connection on port 5432 for migrations
- **State**: localStorage with hooks (migration-ready for Postgres + Prisma)
- **Engines**: 14 backend engines (event sourcing, state machine, fraud detection, etc.)
- **10-Year Architecture**: Plugin system, social graph, vector embeddings, offline sync
- **Auth**: JWT httpOnly cookies + Bearer tokens + API keys (PIN auth deprecated) + 2FA/TOTP
- **AI**: Backend-only via `/api/v1/ai/*` routes — frontend NEVER runs AI logic
- **API**: RESTful `/api/v1/*` routes + GraphQL at `/api/graphql` with typed responses
- **Agent-First**: MCP server, OpenAPI 3.1 spec, ai-plugin.json, sandbox environment, idempotency keys
- **Security**: Layered security (CSRF on all writes, tiered rate limiting, input validation, HTML sanitization, CORS + security headers via global middleware)
- **Monitoring**: 100% request tracing on all API routes with structured JSON logging + Server-Timing headers + audit log
- **CI/CD**: GitHub Actions (lint, typecheck, test, build, deploy, security scanning)
- **Mobile**: Shared interop layer in `src/lib/shared/mobile-interop.ts`
- **PWA**: Service worker + manifest for installable web app
- **i18n**: EN/ES/PT with `useTranslation()` hook, pluralization, interpolation

## Project Structure
```
.storybook/                        # Storybook config
.github/workflows/                 # CI pipeline (lint, typecheck, test, build, deploy)
e2e/                               # Playwright E2E tests
k6/                                # Load testing scripts
public/
├── sw.js                          # Service worker (PWA)
└── manifest.json                  # PWA manifest
vercel.json                        # Vercel deployment config
src/
├── middleware.ts                   # Global Next.js middleware (CORS, security headers)
├── app/
│   ├── globals.css                # Design system, animations, utilities
│   ├── layout.tsx                 # Root layout with metadata + viewport
│   ├── page.tsx                   # Entry → imports SocialPerksApp
│   ├── campaign/[campaignId]/     # Public campaign pages with OG images
│   ├── widget/[businessId]/       # Embeddable widget page
│   ├── developers/                # Developer documentation hub
│   └── api/
│       ├── graphql/route.ts       # GraphQL endpoint + playground
│       └── v1/
│           ├── campaigns/
│           │   ├── route.ts             # Campaign CRUD (list/create)
│           │   ├── [campaignId]/route.ts # Campaign detail/update/delete
│           │   └── experiments/route.ts  # A/B testing
│           ├── pricing/route.ts         # Pricing oracle (agents query this)
│           ├── actions/route.ts         # Action library
│           ├── influencers/
│           │   ├── route.ts             # Influencer search/register
│           │   └── [influencerId]/route.ts # Influencer detail/update/delete
│           ├── benchmarks/route.ts      # Industry benchmarks
│           ├── submissions/
│           │   ├── route.ts             # Submission CRUD (list/create)
│           │   ├── [submissionId]/route.ts # Submission detail/delete
│           │   └── review/route.ts      # Submission review (approve/reject)
│           ├── billing/
│           │   ├── route.ts             # Subscription management
│           │   └── webhook/route.ts     # Stripe webhook handler
│           ├── programs/
│           │   ├── route.ts             # Perk program CRUD
│           │   └── [programId]/
│           │       ├── route.ts             # Program details/update/delete
│           │       ├── progress/route.ts    # Member progress
│           │       ├── submit/route.ts      # Action submission
│           │       ├── cashback/route.ts    # Cash back management
│           │       └── members/route.ts     # Member enrollment
│           ├── exchange/
│           │   ├── opportunities/route.ts   # Market opportunities (public)
│           │   ├── market/route.ts      # Real-time market data (public)
│           │   ├── orders/route.ts      # Buy/sell order management
│           │   ├── trades/route.ts      # Trade lifecycle
│           │   └── enroll/route.ts      # Agent auto-enrollment
│           ├── ai/
│           │   ├── generate/route.ts    # AI campaign generation (BACKEND ONLY)
│           │   ├── recommend/route.ts   # AI recommendations
│           │   ├── review/route.ts      # AI submission review pipeline
│           │   ├── campaign-agent/route.ts # Full AI marketing plan
│           │   └── quick-start/route.ts # Quick-start recommendation
│           ├── auth/
│           │   ├── route.ts             # Authentication (login/signup/logout/refresh)
│           │   ├── totp/route.ts        # 2FA setup/verify/disable
│           │   ├── sessions/route.ts    # Session listing/revocation
│           │   └── oauth/
│           │       ├── connect/route.ts     # OAuth initiation
│           │       └── [provider]/callback/route.ts # OAuth callback
│           ├── oauth/
│           │   ├── connect/route.ts     # Start OAuth flow (legacy)
│           │   └── [platform]/route.ts  # OAuth callback (legacy)
│           ├── batch/route.ts           # Bulk approve/reject/launch/pause/delete
│           ├── images/route.ts          # Upload with optimization
│           ├── search/route.ts          # Full-text search (TF-IDF + fuzzy)
│           ├── export/route.ts          # CSV/PDF data export
│           ├── flags/route.ts           # Feature flag CRUD
│           ├── admin/rate-limits/route.ts # Rate limit stats/reset
│           ├── audit/route.ts           # Audit log
│           ├── csrf/route.ts            # CSRF token generation
│           ├── docs/
│           │   ├── route.ts             # OpenAPI 3.1 JSON spec
│           │   └── ui/route.ts          # Swagger UI
│           ├── capabilities/route.ts    # Machine-readable API descriptor
│           ├── status/route.ts          # System status with circuit breakers
│           ├── mcp/route.ts             # MCP server definition
│           ├── sdk/python/route.ts      # Python SDK download
│           ├── sandbox/route.ts         # Sandbox environment
│           ├── widget/embed/route.ts    # Embeddable JS snippet
│           ├── events/route.ts          # SSE real-time stream
│           ├── legal/route.ts           # Legal compliance briefings
│           ├── recommendations/route.ts # ML-powered recommendations
│           ├── verification/
│           │   └── webhook/route.ts     # Platform webhook receiver
│           ├── health/route.ts          # Health check
│           └── seed/route.ts            # Dev-only seed data
├── components/
│   ├── app.tsx                    # Main client component (multi-audience)
│   ├── ui/                        # Reusable UI primitives (Badge, Button, Card, etc.)
│   ├── landing/
│   │   ├── testimonials.tsx       # Testimonials carousel
│   │   ├── pricing-table.tsx      # Pricing comparison
│   │   └── ...                    # Other landing page sections
│   ├── business/                  # Business portal components
│   ├── influencer/                # Influencer portal components
│   ├── enterprise/                # Enterprise dashboard components
│   ├── widget/                    # Embeddable perk widget
│   └── shared/                    # Shared (Nav, Footer, Ticker)
└── lib/
    ├── types.ts                   # TypeScript type definitions
    ├── platforms.ts               # 25 platforms, 125 actions, tiers, events
    ├── ai-engine.ts               # AI campaign generation (imported by API routes only)
    ├── seed.ts                    # Demo data (businesses, influencers, stats)
    ├── ideas.ts                   # 1000 platform ideas
    ├── db/
    │   └── schema.ts              # Prisma-ready database schema (18 tables)
    ├── security/
    │   ├── index.ts               # Security barrel export
    │   ├── sanitize.ts            # HTML escaping for templates
    │   ├── csrf.ts                # CSRF token generation/validation
    │   ├── rate-limiter.ts        # Tiered rate limiting
    │   └── validate.ts            # Input validation functions
    ├── context/
    │   └── app-context.tsx        # Global app state (Context + useReducer)
    ├── api/
    │   ├── client.ts              # Frontend API client
    │   ├── sdk.ts                 # TypeScript API client SDK
    │   ├── middleware.ts           # API helpers + rate limiting
    │   ├── with-request-context.ts # Universal request tracing wrapper
    │   ├── idempotency.ts         # Idempotency key middleware
    │   ├── edge-cache.ts          # CDN cache header utilities
    │   └── response-cache.ts      # LRU response cache
    ├── hooks/
    │   ├── use-store.ts           # localStorage hook
    │   ├── use-campaigns.ts       # Campaign management hook
    │   ├── use-auth.ts            # Auth hook
    │   ├── use-api.ts             # Generic API hook
    │   └── use-notifications.ts   # Notification system
    ├── shared/
    │   ├── constants.ts           # Shared constants (web + mobile)
    │   ├── formatters.ts          # Number/currency/date formatting
    │   └── validation.ts          # Input validation
    ├── audit/                     # Audit logging system (11 event types)
    ├── sandbox/                   # Sandbox environment for testing
    ├── search/                    # Full-text search engine (TF-IDF + fuzzy)
    ├── images/                    # Image optimization + S3/local storage
    ├── i18n/                      # Internationalization (EN/ES/PT)
    ├── seo/                       # JSON-LD structured data
    ├── ml/                        # ML training pipeline + recommendation model
    ├── experiments/               # Campaign A/B testing

    # Engine files (src/lib/):
    ├── submissions.ts             # Campaign submission & proof system
    ├── perk-wallet.ts             # Perk earning, redemption, expiry
    ├── events.ts                  # Event sourcing foundation
    ├── campaign-state-machine.ts  # Campaign lifecycle state machine
    ├── analytics-engine.ts        # Real-time analytics from events
    ├── matching-engine.ts         # Influencer-business matching algorithm
    ├── fraud-detection.ts         # Content fraud & abuse detection
    ├── compliance-engine.ts       # FTC compliance automation
    ├── financial-ledger.ts        # Double-entry bookkeeping
    ├── sync-engine.ts             # Offline-first sync for mobile
    ├── verification-engine.ts     # Social media proof verification
    ├── plugin-system.ts           # Plugin/extension architecture
    ├── graph-engine.ts            # Social graph & relationships
    └── embedding-engine.ts        # Vector embeddings for ML matching
```

## Key Concepts

### Three Audiences
1. **Small Businesses (Mom & Pop)**: Simple campaign wizard, QR codes, one-click review campaigns
2. **Influencers/Creators**: Profile, rate card, campaign discovery, earnings tracking
3. **Enterprise**: Multi-location management, brand compliance, API access, reporting

### AI is Backend-Only
- Campaign generation: `POST /api/v1/ai/generate`
- Recommendations: `POST /api/v1/ai/recommend`
- Pricing oracle: `GET /api/v1/pricing`
- Benchmarks: `GET /api/v1/benchmarks`
- The frontend calls APIs — it never imports `ai-engine.ts` directly

### Platforms & Actions
- 25 social media platforms, 125 marketing actions
- Each action: effort (0-5), value ($), type (content/review/engage/share/referral)
- Data in `src/lib/platforms.ts`

### Campaign Tiers
- Essential (green) — every business should run
- High Impact (orange) — best ROI
- Growth (cyan) — scaling campaigns
- Premium (pink) — high-effort, high-reward
- Starter (gray) — low-effort entry

### Follower Bonus Tiers
- Anyone (0-499): base perk
- 500+: +5%  |  2K+: +10%  |  10K+: +15%  |  50K+: +25%

### FTC Compliance
Auto-injected per platform. Cannot be disabled.

### Internationalization
- Three languages: EN, ES, PT
- `useTranslation()` hook for all UI strings
- Supports pluralization and variable interpolation
- Locale files in `src/lib/i18n/`

### Agent-First Architecture
- **MCP Server**: `GET /api/v1/mcp` — machine-consumable server definition
- **OpenAPI 3.1**: `GET /api/v1/docs` — full API spec; `GET /api/v1/docs/ui` — Swagger UI
- **AI Plugin**: `GET /.well-known/ai-plugin.json` — agent plugin manifest
- **Capabilities**: `GET /api/v1/capabilities` — machine-readable API descriptor
- **Sandbox**: `POST /api/v1/sandbox` — isolated environment for safe testing
- **Idempotency**: All mutation endpoints accept `Idempotency-Key` header for safe retries
- **Python SDK**: `GET /api/v1/sdk/python` — downloadable SDK

### Embeddable Widget
- Businesses embed a JS snippet on their site to show available perks
- Widget page: `src/app/widget/[businessId]/`
- Embed script: `GET /api/v1/widget/embed`
- Widget components: `src/components/widget/`

## Design System
- **Aesthetic**: Infrastructure Luxury — Stripe meets Bloomberg
- **Theme**: Dark (#0C0F1A background)
- **Primary**: Cyan (#22D3EE)
- **Success**: Green (#34D399)
- **Warning**: Amber (#FBBF24)
- **Typography**: Serif headings (italic), sans body, mono for data
- **Cards**: Subtle borders, hover lift, colored left borders for tiers

## Security Architecture
- **Rate Limiting**: 4-tier system (strict/standard/relaxed/public) in `lib/security/rate-limiter.ts`
- **CSRF Protection**: HMAC-SHA256 tokens with session binding — enforced on ALL write routes via `lib/security/csrf.ts`
- **Global Middleware**: CORS headers + security headers (CSP, HSTS, X-Frame-Options) in `src/middleware.ts`
- **Input Validation**: Centralized validators (email, ID, string, number, enum) in `lib/security/validate.ts`
- **XSS Prevention**: HTML entity escaping for all email templates via `lib/security/sanitize.ts`
- **Auth**: JWT httpOnly cookies + Bearer tokens + API keys (PIN auth deprecated)
- **2FA/TOTP**: Time-based one-time passwords via `POST /api/v1/auth/totp`
- **Session Management**: Session listing and revocation via `/api/v1/auth/sessions`
- **API Key Scoping**: Three tiers — read, read-write, admin
- **Idempotency Keys**: Prevents duplicate mutations on retry via `lib/api/idempotency.ts`
- **Sandbox Environment**: Isolated testing environment at `POST /api/v1/sandbox`
- **Webhooks**: HMAC-SHA256 signature verification with replay protection

## Database
- **Primary**: Supabase Postgres (18 tables, RLS enabled)
- **Connection Pooling**: PgBouncer on port 6543 for application connections
- **Migrations**: Direct connection on port 5432
- **Dual-Mode**: Real Postgres when `DATABASE_URL` is set; in-memory fallback otherwise
- **Schema**: Prisma-ready in `src/lib/db/schema.ts`

## Monitoring & Observability
- **Request Tracing**: Every route wrapped with `withRequestContext` or `withTracing`
- **Structured Logging**: JSON format with requestId, method, path, status, duration, IP
- **Response Headers**: `X-Request-Id` and `X-Response-Time` on every response
- **Server-Timing**: Performance timing headers on all responses
- **Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`
- **Rate Limit Stats**: Tracking and admin visibility via `GET /api/v1/admin/rate-limits`
- **Audit Log**: 11 event types tracked via `src/lib/audit/`; queryable at `GET /api/v1/audit`

## Commands
```bash
npm install            # Install dependencies
npm run dev            # Start dev server (localhost:3000)
npm run build          # Production build (must pass with no errors)
npm run lint           # Run ESLint
npm run test           # Run test suite
npm run test:coverage  # Run tests with coverage report
npm run test:load      # Run k6 load tests
npm run storybook      # Launch Storybook on port 6006
npm run build-storybook # Build static Storybook
npx prisma generate    # Generate Prisma client
npx prisma db seed     # Seed database with demo data
npx prisma studio      # Open Prisma database UI
```

## API Endpoints (70+ routes)
```
# Auth
GET  /api/v1/auth                           # Validate session (Bearer token)
POST /api/v1/auth                           # Login/signup/logout/refresh/reset-password
POST /api/v1/auth/totp                      # 2FA setup/verify/disable
GET  /api/v1/auth/sessions                  # List active sessions
POST /api/v1/auth/sessions                  # Revoke session
POST /api/v1/auth/oauth/connect             # OAuth initiation
GET  /api/v1/auth/oauth/:provider/callback  # OAuth callback

# Campaigns
GET  /api/v1/campaigns                      # List campaigns (filterable)
POST /api/v1/campaigns                      # Create/launch campaign
GET  /api/v1/campaigns/:campaignId          # Campaign details
PUT  /api/v1/campaigns/:campaignId          # Update campaign
DELETE /api/v1/campaigns/:campaignId        # Delete campaign
GET  /api/v1/campaigns/experiments          # List A/B experiments
POST /api/v1/campaigns/experiments          # Create A/B experiment

# Submissions
GET  /api/v1/submissions                    # List submissions (filterable)
POST /api/v1/submissions                    # Create submission with proof
GET  /api/v1/submissions/:submissionId      # Submission details
DELETE /api/v1/submissions/:submissionId    # Delete submission
POST /api/v1/submissions/review             # Approve/reject submission

# Influencers
GET  /api/v1/influencers                    # Search influencers
POST /api/v1/influencers                    # Register influencer
GET  /api/v1/influencers/:influencerId      # Influencer details
PUT  /api/v1/influencers/:influencerId      # Update influencer
DELETE /api/v1/influencers/:influencerId    # Delete influencer

# AI (Backend-Only)
POST /api/v1/ai/generate                    # Generate campaign suggestions
POST /api/v1/ai/recommend                   # Optimization recommendations
POST /api/v1/ai/review                      # AI submission review pipeline
POST /api/v1/ai/campaign-agent              # Full AI marketing plan
POST /api/v1/ai/quick-start                 # Quick-start single recommendation

# Billing
POST /api/v1/billing                        # Subscription management
POST /api/v1/billing/webhook                # Stripe webhook handler

# Perk Programs
GET  /api/v1/programs                       # List programs
POST /api/v1/programs                       # Create program
GET  /api/v1/programs/:id                   # Program details
PUT  /api/v1/programs/:id                   # Update program
DELETE /api/v1/programs/:id                 # End program
GET  /api/v1/programs/:id/progress          # Member progress
POST /api/v1/programs/:id/submit            # Submit action
GET  /api/v1/programs/:id/cashback          # List payouts
POST /api/v1/programs/:id/cashback          # Request/manage cashback
GET  /api/v1/programs/:id/members           # List members
POST /api/v1/programs/:id/members           # Enroll member

# Exchange
GET  /api/v1/exchange/opportunities         # Market opportunities (public)
GET  /api/v1/exchange/market                # Real-time market data (public)
GET  /api/v1/exchange/orders                # List orders
POST /api/v1/exchange/orders                # Place buy/sell order
GET  /api/v1/exchange/trades                # List trades
POST /api/v1/exchange/trades                # Trade lifecycle actions
POST /api/v1/exchange/enroll                # Agent auto-enrollment

# Batch Operations
POST /api/v1/batch                          # Bulk approve/reject/launch/pause/delete

# Images
GET  /api/v1/images                         # List images
POST /api/v1/images                         # Upload with optimization

# Search
GET  /api/v1/search                         # Full-text search (TF-IDF + fuzzy)

# Export
POST /api/v1/export                         # CSV/PDF data export

# Feature Flags
GET  /api/v1/flags                          # List feature flags
POST /api/v1/flags                          # Create/update feature flag

# Admin
GET  /api/v1/admin/rate-limits              # Rate limit statistics
POST /api/v1/admin/rate-limits              # Reset rate limits
GET  /api/v1/audit                          # Audit log

# Security
GET  /api/v1/csrf                           # CSRF token generation

# Reference Data (public, cached)
GET  /api/v1/pricing                        # Pricing oracle
GET  /api/v1/actions                        # Action library (125 actions)
GET  /api/v1/benchmarks                     # Industry benchmarks
GET  /api/v1/recommendations                # ML-powered recommendations
GET  /api/v1/legal                          # Legal compliance briefings

# Developer & Agent
GET  /api/v1/docs                           # OpenAPI 3.1 JSON spec
GET  /api/v1/docs/ui                        # Swagger UI
GET  /api/v1/capabilities                   # Machine-readable API descriptor
GET  /api/v1/status                         # System status with circuit breakers
GET  /api/v1/mcp                            # MCP server definition
GET  /api/v1/sdk/python                     # Python SDK download
GET  /.well-known/ai-plugin.json            # AI agent plugin manifest
POST /api/v1/sandbox                        # Sandbox environment

# Widget
GET  /api/v1/widget/embed                   # Embeddable JS snippet

# GraphQL
GET  /api/graphql                           # GraphQL playground
POST /api/graphql                           # GraphQL queries/mutations

# Infrastructure
GET  /api/v1/events                         # SSE real-time stream
GET  /api/v1/health                         # Health check
POST /api/v1/oauth/connect                  # Start OAuth flow (legacy)
GET  /api/v1/oauth/:platform                # OAuth callback (legacy)
POST /api/v1/verification/webhook           # Platform webhook receiver
GET  /api/v1/verification/webhook           # Webhook challenge verification
POST /api/v1/seed                           # Dev-only seed data
```

See `API.md` for full request/response documentation.

## Demo Accounts (PIN: 1234)
**Business:** yoga@ · sol@ · glow@ · iron@ · baked@ · ink@ · vet@ · bloom@ · smith@ · spark@ demo.com
**Influencer:** priya@ · marcus@ · style@ · photo@ · wellness@ demo.com
