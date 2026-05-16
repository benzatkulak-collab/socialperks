"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

type Size = "solo" | "small" | "medium" | "enterprise";

interface Business {
  id: string;
  name: string;
  type: string;
  email: string;
  avatar: string;
  size: Size;
  location: string;
  industry: string;
}

interface BusinessesResponse {
  businesses: Business[];
  counts: {
    total: number;
    bySize: Record<Size, number>;
    industries: string[];
  };
}

const SIZE_FILTERS: Array<{ value: Size | "all"; label: string }> = [
  { value: "all", label: "All sizes" },
  { value: "solo", label: "Solo" },
  { value: "small", label: "Small" },
  { value: "medium", label: "Medium" },
  { value: "enterprise", label: "Enterprise" },
];

function sizeColor(size: Size): "cyan" | "green" | "amber" | "purple" {
  return size === "enterprise" ? "purple" : size === "medium" ? "amber" : size === "small" ? "green" : "cyan";
}

export default function AdminBusinessesPage() {
  const [data, setData] = useState<BusinessesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [size, setSize] = useState<Size | "all">("all");
  const [industry, setIndustry] = useState("");
  const [selected, setSelected] = useState<Business | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (size !== "all") params.set("size", size);
    if (industry) params.set("industry", industry);
    const res = await fetch(`/api/v1/admin/businesses?${params}`, { credentials: "include" });
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, [search, size, industry]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Businesses"
        description="Every business account on the platform"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      {data && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          <Card padding="sm" borderColor="cyan">
            <Stat value={data.counts.total} label="Total" color="cyan" size="sm" />
          </Card>
          <Card padding="sm" borderColor="cyan">
            <Stat value={data.counts.bySize.solo} label="Solo" color="cyan" size="sm" />
          </Card>
          <Card padding="sm" borderColor="green">
            <Stat value={data.counts.bySize.small} label="Small" color="green" size="sm" />
          </Card>
          <Card padding="sm" borderColor="amber">
            <Stat value={data.counts.bySize.medium} label="Medium" color="amber" size="sm" />
          </Card>
          <Card padding="sm" borderColor="purple">
            <Stat value={data.counts.bySize.enterprise} label="Enterprise" color="purple" size="sm" />
          </Card>
        </div>
      )}

      <Card padding="md" className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, email, ID, location…"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <div className="flex gap-1 flex-wrap">
            {SIZE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setSize(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  size === f.value
                    ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                    : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
          {data && (
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-cyan"
            >
              <option value="">All industries</option>
              {data.counts.industries.map((i) => (
                <option key={i} value={i.toLowerCase()}>{i}</option>
              ))}
            </select>
          )}
        </div>
      </Card>

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-3">Business</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Industry</th>
                <th className="text-left px-4 py-3">Size</th>
                <th className="text-left px-4 py-3">Location</th>
                <th className="text-left px-4 py-3">Email</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={6} className="px-4 py-3"><Skeleton width="w-full" height="h-4" /></td>
                </tr>
              ))}
              {!loading && data?.businesses.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-brand-muted text-sm">No businesses match.</td></tr>
              )}
              {!loading && data?.businesses.map((b) => (
                <tr
                  key={b.id}
                  className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(b)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg shrink-0">{b.avatar}</span>
                      <div className="min-w-0">
                        <p className="text-sm text-brand-text truncate">{b.name}</p>
                        <p className="text-2xs text-brand-muted font-mono truncate">{b.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim">{b.type}</td>
                  <td className="px-4 py-3 text-xs text-brand-dim">{b.industry}</td>
                  <td className="px-4 py-3">
                    <Badge color={sizeColor(b.size)} size="sm">{b.size}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim">{b.location}</td>
                  <td className="px-4 py-3 text-xs text-brand-text font-mono">{b.email}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {selected && <BusinessDrawer business={selected} onClose={() => setSelected(null)} />}
    </AdminPageContainer>
  );
}

function BusinessDrawer({ business, onClose }: { business: Business; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-2xl shrink-0">{business.avatar}</span>
            <div className="min-w-0">
              <h2 className="font-heading text-lg text-brand-white italic truncate">{business.name}</h2>
              <p className="text-xs text-brand-muted font-mono truncate">{business.id}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Type</p>
              <p className="text-brand-text">{business.type}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Size</p>
              <Badge color={sizeColor(business.size)} size="sm">{business.size}</Badge>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Industry</p>
              <p className="text-brand-text">{business.industry}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Location</p>
              <p className="text-brand-text">{business.location}</p>
            </div>
            <div className="col-span-2">
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Email</p>
              <p className="text-brand-text font-mono text-xs break-all">{business.email}</p>
            </div>
          </div>

          <div className="border-t border-brand-border pt-4">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Linked views</p>
            <div className="flex flex-col gap-2">
              <a
                href={`/admin/campaigns?businessId=${business.id}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                View campaigns for this business →
              </a>
              <a
                href={`/admin/submissions?businessId=${business.id}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                View submissions →
              </a>
              <a
                href={`/admin/programs?businessId=${business.id}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                View perk programs →
              </a>
              <a
                href={`/admin/audit?actor=user:${business.id}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                Audit trail →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
