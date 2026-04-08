// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Trainable ML Fraud Scoring Model
// Logistic regression implemented from scratch with online and batch learning.
// No external ML libraries. Features extracted from submission context.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SubmissionFeatures {
  accountAgeDays: number;
  submissionCount: number;
  approvalRate: number;
  rejectionCount: number;
  timeSinceLastSubmission: number; // minutes
  uniqueCampaigns: number;
  sameCampaignCount: number;
  proofUrlLength: number;
  isHttps: boolean;
  platformDomainMatch: boolean;
  hasNotes: boolean;
  hourOfDay: number; // 0-23
  dayOfWeek: number; // 0-6
  contentLength: number;
  isReviewAction: boolean;
  followerCount: number;
  engagementRate: number;
}

export interface TrainingResult {
  epochs: number;
  finalLoss: number;
  initialLoss: number;
  accuracy: number;
  samplesProcessed: number;
  convergenceHistory: number[]; // loss per epoch
}

export interface ModelWeights {
  weights: number[];
  bias: number;
  featureNames: string[];
  featureMin: number[];
  featureMax: number[];
}

// ─── Feature Configuration ─────────────────────────────────────────────────

const FEATURE_NAMES: string[] = [
  "accountAgeDays",
  "submissionCount",
  "approvalRate",
  "rejectionCount",
  "timeSinceLastSubmission",
  "uniqueCampaigns",
  "sameCampaignCount",
  "proofUrlLength",
  "isHttps",
  "platformDomainMatch",
  "hasNotes",
  "hourOfDay",
  "dayOfWeek",
  "contentLength",
  "isReviewAction",
  "followerCount",
  "engagementRate",
];

const NUM_FEATURES = FEATURE_NAMES.length;

// ─── Utility Functions ─────────────────────────────────────────────────────

/** Sigmoid activation: maps any real number to (0, 1). */
export function sigmoid(x: number): number {
  const clamped = Math.max(-500, Math.min(500, x));
  return 1 / (1 + Math.exp(-clamped));
}

/** Binary cross-entropy loss for a single sample. */
export function binaryCrossEntropy(predicted: number, actual: number): number {
  const eps = 1e-15;
  const p = Math.max(eps, Math.min(1 - eps, predicted));
  return -(actual * Math.log(p) + (1 - actual) * Math.log(1 - p));
}

// ─── Fraud Model ───────────────────────────────────────────────────────────

/**
 * Trainable logistic regression fraud scoring model.
 *
 * Implements from-scratch gradient descent with:
 * - Min-max feature normalization to [0, 1]
 * - Online learning (single sample weight updates)
 * - Batch training with configurable epochs and learning rate
 * - Model weight export/import for persistence
 */
export class FraudModel {
  private weights: number[];
  private bias: number;
  private featureNames: string[];
  private featureMin: number[];
  private featureMax: number[];

  constructor() {
    this.featureNames = [...FEATURE_NAMES];
    this.weights = new Array(NUM_FEATURES).fill(0);
    this.bias = 0;

    // Default normalization ranges — updated during training
    this.featureMin = [
      0,    // accountAgeDays
      0,    // submissionCount
      0,    // approvalRate
      0,    // rejectionCount
      0,    // timeSinceLastSubmission
      0,    // uniqueCampaigns
      0,    // sameCampaignCount
      0,    // proofUrlLength
      0,    // isHttps
      0,    // platformDomainMatch
      0,    // hasNotes
      0,    // hourOfDay
      0,    // dayOfWeek
      0,    // contentLength
      0,    // isReviewAction
      0,    // followerCount
      0,    // engagementRate
    ];

    this.featureMax = [
      3650, // accountAgeDays (10 years)
      1000, // submissionCount
      1,    // approvalRate
      100,  // rejectionCount
      10080, // timeSinceLastSubmission (7 days in minutes)
      50,   // uniqueCampaigns
      20,   // sameCampaignCount
      2000, // proofUrlLength
      1,    // isHttps
      1,    // platformDomainMatch
      1,    // hasNotes
      23,   // hourOfDay
      6,    // dayOfWeek
      5000, // contentLength
      1,    // isReviewAction
      1000000, // followerCount
      1,    // engagementRate
    ];
  }

  /** Get the feature names this model expects. */
  getFeatureNames(): string[] {
    return [...this.featureNames];
  }

  /** Get the number of features. */
  getFeatureCount(): number {
    return NUM_FEATURES;
  }

  /**
   * Extract a numeric feature vector from a submission context.
   * All features are raw (unnormalized) — normalization happens in predict/train.
   */
  extractFeatures(submission: SubmissionFeatures): number[] {
    return [
      submission.accountAgeDays,
      submission.submissionCount,
      submission.approvalRate,
      submission.rejectionCount,
      submission.timeSinceLastSubmission,
      submission.uniqueCampaigns,
      submission.sameCampaignCount,
      submission.proofUrlLength,
      submission.isHttps ? 1 : 0,
      submission.platformDomainMatch ? 1 : 0,
      submission.hasNotes ? 1 : 0,
      submission.hourOfDay,
      submission.dayOfWeek,
      submission.contentLength,
      submission.isReviewAction ? 1 : 0,
      // Log-scale follower count to compress large values
      submission.followerCount > 0 ? Math.log10(submission.followerCount + 1) : 0,
      submission.engagementRate,
    ];
  }

  /**
   * Normalize a raw feature vector to [0, 1] using min-max scaling.
   */
  normalizeFeatures(features: number[]): number[] {
    const normalized = new Array(features.length);
    for (let i = 0; i < features.length; i++) {
      const range = this.featureMax[i] - this.featureMin[i];
      if (range === 0) {
        normalized[i] = 0;
      } else {
        normalized[i] = Math.max(0, Math.min(1,
          (features[i] - this.featureMin[i]) / range
        ));
      }
    }
    return normalized;
  }

