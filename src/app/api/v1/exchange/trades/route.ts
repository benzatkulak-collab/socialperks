import { NextRequest } from "next/server";
import { apiResponse, apiError, parsePagination, paginationMeta, requireAuth } from "@/lib/api/middleware";
import { exchange } from "@/lib/exchange";
import { findAction, findPlatform } from "@/lib/platforms";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/exchange/trades
 *
 * List trades with filters.
 *
 * Query params:
 *   agentId     — filter by agent
 *   businessId  — filter by business
 *   status      — filter by status (pending, executing, proof_submitted, verified, settled, disputed, cancelled)
 *   actionId    — filter by action
 *   platformId  — filter by platform
 *   page        — pagination (default: 1)
 *   perPage     — items per page (default: 20, max: 100)
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/exchange/trades", { method: "GET", path: "/api/v1/exchange/trades" });

  try {
    const { searchParams } = new URL(request.url);
    const agentId = searchParams.get("agentId") ?? undefined;
    const businessId = searchParams.get("businessId") ?? undefined;
    const status = searchParams.get("status") ?? undefined;
    const actionId = searchParams.get("actionId") ?? undefined;
    const platformId = searchParams.get("platformId") ?? undefined;
    const { page, perPage, offset } = parsePagination(searchParams);

    type TradeStatus = "pending" | "executing" | "proof_submitted" | "verified" | "settled" | "disputed" | "cancelled";
    const validStatuses: TradeStatus[] = ["pending", "executing", "proof_submitted", "verified", "settled", "disputed", "cancelled"];

    if (status && !validStatuses.includes(status as TradeStatus)) {
      return apiError("INVALID_FIELD", `status must be one of: ${validStatuses.join(", ")}`, 400);
    }

    const allTrades = exchange.listTrades({
      agentId,
      businessId,
      status: status as TradeStatus | undefined,
      actionId,
      platformId,
    });

    const total = allTrades.length;
    const paginatedTrades = allTrades.slice(offset, offset + perPage);

    const enrichedTrades = paginatedTrades.map(trade => {
      const action = findAction(trade.actionId);
      const platform = findPlatform(trade.platformId);
      return {
        ...trade,
        actionLabel: action?.label ?? trade.actionId,
        platformName: platform?.name ?? trade.platformId,
        agentNet: Math.round(trade.price * (1 - 0.03) * 100) / 100, // Agent receives (price minus 3% fee)
        businessCost: Math.round(trade.price * (1 + 0.05) * 100) / 100, // Business pays (price plus 5% fee)
      };
    });

    // Summary stats for the filtered set
    const statusCounts: Record<string, number> = {};
    for (const trade of allTrades) {
      statusCounts[trade.status] = (statusCounts[trade.status] ?? 0) + 1;
    }

    const totalValue = allTrades.reduce((sum, t) => sum + t.price, 0);
    const totalFees = allTrades.reduce((sum, t) => sum + t.platformFee, 0);

    return apiResponse({
      trades: enrichedTrades,
      summary: {
        totalTrades: total,
        totalValue: Math.round(totalValue * 100) / 100,
        totalFees: Math.round(totalFees * 100) / 100,
        statusCounts,
      },
      pagination: paginationMeta(total, page, perPage),
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    logger.error("Failed to list trades", err);
    const message = err instanceof Error ? err.message : "Failed to list trades";
    return apiError("TRADE_LIST_ERROR", message, 500);
  }
}

/**
 * POST /api/v1/exchange/trades
 *
 * Trade lifecycle actions: submit proof, verify, settle, dispute.
 *
 * Request body:
 * {
 *   "action": "submit_proof" | "verify" | "settle" | "dispute",
 *   "tradeId": "tr_abc123",
 *   "proofUrl": "https://...",    // required for submit_proof
 *   "reason": "..."               // required for dispute
 * }
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/exchange/trades", { method: "POST", path: "/api/v1/exchange/trades" });

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
    const action = data.action as string;
    const tradeId = data.tradeId as string;

    if (!tradeId || typeof tradeId !== "string") {
      return apiError("MISSING_FIELD", "tradeId is required", 400);
    }

    const validActions = ["submit_proof", "verify", "settle", "dispute"];
    if (!action || !validActions.includes(action)) {
      return apiError("INVALID_FIELD", `action must be one of: ${validActions.join(", ")}`, 400);
    }

    // Verify the trade exists before attempting lifecycle operations
    const existingTrade = exchange.getTrade(tradeId);
    if (!existingTrade) {
      return apiError("TRADE_NOT_FOUND", `Trade '${tradeId.slice(0, 50)}' not found`, 404);
    }

    let trade;

    switch (action) {
      case "submit_proof": {
        const proofUrl = data.proofUrl as string;
        if (!proofUrl || typeof proofUrl !== "string") {
          return apiError("MISSING_FIELD", "proofUrl is required for submit_proof action", 400);
        }
        // Basic URL validation
        try {
          new URL(proofUrl);
        } catch {
          return apiError("INVALID_FIELD", "proofUrl must be a valid URL", 400);
        }
        trade = exchange.submitProof(tradeId, proofUrl);
        break;
      }

      case "verify": {
        trade = exchange.verifyTrade(tradeId);
        break;
      }

      case "settle": {
        trade = exchange.settleTrade(tradeId);
        break;
      }

      case "dispute": {
        const reason = data.reason as string;
        if (!reason || typeof reason !== "string" || reason.trim().length === 0) {
          return apiError("MISSING_FIELD", "reason is required for dispute action", 400);
        }
        trade = exchange.disputeTrade(tradeId, reason.trim());
        break;
      }

      default:
        return apiError("INVALID_FIELD", `Unknown action: ${action}`, 400);
    }

    // Enrich the trade response
    const actionData = findAction(trade.actionId);
    const platform = findPlatform(trade.platformId);

    return apiResponse({
      trade: {
        ...trade,
        actionLabel: actionData?.label ?? trade.actionId,
        platformName: platform?.name ?? trade.platformId,
        agentNet: Math.round(trade.price * (1 - 0.03) * 100) / 100,
        businessCost: Math.round(trade.price * (1 + 0.05) * 100) / 100,
      },
      message: getLifecycleMessage(action, trade.status),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Trade action failed";

    // Return 409 for state transition errors (e.g., trying to verify a pending trade)
    if (message.includes("Cannot") || message.includes("Must be")) {
      return apiError("INVALID_STATE_TRANSITION", message, 409);
    }

    logger.error("Trade action failed", err);
    return apiError("TRADE_ERROR", message, 500);
  }
}

function getLifecycleMessage(action: string, newStatus: string): string {
  switch (action) {
    case "submit_proof":
      return `Proof submitted successfully. Trade is now "${newStatus}". Awaiting verification.`;
    case "verify":
      return `Trade verified successfully. Ready for settlement.`;
    case "settle":
      return `Trade settled. Payment will be processed. Price recorded in market history.`;
    case "dispute":
      return `Trade disputed. A review will be conducted. Both parties will be notified.`;
    default:
      return `Trade updated to status: ${newStatus}`;
  }
}
