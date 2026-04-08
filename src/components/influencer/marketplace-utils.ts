import type { SeedData } from "@/lib/seed";

export interface MarketplaceCampaign {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  businessAvatar: string;
  campaignName: string;
  description: string;
  perkValue: number;
  perkType: "pct" | "dol";
  platform: string;
  platformIcon: string;
  actionId: string;
  actionsRequired: string[];
  effortLevel: number;
}

export const TIER_COLORS: Record<string, string> = {
  micro: "#22D3EE",
  mid: "#A78BFA",
  macro: "#FBBF24",
  mega: "#F472B6",
};

export const PLATFORM_MAP: Record<string, { name: string; icon: string; actionId: string; action: string; effort: number }> = {
  ig: { name: "Instagram", icon: "\uD83D\uDCF8", actionId: "ig_rl", action: "Reel", effort: 3 },
  tt: { name: "TikTok", icon: "\uD83C\uDFAC", actionId: "tt_vd", action: "Video", effort: 3 },
  ggl: { name: "Google", icon: "\uD83C\uDF10", actionId: "ggl_rv", action: "Review", effort: 1 },
  yt: { name: "YouTube", icon: "\uD83D\uDCFA", actionId: "yt_sh", action: "Short", effort: 3 },
  yelp: { name: "Yelp", icon: "\u2B50", actionId: "yelp_rv", action: "Review", effort: 1 },
  fb: { name: "Facebook", icon: "\uD83D\uDC4D", actionId: "fb_ps", action: "Post", effort: 2 },
};

const PLATFORM_KEYS = Object.keys(PLATFORM_MAP);

export function buildMarketplaceCampaigns(data: SeedData): MarketplaceCampaign[] {
  const businesses = (data.businesses ?? []).slice(0, 8); // Show first 8 businesses
  const campaigns: MarketplaceCampaign[] = [];

  businesses.forEach((biz, idx) => {
    // Each business gets 1-2 campaigns
    const pk1 = PLATFORM_KEYS[idx % PLATFORM_KEYS.length];
    const p1 = PLATFORM_MAP[pk1];
    campaigns.push({
      id: `mkt-${biz.id}-1`,
      businessId: biz.id,
      businessName: biz.name,
      businessType: biz.type,
      businessAvatar: biz.avatar,
      campaignName: `${p1.action} for ${biz.name}`,
      description: `Share your experience at ${biz.name} with a ${p1.name} ${p1.action.toLowerCase()}.`,
      perkValue: 15 + (idx % 3) * 5,
      perkType: "pct",
      platform: p1.name,
      platformIcon: p1.icon,
      actionId: p1.actionId,
      actionsRequired: [p1.action],
      effortLevel: p1.effort,
    });
    if (idx < 5) {
      const pk2 = PLATFORM_KEYS[(idx + 3) % PLATFORM_KEYS.length];
      const p2 = PLATFORM_MAP[pk2];
      campaigns.push({
        id: `mkt-${biz.id}-2`,
        businessId: biz.id,
        businessName: biz.name,
        businessType: biz.type,
        businessAvatar: biz.avatar,
        campaignName: `${p2.action} Campaign — ${biz.name}`,
        description: `Leave a ${p2.action.toLowerCase()} on ${p2.name} about your visit to ${biz.name}.`,
        perkValue: 10 + (idx % 4) * 5,
        perkType: idx % 2 === 0 ? "pct" : "dol",
        platform: p2.name,
        platformIcon: p2.icon,
        actionId: p2.actionId,
        actionsRequired: [p2.action],
        effortLevel: p2.effort,
      });
    }
  });

  return campaigns;
}
