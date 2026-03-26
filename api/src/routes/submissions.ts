import { Hono } from "hono";
import { apiResponse, apiError, parsePagination, paginationMeta } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { createSubmission, getSubmissions, getSubmissionById, toApiSubmission, reviewSubmission, calculatePerkValue } from "@lib/submissions";
import { campaignManager } from "@lib/campaign-state-machine";
import { reviewOrchestrator } from "@lib/ai-review";
import { createFraudPipeline } from "@lib/ml/fraud-pipeline";
import type { UserContext } from "@lib/ml/fraud-pipeline";
import { contentScanner } from "@lib/compliance/index";
import { socialGraph } from "@lib/ml/social-graph";
import { eventBus } from "@lib/realtime";
import { logger } from "@lib/logging";
import { awardPerk } from "@lib/perk-wallet";
import { emailProvider, submissionApprovedEmail, submissionRejectedEmail } from "@lib/email";
import type { SubmissionStatus, ProofType, LaunchedCampaign } from "@social-perks/shared/types";

const fraudPipeline = createFraudPipeline();
const app = new Hono();

// GET /v1/submissions
app.get("/", (c) => {
  const params = c.req.query();
  const campaignId = params.campaignId;
  const businessId = params.businessId;
  const userId = params.userId;
  const status = params.status;
  const actionId = params.actionId;
  const { page, perPage } = parsePagination(new URLSearchParams(params));

  const validStatuses: SubmissionStatus[] = ["pending", "approved", "rejected", "expired"];
  if (status && !validStatuses.includes(status as SubmissionStatus)) {
    return apiError(c, "INVALID_STATUS", `status must be one of: ${validStatuses.join(", ")}`, 400);
  }

  let resolvedCampaignIds: string[] | undefined;
  if (businessId) {
    resolvedCampaignIds = campaignManager.listByBusiness(businessId).map((ca) => ca.id);
  }

  let result;
  if (resolvedCampaignIds && !campaignId) {
    const allSubmissions: ReturnType<typeof getSubmissions> = { submissions: [], total: 0, page: 1, perPage, totalPages: 0 };
    for (const cId of resolvedCampaignIds) {
      const partial = getSubmissions({ campaignId: cId, userId, status: status as SubmissionStatus | undefined, actionId }, 1, 10000);
      allSubmissions.submissions.push(...partial.submissions);
    }
    allSubmissions.submissions.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    allSubmissions.total = allSubmissions.submissions.length;
    const offset = (Math.max(1, page) - 1) * perPage;
    allSubmissions.submissions = allSubmissions.submissions.slice(offset, offset + perPage);
    allSubmissions.page = Math.max(1, page);
    allSubmissions.totalPages = Math.ceil(allSubmissions.total / perPage);
    result = allSubmissions;
  } else {
    result = getSubmissions({ campaignId, userId, status: status as SubmissionStatus | undefined, actionId }, page, perPage);
  }

  return apiResponse(c, { submissions: result.submissions.map(toApiSubmission), pagination: paginationMeta(result.total, result.page, result.perPage) });
});

