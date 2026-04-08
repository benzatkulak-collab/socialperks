/**
 * AI Marketing Campaign Agent — Agent Class
 *
 * The MarketingAgent orchestrates business analysis, recommendation
 * generation, plan creation, and ROI projections.
 *
 * This module is imported by API routes only.
 * The frontend calls /api/v1/ai/campaign-agent — it never runs this directly.
 */

import { detectTraits } from "../ai-engine";
import { legalGuard } from "../legal-compliance";
import type { BusinessProfile, CampaignRecommendation, MarketingPlan } from "./types";
import { uid } from "./helpers";
import {
  analyzeBusinessType,
  analyzeGoals,
  analyzeBudget,
  analyzeCompetition,
  analyzeSocialPresence,
} from "./analysis";
import { generateRecommendations } from "./recommendations";

class MarketingAgent {
  // ── Business Analysis ──

  analyzeBusinessType = analyzeBusinessType;
  analyzeGoals = analyzeGoals;
  analyzeCompetition = analyzeCompetition;
  analyzeSocialPresence = analyzeSocialPresence;
  analyzeBudget = analyzeBudget;

  // ── Recommendation Engine ──

  generateRecommendations(profile: BusinessProfile): CampaignRecommendation[] {
    return generateRecommendations(profile);
  }

  // ── Plan Generation ──

  generatePlan(profile: BusinessProfile): MarketingPlan {
    const recommendations = this.generateRecommendations(profile);
    const { insights } = this.analyzeBusinessType(profile.type);
    const goalAnalysis = this.analyzeGoals(profile.goals);
    const budgetAnalysis = analyzeBudget(
      profile.monthlyBudget,
      profile.averageTransactionValue,
      profile.memberCount
    );
    const competitive = this.analyzeCompetition(profile.type, profile.location);

    // Calculate strategy metrics
    const totalMonthlyBudget = budgetAnalysis.effectiveBudget;
    const avgROI = recommendations.reduce((sum, r) => sum + r.projectedResults.estimatedROI, 0) / recommendations.length;

    const primaryGoal = goalAnalysis.prioritized[0]?.goal ?? "brand_awareness";
    const criticalRecs = recommendations.filter(r => r.priority === "critical" || r.priority === "high");

    const strategy = {
      summary: `Your ${profile.type} marketing plan focuses on ${this._goalLabel(primaryGoal)} through ${recommendations.length} coordinated campaigns. ${criticalRecs.length > 0 ? `Start with "${criticalRecs[0].name}" as your foundation, then layer on additional campaigns.` : "Build momentum by launching campaigns in phases."} Expected ROI: ${avgROI.toFixed(1)}x within the first 3 months.`,
      primaryGoal: this._goalLabel(primaryGoal),
      timeline: "3-6 months for full implementation, results visible within 2-4 weeks",
      totalMonthlyBudget,
      expectedMonthlyROI: Math.round(avgROI * 10) / 10,
      keyInsights: insights.slice(0, 5),
    };

    // Build implementation phases
    const implementationOrder: MarketingPlan["implementationOrder"] = [];

    // Phase 1: Foundation (Week 1)
    const foundationCampaigns = recommendations.filter(r => r.priority === "critical");
    if (foundationCampaigns.length > 0) {
      implementationOrder.push({
        phase: "Week 1 — Foundation",
        actions: foundationCampaigns.map(r => `Launch "${r.name}" campaign`),
        expectedOutcome: "Establish review generation and core social presence",
      });
    }

    // Phase 2: Growth (Month 1)
    const foundationIds = new Set(foundationCampaigns.map(r => r.id));
    const growthCampaigns = recommendations.filter(r => r.priority === "high" && !foundationIds.has(r.id));
    if (growthCampaigns.length > 0) {
      implementationOrder.push({
        phase: "Month 1 — Growth",
        actions: growthCampaigns.map(r => `Launch "${r.name}" campaign`),
        expectedOutcome: "Build multi-channel presence and content pipeline",
      });
    }

    // Phase 3: Scale (Month 2-3)
    const scaleCampaigns = recommendations.filter(r => r.priority === "medium" || r.priority === "low");
    if (scaleCampaigns.length > 0) {
      implementationOrder.push({
        phase: "Month 2-3 — Scale",
        actions: scaleCampaigns.map(r => `Launch "${r.name}" campaign`),
        expectedOutcome: "Full marketing engine running across all recommended channels",
      });
    }

    // Phase 4: Optimize (Month 3+)
    implementationOrder.push({
      phase: "Month 3+ — Optimize",
      actions: [
        "Review campaign performance data and adjust rewards",
        "Increase rewards for top-performing campaigns",
        "Sunset or revise underperforming campaigns",
        "Explore advanced campaigns (seasonal, influencer collabs)",
      ],
      expectedOutcome: "Continuous improvement loop that compounds results over time",
    });

    // Generate legal briefing
    const briefing = legalGuard.getLegalBriefing(profile.type);

    return {
      id: uid(),
      businessId: profile.businessId,
      businessProfile: profile,
      generatedAt: new Date().toISOString(),
      recommendations,
      strategy,
      competitiveInsights: competitive,
      implementationOrder,
      legalBriefing: {
        incentivizableActions: briefing.incentivizableActions,
        nonIncentivizableActions: briefing.nonIncentivizableActions,
        explanation: briefing.explanation,
        reviewStrategy: briefing.reviewStrategy,
      },
    };
  }

