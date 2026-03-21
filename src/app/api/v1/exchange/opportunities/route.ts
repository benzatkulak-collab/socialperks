import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { exchange } from "@/lib/exchange";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/exchange/opportunities
 *
 * FREE opportunities endpoint — shows agents what they could earn.
 * No auth required. This creates FOMO:
 * "You have 23 matching campaigns worth $147/day sitting on the table."
 *
 * Query params:
 *   platforms      — comma-separated platform IDs (e.g., "ig,tt,yt")
 *   niches         — comma-separated niches (e.g., "food,fitness,travel")
 *   followerCount  — total follower count across platforms
 *   location       — geographic location (e.g., "New York, NY")
 *
 * All params are optional. More params = more accurate earnings estimate.
 * The endpoint works even with zero params to show overall market opportunity.
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/exchange/opportunities", { method: "GET", path: "/api/v1/exchange/opportunities" });

  try {
    const { searchParams } = new URL(request.url);

    const platformsRaw = searchParams.get("platforms") ?? "";
    const nichesRaw = searchParams.get("niches") ?? "";
    const followerCountRaw = searchParams.get("followerCount") ?? "0";
    const location = searchParams.get("location") ?? "";

    const platforms = platformsRaw
      ? platformsRaw.split(",").map(s => s.trim()).filter(Boolean)
      : ["ig", "tt", "yt", "go", "fb", "xw"]; // Default to major platforms

    const niches = nichesRaw
      ? nichesRaw.split(",").map(s => s.trim()).filter(Boolean)
      : [];

    const followerCount = Math.max(0, parseInt(followerCountRaw) || 0);

    const opportunities = exchange.getOpportunities({
      platforms,
      niches,
      followerCount,
      location,
    });

    // Build a compelling response that makes agents want to enroll
    const response = {
      // The hook — estimated daily earnings
      estimatedDailyEarnings: opportunities.estimatedDailyEarnings,
      estimatedMonthlyEarnings: Math.round(opportunities.estimatedDailyEarnings * 30 * 100) / 100,

      // How many opportunities are available right now
      totalMatchingOrders: opportunities.matchingOrders.length,
      totalAvailableActions: opportunities.matchingOrders.reduce(
        (sum, o) => sum + (o.quantity - o.filled), 0
      ),

      // Top paying actions — what's worth the most
      topPayingActions: opportunities.topPayingActions,

      // Demand signals — where the market needs supply
      demand: opportunities.demand,

      // Matching buy orders (businesses looking for exactly this profile)
      matchingOrders: opportunities.matchingOrders.map(order => ({
        id: order.id,
        businessName: order.businessName,
        businessType: order.businessType,
        actionId: order.actionId,
        platformId: order.platformId,
        maxPrice: order.maxPrice,
        quantityRemaining: order.quantity - order.filled,
        requirements: order.requirements,
        perkValue: order.perkValue,
        perkType: order.perkType,
        expiresAt: order.expiresAt,
      })),

      // Call to action
      enrollUrl: "/api/v1/exchange/enroll",
      message: opportunities.estimatedDailyEarnings > 0
        ? `You could be earning $${opportunities.estimatedDailyEarnings}/day. One API call to start.`
        : "Join the exchange to start earning from marketing actions.",

      generatedAt: new Date().toISOString(),
    };

    return apiResponse(response, 200, {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    });
  } catch (err) {
    logger.error("Failed to fetch opportunities", err);
    const message = err instanceof Error ? err.message : "Failed to fetch opportunities";
    return apiError("OPPORTUNITIES_ERROR", message, 500);
  }
}
