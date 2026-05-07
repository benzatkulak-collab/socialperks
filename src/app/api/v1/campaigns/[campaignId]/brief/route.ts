/**
 * GET /api/v1/campaigns/:campaignId/brief
 *
 * Machine-readable campaign brief. Closes the "AI-readable campaign
 * briefs" gap from the agent-attraction audit (PR #42). This is the
 * brand-side counterpart to /api/v1/influencers/:id/media-kit:
 * a creator-facing autonomous agent looking at a campaign sees a
 * structured "ask" — exactly what's wanted, for what reward, by when,
 * with which acceptance criteria, and which endpoints to call next.
 *
 * Public, 5-minute cache. Structured around schema.org's Offer type so
 * a crawler indexing the JSON gets a typed entity for free.
 *
 * Why public (no auth on the GET): a campaign brief is the
 * platform's invitation for creators to participate. Locking it
 * behind auth would defeat the whole agent-discovery story. The
 * SUBMISSION endpoint is gated; reading the ask isn't.
 *
 * Caveats called out in the response:
 *   - The action set is best-effort: it lives in the campaign's
 *     creation event, which may have been pruned for older campaigns.
 *     When unavailable we surface that explicitly via
 *     `ask.actionsKnown: false` rather than fabricating data.
 *   - Compliance text is a constant pointer, not a per-campaign
 *     lookup. Agents must read /api/v1/legal for current FTC text.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../../../_shared";
import { campaignManager } from "@/lib/campaign-state-machine";
import { eventStore } from "@/lib/events";
import { ALL_ACTIONS } from "@/lib/platforms";
import { createSeedData } from "@/lib/seed";

interface RouteContext {
  params: Promise<{ campaignId: string }>;
}

interface BriefAction {
  actionId: string;
  label: string;
  platformId: string;
  platformName: string;
  type: string;
  effort: number;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve the campaign's display name + the action ids it accepted from
 * the event store. The CampaignLifecycle in memory only carries
 * lifecycle state (not the launch config), so we replay the
 * `campaign.created` event to recover the human-facing fields.
 */
function loadLaunchData(campaignId: string): {
  name: string | null;
  actionIds: readonly string[];
  guidelines: string | null;
} {
  // getEntityHistory returns oldest → newest, so the FIRST campaign.created
  // event is the canonical one. Pause/resume/end events come later and
  // don't override it.
  const events = eventStore.getEntityHistory(campaignId);
  let name: string | null = null;
  let actionIds: readonly string[] = [];
  let guidelines: string | null = null;

  for (const event of events) {
    if (event.type === "campaign.created") {
      const d = event.data as Record<string, unknown>;
      if (typeof d.name === "string") name = d.name;
      if (Array.isArray(d.actions)) {
        actionIds = (d.actions as unknown[]).filter(
          (a): a is string => typeof a === "string"
        );
      }
      if (typeof d.guidelines === "string") guidelines = d.guidelines;
      break;
    }
  }

  return { name, actionIds, guidelines };
}

function resolveActions(actionIds: readonly string[]): BriefAction[] {
  const out: BriefAction[] = [];
  for (const id of actionIds) {
    const found = ALL_ACTIONS.find((a) => a.id === id);
    if (!found) continue;
    out.push({
      actionId: id,
      label: found.label,
      platformId: found.platformId,
      platformName: found.platformName,
      type: found.type,
      effort: found.effort,
    });
  }
  return out;
}

function resolveBusiness(businessId: string): {
  name: string;
  type: string | null;
  industry: string | null;
} {
  const seed = createSeedData();
  const biz = seed.businesses.find((b) => b.id === businessId);
  if (biz) return { name: biz.name, type: biz.type, industry: biz.industry };
  return { name: "A local business", type: null, industry: null };
}

function formatRewardDisplay(value: number, type: "dol" | "pct"): string {
  return type === "pct" ? `${value}% off` : `$${value.toFixed(0)} off`;
}

