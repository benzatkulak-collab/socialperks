/**
 * Campaign A/B Testing.
 * Test different perk structures, messaging, and actions.
 */

export interface CampaignVariant {
  id: string;
  name: string;
  discountValue: number;
  discountType: "pct" | "dol";
  actions: string[];
  description?: string;
}

export interface CampaignExperiment {
  id: string;
  campaignId: string;
  name: string;
  variants: CampaignVariant[];
  status: "draft" | "running" | "concluded";
  metrics: Record<string, VariantMetrics>;
  createdAt: string;
  concludedAt?: string;
  winnerId?: string;
}

export interface VariantMetrics {
  views: number;
  conversions: number;
  totalValue: number;
  conversionRate: number;
}

const experiments = new Map<string, CampaignExperiment>();
const userAssignments = new Map<string, string>();

function consistentHash(userId: string, experimentId: string, variantCount: number): number {
  let hash = 0;
  const str = `${userId}:${experimentId}`;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash) % variantCount;
}

export function createCampaignExperiment(campaignId: string, name: string, variants: CampaignVariant[]): CampaignExperiment {
  if (variants.length < 2) throw new Error("At least 2 variants required");
  if (variants.length > 5) throw new Error("Maximum 5 variants allowed");

  const experiment: CampaignExperiment = {
    id: crypto.randomUUID(),
    campaignId,
    name,
    variants,
    status: "running",
    metrics: Object.fromEntries(variants.map((v) => [v.id, { views: 0, conversions: 0, totalValue: 0, conversionRate: 0 }])),
    createdAt: new Date().toISOString(),
  };
  experiments.set(experiment.id, experiment);
  return experiment;
}

export function assignVariant(experimentId: string, userId: string): CampaignVariant | null {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "running") return null;

  const key = `${experimentId}:${userId}`;
  let variantId = userAssignments.get(key);
  if (!variantId) {
    const index = consistentHash(userId, experimentId, experiment.variants.length);
    variantId = experiment.variants[index].id;
    userAssignments.set(key, variantId);
  }

  const variant = experiment.variants.find((v) => v.id === variantId);
  if (variant) {
    const metrics = experiment.metrics[variantId];
    if (metrics) metrics.views++;
  }
  return variant || null;
}

export function recordConversion(experimentId: string, userId: string, value: number): boolean {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "running") return false;
  const key = `${experimentId}:${userId}`;
  const variantId = userAssignments.get(key);
  if (!variantId) return false;
  const metrics = experiment.metrics[variantId];
  if (!metrics) return false;
  metrics.conversions++;
  metrics.totalValue += value;
  metrics.conversionRate = metrics.views > 0 ? metrics.conversions / metrics.views : 0;
  return true;
}

export function getExperimentResults(experimentId: string): CampaignExperiment | null {
  const experiment = experiments.get(experimentId);
  if (!experiment) return null;
  for (const metrics of Object.values(experiment.metrics)) {
    metrics.conversionRate = metrics.views > 0 ? metrics.conversions / metrics.views : 0;
  }
  return experiment;
}

export function concludeExperiment(experimentId: string): CampaignExperiment | null {
  const experiment = experiments.get(experimentId);
  if (!experiment || experiment.status !== "running") return null;
  let bestVariantId: string | undefined;
  let bestRate = -1;
  for (const [variantId, metrics] of Object.entries(experiment.metrics)) {
    if (metrics.views >= 10 && metrics.conversionRate > bestRate) {
      bestRate = metrics.conversionRate;
      bestVariantId = variantId;
    }
  }
  experiment.status = "concluded";
  experiment.concludedAt = new Date().toISOString();
  experiment.winnerId = bestVariantId;
  return experiment;
}

export function listExperiments(campaignId?: string): CampaignExperiment[] {
  const all = Array.from(experiments.values());
  return campaignId ? all.filter((e) => e.campaignId === campaignId) : all;
}

export function isStatisticallySignificant(experiment: CampaignExperiment): boolean {
  const variants = Object.values(experiment.metrics);
  if (variants.length < 2) return false;
  const totalViews = variants.reduce((s, v) => s + v.views, 0);
  const totalConversions = variants.reduce((s, v) => s + v.conversions, 0);
  if (totalViews < 100 || totalConversions < 10) return false;
  const expectedRate = totalConversions / totalViews;
  let chiSquared = 0;
  for (const v of variants) {
    if (v.views === 0) continue;
    const expected = v.views * expectedRate;
    chiSquared += Math.pow(v.conversions - expected, 2) / expected;
  }
  return chiSquared > 3.841; // p < 0.05, df=1
}
