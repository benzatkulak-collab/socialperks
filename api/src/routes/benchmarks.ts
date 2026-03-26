import { Hono } from "hono";
import { apiResponse, apiError } from "../helpers.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { getBenchmarks } from "@lib/ai-engine";

const app = new Hono();

app.get("/", rateLimit("public"), (c) => {
  const businessType = c.req.query("businessType");
  if (!businessType) return apiError(c, "MISSING_PARAM", "businessType query parameter is required");

  const benchmarks = getBenchmarks(businessType);
  return apiResponse(c, { benchmarks, generatedAt: new Date().toISOString() }, 200, {
    "Cache-Control": "public, max-age=1800",
  });
});

export default app;
