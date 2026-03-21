import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { perkProgramManager } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * POST /api/v1/programs/:id/submit — Submit an action for a member
 * Body: { memberId, actionId, platformId, proofUrl, proofType }
 * Returns: updated progress with tier info
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

    // Validate required fields
    const required = ["memberId", "actionId", "platformId", "proofUrl", "proofType"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return apiError("MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`);
    }

    const validProofTypes = ["url", "screenshot", "video"];
    if (!validProofTypes.includes(body.proofType)) {
      return apiError("INVALID_INPUT", `proofType must be one of: ${validProofTypes.join(", ")}`);
    }

    const progress = perkProgramManager.submitAction(
      programId,
      String(body.memberId),
      {
        actionId: String(body.actionId),
        platformId: String(body.platformId),
        proofUrl: String(body.proofUrl).slice(0, 2000),
        proofType: body.proofType,
      }
    );

    const program = perkProgramManager.getProgram(programId);

    // Emit action.submitted event
    eventBus.publish({
      type: "action.submitted",
      payload: {
        programId,
        memberId: body.memberId,
        actionId: body.actionId,
        platformId: body.platformId,
        currentTier: progress.currentCycle.currentTier?.name ?? null,
        progress: progress.currentCycle.progress,
      },
      targetBusinessId: program?.businessId ?? undefined,
      timestamp: new Date().toISOString(),
    });

    // Check if a new tier was unlocked
    if (progress.currentCycle.currentTier) {
      eventBus.publish({
        type: "tier.unlocked",
        payload: {
          programId,
          memberId: body.memberId,
          tierName: progress.currentCycle.currentTier.name,
          tierId: progress.currentCycle.currentTier.id,
          reward: progress.currentCycle.currentTier.reward.description,
        },
        targetBusinessId: program?.businessId ?? undefined,
        timestamp: new Date().toISOString(),
      });
    }

    logger.info("Action submitted for perk program", {
      programId,
      memberId: body.memberId,
      actionId: body.actionId,
      progress: progress.currentCycle.progress,
    });

    return apiResponse(progress);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to submit action";
    logger.error("Failed to submit action", err instanceof Error ? err : undefined, { programId });
    return apiError("SUBMIT_FAILED", message, 400);
  }
}
