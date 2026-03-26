"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AnalyticsOverviewProps {
  hasData: boolean;
  onNavigate?: (page: string) => void;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const STAT_CARDS = [
  {
    label: "Impressions",
    value: "0",
    colorClass: "text-brand-cyan",
    description: "Total campaign views",
  },
  {
    label: "Completion Rate",
    value: "0%",
    colorClass: "text-brand-green",
    description: "Actions completed",
  },
  {
    label: "Avg Perk",
    value: "$0",
    colorClass: "text-brand-amber",
    description: "Average perk value",
  },
  {
    label: "ROI",
    value: "0x",
    colorClass: "text-brand-pink",
    description: "Return on investment",
  },
] as const;

// ─── Component ──────────────────────────────────────────────────────────────

export function AnalyticsOverview({
  hasData,
  onNavigate,
}: AnalyticsOverviewProps) {
  return (
    <div className="animate-fade-up">
      <h2 className="text-xl font-heading italic text-brand-text mb-1">
        Analytics
      </h2>
      <p className="text-xs text-brand-dim font-body mb-6">
        Track your campaign performance and marketing ROI
      </p>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        {STAT_CARDS.map((stat) => (
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
              <div className="text-3xs text-brand-muted font-medium tracking-wider uppercase font-body">
                {stat.label}
              </div>
              <div className="text-3xs text-brand-dim mt-1 font-body">
                {stat.description}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Chart Placeholder / Empty State */}
      {!hasData ? (
        <div className="bg-brand-surface border border-brand-border rounded-lg p-12 text-center">
          {/* Chart Icon */}
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center">
            <svg
              className="w-8 h-8 text-brand-muted"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
              />
            </svg>
          </div>
          <div className="text-sm font-semibold text-brand-text font-body mb-2">
            Launch your first campaign
          </div>
          <p className="text-xs text-brand-dim font-body max-w-sm mx-auto mb-5">
            Analytics will appear here once you have active campaigns generating
            data. Start by browsing campaign ideas tailored for your business.
          </p>
          <button
            onClick={() => onNavigate?.("campaigns")}
            className="font-body font-semibold rounded-md border-none cursor-pointer transition-all duration-150 tracking-wide px-4 py-2 text-xs bg-brand-cyan text-brand-bg hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/50 focus-visible:ring-offset-2 focus-visible:ring-offset-brand-bg"
          >
            Browse Campaigns
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Chart Area Placeholder */}
          <div className="bg-brand-surface border border-brand-border rounded-lg p-6">
            <div className="text-2xs font-bold text-brand-dim font-mono mb-3">
              PERFORMANCE OVER TIME
            </div>
            <div className="h-48 rounded-md bg-brand-elevated border border-brand-border flex items-center justify-center">
              <span className="text-xs text-brand-muted font-body">
                Chart data loading...
              </span>
            </div>
          </div>

          {/* Breakdown Placeholder */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
              <div className="text-2xs font-bold text-brand-dim font-mono mb-3">
                TOP PLATFORMS
              </div>
              <div className="space-y-2">
                {["Instagram", "Google", "TikTok"].map((platform) => (
                  <div
                    key={platform}
                    className="flex justify-between items-center text-xs font-body"
                  >
                    <span className="text-brand-text">{platform}</span>
                    <span className="text-brand-muted font-mono">--</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-brand-surface border border-brand-border rounded-lg p-4">
              <div className="text-2xs font-bold text-brand-dim font-mono mb-3">
                TOP ACTIONS
              </div>
              <div className="space-y-2">
                {["Reviews", "Story Tags", "Reels"].map((action) => (
                  <div
                    key={action}
                    className="flex justify-between items-center text-xs font-body"
                  >
                    <span className="text-brand-text">{action}</span>
                    <span className="text-brand-muted font-mono">--</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AnalyticsOverview;
