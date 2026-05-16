"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";
import { useLivePoll } from "@/components/admin/use-live-poll";
import { LiveIndicator } from "@/components/admin/live-indicator";

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
  status: string;
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

export default function AdminFraudPage() {
  const [agent, setAgent] = useState<AgentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const fetchAgent = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/agents", { credentials: "include" });
    const json = await res.json();
    if (json.success) {
      const found = (json.data?.agents ?? []).find((a: AgentRow & { name: string }) => a.id === "fraud-sentinel");
      setAgent(found ?? null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgent(); }, [fetchAgent]);

  const { isLive, lastTickAt, toggleLive } = useLivePoll(fetchAgent, 30_000);

  const runNow = async () => {
    setWorking(true);
    await fetch("/api/v1/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ agentId: "fraud-sentinel", action: "run" }),
    });
    setWorking(false);
    fetchAgent();
  };

  const ranked = agent
    ? [...agent.recentDecisions].sort((a, b) => b.confidence - a.confidence)
    : [];

  const stats = {
    total: ranked.length,
    suspended: ranked.filter((d) => d.action === "suspend" && d.executed).length,
    flagged: ranked.filter((d) => d.action === "flag").length,
    wouldSuspend: ranked.filter((d) => d.action === "suspend" && !d.executed).length,
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Fraud & Abuse"
        description="Live signals from the Fraud Sentinel agent"
        actions={
          <>
            <LiveIndicator isLive={isLive} lastTickAt={lastTickAt} onToggle={toggleLive} />
            <Button variant="outline" size="sm" onClick={fetchAgent}>Refresh</Button>
            <Button variant="outline" size="sm" loading={working} onClick={runNow}>Run agent now</Button>
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
        <Card padding="sm" borderColor="cyan">
          <Stat value={stats.total} label="Total signals" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="red">
          <Stat value={stats.suspended} label="Auto-suspended" color="red" size="sm" />
        </Card>
        <Card padding="sm" borderColor="amber">
          <Stat value={stats.wouldSuspend} label="Would suspend (dry-run)" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor="purple">
          <Stat value={stats.flagged} label="Flagged for review" color="purple" size="sm" />
        </Card>
      </div>

      {agent && (
        <Card padding="md" className="mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge color={agent.mode === "live" ? "green" : agent.mode === "dry-run" ? "amber" : "muted"} dot size="sm">
              {agent.mode}
            </Badge>
            <span className="text-xs text-brand-muted font-mono">
              last run: {formatRel(agent.lastRunAt)}
            </span>
            <span className="text-xs text-brand-muted font-mono">
              suspend threshold: {(agent.config.custom.autoSuspendAbove ?? 0).toFixed(2)}
            </span>
            <span className="text-xs text-brand-muted font-mono">
              min submissions: {agent.config.custom.minSubmissionsForScoring ?? 5}
            </span>
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="px-4 py-3 border-b border-brand-border">
          <span className="text-xs text-brand-muted font-mono uppercase tracking-wider">
            Suspect users (ranked by risk score)
          </span>
        </div>
        {loading && <div className="p-4"><Skeleton width="w-full" height="h-32" /></div>}
        {!loading && ranked.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-brand-muted text-sm">No fraud signals yet. Run the agent to scan.</p>
          </div>
        )}
        {!loading && ranked.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                  <th className="text-left px-4 py-3">User</th>
                  <th className="text-left px-4 py-3">Risk Score</th>
                  <th className="text-left px-4 py-3">Action</th>
                  <th className="text-left px-4 py-3">Result</th>
                  <th className="text-left px-4 py-3">Signals</th>
                  <th className="text-left px-4 py-3">Run At</th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((d, idx) => {
                  const meta = d.meta ?? {};
                  return (
                    <tr key={idx} className="border-b border-brand-border/50">
                      <td className="px-4 py-3 text-xs text-brand-text font-mono">{d.targetId.slice(0, 24)}…</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-brand-surface rounded overflow-hidden">
                            <div
                              className={d.confidence > 0.8 ? "bg-brand-red h-full" : d.confidence > 0.5 ? "bg-brand-amber h-full" : "bg-brand-cyan h-full"}
                              style={{ width: `${d.confidence * 100}%` }}
                            />
                          </div>
                          <span className="text-xs font-mono text-brand-text">{(d.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-text font-mono">{d.action}</td>
                      <td className="px-4 py-3">
                        <Badge color={d.executed ? "red" : "muted"} size="sm">
                          {d.executed ? "executed" : "dry-run"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-2xs text-brand-dim font-mono">
                        {Array.isArray(meta.reasons) ? (meta.reasons as string[]).join(", ") : d.reason}
                      </td>
                      <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{formatRel(d.runAt)}</td>
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
