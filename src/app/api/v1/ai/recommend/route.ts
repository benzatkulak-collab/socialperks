import { NextRequest } from "next/server";
import { getRecommendations } from "@/lib/ai-engine";
import type { RecommendationInput } from "@/lib/ai-engine";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * POST /api/v1/ai/recommend
 *
 * Get AI-powered campaign optimization recommendations.
 * Analyzes current performance and suggests next best actions.
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/ai/recommend", { method: "POST", path: "/api/v1/ai/recommend" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const {
      businessType,
      businessSize = "small",
      activeCampaigns = [],
      completionHistory = [],
      goals = [],
    } = body as Partial<RecommendationInput> & { businessType?: string };

    if (!businessType || typeof businessType !== "string") {
      return apiError("MISSING_FIELD", "businessType is required and must be a string");
    }

    const validSizes = ["solo", "small", "medium", "enterprise"];
    const sanitizedSize = validSizes.includes(businessSize as string) ? businessSize : "small";

    const validGoals = ["reviews", "social-reach", "referrals", "engagement", "brand-awareness"];
    const sanitizedGoals = Array.isArray(goals)
      ? goals.filter((g: string) => typeof g === "string" && validGoals.includes(g))
      : [];

    const recommendations = getRecommendations({
      businessType: businessType.trim().slice(0, 200),
      businessSize: sanitizedSize as RecommendationInput["businessSize"],
      activeCampaigns,
      completionHistory,
      goals: sanitizedGoals as RecommendationInput["goals"],
    });

    return apiResponse({
      recommendations,
      meta: {
        businessType,
        goalsAnalyzed: sanitizedGoals,
        totalRecommendations: recommendations.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    logger.error("Recommendation generation failed", err);
    return apiError("RECOMMENDATION_FAILED", "Failed to generate recommendations", 500);
  }
}
