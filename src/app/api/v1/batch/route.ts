/**
 * POST /api/v1/batch — Bulk operations for campaigns and submissions
 *
 * Supports:
 *   - bulk-approve-submissions  (approve multiple submissions at once)
 *   - bulk-reject-submissions   (reject multiple submissions with a reason)
 *   - bulk-launch-campaigns     (launch multiple draft campaigns)
 *   - bulk-pause-campaigns      (pause multiple active campaigns)
 *   - bulk-delete-campaigns     (soft-delete / end multiple campaigns)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../_shared";
import { reviewSubmission, getSubmissionById } from "@/lib/submissions";
import { campaignManager } from "@/lib/campaign-state-machine";
import { validateId, validateString, validateEnum } from "@/lib/security/validate";
import { eventPublisher } from "@/lib/realtime/publisher";

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_BATCH_SIZE = 100;

const VALID_ACTIONS = [
  "bulk-approve-submissions",
  "bulk-reject-submissions",
  "bulk-launch-campaigns",
  "bulk-pause-campaigns",
  "bulk-delete-campaigns",
] as const;

type BatchAction = (typeof VALID_ACTIONS)[number];

// ─── Result Types ───────────────────────────────────────────────────────────

interface BatchFailure {
  id: string;
  error: string;
}

interface BatchResult {
  succeeded: string[];
  failed: BatchFailure[];
  total: number;
  successCount: number;
  failedCount: number;
}

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required for all batch operations
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  // Parse body
  const body = await parseBody<{
    action?: string;
    ids?: unknown;
    reason?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  // Validate action
  const av = validateEnum(body.action, "action", VALID_ACTIONS);
  if (!av.success) return err("INVALID_ACTION", av.error, 400);
  const action: BatchAction = av.data;

  // Validate ids array
  if (!Array.isArray(body.ids)) {
    return err("INVALID_IDS", "ids must be an array of strings", 400);
  }

  if (body.ids.length === 0) {
    return err("EMPTY_IDS", "ids array must not be empty", 400);
  }

  if (body.ids.length > MAX_BATCH_SIZE) {
    return err(
      "BATCH_TOO_LARGE",
      `Maximum batch size is ${MAX_BATCH_SIZE} items. Received ${body.ids.length}.`,
      400
    );
  }

  // Validate each ID
  const validatedIds: string[] = [];
  for (let i = 0; i < body.ids.length; i++) {
    const idVal = validateId(body.ids[i]);
    if (!idVal.success) {
      return err(
        "INVALID_ID",
        `Invalid ID at index ${i}: ${idVal.error}`,
        400
      );
    }
    validatedIds.push(idVal.data);
  }

  // Deduplicate IDs
  const uniqueIds = [...new Set(validatedIds)];

  // Validate optional reason (used for rejections and soft-deletes)
  let reason: string | undefined;
  if (body.reason !== undefined) {
    const rv = validateString(body.reason, "reason", { min: 1, max: 1000 });
    if (!rv.success) return err("INVALID_REASON", rv.error, 400);
    reason = rv.data;
  }

  // Require reason for rejections
  if (action === "bulk-reject-submissions" && !reason) {
    return err(
      "REASON_REQUIRED",
      "reason is required when rejecting submissions",
      400
    );
  }

  // ── Dispatch to handler ─────────────────────────────────────────────────

  let result: BatchResult;

  switch (action) {
    case "bulk-approve-submissions":
      result = await processBulkSubmissionReview(uniqueIds, user.id, "approve");
      break;
    case "bulk-reject-submissions":
      result = await processBulkSubmissionReview(uniqueIds, user.id, "reject", reason);
      break;
    case "bulk-launch-campaigns":
      result = processBulkCampaignAction(uniqueIds, user.id, "launch");
      break;
    case "bulk-pause-campaigns":
      result = processBulkCampaignAction(uniqueIds, user.id, "pause", reason);
      break;
    case "bulk-delete-campaigns":
      result = processBulkCampaignAction(uniqueIds, user.id, "end", reason ?? "Bulk soft-delete");
      break;
  }

  // Publish a summary event
  eventPublisher.publish("batch.completed", {
    action,
    total: result.total,
    successCount: result.successCount,
    failedCount: result.failedCount,
  }, user.businessId ?? undefined);

  return ok(result);
});

// ─── Submission Review Handler ──────────────────────────────────────────────

async function processBulkSubmissionReview(
  ids: string[],
  reviewerId: string,
  decision: "approve" | "reject",
  note?: string
): Promise<BatchResult> {
  const succeeded: string[] = [];
  const failed: BatchFailure[] = [];

  for (const id of ids) {
    // Pre-check: verify submission exists and is pending
    const submission = getSubmissionById(id);
    if (!submission) {
      failed.push({ id, error: `Submission '${id}' not found` });
      continue;
    }
    if (submission.status !== "pending") {
      failed.push({
        id,
        error: `Submission already ${submission.status}`,
      });
      continue;
    }

    const result = await reviewSubmission(id, reviewerId, decision, note);

    if (result.success) {
      succeeded.push(id);

      const eventType = decision === "approve"
        ? "submission.approved"
        : "submission.rejected";
      const campaignLifecycle = campaignManager.getState(submission.campaignId);
      eventPublisher.publish(
        eventType,
        { submissionId: id, decision, batch: true },
        campaignLifecycle?.businessId
      );
    } else {
      failed.push({
        id,
        error: result.error?.message ?? "Review failed",
      });
    }
  }

  return {
    succeeded,
    failed,
    total: ids.length,
    successCount: succeeded.length,
    failedCount: failed.length,
  };
}

// ─── Campaign Action Handler ────────────────────────────────────────────────

function processBulkCampaignAction(
  ids: string[],
  actorId: string,
  action: "launch" | "pause" | "end",
  reason?: string
): BatchResult {
  const succeeded: string[] = [];
  const failed: BatchFailure[] = [];

  for (const id of ids) {
    const lifecycle = campaignManager.getState(id);

    if (!lifecycle) {
      failed.push({ id, error: `Campaign '${id}' not found` });
      continue;
    }

    try {
      switch (action) {
        case "launch": {
          // "launch" in bulk context means resume a paused campaign
          // or re-activate — the launch() method is for new campaigns.
          // For bulk operations, we use resume() for paused campaigns.
          if (lifecycle.state === "paused") {
            campaignManager.resume(id, actorId);
            eventPublisher.publish("campaign.resumed", { campaignId: id, batch: true }, lifecycle.businessId);
          } else if (lifecycle.state === "draft") {
            // Draft campaigns cannot be launched without full config;
            // report a meaningful error.
            failed.push({
              id,
              error: "Draft campaigns require full configuration to launch. Use the campaigns API instead.",
            });
            continue;
          } else if (lifecycle.state === "active") {
            // Already active — treat as a no-op success
            succeeded.push(id);
            continue;
          } else {
            failed.push({
              id,
              error: `Campaign is '${lifecycle.state}' and cannot be launched`,
            });
            continue;
          }
          break;
        }

        case "pause": {
          if (lifecycle.state === "paused") {
            // Already paused — treat as a no-op success
            succeeded.push(id);
            continue;
          }
          campaignManager.pause(id, actorId, reason ?? "Bulk pause");
          eventPublisher.publish(
            "campaign.paused",
            { campaignId: id, reason: reason ?? "Bulk pause", batch: true },
            lifecycle.businessId
          );
          break;
        }

        case "end": {
          if (lifecycle.state === "ended" || lifecycle.state === "expired") {
            // Already in terminal state — treat as a no-op success
            succeeded.push(id);
            continue;
          }
          campaignManager.end(id, actorId, reason ?? "Bulk soft-delete");
          eventPublisher.publish(
            "campaign.ended",
            { campaignId: id, reason: reason ?? "Bulk soft-delete", batch: true },
            lifecycle.businessId
          );
          break;
        }
      }

      succeeded.push(id);
    } catch (error) {
      const message = error instanceof Error
        ? error.message
        : "Operation failed";
      failed.push({ id, error: message });
    }
  }

  return {
    succeeded,
    failed,
    total: ids.length,
    successCount: succeeded.length,
    failedCount: failed.length,
  };
}
