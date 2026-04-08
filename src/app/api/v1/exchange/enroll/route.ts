/**
 * POST /api/v1/exchange/enroll
 *
 * Agent auto-enrollment endpoint. Registers an agent in the exchange
 * and auto-generates sell orders from their capabilities.
 * Auth required, standard rate limit.
 */

import { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { PLATFORMS, ALL_ACTIONS, findPlatform, FOLLOWER_TIERS } from "@/lib/platforms";
// Local stores — isolated per-route since Next.js forbids cross-route exports
const enrollOrdersStore = new Map<string, Record<string, unknown>>();

// ─── Types ──────────────────────────────────────────────────────────────────

interface Agent {
  id: string;
  userId: string;
  agentName: string;
  agentType: "influencer" | "creator" | "ambassador" | "agency";
  platforms: string[];
  niches: string[];
  location: string | null;
  rateCard: Record<string, number>; // actionId -> custom price
  enrolledAt: string;
}

// ─── In-Memory Store ────────────────────────────────────────────────────────

const agentsStore = new Map<string, Record<string, unknown>>();

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFollowerBonus(count: number): number {
  let bonus = 0;
  for (const tier of FOLLOWER_TIERS) {
    if (count >= tier.minFollowers) bonus = tier.bonus;
  }
  return bonus;
}

// ─── POST ───────────────────────────────────────────────────────────────────

export const POST = withTiming(async (req: NextRequest) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Standard rate limit
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const body = await parseBody<{
    agentName: string;
    agentType: "influencer" | "creator" | "ambassador" | "agency";
    platforms: string[];
    niches: string[];
    location?: string;
    rateCard?: Record<string, number>;
    followerCount?: number;
  }>(req);
  if (body instanceof Response) return body;

  const { agentName, agentType, platforms, niches, location, rateCard, followerCount } = body;

  // Validate required fields
  if (!agentName || typeof agentName !== "string" || agentName.length < 2) {
    return err("INVALID_AGENT_NAME", "agentName must be at least 2 characters", 400);
  }

  const validTypes = ["influencer", "creator", "ambassador", "agency"];
  if (!agentType || !validTypes.includes(agentType)) {
    return err("INVALID_AGENT_TYPE", `agentType must be one of: ${validTypes.join(", ")}`, 400);
  }

  if (!Array.isArray(platforms) || platforms.length === 0) {
    return err("MISSING_PLATFORMS", "At least one platform is required", 400);
  }

  // Validate each platform exists
  const invalidPlatforms = platforms.filter((p) => !findPlatform(p));
  if (invalidPlatforms.length > 0) {
    return err(
      "INVALID_PLATFORMS",
      `Unknown platforms: ${invalidPlatforms.join(", ")}. Valid: ${PLATFORMS.map((p) => p.id).join(", ")}`,
      400
    );
  }

  if (!Array.isArray(niches) || niches.length === 0) {
    return err("MISSING_NICHES", "At least one niche is required", 400);
  }

  // Create agent
  const agentId = crypto.randomUUID();
  const now = new Date().toISOString();

  const agent: Agent = {
    id: agentId,
    userId: user.id,
    agentName,
    agentType,
    platforms,
    niches,
    location: location ?? null,
    rateCard: rateCard ?? {},
    enrolledAt: now,
  };

  agentsStore.set(agentId, agent as unknown as Record<string, unknown>);

  // Auto-generate sell orders for all actions on the agent's platforms
  const generatedOrders: string[] = [];
  const relevantActions = ALL_ACTIONS.filter((a) => platforms.includes(a.platformId));

  for (const action of relevantActions) {
    // Use rateCard price if available, otherwise use base value
    const price = rateCard?.[action.id] ?? action.value;

    const orderId = crypto.randomUUID();
    enrollOrdersStore.set(orderId, {
      id: orderId,
      side: "sell",
      status: "open",
      businessId: null,
      agentId,
      platformId: action.platformId,
      actionId: action.id,
      quantity: 10, // Default availability
      filledQuantity: 0,
      pricePerUnit: Math.round(price * 100) / 100,
      totalValue: Math.round(10 * price * 100) / 100,
      createdAt: now,
      updatedAt: now,
      expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), // 30 days
    });
    generatedOrders.push(orderId);
  }

  // Match projections — estimate potential earnings
  const fCount = Math.max(0, followerCount ?? 0);
  const bonus = 1 + getFollowerBonus(fCount) / 100;
  const projectedMonthly = relevantActions.reduce((sum, a) => {
    const price = rateCard?.[a.id] ?? a.value;
    // Conservative: ~30% fill rate, 3x monthly
    return sum + price * bonus * 0.3 * 3;
  }, 0);

  // Find matching active buy orders (simulated campaign matches)
  const matchedCampaigns = Array.from(enrollOrdersStore.values())
    .filter(
      (o) =>
        o.side === "buy" &&
        o.status === "open" &&
        platforms.includes(String(o.platformId))
    )
    .slice(0, 10)
    .map((o) => ({
      orderId: o.id,
      platformId: o.platformId,
      actionId: o.actionId,
      pricePerUnit: o.pricePerUnit,
      quantity: Number(o.quantity || 0) - Number(o.filledQuantity || 0),
    }));

  return ok(
    {
      agentId,
      agent,
      generatedOrders: generatedOrders.length,
      matchedCampaigns,
      projections: {
        monthlyEstimate: Math.round(projectedMonthly * 100) / 100,
        actionsAvailable: relevantActions.length,
        platformsCovered: platforms.length,
        followerBonus: getFollowerBonus(fCount),
      },
    },
    201
  );
});
