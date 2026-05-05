/**
 * GET /api/v1/actions/full
 *
 * Bulk export of the entire action library — 107 marketing actions
 * across 15 platforms — as a single response. ETag-keyed so agents
 * can `If-None-Match` and skip the body when nothing changed.
 *
 * Why this exists separately from /api/v1/actions:
 *   - /actions is filterable (platform, tier, businessType) — it's
 *     the route an agent calls when answering a specific question
 *     ("what's a good Instagram action for a coffee shop?").
 *   - /actions/full is the offline-cache export — the route an agent
 *     calls once, caches the response with the ETag, and uses
 *     locally for matching/filtering until the ETag changes.
 *
 * The action library is content, not user data — no auth required.
 * Cache aggressively at the edge (CDN) but force agents to revalidate
 * via ETag.
 */

import type { NextRequest } from "next/server";
import crypto from "crypto";
import { PLATFORMS, ALL_ACTIONS } from "@social-perks/shared/platforms";

export const runtime = "nodejs";

interface ExportPayload {
  /** Schema version. Bump when the shape of platform/action changes. */
  v: 1;
  /** Generated-at — agents can use this for soft-staleness checks. */
  generatedAt: string;
  /** Total action count — for sanity checks. */
  totalActions: number;
  totalPlatforms: number;
  platforms: typeof PLATFORMS;
  actions: typeof ALL_ACTIONS;
}

// Compute the ETag once at module load. The action library is
// compiled into the bundle, so it can only change when the binary
// changes — meaning a redeploy. Computing once avoids hashing on
// every request.
const PAYLOAD: ExportPayload = {
  v: 1,
  // Use a fixed timestamp pinned to module evaluation. A fresh
  // generatedAt per-deploy is fine; per-request churn would defeat
  // ETag caching downstream.
  generatedAt: new Date().toISOString(),
  totalActions: ALL_ACTIONS.length,
  totalPlatforms: PLATFORMS.length,
  platforms: PLATFORMS,
  actions: ALL_ACTIONS,
};

const SERIALIZED = JSON.stringify(PAYLOAD);
const ETAG = `"${crypto.createHash("sha256").update(SERIALIZED).digest("hex").slice(0, 16)}"`;

export async function GET(req: NextRequest): Promise<Response> {
  const ifNoneMatch = req.headers.get("if-none-match");

  // Honor If-None-Match: agents that already have this version can
  // get a 304 with empty body. No extra work for us, no payload
  // for the agent.
  if (ifNoneMatch && ifNoneMatch === ETAG) {
    return new Response(null, {
      status: 304,
      headers: {
        ETag: ETAG,
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    });
  }

  return new Response(SERIALIZED, {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ETag: ETAG,
      // Browser caches for 5 min, CDN holds for a day. Agents
      // should rely on ETag revalidation rather than the cache TTL.
      "Cache-Control": "public, max-age=300, s-maxage=86400, stale-while-revalidate=86400",
      "Access-Control-Allow-Origin": "*",
      // Tell the agent how to use this response.
      "X-Cache-Hint": "compare ETag on subsequent calls; the action library only changes when we redeploy",
    },
  });
}