// POST /v1/submissions
app.post("/", requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const authUserId = c.get("userId");
    const required = ["campaignId", "userId", "actionId", "proofUrl", "proofType"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) return apiError(c, "MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`, 400);

    if (typeof body.campaignId !== "string" || typeof body.userId !== "string" || typeof body.actionId !== "string" || typeof body.proofUrl !== "string") {
      return apiError(c, "INVALID_INPUT", "campaignId, userId, actionId, and proofUrl must be strings");
    }
    if (authUserId && body.userId !== authUserId) {
      return apiError(c, "USER_ID_MISMATCH", "userId in the request body must match the authenticated user", 403);
    }

    const validProofTypes: ProofType[] = ["screenshot", "url", "video", "api_verified"];
    if (!validProofTypes.includes(body.proofType)) {
      return apiError(c, "INVALID_PROOF_TYPE", `proofType must be one of: ${validProofTypes.join(", ")}`, 400);
    }

    const metadata = body.metadata && typeof body.metadata === "object" && !Array.isArray(body.metadata) ? body.metadata : {};

    const result = createSubmission(String(body.campaignId).slice(0, 100), String(body.userId).slice(0, 100), String(body.actionId).slice(0, 100), String(body.proofUrl).slice(0, 2000), body.proofType as ProofType, metadata as Record<string, unknown>);
    if (!result.success) return apiError(c, result.error!.code, result.error!.message, result.error!.code === "DUPLICATE_SUBMISSION" ? 409 : 400);

    const submission = result.data!;
    let fraudScore = null;
    try { const uc: UserContext = { userId: String(body.userId), accountCreatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), submissions: [] }; const sr = fraudPipeline.scoreAndDecide({ submissionId: submission.id, userId: String(body.userId), campaignId: String(body.campaignId), platformId: metadata.platformId ? String(metadata.platformId) : "unknown", proofUrl: String(body.proofUrl), proofType: body.proofType as string, metadata: metadata as Record<string, unknown> }, uc); fraudScore = { score: sr.prediction.fraudScore, riskLevel: sr.prediction.riskLevel, decision: sr.decision, confidence: sr.prediction.confidence }; } catch { /* non-blocking */ }

    let complianceResult = null;
    try { const contentText = (metadata.content as string) ?? (metadata.caption as string) ?? (metadata.text as string) ?? ""; if (contentText) { const scanResult = contentScanner.scan(contentText, { platform: metadata.platformId ? String(metadata.platformId) : undefined }); complianceResult = { complianceScore: scanResult.complianceScore, hasDisclosure: scanResult.hasDisclosure, issues: scanResult.issues.length }; } } catch { /* non-blocking */ }

    let aiVerdict = null;
    try { const verdict = await reviewOrchestrator.review({ submissionId: submission.id, campaignId: String(body.campaignId), userId: String(body.userId), platformId: metadata.platformId ? String(metadata.platformId) : "unknown", actionId: String(body.actionId), proofUrl: String(body.proofUrl), proofType: body.proofType as "url" | "screenshot" | "video", metadata: metadata as Record<string, unknown> }); aiVerdict = { decision: verdict.decision, confidence: verdict.confidence, scores: verdict.scores, explanation: verdict.explanation, ...(complianceResult ? { complianceScore: complianceResult.complianceScore } : {}) }; } catch { /* non-blocking */ }

    try { eventBus.publish({ type: "submission.created", payload: { submissionId: submission.id, campaignId: String(body.campaignId), userId: String(body.userId), actionId: String(body.actionId) }, targetBusinessId: metadata.businessId ? String(metadata.businessId) : undefined, timestamp: new Date().toISOString() }); } catch { /* non-blocking */ }

    if (aiVerdict?.decision === "auto_approve") { try { const infId = `inf_${body.userId}`; const bizId = `biz_${metadata.businessId ?? body.campaignId}`; if (!socialGraph.getNode(infId)) socialGraph.addNode(infId, "influencer", { userId: body.userId }); if (!socialGraph.getNode(bizId)) socialGraph.addNode(bizId, "business", { campaignId: body.campaignId }); socialGraph.addEdge(infId, bizId, "completed", 0.8, { submissionId: submission.id, campaignId: body.campaignId }); } catch { /* non-blocking */ } }

    return apiResponse(c, { ...toApiSubmission(submission), ...(fraudScore ? { fraudScore } : {}), ...(complianceResult ? { compliance: complianceResult } : {}), ...(aiVerdict ? { aiReview: aiVerdict } : {}) }, 201);
  } catch (err) {
    logger.error("POST /v1/submissions failed", err);
    return apiError(c, "INVALID_BODY", "Request body must be valid JSON", 400);
  }
});

