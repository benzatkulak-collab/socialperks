/**
 * Architecture Roadmap — 2-3 Year Vision
 *
 * This file documents what we should have built from the start
 * and the architectural changes needed for years 2 and 3.
 *
 * YEAR 1 (Current): Foundation
 * - Monolith web app → Decomposed components ✓
 * - Client-side AI → Backend API routes ✓
 * - localStorage → Ready for Postgres migration
 * - PIN auth → Ready for proper auth
 * - 25 platforms, 125 actions → Extensible platform system
 * - Single business portal → Multi-audience (business, influencer, enterprise) ✓
 *
 * YEAR 2: Scale & Monetize
 * - Database migration (Prisma + Postgres)
 * - Real authentication (NextAuth.js / Clerk)
 * - Payment integration (Stripe Connect)
 * - Social media API integrations for verification
 * - Mobile app (React Native / Expo)
 * - MCP server for AI agent ecosystem
 * - Real-time updates (WebSockets)
 * - Email transactional system
 * - CDN for user-generated content
 *
 * YEAR 3: Platform & Ecosystem
 * - White-label solution
 * - Marketplace for campaign templates
 * - AI content generation integration
 * - International expansion (i18n, multi-currency)
 * - Advanced analytics with ML predictions
 * - Partner API ecosystem
 * - Self-serve enterprise onboarding
 * - Automated compliance engine
 */

// ═══════════════ What We Should Have Done Differently ═══════════════

export const ARCHITECTURAL_DEBTS = [
  {
    area: "State Management",
    currentState: "localStorage with manual serialization",
    shouldHaveDone: "Server-side state from day 1 with optimistic UI updates",
    fixPlan: "Migrate to Prisma + Postgres. Use React Server Components for data fetching. Add TanStack Query for client cache.",
    effort: "medium",
    priority: "critical",
  },
  {
    area: "Authentication",
    currentState: "PIN-based with email lookup",
    shouldHaveDone: "Proper auth from the start — even if just email magic links",
    fixPlan: "Add NextAuth.js with email provider, Google OAuth, and Apple Sign In. JWT tokens stored in httpOnly cookies.",
    effort: "medium",
    priority: "critical",
  },
  {
    area: "API Design",
    currentState: "REST API routes returning JSON",
    shouldHaveDone: "GraphQL or tRPC for type-safe client-server communication",
    fixPlan: "Keep REST for external consumers (agents, mobile). Add tRPC for internal web app communication. Both share the same business logic layer.",
    effort: "large",
    priority: "high",
  },
  {
    area: "Component Architecture",
    currentState: "Monolith decomposed into feature components",
    shouldHaveDone: "Proper component library with Storybook from day 1",
    fixPlan: "Extract UI primitives to a shared package. Add Storybook for visual testing. This shared package serves web, mobile, and white-label.",
    effort: "medium",
    priority: "medium",
  },
  {
    area: "Testing",
    currentState: "No tests",
    shouldHaveDone: "At minimum: API route tests and critical path E2E tests",
    fixPlan: "Add Vitest for unit/integration tests. Playwright for E2E. Test the AI engine, API routes, and auth flow first.",
    effort: "medium",
    priority: "high",
  },
  {
    area: "Monitoring",
    currentState: "Console logs only",
    shouldHaveDone: "Structured logging and error tracking from day 1",
    fixPlan: "Add Sentry for error tracking. Pino for structured logging. PostHog or Plausible for analytics.",
    effort: "small",
    priority: "high",
  },
  {
    area: "Caching",
    currentState: "HTTP cache headers on API routes",
    shouldHaveDone: "Redis cache layer for pricing oracle and benchmark data",
    fixPlan: "Add Upstash Redis. Cache AI campaign generation (keyed by businessType+size). Cache pricing data with 1hr TTL.",
    effort: "small",
    priority: "medium",
  },
  {
    area: "File/Media Storage",
    currentState: "No user uploads",
    shouldHaveDone: "Plan for proof submissions (screenshots, URLs) from the start",
    fixPlan: "Add S3-compatible storage (R2 or S3). Presigned upload URLs. Image processing pipeline for thumbnails.",
    effort: "medium",
    priority: "high",
  },
  {
    area: "Internationalization",
    currentState: "English-only, USD-only",
    shouldHaveDone: "i18n-ready string extraction even if only shipping English",
    fixPlan: "Add next-intl or react-i18next. Extract all strings to message files. Add locale-aware number/currency formatting.",
    effort: "large",
    priority: "low",
  },
  {
    area: "Mobile Strategy",
    currentState: "Web-only with responsive design",
    shouldHaveDone: "Shared API contract and offline-first data layer planned from day 1",
    fixPlan: "Mobile interop layer created ✓. Build React Native app sharing types and API client. Use Expo for rapid development.",
    effort: "large",
    priority: "high",
  },
] as const;

