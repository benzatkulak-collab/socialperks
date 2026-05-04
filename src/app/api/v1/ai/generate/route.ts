/**
 * POST /api/v1/ai/generate
 *
 * Generate campaign suggestions for a business.
 * Requires authentication. Standard rate limit.
 *
 * Body: { businessType (required), businessSize?, budget?, preferences?,
 *         excludeCategories?, includeSeasonal? }
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { generateCampaigns, type GenerateOptions } from "@/lib/ai-engine";
import {
  checkAiGenerationLimit,
  recordAiGeneration,
  getBusinessPlan,
  buildPlanLimitError,
} from "@/lib/billing/enforcement";

interface GenerateBody {
  businessType?: string;
  businessSize?: "solo" | "small" | "medium" | "enterprise";
  budget?: "low" | "medium" | "high";
  preferences?: string[];
  excludeCategories?: string[];
  includeSeasonal?: boolean;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit
  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // Parse body
  const body = await parseBody<GenerateBody>(req);
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

  if (body.budget && !["low", "medium", "high"].includes(body.budget)) {
    return err("INVALID_FIELD", "budget must be low, medium, or high", 400);
  }

  // ── Plan enforcement: AI generation limit ──────────────────────────────────
  const businessId = user.businessId ?? user.id;
  const plan = getBusinessPlan(businessId);
  const aiCheck = checkAiGenerationLimit(businessId, plan);
  if (!aiCheck.allowed) {
    const planLabel = plan.charAt(0).toUpperCase() + plan.slice(1);
    const body403 = buildPlanLimitError(
      `${planLabel} plan allows ${aiCheck.limit} AI generation${aiCheck.limit === 1 ? "" : "s"} per month. Upgrade for more.`,
      aiCheck.limit,
      aiCheck.current,
      plan
    );
    return NextResponse.json(body403, { status: 403 });
  }

  // Generate
  const options: GenerateOptions = {
    businessType: body.businessType,
    businessSize: body.businessSize ?? "small",
    budget: body.budget,
    preferences: body.preferences,
    excludeCategories: body.excludeCategories,
    includeSeasonal: body.includeSeasonal ?? true,
  };

  let suggestions = generateCampaigns(options);

  // Record usage after successful generation
  recordAiGeneration(businessId);

  // Apply category exclusions
  if (body.excludeCategories && body.excludeCategories.length > 0) {
    const excluded = new Set(body.excludeCategories.map((c) => c.toLowerCase()));
    suggestions = suggestions.filter(
      (s) => !excluded.has(s.category.toLowerCase())
    );
  }

  return ok({
    suggestions,
    count: suggestions.length,
    businessType: body.businessType,
    businessSize: options.businessSize,
  });
});
