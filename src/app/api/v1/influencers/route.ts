/**
 * GET  /api/v1/influencers — Search/list influencers (relaxed rate limit)
 * POST /api/v1/influencers — Register new influencer (auth + standard rate limit)
 *
 * GET query params: niche?, platformId?, location?, tier?, minFollowers?,
 *                   maxFollowers?, page?, perPage?
 *
 * POST body: { displayName, email, bio, niches, followerCount,
 *              engagementRate, platforms, location }
 */

import type { NextRequest } from "next/server";
import {
  ok,
  err,
  requireAuth,
  requireCsrf,
  rateLimit,
  parseBody,
  getQuery,
  paginate,
  withTiming,
} from "../_shared";
import { createSeedData, type SeedInfluencer } from "@/lib/seed";

// In-memory store initialized from seed data.
// In production this would be backed by a database.
const seedData = createSeedData();
const influencerStore: SeedInfluencer[] = [...seedData.influencers];

export const GET = withTiming(async (req: NextRequest) => {
  // Relaxed rate limit (public but rate-limited)
  const rl = rateLimit(req, "relaxed");
  if (rl) return rl;

  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  const niche = params.get("niche")?.toLowerCase();
  const platformId = params.get("platformId");
  const location = params.get("location")?.toLowerCase();
  const tier = params.get("tier");
  const minFollowersStr = params.get("minFollowers");
  const maxFollowersStr = params.get("maxFollowers");

  // Validate tier
  const validTiers = ["micro", "mid", "macro", "mega"];
  if (tier && !validTiers.includes(tier)) {
    return err(
      "INVALID_FIELD",
      `Invalid tier "${tier}". Must be one of: ${validTiers.join(", ")}`,
      400
    );
  }

  let minFollowers: number | null = null;
  if (minFollowersStr) {
    minFollowers = parseInt(minFollowersStr, 10);
    if (isNaN(minFollowers) || minFollowers < 0) {
      return err("INVALID_FIELD", "minFollowers must be a non-negative integer", 400);
    }
  }

  let maxFollowers: number | null = null;
  if (maxFollowersStr) {
    maxFollowers = parseInt(maxFollowersStr, 10);
    if (isNaN(maxFollowers) || maxFollowers < 0) {
      return err("INVALID_FIELD", "maxFollowers must be a non-negative integer", 400);
    }
  }

  // Filter
  let results = influencerStore;

  if (niche) {
    results = results.filter((i) =>
      i.niches.some((n) => n.toLowerCase().includes(niche))
    );
  }
  if (platformId) {
    results = results.filter((i) =>
      i.platforms.some((p) => p.platformId === platformId)
    );
  }
  if (location) {
    results = results.filter((i) =>
      i.location.toLowerCase().includes(location)
    );
  }
  if (tier) {
    results = results.filter((i) => i.tier === tier);
  }
  if (minFollowers !== null) {
    results = results.filter((i) => i.followerCount >= minFollowers!);
  }
  if (maxFollowers !== null) {
    results = results.filter((i) => i.followerCount <= maxFollowers!);
  }

  // Paginate
  const total = results.length;
  const start = (page - 1) * perPage;
  const paged = results.slice(start, start + perPage);

  // SECURITY: strip email + pin before serializing. The GET is public
  // (relaxed-tier rate limit, no auth) and the full SeedInfluencer
  // shape includes both — public listing must NOT leak PII or the
  // (deprecated) PIN. Brand-side agents that need contact info should
  // use the booking flow, which routes through the platform.
  const sanitized = paged.map(({ email: _e, pin: _p, ...rest }) => rest);

  return ok({
    influencers: sanitized,
    total,
    page,
    perPage,
    totalPages: Math.ceil(total / perPage),
  });
});

// ─── POST: Register Influencer ───────────────────────────────────────────────

interface RegisterBody {
  displayName?: string;
  email?: string;
  bio?: string;
  niches?: string[];
  followerCount?: number;
  engagementRate?: number;
  platforms?: { platformId: string; handle: string; followers: number }[];
  location?: string;
}

export const POST = withTiming(async (req: NextRequest) => {
  // Auth
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  // Rate limit
  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // CSRF — live audit found bypass
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  // Parse body
  const body = await parseBody<RegisterBody>(req);
  if (body instanceof Response) return body;

  // Validate required fields
  if (!body.displayName || typeof body.displayName !== "string") {
    return err("MISSING_FIELD", "displayName is required", 400);
  }
  if (!body.email || typeof body.email !== "string") {
    return err("MISSING_FIELD", "email is required", 400);
  }
  if (!body.niches || !Array.isArray(body.niches) || body.niches.length === 0) {
    return err("MISSING_FIELD", "niches is required and must be a non-empty array", 400);
  }

  // Check for duplicate email
  if (influencerStore.some((i) => i.email === body.email)) {
    return err("DUPLICATE", "An influencer with this email already exists", 409);
  }

  // Determine tier from follower count
  const followers = body.followerCount ?? 0;
  let tier: "micro" | "mid" | "macro" | "mega" = "micro";
  if (followers >= 1_000_000) tier = "mega";
  else if (followers >= 100_000) tier = "macro";
  else if (followers >= 10_000) tier = "mid";

  const newInfluencer: SeedInfluencer = {
    id: `i_${crypto.randomUUID().replace(/-/g, "").slice(0, 8)}`,
    displayName: body.displayName,
    email: body.email,
    pin: "",
    avatar: "🧑‍💼",
    bio: body.bio ?? "",
    tier,
    niches: body.niches,
    followerCount: followers,
    engagementRate: body.engagementRate ?? 0,
    platforms: body.platforms ?? [],
    location: body.location ?? "",
  };

  influencerStore.push(newInfluencer);

  return ok({ influencer: newInfluencer }, 201);
});

// ─── PUT ────────────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/influencers — Self-update profile.
 *
 * The dashboard "Edit Profile" button previously saved to localStorage
 * only — refreshing the page or signing in from another device showed
 * the old bio/location. This endpoint lets influencers persist their
 * own bio + location server-side. Other fields (display name, follower
 * count, niches) require admin/onboarding flow and aren't editable
 * here.
 */
export const PUT = withTiming(async (req: NextRequest) => {
  const user = requireAuth(req);
  if (user instanceof Response) return user;

  const rl = rateLimit(req, "standard");
  if (rl) return rl;

  // CSRF — mutating route
  const csrfErr = requireCsrf(req);
  if (csrfErr) return csrfErr;

  const body = await parseBody<{
    bio?: string;
    location?: string;
  }>(req);
  if (body instanceof Response) return body;

  // Influencers can only update their own profile. The id is taken
  // from the session — never trust a body field.
  const existing = influencerStore.find((i) => i.id === user.id);
  if (!existing) {
    return err("INFLUENCER_NOT_FOUND", "No influencer profile attached to this account", 404);
  }

  // Validate bio (optional, max 500 chars)
  if (body.bio !== undefined) {
    if (typeof body.bio !== "string" || body.bio.length > 500) {
      return err("INVALID_BIO", "bio must be a string up to 500 chars", 400);
    }
    existing.bio = body.bio;
  }

  // Validate location (optional, max 100 chars)
  if (body.location !== undefined) {
    if (typeof body.location !== "string" || body.location.length > 100) {
      return err("INVALID_LOCATION", "location must be a string up to 100 chars", 400);
    }
    existing.location = body.location;
  }

  return ok({ influencer: existing });
});
