import { Hono } from "hono";
import { reviewOrchestrator, type ReviewRequest } from "@lib/ai-review/index";
import { apiResponse, apiError } from "../../helpers.js";
import { logger } from "@lib/logging";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const {
      submissionId, campaignId, userId, platformId, actionId,
      proofUrl, proofType, metadata = {},
      contentText, actionType, jurisdiction,
    } = body as Partial<ReviewRequest> & {
      contentText?: string; actionType?: string; jurisdiction?: string;
    };

    if (!submissionId || typeof submissionId !== "string") {
      return apiError(c, "INVALID_SUBMISSION_ID", "submissionId is required and must be a non-empty string");
    }
    if (!campaignId || typeof campaignId !== "string") {
      return apiError(c, "INVALID_CAMPAIGN_ID", "campaignId is required and must be a non-empty string");
    }
    if (!userId || typeof userId !== "string") {
      return apiError(c, "INVALID_USER_ID", "userId is required and must be a non-empty string");
    }
    if (!platformId || typeof platformId !== "string") {
      return apiError(c, "INVALID_PLATFORM_ID", "platformId is required and must be a non-empty string");
    }
    if (!actionId || typeof actionId !== "string") {
      return apiError(c, "INVALID_ACTION_ID", "actionId is required and must be a non-empty string");
    }
    if (!proofUrl || typeof proofUrl !== "string") {
      return apiError(c, "INVALID_PROOF_URL", "proofUrl is required and must be a non-empty string");
    }

    const validProofTypes = ["url", "screenshot", "video"];
    if (!proofType || !validProofTypes.includes(proofType)) {
      return apiError(c, "INVALID_PROOF_TYPE", `proofType must be one of: ${validProofTypes.join(", ")}`);
    }

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

    const verdict = await reviewOrchestrator.review(reviewRequest, {
      contentText: typeof contentText === "string" ? contentText.slice(0, 5000) : undefined,
      actionType: typeof actionType === "string" ? actionType.slice(0, 100) : undefined,
      jurisdiction: typeof jurisdiction === "string" ? jurisdiction.slice(0, 50) : "US_FTC",
    });

    return apiResponse(c, {
      verdict,
      meta: {
        submissionId,
        decision: verdict.decision,
        confidence: verdict.confidence,
        overallScore: verdict.scores.overallScore,
        processingTimeMs: verdict.processingTimeMs,
        reviewedAt: verdict.reviewedAt,
      },
    }, 200, { "Cache-Control": "no-store" });
  } catch (err) {
    logger.error("AI review pipeline failed", err);
    return apiError(c, "REVIEW_PIPELINE_FAILED", "Failed to run AI review pipeline. Please try again.", 500);
  }
});

export default app;
