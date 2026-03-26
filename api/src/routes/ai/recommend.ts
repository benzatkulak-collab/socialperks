import { Hono } from "hono";
import { getRecommendations } from "@lib/ai-engine";
import type { RecommendationInput } from "@lib/ai-engine";
import { apiResponse, apiError } from "../../helpers.js";
import { logger } from "@lib/logging";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const {
      businessType,
      businessSize = "small",
      activeCampaigns = [],
      completionHistory = [],
      goals = [],
    } = body as Partial<RecommendationInput> & { businessType?: string };

    if (!businessType || typeof businessType !== "string") {
      return apiError(c, "MISSING_FIELD", "businessType is required and must be a string");
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

    return apiResponse(c, {
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
    return apiError(c, "RECOMMENDATION_FAILED", "Failed to generate recommendations", 500);
  }
});

export default app;
