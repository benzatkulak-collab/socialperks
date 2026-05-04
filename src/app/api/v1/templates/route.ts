/**
 * GET /api/v1/templates
 *
 * Public campaign template library. Returns pre-built, industry-specific
 * campaign templates that businesses can use for one-click campaign creation.
 * Cached for 1 hour.
 *
 * Query params: industry?, platform?, difficulty?, page?, perPage?
 */

import type { NextRequest } from "next/server";
import { ok, err, getQuery, paginate, withTiming } from "../_shared";
import {
  getAllCompliantTemplates,
  INDUSTRY_MAP,
  type CampaignTemplate,
} from "@/lib/campaign-templates";

export const GET = withTiming(async (req: NextRequest) => {
  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  const industry = params.get("industry");
  const platform = params.get("platform");
  const difficulty = params.get("difficulty");

  // Validate industry if provided
  if (industry && !INDUSTRY_MAP[industry]) {
    return err(
      "INVALID_INDUSTRY",
      `Unknown industry "${industry}". Valid industries: ${Object.keys(INDUSTRY_MAP).join(", ")}`,
      400
    );
  }

  // Validate difficulty if provided
  const validDifficulties = ["easy", "medium", "hard"];
  if (difficulty && !validDifficulties.includes(difficulty)) {
    return err(
      "INVALID_DIFFICULTY",
      `Unknown difficulty "${difficulty}". Valid values: ${validDifficulties.join(", ")}`,
      400
    );
  }

  // Filter templates — start from the compliance-filtered set so prohibited
  // actions (Google/Yelp/Tripadvisor reviews) never reach the client.
  let templates: CampaignTemplate[] = getAllCompliantTemplates();

  if (industry) {
    templates = templates.filter((t) => t.industry === industry);
  }
  if (platform) {
    templates = templates.filter((t) => t.platform === platform);
  }
  if (difficulty) {
    templates = templates.filter((t) => t.difficulty === difficulty);
  }

  // Paginate
  const total = templates.length;
  const start = (page - 1) * perPage;
  const paged = templates.slice(start, start + perPage);

  return ok(
    {
      templates: paged,
      total,
      page,
      perPage,
      totalPages: Math.ceil(total / perPage),
      industries: INDUSTRY_MAP,
    },
    200,
    { "Cache-Control": "public, max-age=3600, s-maxage=3600" }
  );
});
