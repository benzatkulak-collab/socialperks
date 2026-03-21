import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { perkProgramManager } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/programs/:id/progress?memberId=xxx — Get member progress
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { programId } = await params;
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("memberId");

  logger.info("GET /api/v1/programs/[programId]/progress", { programId, memberId });

  if (!memberId) {
    return apiError("MISSING_PARAM", "memberId query parameter is required");
  }

  const program = perkProgramManager.getProgram(programId);
  if (!program) {
    return apiError("NOT_FOUND", "Program not found", 404);
  }

  const progress = perkProgramManager.getMemberProgress(programId, memberId);
  if (!progress) {
    return apiError("NOT_FOUND", "Member not found in this program", 404);
  }

  return apiResponse({
    progress,
    reward: perkProgramManager.getRewardForMember(programId, memberId),
  });
}
