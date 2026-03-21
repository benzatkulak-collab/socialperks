// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Autonomous Submission Review Pipeline
//
// The invisible AI engine that auto-reviews submissions through a chain of
// checks: content verification, quality scoring, FTC compliance, fraud
// signal aggregation, and a decision engine that produces a final verdict.
//
// Designed to handle most submissions automatically while routing
// edge cases to human reviewers.
// ══════════════════════════════════════════════════════════════════════════════

import {
  contentScanner,
  jurisdictionEngine,
  auditTrail,
  type ContentScanResult,
} from "@/lib/compliance/index";
import {
  checkSubmission as checkFraud,
  getUserRiskProfile,
  type SubmissionInput,
  type UserHistory,
  type CampaignData,
  type FraudCheck,
} from "@/lib/fraud-detection";
import { isActionIncentivizable } from "@/lib/legal-compliance";

// ─── Review Pipeline Types ──────────────────────────────────────────────────

export interface ReviewRequest {
  submissionId: string;
  campaignId: string;
  userId: string;
  platformId: string;
  actionId: string;
  proofUrl: string;
  proofType: "url" | "screenshot" | "video";
  metadata: Record<string, unknown>;
}

export interface ReviewVerdict {
  submissionId: string;
  decision: "auto_approve" | "auto_reject" | "manual_review";
  confidence: number; // 0-1
  scores: {
    contentVerification: number;
    qualityScore: number;
    complianceScore: number;
    fraudScore: number;
    overallScore: number;
  };
  signals: ReviewSignal[];
  explanation: string;
  processingTimeMs: number;
  reviewedAt: string;
}

export interface ReviewSignal {
  source: "content_verification" | "quality" | "compliance" | "fraud";
  signal: string;
  impact: "positive" | "negative" | "neutral";
  weight: number;
  details: string;
}

export interface ReviewThresholds {
  /** Minimum overall score to auto-approve (0-100). Default 75. */
  autoApproveThreshold: number;
  /** Maximum overall score for auto-reject (0-100). Default 25. */
  autoRejectThreshold: number;
  /** Minimum confidence to act on a decision (0-1). Default 0.6. */
  minConfidence: number;
  /** Weight for each scoring dimension (must sum to ~1.0). */
  weights: {
    contentVerification: number;
    quality: number;
    compliance: number;
    fraud: number;
  };
}

// ─── Default Thresholds ─────────────────────────────────────────────────────

const DEFAULT_THRESHOLDS: ReviewThresholds = {
  autoApproveThreshold: 75,
  autoRejectThreshold: 25,
  minConfidence: 0.6,
  weights: {
    contentVerification: 0.30,
    quality: 0.20,
    compliance: 0.25,
    fraud: 0.25,
  },
};

// ─── URL Pattern Matchers (platform proof validation) ───────────────────────

const PLATFORM_URL_PATTERNS: Record<string, RegExp[]> = {
  ig: [/instagram\.com/i, /instagr\.am/i],
  tt: [/tiktok\.com/i, /vm\.tiktok/i],
  yt: [/youtube\.com/i, /youtu\.be/i],
  fb: [/facebook\.com/i, /fb\.com/i, /fb\.watch/i],
  xw: [/twitter\.com/i, /x\.com/i, /t\.co/i],
  go: [/google\.com\/maps/i, /goo\.gl/i, /g\.co/i, /maps\.app\.goo/i],
  yp: [/yelp\.com/i, /yelp\./i],
  li: [/linkedin\.com/i],
  pi: [/pinterest\.com/i, /pin\.it/i],
  nd: [/nextdoor\.com/i],
  th: [/threads\.net/i],
  sc: [/snapchat\.com/i, /snap\.com/i],
  ta: [/tripadvisor\.com/i],
  rd: [/reddit\.com/i, /redd\.it/i],
  rf: [], // Referral — no URL pattern requirement
};

// ─── Quality Scoring Criteria ───────────────────────────────────────────────