  /**
   * Predict fraud probability for a feature vector.
   * Returns a value between 0 (legitimate) and 1 (fraudulent).
   */
  predict(features: number[]): number {
    const normalized = this.normalizeFeatures(features);
    let logit = this.bias;
    for (let i = 0; i < normalized.length; i++) {
      logit += this.weights[i] * normalized[i];
    }
    return sigmoid(logit);
  }

  /**
   * Convenience method: extract features from a submission and predict.
   */
  predictFromSubmission(submission: SubmissionFeatures): number {
    const features = this.extractFeatures(submission);
    return this.predict(features);
  }

  /**
   * Train on a single sample using gradient descent (online learning).
   * Updates weights in-place based on the gradient of binary cross-entropy.
   *
   * @param features - Raw feature vector
   * @param label - 0 for legitimate, 1 for fraudulent
   * @param learningRate - Step size for gradient descent
   */
  train(features: number[], label: 0 | 1, learningRate: number = 0.01): void {
    const normalized = this.normalizeFeatures(features);
    const predicted = this.predict(features);
    const error = predicted - label;

    // Gradient descent: w_i -= lr * error * x_i
    for (let i = 0; i < this.weights.length; i++) {
      this.weights[i] -= learningRate * error * normalized[i];
    }
    this.bias -= learningRate * error;
  }

  /**
   * Batch train on labeled data with multiple epochs.
   * Shuffles data each epoch and computes loss for convergence tracking.
   *
   * @param data - Array of { features, label } pairs
   * @param epochs - Number of passes over the full dataset
   * @param learningRate - Step size for gradient descent
   * @returns Training result with loss history and accuracy
   */
  batchTrain(
    data: { features: number[]; label: 0 | 1 }[],
    epochs: number = 50,
    learningRate: number = 0.1
  ): TrainingResult {
    if (data.length === 0) {
      return {
        epochs: 0,
        finalLoss: 0,
        initialLoss: 0,
        accuracy: 0,
        samplesProcessed: 0,
        convergenceHistory: [],
      };
    }

    // Update normalization ranges from training data
    this.updateNormalizationRanges(data.map((d) => d.features));

    const convergenceHistory: number[] = [];
    let initialLoss = 0;

    for (let epoch = 0; epoch < epochs; epoch++) {
      // Shuffle data each epoch (Fisher-Yates)
      const shuffled = [...data];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      let epochLoss = 0;

      for (const sample of shuffled) {
        const predicted = this.predict(sample.features);
        epochLoss += binaryCrossEntropy(predicted, sample.label);
        this.train(sample.features, sample.label, learningRate);
      }

      const avgLoss = epochLoss / shuffled.length;
      convergenceHistory.push(avgLoss);

      if (epoch === 0) {
        initialLoss = avgLoss;
      }
    }

    // Compute final accuracy
    let correct = 0;
    for (const sample of data) {
      const predicted = this.predict(sample.features);
      const predictedLabel = predicted >= 0.5 ? 1 : 0;
      if (predictedLabel === sample.label) {
        correct++;
      }
    }

    return {
      epochs,
      finalLoss: convergenceHistory[convergenceHistory.length - 1],
      initialLoss,
      accuracy: correct / data.length,
      samplesProcessed: data.length * epochs,
      convergenceHistory,
    };
  }

  /**
   * Export model weights and normalization parameters for persistence.
   */
  exportWeights(): ModelWeights {
    return {
      weights: [...this.weights],
      bias: this.bias,
      featureNames: [...this.featureNames],
      featureMin: [...this.featureMin],
      featureMax: [...this.featureMax],
    };
  }

  /**
   * Import previously exported model weights.
   */
  importWeights(data: ModelWeights): void {
    if (data.weights.length !== NUM_FEATURES) {
      throw new Error(
        `Weight dimension mismatch: expected ${NUM_FEATURES}, got ${data.weights.length}`
      );
    }
    this.weights = [...data.weights];
    this.bias = data.bias;
    this.featureNames = [...data.featureNames];
    if (data.featureMin) {
      this.featureMin = [...data.featureMin];
    }
    if (data.featureMax) {
      this.featureMax = [...data.featureMax];
    }
  }

  /**
   * Get feature importance as absolute weight magnitude, normalized to sum to 1.
   */
  getFeatureImportance(): Record<string, number> {
    const totalAbsWeight = this.weights.reduce((s, w) => s + Math.abs(w), 0);
    const importance: Record<string, number> = {};
    for (let i = 0; i < this.featureNames.length; i++) {
      importance[this.featureNames[i]] =
        totalAbsWeight > 0 ? Math.abs(this.weights[i]) / totalAbsWeight : 0;
    }
    return importance;
  }

  /**
   * Get raw weights for debugging/inspection.
   */
  getRawWeights(): { feature: string; weight: number }[] {
    return this.featureNames.map((name, i) => ({
      feature: name,
      weight: this.weights[i],
    }));
  }

  /**
   * Update min/max normalization ranges from observed training data.
   * Expands ranges to cover the data; never shrinks them.
   */
  private updateNormalizationRanges(allFeatures: number[][]): void {
    for (const features of allFeatures) {
      for (let i = 0; i < features.length; i++) {
        if (features[i] < this.featureMin[i]) {
          this.featureMin[i] = features[i];
        }
        if (features[i] > this.featureMax[i]) {
          this.featureMax[i] = features[i];
        }
      }
    }
  }
}
