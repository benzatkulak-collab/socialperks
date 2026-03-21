import { NextRequest } from "next/server";
import { apiResponse, apiError, parsePagination, paginationMeta, requireAuth } from "@/lib/api/middleware";
import { exchange } from "@/lib/exchange";
import { findAction, findPlatform } from "@/lib/platforms";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/exchange/orders
 *
 * List buy and/or sell orders with filters.
 *
 * Query params:
 *   side        — "buy" | "sell" | "all" (default: "all")
 *   agentId     — filter sell orders by agent
 *   businessId  — filter buy orders by business
 *   platformId  — filter by platform
 *   actionId    — filter by action
 *   status      — filter by status
 *   page        — pagination (default: 1)
 *   perPage     — items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/exchange/orders", { method: "GET", path: "/api/v1/exchange/orders" });

  try {
    const { searchParams } = new URL(request.url);
    const side = searchParams.get("side") ?? "all";
    const agentId = searchParams.get("agentId") ?? undefined;
    const businessId = searchParams.get("businessId") ?? undefined;
    const platformId = searchParams.get("platformId") ?? undefined;
    const actionId = searchParams.get("actionId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const { page, perPage, offset } = parsePagination(searchParams);

    const result: { buyOrders?: unknown[]; sellOrders?: unknown[] } = {};

    if (side === "all" || side === "buy") {
      const buyOrders = exchange.listBuyOrders({
        businessId,
        platformId,
        actionId,
        status: status as "open" | "partially_filled" | "filled" | "cancelled" | "expired" | undefined,
      });

      const paginatedBuys = buyOrders.slice(offset, offset + perPage);
      result.buyOrders = paginatedBuys.map(enrichBuyOrder);
    }

    if (side === "all" || side === "sell") {
      const sellOrders = exchange.listSellOrders({
        agentId,
        platformId,
        actionId,
        status: status as "open" | "matched" | "executing" | "completed" | "cancelled" | undefined,
      });

      const paginatedSells = sellOrders.slice(offset, offset + perPage);
      result.sellOrders = paginatedSells.map(enrichSellOrder);
    }

    const totalBuys = side !== "sell" ? exchange.listBuyOrders({ businessId, platformId, actionId }).length : 0;
    const totalSells = side !== "buy" ? exchange.listSellOrders({ agentId, platformId, actionId }).length : 0;
    const total = totalBuys + totalSells;

    return apiResponse({
      ...result,
      pagination: paginationMeta(total, page, perPage),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Failed to list orders", err);
    const message = err instanceof Error ? err.message : "Failed to list orders";
    return apiError("ORDER_LIST_ERROR", message, 500);
  }
}

/**
 * POST /api/v1/exchange/orders
 *
 * Place a new buy or sell order.
 *
 * Request body:
 * {
 *   "side": "buy" | "sell",
 *
 *   // For buy orders:
 *   "businessId": "biz_123",
 *   "businessName": "Taqueria Sol",
 *   "businessType": "Restaurant",
 *   "actionId": "ig_rl",
 *   "platformId": "ig",
 *   "maxPrice": 8.00,
 *   "quantity": 10,
 *   "requirements": { "minFollowers": 1000, "niches": ["food"], "location": "LA" },
 *   "perkValue": 20,
 *   "perkType": "pct",
 *   "expiresInHours": 168
 *
 *   // For sell orders:
 *   "agentId": "ag_abc123",
 *   "agentName": "Claude Marketing",
 *   "agentType": "ai_agent",
 *   "actionId": "ig_rl",
 *   "platformId": "ig",
 *   "askPrice": 6.00,
 *   "platformHandle": "@claude_mktg",
 *   "followerCount": 12000,
 *   "engagementRate": 0.045,
 *   "niches": ["food", "lifestyle"],
 *   "location": "Los Angeles, CA",
 *   "availability": 5
 * }
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/exchange/orders", { method: "POST", path: "/api/v1/exchange/orders" });

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
    const side = data.side as string;

    if (side !== "buy" && side !== "sell") {
      return apiError("INVALID_FIELD", 'side must be "buy" or "sell"', 400);
    }

    // ── Validate common fields ──

    const actionId = data.actionId as string;
    const platformId = data.platformId as string;

    if (!actionId || typeof actionId !== "string") {
      return apiError("MISSING_FIELD", "actionId is required", 400);
    }
    if (!platformId || typeof platformId !== "string") {
      return apiError("MISSING_FIELD", "platformId is required", 400);
    }
    if (!findAction(actionId)) {
      return apiError("INVALID_FIELD", `Unknown action: ${actionId.slice(0, 50)}`, 400);
    }
    if (!findPlatform(platformId)) {
      return apiError("INVALID_FIELD", `Unknown platform: ${platformId.slice(0, 50)}`, 400);
    }

    // ── Place buy order ──

    if (side === "buy") {
      const businessId = data.businessId as string;
      const businessName = data.businessName as string;
      const businessType = data.businessType as string;
      const maxPrice = Number(data.maxPrice);
      const quantity = Number(data.quantity);
      const perkValue = Number(data.perkValue);
      const perkType = data.perkType as "pct" | "dol";
      const requirements = (data.requirements ?? {}) as Record<string, unknown>;
      const expiresInHours = Number(data.expiresInHours) || 168;

      if (!businessId || typeof businessId !== "string") {
        return apiError("MISSING_FIELD", "businessId is required for buy orders", 400);
      }
      if (!businessName || typeof businessName !== "string") {
        return apiError("MISSING_FIELD", "businessName is required for buy orders", 400);
      }
      if (!businessType || typeof businessType !== "string") {
        return apiError("MISSING_FIELD", "businessType is required for buy orders", 400);
      }
      if (!Number.isFinite(maxPrice) || maxPrice <= 0) {
        return apiError("INVALID_FIELD", "maxPrice must be a positive number", 400);
      }
      if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isInteger(quantity)) {
        return apiError("INVALID_FIELD", "quantity must be a positive integer", 400);
      }
      if (!Number.isFinite(perkValue) || perkValue <= 0) {
        return apiError("INVALID_FIELD", "perkValue must be a positive number", 400);
      }
      if (perkType !== "pct" && perkType !== "dol") {
        return apiError("INVALID_FIELD", 'perkType must be "pct" or "dol"', 400);
      }

      const order = exchange.placeBuyOrder(
        businessId,
        businessName,
        businessType,
        actionId,
        platformId,
        maxPrice,
        quantity,
        {
          minFollowers: Number(requirements.minFollowers) || undefined,
          niches: Array.isArray(requirements.niches) ? requirements.niches as string[] : undefined,
          location: typeof requirements.location === "string" ? requirements.location : undefined,
          minEngagement: Number(requirements.minEngagement) || undefined,
        },
        perkValue,
        perkType,
        expiresInHours
      );

      return apiResponse(enrichBuyOrder(order), 201);
    }

    // ── Place sell order ──

    const agentId = data.agentId as string;
    const agentName = data.agentName as string;
    const agentType = data.agentType as "ai_agent" | "influencer" | "managed_account";
    const askPrice = Number(data.askPrice);
    const platformHandle = data.platformHandle as string;
    const followerCount = Number(data.followerCount);
    const engagementRate = Number(data.engagementRate);
    const niches = Array.isArray(data.niches) ? (data.niches as string[]).filter(n => typeof n === "string") : [];
    const location = typeof data.location === "string" ? data.location : "";
    const availability = Number(data.availability) || 5;

    if (!agentId || typeof agentId !== "string") {
      return apiError("MISSING_FIELD", "agentId is required for sell orders", 400);
    }
    if (!agentName || typeof agentName !== "string") {
      return apiError("MISSING_FIELD", "agentName is required for sell orders", 400);
    }
    const validTypes = ["ai_agent", "influencer", "managed_account"];
    if (!validTypes.includes(agentType)) {
      return apiError("INVALID_FIELD", `agentType must be one of: ${validTypes.join(", ")}`, 400);
    }
    if (!Number.isFinite(askPrice) || askPrice <= 0) {
      return apiError("INVALID_FIELD", "askPrice must be a positive number", 400);
    }
    if (!platformHandle || typeof platformHandle !== "string") {
      return apiError("MISSING_FIELD", "platformHandle is required for sell orders", 400);
    }
    if (!Number.isFinite(followerCount) || followerCount < 0) {
      return apiError("INVALID_FIELD", "followerCount must be a non-negative number", 400);
    }
    if (!Number.isFinite(engagementRate) || engagementRate < 0 || engagementRate > 1) {
      return apiError("INVALID_FIELD", "engagementRate must be between 0 and 1", 400);
    }

    const order = exchange.placeSellOrder(
      agentId,
      agentName,
      agentType,
      actionId,
      platformId,
      askPrice,
      platformHandle,
      Math.floor(followerCount),
      engagementRate,
      niches,
      location,
      Math.min(100, Math.max(1, Math.floor(availability)))
    );

    return apiResponse(enrichSellOrder(order), 201);
  } catch (err) {
    logger.error("Failed to place order", err);
    const message = err instanceof Error ? err.message : "Failed to place order";
    return apiError("ORDER_ERROR", message, 500);
  }
}

// ── Helpers ──

function enrichBuyOrder(order: ReturnType<typeof exchange.listBuyOrders>[number]) {
  const action = findAction(order.actionId);
  const platform = findPlatform(order.platformId);
  return {
    ...order,
    actionLabel: action?.label ?? order.actionId,
    platformName: platform?.name ?? order.platformId,
    remainingQuantity: order.quantity - order.filled,
    fillRate: order.quantity > 0 ? Math.round((order.filled / order.quantity) * 100) : 0,
  };
}

function enrichSellOrder(order: ReturnType<typeof exchange.listSellOrders>[number]) {
  const action = findAction(order.actionId);
  const platform = findPlatform(order.platformId);
  return {
    ...order,
    actionLabel: action?.label ?? order.actionId,
    platformName: platform?.name ?? order.platformId,
  };
}
