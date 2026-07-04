/**
 * GET /api/v1/benchmarks
 *
 * Public industry benchmarks endpoint. Cached for 30 minutes.
 *
 * - Bare GET → the FULL benchmark catalog across all industries (a
 *   collection). Predictable + self-describing, matching /pricing and
 *   /actions, which also return their full catalog on a bare request.
 *   An agent walking the reference API must not hit a 400 on one endpoint
 *   while its siblings return data.
 * - `?businessType=<name|slug>` → benchmarks for that one industry (an item).
 */

import type { NextRequest } from "next/server";
import { ok, getQuery, withTiming } from "../_shared";
import { getBenchmarks } from "@/lib/ai-engine";
import { INDUSTRIES } from "@/lib/industries";

const CACHE = { "Cache-Control": "public, max-age=1800, s-maxage=1800" };

export const GET = withTiming(async (req: NextRequest) => {
  const businessType = getQuery(req).get("businessType");

  // Collection view — every industry's benchmarks in one call.
  if (!businessType) {
    const benchmarks = INDUSTRIES.map((ind) => ({
      ...getBenchmarks(ind.name),
      slug: ind.slug,
    }));
    return ok({ benchmarks, count: benchmarks.length }, 200, CACHE);
  }

  // Item view — resolve by industry name OR slug so agents can pass either.
  const match = INDUSTRIES.find(
    (ind) =>
      ind.name.toLowerCase() === businessType.toLowerCase() ||
      ind.slug === businessType.toLowerCase(),
  );
  const benchmarks = getBenchmarks(match?.name ?? businessType);

  return ok({ businessType: match?.name ?? businessType, benchmarks }, 200, CACHE);
});