// ═══════════════ Year 2 Migration Plan ═══════════════

export const YEAR_2_MIGRATIONS = {
  database: {
    tool: "Prisma + Postgres (Neon or Supabase)",
    steps: [
      "1. Define Prisma schema from db/schema.ts definitions",
      "2. Set up Neon serverless Postgres",
      "3. Run initial migration",
      "4. Seed with existing demo data",
      "5. Create data access layer (DAL) that API routes call",
      "6. Migrate API routes from in-memory to DAL",
      "7. Remove localStorage dependency from web app",
      "8. Add database indexes for common queries",
    ],
  },
  auth: {
    tool: "NextAuth.js v5",
    steps: [
      "1. Install next-auth and @auth/prisma-adapter",
      "2. Configure email provider (magic links)",
      "3. Add Google and Apple OAuth providers",
      "4. Migrate PIN-based auth to password + MFA",
      "5. Add role-based middleware",
      "6. Implement API key auth for agent endpoints",
    ],
  },
  payments: {
    tool: "Stripe Connect",
    steps: [
      "1. Set up Stripe Connect for marketplace model",
      "2. Business subscription billing (free/starter/pro/enterprise)",
      "3. Influencer payout system (campaign completion → payout)",
      "4. Escrow for campaign funds",
      "5. Invoice generation for enterprises",
      "6. Webhook handlers for payment events",
    ],
  },
  verification: {
    tool: "Social media platform APIs",
    steps: [
      "1. Instagram Graph API for post verification",
      "2. Google My Business API for review verification",
      "3. TikTok API for video verification",
      "4. Screenshot upload + OCR as fallback",
      "5. Manual review queue for edge cases",
      "6. Verification score and trust system",
    ],
  },
  mobile: {
    tool: "React Native + Expo",
    steps: [
      "1. Set up Expo project sharing src/lib/shared/*",
      "2. Implement auth flow (biometric + token storage)",
      "3. Build business dashboard (campaign management)",
      "4. Build influencer flow (discover, submit proof, earn)",
      "5. Add push notifications (Expo Push)",
      "6. Offline-first with sync queue",
      "7. QR code scanning for in-store campaigns",
      "8. Camera integration for proof submission",
    ],
  },
  realtime: {
    tool: "WebSockets (Socket.io or Pusher)",
    steps: [
      "1. Set up WebSocket server for live updates",
      "2. Real-time campaign completion notifications",
      "3. Live activity feed (replaces simulated ticker)",
      "4. Real-time analytics dashboard updates",
      "5. Agent activity stream for API consumers",
    ],
  },
};

// ═══════════════ Year 3 Platform Features ═══════════════

export const YEAR_3_FEATURES = {
  whiteLabel: {
    description: "Allow businesses to embed Social Perks with their own branding",
    scope: [
      "Custom domain support",
      "Brand color and logo customization",
      "White-label customer-facing pages",
      "Custom email templates",
      "Remove Social Perks branding",
    ],
  },
  marketplace: {
    description: "Campaign template marketplace",
    scope: [
      "Browse and purchase proven campaign templates",
      "Template creators earn commission",
      "Industry-specific template packs",
      "Template analytics (which templates perform best)",
      "Community ratings and reviews",
    ],
  },
  aiContent: {
    description: "AI-powered content generation for campaigns",
    scope: [
      "Generate caption suggestions for each platform",
      "Create hashtag strategies",
      "AI photo/video tips based on business type",
      "Automated A/B test suggestions",
      "Content calendar generation",
    ],
  },
  international: {
    description: "Multi-language, multi-currency support",
    scope: [
      "UI translations (Spanish, French, Portuguese, Japanese)",
      "Multi-currency perk values",
      "Region-specific platform support (WeChat, LINE, KakaoTalk)",
      "Local compliance (GDPR, LGPD, etc.)",
      "Timezone-aware campaign scheduling",
    ],
  },
  advancedAnalytics: {
    description: "ML-powered predictive analytics",
    scope: [
      "Predict campaign completion rates before launch",
      "Customer lifetime value estimation",
      "Optimal perk value suggestions",
      "Seasonal trend detection",
      "Competitor benchmarking",
      "Attribution modeling",
    ],
  },
  partnerEcosystem: {
    description: "Partner API and integrations marketplace",
    scope: [
      "POS system integrations (Square, Toast, Clover)",
      "CRM integrations (HubSpot, Salesforce)",
      "Email provider integrations (Mailchimp, SendGrid)",
      "Accounting integrations (QuickBooks, Xero)",
      "Partner developer portal",
      "Webhook marketplace",
    ],
  },
};
