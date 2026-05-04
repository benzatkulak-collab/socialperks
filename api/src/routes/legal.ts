import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { legalGuard } from "@lib/legal-compliance";

const app = new Hono<AppEnv>();

app.get("/", rateLimit("relaxed"), requireAuth, (c) => {
  const businessType = c.req.query("businessType");
  const actions = c.req.query("actions");

  if (actions) {
    const actionList = actions.split(",").filter(Boolean);
    const scan = legalGuard.scanCampaign(actionList);
    return apiResponse(c, { scan });
  }

  if (businessType) {
    const briefing = legalGuard.getLegalBriefing(businessType);
    return apiResponse(c, { briefing });
  }

  return apiError(c, "MISSING_PARAM", "businessType or actions query parameter is required");
});

export default app;
