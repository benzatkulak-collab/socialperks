import { NextRequest } from "next/server";
import { apiResponse, apiError, parsePagination, paginationMeta, requireAuth } from "@/lib/api/middleware";
import { withTracing } from "@/lib/api/with-tracing";
import { campaignManager } from "@/lib/campaign-state-machine";
import { checkCampaignCompliance } from "@/lib/compliance-engine";
import { legalGuard } from "@/lib/legal-compliance";
import { emitCampaignEvent } from "@/lib/events";
import { domainEventStore } from "@/lib/event-sourcing";
import { campaignRepo } from "@/lib/db/repositories";
import { socialGraph } from "@/lib/ml/social-graph";
import { matchingService } from "@/lib/ml/embedding-system";
import { logger } from "@/lib/logging";
import { eventBus } from "@/lib/realtime";

/**
 * GET /api/v1/campaigns — List campaigns
 * POST /api/v1/campaigns — Create/launch a campaign
 *
 * Now integrated with: state machine, compliance engine, event sourcing.
 */
async function _GET(request: NextRequest) {
  const startTime = performance.now();
  logger.info("GET /api/v1/campaigns", { method: "GET", path: "/api/v1/campaigns" });

  const { searchParams } = new URL(request.url);
  const businessId = searchParams.get("businessId");
  const state = searchParams.get("state");
  const { page, perPage } = parsePagination(searchParams);

  // Query campaigns from state machine
  let campaigns = businessId
    ? campaignManager.listByBusiness(businessId)
    : [];

  if (state) {
    campaigns = campaigns.filter((c) => c.state === state);
  }

  // Fallback: if state machine returned empty, check the DB layer
  if (campaigns.length === 0) {
    try {
      const filter: Record<string, unknown> = {};
      if (businessId) filter.business_id = businessId;
      if (state) filter.status = state as "active" | "paused" | "ended";
      // If no businessId and requesting active status, return all active campaigns (marketplace)
      if (!businessId && searchParams.get("status")) {
        filter.status = searchParams.get("status") as "active" | "paused" | "ended";
      }
      const dbResult = await campaignRepo.findMany(filter, { page, perPage });
      if (dbResult.data.length > 0) {
        return apiResponse({
          campaigns: dbResult.data,
          pagination: paginationMeta(dbResult.total, page, perPage),
        });
      }
    } catch {
      // DB layer not available — continue with state machine results
    }
  }

  const total = campaigns.length;
  const start = (page - 1) * perPage;
  const paginated = campaigns.slice(start, start + perPage);

  return apiResponse({
    campaigns: paginated,
    pagination: paginationMeta(total, page, perPage),
  });
}