const MIN_TEXT_LENGTH_QUALITY: Record<string, number> = {
  review: 50,
  content: 30,
  engage: 0,
  share: 0,
  referral: 0,
};

const QUALITY_URL_LENGTH_MIN = 15;
const QUALITY_URL_LENGTH_MAX = 2048;

// ═══════════════════════════════════════════════════════════════════════════════
// Review Orchestrator
// ═══════════════════════════════════════════════════════════════════════════════

export class ReviewOrchestrator {
  private thresholds: ReviewThresholds;

  constructor(thresholds?: Partial<ReviewThresholds>) {
    this.thresholds = { ...DEFAULT_THRESHOLDS, ...thresholds };
    if (thresholds?.weights) {
      this.thresholds.weights = { ...DEFAULT_THRESHOLDS.weights, ...thresholds.weights };
    }
  }

  /**
   * Run the full review pipeline on a single submission.
   * Chains: content verification -> quality -> compliance -> fraud -> decision.
   */
  async review(
    request: ReviewRequest,
    context?: {
      userHistory?: UserHistory;
      campaignData?: CampaignData;
      contentText?: string;
      actionType?: string;
      jurisdiction?: string;
    }
  ): Promise<ReviewVerdict> {
    const startTime = Date.now();
    const signals: ReviewSignal[] = [];

    // ── Step 0: Legal Compliance Pre-Check ────────────────────────────────
    // If the action is non-incentivizable, flag with a compliance warning and never auto-approve.
    if (!isActionIncentivizable(request.actionId)) {
      signals.push({
        source: "compliance",
        signal: "non_incentivizable_action",
        impact: "negative",
        weight: 1.0,
        details: `Action "${request.actionId}" is a non-incentivizable action (e.g., Google/Yelp/TripAdvisor review). This submission should not be approved for incentivized rewards. Platform terms of service prohibit incentivized reviews.`,
      });

      const processingTimeMs = Date.now() - startTime;
      return {
        submissionId: request.submissionId,
        decision: "manual_review",
        confidence: 0.95,
        scores: {
          contentVerification: 0,
          qualityScore: 0,
          complianceScore: 0,
          fraudScore: 0,
          overallScore: 0,
        },
        signals,
        explanation: `Submission is for a non-incentivizable action ("${request.actionId}"). Platform terms of service prohibit rewarding this type of action. Routed to manual review — do NOT approve for incentivized rewards.`,
        processingTimeMs,
        reviewedAt: new Date().toISOString(),
      };
    }

    // ── Step 1: Content Verification ──────────────────────────────────────
    const contentVerificationScore = this.runContentVerification(request, signals);

    // ── Step 2: Quality Scoring ───────────────────────────────────────────
    const qualityScore = this.runQualityScoring(
      request,
      signals,
      context?.contentText,
      context?.actionType
    );

    // ── Step 3: FTC Compliance Check ──────────────────────────────────────
    const complianceScore = this.runComplianceCheck(
      request,
      signals,
      context?.contentText,
      context?.jurisdiction
    );

    // ── Step 4: Fraud Signal Aggregation ──────────────────────────────────
    const fraudScore = this.runFraudCheck(
      request,
      signals,
      context?.userHistory,
      context?.campaignData
    );

    // ── Step 5: Decision Engine ───────────────────────────────────────────
    const { decision, confidence, overallScore, explanation } = this.makeDecision(
      contentVerificationScore,
      qualityScore,
      complianceScore,
      fraudScore,
      signals
    );

    const processingTimeMs = Date.now() - startTime;

    const verdict: ReviewVerdict = {
      submissionId: request.submissionId,
      decision,
      confidence,
      scores: {
        contentVerification: contentVerificationScore,
        qualityScore,
        complianceScore,
        fraudScore,
        overallScore,
      },
      signals,
      explanation,
      processingTimeMs,
      reviewedAt: new Date().toISOString(),
    };

    // Record in audit trail
    auditTrail.record({
      entityType: "submission",
      entityId: request.submissionId,
      businessId: (context?.campaignData?.businessId) ?? "unknown",
      jurisdiction: context?.jurisdiction ?? "US_FTC",
      checkType: "full_review",
      result: {
        hasDisclosure: signals.some(
          (s) => s.source === "compliance" && s.signal === "disclosure_present"
        ),
        disclosureType: null,
        disclosurePosition: "none",
        language: "en",
        sentiment: "neutral",
        misleadingClaims: [],
        prohibitedContent: [],
        complianceScore,
        issues: signals
          .filter((s) => s.impact === "negative")
          .map((s) => ({
            type: "missing_disclosure" as const,
            severity: s.weight > 0.7 ? ("critical" as const) : ("warning" as const),
            description: s.details,
            suggestion: "",
          })),
      } satisfies ContentScanResult,
      complianceScore: overallScore,
      passed: decision === "auto_approve",
      reviewedBy: "system",
      metadata: {
        decision,
        confidence,
        processingTimeMs,
        scores: verdict.scores,
      },
    });

    return verdict;
  }

