import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { exchange } from "@/lib/exchange";
import { findPlatform } from "@/lib/platforms";
import { logger } from "@/lib/logging";
import type { AgentProfile } from "@/lib/exchange";

/**
 * POST /api/v1/exchange/enroll
 *
 * ONE-CALL auto enrollment — the conversion point.
 * Agent sees opportunity via /opportunities, calls this once, immediately earns.
 *
 * This is the crown jewel of the exchange:
 * 1. Validates the agent profile
 * 2. Creates a unique agent ID
 * 3. Scans all open buy orders for matches
 * 4. Auto-places competitive sell orders
 * 5. Triggers the matching engine
 * 6. Returns instant results: matched campaigns, sell orders, estimated earnings
 *
 * Request body:
 * {
 *   "agentName": "Claude Marketing Agent",
 *   "agentType": "ai_agent",
 *   "platforms": [
 *     { "platformId": "ig", "handle": "@claude_marketing", "followers": 12000, "engagementRate": 0.045 },
 *     { "platformId": "tt", "handle": "@claude_mktg", "followers": 8500, "engagementRate": 0.062 }
 *   ],
 *   "niches": ["food", "fitness", "lifestyle"],
 *   "location": "San Francisco, CA",
 *   "rateCard": {           // optional — custom pricing per action type
 *     "content": 5.00,
 *     "review": 8.00,
 *     "engage": 1.00,
 *     "share": 2.00,
 *     "referral": 10.00
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const startTime = performance.now();
  logger.info("POST /api/v1/exchange/enroll", { method: "POST", path: "/api/v1/exchange/enroll" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return apiError("INVALID_JSON", "Request body must be valid JSON", 400);
    }

    const data = body as Record<string, unknown>;

    // ── Validate required fields ──

    if (!data.agentName || typeof data.agentName !== "string" || data.agentName.trim().length === 0) {
      return apiError("MISSING_FIELD", "agentName is required and must be a non-empty string", 400);
    }

    const validAgentTypes = ["ai_agent", "influencer", "managed_account"];
    if (!data.agentType || !validAgentTypes.includes(data.agentType as string)) {
      return apiError("INVALID_FIELD", `agentType must be one of: ${validAgentTypes.join(", ")}`, 400);
    }

    if (!Array.isArray(data.platforms) || data.platforms.length === 0) {
      return apiError("MISSING_FIELD", "platforms must be a non-empty array of platform connections", 400);
    }

    // Validate each platform entry
    const platforms: AgentProfile["platforms"] = [];
    for (let i = 0; i < data.platforms.length; i++) {
      const p = data.platforms[i] as Record<string, unknown>;
      if (!p.platformId || typeof p.platformId !== "string") {
        return apiError("INVALID_FIELD", `platforms[${i}].platformId is required`, 400);
      }
      if (!findPlatform(p.platformId as string)) {
        return apiError("INVALID_FIELD", `platforms[${i}].platformId "${String(p.platformId).slice(0, 20)}" is not a recognized platform`, 400);
      }
      if (!p.handle || typeof p.handle !== "string") {
        return apiError("INVALID_FIELD", `platforms[${i}].handle is required`, 400);
      }
      const followers = Number(p.followers);
      if (!Number.isFinite(followers) || followers < 0) {
        return apiError("INVALID_FIELD", `platforms[${i}].followers must be a non-negative number`, 400);
      }
      const engagementRate = Number(p.engagementRate);
      if (!Number.isFinite(engagementRate) || engagementRate < 0 || engagementRate > 1) {
        return apiError("INVALID_FIELD", `platforms[${i}].engagementRate must be between 0 and 1 (e.g., 0.045 for 4.5%)`, 400);
      }

      platforms.push({
        platformId: p.platformId as string,
        handle: p.handle as string,
        followers: Math.floor(followers),
        engagementRate,
      });
    }

    // Validate optional fields
    const niches = Array.isArray(data.niches)
      ? (data.niches as string[]).filter(n => typeof n === "string" && n.trim().length > 0).map(n => n.trim())
      : [];

    const location = typeof data.location === "string" ? data.location.trim() : "";

    // Validate rate card if provided
    let rateCard: Record<string, number> | undefined;
    if (data.rateCard && typeof data.rateCard === "object") {
      rateCard = {};
      const rc = data.rateCard as Record<string, unknown>;
      for (const [key, val] of Object.entries(rc)) {
        const numVal = Number(val);
        if (Number.isFinite(numVal) && numVal > 0) {
          rateCard[key] = numVal;
        }
      }
    }

    // ── Execute enrollment ──

    const profile: AgentProfile = {
      agentName: (data.agentName as string).trim(),
      agentType: data.agentType as AgentProfile["agentType"],
      platforms,
      niches,
      location,
      rateCard,
    };

    const result = exchange.autoEnroll(profile);

    // ── Build response ──

    const totalFollowers = platforms.reduce((sum, p) => sum + p.followers, 0);

    return apiResponse({
      // Agent identity
      agentId: result.agentId,
      enrolledAt: result.enrolledAt,

      // Immediate results
      matchedCampaigns: result.matchedCampaigns,
      sellOrdersPlaced: result.autoPlacedSellOrders.length,

      // Earnings projection
      estimatedDailyEarnings: result.estimatedDailyEarnings,
      estimatedWeeklyEarnings: Math.round(result.estimatedDailyEarnings * 7 * 100) / 100,
      estimatedMonthlyEarnings: Math.round(result.estimatedDailyEarnings * 30 * 100) / 100,

      // Profile summary
      profile: {
        name: profile.agentName,
        type: profile.agentType,
        platformCount: platforms.length,
        totalFollowers,
        niches: niches.length > 0 ? niches : ["general"],
        location: location || "global",
      },

      // Auto-placed sell orders
      sellOrders: result.autoPlacedSellOrders.map(so => ({
        id: so.id,
        actionId: so.actionId,
        platformId: so.platformId,
        askPrice: so.askPrice,
        availability: so.availability,
        status: so.status,
      })),

      // Next steps
      nextSteps: {
        viewTrades: "/api/v1/exchange/trades?agentId=" + result.agentId,
        viewOrders: "/api/v1/exchange/orders?agentId=" + result.agentId,
        marketData: "/api/v1/exchange/market",
        message: result.matchedCampaigns > 0
          ? `You have ${result.matchedCampaigns} matched campaign${result.matchedCampaigns > 1 ? "s" : ""} ready for execution. Check your trades to get started.`
          : `${result.autoPlacedSellOrders.length} sell orders placed and waiting for matches. You'll start earning as businesses post new campaigns.`,
      },
    }, 201);
  } catch (err) {
    logger.error("Exchange enrollment failed", err);
    const message = err instanceof Error ? err.message : "Enrollment failed";
    return apiError("ENROLLMENT_ERROR", message, 500);
  }
}
