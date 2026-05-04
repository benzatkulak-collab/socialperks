import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError, parsePagination, paginationMeta } from "../../helpers.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { exchange } from "@lib/exchange";
import type { Trade, BuyOrder, SellOrder } from "@lib/exchange";
import { PLATFORMS, ALL_ACTIONS as ACTIONS } from "@social-perks/shared/platforms";
import { logger } from "@lib/logging";

const app = new Hono<AppEnv>();

// GET /v1/exchange/opportunities (public)
app.get("/opportunities", rateLimit("public"), (c) => {
  const params = c.req.query();
  const platforms = (params.platforms?.split(",").filter(Boolean) ?? []).slice(0, 20);
  const niches = (params.niches?.split(",").filter(Boolean) ?? []).slice(0, 20);
  const parsedFollowers = params.followerCount ? parseInt(params.followerCount) : 0;
  const followerCount = !isNaN(parsedFollowers) && parsedFollowers >= 0 ? parsedFollowers : 0;
  const location = params.location ?? "";

  try {
    const opportunities = exchange.getOpportunities({ platforms, niches, followerCount, location });
    return apiResponse(c, {
      opportunities,
      meta: {
        totalMatchingOrders: opportunities.matchingOrders.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error("Failed to get opportunities", err);
    return apiError(c, "OPPORTUNITIES_FAILED", "Failed to get opportunities", 500);
  }
});

// GET /v1/exchange/market (public)
// Supports view=stats (default) | view=action&actionId=... | view=platform&platformId=...
app.get("/market", rateLimit("public"), (c) => {
  const view = c.req.query("view") ?? "stats";
  const actionId = c.req.query("actionId");
  const platformId = c.req.query("platformId");

  try {
    let data: unknown;
    if (view === "action" && actionId) {
      data = exchange.getMarketDataForAction(actionId);
    } else if (view === "platform" && platformId) {
      data = exchange.getMarketDataForPlatform(platformId);
    } else {
      data = exchange.getMarketData();
    }
    return apiResponse(c, data, 200, { "Cache-Control": "public, max-age=30" });
  } catch (err) {
    logger.error("Failed to get market data", err);
    return apiError(c, "MARKET_DATA_FAILED", "Failed to get market data", 500);
  }
});

// GET /v1/exchange/orders
// Returns buy + sell orders, filterable by side. The underlying engine
// keeps separate stores so we dispatch and merge.
app.get("/orders", requireAuth, (c) => {
  const params = c.req.query();
  const userId = c.get("userId");
  const { page, perPage } = parsePagination(new URLSearchParams(params));
  const side = params.side; // "buy" | "sell" | undefined

  try {
    const buyStatus = params.status as BuyOrder["status"] | undefined;
    const sellStatus = params.status as SellOrder["status"] | undefined;

    const buys: BuyOrder[] = side === "sell" ? [] : exchange.listBuyOrders({
      businessId: userId ?? undefined,
      actionId: params.actionId,
      platformId: params.platformId,
      status: buyStatus,
    });
    const sells: SellOrder[] = side === "buy" ? [] : exchange.listSellOrders({
      agentId: userId ?? undefined,
      actionId: params.actionId,
      platformId: params.platformId,
      status: sellStatus,
    });

    type CombinedOrder = (BuyOrder & { side: "buy" }) | (SellOrder & { side: "sell" });
    const combined: CombinedOrder[] = [
      ...buys.map((o) => ({ ...o, side: "buy" as const })),
      ...sells.map((o) => ({ ...o, side: "sell" as const })),
    ];
    const total = combined.length;
    const paginated = combined.slice((page - 1) * perPage, page * perPage);

    // Enrich with labels
    const enriched = paginated.map((o: CombinedOrder) => {
      const action = ACTIONS.find((a) => a.id === o.actionId);
      const platform = PLATFORMS.find((p) => p.id === o.platformId);
      return { ...o, actionLabel: action?.label ?? o.actionId, platformName: platform?.name ?? o.platformId };
    });

    return apiResponse(c, { orders: enriched, pagination: paginationMeta(total, page, perPage) });
  } catch (err) {
    logger.error("Failed to list orders", err);
    return apiError(c, "ORDERS_FAILED", "Failed to list orders", 500);
  }
});

// POST /v1/exchange/orders
// Dispatches to placeBuyOrder or placeSellOrder based on side.
app.post("/orders", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.get("userId") ?? "anonymous";

    if (!body.side || !["buy", "sell"].includes(body.side)) return apiError(c, "INVALID_SIDE", "side must be 'buy' or 'sell'");
    if (!body.actionId || typeof body.actionId !== "string") return apiError(c, "INVALID_ACTION_ID", "actionId is required");
    if (!body.platformId || typeof body.platformId !== "string") return apiError(c, "INVALID_PLATFORM_ID", "platformId is required");
    if (typeof body.price !== "number" || body.price <= 0) return apiError(c, "INVALID_PRICE", "price must be a positive number");

    const action = ACTIONS.find((a) => a.id === body.actionId);
    if (!action) return apiError(c, "UNKNOWN_ACTION", `Unknown actionId: ${body.actionId}`);
    const platform = PLATFORMS.find((p) => p.id === body.platformId);
    if (!platform) return apiError(c, "UNKNOWN_PLATFORM", `Unknown platformId: ${body.platformId}`);

    let order: BuyOrder | SellOrder;
    if (body.side === "buy") {
      if (typeof body.quantity !== "number" || body.quantity <= 0) return apiError(c, "INVALID_QUANTITY", "quantity must be a positive number");
      const requirements = body.requirements ?? {};
      const perkValue = typeof body.perkValue === "number" ? body.perkValue : 0;
      const perkType: "pct" | "dol" = body.perkType === "dol" ? "dol" : "pct";
      order = exchange.placeBuyOrder(
        userId,
        body.businessName ?? userId,
        body.businessType ?? "unknown",
        body.actionId,
        body.platformId,
        body.price,
        body.quantity,
        requirements,
        perkValue,
        perkType,
        body.expiresInHours,
      );
    } else {
      const platformHandle: string = body.platformHandle ?? "";
      const followerCount: number = typeof body.followerCount === "number" ? body.followerCount : 0;
      const engagementRate: number = typeof body.engagementRate === "number" ? body.engagementRate : 0;
      const niches: string[] = Array.isArray(body.niches) ? body.niches : [];
      const location: string = body.location ?? "";
      const availability: number = typeof body.availability === "number" ? body.availability : 5;
      order = exchange.placeSellOrder(
        userId,
        body.agentName ?? userId,
        body.agentType ?? "ai_agent",
        body.actionId,
        body.platformId,
        body.price,
        platformHandle,
        followerCount,
        engagementRate,
        niches,
        location,
        availability,
      );
    }

    return apiResponse(c, { ...order, side: body.side, actionLabel: action.label, platformName: platform.name }, 201);
  } catch (err) {
    logger.error("Failed to place order", err);
    return apiError(c, "ORDER_FAILED", err instanceof Error ? err.message : "Failed to place order", 400);
  }
});

// GET /v1/exchange/trades
app.get("/trades", requireAuth, (c) => {
  const params = c.req.query();
  const userId = c.get("userId");
  const { page, perPage } = parsePagination(new URLSearchParams(params));

  try {
    const status = params.status as Trade["status"] | undefined;
    const trades = exchange.listTrades({
      agentId: userId ?? undefined,
      status,
      actionId: params.actionId,
      platformId: params.platformId,
    });
    const total = trades.length;
    const paginated = trades.slice((page - 1) * perPage, page * perPage);
    return apiResponse(c, { trades: paginated, pagination: paginationMeta(total, page, perPage) });
  } catch (err) {
    logger.error("Failed to list trades", err);
    return apiError(c, "TRADES_FAILED", "Failed to list trades", 500);
  }
});

// POST /v1/exchange/trades
// Dispatches to submitProof / verifyTrade / settleTrade / disputeTrade.
app.post("/trades", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.tradeId || !body.action) return apiError(c, "MISSING_FIELDS", "tradeId and action are required");
    const validActions = ["submit_proof", "verify", "settle", "dispute"] as const;
    type TradeAction = typeof validActions[number];
    if (!validActions.includes(body.action as TradeAction)) return apiError(c, "INVALID_ACTION", `action must be one of: ${validActions.join(", ")}`);

    const tradeId = String(body.tradeId);
    const data = (body.data ?? {}) as { proofUrl?: string; reason?: string };

    let result: Trade;
    switch (body.action as TradeAction) {
      case "submit_proof": {
        if (!data.proofUrl) return apiError(c, "MISSING_PROOF_URL", "data.proofUrl is required for submit_proof");
        result = exchange.submitProof(tradeId, data.proofUrl);
        break;
      }
      case "verify":
        result = exchange.verifyTrade(tradeId);
        break;
      case "settle":
        result = exchange.settleTrade(tradeId);
        break;
      case "dispute": {
        if (!data.reason) return apiError(c, "MISSING_REASON", "data.reason is required for dispute");
        result = exchange.disputeTrade(tradeId, data.reason);
        break;
      }
    }
    return apiResponse(c, result);
  } catch (err) {
    logger.error("Failed to process trade action", err);
    return apiError(c, "TRADE_ACTION_FAILED", err instanceof Error ? err.message : "Failed to process trade action", 400);
  }
});

