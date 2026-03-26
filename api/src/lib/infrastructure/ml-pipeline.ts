// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Real-Time ML Training Pipeline
// Feature store, model registry, training orchestrator, A/B testing,
// and canary deployment for production ML systems.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Feature Store Types ────────────────────────────────────────────────────

export interface FeatureDefinition {
  name: string;
  type: "numeric" | "categorical" | "boolean" | "vector" | "timestamp";
  source: string; // entity type: "submission", "user", "campaign"
  computeType: "batch" | "streaming" | "on_demand";
  staleness: number; // max age in seconds before recompute
  version: number;
}

export interface FeatureVector {
  entityId: string;
  entityType: string;
  features: Record<string, number | string | boolean | number[]>;
  computedAt: string;
  version: number;
}

export type FeatureComputeFn = (
  entityId: string,
  entityType: string
) => Record<string, number | string | boolean | number[]>;

// ─── Model Registry Types ───────────────────────────────────────────────────

export interface ModelMetadata {
  modelId: string;
  name: string;
  version: string;
  framework: "logistic_regression" | "gradient_boost" | "neural_net" | "random_forest" | "svm";
  metrics: ModelMetrics;
  trainingDataSize: number;
  featureVersions: Record<string, number>;
  trainedAt: string;
  status: "training" | "staged" | "production" | "archived" | "failed";
  artifacts: ModelArtifacts;
}

export interface ModelMetrics {
  accuracy: number;
  precision: number;
  recall: number;
  f1: number;
  auc: number;
}

export interface ModelArtifacts {
  weights: Record<string, number>;
  normalization: Record<string, { mean: number; std: number }>;
}

// ─── Training Types ─────────────────────────────────────────────────────────

export interface TrainingConfig {
  modelName: string;
  framework: ModelMetadata["framework"];
  learningRate: number;
  epochs: number;
  batchSize: number;
  validationSplit: number;
  featureNames: string[];
  labelColumn: string;
  trainingDataFilter?: Record<string, unknown>;
}

export type TrainingStatus = "queued" | "preparing_data" | "training" | "evaluating" | "completed" | "failed";

export interface TrainingRun {
  runId: string;
  config: TrainingConfig;
  status: TrainingStatus;
  progress: number; // 0-100
  currentEpoch: number;
  totalEpochs: number;
  startedAt: string;
  completedAt: string | null;
  modelId: string | null;
  error: string | null;
  epochMetrics: Array<{ epoch: number; loss: number; valLoss: number; accuracy: number }>;
}

export interface TrainingDataset {
  features: FeatureVector[];
  labels: Record<string, number | string>;
  splitIndex: number; // index dividing train/test
}

// ─── A/B Testing Types ──────────────────────────────────────────────────────

export interface ExperimentMetrics {
  predictions: number;
  successes: number;
  failures: number;
  avgLatencyMs: number;
  errorRate: number;
  totalLatencyMs: number;
}

export interface Experiment {
  id: string;
  name: string;
  modelA: string; // model ID (control)
  modelB: string; // model ID (variant)
  trafficSplit: number; // 0-1, fraction going to B
  startedAt: string;
  status: "running" | "completed" | "stopped";
  metrics: {
    modelA: ExperimentMetrics;
    modelB: ExperimentMetrics;
  };
}

// ─── Canary Deployment Types ────────────────────────────────────────────────

export interface CanaryDeployment {
  id: string;
  productionModelId: string;
  canaryModelId: string;
  trafficPercentage: number; // 0-100
  startedAt: string;
  status: "active" | "promoted" | "rolled_back";
  maxErrorRate: number; // threshold for auto-rollback
  checkIntervalMs: number;
  metrics: {
    production: { requests: number; errors: number; totalLatencyMs: number };
    canary: { requests: number; errors: number; totalLatencyMs: number };
  };
}

// ─── Model Comparison Types ─────────────────────────────────────────────────

export interface ModelComparison {
  modelA: { modelId: string; version: string; metrics: ModelMetrics };
  modelB: { modelId: string; version: string; metrics: ModelMetrics };
  delta: Record<keyof ModelMetrics, number>;
  winner: "A" | "B" | "tie";
  recommendation: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Simple deterministic hash for A/B routing. Produces a number between 0 and 1.
 */
function hashToFraction(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash % 10000) / 10000;
}

// ══════════════════════════════════════════════════════════════════════════════
// Feature Store
// ══════════════════════════════════════════════════════════════════════════════

export class FeatureStore {
  private definitions = new Map<string, FeatureDefinition>();
  private vectors = new Map<string, FeatureVector>(); // key: `${entityType}:${entityId}`
  private computeFns = new Map<string, FeatureComputeFn>();

