/**
 * POST /api/v1/ai/quick-start
 *
 * Return a single best campaign recommendation for a business.
 * Requires authentication. Standard rate limit.
 *
 * Body: { businessType (required), goals? }
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { marketingAgent } from "@/lib/ai-agent";
import type { BusinessProfile } from "@/lib/ai-agent";

interface QuickStartBody {
  businessType?: string;
  goals?: string[];
}

export const POST = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const csrfError = requireCsrf(req, user);
  if (csrfError) return csrfError;

  // Rate limit
  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // Parse body
  const body = await parseBody<QuickStartBody>(req);
  if (body instanceof Response) return body;

  // Validate
  if (!body.businessType || typeof body.businessType !== "string") {
    return err("MISSING_FIELD", "businessType is required", 400);
  }

  // Build a minimal profile for quick-start
  const profile: BusinessProfile = {
    businessId: "quick-start",
    name: body.businessType,
    type: body.businessType,
    size: "small",
    industry: "",
    location: "",
    currentRating: null,
    reviewCount: null,
    socialPresence: [],
    monthlyBudget: null,
    memberCount: null,
    averageTransactionValue: null,
    goals: body.goals ?? ["more_reviews", "brand_awareness"],
  };

  const recommendation = marketingAgent.generateQuickStart(profile);

  if (!recommendation) {
    return err(
      "NO_RECOMMENDATION",
      "Could not generate a recommendation for this business type",
      404
    );
  }

  return ok({
    recommendation,
    businessType: body.businessType,
  });
});
