/**
 * Verification Module — Public API
 *
 * Orchestrates the full verification pipeline:
 * OAuth tokens → Rate limiting → Platform adapters → Job queue → Results
 *
 * This is the single entry point for all verification operations.
 */

export { checkProofUrl, detectPlatform, isValidHttpsUrl } from "./url-checker";
export type { UrlCheckResult } from "./url-checker";

export {
  analyzeScreenshotUrl,
  analyzeScreenshotBuffer,
  detectPlatformFromFilename,
  validateImageHeaders,
  extractImageMetadata,
  detectManipulation,
} from "./screenshot-analyzer";
export type { ScreenshotAnalysis, PlatformIndicator } from "./screenshot-analyzer";

export {
  getImageType,
  getPngDimensions,
  getJpegDimensions,
  getJpegExif,
  detectUniformBlocks,
  detectMultipleHeaders,
} from "./image-parser";
export type { ImageType, ExifData } from "./image-parser";

export { OAuthManager, oauthManager } from "./oauth-manager";
export type { OAuthConfig, OAuthToken, TokenExchangeRequest, TokenRefreshResult, TokenStore } from "./oauth-manager";

export { PlatformRateLimiter, rateLimiter } from "./rate-limiter";
export type { RateLimitConfig, RateLimitState, RateLimitDecision } from "./rate-limiter";

export { VerificationJobQueue } from "./job-queue";
export type { VerificationJob, JobStatus, QueueConfig, QueueStats } from "./job-queue";

export { PlatformAdapterRegistry, InstagramAdapter, TikTokAdapter, YouTubeAdapter, XAdapter, GoogleReviewAdapter } from "./platform-adapters";
export type { PlatformAdapter, ContentData, ContentMetrics, VerificationCheck, VerificationRequest } from "./platform-adapters";

import { oauthManager } from "./oauth-manager";
import { rateLimiter } from "./rate-limiter";
import { VerificationJobQueue } from "./job-queue";
import { PlatformAdapterRegistry } from "./platform-adapters";

// ─── Wired-Up Singleton ─────────────────────────────────────────────────────

const adapterRegistry = new PlatformAdapterRegistry(oauthManager, rateLimiter);
const jobQueue = new VerificationJobQueue(rateLimiter);

// Wire the job queue to use platform adapters for verification
jobQueue.setHandler(async (submission) => {
  const adapter = adapterRegistry.get(submission.platformId);
  if (!adapter) {
    throw new Error(`No adapter for platform: ${submission.platformId}`);
  }
  if (!adapter.isAvailable()) {
    throw new Error(`Platform adapter not available: ${submission.platformId}`);
  }

  const check = await adapter.verify(
    {
      proofUrl: submission.proofUrl,
      requiredHashtags: (submission.metadata?.requiredHashtags as string[]) ?? undefined,
      requiredMentions: (submission.metadata?.requiredMentions as string[]) ?? undefined,
      postedAfter: submission.metadata?.postedAfter as string | undefined,
      expectedAuthorId: submission.metadata?.expectedAuthorId as string | undefined,
    },
    submission.metadata?.userId as string ?? "system"
  );

  return {
    submissionId: submission.submissionId,
    actionId: submission.actionId,
    platformId: submission.platformId,
    status: check.confidence >= 0.75 ? "verified" : check.confidence >= 0.4 ? "manual_review" : "failed",
    confidence: check.confidence,
    method: "api" as const,
    details: check.details,
    verifiedAt: new Date().toISOString(),
    durationMs: 0, // Filled by the queue
  };
});

export { adapterRegistry, jobQueue };
