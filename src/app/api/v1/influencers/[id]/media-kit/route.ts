/**
 * GET /api/v1/influencers/:id/media-kit — machine-readable creator media kit
 *
 * Closes the second gap from the agent-attraction audit (PR #42): the
 * media-kit UI exists at `src/components/influencer/media-kit.tsx` but
 * has no API equivalent, so an autonomous brand-side agent looking to
 * book a creator has no structured artifact to reason about.
 *
 * What this returns:
 *   - Identity (id, displayName, bio, location, niches, tier)
 *   - Reach (totalFollowers, per-platform handle/url/followers, engagement)
 *   - Rate card derived from the public pricing oracle + tier multiplier
 *   - Trust signals (joinedAt, verified flag, completion stats — best-effort)
 *   - Audience fit hints (industries inferred from niches)
 *   - Agent instructions block — explicit "what to call next" pointers
 *     so an agent doesn't have to guess at the booking protocol
 *
 * Schema.org compatibility: top-level `@context` + `@type: Person` so a
 * crawler indexing the JSON gets a typed entity for free. The Social
 * Perks-specific fields live alongside without colliding.
 *
 * Public, relaxed-tier rate-limited. Cached 5 minutes — rate cards and
 * follower counts don't move minute-to-minute and the cache savings on
 * agent traffic are real.
 */

import type { NextRequest } from "next/server";
import { ok, err, rateLimit, withTiming } from "../../../_shared";
import { createSeedData, type SeedInfluencer } from "@/lib/seed";
import { ALL_ACTIONS, PLATFORMS } from "@/lib/platforms";
import { estimatePricing } from "@/lib/ai-engine";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// ─── Tier-based rate multipliers ────────────────────────────────────────────
// The pricing oracle returns a market rate per action. Real creators
// charge a premium on top based on their reach. Multipliers below match
// the follower-tier system documented in CLAUDE.md (anyone, 500+, 2k+,
// 10k+, 50k+) translated to influencer tiers.
const TIER_MULTIPLIER: Record<SeedInfluencer["tier"], number> = {
  micro: 1.0, // 1k–10k followers — base rate
  mid: 1.5, // 10k–100k
  macro: 2.5, // 100k–1M
  mega: 4.0, // 1M+
};

// ─── Niche → industry inference ─────────────────────────────────────────────
// Best-effort mapping so brand-side agents searching by industry can
// match creators. Not exhaustive; the underlying niches array is also
// surfaced so an agent can do its own classification.
const NICHE_TO_INDUSTRIES: Record<string, string[]> = {
  food: ["Food & Beverage", "Restaurants"],
  restaurants: ["Food & Beverage", "Restaurants"],
  beverages: ["Food & Beverage"],
  fitness: ["Fitness", "Wellness"],
  gym: ["Fitness"],
  wellness: ["Wellness", "Health"],
  health: ["Health", "Wellness"],
  yoga: ["Wellness", "Fitness"],
  meditation: ["Wellness"],
  fashion: ["Retail", "Fashion"],
  beauty: ["Beauty", "Cosmetics"],
  lifestyle: ["Retail", "Lifestyle"],
  photography: ["Creative Services", "Photography"],
  travel: ["Travel", "Hospitality"],
  tech: ["Technology", "SaaS"],
  gaming: ["Gaming", "Entertainment"],
  parenting: ["Family", "Retail"],
  pet: ["Pet Care"],
  business: ["Professional Services", "B2B"],
};

function inferIndustries(niches: string[]): string[] {
  const set = new Set<string>();
  for (const niche of niches) {
    const matches = NICHE_TO_INDUSTRIES[niche.toLowerCase()];
    if (matches) for (const m of matches) set.add(m);
  }
  return [...set];
}

// ─── Platform handle → social URL ───────────────────────────────────────────
// Map handle to a canonical profile URL when we know the platform's URL
// pattern. Falls back to no url field if unknown — agents can resolve
// via search if needed.
function profileUrl(platformId: string, handle: string): string | null {
  const stripped = handle.replace(/^@/, "");
  const map: Record<string, string> = {
    ig: `https://instagram.com/${stripped}`,
    fb: `https://facebook.com/${stripped}`,
    tt: `https://tiktok.com/@${stripped}`,
    xw: `https://x.com/${stripped}`,
    yt: `https://youtube.com/@${stripped}`,
    li: `https://linkedin.com/in/${stripped}`,
    pi: `https://pinterest.com/${stripped}`,
    th: `https://threads.net/@${stripped}`,
    sc: `https://snapchat.com/add/${stripped}`,
    tw: `https://twitch.tv/${stripped}`,
    rd: `https://reddit.com/user/${stripped}`,
  };
  return map[platformId] ?? null;
}

