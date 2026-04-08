// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — ML Model Singleton
// Lazily initializes and caches the trained fraud model for use across
// API routes. Trains once on first access, then reuses the instance.
// ══════════════════════════════════════════════════════════════════════════════

import { FraudModel, type ModelWeights } from "./fraud-model";
import { trainModel } from "./fraud-training";

let cachedModel: FraudModel | null = null;
let cachedWeights: ModelWeights | null = null;

/**
 * Get the singleton fraud model instance.
 * On first call, trains a model on synthetic data and caches it.
 * Subsequent calls return the cached model immediately.
 */
export function getOrTrainModel(): FraudModel {
  if (cachedModel) return cachedModel;

  // If weights were previously persisted, restore them
  if (cachedWeights) {
    const model = new FraudModel();
    model.importWeights(cachedWeights);
    cachedModel = model;
    return model;
  }

  // Train a fresh model on synthetic data
  const { model } = trainModel(1000, 100, 0.5, 42);
  cachedModel = model;
  cachedWeights = model.exportWeights();
  return model;
}

/**
 * Force retrain the model, replacing the cached instance.
 * Called by the ML training API endpoint.
 */
export function retrainModel(
  sampleCount: number = 1000,
  epochs: number = 100,
  learningRate: number = 0.5,
  seed: number = Date.now()
): ReturnType<typeof trainModel> {
  const result = trainModel(sampleCount, epochs, learningRate, seed);
  cachedModel = result.model;
  cachedWeights = result.model.exportWeights();
  return result;
}

/**
 * Import weights into the cached model, replacing the current one.
 */
export function importModelWeights(weights: ModelWeights): void {
  const model = new FraudModel();
  model.importWeights(weights);
  cachedModel = model;
  cachedWeights = weights;
}

/**
 * Clear the cached model (for testing).
 */
export function clearModelCache(): void {
  cachedModel = null;
  cachedWeights = null;
}