  generateQuickStart(profile: BusinessProfile): CampaignRecommendation {
    const recommendations = this.generateRecommendations(profile);
    // Return the highest priority, highest confidence recommendation
    return recommendations[0];
  }

  revisePlan(
    plan: MarketingPlan,
    feedback: { removeIds?: string[]; adjustBudget?: number; addGoals?: string[]; notes?: string }
  ): MarketingPlan {
    const updatedProfile = { ...plan.businessProfile };

    if (feedback.adjustBudget !== undefined) {
      updatedProfile.monthlyBudget = feedback.adjustBudget;
    }
    if (feedback.addGoals) {
      updatedProfile.goals = [...new Set([...updatedProfile.goals, ...feedback.addGoals])];
    }

    // Regenerate with updated profile
    const newPlan = this.generatePlan(updatedProfile);

    // Remove explicitly rejected recommendations
    if (feedback.removeIds && feedback.removeIds.length > 0) {
      newPlan.recommendations = newPlan.recommendations.filter(
        (r) => !feedback.removeIds!.includes(r.id)
      );
    }

    return newPlan;
  }

  // ── ROI Projections ──

  projectROI(
    recommendation: CampaignRecommendation,
    profile: BusinessProfile
  ): {
    conservative: { roi: number; newCustomers: number; revenue: number };
    realistic: { roi: number; newCustomers: number; revenue: number };
    optimistic: { roi: number; newCustomers: number; revenue: number };
  } {
    const base = recommendation.projectedResults;
    const avgTx = profile.averageTransactionValue ?? 30;

    return {
      conservative: {
        roi: Math.round(base.estimatedROI * 0.6 * 10) / 10,
        newCustomers: Math.round(base.estimatedNewCustomers * 0.5),
        revenue: Math.round(base.estimatedNewCustomers * 0.5 * avgTx),
      },
      realistic: {
        roi: base.estimatedROI,
        newCustomers: base.estimatedNewCustomers,
        revenue: Math.round(base.estimatedNewCustomers * avgTx),
      },
      optimistic: {
        roi: Math.round(base.estimatedROI * 1.8 * 10) / 10,
        newCustomers: Math.round(base.estimatedNewCustomers * 2),
        revenue: Math.round(base.estimatedNewCustomers * 2 * avgTx),
      },
    };
  }

  calculateCostPerAcquisition(
    recommendation: CampaignRecommendation,
    profile: BusinessProfile
  ): {
    costPerAcquisition: number;
    comparisonToIndustryAvg: string;
    verdict: string;
  } {
    const cpa = recommendation.projectedResults.costPerAcquisition;
    // Industry average CPA benchmarks (simulated)
    const traits = detectTraits(profile.type);
    let industryAvgCPA = 25;
    if (traits.food) industryAvgCPA = 18;
    if (traits.wellness) industryAvgCPA = 35;
    if (traits.service) industryAvgCPA = 45;
    if (traits.b2b) industryAvgCPA = 80;
    if (traits.healthcare) industryAvgCPA = 60;

    const comparisonRatio = cpa / industryAvgCPA;
    let comparisonToIndustryAvg: string;
    let verdict: string;

    if (comparisonRatio < 0.5) {
      comparisonToIndustryAvg = `${Math.round((1 - comparisonRatio) * 100)}% below industry average`;
      verdict = "Excellent — significantly below typical acquisition costs for your industry";
    } else if (comparisonRatio < 0.8) {
      comparisonToIndustryAvg = `${Math.round((1 - comparisonRatio) * 100)}% below industry average`;
      verdict = "Good — below average cost per acquisition";
    } else if (comparisonRatio < 1.2) {
      comparisonToIndustryAvg = "In line with industry average";
      verdict = "Acceptable — typical cost for your industry";
    } else {
      comparisonToIndustryAvg = `${Math.round((comparisonRatio - 1) * 100)}% above industry average`;
      verdict = "Consider adjusting — higher than typical for your industry";
    }

    return { costPerAcquisition: cpa, comparisonToIndustryAvg, verdict };
  }

  // ── Private helpers ──

  private _goalLabel(goal: string): string {
    const labels: Record<string, string> = {
      more_reviews: "building your review presence",
      instagram_growth: "growing your Instagram following",
      foot_traffic: "driving foot traffic",
      brand_awareness: "increasing brand awareness",
      member_retention: "improving member retention",
      tiktok_growth: "building your TikTok presence",
      increase_revenue: "driving revenue growth",
    };
    return labels[goal] ?? "growing your business";
  }
}

// ═══════════════ Export Singleton ═══════════════

export const marketingAgent = new MarketingAgent();
