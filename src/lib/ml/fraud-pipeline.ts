// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — ML Fraud Detection Pipeline
// Production-grade feature extraction, model scoring, feedback loops,
// and distribution drift detection for real-time fraud prevention.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FraudFeatures {
  // Temporal features
  hourOfDay: number;
  dayOfWeek: number;
  minutesSinceLastSubmission: number;
  submissionsInLast24h: number;
  submissionsInLastHour: number;

  // Account features
  accountAgeDays: number;
  totalSubmissions: number;
  approvalRate: number;
  rejectionRate: number;
  uniqueCampaignsCount: number;
  uniquePlatformsCount: number;

  // Content features
  proofUrlDomainMatch: number; // 0 or 1
  proofUrlIsUnique: number; // 0 or 1
  hasMetadata: number; // 0 or 1
  contentLengthNormalized: number;

  // Behavioral features
  avgTimeBetweenSubmissions: number;
  stdDevTimeBetweenSubmissions: number;
  burstScore: number; // how "bursty" the submission pattern is
  campaignDiversity: number; // 0-1 entropy of campaign distribution
  platformDiversity: number; // 0-1 entropy of platform distribution

  // Network features
  ipReputationScore: number;
  deviceFingerprintUniqueness: number;
  geolocationConsistency: number;
}

export interface FraudPrediction {
  fraudScore: number; // 0-1
  confidence: number; // 0-1
  riskLevel: "low" | "medium" | "high" | "critical";
  topSignals: { feature: string; contribution: number; description: string }[];
  explanation: string;
}

export interface FraudModel {
  version: string;
  predict(features: FraudFeatures): FraudPrediction;
  getFeatureImportance(): Record<string, number>;
}

export interface ScoringRequest {
  submissionId: string;
  userId: string;
  campaignId: string;
  platformId: string;
  proofUrl: string;
  proofType: string;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  deviceFingerprint?: string;
}

export type ScoringDecision = "auto_approve" | "manual_review" | "auto_reject";

export interface ScoringResult {
  prediction: FraudPrediction;
  decision: ScoringDecision;
  latencyMs: number;
  modelVersion: string;
}

export interface FeedbackRecord {
  submissionId: string;
  predictedScore: number;
  predictedLabel: boolean; // true = predicted fraud
  actualLabel: boolean; // true = confirmed fraud
  features: FraudFeatures;
  timestamp: number;
}

export interface ConfusionMatrix {
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1Score: number;
  totalSamples: number;
  confusionMatrix: ConfusionMatrix;
}

export interface FeatureDriftEntry {
  feature: string;
  baselineMean: number;
  baselineVariance: number;
  currentMean: number;
  currentVariance: number;
  psi: number;
  drifted: boolean;
}

export interface DriftReport {
  timestamp: number;
  totalFeatures: number;
  driftedFeatures: number;
  entries: FeatureDriftEntry[];
}

// ─── Historical Context for Feature Extraction ─────────────────────────────

export interface HistoricalSubmission {
  id: string;
  userId: string;
  campaignId: string;
  platformId: string;
  proofUrl: string;
  proofType: string;
  submittedAt: string; // ISO 8601
  status: "pending" | "approved" | "rejected" | "expired";
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface UserContext {
  userId: string;
  accountCreatedAt: string; // ISO 8601
  submissions: readonly HistoricalSubmission[];
  knownIpAddresses?: readonly string[];
  knownDeviceFingerprints?: readonly string[];
  knownGeolocations?: readonly { lat: number; lon: number }[];
}

// Platform-to-domain mapping for proof URL domain verification
const PLATFORM_DOMAINS: Record<string, readonly string[]> = {
  ig: ["instagram.com", "www.instagram.com"],
  tt: ["tiktok.com", "www.tiktok.com", "vm.tiktok.com"],
  yt: ["youtube.com", "www.youtube.com", "youtu.be"],
  tw: ["twitter.com", "x.com", "www.twitter.com"],
  fb: ["facebook.com", "www.facebook.com", "m.facebook.com"],
  li: ["linkedin.com", "www.linkedin.com"],
  pi: ["pinterest.com", "www.pinterest.com"],
  sc: ["snapchat.com", "www.snapchat.com"],
  rd: ["reddit.com", "www.reddit.com", "old.reddit.com"],
  gm: ["google.com", "www.google.com", "maps.google.com"],
  yl: ["yelp.com", "www.yelp.com"],
  ta: ["tripadvisor.com", "www.tripadvisor.com"],
  bl: ["medium.com", "substack.com"],
  pc: ["podcasts.apple.com", "open.spotify.com"],
  nl: ["mailchimp.com", "convertkit.com"],
};

// ─── Utility Functions ──────────────────────────────────────────────────────

function parseISODate(iso: string): Date {
  return new Date(iso);
}

function daysBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24);
}

function minutesBetween(a: Date, b: Date): number {
  return Math.abs(b.getTime() - a.getTime()) / (1000 * 60);
}

/** Sigmoid function for logistic regression. */
function sigmoid(x: number): number {
  // Clamp to avoid overflow
  const clamped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clamped));
}

/** Shannon entropy of a probability distribution (base 2). Returns 0-1 normalized. */
function normalizedEntropy(counts: number[]): number {
  const total = counts.reduce((s, c) => s + c, 0);
  if (total === 0 || counts.length <= 1) return 0;

  let entropy = 0;
  for (const count of counts) {
    if (count > 0) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }
  }

  const maxEntropy = Math.log2(counts.length);
  return maxEntropy > 0 ? entropy / maxEntropy : 0;
}

/** Standard deviation from an array of numbers. */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((s, v) => s + v, 0) / values.length;
  const squaredDiffs = values.map((v) => (v - mean) ** 2);
  const variance = squaredDiffs.reduce((s, v) => s + v, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/** Compute burst score: ratio of submissions in the densest 10% time window. */
function computeBurstScore(timestamps: number[]): number {
  if (timestamps.length < 3) return 0;

  const sorted = [...timestamps].sort((a, b) => a - b);
  const totalSpan = sorted[sorted.length - 1] - sorted[0];
  if (totalSpan === 0) return 1; // All at same time = max burst

  const windowSize = totalSpan * 0.1; // 10% of total time span
  let maxCount = 0;

  for (let i = 0; i < sorted.length; i++) {
    const windowEnd = sorted[i] + windowSize;
    let count = 0;
    for (let j = i; j < sorted.length && sorted[j] <= windowEnd; j++) {
      count++;
    }
    maxCount = Math.max(maxCount, count);
  }

  // Normalize: what fraction of submissions fell in the densest 10% window
  return maxCount / sorted.length;
}

/** Extract domain from a URL, returning empty string on failure. */
function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase();
  } catch {
    return "";
  }
}

