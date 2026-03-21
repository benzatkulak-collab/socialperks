import { NextRequest } from "next/server";
import { createSeedData } from "@/lib/seed";
import { influencerRepo } from "@/lib/db/repositories";
import { matchingService } from "@/lib/ml/embedding-system";
import type { InfluencerEmbeddingInput } from "@/lib/ml/embedding-system";
import { apiResponse, apiError, requireAuth, parsePagination, paginationMeta } from "@/lib/api/middleware";
import { logger } from "@/lib/logging";
import type { InfluencerTier } from "@/lib/types";

/**
 * Seed the influencer repository from seed data on first access.
 * Only runs once — subsequent calls detect existing rows.
 */
let seeded = false;
async function ensureSeeded(): Promise<void> {
  if (seeded) return;
  try {
    const existing = await influencerRepo.findMany({}, { perPage: 1 });
    if (existing.total > 0) {
      seeded = true;
      return;
    }
    const seed = createSeedData();
    for (const inf of seed.influencers) {
      await influencerRepo.create({
        user_id: inf.id,
        display_name: inf.displayName,
        bio: inf.bio,
        follower_count: inf.followerCount,
        engagement_rate: inf.engagementRate,
        niches: inf.niches,
        location: inf.location,
        tier: inf.tier as InfluencerTier,
      });
    }
    seeded = true;
  } catch {
    // Seeding failed — fall through to seed data fallback
  }
}

