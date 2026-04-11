/**
 * GET /api/v1/actions
 *
 * Public action library endpoint. Returns all 107+ actions from the
 * PLATFORMS data, filterable by platform, type, and effort level.
 * Cached for 1 hour.
 *
 * Query params: platformId?, type?, maxEffort?, page?, perPage?
 */

import { NextRequest } from "next/server";
import { ok, err, getQuery, paginate, withTiming } from "../_shared";
import { withCache } from "@/lib/cache/middleware";
import { PLATFORMS, ALL_ACTIONS } from "@/lib/platforms";

export const GET = withCache(withTiming(async (req: NextRequest) => {
  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  const platformId = params.get("platformId");
  const type = params.get("type");
  const maxEffortStr = params.get("maxEffort");

  // Validate platformId if provided
  if (platformId && !PLATFORMS.find((p) => p.id === platformId)) {
    return err(
      "INVALID_PLATFORM",
      `Unknown platformId "${platformId}". Valid IDs: ${PLATFORMS.map((p) => p.id).join(", ")}`,
      400
    );
  }

  // Validate type if provided
  const validTypes = ["content", "review", "engage", "share", "referral"];
  if (type && !validTypes.includes(type)) {
    return err(
      "INVALID_TYPE",
      `Unknown type "${type}". Valid types: ${validTypes.join(", ")}`,
      400
    );
  }

  // Validate maxEffort if provided
  let maxEffort: number | null = null;
  if (maxEffortStr) {
    maxEffort = parseInt(maxEffortStr, 10);
    if (isNaN(maxEffort) || maxEffort < 0 || maxEffort > 5) {
      return err("INVALID_FIELD", "maxEffort must be a number between 0 and 5", 400);
    }
  }

  // Filter actions
  let actions = ALL_ACTIONS;

  if (platformId) {
    actions = actions.filter((a) => a.platformId === platformId);
  }
  if (type) {
    actions = actions.filter((a) => a.type === type);
  }
  if (maxEffort !== null) {
    actions = actions.filter((a) => a.effort <= maxEffort!);
  }

  // Paginate
  const total = actions.length;
  const start = (page - 1) * perPage;
  const paged = actions.slice(start, start + perPage);

  return ok(
    {
      actions: paged,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
    },
    200,
    { "Cache-Control": "public, max-age=3600, s-maxage=3600" }
  );
}), { ttl: 1800 });
