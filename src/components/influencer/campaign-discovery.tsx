"use client";

import { useState, useMemo, useCallback } from "react";

// ═══════════════ Types ═══════════════

export interface DiscoveryCampaign {
  id: string;
  businessName: string;
  businessType: string;
  businessAvatar: string;
  campaignName: string;
  description: string;
  perkValue: number;
  perkType: "pct" | "dol";
  estimatedEarnings: number;
  platform: string;
  platformIcon: string;
  actionsRequired: { id: string; label: string; type: string; effort: number }[];
  effortLevel: number;
  tier: "essential" | "high_impact" | "growth" | "premium" | "starter";
  location: string;
  matchScore: number;
  spotsLeft: number;
  expiresIn: string;
}

export interface InfluencerProfile {
  id: string;
  displayName: string;
  niches: string[];
  platforms: { platformId: string; platformName: string }[];
  totalFollowers: number;
  location: string;
}

interface CampaignDiscoveryProps {
  campaigns: DiscoveryCampaign[];
  influencer: InfluencerProfile;
}

// ═══════════════ Constants ═══════════════

const BUSINESS_TYPES = [
  "All", "Restaurant", "Salon", "Gym", "Coffee Shop", "Yoga Studio",
  "Tattoo Parlor", "Florist", "Veterinarian", "Law Firm", "Auto Mechanic",
];

const PLATFORM_FILTERS = [
  { id: "all", label: "All Platforms", icon: "🌐" },
  { id: "ig", label: "Instagram", icon: "📸" },
  { id: "tt", label: "TikTok", icon: "🎬" },
  { id: "yt", label: "YouTube", icon: "📺" },
  { id: "go", label: "Google", icon: "⭐" },
  { id: "fb", label: "Facebook", icon: "👍" },
  { id: "xw", label: "X", icon: "✍️" },
];

const EFFORT_LEVELS = [
  { value: 0, label: "Any Effort" },
  { value: 1, label: "Low (1-2)" },
  { value: 3, label: "Medium (3)" },
  { value: 4, label: "High (4-5)" },
];

const TIER_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  essential: { bg: "bg-brand-green/10", text: "text-brand-green", label: "Essential" },
  high_impact: { bg: "bg-brand-orange/10", text: "text-brand-orange", label: "High Impact" },
  growth: { bg: "bg-brand-cyan/10", text: "text-brand-cyan", label: "Growth" },
  premium: { bg: "bg-brand-pink/10", text: "text-brand-pink", label: "Premium" },
  starter: { bg: "bg-brand-muted/10", text: "text-brand-muted", label: "Starter" },
};

const SORT_OPTIONS = [
  { value: "match", label: "Best Match" },
  { value: "earnings", label: "Highest Earnings" },
  { value: "effort-low", label: "Lowest Effort" },
  { value: "expiring", label: "Expiring Soon" },
];

// ═══════════════ Component ═══════════════

