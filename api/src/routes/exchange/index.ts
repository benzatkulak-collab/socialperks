import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError, parsePagination, paginationMeta } from "../../helpers.js";
import { requireAuth } from "../../middleware/auth.js";
import { rateLimit } from "../../middleware/rate-limit.js";
import { exchange } from "@lib/exchange";
import { PLATFORMS, ALL_ACTIONS as ACTIONS } from "@social-perks/shared/platforms";
import { logger } from "@lib/logging";

const app = new Hono<AppEnv>();

// GET /v1/exchange/opportunities (public)
app.get("/opportunities", rateLimit("public"), (c) => {
  const params = c.req.query();
  const platforms = (params.platforms?.split(",").filter(Boolean) ?? []).slice(0, 20);
  const niches = (params.niches?.split(",").filter(Boolean) ?? []).slice(0, 20);
  const parsedFollowers = params.followerCount ? parseInt(params.followerCount) : undefined;
  const followerCount = parsedFollowers !== undefined && !isNaN(parsedFollowers) && parsedFollowers >= 0 ? parsedFollowers : undefined;
  const location = params.location;

  try {
    const opportunities = exchange.getOpportunities({ platforms, niches, followerCount, location });
    return apiResponse(c, { opportunities, meta: { totalOpportunities: opportunities.length, generatedAt: new Date().toISOString() } });
  } catch (err) {
    logger.error("Failed to get opportunities", err);
    return apiError(c, "OPPORTUNITIES_FAILED", "Failed to get opportunities", 500);
  }
});

// GET /v1/exchange/market (public)
app.get("/market", rateLimit("public"), (c) => {
  const view = c.req.query("view") ?? "stats";
  const actionId = c.req.query("actionId");
  const platformId = c.req.query("platformId");

  try {
    const data = exchange.getMarketData({ view, actionId, platformId });
    return apiResponse(c, data, 200, { "Cache-Control": "public, max-age=30" });
  } catch (err) {
    logger.error("Failed to get market data", err);
    return apiError(c, "MARKET_DATA_FAILED", "Failed to get market data", 500);
  }
});

// GET /v1/exchange/orders
app.get("/orders", requireAuth, (c) => {
  const params = c.req.query();
  const userId = c.get("userId");
  const { page, perPage } = parsePagination(new URLSearchParams(params));

  try {
    const orders = exchange.listOrders({ userId: userId ?? undefined, side: params.side, status: params.status, actionId: params.actionId, platformId: params.platformId });
    const total = orders.length;
    const paginated = orders.slice((page - 1) * perPage, page * perPage);

    // Enrich with labels
    const enriched = paginated.map((o) => {
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
app.post("/orders", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.get("userId");

    if (!body.side || !["buy", "sell"].includes(body.side)) return apiError(c, "INVALID_SIDE", "side must be 'buy' or 'sell'");
    if (!body.actionId || typeof body.actionId !== "string") return apiError(c, "INVALID_ACTION_ID", "actionId is required");
    if (!body.platformId || typeof body.platformId !== "string") return apiError(c, "INVALID_PLATFORM_ID", "platformId is required");
    if (typeof body.price !== "number" || body.price <= 0) return apiError(c, "INVALID_PRICE", "price must be a positive number");
    if (typeof body.quantity !== "number" || body.quantity <= 0) return apiError(c, "INVALID_QUANTITY", "quantity must be a positive number");

    const action = ACTIONS.find((a) => a.id === body.actionId);
    if (!action) return apiError(c, "UNKNOWN_ACTION", `Unknown actionId: ${body.actionId}`);
    const platform = PLATFORMS.find((p) => p.id === body.platformId);
    if (!platform) return apiError(c, "UNKNOWN_PLATFORM", `Unknown platformId: ${body.platformId}`);

    const order = exchange.placeOrder({
      userId: userId ?? "anonymous",
      side: body.side,
      actionId: body.actionId,
      platformId: body.platformId,
      price: body.price,
      quantity: body.quantity,
      metadata: body.metadata,
    });

    return apiResponse(c, { ...order, actionLabel: action.label, platformName: platform.name }, 201);
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
    const trades = exchange.listTrades({ userId: userId ?? undefined, status: params.status, campaignId: params.campaignId });
    const total = trades.length;
    const paginated = trades.slice((page - 1) * perPage, page * perPage);
    return apiResponse(c, { trades: paginated, pagination: paginationMeta(total, page, perPage) });
  } catch (err) {
    logger.error("Failed to list trades", err);
    return apiError(c, "TRADES_FAILED", "Failed to list trades", 500);
  }
});

// POST /v1/exchange/trades
app.post("/trades", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.tradeId || !body.action) return apiError(c, "MISSING_FIELDS", "tradeId and action are required");
    const validActions = ["submit_proof", "verify", "settle", "dispute"];
    if (!validActions.includes(body.action)) return apiError(c, "INVALID_ACTION", `action must be one of: ${validActions.join(", ")}`);

    const result = exchange.processTradeAction(String(body.tradeId), body.action, body.data ?? {});
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
    // Validate array items are strings and cap length
    const platforms = body.platforms.filter((p: unknown) => typeof p === "string").slice(0, 20) as string[];
    const niches = body.niches.filter((n: unknown) => typeof n === "string").slice(0, 20) as string[];
    if (platforms.length === 0) return apiError(c, "INVALID_INPUT", "platforms must contain at least one valid string");
    if (niches.length === 0) return apiError(c, "INVALID_INPUT", "niches must contain at least one valid string");

    const userId = c.get("userId");
    const result = exchange.autoEnroll({
      userId: userId ?? "anonymous",
      platforms,
      niches,
      followerCounts: body.followerCounts ?? {},
      minPrice: body.minPrice,
      location: body.location,
    });

    return apiResponse(c, result, 201);
  } catch (err) {
    logger.error("Failed to auto-enroll", err);
    return apiError(c, "ENROLL_FAILED", err instanceof Error ? err.message : "Failed to auto-enroll", 400);
  }
});

export default app;