// ─── Feature Extractor ──────────────────────────────────────────────────────

/** Set of all known proof URLs (in-memory; production would use a DB index). */
const globalProofUrlSet = new Set<string>();
const MAX_GLOBAL_URLS = 200_000;

/**
 * FeatureExtractor computes all ML features from raw submission data
 * combined with historical user context. Designed for real-time extraction
 * with O(n) complexity on submission history.
 */
export class FeatureExtractor {
  private ipReputationCache = new Map<string, number>();
  private readonly IP_CACHE_MAX = 50_000;

  /**
   * Extract the full feature vector from a scoring request and user context.
   * Target latency: <10ms for typical user histories (<1000 submissions).
   */
  extract(request: ScoringRequest, context: UserContext): FraudFeatures {
    const now = new Date();
    const submissions = context.submissions;

    // ── Temporal features ──────────────────────────────────────────────
    const hourOfDay = now.getUTCHours();
    const dayOfWeek = now.getUTCDay();

    const submissionTimestamps = submissions.map((s) =>
      parseISODate(s.submittedAt).getTime()
    );
    const sortedTimestamps = [...submissionTimestamps].sort((a, b) => a - b);

    const nowMs = now.getTime();
    const oneDayAgo = nowMs - 24 * 60 * 60 * 1000;
    const oneHourAgo = nowMs - 60 * 60 * 1000;

    const submissionsInLast24h = submissionTimestamps.filter(
      (t) => t >= oneDayAgo
    ).length;
    const submissionsInLastHour = submissionTimestamps.filter(
      (t) => t >= oneHourAgo
    ).length;

    let minutesSinceLastSubmission = Infinity;
    if (sortedTimestamps.length > 0) {
      const lastTs = sortedTimestamps[sortedTimestamps.length - 1];
      minutesSinceLastSubmission = (nowMs - lastTs) / (1000 * 60);
    }
    // Cap at 10080 minutes (7 days) for normalization
    minutesSinceLastSubmission = Math.min(minutesSinceLastSubmission, 10080);

    // ── Account features ───────────────────────────────────────────────
    const accountCreated = parseISODate(context.accountCreatedAt);
    const accountAgeDays = daysBetween(accountCreated, now);

    const totalSubmissions = submissions.length;
    const approvedCount = submissions.filter(
      (s) => s.status === "approved"
    ).length;
    const rejectedCount = submissions.filter(
      (s) => s.status === "rejected"
    ).length;
    const decidedCount = approvedCount + rejectedCount;

    const approvalRate = decidedCount > 0 ? approvedCount / decidedCount : 0.5;
    const rejectionRate = decidedCount > 0 ? rejectedCount / decidedCount : 0;

    const uniqueCampaigns = new Set(submissions.map((s) => s.campaignId));
    const uniquePlatforms = new Set(submissions.map((s) => s.platformId));
    const uniqueCampaignsCount = uniqueCampaigns.size;
    const uniquePlatformsCount = uniquePlatforms.size;

    // ── Content features ───────────────────────────────────────────────
    const proofDomain = extractDomain(request.proofUrl);
    const expectedDomains = PLATFORM_DOMAINS[request.platformId] ?? [];
    const proofUrlDomainMatch = expectedDomains.includes(proofDomain) ? 1 : 0;

    const normalizedUrl = request.proofUrl.toLowerCase().trim().replace(/\/+$/, "");
    const proofUrlIsUnique = globalProofUrlSet.has(normalizedUrl) ? 0 : 1;
    // Register URL (LRU-style: just add, prune when over limit)
    if (globalProofUrlSet.size < MAX_GLOBAL_URLS) {
      globalProofUrlSet.add(normalizedUrl);
    }

    const hasMetadata =
      request.metadata && Object.keys(request.metadata).length > 0 ? 1 : 0;

    // Content length: normalize to 0-1 range (0 chars = 0, 1000+ chars = 1)
    const rawContentLength =
      typeof request.metadata?.contentLength === "number"
        ? (request.metadata.contentLength as number)
        : typeof request.metadata?.content === "string"
          ? (request.metadata.content as string).length
          : 0;
    const contentLengthNormalized = Math.min(rawContentLength / 1000, 1);

    // ── Behavioral features ────────────────────────────────────────────
    const gaps: number[] = [];
    for (let i = 1; i < sortedTimestamps.length; i++) {
      gaps.push((sortedTimestamps[i] - sortedTimestamps[i - 1]) / (1000 * 60));
    }

    const avgTimeBetweenSubmissions =
      gaps.length > 0 ? gaps.reduce((s, g) => s + g, 0) / gaps.length : 10080; // default 7 days

    const stdDevTimeBetweenSubmissions = stdDev(gaps);

    const burstScore = computeBurstScore(sortedTimestamps);

    // Campaign diversity (entropy)
    const campaignCounts = new Map<string, number>();
    for (const s of submissions) {
      campaignCounts.set(s.campaignId, (campaignCounts.get(s.campaignId) ?? 0) + 1);
    }
    const campaignDiversity = normalizedEntropy(
      Array.from(campaignCounts.values())
    );

    // Platform diversity (entropy)
    const platformCounts = new Map<string, number>();
    for (const s of submissions) {
      platformCounts.set(s.platformId, (platformCounts.get(s.platformId) ?? 0) + 1);
    }
    const platformDiversity = normalizedEntropy(
      Array.from(platformCounts.values())
    );

    // ── Network features ───────────────────────────────────────────────
    const ipReputationScore = this.computeIpReputation(
      request.ipAddress,
      context.knownIpAddresses
    );

    const deviceFingerprintUniqueness = this.computeDeviceUniqueness(
      request.deviceFingerprint,
      context.knownDeviceFingerprints
    );

    const geolocationConsistency = this.computeGeoConsistency(
      context.knownGeolocations
    );

    return {
      hourOfDay,
      dayOfWeek,
      minutesSinceLastSubmission,
      submissionsInLast24h,
      submissionsInLastHour,
      accountAgeDays,
      totalSubmissions,
      approvalRate,
      rejectionRate,
      uniqueCampaignsCount,
      uniquePlatformsCount,
      proofUrlDomainMatch,
      proofUrlIsUnique,
      hasMetadata,
      contentLengthNormalized,
      avgTimeBetweenSubmissions,
      stdDevTimeBetweenSubmissions,
      burstScore,
      campaignDiversity,
      platformDiversity,
      ipReputationScore,
      deviceFingerprintUniqueness,
      geolocationConsistency,
    };
  }

