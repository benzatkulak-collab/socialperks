import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { perkProgramManager } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * GET /api/v1/programs/:id/cashback — List cash back payouts for a program
 * Query params: status (optional filter)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { programId } = await params;

  try {
    const program = perkProgramManager.getProgram(programId);
    if (!program) {
      return apiError("NOT_FOUND", "Program not found", 404);
    }

    const statusParam = request.nextUrl.searchParams.get("status") as
      | "pending"
      | "approved"
      | "sent"
      | "confirmed"
      | "failed"
      | null;

    const payouts = perkProgramManager.listCashBackPayouts(
      programId,
      statusParam ?? undefined
    );

    logger.info("Listed cash back payouts", {
      programId,
      status: statusParam,
      count: payouts.length,
    });

    return apiResponse({ payouts, total: payouts.length });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to list payouts";
    logger.error(
      "Failed to list cash back payouts",
      err instanceof Error ? err : undefined,
      { programId }
    );
    return apiError("LIST_FAILED", message, 400);
  }
}

/**
 * POST /api/v1/programs/:id/cashback — Request, approve, send, or confirm cash back
 *
 * For requesting cash back (member):
 *   Body: { memberId, method, methodDetails }
 *
 * For managing payouts (business):
 *   Body: { payoutId, action: "approve" | "send" | "confirm", notes? }
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { programId } = await params;

  try {
    const body = await request.json();
    const program = perkProgramManager.getProgram(programId);
    if (!program) {
      return apiError("NOT_FOUND", "Program not found", 404);
    }

    // If body has "action" field, it's a management action (approve/send/confirm)
    if (body.action && body.payoutId) {
      const validActions = ["approve", "send", "confirm"];
      if (!validActions.includes(body.action)) {
        return apiError(
          "INVALID_ACTION",
          `action must be one of: ${validActions.join(", ")}`
        );
      }

      let payout;
      switch (body.action) {
        case "approve":
          payout = perkProgramManager.approveCashBack(String(body.payoutId));
          eventBus.publish({
            type: "cashback.approved",
            payload: {
              programId,
              payoutId: payout.id,
              memberId: payout.memberId,
              amount: payout.amount,
            },
            targetBusinessId: program.businessId,
            timestamp: new Date().toISOString(),
          });
          break;
        case "send":
          payout = perkProgramManager.markCashBackSent(
            String(body.payoutId),
            body.notes
          );
          eventBus.publish({
            type: "cashback.sent",
            payload: {
              programId,
              payoutId: payout.id,
              memberId: payout.memberId,
              amount: payout.amount,
              method: payout.method,
            },
            targetBusinessId: program.businessId,
            timestamp: new Date().toISOString(),
          });
          break;
        case "confirm":
          payout = perkProgramManager.confirmCashBackReceived(
            String(body.payoutId)
          );
          eventBus.publish({
            type: "cashback.confirmed",
            payload: {
              programId,
              payoutId: payout.id,
              memberId: payout.memberId,
              amount: payout.amount,
            },
            targetBusinessId: program.businessId,
            timestamp: new Date().toISOString(),
          });
          break;
      }

      logger.info(`Cash back ${body.action}`, {
        programId,
        payoutId: body.payoutId,
        action: body.action,
      });

      return apiResponse(payout);
    }

    // Otherwise, it's a cash back request from a member
    const required = ["memberId", "method", "methodDetails"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return apiError(
        "MISSING_FIELDS",
        `Missing required fields: ${missing.join(", ")}`
      );
    }

    const validMethods = [
      "venmo",
      "check",
      "stripe",
      "paypal",
      "cash",
      "other",
    ];
    if (!validMethods.includes(body.method)) {
      return apiError(
        "INVALID_INPUT",
        `method must be one of: ${validMethods.join(", ")}`
      );
    }

    const payout = perkProgramManager.requestCashBack(
      programId,
      String(body.memberId),
      body.method,
      String(body.methodDetails).slice(0, 500)
    );

    eventBus.publish({
      type: "cashback.requested",
      payload: {
        programId,
        payoutId: payout.id,
        memberId: payout.memberId,
        amount: payout.amount,
        method: payout.method,
        tierReached: payout.tierReached,
      },
      targetBusinessId: program.businessId,
      timestamp: new Date().toISOString(),
    });

    logger.info("Cash back requested", {
      programId,
      memberId: body.memberId,
      amount: payout.amount,
      method: payout.method,
    });

    return apiResponse(payout, 201);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to process cash back";
    logger.error(
      "Failed to process cash back",
      err instanceof Error ? err : undefined,
      { programId }
    );
    return apiError("CASHBACK_FAILED", message, 400);
  }
}
