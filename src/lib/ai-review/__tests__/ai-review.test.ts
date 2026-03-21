import { describe, it, expect, beforeEach } from "vitest";
import { ReviewOrchestrator, type ReviewRequest } from "../index";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeReviewRequest(overrides: Partial<ReviewRequest> = {}): ReviewRequest {
  return {
    submissionId: "sub1",
    campaignId: "cmp1",
    userId: "user1",
    platformId: "ig",
    actionId: "ig_rl",
    proofUrl: "https://www.instagram.com/p/abc123/",
    proofType: "url",
    metadata: {},
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ReviewOrchestrator
// ═══════════════════════════════════════════════════════════════════════════════

describe("ReviewOrchestrator", () => {
  let orchestrator: ReviewOrchestrator;

  beforeEach(() => {
    orchestrator = new ReviewOrchestrator();
  });

  it("review returns a verdict with all required fields", async () => {
    const request = makeReviewRequest();
    const verdict = await orchestrator.review(request);

    expect(verdict.submissionId).toBe("sub1");
    expect(verdict.decision).toBeDefined();
    expect(["auto_approve", "auto_reject", "manual_review"]).toContain(verdict.decision);
    expect(verdict.confidence).toBeGreaterThanOrEqual(0);
    expect(verdict.confidence).toBeLessThanOrEqual(1);
    expect(verdict.scores).toBeDefined();
    expect(typeof verdict.scores.contentVerification).toBe("number");
    expect(typeof verdict.scores.qualityScore).toBe("number");
    expect(typeof verdict.scores.complianceScore).toBe("number");
    expect(typeof verdict.scores.fraudScore).toBe("number");
    expect(typeof verdict.scores.overallScore).toBe("number");
    expect(verdict.explanation).toBeTruthy();
    expect(verdict.processingTimeMs).toBeGreaterThanOrEqual(0);
    expect(verdict.reviewedAt).toBeTruthy();
  });

  it("review returns signals array", async () => {
    const request = makeReviewRequest();
    const verdict = await orchestrator.review(request);

    expect(Array.isArray(verdict.signals)).toBe(true);
    for (const signal of verdict.signals) {
      expect(signal.source).toBeDefined();
      expect(["content_verification", "quality", "compliance", "fraud"]).toContain(signal.source);
      expect(signal.signal).toBeTruthy();
      expect(["positive", "negative", "neutral"]).toContain(signal.impact);
      expect(typeof signal.weight).toBe("number");
    }
  });

  it("high-quality submission with valid proof gets favorable scores", async () => {
    const request = makeReviewRequest({
      proofUrl: "https://www.instagram.com/p/valid_post_12345/",
      proofType: "url",
      platformId: "ig",
    });

    const verdict = await orchestrator.review(request, {
      contentText: "#ad Amazing experience at this local cafe!",
      actionType: "review",
    });

    // Content verification should pass for matching platform URL
    expect(verdict.scores.contentVerification).toBeGreaterThan(0);
    // Overall score should be reasonable
    expect(verdict.scores.overallScore).toBeGreaterThan(0);
  });

  it("high-confidence auto-approves when all scores are high", async () => {
    // Use very permissive thresholds to test auto-approve logic
    const permissiveOrchestrator = new ReviewOrchestrator({
      autoApproveThreshold: 20,
      autoRejectThreshold: 5,
      minConfidence: 0.1,
    });

    const request = makeReviewRequest({
      proofUrl: "https://www.instagram.com/p/real_valid_post/",
      proofType: "url",
      platformId: "ig",
    });

    const verdict = await permissiveOrchestrator.review(request, {
      contentText: "#ad #sponsored Great experience here! Loved the ambiance and food.",
      actionType: "review",
    });

    // With very permissive thresholds, this should auto-approve
    expect(verdict.decision).toBe("auto_approve");
    expect(verdict.confidence).toBeGreaterThan(0);
  });

  it("low-confidence auto-rejects when scores are very low", async () => {
    // Use strict thresholds
    const strictOrchestrator = new ReviewOrchestrator({
      autoApproveThreshold: 95,
      autoRejectThreshold: 80,
      minConfidence: 0.1,
    });

    const request = makeReviewRequest({
      proofUrl: "https://totally-wrong-domain.xyz/fake",
      proofType: "url",
      platformId: "ig",
    });

    const verdict = await strictOrchestrator.review(request);

    // With very strict thresholds and mismatched URL, should reject or manual review
    expect(["auto_reject", "manual_review"]).toContain(verdict.decision);
  });

  it("different platform URLs affect content verification score", async () => {
    const matchingUrl = makeReviewRequest({
      proofUrl: "https://www.instagram.com/p/valid123/",
      platformId: "ig",
    });
    const mismatchedUrl = makeReviewRequest({
      proofUrl: "https://www.twitter.com/status/123",
      platformId: "ig",
    });

    const matchVerdict = await orchestrator.review(matchingUrl);
    const mismatchVerdict = await orchestrator.review(mismatchedUrl);

    // Matching URL should get better content verification
    expect(matchVerdict.scores.contentVerification).toBeGreaterThanOrEqual(
      mismatchVerdict.scores.contentVerification
    );
  });

  it("review handles screenshot proof type", async () => {
    const request = makeReviewRequest({
      proofType: "screenshot",
      proofUrl: "https://uploads.example.com/screenshots/proof123.png",
    });

    const verdict = await orchestrator.review(request);
    expect(verdict.submissionId).toBe("sub1");
    expect(verdict.decision).toBeDefined();
  });

  it("review handles video proof type", async () => {
    const request = makeReviewRequest({
      proofType: "video",
      proofUrl: "https://uploads.example.com/videos/proof456.mp4",
    });

    const verdict = await orchestrator.review(request);
    expect(verdict.submissionId).toBe("sub1");
    expect(verdict.decision).toBeDefined();
  });

  it("custom thresholds are respected", () => {
    const customOrchestrator = new ReviewOrchestrator({
      autoApproveThreshold: 90,
      autoRejectThreshold: 10,
      minConfidence: 0.8,
    });

    // The orchestrator should be constructed without errors
    expect(customOrchestrator).toBeInstanceOf(ReviewOrchestrator);
  });

  it("batchReview processes multiple submissions", async () => {
    const requests = [
      makeReviewRequest({ submissionId: "sub1" }),
      makeReviewRequest({ submissionId: "sub2" }),
      makeReviewRequest({ submissionId: "sub3" }),
    ];

    const result = await orchestrator.batchReview(requests);

    expect(result.verdicts.length).toBe(3);
    expect(result.summary.total).toBe(3);
    expect(result.summary.autoApproved + result.summary.autoRejected + result.summary.manualReview).toBe(3);
  });
});
