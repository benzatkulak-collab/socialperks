"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { SkeletonCard } from "@/components/ui/skeleton";
import { useAdminUser } from "@/components/admin/admin-guard";
import { useLivePoll } from "@/components/admin/use-live-poll";
import { LiveIndicator } from "@/components/admin/live-indicator";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Campaign {
  id: string;
  campaignId?: string;
  businessId: string;
  name?: string;
  state: string;
  completions?: number;
  maxCompletions?: number | null;
  launchedAt?: string;
}

interface Submission {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  status: string;
  proofUrl: string;
  submittedAt: string;
  reviewedAt?: string;
}

interface HealthData {
  status: string;
  timestamp: string;
  uptimeSeconds: number;
  node: string;
  memory: {
    heapUsedMB: number;
    rssMB: number;
  };
}

interface AdminStats {
  users: {
    total: number;
    businesses: number;
    enterprises: number;
    influencers: number;
    admins: number;
  };
  security: {
    auditFailures24h: number;
    recentAudit: Array<{
      id: string;
      action: string;
      actor: string;
      ok: boolean;
      occurredAt: string;
      resourceId?: string | null;
    }>;
  };
}

interface AgentSummary {
  id: string;
  name: string;
  mode: "off" | "dry-run" | "live";
  status: "idle" | "running" | "errored";
  lastRunAt: string | null;
  lastReport: { decisions: Array<{ targetId: string; action: string; executed: boolean; confidence: number; reason: string }> } | null;
  recentDecisions: Array<{ targetId: string; action: string; executed: boolean; confidence: number; reason: string; runAt?: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const parts: string[] = [];
  if (d > 0) parts.push(`${d}d`);
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  parts.push(`${s}s`);
  return parts.join(" ");
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusBadgeColor(status: string): "green" | "amber" | "red" | "muted" | "cyan" {
  switch (status) {
    case "active":
    case "approved":
      return "green";
    case "pending":
    case "paused":
      return "amber";
    case "rejected":
    case "ended":
    case "expired":
      return "red";
    case "draft":
      return "cyan";
    default:
      return "muted";
  }
}

// ─── Dashboard Sections ─────────────────────────────────────────────────────

function OverviewCards({
  campaigns,
  submissions,
  health,
}: {
  campaigns: Campaign[];
  submissions: Submission[];
  health: HealthData | null;
}) {
  const active = campaigns.filter((c) => c.state === "active").length;
  const paused = campaigns.filter((c) => c.state === "paused").length;
  const ended = campaigns.filter((c) => c.state === "ended" || c.state === "expired").length;

  const pending = submissions.filter((s) => s.status === "pending").length;
  const approved = submissions.filter((s) => s.status === "approved").length;
  const rejected = submissions.filter((s) => s.status === "rejected").length;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card borderColor="cyan" padding="md">
        <Stat value={campaigns.length} label="Total Campaigns" color="cyan" size="lg" />
        <div className="flex gap-3 mt-3">
          <Badge color="green" dot size="sm">{active} active</Badge>
          <Badge color="amber" dot size="sm">{paused} paused</Badge>
          <Badge color="red" dot size="sm">{ended} ended</Badge>
        </div>
      </Card>

      <Card borderColor="purple" padding="md">
        <Stat value={submissions.length} label="Total Submissions" color="purple" size="lg" />
        <div className="flex gap-3 mt-3">
          <Badge color="amber" dot size="sm">{pending} pending</Badge>
          <Badge color="green" dot size="sm">{approved} approved</Badge>
          <Badge color="red" dot size="sm">{rejected} rejected</Badge>
        </div>
      </Card>

      <Card borderColor={health?.status === "ok" ? "green" : "red"} padding="md">
        <Stat
          value={health?.status === "ok" ? "Healthy" : "Unknown"}
          label="System Health"
          color={health?.status === "ok" ? "green" : "red"}
          size="lg"
        />
        <div className="flex gap-3 mt-3">
          {health ? (
            <>
              <Badge color="green" dot size="sm">{health.node}</Badge>
              <Badge color="muted" size="sm">{formatUptime(health.uptimeSeconds)}</Badge>
            </>
          ) : (
            <Badge color="red" dot size="sm">unavailable</Badge>
          )}
        </div>
      </Card>
    </div>
  );
}

function RecentSubmissionsTable({
  submissions,
  reviewing,
  onReview,
}: {
  submissions: Submission[];
  reviewing: string | null;
  onReview: (id: string, decision: "approve" | "reject") => void;
}) {
  const recent = [...submissions]
    .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
    .slice(0, 20);

  if (recent.length === 0) {
    return (
      <Card padding="md">
        <p className="text-brand-muted text-sm">No submissions found.</p>
      </Card>
    );
  }

  return (
    <Card padding="none">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
              <th className="text-left px-4 py-3">ID</th>
              <th className="text-left px-4 py-3">Campaign</th>
              <th className="text-left px-4 py-3">User</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Submitted</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((sub) => (
              <tr
                key={sub.id}
                className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors"
              >
                <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                  {sub.id.slice(0, 12)}...
                </td>
                <td className="px-4 py-3 font-mono text-xs text-brand-text">
                  {sub.campaignId.slice(0, 16)}...
                </td>
                <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                  {sub.userId.slice(0, 12)}...
                </td>
                <td className="px-4 py-3">
                  <Badge color={statusBadgeColor(sub.status)} dot size="sm">
                    {sub.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-brand-dim">
                  {formatDate(sub.submittedAt)}
                </td>
                <td className="px-4 py-3 text-right">
                  {sub.status === "pending" ? (
                    <div className="flex gap-2 justify-end">
                      <Button
                        variant="success"
                        size="sm"
                        loading={reviewing === `${sub.id}-approve`}
                        disabled={reviewing !== null}
                        onClick={() => onReview(sub.id, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={reviewing === `${sub.id}-reject`}
                        disabled={reviewing !== null}
                        onClick={() => onReview(sub.id, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  ) : (
                    <span className="text-xs text-brand-muted">--</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function ActiveCampaignsList({ campaigns }: { campaigns: Campaign[] }) {
  const active = campaigns
    .filter((c) => c.state === "active")
    .sort((a, b) => (b.completions ?? 0) - (a.completions ?? 0));

  if (active.length === 0) {
    return (
      <Card padding="md">
        <p className="text-brand-muted text-sm">No active campaigns.</p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {active.slice(0, 10).map((camp) => (
        <Card key={camp.id ?? camp.campaignId} padding="sm" borderColor="green" hoverable>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-brand-text truncate">
                {camp.name || camp.campaignId || camp.id}
              </p>
              <p className="text-2xs text-brand-muted font-mono mt-0.5">
                {camp.businessId.slice(0, 16)}
              </p>
            </div>
            <Badge color="green" dot size="sm">active</Badge>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <Stat
              value={camp.completions ?? 0}
              label="Completions"
              color="cyan"
              size="sm"
            />
            {camp.maxCompletions && (
              <Stat
                value={camp.maxCompletions}
                label="Max"
                color="muted"
                size="sm"
              />
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function UsersOverview({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <Card padding="md">
        <p className="text-brand-muted text-sm">User stats unavailable.</p>
      </Card>
    );
  }
  const { users } = stats;
  return (
    <Card borderColor="cyan" padding="md">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Stat value={users.total} label="Total Users" color="cyan" size="lg" />
        <Stat value={users.businesses} label="Businesses" color="green" size="sm" />
        <Stat value={users.enterprises} label="Enterprises" color="purple" size="sm" />
        <Stat value={users.influencers} label="Influencers" color="amber" size="sm" />
        <Stat value={users.admins} label="Admins" color="red" size="sm" />
      </div>
    </Card>
  );
}

function AuditPreview({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <Card padding="md">
        <p className="text-brand-muted text-sm">Audit log unavailable.</p>
      </Card>
    );
  }
  const { recentAudit, auditFailures24h } = stats.security;

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between">
        <span className="text-xs text-brand-muted font-mono uppercase tracking-wider">
          Last 10 events
        </span>
        <Badge color={auditFailures24h > 0 ? "amber" : "green"} dot size="sm">
          {auditFailures24h} failures / 24h
        </Badge>
      </div>
      {recentAudit.length === 0 ? (
        <div className="p-4">
          <p className="text-brand-muted text-sm">No recent audit entries.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-2">When</th>
                <th className="text-left px-4 py-2">Action</th>
                <th className="text-left px-4 py-2">Actor</th>
                <th className="text-left px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentAudit.map((entry) => (
                <tr key={entry.id} className="border-b border-brand-border/50">
                  <td className="px-4 py-2 text-xs text-brand-dim font-mono">
                    {formatDate(entry.occurredAt)}
                  </td>
                  <td className="px-4 py-2 text-xs text-brand-text font-mono">
                    {entry.action}
                  </td>
                  <td className="px-4 py-2 text-xs text-brand-dim font-mono truncate max-w-[180px]">
                    {entry.actor}
                  </td>
                  <td className="px-4 py-2">
                    <Badge color={entry.ok ? "green" : "red"} dot size="sm">
                      {entry.ok ? "ok" : "failed"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function AgentFeed({ agents }: { agents: AgentSummary[] }) {
  // Flatten all recent decisions across agents, newest first.
  const all = agents
    .flatMap((a) =>
      a.recentDecisions.map((d) => ({ ...d, agentId: a.id, agentName: a.name, agentMode: a.mode }))
    )
    .sort((a, b) => (a.runAt && b.runAt ? (b.runAt.localeCompare(a.runAt)) : 0))
    .slice(0, 12);

  const liveCount = agents.filter((a) => a.mode === "live").length;
  const erroredCount = agents.filter((a) => a.status === "errored").length;

  return (
    <Card padding="none">
      <div className="px-4 py-3 border-b border-brand-border flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-brand-muted font-mono uppercase tracking-wider">
            Latest decisions
          </span>
          <Badge color="green" dot size="sm">{liveCount} live</Badge>
          <Badge color="amber" size="sm">{agents.filter((a) => a.mode === "dry-run").length} dry-run</Badge>
          {erroredCount > 0 && <Badge color="red" dot size="sm">{erroredCount} errored</Badge>}
        </div>
        <a href="/admin/agents" className="text-xs text-brand-cyan hover:underline font-mono">
          Manage agents →
        </a>
      </div>
      {all.length === 0 ? (
        <div className="p-4">
          <p className="text-brand-muted text-sm">No agent decisions yet. Run an agent or wait for the next interval.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="text-left px-4 py-2">Agent</th>
                <th className="text-left px-4 py-2">Action</th>
                <th className="text-left px-4 py-2">Target</th>
                <th className="text-left px-4 py-2">Confidence</th>
                <th className="text-left px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody>
              {all.map((d, idx) => (
                <tr key={`${d.agentId}-${idx}`} className="border-b border-brand-border/50">
                  <td className="px-4 py-2 text-xs text-brand-text">{d.agentName}</td>
                  <td className="px-4 py-2 text-xs text-brand-text font-mono">{d.action}</td>
                  <td className="px-4 py-2 text-2xs text-brand-dim font-mono truncate max-w-[200px]">{d.targetId}</td>
                  <td className="px-4 py-2 text-xs text-brand-dim font-mono">{(d.confidence * 100).toFixed(0)}%</td>
                  <td className="px-4 py-2">
                    <Badge color={d.executed ? "green" : "muted"} size="sm">
                      {d.executed ? "executed" : d.agentMode === "off" ? "off" : "dry-run"}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function QuickActions() {
  const actions: Array<{ label: string; href: string; color: "cyan" | "green" | "amber" | "purple" }> = [
    { label: "Full Audit Log", href: "/admin/audit", color: "cyan" },
    { label: "Campaigns API", href: "/api/v1/campaigns", color: "green" },
    { label: "Submissions API", href: "/api/v1/submissions", color: "amber" },
    { label: "Health", href: "/api/v1/health", color: "purple" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {actions.map((a) => (
        <a
          key={a.href}
          href={a.href}
          className="block"
          target={a.href.startsWith("/api") ? "_blank" : undefined}
          rel={a.href.startsWith("/api") ? "noopener noreferrer" : undefined}
        >
          <Card borderColor={a.color} padding="sm" hoverable>
            <p className="text-sm font-medium text-brand-text">{a.label}</p>
            <p className="text-2xs text-brand-muted font-mono mt-1 truncate">{a.href}</p>
          </Card>
        </a>
      ))}
    </div>
  );
}

function SystemInfo({ health }: { health: HealthData | null }) {
  if (!health) {
    return (
      <Card padding="md">
        <p className="text-brand-muted text-sm">System health data unavailable.</p>
      </Card>
    );
  }

  return (
    <Card borderColor="muted" padding="md">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat
          value={health.status === "ok" ? "OK" : "Error"}
          label="Status"
          color={health.status === "ok" ? "green" : "red"}
          size="sm"
        />
        <Stat
          value={formatUptime(health.uptimeSeconds)}
          label="Uptime"
          color="cyan"
          size="sm"
        />
        <Stat
          value={health.memory.heapUsedMB}
          label="Heap Used"
          suffix="MB"
          color="amber"
          size="sm"
        />
        <Stat
          value={health.memory.rssMB}
          label="RSS Memory"
          suffix="MB"
          color="orange"
          size="sm"
        />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <Badge color="muted" size="sm">Node {health.node}</Badge>
        <span className="text-2xs text-brand-muted font-mono">
          Last checked: {formatDate(health.timestamp)}
        </span>
      </div>
    </Card>
  );
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="p-8">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const user = useAdminUser();
  const [loading, setLoading] = useState(true);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Fetch Dashboard Data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsRes, submissionsRes, healthRes, statsRes, agentsRes] = await Promise.allSettled([
        fetch("/api/v1/campaigns", { credentials: "include" }),
        fetch("/api/v1/submissions", { credentials: "include" }),
        fetch("/api/v1/admin/system", { credentials: "include" }),
        fetch("/api/v1/admin/stats", { credentials: "include" }),
        fetch("/api/v1/admin/agents", { credentials: "include" }),
      ]);

      // Process campaigns
      if (campaignsRes.status === "fulfilled" && campaignsRes.value.ok) {
        const json = await campaignsRes.value.json();
        if (json.success && json.data?.campaigns) {
          setCampaigns(json.data.campaigns);
        }
      }

      // Process submissions
      if (submissionsRes.status === "fulfilled" && submissionsRes.value.ok) {
        const json = await submissionsRes.value.json();
        if (json.success && json.data?.submissions) {
          setSubmissions(json.data.submissions);
        }
      }

      // Process health
      if (healthRes.status === "fulfilled" && healthRes.value.ok) {
        const json = await healthRes.value.json();
        if (json.success && json.data) {
          setHealth(json.data);
        }
      }

      // Process admin stats (users + audit summary)
      if (statsRes.status === "fulfilled" && statsRes.value.ok) {
        const json = await statsRes.value.json();
        if (json.success && json.data) {
          setStats(json.data);
        }
      }

      // Process agents
      if (agentsRes.status === "fulfilled" && agentsRes.value.ok) {
        const json = await agentsRes.value.json();
        if (json.success && json.data?.agents) {
          setAgents(json.data.agents);
        }
      }
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Live polling — refresh every 20s while tab is focused
  const { isLive, lastTickAt, toggleLive } = useLivePoll(fetchData, 20_000);

  // ── Review Handler ──────────────────────────────────────────────────────
  const handleReview = useCallback(
    async (submissionId: string, decision: "approve" | "reject") => {
      if (!user) return;
      const reviewKey = `${submissionId}-${decision}`;
      setReviewing(reviewKey);

      try {
        const res = await fetch("/api/v1/submissions/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            submissionId,
            reviewerId: user.id,
            decision,
          }),
        });

        if (res.ok) {
          // Update the local submission state
          setSubmissions((prev) =>
            prev.map((s) =>
              s.id === submissionId ? { ...s, status: decision === "approve" ? "approved" : "rejected" } : s
            )
          );
        }
      } catch {
        // Silently handle — the UI will still show the old status
      }
      setReviewing(null);
    },
    [user]
  );

  // ── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 py-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-sm text-brand-muted">
              Platform operations overview
              {user && (
                <span className="ml-2 font-mono text-brand-dim">({user.email})</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <LiveIndicator isLive={isLive} lastTickAt={lastTickAt} onToggle={toggleLive} />
            <Button variant="outline" size="sm" onClick={fetchData}>
              Refresh
            </Button>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <Card borderColor="red" padding="sm" className="mb-6">
            <p className="text-sm text-brand-red">{error}</p>
          </Card>
        )}

        {/* Overview */}
        <section className="mb-8">
          <OverviewCards campaigns={campaigns} submissions={submissions} health={health} />
        </section>

        {/* Agent Activity Feed — autonomous operations at a glance */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            Agent Activity
          </h2>
          <AgentFeed agents={agents} />
        </section>

        {/* Users Overview */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            Users
          </h2>
          <UsersOverview stats={stats} />
        </section>

        {/* Quick Actions */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            Quick Actions
          </h2>
          <QuickActions />
        </section>

        {/* Audit Log Preview */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            Recent Audit Events
          </h2>
          <AuditPreview stats={stats} />
        </section>

        {/* Recent Submissions */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            Recent Submissions
          </h2>
          <RecentSubmissionsTable
            submissions={submissions}
            reviewing={reviewing}
            onReview={handleReview}
          />
        </section>

        {/* Active Campaigns */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            Active Campaigns
          </h2>
          <ActiveCampaignsList campaigns={campaigns} />
        </section>

        {/* System Info */}
        <section className="mb-8">
          <h2 className="font-heading text-lg text-brand-white font-medium italic mb-4">
            System Info
          </h2>
          <SystemInfo health={health} />
        </section>
      </div>
    </div>
  );
}
