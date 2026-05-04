/**
 * GET /api/v1/exchange/opportunities
 *
 * Public market opportunities endpoint. Returns estimated earnings,
 * top-paying actions, and demand signals based on platform data.
 * Cached for 60 seconds.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, withTiming } from "../../_shared";
import { PLATFORMS, ALL_ACTIONS, FOLLOWER_TIERS } from "@/lib/platforms";

// ─── Helpers ────────────────────────────────────────────────────────────────

function getFollowerBonus(count: number): number {
  let bonus = 0;
  for (const tier of FOLLOWER_TIERS) {
    if (count >= tier.minFollowers) bonus = tier.bonus;
  }
  return bonus;
}

function estimateMonthlyEarnings(
  actions: typeof ALL_ACTIONS,
  followerCount: number
): number {
  const bonus = 1 + getFollowerBonus(followerCount) / 100;
  // Assume an active agent completes ~40% of available actions 3 times/month
  return actions.reduce((sum, a) => sum + a.value * bonus * 0.4 * 3, 0);
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const q = getQuery(req);
  const platformFilter = q.get("platforms")?.split(",").filter(Boolean) ?? [];
  const nicheFilter = q.get("niches")?.split(",").filter(Boolean) ?? [];
  const followerCount = Math.max(0, parseInt(q.get("followerCount") ?? "0", 10) || 0);
  const location = q.get("location") ?? null;

  // Filter platforms
  let filteredPlatforms = PLATFORMS;
  if (platformFilter.length > 0) {
    filteredPlatforms = PLATFORMS.filter((p) => platformFilter.includes(p.id));
    if (filteredPlatforms.length === 0) {
      return err(
        "INVALID_PLATFORMS",
        `No matching platforms. Valid IDs: ${PLATFORMS.map((p) => p.id).join(", ")}`,
        400
      );
    }
  }

  // Build filtered action list
  const filteredActions = ALL_ACTIONS.filter((a) =>
    filteredPlatforms.some((p) => p.id === a.platformId)
  );

  // Calculate follower bonus
  const bonus = 1 + getFollowerBonus(followerCount) / 100;

  // Top-paying actions (sorted by adjusted value)
  const topActions = [...filteredActions]
    .sort((a, b) => b.value * bonus - a.value * bonus)
    .slice(0, 15)
    .map((a) => ({
      actionId: a.id,
      label: a.label,
      platformId: a.platformId,
      platformName: a.platformName,
      type: a.type,
      effort: a.effort,
      baseValue: a.value,
      adjustedValue: Math.round(a.value * bonus * 100) / 100,
      incentivizable: a.incentivizable,
    }));

  // Demand signals — high-value categories with supply/demand info
  const categoryDemand = new Map<string, { count: number; totalValue: number }>();
  for (const a of filteredActions) {
    const entry = categoryDemand.get(a.type) ?? { count: 0, totalValue: 0 };
    entry.count++;
    entry.totalValue += a.value;
    categoryDemand.set(a.type, entry);
  }

  const demandSignals = Array.from(categoryDemand.entries())
    .map(([type, data]) => ({
      category: type,
      actionCount: data.count,
      avgValue: Math.round((data.totalValue / data.count) * 100) / 100,
      demandLevel:
        data.totalValue / data.count > 4
          ? "high"
          : data.totalValue / data.count > 2
            ? "medium"
            : "low",
    }))
    .sort((a, b) => b.avgValue - a.avgValue);

  // Platform summaries
  const platformSummaries = filteredPlatforms.map((p) => {
    const actions = p.actions;
    const avgValue =
      actions.reduce((s, a) => s + a.value, 0) / (actions.length || 1);
    return {
      platformId: p.id,
      name: p.name,
      icon: p.icon,
      actionCount: actions.length,
      avgActionValue: Math.round(avgValue * 100) / 100,
      topAction: actions.reduce(
        (best, a) => (a.value > best.value ? a : best),
        actions[0]
      ),
    };
  });

  // Estimated monthly earnings
  const estimatedMonthly = Math.round(estimateMonthlyEarnings(filteredActions, followerCount) * 100) / 100;

  // Niche relevance (placeholder — in production, maps niches to platforms)
  const nicheRelevance =
    nicheFilter.length > 0
      ? nicheFilter.map((niche) => ({
          niche,
          recommendedPlatforms: filteredPlatforms
            .slice(0, 5)
            .map((p) => p.id),
        }))
      : undefined;

  return ok(
    {
      opportunities: {
        totalActions: filteredActions.length,
        totalPlatforms: filteredPlatforms.length,
        followerCount,
        followerBonus: getFollowerBonus(followerCount),
        estimatedMonthlyEarnings: estimatedMonthly,
        location,
      },
      topPayingActions: topActions,
      demandSignals,
      platformSummaries,
      ...(nicheRelevance ? { nicheRelevance } : {}),
    },
    200,
    { "Cache-Control": "public, s-maxage=60, stale-while-revalidate=30" }
  );
});
