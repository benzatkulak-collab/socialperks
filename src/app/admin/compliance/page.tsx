"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface Decision {
  targetId: string;
  action: string;
  confidence: number;
  executed: boolean;
  reason: string;
  runAt?: string;
  meta?: Record<string, unknown>;
}

interface AgentRow {
  id: string;
  mode: "off" | "dry-run" | "live";
  lastRunAt: string | null;
  recentDecisions: Decision[];
  config: { threshold: number; custom: Record<string, number> };
}

function formatRel(iso?: string | null): string {
  if (!iso) return "never";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AdminCompliancePage() {
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/agents", { credentials: "include" });
    const json = await res.json();
    if (json.success) {
      const found = (json.data?.agents ?? []).find((a: AgentRow & { name: string }) => a.id === "compliance-watchdog");
      setAgent(found ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  const runNow = async () => {
    setWorking(true);
    await fetch("/api/v1/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ agentId: "compliance-watchdog", action: "run" }),
    });
    setWorking(false);
    fetchAgent();
  };

  const flagged = agent?.recentDecisions ?? [];
  const stats = {
    flagged: flagged.length,
    lookbackDays: agent?.config.custom.lookbackDays ?? 7,
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Compliance"
        description="FTC disclosure scans by the Compliance Watchdog agent"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchAgent}>Refresh</Button>
            <Button variant="outline" size="sm" loading={working} onClick={runNow}>Run scan</Button>
            <a
              href="/admin/agents"
              className="px-3 py-1.5 rounded-md text-xs font-mono border border-brand-border text-brand-cyan hover:bg-brand-surface/50"
            >
              Tune agent →
            </a>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="sm" borderColor="amber">
          <Stat value={stats.flagged} label="Flagged submissions" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor="cyan">
          <Stat value={stats.lookbackDays} suffix="d" label="Lookback window" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor={agent?.mode === "live" ? "green" : "muted"}>
          <Stat value={agent?.mode ?? "—"} label="Mode" color={agent?.mode === "live" ? "green" : "white"} size="sm" />
        </Card>
        <Card padding="sm" borderColor="muted">
          <Stat value={formatRel(agent?.lastRunAt)} label="Last scan" color="white" size="sm" />
        </Card>
      </div>

      <Card padding="none">
        <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
          <span className="text-xs text-brand-muted font-mono uppercase tracking-wider">
            Submissions missing FTC disclosure
          </span>
          <Badge color="amber" size="sm">Conservative heuristic — false negatives preferred</Badge>
        </div>
        {loading && <div className="p-4"><Skeleton width="w-full" height="h-32" /></div>}
        {!loading && flagged.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-brand-muted text-sm">No compliance flags. {agent ? "Healthy." : "Run the agent to scan."}</p>
          </div>
        )}
        {!loading && flagged.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                  <th className="text-left px-4 py-3">Submission</th>
                  <th className="text-left px-4 py-3">Campaign</th>
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Signals</th>
                  <th className="text-left px-4 py-3">Proof</th>
                </tr>
              </thead>
              <tbody>
                {flagged.map((d, idx) => {
                  const meta = d.meta ?? {};
                  return (
                    <tr key={idx} className="border-b border-brand-border/50">
                      <td className="px-4 py-3 text-2xs text-brand-text font-mono">{d.targetId.slice(0, 18)}…</td>
                      <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{String(meta.campaignId ?? "—").slice(0, 18)}…</td>
                      <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{String(meta.userId ?? "—").slice(0, 18)}…</td>
                      <td className="px-4 py-3 text-xs text-brand-dim">
                        {Array.isArray(meta.signals) ? (meta.signals as string[]).join(", ") : d.reason}
                      </td>
                      <td className="px-4 py-3">
                        {meta.proofUrl ? (
                          <a
                            href={String(meta.proofUrl)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-brand-cyan hover:underline font-mono"
                          >
                            view →
                          </a>
                        ) : (
                          <span className="text-2xs text-brand-muted">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </AdminPageContainer>
  );
}
