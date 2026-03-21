import { NextRequest } from "next/server";
import { marketingAgent } from "@/lib/ai-agent";
import type { BusinessProfile } from "@/lib/ai-agent";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * POST /api/v1/ai/campaign-agent
 *
 * Generate a full AI marketing plan for a business.
 * This is the premium endpoint — produces a complete MarketingPlan
 * with 3-5 tailored campaign recommendations, competitive insights,
 * ROI projections, and phased implementation.
 *
 * Body: BusinessProfile
 * Returns: MarketingPlan
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/ai/campaign-agent", { method: "POST", path: "/api/v1/ai/campaign-agent" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const {
      businessId,
      name,
      type,
      size = "small",
      industry = "",
      location = "",
      currentRating = null,
      reviewCount = null,
      socialPresence = [],
      monthlyBudget = null,
      memberCount = null,
      averageTransactionValue = null,
      goals = [],
    } = body as Partial<BusinessProfile>;

    // Validate required fields
    if (!businessId || typeof businessId !== "string") {
      return apiError("MISSING_FIELD", "businessId is required and must be a string");
    }
    if (!name || typeof name !== "string") {
      return apiError("MISSING_FIELD", "name is required and must be a string");
    }
    if (!type || typeof type !== "string" || type.trim().length === 0) {
      return apiError("INVALID_BUSINESS_TYPE", "type is required and must be a non-empty string");
    }

    const validSizes = ["solo", "small", "medium", "large"];
    const sanitizedSize = validSizes.includes(size as string) ? size : "small";

    const sanitizedGoals = Array.isArray(goals)
      ? goals.filter((g: unknown) => typeof g === "string").slice(0, 10)
      : [];

    const profile: BusinessProfile = {
      businessId: String(businessId).trim().slice(0, 100),
      name: String(name).trim().slice(0, 200),
      type: String(type).trim().slice(0, 200),
      size: sanitizedSize as BusinessProfile["size"],
      industry: String(industry).trim().slice(0, 200),
      location: String(location).trim().slice(0, 200),
      currentRating: typeof currentRating === "number" ? Math.min(5, Math.max(0, currentRating)) : null,
      reviewCount: typeof reviewCount === "number" ? Math.max(0, reviewCount) : null,
      socialPresence: Array.isArray(socialPresence)
        ? socialPresence.filter(
            (sp: unknown) =>
              typeof sp === "object" && sp !== null &&
              "platform" in sp && "followers" in sp && "engagement" in sp
          ).slice(0, 20)
        : [],
      monthlyBudget: typeof monthlyBudget === "number" ? Math.max(0, monthlyBudget) : null,
      memberCount: typeof memberCount === "number" ? Math.max(0, memberCount) : null,
      averageTransactionValue: typeof averageTransactionValue === "number" ? Math.max(0, averageTransactionValue) : null,
      goals: sanitizedGoals as string[],
    };

    logger.info("Generating marketing plan", {
      businessId: profile.businessId,
      businessType: profile.type,
      goals: profile.goals,
    });

    const plan = marketingAgent.generatePlan(profile);

    logger.info("Marketing plan generated", {
      businessId: profile.businessId,
      recommendationCount: plan.recommendations.length,
      expectedROI: plan.strategy.expectedMonthlyROI,
    });

    return apiResponse(
      {
        plan,
        meta: {
          businessId: profile.businessId,
          businessType: profile.type,
          recommendationCount: plan.recommendations.length,
          generatedAt: plan.generatedAt,
        },
      },
      200,
      {
        "Cache-Control": "private, max-age=60",
        "X-RateLimit-Limit": "20",
        "X-RateLimit-Remaining": "19",
      }
    );
  } catch (err) {
    logger.error("Marketing plan generation failed", err);
    return apiError(
      "GENERATION_FAILED",
      "Failed to generate marketing plan. Please try again.",
      500
    );
  }
}
