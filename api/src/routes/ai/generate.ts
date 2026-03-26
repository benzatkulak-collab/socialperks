import { Hono } from "hono";
import { generateCampaigns } from "@/lib/ai-engine";
import type { GenerateOptions } from "@/lib/ai-engine";
import { apiResponse, apiError } from "../../helpers.js";
import { logger } from "@/lib/logging";

const app = new Hono();

app.post("/", async (c) => {
  try {
    const body = await c.req.json();

    const {
      businessType,
      businessSize = "small",
      budget,
      preferences,
      excludeCategories,
      includeSeasonal = true,
    } = body as Partial<GenerateOptions> & { businessType?: string };

    if (!businessType || typeof businessType !== "string" || businessType.trim().length === 0) {
      return apiError(c, "INVALID_BUSINESS_TYPE", "businessType is required and must be a non-empty string");
    }

    const validSizes = ["solo", "small", "medium", "enterprise"];
    const size = validSizes.includes(businessSize) ? businessSize : "small";

    const campaigns = generateCampaigns({
      businessType: businessType.trim().slice(0, 200),
      businessSize: size as GenerateOptions["businessSize"],
      budget: budget as GenerateOptions["budget"],
      preferences,
      excludeCategories,
      includeSeasonal,
    });

    return apiResponse(c, {
      campaigns,
      meta: {
        businessType: businessType.trim(),
        businessSize: size,
        totalGenerated: campaigns.length,
        generatedAt: new Date().toISOString(),
      },
    }, 200, {
      "Cache-Control": "private, max-age=300",
    });
  } catch (err) {
    logger.error("Campaign generation failed", err);
    return apiError(c, "GENERATION_FAILED", "Failed to generate campaigns. Please try again.", 500);
  }
});

export default app;
