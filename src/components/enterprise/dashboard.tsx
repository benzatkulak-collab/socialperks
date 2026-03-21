"use client";

import { useState, useMemo } from "react";
import { formatNumber, formatCurrency } from "@/lib/shared/formatters";

// ═══════════════ Types ═══════════════

export interface LocationSummary {
  id: string;
  name: string;
  address: string;
  activeCampaigns: number;
  completions: number;
  reviews: number;
  marketingValue: number;
  complianceScore: number;
}

export interface EnterpriseData {
  id: string;
  companyName: string;
  plan: "starter" | "professional" | "enterprise";
  avatar: string;
  locations: LocationSummary[];
  totalCampaigns: number;
  totalCompletions: number;
  totalReviews: number;
  totalMarketingValue: number;
  brandComplianceScore: number;
}

interface EnterpriseDashboardProps {
  enterprise: EnterpriseData;
  onNavigate?: (section: string) => void;
}

// ═══════════════ Helpers ═══════════════

const PLAN_STYLES: Record<string, { label: string; className: string }> = {
  starter: { label: "Starter", className: "bg-brand-muted/10 text-brand-muted border-brand-muted/30" },
  professional: { label: "Professional", className: "bg-brand-cyan/10 text-brand-cyan border-brand-cyan/30" },
  enterprise: { label: "Enterprise", className: "bg-brand-purple/10 text-brand-purple border-brand-purple/30" },
};

function getComplianceColor(score: number): string {
  if (score >= 90) return "text-brand-green";
  if (score >= 70) return "text-brand-amber";
  return "text-brand-red";
}

function getComplianceBg(score: number): string {
  if (score >= 90) return "bg-brand-green";
  if (score >= 70) return "bg-brand-amber";
  return "bg-brand-red";
}

// ═══════════════ Component ═══════════════