// POST /v1/exchange/enroll
app.post("/enroll", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.platforms || !Array.isArray(body.platforms)) return apiError(c, "MISSING_FIELDS", "platforms array is required");
    if (!body.niches || !Array.isArray(body.niches)) return apiError(c, "MISSING_FIELDS", "niches array is required");

    // Normalize platforms: accept either string IDs (legacy) or full
    // {platformId, handle, followers, engagementRate} objects.
    const followerCounts: Record<string, number> = body.followerCounts ?? {};
    const platformsInput = body.platforms.slice(0, 20);
    const platforms = platformsInput
      .map((p: unknown) => {
        if (typeof p === "string") {
          return {
            platformId: p,
            handle: "",
            followers: followerCounts[p] ?? 0,
            engagementRate: 0,
          };
        }
        if (p && typeof p === "object") {
          const obj = p as Record<string, unknown>;
          if (typeof obj.platformId === "string") {
            return {
              platformId: obj.platformId,
              handle: typeof obj.handle === "string" ? obj.handle : "",
              followers: typeof obj.followers === "number" ? obj.followers : 0,
              engagementRate: typeof obj.engagementRate === "number" ? obj.engagementRate : 0,
            };
          }
        }
        return null;
      })
      .filter((p: unknown): p is { platformId: string; handle: string; followers: number; engagementRate: number } => p !== null);
    const niches = body.niches.filter((n: unknown) => typeof n === "string").slice(0, 20) as string[];
    if (platforms.length === 0) return apiError(c, "INVALID_INPUT", "platforms must contain at least one valid entry");
    if (niches.length === 0) return apiError(c, "INVALID_INPUT", "niches must contain at least one valid string");

    const userId = c.get("userId") ?? "anonymous";
    const result = exchange.autoEnroll({
      agentName: body.agentName ?? userId,
      agentType: body.agentType ?? "ai_agent",
      platforms,
      niches,
      location: body.location ?? "",
      rateCard: body.rateCard,
    });

    return apiResponse(c, result, 201);
  } catch (err) {
    logger.error("Failed to auto-enroll", err);
    return apiError(c, "ENROLL_FAILED", err instanceof Error ? err.message : "Failed to auto-enroll", 400);
  }
});

export default app;
