/**
 * /api/v1/ml/train — ML Model Training Endpoint
 *
 * POST: Train or retrain the fraud detection ML model. Dev-only.
 * GET:  Return current model stats (weights, accuracy, feature importance).
 *
 * Requires authentication. Standard rate limit.
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { getOrTrainModel, retrainModel } from "@/lib/ml/model-singleton";

// ─── GET: Model Stats ──────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  const model = getOrTrainModel();
  const weights = model.exportWeights();
  const importance = model.getFeatureImportance();
  const rawWeights = model.getRawWeights();

  return ok({
    featureCount: model.getFeatureCount(),
    featureNames: model.getFeatureNames(),
    weights: rawWeights,
    bias: weights.bias,
    featureImportance: importance,
    normalization: {
      min: weights.featureMin,
      max: weights.featureMax,
    },
  });
});

// ─── POST: Train/Retrain ───────────────────────────────────────────────────

interface TrainBody {
  sampleCount?: number;
  epochs?: number;
  learningRate?: number;
  seed?: number;
}

export const POST = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const rl = rateLimit(req, "strict");
  if (rl) return rl;

  // Dev-only guard
  if (process.env.NODE_ENV === "production") {
    return err(
      "DEV_ONLY",
      "Model training is only available in development mode",
      403
    );
  }

  const body = await parseBody<TrainBody>(req);
  if (body instanceof Response) return body;

  const sampleCount = Math.min(10000, Math.max(100, body.sampleCount ?? 1000));
  const epochs = Math.min(500, Math.max(1, body.epochs ?? 100));
  const learningRate = Math.min(10, Math.max(0.001, body.learningRate ?? 0.5));
  const seed = body.seed ?? Date.now();

  const startTime = performance.now();
  const { model, result } = retrainModel(sampleCount, epochs, learningRate, seed);
  const trainingDurationMs = performance.now() - startTime;

  const importance = model.getFeatureImportance();

  return ok({
    training: {
      epochs: result.trainingResult.epochs,
      initialLoss: result.trainingResult.initialLoss,
      finalLoss: result.trainingResult.finalLoss,
      accuracy: result.trainingResult.accuracy,
      samplesProcessed: result.trainingResult.samplesProcessed,
      durationMs: Math.round(trainingDurationMs),
    },
    evaluation: {
      accuracy: result.evaluation.accuracy,
      precision: result.evaluation.precision,
      recall: result.evaluation.recall,
      f1: result.evaluation.f1,
      auc: result.evaluation.auc,
      confusionMatrix: {
        truePositives: result.evaluation.truePositives,
        falsePositives: result.evaluation.falsePositives,
        trueNegatives: result.evaluation.trueNegatives,
        falseNegatives: result.evaluation.falseNegatives,
      },
      totalTestSamples: result.evaluation.totalSamples,
    },
    model: {
      featureCount: model.getFeatureCount(),
      featureImportance: importance,
      trainSize: result.trainSize,
      testSize: result.testSize,
    },
    config: {
      sampleCount,
      epochs,
      learningRate,
      seed,
    },
  });
});