  /** IP reputation: 1 = trustworthy, 0 = suspicious. */
  private computeIpReputation(
    ip?: string,
    knownIps?: readonly string[]
  ): number {
    if (!ip) return 0.5; // Unknown = neutral

    // Check cache
    const cached = this.ipReputationCache.get(ip);
    if (cached !== undefined) return cached;

    let score = 0.5;

    // Known IP gets a trust boost
    if (knownIps && knownIps.includes(ip)) {
      score = 0.8;
    }

    // Heuristics for suspicious IPs (VPN/proxy ranges, etc.)
    // In production this would query an IP reputation API
    if (ip.startsWith("10.") || ip.startsWith("192.168.") || ip.startsWith("172.")) {
      // Private IP ranges — could be VPN or internal
      score = Math.min(score, 0.6);
    }

    if (this.ipReputationCache.size < this.IP_CACHE_MAX) {
      this.ipReputationCache.set(ip, score);
    }

    return score;
  }

  /** Device fingerprint uniqueness: 1 = consistent device, 0 = new/suspicious. */
  private computeDeviceUniqueness(
    fingerprint?: string,
    knownFingerprints?: readonly string[]
  ): number {
    if (!fingerprint) return 0.5;
    if (!knownFingerprints || knownFingerprints.length === 0) return 0.3;

    if (knownFingerprints.includes(fingerprint)) return 1.0;

    // Partial match — some device attributes might overlap
    // In production this would use a proper fingerprint similarity metric
    return 0.2;
  }

  /** Geolocation consistency: 1 = all from same area, 0 = scattered globally. */
  private computeGeoConsistency(
    geolocations?: readonly { lat: number; lon: number }[]
  ): number {
    if (!geolocations || geolocations.length < 2) return 0.5;

    // Compute average pairwise distance (Haversine approximation not needed
    // for fraud detection; simple Euclidean on lat/lon suffices at this scale)
    let totalDist = 0;
    let pairs = 0;

    for (let i = 0; i < geolocations.length; i++) {
      for (let j = i + 1; j < geolocations.length; j++) {
        const dLat = geolocations[i].lat - geolocations[j].lat;
        const dLon = geolocations[i].lon - geolocations[j].lon;
        totalDist += Math.sqrt(dLat * dLat + dLon * dLon);
        pairs++;
      }
    }

    const avgDist = pairs > 0 ? totalDist / pairs : 0;

    // Normalize: 0 degrees apart = 1.0 consistency, 50+ degrees apart = 0.0
    return Math.max(0, 1 - avgDist / 50);
  }

  /** Reset internal caches (for testing or periodic cleanup). */
  resetCaches(): void {
    this.ipReputationCache.clear();
    globalProofUrlSet.clear();
  }
}

// ─── Logistic Regression Model ──────────────────────────────────────────────

/**
 * Feature normalization parameters: mean and standard deviation from
 * training data. Used to z-score normalize features before scoring.
 */
const FEATURE_NORMS: Record<keyof FraudFeatures, { mean: number; std: number }> = {
  hourOfDay:                    { mean: 12,    std: 7 },
  dayOfWeek:                    { mean: 3,     std: 2 },
  minutesSinceLastSubmission:   { mean: 1440,  std: 2880 },
  submissionsInLast24h:         { mean: 2,     std: 3 },
  submissionsInLastHour:        { mean: 0.5,   std: 1 },
  accountAgeDays:               { mean: 90,    std: 120 },
  totalSubmissions:             { mean: 20,    std: 30 },
  approvalRate:                 { mean: 0.85,  std: 0.15 },
  rejectionRate:                { mean: 0.1,   std: 0.12 },
  uniqueCampaignsCount:         { mean: 5,     std: 4 },
  uniquePlatformsCount:         { mean: 3,     std: 2 },
  proofUrlDomainMatch:          { mean: 0.9,   std: 0.3 },
  proofUrlIsUnique:             { mean: 0.95,  std: 0.22 },
  hasMetadata:                  { mean: 0.8,   std: 0.4 },
  contentLengthNormalized:      { mean: 0.3,   std: 0.25 },
  avgTimeBetweenSubmissions:    { mean: 1440,  std: 2000 },
  stdDevTimeBetweenSubmissions: { mean: 720,   std: 1000 },
  burstScore:                   { mean: 0.3,   std: 0.2 },
  campaignDiversity:            { mean: 0.6,   std: 0.25 },
  platformDiversity:            { mean: 0.5,   std: 0.3 },
  ipReputationScore:            { mean: 0.7,   std: 0.2 },
  deviceFingerprintUniqueness:  { mean: 0.7,   std: 0.3 },
  geolocationConsistency:       { mean: 0.75,  std: 0.2 },
};

/**
 * Learned logistic regression weights. Positive weights increase fraud
 * probability; negative weights decrease it. Bias is the intercept term.
 *
 * These weights were calibrated against synthetic fraud patterns typical
 * of social media marketing abuse (rapid-fire submissions, duplicate proofs,
 * new accounts with high volume, inconsistent devices/locations).
 */
const LR_WEIGHTS: Record<keyof FraudFeatures, number> = {
  // Temporal: late-night and rapid submissions are suspicious
  hourOfDay:                    0.05,
  dayOfWeek:                   -0.02,
  minutesSinceLastSubmission:  -0.45,  // Very short gap = suspicious
  submissionsInLast24h:         0.55,  // High volume = suspicious
  submissionsInLastHour:        0.70,  // Burst in last hour = very suspicious

  // Account: new accounts and low approval are suspicious
  accountAgeDays:              -0.40,  // Newer = more suspicious
  totalSubmissions:            -0.10,  // Established users are safer
  approvalRate:                -0.65,  // Low approval = suspicious
  rejectionRate:                0.60,  // High rejection = suspicious
  uniqueCampaignsCount:        -0.15,  // Diversity is good
  uniquePlatformsCount:        -0.10,  // Multi-platform is safer

  // Content: mismatched URLs, duplicates, and missing data are suspicious
  proofUrlDomainMatch:         -0.50,  // Matching domain = safer
  proofUrlIsUnique:            -0.80,  // Unique proof = much safer
  hasMetadata:                 -0.25,  // Having metadata = safer
  contentLengthNormalized:     -0.20,  // More content = less suspicious

  // Behavioral: bursty, uniform, or irregular patterns
  avgTimeBetweenSubmissions:   -0.30,  // Longer avg gap = safer
  stdDevTimeBetweenSubmissions: 0.15,  // High variance can be suspicious
  burstScore:                   0.65,  // Bursty = suspicious
  campaignDiversity:           -0.20,  // Diverse campaigns = safer
  platformDiversity:           -0.15,  // Diverse platforms = safer

  // Network: suspicious IPs, unknown devices, inconsistent location
  ipReputationScore:           -0.35,  // Good IP rep = safer
  deviceFingerprintUniqueness: -0.30,  // Known device = safer
  geolocationConsistency:      -0.25,  // Consistent location = safer
};

