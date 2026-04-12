/**
 * GET    /api/v1/influencers/:influencerId — Get single influencer profile
 * PUT    /api/v1/influencers/:influencerId — Update influencer profile (require auth)
 * DELETE /api/v1/influencers/:influencerId — Archive influencer profile (soft-delete)
 */

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  ok,
  err,
  requireAuth,
  rateLimit,
  parseBody,
  withTiming,
} from "../../_shared";
import { createSeedData, type SeedInfluencer } from "@/lib/seed";
import { validateId, validateString } from "@/lib/security/validate";

// ─── In-memory store (shared with parent route via module scope) ─────────────
// In production this would be a database lookup.

const seedData = createSeedData();
const influencerStore: (SeedInfluencer & { archived?: boolean })[] = [
  ...seedData.influencers,
];

// ─── Params helper ───────────────────────────────────────────────────────────

async function getInfluencerIdParam(
  ctx: unknown
): Promise<string | null> {
  try {
    const { influencerId } = await (
      ctx as { params: Promise<{ influencerId: string }> }
    ).params;
    return influencerId ?? null;
  } catch {
    return null;
  }
}

// ─── GET ────────────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Rate limit — relaxed for read-only
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const rawId = await getInfluencerIdParam(ctx);
  const v = validateId(rawId);
  if (!v.success) return err("INVALID_INFLUENCER_ID", v.error, 400);

  const influencer = influencerStore.find(
    (i) => i.id === v.data && !i.archived
  );
  if (!influencer) {
    return err(
      "INFLUENCER_NOT_FOUND",
      `Influencer ${v.data} not found`,
      404
    );
  }

  return ok({ influencer });
});

// ─── PUT ────────────────────────────────────────────────────────────────────

export const PUT = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const rawId = await getInfluencerIdParam(ctx);
  const iv = validateId(rawId);
  if (!iv.success) return err("INVALID_INFLUENCER_ID", iv.error, 400);

  const influencer = influencerStore.find(
    (i) => i.id === iv.data && !i.archived
  );
  if (!influencer) {
    return err(
      "INFLUENCER_NOT_FOUND",
      `Influencer ${iv.data} not found`,
      404
    );
  }

  // Parse body
  const body = await parseBody<{
    displayName?: string;
    bio?: string;
    niches?: string[];
    followerCount?: number;
    engagementRate?: number;
    platforms?: { platformId: string; handle: string; followers: number }[];
    location?: string;
  }>(req);
  if (body instanceof NextResponse) return body;

  // Build updates
  const updates: Record<string, unknown> = {};

  if (body.displayName !== undefined) {
    const nv = validateString(body.displayName, "displayName", {
      min: 1,
      max: 100,
    });
    if (!nv.success) return err("INVALID_DISPLAY_NAME", nv.error, 400);
    influencer.displayName = nv.data;
    updates.displayName = nv.data;
  }

  if (body.bio !== undefined) {
    const bv = validateString(body.bio, "bio", { min: 0, max: 1000 });
    if (!bv.success) return err("INVALID_BIO", bv.error, 400);
    influencer.bio = bv.data;
    updates.bio = bv.data;
  }

  if (body.niches !== undefined) {
    if (!Array.isArray(body.niches) || body.niches.length === 0) {
      return err(
        "INVALID_NICHES",
        "niches must be a non-empty array of strings",
        400
      );
    }
    influencer.niches = body.niches;
    updates.niches = body.niches;
  }

  if (body.followerCount !== undefined) {
    if (typeof body.followerCount !== "number" || body.followerCount < 0) {
      return err(
        "INVALID_FOLLOWER_COUNT",
        "followerCount must be a non-negative number",
        400
      );
    }
    influencer.followerCount = body.followerCount;
    updates.followerCount = body.followerCount;

    // Recalculate tier
    const fc = body.followerCount;
    if (fc >= 1_000_000) influencer.tier = "mega";
    else if (fc >= 100_000) influencer.tier = "macro";
    else if (fc >= 10_000) influencer.tier = "mid";
    else influencer.tier = "micro";
    updates.tier = influencer.tier;
  }

  if (body.engagementRate !== undefined) {
    if (typeof body.engagementRate !== "number" || body.engagementRate < 0) {
      return err(
        "INVALID_ENGAGEMENT_RATE",
        "engagementRate must be a non-negative number",
        400
      );
    }
    influencer.engagementRate = body.engagementRate;
    updates.engagementRate = body.engagementRate;
  }

  if (body.platforms !== undefined) {
    if (!Array.isArray(body.platforms)) {
      return err("INVALID_PLATFORMS", "platforms must be an array", 400);
    }
    influencer.platforms = body.platforms;
    updates.platforms = body.platforms;
  }

  if (body.location !== undefined) {
    const lv = validateString(body.location, "location", {
      min: 0,
      max: 200,
    });
    if (!lv.success) return err("INVALID_LOCATION", lv.error, 400);
    influencer.location = lv.data;
    updates.location = lv.data;
  }

  if (Object.keys(updates).length === 0) {
    return err("NO_UPDATES", "No valid fields provided to update", 400);
  }

  return ok({ influencer, updatedFields: Object.keys(updates) });
});

// ─── DELETE ─────────────────────────────────────────────────────────────────

export const DELETE = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Auth required
  const user = requireAuth(req);
  if (user instanceof NextResponse) return user;

  // Rate limit — standard for writes
  const limited = rateLimit(req, "standard");
  if (limited) return limited;

  const rawId = await getInfluencerIdParam(ctx);
  const iv = validateId(rawId);
  if (!iv.success) return err("INVALID_INFLUENCER_ID", iv.error, 400);

  const influencer = influencerStore.find(
    (i) => i.id === iv.data && !i.archived
  );
  if (!influencer) {
    return err(
      "INFLUENCER_NOT_FOUND",
      `Influencer ${iv.data} not found`,
      404
    );
  }

  // Soft-delete: mark as archived
  (influencer as SeedInfluencer & { archived?: boolean }).archived = true;

  return ok({
    influencer: { id: influencer.id, displayName: influencer.displayName },
    message: "Influencer profile archived (soft-deleted)",
  });
});
