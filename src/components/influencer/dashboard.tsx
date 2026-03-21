"use client";

import { useState } from "react";
import { formatNumber, formatCurrencyPrecise as formatCurrency } from "@/lib/shared/formatters";

// ═══════════════ Types ═══════════════

export interface InfluencerTier {
  label: "Micro" | "Mid" | "Macro" | "Mega";
  color: string;
}

export interface PlatformConnection {
  platformId: string;
  platformName: string;
  platformIcon: string;
  handle: string;
  followers: number;
  verified: boolean;
}

export interface Influencer {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  location: string;
  tier: InfluencerTier;
  niches: string[];
  platforms: PlatformConnection[];
  totalFollowers: number;
  engagementRate: number;
  joinedAt: string;
}

export interface AvailableCampaign {
  id: string;
  businessName: string;
  businessType: string;
  campaignName: string;
  description: string;
  perkValue: number;
  perkType: "pct" | "dol";
  estimatedEarnings: number;
  platform: string;
  platformIcon: string;
  actionsRequired: string[];
  effortLevel: number;
  matchScore: number;
}

export interface EarningEntry {
  id: string;
  campaignName: string;
  businessName: string;
  amount: number;
  status: "paid" | "pending" | "processing";
  date: string;
}

interface InfluencerDashboardProps {
  influencer: Influencer;
  onNavigate?: (page: string) => void;
}

// ═══════════════ Helpers ═══════════════

const TIER_STYLES: Record<string, string> = {
  Micro: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30",
  Mid: "bg-brand-purple/10 text-brand-purple border-brand-purple/30",
  Macro: "bg-brand-amber/10 text-brand-amber border-brand-amber/30",
  Mega: "bg-brand-pink/10 text-brand-pink border-brand-pink/30",
};

const STATUS_STYLES: Record<string, string> = {
  paid: "text-brand-green",
  pending: "text-brand-amber",
  processing: "text-brand-cyan",
};

// ═══════════════ Demo Data ═══════════════

const DEMO_CAMPAIGNS: AvailableCampaign[] = [
  {
    id: "ac1",
    businessName: "Taqueria Sol",
    businessType: "Restaurant",
    campaignName: "TikTok Taste Test",
    description: "Create a genuine reaction video trying our signature dishes.",
    perkValue: 20,
    perkType: "pct",
    estimatedEarnings: 45,
    platform: "TikTok",
    platformIcon: "🎬",
    actionsRequired: ["Review Video"],
    effortLevel: 3,
    matchScore: 94,
  },
  {
    id: "ac2",
    businessName: "Glow Studio",
    businessType: "Salon",
    campaignName: "Before/After Transformation",
    description: "Showcase your before and after transformation experience.",
    perkValue: 25,
    perkType: "pct",
    estimatedEarnings: 62,
    platform: "Instagram",
    platformIcon: "📸",
    actionsRequired: ["Reel", "Carousel"],
    effortLevel: 3,
    matchScore: 88,
  },
  {
    id: "ac3",
    businessName: "Iron Temple",
    businessType: "Gym",
    campaignName: "YouTube Short",
    description: "Create a quick Short about your workout experience.",
    perkValue: 20,
    perkType: "pct",
    estimatedEarnings: 38,
    platform: "YouTube",
    platformIcon: "📺",
    actionsRequired: ["Short"],
    effortLevel: 3,
    matchScore: 76,
  },
];

const DEMO_EARNINGS: EarningEntry[] = [
  { id: "e1", campaignName: "Google Review Drive", businessName: "Baked & Wired", amount: 15, status: "paid", date: "2026-03-17" },
  { id: "e2", campaignName: "Instagram Reel", businessName: "Taqueria Sol", amount: 45, status: "pending", date: "2026-03-18" },
  { id: "e3", campaignName: "TikTok Video", businessName: "Iron Temple", amount: 38, status: "processing", date: "2026-03-19" },
  { id: "e4", campaignName: "Yelp Builder", businessName: "Glow Studio", amount: 12, status: "paid", date: "2026-03-15" },
];

// ═══════════════ Component ═══════════════

