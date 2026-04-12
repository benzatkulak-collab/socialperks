/**
 * GET /api/v1/exchange/market
 *
 * Public real-time market data endpoint. Returns pricing,
 * action depth, movers, stats, and history based on platforms data.
 * Cached for 60 seconds.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, withTiming } from "../../_shared";
import { withCache } from "@/lib/cache/middleware";
import { setStaleWhileRevalidate } from "@/lib/api/edge-cache";
import { ALL_ACTIONS, findAction, findPlatform } from "@/lib/platforms";

// ─── Synthetic market helpers ───────────────────────────────────────────────

/** Deterministic pseudo-random from a seed string (for repeatable results within the cache window). */
function seededRandom(seed: string): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h % 10000) / 10000;
}

/** Generates a synthetic price with slight variance from the base value. */
function syntheticPrice(actionId: string, baseValue: number, hourBucket: number): number {
  const variance = seededRandom(`${actionId}-${hourBucket}`) * 0.3 - 0.15; // +/- 15%
  return Math.round(baseValue * (1 + variance) * 100) / 100;
}

/** Generates synthetic volume for an action. */
function syntheticVolume(actionId: string, hourBucket: number): number {
  const base = seededRandom(`vol-${actionId}-${hourBucket}`) * 200 + 20;
  return Math.round(base);
}

