/**
 * POST /api/v1/programs/:programId/submit
 *
 * Record an action submission for a perk program.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  withTiming,
} from "../../../_shared";
import {
  programs,
  programMembers,
  programSubmissions,
  type ProgramSubmission,
} from "@/lib/programs/store";

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  if (program.status !== "active") {
    return err("PROGRAM_NOT_ACTIVE", `Program is currently '${program.status}'`, 400);
  }

  const body = await parseBody<{
    memberId: string;
    actionId: string;
    platformId: string;
    proofUrl: string;
    proofType: string;
  }>(req);
  if (body instanceof Response) return body;

  const { memberId, actionId, platformId, proofUrl, proofType } = body;

  // Validate required fields
  if (!memberId) return err("MISSING_MEMBER_ID", "memberId is required", 400);
  if (!actionId) return err("MISSING_ACTION_ID", "actionId is required", 400);
  if (!platformId) return err("MISSING_PLATFORM_ID", "platformId is required", 400);
  if (!proofUrl) return err("MISSING_PROOF_URL", "proofUrl is required", 400);
  if (!proofType) return err("MISSING_PROOF_TYPE", "proofType is required", 400);

  // Verify member is enrolled
  let enrolled = false;
  for (const m of programMembers.values()) {
    if (m.programId === programId && m.memberId === memberId) {
      enrolled = true;
      break;
    }
  }

  if (!enrolled) {
    return err("NOT_ENROLLED", `Member '${memberId}' is not enrolled in this program`, 403);
  }

  // Find matching rule for points calculation
  let points = 1; // default
  const matchingRule = program.rules.find(
    (r) => r.actionId === actionId && r.platformId === platformId
  );
  if (matchingRule) {
    // Check per-cycle max
    let cycleCount = 0;
    for (const sub of programSubmissions.values()) {
      if (
        sub.programId === programId &&
        sub.memberId === memberId &&
        sub.actionId === actionId &&
        sub.platformId === platformId &&
        sub.status !== "rejected"
      ) {
        cycleCount++;
      }
    }

    if (matchingRule.maxPerCycle > 0 && cycleCount >= matchingRule.maxPerCycle) {
      return err(
        "CYCLE_LIMIT_REACHED",
        `Maximum submissions per cycle reached (${matchingRule.maxPerCycle}) for this action`,
        400
      );
    }

    points = matchingRule.pointsPerAction;
  }

  const submission: ProgramSubmission = {
    id: crypto.randomUUID(),
    programId,
    memberId,
    actionId,
    platformId,
    proofUrl,
    proofType,
    points,
    status: "pending",
    submittedAt: new Date().toISOString(),
    reviewedAt: null,
  };

  programSubmissions.set(submission.id, submission);

  return ok({ submission }, 201);
});