export default function InfluencerDashboard({ influencer, onNavigate }: InfluencerDashboardProps) {
  const [activeTab, setActiveTab] = useState<"campaigns" | "earnings" | "performance">("campaigns");
  const [appliedCampaignIds, setAppliedCampaignIds] = useState<Set<string>>(new Set());

  const stats = {
    totalEarnings: 1247.5,
    activeCampaigns: 4,
    completionRate: 92,
    audienceReach: influencer.totalFollowers,
  };

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      {/* Header */}
      <header className="border-b border-brand-border bg-brand-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-elevated text-2xl"
                aria-hidden="true"
              >
                {influencer.avatar}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-heading text-2xl italic text-brand-white">
                    Welcome back, {influencer.displayName}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${TIER_STYLES[influencer.tier.label]}`}
                    role="status"
                    aria-label={`Influencer tier: ${influencer.tier.label}`}
                  >
                    {influencer.tier.label}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-brand-muted">
                  {influencer.location} &middot; {formatNumber(influencer.totalFollowers)} total followers &middot; {influencer.engagementRate}% engagement
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onNavigate?.("profile")}
                className="rounded-lg border border-brand-border bg-brand-elevated px-4 py-2 text-sm font-medium text-brand-text transition-colors hover:border-brand-cyan/40 hover:text-brand-cyan"
              >
                Edit Profile
              </button>
              <button
                type="button"
                onClick={() => onNavigate?.("media-kit")}
                className="rounded-lg bg-brand-cyan px-4 py-2 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              >
                View Media Kit
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="region" aria-label="Dashboard statistics">
          <StatCard
            label="Total Earnings"
            value={formatCurrency(stats.totalEarnings)}
            subtext="+$182 this month"
            accentClass="border-brand-green/40 text-brand-green"
          />
          <StatCard
            label="Active Campaigns"
            value={String(stats.activeCampaigns)}
            subtext="2 pending review"
            accentClass="border-brand-cyan/40 text-brand-cyan"
          />
          <StatCard
            label="Completion Rate"
            value={`${stats.completionRate}%`}
            subtext="Above average"
            accentClass="border-brand-amber/40 text-brand-amber"
          />
          <StatCard
            label="Audience Reach"
            value={formatNumber(stats.audienceReach)}
            subtext="Across all platforms"
            accentClass="border-brand-purple/40 text-brand-purple"
          />
        </div>

        {/* Tabs */}
        <nav className="mt-8 border-b border-brand-border" aria-label="Dashboard sections">
          <div className="flex gap-6">
            {(["campaigns", "earnings", "performance"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`relative pb-3 text-sm font-medium capitalize transition-colors ${
                  activeTab === tab
                    ? "text-brand-cyan"
                    : "text-brand-muted hover:text-brand-text"
                }`}
                aria-selected={activeTab === tab}
                role="tab"
              >
                {tab === "campaigns" ? "Available Campaigns" : tab === "earnings" ? "Recent Earnings" : "Performance"}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-0 h-0.5 w-full rounded-full bg-brand-cyan" />
                )}
              </button>
            ))}
          </div>
        </nav>

        {/* Tab Content */}
        <div className="mt-6" role="tabpanel">
          {activeTab === "campaigns" && (
            <div className="space-y-4">
              {DEMO_CAMPAIGNS.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  isApplied={appliedCampaignIds.has(campaign.id)}
                  onApply={(id) => setAppliedCampaignIds((prev) => { const next = new Set(prev); next.add(id); return next; })}
                />
              ))}
              {DEMO_CAMPAIGNS.length === 0 && (
                <EmptyState message="No campaigns available right now. Check back soon!" />
              )}
            </div>
          )}

          {activeTab === "earnings" && (
            <div className="space-y-3">
              {DEMO_EARNINGS.map((entry) => (
                <EarningRow key={entry.id} entry={entry} />
              ))}
            </div>
          )}

          {activeTab === "performance" && (
            <div className="rounded-xl border border-brand-border bg-brand-surface p-8">
              <h3 className="font-heading text-lg italic text-brand-white">Performance Trend</h3>
              <p className="mt-1 text-sm text-brand-muted">Your earnings and engagement over time</p>
              <div className="mt-6">
                <SimpleBarChart
                  data={[
                    { label: "Jan", value: 85 },
                    { label: "Feb", value: 120 },
                    { label: "Mar", value: 145 },
                    { label: "Apr", value: 198 },
                    { label: "May", value: 262 },
                    { label: "Jun", value: 340 },
                  ]}
                  height={240}
                  barColor="#22D3EE"
                  formatValue={(v) => `$${v}`}
                  ariaLabel="Monthly earnings performance chart from January to June"
                />
              </div>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <MiniStat label="This Month" value="$182.00" change="+24%" positive />
                <MiniStat label="Avg Per Campaign" value="$31.20" change="+8%" positive />
                <MiniStat label="Best Platform" value="TikTok" change="$480 earned" positive />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

// ═══════════════ Sub-components ═══════════════

function StatCard({
  label,
  value,
  subtext,
  accentClass,
}: {
  label: string;
  value: string;
  subtext: string;
  accentClass: string;
}) {
  return (
    <div className={`rounded-xl border-l-2 border-brand-border bg-brand-surface p-4 ${accentClass.split(" ")[0]}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${accentClass.split(" ")[1]}`}>{value}</p>
      <p className="mt-1 text-xs text-brand-dim">{subtext}</p>
    </div>
  );
}

function CampaignCard({ campaign, isApplied, onApply }: { campaign: AvailableCampaign; isApplied: boolean; onApply: (id: string) => void }) {
  return (
    <article className="card-hover rounded-xl border border-brand-border bg-brand-surface p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-lg" aria-hidden="true">{campaign.platformIcon}</span>
            <h3 className="font-heading text-lg italic text-brand-white">{campaign.campaignName}</h3>
            <span className="rounded-full bg-brand-cyan/10 px-2 py-0.5 font-mono text-xs text-brand-cyan">
              {campaign.matchScore}% match
            </span>
          </div>
          <p className="mt-1 text-sm text-brand-muted">
            {campaign.businessName} &middot; {campaign.businessType}
          </p>
          <p className="mt-2 text-sm text-brand-dim">{campaign.description}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {campaign.actionsRequired.map((action) => (
              <span
                key={action}
                className="rounded-md bg-brand-elevated px-2 py-0.5 text-xs text-brand-text"
              >
                {action}
              </span>
            ))}
            <span className="rounded-md bg-brand-elevated px-2 py-0.5 text-xs text-brand-muted">
              Effort: {"●".repeat(campaign.effortLevel)}{"○".repeat(5 - campaign.effortLevel)}
            </span>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <p className="font-mono text-lg font-semibold text-brand-green">
            ~{formatCurrency(campaign.estimatedEarnings)}
          </p>
          <p className="text-xs text-brand-muted">
            {campaign.perkValue}{campaign.perkType === "pct" ? "%" : "$"} perk
          </p>
          {isApplied ? (
            <span className="mt-1 rounded-lg border border-brand-green/30 bg-brand-green/10 px-4 py-1.5 text-sm font-medium text-brand-green">
              Applied
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onApply(campaign.id)}
              className="mt-1 rounded-lg bg-brand-cyan px-4 py-1.5 text-sm font-semibold text-brand-bg transition-opacity hover:opacity-90"
              aria-label={`Apply to ${campaign.campaignName} at ${campaign.businessName}`}
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function EarningRow({ entry }: { entry: EarningEntry }) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-brand-border bg-brand-surface px-4 py-3">
      <div>
        <p className="text-sm font-medium text-brand-text">{entry.campaignName}</p>
        <p className="text-xs text-brand-muted">{entry.businessName} &middot; {entry.date}</p>
      </div>
      <div className="text-right">
        <p className="font-mono text-sm font-semibold text-brand-green">{formatCurrency(entry.amount)}</p>
        <p className={`text-xs font-medium capitalize ${STATUS_STYLES[entry.status]}`}>
          {entry.status}
        </p>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  change,
  positive,
}: {
  label: string;
  value: string;
  change: string;
  positive: boolean;
}) {
  return (
    <div className="rounded-lg border border-brand-border bg-brand-bg/50 p-4">
      <p className="text-xs text-brand-muted">{label}</p>
      <p className="mt-1 font-mono text-lg font-semibold text-brand-white">{value}</p>
      <p className={`mt-0.5 text-xs ${positive ? "text-brand-green" : "text-brand-red"}`}>{change}</p>
    </div>
  );
}

function SimpleBarChart({
  data,
  height = 200,
  barColor = "#22D3EE",
  formatValue = (v: number) => String(v),
  ariaLabel = "Bar chart",
}: {
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  formatValue?: (v: number) => string;
  ariaLabel?: string;
}) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const padding = { top: 20, right: 10, bottom: 32, left: 50 };
  const chartHeight = height - padding.top - padding.bottom;
  const barWidth = Math.min(40, (100 / data.length) * 0.6);
  const gap = 100 / data.length;

  // Y-axis ticks
  const ticks = 4;
  const yTicks = Array.from({ length: ticks + 1 }, (_, i) =>
    Math.round((maxValue / ticks) * i)
  );

  return (
    <div role="img" aria-label={ariaLabel} className="w-full">
      <svg
        viewBox={`0 0 500 ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Y-axis grid lines and labels */}
        {yTicks.map((tick) => {
          const y = padding.top + chartHeight - (tick / maxValue) * chartHeight;
          return (
            <g key={tick}>
              <line
                x1={padding.left}
                y1={y}
                x2={500 - padding.right}
                y2={y}
                stroke="rgba(255,255,255,0.06)"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                fill="rgba(255,255,255,0.35)"
                fontSize="11"
                fontFamily="monospace"
              >
                {formatValue(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {data.map((d, i) => {
          const barHeight = (d.value / maxValue) * chartHeight;
          const x = padding.left + gap * (i + 0.5) * ((500 - padding.left - padding.right) / 100) - barWidth / 2;
          const y = padding.top + chartHeight - barHeight;
          return (
            <g key={d.label}>
              <rect
                x={x}
                y={y}
                width={barWidth}
                height={barHeight}
                fill={barColor}
                rx="3"
                opacity="0.85"
              />
              {/* Value on top */}
              <text
                x={x + barWidth / 2}
                y={y - 6}
                textAnchor="middle"
                fill="rgba(255,255,255,0.6)"
                fontSize="10"
                fontFamily="monospace"
              >
                {formatValue(d.value)}
              </text>
              {/* Label below */}
              <text
                x={x + barWidth / 2}
                y={height - 8}
                textAnchor="middle"
                fill="rgba(255,255,255,0.45)"
                fontSize="11"
                fontFamily="sans-serif"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex h-40 items-center justify-center rounded-xl border border-dashed border-brand-border bg-brand-surface">
      <p className="text-sm text-brand-muted">{message}</p>
    </div>
  );
}