export default function EnterpriseDashboard({ enterprise, onNavigate }: EnterpriseDashboardProps) {
  const [leaderboardSort, setLeaderboardSort] = useState<"value" | "completions" | "compliance">("value");

  const planStyle = PLAN_STYLES[enterprise.plan];

  const sortedLocations = useMemo(() => {
    const locs = [...enterprise.locations];
    switch (leaderboardSort) {
      case "value":
        return locs.sort((a, b) => b.marketingValue - a.marketingValue);
      case "completions":
        return locs.sort((a, b) => b.completions - a.completions);
      case "compliance":
        return locs.sort((a, b) => b.complianceScore - a.complianceScore);
      default:
        return locs;
    }
  }, [enterprise.locations, leaderboardSort]);

  const topLocations = sortedLocations.slice(0, 5);
  const bottomLocations = [...enterprise.locations]
    .sort((a, b) => a.marketingValue - b.marketingValue)
    .slice(0, 3);

  return (
    <div className="min-h-screen bg-brand-bg font-body">
      {/* Header */}
      <header className="border-b border-brand-border bg-brand-surface">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div
                className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand-elevated text-2xl"
                aria-hidden="true"
              >
                {enterprise.avatar}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="font-heading text-2xl italic text-brand-white">
                    {enterprise.companyName}
                  </h1>
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 font-mono text-xs font-medium ${planStyle.className}`}
                    role="status"
                    aria-label={`Plan: ${planStyle.label}`}
                  >
                    {planStyle.label}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-brand-muted">
                  {enterprise.locations.length} location{enterprise.locations.length !== 1 ? "s" : ""} &middot; Enterprise Dashboard
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Aggregate Stats */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4" role="region" aria-label="Enterprise statistics">
          <StatCard
            label="Total Campaigns"
            value={formatNumber(enterprise.totalCampaigns)}
            subtext={`Across ${enterprise.locations.length} locations`}
            borderColor="border-l-brand-cyan"
            textColor="text-brand-cyan"
          />
          <StatCard
            label="Total Completions"
            value={formatNumber(enterprise.totalCompletions)}
            subtext="All-time completions"
            borderColor="border-l-brand-green"
            textColor="text-brand-green"
          />
          <StatCard
            label="Total Reviews"
            value={formatNumber(enterprise.totalReviews)}
            subtext="Google, Yelp, TripAdvisor"
            borderColor="border-l-brand-amber"
            textColor="text-brand-amber"
          />
          <StatCard
            label="Marketing Value"
            value={formatCurrency(enterprise.totalMarketingValue)}
            subtext="Estimated marketing value"
            borderColor="border-l-brand-pink"
            textColor="text-brand-pink"
          />
        </div>

        {/* Brand Compliance Score */}
        <div className="mt-6 rounded-xl border border-brand-border bg-brand-surface p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-heading text-xl italic text-brand-white">Brand Compliance Score</h2>
              <p className="mt-1 text-sm text-brand-muted">
                Overall brand consistency across all locations
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className={`font-mono text-4xl font-bold ${getComplianceColor(enterprise.brandComplianceScore)}`}>
                {enterprise.brandComplianceScore}%
              </div>
              <div className="h-12 w-12">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90" aria-hidden="true">
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    className="stroke-brand-elevated"
                    strokeWidth="3"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    className={`${getComplianceBg(enterprise.brandComplianceScore).replace("bg-", "stroke-")}`}
                    strokeWidth="3"
                    strokeDasharray={`${enterprise.brandComplianceScore}, 100`}
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Location Leaderboard - 2 cols */}
          <div className="rounded-xl border border-brand-border bg-brand-surface p-6 lg:col-span-2">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-heading text-xl italic text-brand-white">Location Leaderboard</h2>
              <div className="flex gap-2" role="group" aria-label="Sort leaderboard">
                {([
                  { id: "value" as const, label: "Value" },
                  { id: "completions" as const, label: "Completions" },
                  { id: "compliance" as const, label: "Compliance" },
                ]).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLeaderboardSort(opt.id)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                      leaderboardSort === opt.id
                        ? "bg-brand-cyan/10 text-brand-cyan"
                        : "bg-brand-elevated text-brand-muted hover:text-brand-text"
                    }`}
                    aria-pressed={leaderboardSort === opt.id}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Top Performers */}
            <h3 className="mb-3 mt-5 text-xs font-medium uppercase tracking-wider text-brand-green">
              Top Performing
            </h3>
            <div className="space-y-2">
              {topLocations.map((loc, i) => (
                <LocationRow key={loc.id} location={loc} rank={i + 1} sortBy={leaderboardSort} />
              ))}
            </div>

            {/* Bottom Performers */}
            {bottomLocations.length > 0 && enterprise.locations.length > 5 && (
              <>
                <h3 className="mb-3 mt-6 text-xs font-medium uppercase tracking-wider text-brand-amber">
                  Needs Attention
                </h3>
                <div className="space-y-2">
                  {bottomLocations.map((loc) => (
                    <LocationRow key={loc.id} location={loc} rank={null} sortBy={leaderboardSort} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Quick Actions - 1 col */}
          <div className="space-y-6">
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
              <h2 className="font-heading text-xl italic text-brand-white">Quick Actions</h2>
              <div className="mt-4 space-y-3">
                <QuickAction
                  icon="📍"
                  label="Add Location"
                  description="Register a new business location"
                  accentClass="hover:border-brand-cyan/40"
                  onClick={() => onNavigate?.("locations")}
                />
                <QuickAction
                  icon="📢"
                  label="Company-Wide Campaign"
                  description="Launch a campaign across all locations"
                  accentClass="hover:border-brand-green/40"
                  onClick={() => onNavigate?.("campaigns")}
                />
                <QuickAction
                  icon="📊"
                  label="View Reports"
                  description="Analytics and performance data"
                  accentClass="hover:border-brand-purple/40"
                  onClick={() => onNavigate?.("reports")}
                />
                <QuickAction
                  icon="🛡️"
                  label="Brand Guidelines"
                  description="Manage brand compliance rules"
                  accentClass="hover:border-brand-amber/40"
                  onClick={() => onNavigate?.("brand")}
                />
                <QuickAction
                  icon="🔑"
                  label="API Console"
                  description="Manage API keys and integrations"
                  accentClass="hover:border-brand-pink/40"
                  onClick={() => onNavigate?.("api")}
                />
              </div>
            </div>

            {/* Location Summary */}
            <div className="rounded-xl border border-brand-border bg-brand-surface p-6">
              <h3 className="text-sm font-medium uppercase tracking-wider text-brand-muted">Location Overview</h3>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-dim">Total Locations</span>
                  <span className="font-mono text-sm font-semibold text-brand-white">
                    {enterprise.locations.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-dim">Avg Campaigns/Location</span>
                  <span className="font-mono text-sm font-semibold text-brand-cyan">
                    {enterprise.locations.length > 0
                      ? (enterprise.totalCampaigns / enterprise.locations.length).toFixed(1)
                      : "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-dim">Avg Completions/Location</span>
                  <span className="font-mono text-sm font-semibold text-brand-green">
                    {enterprise.locations.length > 0
                      ? Math.round(enterprise.totalCompletions / enterprise.locations.length)
                      : "0"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-brand-dim">Avg Compliance</span>
                  <span className={`font-mono text-sm font-semibold ${getComplianceColor(enterprise.brandComplianceScore)}`}>
                    {enterprise.brandComplianceScore}%
                  </span>
                </div>
              </div>
            </div>
          </div>
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
  borderColor,
  textColor,
}: {
  label: string;
  value: string;
  subtext: string;
  borderColor: string;
  textColor: string;
}) {
  return (
    <div className={`rounded-xl border border-brand-border border-l-2 bg-brand-surface p-4 ${borderColor}`}>
      <p className="text-xs font-medium uppercase tracking-wider text-brand-muted">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-semibold ${textColor}`}>{value}</p>
      <p className="mt-1 text-xs text-brand-dim">{subtext}</p>
    </div>
  );
}

function LocationRow({
  location,
  rank,
  sortBy,
}: {
  location: LocationSummary;
  rank: number | null;
  sortBy: "value" | "completions" | "compliance";
}) {
  const displayValue = sortBy === "value"
    ? formatCurrency(location.marketingValue)
    : sortBy === "completions"
      ? formatNumber(location.completions)
      : `${location.complianceScore}%`;

  const valueColor = sortBy === "compliance"
    ? getComplianceColor(location.complianceScore)
    : "text-brand-cyan";

  return (
    <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-bg px-4 py-3 transition-colors hover:border-brand-subtle">
      {rank !== null && (
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-elevated font-mono text-xs font-semibold text-brand-muted">
          {rank}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-brand-text">{location.name}</p>
        <p className="truncate text-xs text-brand-muted">{location.address}</p>
      </div>
      <div className="flex shrink-0 items-center gap-4">
        <div className="hidden text-right sm:block">
          <p className="text-xs text-brand-muted">{location.activeCampaigns} campaigns</p>
        </div>
        <p className={`font-mono text-sm font-semibold ${valueColor}`}>
          {displayValue}
        </p>
      </div>
    </div>
  );
}

function QuickAction({
  icon,
  label,
  description,
  accentClass,
  onClick,
}: {
  icon: string;
  label: string;
  description: string;
  accentClass: string;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full rounded-lg border border-brand-border bg-brand-bg p-3 text-left transition-all ${accentClass}`}
      aria-label={label}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg" aria-hidden="true">{icon}</span>
        <div>
          <p className="text-sm font-medium text-brand-text">{label}</p>
          <p className="text-xs text-brand-muted">{description}</p>
        </div>
      </div>
    </button>
  );
}
