/**
 * POST /api/v1/ai/campaign-agent
 *
 * Generate a full AI marketing plan for a business.
 * Requires authentication. Standard rate limit.
 *
 * Body: { businessId (required), name (required), type (required),
 *         size?, industry?, location?, currentRating?, reviewCount?,
 *         socialPresence?, monthlyBudget?, memberCount?,
 *         averageTransactionValue?, goals? }
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
import { marketingAgent } from "@/lib/ai-agent";
import type { BusinessProfile } from "@/lib/ai-agent";

interface CampaignAgentBody {
  businessId?: string;
  name?: string;
  type?: string;
  size?: "solo" | "small" | "medium" | "large";
  industry?: string;
  location?: string;
  currentRating?: number | null;
  reviewCount?: number | null;
  socialPresence?: { platform: string; followers: number; engagement: number }[];
  monthlyBudget?: number | null;
  memberCount?: number | null;
  averageTransactionValue?: number | null;
  goals?: string[];
}

export const POST = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit
  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // Parse body
  const body = await parseBody<CampaignAgentBody>(req);
  if (body instanceof Response) return body;

  // Validate required fields
  if (!body.businessId || typeof body.businessId !== "string") {
    return err("MISSING_FIELD", "businessId is required", 400);
  }
  if (!body.name || typeof body.name !== "string") {
    return err("MISSING_FIELD", "name is required", 400);
  }
  if (!body.type || typeof body.type !== "string") {
    return err("MISSING_FIELD", "type is required", 400);
  }

  // Tenant isolation: user can only generate plans for their own business
  if (user.businessId && body.businessId !== user.businessId) {
    return err("FORBIDDEN", "You can only generate plans for your own business", 403);
  }

  if (
    body.size &&
    !["solo", "small", "medium", "large"].includes(body.size)
  ) {
    return err("INVALID_FIELD", "size must be solo, small, medium, or large", 400);
  }

  // Build profile
  const profile: BusinessProfile = {
    businessId: body.businessId,
    name: body.name,
    type: body.type,
    size: body.size ?? "small",
    industry: body.industry ?? "",
    location: body.location ?? "",
    currentRating: body.currentRating ?? null,
    reviewCount: body.reviewCount ?? null,
    socialPresence: body.socialPresence ?? [],
    monthlyBudget: body.monthlyBudget ?? null,
    memberCount: body.memberCount ?? null,
    averageTransactionValue: body.averageTransactionValue ?? null,
    goals: body.goals ?? ["more_reviews", "brand_awareness"],
  };

  const plan = marketingAgent.generatePlan(profile);

  return ok({
    plan,
    recommendationCount: plan.recommendations.length,
    phases: plan.implementationOrder.length,
  });
});
