/**
 * ML Training Pipeline for Social Perks.
 * Extracts features from campaigns, submissions, and profiles.
 */

export interface TrainingFeatures {
  entityId: string;
  entityType: "campaign" | "business" | "influencer";
  features: Record<string, number>;
  label?: number;
  timestamp: string;
}

export interface TrainingDataset {
  features: TrainingFeatures[];
  metadata: {
    size: number;
    extractedAt: string;
    featureCount: number;
    positiveRatio: number;
  };
}

export function extractCampaignFeatures(campaign: {
  id: string;
  tier?: string;
  actions: string[];
  discountValue: number;
  discountType: string;
  completionCount: number;
  budgetCap?: number | null;
  budgetUsed: number;
  status: string;
}): TrainingFeatures {
  const tierValues: Record<string, number> = { essential: 0.2, high_impact: 0.4, growth: 0.6, premium: 0.8, starter: 0.1 };
  const budgetUtilization = campaign.budgetCap ? campaign.budgetUsed / campaign.budgetCap : 0.5;
  const conversionScore = campaign.completionCount > 0 ? Math.min(campaign.completionCount / 100, 1) : 0;

  return {
    entityId: campaign.id,
    entityType: "campaign",
    features: {
      tier: tierValues[campaign.tier || "starter"] || 0.1,
      actionCount: Math.min(campaign.actions.length / 5, 1),
      discountValue: Math.min(campaign.discountValue / 50, 1),
      isPctDiscount: campaign.discountType === "pct" ? 1 : 0,
      completionCount: conversionScore,
      budgetUtilization,
      isActive: campaign.status === "active" ? 1 : 0,
    },
    label: conversionScore > 0.3 ? 1 : 0,
    timestamp: new Date().toISOString(),
  };
}

export function extractInfluencerFeatures(influencer: {
  id: string;
  followerCount: number;
  engagementRate: number;
  niches: string[];
  tier: string;
  campaignsCompleted: number;
  completionRate?: number;
}): TrainingFeatures {
  const tierValues: Record<string, number> = { micro: 0.2, mid: 0.4, macro: 0.7, mega: 1.0 };
  return {
    entityId: influencer.id,
    entityType: "influencer",
    features: {
      followerCount: Math.min(influencer.followerCount / 1000000, 1),
      engagementRate: Math.min(influencer.engagementRate / 0.1, 1),
      nicheCount: Math.min(influencer.niches.length / 5, 1),
      tier: tierValues[influencer.tier] || 0.2,
      campaignsCompleted: Math.min(influencer.campaignsCompleted / 50, 1),
      completionRate: influencer.completionRate || 0.8,
    },
    label: (influencer.completionRate || 0.8) > 0.7 ? 1 : 0,
    timestamp: new Date().toISOString(),
  };
}

export function extractBusinessFeatures(business: {
  id: string;
  type: string;
  size: string;
  plan: string;
  campaignCount: number;
  avgRating?: number | null;
}): TrainingFeatures {
  const sizeValues: Record<string, number> = { solo: 0.1, small: 0.3, medium: 0.6, enterprise: 1.0 };
  const planValues: Record<string, number> = { free: 0.1, starter: 0.3, pro: 0.6, enterprise: 1.0 };
  return {
    entityId: business.id,
    entityType: "business",
    features: {
      size: sizeValues[business.size] || 0.3,
      plan: planValues[business.plan] || 0.1,
      campaignCount: Math.min(business.campaignCount / 20, 1),
      avgRating: (business.avgRating || 4.0) / 5,
    },
    label: business.campaignCount > 3 ? 1 : 0,
    timestamp: new Date().toISOString(),
  };
}

export function buildTrainingDataset(
  campaigns: Parameters<typeof extractCampaignFeatures>[0][],
  influencers: Parameters<typeof extractInfluencerFeatures>[0][],
  businesses: Parameters<typeof extractBusinessFeatures>[0][]
): TrainingDataset {
  const features = [
    ...campaigns.map(extractCampaignFeatures),
    ...influencers.map(extractInfluencerFeatures),
    ...businesses.map(extractBusinessFeatures),
  ];
  const positiveCount = features.filter((f) => f.label === 1).length;
  return {
    features,
    metadata: {
      size: features.length,
      extractedAt: new Date().toISOString(),
      featureCount: features.length > 0 ? Object.keys(features[0].features).length : 0,
      positiveRatio: features.length > 0 ? positiveCount / features.length : 0,
    },
  };
}

export function cosineSimilarity(a: Record<string, number>, b: Record<string, number>): number {
  const keys = [...new Set([...Object.keys(a), ...Object.keys(b)])];
  let dotProduct = 0, normA = 0, normB = 0;
  for (const key of keys) {
    const va = a[key] || 0;
    const vb = b[key] || 0;
    dotProduct += va * vb;
    normA += va * va;
    normB += vb * vb;
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  return denominator === 0 ? 0 : dotProduct / denominator;
}

export function findSimilar(
  target: TrainingFeatures,
  candidates: TrainingFeatures[],
  topN = 10
): Array<{ entity: TrainingFeatures; score: number }> {
  return candidates
    .filter((c) => c.entityId !== target.entityId)
    .map((c) => ({ entity: c, score: cosineSimilarity(target.features, c.features) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, topN);
}