async function _POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();

    const required = ["businessId", "name", "actions", "discountValue", "discountType"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) {
      return apiError("MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`);
    }

    // Verify the authenticated user owns this business (skip for API key access)
    if (auth.userId && auth.userId !== String(body.businessId)) {
      return apiError("FORBIDDEN", "You do not have permission to create campaigns for this business", 403);
    }

    if (typeof body.name !== "string") {
      return apiError("INVALID_INPUT", "name must be a string");
    }

    if (typeof body.businessId !== "string") {
      return apiError("INVALID_INPUT", "businessId must be a string");
    }

    if (!Array.isArray(body.actions) || body.actions.length === 0) {
      return apiError("INVALID_ACTIONS", "At least one action is required");
    }

    const perkValue = Number(body.discountValue);
    if (isNaN(perkValue) || perkValue <= 0) {
      return apiError("INVALID_PERK", "discountValue must be a positive number");
    }

    if (!["pct", "dol"].includes(body.discountType)) {
      return apiError("INVALID_DISCOUNT_TYPE", "discountType must be 'pct' or 'dol'");
    }

    if (body.discountType === "pct" && perkValue > 100) {
      return apiError("INVALID_PERK", "Percentage discount cannot exceed 100%");
    }

    // Run legal compliance scan — block non-incentivizable actions
    const legalScan = legalGuard.scanCampaign(body.actions as string[]);
    if (!legalScan.safe) {
      const blockedDetails = legalScan.warnings
        .filter((w) => w.severity === "blocked")
        .map((w) => `${w.platform}: ${w.actionLabel} — ${w.message}`)
        .join("; ");
      return apiError(
        "LEGAL_COMPLIANCE_VIOLATION",
        `Campaign contains non-incentivizable actions that violate platform terms of service. ` +
        `Blocked: ${blockedDetails}. ${legalScan.suggestion}`,
        400
      );
    }

    // Run FTC compliance check (partial campaign data — only actions matter for compliance)
    const complianceCampaign = {
      id: "pending",
      businessId: String(body.businessId).slice(0, 100),
      name: String(body.name),
      description: "",
      actions: body.actions as string[],
      discountValue: perkValue,
      discountType: body.discountType as "pct" | "dol",
      expiresInDays: 30,
      useTiers: false,
      status: "active" as const,
      createdAt: new Date().toISOString(),
    };
    const compliance = checkCampaignCompliance(complianceCampaign, body.actions);

    // Launch through state machine (creates campaign + emits events)
    const campaignId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const maxCompletions = body.maxCompletions ? Math.max(1, Math.floor(Number(body.maxCompletions))) : null;
    const expiresInDays = body.expiresInDays ? Math.max(1, Math.floor(Number(body.expiresInDays))) : 30;

    const lifecycle = campaignManager.launch(campaignId, String(body.businessId).slice(0, 100), {
      name: String(body.name).slice(0, 200),
      budgetAllocated: perkValue * (maxCompletions || 100),
      budgetType: body.discountType as "pct" | "dol",
      maxCompletions,
      expiresInDays,
    });

    // Emit creation event with full data
    emitCampaignEvent("campaign.created", campaignId, String(body.businessId).slice(0, 100), {
      name: String(body.name).slice(0, 200),
      actions: body.actions,
      discountValue: perkValue,
      discountType: body.discountType,
    });

    // Publish to real-time event bus
    eventBus.publish({
      type: "campaign.created",
      payload: {
        campaignId,
        businessId: String(body.businessId).slice(0, 100),
        name: String(body.name).slice(0, 200),
        discountValue: perkValue,
        discountType: body.discountType,
      },
      targetBusinessId: String(body.businessId).slice(0, 100),
      timestamp: new Date().toISOString(),
    });

    // Append to the domain event store for CQRS/ES
    try {
      domainEventStore.append(
        campaignId,
        [
          {
            aggregateType: "campaign",
            eventType: "campaign.created",
            payload: {
              name: String(body.name).slice(0, 200),
              businessId: String(body.businessId).slice(0, 100),
              actions: body.actions,
              discountValue: perkValue,
            },
            metadata: { timestamp: new Date().toISOString() },
          },
        ],
        -1
      );
    } catch (err) {
      logger.error("Event store append failed for campaign creation", err, { campaignId });
      // Event store append is best-effort — do not block campaign creation
    }

    const campaign = {
      id: campaignId,
      businessId: String(body.businessId).slice(0, 100),
      name: String(body.name).slice(0, 200),
      description: body.description ? String(body.description).slice(0, 2000) : "",
      actions: body.actions,
      discountValue: perkValue,
      discountType: body.discountType,
      guidelines: body.guidelines ? String(body.guidelines).slice(0, 2000) : "",
      maxCompletions,
      expiresInDays,
      useTiers: Boolean(body.useTiers),
      status: lifecycle.state,
      createdAt: new Date().toISOString(),
      compliance: {
        score: compliance.score,
        compliant: compliance.compliant,
        issues: compliance.issues.filter((i) => i.severity === "critical"),
      },
    };

    // Persist to DB layer so the repository has the data
    try {
      await campaignRepo.create({
        business_id: String(body.businessId).slice(0, 100),
        name: campaign.name,
        description: campaign.description,
        actions: campaign.actions as string[],
        discount_value: campaign.discountValue,
        discount_type: campaign.discountType as "pct" | "dol",
        guidelines: campaign.guidelines,
        max_completions: campaign.maxCompletions,
        expires_in_days: campaign.expiresInDays,
        use_tiers: campaign.useTiers,
        from_suggestion: body.fromSuggestion,
        budget_cap: body.budgetCap ?? null,
        ftc_disclosures: campaign.compliance?.issues?.map((i) => i.message) ?? [],
        tags: body.tags ?? [],
      });
    } catch (err) {
      logger.error("DB persistence failed for campaign", err, { campaignId });
      // DB persistence is best-effort during transition
    }

    // Add campaign node to social graph
    try {
      socialGraph.addNode(`campaign_${campaignId}`, "campaign", {
        businessId: campaign.businessId,
        name: campaign.name,
      });
      // Link campaign to business node (create business node if it doesn't exist)
      const bizNodeId = `biz_${campaign.businessId}`;
      if (!socialGraph.getNode(bizNodeId)) {
        socialGraph.addNode(bizNodeId, "business", { businessId: campaign.businessId });
      }
      socialGraph.addEdge(bizNodeId, `campaign_${campaignId}`, "launched", 0.9, {
        createdAt: campaign.createdAt,
      });
    } catch {
      // Social graph failure should not block campaign creation
    }

    // Index campaign in embedding system for matching
    try {
      matchingService.indexCampaign({
        id: campaignId,
        actions: campaign.actions as string[],
        tier: body.tier ?? "essential",
        discountValue: campaign.discountValue,
        discountType: campaign.discountType as "pct" | "dol",
        businessType: body.businessType ?? "",
        category: body.category ?? "",
        tags: body.tags ?? [],
      });
    } catch {
      // Embedding indexing failure should not block campaign creation
    }

    // Publish campaign.launched realtime event
    try {
      eventBus.publish({
        type: "campaign.launched",
        payload: {
          campaignId,
          businessId: campaign.businessId,
          name: campaign.name,
          status: campaign.status,
        },
        targetBusinessId: campaign.businessId,
        timestamp: new Date().toISOString(),
      });
    } catch {
      // Realtime event failure should not block response
    }

    logger.info("Campaign created", { campaignId, businessId: campaign.businessId });

    return apiResponse(campaign, 201);
  } catch (err) {
    logger.error("Failed to create campaign", err);
    return apiError("CREATE_FAILED", "Failed to create campaign", 500);
  }
}

export const GET = withTracing(_GET, "campaigns.list");
export const POST = withTracing(_POST, "campaigns.create");
