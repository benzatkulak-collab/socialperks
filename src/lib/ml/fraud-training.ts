// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — ML Fraud Model Training Pipeline
// Generates synthetic labeled training data based on rule-based fraud patterns,
// trains the logistic regression model, and evaluates precision/recall/F1/AUC.
// ══════════════════════════════════════════════════════════════════════════════

import {
  FraudModel,
  type SubmissionFeatures,
  type TrainingResult,
} from "./fraud-model";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EvaluationResult {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
  truePositives: number;
  falsePositives: number;
  trueNegatives: number;
  falseNegatives: number;
  totalSamples: number;
}

export interface TrainingPipelineResult {
  trainingResult: TrainingResult;
  evaluation: EvaluationResult;
  trainSize: number;
  testSize: number;
}

// ─── Seeded Random Number Generator ────────────────────────────────────────

/**
 * Simple mulberry32 PRNG for reproducible synthetic data generation.
 * Accepts a numeric seed and returns a function producing values in [0, 1).
 */
function seededRandom(seed: number): () => number {
  let state = seed | 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Synthetic Data Generation ─────────────────────────────────────────────

/**
 * Platform domains for domain-match simulation.
 */
const PLATFORM_DOMAINS: Record<string, string> = {
  ig: "instagram.com",
  tt: "tiktok.com",
  yt: "youtube.com",
  tw: "twitter.com",
  fb: "facebook.com",
  li: "linkedin.com",
  pi: "pinterest.com",
  rd: "reddit.com",
  gm: "google.com",
  yl: "yelp.com",
};

const PLATFORMS = Object.keys(PLATFORM_DOMAINS);

/**
 * Generate a single synthetic submission with features that match
 * either a legitimate or fraudulent pattern.
 */
function generateLegitimateSubmission(rand: () => number): SubmissionFeatures {
  const platform = PLATFORMS[Math.floor(rand() * PLATFORMS.length)];
  // domain used for URL generation context
  void PLATFORM_DOMAINS[platform];
  const urlLength = 40 + Math.floor(rand() * 60); // 40-100 chars

  return {
    accountAgeDays: 30 + Math.floor(rand() * 700),     // 30-730 days old
    submissionCount: 5 + Math.floor(rand() * 50),       // 5-55 submissions
    approvalRate: 0.7 + rand() * 0.3,                   // 70-100% approval
    rejectionCount: Math.floor(rand() * 3),              // 0-2 rejections
    timeSinceLastSubmission: 60 + Math.floor(rand() * 2880), // 1h-48h
    uniqueCampaigns: 3 + Math.floor(rand() * 15),       // 3-18 campaigns
    sameCampaignCount: 1 + Math.floor(rand() * 3),      // 1-3 per campaign
    proofUrlLength: urlLength,
    isHttps: true,                                       // Almost always HTTPS
    platformDomainMatch: rand() > 0.05,                  // 95% match
    hasNotes: rand() > 0.3,                              // 70% have notes
    hourOfDay: 8 + Math.floor(rand() * 14),              // 8am-10pm
    dayOfWeek: Math.floor(rand() * 7),
    contentLength: 50 + Math.floor(rand() * 500),        // 50-550 chars
    isReviewAction: rand() > 0.7,                        // 30% are reviews
    followerCount: 100 + Math.floor(rand() * 50000),     // 100-50k followers
    engagementRate: 0.01 + rand() * 0.08,                // 1-9% engagement
  };
}

function generateFraudulentSubmission(rand: () => number): SubmissionFeatures {
  // Fraud comes in different flavors — randomize the fraud pattern
  const fraudType = rand();

  if (fraudType < 0.25) {
    // New account spam: very new account, high volume, low quality
    return {
      accountAgeDays: Math.floor(rand() * 3),            // 0-2 days old
      submissionCount: 20 + Math.floor(rand() * 100),    // High volume
      approvalRate: rand() * 0.3,                         // 0-30% approval
      rejectionCount: 10 + Math.floor(rand() * 30),      // Many rejections
      timeSinceLastSubmission: Math.floor(rand() * 5),   // 0-5 minutes
      uniqueCampaigns: 10 + Math.floor(rand() * 30),     // Spray across campaigns
      sameCampaignCount: 5 + Math.floor(rand() * 15),    // Repeated per campaign
      proofUrlLength: 10 + Math.floor(rand() * 15),      // Very short URLs
      isHttps: rand() > 0.5,                              // 50% HTTP
      platformDomainMatch: rand() > 0.7,                  // 30% mismatch
      hasNotes: rand() > 0.8,                             // Rarely notes
      hourOfDay: Math.floor(rand() * 24),                 // Any hour
      dayOfWeek: Math.floor(rand() * 7),
      contentLength: Math.floor(rand() * 15),             // Very short
      isReviewAction: rand() > 0.5,
      followerCount: Math.floor(rand() * 50),             // Very few followers
      engagementRate: rand() * 0.005,                     // Near zero engagement
    };
  } else if (fraudType < 0.5) {
    // Bot pattern: regular timing, domain mismatch
    return {
      accountAgeDays: 5 + Math.floor(rand() * 20),       // 5-25 days
      submissionCount: 50 + Math.floor(rand() * 200),    // Very high volume
      approvalRate: 0.1 + rand() * 0.3,                  // 10-40% approval
      rejectionCount: 15 + Math.floor(rand() * 40),
      timeSinceLastSubmission: 1 + Math.floor(rand() * 3), // 1-3 min intervals
      uniqueCampaigns: 1 + Math.floor(rand() * 3),       // Few campaigns
      sameCampaignCount: 20 + Math.floor(rand() * 50),   // Many per campaign
      proofUrlLength: 200 + Math.floor(rand() * 300),    // Very long URLs
      isHttps: rand() > 0.4,
      platformDomainMatch: false,                          // Wrong domain
      hasNotes: false,                                     // No notes
      hourOfDay: 1 + Math.floor(rand() * 5),              // Middle of night
      dayOfWeek: Math.floor(rand() * 7),
      contentLength: 5 + Math.floor(rand() * 10),         // Minimal content
      isReviewAction: false,
      followerCount: Math.floor(rand() * 20),
      engagementRate: 0,
    };
  } else if (fraudType < 0.75) {
    // Self-review / fake engagement: moderate account, odd patterns
    return {
      accountAgeDays: 10 + Math.floor(rand() * 60),
      submissionCount: 10 + Math.floor(rand() * 30),
      approvalRate: 0.2 + rand() * 0.3,                  // 20-50% approval
      rejectionCount: 5 + Math.floor(rand() * 15),
      timeSinceLastSubmission: 5 + Math.floor(rand() * 30),
      uniqueCampaigns: 1 + Math.floor(rand() * 2),       // Very few campaigns
      sameCampaignCount: 8 + Math.floor(rand() * 20),    // Many per campaign
      proofUrlLength: 20 + Math.floor(rand() * 30),      // Short
      isHttps: true,
      platformDomainMatch: rand() > 0.4,                  // 40% mismatch
      hasNotes: rand() > 0.6,
      hourOfDay: Math.floor(rand() * 24),
      dayOfWeek: Math.floor(rand() * 7),
      contentLength: 10 + Math.floor(rand() * 40),        // Short content
      isReviewAction: true,                                // Reviews
      followerCount: 50 + Math.floor(rand() * 200),
      engagementRate: rand() * 0.02,
    };
  } else {
    // Sophisticated fraud: looks semi-legitimate but has telltale signals
    return {
      accountAgeDays: 15 + Math.floor(rand() * 100),
      submissionCount: 15 + Math.floor(rand() * 40),
      approvalRate: 0.3 + rand() * 0.3,                  // 30-60% approval
      rejectionCount: 5 + Math.floor(rand() * 10),
      timeSinceLastSubmission: 10 + Math.floor(rand() * 60),
      uniqueCampaigns: 2 + Math.floor(rand() * 5),
      sameCampaignCount: 5 + Math.floor(rand() * 10),
      proofUrlLength: 30 + Math.floor(rand() * 50),
      isHttps: rand() > 0.2,
      platformDomainMatch: rand() > 0.5,                  // 50% mismatch
      hasNotes: rand() > 0.5,
      hourOfDay: Math.floor(rand() * 24),
      dayOfWeek: Math.floor(rand() * 7),
      contentLength: 20 + Math.floor(rand() * 100),
      isReviewAction: rand() > 0.5,
      followerCount: 10 + Math.floor(rand() * 500),
      engagementRate: rand() * 0.03,
    };
  }
}

/**
 * Generate synthetic labeled training data.
 *
 * Produces ~80% legitimate and ~20% fraudulent samples with realistic
 * distributions matching the rule-based fraud signals in fraud-detection.ts.
 *
 * @param count - Total number of samples to generate
 * @param seed - Random seed for reproducibility (optional)
 * @returns Array of { features, label } pairs
 */
export function generateTrainingData(
  count: number = 1000,
  seed: number = 42
): { features: SubmissionFeatures; label: 0 | 1 }[] {
  const rand = seededRandom(seed);
  const data: { features: SubmissionFeatures; label: 0 | 1 }[] = [];

  const fraudCount = Math.floor(count * 0.2);
  const legitimateCount = count - fraudCount;

  // Generate legitimate samples
  for (let i = 0; i < legitimateCount; i++) {
    data.push({
      features: generateLegitimateSubmission(rand),
      label: 0,
    });
  }

  // Generate fraudulent samples
  for (let i = 0; i < fraudCount; i++) {
    data.push({
      features: generateFraudulentSubmission(rand),
      label: 1,
    });
  }

  // Shuffle the dataset
  for (let i = data.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [data[i], data[j]] = [data[j], data[i]];
  }

  return data;
}

// ─── Training Pipeline ─────────────────────────────────────────────────────

/**
 * Train a FraudModel on synthetic data generated from rule-based patterns.
 *
 * Splits data 80/20 into train/test sets, trains the model, and returns
 * both training metrics and test set evaluation.
 *
 * @param sampleCount - Number of synthetic samples to generate
 * @param epochs - Number of training epochs
 * @param learningRate - Learning rate for gradient descent
 * @param seed - Random seed for reproducibility
 */
export function trainModel(
  sampleCount: number = 1000,
  epochs: number = 100,
  learningRate: number = 0.5,
  seed: number = 42
): { model: FraudModel; result: TrainingPipelineResult } {
  const model = new FraudModel();
  const rawData = generateTrainingData(sampleCount, seed);

  // Convert SubmissionFeatures to numeric vectors
  const numericData = rawData.map((d) => ({
    features: model.extractFeatures(d.features),
    label: d.label,
  }));

  // Split 80/20
  const splitIndex = Math.floor(numericData.length * 0.8);
  const trainData = numericData.slice(0, splitIndex);
  const testData = numericData.slice(splitIndex);

  // Train
  const trainingResult = model.batchTrain(trainData, epochs, learningRate);

  // Evaluate on test set
  const evaluation = evaluateModel(model, testData);

  return {
    model,
    result: {
      trainingResult,
      evaluation,
      trainSize: trainData.length,
      testSize: testData.length,
    },
  };
}

// ─── Evaluation ────────────────────────────────────────────────────────────

/**
 * Evaluate model performance on a labeled test set.
 * Computes accuracy, precision, recall, F1, and AUC approximation.
 */
export function evaluateModel(
  model: FraudModel,
  testData: { features: number[]; label: 0 | 1 }[]
): EvaluationResult {
  let tp = 0; // true positives
  let fp = 0; // false positives
  let tn = 0; // true negatives
  let fn = 0; // false negatives

  // Collect predictions for AUC computation
  const predictions: { score: number; label: 0 | 1 }[] = [];

  for (const sample of testData) {
    const score = model.predict(sample.features);
    const predictedLabel = score >= 0.5 ? 1 : 0;
    predictions.push({ score, label: sample.label });

    if (predictedLabel === 1 && sample.label === 1) tp++;
    else if (predictedLabel === 1 && sample.label === 0) fp++;
    else if (predictedLabel === 0 && sample.label === 0) tn++;
    else fn++;
  }

  const accuracy = testData.length > 0 ? (tp + tn) / testData.length : 0;
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
  const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
  const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
  const auc = computeAUC(predictions);

  return {
    accuracy,
    precision,
    recall,
    f1,
    auc,
    truePositives: tp,
    falsePositives: fp,
    trueNegatives: tn,
    falseNegatives: fn,
    totalSamples: testData.length,
  };
}

/**
 * Approximate AUC (Area Under ROC Curve) using the trapezoidal rule.
 *
 * Sorts predictions by score descending, sweeps the threshold from
 * high to low, and integrates the resulting ROC curve.
 */
function computeAUC(predictions: { score: number; label: 0 | 1 }[]): number {
  if (predictions.length === 0) return 0;

  // Sort by score descending
  const sorted = [...predictions].sort((a, b) => b.score - a.score);

  const totalPositives = sorted.filter((p) => p.label === 1).length;
  const totalNegatives = sorted.filter((p) => p.label === 0).length;

  if (totalPositives === 0 || totalNegatives === 0) return 0;

  let auc = 0;
  let tpCount = 0;
  let fpCount = 0;
  let prevTPR = 0;
  let prevFPR = 0;

  for (const pred of sorted) {
    if (pred.label === 1) {
      tpCount++;
    } else {
      fpCount++;
    }

    const tpr = tpCount / totalPositives;
    const fpr = fpCount / totalNegatives;

    // Trapezoidal integration
    auc += (fpr - prevFPR) * (tpr + prevTPR) / 2;

    prevTPR = tpr;
    prevFPR = fpr;
  }

  return auc;
}