const LR_BIAS = -0.5; // Slight bias toward "not fraud" (most submissions are legitimate)

/** Feature descriptions for human-readable explanations. */
const FEATURE_DESCRIPTIONS: Record<keyof FraudFeatures, string> = {
  hourOfDay: "Submission time of day",
  dayOfWeek: "Day of the week",
  minutesSinceLastSubmission: "Time since last submission",
  submissionsInLast24h: "Submission volume in last 24 hours",
  submissionsInLastHour: "Submission volume in last hour",
  accountAgeDays: "Account age",
  totalSubmissions: "Total historical submissions",
  approvalRate: "Historical approval rate",
  rejectionRate: "Historical rejection rate",
  uniqueCampaignsCount: "Number of unique campaigns participated in",
  uniquePlatformsCount: "Number of unique platforms used",
  proofUrlDomainMatch: "Proof URL matches expected platform domain",
  proofUrlIsUnique: "Proof URL has not been submitted before",
  hasMetadata: "Submission includes metadata",
  contentLengthNormalized: "Content length of submission",
  avgTimeBetweenSubmissions: "Average time between submissions",
  stdDevTimeBetweenSubmissions: "Variability in submission timing",
  burstScore: "Burstiness of submission pattern",
  campaignDiversity: "Diversity of campaigns engaged with",
  platformDiversity: "Diversity of platforms used",
  ipReputationScore: "IP address reputation",
  deviceFingerprintUniqueness: "Device fingerprint consistency",
  geolocationConsistency: "Geographic location consistency",
};

const FEATURE_KEYS = Object.keys(LR_WEIGHTS) as (keyof FraudFeatures)[];

/**
 * Hand-coded logistic regression model with pre-trained weights.
 * Uses z-score normalization and sigmoid activation.
 */
export class LogisticRegressionModel implements FraudModel {
  readonly version = "lr-v1.0.0";

  predict(features: FraudFeatures): FraudPrediction {
    // Z-score normalize features
    const normalized: Record<string, number> = {};
    for (const key of FEATURE_KEYS) {
      const norm = FEATURE_NORMS[key];
      const raw = features[key];
      normalized[key] = norm.std > 0 ? (raw - norm.mean) / norm.std : 0;
    }

    // Compute logit = bias + sum(weight_i * normalized_i)
    let logit = LR_BIAS;
    const contributions: { feature: string; contribution: number }[] = [];

    for (const key of FEATURE_KEYS) {
      const contrib = LR_WEIGHTS[key] * normalized[key];
      logit += contrib;
      contributions.push({ feature: key, contribution: contrib });
    }

    const fraudScore = sigmoid(logit);

    // Confidence: based on how far from 0.5 the score is (more extreme = more confident)
    // Also factor in data availability (more features with non-default values = higher confidence)
    const scoreDist = Math.abs(fraudScore - 0.5) * 2; // 0-1
    const dataCompleteness = this.computeDataCompleteness(features);
    const confidence = Math.min(0.99, scoreDist * 0.6 + dataCompleteness * 0.4);

    // Determine risk level
    const riskLevel = this.scoreToRiskLevel(fraudScore);

    // Top signals: sort contributions by absolute value, take top 5
    contributions.sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
    const topSignals = contributions.slice(0, 5).map((c) => ({
      feature: c.feature,
      contribution: Math.round(c.contribution * 1000) / 1000,
      description:
        FEATURE_DESCRIPTIONS[c.feature as keyof FraudFeatures] ?? c.feature,
    }));

    const explanation = this.generateExplanation(fraudScore, riskLevel, topSignals);

    return { fraudScore, confidence, riskLevel, topSignals, explanation };
  }

  getFeatureImportance(): Record<string, number> {
    const importance: Record<string, number> = {};
    const totalAbsWeight = FEATURE_KEYS.reduce(
      (s, k) => s + Math.abs(LR_WEIGHTS[k]),
      0
    );
    for (const key of FEATURE_KEYS) {
      importance[key] = Math.abs(LR_WEIGHTS[key]) / totalAbsWeight;
    }
    return importance;
  }

  private computeDataCompleteness(features: FraudFeatures): number {
    let available = 0;
    let total = 0;

    // Check each feature category for non-default values
    const checks: [boolean, number][] = [
      [features.totalSubmissions > 0, 1],
      [features.accountAgeDays > 0, 1],
      [features.ipReputationScore !== 0.5, 1],
      [features.deviceFingerprintUniqueness !== 0.5, 1],
      [features.geolocationConsistency !== 0.5, 1],
      [features.hasMetadata === 1, 0.5],
      [features.proofUrlDomainMatch >= 0, 0.5],
      [features.uniqueCampaignsCount > 0, 0.5],
    ];

    for (const [present, weight] of checks) {
      total += weight;
      if (present) available += weight;
    }

    return total > 0 ? available / total : 0;
  }

  private scoreToRiskLevel(score: number): FraudPrediction["riskLevel"] {
    if (score < 0.3) return "low";
    if (score < 0.6) return "medium";
    if (score < 0.85) return "high";
    return "critical";
  }

  private generateExplanation(
    score: number,
    riskLevel: FraudPrediction["riskLevel"],
    topSignals: FraudPrediction["topSignals"]
  ): string {
    const pct = Math.round(score * 100);
    const primary = topSignals[0];

    if (riskLevel === "low") {
      return `Low risk (${pct}%). Submission appears legitimate.`;
    }

    if (riskLevel === "medium") {
      return (
        `Medium risk (${pct}%). Primary signal: ${primary?.description ?? "N/A"}. ` +
        `Manual review recommended.`
      );
    }

    if (riskLevel === "high") {
      const signals = topSignals
        .slice(0, 3)
        .map((s) => s.description)
        .join(", ");
      return `High risk (${pct}%). Key signals: ${signals}. Likely fraudulent.`;
    }

    const signals = topSignals
      .slice(0, 3)
      .map((s) => s.description)
      .join(", ");
    return `Critical risk (${pct}%). Strong fraud indicators: ${signals}. Auto-rejection recommended.`;
  }
}

// ─── Rules-Based Model (for Ensemble) ───────────────────────────────────────

/**
 * Deterministic rules-based fraud model. Uses hard thresholds on individual
 * features to produce a score. Serves as a complement to the logistic
 * regression model in the ensemble, catching obvious abuse that statistical
 * models might underweight.
 */
export class RulesBasedModel implements FraudModel {
  readonly version = "rules-v1.0.0";

