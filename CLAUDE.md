# Social Perks — Turn Customers Into Your Marketing Team

## What This Is
Social Perks is a platform where businesses offer perks (discounts/rewards) to customers in exchange for marketing actions across social media. Serves three audiences: mom & pop small businesses, influencers/creators, and enterprise brands. The backend AI engine powers campaign generation and recommendations; the frontend is business-focused and approachable.

## Architecture
- **Framework**: Next.js 15 with App Router, React 19, TypeScript
- **Styling**: Tailwind CSS + custom CSS variables in `globals.css`
- **Fonts**: Instrument Serif (headings), DM Sans (body), JetBrains Mono (data)
- **State**: localStorage with hooks (migration-ready for Postgres + Prisma)
- **Engines**: 14 backend engines (event sourcing, state machine, fraud detection, etc.)
- **10-Year Architecture**: Plugin system, social graph, vector embeddings, offline sync
- **Auth**: JWT httpOnly cookies + Bearer tokens + API keys (PIN auth deprecated)
- **AI**: Backend-only via `/api/v1/ai/*` routes — frontend NEVER runs AI logic
- **API**: RESTful `/api/v1/*` routes with typed responses
- **Security**: Layered security (CSRF tokens, tiered rate limiting, input validation, HTML sanitization)
- **Monitoring**: 100% request tracing on all 35 API routes with structured JSON logging
- **CI/CD**: GitHub Actions (lint, typecheck, test, build, deploy, security scanning)
- **Mobile**: Shared interop layer in `src/lib/shared/mobile-interop.ts`

## Project Structure
```
src/
├── app/
│   ├── globals.css              # Design system, animations, utilities
│   ├── layout.tsx               # Root layout with metadata + viewport
│   ├── page.tsx                 # Entry → imports SocialPerksApp
│   └── api/v1/
│       ├── campaigns/route.ts   # Campaign CRUD
│       ├── pricing/route.ts     # Pricing oracle (agents query this)
│       ├── actions/route.ts     # Action library
│       ├── influencers/route.ts # Influencer search/register
│       ├── benchmarks/route.ts  # Industry benchmarks
│       ├── submissions/
│       │   ├── route.ts           # Submission CRUD
│       │   └── review/route.ts    # Submission review (approve/reject)
│       ├── billing/
│       │   ├── route.ts           # Subscription management
│       │   └── webhook/route.ts   # Stripe webhook handler
│       ├── programs/
│       │   ├── route.ts           # Perk program CRUD
│       │   └── [programId]/
│       │       ├── route.ts       # Program details/update/delete
│       │       ├── progress/route.ts  # Member progress
│       │       ├── submit/route.ts    # Action submission
│       │       ├── cashback/route.ts  # Cash back management
│       │       └── members/route.ts   # Member enrollment
│       ├── exchange/
│       │   ├── opportunities/route.ts # Market opportunities (public)
│       │   ├── market/route.ts    # Real-time market data (public)
│       │   ├── orders/route.ts    # Buy/sell order management
│       │   ├── trades/route.ts    # Trade lifecycle
│       │   └── enroll/route.ts    # Agent auto-enrollment
│       ├── ai/
│       │   ├── generate/route.ts  # AI campaign generation (BACKEND ONLY)
│       │   ├── recommend/route.ts # AI recommendations
│       │   ├── review/route.ts    # AI submission review pipeline
│       │   ├── campaign-agent/route.ts # Full AI marketing plan
│       │   └── quick-start/route.ts   # Quick-start recommendation
│       ├── oauth/
│       │   ├── connect/route.ts   # Start OAuth flow
│       │   └── [platform]/route.ts # OAuth callback
│       ├── events/route.ts        # SSE real-time stream
│       ├── legal/route.ts         # Legal compliance briefings
│       ├── recommendations/route.ts # ML-powered recommendations
│       ├── verification/
│       │   └── webhook/route.ts   # Platform webhook receiver
│       ├── health/route.ts        # Health check
│       ├── seed/route.ts          # Dev-only seed data
│       └── auth/route.ts          # Authentication
├── components/
│   ├── app.tsx                  # Main client component (multi-audience)
│   ├── ui/                      # Reusable UI primitives (Badge, Button, Card, etc.)
│   ├── landing/                 # Landing page sections
│   ├── business/                # Business portal components
│   ├── influencer/              # Influencer portal components
│   ├── enterprise/              # Enterprise dashboard components
│   └── shared/                  # Shared (Nav, Footer, Ticker)
└── lib/
    ├── types.ts                 # TypeScript type definitions
    ├── platforms.ts             # 15 platforms, 107 actions, tiers, events
    ├── ai-engine.ts             # AI campaign generation (imported by API routes only)
    ├── seed.ts                  # Demo data (businesses, influencers, stats)
    ├── ideas.ts                 # 1000 platform ideas
    ├── db/
    │   └── schema.ts            # Prisma-ready database schema
    ├── security/
    │   ├── index.ts             # Security barrel export
    │   ├── sanitize.ts          # HTML escaping for templates
    │   ├── csrf.ts              # CSRF token generation/validation
    │   ├── rate-limiter.ts      # Tiered rate limiting
    │   └── validate.ts          # Input validation functions
    ├── context/
    │   └── app-context.tsx      # Global app state (Context + useReducer)
    ├── api/
    │   ├── client.ts            # Frontend API client
    │   ├── middleware.ts         # API helpers + rate limiting
    │   └── with-request-context.ts  # Universal request tracing wrapper
    ├── hooks/
    │   ├── use-store.ts         # localStorage hook
    │   ├── use-campaigns.ts     # Campaign management hook
    │   ├── use-auth.ts          # Auth hook
    │   ├── use-api.ts           # Generic API hook
    │   └── use-notifications.ts # Notification system
    └── shared/
        ├── constants.ts         # Shared constants (web + mobile)
        ├── formatters.ts        # Number/currency/date formatting
        └── validation.ts        # Input validation

    # Engine files (src/lib/):
    ├── submissions.ts           # Campaign submission & proof system
    ├── perk-wallet.ts           # Perk earning, redemption, expiry
    ├── events.ts                # Event sourcing foundation
    ├── campaign-state-machine.ts # Campaign lifecycle state machine
    ├── analytics-engine.ts      # Real-time analytics from events
    ├── matching-engine.ts       # Influencer-business matching algorithm
    ├── fraud-detection.ts       # Content fraud & abuse detection
    ├── compliance-engine.ts     # FTC compliance automation
    ├── financial-ledger.ts      # Double-entry bookkeeping
    ├── sync-engine.ts           # Offline-first sync for mobile
    ├── verification-engine.ts   # Social media proof verification
    ├── plugin-system.ts         # Plugin/extension architecture
    ├── graph-engine.ts          # Social graph & relationships
    └── embedding-engine.ts      # Vector embeddings for ML matching
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
- 15 social media platforms, 107 marketing actions
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
- **CSRF Protection**: HMAC-SHA256 tokens with session binding in `lib/security/csrf.ts`
- **Input Validation**: Centralized validators (email, ID, string, number, enum) in `lib/security/validate.ts`
- **XSS Prevention**: HTML entity escaping for all email templates via `lib/security/sanitize.ts`
- **Auth**: JWT httpOnly cookies + Bearer tokens + API keys (PIN auth deprecated)
- **Webhooks**: HMAC-SHA256 signature verification with replay protection

## Monitoring & Observability
- **Request Tracing**: Every route wrapped with `withRequestContext` or `withTracing`
- **Structured Logging**: JSON format with requestId, method, path, status, duration, IP
- **Response Headers**: `X-Request-Id` and `X-Response-Time` on every response
- **Rate Limit Headers**: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (must pass with no errors)
npm run lint         # Run ESLint
npm run test         # Run test suite
npm run test:coverage  # Run tests with coverage report
```

