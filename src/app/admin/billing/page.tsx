"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface UsageResponse {
  plan: string;
  limits: {
    campaigns: number | string;
    completions: number | string;
    aiGenerations: number | string;
    analytics: boolean | string;
    apiAccess: boolean | string;
    qrCodes: number | string;
  };
  usage: Record<string, number>;
}

interface BillingRecoveryReport {
  agentId: string;
  lastRunAt: string | null;
  recentDecisions: Array<{
    targetId: string;
    action: string;
    confidence: number;
    executed: boolean;
    reason: string;
    runAt?: string;
    meta?: Record<string, unknown>;
  }>;
  config: { threshold: number; custom: Record<string, number> };
  mode: string;
}

function formatRel(iso?: string | null): string {
  if (!iso) return "never";
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AdminBillingPage() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [agent, setAgent] = useState<BillingRecoveryReport | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [uRes, aRes] = await Promise.allSettled([
      fetch("/api/v1/billing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ action: "get_usage" }),
      }),
      fetch("/api/v1/admin/agents", { credentials: "include" }),
    ]);

    if (uRes.status === "fulfilled" && uRes.value.ok) {
      const j = await uRes.value.json();
      if (j.success) setUsage(j.data);
    }
    if (aRes.status === "fulfilled" && aRes.value.ok) {
      const j = await aRes.value.json();
      if (j.success) {
        const found = (j.data?.agents ?? []).find((a: BillingRecoveryReport & { id: string }) => a.id === "billing-recovery");
        setAgent(found ?? null);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Billing & Revenue"
        description="MRR, subscriptions, failed payments, dunning"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      {/* Plan + usage of current admin account */}
      {loading && <Skeleton width="w-full" height="h-32" />}

      {!loading && usage && (
        <>
          <h2 className="font-heading text-lg text-brand-white italic mb-4">Your plan</h2>
          <Card padding="md" className="mb-6">
            <div className="flex items-center gap-3 flex-wrap mb-4">
              <Badge color="purple" size="md">{usage.plan}</Badge>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {Object.entries(usage.limits).map(([k, v]) => (
                <div key={k}>
                  <p className="text-2xs uppercase font-mono text-brand-muted mb-1">{k}</p>
                  <p className="text-sm text-brand-text font-mono">{String(v)}</p>
                  {usage.usage[k] !== undefined && (
                    <p className="text-2xs text-brand-dim font-mono">used: {usage.usage[k]}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {/* Billing recovery agent feed */}
      <h2 className="font-heading text-lg text-brand-white italic mb-4">Billing Recovery agent</h2>

      {agent ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Card padding="sm" borderColor={agent.mode === "live" ? "green" : "amber"}>
              <Stat value={agent.mode} label="Mode" color={agent.mode === "live" ? "green" : "amber"} size="sm" />
            </Card>
            <Card padding="sm" borderColor="cyan">
              <Stat value={agent.recentDecisions.length} label="Recent actions" color="cyan" size="sm" />
            </Card>
            <Card padding="sm" borderColor="red">
              <Stat
                value={agent.recentDecisions.filter((d) => d.action === "cancel").length}
                label="Cancelled subs"
                color="red"
                size="sm"
              />
            </Card>
            <Card padding="sm" borderColor="muted">
              <Stat value={formatRel(agent.lastRunAt)} label="Last run" color="white" size="sm" />
            </Card>
          </div>

          <Card padding="none">
            <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
              <span className="text-xs text-brand-muted font-mono uppercase tracking-wider">Recovery actions</span>
              <a href="/admin/agents" className="text-xs text-brand-cyan hover:underline font-mono">
                Tune agent →
              </a>
            </div>
            {agent.recentDecisions.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-brand-muted text-sm">No failed payments — agent has nothing to do.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                      <th className="text-left px-4 py-3">Subscription</th>
                      <th className="text-left px-4 py-3">Step</th>
                      <th className="text-left px-4 py-3">Day</th>
                      <th className="text-left px-4 py-3">Result</th>
                      <th className="text-left px-4 py-3">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {agent.recentDecisions.map((d, idx) => {
                      const meta = d.meta ?? {};
                      return (
                        <tr key={idx} className="border-b border-brand-border/50">
                          <td className="px-4 py-3 text-xs text-brand-text font-mono">{d.targetId.slice(0, 20)}…</td>
                          <td className="px-4 py-3 text-xs text-brand-text font-mono">{d.action}</td>
                          <td className="px-4 py-3 text-xs text-brand-dim font-mono">{String(meta.daysSinceFail ?? "—")}</td>
                          <td className="px-4 py-3">
                            <Badge color={d.executed ? "green" : "muted"} size="sm">
                              {d.executed ? "executed" : "dry-run"}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-brand-dim">{d.reason}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      ) : (
        <Card padding="md">
          <p className="text-sm text-brand-muted">
            Billing Recovery agent not registered or not yet loaded.{" "}
            <a href="/admin/agents" className="text-brand-cyan hover:underline">Manage agents →</a>
          </p>
        </Card>
      )}
    </AdminPageContainer>
  );
}
