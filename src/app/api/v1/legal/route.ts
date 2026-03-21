import { NextRequest } from "next/server";
import { apiResponse, apiError, requireAuth } from "@/lib/api/middleware";
import { legalGuard } from "@/lib/legal-compliance";

/**
 * GET /api/v1/legal/briefing?businessType=roofer — Get legal briefing for business type
 * GET /api/v1/legal/scan?actions=go_rv,ig_rl,nd_rc — Scan actions for legal issues
 */
export async function GET(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  const { searchParams } = new URL(request.url);
  const businessType = searchParams.get("businessType");
  const actionsParam = searchParams.get("actions");

  // Briefing endpoint
  if (businessType) {
    const briefing = legalGuard.getLegalBriefing(businessType);
    return apiResponse({
      businessType,
      ...briefing,
    });
  }

  // Scan endpoint
  if (actionsParam) {
    const actions = actionsParam.split(",").map((a) => a.trim()).filter(Boolean);
    if (actions.length === 0) {
      return apiError("INVALID_ACTIONS", "At least one action ID is required");
    }

    const scan = legalGuard.scanCampaign(actions);

    // Enrich with alternatives for blocked actions
    const alternatives: Record<string, ReturnType<typeof legalGuard.getAlternatives>> = {};
    for (const blockedId of scan.blockedActions) {
      alternatives[blockedId] = legalGuard.getAlternatives(blockedId);
    }

    return apiResponse({
      ...scan,
      alternatives,
    });
  }

  return apiError("MISSING_PARAMS", "Provide either 'businessType' for a legal briefing or 'actions' for a compliance scan.");
}