export default function CampaignDiscovery({ campaigns, influencer: _influencer }: CampaignDiscoveryProps) {
  const [search, setSearch] = useState("");
  const [businessTypeFilter, setBusinessTypeFilter] = useState("All");
  const [platformFilter, setPlatformFilter] = useState("all");
  const [effortFilter, setEffortFilter] = useState(0);
  const [minEarnings, setMinEarnings] = useState(0);
  const [sortBy, setSortBy] = useState("match");
  const [appliedCampaigns, setAppliedCampaigns] = useState<Set<string>>(new Set());

  const filteredCampaigns = useMemo(() => {
    let result = [...campaigns];

    // Search
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (c) =>
          c.campaignName.toLowerCase().includes(q) ||
          c.businessName.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }

    // Business type
    if (businessTypeFilter !== "All") {
      result = result.filter((c) => c.businessType === businessTypeFilter);
    }

    // Platform
    if (platformFilter !== "all") {
      result = result.filter((c) =>
        c.actionsRequired.some((a) => a.id.startsWith(platformFilter))
      );
    }

    // Effort
    if (effortFilter === 1) {
      result = result.filter((c) => c.effortLevel <= 2);
    } else if (effortFilter === 3) {
      result = result.filter((c) => c.effortLevel === 3);
    } else if (effortFilter === 4) {
      result = result.filter((c) => c.effortLevel >= 4);
    }

    // Min earnings
    if (minEarnings > 0) {
      result = result.filter((c) => c.estimatedEarnings >= minEarnings);
    }

    // Sort
    switch (sortBy) {
      case "match":
        result.sort((a, b) => b.matchScore - a.matchScore);
        break;
      case "earnings":
        result.sort((a, b) => b.estimatedEarnings - a.estimatedEarnings);
        break;
      case "effort-low":
        result.sort((a, b) => a.effortLevel - b.effortLevel);
        break;
      case "expiring":
        // Sort by spots left ascending as a proxy for urgency
        result.sort((a, b) => a.spotsLeft - b.spotsLeft);
        break;
    }

    return result;
  }, [campaigns, search, businessTypeFilter, platformFilter, effortFilter, minEarnings, sortBy]);

  const handleApply = useCallback((campaignId: string) => {
    setAppliedCampaigns((prev) => {
      const next = new Set(prev);
      next.add(campaignId);
      return next;
    });
  }, []);

  const getMatchColor = (score: number): string => {
    if (score >= 90) return "text-brand-green";
    if (score >= 70) return "text-brand-cyan";
    if (score >= 50) return "text-brand-amber";
    return "text-brand-muted";
  };

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div>
          <h1 className="font-heading text-3xl italic text-brand-white">Discover Campaigns</h1>
          <p className="mt-1 text-sm text-brand-muted">
            Browse campaigns matched to your profile &middot; {filteredCampaigns.length} campaigns available
          </p>
        </div>

        {/* Filters */}
        <div
          className="mt-6 rounded-xl border border-brand-border bg-brand-surface p-4"
          role="search"
          aria-label="Campaign filters"
        >
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-brand-border bg-brand-bg py-2.5 pl-10 pr-4 text-sm text-brand-text placeholder-brand-subtle focus:border-brand-cyan focus:outline-none focus:ring-1 focus:ring-brand-cyan"
              placeholder="Search campaigns, businesses, descriptions..."
              aria-label="Search campaigns"
            />
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-brand-subtle" aria-hidden="true">
              &#x1F50D;
            </span>
          </div>

          {/* Filter Row */}
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <select
              value={businessTypeFilter}
              onChange={(e) => setBusinessTypeFilter(e.target.value)}
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="Filter by business type"
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>

            <select
              value={platformFilter}
              onChange={(e) => setPlatformFilter(e.target.value)}
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="Filter by platform"
            >
              {PLATFORM_FILTERS.map((p) => (
                <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
              ))}
            </select>

            <select
              value={effortFilter}
              onChange={(e) => setEffortFilter(Number(e.target.value))}
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="Filter by effort level"
            >
              {EFFORT_LEVELS.map((e) => (
                <option key={e.value} value={e.value}>{e.label}</option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <span className="text-xs text-brand-muted">Min $</span>
              <input
                type="number"
                value={minEarnings || ""}
                onChange={(e) => setMinEarnings(Number(e.target.value))}
                min={0}
                className="w-full rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
                placeholder="0"
                aria-label="Minimum estimated earnings"
              />
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="Sort campaigns"
            >
              {SORT_OPTIONS.map((s) => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => {
                setSearch("");
                setBusinessTypeFilter("All");
                setPlatformFilter("all");
                setEffortFilter(0);
                setMinEarnings(0);
                setSortBy("match");
              }}
              className="rounded-lg border border-brand-border bg-brand-bg px-3 py-2 text-sm text-brand-muted transition-colors hover:text-brand-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
            >
              Clear Filters
            </button>
          </div>
        </div>

        {/* Campaign Grid */}
        <div className="mt-6 space-y-4" role="list" aria-label="Available campaigns">
          {filteredCampaigns.length === 0 && (
            <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
              <div className="text-center">
                <p className="text-sm text-brand-muted">No campaigns match your filters.</p>
                <p className="mt-1 text-xs text-brand-subtle">Try adjusting your search or filter criteria.</p>
              </div>
            </div>
          )}

          {filteredCampaigns.map((campaign) => {
            const tierStyle = TIER_STYLES[campaign.tier];
            const isApplied = appliedCampaigns.has(campaign.id);

            return (
              <article
                key={campaign.id}
                className="card-hover rounded-xl border border-brand-border bg-brand-surface"
                role="listitem"
              >
                <div className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    {/* Left: Campaign Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg" aria-hidden="true">{campaign.businessAvatar}</span>
                        <h3 className="font-heading text-lg italic text-brand-white">
                          {campaign.campaignName}
                        </h3>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${tierStyle.bg} ${tierStyle.text}`}>
                          {tierStyle.label}
                        </span>
                        <span className={`font-mono text-xs font-semibold ${getMatchColor(campaign.matchScore)}`}>
                          {campaign.matchScore}% match
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-brand-muted">
                        {campaign.businessName} &middot; {campaign.businessType} &middot; {campaign.location}
                      </p>
                      <p className="mt-2 text-sm text-brand-dim">{campaign.description}</p>

                      {/* Actions */}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {campaign.actionsRequired.map((action) => (
                          <span
                            key={action.id}
                            className="flex items-center gap-1 rounded-md bg-brand-elevated px-2.5 py-1 text-xs text-brand-text"
                          >
                            <span className="font-medium">{action.label}</span>
                            <span className="text-brand-subtle">
                              E:{action.effort}
                            </span>
                          </span>
                        ))}
                      </div>

                      {/* Meta Row */}
                      <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-brand-muted">
                        <span className="flex items-center gap-1">
                          <span aria-hidden="true">{campaign.platformIcon}</span>
                          {campaign.platform}
                        </span>
                        <span>
                          Effort: {"●".repeat(campaign.effortLevel)}{"○".repeat(5 - campaign.effortLevel)}
                        </span>
                        <span>{campaign.spotsLeft} spots left</span>
                        <span>Expires {campaign.expiresIn}</span>
                      </div>
                    </div>

                    {/* Right: Earnings + Apply */}
                    <div className="flex shrink-0 flex-col items-end gap-2 lg:min-w-[140px]">
                      <p className="font-mono text-xl font-semibold text-brand-green">
                        ~${campaign.estimatedEarnings}
                      </p>
                      <p className="text-xs text-brand-muted">
                        {campaign.perkValue}{campaign.perkType === "pct" ? "%" : "$"} perk value
                      </p>

                      {/* Match Score Bar */}
                      <div className="mt-1 w-full" aria-label={`Match score: ${campaign.matchScore}%`}>
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-elevated">
                          <div
                            className={`h-full rounded-full transition-all ${
                              campaign.matchScore >= 90
                                ? "bg-brand-green"
                                : campaign.matchScore >= 70
                                  ? "bg-brand-cyan"
                                  : campaign.matchScore >= 50
                                    ? "bg-brand-amber"
                                    : "bg-brand-subtle"
                            }`}
                            style={{ width: `${campaign.matchScore}%` }}
                          />
                        </div>
                      </div>

                      {isApplied ? (
                        <span className="mt-1 rounded-lg border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green">
                          Applied
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleApply(campaign.id)}
                          className="mt-1 rounded-lg bg-brand-cyan px-5 py-1.5 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
                          aria-label={`Apply to ${campaign.campaignName} at ${campaign.businessName}`}
                        >
                          Apply Now
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
