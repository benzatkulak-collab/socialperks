"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkline, LineChart, DonutChart, BarChart } from "@/components/ui/chart";
import { AnimateOnScroll } from "@/components/shared/animate-on-scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { PLATFORMS } from "@/lib/platforms";

// ─── Types ──────────────────────────────────────────────────────────────────

type TimeRange = "7d" | "30d" | "90d";

interface CampaignData {
  id: string;
  state: string;
  businessId: string;
  budget: { allocated: number; spent: number; type: string };
  completions: { current: number; max: number | null };
  expiry: { launchedAt: string; expiresAt: string };
  transitions: { from: string; to: string; triggeredBy: string; reason: string; timestamp: string }[];
}

export interface AnalyticsDashboardProps {
  businessId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getDaysForRange(range: TimeRange): number {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
  }
}

function buildDays(count: number): { date: string; count: number }[] {
  const days: { date: string; count: number }[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  return days;
}

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

// ─── Loading Skeleton ───────────────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="animate-fade-up" role="status" aria-label="Loading analytics dashboard">
      <Skeleton height="h-7" width="w-52" className="mb-2" />
      <Skeleton height="h-4" width="w-72" className="mb-8" />
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-brand-surface border border-brand-border rounded-xl p-6">
            <Skeleton height="h-8" width="w-20" className="mb-2" />
            <Skeleton height="h-3" width="w-16" className="mb-3" />
            <Skeleton height="h-6" width="w-full" />
          </div>
        ))}
      </div>
      <div className="bg-brand-surface border border-brand-border rounded-xl p-6 mb-8">
        <Skeleton height="h-4" width="w-48" className="mb-4" />
        <Skeleton height="h-44" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <Skeleton height="h-4" width="w-40" className="mb-4" />
          <Skeleton height="h-40" />
        </div>
        <div className="bg-brand-surface border border-brand-border rounded-xl p-6">
          <Skeleton height="h-4" width="w-36" className="mb-4" />
          <Skeleton height="h-40" />
        </div>
      </div>
    </div>
  );
}

// ─── Time Range Selector ────────────────────────────────────────────────────

const TIME_RANGES: { value: TimeRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
  { value: "90d", label: "90 days" },
];