function currentHourBucket(): number {
  return Math.floor(Date.now() / (3600 * 1000));
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withCache(withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "public");
  if (limited) return limited;

  const q = getQuery(req);
  const actionId = q.get("actionId");
  const platformId = q.get("platformId");
  const view = q.get("view") ?? "stats"; // depth | movers | stats | history
  const hours = Math.min(168, Math.max(1, parseInt(q.get("hours") ?? "24", 10) || 24));
  const hourBucket = currentHourBucket();

  const validViews = ["depth", "movers", "stats", "history"];
  if (!validViews.includes(view)) {
    return err("INVALID_VIEW", `Invalid view. Valid views: ${validViews.join(", ")}`, 400);
  }

  // Filter actions by query params
  let actions = ALL_ACTIONS;
  if (actionId) {
    const found = findAction(actionId);
    if (!found) {
      return err("ACTION_NOT_FOUND", `Action '${actionId}' not found`, 404);
    }
    actions = [found];
  } else if (platformId) {
    const plat = findPlatform(platformId);
    if (!plat) {
      return err("PLATFORM_NOT_FOUND", `Platform '${platformId}' not found`, 404);
    }
    actions = ALL_ACTIONS.filter((a) => a.platformId === platformId);
  }

  // ── View: depth — order book depth per action ───────────────────────────
  if (view === "depth") {
    const depth = actions.slice(0, 20).map((a) => {
      const midPrice = syntheticPrice(a.id, a.value, hourBucket);
      const spread = midPrice * 0.05;
      return {
        actionId: a.id,
        label: a.label,
        platformId: a.platformId,
        midPrice,
        bestBid: Math.round((midPrice - spread) * 100) / 100,
        bestAsk: Math.round((midPrice + spread) * 100) / 100,
        bidDepth: Math.round(syntheticVolume(a.id, hourBucket) * 0.6),
        askDepth: Math.round(syntheticVolume(a.id, hourBucket) * 0.4),
        volume24h: syntheticVolume(a.id, hourBucket) * 24,
      };
    });
    const depthRes = ok({ view: "depth", depth }, 200);
    setStaleWhileRevalidate(depthRes, 30, 120); // 30 sec CDN + 2 min stale
    return depthRes;
  }

  // ── View: movers — top gainers and losers ───────────────────────────────
  if (view === "movers") {
    const withChange = actions.map((a) => {
      const currentPrice = syntheticPrice(a.id, a.value, hourBucket);
      const prevPrice = syntheticPrice(a.id, a.value, hourBucket - 1);
      const change = prevPrice > 0 ? ((currentPrice - prevPrice) / prevPrice) * 100 : 0;
      return {
        actionId: a.id,
        label: a.label,
        platformId: a.platformId,
        platformName: a.platformName,
        currentPrice,
        previousPrice: prevPrice,
        changePercent: Math.round(change * 100) / 100,
        volume: syntheticVolume(a.id, hourBucket) * 24,
      };
    });

    const sorted = withChange.sort((a, b) => b.changePercent - a.changePercent);
    const moversRes = ok(
      {
        view: "movers",
        gainers: sorted.slice(0, 10),
        losers: sorted.slice(-10).reverse(),
      },
      200
    );
    setStaleWhileRevalidate(moversRes, 30, 120); // 30 sec CDN + 2 min stale
    return moversRes;
  }

  // ── View: history — price history over requested hours ──────────────────
  if (view === "history") {
    const target = actions.slice(0, 5); // Limit history to 5 actions
    const history = target.map((a) => {
      const points: { hour: number; price: number; volume: number }[] = [];
      for (let h = hours; h >= 0; h--) {
        const bucket = hourBucket - h;
        points.push({
          hour: bucket,
          price: syntheticPrice(a.id, a.value, bucket),
          volume: syntheticVolume(a.id, bucket),
        });
      }
      return {
        actionId: a.id,
        label: a.label,
        platformId: a.platformId,
        platformName: a.platformName,
        baseValue: a.value,
        points,
      };
    });

    const historyRes = ok({ view: "history", hours, history }, 200);
    setStaleWhileRevalidate(historyRes, 30, 120); // 30 sec CDN + 2 min stale
    return historyRes;
  }

  // ── View: stats (default) — aggregate market statistics ─────────────────
  const totalVolume = actions.reduce(
    (sum, a) => sum + syntheticVolume(a.id, hourBucket) * 24,
    0
  );
  const avgPrice =
    actions.reduce((sum, a) => sum + syntheticPrice(a.id, a.value, hourBucket), 0) /
    (actions.length || 1);

  const byPlatform = new Map<
    string,
    { name: string; actions: number; volume: number; avgPrice: number }
  >();
  for (const a of actions) {
    const entry = byPlatform.get(a.platformId) ?? {
      name: a.platformName,
      actions: 0,
      volume: 0,
      avgPrice: 0,
    };
    entry.actions++;
    entry.volume += syntheticVolume(a.id, hourBucket) * 24;
    entry.avgPrice += syntheticPrice(a.id, a.value, hourBucket);
    byPlatform.set(a.platformId, entry);
  }

  const platformStats = Array.from(byPlatform.entries()).map(
    ([id, data]) => ({
      platformId: id,
      name: data.name,
      actionCount: data.actions,
      totalVolume: data.volume,
      avgPrice: Math.round((data.avgPrice / data.actions) * 100) / 100,
    })
  );

  const byType = new Map<string, { count: number; totalValue: number }>();
  for (const a of actions) {
    const entry = byType.get(a.type) ?? { count: 0, totalValue: 0 };
    entry.count++;
    entry.totalValue += syntheticPrice(a.id, a.value, hourBucket);
    byType.set(a.type, entry);
  }

  const typeStats = Array.from(byType.entries()).map(([type, data]) => ({
    type,
    actionCount: data.count,
    avgPrice: Math.round((data.totalValue / data.count) * 100) / 100,
  }));

  const statsRes = ok(
    {
      view: "stats",
      market: {
        totalActions: actions.length,
        totalPlatforms: new Set(actions.map((a) => a.platformId)).size,
        totalVolume24h: totalVolume,
        avgPrice: Math.round(avgPrice * 100) / 100,
        timestamp: new Date().toISOString(),
      },
      platformStats,
      typeStats,
    },
    200
  );
  setStaleWhileRevalidate(statsRes, 30, 120); // 30 sec CDN + 2 min stale
  return statsRes;
}), { ttl: 30 });