  /**
   * Review multiple submissions in a batch.
   * Processes sequentially to avoid resource contention; returns all verdicts.
   */
  async batchReview(
    requests: ReviewRequest[],
    contextMap?: Map<
      string,
      {
        userHistory?: UserHistory;
        campaignData?: CampaignData;
        contentText?: string;
        actionType?: string;
        jurisdiction?: string;
      }
    >
  ): Promise<{
    verdicts: ReviewVerdict[];
    summary: {
      total: number;
      autoApproved: number;
      autoRejected: number;
      manualReview: number;
      averageConfidence: number;
      totalProcessingTimeMs: number;
    };
  }> {
    const startTime = Date.now();
    const verdicts: ReviewVerdict[] = [];

    for (const request of requests) {
      const context = contextMap?.get(request.submissionId);
      const verdict = await this.review(request, context);
      verdicts.push(verdict);
    }

    const totalProcessingTimeMs = Date.now() - startTime;

    const summary = {
      total: verdicts.length,
      autoApproved: verdicts.filter((v) => v.decision === "auto_approve").length,
      autoRejected: verdicts.filter((v) => v.decision === "auto_reject").length,
      manualReview: verdicts.filter((v) => v.decision === "manual_review").length,
      averageConfidence:
        verdicts.length > 0
          ? Math.round(
              (verdicts.reduce((sum, v) => sum + v.confidence, 0) / verdicts.length) * 100
            ) / 100
          : 0,
      totalProcessingTimeMs,
    };

    return { verdicts, summary };
  }

  /**
   * Update the decision thresholds at runtime.
   */
  updateThresholds(thresholds: Partial<ReviewThresholds>): void {
    if (thresholds.autoApproveThreshold !== undefined) {
      this.thresholds.autoApproveThreshold = thresholds.autoApproveThreshold;
    }
    if (thresholds.autoRejectThreshold !== undefined) {
      this.thresholds.autoRejectThreshold = thresholds.autoRejectThreshold;
    }
    if (thresholds.minConfidence !== undefined) {
      this.thresholds.minConfidence = thresholds.minConfidence;
    }
    if (thresholds.weights) {
      this.thresholds.weights = { ...this.thresholds.weights, ...thresholds.weights };
    }
  }

