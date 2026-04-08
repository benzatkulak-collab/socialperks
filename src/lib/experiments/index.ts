/**
 * A/B Testing Framework
 * ─────────────────────
 * Manages experiments with consistent variant assignment,
 * conversion tracking, and chi-squared statistical significance testing.
 *
 * Usage:
 *   import { createExperiment, assignVariant, recordConversion, getExperimentResults } from '@/lib/experiments';
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Variant {
  id: string;
  name: string; // "control", "variant_a", "variant_b"
  weight: number; // 0-100, must sum to 100 across all variants
  impressions: number;
  conversions: number;
}

export type ExperimentStatus = "draft" | "running" | "paused" | "completed";

export interface Experiment {
  id: string;
  name: string;
  description: string;
  status: ExperimentStatus;
  variants: Variant[];
  targetAudience?: {
    roles?: string[];
    plans?: string[];
    percentage?: number;
  };
  startedAt: string | null;
  endedAt: string | null;
  winnerVariant: string | null;
  createdAt: string;
}

export interface Assignment {
  experimentId: string;
  userId: string;
  variantId: string;
  assignedAt: string;
  converted: boolean;
  convertedAt: string | null;
}

export interface VariantResult {
  variantId: string;
  variantName: string;
  impressions: number;
  conversions: number;
  conversionRate: number;
  confidenceInterval: { lower: number; upper: number };
}

export interface ExperimentResults {
  experimentId: string;
  status: ExperimentStatus;
  variants: VariantResult[];
  chiSquared: number;
  pValue: number;
  significant: boolean;
  recommendedWinner: string | null;
}

export interface CreateExperimentConfig {
  name: string;
  description?: string;
  variants: { name: string; weight: number }[];
  targetAudience?: Experiment["targetAudience"];
}

// ─── Storage ────────────────────────────────────────────────────────────────

const experiments = new Map<string, Experiment>();
const assignments = new Map<string, Assignment>(); // key: experimentId:userId

// ─── Consistent Hash ────────────────────────────────────────────────────────

/**
 * Simple consistent hash: FNV-1a 32-bit hash of (experimentId + userId),
 * mapped to 0-99 range, then applied to variant weight buckets.
 */
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // unsigned 32-bit
}

export function consistentHash(experimentId: string, userId: string): number {
  return fnv1aHash(experimentId + userId) % 100;
}

function selectVariant(variants: Variant[], hashValue: number): Variant {
  let cumulative = 0;
  for (const variant of variants) {
    cumulative += variant.weight;
    if (hashValue < cumulative) {
      return variant;
    }
  }
  // Fallback to last variant (should not happen if weights sum to 100)
  return variants[variants.length - 1];
}

// ─── Chi-Squared Test ───────────────────────────────────────────────────────

/**
 * Calculate chi-squared statistic for a 2xK contingency table
 * (converted vs not-converted across K variants).
 */
export function calculateChiSquared(
  variants: { impressions: number; conversions: number }[]
): number {
  const totalImpressions = variants.reduce((s, v) => s + v.impressions, 0);
  const totalConversions = variants.reduce((s, v) => s + v.conversions, 0);

  if (totalImpressions === 0 || totalConversions === 0) return 0;
  if (totalConversions === totalImpressions) return 0;

  let chiSq = 0;

  for (const v of variants) {
    if (v.impressions === 0) continue;

    const expectedConversions =
      (v.impressions * totalConversions) / totalImpressions;
    const expectedNonConversions =
      (v.impressions * (totalImpressions - totalConversions)) /
      totalImpressions;

    const observedNonConversions = v.impressions - v.conversions;

    if (expectedConversions > 0) {
      chiSq +=
        Math.pow(v.conversions - expectedConversions, 2) / expectedConversions;
    }
    if (expectedNonConversions > 0) {
      chiSq +=
        Math.pow(observedNonConversions - expectedNonConversions, 2) /
        expectedNonConversions;
    }
  }

  return chiSq;
}

/**
 * Approximate chi-squared CDF using the regularized incomplete gamma function.
 * Returns P(X <= x) for degrees of freedom k.
 */
