/**
 * Seed Data API Route — /api/v1/seed
 *
 * POST: Returns demo data (businesses, influencers, stats).
 * Only available in development — returns 404 in production.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../_shared";
import { createSeedData } from "@social-perks/shared/seed";

export const POST = withTiming(async (req: NextRequest) => {
  if (process.env.NODE_ENV === "production") {
    return err("NOT_FOUND", "Not found", 404);
  }

  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const seed = createSeedData();

  return ok({
    businesses: seed.businesses,
    influencers: seed.influencers,
    stats: seed.stats,
  });
});
