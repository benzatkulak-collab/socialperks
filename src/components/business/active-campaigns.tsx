"use client";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignItem {
  id: string;
  name: string;
  actions: string[];
  discountValue: number;
  discountType: string;
  status: string;
}

interface ActiveCampaignsProps {
  campaigns: CampaignItem[];
  onSelect?: (id: string) => void;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActiveCampaigns({
  campaigns,
  onSelect,
}: ActiveCampaignsProps) {
  if (!campaigns.length) {
    return (
      <div className="animate-fade-up">
        <h2 className="text-xl font-heading italic text-brand-text mb-4">
          Active Campaigns
        </h2>
        <div className="bg-brand-surface border border-brand-border rounded-lg p-8 text-center">
          <div className="text-brand-muted text-sm font-body mb-2">
            No active campaigns yet
          </div>
          <p className="text-brand-dim text-xs font-body max-w-sm mx-auto">
            Launch your first campaign from the Campaigns tab to start
            generating marketing value from your customers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      <h2 className="text-xl font-heading italic text-brand-text mb-4">
        Active Campaigns
      </h2>
      <div className="space-y-2">
        {campaigns.map((campaign) => (
          <div
            key={campaign.id}
            onClick={() => onSelect?.(campaign.id)}
            onKeyDown={onSelect ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(campaign.id); } } : undefined}
            tabIndex={onSelect ? 0 : undefined}
            role={onSelect ? "button" : undefined}
            aria-label={onSelect ? `View campaign: ${campaign.name}` : undefined}
            className={`bg-brand-surface border border-brand-border rounded-lg p-4 transition-all duration-200 ${
              onSelect
                ? "cursor-pointer hover:border-brand-cyan/20 hover:-translate-y-px hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-brand-cyan/40"
                : ""
            }`}
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left: Name + Status Badge */}
              <div className="flex items-center gap-3 min-w-0">
                <span className="text-sm font-semibold text-brand-text font-body truncate">
                  {campaign.name}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-3xs font-semibold tracking-wide uppercase font-mono whitespace-nowrap bg-brand-green/10 text-brand-green">
                  Active
                </span>
              </div>

              {/* Right: Action Count + Perk Value */}
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-right">
                  <div className="text-2xs text-brand-muted font-body">
                    {campaign.actions.length}{" "}
                    {campaign.actions.length === 1 ? "action" : "actions"}
                  </div>
                </div>
                <div className="text-right min-w-[60px]">
                  <div className="text-lg font-extrabold text-brand-green font-mono">
                    {campaign.discountValue}
                    {campaign.discountType === "pct" ? "%" : "$"}
                  </div>
                  <div className="text-3xs text-brand-muted font-body">
                    perk
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Summary footer */}
      <div className="mt-4 pt-3 border-t border-brand-border flex justify-between items-center">
        <span className="text-2xs text-brand-muted font-body">
          {campaigns.length}{" "}
          {campaigns.length === 1 ? "campaign" : "campaigns"} running
        </span>
        <span className="text-2xs text-brand-dim font-mono">
          {campaigns.reduce((sum, c) => sum + c.actions.length, 0)} total
          actions
        </span>
      </div>
    </div>
  );
}

export default ActiveCampaigns;
