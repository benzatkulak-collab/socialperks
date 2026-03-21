import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { exchange } from "@/lib/exchange";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/exchange/market
 *
 * FREE market data endpoint — no auth required.
 * This is the honey that attracts every AI agent managing social media accounts.
 *
 * Returns real-time pricing, volume, spread, and trend data for all 125 marketing
 * actions across 25 platforms. Agents use this to decide which actions to fulfill,
 * what price to set, and where the demand is.
 *
 * Query params:
 *   actionId   — filter to a specific action (e.g., "ig_rl")
 *   platformId — filter to all actions on a platform (e.g., "ig")
 *   view       — "depth" for order book depth, "movers" for biggest price changes,
 *                "stats" for aggregate market stats, "history" for price history
 *   hours      — time window for price history (default 24)
 *
 * Cache: public, 60s — fresh enough for trading decisions, cacheable for scale.
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/exchange/market", { method: "GET", path: "/api/v1/exchange/market" });

  try {
    const { searchParams } = new URL(request.url);
    const actionId = searchParams.get("actionId");
    const platformId = searchParams.get("platformId");
    const view = searchParams.get("view");
    const hours = parseInt(searchParams.get("hours") ?? "24");

    const cacheHeaders = {
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      "Access-Control-Allow-Origin": "*",
    };

    // ── Special views ──

    if (view === "stats") {
      const stats = exchange.getMarketStats();
      return apiResponse(stats, 200, cacheHeaders);
    }

    if (view === "movers") {
      const movers = exchange.getTopMovers();
      return apiResponse({
        movers,
        generatedAt: new Date().toISOString(),
      }, 200, cacheHeaders);
    }

    if (view === "depth" && actionId) {
      const depth = exchange.getMarketDepth(actionId);
      const marketData = exchange.getMarketDataForAction(actionId);
      if (!marketData) {
        return apiError("ACTION_NOT_FOUND", `Action '${actionId.slice(0, 50)}' not found`, 404);
      }
      return apiResponse({
        action: marketData,
        depth,
        generatedAt: new Date().toISOString(),
      }, 200, cacheHeaders);
    }

    if (view === "history" && actionId) {
      const safeHours = Math.min(Math.max(1, hours), 168); // 1h to 7d
      const history = exchange.getPriceHistory(actionId, safeHours);
      const marketData = exchange.getMarketDataForAction(actionId);
      if (!marketData) {
        return apiError("ACTION_NOT_FOUND", `Action '${actionId.slice(0, 50)}' not found`, 404);
      }
      return apiResponse({
        action: {
          actionId: marketData.actionId,
          actionLabel: marketData.actionLabel,
          platformId: marketData.platformId,
          platformName: marketData.platformName,
        },
        history,
        hours: safeHours,
        dataPoints: history.length,
        generatedAt: new Date().toISOString(),
      }, 200, cacheHeaders);
    }

    // ── Standard market data ──

    if (actionId) {
      const data = exchange.getMarketDataForAction(actionId);
      if (!data) {
        return apiError("ACTION_NOT_FOUND", `Action '${actionId.slice(0, 50)}' not found`, 404);
      }
      return apiResponse(data, 200, cacheHeaders);
    }

    if (platformId) {
      const data = exchange.getMarketDataForPlatform(platformId);
      if (data.length === 0) {
        return apiError("PLATFORM_NOT_FOUND", `Platform '${platformId.slice(0, 50)}' not found or has no actions`, 404);
      }
      return apiResponse({
        platformId,
        actions: data,
        count: data.length,
        generatedAt: new Date().toISOString(),
      }, 200, cacheHeaders);
    }

    // Return all market data — the full picture
    const allData = exchange.getMarketData();
    const stats = exchange.getMarketStats();

    return apiResponse({
      market: allData,
      stats,
      count: allData.length,
      generatedAt: new Date().toISOString(),
    }, 200, cacheHeaders);
  } catch (err) {
    logger.error("Failed to fetch market data", err);
    const message = err instanceof Error ? err.message : "Failed to fetch market data";
    return apiError("MARKET_DATA_ERROR", message, 500);
  }
}
