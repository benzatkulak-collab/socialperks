import { NextRequest } from "next/server";
import {
  apiResponse,
  apiError,
  parsePagination,
  paginationMeta,
  requireAuth,
} from "@/lib/api/middleware";
import { withTracing } from "@/lib/api/with-tracing";
import {
  createSubmission,
  getSubmissions,
  toApiSubmission,
} from "@/lib/submissions";
import { reviewOrchestrator } from "@/lib/ai-review";
import { createFraudPipeline } from "@/lib/ml/fraud-pipeline";
import type { UserContext } from "@/lib/ml/fraud-pipeline";
import { contentScanner } from "@/lib/compliance/index";
import { socialGraph } from "@/lib/ml/social-graph";
import { eventBus } from "@/lib/realtime";
import { logger } from "@/lib/logging";
import type { SubmissionStatus, ProofType } from "@/lib/types";

const fraudPipeline = createFraudPipeline();

/**
 * GET /api/v1/submissions — List submissions with filters
 *
 * Query params:
 *   - campaignId: filter by campaign
 *   - userId: filter by user
 *   - status: filter by status (pending | approved | rejected | expired)
 *   - page: page number (default 1)
 *   - perPage: results per page (default 20, max 100)
 */
async function _GET(request: NextRequest) {
  const startTime = performance.now();
  logger.info("GET /api/v1/submissions", { method: "GET", path: "/api/v1/submissions" });

  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId") ?? undefined;
  const userId = searchParams.get("userId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const actionId = searchParams.get("actionId") ?? undefined;
  const { page, perPage } = parsePagination(searchParams);

  // Validate status if provided
  const validStatuses: SubmissionStatus[] = [
    "pending",
    "approved",
    "rejected",
    "expired",
  ];
  if (status && !validStatuses.includes(status as SubmissionStatus)) {
    return apiError(
      "INVALID_STATUS",
      `status must be one of: ${validStatuses.join(", ")}`,
      400
    );
  }

  const result = getSubmissions(
    {
      campaignId,
      userId,
      status: status as SubmissionStatus | undefined,
      actionId,
    },
    page,
    perPage
  );

  const durationMs = Math.round(performance.now() - startTime);
  logger.info("GET /api/v1/submissions completed", { durationMs, total: result.total });

  return apiResponse({
    submissions: result.submissions.map(toApiSubmission),
    pagination: paginationMeta(result.total, result.page, result.perPage),
  });
}

/**
 * POST /api/v1/submissions — Create a new submission
 *
 * Body:
 *   - campaignId: string (required)
 *   - userId: string (required)
 *   - actionId: string (required)
 *   - proofUrl: string (required)
 *   - proofType: "screenshot" | "url" | "video" | "api_verified" (required)
 *   - metadata?: Record<string, unknown>
 */
async function _POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const startTime = performance.now();

  try {
    const body = await request.json();

    // Check required fields
    const required = ["campaignId", "userId", "actionId", "proofUrl", "proofType"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return apiError(
        "MISSING_FIELDS",
        `Missing required fields: ${missing.join(", ")}`,
        400
      );
    }

    // Validate string types
    if (typeof body.campaignId !== "string" || typeof body.userId !== "string" ||
        typeof body.actionId !== "string" || typeof body.proofUrl !== "string") {
      return apiError("INVALID_INPUT", "campaignId, userId, actionId, and proofUrl must be strings");
    }

    // Validate proofType
    const validProofTypes: ProofType[] = ["screenshot", "url", "video", "api_verified"];
    if (!validProofTypes.includes(body.proofType)) {
      return apiError(
        "INVALID_PROOF_TYPE",
        `proofType must be one of: ${validProofTypes.join(", ")}`,
        400
      );
    }

    const metadata =
      body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata)
        ? body.metadata
        : {};

    const result = createSubmission(
      String(body.campaignId).slice(0, 100),
      String(body.userId).slice(0, 100),
      String(body.actionId).slice(0, 100),
      String(body.proofUrl).slice(0, 2000),
      body.proofType as ProofType,
      metadata as Record<string, unknown>
    );

    if (!result.success) {
      return apiError(
        result.error!.code,
        result.error!.message,
        result.error!.code === "DUPLICATE_SUBMISSION" ? 409 : 400
      );
    }

    const submission = result.data!;

    // Score submission through ML fraud pipeline
    let fraudScore = null;
    try {
      const userContext: UserContext = {
        userId: String(body.userId),
        accountCreatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        submissions: [],
      };
      const scoringResult = fraudPipeline.scoreAndDecide(
        {
          submissionId: submission.id,
          userId: String(body.userId),
          campaignId: String(body.campaignId),
          platformId: metadata.platformId ? String(metadata.platformId) : "unknown",
          proofUrl: String(body.proofUrl),
          proofType: body.proofType as string,
          metadata: metadata as Record<string, unknown>,
        },
        userContext
      );
      fraudScore = {
        score: scoringResult.prediction.fraudScore,
        riskLevel: scoringResult.prediction.riskLevel,
        decision: scoringResult.decision,
        confidence: scoringResult.prediction.confidence,
      };
    } catch {
      // Fraud scoring failure should not block submission creation
    }

    // Run compliance content scanner on any content text
    let complianceResult = null;
    try {
      const contentText =
        (metadata.content as string) ??
        (metadata.caption as string) ??
        (metadata.text as string) ??
        "";
      if (contentText) {
        const scanResult = contentScanner.scan(contentText, {
          platform: metadata.platformId ? String(metadata.platformId) : undefined,
        });
        complianceResult = {
          complianceScore: scanResult.complianceScore,
          hasDisclosure: scanResult.hasDisclosure,
          issues: scanResult.issues.length,
        };
      }
    } catch {
      // Compliance scanning failure should not block submission creation
    }

    // Trigger AI review in the background — non-blocking, best-effort
    let aiVerdict = null;
    try {
      const verdict = await reviewOrchestrator.review({
        submissionId: submission.id,
        campaignId: String(body.campaignId),
        userId: String(body.userId),
        platformId: metadata.platformId ? String(metadata.platformId) : "unknown",
        actionId: String(body.actionId),
        proofUrl: String(body.proofUrl),
        proofType: body.proofType as "url" | "screenshot" | "video",
        metadata: metadata as Record<string, unknown>,
      });
      aiVerdict = {
        decision: verdict.decision,
        confidence: verdict.confidence,
        scores: verdict.scores,
        explanation: verdict.explanation,
        ...(complianceResult ? { complianceScore: complianceResult.complianceScore } : {}),
      };
    } catch {
      // AI review failure should not block submission creation
    }

    // Publish realtime event for submission creation
    try {
      eventBus.publish({
        type: "submission.created",
        payload: {
          submissionId: submission.id,
          campaignId: String(body.campaignId),
          userId: String(body.userId),
          actionId: String(body.actionId),
        },
        targetBusinessId: metadata.businessId ? String(metadata.businessId) : undefined,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Realtime event failure should not block response
    }

    // If AI review approved, add social graph edge between influencer and business
    if (aiVerdict?.decision === "auto_approve") {
      try {
        const influencerNodeId = `inf_${body.userId}`;
        const businessNodeId = `biz_${metadata.businessId ?? body.campaignId}`;
        // Ensure nodes exist before adding edge
        if (!socialGraph.getNode(influencerNodeId)) {
          socialGraph.addNode(influencerNodeId, "influencer", { userId: body.userId });
        }
        if (!socialGraph.getNode(businessNodeId)) {
          socialGraph.addNode(businessNodeId, "business", { campaignId: body.campaignId });
        }
        socialGraph.addEdge(influencerNodeId, businessNodeId, "completed", 0.8, {
          submissionId: submission.id,
          campaignId: body.campaignId,
        });

        // Publish approval realtime event
        eventBus.publish({
          type: "submission.approved",
          payload: {
            submissionId: submission.id,
            campaignId: String(body.campaignId),
            userId: String(body.userId),
          },
          targetUserId: String(body.userId),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Social graph / realtime failure should not block response
      }
    }

    if (aiVerdict?.decision === "auto_reject") {
      try {
        eventBus.publish({
          type: "submission.rejected",
          payload: {
            submissionId: submission.id,
            campaignId: String(body.campaignId),
            userId: String(body.userId),
          },
          targetUserId: String(body.userId),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // Realtime event failure should not block response
      }
    }

    const durationMs = Math.round(performance.now() - startTime);
    logger.info("POST /api/v1/submissions completed", { durationMs, submissionId: submission.id });

    return apiResponse(
      {
        ...toApiSubmission(submission),
        ...(fraudScore ? { fraudScore } : {}),
        ...(complianceResult ? { compliance: complianceResult } : {}),
        ...(aiVerdict ? { aiReview: aiVerdict } : {}),
      },
      201
    );
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error("POST /api/v1/submissions failed", err, { durationMs });
    return apiError(
      "INVALID_BODY",
      "Request body must be valid JSON",
      400
    );
  }
}

export const GET = withTracing(_GET, "submissions.list");
export const POST = withTracing(_POST, "submissions.create");