  predict(features: FraudFeatures): FraudPrediction {
    const signals: { feature: string; contribution: number; description: string }[] = [];
    let totalPenalty = 0;

    // Rule 1: Duplicate proof URL
    if (features.proofUrlIsUnique === 0) {
      const penalty = 0.35;
      totalPenalty += penalty;
      signals.push({
        feature: "proofUrlIsUnique",
        contribution: penalty,
        description: "Proof URL has been submitted before (duplicate)",
      });
    }

    // Rule 2: Domain mismatch
    if (features.proofUrlDomainMatch === 0) {
      const penalty = 0.2;
      totalPenalty += penalty;
      signals.push({
        feature: "proofUrlDomainMatch",
        contribution: penalty,
        description: "Proof URL domain does not match expected platform",
      });
    }

    // Rule 3: Burst activity
    if (features.submissionsInLastHour >= 5) {
      const penalty = 0.3;
      totalPenalty += penalty;
      signals.push({
        feature: "submissionsInLastHour",
        contribution: penalty,
        description: "Unusually high submission volume in the last hour",
      });
    } else if (features.submissionsInLastHour >= 3) {
      const penalty = 0.15;
      totalPenalty += penalty;
      signals.push({
        feature: "submissionsInLastHour",
        contribution: penalty,
        description: "Elevated submission volume in the last hour",
      });
    }

    // Rule 4: New account with high volume
    if (features.accountAgeDays < 3 && features.submissionsInLast24h > 5) {
      const penalty = 0.3;
      totalPenalty += penalty;
      signals.push({
        feature: "accountAgeDays",
        contribution: penalty,
        description: "New account with unusually high submission volume",
      });
    }

    // Rule 5: Very rapid submission
    if (features.minutesSinceLastSubmission < 2) {
      const penalty = 0.2;
      totalPenalty += penalty;
      signals.push({
        feature: "minutesSinceLastSubmission",
        contribution: penalty,
        description: "Submission made less than 2 minutes after the previous one",
      });
    }

    // Rule 6: High rejection rate
    if (features.rejectionRate > 0.5 && features.totalSubmissions >= 5) {
      const penalty = 0.25;
      totalPenalty += penalty;
      signals.push({
        feature: "rejectionRate",
        contribution: penalty,
        description: "More than half of past submissions were rejected",
      });
    }

    // Rule 7: Unknown device from inconsistent location
    if (features.deviceFingerprintUniqueness < 0.3 && features.geolocationConsistency < 0.3) {
      const penalty = 0.2;
      totalPenalty += penalty;
      signals.push({
        feature: "deviceFingerprintUniqueness",
        contribution: penalty,
        description: "Unknown device from inconsistent geographic location",
      });
    }

    // Rule 8: High burst score with low diversity
    if (features.burstScore > 0.7 && features.campaignDiversity < 0.2) {
      const penalty = 0.2;
      totalPenalty += penalty;
      signals.push({
        feature: "burstScore",
        contribution: penalty,
        description: "Bursty submission pattern targeting a single campaign",
      });
    }

    // Rule 9: No metadata and short content
    if (features.hasMetadata === 0 && features.contentLengthNormalized < 0.05) {
      const penalty = 0.1;
      totalPenalty += penalty;
      signals.push({
        feature: "hasMetadata",
        contribution: penalty,
        description: "Submission lacks metadata and has very little content",
      });
    }

    // Cap at 1.0
    const fraudScore = Math.min(1, totalPenalty);
    const confidence = signals.length > 0 ? Math.min(0.95, 0.3 + signals.length * 0.1) : 0.8;
    const riskLevel = this.scoreToRiskLevel(fraudScore);

    signals.sort((a, b) => b.contribution - a.contribution);
    const topSignals = signals.slice(0, 5);

    const explanation =
      signals.length === 0
        ? `Low risk (${Math.round(fraudScore * 100)}%). No rule violations detected.`
        : `${riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} risk (${Math.round(fraudScore * 100)}%). ` +
          `${signals.length} rule(s) triggered: ${topSignals.map((s) => s.description).join("; ")}.`;

    return { fraudScore, confidence, riskLevel, topSignals, explanation };
  }

  getFeatureImportance(): Record<string, number> {
    // Approximate importance based on rule penalty weights
    return {
      proofUrlIsUnique: 0.18,
      submissionsInLastHour: 0.15,
      accountAgeDays: 0.12,
      proofUrlDomainMatch: 0.10,
      rejectionRate: 0.10,
      minutesSinceLastSubmission: 0.08,
      burstScore: 0.08,
      deviceFingerprintUniqueness: 0.07,
      geolocationConsistency: 0.05,
      hasMetadata: 0.04,
      contentLengthNormalized: 0.03,
    };
  }

  private scoreToRiskLevel(score: number): FraudPrediction["riskLevel"] {
    if (score < 0.2) return "low";
    if (score < 0.5) return "medium";
    if (score < 0.8) return "high";
    return "critical";
  }
}

// ─── Ensemble Model ─────────────────────────────────────────────────────────

/**
 * Ensemble model that combines multiple models using weighted averaging.
 * Default configuration uses logistic regression (weight 0.6) and
 * rules-based model (weight 0.4) for complementary coverage.
 */
export class EnsembleModel implements FraudModel {
  readonly version: string;
  private readonly models: { model: FraudModel; weight: number }[];

  constructor(
    models?: { model: FraudModel; weight: number }[]
  ) {
    this.models = models ?? [
      { model: new LogisticRegressionModel(), weight: 0.6 },
      { model: new RulesBasedModel(), weight: 0.4 },
    ];

    const versions = this.models.map((m) => m.model.version).join("+");
    this.version = `ensemble(${versions})`;
  }

