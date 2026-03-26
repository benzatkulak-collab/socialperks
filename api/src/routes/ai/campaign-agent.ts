import { Hono } from "hono";
import { marketingAgent } from "@lib/ai-agent";
import type { BusinessProfile } from "@lib/ai-agent";
import { apiResponse, apiError } from "../../helpers.js";
import { logger } from "@lib/logging";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const {
      businessId, name, type, size = "small", industry = "", location = "",
      currentRating = null, reviewCount = null, socialPresence = [],
      monthlyBudget = null, memberCount = null, averageTransactionValue = null,
      goals = [],
    } = body as Partial<BusinessProfile>;

    if (!businessId || typeof businessId !== "string") {
      return apiError(c, "MISSING_FIELD", "businessId is required and must be a string");
    }
    if (!name || typeof name !== "string") {
      return apiError(c, "MISSING_FIELD", "name is required and must be a string");
    }
    if (!type || typeof type !== "string" || type.trim().length === 0) {
      return apiError(c, "INVALID_BUSINESS_TYPE", "type is required and must be a non-empty string");
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

    const plan = marketingAgent.generatePlan(profile);

    logger.info("Marketing plan generated", {
      businessId: profile.businessId,
      recommendationCount: plan.recommendations.length,
      expectedROI: plan.strategy.expectedMonthlyROI,
    });

    return apiResponse(c, {
      plan,
      meta: {
        businessId: profile.businessId,
        businessType: profile.type,
        recommendationCount: plan.recommendations.length,
        generatedAt: plan.generatedAt,
      },
    }, 200, { "Cache-Control": "private, max-age=60" });
  } catch (err) {
    logger.error("Marketing plan generation failed", err);
    return apiError(c, "GENERATION_FAILED", "Failed to generate marketing plan. Please try again.", 500);
  }
});

export default app;
