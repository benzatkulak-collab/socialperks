/**
 * GET /api/v1/programs/:programId/progress
 *
 * Member progress in a perk program.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  getQuery,
  withTiming,
} from "../../../_shared";
import {
  programs,
  programMembers,
  programSubmissions,
  type ProgramTier,
} from "@/lib/programs/store";

// ─── Route Context Type ─────────────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ programId: string }>;
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Relaxed rate limit
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);

  if (!program) {
    return err("NOT_FOUND", `Program '${programId}' not found`, 404);
  }

  const params = getQuery(req);
  const memberId = params.get("memberId");

  if (!memberId) {
    return err("MISSING_MEMBER_ID", "memberId query parameter is required", 400);
  }

  // Identity scoping: a member can see their own progress; the program owner
  // (or an admin) can see anyone's. Otherwise this endpoint leaks per-member
  // submission counts and tier status across tenants.
  const callerBusinessId = user.businessId ?? user.id;
  const isProgramOwner =
    user.role === "admin" || program.businessId === callerBusinessId;
  if (memberId !== user.id && !isProgramOwner) {
    return err(
      "FORBIDDEN",
      "Cannot view progress for another member",
      403
    );
  }

  // Find member enrollment
  let member = null;
  for (const m of programMembers.values()) {
    if (m.programId === programId && m.memberId === memberId) {
      member = m;
      break;
    }
  }

  if (!member) {
    return err("NOT_ENROLLED", `Member '${memberId}' is not enrolled in program '${programId}'`, 404);
  }

  // Collect approved submissions for this member in this program
  const memberSubmissions = [];
  let totalPoints = 0;
  for (const sub of programSubmissions.values()) {
    if (sub.programId === programId && sub.memberId === memberId) {
      memberSubmissions.push(sub);
      if (sub.status === "approved") {
        totalPoints += sub.points;
      }
    }
  }

  // Determine current tier
  let currentTier: ProgramTier | null = null;
  let nextTier: ProgramTier | null = null;
  const sortedTiers = [...program.tiers].sort(
    (a, b) => a.requiredActions - b.requiredActions
  );

  for (let i = 0; i < sortedTiers.length; i++) {
    if (totalPoints >= sortedTiers[i].requiredActions) {
      currentTier = sortedTiers[i];
      nextTier = sortedTiers[i + 1] ?? null;
    }
  }

  // Points to next tier
  const pointsToNextTier = nextTier
    ? Math.max(0, nextTier.requiredActions - totalPoints)
    : null;

  return ok({
    memberId,
    programId,
    totalPoints,
    currentTier: currentTier?.name ?? null,
    nextTier: nextTier?.name ?? null,
    pointsToNextTier,
    submissions: memberSubmissions.length,
    approvedSubmissions: memberSubmissions.filter((s) => s.status === "approved").length,
    pendingSubmissions: memberSubmissions.filter((s) => s.status === "pending").length,
  });
});
