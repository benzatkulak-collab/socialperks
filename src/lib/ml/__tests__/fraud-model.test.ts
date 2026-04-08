import { describe, it, expect, beforeEach } from "vitest";
import {
  FraudModel,
  sigmoid,
  binaryCrossEntropy,
  type SubmissionFeatures,
} from "../fraud-model";
import {
  generateTrainingData,
  trainModel,
  evaluateModel,
} from "../fraud-training";

// ─── Helpers ────────────────────────────────────────────────────────────────

function makeLegitimateSubmission(): SubmissionFeatures {
  return {
    accountAgeDays: 365,
    submissionCount: 20,
    approvalRate: 0.9,
    rejectionCount: 1,
    timeSinceLastSubmission: 1440,
    uniqueCampaigns: 8,
    sameCampaignCount: 2,
    proofUrlLength: 80,
    isHttps: true,
    platformDomainMatch: true,
    hasNotes: true,
    hourOfDay: 14,
    dayOfWeek: 3,
    contentLength: 250,
    isReviewAction: false,
    followerCount: 5000,
    engagementRate: 0.04,
  };
}

function makeFraudulentSubmission(): SubmissionFeatures {
  return {
    accountAgeDays: 1,
    submissionCount: 80,
    approvalRate: 0.1,
    rejectionCount: 30,
    timeSinceLastSubmission: 2,
    uniqueCampaigns: 25,
    sameCampaignCount: 15,
    proofUrlLength: 12,
    isHttps: false,
    platformDomainMatch: false,
    hasNotes: false,
    hourOfDay: 3,
    dayOfWeek: 6,
    contentLength: 5,
    isReviewAction: false,
    followerCount: 10,
    engagementRate: 0.001,
  };
}

// ─── Sigmoid Tests ──────────────────────────────────────────────────────────

describe("sigmoid", () => {
  it("returns 0.5 for input 0", () => {
    expect(sigmoid(0)).toBe(0.5);
  });

  it("returns a value close to 1 for large positive input", () => {
    expect(sigmoid(10)).toBeGreaterThan(0.999);
    expect(sigmoid(10)).toBeLessThanOrEqual(1);
  });

  it("returns a value close to 0 for large negative input", () => {
    expect(sigmoid(-10)).toBeLessThan(0.001);
    expect(sigmoid(-10)).toBeGreaterThanOrEqual(0);
  });

  it("is monotonically increasing", () => {
    const values = [-5, -2, -1, 0, 1, 2, 5];
    for (let i = 1; i < values.length; i++) {
      expect(sigmoid(values[i])).toBeGreaterThan(sigmoid(values[i - 1]));
    }
  });

  it("handles extreme values without NaN", () => {
    expect(Number.isNaN(sigmoid(1000))).toBe(false);
    expect(Number.isNaN(sigmoid(-1000))).toBe(false);
    expect(sigmoid(1000)).toBeCloseTo(1, 5);
    expect(sigmoid(-1000)).toBeCloseTo(0, 5);
  });
});

// ─── Feature Extraction Tests ───────────────────────────────────────────────

describe("FraudModel.extractFeatures", () => {
  let model: FraudModel;

  beforeEach(() => {
    model = new FraudModel();
  });

  it("produces the correct number of features", () => {
    const submission = makeLegitimateSubmission();
    const features = model.extractFeatures(submission);
    expect(features).toHaveLength(model.getFeatureCount());
    expect(features).toHaveLength(17);
  });

  it("produces numeric values only", () => {
    const features = model.extractFeatures(makeLegitimateSubmission());
    for (const f of features) {
      expect(typeof f).toBe("number");
      expect(Number.isNaN(f)).toBe(false);
      expect(Number.isFinite(f)).toBe(true);
    }
  });

  it("converts boolean fields to 0/1", () => {
    const trueSubmission = makeLegitimateSubmission();
    trueSubmission.isHttps = true;
    trueSubmission.platformDomainMatch = true;
    trueSubmission.hasNotes = true;
    trueSubmission.isReviewAction = true;

    const features = model.extractFeatures(trueSubmission);
    // isHttps is at index 8, platformDomainMatch at 9, hasNotes at 10, isReviewAction at 14
    expect(features[8]).toBe(1);
    expect(features[9]).toBe(1);
    expect(features[10]).toBe(1);
    expect(features[14]).toBe(1);

    const falseSubmission = makeLegitimateSubmission();
    falseSubmission.isHttps = false;
    falseSubmission.platformDomainMatch = false;
    falseSubmission.hasNotes = false;
    falseSubmission.isReviewAction = false;

    const falseFeatures = model.extractFeatures(falseSubmission);
    expect(falseFeatures[8]).toBe(0);
    expect(falseFeatures[9]).toBe(0);
    expect(falseFeatures[10]).toBe(0);
    expect(falseFeatures[14]).toBe(0);
  });

  it("log-scales follower count", () => {
    const submission = makeLegitimateSubmission();
    submission.followerCount = 10000;
    const features = model.extractFeatures(submission);

    // followerCount is at index 15, should be log10(10001) ~ 4.0
    expect(features[15]).toBeGreaterThan(3.9);
    expect(features[15]).toBeLessThan(4.1);
  });

  it("handles zero follower count", () => {
    const submission = makeLegitimateSubmission();
    submission.followerCount = 0;
    const features = model.extractFeatures(submission);
    expect(features[15]).toBe(0);
  });
});

