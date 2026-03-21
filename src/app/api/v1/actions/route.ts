import { NextRequest } from "next/server";
import { ALL_ACTIONS, PLATFORMS, ACTION_CATEGORIES } from "@/lib/platforms";
import { apiResponse, parsePagination, paginationMeta } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";

/**
 * GET /api/v1/actions
 *
 * Full action library with platform metadata.
 * Supports filtering by platform, type, effort level.
 */
export async function GET(request: NextRequest) {
  const startTime = performance.now();
  logger.info("GET /api/v1/actions", { method: "GET", path: "/api/v1/actions" });

  const { searchParams } = new URL(request.url);
  const platformId = searchParams.get("platformId");
  const type = searchParams.get("type");
  const maxEffort = searchParams.get("maxEffort");
  const { page, perPage, offset } = parsePagination(searchParams);

  let filtered = [...ALL_ACTIONS];

  if (platformId) {
    filtered = filtered.filter((a) => a.platformId === platformId);
  }
  if (type) {
    filtered = filtered.filter((a) => a.type === type);
  }
  if (maxEffort) {
    const max = parseInt(maxEffort);
    if (!isNaN(max)) {
      filtered = filtered.filter((a) => a.effort <= max);
    }
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + perPage);

  const durationMs = Math.round(performance.now() - startTime);
  logger.info("GET /api/v1/actions completed", { durationMs, total });

  return apiResponse(
    {
      actions: paginated.map((a) => ({
        id: a.id,
        label: a.label,
        type: a.type,
        effort: a.effort,
        value: a.value,
        platform: {
          id: a.platformId,
          name: a.platformName,
          icon: a.platformIcon,
          color: a.platformColor,
        },
      })),
      meta: {
        platforms: PLATFORMS.length,
        categories: ACTION_CATEGORIES.length,
        totalActions: ALL_ACTIONS.length,
      },
      pagination: paginationMeta(total, page, perPage),
    },
    200,
    { "Cache-Control": "public, max-age=3600" }
  );
}