// POST /v1/submissions/review
app.post("/review", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const required = ["submissionId", "reviewerId", "decision"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) return apiError(c, "MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`, 400);
    if (typeof body.submissionId !== "string" || typeof body.reviewerId !== "string") return apiError(c, "INVALID_INPUT", "submissionId and reviewerId must be strings");
    if (body.decision !== "approve" && body.decision !== "reject") return apiError(c, "INVALID_DECISION", "decision must be 'approve' or 'reject'", 400);

    let aiVerdict = null;
    try { const existing = getSubmissionById(String(body.submissionId)); if (existing) { const verdict = await reviewOrchestrator.review({ submissionId: existing.id, campaignId: existing.campaignId, userId: existing.userId, platformId: (existing.metadata as Record<string, unknown>)?.platformId ? String((existing.metadata as Record<string, unknown>).platformId) : "unknown", actionId: existing.actionId, proofUrl: existing.proofUrl, proofType: existing.proofType as "url" | "screenshot" | "video", metadata: (existing.metadata as Record<string, unknown>) ?? {} }); aiVerdict = { decision: verdict.decision, confidence: verdict.confidence, scores: verdict.scores, explanation: verdict.explanation }; } } catch { /* non-blocking */ }

    let fraudScore = null;
    try { const sr = fraudPipeline.scoreAndDecide({ submissionId: String(body.submissionId), userId: String(body.reviewerId), campaignId: body.campaign?.id ? String(body.campaign.id) : "unknown", platformId: "unknown", proofUrl: "", proofType: "url", metadata: {} }, { userId: String(body.reviewerId), accountCreatedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), submissions: [] }); fraudScore = { score: sr.prediction.fraudScore, riskLevel: sr.prediction.riskLevel, decision: sr.decision, confidence: sr.prediction.confidence, modelVersion: sr.modelVersion }; } catch { /* non-blocking */ }

    const result = await reviewSubmission(String(body.submissionId), String(body.reviewerId), body.decision, body.note ? String(body.note) : undefined);
    if (!result.success) { const status = result.error!.code === "NOT_FOUND" ? 404 : result.error!.code === "ALREADY_REVIEWED" ? 409 : 400; return apiError(c, result.error!.code, result.error!.message, status); }

    const submission = result.data!;
    let awardedPerk = null;
    if (body.decision === "approve" && body.campaign) {
      const campaign = body.campaign as LaunchedCampaign;
      if (!campaign.businessId || typeof campaign.discountValue !== "number" || !campaign.discountType) return apiError(c, "INVALID_CAMPAIGN", "campaign must include businessId, discountValue, and discountType", 400);
      const followerCount = typeof body.followerCount === "number" && body.followerCount >= 0 ? body.followerCount : 0;
      const perkCalc = calculatePerkValue(submission, campaign, followerCount);
      const awardResult = awardPerk(submission.userId, campaign.businessId, submission.campaignId, submission.id, perkCalc.totalValue, perkCalc.baseType, campaign.expiresInDays ?? 30);
      if (awardResult.success) awardedPerk = { perk: awardResult.data, calculation: perkCalc };
    }

    const updated = getSubmissionById(submission.id);
    eventBus.publish({ type: body.decision === "approve" ? "submission.approved" : "submission.rejected", payload: { submissionId: submission.id, campaignId: submission.campaignId, userId: submission.userId, decision: body.decision, reviewerId: String(body.reviewerId) }, targetUserId: submission.userId, timestamp: new Date().toISOString() });

    const recipientEmail = (submission.metadata as Record<string, unknown>)?.email ? String((submission.metadata as Record<string, unknown>).email) : body.recipientEmail ? String(body.recipientEmail) : null;
    if (recipientEmail) {
      try { if (body.decision === "approve") { const t = submissionApprovedEmail(submission.userId, body.campaign?.name ?? submission.campaignId, awardedPerk ? `$${awardedPerk.calculation.totalValue}` : "a perk"); await emailProvider.send({ to: recipientEmail, subject: t.subject, html: t.html, text: t.text }); } else { const t = submissionRejectedEmail(submission.userId, body.campaign?.name ?? submission.campaignId, body.note ? String(body.note).slice(0, 500) : undefined); await emailProvider.send({ to: recipientEmail, subject: t.subject, html: t.html, text: t.text }); } } catch (emailErr) { logger.error("Failed to send review notification email", emailErr); }
    }

    return apiResponse(c, { submission: toApiSubmission(updated ?? submission), ...(awardedPerk ? { awardedPerk } : {}), ...(aiVerdict ? { aiReview: aiVerdict } : {}), ...(fraudScore ? { fraudScore } : {}) });
  } catch (err) {
    logger.error("Submission review failed", err);
    return apiError(c, "INVALID_BODY", "Request body must be valid JSON", 400);
  }
});

export default app;