// ─── Route ──────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Public — relaxed tier. Caching does most of the work for agent
  // traffic at scale.
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { campaignId } = await (ctx as RouteContext).params;
  if (!campaignId || typeof campaignId !== "string" || campaignId.length > 200) {
    return err("INVALID_CAMPAIGN_ID", "campaignId is missing or malformed", 400);
  }

  // Look up the lifecycle. If it's not in memory (cold start), try a
  // rehydrate from the event store before giving up.
  let lifecycle = campaignManager.getState(campaignId);
  if (!lifecycle) {
    lifecycle = campaignManager.rehydrate(campaignId) ?? undefined;
  }
  if (!lifecycle) {
    return err("NOT_FOUND", "Campaign not found", 404);
  }

  // Recover name + actions from the creation event.
  const { name, actionIds, guidelines } = loadLaunchData(campaignId);
  const actions = resolveActions(actionIds);
  const business = resolveBusiness(lifecycle.businessId);

  const isTerminal =
    lifecycle.state === "ended" ||
    lifecycle.state === "expired" ||
    lifecycle.state === "paused";
  const acceptingSubmissions = lifecycle.state === "active";

  // Budget remaining and approximate remaining completions. We can only
  // estimate "completions left" when budget is dollar-denominated and
  // we know the per-completion cost — for percentage discounts the
  // ceiling is set by `completions.max` instead.
  const budget = lifecycle.budget;
  const completions = lifecycle.completions;
  const budgetRemaining = Math.max(0, budget.allocated - budget.spent);

  let approxRemainingCompletions: number | null = null;
  if (completions.max !== null) {
    approxRemainingCompletions = Math.max(0, completions.max - completions.current);
  } else if (budget.type === "dol") {
    // Without a per-completion cost we can't give a meaningful estimate.
    approxRemainingCompletions = null;
  }

  // Days remaining until expiry.
  const expiresAt = new Date(lifecycle.expiry.expiresAt);
  const now = new Date();
  const daysRemaining = Math.max(
    0,
    Math.ceil((expiresAt.getTime() - now.getTime()) / 86_400_000)
  );

  const baseUrl = new URL(req.url);
  const selfUrl = `${baseUrl.protocol}//${baseUrl.host}/api/v1/campaigns/${campaignId}/brief`;
  const publicClaimUrl = `${baseUrl.protocol}//${baseUrl.host}/c/${campaignId}`;

  const payload = {
    // Schema.org Offer typing. A campaign IS a structured offer — the
    // brand offers a discount in exchange for marketing actions.
    "@context": "https://schema.org",
    "@type": "Offer",

    // Identity
    campaignId: lifecycle.id,
    title: name ?? `Campaign by ${business.name}`,
    state: lifecycle.state,
    acceptingSubmissions,
    isTerminal,
    businessId: lifecycle.businessId,
    businessName: business.name,
    businessType: business.type,
    industry: business.industry,

    // The "ask" — what an agent must do to participate.
    ask: {
      actionsKnown: actions.length > 0,
      actions,
      // Whether actions are loaded from the event store. Agents that
      // can't see actions should fall back to listing platforms via
      // /api/v1/actions and ask the human in their loop.
      actionsCount: actions.length,
      guidelines,
      // FTC disclosure is non-negotiable on every submission.
      complianceRequirement:
        "Every submission must include FTC disclosure (#ad, #sponsored, or equivalent). See /api/v1/legal.",
    },

    // The "reward" — what the brand pays per qualifying completion.
    reward: {
      type: budget.type,
      value: budget.allocated,
      displayValue: formatRewardDisplay(budget.allocated, budget.type),
      perCompletion: true,
    },

    // Budget — how much capacity remains. Helps a brand-side or
    // creator-side agent prioritize between competing campaigns.
    budget: {
      type: budget.type,
      totalAllocated: budget.allocated,
      spent: budget.spent,
      remaining: budgetRemaining,
      currency: "USD",
      approxRemainingCompletions,
    },

    // Eligibility — who can submit. The follower-tier bonus structure
    // surfaces here so an agent representing a 50k-follower creator
    // can detect they qualify for a higher tier than the base rate.
    eligibility: {
      // The /c/{id} public claim endpoint accepts anonymous proof
      // submissions, so any contact can participate via the customer-
      // side flow even without a Social Perks account.
      anyContact: true,
      // Follower bonuses (per CLAUDE.md): 0 = base, 500+ = +5%, 2k+
      // = +10%, 10k+ = +15%, 50k+ = +25%. Agents should query
      // /api/v1/pricing for the canonical bonus structure.
      followerBonusEndpoint: "/api/v1/pricing?actionId=...",
      platforms: [...new Set(actions.map((a) => a.platformId))],
    },

    // Timing
    timing: {
      launchedAt: lifecycle.expiry.launchedAt,
      expiresAt: lifecycle.expiry.expiresAt,
      daysRemaining,
    },

    // What an agent should call next. Explicit so it doesn't have to
    // reverse-engineer the protocol.
    agentInstructions: {
      submitProofEndpoint: "POST /api/v1/submissions",
      publicClaimUrl,
      campaignsListEndpoint: "GET /api/v1/campaigns",
      pricingOracle: "GET /api/v1/pricing?actionId=<id>",
      complianceText: "GET /api/v1/legal",
      docs: "/AGENTS.md",
      schemaVersion: "social-perks-campaign-brief-v1",
    },

    _meta: {
      format: "social-perks-campaign-brief-v1",
      generatedAt: new Date().toISOString(),
      selfUrl,
    },
  };

  return ok(payload, 200, {
    "Cache-Control": "public, max-age=300, s-maxage=300",
  });
});
