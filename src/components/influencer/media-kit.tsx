"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { formatNumber, formatCurrency } from "@/lib/shared/formatters";

// ═══════════════ Types ═══════════════

export interface PlatformStat {
  platformId: string;
  platformName: string;
  platformIcon: string;
  handle: string;
  followers: number;
  engagementRate: number;
  verified: boolean;
}

export interface PortfolioItem {
  id: string;
  title: string;
  url: string;
  platform: string;
  platformIcon: string;
  description: string;
  metrics?: {
    views?: number;
    likes?: number;
    comments?: number;
  };
}

export interface MediaKitInfluencer {
  id: string;
  displayName: string;
  avatar: string;
  bio: string;
  location: string;
  niches: string[];
  tier: { label: string; color: string };
  joinedAt: string;
}

export interface MediaKitStats {
  totalFollowers: number;
  avgEngagementRate: number;
  completedCampaigns: number;
  totalEarned: number;
  avgCompletionRate: number;
}

export interface RateCardEntry {
  type: string;
  label: string;
  rate: number;
}

interface MediaKitProps {
  influencer: MediaKitInfluencer;
  portfolio: PortfolioItem[];
  stats: MediaKitStats;
  platforms: PlatformStat[];
  rateCard: RateCardEntry[];
}

// ═══════════════ Helpers ═══════════════

const TIER_STYLES: Record<string, string> = {
  Micro: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30",
  Mid: "bg-brand-purple/10 text-brand-purple border-brand-purple/30",
  Macro: "bg-brand-amber/10 text-brand-amber border-brand-amber/30",
  Mega: "bg-brand-pink/10 text-brand-pink border-brand-pink/30",
};

// ═══════════════ Component ═══════════════

