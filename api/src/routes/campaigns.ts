import { Hono } from "hono";
import type { AppEnv } from "@api/env.js";
import { apiResponse, apiError, parsePagination, paginationMeta } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { requireJson } from "../middleware/validation.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { campaignManager } from "@lib/campaign-state-machine";
import { checkCampaignCompliance } from "@lib/compliance-engine";
import { legalGuard } from "@lib/legal-compliance";
import { emitCampaignEvent } from "@lib/events";
import { domainEventStore } from "@lib/event-sourcing";
import { campaignRepo } from "@lib/db/repositories";
import { socialGraph } from "@lib/ml/social-graph";
import { matchingService } from "@lib/ml/embedding-system";
import { logger } from "@lib/logging";
import { eventBus } from "@lib/realtime";

const app = new Hono<AppEnv>();

// GET /v1/campaigns
app.get("/", rateLimit("relaxed"), (c) => {
  const params = c.req.query();
  const businessId = params.businessId;
  const state = params.state ?? params.status;
  const { page, perPage } = parsePagination(new URLSearchParams(params));

  let campaigns = businessId
    ? campaignManager.listByBusiness(businessId)
    : campaignManager.listAll();

  if (state) {
    campaigns = campaigns.filter((ca) => ca.state === state);
  }

  const total = campaigns.length;
  const start = (page - 1) * perPage;
  const paginated = campaigns.slice(start, start + perPage);

  return apiResponse(c, {
    campaigns: paginated,
    pagination: paginationMeta(total, page, perPage),
  });
});

