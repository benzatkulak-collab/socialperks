import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError } from "../helpers.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { estimatePricing } from "@lib/ai-engine";
import { logger } from "@lib/logging";

const app = new Hono<AppEnv>();

app.get("/", rateLimit("public"), (c) => {
  try {
    const actionId = c.req.query("actionId");
    const businessType = c.req.query("businessType");

    if (!actionId) return apiError(c, "MISSING_PARAM", "actionId query parameter is required");
    if (!businessType) return apiError(c, "MISSING_PARAM", "businessType query parameter is required");

    const pricing = estimatePricing(actionId, businessType);

    return apiResponse(c, { pricing, generatedAt: new Date().toISOString() }, 200, {
      "Cache-Control": "public, max-age=3600",
    });
  } catch (err) {
    logger.error("Pricing estimation failed", err);
    return apiError(c, "PRICING_FAILED", "Failed to estimate pricing", 500);
  }
});

export default app;