  // ─── Feature Definition Management ──────────────────────────────────────

  registerFeature(definition: FeatureDefinition, computeFn?: FeatureComputeFn): void {
    this.definitions.set(definition.name, { ...definition });
    if (computeFn) {
      this.computeFns.set(definition.name, computeFn);
    }
  }

  getDefinition(name: string): FeatureDefinition | null {
    return this.definitions.get(name) ?? null;
  }

  listDefinitions(source?: string): FeatureDefinition[] {
    const all = Array.from(this.definitions.values());
    if (source) {
      return all.filter((d) => d.source === source);
    }
    return all;
  }

  // ─── Feature Computation ────────────────────────────────────────────────

  computeFeatures(entityId: string, entityType: string): FeatureVector {
    const relevantDefs = Array.from(this.definitions.values()).filter(
      (d) => d.source === entityType
    );

    const features: Record<string, number | string | boolean | number[]> = {};
    let maxVersion = 0;

    for (const def of relevantDefs) {
      const fn = this.computeFns.get(def.name);
      if (fn) {
        const computed = fn(entityId, entityType);
        for (const [key, value] of Object.entries(computed)) {
          features[key] = value;
        }
      }
      if (def.version > maxVersion) {
        maxVersion = def.version;
      }
    }

    const vector: FeatureVector = {
      entityId,
      entityType,
      features,
      computedAt: nowISO(),
      version: maxVersion,
    };

    const key = `${entityType}:${entityId}`;
    this.vectors.set(key, vector);
    return vector;
  }

  batchCompute(
    entities: Array<{ entityId: string; entityType: string }>
  ): FeatureVector[] {
    return entities.map((e) => this.computeFeatures(e.entityId, e.entityType));
  }

  // ─── Feature Retrieval ──────────────────────────────────────────────────

  getFeatureVector(entityId: string, entityType: string): FeatureVector | null {
    const key = `${entityType}:${entityId}`;
    return this.vectors.get(key) ?? null;
  }

  /**
   * Check if a cached feature vector is stale based on the staleness thresholds
   * of its constituent feature definitions.
   */
  isStale(entityId: string, entityType: string): boolean {
    const vector = this.getFeatureVector(entityId, entityType);
    if (!vector) return true;

    const computedTime = new Date(vector.computedAt).getTime();
    const ageSeconds = (Date.now() - computedTime) / 1000;

    const relevantDefs = Array.from(this.definitions.values()).filter(
      (d) => d.source === entityType
    );

    // Stale if age exceeds the minimum staleness of any relevant feature
    const minStaleness = Math.min(...relevantDefs.map((d) => d.staleness));
    return ageSeconds > minStaleness;
  }

  /**
   * Get feature vector, recomputing if stale.
   */
  getOrCompute(entityId: string, entityType: string): FeatureVector {
    if (this.isStale(entityId, entityType)) {
      return this.computeFeatures(entityId, entityType);
    }
    return this.getFeatureVector(entityId, entityType)!;
  }

  // ─── Training Dataset Export ────────────────────────────────────────────

  getTrainingDataset(
    entityType: string,
    labelFn: (vector: FeatureVector) => number | string
  ): TrainingDataset {
    const allVectors = Array.from(this.vectors.values()).filter(
      (v) => v.entityType === entityType
    );

    const labels: Record<string, number | string> = {};
    for (const v of allVectors) {
      labels[v.entityId] = labelFn(v);
    }

    // 80/20 train/test split
    const splitIndex = Math.floor(allVectors.length * 0.8);

    return {
      features: allVectors,
      labels,
      splitIndex,
    };
  }

  /**
   * Purge all cached vectors for a given entity type.
   */
  invalidate(entityType: string): number {
    let purged = 0;
    for (const [key] of this.vectors) {
      if (key.startsWith(`${entityType}:`)) {
        this.vectors.delete(key);
        purged++;
      }
    }
    return purged;
  }