// POST /v1/campaigns
app.post("/", rateLimit("standard"), requireJson, requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    const userId = c.get("userId");

    const required = ["businessId", "name", "actions", "discountValue", "discountType"];
    const missing = required.filter((f) => !body[f]);
    if (missing.length > 0) return apiError(c, "MISSING_FIELDS", `Missing required fields: ${missing.join(", ")}`);

    if (userId && userId !== String(body.businessId)) {
      return apiError(c, "FORBIDDEN", "You do not have permission to create campaigns for this business", 403);
    }
    if (typeof body.name !== "string") return apiError(c, "INVALID_INPUT", "name must be a string");
    if (typeof body.businessId !== "string") return apiError(c, "INVALID_INPUT", "businessId must be a string");
    if (!Array.isArray(body.actions) || body.actions.length === 0) return apiError(c, "INVALID_ACTIONS", "At least one action is required");
    const perkValue = Number(body.discountValue);
    if (isNaN(perkValue) || perkValue <= 0) return apiError(c, "INVALID_PERK", "discountValue must be a positive number");
    if (!["pct", "dol"].includes(body.discountType)) return apiError(c, "INVALID_DISCOUNT_TYPE", "discountType must be 'pct' or 'dol'");
    if (body.discountType === "pct" && perkValue > 100) return apiError(c, "INVALID_PERK", "Percentage discount cannot exceed 100%");

    const legalScan = legalGuard.scanCampaign(body.actions as string[]);
    if (!legalScan.safe) {
      const blockedDetails = legalScan.warnings
        .filter((w) => w.severity === "blocked")
        .map((w) => `${w.platform}: ${w.actionLabel} — ${w.message}`)
        .join("; ");
      return apiError(c, "LEGAL_COMPLIANCE_VIOLATION",
        `Campaign contains non-incentivizable actions. Blocked: ${blockedDetails}. ${legalScan.suggestion}`, 400);
    }

    const complianceCampaign = {
      id: "pending", businessId: String(body.businessId).slice(0, 100), name: String(body.name),
      description: "", actions: body.actions as string[], discountValue: perkValue,
      discountType: body.discountType as "pct" | "dol", expiresInDays: 30, useTiers: false,
      status: "active" as const, createdAt: new Date().toISOString(),
    };
    const compliance = checkCampaignCompliance(complianceCampaign, body.actions);

    const campaignId = crypto.randomUUID().replace(/-/g, "").slice(0, 12);
    const maxCompletions = body.maxCompletions ? Math.max(1, Math.floor(Number(body.maxCompletions))) : null;
    const expiresInDays = body.expiresInDays ? Math.max(1, Math.floor(Number(body.expiresInDays))) : 30;

    const lifecycle = campaignManager.launch(campaignId, String(body.businessId).slice(0, 100), {
      name: String(body.name).slice(0, 200),
      budgetAllocated: perkValue * (maxCompletions || 100),
      budgetType: body.discountType as "pct" | "dol",
      maxCompletions, expiresInDays,
    });

    emitCampaignEvent("campaign.created", campaignId, String(body.businessId).slice(0, 100), {
      name: String(body.name).slice(0, 200), actions: body.actions, discountValue: perkValue, discountType: body.discountType,
    });

    eventBus.publish({
      type: "campaign.created",
      payload: { campaignId, businessId: String(body.businessId).slice(0, 100), name: String(body.name).slice(0, 200), discountValue: perkValue, discountType: body.discountType },
      targetBusinessId: String(body.businessId).slice(0, 100),
      timestamp: new Date().toISOString(),
    });

    try {
      domainEventStore.append(campaignId, [{
        aggregateType: "campaign", eventType: "campaign.created",
        payload: { name: String(body.name).slice(0, 200), businessId: String(body.businessId).slice(0, 100), actions: body.actions, discountValue: perkValue },
        metadata: { timestamp: new Date().toISOString() },
      }], -1);
    } catch (err) { logger.error("Event store append failed", err, { campaignId }); }

    const campaign = {
      id: campaignId, businessId: String(body.businessId).slice(0, 100), name: String(body.name).slice(0, 200),
      description: body.description ? String(body.description).slice(0, 2000) : "", actions: body.actions,
      discountValue: perkValue, discountType: body.discountType, guidelines: body.guidelines ? String(body.guidelines).slice(0, 2000) : "",
      maxCompletions, expiresInDays, useTiers: Boolean(body.useTiers), status: lifecycle.state, createdAt: new Date().toISOString(),
      compliance: { score: compliance.score, compliant: compliance.compliant, issues: compliance.issues.filter((i) => i.severity === "critical") },
    };

    try { await campaignRepo.create({ business_id: campaign.businessId, name: campaign.name, description: campaign.description, actions: campaign.actions as string[], discount_value: campaign.discountValue, discount_type: campaign.discountType as "pct" | "dol", guidelines: campaign.guidelines, max_completions: campaign.maxCompletions, expires_in_days: campaign.expiresInDays, use_tiers: campaign.useTiers, from_suggestion: body.fromSuggestion, budget_cap: body.budgetCap ?? null, ftc_disclosures: campaign.compliance?.issues?.map((i) => i.message) ?? [], tags: body.tags ?? [] }); } catch (err) { logger.error("DB persistence failed", err, { campaignId }); }
    try { socialGraph.addNode(`campaign_${campaignId}`, "campaign", { businessId: campaign.businessId, name: campaign.name }); const bizNodeId = `biz_${campaign.businessId}`; if (!socialGraph.getNode(bizNodeId)) socialGraph.addNode(bizNodeId, "business", { businessId: campaign.businessId }); socialGraph.addEdge(bizNodeId, `campaign_${campaignId}`, "launched", 0.9, { createdAt: campaign.createdAt }); } catch { /* non-blocking */ }
    try { matchingService.indexCampaign({ id: campaignId, actions: campaign.actions as string[], tier: body.tier ?? "essential", discountValue: campaign.discountValue, discountType: campaign.discountType as "pct" | "dol", businessType: body.businessType ?? "", category: body.category ?? "", tags: body.tags ?? [] }); } catch { /* non-blocking */ }

    logger.info("Campaign created", { campaignId, businessId: campaign.businessId });
    return apiResponse(c, campaign, 201);
  } catch (err) {
    logger.error("Failed to create campaign", err);
    return apiError(c, "CREATE_FAILED", "Failed to create campaign", 500);
  }
});

export default app;
