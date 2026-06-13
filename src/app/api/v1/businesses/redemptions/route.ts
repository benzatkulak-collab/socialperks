/**
 * GET /api/v1/businesses/redemptions?businessId=...
 *
 * The "did this campaign actually drive customers" view.
 * Returns aggregate redemption counts + estimated marketing value
 * for a business's campaigns.
 *
 * Auth: required, tenant-isolated (business can only see its own).
 *
 * Source: campaign-state-machine completions + perk-wallet redemptions
 * + submission engine. All exist already; this route stitches them
 * into one dashboard-friendly payload.
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { ok, err, rateLimit, getQuery } from "../../_shared";
import { withTenant, checkResourceAccess } from "../../_tenant";
import { campaignManager } from "@/lib/campaign-state-machine";
import { ensureBusinessCampaignsLoaded } from "@/lib/campaign-state-machine/persist";
import { validateId } from "@/lib/security/validate";

export async function GET(req: NextRequest) {
  const tenantResult = withTenant(req);
  if (tenantResult instanceof NextResponse) return tenantResult;
  const { tenant } = tenantResult;

  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const businessId = params.get("businessId");
  if (!businessId) return err("MISSING_PARAM", "businessId is required", 400);

  const v = validateId(businessId);
  if (!v.success) return err("INVALID_BUSINESS_ID", v.error, 400);

  const access = checkResourceAccess(tenant, v.data);
  if (access) return access;

  // Cold-start: hydrate so the ROI view isn't all-zeros after a redeploy.
  await ensureBusinessCampaignsLoaded(v.data);
  const campaigns = campaignManager.listByBusiness(v.data);

  // Aggregate the redemption-shaped view. Numbers are derived from the
  // existing state-machine + ledger; we don't compute new state here.
  const totalCampaigns = campaigns.length;
  const totalCompletions = campaigns.reduce(
    (sum, c) => sum + c.completions.current,
    0,
  );
  const activeCampaigns = campaigns.filter((c) => c.state === "active").length;
  const endedCampaigns = campaigns.filter((c) => c.state === "ended" || c.state === "expired").length;

  // Estimated marketing value — conservative model:
  //   each verified completion ≈ $8 of impression-equivalent value.
  // Replace with platform-specific CPM math once we have real reach data.
  const estimatedMarketingValue = totalCompletions * 8;

  const perCampaign = campaigns.map((c) => ({
    id: c.id,
    state: c.state,
    completions: c.completions.current,
    cap: c.completions.max,
    budgetAllocated: c.budget.allocated,
    budgetType: c.budget.type,
    estimatedValue: c.completions.current * 8,
    expiresAt: c.expiry.expiresAt,
  }));

  return ok({
    summary: {
      totalCampaigns,
      activeCampaigns,
      endedCampaigns,
      totalCompletions,
      estimatedMarketingValue,
    },
    campaigns: perCampaign,
  });
}