  /**
   * Get store statistics.
   */
  getStats(): {
    definitionCount: number;
    vectorCount: number;
    entityTypes: string[];
  } {
    const entityTypes = new Set<string>();
    for (const v of this.vectors.values()) {
      entityTypes.add(v.entityType);
    }
    return {
      definitionCount: this.definitions.size,
      vectorCount: this.vectors.size,
      entityTypes: Array.from(entityTypes),
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Model Registry
// ══════════════════════════════════════════════════════════════════════════════

export class ModelRegistry {
  private models = new Map<string, ModelMetadata>();
  private productionModelByName = new Map<string, string>(); // name → modelId
  private history: Array<{ modelId: string; action: string; timestamp: string }> = [];

  // ─── CRUD ───────────────────────────────────────────────────────────────

  register(model: ModelMetadata): void {
    this.models.set(model.modelId, { ...model });
    this.history.push({
      modelId: model.modelId,
      action: "registered",
      timestamp: nowISO(),
    });
  }

  get(modelId: string): ModelMetadata | null {
    return this.models.get(modelId) ?? null;
  }

  list(filter?: { name?: string; status?: ModelMetadata["status"] }): ModelMetadata[] {
    let results = Array.from(this.models.values());
    if (filter?.name) {
      results = results.filter((m) => m.name === filter.name);
    }
    if (filter?.status) {
      results = results.filter((m) => m.status === filter.status);
    }
    return results.sort(
      (a, b) => new Date(b.trainedAt).getTime() - new Date(a.trainedAt).getTime()
    );
  }

  // ─── Lifecycle Management ───────────────────────────────────────────────

  promote(modelId: string): { success: boolean; previousProductionId: string | null } {
    const model = this.models.get(modelId);
    if (!model) {
      return { success: false, previousProductionId: null };
    }

    if (model.status !== "staged") {
      return { success: false, previousProductionId: null };
    }

    // Archive current production model for this name
    const currentProdId = this.productionModelByName.get(model.name) ?? null;
    if (currentProdId) {
      const currentProd = this.models.get(currentProdId);
      if (currentProd) {
        currentProd.status = "archived";
        this.history.push({
          modelId: currentProdId,
          action: "archived",
          timestamp: nowISO(),
        });
      }
    }

    // Promote new model
    model.status = "production";
    this.productionModelByName.set(model.name, modelId);
    this.history.push({
      modelId,
      action: "promoted_to_production",
      timestamp: nowISO(),
    });

    return { success: true, previousProductionId: currentProdId };
  }

  rollback(modelName: string): { success: boolean; restoredModelId: string | null } {
    // Find the most recently archived model for this name
    const archived = this.list({ name: modelName, status: "archived" });
    if (archived.length === 0) {
      return { success: false, restoredModelId: null };
    }

    const previousModel = archived[0]; // most recent archived

    // Demote current production
    const currentProdId = this.productionModelByName.get(modelName);
    if (currentProdId) {
      const currentProd = this.models.get(currentProdId);
      if (currentProd) {
        currentProd.status = "archived";
        this.history.push({
          modelId: currentProdId,
          action: "rolled_back",
          timestamp: nowISO(),
        });
      }
    }

    // Restore previous model
    previousModel.status = "production";
    this.productionModelByName.set(modelName, previousModel.modelId);
    this.history.push({
      modelId: previousModel.modelId,
      action: "restored_to_production",
      timestamp: nowISO(),
    });

    return { success: true, restoredModelId: previousModel.modelId };
  }

  getProduction(modelName: string): ModelMetadata | null {
    const modelId = this.productionModelByName.get(modelName);
    if (!modelId) return null;
    return this.models.get(modelId) ?? null;
  }

  // ─── Comparison ─────────────────────────────────────────────────────────

  compare(modelIdA: string, modelIdB: string): ModelComparison | null {
    const a = this.models.get(modelIdA);
    const b = this.models.get(modelIdB);
    if (!a || !b) return null;

    const metricKeys: (keyof ModelMetrics)[] = ["accuracy", "precision", "recall", "f1", "auc"];
    const delta: Record<string, number> = {};
    let aWins = 0;
    let bWins = 0;

    for (const key of metricKeys) {
      delta[key] = b.metrics[key] - a.metrics[key];
      if (b.metrics[key] > a.metrics[key]) bWins++;
      else if (a.metrics[key] > b.metrics[key]) aWins++;
    }

    const winner = aWins > bWins ? "A" : bWins > aWins ? "B" : "tie";

    let recommendation: string;
    if (winner === "tie") {
      recommendation = "Models are comparable. Consider additional evaluation criteria.";
    } else {
      const betterModel = winner === "A" ? a : b;
      const f1Diff = Math.abs(delta["f1"]);
      if (f1Diff < 0.01) {
        recommendation = `Marginal difference (F1 delta: ${f1Diff.toFixed(4)}). Consider latency and resource costs.`;
      } else {
        recommendation = `Model ${winner} (${betterModel.version}) is significantly better (F1 delta: ${f1Diff.toFixed(4)}). Recommend promotion.`;
      }
    }

    return {
      modelA: { modelId: a.modelId, version: a.version, metrics: { ...a.metrics } },
      modelB: { modelId: b.modelId, version: b.version, metrics: { ...b.metrics } },
      delta: delta as Record<keyof ModelMetrics, number>,
      winner,
      recommendation,
    };
  }

  getHistory(modelId?: string): Array<{ modelId: string; action: string; timestamp: string }> {
    if (modelId) {
      return this.history.filter((h) => h.modelId === modelId);
    }
    return [...this.history];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Training Orchestrator
// ══════════════════════════════════════════════════════════════════════════════

export class TrainingOrchestrator {
  private runs = new Map<string, TrainingRun>();
  private featureStore: FeatureStore;
  private modelRegistry: ModelRegistry;

  constructor(featureStore: FeatureStore, modelRegistry: ModelRegistry) {
    this.featureStore = featureStore;
    this.modelRegistry = modelRegistry;
  }

  // ─── Training Lifecycle ─────────────────────────────────────────────────

  startTraining(config: TrainingConfig): TrainingRun {
    const runId = generateId("run");

    const run: TrainingRun = {
      runId,
      config: { ...config },
      status: "queued",
      progress: 0,
      currentEpoch: 0,
      totalEpochs: config.epochs,
      startedAt: nowISO(),
      completedAt: null,
      modelId: null,
      error: null,
      epochMetrics: [],
    };

    this.runs.set(runId, run);

    // Simulate async training progression
    this.executeTraining(run);

    return { ...run };
  }

  private executeTraining(run: TrainingRun): void {
    // Phase 1: Prepare data
    run.status = "preparing_data";
    run.progress = 5;

    // Phase 2: Training (simulate epoch progression)
    run.status = "training";
    const { epochs, learningRate } = run.config;

    for (let epoch = 1; epoch <= epochs; epoch++) {
      // Simulated training metrics — loss decreases, accuracy improves
      const decayFactor = Math.exp(-learningRate * epoch);
      const noise = (Math.random() - 0.5) * 0.02;
      const loss = 0.8 * decayFactor + 0.05 + noise;
      const valLoss = 0.85 * decayFactor + 0.07 + noise * 1.2;
      const accuracy = Math.min(0.99, 1 - loss * 0.5 + noise);

      run.epochMetrics.push({
        epoch,
        loss: Math.max(0, loss),
        valLoss: Math.max(0, valLoss),
        accuracy: Math.max(0, Math.min(1, accuracy)),
      });

      run.currentEpoch = epoch;
      run.progress = 10 + Math.floor((epoch / epochs) * 70);
    }

    // Phase 3: Evaluation
    run.status = "evaluating";
    run.progress = 85;

    // Generate final model
    const lastMetric = run.epochMetrics[run.epochMetrics.length - 1];
    const modelId = generateId("model");

    // Generate simulated weights for feature names
    const weights: Record<string, number> = {};
    const normalization: Record<string, { mean: number; std: number }> = {};
    for (const featureName of run.config.featureNames) {
      weights[featureName] = (Math.random() - 0.5) * 2;
      normalization[featureName] = {
        mean: Math.random() * 10,
        std: 0.5 + Math.random() * 2,
      };
    }

    // Compute final metrics
    const finalAccuracy = lastMetric?.accuracy ?? 0.85;
    const precision = Math.max(0, Math.min(1, finalAccuracy - 0.02 + Math.random() * 0.04));
    const recall = Math.max(0, Math.min(1, finalAccuracy - 0.03 + Math.random() * 0.06));
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const auc = Math.max(0, Math.min(1, finalAccuracy + 0.02 + Math.random() * 0.03));

    // Collect feature versions
    const featureVersions: Record<string, number> = {};
    for (const name of run.config.featureNames) {
      const def = this.featureStore.getDefinition(name);
      featureVersions[name] = def?.version ?? 1;
    }

    const model: ModelMetadata = {
      modelId,
      name: run.config.modelName,
      version: `v${Date.now()}`,
      framework: run.config.framework,
      metrics: { accuracy: finalAccuracy, precision, recall, f1, auc },
      trainingDataSize: 0, // updated when actual data is used
      featureVersions,
      trainedAt: nowISO(),
      status: "staged",
      artifacts: { weights, normalization },
    };

    this.modelRegistry.register(model);

    run.modelId = modelId;
    run.status = "completed";
    run.progress = 100;
    run.completedAt = nowISO();
  }

  getTrainingStatus(runId: string): TrainingRun | null {
    const run = this.runs.get(runId);
    return run ? { ...run } : null;
  }

  listRuns(filter?: { status?: TrainingStatus; modelName?: string }): TrainingRun[] {
    let results = Array.from(this.runs.values());
    if (filter?.status) {
      results = results.filter((r) => r.status === filter.status);
    }
    if (filter?.modelName) {
      results = results.filter((r) => r.config.modelName === filter.modelName);
    }
    return results.sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  // ─── Evaluation ─────────────────────────────────────────────────────────

  evaluateModel(
    modelId: string,
    testData: Array<{
      features: Record<string, number>;
      label: number;
    }>
  ): ModelMetrics | null {
    const model = this.modelRegistry.get(modelId);
    if (!model) return null;

    const weights = model.artifacts.weights;
    const norm = model.artifacts.normalization;

    let truePositives = 0;
    let falsePositives = 0;
    let trueNegatives = 0;
    let falseNegatives = 0;

    for (const sample of testData) {
      // Simple logistic regression-style prediction
      let logit = 0;
      for (const [feature, weight] of Object.entries(weights)) {
        const rawValue = sample.features[feature] ?? 0;
        const normParams = norm[feature];
        const normalizedValue = normParams
          ? (rawValue - normParams.mean) / (normParams.std || 1)
          : rawValue;
        logit += normalizedValue * weight;
      }
      const prediction = 1 / (1 + Math.exp(-logit)) >= 0.5 ? 1 : 0;

      if (prediction === 1 && sample.label === 1) truePositives++;
      else if (prediction === 1 && sample.label === 0) falsePositives++;
      else if (prediction === 0 && sample.label === 0) trueNegatives++;
      else falseNegatives++;
    }

    const total = testData.length || 1;
    const accuracy = (truePositives + trueNegatives) / total;
    const precision = truePositives + falsePositives > 0
      ? truePositives / (truePositives + falsePositives)
      : 0;
    const recall = truePositives + falseNegatives > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    // Simplified AUC approximation
    const auc = (accuracy + 1) / 2;

    return { accuracy, precision, recall, f1, auc };
  }

  // ─── Auto-Retrain ──────────────────────────────────────────────────────

  autoRetrain(
    modelName: string,
    driftScore: number,
    driftThreshold: number = 0.1
  ): TrainingRun | null {
    if (driftScore < driftThreshold) {
      return null; // No significant drift
    }

    const production = this.modelRegistry.getProduction(modelName);
    if (!production) return null;

    // Retrain with same config but adjusted learning rate for fine-tuning
    const config: TrainingConfig = {
      modelName,
      framework: production.framework,
      learningRate: 0.001, // Lower LR for fine-tuning
      epochs: Math.max(5, Math.floor(production.metrics.accuracy < 0.9 ? 20 : 10)),
      batchSize: 32,
      validationSplit: 0.2,
      featureNames: Object.keys(production.featureVersions),
      labelColumn: "label",
    };

    return this.startTraining(config);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// A/B Test Manager
// ══════════════════════════════════════════════════════════════════════════════

export class ABTestManager {
  private experiments = new Map<string, Experiment>();
  private modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  // ─── Experiment Lifecycle ───────────────────────────────────────────────

  createExperiment(params: {
    name: string;
    modelA: string;
    modelB: string;
    trafficSplit: number;
  }): Experiment {
    const id = generateId("exp");

    // Validate models exist
    const mA = this.modelRegistry.get(params.modelA);
    const mB = this.modelRegistry.get(params.modelB);
    if (!mA || !mB) {
      throw new Error(`One or both models not found: ${params.modelA}, ${params.modelB}`);
    }

    const experiment: Experiment = {
      id,
      name: params.name,
      modelA: params.modelA,
      modelB: params.modelB,
      trafficSplit: Math.max(0, Math.min(1, params.trafficSplit)),
      startedAt: nowISO(),
      status: "running",
      metrics: {
        modelA: {
          predictions: 0,
          successes: 0,
          failures: 0,
          avgLatencyMs: 0,
          errorRate: 0,
          totalLatencyMs: 0,
        },
        modelB: {
          predictions: 0,
          successes: 0,
          failures: 0,
          avgLatencyMs: 0,
          errorRate: 0,
          totalLatencyMs: 0,
        },
      },
    };

    this.experiments.set(id, experiment);
    return { ...experiment };
  }

  // ─── Traffic Routing ────────────────────────────────────────────────────

  routeRequest(
    experimentId: string,
    userId: string
  ): { modelId: string; variant: "A" | "B" } | null {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return null;

    // Deterministic assignment based on user ID + experiment ID
    const hashInput = `${exp.id}:${userId}`;
    const fraction = hashToFraction(hashInput);

    if (fraction < exp.trafficSplit) {
      return { modelId: exp.modelB, variant: "B" };
    }
    return { modelId: exp.modelA, variant: "A" };
  }

  // ─── Outcome Recording ─────────────────────────────────────────────────

  recordOutcome(
    experimentId: string,
    variant: "A" | "B",
    success: boolean,
    latencyMs: number
  ): void {
    const exp = this.experiments.get(experimentId);
    if (!exp || exp.status !== "running") return;

    const metrics = variant === "A" ? exp.metrics.modelA : exp.metrics.modelB;
    metrics.predictions++;
    metrics.totalLatencyMs += latencyMs;

    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }

    metrics.avgLatencyMs = metrics.totalLatencyMs / metrics.predictions;
    metrics.errorRate = metrics.predictions > 0
      ? metrics.failures / metrics.predictions
      : 0;
  }

  // ─── Results & Statistical Significance ─────────────────────────────────

  getResults(experimentId: string): {
    experiment: Experiment;
    significant: boolean;
    pValue: number;
    winner: "A" | "B" | "inconclusive";
    confidence: number;
  } | null {
    const exp = this.experiments.get(experimentId);
    if (!exp) return null;

    const mA = exp.metrics.modelA;
    const mB = exp.metrics.modelB;

    // Chi-squared test for independence
    const totalA = mA.successes + mA.failures;
    const totalB = mB.successes + mB.failures;
    const totalSuccess = mA.successes + mB.successes;
    const totalFailure = mA.failures + mB.failures;
    const grandTotal = totalA + totalB;

    let chiSquared = 0;

    if (grandTotal > 0 && totalA > 0 && totalB > 0) {
      const expected = [
        [(totalA * totalSuccess) / grandTotal, (totalA * totalFailure) / grandTotal],
        [(totalB * totalSuccess) / grandTotal, (totalB * totalFailure) / grandTotal],
      ];

      const observed = [
        [mA.successes, mA.failures],
        [mB.successes, mB.failures],
      ];

      for (let i = 0; i < 2; i++) {
        for (let j = 0; j < 2; j++) {
          if (expected[i][j] > 0) {
            chiSquared +=
              Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
          }
        }
      }
    }

    // Approximate p-value from chi-squared with 1 degree of freedom
    // Using the survival function approximation
    const pValue = chiSquared > 0 ? Math.exp(-chiSquared / 2) : 1;
    const significant = pValue < 0.05;
    const confidence = Math.max(0, Math.min(1, 1 - pValue));

    let winner: "A" | "B" | "inconclusive" = "inconclusive";
    if (significant && totalA > 0 && totalB > 0) {
      const rateA = mA.successes / totalA;
      const rateB = mB.successes / totalB;
      winner = rateA >= rateB ? "A" : "B";
    }

    return {
      experiment: { ...exp },
      significant,
      pValue,
      winner,
      confidence,
    };
  }

  // ─── Experiment Conclusion ──────────────────────────────────────────────

  concludeExperiment(
    experimentId: string,
    promoteWinner: boolean = true
  ): { winner: "A" | "B" | "inconclusive"; promotedModelId: string | null } {
    const results = this.getResults(experimentId);
    if (!results) {
      throw new Error(`Experiment not found: ${experimentId}`);
    }

    const exp = this.experiments.get(experimentId)!;
    exp.status = "completed";

    let promotedModelId: string | null = null;

    if (promoteWinner && results.winner !== "inconclusive") {
      const winnerModelId = results.winner === "A" ? exp.modelA : exp.modelB;
      const model = this.modelRegistry.get(winnerModelId);
      if (model && model.status === "staged") {
        this.modelRegistry.promote(winnerModelId);
        promotedModelId = winnerModelId;
      }
    }

    return { winner: results.winner, promotedModelId };
  }

  stopExperiment(experimentId: string): void {
    const exp = this.experiments.get(experimentId);
    if (exp) {
      exp.status = "stopped";
    }
  }

  listExperiments(status?: Experiment["status"]): Experiment[] {
    const all = Array.from(this.experiments.values());
    if (status) {
      return all.filter((e) => e.status === status);
    }
    return all;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Canary Deployer
// ══════════════════════════════════════════════════════════════════════════════

export class CanaryDeployer {
  private deployments = new Map<string, CanaryDeployment>();
  private modelRegistry: ModelRegistry;

  constructor(modelRegistry: ModelRegistry) {
    this.modelRegistry = modelRegistry;
  }

  // ─── Canary Lifecycle ───────────────────────────────────────────────────

  startCanary(params: {
    productionModelId: string;
    canaryModelId: string;
    initialPercentage?: number;
    maxErrorRate?: number;
    checkIntervalMs?: number;
  }): CanaryDeployment {
    const id = generateId("canary");

    const prod = this.modelRegistry.get(params.productionModelId);
    const canary = this.modelRegistry.get(params.canaryModelId);
    if (!prod || !canary) {
      throw new Error("Production or canary model not found");
    }

    const deployment: CanaryDeployment = {
      id,
      productionModelId: params.productionModelId,
      canaryModelId: params.canaryModelId,
      trafficPercentage: params.initialPercentage ?? 5,
      startedAt: nowISO(),
      status: "active",
      maxErrorRate: params.maxErrorRate ?? 0.05,
      checkIntervalMs: params.checkIntervalMs ?? 60000,
      metrics: {
        production: { requests: 0, errors: 0, totalLatencyMs: 0 },
        canary: { requests: 0, errors: 0, totalLatencyMs: 0 },
      },
    };

    this.deployments.set(id, deployment);
    return { ...deployment };
  }

  /**
   * Route a request to either production or canary based on traffic percentage.
   */
  routeRequest(
    deploymentId: string,
    requestId: string
  ): { modelId: string; target: "production" | "canary" } | null {
    const dep = this.deployments.get(deploymentId);
    if (!dep || dep.status !== "active") return null;

    const fraction = hashToFraction(`${deploymentId}:${requestId}`);
    const canaryThreshold = dep.trafficPercentage / 100;

    if (fraction < canaryThreshold) {
      return { modelId: dep.canaryModelId, target: "canary" };
    }
    return { modelId: dep.productionModelId, target: "production" };
  }

  /**
   * Record the outcome of a request.
   */
  recordMetric(
    deploymentId: string,
    target: "production" | "canary",
    isError: boolean,
    latencyMs: number
  ): void {
    const dep = this.deployments.get(deploymentId);
    if (!dep || dep.status !== "active") return;

    const m = dep.metrics[target];
    m.requests++;
    if (isError) m.errors++;
    m.totalLatencyMs += latencyMs;
  }

  // ─── Traffic Management ─────────────────────────────────────────────────

  incrementTraffic(
    deploymentId: string,
    incrementPercent: number = 5
  ): { newPercentage: number } | null {
    const dep = this.deployments.get(deploymentId);
    if (!dep || dep.status !== "active") return null;

    dep.trafficPercentage = Math.min(100, dep.trafficPercentage + incrementPercent);
    return { newPercentage: dep.trafficPercentage };
  }

  // ─── Monitoring ─────────────────────────────────────────────────────────

  monitorCanary(deploymentId: string): {
    healthy: boolean;
    productionErrorRate: number;
    canaryErrorRate: number;
    canaryLatencyMs: number;
    productionLatencyMs: number;
    recommendation: "continue" | "increment" | "promote" | "rollback";
  } | null {
    const dep = this.deployments.get(deploymentId);
    if (!dep) return null;

    const prodM = dep.metrics.production;
    const canaryM = dep.metrics.canary;

    const productionErrorRate = prodM.requests > 0 ? prodM.errors / prodM.requests : 0;
    const canaryErrorRate = canaryM.requests > 0 ? canaryM.errors / canaryM.requests : 0;
    const productionLatencyMs = prodM.requests > 0 ? prodM.totalLatencyMs / prodM.requests : 0;
    const canaryLatencyMs = canaryM.requests > 0 ? canaryM.totalLatencyMs / canaryM.requests : 0;

    // Check if canary exceeds error threshold
    const healthy = canaryErrorRate <= dep.maxErrorRate;

    // Auto-rollback if unhealthy
    if (!healthy && canaryM.requests >= 10) {
      this.rollback(deploymentId);
      return {
        healthy: false,
        productionErrorRate,
        canaryErrorRate,
        canaryLatencyMs,
        productionLatencyMs,
        recommendation: "rollback",
      };
    }

    // Determine recommendation
    let recommendation: "continue" | "increment" | "promote" | "rollback";
    if (canaryM.requests < 10) {
      recommendation = "continue"; // Not enough data yet
    } else if (canaryErrorRate > productionErrorRate * 1.5) {
      recommendation = "rollback"; // Canary significantly worse
    } else if (dep.trafficPercentage >= 50 && canaryErrorRate <= productionErrorRate * 1.1) {
      recommendation = "promote"; // Canary is stable at high traffic
    } else if (canaryErrorRate <= productionErrorRate * 1.2) {
      recommendation = "increment"; // Canary doing well, increase traffic
    } else {
      recommendation = "continue"; // Keep monitoring
    }

    return {
      healthy,
      productionErrorRate,
      canaryErrorRate,
      canaryLatencyMs,
      productionLatencyMs,
      recommendation,
    };
  }

  // ─── Promotion & Rollback ───────────────────────────────────────────────

  promote(deploymentId: string): { success: boolean; promotedModelId: string | null } {
    const dep = this.deployments.get(deploymentId);
    if (!dep || dep.status !== "active") {
      return { success: false, promotedModelId: null };
    }

    dep.status = "promoted";
    dep.trafficPercentage = 100;

    // Promote canary model in registry
    const canaryModel = this.modelRegistry.get(dep.canaryModelId);
    if (canaryModel && (canaryModel.status === "staged" || canaryModel.status === "production")) {
      if (canaryModel.status === "staged") {
        this.modelRegistry.promote(dep.canaryModelId);
      }
      return { success: true, promotedModelId: dep.canaryModelId };
    }

    return { success: true, promotedModelId: dep.canaryModelId };
  }

  rollback(deploymentId: string): { success: boolean } {
    const dep = this.deployments.get(deploymentId);
    if (!dep || dep.status !== "active") {
      return { success: false };
    }

    dep.status = "rolled_back";
    dep.trafficPercentage = 0;

    return { success: true };
  }

  // ─── Queries ────────────────────────────────────────────────────────────

  getDeployment(deploymentId: string): CanaryDeployment | null {
    return this.deployments.get(deploymentId) ?? null;
  }

  listDeployments(status?: CanaryDeployment["status"]): CanaryDeployment[] {
    const all = Array.from(this.deployments.values());
    if (status) {
      return all.filter((d) => d.status === status);
    }
    return all;
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Factory & Convenience
// ══════════════════════════════════════════════════════════════════════════════

export interface MLPipeline {
  featureStore: FeatureStore;
  modelRegistry: ModelRegistry;
  trainingOrchestrator: TrainingOrchestrator;
  abTestManager: ABTestManager;
  canaryDeployer: CanaryDeployer;
}

/**
 * Create a fully wired ML pipeline with all components connected.
 */
export function createMLPipeline(): MLPipeline {
  const featureStore = new FeatureStore();
  const modelRegistry = new ModelRegistry();
  const trainingOrchestrator = new TrainingOrchestrator(featureStore, modelRegistry);
  const abTestManager = new ABTestManager(modelRegistry);
  const canaryDeployer = new CanaryDeployer(modelRegistry);

  return {
    featureStore,
    modelRegistry,
    trainingOrchestrator,
    abTestManager,
    canaryDeployer,
  };
}

// ─── Default Feature Definitions for Social Perks ─────────────────────────

export const DEFAULT_FEATURE_DEFINITIONS: FeatureDefinition[] = [
  // Submission features
  {
    name: "submission_count",
    type: "numeric",
    source: "user",
    computeType: "streaming",
    staleness: 60,
    version: 1,
  },
  {
    name: "approval_rate",
    type: "numeric",
    source: "user",
    computeType: "streaming",
    staleness: 300,
    version: 1,
  },
  {
    name: "avg_time_between_submissions",
    type: "numeric",
    source: "user",
    computeType: "batch",
    staleness: 3600,
    version: 1,
  },
  {
    name: "fraud_score",
    type: "numeric",
    source: "submission",
    computeType: "on_demand",
    staleness: 0,
    version: 1,
  },
  {
    name: "content_quality_score",
    type: "numeric",
    source: "submission",
    computeType: "on_demand",
    staleness: 0,
    version: 1,
  },
  // Campaign features
  {
    name: "campaign_completion_rate",
    type: "numeric",
    source: "campaign",
    computeType: "batch",
    staleness: 3600,
    version: 1,
  },
  {
    name: "campaign_avg_perk_value",
    type: "numeric",
    source: "campaign",
    computeType: "batch",
    staleness: 3600,
    version: 1,
  },
  {
    name: "campaign_tier",
    type: "categorical",
    source: "campaign",
    computeType: "on_demand",
    staleness: 86400,
    version: 1,
  },
  // Influencer features
  {
    name: "follower_count",
    type: "numeric",
    source: "user",
    computeType: "batch",
    staleness: 86400,
    version: 1,
  },
  {
    name: "engagement_rate",
    type: "numeric",
    source: "user",
    computeType: "batch",
    staleness: 86400,
    version: 1,
  },
  {
    name: "niche_vector",
    type: "vector",
    source: "user",
    computeType: "batch",
    staleness: 604800,
    version: 1,
  },
  {
    name: "influencer_tier",
    type: "categorical",
    source: "user",
    computeType: "on_demand",
    staleness: 86400,
    version: 1,
  },
];
