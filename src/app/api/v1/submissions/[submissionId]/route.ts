/**
 * GET    /api/v1/submissions/:submissionId — Get single submission by ID
 * DELETE /api/v1/submissions/:submissionId — Soft-delete submission (only if pending)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  withTiming,
} from "../../_shared";
import { getSubmissionById } from "@/lib/submissions";
import { validateId } from "@/lib/security/validate";
import { campaignManager } from "@/lib/campaign-state-machine";
import { eventPublisher } from "@/lib/realtime/publisher";

// ─── Params helper ───────────────────────────────────────────────────────────

async function getSubmissionIdParam(
  ctx: unknown
): Promise<string | null> {
  try {
    const { submissionId } = await (
      ctx as { params: Promise<{ submissionId: string }> }
    ).params;
    return submissionId ?? null;
  } catch {
    return null;
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Rate limit — relaxed for read-only
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const rawId = await getSubmissionIdParam(ctx);
  const v = validateId(rawId);
  if (!v.success) return err("INVALID_SUBMISSION_ID", v.error, 400);

  const submission = getSubmissionById(v.data);
  if (!submission) {
    return err(
      "SUBMISSION_NOT_FOUND",
      `Submission ${v.data} not found`,
      404
    );
  }

  return ok({ submission });
});

// ─── DELETE ─────────────────────────────────────────────────────────────────

export const DELETE = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const rawId = await getSubmissionIdParam(ctx);
  const sv = validateId(rawId);
  if (!sv.success) return err("INVALID_SUBMISSION_ID", sv.error, 400);

  const submission = getSubmissionById(sv.data);
  if (!submission) {
    return err(
      "SUBMISSION_NOT_FOUND",
      `Submission ${sv.data} not found`,
      404
    );
  }

  // Verify ownership: the submitter or the campaign's business owner can delete
  const campaign = campaignManager.getState(submission.campaignId);
  const isSubmitter = submission.userId === user.id;
  const isBusinessOwner =
    user.businessId && campaign?.businessId === user.businessId;

  if (!isSubmitter && !isBusinessOwner) {
    return err(
      "FORBIDDEN",
      "You do not have permission to delete this submission",
      403
    );
  }

  // Only pending submissions can be deleted
  if (submission.status !== "pending") {
    return err(
      "SUBMISSION_NOT_DELETABLE",
      `Submission is "${submission.status}" and cannot be deleted. Only pending submissions can be removed.`,
      409
    );
  }

  // Soft-delete: mark as rejected with a deletion note
  submission.status = "rejected" as typeof submission.status;
  submission.reviewedAt = new Date().toISOString();
  submission.reviewedBy = user.id;
  submission.reviewNote = "Deleted via API";
  submission.metadata = {
    ...submission.metadata,
    deletedAt: new Date().toISOString(),
    deletedBy: user.id,
  };

  eventPublisher.publish(
    "submission.deleted",
    { submissionId: sv.data, campaignId: submission.campaignId },
    campaign?.businessId
  );

  return ok({
    submission,
    message: "Submission soft-deleted (status set to rejected)",
  });
});
