"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Tabs } from "@/components/ui/tabs";
import { Logo } from "@/components/ui/logo";
import { CampaignBrowser } from "@/components/business/campaign-browser";
import { CampaignCard } from "@/components/business/campaign-card";
import { LaunchModal } from "@/components/business/launch-modal";
import { AnalyticsOverview } from "@/components/business/analytics-overview";
import { AgentTicker } from "@/components/shared/agent-ticker";
import { useCampaigns } from "@/lib/hooks/use-campaigns";
import { useBusinessDashboard } from "@/lib/hooks/use-business-dashboard";
import { useRealtime } from "@/lib/hooks/use-realtime";
import { PLATFORMS } from "@/lib/platforms";
import type { SeedData, SeedBusiness } from "@/lib/seed";

export interface BusinessPortalProps {
  biz: SeedBusiness;
  data: SeedData;
  save: (d: SeedData) => void;
  onLogout: () => void;
}

export function BusinessPortal({
  biz,
  data,
  save,
  onLogout,
}: BusinessPortalProps) {
  const [page, setPage] = useState<string>("dashboard");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [launching, setLaunching] = useState<Record<string, unknown> | null>(null);

  const {
    campaigns,
    filtered,
    loading,
    error: fetchError,
    filters,
    setFilters,
    categories,
    tiers,
  } = useCampaigns(biz.type, biz.size);

  const { stats, loading: statsLoading } = useBusinessDashboard(biz.id);

  const { connected, subscribe } = useRealtime({ businessId: biz.id });

  const [realtimeToast, setRealtimeToast] = useState<string | null>(null);

  useEffect(() => {
    const unsub1 = subscribe("submission.created", () => {
      setRealtimeToast(`New submission received!`);
      setTimeout(() => setRealtimeToast(null), 4000);
    });
    const unsub2 = subscribe("campaign.launched", (event) => {
      setRealtimeToast(`Campaign "${event.payload.name ?? "New"}" is now live!`);
      setTimeout(() => setRealtimeToast(null), 4000);
    });
    return () => { unsub1(); unsub2(); };
  }, [subscribe]);

  const portalTabs = [
    { id: "dashboard", label: "Dashboard" },
    { id: "campaigns", label: "Campaigns", count: campaigns.length },
    { id: "analytics", label: "Analytics" },
  ];

  function handleLaunch(launchData: Record<string, unknown>) {
    const newCampaign = {
      ...launchData,
      id: launchData.id || crypto.randomUUID(),
      businessId: biz.id,
      status: "active" as const,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    save({ ...data, campaigns: [...(data.campaigns || []), newCampaign] });
    setLaunching(null);
  }

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <div className="bg-brand-surface border-b border-brand-border px-4 md:px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Logo size="sm" />
          <Badge color="cyan">{biz.type}</Badge>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-dim hidden sm:block">{biz.avatar} {biz.name}</span>
          {connected && (
            <span className="flex h-2 w-2 rounded-full bg-brand-green" title="Live" />
          )}
          <Button variant="ghost" size="sm" onClick={onLogout}>Log Out</Button>
        </div>
      </div>

      {/* Sub-nav */}
      <nav className="bg-brand-elevated border-b border-brand-border px-4 md:px-6 py-2" aria-label="Business portal navigation">
        <Tabs tabs={portalTabs} activeTab={page} onChange={setPage} />
      </nav>

      <AgentTicker />

      {realtimeToast && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pt-3">
          <div className="bg-brand-cyan/10 border border-brand-cyan/30 rounded-lg px-4 py-2.5 text-sm text-brand-cyan font-medium flex items-center gap-2" role="status">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-cyan opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-cyan" />
            </span>
            {realtimeToast}
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6">
        {/* Dashboard View */}
        {page === "dashboard" && (
          <div className="animate-fade-up">
            <h1 className="text-2xl mb-1">
              Welcome back, <span className="text-brand-cyan">{biz.name}</span>
            </h1>
            <p className="text-xs text-brand-dim mb-6">Here&apos;s how your marketing is performing</p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
              <Card><Stat value={String(stats.activeCampaigns)} label="Active Campaigns" color="#22D3EE" /></Card>
              <Card><Stat value={String(stats.completions)} label="Completions" color="#34D399" /></Card>
              <Card><Stat value={String(stats.reviews)} label="Reviews Generated" color="#FBBF24" /></Card>
              <Card><Stat value={"$" + stats.marketingValue} label="Marketing Value" color="#F472B6" /></Card>
            </div>

            <Card className="mb-6 bg-brand-elevated/50">
              <div className="text-xs font-bold text-brand-dim mb-2">Quick Start</div>
              <p className="text-xs text-brand-dim mb-4">
                We&apos;ve generated {campaigns.length} campaign ideas tailored for your {biz.type.toLowerCase()}.
                Start with the essentials &mdash; they&apos;re the quickest wins.
              </p>
              <Button size="sm" onClick={() => setPage("campaigns")}>Browse Campaigns &rarr;</Button>
            </Card>

            <Card borderColor="green">
              <div className="text-xs font-bold text-brand-green mb-2">Tip for {biz.type}s</div>
              <p className="text-xs text-brand-dim">
                Start with a Google Review campaign &mdash; it&apos;s the highest-ROI action for local businesses.
                Most customers will happily leave a review for a small perk.
              </p>
            </Card>
          </div>
        )}

        {/* Campaigns View */}
        {page === "campaigns" && (
          <div>
            <div className="animate-fade-up mb-4">
              <h1 className="text-2xl mb-1">Campaigns for your {biz.type.toLowerCase()}</h1>
              <p className="text-xs text-brand-dim">
                {loading ? "Generating..." : `${campaigns.length} tailored campaigns \u00B7 ${PLATFORMS.length} platforms`}
              </p>
            </div>

            {fetchError && (
              <div className="text-xs text-brand-red bg-brand-red/5 border border-brand-red/20 rounded-md px-4 py-3 mb-3" role="alert">
                {fetchError}
              </div>
            )}

            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="skeleton h-24 w-full" />
                ))}
              </div>
            ) : (
              <CampaignBrowser
                search={filters.search}
                onSearchChange={(v) => setFilters((f) => ({ ...f, search: v }))}
                categories={categories}
                tiers={tiers}
                categoryFilter={filters.category}
                tierFilter={filters.tier}
                onCategoryChange={(c) => setFilters((f) => ({ ...f, category: c }))}
                onTierChange={(t) => setFilters((f) => ({ ...f, tier: t }))}
                totalCount={campaigns.length}
                filteredCount={filtered.length}
              >
                {filtered.map((camp) => (
                  <CampaignCard
                    key={camp.id}
                    campaign={camp}
                    expanded={expanded === camp.id}
                    onToggle={() => setExpanded(expanded === camp.id ? null : camp.id)}
                    onLaunch={(c) => setLaunching(c as unknown as Record<string, unknown>)}
                  />
                ))}
              </CampaignBrowser>
            )}
          </div>
        )}

        {/* Analytics View */}
        {page === "analytics" && (
          <AnalyticsOverview hasData={false} onNavigate={setPage} />
        )}
      </div>

      {/* Launch Modal */}
      {launching && (
        <LaunchModal
          campaign={launching as { id: string; name: string; description: string; actions: string[]; discountValue: number; discountType: "pct" | "dol"; category: string; tier: string; reason: string }}
          onLaunch={handleLaunch}
          onClose={() => setLaunching(null)}
        />
      )}
    </div>
  );
}
