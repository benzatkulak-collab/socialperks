/**
 * POST /api/v1/ai/review
 *
 * AI submission review pipeline. Runs fraud detection, compliance check,
 * and platform verification on a submission.
 * Requires authentication. Standard rate limit.
 *
 * Body: { submissionId, campaignId, userId, platformId, actionId,
 *         proofUrl, proofType }
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import {
  checkSubmission,
  type SubmissionInput,
  type UserHistory,
  type CampaignData,
} from "@/lib/fraud-detection";
import { checkCampaignCompliance } from "@/lib/compliance-engine";
import { verificationEngine } from "@/lib/verification-engine";
import { checkProofUrl } from "@/lib/verification/url-checker";
// Screenshot analysis available for future use
// import { analyzeScreenshotUrl } from "@/lib/verification/screenshot-analyzer";
import { getOrTrainModel } from "@/lib/ml/model-singleton";
import type { SubmissionFeatures } from "@/lib/ml/fraud-model";
import type { LaunchedCampaign } from "@/lib/types";

interface ReviewBody {
  submissionId?: string;
  campaignId?: string;
  userId?: string;
  platformId?: string;
  actionId?: string;
  proofUrl?: string;
  proofType?: "screenshot" | "url" | "video" | "api_verified";
  content?: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit
  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // Parse body
  const body = await parseBody<ReviewBody>(req);
  if (body instanceof Response) return body;

  // Validate required fields
  const required = ["submissionId", "campaignId", "userId", "platformId", "actionId", "proofUrl", "proofType"] as const;
  for (const field of required) {
    if (!body[field] || typeof body[field] !== "string") {
      return err("MISSING_FIELD", `${field} is required`, 400);
    }
  }

  // Cap the free-form `content` field before it reaches the fraud scanner.
  // Without a cap a caller could push megabytes of text into the AI pipeline
  // per request, blowing memory and rate-limit budgets. 10 KiB is well above
  // typical proof captions. AI audit M1.
  const MAX_CONTENT_BYTES = 10 * 1024;
  if (typeof body.content === "string" && body.content.length > MAX_CONTENT_BYTES) {
    return err(
      "CONTENT_TOO_LARGE",
      `content exceeds ${MAX_CONTENT_BYTES} bytes`,
      413
    );
  }

  const validProofTypes = ["screenshot", "url", "video", "api_verified"];
  if (!validProofTypes.includes(body.proofType!)) {
    return err(
      "INVALID_FIELD",
      `proofType must be one of: ${validProofTypes.join(", ")}`,
      400
    );
  }

  // Build fraud-detection input (using empty history for stateless check)
  const submissionInput: SubmissionInput = {
    id: body.submissionId!,
    userId: body.userId!,
    campaignId: body.campaignId!,
    businessId: user.businessId ?? "",
    proofUrl: body.proofUrl!,
    proofType: body.proofType!,
    content: body.content,
    submittedAt: new Date().toISOString(),
    platformId: body.platformId,
  };

  // Stateless user history (in production, fetched from DB)
  const userHistory: UserHistory = {
    userId: body.userId!,
    accountCreatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
    submissions: [],
    ownedBusinessIds: user.businessId ? [user.businessId] : [],
  };

  const campaignData: CampaignData = {
    campaignId: body.campaignId!,
    businessId: user.businessId ?? "",
    allSubmissions: [],
  };

  // 1. Fraud detection (rule-based)
  const fraudCheck = checkSubmission(submissionInput, userHistory, campaignData);

  // 1b. ML fraud scoring
  const mlModel = getOrTrainModel();
  const mlFeatures: SubmissionFeatures = {
    accountAgeDays: 90, // Stateless default — in production, fetched from DB
    submissionCount: userHistory.submissions.length,
    approvalRate: userHistory.submissions.length > 0
      ? userHistory.submissions.filter(s => s.status === "approved").length / userHistory.submissions.length
      : 0.5,
    rejectionCount: userHistory.submissions.filter(s => s.status === "rejected").length,
    timeSinceLastSubmission: userHistory.submissions.length > 0
      ? (Date.now() - new Date(userHistory.submissions[userHistory.submissions.length - 1].submittedAt).getTime()) / 60000
      : 1440,
    uniqueCampaigns: new Set(userHistory.submissions.map(s => s.campaignId)).size,
    sameCampaignCount: userHistory.submissions.filter(s => s.campaignId === body.campaignId).length,
    proofUrlLength: (body.proofUrl ?? "").length,
    isHttps: (body.proofUrl ?? "").startsWith("https"),
    platformDomainMatch: true, // Will be updated by URL check below
    hasNotes: !!body.content,
    hourOfDay: new Date().getUTCHours(),
    dayOfWeek: new Date().getUTCDay(),
    contentLength: (body.content ?? "").length,
    isReviewAction: (body.actionId ?? "").toLowerCase().includes("review"),
    followerCount: 0, // Not available in stateless context
    engagementRate: 0,
  };
  const mlFraudScore = mlModel.predictFromSubmission(mlFeatures);

  // 2. Compliance check
  const stubCampaign: LaunchedCampaign = {
    id: body.campaignId!,
    businessId: user.businessId ?? "",
    name: "",
    description: "",
    actions: [body.actionId!],
    discountValue: 0,
    discountType: "pct",
    expiresInDays: 30,
    useTiers: false,
    status: "active",
    createdAt: new Date().toISOString(),
  };
  const complianceCheck = checkCampaignCompliance(stubCampaign, [body.actionId!]);

  // 3. Verification (platform engine) + 4. URL check (real HTTP) — run in parallel
  const [verificationResult, urlCheckResult] = await Promise.all([
    verificationEngine.verify({
      submissionId: body.submissionId!,
      proofUrl: body.proofUrl!,
      proofType: body.proofType!,
      actionId: body.actionId!,
      platformId: body.platformId!,
    }),
    checkProofUrl(body.proofUrl!, body.platformId!).catch(() => null),
  ]);

  // Determine overall verdict
  let verdict: "approved" | "rejected" | "manual_review" = "approved";
  const reasons: string[] = [];

  if (fraudCheck.action === "auto_reject") {
    verdict = "rejected";
    reasons.push("Fraud detection flagged this submission");
  } else if (fraudCheck.action === "manual_review" || fraudCheck.action === "flag") {
    verdict = "manual_review";
    reasons.push("Fraud detection requires manual review");
  }

  if (!complianceCheck.compliant) {
    const criticalIssues = complianceCheck.issues.filter((i) => i.severity === "critical");
    if (criticalIssues.length > 0) {
      verdict = "rejected";
      reasons.push("Compliance check found critical issues");
    } else if (verdict !== "rejected") {
      verdict = "manual_review";
      reasons.push("Compliance check found warnings");
    }
  }

  if (verificationResult.status === "failed") {
    verdict = "rejected";
    reasons.push("Platform verification failed");
  } else if (verificationResult.status === "manual_review" && verdict === "approved") {
    verdict = "manual_review";
    reasons.push("Verification confidence is low");
  }

  // Adjust verdict based on real URL check results
  if (urlCheckResult) {
    if (!urlCheckResult.reachable && verdict === "approved") {
      verdict = "manual_review";
      reasons.push("Proof URL is not reachable");
    }
    if (!urlCheckResult.platformMatch && verdict === "approved") {
      verdict = "manual_review";
      reasons.push("Proof URL domain does not match expected platform");
    }
    // Low URL check confidence can downgrade an approved verdict
    if (urlCheckResult.confidence < 0.4 && verdict === "approved") {
      verdict = "manual_review";
      reasons.push("URL verification confidence is low");
    }
  }

  // ML model override: if ML score is very high but rule-based approved, escalate
  if (mlFraudScore > 0.8 && verdict === "approved") {
    verdict = "manual_review";
    reasons.push("ML fraud model detected high-risk patterns (score: " + mlFraudScore.toFixed(3) + ")");
  }

  return ok({
    verdict,
    reasons,
    fraud: {
      passed: fraudCheck.passed,
      score: fraudCheck.score,
      mlFraudScore,
      signals: fraudCheck.signals,
      action: fraudCheck.action,
      details: fraudCheck.details,
    },
    compliance: {
      compliant: complianceCheck.compliant,
      score: complianceCheck.score,
      issues: complianceCheck.issues,
    },
    verification: {
      status: verificationResult.status,
      confidence: verificationResult.confidence,
      method: verificationResult.method,
    },
    urlCheck: urlCheckResult
      ? {
          reachable: urlCheckResult.reachable,
          platformMatch: urlCheckResult.platformMatch,
          confidence: urlCheckResult.confidence,
          checks: urlCheckResult.checks,
          detectedPlatform: urlCheckResult.detectedPlatform,
        }
      : null,
  });
});