  predict(features: FraudFeatures): FraudPrediction {
    const predictions = this.models.map((m) => ({
      prediction: m.model.predict(features),
      weight: m.weight,
    }));

    const totalWeight = this.models.reduce((s, m) => s + m.weight, 0);

    // Weighted average of fraud scores
    const fraudScore =
      predictions.reduce(
        (s, p) => s + p.prediction.fraudScore * p.weight,
        0
      ) / totalWeight;

    // Weighted average of confidence
    const confidence =
      predictions.reduce(
        (s, p) => s + p.prediction.confidence * p.weight,
        0
      ) / totalWeight;

    // Risk level from ensemble score
    const riskLevel = this.ensembleRiskLevel(fraudScore);

    // Merge and deduplicate top signals, keeping highest contribution
    const signalMap = new Map<
      string,
      { feature: string; contribution: number; description: string }
    >();
    for (const p of predictions) {
      for (const signal of p.prediction.topSignals) {
        const existing = signalMap.get(signal.feature);
        if (!existing || Math.abs(signal.contribution) > Math.abs(existing.contribution)) {
          signalMap.set(signal.feature, signal);
        }
      }
    }
    const topSignals = Array.from(signalMap.values())
      .sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution))
      .slice(0, 5);

    // Combine explanations
    const pct = Math.round(fraudScore * 100);
    const modelDetails = predictions
      .map(
        (p) =>
          `${p.prediction.riskLevel} (${Math.round(p.prediction.fraudScore * 100)}%)`
      )
      .join(", ");

    const explanation =
      `Ensemble score: ${pct}% (${riskLevel}). ` +
      `Model breakdown: [${modelDetails}]. ` +
      (topSignals.length > 0
        ? `Top signals: ${topSignals.map((s) => s.description).join("; ")}.`
        : "No significant signals detected.");

    return {
      fraudScore: Math.round(fraudScore * 10000) / 10000,
      confidence: Math.round(confidence * 10000) / 10000,
      riskLevel,
      topSignals,
      explanation,
    };
  }

  getFeatureImportance(): Record<string, number> {
    const totalWeight = this.models.reduce((s, m) => s + m.weight, 0);
    const merged: Record<string, number> = {};

    for (const { model, weight } of this.models) {
      const importance = model.getFeatureImportance();
      for (const [key, value] of Object.entries(importance)) {
        merged[key] = (merged[key] ?? 0) + value * (weight / totalWeight);
      }
    }

    return merged;
  }

  private ensembleRiskLevel(score: number): FraudPrediction["riskLevel"] {
    if (score < 0.3) return "low";
    if (score < 0.6) return "medium";
    if (score < 0.8) return "high";
    return "critical";
  }
}

// ─── Real-Time Scoring Pipeline ─────────────────────────────────────────────

/** Decision thresholds for automatic actions. */
export interface DecisionThresholds {
  autoApproveBelow: number; // Auto-approve if fraudScore < this
  autoRejectAbove: number; // Auto-reject if fraudScore > this
  // Between these thresholds = manual review
}

const DEFAULT_THRESHOLDS: DecisionThresholds = {
  autoApproveBelow: 0.3,
  autoRejectAbove: 0.7,
};

/**
 * Real-time fraud scoring pipeline. Orchestrates feature extraction,
 * model inference, and decision-making with latency tracking.
 */
export class FraudScoringPipeline {
  private readonly extractor: FeatureExtractor;
  private readonly model: FraudModel;
  private readonly thresholds: DecisionThresholds;

  constructor(options?: {
    model?: FraudModel;
    thresholds?: DecisionThresholds;
  }) {
    this.extractor = new FeatureExtractor();
    this.model = options?.model ?? new EnsembleModel();
    this.thresholds = options?.thresholds ?? DEFAULT_THRESHOLDS;
  }

  /**
   * Extract features and run model prediction.
   * Returns the raw prediction without a decision.
   */
  score(request: ScoringRequest, context: UserContext): FraudPrediction {
    const features = this.extractor.extract(request, context);
    return this.model.predict(features);
  }

  /**
   * Score a submission and apply decision thresholds.
   * Returns the prediction, decision, latency, and model version.
   */
  scoreAndDecide(request: ScoringRequest, context: UserContext): ScoringResult {
    const startTime = performance.now();

    const features = this.extractor.extract(request, context);
    const prediction = this.model.predict(features);

    let decision: ScoringDecision;
    if (prediction.fraudScore < this.thresholds.autoApproveBelow) {
      decision = "auto_approve";
    } else if (prediction.fraudScore > this.thresholds.autoRejectAbove) {
      decision = "auto_reject";
    } else {
      decision = "manual_review";
    }

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    return {
      prediction,
      decision,
      latencyMs,
      modelVersion: this.model.version,
    };
  }

  /**
   * Score multiple submissions efficiently.
   * Extracts features and runs predictions in batch.
   * Returns results in the same order as the input.
   */
  batchScore(
    requests: { request: ScoringRequest; context: UserContext }[]
  ): ScoringResult[] {
    return requests.map(({ request, context }) =>
      this.scoreAndDecide(request, context)
    );
  }

  /** Get the underlying model version. */
  getModelVersion(): string {
    return this.model.version;
  }

  /** Get feature importance from the model. */
  getFeatureImportance(): Record<string, number> {
    return this.model.getFeatureImportance();
  }

  /** Access the feature extractor for direct use. */
  getExtractor(): FeatureExtractor {
    return this.extractor;
  }
}

// ─── Feedback Collector ─────────────────────────────────────────────────────

/**
 * Collects human reviewer feedback on model predictions to track accuracy,
 * compute confusion matrices, detect feature drift, and export labeled
 * training data for model retraining.
 */
export class FeedbackCollector {
  private records: FeedbackRecord[] = [];
  private readonly maxRecords: number;

  constructor(maxRecords = 100_000) {
    this.maxRecords = maxRecords;
  }

  /**
   * Record whether a human reviewer agreed with the model's prediction.
   * @param submissionId - The submission that was reviewed.
   * @param predictedScore - The model's fraud score (0-1).
   * @param actuallyFraud - Whether the reviewer determined it was fraud.
   * @param features - The feature vector used for the prediction.
   * @param fraudThreshold - Score above which the model predicts fraud (default 0.5).
   */
  recordOutcome(
    submissionId: string,
    predictedScore: number,
    actuallyFraud: boolean,
    features: FraudFeatures,
    fraudThreshold = 0.5
  ): void {
    const record: FeedbackRecord = {
      submissionId,
      predictedScore,
      predictedLabel: predictedScore >= fraudThreshold,
      actualLabel: actuallyFraud,
      features,
      timestamp: Date.now(),
    };

    this.records.push(record);

    // Evict oldest records if over limit
    if (this.records.length > this.maxRecords) {
      this.records = this.records.slice(-this.maxRecords);
    }
  }

  /**
   * Compute precision, recall, F1, and accuracy from collected feedback.
   */
  getModelAccuracy(): ModelMetrics {
    const cm = this.getConfusionMatrix();
    const { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn } = cm;
    const total = tp + fp + tn + fn;

    const accuracy = total > 0 ? (tp + tn) / total : 0;
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1Score =
      precision + recall > 0
        ? (2 * precision * recall) / (precision + recall)
        : 0;

    return {
      accuracy: Math.round(accuracy * 10000) / 10000,
      precision: Math.round(precision * 10000) / 10000,
      recall: Math.round(recall * 10000) / 10000,
      f1Score: Math.round(f1Score * 10000) / 10000,
      totalSamples: total,
      confusionMatrix: cm,
    };
  }

  /**
   * Compute the standard confusion matrix from collected feedback.
   */
  getConfusionMatrix(): ConfusionMatrix {
    let tp = 0;
    let fp = 0;
    let tn = 0;
    let fn = 0;

    for (const record of this.records) {
      if (record.predictedLabel && record.actualLabel) tp++;
      else if (record.predictedLabel && !record.actualLabel) fp++;
      else if (!record.predictedLabel && !record.actualLabel) tn++;
      else fn++;
    }

    return { truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn };
  }

