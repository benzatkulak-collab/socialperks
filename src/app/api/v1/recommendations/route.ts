import { NextRequest } from "next/server";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { matchingService } from "@/lib/ml/embedding-system";
import type { InfluencerEmbeddingInput } from "@/lib/ml/embedding-system";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/recommendations — Get campaign recommendations for an influencer
 *
 * Query params:
 *   - influencerId: string (required) — the influencer ID
 *   - maxCampaigns: number (default 5) — max campaign recommendations
 *   - maxBusinesses: number (default 3) — max business recommendations
 *   - minScore: number (default 0.1) — minimum similarity score
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  logger.info("GET /api/v1/recommendations", { method: "GET", path: "/api/v1/recommendations" });

  const { searchParams } = new URL(request.url);
  const influencerId = searchParams.get("influencerId");

  if (!influencerId) {
    return apiError("MISSING_PARAM", "influencerId query parameter is required", 400);
  }

  const maxCampaigns = Math.min(
    Math.max(1, parseInt(searchParams.get("maxCampaigns") ?? "5") || 5),
    20
  );
  const maxBusinesses = Math.min(
    Math.max(1, parseInt(searchParams.get("maxBusinesses") ?? "3") || 3),
    10
  );
  const minScore = Math.max(0, parseFloat(searchParams.get("minScore") ?? "0.1") || 0.1);

  try {
    // Build an influencer embedding input from the ID
    // The matching service will look up the vector store for the influencer
    const store = matchingService.getStore();
    const existingEntry = store.get(`inf_${influencerId}`);

    let influencerInput: InfluencerEmbeddingInput;

    if (existingEntry) {
      // Reconstruct input from stored metadata
      influencerInput = {
        id: influencerId,
        niches: (existingEntry.metadata.niches as string[]) ?? [],
        followerCount: (existingEntry.metadata.followerCount as number) ?? 0,
        engagementRate: (existingEntry.metadata.engagementRate as number) ?? 0,
        platforms: ((existingEntry.metadata.platformIds as string[]) ?? []).map((pid) => ({
          platformId: pid,
          followers: 0,
        })),
        tier: (existingEntry.metadata.tier as "micro" | "mid" | "macro" | "mega") ?? "micro",
        location: (existingEntry.metadata.location as string) ?? "",
      };
    } else {
      // No existing embedding — use a minimal default for the query
      influencerInput = {
        id: influencerId,
        niches: [],
        followerCount: 0,
        engagementRate: 0,
        platforms: [],
        tier: "micro",
      };
    }

    const recommendations = matchingService.getRecommendations(influencerInput, {
      maxCampaigns,
      maxBusinesses,
      minScore,
    });

    const durationMs = Math.round(performance.now() - startTime);
    logger.info("GET /api/v1/recommendations completed", {
      durationMs,
      influencerId,
      resultCount: recommendations.length,
    });

    return apiResponse({
      influencerId,
      recommendations,
      meta: {
        totalResults: recommendations.length,
        maxCampaigns,
        maxBusinesses,
        minScore,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (err) {
    const durationMs = Math.round(performance.now() - startTime);
    logger.error("GET /api/v1/recommendations failed", err, { durationMs });
    return apiError("RECOMMENDATION_FAILED", "Failed to generate recommendations", 500);
  }
}
