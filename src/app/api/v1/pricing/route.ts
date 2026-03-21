import { NextRequest } from "next/server";
import { estimatePricing } from "@/lib/ai-engine";
import { ALL_ACTIONS } from "@/lib/platforms";
import { apiResponse, apiError } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/pricing
 *
 * The Pricing Oracle — returns market rate for any marketing action.
 * This is what AI agents query to understand what actions cost.
 */
export async function GET(request: NextRequest) {
  logger.info("GET /api/v1/pricing", { method: "GET", path: "/api/v1/pricing" });

  const { searchParams } = new URL(request.url);
  const actionId = searchParams.get("actionId");
  const platformId = searchParams.get("platformId");
  const businessType = searchParams.get("businessType") ?? "General Business";

  try {
    if (actionId) {
      const action = ALL_ACTIONS.find((a) => a.id === actionId);
      if (!action) {
        return apiError("ACTION_NOT_FOUND", `Action '${String(actionId).slice(0, 50)}' not found`, 404);
      }

      const pricing = estimatePricing(actionId, businessType);
      return apiResponse({
        action: {
          id: action.id,
          label: action.label,
          type: action.type,
          platform: action.platformName,
          effort: action.effort,
        },
        pricing,
      });
    }

    if (platformId) {
      const platformActions = ALL_ACTIONS.filter((a) => a.platformId === platformId);
      if (platformActions.length === 0) {
        return apiError("PLATFORM_NOT_FOUND", `Platform '${String(platformId).slice(0, 50)}' not found`, 404);
      }

      const data = platformActions.map((action) => ({
        action: { id: action.id, label: action.label, type: action.type },
        pricing: estimatePricing(action.id, businessType),
      }));

      return apiResponse(data);
    }

    // Return all pricing
    const data = ALL_ACTIONS.map((action) => ({
      action: { id: action.id, label: action.label, type: action.type, platform: action.platformName },
      pricing: estimatePricing(action.id, businessType),
    }));

    return apiResponse(
      { data, meta: { total: data.length, businessType } },
      200,
      { "Cache-Control": "public, max-age=3600", "X-RateLimit-Limit": "1000", "X-RateLimit-Remaining": "999" }
    );
  } catch (err) {
    logger.error("Pricing calculation failed", err);
    return apiError("PRICING_ERROR", "Failed to calculate pricing", 500);
  }
}
