/**
 * GET /api/v1/pricing
 *
 * Public pricing oracle. Returns market-rate pricing for actions
 * based on platform data and business type modifiers.
 * Cached for 1 hour.
 *
 * Query params: actionId?, platformId?, businessType?
 */

import type { NextRequest } from "next/server";
import { ok, err, getQuery, withTiming } from "../_shared";
import { estimatePricing } from "@/lib/ai-engine";
import { PLATFORMS, ALL_ACTIONS } from "@/lib/platforms";

export const GET = withTiming(async (req: NextRequest) => {
  const params = getQuery(req);

  const actionId = params.get("actionId");
  const platformId = params.get("platformId");
  const businessType = params.get("businessType") ?? "general";

  // If specific actionId, return single pricing estimate
  if (actionId) {
    const action = ALL_ACTIONS.find((a) => a.id === actionId);
    if (!action) {
      return err(
        "UNKNOWN_ACTION",
        `Action "${actionId}" not found`,
        404
      );
    }

    const pricing = estimatePricing(actionId, businessType);

    return ok(
      {
        pricing,
        action: {
          id: action.id,
          label: action.label,
          platform: action.platformName,
          type: action.type,
          effort: action.effort,
        },
      },
      200,
      { "Cache-Control": "public, max-age=3600, s-maxage=3600" }
    );
  }

  // If platformId, return pricing for all actions on that platform
  if (platformId) {
    const platform = PLATFORMS.find((p) => p.id === platformId);
    if (!platform) {
      return err(
        "UNKNOWN_PLATFORM",
        `Platform "${platformId}" not found`,
        404
      );
    }

    const pricingList = platform.actions.map((action) => ({
      pricing: estimatePricing(action.id, businessType),
      action: {
        id: action.id,
        label: action.label,
        type: action.type,
        effort: action.effort,
      },
    }));

    return ok(
      {
        platform: { id: platform.id, name: platform.name },
        pricing: pricingList,
        count: pricingList.length,
      },
      200,
      { "Cache-Control": "public, max-age=3600, s-maxage=3600" }
    );
  }

  // Default: return pricing overview for all platforms
  const overview = PLATFORMS.map((platform) => {
    const avgValue =
      platform.actions.reduce((sum, a) => sum + a.value, 0) /
      platform.actions.length;

    return {
      platformId: platform.id,
      platformName: platform.name,
      actionCount: platform.actions.length,
      averageValue: Math.round(avgValue * 100) / 100,
      priceRange: {
        min: Math.min(...platform.actions.map((a) => a.value)),
        max: Math.max(...platform.actions.map((a) => a.value)),
      },
    };
  });

  return ok(
    { platforms: overview, businessType },
    200,
    { "Cache-Control": "public, max-age=3600, s-maxage=3600" }
  );
});
