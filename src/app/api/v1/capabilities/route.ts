/**
 * Capabilities API Route — /api/v1/capabilities
 *
 * GET: Returns a machine-readable description of the Social Perks API
 * for AI agents, LLMs, and automated tooling. Public, cached.
 */

import type { NextRequest } from "next/server";
import { ok, rateLimit, withTiming } from "../_shared";
import { setCacheHeaders } from "@/lib/api/edge-cache";

const CAPABILITIES = {
  name: "Social Perks API",
  version: "1.0.0",
  description:
    "Platform connecting businesses with customers for social media marketing perks",
  documentation: "/api/v1/docs",
  playground: "/api/v1/docs/ui",
  graphql: "/api/graphql",
  authentication: {
    methods: ["bearer_token", "api_key"],
    tokenEndpoint: "/api/v1/auth",
    scopes: ["read", "read-write", "admin"],
  },
  endpoints: [
    // Auth
    {
      path: "/api/v1/auth",
      methods: ["GET", "POST"],
      auth: "required",
      description: "Authentication — login, signup, logout, refresh, validate session",
    },
    // Campaigns
    {
      path: "/api/v1/campaigns",
      methods: ["GET", "POST"],
      auth: "optional",
      description: "Campaign management — list, create, and launch campaigns",
    },
    // Submissions
    {
      path: "/api/v1/submissions",
      methods: ["GET", "POST"],
      auth: "required",
      description: "Submission management — list and create submissions with proof",
    },
    {
      path: "/api/v1/submissions/review",
      methods: ["POST"],
      auth: "required",
      description: "Review submissions — approve or reject",
    },
    // AI
    {
      path: "/api/v1/ai/generate",
      methods: ["POST"],
      auth: "required",
      description: "AI campaign generation — generate campaign suggestions",
    },
    {
      path: "/api/v1/ai/recommend",
      methods: ["POST"],
      auth: "required",
      description: "AI recommendations — optimization suggestions",
    },
    {
      path: "/api/v1/ai/review",
      methods: ["POST"],
      auth: "required",
      description: "AI submission review pipeline",
    },
    {
      path: "/api/v1/ai/campaign-agent",
      methods: ["POST"],
      auth: "required",
      description: "Full AI marketing plan generation",
    },
    {
      path: "/api/v1/ai/quick-start",
      methods: ["POST"],
      auth: "required",
      description: "Quick-start single recommendation",
    },
    // Billing
    {
      path: "/api/v1/billing",
      methods: ["POST"],
      auth: "required",
      description: "Subscription management",
    },
    {
      path: "/api/v1/billing/webhook",
      methods: ["POST"],
      auth: "none",
      description: "Stripe webhook handler",
    },
    // Perk Programs
    {
      path: "/api/v1/programs",
      methods: ["GET", "POST"],
      auth: "optional",
      description: "Perk program management — list and create programs",
    },
    {
      path: "/api/v1/programs/:id",
      methods: ["GET", "PUT", "DELETE"],
      auth: "required",
      description: "Program details, update, and deletion",
    },
    {
      path: "/api/v1/programs/:id/progress",
      methods: ["GET"],
      auth: "required",
      description: "Member progress in a program",
    },
    {
      path: "/api/v1/programs/:id/submit",
      methods: ["POST"],
      auth: "required",
      description: "Submit an action to a program",
    },
    {
      path: "/api/v1/programs/:id/cashback",
      methods: ["GET", "POST"],
      auth: "required",
      description: "Cash back management — list and request payouts",
    },
    {
      path: "/api/v1/programs/:id/members",
      methods: ["GET", "POST"],
      auth: "required",
      description: "Member enrollment and listing",
    },
    // Exchange
    {
      path: "/api/v1/exchange/opportunities",
      methods: ["GET"],
      auth: "none",
      description: "Market opportunities (public)",
    },
    {
      path: "/api/v1/exchange/market",
      methods: ["GET"],
      auth: "none",
      description: "Real-time market data (public)",
    },
    {
      path: "/api/v1/exchange/orders",
      methods: ["GET", "POST"],
      auth: "required",
      description: "Buy/sell order management",
    },
    {
      path: "/api/v1/exchange/trades",
      methods: ["GET", "POST"],
      auth: "required",
      description: "Trade lifecycle actions",
    },
    {
      path: "/api/v1/exchange/enroll",
      methods: ["POST"],
      auth: "required",
      description: "Agent auto-enrollment",
    },
    // Reference Data
    {
      path: "/api/v1/pricing",
      methods: ["GET"],
      auth: "none",
      description: "Pricing oracle — platform action pricing data",
    },
    {
      path: "/api/v1/actions",
      methods: ["GET"],
      auth: "none",
      description: "Action library — 107 marketing actions across 15 platforms",
    },
    {
      path: "/api/v1/benchmarks",
      methods: ["GET"],
      auth: "none",
      description: "Industry benchmarks for campaign performance",
    },
    {
      path: "/api/v1/influencers",
      methods: ["GET", "POST"],
      auth: "optional",
      description: "Search and register influencers",
    },
    {
      path: "/api/v1/recommendations",
      methods: ["GET"],
      auth: "optional",
      description: "ML-powered campaign recommendations",
    },
    {
      path: "/api/v1/legal",
      methods: ["GET"],
      auth: "none",
      description: "Legal compliance briefings (FTC, platform terms)",
    },
    // Infrastructure
    {
      path: "/api/v1/events",
      methods: ["GET"],
      auth: "required",
      description: "SSE real-time event stream",
    },
    {
      path: "/api/v1/health",
      methods: ["GET"],
      auth: "none",
      description: "Health check — server status, uptime, database connectivity",
    },
    {
      path: "/api/v1/status",
      methods: ["GET"],
      auth: "none",
      description: "System status — service health, circuit breaker states",
    },
    {
      path: "/api/v1/capabilities",
      methods: ["GET"],
      auth: "none",
      description: "This endpoint — machine-readable API capabilities",
    },
    {
      path: "/api/v1/oauth/connect",
      methods: ["POST"],
      auth: "required",
      description: "Start OAuth flow for social platform connection",
    },
    {
      path: "/api/v1/oauth/:platform",
      methods: ["GET"],
      auth: "none",
      description: "OAuth callback handler",
    },
    {
      path: "/api/v1/verification/webhook",
      methods: ["GET", "POST"],
      auth: "none",
      description: "Platform webhook receiver and challenge verification",
    },
  ],
  rateLimits: {
    public: { requests: 30, window: "1m" },
    standard: { requests: 60, window: "1m" },
    relaxed: { requests: 120, window: "1m" },
  },
  responseFormat: {
    envelope: {
      success: "boolean",
      data: "object",
      error: "object|null",
    },
    pagination: {
      page: "number",
      perPage: "number",
      total: "number",
      totalPages: "number",
    },
  },
  sdks: {
    typescript: "/api/v1/docs#sdk",
  },
} as const;

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const res = ok(CAPABILITIES);
  setCacheHeaders(res, {
    maxAge: 60,
    sMaxAge: 300,
    staleWhileRevalidate: 3600,
    isPublic: true,
  });
  return res;
});
