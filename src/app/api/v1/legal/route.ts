/**
 * GET /api/v1/legal
 *
 * Legal compliance briefing endpoint.
 * Requires authentication. Relaxed rate limit.
 *
 * Query params: businessType? OR actions? (comma-separated action IDs)
 *
 * If businessType is provided, returns a full legal briefing for that type.
 * If actions is provided, scans the specific actions for compliance issues.
 * At least one parameter is required.
 */

import { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  getQuery,
  withTiming,
} from "../_shared";
import { legalGuard } from "@/lib/legal-compliance";
import {
  getPlatformRules,
  getRequiredDisclosures,
} from "@/lib/compliance-engine";
import { findAction } from "@/lib/platforms";

export const GET = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Relaxed rate limit
  const rl = rateLimit(req, "relaxed");
  if (rl) return rl;

  const params = getQuery(req);
  const businessType = params.get("businessType");
  const actionsParam = params.get("actions");

  if (!businessType && !actionsParam) {
    return err(
      "MISSING_PARAM",
      "Either businessType or actions query parameter is required",
      400
    );
  }

  // If businessType provided, return full legal briefing
  if (businessType) {
    const briefing = legalGuard.getLegalBriefing(businessType);

    return ok({
      businessType,
      briefing: {
        incentivizableActions: briefing.incentivizableActions,
        nonIncentivizableActions: briefing.nonIncentivizableActions,
        explanation: briefing.explanation,
        reviewStrategy: briefing.reviewStrategy,
        fullBriefing: briefing.fullBriefing,
      },
    });
  }

  // If actions provided, scan them for compliance
  const actionIds = actionsParam!.split(",").map((a) => a.trim()).filter(Boolean);

  if (actionIds.length === 0) {
    return err("INVALID_PARAM", "actions must be a comma-separated list of action IDs", 400);
  }

  // Validate action IDs
  const unknownActions = actionIds.filter((id) => !findAction(id));
  if (unknownActions.length > 0) {
    return err(
      "UNKNOWN_ACTIONS",
      `Unknown action IDs: ${unknownActions.join(", ")}`,
      400
    );
  }

  // Scan actions
  const scanResult = legalGuard.scanCampaign(actionIds);

  // Get platform-specific rules for the involved platforms
  const platformIds = new Set<string>();
  const actionTypes = new Set<string>();
  for (const id of actionIds) {
    const action = findAction(id);
    if (action) {
      platformIds.add(action.platformId);
      actionTypes.add(action.type);
    }
  }

  const platformRules = [...platformIds]
    .map((pid) => getPlatformRules(pid))
    .filter(Boolean);

  const disclosures = getRequiredDisclosures(
    [...platformIds],
    [...actionTypes] as ("content" | "review" | "engage" | "share" | "referral")[]
  );

  return ok({
    scan: {
      safe: scanResult.safe,
      warnings: scanResult.warnings,
      blockedActions: scanResult.blockedActions,
      safeActions: scanResult.safeActions,
      reviewActions: scanResult.reviewActions,
      suggestion: scanResult.suggestion,
    },
    platformRules,
    requiredDisclosures: disclosures,
  });
});
