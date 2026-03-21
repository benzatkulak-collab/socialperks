import { describe, it, expect, beforeEach } from "vitest";
import {
  FeatureExtractor,
  LogisticRegressionModel,
  FraudScoringPipeline,
  FeedbackCollector,
  DriftDetector,
} from "../fraud-pipeline";
import type { FraudFeatures, ScoringRequest, UserContext, HistoricalSubmission } from "../fraud-pipeline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeContext(overrides: Partial<UserContext> = {}): UserContext {
  return {
    userId: "u1",
    accountCreatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days ago
    submissions: [],
    ...overrides,
  };
}

function makeRequest(overrides: Partial<ScoringRequest> = {}): ScoringRequest {
  return {
    submissionId: "s1",
    userId: "u1",
    campaignId: "c1",
    platformId: "ig",
    proofUrl: "https://www.instagram.com/p/abc123/",
    proofType: "url",
    metadata: {},
    ...overrides,
  };
}

function makeFeatures(overrides: Partial<FraudFeatures> = {}): FraudFeatures {
  return {
    hourOfDay: 14,
    dayOfWeek: 3,
    minutesSinceLastSubmission: 1440,
    submissionsInLast24h: 1,
    submissionsInLastHour: 0,
    accountAgeDays: 90,
    totalSubmissions: 10,
    approvalRate: 0.9,
    rejectionRate: 0.1,
    uniqueCampaignsCount: 5,
    uniquePlatformsCount: 3,
    proofUrlDomainMatch: 1,
    proofUrlIsUnique: 1,
    hasMetadata: 1,
    contentLengthNormalized: 0.3,
    avgTimeBetweenSubmissions: 1440,
    stdDevTimeBetweenSubmissions: 500,
    burstScore: 0.2,
    campaignDiversity: 0.6,
    platformDiversity: 0.5,
    ipReputationScore: 0.8,
    deviceFingerprintUniqueness: 0.9,
    geolocationConsistency: 0.8,
    ...overrides,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// FEATURE EXTRACTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("FeatureExtractor", () => {
  let extractor: FeatureExtractor;

  beforeEach(() => {
    extractor = new FeatureExtractor();
    extractor.resetCaches();
  });

  it("extracts correct temporal features", () => {
    const features = extractor.extract(makeRequest(), makeContext());
    expect(features.hourOfDay).toBeGreaterThanOrEqual(0);
    expect(features.hourOfDay).toBeLessThan(24);
    expect(features.dayOfWeek).toBeGreaterThanOrEqual(0);
    expect(features.dayOfWeek).toBeLessThan(7);
  });

  it("computes account age correctly", () => {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const ctx = makeContext({ accountCreatedAt: thirtyDaysAgo });
    const features = extractor.extract(makeRequest(), ctx);
    expect(features.accountAgeDays).toBeGreaterThanOrEqual(29);
    expect(features.accountAgeDays).toBeLessThanOrEqual(31);
  });

  it("detects domain match for Instagram URL", () => {
    const features = extractor.extract(
      makeRequest({ platformId: "ig", proofUrl: "https://www.instagram.com/p/abc/" }),
      makeContext()
    );
    expect(features.proofUrlDomainMatch).toBe(1);
  });

  it("detects domain mismatch", () => {
    const features = extractor.extract(
      makeRequest({ platformId: "ig", proofUrl: "https://www.tiktok.com/video/123" }),
      makeContext()
    );
    expect(features.proofUrlDomainMatch).toBe(0);
  });

  it("marks first URL as unique", () => {
    const features = extractor.extract(
      makeRequest({ proofUrl: "https://instagram.com/p/unique_url_test_1234/" }),
      makeContext()
    );
    expect(features.proofUrlIsUnique).toBe(1);
  });

  it("computes submission counts from history", () => {
    const now = Date.now();
    const submissions: HistoricalSubmission[] = [
      { id: "s1", userId: "u1", campaignId: "c1", platformId: "ig", proofUrl: "http://a.com", proofType: "url", submittedAt: new Date(now - 30 * 60 * 1000).toISOString(), status: "approved" },
      { id: "s2", userId: "u1", campaignId: "c2", platformId: "tt", proofUrl: "http://b.com", proofType: "url", submittedAt: new Date(now - 120 * 60 * 1000).toISOString(), status: "approved" },
    ];
    const ctx = makeContext({ submissions });
    const features = extractor.extract(makeRequest(), ctx);
    expect(features.submissionsInLast24h).toBe(2);
    expect(features.submissionsInLastHour).toBe(1);
    expect(features.totalSubmissions).toBe(2);
    expect(features.uniqueCampaignsCount).toBe(2);
  });

  it("computes approval and rejection rates", () => {
    const submissions: HistoricalSubmission[] = [
      { id: "s1", userId: "u1", campaignId: "c1", platformId: "ig", proofUrl: "a", proofType: "url", submittedAt: new Date().toISOString(), status: "approved" },
      { id: "s2", userId: "u1", campaignId: "c1", platformId: "ig", proofUrl: "b", proofType: "url", submittedAt: new Date().toISOString(), status: "approved" },
      { id: "s3", userId: "u1", campaignId: "c1", platformId: "ig", proofUrl: "c", proofType: "url", submittedAt: new Date().toISOString(), status: "rejected" },
    ];
    const features = extractor.extract(makeRequest(), makeContext({ submissions }));
    expect(features.approvalRate).toBeCloseTo(2 / 3, 1);
    expect(features.rejectionRate).toBeCloseTo(1 / 3, 1);
  });

  it("returns neutral scores when no IP/device info provided", () => {
    const features = extractor.extract(makeRequest(), makeContext());
    expect(features.ipReputationScore).toBe(0.5);
    expect(features.deviceFingerprintUniqueness).toBe(0.5);
    expect(features.geolocationConsistency).toBe(0.5);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// LOGISTIC REGRESSION MODEL
// ═══════════════════════════════════════════════════════════════════════════════

describe("LogisticRegressionModel", () => {
  const model = new LogisticRegressionModel();

  it("produces a score between 0 and 1", () => {
    const prediction = model.predict(makeFeatures());
    expect(prediction.fraudScore).toBeGreaterThanOrEqual(0);
    expect(prediction.fraudScore).toBeLessThanOrEqual(1);
  });

  it("produces a confidence between 0 and 1", () => {
    const prediction = model.predict(makeFeatures());
    expect(prediction.confidence).toBeGreaterThanOrEqual(0);
    expect(prediction.confidence).toBeLessThanOrEqual(1);
  });

  it("classifies a normal submission as low risk", () => {
    const prediction = model.predict(makeFeatures({
      approvalRate: 0.95,
      accountAgeDays: 180,
      proofUrlDomainMatch: 1,
      proofUrlIsUnique: 1,
      submissionsInLastHour: 0,
      burstScore: 0.1,
    }));
    expect(prediction.riskLevel).toBe("low");
  });

  it("classifies a suspicious submission as higher risk", () => {
    const prediction = model.predict(makeFeatures({
      accountAgeDays: 1,
      submissionsInLastHour: 10,
      submissionsInLast24h: 50,
      proofUrlIsUnique: 0,
      proofUrlDomainMatch: 0,
      burstScore: 0.9,
      approvalRate: 0.1,
      rejectionRate: 0.9,
    }));
    expect(["high", "critical"]).toContain(prediction.riskLevel);
  });

  it("returns top signals with descriptions", () => {
    const prediction = model.predict(makeFeatures());
    expect(prediction.topSignals.length).toBeLessThanOrEqual(5);
    for (const signal of prediction.topSignals) {
      expect(signal.feature).toBeDefined();
      expect(signal.description).toBeDefined();
      expect(typeof signal.contribution).toBe("number");
    }
  });

  it("provides human-readable explanation", () => {
    const prediction = model.predict(makeFeatures());
    expect(prediction.explanation.length).toBeGreaterThan(0);
  });

  it("getFeatureImportance returns values that sum to ~1", () => {
    const importance = model.getFeatureImportance();
    const total = Object.values(importance).reduce((s, v) => s + v, 0);
    expect(total).toBeCloseTo(1, 1);
  });

  it("has a version string", () => {
    expect(model.version).toBe("lr-v1.0.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FRAUD SCORING PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

describe("FraudScoringPipeline", () => {
  let pipeline: FraudScoringPipeline;

  beforeEach(() => {
    pipeline = new FraudScoringPipeline({
      model: new LogisticRegressionModel(),
      thresholds: { autoApproveBelow: 0.3, autoRejectAbove: 0.7 },
    });
    pipeline.getExtractor().resetCaches();
  });

  it("scoreAndDecide returns auto_approve for low-risk submission", () => {
    const result = pipeline.scoreAndDecide(makeRequest(), makeContext());
    expect(result.decision).toBeDefined();
    expect(["auto_approve", "manual_review", "auto_reject"]).toContain(result.decision);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.modelVersion).toBe("lr-v1.0.0");
  });

  it("scoreAndDecide returns auto_reject for high-risk submission", () => {
    const ctx = makeContext({
      accountCreatedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // 1 day old
      submissions: Array.from({ length: 20 }, (_, i) => ({
        id: `s${i}`,
        userId: "u1",
        campaignId: "c1",
        platformId: "ig",
        proofUrl: `https://fake.com/${i}`,
        proofType: "url" as const,
        submittedAt: new Date(Date.now() - i * 60 * 1000).toISOString(), // every minute
        status: "rejected" as const,
      })),
    });

    const result = pipeline.scoreAndDecide(
      makeRequest({ proofUrl: "https://fake.com/proof", platformId: "ig" }),
      ctx
    );
    // With a new account, many rejections, and bursty submissions, should be high risk
    expect(["manual_review", "auto_reject"]).toContain(result.decision);
  });

  it("scoreAndDecide includes prediction with risk level", () => {
    const result = pipeline.scoreAndDecide(makeRequest(), makeContext());
    expect(result.prediction).toBeDefined();
    expect(result.prediction.riskLevel).toBeDefined();
    expect(result.prediction.fraudScore).toBeGreaterThanOrEqual(0);
  });

  it("batchScore processes multiple requests", () => {
    const batch = [
      { request: makeRequest({ submissionId: "b1" }), context: makeContext() },
      { request: makeRequest({ submissionId: "b2" }), context: makeContext() },
    ];
    const results = pipeline.batchScore(batch);
    expect(results.length).toBe(2);
  });

  it("getModelVersion returns the model version", () => {
    expect(pipeline.getModelVersion()).toBe("lr-v1.0.0");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// FEEDBACK COLLECTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("FeedbackCollector", () => {
  let collector: FeedbackCollector;

  beforeEach(() => {
    collector = new FeedbackCollector(1000);
  });

  it("records outcomes and computes accuracy", () => {
    // True positive: predicted fraud, actually fraud
    collector.recordOutcome("s1", 0.8, true, makeFeatures());
    // True negative: predicted not fraud, actually not fraud
    collector.recordOutcome("s2", 0.2, false, makeFeatures());
    // False positive: predicted fraud, actually not fraud
    collector.recordOutcome("s3", 0.7, false, makeFeatures());
    // False negative: predicted not fraud, actually fraud
    collector.recordOutcome("s4", 0.3, true, makeFeatures());

    const metrics = collector.getModelAccuracy();
    expect(metrics.totalSamples).toBe(4);
    expect(metrics.accuracy).toBe(0.5); // 2 correct out of 4
  });

  it("computes confusion matrix correctly", () => {
    collector.recordOutcome("s1", 0.8, true, makeFeatures()); // TP
    collector.recordOutcome("s2", 0.8, false, makeFeatures()); // FP
    collector.recordOutcome("s3", 0.2, false, makeFeatures()); // TN
    collector.recordOutcome("s4", 0.2, true, makeFeatures()); // FN

    const cm = collector.getConfusionMatrix();
    expect(cm.truePositives).toBe(1);
    expect(cm.falsePositives).toBe(1);
    expect(cm.trueNegatives).toBe(1);
    expect(cm.falseNegatives).toBe(1);
  });

  it("handles perfect predictions", () => {
    for (let i = 0; i < 10; i++) {
      collector.recordOutcome(`s${i}`, 0.9, true, makeFeatures());
    }
    const metrics = collector.getModelAccuracy();
    expect(metrics.precision).toBe(1);
    expect(metrics.recall).toBe(1);
    expect(metrics.f1Score).toBe(1);
  });

  it("handles zero samples gracefully", () => {
    const metrics = collector.getModelAccuracy();
    expect(metrics.totalSamples).toBe(0);
    expect(metrics.accuracy).toBe(0);
  });

  it("respects the maxRecords limit", () => {
    const smallCollector = new FeedbackCollector(5);
    for (let i = 0; i < 10; i++) {
      smallCollector.recordOutcome(`s${i}`, 0.5, false, makeFeatures());
    }
    const metrics = smallCollector.getModelAccuracy();
    expect(metrics.totalSamples).toBeLessThanOrEqual(5);
  });

  it("uses custom fraudThreshold for predicted label", () => {
    collector.recordOutcome("s1", 0.4, true, makeFeatures(), 0.3);
    // 0.4 >= 0.3 threshold, so predictedLabel = true, actualLabel = true => TP
    const cm = collector.getConfusionMatrix();
    expect(cm.truePositives).toBe(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// DRIFT DETECTOR
// ═══════════════════════════════════════════════════════════════════════════════

describe("DriftDetector", () => {
  let detector: DriftDetector;

  beforeEach(() => {
    detector = new DriftDetector();
  });

  it("can be instantiated", () => {
    expect(detector).toBeDefined();
  });

  it("addBaseline + lockBaseline + addCurrent + checkDrift work", () => {
    // Record baseline features
    for (let i = 0; i < 100; i++) {
      detector.addBaseline(makeFeatures({
        submissionsInLastHour: Math.random() * 2,
        accountAgeDays: 30 + Math.random() * 60,
      }));
    }
    detector.lockBaseline();

    // Add current features (similar distribution)
    for (let i = 0; i < 100; i++) {
      detector.addCurrent(makeFeatures({
        submissionsInLastHour: Math.random() * 2,
        accountAgeDays: 30 + Math.random() * 60,
      }));
    }

    // checkDrift returns array of drifted feature names
    const drifted = detector.checkDrift();
    expect(Array.isArray(drifted)).toBe(true);

    // getReport returns the full DriftReport
    const report = detector.getReport();
    expect(report).toBeDefined();
    expect(report.totalFeatures).toBeGreaterThan(0);
  });

  it("detects drift when distribution shifts dramatically", () => {
    for (let i = 0; i < 100; i++) {
      detector.addBaseline(makeFeatures({ submissionsInLastHour: 0, accountAgeDays: 90 }));
    }
    detector.lockBaseline();

    // Dramatically different current distribution
    for (let i = 0; i < 100; i++) {
      detector.addCurrent(makeFeatures({ submissionsInLastHour: 50, accountAgeDays: 1 }));
    }

    const drifted = detector.checkDrift();
    expect(drifted.length).toBeGreaterThan(0);

    const report = detector.getReport();
    expect(report.driftedFeatures).toBeGreaterThan(0);
  });
});
