"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

type Tier = "micro" | "mid" | "macro" | "mega";

interface Influencer {
  id: string;
  displayName: string;
  email: string;
  avatar: string;
  bio: string;
  tier: Tier;
  niches: string[];
  followerCount: number;
  engagementRate: number;
  location: string;
  platforms?: Array<{ platformId: string; handle: string; followers: number }>;
}

const TIER_FILTERS: Array<{ value: Tier | "all"; label: string }> = [
  { value: "all", label: "All tiers" },
  { value: "micro", label: "Micro" },
  { value: "mid", label: "Mid" },
  { value: "macro", label: "Macro" },
  { value: "mega", label: "Mega" },
];

function tierColor(tier: Tier): "cyan" | "green" | "amber" | "purple" | "pink" {
  return tier === "mega" ? "pink" : tier === "macro" ? "purple" : tier === "mid" ? "amber" : "cyan";
}

function fmtFollowers(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return String(n);
}

export default function AdminInfluencersPage() {
  const [influencers, setInfluencers] = useState<Influencer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [tier, setTier] = useState<Tier | "all">("all");
  const [selected, setSelected] = useState<Influencer | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (tier !== "all") params.set("tier", tier);
    params.set("perPage", "100");
    const res = await fetch(`/api/v1/influencers?${params}`, { credentials: "include" });
    const json = await res.json();
    if (json.success) {
      let list: Influencer[] = json.data?.influencers ?? [];
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(
          (i) =>
            i.displayName.toLowerCase().includes(s) ||
            i.email.toLowerCase().includes(s) ||
            i.niches.some((n) => n.toLowerCase().includes(s)) ||
            i.location.toLowerCase().includes(s)
        );
      }
      setInfluencers(list);
    }
    setLoading(false);
  }, [search, tier]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const counts = {
    total: influencers.length,
    byTier: {
      micro: influencers.filter((i) => i.tier === "micro").length,
      mid: influencers.filter((i) => i.tier === "mid").length,
      macro: influencers.filter((i) => i.tier === "macro").length,
      mega: influencers.filter((i) => i.tier === "mega").length,
    },
    totalReach: influencers.reduce((sum, i) => sum + i.followerCount, 0),
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Influencers"
        description="Roster across all tiers and niches"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={counts.total} label="Total" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="cyan">
          <Stat value={counts.byTier.micro} label="Micro" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="amber">
          <Stat value={counts.byTier.mid} label="Mid" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor="purple">
          <Stat value={counts.byTier.macro} label="Macro" color="purple" size="sm" />
        </Card>
        <Card padding="sm" borderColor="pink">
          <Stat value={counts.byTier.mega} label="Mega" color="pink" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={fmtFollowers(counts.totalReach)} label="Combined Reach" color="green" size="sm" />
        </Card>
      </div>

      <Card padding="md" className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, niche, location…"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <div className="flex gap-1 flex-wrap">
            {TIER_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setTier(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  tier === f.value
                    ? "bg-brand-amber/20 text-brand-amber border border-brand-amber/40"
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
                <th className="text-left px-4 py-3">Influencer</th>
                <th className="text-left px-4 py-3">Tier</th>
                <th className="text-left px-4 py-3">Followers</th>
                <th className="text-left px-4 py-3">Engagement</th>
                <th className="text-left px-4 py-3">Niches</th>
                <th className="text-left px-4 py-3">Location</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={6} className="px-4 py-3"><Skeleton width="w-full" height="h-4" /></td>
                </tr>
              ))}
              {!loading && influencers.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">No influencers match.</td></tr>
              )}
              {!loading && influencers.map((i) => (
                <tr
                  key={i.id}
                  className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(i)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0">{i.avatar}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-brand-text truncate">{i.displayName}</p>
                        <p className="text-2xs text-brand-muted font-mono truncate">{i.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge color={tierColor(i.tier)} size="sm">{i.tier}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">{fmtFollowers(i.followerCount)}</td>
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">{i.engagementRate.toFixed(1)}%</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {i.niches.slice(0, 3).map((n) => (
                        <span key={n} className="px-1.5 py-0.5 rounded text-2xs bg-brand-surface/50 text-brand-dim font-mono">
                          {n}
                        </span>
                      ))}
                      {i.niches.length > 3 && (
                        <span className="text-2xs text-brand-muted">+{i.niches.length - 3}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim">{i.location}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && <InfluencerDrawer influencer={selected} onClose={() => setSelected(null)} />}
    </AdminPageContainer>
  );
}

function InfluencerDrawer({ influencer, onClose }: { influencer: Influencer; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{influencer.avatar}</span>
            <div className="min-w-0">
              <h2 className="font-heading text-lg text-brand-white italic truncate">{influencer.displayName}</h2>
              <p className="text-xs text-brand-muted font-mono truncate">{influencer.email}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <p className="text-sm text-brand-text">{influencer.bio}</p>

          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Tier</p>
              <Badge color={tierColor(influencer.tier)} size="sm">{influencer.tier}</Badge>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Followers</p>
              <p className="text-brand-text font-mono">{fmtFollowers(influencer.followerCount)}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Engagement</p>
              <p className="text-brand-text font-mono">{influencer.engagementRate.toFixed(1)}%</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Location</p>
              <p className="text-brand-text">{influencer.location}</p>
            </div>
          </div>

          <div>
            <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Niches</p>
            <div className="flex flex-wrap gap-1">
              {influencer.niches.map((n) => (
                <span key={n} className="px-2 py-0.5 rounded text-xs bg-brand-surface/50 text-brand-dim font-mono">
                  {n}
                </span>
              ))}
            </div>
          </div>

          {influencer.platforms && influencer.platforms.length > 0 && (
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Platforms</p>
              <div className="space-y-1.5">
                {influencer.platforms.map((p) => (
                  <div key={p.platformId} className="flex items-center justify-between text-xs">
                    <span className="text-brand-text font-mono">{p.handle}</span>
                    <span className="text-brand-muted font-mono">{fmtFollowers(p.followers)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="border-t border-brand-border pt-4">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Linked views</p>
            <div className="flex flex-col gap-2">
              <a
                href={`/admin/submissions?userId=${influencer.id}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                View submissions →
              </a>
              <a
                href={`/admin/users?search=${influencer.email}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                Account management →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
