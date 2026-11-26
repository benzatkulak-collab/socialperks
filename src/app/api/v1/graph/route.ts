/**
 * GET /api/v1/graph — Social graph discovery queries
 *
 * Query parameter: type (required)
 *   - similar_businesses   (requires businessId)
 *   - overlapping_audiences (requires businessId)
 *   - viral_campaigns      (optional limit)
 *   - influencer_network   (requires influencerId)
 *   - cross_promotions     (requires businessId)
 *
 * Rate limit: relaxed
 * Auth: required. The three questions about a named business
 * (similar_businesses, overlapping_audiences, cross_promotions) are answered
 * only for that business's own login or API key, or for the founder
 * (role "admin").
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  getQuery,
  withTiming,
  type AuthUser,
} from "../_shared";
import { validateId, validateEnum, validateNumber } from "@/lib/security/validate";
import {
  buildSocialGraph,
  findSimilarBusinesses,
  findOverlappingAudiences,
  getViralCampaigns,
  getInfluencerNetwork,
  suggestCrossPromotions,
} from "@/lib/graph/discovery";

const QUERY_TYPES = [
  "similar_businesses",
  "overlapping_audiences",
  "viral_campaigns",
  "influencer_network",
  "cross_promotions",
] as const;

type QueryType = (typeof QUERY_TYPES)[number];

/**
 * May this caller ask about the named business's relationships? Only the
 * business itself or the founder. Fails closed: an account with no business
 * (an influencer, a customer) matches no business.
 */
function mayAskAbout(user: AuthUser, businessId: string): boolean {
  return user.role === "admin" || user.businessId === businessId;
}

function notYourBusiness() {
  return err("FORBIDDEN", "You can only ask about your own business", 403);
}

// Lazily populate the graph on first request
let graphPopulated = false;

function ensureGraph(): void {
  if (!graphPopulated) {
    buildSocialGraph();
    graphPopulated = true;
  }
}

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const auth = requireAuth(req);
  if (auth instanceof Response) return auth;

  const params = getQuery(req);

  // Validate type parameter
  const typeParam = params.get("type");
  if (!typeParam) {
    return err("MISSING_TYPE", "Query parameter 'type' is required", 400);
  }

  const typeValidation = validateEnum(typeParam, "type", QUERY_TYPES);
  if (!typeValidation.success) {
    return err("INVALID_TYPE", typeValidation.error, 400);
  }

  const queryType: QueryType = typeValidation.data;

  // Ensure graph is populated
  ensureGraph();

  switch (queryType) {
    case "similar_businesses": {
      const bizId = params.get("businessId");
      if (!bizId) {
        return err("MISSING_BUSINESS_ID", "businessId is required for similar_businesses", 400);
      }
      const v = validateId(bizId);
      if (!v.success) return err("INVALID_BUSINESS_ID", v.error, 400);
      if (!mayAskAbout(auth, v.data)) return notYourBusiness();

      const limitParam = params.get("limit");
      let limit = 10;
      if (limitParam) {
        const lv = validateNumber(limitParam, "limit", { min: 1, max: 50 });
        if (!lv.success) return err("INVALID_LIMIT", lv.error, 400);
        limit = lv.data;
      }

      return ok(findSimilarBusinesses(v.data, limit));
    }

    case "overlapping_audiences": {
      const bizId = params.get("businessId");
      if (!bizId) {
        return err("MISSING_BUSINESS_ID", "businessId is required for overlapping_audiences", 400);
      }
      const v = validateId(bizId);
      if (!v.success) return err("INVALID_BUSINESS_ID", v.error, 400);
      if (!mayAskAbout(auth, v.data)) return notYourBusiness();

      return ok(findOverlappingAudiences(v.data));
    }

    case "viral_campaigns": {
      const limitParam = params.get("limit");
      let limit = 10;
      if (limitParam) {
        const lv = validateNumber(limitParam, "limit", { min: 1, max: 50 });
        if (!lv.success) return err("INVALID_LIMIT", lv.error, 400);
        limit = lv.data;
      }

      return ok(getViralCampaigns(limit));
    }

    case "influencer_network": {
      const infId = params.get("influencerId");
      if (!infId) {
        return err("MISSING_INFLUENCER_ID", "influencerId is required for influencer_network", 400);
      }
      const v = validateId(infId);
      if (!v.success) return err("INVALID_INFLUENCER_ID", v.error, 400);

      return ok(getInfluencerNetwork(v.data));
    }

    case "cross_promotions": {
      const bizId = params.get("businessId");
      if (!bizId) {
        return err("MISSING_BUSINESS_ID", "businessId is required for cross_promotions", 400);
      }
      const v = validateId(bizId);
      if (!v.success) return err("INVALID_BUSINESS_ID", v.error, 400);
      if (!mayAskAbout(auth, v.data)) return notYourBusiness();

      return ok(suggestCrossPromotions(v.data));
    }
  }
});