## API Endpoints (35 routes)
```
# Auth
GET  /api/v1/auth                    # Validate session (Bearer token)
POST /api/v1/auth                    # Login/signup/logout/refresh/reset-password

# Campaigns
GET  /api/v1/campaigns               # List campaigns (filterable)
POST /api/v1/campaigns               # Create/launch campaign

# Submissions
GET  /api/v1/submissions             # List submissions (filterable)
POST /api/v1/submissions             # Create submission with proof
POST /api/v1/submissions/review      # Approve/reject submission

# AI (Backend-Only)
POST /api/v1/ai/generate             # Generate campaign suggestions
POST /api/v1/ai/recommend            # Optimization recommendations
POST /api/v1/ai/review               # AI submission review pipeline
POST /api/v1/ai/campaign-agent       # Full AI marketing plan
POST /api/v1/ai/quick-start          # Quick-start single recommendation

# Billing
POST /api/v1/billing                 # Subscription management
POST /api/v1/billing/webhook         # Stripe webhook handler

# Perk Programs
GET  /api/v1/programs                # List programs
POST /api/v1/programs                # Create program
GET  /api/v1/programs/:id            # Program details
PUT  /api/v1/programs/:id            # Update program
DELETE /api/v1/programs/:id          # End program
GET  /api/v1/programs/:id/progress   # Member progress
POST /api/v1/programs/:id/submit     # Submit action
GET  /api/v1/programs/:id/cashback   # List payouts
POST /api/v1/programs/:id/cashback   # Request/manage cashback
GET  /api/v1/programs/:id/members    # List members
POST /api/v1/programs/:id/members    # Enroll member

# Exchange
GET  /api/v1/exchange/opportunities  # Market opportunities (public)
GET  /api/v1/exchange/market         # Real-time market data (public)
GET  /api/v1/exchange/orders         # List orders
POST /api/v1/exchange/orders         # Place buy/sell order
GET  /api/v1/exchange/trades         # List trades
POST /api/v1/exchange/trades         # Trade lifecycle actions
POST /api/v1/exchange/enroll         # Agent auto-enrollment

# Reference Data (public, cached)
GET  /api/v1/pricing                 # Pricing oracle
GET  /api/v1/actions                 # Action library (107 actions)
GET  /api/v1/benchmarks              # Industry benchmarks
GET  /api/v1/influencers             # Search influencers
POST /api/v1/influencers             # Register influencer
GET  /api/v1/recommendations         # ML-powered recommendations
GET  /api/v1/legal                   # Legal compliance briefings

# Infrastructure
GET  /api/v1/events                  # SSE real-time stream
GET  /api/v1/health                  # Health check
POST /api/v1/oauth/connect           # Start OAuth flow
GET  /api/v1/oauth/:platform         # OAuth callback
POST /api/v1/verification/webhook    # Platform webhook receiver
GET  /api/v1/verification/webhook    # Webhook challenge verification
POST /api/v1/seed                    # Dev-only seed data
```

See `API.md` for full request/response documentation.

## Demo Accounts (PIN: 1234)
**Business:** yoga@ · sol@ · glow@ · iron@ · baked@ · ink@ · vet@ · bloom@ · smith@ · spark@ demo.com
**Influencer:** priya@ · marcus@ · style@ · photo@ · wellness@ demo.com