// ─── Build the rate card ────────────────────────────────────────────────────
function buildRateCard(
  influencer: SeedInfluencer,
  influencerPlatformIds: Set<string>
): Array<{
  actionId: string;
  label: string;
  platformId: string;
  platformName: string;
  effort: number;
  rate: number;
  currency: "USD";
}> {
  const multiplier = TIER_MULTIPLIER[influencer.tier];
  const out: ReturnType<typeof buildRateCard> = [];

  // Only price actions on platforms this creator is actually on.
  // Cap output at 25 entries — a 125-action menu would be noise to the
  // brand-side agent and would balloon the JSON for no marginal value.
  const candidateActions = ALL_ACTIONS.filter(
    (a) => influencerPlatformIds.has(a.platformId) && a.incentivizable
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 25);

  for (const action of candidateActions) {
    const baseEstimate = estimatePricing(action.id, "general", "small");
    const rate = Math.round(baseEstimate.marketRate * multiplier * 100) / 100;
    if (rate <= 0) continue;
    out.push({
      actionId: action.id,
      label: action.label,
      platformId: action.platformId,
      platformName: action.platformName,
      effort: action.effort,
      rate,
      currency: "USD",
    });
  }
  return out;
}

// ─── Route ──────────────────────────────────────────────────────────────────
export const GET = withTiming(async (req: NextRequest, ctx?: unknown) => {
  // Public — relaxed tier (60/min/IP). Caching does most of the heavy
  // lifting at production scale.
  const limited = rateLimit(req, "relaxed");
  if (limited) return limited;

  const { id } = await (ctx as RouteContext).params;
  if (!id || typeof id !== "string" || id.length > 64) {
    return err("INVALID_ID", "Influencer id is missing or malformed", 400);
  }

  const seed = createSeedData();
  const influencer = seed.influencers.find((i) => i.id === id);
  if (!influencer) {
    return err("NOT_FOUND", "Influencer not found", 404);
  }

  const platformIdSet = new Set(influencer.platforms.map((p) => p.platformId));
  const platformDetails = influencer.platforms.map((p) => {
    const platform = PLATFORMS.find((pl) => pl.id === p.platformId);
    return {
      platformId: p.platformId,
      platformName: platform?.name ?? p.platformId,
      handle: p.handle,
      url: profileUrl(p.platformId, p.handle),
      followers: p.followers,
    };
  });

  const rateCard = buildRateCard(influencer, platformIdSet);

  const baseUrl = new URL(req.url);
  const selfUrl = `${baseUrl.protocol}//${baseUrl.host}/api/v1/influencers/${id}/media-kit`;

  const payload = {
    // Schema.org typing — crawlers and structured-data tools get a
    // typed entity for free. The Social Perks fields live alongside.
    "@context": "https://schema.org",
    "@type": "Person",

    // Identity
    id: influencer.id,
    displayName: influencer.displayName,
    bio: influencer.bio,
    avatar: influencer.avatar,
    location: influencer.location,
    niches: influencer.niches,
    tier: influencer.tier,

    // Reach
    totalFollowers: influencer.followerCount,
    avgEngagementRate: influencer.engagementRate,
    platforms: platformDetails,

    // Rate card derived from pricing oracle + tier multiplier. Each
    // entry is what the creator can be expected to earn for that
    // action — the brand-side agent uses this to budget.
    rateCard,
    rateCardSource:
      "Derived from /api/v1/pricing oracle multiplied by tier rate. Per-creator overrides are not yet supported.",

    // Audience-fit hints — best-effort niche → industry mapping plus a
    // home location pointer. Agents that need finer-grained audience
    // data should call /api/v1/influencers/{id}/audience (forward
    // reference — not yet implemented).
    audienceFit: {
      industries: inferIndustries(influencer.niches),
      locations: [influencer.location],
    },

    // Trust signals — what an agent should look at to decide whether
    // to book this creator. The completedCampaigns / responseTimeHours
    // fields are placeholders until the campaign-state-machine exposes
    // per-creator aggregates publicly.
    trustSignals: {
      verified: false,
      joinedAt: null as string | null, // SeedInfluencer doesn't track joinedAt
      completedCampaigns: null,
      avgCompletionRate: null,
      responseTimeHours: null,
    },

    // What an agent should call next. Explicit so it doesn't have to
    // guess at protocols. URLs are relative — agents combine with the
    // base URL they discovered via /api/v1/discover or AGENTS.md.
    agentInstructions: {
      bookingEndpoint: "POST /api/v1/exchange/orders",
      campaignsEndpoint: "POST /api/v1/campaigns",
      negotiationProtocol:
        "Place a buy order on /api/v1/exchange/orders specifying actionId + maxRate. Counter-offers are placed against the resulting trade.",
      pricingOracle: "GET /api/v1/pricing?actionId=<id>",
      docs: "/AGENTS.md",
      schemaVersion: "social-perks-media-kit-v1",
    },

    _meta: {
      format: "social-perks-media-kit-v1",
      generatedAt: new Date().toISOString(),
      selfUrl,
    },
  };

  return ok(payload, 200, {
    "Cache-Control": "public, max-age=300, s-maxage=300",
  });
});