  /**
   * Detect when feature distributions shift over time by comparing
   * recent records to older records. Uses Population Stability Index (PSI).
   *
   * @param recentWindowSize - Number of most recent records to compare against older data.
   * @param psiThreshold - PSI above this value flags the feature as drifted (default 0.2).
   */
  getFeatureDriftReport(
    recentWindowSize = 500,
    psiThreshold = 0.2
  ): DriftReport | null {
    if (this.records.length < recentWindowSize * 2) {
      return null; // Not enough data to compare
    }

    const splitPoint = this.records.length - recentWindowSize;
    const baselineRecords = this.records.slice(0, splitPoint);
    const recentRecords = this.records.slice(splitPoint);

    const entries: FeatureDriftEntry[] = [];

    for (const key of FEATURE_KEYS) {
      const baselineValues = baselineRecords.map((r) => r.features[key]);
      const recentValues = recentRecords.map((r) => r.features[key]);

      const baselineMean = mean(baselineValues);
      const baselineVar = variance(baselineValues, baselineMean);
      const currentMean = mean(recentValues);
      const currentVar = variance(recentValues, currentMean);

      const psi = computePSI(baselineValues, recentValues);

      entries.push({
        feature: key,
        baselineMean: round4(baselineMean),
        baselineVariance: round4(baselineVar),
        currentMean: round4(currentMean),
        currentVariance: round4(currentVar),
        psi: round4(psi),
        drifted: psi > psiThreshold,
      });
    }

    return {
      timestamp: Date.now(),
      totalFeatures: entries.length,
      driftedFeatures: entries.filter((e) => e.drifted).length,
      entries,
    };
  }

  /**
   * Export all collected feedback as labeled training data for model retraining.
   * Each record includes the full feature vector and the human-assigned label.
   */
  exportTrainingData(): {
    features: FraudFeatures;
    label: boolean;
    predictedScore: number;
    timestamp: number;
  }[] {
    return this.records.map((r) => ({
      features: { ...r.features },
      label: r.actualLabel,
      predictedScore: r.predictedScore,
      timestamp: r.timestamp,
    }));
  }

  /** Get the total number of feedback records collected. */
  size(): number {
    return this.records.length;
  }

  /** Clear all collected feedback (for testing). */
  reset(): void {
    this.records = [];
  }
}

// ─── Drift Detector ─────────────────────────────────────────────────────────

/**
 * Running statistics tracker for a single feature, using Welford's
 * online algorithm for numerically stable mean and variance updates.
 */
interface RunningStats {
  count: number;
  mean: number;
  m2: number; // Sum of squared differences from the mean
}

function createRunningStats(): RunningStats {
  return { count: 0, mean: 0, m2: 0 };
}

function updateRunningStats(stats: RunningStats, value: number): void {
  stats.count++;
  const delta = value - stats.mean;
  stats.mean += delta / stats.count;
  const delta2 = value - stats.mean;
  stats.m2 += delta * delta2;
}

function getVariance(stats: RunningStats): number {
  if (stats.count < 2) return 0;
  return stats.m2 / (stats.count - 1);
}

/**
 * Standalone drift detector that maintains running statistics for each
 * feature and detects distribution shifts using Population Stability Index.
 */
export class DriftDetector {
  private baselineStats = new Map<string, RunningStats>();
  private currentStats = new Map<string, RunningStats>();
  private baselineHistograms = new Map<string, number[]>();
  private currentHistograms = new Map<string, number[]>();
  private readonly numBins: number;
  private readonly psiThreshold: number;
  private baselineLocked = false;

  /**
   * @param numBins - Number of histogram bins for PSI computation (default 10).
   * @param psiThreshold - PSI above this value flags drift (default 0.2).
   */
  constructor(numBins = 10, psiThreshold = 0.2) {
    this.numBins = numBins;
    this.psiThreshold = psiThreshold;
  }

  /**
   * Feed a feature vector into the baseline distribution.
   * Call this during the initial calibration period.
   */
  addBaseline(features: FraudFeatures): void {
    if (this.baselineLocked) return;

    for (const key of FEATURE_KEYS) {
      if (!this.baselineStats.has(key)) {
        this.baselineStats.set(key, createRunningStats());
        this.baselineHistograms.set(key, new Array(this.numBins).fill(0));
      }
      const stats = this.baselineStats.get(key)!;
      updateRunningStats(stats, features[key]);
    }
  }

  /**
   * Lock the baseline distribution. After this, addBaseline() is a no-op
   * and addCurrent() can be used to track incoming data.
   */
  lockBaseline(): void {
    this.baselineLocked = true;

    // Build baseline histograms from running stats
    // (In a real system we would store actual value distributions;
    // here we use the mean and variance to create synthetic bins.)
    for (const key of FEATURE_KEYS) {
      const stats = this.baselineStats.get(key);
      if (!stats || stats.count === 0) continue;

      const sd = Math.sqrt(getVariance(stats));
      const histogram = new Array(this.numBins).fill(0);

      // Create a Gaussian-approximated histogram
      for (let i = 0; i < this.numBins; i++) {
        const binCenter =
          stats.mean + sd * ((i - this.numBins / 2 + 0.5) / (this.numBins / 4));
        // Approximate density
        const z = (binCenter - stats.mean) / (sd || 1);
        histogram[i] = Math.exp(-0.5 * z * z) * stats.count;
      }

      // Normalize to proportions
      const total = histogram.reduce((s: number, v: number) => s + v, 0);
      if (total > 0) {
        for (let i = 0; i < histogram.length; i++) {
          histogram[i] /= total;
        }
      }

      this.baselineHistograms.set(key, histogram);
    }
  }

  /**
   * Feed a feature vector into the current (production) distribution.
   */
  addCurrent(features: FraudFeatures): void {
    for (const key of FEATURE_KEYS) {
      if (!this.currentStats.has(key)) {
        this.currentStats.set(key, createRunningStats());
        this.currentHistograms.set(key, new Array(this.numBins).fill(0));
      }
      const stats = this.currentStats.get(key)!;
      updateRunningStats(stats, features[key]);
    }
  }

  /**
   * Check drift for all features using PSI.
   * Returns a list of features that have drifted beyond the threshold.
   */
  checkDrift(): string[] {
    const drifted: string[] = [];
    for (const key of FEATURE_KEYS) {
      const baseStats = this.baselineStats.get(key);
      const currStats = this.currentStats.get(key);

      if (!baseStats || !currStats || baseStats.count < 10 || currStats.count < 10) {
        continue;
      }

      const psi = this.computeFeaturePSI(key);
      if (psi > this.psiThreshold) {
        drifted.push(key);
      }
    }
    return drifted;
  }

