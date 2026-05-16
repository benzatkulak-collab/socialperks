"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface Program {
  id: string;
  businessId: string;
  businessName?: string;
  name: string;
  status: "active" | "paused" | "ended";
  type?: string;
  createdAt?: string;
  startDate?: string;
  endDate?: string;
}

function statusColor(s: Program["status"]): "green" | "amber" | "red" {
  return s === "active" ? "green" : s === "paused" ? "amber" : "red";
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminProgramsPage() {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [counts, setCounts] = useState<{ total: number; active: number; paused: number; ended: number }>({ total: 0, active: 0, paused: 0, ended: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "paused" | "ended">("all");
  const [selected, setSelected] = useState<Program | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/programs", { credentials: "include" });
    const json = await res.json();
    if (json.success) {
      setPrograms(json.data?.programs ?? []);
      setCounts(json.data?.counts ?? { total: 0, active: 0, paused: 0, ended: 0 });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = programs.filter((p) => {
    if (statusFilter !== "all" && p.status !== statusFilter) return false;
    if (search) {
      const s = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(s) ||
        (p.businessName ?? "").toLowerCase().includes(s) ||
        p.businessId.toLowerCase().includes(s)
      );
    }
    return true;
  });

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Perk Programs"
        description="Every perk program across the platform"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
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
      </div>

      <Card padding="md" className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by program, business…"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <div className="flex gap-1 flex-wrap">
            {(["all", "active", "paused", "ended"] as const).map((f) => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  statusFilter === f
                    ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                    : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
                }`}
              >
                {f}
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
                <th className="text-left px-4 py-3">Program</th>
                <th className="text-left px-4 py-3">Business</th>
                <th className="text-left px-4 py-3">Type</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 4 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={5} className="px-4 py-3"><Skeleton width="w-full" height="h-4" /></td>
                </tr>
              ))}
              {!loading && filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-muted text-sm">No programs match.</td></tr>
              )}
              {!loading && filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer"
                  onClick={() => setSelected(p)}
                >
                  <td className="px-4 py-3">
                    <p className="text-sm text-brand-text">{p.name}</p>
                    <p className="text-2xs text-brand-muted font-mono">{p.id}</p>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-xs text-brand-text">{p.businessName ?? p.businessId}</p>
                    <p className="text-2xs text-brand-muted font-mono">{p.businessId}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim">{p.type ?? "—"}</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(p.status)} dot size="sm">{p.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(p.createdAt ?? p.startDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      {selected && <ProgramDrawer program={selected} onClose={() => setSelected(null)} />}
    </AdminPageContainer>
  );
}

function ProgramDrawer({ program, onClose }: { program: Program; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg text-brand-white italic truncate">{program.name}</h2>
            <p className="text-xs text-brand-muted font-mono truncate">{program.id}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Status</p>
              <Badge color={statusColor(program.status)} dot size="md">{program.status}</Badge>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Type</p>
              <p className="text-brand-text">{program.type ?? "—"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Business</p>
              <p className="text-brand-text">{program.businessName ?? program.businessId}</p>
              <p className="text-2xs text-brand-muted font-mono">{program.businessId}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Started</p>
              <p className="text-brand-dim font-mono text-xs">{formatDate(program.startDate ?? program.createdAt)}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Ends</p>
              <p className="text-brand-dim font-mono text-xs">{formatDate(program.endDate)}</p>
            </div>
          </div>

          <div className="border-t border-brand-border pt-4">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">Linked views</p>
            <div className="flex flex-col gap-2">
              <a
                href={`/api/v1/programs/${program.id}/members`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                Members API →
              </a>
              <a
                href={`/api/v1/programs/${program.id}/cashback`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                Cashback queue API →
              </a>
              <a
                href={`/admin/businesses?search=${program.businessId}`}
                className="text-xs text-brand-cyan hover:underline font-mono"
              >
                Owning business →
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
