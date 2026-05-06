/**
 * POST /api/v1/programs/:programId/submissions/:submissionId/redeem
 *
 * Business action — marks the submission's redemption code as used.
 * The customer pulled it up at the counter; the business taps "Redeem"
 * (or types the code into the lookup field). One-time use: a second
 * call returns 409.
 *
 * Tenant-isolated: only the business that owns the program can redeem.
 *
 * Body (optional):
 *   { code: "ABCD-2345" }   // server validates code matches submission
 *
 * If `code` is omitted we just trust the submissionId path param (already
 * scoped to the business). Including the code is defensive — the
 * dashboard surfaces it next to the redeem button so a typo is visible.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  rateLimit,
  parseBody,
  requireAuth,
  withTiming,
} from "../../../../../_shared";
import {
  programs,
  programSubmissions,
  type ProgramSubmission,
} from "@/lib/programs/store";
import { requireOwnership } from "@/lib/security/owner";

interface RouteContext {
  params: Promise<{ programId: string; submissionId: string }>;
}

interface Body {
  code?: string;
}

export const POST = withTiming(async (req: NextRequest, ctx?: unknown) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const { programId, submissionId } = await (ctx as RouteContext).params;

  const program = programs.get(programId);
  if (!program) {
    return err("PROGRAM_NOT_FOUND", "Program not found", 404);
  }

  const ownership = requireOwnership(user, program.businessId);
  if (ownership) return ownership;

  const submission = programSubmissions.get(submissionId);
  if (!submission || submission.programId !== programId) {
    return err("SUBMISSION_NOT_FOUND", "Submission not found", 404);
  }

  if (submission.redemptionCode == null) {
    return err(
      "NOT_REDEEMABLE",
      "This submission has no redemption code (legacy or rejected).",
      400
    );
  }

  if (submission.redeemedAt) {
    return err(
      "ALREADY_REDEEMED",
      `This perk was redeemed at ${submission.redeemedAt}.`,
      409
    );
  }

  // Defensive check on the optional posted code — strip the display
  // hyphen and uppercase before comparing.
  const body = await parseBody<Body>(req);
  if (!(body instanceof Response) && typeof body.code === "string") {
    const normalized = body.code.replace(/-/g, "").toUpperCase();
    if (normalized !== submission.redemptionCode) {
      return err("CODE_MISMATCH", "The code you entered doesn't match this submission.", 400);
    }
  }

  const updated: ProgramSubmission = {
    ...submission,
    // Approving + redeeming in one step — if the business is willing to
    // hand over the perk, the submission is implicitly approved.
    status: "approved",
    redeemedAt: new Date().toISOString(),
    reviewedAt: submission.reviewedAt ?? new Date().toISOString(),
  };
  programSubmissions.set(submission.id, updated);

  return ok({ submission: updated });
});
