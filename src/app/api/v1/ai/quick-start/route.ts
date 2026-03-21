import { NextRequest } from "next/server";
import { marketingAgent } from "@/lib/ai-agent";
import type { BusinessProfile } from "@/lib/ai-agent";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * POST /api/v1/ai/quick-start
 *
 * Get the single best campaign to start with for quick onboarding.
 * Simpler endpoint that returns just one CampaignRecommendation.
 *
 * Body: { businessType: string, goals?: string[] }
 * Returns: CampaignRecommendation
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/ai/quick-start", { method: "POST", path: "/api/v1/ai/quick-start" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const { businessType, goals = [] } = body as { businessType?: string; goals?: string[] };

    if (!businessType || typeof businessType !== "string" || businessType.trim().length === 0) {
      return apiError(
        "INVALID_BUSINESS_TYPE",
        "businessType is required and must be a non-empty string"
      );
    }

    const sanitizedGoals = Array.isArray(goals)
      ? goals.filter((g: unknown) => typeof g === "string").slice(0, 10)
      : [];

    // Build a minimal profile for quick-start
    const profile: BusinessProfile = {
      businessId: "quick-start",
      name: "Business",
      type: businessType.trim().slice(0, 200),
      size: "small",
      industry: "",
      location: "",
      currentRating: null,
      reviewCount: null,
      socialPresence: [],
      monthlyBudget: null,
      memberCount: null,
      averageTransactionValue: null,
      goals: sanitizedGoals as string[],
    };

    logger.info("Generating quick-start recommendation", {
      businessType: profile.type,
      goals: sanitizedGoals,
    });

    const recommendation = marketingAgent.generateQuickStart(profile);

    logger.info("Quick-start recommendation generated", {
      businessType: profile.type,
      recommendationName: recommendation.name,
      confidence: recommendation.confidence,
    });

    return apiResponse(
      {
        recommendation,
        meta: {
          businessType: profile.type,
          goalsConsidered: sanitizedGoals,
          generatedAt: new Date().toISOString(),
        },
      },
      200,
      {
        "Cache-Control": "private, max-age=300",
        "X-RateLimit-Limit": "50",
        "X-RateLimit-Remaining": "49",
      }
    );
  } catch (err) {
    logger.error("Quick-start generation failed", err);
    return apiError(
      "GENERATION_FAILED",
      "Failed to generate quick-start recommendation. Please try again.",
      500
    );
  }
}
