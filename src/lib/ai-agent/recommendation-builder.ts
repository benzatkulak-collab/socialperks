/**
 * AI Marketing Campaign Agent — Recommendation Builder
 *
 * Shared helper that constructs a CampaignRecommendation from
 * high-level parameters. Used by both core and specialized
 * recommendation generators.
 */

import type { BusinessTypeProfile, CampaignRecommendation } from "./types";
import { uid, findPlatform, findAction, clamp } from "./helpers";

export interface RecommendationParams {
  name: string;
  description: string;
  type: CampaignRecommendation["type"];
  priority: CampaignRecommendation["priority"];
  platformIds: string[];
  actionSpecs: { id: string; reason: string }[];
  tiers: CampaignRecommendation["suggestedTiers"];
  cycle: CampaignRecommendation["suggestedCycle"];
  duration: string;
  launchTime: string;
  reasoning: string;
  dataPoints: string[];
  risks: string[];
  confidence: number;
  monthlyPosts: number;
  monthlyReviews: number;
  reachMultiplier: number;
}

export function buildRecommendation(
  params: RecommendationParams,
  avgTx: number,
  typeProfile: BusinessTypeProfile,
  businessType: string,
): CampaignRecommendation {
  const platforms = params.platformIds.map((pid) => {
    const p = findPlatform(pid);
    const channelIndex = typeProfile.bestChannels.indexOf(pid);
    const reason = channelIndex >= 0
      ? `#${channelIndex + 1} recommended channel for ${businessType} businesses`
      : `Extends reach to ${p?.name ?? pid} audience`;
    return { id: pid, name: p?.name ?? pid, reason };
  });

  const actions = params.actionSpecs.map((spec) => {
    const prefix = spec.id.split("_")[0];
    const p = findPlatform(prefix);
    const a = p ? findAction(prefix, spec.id) : null;
    return {
      id: spec.id,
      label: a?.label ?? spec.id,
      platform: p?.name ?? prefix,
      reason: spec.reason,
    };
  });

  // ROI calculation
  const totalActionValue = params.actionSpecs.reduce((sum, spec) => {
    const prefix = spec.id.split("_")[0];
    const a = findAction(prefix, spec.id);
    return sum + (a?.value ?? 2);
  }, 0);

  const monthlyDiscountCost = params.tiers.reduce((sum, tier) => {
    const rewardValue = tier.reward.type === "percentage" ? (avgTx * tier.reward.value / 100) : tier.reward.value;
    const estimatedRedemptions = Math.max(2, Math.round(15 / tier.requiredActions));
    return sum + rewardValue * estimatedRedemptions;
  }, 0);

  const estimatedReach = Math.round(totalActionValue * params.reachMultiplier * 100);
  const estimatedNewCustomers = Math.max(2, Math.round(estimatedReach * 0.012));
  const estimatedROI = monthlyDiscountCost > 0
    ? Math.round((estimatedNewCustomers * avgTx) / monthlyDiscountCost * 10) / 10
    : 3.0;
  const costPerAcquisition = estimatedNewCustomers > 0
    ? Math.round(monthlyDiscountCost / estimatedNewCustomers * 100) / 100
    : 0;

  return {
    id: uid(),
    name: params.name,
    description: params.description,
    type: params.type,
    priority: params.priority,
    platforms,
    actions,
    suggestedTiers: params.tiers,
    suggestedCycle: params.cycle,
    suggestedDuration: params.duration,
    bestLaunchTime: params.launchTime,
    projectedResults: {
      monthlyPosts: params.monthlyPosts,
      monthlyReviews: params.monthlyReviews,
      estimatedReach,
      estimatedNewCustomers,
      estimatedROI: Math.max(1.2, estimatedROI),
      costPerAcquisition: Math.max(1, costPerAcquisition),
    },
    reasoning: params.reasoning,
    dataPoints: params.dataPoints,
    risks: params.risks,
    confidence: clamp(params.confidence, 0, 1),
  };
}
