import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { legalGuard } from "@lib/legal-compliance";

const app = new Hono();

app.get("/", rateLimit("relaxed"), requireAuth, (c) => {
  const businessType = c.req.query("businessType");
  const actions = c.req.query("actions");

  if (actions) {
    const actionList = actions.split(",").filter(Boolean);
    const scan = legalGuard.scanCampaign(actionList);
    return apiResponse(c, { scan });
  }

  if (businessType) {
    const briefing = legalGuard.getBriefing(businessType);
    return apiResponse(c, { briefing });
  }

  return apiError(c, "MISSING_PARAM", "businessType or actions query parameter is required");
});

export default app;
