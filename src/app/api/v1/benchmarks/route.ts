/**
 * GET /api/v1/benchmarks
 *
 * Public industry benchmarks endpoint.
 * Cached for 30 minutes.
 *
 * Query params: businessType (required)
 */

import { NextRequest } from "next/server";
import { ok, err, getQuery, withTiming } from "../_shared";
import { getBenchmarks } from "@/lib/ai-engine";

export const GET = withTiming(async (req: NextRequest) => {
  const params = getQuery(req);
  const businessType = params.get("businessType");

  if (!businessType) {
    return err("MISSING_PARAM", "businessType query parameter is required", 400);
  }

  const benchmarks = getBenchmarks(businessType);

  return ok(
    { benchmarks },
    200,
    { "Cache-Control": "public, max-age=1800, s-maxage=1800" }
  );
});
