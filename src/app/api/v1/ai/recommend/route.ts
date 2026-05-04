/**
 * POST /api/v1/ai/recommend
 *
 * Generate optimization recommendations based on business type, active
 * campaigns, completion history, and stated goals.
 * Requires authentication. Standard rate limit.
 *
 * Body: { businessType (required), businessSize?, activeCampaigns?,
 *         completionHistory?, goals? }
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import {
  getRecommendations,
  type RecommendationInput,
} from "@/lib/ai-engine";

interface RecommendBody {
  businessType?: string;
  businessSize?: "solo" | "small" | "medium" | "enterprise";
  activeCampaigns?: string[];
  completionHistory?: { campaignName: string; completions: number; category: string }[];
  goals?: ("reviews" | "social-reach" | "referrals" | "engagement" | "brand-awareness")[];
}

const VALID_GOALS = ["reviews", "social-reach", "referrals", "engagement", "brand-awareness"] as const;

export const POST = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit
  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // Parse body
  const body = await parseBody<RecommendBody>(req);
  if (body instanceof Response) return body;

  // Validate
  if (!body.businessType || typeof body.businessType !== "string") {
    return err("MISSING_FIELD", "businessType is required", 400);
  }

  if (
    body.businessSize &&
    !["solo", "small", "medium", "enterprise"].includes(body.businessSize)
  ) {
    return err("INVALID_FIELD", "businessSize must be solo, small, medium, or enterprise", 400);
  }

  if (body.goals) {
    for (const g of body.goals) {
      if (!VALID_GOALS.includes(g)) {
        return err(
          "INVALID_FIELD",
          `Invalid goal "${g}". Must be one of: ${VALID_GOALS.join(", ")}`,
          400
        );
      }
    }
  }

  // Build input
  const input: RecommendationInput = {
    businessType: body.businessType,
    businessSize: body.businessSize ?? "small",
    activeCampaigns: body.activeCampaigns ?? [],
    completionHistory: body.completionHistory ?? [],
    goals: body.goals ?? ["reviews", "social-reach"],
  };

  const recommendations = getRecommendations(input);

  return ok({
    recommendations,
    count: recommendations.length,
    businessType: body.businessType,
    goals: input.goals,
  });
});
