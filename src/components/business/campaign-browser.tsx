"use client";

import type { ReactNode } from "react";
import { TIER_META } from "@/lib/platforms";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignBrowserProps {
  search: string;
  onSearchChange: (value: string) => void;
  categories: string[];
  tiers: string[];
  categoryFilter: string;
  tierFilter: string;
  onCategoryChange: (category: string) => void;
  onTierChange: (tier: string) => void;
  totalCount: number;
  filteredCount: number;
  children: ReactNode;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignBrowser({
  search,
  onSearchChange,
  categories,
  tiers,
  categoryFilter,
  tierFilter,
  onCategoryChange,
  onTierChange,
  totalCount,
  filteredCount,
  children,
}: CampaignBrowserProps) {
  return (
    <div>
      {/* Search */}
      <div className="animate-fade-up animate-delay-100 mb-4">
        <input
          className="font-body text-sm px-4 py-2.5 rounded-lg border border-brand-border bg-brand-bg text-brand-text w-full outline-none focus:border-brand-cyan/50 focus:ring-2 focus:ring-brand-cyan/40 transition-all"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={`Search ${totalCount} campaigns...`}
          aria-label={`Search ${totalCount} campaigns`}
        />
      </div>

      {/* Filters */}
      <div className="animate-fade-up animate-delay-200 flex gap-6 mb-4 flex-wrap">
        {/* Category Filter */}
        <div>
          <div className="text-3xs font-bold text-brand-muted font-mono mb-1 tracking-wider">
            CATEGORY
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onCategoryChange("all")}
              className={`font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                categoryFilter === "all"
                  ? "bg-brand-cyan text-brand-bg hover:brightness-110"
                  : "bg-brand-elevated text-brand-text border border-brand-border hover:border-brand-border-hover"
              }`}
            >
              All
            </button>
            {categories.map((c) => (
              <button
                key={c}
                onClick={() => onCategoryChange(c)}
                className={`font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                  categoryFilter === c
                    ? "bg-brand-cyan text-brand-bg hover:brightness-110"
                    : "bg-brand-elevated text-brand-text border border-brand-border hover:border-brand-border-hover"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Tier / Priority Filter */}
        <div>
          <div className="text-3xs font-bold text-brand-muted font-mono mb-1 tracking-wider">
            PRIORITY
          </div>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => onTierChange("all")}
              className={`font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                tierFilter === "all"
                  ? "bg-brand-cyan text-brand-bg hover:brightness-110"
                  : "bg-brand-elevated text-brand-text border border-brand-border hover:border-brand-border-hover"
              }`}
            >
              All
            </button>
            {tiers.map((t) => {
              const meta = TIER_META[t] || {
                label: t,
                color: "#636B8A",
                icon: "•",
              };
              return (
                <button
                  key={t}
                  onClick={() => onTierChange(t)}
                  className={`font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-3 py-1.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
                    tierFilter === t
                      ? "bg-brand-cyan text-brand-bg hover:brightness-110"
                      : "bg-brand-elevated text-brand-text border border-brand-border hover:border-brand-border-hover"
                  }`}
                >
                  {meta.icon} {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-2xs text-brand-muted mb-3 font-body">
        {filteredCount} of {totalCount}
      </div>

      {/* Campaign Cards (children) */}
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export default CampaignBrowser;