// ─── Feature Normalization Tests ────────────────────────────────────────────

describe("FraudModel.normalizeFeatures", () => {
  let model: FraudModel;

  beforeEach(() => {
    model = new FraudModel();
  });

  it("normalizes features to 0-1 range", () => {
    const features = model.extractFeatures(makeLegitimateSubmission());
    const normalized = model.normalizeFeatures(features);

    for (const n of normalized) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it("clamps values outside the expected range", () => {
    // Create features with extreme values
    const extreme: SubmissionFeatures = {
      accountAgeDays: 50000,
      submissionCount: 100000,
      approvalRate: 2, // Invalid but should clamp
      rejectionCount: 10000,
      timeSinceLastSubmission: 999999,
      uniqueCampaigns: 10000,
      sameCampaignCount: 10000,
      proofUrlLength: 100000,
      isHttps: true,
      platformDomainMatch: true,
      hasNotes: true,
      hourOfDay: 23,
      dayOfWeek: 6,
      contentLength: 100000,
      isReviewAction: true,
      followerCount: 10000000,
      engagementRate: 5,
    };
    const features = model.extractFeatures(extreme);
    const normalized = model.normalizeFeatures(features);

    for (const n of normalized) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Prediction Tests ──────────────────────────────────────────────────────

describe("FraudModel.predict", () => {
  let model: FraudModel;

  beforeEach(() => {
    model = new FraudModel();
  });

  it("returns a value between 0 and 1", () => {
    const features = model.extractFeatures(makeLegitimateSubmission());
    const score = model.predict(features);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("returns a value between 0 and 1 for fraudulent input", () => {
    const features = model.extractFeatures(makeFraudulentSubmission());
    const score = model.predict(features);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it("never returns NaN", () => {
    const features = model.extractFeatures(makeLegitimateSubmission());
    expect(Number.isNaN(model.predict(features))).toBe(false);

    const fraudFeatures = model.extractFeatures(makeFraudulentSubmission());
    expect(Number.isNaN(model.predict(fraudFeatures))).toBe(false);
  });
});

// ─── Single Sample Training Tests ──────────────────────────────────────────

describe("FraudModel.train (single sample)", () => {
  let model: FraudModel;

  beforeEach(() => {
    model = new FraudModel();
  });

  it("updates weights after training on one sample", () => {
    const weightsBefore = model.exportWeights().weights.slice();
    const features = model.extractFeatures(makeFraudulentSubmission());

    model.train(features, 1, 0.1);

    const weightsAfter = model.exportWeights().weights;
    const changed = weightsBefore.some((w, i) => w !== weightsAfter[i]);
    expect(changed).toBe(true);
  });

  it("updates bias after training on one sample", () => {
    const biasBefore = model.exportWeights().bias;
    const features = model.extractFeatures(makeFraudulentSubmission());

    model.train(features, 1, 0.1);

    const biasAfter = model.exportWeights().bias;
    expect(biasAfter).not.toBe(biasBefore);
  });

  it("moves prediction toward the label", () => {
    const features = model.extractFeatures(makeFraudulentSubmission());
    const scoreBefore = model.predict(features);

    // Train several times toward label 1 (fraud)
    for (let i = 0; i < 20; i++) {
      model.train(features, 1, 0.5);
    }

    const scoreAfter = model.predict(features);
    expect(scoreAfter).toBeGreaterThan(scoreBefore);
  });
});

// ─── Batch Training Tests ──────────────────────────────────────────────────

describe("FraudModel.batchTrain", () => {
  it("reduces loss over epochs", () => {
    const model = new FraudModel();
    const data = generateTrainingData(200, 42);
    const numericData = data.map((d) => ({
      features: model.extractFeatures(d.features),
      label: d.label,
    }));

    const result = model.batchTrain(numericData, 50, 0.5);

    expect(result.finalLoss).toBeLessThan(result.initialLoss);
    expect(result.convergenceHistory).toHaveLength(50);
  });

  it("achieves reasonable accuracy on training data", () => {
    const model = new FraudModel();
    const data = generateTrainingData(500, 42);
    const numericData = data.map((d) => ({
      features: model.extractFeatures(d.features),
      label: d.label,
    }));

    const result = model.batchTrain(numericData, 100, 0.5);

    // Should achieve at least 70% accuracy on well-separated synthetic data
    expect(result.accuracy).toBeGreaterThan(0.7);
  });

  it("handles empty data gracefully", () => {
    const model = new FraudModel();
    const result = model.batchTrain([], 10, 0.1);

    expect(result.epochs).toBe(0);
    expect(result.samplesProcessed).toBe(0);
    expect(result.finalLoss).toBe(0);
  });

  it("records convergence history for each epoch", () => {
    const model = new FraudModel();
    const data = generateTrainingData(100, 99);
    const numericData = data.map((d) => ({
      features: model.extractFeatures(d.features),
      label: d.label,
    }));

    const result = model.batchTrain(numericData, 20, 0.3);

    expect(result.convergenceHistory).toHaveLength(20);
    for (const loss of result.convergenceHistory) {
      expect(Number.isFinite(loss)).toBe(true);
      expect(loss).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Trained Model: Fraud vs Legitimate Discrimination ─────────────────────

describe("trained model discriminates fraud from legitimate", () => {
  it("scores fraudulent submissions higher than legitimate ones", () => {
    const { model } = trainModel(1000, 100, 0.5, 42);

    const legitScore = model.predictFromSubmission(makeLegitimateSubmission());
    const fraudScore = model.predictFromSubmission(makeFraudulentSubmission());

    expect(fraudScore).toBeGreaterThan(legitScore);
  });

  it("scores a clearly legitimate submission below 0.5", () => {
    const { model } = trainModel(1000, 100, 0.5, 42);
    const score = model.predictFromSubmission(makeLegitimateSubmission());
    expect(score).toBeLessThan(0.5);
  });

  it("scores a clearly fraudulent submission above 0.5", () => {
    const { model } = trainModel(1000, 100, 0.5, 42);
    const score = model.predictFromSubmission(makeFraudulentSubmission());
    expect(score).toBeGreaterThan(0.5);
  });
});

// ─── Model Export/Import Tests ─────────────────────────────────────────────

describe("FraudModel export/import", () => {
  it("preserves predictions after export and import", () => {
    const { model: original } = trainModel(500, 50, 0.5, 42);

    const legitFeatures = original.extractFeatures(makeLegitimateSubmission());
    const fraudFeatures = original.extractFeatures(makeFraudulentSubmission());
    const originalLegit = original.predict(legitFeatures);
    const originalFraud = original.predict(fraudFeatures);

    // Export and import into a new model
    const exported = original.exportWeights();
    const restored = new FraudModel();
    restored.importWeights(exported);

    const restoredLegit = restored.predict(legitFeatures);
    const restoredFraud = restored.predict(fraudFeatures);

    expect(restoredLegit).toBeCloseTo(originalLegit, 10);
    expect(restoredFraud).toBeCloseTo(originalFraud, 10);
  });

  it("rejects weights with wrong dimensions", () => {
    const model = new FraudModel();
    expect(() => {
      model.importWeights({
        weights: [1, 2, 3], // Wrong size
        bias: 0,
        featureNames: ["a", "b", "c"],
        featureMin: [0, 0, 0],
        featureMax: [1, 1, 1],
      });
    }).toThrow(/dimension mismatch/i);
  });

  it("exports feature names", () => {
    const model = new FraudModel();
    const exported = model.exportWeights();
    expect(exported.featureNames).toHaveLength(17);
    expect(exported.featureNames).toContain("accountAgeDays");
    expect(exported.featureNames).toContain("engagementRate");
  });

  it("exports normalization ranges", () => {
    const model = new FraudModel();
    const exported = model.exportWeights();
    expect(exported.featureMin).toHaveLength(17);
    expect(exported.featureMax).toHaveLength(17);
  });
});

// ─── Training Convergence on Separable Data ────────────────────────────────

describe("training convergence on linearly separable data", () => {
  it("achieves high accuracy on perfectly separable data", () => {
    const model = new FraudModel();

    // Create a simple separable dataset:
    // Fraud: high submission count, low approval, short time between submissions
    // Legit: low submission count, high approval, long time between submissions
    const data: { features: number[]; label: 0 | 1 }[] = [];

    for (let i = 0; i < 100; i++) {
      // Legitimate
      data.push({
        features: model.extractFeatures({
          accountAgeDays: 200 + i * 3,
          submissionCount: 5 + i % 10,
          approvalRate: 0.85 + (i % 15) * 0.01,
          rejectionCount: i % 2,
          timeSinceLastSubmission: 500 + i * 10,
          uniqueCampaigns: 5 + i % 8,
          sameCampaignCount: 1,
          proofUrlLength: 60 + i % 40,
          isHttps: true,
          platformDomainMatch: true,
          hasNotes: true,
          hourOfDay: 10 + i % 8,
          dayOfWeek: i % 5,
          contentLength: 100 + i * 3,
          isReviewAction: false,
          followerCount: 1000 + i * 100,
          engagementRate: 0.03 + (i % 5) * 0.01,
        }),
        label: 0,
      });

      // Fraudulent
      data.push({
        features: model.extractFeatures({
          accountAgeDays: i % 3,
          submissionCount: 50 + i * 2,
          approvalRate: 0.05 + (i % 10) * 0.01,
          rejectionCount: 20 + i % 20,
          timeSinceLastSubmission: 1 + i % 5,
          uniqueCampaigns: 15 + i % 10,
          sameCampaignCount: 10 + i % 10,
          proofUrlLength: 5 + i % 10,
          isHttps: false,
          platformDomainMatch: false,
          hasNotes: false,
          hourOfDay: 2 + i % 4,
          dayOfWeek: 6,
          contentLength: i % 10,
          isReviewAction: false,
          followerCount: i % 20,
          engagementRate: 0.001,
        }),
        label: 1,
      });
    }

    const result = model.batchTrain(data, 100, 0.5);

    // Should achieve very high accuracy on linearly separable data
    expect(result.accuracy).toBeGreaterThan(0.9);
    expect(result.finalLoss).toBeLessThan(result.initialLoss);
  });
});

// ─── Evaluation Metrics Tests ──────────────────────────────────────────────

describe("evaluateModel", () => {
  it("computes precision, recall, F1, and AUC", () => {
    const { model } = trainModel(800, 80, 0.5, 42);
    const testData = generateTrainingData(200, 99);
    const numericTestData = testData.map((d) => ({
      features: model.extractFeatures(d.features),
      label: d.label,
    }));

    const evaluation = evaluateModel(model, numericTestData);

    // All metrics should be between 0 and 1
    expect(evaluation.accuracy).toBeGreaterThanOrEqual(0);
    expect(evaluation.accuracy).toBeLessThanOrEqual(1);
    expect(evaluation.precision).toBeGreaterThanOrEqual(0);
    expect(evaluation.precision).toBeLessThanOrEqual(1);
    expect(evaluation.recall).toBeGreaterThanOrEqual(0);
    expect(evaluation.recall).toBeLessThanOrEqual(1);
    expect(evaluation.f1).toBeGreaterThanOrEqual(0);
    expect(evaluation.f1).toBeLessThanOrEqual(1);
    expect(evaluation.auc).toBeGreaterThanOrEqual(0);
    expect(evaluation.auc).toBeLessThanOrEqual(1);

    // Confusion matrix should add up to total samples
    const totalFromMatrix =
      evaluation.truePositives +
      evaluation.falsePositives +
      evaluation.trueNegatives +
      evaluation.falseNegatives;
    expect(totalFromMatrix).toBe(evaluation.totalSamples);
  });

  it("achieves reasonable F1 on synthetic test data", () => {
    const { model } = trainModel(1000, 100, 0.5, 42);
    const testData = generateTrainingData(300, 123);
    const numericTestData = testData.map((d) => ({
      features: model.extractFeatures(d.features),
      label: d.label,
    }));

    const evaluation = evaluateModel(model, numericTestData);

    // With well-separated synthetic data, F1 should be decent
    expect(evaluation.f1).toBeGreaterThan(0.5);
  });

  it("achieves AUC greater than random (0.5)", () => {
    const { model } = trainModel(1000, 100, 0.5, 42);
    const testData = generateTrainingData(300, 77);
    const numericTestData = testData.map((d) => ({
      features: model.extractFeatures(d.features),
      label: d.label,
    }));

    const evaluation = evaluateModel(model, numericTestData);

    // AUC should be substantially better than random
    expect(evaluation.auc).toBeGreaterThan(0.6);
  });
});

// ─── Binary Cross Entropy Tests ────────────────────────────────────────────

describe("binaryCrossEntropy", () => {
  it("returns near 0 for correct confident predictions", () => {
    expect(binaryCrossEntropy(0.99, 1)).toBeLessThan(0.02);
    expect(binaryCrossEntropy(0.01, 0)).toBeLessThan(0.02);
  });

  it("returns high loss for incorrect confident predictions", () => {
    expect(binaryCrossEntropy(0.99, 0)).toBeGreaterThan(2);
    expect(binaryCrossEntropy(0.01, 1)).toBeGreaterThan(2);
  });

  it("is always non-negative", () => {
    for (const p of [0.01, 0.1, 0.3, 0.5, 0.7, 0.9, 0.99]) {
      for (const y of [0, 1]) {
        expect(binaryCrossEntropy(p, y)).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

// ─── Synthetic Data Generation Tests ───────────────────────────────────────

describe("generateTrainingData", () => {
  it("generates the requested number of samples", () => {
    const data = generateTrainingData(500, 42);
    expect(data).toHaveLength(500);
  });

  it("produces ~80% legitimate and ~20% fraudulent", () => {
    const data = generateTrainingData(1000, 42);
    const fraudCount = data.filter((d) => d.label === 1).length;
    const legitCount = data.filter((d) => d.label === 0).length;

    expect(fraudCount).toBe(200);
    expect(legitCount).toBe(800);
  });

  it("is deterministic with the same seed", () => {
    const data1 = generateTrainingData(100, 42);
    const data2 = generateTrainingData(100, 42);

    expect(data1).toEqual(data2);
  });

  it("produces different data with different seeds", () => {
    const data1 = generateTrainingData(100, 42);
    const data2 = generateTrainingData(100, 99);

    // At least some samples should differ
    const firstLabel1 = data1[0].label;
    const firstLabel2 = data2[0].label;
    const allSame = data1.every(
      (d, i) =>
        d.label === data2[i].label &&
        d.features.accountAgeDays === data2[i].features.accountAgeDays
    );
    expect(allSame).toBe(false);
  });
});

// ─── Feature Importance Tests ──────────────────────────────────────────────

describe("FraudModel.getFeatureImportance", () => {
  it("returns importance for all features", () => {
    const { model } = trainModel(500, 50, 0.5, 42);
    const importance = model.getFeatureImportance();

    expect(Object.keys(importance)).toHaveLength(17);
  });

  it("importances sum to approximately 1", () => {
    const { model } = trainModel(500, 50, 0.5, 42);
    const importance = model.getFeatureImportance();
    const sum = Object.values(importance).reduce((s, v) => s + v, 0);

    expect(sum).toBeCloseTo(1, 5);
  });

  it("all importances are non-negative", () => {
    const { model } = trainModel(500, 50, 0.5, 42);
    const importance = model.getFeatureImportance();

    for (const value of Object.values(importance)) {
      expect(value).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Full Pipeline Integration Test ────────────────────────────────────────

describe("trainModel pipeline", () => {
  it("produces a complete pipeline result", () => {
    const { model, result } = trainModel(500, 50, 0.5, 42);

    // Training result
    expect(result.trainingResult.epochs).toBe(50);
    expect(result.trainingResult.accuracy).toBeGreaterThan(0);
    expect(result.trainingResult.finalLoss).toBeLessThan(result.trainingResult.initialLoss);
    expect(result.trainingResult.samplesProcessed).toBe(50 * result.trainSize);

    // Evaluation result
    expect(result.evaluation.totalSamples).toBe(result.testSize);
    expect(result.evaluation.accuracy).toBeGreaterThan(0);

    // Train/test split
    expect(result.trainSize + result.testSize).toBe(500);
    expect(result.trainSize).toBe(400);
    expect(result.testSize).toBe(100);

    // Model is usable
    const score = model.predictFromSubmission(makeLegitimateSubmission());
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
