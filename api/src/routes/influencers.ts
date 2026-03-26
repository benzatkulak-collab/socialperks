import { Hono } from "hono";
import { apiResponse, apiError, parsePagination, paginationMeta } from "../helpers.js";
import { requireAuth } from "../middleware/auth.js";
import { rateLimit } from "../middleware/rate-limit.js";
import { createSeedData } from "@/lib/seed";
import { matchingService } from "@/lib/ml/embedding-system";
import { logger } from "@/lib/logging";

const app = new Hono();
const registeredInfluencers = new Map<string, Record<string, unknown>>();

app.get("/", rateLimit("public"), (c) => {
  const params = c.req.query();
  const niche = params.niche;
  const tier = params.tier;
  const minFollowers = params.minFollowers ? parseInt(params.minFollowers) : undefined;
  const platformId = params.platformId;
  const location = params.location;
  const { page, perPage } = parsePagination(new URLSearchParams(params));

  const seed = createSeedData();
  let influencers = [...seed.influencers, ...Array.from(registeredInfluencers.values())];

  if (niche) influencers = influencers.filter((i: Record<string, unknown>) => {
    const niches = (i.niches ?? i.niche) as string[] | string | undefined;
    return Array.isArray(niches) ? niches.some((n) => n.toLowerCase().includes(niche.toLowerCase())) : typeof niches === "string" && niches.toLowerCase().includes(niche.toLowerCase());
  });
  if (tier) influencers = influencers.filter((i: Record<string, unknown>) => (i.tier as string) === tier);
  if (minFollowers) influencers = influencers.filter((i: Record<string, unknown>) => ((i.followers as number) ?? 0) >= minFollowers);
  if (platformId) influencers = influencers.filter((i: Record<string, unknown>) => {
    const platforms = i.platforms as string[] | undefined;
    return platforms && platforms.includes(platformId);
  });
  if (location) influencers = influencers.filter((i: Record<string, unknown>) => ((i.location as string) ?? "").toLowerCase().includes(location.toLowerCase()));

  const total = influencers.length;
  const paginated = influencers.slice((page - 1) * perPage, page * perPage);

  return apiResponse(c, { influencers: paginated, pagination: paginationMeta(total, page, perPage) });
});

app.post("/", rateLimit("standard"), requireAuth, async (c) => {
  try {
    const body = await c.req.json();
    if (!body.displayName || typeof body.displayName !== "string") return apiError(c, "MISSING_FIELD", "displayName is required");
    if (!body.email || typeof body.email !== "string") return apiError(c, "MISSING_FIELD", "email is required");

    const id = `inf_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const influencer = {
      id, displayName: String(body.displayName).slice(0, 200), email: String(body.email).slice(0, 254).toLowerCase(),
      niches: Array.isArray(body.niches) ? body.niches.filter((n: unknown) => typeof n === "string").slice(0, 10) : [],
      platforms: Array.isArray(body.platforms) ? body.platforms.filter((p: unknown) => typeof p === "string").slice(0, 15) : [],
      followers: typeof body.followers === "number" ? Math.max(0, body.followers) : 0,
      location: typeof body.location === "string" ? body.location.slice(0, 200) : "",
      bio: typeof body.bio === "string" ? body.bio.slice(0, 2000) : "",
      rateCard: body.rateCard ?? null,
      registeredAt: new Date().toISOString(),
    };

    registeredInfluencers.set(id, influencer);
    try { matchingService.indexInfluencer({ id, niches: influencer.niches, platforms: influencer.platforms, followers: influencer.followers, location: influencer.location }); } catch { /* non-blocking */ }
    logger.info("Influencer registered", { id, email: influencer.email });
    return apiResponse(c, influencer, 201);
  } catch (err) {
    logger.error("Influencer registration failed", err);
    return apiError(c, "REGISTRATION_FAILED", "Failed to register influencer", 500);
  }
});

export default app;
