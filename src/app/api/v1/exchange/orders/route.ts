/**
 * GET/POST /api/v1/exchange/orders
 *
 * Buy/sell order management for the marketing exchange.
 * GET: List orders with filtering (relaxed rate limit).
 * POST: Place a new buy or sell order (auth required, standard rate limit).
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../../_shared";
import { findAction, findPlatform } from "@/lib/platforms";

// ─── Types ──────────────────────────────────────────────────────────────────

const ordersStore = new Map<string, Order>();

interface Order {
  id: string;
  side: "buy" | "sell";
  status: "open" | "filled" | "partial" | "cancelled";
  businessId: string | null;
  agentId: string | null;
  platformId: string;
  actionId: string;
  quantity: number;
  filledQuantity: number;
  pricePerUnit: number;
  totalValue: number;
  requirements?: string;
  createdAt: string;
  updatedAt: string;
  expiresAt: string | null;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const q = getQuery(req);
  const side = q.get("side") ?? "all";
  const agentId = q.get("agentId");
  const businessId = q.get("businessId");
  const platformId = q.get("platformId");
  const actionId = q.get("actionId");
  const status = q.get("status");
  const { page, perPage } = paginate(q);

  if (side !== "all" && side !== "buy" && side !== "sell") {
    return err("INVALID_SIDE", "side must be 'buy', 'sell', or 'all'", 400);
  }

  let orders = Array.from(ordersStore.values());

  // Apply filters
  if (side !== "all") orders = orders.filter((o) => o.side === side);
  if (agentId) orders = orders.filter((o) => o.agentId === agentId);
  if (businessId) orders = orders.filter((o) => o.businessId === businessId);
  if (platformId) orders = orders.filter((o) => o.platformId === platformId);
  if (actionId) orders = orders.filter((o) => o.actionId === actionId);
  if (status) orders = orders.filter((o) => o.status === status);

  // Sort by newest first
  orders.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Paginate
  const total = orders.length;
  const start = (page - 1) * perPage;
  const paged = orders.slice(start, start + perPage);

  return ok({
    orders: paged,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
});

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // CSRF — enforce on mutating routes (PR: live audit found bypass)
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await parseBody<{
    side: "buy" | "sell";
    platformId: string;
    actionId: string;
    quantity: number;
    pricePerUnit: number;
    requirements?: string;
    expiresInHours?: number;
  }>(req);
  if (body instanceof Response) return body;

  const { side, platformId, actionId, quantity, pricePerUnit, requirements, expiresInHours } = body;

  // Validate side
  if (!side || (side !== "buy" && side !== "sell")) {
    return err("INVALID_SIDE", "side must be 'buy' or 'sell'", 400);
  }

  // Validate platform
  if (!platformId || !findPlatform(platformId)) {
    return err("INVALID_PLATFORM", `Platform '${platformId}' not found`, 400);
  }

  // Validate action
  if (!actionId || !findAction(actionId)) {
    return err("INVALID_ACTION", `Action '${actionId}' not found`, 400);
  }

  // Validate action belongs to platform
  const action = findAction(actionId);
  if (action && action.platformId !== platformId) {
    return err(
      "ACTION_PLATFORM_MISMATCH",
      `Action '${actionId}' does not belong to platform '${platformId}'`,
      400
    );
  }

  // Validate quantity
  if (!quantity || typeof quantity !== "number" || quantity < 1 || quantity > 10000) {
    return err("INVALID_QUANTITY", "quantity must be between 1 and 10000", 400);
  }

  // Validate price
  if (!pricePerUnit || typeof pricePerUnit !== "number" || pricePerUnit <= 0 || pricePerUnit > 1000) {
    return err("INVALID_PRICE", "pricePerUnit must be between 0.01 and 1000", 400);
  }

  // Side-specific validation
  if (side === "buy" && !user.businessId) {
    return err("BUSINESS_REQUIRED", "Buy orders require a business account", 400);
  }

  // Idempotency: check for recent duplicate open order (same user, side, platform, action, quantity, price)
  const userId = user.id;
  for (const existing of ordersStore.values()) {
    if (
      existing.status === "open" &&
      existing.side === side &&
      existing.platformId === platformId &&
      existing.actionId === actionId &&
      existing.quantity === Math.round(quantity) &&
      existing.pricePerUnit === Math.round(pricePerUnit * 100) / 100 &&
      ((side === "buy" && existing.businessId === (user.businessId ?? userId)) ||
       (side === "sell" && existing.agentId === userId))
    ) {
      return ok({ order: existing, duplicate: true });
    }
  }

  const now = new Date().toISOString();
  const order: Order = {
    id: crypto.randomUUID(),
    side,
    status: "open",
    businessId: side === "buy" ? (user.businessId ?? user.id) : null,
    agentId: side === "sell" ? user.id : null,
    platformId,
    actionId,
    quantity: Math.round(quantity),
    filledQuantity: 0,
    pricePerUnit: Math.round(pricePerUnit * 100) / 100,
    totalValue: Math.round(quantity * pricePerUnit * 100) / 100,
    requirements: requirements ?? undefined,
    createdAt: now,
    updatedAt: now,
    expiresAt: expiresInHours
      ? new Date(Date.now() + expiresInHours * 3600 * 1000).toISOString()
      : null,
  };

  ordersStore.set(order.id, order);

  return ok({ order }, 201);
});
