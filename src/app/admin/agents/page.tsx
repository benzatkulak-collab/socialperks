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

type Mode = "off" | "dry-run" | "live";
type Status = "idle" | "running" | "errored";

interface ConfigKnob {
  min: number;
  max: number;
  default: number;
  step?: number;
  label?: string;
}

interface AgentConfigSpec {
  threshold: ConfigKnob;
  maxActionsPerRun: ConfigKnob;
  custom?: Record<string, ConfigKnob>;
}

interface AgentConfigValues {
  threshold: number;
  maxActionsPerRun: number;
  custom: Record<string, number>;
}

interface AgentDecision {
  targetId: string;
  action: string;
  confidence: number;
  executed: boolean;
  reason: string;
  runAt?: string;
}

interface AgentReport {
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  scanned: number;
  decisions: AgentDecision[];
  errored: boolean;
  error?: string;
}

interface AgentRow {
  id: string;
  name: string;
  description: string;
  intervalSeconds: number;
  configSpec: AgentConfigSpec;
  mode: Mode;
  status: Status;
  config: AgentConfigValues;
  lastRunAt: string | null;
  lastReport: AgentReport | null;
  recentDecisions: AgentDecision[];
}

function modeColor(mode: Mode): "green" | "amber" | "muted" {
  return mode === "live" ? "green" : mode === "dry-run" ? "amber" : "muted";
}

function statusColor(status: Status): "green" | "cyan" | "red" {
  return status === "errored" ? "red" : status === "running" ? "cyan" : "green";
}