/**
 * GET /api/v1/influencers — Search influencers
 * POST /api/v1/influencers — Register as influencer
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const niche = searchParams.get("niche");
  const platformId = searchParams.get("platformId");
  const location = searchParams.get("location");
  const tier = searchParams.get("tier");
  const { page, perPage, offset } = parsePagination(searchParams);

  const minFollowersRaw = parseInt(searchParams.get("minFollowers") ?? "0");
  const maxFollowersRaw = parseInt(searchParams.get("maxFollowers") ?? "999999999");
  const minFollowers = Number.isFinite(minFollowersRaw) && minFollowersRaw >= 0 ? minFollowersRaw : 0;
  const maxFollowers = Number.isFinite(maxFollowersRaw) && maxFollowersRaw >= 0 ? maxFollowersRaw : 999999999;

  // Ensure repo is seeded with initial data
  await ensureSeeded();

  // Try repository first
  try {
    const repoResult = await influencerRepo.findMany(
      {
        ...(tier ? { tier: tier as InfluencerTier } : {}),
        ...(location ? { location } : {}),
        ...(minFollowers > 0 ? { minFollowers } : {}),
        ...(maxFollowers < 999999999 ? { maxFollowers } : {}),
        ...(niche ? { search: niche } : {}),
      },
      { page, perPage },
    );

    if (repoResult.total > 0 || seeded) {
      // Post-filter by niche (repo search is on display_name; niche filtering needs extra logic)
      let data = repoResult.data;
      if (niche) {
        const nicheLC = niche.toLowerCase();
        data = data.filter((i) =>
          Array.isArray(i.niches) && i.niches.some((n: string) => n.toLowerCase().includes(nicheLC))
        );
      }

      return apiResponse({
        data: data.map((i) => ({
          id: i.id,
          displayName: i.display_name,
          avatar: "",
          bio: i.bio,
          tier: i.tier,
          niches: i.niches,
          followerCount: i.follower_count,
          engagementRate: i.engagement_rate,
          platforms: [],
          location: i.location,
        })),
        pagination: paginationMeta(data.length, page, perPage),
      });
    }
  } catch {
    // Repo not available — fall through to seed data
  }

  // Fallback: use seed data directly (backwards compat)
  const seed = createSeedData();
  let filtered = seed.influencers;

  if (niche) {
    const nicheLC = niche.toLowerCase();
    filtered = filtered.filter((i) => i.niches.some((n) => n.toLowerCase().includes(nicheLC)));
  }
  if (minFollowers > 0) {
    filtered = filtered.filter((i) => i.followerCount >= minFollowers);
  }
  if (maxFollowers < 999999999) {
    filtered = filtered.filter((i) => i.followerCount <= maxFollowers);
  }
  if (platformId) {
    filtered = filtered.filter((i) => i.platforms.some((p) => p.platformId === platformId));
  }
  if (location) {
    const locLC = location.toLowerCase();
    filtered = filtered.filter((i) => i.location.toLowerCase().includes(locLC));
  }
  if (tier) {
    filtered = filtered.filter((i) => i.tier === tier);
  }

  const total = filtered.length;
  const paginated = filtered.slice(offset, offset + perPage);

  return apiResponse({
    data: paginated.map((i) => ({
      id: i.id,
      displayName: i.displayName,
      avatar: i.avatar,
      bio: i.bio,
      tier: i.tier,
      niches: i.niches,
      followerCount: i.followerCount,
      engagementRate: i.engagementRate,
      platforms: i.platforms,
      location: i.location,
    })),
    pagination: paginationMeta(total, page, perPage),
  });
}

export async function POST(request: NextRequest) {
  const auth = requireAuth(request);
  if (!auth.authorized) return auth.response!;

  try {
    const body = await request.json();
    const { displayName, email, bio, niches, platforms } = body;

    if (!displayName || !email) {
      return apiError("MISSING_FIELDS", "displayName and email are required");
    }

    if (typeof displayName !== "string") {
      return apiError("INVALID_INPUT", "displayName must be a string");
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return apiError("INVALID_EMAIL", "A valid email address is required");
    }

    const sanitizedDisplayName = displayName.slice(0, 200);
    const sanitizedEmail = email.slice(0, 254);
    const sanitizedBio = typeof bio === "string" ? bio.slice(0, 2000) : "";

    // Create via repository
    try {
      const userId = "u" + crypto.randomUUID().replace(/-/g, "").slice(0, 8);
      const row = await influencerRepo.create({
        user_id: userId,
        display_name: sanitizedDisplayName,
        bio: sanitizedBio,
        niches: Array.isArray(niches) ? niches.filter((n: unknown) => typeof n === "string").map((n: string) => n.slice(0, 100)) : [],
        tier: "micro" as InfluencerTier,
      });

      const influencer = {
        id: row.id,
        displayName: row.display_name,
        email: sanitizedEmail,
        bio: row.bio,
        niches: row.niches,
        platforms: Array.isArray(platforms) ? platforms : [],
        tier: row.tier,
        followerCount: row.follower_count,
        engagementRate: row.engagement_rate,
        location: row.location,
        createdAt: row.created_at,
      };

      // Index new influencer in the embedding system for matching
      try {
        const embeddingInput: InfluencerEmbeddingInput = {
          id: influencer.id,
          niches: influencer.niches ?? [],
          followerCount: influencer.followerCount ?? 0,
          engagementRate: influencer.engagementRate ?? 0,
          platforms: (influencer.platforms ?? []).map((p: { platformId: string; followers?: number }) => ({
            platformId: p.platformId,
            followers: p.followers ?? 0,
          })),
          tier: (influencer.tier as "micro" | "mid" | "macro" | "mega") ?? "micro",
          location: influencer.location ?? "",
        };
        matchingService.indexInfluencer(embeddingInput);
      } catch {
        // Embedding indexing failure should not block response
      }

      logger.info("Influencer registered", { influencerId: influencer.id, email: sanitizedEmail });

      return apiResponse(influencer, 201);
    } catch {
      // Fallback: build object directly if repo fails
      const influencer = {
        id: "i" + crypto.randomUUID().replace(/-/g, "").slice(0, 8),
        displayName: sanitizedDisplayName,
        email: sanitizedEmail,
        bio: sanitizedBio,
        niches: Array.isArray(niches) ? niches.filter((n: unknown) => typeof n === "string") : [],
        platforms: Array.isArray(platforms) ? platforms : [],
        tier: "micro",
        followerCount: 0,
        engagementRate: 0,
        location: "",
        createdAt: new Date().toISOString(),
      };

      // Index new influencer in the embedding system
      try {
        matchingService.indexInfluencer({
          id: influencer.id,
          niches: influencer.niches ?? [],
          followerCount: 0,
          engagementRate: 0,
          platforms: (influencer.platforms ?? []).map((p: { platformId: string; followers?: number }) => ({
            platformId: p.platformId,
            followers: p.followers ?? 0,
          })),
          tier: "micro",
          location: "",
        });
      } catch {
        // Embedding indexing failure should not block response
      }

      return apiResponse(influencer, 201);
    }
  } catch (err) {
    logger.error("Influencer registration failed", err);
    return apiError("REGISTRATION_FAILED", "Failed to register influencer", 500);
  }
}