function chiSquaredCdf(x: number, k: number): number {
  if (x <= 0) return 0;
  return lowerIncompleteGamma(k / 2, x / 2) / gamma(k / 2);
}

/**
 * p-value = 1 - CDF of chi-squared distribution.
 * Degrees of freedom = (number of variants - 1).
 */
export function chiSquaredPValue(chiSq: number, df: number): number {
  if (df <= 0 || chiSq <= 0) return 1;
  return 1 - chiSquaredCdf(chiSq, df);
}

// ─── Gamma & Incomplete Gamma (for CDF) ─────────────────────────────────────

/**
 * Gamma function using Stirling's approximation for large values
 * and Lanczos approximation for general use.
 */
function gamma(z: number): number {
  if (z < 0.5) {
    return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  }

  z -= 1;
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];

  let x = c[0];
  for (let i = 1; i < g + 2; i++) {
    x += c[i] / (z + i);
  }

  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

/**
 * Lower incomplete gamma function via series expansion.
 * P(a, x) = integral from 0 to x of t^(a-1) * e^(-t) dt
 */
function lowerIncompleteGamma(a: number, x: number): number {
  if (x <= 0) return 0;

  // Series expansion: sum_{n=0}^{inf} (-1)^n * x^(a+n) / (n! * (a+n))
  let sum = 0;
  let term = 1 / a;
  sum = term;

  for (let n = 1; n < 200; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
  }

  return Math.pow(x, a) * Math.exp(-x) * sum;
}

// ─── Wilson Score Confidence Interval ───────────────────────────────────────

function wilsonInterval(
  conversions: number,
  impressions: number,
  z = 1.96
): { lower: number; upper: number } {
  if (impressions === 0) return { lower: 0, upper: 0 };

  const p = conversions / impressions;
  const n = impressions;
  const denominator = 1 + (z * z) / n;
  const center = p + (z * z) / (2 * n);
  const margin = z * Math.sqrt((p * (1 - p) + (z * z) / (4 * n)) / n);

  return {
    lower: Math.max(0, (center - margin) / denominator),
    upper: Math.min(1, (center + margin) / denominator),
  };
}

// ─── Core Functions ─────────────────────────────────────────────────────────

export function createExperiment(config: CreateExperimentConfig): Experiment {
  // Validate variant weights sum to 100
  const weightSum = config.variants.reduce((s, v) => s + v.weight, 0);
  if (weightSum !== 100) {
    throw new Error(
      `Variant weights must sum to 100, got ${weightSum}`
    );
  }

  if (config.variants.length < 2) {
    throw new Error("Experiment must have at least 2 variants");
  }

  const id = `exp_${crypto.randomUUID()}`;
  const now = new Date().toISOString();

  const experiment: Experiment = {
    id,
    name: config.name,
    description: config.description ?? "",
    status: "draft",
    variants: config.variants.map((v, i) => ({
      id: `var_${id}_${i}`,
      name: v.name,
      weight: v.weight,
      impressions: 0,
      conversions: 0,
    })),
    targetAudience: config.targetAudience,
    startedAt: null,
    endedAt: null,
    winnerVariant: null,
    createdAt: now,
  };

  experiments.set(id, experiment);
  return experiment;
}

export function getExperiment(experimentId: string): Experiment | null {
  return experiments.get(experimentId) ?? null;
}

export function startExperiment(experimentId: string): Experiment {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);
  if (exp.status !== "draft" && exp.status !== "paused") {
    throw new Error(
      `Cannot start experiment in "${exp.status}" status`
    );
  }

  exp.status = "running";
  exp.startedAt = exp.startedAt ?? new Date().toISOString();
  return exp;
}

export function pauseExperiment(experimentId: string): Experiment {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);
  if (exp.status !== "running") {
    throw new Error(`Cannot pause experiment in "${exp.status}" status`);
  }

  exp.status = "paused";
  return exp;
}

export function endExperiment(
  experimentId: string,
  winnerVariantId?: string
): Experiment {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);
  if (exp.status === "completed") {
    throw new Error("Experiment is already completed");
  }

  exp.status = "completed";
  exp.endedAt = new Date().toISOString();
  exp.winnerVariant = winnerVariantId ?? null;
  return exp;
}