function formatRelative(iso: string | null): string {
  if (!iso) return "never";
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export default function AdminAgentsPage() {
  const [agents, setAgents] = useState<AgentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/admin/agents", { credentials: "include" });
    const json = await res.json();
    if (json.success) setAgents(json.data?.agents ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  const { isLive, lastTickAt, toggleLive } = useLivePoll(fetchAgents, 30_000);

  const setMode = async (agentId: string, mode: Mode) => {
    setWorking(`mode:${agentId}`);
    await fetch("/api/v1/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ agentId, mode }),
    });
    setWorking(null);
    fetchAgents();
  };

  const setConfig = async (agentId: string, config: Partial<AgentConfigValues>) => {
    setWorking(`config:${agentId}`);
    await fetch("/api/v1/admin/agents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ agentId, config }),
    });
    setWorking(null);
    fetchAgents();
  };

  const runNow = async (agentId: string) => {
    setWorking(`run:${agentId}`);
    await fetch("/api/v1/admin/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ agentId, action: "run" }),
    });
    setWorking(null);
    fetchAgents();
  };

  const liveCount = agents.filter((a) => a.mode === "live").length;
  const dryCount = agents.filter((a) => a.mode === "dry-run").length;
  const erroredCount = agents.filter((a) => a.status === "errored").length;

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Agents"
        description="Autonomous workers that run the platform. Toggle mode, tune thresholds, run on demand."
        actions={
          <>
            <LiveIndicator isLive={isLive} lastTickAt={lastTickAt} onToggle={toggleLive} />
            <Button variant="outline" size="sm" onClick={fetchAgents}>Refresh</Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={agents.length} label="Total agents" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={liveCount} label="Live" color="green" size="sm" />
        </Card>
        <Card padding="sm" borderColor="amber">
          <Stat value={dryCount} label="Dry-run" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor={erroredCount > 0 ? "red" : "muted"}>
          <Stat value={erroredCount} label="Errored" color={erroredCount > 0 ? "red" : "white"} size="sm" />
        </Card>
      </div>

      {loading && (
        <div className="grid grid-cols-1 gap-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} width="w-full" height="h-32" />)}
        </div>
      )}

      <div className="space-y-3">
        {!loading && agents.map((a) => (
          <Card key={a.id} padding="md" borderColor={modeColor(a.mode)}>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-heading text-base text-brand-white italic">{a.name}</h3>
                  <Badge color={modeColor(a.mode)} dot size="sm">{a.mode}</Badge>
                  <Badge color={statusColor(a.status)} size="sm">{a.status}</Badge>
                  <span className="text-2xs text-brand-muted font-mono">{a.id}</span>
                </div>
                <p className="text-sm text-brand-dim mt-1">{a.description}</p>
                <div className="flex gap-4 mt-2 text-2xs text-brand-muted font-mono">
                  <span>last run: {formatRelative(a.lastRunAt)}</span>
                  <span>interval: {a.intervalSeconds}s</span>
                  {a.lastReport && (
                    <>
                      <span>decisions: {a.lastReport.decisions.length}</span>
                      <span>duration: {a.lastReport.durationMs}ms</span>
                    </>
                  )}
                  {oldErrors(a) && <span className="text-brand-red">error: {oldErrors(a)}</span>}
                </div>
              </div>

              <div className="flex flex-col gap-2 shrink-0">
                <div className="flex gap-1">
                  {(["off", "dry-run", "live"] as Mode[]).map((m) => (
                    <button
                      key={m}
                      onClick={() => setMode(a.id, m)}
                      disabled={working === `mode:${a.id}` || a.mode === m}
                      className={`px-2.5 py-1 rounded-md text-2xs font-mono transition-colors ${
                        a.mode === m
                          ? m === "live"
                            ? "bg-brand-green/20 text-brand-green border border-brand-green/40"
                            : m === "dry-run"
                            ? "bg-brand-amber/20 text-brand-amber border border-brand-amber/40"
                            : "bg-brand-surface text-brand-dim border border-brand-border"
                          : "bg-brand-surface/50 text-brand-muted hover:text-brand-text border border-brand-border"
                      } ${a.mode === m ? "" : "hover:bg-brand-surface"}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    loading={working === `run:${a.id}`}
                    onClick={() => runNow(a.id)}
                  >
                    Run now
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setExpanded(expanded === a.id ? null : a.id)}
                  >
                    {expanded === a.id ? "Collapse" : "Configure"}
                  </Button>
                </div>
              </div>
            </div>

            {expanded === a.id && (
              <div className="mt-5 pt-5 border-t border-brand-border space-y-5">
                {/* Config knobs */}
                <div>
                  <p className="text-2xs uppercase font-mono text-brand-muted mb-3">Config</p>
                  <div className="space-y-3">
                    <ConfigSlider
                      label="Action threshold"
                      value={a.config.threshold}
                      knob={a.configSpec.threshold}
                      onChange={(v) => setConfig(a.id, { threshold: v })}
                      disabled={working === `config:${a.id}`}
                    />
                    <ConfigSlider
                      label="Max actions / run"
                      value={a.config.maxActionsPerRun}
                      knob={a.configSpec.maxActionsPerRun}
                      onChange={(v) => setConfig(a.id, { maxActionsPerRun: v })}
                      disabled={working === `config:${a.id}`}
                      integer
                    />
                    {Object.entries(a.configSpec.custom ?? {}).map(([key, knob]) => (
                      <ConfigSlider
                        key={key}
                        label={knob.label ?? key}
                        value={a.config.custom[key] ?? knob.default}
                        knob={knob}
                        onChange={(v) => setConfig(a.id, { custom: { [key]: v } })}
                        disabled={working === `config:${a.id}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Recent decisions */}
                <div>
                  <p className="text-2xs uppercase font-mono text-brand-muted mb-3">Recent decisions</p>
                  {a.recentDecisions.length === 0 ? (
                    <p className="text-sm text-brand-dim">No decisions yet. Run the agent to see proposed actions.</p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-brand-muted font-mono text-2xs uppercase tracking-wider border-b border-brand-border">
                            <th className="text-left py-2">Target</th>
                            <th className="text-left py-2">Action</th>
                            <th className="text-left py-2">Conf.</th>
                            <th className="text-left py-2">Result</th>
                            <th className="text-left py-2">Reason</th>
                          </tr>
                        </thead>
                        <tbody>
                          {a.recentDecisions.slice(0, 10).map((d, idx) => (
                            <tr key={idx} className="border-b border-brand-border/30">
                              <td className="py-2 font-mono text-brand-dim">{d.targetId.slice(0, 20)}…</td>
                              <td className="py-2 font-mono text-brand-text">{d.action}</td>
                              <td className="py-2 font-mono text-brand-dim">{(d.confidence * 100).toFixed(0)}%</td>
                              <td className="py-2">
                                <Badge color={d.executed ? "green" : "muted"} size="sm">
                                  {d.executed ? "executed" : "dry-run"}
                                </Badge>
                              </td>
                              <td className="py-2 text-brand-dim">{d.reason}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>
    </AdminPageContainer>
  );
}

function oldErrors(a: AgentRow): string | null {
  if (a.status === "errored" && a.lastReport?.error) return a.lastReport.error;
  return null;
}

function ConfigSlider({
  label,
  value,
  knob,
  onChange,
  disabled,
  integer,
}: {
  label: string;
  value: number;
  knob: ConfigKnob;
  onChange: (v: number) => void;
  disabled?: boolean;
  integer?: boolean;
}) {
  const [pending, setPending] = useState(value);

  useEffect(() => { setPending(value); }, [value]);

  return (
    <div className="flex items-center gap-3">
      <label className="text-xs text-brand-dim w-48 shrink-0">{label}</label>
      <input
        type="range"
        min={knob.min}
        max={knob.max}
        step={knob.step ?? (integer ? 1 : 0.01)}
        value={pending}
        onChange={(e) => setPending(parseFloat(e.target.value))}
        onMouseUp={() => pending !== value && onChange(pending)}
        onTouchEnd={() => pending !== value && onChange(pending)}
        disabled={disabled}
        className="flex-1 accent-brand-cyan"
      />
      <span className="text-xs font-mono text-brand-cyan w-16 text-right">
        {integer ? pending.toFixed(0) : pending.toFixed(2)}
      </span>
    </div>
  );
}
