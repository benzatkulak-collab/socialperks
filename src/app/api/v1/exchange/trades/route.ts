/**
 * GET/POST /api/v1/exchange/trades
 *
 * Trade lifecycle management for the marketing exchange.
 * GET: List trades with filtering (relaxed rate limit).
 * POST: Handle trade actions — submit_proof, verify, settle, dispute (auth required).
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../../_shared";

// ─── Types ──────────────────────────────────────────────────────────────────

const tradesStore = new Map<string, Trade>();

interface Trade {
  id: string;
  orderId: string;
  buyerBusinessId: string;
  sellerAgentId: string;
  platformId: string;
  actionId: string;
  quantity: number;
  pricePerUnit: number;
  totalValue: number;
  status: "pending" | "proof_submitted" | "verified" | "settled" | "disputed" | "cancelled";
  proofUrl: string | null;
  proofType: string | null;
  proofSubmittedAt: string | null;
  verifiedAt: string | null;
  settledAt: string | null;
  disputeReason: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const q = getQuery(req);
  const agentId = q.get("agentId");
  const businessId = q.get("businessId");

  // Tenant isolation: users can only view their own business's trades
  if (user.businessId && businessId && businessId !== user.businessId) {
    return err("FORBIDDEN", "You can only view your own business's trades", 403);
  }
  const status = q.get("status");
  const actionId = q.get("actionId");
  const platformId = q.get("platformId");
  const { page, perPage } = paginate(q);

  let trades = Array.from(tradesStore.values());

  // Apply filters
  if (agentId) trades = trades.filter((t) => t.sellerAgentId === agentId);
  if (businessId) trades = trades.filter((t) => t.buyerBusinessId === businessId);
  if (status) trades = trades.filter((t) => t.status === status);
  if (actionId) trades = trades.filter((t) => t.actionId === actionId);
  if (platformId) trades = trades.filter((t) => t.platformId === platformId);

  // Sort by newest first
  trades.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Paginate
  const total = trades.length;
  const start = (page - 1) * perPage;
  const paged = trades.slice(start, start + perPage);

  return ok({
    trades: paged,
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

  const body = await parseBody<{
    action: "submit_proof" | "verify" | "settle" | "dispute";
    tradeId: string;
    proofUrl?: string;
    proofType?: string;
    disputeReason?: string;
  }>(req);
  if (body instanceof Response) return body;

  const { action, tradeId, proofUrl, proofType, disputeReason } = body;

  // Validate action
  const validActions = ["submit_proof", "verify", "settle", "dispute"];
  if (!action || !validActions.includes(action)) {
    return err(
      "INVALID_ACTION",
      `action must be one of: ${validActions.join(", ")}`,
      400
    );
  }

  // Validate trade ID
  if (!tradeId) {
    return err("MISSING_TRADE_ID", "tradeId is required", 400);
  }

  const trade = tradesStore.get(tradeId);
  if (!trade) {
    return err("TRADE_NOT_FOUND", `Trade '${tradeId}' not found`, 404);
  }

  // Tenant isolation: only the buyer's business can manage this trade
  if (user.businessId && trade.buyerBusinessId !== user.businessId) {
    return err("FORBIDDEN", "You do not have permission to manage this trade", 403);
  }

  const now = new Date().toISOString();

  // ── submit_proof ────────────────────────────────────────────────────────
  if (action === "submit_proof") {
    if (trade.status !== "pending") {
      return err(
        "INVALID_STATE",
        `Cannot submit proof for trade in '${trade.status}' status. Expected 'pending'.`,
        409
      );
    }
    if (!proofUrl) {
      return err("MISSING_PROOF_URL", "proofUrl is required for submit_proof", 400);
    }

    trade.status = "proof_submitted";
    trade.proofUrl = proofUrl;
    trade.proofType = proofType ?? "url";
    trade.proofSubmittedAt = now;
    trade.updatedAt = now;
    tradesStore.set(tradeId, trade);

    return ok({ trade });
  }

  // ── verify ──────────────────────────────────────────────────────────────
  if (action === "verify") {
    if (trade.status !== "proof_submitted") {
      return err(
        "INVALID_STATE",
        `Cannot verify trade in '${trade.status}' status. Expected 'proof_submitted'.`,
        409
      );
    }

    trade.status = "verified";
    trade.verifiedAt = now;
    trade.updatedAt = now;
    tradesStore.set(tradeId, trade);

    return ok({ trade });
  }

  // ── settle ──────────────────────────────────────────────────────────────
  if (action === "settle") {
    if (trade.status !== "verified") {
      return err(
        "INVALID_STATE",
        `Cannot settle trade in '${trade.status}' status. Expected 'verified'.`,
        409
      );
    }

    trade.status = "settled";
    trade.settledAt = now;
    trade.updatedAt = now;
    tradesStore.set(tradeId, trade);

    return ok({ trade });
  }

  // ── dispute ─────────────────────────────────────────────────────────────
  if (action === "dispute") {
    if (trade.status === "settled" || trade.status === "cancelled") {
      return err(
        "INVALID_STATE",
        `Cannot dispute trade in '${trade.status}' status`,
        409
      );
    }
    if (!disputeReason) {
      return err("MISSING_REASON", "disputeReason is required for dispute", 400);
    }

    trade.status = "disputed";
    trade.disputeReason = disputeReason;
    trade.updatedAt = now;
    tradesStore.set(tradeId, trade);

    return ok({ trade });
  }

  return err("INVALID_ACTION", `Unknown action: '${action}'`, 400);
});