export default function MediaKit({ influencer, portfolio, stats, platforms, rateCard }: MediaKitProps) {
  const [linkCopied, setLinkCopied] = useState(false);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const handleShareLink = useCallback(() => {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/influencer/${influencer.id}/media-kit`;
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl).then(() => {
        setLinkCopied(true);
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        copyTimerRef.current = setTimeout(() => setLinkCopied(false), 2000);
      });
    }
  }, [influencer.id]);

  const tierStyle = TIER_STYLES[influencer.tier.label] || TIER_STYLES["Micro"];

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Share Bar */}
        <div className="mb-6 flex items-center justify-between rounded-xl border border-brand-border bg-brand-surface px-4 py-3">
          <p className="text-sm text-brand-muted">
            Auto-generated media kit &middot; Share with businesses
          </p>
          <button
            type="button"
            onClick={handleShareLink}
            className={`rounded-lg px-4 py-1.5 text-sm font-semibold transition-all ${
              linkCopied
                ? "bg-brand-green/10 text-brand-green"
                : "bg-brand-cyan text-brand-bg hover:opacity-90"
            }`}
            aria-label="Copy media kit share link"
          >
            {linkCopied ? "Link Copied!" : "Share Media Kit"}
          </button>
        </div>

        {/* ══════════ Media Kit Card ══════════ */}
        <div className="overflow-hidden rounded-2xl border border-brand-border bg-brand-surface">
          {/* Hero Header */}
          <div className="relative overflow-hidden px-8 pb-8 pt-10">
            {/* Gradient Background */}
            <div className="gradient-mesh absolute inset-0 opacity-50" aria-hidden="true" />
            <div className="relative">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                <div
                  className="flex h-24 w-24 shrink-0 items-center justify-center rounded-2xl bg-brand-elevated text-5xl ring-2 ring-brand-border"
                  aria-hidden="true"
                >
                  {influencer.avatar}
                </div>
                <div className="text-center sm:text-left">
                  <div className="flex flex-col items-center gap-2 sm:flex-row">
                    <h1 className="font-heading text-3xl italic text-brand-white">
                      {influencer.displayName}
                    </h1>
                    <span
                      className={`inline-flex items-center rounded-full border px-3 py-0.5 font-mono text-xs font-medium ${tierStyle}`}
                      role="status"
                    >
                      {influencer.tier.label} Creator
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-brand-dim">{influencer.location}</p>
                  <p className="mt-3 max-w-lg text-sm leading-relaxed text-brand-text">
                    {influencer.bio}
                  </p>
                  {/* Niches */}
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {influencer.niches.map((niche) => (
                      <span
                        key={niche}
                        className="rounded-full bg-brand-white/5 px-2.5 py-0.5 text-xs font-medium text-brand-text"
                      >
                        {niche}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Key Stats */}
          <div className="border-t border-brand-border">
            <div className="grid grid-cols-2 divide-x divide-brand-border sm:grid-cols-5" role="region" aria-label="Key statistics">
              <StatBlock label="Followers" value={formatNumber(stats.totalFollowers)} color="text-brand-cyan" />
              <StatBlock label="Engagement" value={`${stats.avgEngagementRate}%`} color="text-brand-green" />
              <StatBlock label="Campaigns" value={String(stats.completedCampaigns)} color="text-brand-purple" />
              <StatBlock label="Total Earned" value={formatCurrency(stats.totalEarned)} color="text-brand-amber" />
              <div className="col-span-2 sm:col-span-1">
                <StatBlock label="Completion" value={`${stats.avgCompletionRate}%`} color="text-brand-pink" />
              </div>
            </div>
          </div>

          {/* Platform Breakdown */}
          <div className="border-t border-brand-border p-6 sm:p-8">
            <h2 className="font-heading text-xl italic text-brand-white">Platforms</h2>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {platforms.map((platform) => (
                <div
                  key={platform.platformId}
                  className="flex items-center justify-between rounded-xl border border-brand-border bg-brand-bg p-4"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{platform.platformIcon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-brand-text">{platform.platformName}</p>
                        {platform.verified && (
                          <span className="rounded-full bg-brand-green/10 px-1.5 py-0.5 text-[10px] font-medium text-brand-green">
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="font-mono text-xs text-brand-muted">@{platform.handle}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-lg font-semibold text-brand-cyan">
                      {formatNumber(platform.followers)}
                    </p>
                    <p className="text-xs text-brand-muted">{platform.engagementRate}% eng.</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Rate Card */}
          <div className="border-t border-brand-border p-6 sm:p-8">
            <h2 className="font-heading text-xl italic text-brand-white">Rate Card</h2>
            <p className="mt-1 text-sm text-brand-muted">Base rates per action type</p>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {rateCard.map((entry) => (
                <div
                  key={entry.type}
                  className="rounded-xl border border-brand-border bg-brand-bg p-4 text-center"
                >
                  <p className="font-mono text-2xl font-semibold text-brand-green">
                    ${entry.rate}
                  </p>
                  <p className="mt-1 text-xs font-medium text-brand-text">{entry.label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Best Performing Content */}
          {portfolio.length > 0 && (
            <div className="border-t border-brand-border p-6 sm:p-8">
              <h2 className="font-heading text-xl italic text-brand-white">Best Content</h2>
              <p className="mt-1 text-sm text-brand-muted">Top performing content pieces</p>
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                {portfolio.map((item) => (
                  <article
                    key={item.id}
                    className="card-hover rounded-xl border border-brand-border bg-brand-bg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span aria-hidden="true">{item.platformIcon}</span>
                          <h3 className="text-sm font-medium text-brand-text">{item.title}</h3>
                        </div>
                        <p className="mt-1 text-xs text-brand-muted">{item.platform}</p>
                        <p className="mt-2 text-xs text-brand-dim">{item.description}</p>
                      </div>
                    </div>
                    {item.metrics && (
                      <div className="mt-3 flex gap-4 border-t border-brand-border pt-3">
                        {item.metrics.views !== undefined && (
                          <div className="text-center">
                            <p className="font-mono text-sm font-semibold text-brand-cyan">
                              {formatNumber(item.metrics.views)}
                            </p>
                            <p className="text-[10px] text-brand-muted">views</p>
                          </div>
                        )}
                        {item.metrics.likes !== undefined && (
                          <div className="text-center">
                            <p className="font-mono text-sm font-semibold text-brand-pink">
                              {formatNumber(item.metrics.likes)}
                            </p>
                            <p className="text-[10px] text-brand-muted">likes</p>
                          </div>
                        )}
                        {item.metrics.comments !== undefined && (
                          <div className="text-center">
                            <p className="font-mono text-sm font-semibold text-brand-purple">
                              {formatNumber(item.metrics.comments)}
                            </p>
                            <p className="text-[10px] text-brand-muted">comments</p>
                          </div>
                        )}
                      </div>
                    )}
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block text-xs font-medium text-brand-cyan transition-colors hover:text-brand-white"
                      aria-label={`View ${item.title} on ${item.platform}`}
                    >
                      View Content &rarr;
                    </a>
                  </article>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t border-brand-border bg-brand-bg/50 px-6 py-4 sm:px-8">
            <div className="flex flex-col items-center justify-between gap-2 sm:flex-row">
              <p className="font-mono text-xs text-brand-subtle">
                Generated by Social Perks &middot; The Marketing Value Protocol
              </p>
              <p className="text-xs text-brand-muted">
                Member since {influencer.joinedAt}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════ Sub-components ═══════════════

function StatBlock({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="px-4 py-5 text-center">
      <p className={`font-mono text-2xl font-semibold ${color}`}>{value}</p>
      <p className="mt-0.5 text-xs font-medium uppercase tracking-wider text-brand-muted">{label}</p>
    </div>
  );
}
