/**
 * GET /api/v1/benchmarks
 *
 * Public industry benchmarks endpoint.
 * Cached for 30 minutes.
 *
 * Query params: businessType (required)
 */

import type { NextRequest } from "next/server";
import { ok, err, getQuery, withTiming } from "../_shared";
import { withCache } from "@/lib/cache/middleware";
import { setStaleWhileRevalidate, setETag } from "@/lib/api/edge-cache";
import { getBenchmarks } from "@/lib/ai-engine";

export const GET = withCache(withTiming(async (req: NextRequest) => {
  const params = getQuery(req);
  const businessType = params.get("businessType");

  if (!businessType) {
    return err("MISSING_PARAM", "businessType query parameter is required", 400);
  }

  const benchmarks = getBenchmarks(businessType);
  const data = { benchmarks };

  const res = ok(data, 200);
  setStaleWhileRevalidate(res, 600, 7200); // 10 min CDN + 2 hour stale
  setETag(res, data);
  return res;
}), { ttl: 600 });