export function assignVariant(
  experimentId: string,
  userId: string
): Assignment {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);
  if (exp.status !== "running") {
    throw new Error(
      `Cannot assign variants for experiment in "${exp.status}" status`
    );
  }

  // Return existing assignment if present (consistency guarantee)
  const key = `${experimentId}:${userId}`;
  const existing = assignments.get(key);
  if (existing) {
    return existing;
  }

  // Consistent hash assignment
  const hashValue = consistentHash(experimentId, userId);
  const variant = selectVariant(exp.variants, hashValue);

  // Increment impressions
  variant.impressions++;

  const assignment: Assignment = {
    experimentId,
    userId,
    variantId: variant.id,
    assignedAt: new Date().toISOString(),
    converted: false,
    convertedAt: null,
  };

  assignments.set(key, assignment);
  return assignment;
}

export function getAssignment(
  experimentId: string,
  userId: string
): Assignment | null {
  return assignments.get(`${experimentId}:${userId}`) ?? null;
}

export function recordConversion(
  experimentId: string,
  userId: string
): Assignment {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);

  const key = `${experimentId}:${userId}`;
  const assignment = assignments.get(key);
  if (!assignment) {
    throw new Error(
      `No assignment found for user ${userId} in experiment ${experimentId}`
    );
  }

  if (assignment.converted) {
    return assignment; // Idempotent — already converted
  }

  assignment.converted = true;
  assignment.convertedAt = new Date().toISOString();

  // Increment conversions on the variant
  const variant = exp.variants.find((v) => v.id === assignment.variantId);
  if (variant) {
    variant.conversions++;
  }

  return assignment;
}

export function getExperimentResults(
  experimentId: string
): ExperimentResults {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);

  const variantResults: VariantResult[] = exp.variants.map((v) => {
    const rate =
      v.impressions > 0 ? v.conversions / v.impressions : 0;
    const ci = wilsonInterval(v.conversions, v.impressions);

    return {
      variantId: v.id,
      variantName: v.name,
      impressions: v.impressions,
      conversions: v.conversions,
      conversionRate: rate,
      confidenceInterval: ci,
    };
  });

  const df = exp.variants.length - 1;
  const chiSq = calculateChiSquared(exp.variants);
  const pValue = chiSquaredPValue(chiSq, df);
  const significant = pValue < 0.05;

  // Recommend winner: highest conversion rate if significant
  let recommendedWinner: string | null = null;
  if (significant) {
    const best = variantResults.reduce((a, b) =>
      b.conversionRate > a.conversionRate ? b : a
    );
    if (best.impressions > 0) {
      recommendedWinner = best.variantId;
    }
  }

  return {
    experimentId,
    status: exp.status,
    variants: variantResults,
    chiSquared: chiSq,
    pValue,
    significant,
    recommendedWinner,
  };
}

export function autoSelectWinner(
  experimentId: string,
  minSampleSize = 30,
  minConfidence = 0.95
): Experiment {
  const exp = experiments.get(experimentId);
  if (!exp) throw new Error(`Experiment ${experimentId} not found`);

  // Ensure minimum sample size is met for all variants
  const allSufficient = exp.variants.every(
    (v) => v.impressions >= minSampleSize
  );
  if (!allSufficient) {
    throw new Error(
      `Not all variants have reached minimum sample size of ${minSampleSize}`
    );
  }

  const results = getExperimentResults(experimentId);
  const requiredPValue = 1 - minConfidence;

  if (results.pValue >= requiredPValue) {
    throw new Error(
      `Results are not statistically significant (p=${results.pValue.toFixed(4)}, need p<${requiredPValue})`
    );
  }

  if (!results.recommendedWinner) {
    throw new Error("No clear winner could be determined");
  }

  return endExperiment(experimentId, results.recommendedWinner);
}

export function listExperiments(status?: ExperimentStatus): Experiment[] {
  const all = Array.from(experiments.values());
  if (status) {
    return all.filter((e) => e.status === status);
  }
  return all;
}

// ─── Reset (for testing) ────────────────────────────────────────────────────

export function _resetStore(): void {
  experiments.clear();
  assignments.clear();
}
