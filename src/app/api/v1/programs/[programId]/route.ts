import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { perkProgramManager } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * GET    /api/v1/programs/:id — Get program details with stats
 * PUT    /api/v1/programs/:id — Update program
 * DELETE /api/v1/programs/:id — End program
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;
  logger.info("GET /api/v1/programs/[programId]", { programId });

  const program = perkProgramManager.getProgram(programId);
  if (!program) {
    return apiError("NOT_FOUND", "Program not found", 404);
  }

  const stats = perkProgramManager.getProgramStats(programId);

  return apiResponse({ program, stats });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { programId } = await params;

  try {
    const body = await request.json();

    const program = perkProgramManager.updateProgram(programId, {
      name: body.name,
      description: body.description,
      rules: body.rules,
      tiers: body.tiers,
      cycle: body.cycle,
      cycleStartDay: body.cycleStartDay,
      carryOverPartial: body.carryOverPartial,
      gracePeriodDays: body.gracePeriodDays,
      maxMembers: body.maxMembers,
    });

    eventBus.publish({
      type: "program.updated",
      payload: {
        programId: program.id,
        businessId: program.businessId,
      },
      targetBusinessId: program.businessId,
      timestamp: new Date().toISOString(),
    });

    logger.info("Perk program updated", { programId });

    return apiResponse(program);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update program";
    logger.error("Failed to update perk program", err instanceof Error ? err : undefined, { programId });
    return apiError("UPDATE_FAILED", message, 400);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { programId } = await params;

  try {
    const program = perkProgramManager.endProgram(programId);

    eventBus.publish({
      type: "program.ended",
      payload: {
        programId: program.id,
        businessId: program.businessId,
      },
      targetBusinessId: program.businessId,
      timestamp: new Date().toISOString(),
    });

    logger.info("Perk program ended", { programId });

    return apiResponse({ program, message: "Program ended successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to end program";
    logger.error("Failed to end perk program", err instanceof Error ? err : undefined, { programId });
    return apiError("DELETE_FAILED", message, 400);
  }
}