  /**
   * Get current thresholds (for introspection / API).
   */
  getThresholds(): ReviewThresholds {
    return { ...this.thresholds };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Pipeline Steps
  // ═════════════════════════════════════════════════════════════════════════

  // ── Step 1: Content Verification ────────────────────────────────────────

  private runContentVerification(
    request: ReviewRequest,
    signals: ReviewSignal[]
  ): number {
    let score = 50; // Neutral start

    // 1a. Validate that proof URL is well-formed
    const url = request.proofUrl.trim();
    const isValidUrl = /^https?:\/\/.+/i.test(url);

    if (!isValidUrl) {
      signals.push({
        source: "content_verification",
        signal: "invalid_proof_url",
        impact: "negative",
        weight: 0.9,
        details: `Proof URL is not a valid HTTP(S) URL: "${url.slice(0, 100)}"`,
      });
      return 10; // Very low score for invalid URL
    }

    score += 15; // Valid URL bonus
    signals.push({
      source: "content_verification",
      signal: "valid_url",
      impact: "positive",
      weight: 0.3,
      details: "Proof URL is a valid HTTP(S) URL.",
    });

    // 1b. Check if URL matches the expected platform
    const platformPatterns = PLATFORM_URL_PATTERNS[request.platformId];
    if (platformPatterns && platformPatterns.length > 0) {
      const matchesPlatform = platformPatterns.some((pattern) => pattern.test(url));

      if (matchesPlatform) {
        score += 25;
        signals.push({
          source: "content_verification",
          signal: "platform_url_match",
          impact: "positive",
          weight: 0.7,
          details: `URL matches expected platform (${request.platformId}).`,
        });
      } else {
        score -= 20;
        signals.push({
          source: "content_verification",
          signal: "platform_url_mismatch",
          impact: "negative",
          weight: 0.6,
          details: `URL does not appear to belong to platform "${request.platformId}". Expected patterns: ${platformPatterns.map((p) => p.source).join(", ")}`,
        });
      }
    } else {
      // Platform has no URL patterns (e.g., referral) — neutral
      signals.push({
        source: "content_verification",
        signal: "no_platform_patterns",
        impact: "neutral",
        weight: 0.1,
        details: `Platform "${request.platformId}" has no URL pattern requirements.`,
      });
      score += 10;
    }

    // 1c. Check proof type appropriateness
    if (request.proofType === "url" && isValidUrl) {
      score += 5;
    } else if (request.proofType === "screenshot") {
      // Screenshots are acceptable but slightly less verifiable
      score += 3;
      signals.push({
        source: "content_verification",
        signal: "screenshot_proof",
        impact: "neutral",
        weight: 0.2,
        details: "Proof is a screenshot — less directly verifiable than a URL.",
      });
    } else if (request.proofType === "video") {
      score += 5;
      signals.push({
        source: "content_verification",
        signal: "video_proof",
        impact: "positive",
        weight: 0.3,
        details: "Video proof submitted — high verification value.",
      });
    }

    return Math.max(0, Math.min(100, score));
  }

  // ── Step 2: Quality Scoring ─────────────────────────────────────────────

  private runQualityScoring(
    request: ReviewRequest,
    signals: ReviewSignal[],
    contentText?: string,
    actionType?: string
  ): number {
    let score = 60; // Reasonable baseline

    // 2a. URL quality
    const urlLength = request.proofUrl.trim().length;
    if (urlLength < QUALITY_URL_LENGTH_MIN) {
      score -= 15;
      signals.push({
        source: "quality",
        signal: "short_proof_url",
        impact: "negative",
        weight: 0.4,
        details: `Proof URL is suspiciously short (${urlLength} characters).`,
      });
    } else if (urlLength > QUALITY_URL_LENGTH_MAX) {
      score -= 5;
      signals.push({
        source: "quality",
        signal: "long_proof_url",
        impact: "negative",
        weight: 0.2,
        details: "Proof URL exceeds maximum recommended length.",
      });
    }

    // 2b. Content text quality (if provided)
    if (contentText) {
      const trimmedContent = contentText.trim();
      const minLength = MIN_TEXT_LENGTH_QUALITY[actionType ?? "content"] ?? 20;

      if (trimmedContent.length >= minLength) {
        score += 10;
        signals.push({
          source: "quality",
          signal: "sufficient_content_length",
          impact: "positive",
          weight: 0.4,
          details: `Content length (${trimmedContent.length} chars) meets minimum for action type "${actionType ?? "content"}".`,
        });
      } else if (minLength > 0) {
        score -= 15;
        signals.push({
          source: "quality",
          signal: "insufficient_content_length",
          impact: "negative",
          weight: 0.5,
          details: `Content length (${trimmedContent.length} chars) is below minimum ${minLength} for action type "${actionType ?? "content"}".`,
        });
      }

      // Check for low-effort content (very short or all caps)
      if (trimmedContent.length > 0 && trimmedContent.length < 10) {
        score -= 10;
        signals.push({
          source: "quality",
          signal: "very_short_content",
          impact: "negative",
          weight: 0.3,
          details: "Content is very short, suggesting low effort.",
        });
      }

      if (trimmedContent === trimmedContent.toUpperCase() && trimmedContent.length > 20) {
        score -= 5;
        signals.push({
          source: "quality",
          signal: "all_caps_content",
          impact: "negative",
          weight: 0.2,
          details: "Content is all uppercase, which may indicate low quality or spam.",
        });
      }

      // Bonus for longer, detailed content
      if (trimmedContent.length > 200) {
        score += 10;
        signals.push({
          source: "quality",
          signal: "detailed_content",
          impact: "positive",
          weight: 0.3,
          details: `Detailed content (${trimmedContent.length} chars) — suggests genuine effort.`,
        });
      }
    }

    // 2c. Metadata quality signals
    const metadata = request.metadata;
    if (metadata) {
      // Image resolution check (if provided)
      const imageWidth = metadata.imageWidth as number | undefined;
      const imageHeight = metadata.imageHeight as number | undefined;
      if (imageWidth && imageHeight) {
        if (imageWidth >= 600 && imageHeight >= 600) {
          score += 5;
          signals.push({
            source: "quality",
            signal: "good_image_resolution",
            impact: "positive",
            weight: 0.2,
            details: `Image resolution ${imageWidth}x${imageHeight}px meets quality standards.`,
          });
        } else if (imageWidth < 300 || imageHeight < 300) {
          score -= 10;
          signals.push({
            source: "quality",
            signal: "low_image_resolution",
            impact: "negative",
            weight: 0.4,
            details: `Image resolution ${imageWidth}x${imageHeight}px is below minimum quality standard (300x300).`,
          });
        }
      }

      // Engagement metrics (if provided — higher engagement = higher quality signal)
      const engagementRate = metadata.engagementRate as number | undefined;
      if (engagementRate !== undefined) {
        if (engagementRate > 0.05) {
          score += 5;
          signals.push({
            source: "quality",
            signal: "high_engagement",
            impact: "positive",
            weight: 0.3,
            details: `High engagement rate (${(engagementRate * 100).toFixed(1)}%) on proof content.`,
          });
        }
      }
    }

    return Math.max(0, Math.min(100, score));
  }

  // ── Step 3: FTC Compliance Check ────────────────────────────────────────

  private runComplianceCheck(
    request: ReviewRequest,
    signals: ReviewSignal[],
    contentText?: string,
    jurisdiction?: string
  ): number {
    // If no content text, we can only give a neutral score
    if (!contentText || contentText.trim().length === 0) {
      signals.push({
        source: "compliance",
        signal: "no_content_for_compliance",
        impact: "neutral",
        weight: 0.2,
        details: "No text content provided — compliance check limited to URL-based analysis.",
      });
      return 60; // Neutral — we can't verify without content
    }

    // Run content scanner
    const scanResult: ContentScanResult = contentScanner.scan(contentText, {
      platform: request.platformId,
      jurisdiction: jurisdiction ?? "US_FTC",
    });

    // Convert scan result into signals
    if (scanResult.hasDisclosure) {
      signals.push({
        source: "compliance",
        signal: "disclosure_present",
        impact: "positive",
        weight: 0.8,
        details: `Disclosure found: "${scanResult.disclosureType}" at position: ${scanResult.disclosurePosition}.`,
      });

      if (scanResult.disclosurePosition === "beginning") {
        signals.push({
          source: "compliance",
          signal: "disclosure_well_placed",
          impact: "positive",
          weight: 0.3,
          details: "Disclosure is at the beginning of content — ideal placement per FTC.",
        });
      }
    } else {
      signals.push({
        source: "compliance",
        signal: "no_disclosure",
        impact: "negative",
        weight: 0.9,
        details: "No FTC-required disclosure found in content text.",
      });
    }

    for (const claim of scanResult.misleadingClaims) {
      signals.push({
        source: "compliance",
        signal: "misleading_claim",
        impact: "negative",
        weight: 0.5,
        details: `Misleading claim: ${claim}`,
      });
    }

    for (const prohibited of scanResult.prohibitedContent) {
      signals.push({
        source: "compliance",
        signal: "prohibited_content",
        impact: "negative",
        weight: 0.8,
        details: `Prohibited content: ${prohibited}`,
      });
    }

    // Also run jurisdiction check if specified
    if (jurisdiction) {
      const platformName = this.platformIdToName(request.platformId);
      const jurisdictionResult = jurisdictionEngine.checkCompliance(
        contentText,
        jurisdiction,
        platformName
      );

      for (const issue of jurisdictionResult.issues) {
        if (issue.severity === "critical") {
          signals.push({
            source: "compliance",
            signal: `jurisdiction_violation_${jurisdiction.toLowerCase()}`,
            impact: "negative",
            weight: 0.7,
            details: `${jurisdiction}: ${issue.description}`,
          });
        }
      }
    }

    return scanResult.complianceScore;
  }

  // ── Step 4: Fraud Signal Aggregation ────────────────────────────────────

  private runFraudCheck(
    request: ReviewRequest,
    signals: ReviewSignal[],
    userHistory?: UserHistory,
    campaignData?: CampaignData
  ): number {
    // If we don't have user history or campaign data, we can only do basic checks
    if (!userHistory || !campaignData) {
      signals.push({
        source: "fraud",
        signal: "limited_fraud_context",
        impact: "neutral",
        weight: 0.1,
        details: "Limited context for fraud analysis — user history or campaign data not provided.",
      });
      return 70; // Lean toward trusting without evidence of fraud
    }

    // Build submission input for the fraud engine
    const submissionInput: SubmissionInput = {
      id: request.submissionId,
      userId: request.userId,
      campaignId: request.campaignId,
      businessId: campaignData.businessId,
      proofUrl: request.proofUrl,
      proofType: request.proofType,
      content: (request.metadata.contentText as string) ?? undefined,
      submittedAt: new Date().toISOString(),
      platformId: request.platformId,
      imageSize: request.metadata.imageWidth
        ? {
            width: request.metadata.imageWidth as number,
            height: (request.metadata.imageHeight as number) ?? 0,
          }
        : undefined,
      contentLength: request.metadata.contentLength as number | undefined,
    };

    const fraudResult: FraudCheck = checkFraud(submissionInput, userHistory, campaignData);

    // Convert fraud score: fraud engine gives 0-100 (higher = more suspicious)
    // We want 0-100 (higher = less suspicious / safer)
    const safetyScore = 100 - fraudResult.score;

    // Add signals from fraud check
    if (fraudResult.signals.length === 0) {
      signals.push({
        source: "fraud",
        signal: "no_fraud_signals",
        impact: "positive",
        weight: 0.5,
        details: "No fraud signals detected.",
      });
    }

    for (let i = 0; i < fraudResult.signals.length; i++) {
      const fraudSignal = fraudResult.signals[i];
      const detail = fraudResult.details[i] ?? fraudSignal;
      signals.push({
        source: "fraud",
        signal: `fraud_${fraudSignal}`,
        impact: "negative",
        weight: this.getFraudSignalWeight(fraudSignal),
        details: detail,
      });
    }

    // Also factor in user risk profile
    const riskProfile = getUserRiskProfile(
      request.userId,
      userHistory.submissions,
      userHistory.accountCreatedAt
    );

    if (riskProfile.riskLevel === "low") {
      signals.push({
        source: "fraud",
        signal: "trusted_user",
        impact: "positive",
        weight: 0.4,
        details: `User has a "low" risk profile (trust score: ${riskProfile.trustScore}).`,
      });
    } else if (riskProfile.riskLevel === "high" || riskProfile.riskLevel === "critical") {
      signals.push({
        source: "fraud",
        signal: "high_risk_user",
        impact: "negative",
        weight: 0.7,
        details: `User has a "${riskProfile.riskLevel}" risk profile (trust score: ${riskProfile.trustScore}).`,
      });
    }

    return Math.max(0, Math.min(100, safetyScore));
  }

  // ── Step 5: Decision Engine ─────────────────────────────────────────────

  private makeDecision(
    contentVerificationScore: number,
    qualityScore: number,
    complianceScore: number,
    fraudScore: number,
    signals: ReviewSignal[]
  ): {
    decision: "auto_approve" | "auto_reject" | "manual_review";
    confidence: number;
    overallScore: number;
    explanation: string;
  } {
    const w = this.thresholds.weights;

    // Weighted overall score
    const overallScore = Math.round(
      contentVerificationScore * w.contentVerification +
        qualityScore * w.quality +
        complianceScore * w.compliance +
        fraudScore * w.fraud
    );

    // Calculate confidence based on signal agreement
    const confidence = this.calculateConfidence(signals, overallScore);

    // Decision logic
    let decision: "auto_approve" | "auto_reject" | "manual_review";
    let explanation: string;

    // Hard rejection rules (regardless of overall score)
    const criticalNegativeSignals = signals.filter(
      (s) => s.impact === "negative" && s.weight >= 0.8
    );
    if (criticalNegativeSignals.length >= 2) {
      decision = "auto_reject";
      explanation = `Rejected due to ${criticalNegativeSignals.length} critical negative signals: ${criticalNegativeSignals.map((s) => s.signal).join(", ")}.`;
      return { decision, confidence: Math.max(confidence, 0.7), overallScore, explanation };
    }

    // Score-based decision
    if (
      overallScore >= this.thresholds.autoApproveThreshold &&
      confidence >= this.thresholds.minConfidence
    ) {
      decision = "auto_approve";
      explanation = this.buildApprovalExplanation(overallScore, confidence, signals);
    } else if (
      overallScore <= this.thresholds.autoRejectThreshold &&
      confidence >= this.thresholds.minConfidence
    ) {
      decision = "auto_reject";
      explanation = this.buildRejectionExplanation(overallScore, confidence, signals);
    } else {
      decision = "manual_review";
      explanation = this.buildManualReviewExplanation(
        overallScore,
        confidence,
        signals,
        contentVerificationScore,
        qualityScore,
        complianceScore,
        fraudScore
      );
    }

    return { decision, confidence, overallScore, explanation };
  }

  // ═════════════════════════════════════════════════════════════════════════
  // Helpers
  // ═════════════════════════════════════════════════════════════════════════

  private calculateConfidence(signals: ReviewSignal[], overallScore: number): number {
    if (signals.length === 0) return 0.3; // Low confidence with no signals

    // Count agreement: signals that point in the same direction
    const positiveSignals = signals.filter((s) => s.impact === "positive");
    const negativeSignals = signals.filter((s) => s.impact === "negative");
    const totalWeightedSignals =
      positiveSignals.reduce((s, sig) => s + sig.weight, 0) +
      negativeSignals.reduce((s, sig) => s + sig.weight, 0);

    if (totalWeightedSignals === 0) return 0.4;

    // Dominance: how much do positive or negative signals dominate?
    const positiveWeight = positiveSignals.reduce((s, sig) => s + sig.weight, 0);
    const negativeWeight = negativeSignals.reduce((s, sig) => s + sig.weight, 0);
    const dominance = Math.abs(positiveWeight - negativeWeight) / totalWeightedSignals;

    // Score extremity: more extreme scores (very high or very low) = higher confidence
    const extremity = Math.abs(overallScore - 50) / 50;

    // Signal volume: more signals = higher confidence (up to a point)
    const volumeFactor = Math.min(1, signals.length / 10);

    // Weighted combination
    const confidence = dominance * 0.4 + extremity * 0.35 + volumeFactor * 0.25;

    return Math.round(Math.max(0.1, Math.min(0.99, confidence)) * 100) / 100;
  }

  private getFraudSignalWeight(signal: string): number {
    const weights: Record<string, number> = {
      duplicate_submission: 0.9,
      self_review: 0.95,
      rapid_fire: 0.6,
      suspicious_pattern: 0.7,
      low_quality_proof: 0.4,
      engagement_manipulation: 0.8,
      copy_paste_content: 0.7,
      account_age: 0.5,
    };
    return weights[signal] ?? 0.5;
  }

  private platformIdToName(platformId: string): string {
    const map: Record<string, string> = {
      ig: "instagram",
      tt: "tiktok",
      yt: "youtube",
      fb: "facebook",
      xw: "twitter",
      go: "google",
      yp: "yelp",
      li: "linkedin",
      pi: "pinterest",
      nd: "nextdoor",
      th: "threads",
      sc: "snapchat",
      ta: "tripadvisor",
      rd: "reddit",
      rf: "referral",
    };
    return map[platformId] ?? platformId;
  }

  private buildApprovalExplanation(
    overallScore: number,
    confidence: number,
    signals: ReviewSignal[]
  ): string {
    const positiveCount = signals.filter((s) => s.impact === "positive").length;
    const negativeCount = signals.filter((s) => s.impact === "negative").length;
    const parts: string[] = [
      `Auto-approved with overall score ${overallScore}/100 (confidence: ${(confidence * 100).toFixed(0)}%).`,
    ];

    if (positiveCount > 0) {
      parts.push(`${positiveCount} positive signal${positiveCount > 1 ? "s" : ""} detected.`);
    }
    if (negativeCount > 0) {
      parts.push(
        `${negativeCount} minor concern${negativeCount > 1 ? "s" : ""} noted but below threshold.`
      );
    }

    return parts.join(" ");
  }

  private buildRejectionExplanation(
    overallScore: number,
    confidence: number,
    signals: ReviewSignal[]
  ): string {
    const negativeSignals = signals
      .filter((s) => s.impact === "negative")
      .sort((a, b) => b.weight - a.weight);

    const topReasons = negativeSignals
      .slice(0, 3)
      .map((s) => s.details)
      .join("; ");

    return `Auto-rejected with overall score ${overallScore}/100 (confidence: ${(confidence * 100).toFixed(0)}%). Primary reasons: ${topReasons}`;
  }

  private buildManualReviewExplanation(
    overallScore: number,
    confidence: number,
    signals: ReviewSignal[],
    contentScore: number,
    qualityScore: number,
    complianceScore: number,
    fraudScore: number
  ): string {
    const parts: string[] = [
      `Routed to manual review — overall score ${overallScore}/100 (confidence: ${(confidence * 100).toFixed(0)}%).`,
    ];

    // Explain which dimensions are borderline
    const scores = [
      { name: "Content verification", score: contentScore },
      { name: "Quality", score: qualityScore },
      { name: "Compliance", score: complianceScore },
      { name: "Fraud safety", score: fraudScore },
    ];

    const concerns = scores.filter((s) => s.score < 60);
    if (concerns.length > 0) {
      parts.push(
        `Areas of concern: ${concerns.map((c) => `${c.name} (${c.score}/100)`).join(", ")}.`
      );
    }

    if (confidence < this.thresholds.minConfidence) {
      parts.push(
        `Confidence (${(confidence * 100).toFixed(0)}%) is below the minimum threshold (${(this.thresholds.minConfidence * 100).toFixed(0)}%) for automated decisions.`
      );
    }

    const negativeSignals = signals.filter((s) => s.impact === "negative");
    if (negativeSignals.length > 0) {
      parts.push(
        `${negativeSignals.length} negative signal${negativeSignals.length > 1 ? "s" : ""} require human evaluation.`
      );
    }

    return parts.join(" ");
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Singleton Export
// ═══════════════════════════════════════════════════════════════════════════════

export const reviewOrchestrator = new ReviewOrchestrator();
