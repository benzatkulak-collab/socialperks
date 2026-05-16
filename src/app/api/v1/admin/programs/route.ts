/**
 * Admin programs — /api/v1/admin/programs
 *
 * Aggregates perk programs across every business in the platform.
 * The user-facing /api/v1/programs is tenant-isolated; this one
 * walks the seed business list and merges programs from each tenant
 * so admins can see the full picture.
 */

import type { NextRequest } from "next/server";
import { ok, err, requireAuth, rateLimit, withTiming } from "../../_shared";
import { perkProgramManager } from "@/lib/perk-programs";
import { createSeedData } from "@social-perks/shared/seed";

export const GET = withTiming(async (req: NextRequest) => {
  const limited = rateLimit(req, "strict");
  if (limited) return limited;

  const user = requireAuth(req);
  if (user instanceof Response) return user;
  if (user.role !== "admin") return err("FORBIDDEN", "Admin role required", 403);

  const seed = createSeedData();
  const allPrograms: Array<ReturnType<typeof perkProgramManager.listPrograms>[number] & { businessName?: string }> = [];

  for (const biz of seed.businesses) {
    const programs = perkProgramManager.listPrograms(biz.id);
    for (const p of programs) {
      allPrograms.push({ ...p, businessName: biz.name });
    }
  }

  const counts = {
    total: allPrograms.length,
    active: allPrograms.filter((p) => p.status === "active").length,
    paused: allPrograms.filter((p) => p.status === "paused").length,
    ended: allPrograms.filter((p) => p.status === "ended").length,
  };

  return ok({ programs: allPrograms, counts });
});
