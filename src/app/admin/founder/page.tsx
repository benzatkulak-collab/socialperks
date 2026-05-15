"use client";

/**
 * /admin/founder — Founder-only revenue & growth dashboard.
 *
 * Backed by GET /api/v1/admin/founder-overview, which is admin-role
 * gated server-side. The client also short-circuits and renders an
 * "admin required" notice if it sees a 403, so non-admins don't get
 * a confusing blank page.
 *
 * Refreshes every 60s automatically. Page is robots: noindex
 * (inherited from the admin layout).
 */

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface ActivityEvent {
  type: "signup" | "campaign_launched" | "subscription_started" | "subscription_canceled";
  at: string;
  label: string;
}

interface Overview {
  generatedAt: string;
  signups: { total: number; last7d: number; last30d: number };
  planMix: { free: number; starter: number; professional: number; enterprise: number };
  mrr: { current: number; prior7d: number; growth7d: number };
  activationFunnel: {
    signedUp: number;
    hadFirstCampaign: number;
    hadFirstCompletion: number;
    paid: number;
  };
  recentActivity: ActivityEvent[];
}

function dollar(n: number): string {
  return `$${n.toFixed(2).replace(/\.00$/, "")}`;
}

function pct(numerator: number, denominator: number): string {
  if (!denominator) return "—";
  return `${Math.round((numerator / denominator) * 100)}%`;
}

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const seconds = Math.max(0, Math.floor((now - then) / 1000));
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const ACTIVITY_META: Record<ActivityEvent["type"], { dot: string; label: string }> = {
  signup: { dot: "bg-brand-cyan", label: "Signup" },
  campaign_launched: { dot: "bg-brand-green", label: "Campaign" },
  subscription_started: { dot: "bg-brand-amber", label: "Subscription" },
  subscription_canceled: { dot: "bg-brand-red", label: "Cancel" },
};

export default function FounderDashboard() {
  const [data, setData] = useState<Overview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    setError(null);
    try {
      const r = await fetch("/api/v1/admin/founder-overview", {
        signal,
        credentials: "include",
      });
      if (r.status === 401 || r.status === 403) {
        setError("Admin access required to view this dashboard.");
        return;
      }
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const body = (await r.json()) as { success: boolean; data?: Overview };
      if (!body.success || !body.data) throw new Error("Bad response shape");
      setData(body.data);
    } catch (e) {
      if ((e as { name?: string })?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Failed to load overview");
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    load(ac.signal);
    const interval = setInterval(() => {
      load(); // unbatched refresh; abort isn't needed for the timer call
    }, 60_000);
    return () => {
      ac.abort();
      clearInterval(interval);
    };
  }, [load]);

  if (error) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text p-8">
        <div className="mx-auto max-w-md text-center mt-32">
          <p className="font-heading text-2xl italic text-brand-white mb-3">
            {error}
          </p>
          <p className="text-sm text-brand-dim">
            Sign in with an admin-role account to view the founder dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-brand-bg text-brand-text p-8">
        <div className="mx-auto max-w-6xl">
          <Skeleton className="h-8 w-64 mb-6" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  const mrrGrowthPositive = data.mrr.growth7d >= 0;

  return (
    <div className="min-h-screen bg-brand-bg text-brand-text p-4 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-cyan mb-1">
              Founder dashboard
            </p>
            <h1 className="font-heading text-2xl sm:text-3xl italic text-brand-white">
              Revenue & growth
            </h1>
            <p className="text-xs text-brand-muted mt-1">
              Updated {relativeTime(data.generatedAt)} · auto-refreshes every 60s
            </p>
          </div>
          <Button onClick={() => load()} variant="secondary" size="sm">
            Refresh
          </Button>
        </div>

        {/* Top stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          <Card>
            <Stat
              value={`${dollar(data.mrr.current)}/mo`}
              label="MRR"
              color="green"
            />
            <p
              className={`mt-2 text-[11px] font-mono ${
                mrrGrowthPositive ? "text-brand-green" : "text-brand-red"
              }`}
            >
              {mrrGrowthPositive ? "+" : ""}
              {dollar(data.mrr.growth7d)} last 7d
            </p>
          </Card>
          <Card>
            <Stat value={data.signups.total} label="Total signups" color="cyan" />
            <p className="mt-2 text-[11px] font-mono text-brand-cyan">
              +{data.signups.last7d} this week
            </p>
          </Card>
          <Card>
            <Stat
              value={
                data.planMix.starter + data.planMix.professional + data.planMix.enterprise
              }
              label="Paying customers"
              color="amber"
            />
          </Card>
          <Card>
            <Stat
              value={pct(
                data.planMix.starter + data.planMix.professional + data.planMix.enterprise,
                Math.max(1, data.signups.total)
              )}
              label="Free → paid conv."
              color="pink"
            />
          </Card>
        </div>

        {/* Plan mix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <Card className="lg:col-span-1">
            <p className="text-xs font-mono uppercase tracking-wide text-brand-muted mb-4">
              Plan mix
            </p>
            <div className="space-y-3">
              {(
                [
                  ["Free", data.planMix.free, "bg-brand-muted/40"],
                  ["Starter", data.planMix.starter, "bg-brand-cyan"],
                  ["Pro", data.planMix.professional, "bg-brand-green"],
                  ["Enterprise", data.planMix.enterprise, "bg-brand-amber"],
                ] as const
              ).map(([label, count, color]) => {
                const denominator = Math.max(1, data.signups.total);
                const pctValue = Math.round((count / denominator) * 100);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-brand-text">{label}</span>
                      <span className="font-mono text-brand-muted">
                        {count} · {pctValue}%
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-brand-bg/60 overflow-hidden">
                      <div
                        className={`h-full ${color} transition-all duration-500`}
                        style={{ width: `${pctValue}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Activation funnel */}
          <Card className="lg:col-span-2">
            <p className="text-xs font-mono uppercase tracking-wide text-brand-muted mb-4">
              Activation funnel
            </p>
            <div className="space-y-3">
              {(
                [
                  ["Signed up", data.activationFunnel.signedUp],
                  ["Launched ≥1 campaign", data.activationFunnel.hadFirstCampaign],
                  ["Had ≥1 completion", data.activationFunnel.hadFirstCompletion],
                  ["Paid", data.activationFunnel.paid],
                ] as const
              ).map(([label, count]) => {
                const denominator = Math.max(1, data.activationFunnel.signedUp);
                const pctValue = Math.round((count / denominator) * 100);
                return (
                  <div key={label}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-brand-text">{label}</span>
                      <span className="font-mono text-brand-muted">
                        {count} · {pctValue}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-brand-bg/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-brand-cyan via-brand-green to-brand-amber transition-all duration-500"
                        style={{ width: `${pctValue}%` }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>

        {/* Recent activity */}
        <Card>
          <p className="text-xs font-mono uppercase tracking-wide text-brand-muted mb-4">
            Recent activity
          </p>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-brand-muted py-8 text-center">
              No activity yet.
            </p>
          ) : (
            <ul className="divide-y divide-brand-border/30">
              {data.recentActivity.map((ev, i) => {
                const meta = ACTIVITY_META[ev.type];
                return (
                  <li key={`${ev.at}-${i}`} className="py-2.5 flex items-center gap-3">
                    <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
                    <span className="text-xs font-mono uppercase tracking-wide text-brand-muted w-24 shrink-0">
                      {meta.label}
                    </span>
                    <span className="text-sm text-brand-text flex-1 truncate">{ev.label}</span>
                    <span className="text-xs text-brand-muted shrink-0">
                      {relativeTime(ev.at)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
