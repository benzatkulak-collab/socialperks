"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

type State = "draft" | "active" | "paused" | "ended" | "expired";

interface Campaign {
  id: string;
  campaignId?: string;
  businessId: string;
  name?: string;
  state: State;
  completions?: number | { total: number };
  maxCompletions?: number | null;
  launchedAt?: string;
  tier?: string;
  rewardAmount?: number;
  actionId?: string;
  platformId?: string;
  endedAt?: string;
}

const STATE_FILTERS: Array<{ value: State | "all"; label: string }> = [
  { value: "all", label: "All states" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "ended", label: "Ended" },
  { value: "expired", label: "Expired" },
  { value: "draft", label: "Draft" },
];

function stateColor(state: State): "green" | "amber" | "red" | "cyan" | "muted" {
  switch (state) {
    case "active": return "green";
    case "paused": return "amber";
    case "ended": case "expired": return "red";
    case "draft": return "cyan";
    default: return "muted";
  }
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function completionsOf(c: Campaign): number {
  if (typeof c.completions === "number") return c.completions;
  if (typeof c.completions === "object" && c.completions !== null) return c.completions.total ?? 0;
  return 0;
}

export default function AdminCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [stateFilter, setStateFilter] = useState<State | "all">("all");
  const [selected, setSelected] = useState<Campaign | null>(null);
  const [working, setWorking] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (stateFilter !== "all") params.set("state", stateFilter);
    params.set("perPage", "100");
    const res = await fetch(`/api/v1/campaigns?${params}`, { credentials: "include" });
    const json = await res.json();
    if (json.success) {
      let list: Campaign[] = json.data?.campaigns ?? [];
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(
          (c) =>
            (c.name ?? "").toLowerCase().includes(s) ||
            c.businessId.toLowerCase().includes(s) ||
            (c.campaignId ?? c.id).toLowerCase().includes(s)
        );
      }
      setCampaigns(list);
    }
    setLoading(false);
  }, [search, stateFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const action = async (act: "pause" | "resume" | "end", reason?: string) => {
    if (!selected) return;
    setWorking(act);
    const res = await fetch("/api/v1/admin/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        campaignId: selected.campaignId ?? selected.id,
        action: act,
        reason,
      }),
    });
    const json = await res.json();
    if (json.success && json.data?.campaign) {
      setSelected(json.data.campaign);
      fetchData();
    } else {
      alert(json.error?.message ?? "Action failed");
    }
    setWorking(null);
  };

  const counts = {
    total: campaigns.length,
    active: campaigns.filter((c) => c.state === "active").length,
    paused: campaigns.filter((c) => c.state === "paused").length,
    ended: campaigns.filter((c) => c.state === "ended" || c.state === "expired").length,
    completions: campaigns.reduce((sum, c) => sum + completionsOf(c), 0),
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Campaigns"
        description="Every campaign across every business"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={counts.total} label="Total" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={counts.active} label="Active" color="green" size="sm" />
        </Card>
        <Card padding="sm" borderColor="amber">
          <Stat value={counts.paused} label="Paused" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor="red">
          <Stat value={counts.ended} label="Ended" color="red" size="sm" />
        </Card>
        <Card padding="sm" borderColor="purple">
          <Stat value={counts.completions} label="Total Completions" color="purple" size="sm" />
        </Card>
      </div>

      <Card padding="md" className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, campaign ID, business ID…"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <div className="flex gap-1 flex-wrap">
            {STATE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStateFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  stateFilter === f.value
                    ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                    : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-3">Campaign</th>
                <th className="text-left px-4 py-3">Business</th>
                <th className="text-left px-4 py-3">State</th>
                <th className="text-left px-4 py-3">Completions</th>
                <th className="text-left px-4 py-3">Launched</th>
                <th className="text-right px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={6} className="px-4 py-3"><Skeleton width="w-full" height="h-4" /></td>
                </tr>
              ))}
              {!loading && campaigns.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">No campaigns match.</td></tr>
              )}
              {!loading && campaigns.map((c) => (
                <tr
                  key={c.id ?? c.campaignId}
                  className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(c)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm text-brand-text truncate">{c.name ?? c.campaignId ?? c.id}</p>
                    <p className="text-2xs text-brand-muted font-mono truncate">{c.campaignId ?? c.id}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{c.businessId}</td>
                  <td className="px-4 py-3">
                    <Badge color={stateColor(c.state)} dot size="sm">{c.state}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">
                    {completionsOf(c)}
                    {c.maxCompletions && <span className="text-brand-muted"> / {c.maxCompletions}</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(c.launchedAt)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelected(c); }}
                      className="text-xs text-brand-cyan hover:underline font-mono"
                    >
                      Manage →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && (
        <CampaignDrawer
          campaign={selected}
          working={working}
          onClose={() => setSelected(null)}
          onAction={action}
        />
      )}
    </AdminPageContainer>
  );
}

function CampaignDrawer({
  campaign,
  working,
  onClose,
  onAction,
}: {
  campaign: Campaign;
  working: string | null;
  onClose: () => void;
  onAction: (act: "pause" | "resume" | "end", reason?: string) => void;
}) {
  const [reason, setReason] = useState("");

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg text-brand-white italic truncate">
              {campaign.name ?? campaign.campaignId ?? campaign.id}
            </h2>
            <p className="text-xs text-brand-muted font-mono truncate">{campaign.campaignId ?? campaign.id}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">State</p>
              <Badge color={stateColor(campaign.state)} dot size="md">{campaign.state}</Badge>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Tier</p>
              <p className="text-sm text-brand-text">{campaign.tier ?? "—"}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Business ID</p>
              <p className="text-xs text-brand-text font-mono break-all">{campaign.businessId}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Completions</p>
              <p className="text-sm text-brand-text font-mono">
                {completionsOf(campaign)}{campaign.maxCompletions ? ` / ${campaign.maxCompletions}` : ""}
              </p>
            </div>
            {campaign.platformId && (
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Platform</p>
                <p className="text-sm text-brand-text font-mono">{campaign.platformId}</p>
              </div>
            )}
            {campaign.actionId && (
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Action</p>
                <p className="text-sm text-brand-text font-mono">{campaign.actionId}</p>
              </div>
            )}
            {campaign.rewardAmount !== undefined && (
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Reward</p>
                <p className="text-sm text-brand-text font-mono">${(campaign.rewardAmount / 100).toFixed(2)}</p>
              </div>
            )}
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Launched</p>
              <p className="text-xs text-brand-dim font-mono">{formatDate(campaign.launchedAt)}</p>
            </div>
          </div>

          {/* State actions */}
          <div className="border-t border-brand-border pt-5">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Force state transition (admin override)</p>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Reason (logged to audit)"
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan mb-3"
            />
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                disabled={campaign.state !== "active"}
                loading={working === "pause"}
                onClick={() => onAction("pause", reason)}
              >
                Pause
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={campaign.state !== "paused"}
                loading={working === "resume"}
                onClick={() => onAction("resume", reason)}
              >
                Resume
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={campaign.state === "ended" || campaign.state === "expired"}
                loading={working === "end"}
                onClick={() => onAction("end", reason)}
              >
                End
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
