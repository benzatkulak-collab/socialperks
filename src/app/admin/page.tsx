"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuthUser {
  id: string;
  email: string;
  role: string;
  businessId?: string | null;
}

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
  uptime: number;
  node: string;
  memory: {
    heapUsedMB: number;
    rssMB: number;
  };
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
              <Badge color="muted" size="sm">{formatUptime(health.uptime)}</Badge>
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
          value={formatUptime(health.uptime)}
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
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <Skeleton width="w-48" height="h-8" rounded="lg" />
          <div className="mt-2">
            <Skeleton width="w-72" height="h-4" rounded="md" />
          </div>
        </div>

        {/* Overview cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>

        {/* Table skeleton */}
        <div className="mb-8">
          <Skeleton width="w-48" height="h-6" rounded="md" className="mb-4" />
          <Card padding="none">
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton width="w-24" height="h-4" />
                  <Skeleton width="w-32" height="h-4" />
                  <Skeleton width="w-20" height="h-4" />
                  <Skeleton width="w-16" height="h-5" rounded="full" />
                  <Skeleton width="w-28" height="h-4" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Campaign list skeleton */}
        <div className="mb-8">
          <Skeleton width="w-40" height="h-6" rounded="md" className="mb-4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Access Denied ──────────────────────────────────────────────────────────

function AccessDenied() {
  return (
    <div className="min-h-screen bg-brand-bg flex items-center justify-center">
      <Card padding="lg" borderColor="red" className="max-w-md w-full text-center">
        <div className="text-4xl mb-4">&#x26D4;</div>
        <h1 className="font-heading text-xl text-brand-white font-semibold mb-2">
          Access Denied
        </h1>
        <p className="text-brand-muted text-sm mb-4">
          You must be logged in with an enterprise or admin role to access the admin dashboard.
        </p>
        <Badge color="red" size="md">Insufficient Permissions</Badge>
      </Card>
    </div>
  );
}

// ─── Main Dashboard ─────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [loading, setLoading] = useState(true);
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [health, setHealth] = useState<HealthData | null>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Auth Check ──────────────────────────────────────────────────────────
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch("/api/v1/auth", { credentials: "include" });
        if (!res.ok) {
          setAuthorized(false);
          setAuthChecked(true);
          return;
        }
        const json = await res.json();
        if (json.success && json.data?.user) {
          const role = json.data.user.role;
          const isAllowed = role === "enterprise" || role === "admin";
          setAuthorized(isAllowed);
          setUser(json.data.user);
        } else {
          setAuthorized(false);
        }
      } catch {
        setAuthorized(false);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  // ── Fetch Dashboard Data ────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [campaignsRes, submissionsRes, healthRes] = await Promise.allSettled([
        fetch("/api/v1/campaigns", { credentials: "include" }),
        fetch("/api/v1/submissions", { credentials: "include" }),
        fetch("/api/v1/health", { credentials: "include" }),
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
    } catch {
      setError("Failed to load dashboard data. Please try again.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authChecked && authorized) {
      fetchData();
    }
  }, [authChecked, authorized, fetchData]);

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

  if (!authChecked) {
    return <DashboardSkeleton />;
  }

  if (!authorized) {
    return <AccessDenied />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-heading text-2xl text-brand-white font-semibold italic">
              Admin Dashboard
            </h1>
            <p className="text-sm text-brand-muted mt-1">
              Platform operations overview
              {user && (
                <span className="ml-2 font-mono text-brand-dim">
                  ({user.email})
                </span>
              )}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData}>
            Refresh
          </Button>
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
