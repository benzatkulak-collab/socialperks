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
- **Auth**: PIN-based demo (structured for NextAuth.js migration)
- **AI**: Backend-only via `/api/v1/ai/*` routes — frontend NEVER runs AI logic
- **API**: RESTful `/api/v1/*` routes with typed responses
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
│       ├── ai/
│       │   ├── generate/route.ts  # AI campaign generation (BACKEND ONLY)
│       │   └── recommend/route.ts # AI recommendations
│       └── auth/route.ts        # Authentication
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
    ├── api/
    │   ├── client.ts            # Frontend API client
    │   └── middleware.ts        # API helpers
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

## Commands
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (localhost:3000)
npm run build        # Production build (must pass with no errors)
npm run lint         # Run ESLint
```

## API Endpoints
```
GET  /api/v1/pricing?actionId=ig_rl&businessType=Restaurant
GET  /api/v1/actions?platformId=ig&type=content
GET  /api/v1/benchmarks?businessType=Coffee+Shop
GET  /api/v1/influencers?niche=food&minFollowers=5000
GET  /api/v1/campaigns?businessId=b1&tier=essential
POST /api/v1/campaigns              # Create/launch campaign
POST /api/v1/ai/generate            # Generate campaign suggestions
POST /api/v1/ai/recommend           # Get optimization recommendations
POST /api/v1/auth                   # Login
```

## Demo Accounts (PIN: 1234)
**Business:** yoga@ · sol@ · glow@ · iron@ · baked@ · ink@ · vet@ · bloom@ · smith@ · spark@ demo.com
**Influencer:** priya@ · marcus@ · style@ · photo@ · wellness@ demo.com
