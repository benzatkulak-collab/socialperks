import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";
import {
  reviewOrchestrator,
  type ReviewRequest,
} from "@/lib/ai-review/index";

/**
 * POST /api/v1/ai/review
 *
 * Run the autonomous AI review pipeline on a submission.
 * Chains content verification, quality scoring, FTC compliance,
 * and fraud detection into a single verdict.
 *
 * Protected by auth middleware.
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/ai/review", { method: "POST", path: "/api/v1/ai/review" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const {
      submissionId,
      campaignId,
      userId,
      platformId,
      actionId,
      proofUrl,
      proofType,
      metadata = {},
      contentText,
      actionType,
      jurisdiction,
    } = body as Partial<ReviewRequest> & {
      contentText?: string;
      actionType?: string;
      jurisdiction?: string;
    };

    // ── Validate required fields ──────────────────────────────────────────

    if (!submissionId || typeof submissionId !== "string") {
      return apiError(
        "INVALID_SUBMISSION_ID",
        "submissionId is required and must be a non-empty string"
      );
    }

    if (!campaignId || typeof campaignId !== "string") {
      return apiError(
        "INVALID_CAMPAIGN_ID",
        "campaignId is required and must be a non-empty string"
      );
    }

    if (!userId || typeof userId !== "string") {
      return apiError(
        "INVALID_USER_ID",
        "userId is required and must be a non-empty string"
      );
    }

    if (!platformId || typeof platformId !== "string") {
      return apiError(
        "INVALID_PLATFORM_ID",
        "platformId is required and must be a non-empty string"
      );
    }

    if (!actionId || typeof actionId !== "string") {
      return apiError(
        "INVALID_ACTION_ID",
        "actionId is required and must be a non-empty string"
      );
    }

    if (!proofUrl || typeof proofUrl !== "string") {
      return apiError(
        "INVALID_PROOF_URL",
        "proofUrl is required and must be a non-empty string"
      );
    }

    const validProofTypes = ["url", "screenshot", "video"];
    if (!proofType || !validProofTypes.includes(proofType)) {
      return apiError(
        "INVALID_PROOF_TYPE",
        `proofType must be one of: ${validProofTypes.join(", ")}`
      );
    }

    // ── Build review request ──────────────────────────────────────────────

    const reviewRequest: ReviewRequest = {
      submissionId: submissionId.slice(0, 100),
      campaignId: campaignId.slice(0, 100),
      userId: userId.slice(0, 100),
      platformId: platformId.slice(0, 50),
      actionId: actionId.slice(0, 100),
      proofUrl: proofUrl.trim().slice(0, 2000),
      proofType: proofType as "url" | "screenshot" | "video",
      metadata: (typeof metadata === "object" && metadata !== null ? metadata : {}) as Record<string, unknown>,
    };

    // ── Run the review pipeline ───────────────────────────────────────────

    const verdict = await reviewOrchestrator.review(reviewRequest, {
      contentText: typeof contentText === "string" ? contentText.slice(0, 5000) : undefined,
      actionType: typeof actionType === "string" ? actionType.slice(0, 100) : undefined,
      jurisdiction: typeof jurisdiction === "string" ? jurisdiction.slice(0, 50) : "US_FTC",
    });

    // ── Return verdict ────────────────────────────────────────────────────

    return apiResponse(
      {
        verdict,
        meta: {
          submissionId,
          decision: verdict.decision,
          confidence: verdict.confidence,
          overallScore: verdict.scores.overallScore,
          processingTimeMs: verdict.processingTimeMs,
          reviewedAt: verdict.reviewedAt,
        },
      },
      200,
      {
        "Cache-Control": "no-store",
        "X-RateLimit-Limit": "200",
        "X-RateLimit-Remaining": "199",
      }
    );
  } catch (err) {
    logger.error("AI review pipeline failed", err);
    return apiError(
      "REVIEW_PIPELINE_FAILED",
      "Failed to run AI review pipeline. Please try again.",
      500
    );
  }
}
