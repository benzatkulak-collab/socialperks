/**
 * Enhanced Recommendation Model using historical success data.
 */
import { cosineSimilarity, type TrainingFeatures, type TrainingDataset } from "./training-pipeline";

export interface Recommendation {
  entityId: string;
  entityType: string;
  score: number;
  reason: string;
  confidence: number;
}

export class RecommendationModel {
  private trainingData: TrainingDataset | null = null;
  private featureWeights: Record<string, number> = {};
  private trainedAt: string | null = null;

  train(dataset: TrainingDataset): void {
    this.trainingData = dataset;
    this.trainedAt = new Date().toISOString();
    const positive = dataset.features.filter((f) => f.label === 1);
    const negative = dataset.features.filter((f) => f.label === 0);
    if (positive.length === 0 || negative.length === 0) return;

    const allKeys = new Set<string>();
    dataset.features.forEach((f) => Object.keys(f.features).forEach((k) => allKeys.add(k)));

    for (const key of allKeys) {
      const posAvg = positive.reduce((s, f) => s + (f.features[key] || 0), 0) / positive.length;
      const negAvg = negative.reduce((s, f) => s + (f.features[key] || 0), 0) / negative.length;
      this.featureWeights[key] = Math.abs(posAvg - negAvg);
    }
    const maxWeight = Math.max(...Object.values(this.featureWeights), 0.001);
    for (const key of Object.keys(this.featureWeights)) {
      this.featureWeights[key] /= maxWeight;
    }
  }

  recommend(target: TrainingFeatures, entityType?: string, topN = 10): Recommendation[] {
    if (!this.trainingData) return [];
    const candidates = entityType
      ? this.trainingData.features.filter((f) => f.entityType === entityType)
      : this.trainingData.features;

    return candidates
      .filter((c) => c.entityId !== target.entityId)
      .map((candidate) => {
        const wt = this.applyWeights(target.features);
        const wc = this.applyWeights(candidate.features);
        const similarity = cosineSimilarity(wt, wc);
        const successBoost = candidate.label === 1 ? 1.2 : 0.8;
        const score = Math.min(similarity * successBoost, 1);
        return {
          entityId: candidate.entityId,
          entityType: candidate.entityType,
          score,
          reason: score > 0.8 ? "Strong match" : score > 0.6 ? "Good alignment" : score > 0.4 ? "Moderate match" : "Possible match",
          confidence: Math.round(similarity * Math.min((this.trainingData?.metadata.size || 0) / 100, 1) * 100) / 100,
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, topN);
  }

  private applyWeights(features: Record<string, number>): Record<string, number> {
    const weighted: Record<string, number> = {};
    for (const [key, value] of Object.entries(features)) {
      weighted[key] = value * (this.featureWeights[key] || 1);
    }
    return weighted;
  }

  getStatus() {
    return {
      trained: this.trainedAt !== null,
      trainedAt: this.trainedAt,
      datasetSize: this.trainingData?.metadata.size || 0,
      featureWeightCount: Object.keys(this.featureWeights).length,
      positiveRatio: this.trainingData?.metadata.positiveRatio || 0,
    };
  }
}

export const recommendationModel = new RecommendationModel();
