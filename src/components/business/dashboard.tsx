"use client";

import { useMemo } from "react";
import type { LaunchedCampaign } from "@/lib/types";
import { formatCurrency } from "@/lib/shared/formatters";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BusinessInfo {
  id: string;
  name: string;
  type: string;
  size: string;
  avatar: string;
}

interface DashboardStats {
  activeCampaigns: number;
  completions: number;
  reviews: number;
  marketingValue: number;
}

interface DashboardProps {
  business: BusinessInfo;
  campaigns: LaunchedCampaign[];
  stats: DashboardStats;
  onNavigate?: (page: string) => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const TIPS: Record<string, string> = {
  "Yoga Studio":
    "Start with a Google Review campaign — yoga students love sharing their experience, and reviews build trust with newcomers.",
  Restaurant:
    "Start with a Google Review campaign — it's the highest-ROI action for restaurants. Most diners will leave a review for a small perk.",
  Salon:
    "Instagram before/after campaigns work incredibly well for salons. Customers love showing off their new look.",
  Gym:
    "Transformation content is your superpower. Before/after campaigns drive the most sign-ups for fitness businesses.",
  "Coffee Shop":
    "Start simple — a Google Review campaign paired with an Instagram Story tag gets the flywheel spinning fast.",
  "Tattoo Parlor":
    "Your customers are already showing off their ink. Give them a perk for tagging you in their posts.",
  Veterinarian:
    "Pet content performs incredibly well on social. A 'post your pet' campaign is an easy win.",
  Florist:
    "Visual platforms like Instagram and Pinterest are your best bet. Flower arrangements are inherently shareable.",
  "Law Firm":
    "Google Reviews and LinkedIn posts build professional credibility. Focus on reviews from satisfied clients.",
  "Auto Mechanic":
    "Nextdoor recommendations and Google Reviews are gold for local service businesses. Start there.",
};

function getTip(businessType: string): string {
  return (
    TIPS[businessType] ??
    "Start with a Google Review campaign — it's the highest-ROI action for local businesses. Most customers will happily leave a review for a small perk."
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function Dashboard({ business, campaigns, stats, onNavigate }: DashboardProps) {
  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.status === "active" && c.businessId === business.id),
    [campaigns, business.id]
  );

  return (
    <div className="animate-fade-up">
      {/* Welcome Header */}
      <h1 className="text-2xl font-heading italic text-brand-text mb-1">
        Welcome back, <span className="text-brand-cyan">{business.name}</span>
      </h1>
      <p className="text-xs text-brand-dim font-body mb-6">
        Here&apos;s how your marketing is performing
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {[
          {
            value: String(stats.activeCampaigns),
            label: "Active Campaigns",
            colorClass: "text-brand-cyan",
          },
          {
            value: String(stats.completions),
            label: "Completions",
            colorClass: "text-brand-green",
          },
          {
            value: String(stats.reviews),
            label: "Reviews Generated",
            colorClass: "text-brand-amber",
          },
          {
            value: formatCurrency(stats.marketingValue),
            label: "Marketing Value",
            colorClass: "text-brand-pink",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-brand-surface border border-brand-border rounded-lg p-4 transition-all duration-200"
          >
            <div className="text-center">
              <div
                className={`text-2xl font-extrabold font-mono ${stat.colorClass}`}
              >
                {stat.value}
              </div>
              <div className="text-3xs text-brand-muted font-medium tracking-wider uppercase">
                {stat.label}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick Start */}
      <div className="bg-brand-surface border border-brand-border rounded-lg p-4 mb-6 bg-brand-elevated/50">
        <div className="text-xs font-bold text-brand-dim mb-2 font-body">
          Quick Start
        </div>
        <p className="text-xs text-brand-dim font-body mb-4">
          Browse campaign ideas tailored for your {business.type.toLowerCase()}.
          Start with the essentials — they&apos;re the quickest wins.
        </p>
        <button
          onClick={() => onNavigate?.("campaigns")}
          className="font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs bg-brand-cyan text-brand-bg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
        >
          Browse Campaigns →
        </button>
      </div>

      {/* Active Campaigns Summary */}
      {activeCampaigns.length > 0 && (
        <div className="bg-brand-surface border border-brand-border rounded-lg p-4 mb-6">
          <div className="text-xs font-bold text-brand-cyan mb-3 font-body">
            Running Campaigns ({activeCampaigns.length})
          </div>
          <div className="space-y-2">
            {activeCampaigns.slice(0, 3).map((camp) => (
              <div
                key={camp.id}
                className="flex items-center justify-between text-xs px-3 py-2 rounded-md bg-brand-elevated border border-brand-border"
              >
                <span className="text-brand-text font-semibold truncate">
                  {camp.name}
                </span>
                <span className="text-brand-green font-mono font-bold shrink-0 ml-2">
                  {camp.discountValue}
                  {camp.discountType === "pct" ? "%" : "$"} off
                </span>
              </div>
            ))}
            {activeCampaigns.length > 3 && (
              <button
                onClick={() => onNavigate?.("campaigns")}
                className="text-2xs text-brand-cyan hover:underline font-body rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40"
              >
                View all {activeCampaigns.length} active campaigns →
              </button>
            )}
          </div>
        </div>
      )}

      {/* Tip Card */}
      <div className="bg-brand-surface border border-brand-border rounded-lg p-4 border-l-[3px] border-l-brand-green">
        <div className="text-xs font-bold text-brand-green mb-2 font-body">
          Tip for {business.type}s
        </div>
        <p className="text-xs text-brand-dim font-body leading-relaxed">
          {getTip(business.type)}
        </p>
      </div>
    </div>
  );
}

export default Dashboard;