  /**
   * Full drift report with per-feature statistics and PSI values.
   */
  getReport(): DriftReport {
    const entries: FeatureDriftEntry[] = [];

    for (const key of FEATURE_KEYS) {
      const baseStats = this.baselineStats.get(key);
      const currStats = this.currentStats.get(key);

      const baselineMean = baseStats?.mean ?? 0;
      const baselineVariance = baseStats ? getVariance(baseStats) : 0;
      const currentMean = currStats?.mean ?? 0;
      const currentVariance = currStats ? getVariance(currStats) : 0;

      const psi = this.computeFeaturePSI(key);

      entries.push({
        feature: key,
        baselineMean: round4(baselineMean),
        baselineVariance: round4(baselineVariance),
        currentMean: round4(currentMean),
        currentVariance: round4(currentVariance),
        psi: round4(psi),
        drifted: psi > this.psiThreshold,
      });
    }

    return {
      timestamp: Date.now(),
      totalFeatures: entries.length,
      driftedFeatures: entries.filter((e) => e.drifted).length,
      entries,
    };
  }

  /**
   * Compute PSI for a single feature by comparing baseline and current
   * distributions approximated as histograms from running stats.
   */
  private computeFeaturePSI(featureKey: string): number {
    const baseStats = this.baselineStats.get(featureKey);
    const currStats = this.currentStats.get(featureKey);

    if (
      !baseStats ||
      !currStats ||
      baseStats.count < 2 ||
      currStats.count < 2
    ) {
      return 0;
    }

    const baseMean = baseStats.mean;
    const baseSD = Math.sqrt(getVariance(baseStats)) || 1;
    const currMean = currStats.mean;
    const currSD = Math.sqrt(getVariance(currStats)) || 1;

    // Build bin proportions from Gaussian approximation
    const baseBins: number[] = [];
    const currBins: number[] = [];
    const epsilon = 1e-6; // Smoothing to avoid log(0)

    for (let i = 0; i < this.numBins; i++) {
      // Bin center in z-score space
      const z = (i - this.numBins / 2 + 0.5) / (this.numBins / 4);

      const baseZ = z; // baseline is reference distribution
      const currBinCenter = baseMean + baseSD * z;
      const currZ = (currBinCenter - currMean) / currSD;

      baseBins.push(Math.exp(-0.5 * baseZ * baseZ) + epsilon);
      currBins.push(Math.exp(-0.5 * currZ * currZ) + epsilon);
    }

    // Normalize to proportions
    const baseTotal = baseBins.reduce((s, v) => s + v, 0);
    const currTotal = currBins.reduce((s, v) => s + v, 0);

    let psi = 0;
    for (let i = 0; i < this.numBins; i++) {
      const p = baseBins[i] / baseTotal;
      const q = currBins[i] / currTotal;
      psi += (p - q) * Math.log(p / q);
    }

    return Math.abs(psi);
  }

  /** Reset all statistics (for testing). */
  reset(): void {
    this.baselineStats.clear();
    this.currentStats.clear();
    this.baselineHistograms.clear();
    this.currentHistograms.clear();
    this.baselineLocked = false;
  }
}

// ─── PSI Computation Helpers ────────────────────────────────────────────────

/** Compute Population Stability Index between two arrays of values. */
function computePSI(
  baseline: number[],
  current: number[],
  numBins = 10
): number {
  if (baseline.length === 0 || current.length === 0) return 0;

  const allValues = [...baseline, ...current];
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues);
  const range = maxVal - minVal;

  if (range === 0) return 0; // All values identical

  const binWidth = range / numBins;
  const epsilon = 1e-6;

  // Build histograms
  const baseHist = new Array(numBins).fill(0);
  const currHist = new Array(numBins).fill(0);

  for (const v of baseline) {
    const bin = Math.min(Math.floor((v - minVal) / binWidth), numBins - 1);
    baseHist[bin]++;
  }
  for (const v of current) {
    const bin = Math.min(Math.floor((v - minVal) / binWidth), numBins - 1);
    currHist[bin]++;
  }

  // Convert to proportions with smoothing
  let psi = 0;
  for (let i = 0; i < numBins; i++) {
    const p = baseHist[i] / baseline.length + epsilon;
    const q = currHist[i] / current.length + epsilon;
    psi += (p - q) * Math.log(p / q);
  }

  return Math.abs(psi);
}

/** Compute mean of an array. */
function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Compute variance of an array (sample variance). */
function variance(values: number[], mu?: number): number {
  if (values.length < 2) return 0;
  const m = mu ?? mean(values);
  return values.reduce((s, v) => s + (v - m) ** 2, 0) / (values.length - 1);
}

/** Round to 4 decimal places. */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

// ─── Convenience Factory ────────────────────────────────────────────────────

/**
 * Create a fully configured fraud detection pipeline with default settings.
 * Suitable for immediate use in API routes.
 *
 * @example
 * ```ts
 * import { createFraudPipeline } from "@/lib/ml/fraud-pipeline";
 *
 * const pipeline = createFraudPipeline();
 * const result = pipeline.scoreAndDecide(request, userContext);
 * console.log(result.decision); // "auto_approve" | "manual_review" | "auto_reject"
 * ```
 */
export function createFraudPipeline(options?: {
  thresholds?: DecisionThresholds;
}): FraudScoringPipeline {
  return new FraudScoringPipeline({
    model: new EnsembleModel(),
    thresholds: options?.thresholds,
  });
}

/**
 * Create a feedback-enabled pipeline that tracks predictions and outcomes.
 *
 * @example
 * ```ts
 * const { pipeline, feedback, drift } = createMonitoredPipeline();
 *
 * // Score submissions
 * const result = pipeline.scoreAndDecide(request, context);
 *
 * // After human review, record outcome
 * const features = pipeline.getExtractor().extract(request, context);
 * feedback.recordOutcome(request.submissionId, result.prediction.fraudScore, false, features);
 *
 * // Periodically check model health
 * const metrics = feedback.getModelAccuracy();
 * const driftReport = drift.getReport();
 * ```
 */
export function createMonitoredPipeline(options?: {
  thresholds?: DecisionThresholds;
  maxFeedbackRecords?: number;
  driftBins?: number;
  driftPsiThreshold?: number;
}): {
  pipeline: FraudScoringPipeline;
  feedback: FeedbackCollector;
  drift: DriftDetector;
} {
  return {
    pipeline: new FraudScoringPipeline({
      model: new EnsembleModel(),
      thresholds: options?.thresholds,
    }),
    feedback: new FeedbackCollector(options?.maxFeedbackRecords),
    drift: new DriftDetector(options?.driftBins, options?.driftPsiThreshold),
  };
}