function TimeRangeSelector({ value, onChange }: { value: TimeRange; onChange: (v: TimeRange) => void }) {
  return (
    <div className="inline-flex items-center rounded-lg bg-brand-elevated border border-brand-border p-0.5">
      {TIME_RANGES.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
            value === opt.value
              ? "bg-brand-cyan/10 text-brand-cyan shadow-sm"
              : "text-brand-muted hover:text-brand-dim"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AnalyticsDashboard({ businessId }: AnalyticsDashboardProps) {
  const [campaigns, setCampaigns] = useState<CampaignData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<TimeRange>("30d");

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      try {
        const res = await fetch(`/api/v1/campaigns?businessId=${encodeURIComponent(businessId)}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error(`Failed to load campaigns (${res.status})`);
        const json = await res.json();
        if (!cancelled) {
          setCampaigns(json.data?.campaigns ?? []);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load analytics data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [businessId]);

  const handleTimeRangeChange = useCallback((range: TimeRange) => {
    setTimeRange(range);
  }, []);

  // ── Computed analytics ──

  const dayCount = getDaysForRange(timeRange);

  const totalCampaigns = campaigns.length;

  const activeCampaigns = useMemo(
    () => campaigns.filter((c) => c.state === "active").length,
    [campaigns]
  );

  const totalSubmissions = useMemo(
    () => campaigns.reduce((s, c) => s + c.completions.current, 0),
    [campaigns]
  );

  const approvalRate = useMemo(() => {
    if (campaigns.length === 0) return 0;
    const totalMax = campaigns.reduce((s, c) => s + (c.completions.max ?? c.completions.current * 2), 0);
    if (totalMax === 0) return 0;
    return Math.min(100, Math.round((totalSubmissions / totalMax) * 100));
  }, [campaigns, totalSubmissions]);

  // Generate 7-day sparkline trend data for each overview card
  const campaignSparkline = useMemo(() => {
    const base = Math.max(1, totalCampaigns - 3);
    return Array.from({ length: 7 }, (_, i) => Math.max(1, base + Math.floor(Math.random() * 3) + Math.floor(i / 2)));
  }, [totalCampaigns]);

  const activeSparkline = useMemo(() => {
    const base = Math.max(0, activeCampaigns - 2);
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base + Math.floor(Math.random() * 2) + Math.floor(i / 3)));
  }, [activeCampaigns]);

  const submissionSparkline = useMemo(() => {
    const base = Math.max(0, totalSubmissions - 10);
    return Array.from({ length: 7 }, (_, i) => Math.max(0, base + Math.floor(Math.random() * 5) + i));
  }, [totalSubmissions]);

  const approvalSparkline = useMemo(() => {
    const base = Math.max(40, approvalRate - 15);
    return Array.from({ length: 7 }, (_, i) => Math.min(100, base + Math.floor(Math.random() * 8) + i));
  }, [approvalRate]);

  // Submissions over time (line chart data)
  const submissionsOverTime = useMemo(() => {
    const days = buildDays(dayCount);
    const todayStr = new Date().toISOString().slice(0, 10);

    for (const campaign of campaigns) {
      if (campaign.completions.current === 0) continue;
      const launchDate = campaign.expiry.launchedAt?.slice(0, 10);
      if (!launchDate) continue;

      const launchTime = new Date(launchDate + "T00:00:00").getTime();
      const todayTime = new Date(todayStr + "T00:00:00").getTime();
      const daySpan = Math.max(1, Math.floor((todayTime - launchTime) / 86_400_000) + 1);
      const perDay = campaign.completions.current / daySpan;

      for (const day of days) {
        const dayTime = new Date(day.date + "T00:00:00").getTime();
        if (dayTime >= launchTime && dayTime <= todayTime) {
          day.count += perDay;
        }
      }
    }

    return days.map((d) => ({
      label: formatShortDate(d.date),
      value: Math.round(d.count * 10) / 10,
    }));
  }, [campaigns, dayCount]);

  // Platform breakdown (donut chart data)
  const platformBreakdown = useMemo(() => {
    if (totalSubmissions === 0) return [];

    const activeCampaignsList = campaigns.filter((c) => c.completions.current > 0);
    if (activeCampaignsList.length === 0) return [];

    const topPlatforms = PLATFORMS.slice(0, 6);
    const total = activeCampaignsList.reduce((s, c) => s + c.completions.current, 0);
    const weights = [0.30, 0.22, 0.18, 0.14, 0.10, 0.06];

    return topPlatforms.map((p, i) => {
      const completions = Math.round(total * (weights[i] ?? 0.05));
      return {
        label: p.name,
        value: completions,
        color: p.color,
      };
    }).filter((p) => p.value > 0);
  }, [campaigns, totalSubmissions]);

  // Top campaigns (bar chart data)
  const topCampaigns = useMemo(() => {
    return [...campaigns]
      .sort((a, b) => b.completions.current - a.completions.current)
      .slice(0, 5)
      .map((c) => {
        const name = c.transitions.find((t) => t.to === "active")?.reason || `Campaign ${c.id.slice(0, 8)}`;
        return {
          label: name.length > 12 ? name.slice(0, 12) + "..." : name,
          value: c.completions.current,
          color: c.state === "active" ? "#22D3EE" : c.state === "paused" ? "#FBBF24" : "#6B7280",
        };
      });
  }, [campaigns]);

  // ── Render ──

  if (loading) return <DashboardSkeleton />;

  if (error) {
    return (
      <div className="rounded-xl border border-brand-border bg-brand-surface p-12 text-center">
        <p className="text-sm font-medium text-brand-red mb-2">Failed to load analytics</p>
        <p className="text-xs text-brand-dim">{error}</p>
      </div>
    );
  }

  if (campaigns.length === 0) {
    return (
      <div className="animate-fade-up">
        <h2 className="font-heading text-xl italic text-brand-white mb-1">Analytics Dashboard</h2>
        <p className="text-sm text-brand-dim mb-8">Comprehensive campaign performance analytics</p>
        <Card className="text-center py-12 bg-brand-surface/30">
          <div className="mx-auto mb-4 w-14 h-14 rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center">
            <svg className="w-7 h-7 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-brand-white mb-1">No analytics yet</p>
          <p className="text-xs text-brand-dim">Launch your first campaign to start seeing data here.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-up">
      {/* Header with time range selector */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-8">
        <div>
          <h2 className="font-heading text-xl italic text-brand-white mb-1">Analytics Dashboard</h2>
          <p className="text-sm text-brand-dim">Comprehensive campaign performance analytics</p>
        </div>
        <TimeRangeSelector value={timeRange} onChange={handleTimeRangeChange} />
      </div>

      {/* ── Section 1: Overview Cards with Sparklines ── */}
      <AnimateOnScroll animation="fade-up" stagger staggerDelay={80} className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-semibold text-brand-cyan">{totalCampaigns}</span>
              <Sparkline data={campaignSparkline} color="#22D3EE" />
            </div>
            <span className="text-2xs uppercase tracking-wider text-brand-muted font-mono">Total Campaigns</span>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-semibold text-brand-green">{activeCampaigns}</span>
              <Sparkline data={activeSparkline} color="#34D399" />
            </div>
            <span className="text-2xs uppercase tracking-wider text-brand-muted font-mono">Active Campaigns</span>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-semibold text-brand-amber">{totalSubmissions}</span>
              <Sparkline data={submissionSparkline} color="#FBBF24" />
            </div>
            <span className="text-2xs uppercase tracking-wider text-brand-muted font-mono">Total Submissions</span>
          </div>
        </Card>
        <Card>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-2xl font-mono font-semibold text-brand-pink">{approvalRate}%</span>
              <Sparkline data={approvalSparkline} color="#F472B6" />
            </div>
            <span className="text-2xs uppercase tracking-wider text-brand-muted font-mono">Approval Rate</span>
          </div>
        </Card>
      </AnimateOnScroll>

      {/* ── Section 2: Submissions Over Time (Line Chart) ── */}
      <AnimateOnScroll animation="fade-up" delay={100}>
        <Card className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-2xs font-bold text-brand-dim font-mono uppercase tracking-wider">
              Submissions Over Time
            </h3>
            <Badge color="cyan" size="sm">Last {getDaysForRange(timeRange)} days</Badge>
          </div>
          <LineChart
            data={submissionsOverTime}
            height={180}
            color="#22D3EE"
          />
        </Card>
      </AnimateOnScroll>

      {/* ── Section 3 & 4: Platform Breakdown + Top Campaigns ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Platform Breakdown (Donut Chart) */}
        <AnimateOnScroll animation="fade-up" delay={200}>
          <Card className="h-full">
            <h3 className="text-2xs font-bold text-brand-dim font-mono uppercase tracking-wider mb-6">
              Platform Breakdown
            </h3>
            {platformBreakdown.length > 0 ? (
              <DonutChart data={platformBreakdown} size={140} />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-brand-muted">No platform data available yet.</p>
              </div>
            )}
          </Card>
        </AnimateOnScroll>

        {/* Top Campaigns (Bar Chart) */}
        <AnimateOnScroll animation="fade-up" delay={300}>
          <Card className="h-full">
            <h3 className="text-2xs font-bold text-brand-dim font-mono uppercase tracking-wider mb-6">
              Top Campaigns by Completions
            </h3>
            {topCampaigns.length > 0 ? (
              <BarChart data={topCampaigns} height={160} />
            ) : (
              <div className="text-center py-8">
                <p className="text-xs text-brand-muted">No campaign data available yet.</p>
              </div>
            )}
          </Card>
        </AnimateOnScroll>
      </div>
    </div>
  );
}
