import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { perkProgramManager } from "@/lib/perk-programs";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * GET  /api/v1/programs/:id/members — List members with progress
 * POST /api/v1/programs/:id/members — Enroll a member
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ programId: string }> }
) {
  const { programId } = await params;
  logger.info("GET /api/v1/programs/[programId]/members", { programId });

  const program = perkProgramManager.getProgram(programId);
  if (!program) {
    return apiError("NOT_FOUND", "Program not found", 404);
  }

  const members = perkProgramManager.listMembers(programId);
  return apiResponse({ members, total: members.length });
}

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
    const required = ["memberId", "name", "email"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return apiError("MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`);
    }

    if (typeof body.memberId !== "string") {
      return apiError("INVALID_INPUT", "memberId must be a string");
    }

    if (typeof body.name !== "string") {
      return apiError("INVALID_INPUT", "name must be a string");
    }

    if (typeof body.email !== "string") {
      return apiError("INVALID_INPUT", "email must be a string");
    }

    const progress = perkProgramManager.enrollMember(
      programId,
      String(body.memberId).slice(0, 100),
      String(body.name).slice(0, 200),
      String(body.email).slice(0, 200)
    );

    const program = perkProgramManager.getProgram(programId);

    eventBus.publish({
      type: "member.enrolled",
      payload: {
        programId,
        memberId: body.memberId,
        memberName: body.name,
      },
      targetBusinessId: program?.businessId ?? undefined,
      timestamp: new Date().toISOString(),
    });

    logger.info("Member enrolled in perk program", { programId, memberId: body.memberId });

    return apiResponse(progress, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to enroll member";
    logger.error("Failed to enroll member", err instanceof Error ? err : undefined, { programId });
    return apiError("ENROLL_FAILED", message, 400);
  }
}
