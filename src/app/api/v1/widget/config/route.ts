/**
 * GET /api/v1/widget/config — Public widget configuration endpoint
 *
 * Returns everything the embeddable widget needs in a single call:
 * business name, avatar, active campaigns with reward/action info,
 * theme settings, and widget version.
 *
 * Query: businessId (required)
 * Rate limit: public tier
 * Auth: none (public endpoint)
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, withTiming } from "../../_shared";
import { campaignManager } from "@/lib/campaign-state-machine";
import { ensureBusinessCampaignsLoaded } from "@/lib/campaign-state-machine/persist";
import { validateId } from "@/lib/security/validate";
import { eventStore } from "@/lib/events";
import { findAction } from "@/lib/platforms";
import { createSeedData } from "@/lib/seed";

// Widget version — bump on breaking changes to the config shape
const WIDGET_VERSION = "1.0.0";

// ─── CORS helper for cross-origin widget requests ────────────────────────────

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=60, s-maxage=60",
  };
}

// ─── OPTIONS (CORS preflight) ────────────────────────────────────────────────

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

// ─── GET ─────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — public tier (generous, since this runs on 3rd-party sites)
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const params = getQuery(req);
  const businessIdParam = params.get("businessId");

  // Validate businessId
  if (!businessIdParam) {
    return err("MISSING_BUSINESS_ID", "businessId query parameter is required", 400, corsHeaders());
  }

  const v = validateId(businessIdParam);
  if (!v.success) {
    return err("INVALID_BUSINESS_ID", v.error, 400, corsHeaders());
  }

  const businessId = v.data;

  // Fetch active campaigns for this business. Cold-start: hydrate first so the
  // embedded widget doesn't render empty (breaking the funnel) after a redeploy.
  await ensureBusinessCampaignsLoaded(businessId);
  const allCampaigns = campaignManager.listByBusiness(businessId);
  const activeCampaigns = allCampaigns.filter((c) => c.state === "active");

  // Build lightweight campaign data for the widget
  const campaigns = activeCampaigns.map((campaign) => {
    const name = getCampaignName(campaign.id) || "Campaign";
    const actionInfo = getCampaignAction(campaign.id);

    return {
      id: campaign.id,
      name,
      budget: {
        type: campaign.budget.type,
        allocated: campaign.budget.allocated,
      },
      platform: actionInfo?.platform || null,
      action: actionInfo?.action || null,
      completions: campaign.completions.current,
      maxCompletions: campaign.completions.max,
      expiresAt: campaign.expiry.expiresAt,
    };
  });

  return ok(
    {
      businessId,
      businessName: getBusinessName(businessId),
      campaigns,
      theme: {
        primary: "#22D3EE",
        mode: "dark",
      },
      widgetVersion: WIDGET_VERSION,
    },
    200,
    corsHeaders()
  );
});

// ─── Helper: extract campaign name from event store ──────────────────────────

function getCampaignName(campaignId: string): string | null {
  try {
    const events = eventStore.query({ entityId: campaignId, type: "campaign.created" });
    if (events.length > 0 && events[0].data?.name) {
      return events[0].data.name as string;
    }
  } catch {
    // Event store may not have the data — fall back gracefully
  }
  return null;
}

// ─── Helper: extract action info from event store ────────────────────────────

function getCampaignAction(campaignId: string): { platform: string; action: string } | null {
  try {
    const events = eventStore.query({ entityId: campaignId, type: "campaign.created" });
    if (events.length > 0 && events[0].data?.actionId) {
      const actionId = events[0].data.actionId as string;
      const actionDef = findAction(actionId);
      if (actionDef) {
        return {
          platform: actionDef.platformName || actionDef.platformId || "",
          action: actionDef.label || "",
        };
      }
    }
  } catch {
    // Fall back gracefully
  }
  return null;
}

// ─── Helper: resolve business display name ───────────────────────────────────

function getBusinessName(businessId: string): string {
  try {
    const seedData = createSeedData();
    if (seedData?.businesses) {
      const biz = seedData.businesses.find(
        (b: { id: string; name: string }) => b.id === businessId
      );
      if (biz) return biz.name;
    }
  } catch {
    // Not available — fall back
  }
  return "";
}
