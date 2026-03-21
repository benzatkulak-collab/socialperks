import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import {
  reviewSubmission,
  getSubmissionById,
  toApiSubmission,
  calculatePerkValue,
} from "@/lib/submissions";
import { awardPerk } from "@/lib/perk-wallet";
import { reviewOrchestrator } from "@/lib/ai-review";
import { createFraudPipeline } from "@/lib/ml/fraud-pipeline";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";
import { emailProvider, submissionApprovedEmail, submissionRejectedEmail } from "@/lib/email";
import type { LaunchedCampaign } from "@/lib/types";

const fraudPipeline = createFraudPipeline();

/**
 * POST /api/v1/submissions/review — Approve or reject a submission
 *
 * Body:
 *   - submissionId: string (required)
 *   - reviewerId: string (required)
 *   - decision: "approve" | "reject" (required)
 *   - note?: string (optional review note)
 *   - campaign?: LaunchedCampaign (required when approving, for perk calculation)
 *   - followerCount?: number (optional, for follower tier bonus)
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/submissions/review", { method: "POST", path: "/api/v1/submissions/review" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    // Validate required fields
    const required = ["submissionId", "reviewerId", "decision"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return apiError(
        "MISSING_FIELDS",
        `Missing required fields: ${missing.join(", ")}`,
        400
      );
    }

    if (typeof body.submissionId !== "string" || typeof body.reviewerId !== "string") {
      return apiError("INVALID_INPUT", "submissionId and reviewerId must be strings");
    }

    if (body.decision !== "approve" && body.decision !== "reject") {
      return apiError(
        "INVALID_DECISION",
        "decision must be 'approve' or 'reject'",
        400
      );
    }

    // Run AI review alongside the human review
    let aiVerdict = null;
    try {
      const existingSubmission = getSubmissionById(String(body.submissionId));
      if (existingSubmission) {
        const verdict = await reviewOrchestrator.review({
          submissionId: existingSubmission.id,
          campaignId: existingSubmission.campaignId,
          userId: existingSubmission.userId,
          platformId: (existingSubmission.metadata as Record<string, unknown>)?.platformId
            ? String((existingSubmission.metadata as Record<string, unknown>).platformId)
            : "unknown",
          actionId: existingSubmission.actionId,
          proofUrl: existingSubmission.proofUrl,
          proofType: existingSubmission.proofType as "url" | "screenshot" | "video",
          metadata: (existingSubmission.metadata as Record<string, unknown>) ?? {},
        });
        aiVerdict = {
          decision: verdict.decision,
          confidence: verdict.confidence,
          scores: verdict.scores,
          explanation: verdict.explanation,
        };
      }
    } catch {
      // AI review failure should not block human review
    }

    // Score the submission for fraud before processing the review
    let fraudScore = null;
    try {
      const scoringResult = fraudPipeline.scoreAndDecide(
        {
          submissionId: String(body.submissionId),
          userId: body.campaign?.businessId
            ? String(body.reviewerId)
            : String(body.reviewerId),
          campaignId: body.campaign?.id ? String(body.campaign.id) : "unknown",
          platformId: "unknown",
          proofUrl: "",
          proofType: "url",
          metadata: {},
        },
        {
          userId: String(body.reviewerId),
          accountCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
          submissions: [],
        }
      );
      fraudScore = {
        score: scoringResult.prediction.fraudScore,
        riskLevel: scoringResult.prediction.riskLevel,
        decision: scoringResult.decision,
        confidence: scoringResult.prediction.confidence,
        modelVersion: scoringResult.modelVersion,
      };
    } catch {
      // Fraud scoring failure should not block the review
    }

    // Execute the human review
    const result = await reviewSubmission(
      String(body.submissionId),
      String(body.reviewerId),
      body.decision,
      body.note ? String(body.note) : undefined
    );

    if (!result.success) {
      const status =
        result.error!.code === "NOT_FOUND"
          ? 404
          : result.error!.code === "ALREADY_REVIEWED"
            ? 409
            : 400;
      return apiError(result.error!.code, result.error!.message, status);
    }

    const submission = result.data!;

    // If approved and campaign data is provided, calculate and award the perk
    let awardedPerk = null;
    if (body.decision === "approve" && body.campaign) {
      const campaign = body.campaign as LaunchedCampaign;

      if (
        !campaign.businessId ||
        typeof campaign.discountValue !== "number" ||
        !campaign.discountType
      ) {
        return apiError(
          "INVALID_CAMPAIGN",
          "campaign must include businessId, discountValue, and discountType",
          400
        );
      }

      const followerCount =
        typeof body.followerCount === "number" && body.followerCount >= 0
          ? body.followerCount
          : 0;

      const perkCalc = calculatePerkValue(submission, campaign, followerCount);

      // Award the perk to the user's wallet
      const awardResult = awardPerk(
        submission.userId,
        campaign.businessId,
        submission.campaignId,
        submission.id,
        perkCalc.totalValue,
        perkCalc.baseType,
        campaign.expiresInDays ?? 30
      );

      if (awardResult.success) {
        awardedPerk = {
          perk: awardResult.data,
          calculation: perkCalc,
        };
      }
    }

    // Refetch to get the latest state
    const updated = getSubmissionById(submission.id);

    // Publish review event to real-time event bus
    eventBus.publish({
      type: body.decision === "approve" ? "submission.approved" : "submission.rejected",
      payload: {
        submissionId: submission.id,
        campaignId: submission.campaignId,
        userId: submission.userId,
        decision: body.decision,
        reviewerId: String(body.reviewerId),
      },
      targetUserId: submission.userId,
      timestamp: new Date().toISOString(),
    });

    // Send email notification (best-effort)
    try {
      if (body.decision === "approve") {
        const template = submissionApprovedEmail(
          submission.userId,
          body.campaign?.name ?? submission.campaignId,
          awardedPerk ? `$${awardedPerk.calculation.totalValue}` : "a perk"
        );
        await emailProvider.send({
          to: `${submission.userId}@demo.com`,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      } else {
        const template = submissionRejectedEmail(
          submission.userId,
          body.campaign?.name ?? submission.campaignId,
          body.note ? String(body.note).slice(0, 500) : undefined
        );
        await emailProvider.send({
          to: `${submission.userId}@demo.com`,
          subject: template.subject,
          html: template.html,
          text: template.text,
        });
      }
    } catch (emailErr) {
      logger.error("Failed to send review notification email", emailErr, { submissionId: submission.id });
    }

    logger.info("Submission reviewed", {
      submissionId: submission.id,
      decision: body.decision,
      reviewerId: String(body.reviewerId),
    });

    return apiResponse({
      submission: toApiSubmission(updated ?? submission),
      ...(awardedPerk ? { awardedPerk } : {}),
      ...(aiVerdict ? { aiReview: aiVerdict } : {}),
      ...(fraudScore ? { fraudScore } : {}),
    });
  } catch (err) {
    logger.error("Submission review failed", err);
    return apiError(
      "INVALID_BODY",
      "Request body must be valid JSON",
      400
    );
  }
}
