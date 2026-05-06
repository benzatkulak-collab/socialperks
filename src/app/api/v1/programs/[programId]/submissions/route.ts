/**
 * GET /api/v1/programs/:programId/submissions
 *
 * Authenticated, tenant-isolated. Lists submissions for a perk program
 * — used by the business "Claim Submissions" dashboard at
 * /dashboard/claims to surface what customers have submitted.
 *
 * Query params:
 *   ?status=pending|approved|rejected   filter by status
 *   ?redeemed=true|false                 filter by redemption state
 *   ?page=1&perPage=20                   pagination
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  rateLimit,
  requireAuth,
  getQuery,
  paginate,
  withTiming,
} from "../../../_shared";
import {
  programs,
  programSubmissions,
  type ProgramSubmission,
} from "@/lib/programs/store";
import { requireOwnership } from "@/lib/security/owner";

interface RouteContext {
  params: Promise<{ programId: string }>;
}

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { programId } = await (ctx as RouteContext).params;
  const program = programs.get(programId);
  if (!program) {
    return err("NOT_FOUND", "Program not found", 404);
  }

  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  const params = getQuery(req);
  const status = params.get("status");
  const redeemedParam = params.get("redeemed");
  const { page, perPage } = paginate(params);

  let filtered: ProgramSubmission[] = Array.from(programSubmissions.values()).filter(
    (s) => s.programId === programId
  );

  if (status === "pending" || status === "approved" || status === "rejected") {
    filtered = filtered.filter((s) => s.status === status);
  }
  if (redeemedParam === "true") {
    filtered = filtered.filter((s) => s.redeemedAt !== null);
  } else if (redeemedParam === "false") {
    filtered = filtered.filter((s) => s.redeemedAt === null);
  }

  filtered.sort(
    (a, b) =>
      new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );

  const total = filtered.length;
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage);

  return ok({
    submissions: items,
    pagination: {
      page,
      perPage,
      total,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
    },
  });
});
