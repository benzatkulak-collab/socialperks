/**
 * GET /api/v1/search
 *
 * Full-text search across campaigns, influencers, and businesses.
 * Auth not required for basic search. Rate limited (relaxed tier).
 *
 * Query params:
 *   q       — Search term (required, min 1 char)
 *   type    — Filter by type: campaigns | influencers | businesses | all (default: all)
 *   page    — Page number (default: 1)
 *   perPage — Results per page (default: 20, max: 100)
 *   fuzzy   — Enable fuzzy matching (default: true)
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, getQuery, paginate, withTiming } from "../_shared";
import { FullTextIndex } from "@/lib/search/full-text";
import { createSeedData } from "@/lib/seed";
import { campaignManager } from "@/lib/campaign-state-machine";
import type { CampaignLifecycle } from "@/lib/campaign-state-machine";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignDoc {
  id: string;
  name: string;
  description: string;
  platform: string;
  state: string;
  businessId: string;
}

interface InfluencerDoc {
  id: string;
  name: string;
  bio: string;
  niche: string;
  location: string;
  tier: string;
  followerCount: number;
}

interface BusinessDoc {
  id: string;
  name: string;
  type: string;
  description: string;
  location: string;
  industry: string;
  size: string;
}

// ─── Indexes (lazy-initialized singletons) ──────────────────────────────────

let campaignIndex: FullTextIndex<CampaignDoc> | null = null;
let influencerIndex: FullTextIndex<InfluencerDoc> | null = null;
let businessIndex: FullTextIndex<BusinessDoc> | null = null;
let lastIndexTime = 0;

const INDEX_REFRESH_MS = 60_000; // Rebuild indexes every 60 seconds

function ensureIndexes(): void {
  const now = Date.now();
  if (campaignIndex && influencerIndex && businessIndex && now - lastIndexTime < INDEX_REFRESH_MS) {
    return;
  }

  const seed = createSeedData();

  // ── Campaign index ─────────────────────────────────────────────────────
  campaignIndex = new FullTextIndex<CampaignDoc>();

  // Index campaigns from the campaign manager (live state)
  const allCampaigns: CampaignLifecycle[] = campaignManager.listAll();
  for (const c of allCampaigns) {
    const doc: CampaignDoc = {
      id: c.id,
      name: c.id,
      description: `Campaign for business ${c.businessId}`,
      platform: "",
      state: c.state,
      businessId: c.businessId,
    };
    campaignIndex.add(c.id, doc, ["name", "description", "platform", "state"]);
  }

  // Also index seed-generated campaigns as virtual entries
  for (const biz of seed.businesses) {
    const virtualId = `seed_${biz.id}`;
    const doc: CampaignDoc = {
      id: virtualId,
      name: `${biz.name} Marketing Campaign`,
      description: `Social marketing campaign for ${biz.name}, a ${biz.type} in ${biz.location}`,
      platform: "multi-platform",
      state: "active",
      businessId: biz.id,
    };
    campaignIndex.add(virtualId, doc, ["name", "description", "platform"]);
  }

  // ── Influencer index ───────────────────────────────────────────────────
  influencerIndex = new FullTextIndex<InfluencerDoc>();
  for (const inf of seed.influencers) {
    const doc: InfluencerDoc = {
      id: inf.id,
      name: inf.displayName,
      bio: inf.bio,
      niche: inf.niches.join(" "),
      location: inf.location,
      tier: inf.tier,
      followerCount: inf.followerCount,
    };
    influencerIndex.add(inf.id, doc, ["name", "bio", "niche", "location"]);
  }

  // ── Business index ─────────────────────────────────────────────────────
  businessIndex = new FullTextIndex<BusinessDoc>();
  for (const biz of seed.businesses) {
    const doc: BusinessDoc = {
      id: biz.id,
      name: biz.name,
      type: biz.type,
      description: `${biz.name} is a ${biz.type} located in ${biz.location}, serving the ${biz.industry} industry.`,
      location: biz.location,
      industry: biz.industry,
      size: biz.size,
    };
    businessIndex.add(biz.id, doc, ["name", "type", "description", "location", "industry"]);
  }

  lastIndexTime = now;
}

// ─── Valid search types ─────────────────────────────────────────────────────

const VALID_TYPES = ["campaigns", "influencers", "businesses", "all"] as const;
type SearchType = (typeof VALID_TYPES)[number];

// ─── GET Handler ────────────────────────────────────────────────────────────

export const GET = withTiming(async (req: NextRequest) => {
  // Rate limit — relaxed tier (public search)
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const params = getQuery(req);
  const { page, perPage } = paginate(params);

  // Validate query
  const q = params.get("q")?.trim();
  if (!q || q.length === 0) {
    return err("MISSING_QUERY", "Query parameter 'q' is required", 400);
  }
  if (q.length > 200) {
    return err("QUERY_TOO_LONG", "Query must be 200 characters or fewer", 400);
  }

  // Validate type
  const typeParam = (params.get("type") ?? "all") as string;
  if (!VALID_TYPES.includes(typeParam as SearchType)) {
    return err(
      "INVALID_TYPE",
      `Invalid type "${typeParam}". Valid types: ${VALID_TYPES.join(", ")}`,
      400
    );
  }
  const searchType = typeParam as SearchType;

  // Fuzzy toggle
  const fuzzy = params.get("fuzzy") !== "false";

  // Ensure indexes are built
  ensureIndexes();

  // Perform searches based on type
  const searchOpts = { limit: 100, fuzzy, fuzzyThreshold: 2 };

  const results: {
    campaigns?: Array<{ id: string; score: number; highlights: Record<string, string>; data: CampaignDoc }>;
    influencers?: Array<{ id: string; score: number; highlights: Record<string, string>; data: InfluencerDoc }>;
    businesses?: Array<{ id: string; score: number; highlights: Record<string, string>; data: BusinessDoc }>;
  } = {};

  let totalResults = 0;

  if (searchType === "all" || searchType === "campaigns") {
    const campaignResults = campaignIndex!.search(q, searchOpts);
    results.campaigns = campaignResults.map((r) => ({
      id: r.id,
      score: r.score,
      highlights: r.highlights,
      data: r.doc,
    }));
    totalResults += campaignResults.length;
  }

  if (searchType === "all" || searchType === "influencers") {
    const influencerResults = influencerIndex!.search(q, searchOpts);
    results.influencers = influencerResults.map((r) => ({
      id: r.id,
      score: r.score,
      highlights: r.highlights,
      data: r.doc,
    }));
    totalResults += influencerResults.length;
  }

  if (searchType === "all" || searchType === "businesses") {
    const businessResults = businessIndex!.search(q, searchOpts);
    results.businesses = businessResults.map((r) => ({
      id: r.id,
      score: r.score,
      highlights: r.highlights,
      data: r.doc,
    }));
    totalResults += businessResults.length;
  }

  // Paginate each group
  if (results.campaigns) {
    const start = (page - 1) * perPage;
    results.campaigns = results.campaigns.slice(start, start + perPage);
  }
  if (results.influencers) {
    const start = (page - 1) * perPage;
    results.influencers = results.influencers.slice(start, start + perPage);
  }
  if (results.businesses) {
    const start = (page - 1) * perPage;
    results.businesses = results.businesses.slice(start, start + perPage);
  }

  return ok({
    query: q,
    type: searchType,
    totalResults,
    page,
    perPage,
    results,
  });
});
