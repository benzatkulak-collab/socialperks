/**
 * GET /api/v1/discover
 *
 * Semantic discovery endpoint for the influencer Discover tab.
 * Returns campaigns ranked by semantic similarity, platform match, and reward value.
 *
 * Query params:
 *   influencerId (required) — the influencer to find campaigns for
 *   limit        (optional) — max results (default 20, max 50)
 *   platforms    (optional) — comma-separated platform IDs to filter (e.g., "ig,tt")
 *   minScore     (optional) — minimum composite score threshold (0-1, default 0)
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, withTiming } from "../_shared";
import { validateString, validateNumber } from "@/lib/security/validate";
import { getRecommendedCampaigns } from "@/lib/search/semantic-search";

export const GET = withTiming(async (req: NextRequest) => {
  // Relaxed rate limit for public discovery
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);

  // Required: influencerId
  const idParam = params.get("influencerId");
  const idValidation = validateString(idParam, "influencerId", { min: 1, max: 100 });
  if (!idValidation.success) {
    return err("MISSING_PARAM", "influencerId query parameter is required", 400);
  }
  const influencerId = idValidation.data;

  // Optional: limit (default 20, max 50)
  let limit = 20;
  const limitParam = params.get("limit");
  if (limitParam) {
    const lv = validateNumber(limitParam, "limit", { min: 1, max: 50 });
    if (!lv.success) return err("INVALID_LIMIT", lv.error, 400);
    limit = lv.data;
  }

  // Optional: platforms filter (comma-separated)
  let platforms: string[] | undefined;
  const platformsParam = params.get("platforms");
  if (platformsParam) {
    platforms = platformsParam
      .split(",")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
  }

  // Optional: minimum score threshold (0-1)
  let minScore = 0;
  const minScoreParam = params.get("minScore");
  if (minScoreParam) {
    const sv = validateNumber(minScoreParam, "minScore", { min: 0, max: 1 });
    if (!sv.success) return err("INVALID_MIN_SCORE", sv.error, 400);
    minScore = sv.data;
  }

  // Fetch semantic recommendations
  const recommendations = getRecommendedCampaigns(influencerId, limit, {
    platforms,
    minScore,
  });

  if (recommendations.length === 0 && !idParam?.startsWith("i")) {
    return err("NOT_FOUND", `No recommendations found for influencer "${influencerId}"`, 404);
  }

  return ok({
    influencerId,
    campaigns: recommendations,
    total: recommendations.length,
    filters: {
      platforms: platforms ?? null,
      minScore,
      limit,
    },
  });
});
