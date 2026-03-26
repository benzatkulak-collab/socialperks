import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { matchingService } from "@/lib/ml/embedding-system";
import { logger } from "@/lib/logging";

const app = new Hono();

app.get("/", rateLimit("relaxed"), requireAuth, (c) => {
  const userId = c.get("userId");
  const maxCampaigns = parseInt(c.req.query("maxCampaigns") ?? "10");
  const maxBusinesses = parseInt(c.req.query("maxBusinesses") ?? "5");
  const minScore = parseFloat(c.req.query("minScore") ?? "0.3");

  try {
    const recommendations = matchingService.getRecommendations({
      userId: userId ?? "anonymous",
      maxCampaigns: Math.min(50, Math.max(1, maxCampaigns)),
      maxBusinesses: Math.min(20, Math.max(1, maxBusinesses)),
      minScore: Math.min(1, Math.max(0, minScore)),
    });

    return apiResponse(c, { recommendations, meta: { userId, generatedAt: new Date().toISOString() } });
  } catch (err) {
    logger.error("Recommendations failed", err);
    return apiError(c, "RECOMMENDATIONS_FAILED", "Failed to get recommendations", 500);
  }
});

export default app;
