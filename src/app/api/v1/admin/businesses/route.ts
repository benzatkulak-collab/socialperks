/**
 * Admin business list — /api/v1/admin/businesses
 *
 * Source-of-truth list of every business on the platform with
 * admin-relevant joins (campaign count, submission count). Today this
 * is derived from seed; when businesses live in Postgres, swap to a
 * single JOIN query.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, getQuery, withTiming } from "../../_shared";
import { createSeedData, type SeedBusiness } from "@social-perks/shared/seed";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  const params = getQuery(req);
  const search = params.get("search")?.toLowerCase();
  const size = params.get("size");
  const industry = params.get("industry")?.toLowerCase();

  const seed = createSeedData();
  let businesses: SeedBusiness[] = [...seed.businesses];

  if (search) {
    businesses = businesses.filter(
      (b) =>
        b.name.toLowerCase().includes(search) ||
        b.email.toLowerCase().includes(search) ||
        b.id.toLowerCase().includes(search) ||
        b.location.toLowerCase().includes(search)
    );
  }
  if (size) businesses = businesses.filter((b) => b.size === size);
  if (industry) businesses = businesses.filter((b) => b.industry.toLowerCase() === industry);

  const counts = {
    total: seed.businesses.length,
    bySize: {
      solo: seed.businesses.filter((b) => b.size === "solo").length,
      small: seed.businesses.filter((b) => b.size === "small").length,
      medium: seed.businesses.filter((b) => b.size === "medium").length,
      enterprise: seed.businesses.filter((b) => b.size === "enterprise").length,
    },
    industries: Array.from(new Set(seed.businesses.map((b) => b.industry))).sort(),
  };

  return ok({ businesses, counts });
});
