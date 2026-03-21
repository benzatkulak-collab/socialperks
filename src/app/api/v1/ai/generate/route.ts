import { NextRequest } from "next/server";
import { generateCampaigns } from "@/lib/ai-engine";
import type { GenerateOptions } from "@/lib/ai-engine";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * POST /api/v1/ai/generate
 *
 * Generate AI-tailored campaign suggestions for a business.
 * This is the ONLY place campaign generation logic runs.
 * The frontend calls this — it never generates campaigns client-side.
 */
export async function POST(request: NextRequest) {
  logger.info("POST /api/v1/ai/generate", { method: "POST", path: "/api/v1/ai/generate" });

  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const {
      businessType,
      businessSize = "small",
      budget,
      preferences,
      excludeCategories,
      includeSeasonal = true,
    } = body as Partial<GenerateOptions> & { businessType?: string };

    if (!businessType || typeof businessType !== "string" || businessType.trim().length === 0) {
      return apiError(
        "INVALID_BUSINESS_TYPE",
        "businessType is required and must be a non-empty string"
      );
    }

    const validSizes = ["solo", "small", "medium", "enterprise"];
    const size = validSizes.includes(businessSize) ? businessSize : "small";

    const campaigns = generateCampaigns({
      businessType: businessType.trim().slice(0, 200),
      businessSize: size as GenerateOptions["businessSize"],
      budget: budget as GenerateOptions["budget"],
      preferences,
      excludeCategories,
      includeSeasonal,
    });

    return apiResponse(
      {
        campaigns,
        meta: {
          businessType: businessType.trim(),
          businessSize: size,
          totalGenerated: campaigns.length,
          generatedAt: new Date().toISOString(),
        },
      },
      200,
      {
        "Cache-Control": "private, max-age=300",
        "X-RateLimit-Limit": "100",
        "X-RateLimit-Remaining": "99",
      }
    );
  } catch (err) {
    logger.error("Campaign generation failed", err);
    return apiError(
      "GENERATION_FAILED",
      "Failed to generate campaigns. Please try again.",
      500
    );
  }
}
