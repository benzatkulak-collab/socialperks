import { Hono } from "hono";
import { marketingAgent } from "@lib/ai-agent";
import type { BusinessProfile } from "@lib/ai-agent";
import { apiResponse, apiError } from "../../helpers.js";
import { logger } from "@lib/logging";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const { businessType, goals = [] } = body as { businessType?: string; goals?: string[] };

    if (!businessType || typeof businessType !== "string" || businessType.trim().length === 0) {
      return apiError(c, "INVALID_BUSINESS_TYPE", "businessType is required and must be a non-empty string");
    }

    const sanitizedGoals = Array.isArray(goals)
      ? goals.filter((g: unknown) => typeof g === "string").slice(0, 10)
      : [];

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

    const recommendation = marketingAgent.generateQuickStart(profile);

    return apiResponse(c, {
      recommendation,
      meta: {
        businessType: profile.type,
        goalsConsidered: sanitizedGoals,
        generatedAt: new Date().toISOString(),
      },
    }, 200, { "Cache-Control": "private, max-age=300" });
  } catch (err) {
    logger.error("Quick-start generation failed", err);
    return apiError(c, "GENERATION_FAILED", "Failed to generate quick-start recommendation. Please try again.", 500);
  }
});

export default app;
