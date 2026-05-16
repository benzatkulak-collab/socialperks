"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/csrf-fetch";

// ─── Types (mirror the server contract from lib/agent-activity.ts) ────────

interface ActivityEvent {
  timestamp: string;
  action: string;
  description: string;
  resourceId: string | null;
  resourceTitle: string | null;
  ok: boolean;
}

interface ActivityTotals {
  campaignsCreated: number;
  submissionsCreated: number;
  submissionsApproved: number;
  submissionsRejected: number;
  otherActions: number;
}

interface AgentSummary {
  apiKeyId: string;
  agentName: string;
  active: boolean;
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  permissions: string[];
  totals: ActivityTotals;
  recent: ActivityEvent[];
}

interface AgentActivityResponse {
  agents: AgentSummary[];
  totalEvents: number;
  fromDb: boolean;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function timeAgo(iso: string): string {
  const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt).getTime() <= Date.now();
}

// ─── Component ─────────────────────────────────────────────────────────────

export function AgentActivityClient() {
  const [data, setData] = useState<AgentActivityResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    apiFetch("/api/v1/agent-activity", { signal: ac.signal })
      .then(async (res) => {
        if (res.status === 401) {
          // Bounce to login. This page is signed-in-only.
          window.location.href = `/dashboard#login?return_to=${encodeURIComponent(
            window.location.pathname
          )}`;
          return null;
        }
        const body = await res.json().catch(() => null);
        if (!res.ok || !body?.success) {
          setError(body?.error?.message ?? "Couldn't load agent activity.");
          setLoading(false);
          return null;
        }
        setData(body.data as AgentActivityResponse);
        setLoading(false);
        return null;
      })
      .catch((e: unknown) => {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setError(e instanceof Error ? e.message : "Network error.");
        setLoading(false);
      });
    return () => ac.abort();
  }, []);

  if (loading) {
    return (
      <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-8 text-center">
        <p className="text-sm text-brand-dim">Loading activity…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-brand-red/40 bg-brand-red/5 p-6"
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-red mb-2">
          Couldn&apos;t load
        </p>
        <p className="text-sm text-brand-white">{error}</p>
      </div>
    );
  }

  if (!data || data.agents.length === 0) {
    return (
      <div className="rounded-2xl border border-brand-border/40 bg-brand-surface/30 p-8 text-center">
        <p className="font-mono text-[11px] uppercase tracking-[0.15em] text-brand-muted mb-2">
          No agents yet
        </p>
        <p className="text-base text-brand-white mb-2">
          You haven&apos;t connected any AI agents.
        </p>
        <p className="text-sm text-brand-dim mb-6">
          When an agent authorizes against your business, it appears here with a
          full audit trail of every action.
        </p>
        <a
          href="/dashboard/api-keys"
          className="inline-block rounded-xl bg-brand-cyan px-5 py-2.5 text-sm font-semibold text-brand-bg hover:bg-brand-cyan/90 transition-colors"
        >
          Create an API key
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs text-brand-muted">
          {data.agents.length} agent{data.agents.length === 1 ? "" : "s"} ·{" "}
          {data.totalEvents} action{data.totalEvents === 1 ? "" : "s"} on record
        </p>
        {!data.fromDb && (
          <span className="text-[10px] font-mono text-brand-amber uppercase tracking-wide">
            in-memory log
          </span>
        )}
      </div>
      {data.agents.map((agent) => (
        <AgentCard key={agent.apiKeyId} agent={agent} />
      ))}
    </div>
  );
}

// ─── AgentCard ─────────────────────────────────────────────────────────────

function AgentCard({ agent }: { agent: AgentSummary }) {
  const expired = isExpired(agent.expiresAt);
  const inactive = !agent.active || expired;

  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${
        inactive
          ? "border-brand-border/30 bg-brand-surface/20 opacity-80"
          : "border-brand-border/50 bg-brand-surface/40"
      }`}
    >
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <h2 className="font-serif text-xl italic text-brand-white truncate">
              {agent.agentName}
            </h2>
            {!agent.active && (
              <span className="text-[10px] font-mono uppercase tracking-wide rounded-full bg-brand-red/10 text-brand-red px-2 py-0.5">
                revoked
              </span>
            )}
            {agent.active && expired && (
              <span className="text-[10px] font-mono uppercase tracking-wide rounded-full bg-brand-amber/10 text-brand-amber px-2 py-0.5">
                expired
              </span>
            )}
            {agent.active && !expired && (
              <span className="text-[10px] font-mono uppercase tracking-wide rounded-full bg-brand-green/10 text-brand-green px-2 py-0.5">
                active
              </span>
            )}
          </div>
          <p className="text-xs text-brand-muted">
            Created {timeAgo(agent.createdAt)}
            {agent.lastUsedAt ? ` · last used ${timeAgo(agent.lastUsedAt)}` : " · never used"}
            {agent.expiresAt ? ` · expires ${new Date(agent.expiresAt).toLocaleDateString("en-US")}` : ""}
          </p>
          <p className="text-xs text-brand-muted mt-1 font-mono">
            {agent.permissions.length > 0 ? agent.permissions.join(" · ") : "no permissions"}
          </p>
        </div>
      </div>

      {/* Totals row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <Stat label="Campaigns" value={agent.totals.campaignsCreated} accent="cyan" />
        <Stat label="Approved" value={agent.totals.submissionsApproved} accent="green" />
        <Stat label="Rejected" value={agent.totals.submissionsRejected} accent="red" />
        <Stat label="Other" value={agent.totals.otherActions} accent="muted" />
      </div>

      {/* Timeline */}
      {agent.recent.length > 0 ? (
        <details className="group" open={agent.recent.length <= 5}>
          <summary className="cursor-pointer list-none text-sm text-brand-cyan hover:text-brand-white transition-colors mb-3 [&::-webkit-details-marker]:hidden flex items-center justify-between">
            <span>Recent activity ({agent.recent.length})</span>
            <span
              className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-brand-border text-[10px] group-open:rotate-45 transition-transform"
              aria-hidden="true"
            >
              +
            </span>
          </summary>
          <ul className="space-y-2 mt-3 border-t border-brand-border/30 pt-3" role="list">
            {agent.recent.map((event, i) => (
              <li
                key={`${event.timestamp}-${i}`}
                className="flex items-start justify-between gap-3 rounded-lg bg-brand-bg/40 px-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="text-sm text-brand-white">
                    {event.description}
                    {event.resourceTitle && (
                      <span className="text-brand-dim">: {event.resourceTitle}</span>
                    )}
                  </p>
                  <p className="text-[10px] text-brand-muted font-mono mt-0.5">
                    {event.action}
                    {event.resourceId && !event.resourceTitle && ` · ${event.resourceId}`}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-xs text-brand-muted whitespace-nowrap">
                    {timeAgo(event.timestamp)}
                  </p>
                  {!event.ok && (
                    <p className="text-[10px] text-brand-red font-mono uppercase mt-0.5">
                      failed
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </details>
      ) : (
        <p className="text-xs text-brand-muted italic">No activity yet.</p>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: "cyan" | "green" | "red" | "muted";
}) {
  const colorClass =
    accent === "cyan"
      ? "text-brand-cyan"
      : accent === "green"
        ? "text-brand-green"
        : accent === "red"
          ? "text-brand-red"
          : "text-brand-muted";
  return (
    <div className="rounded-lg border border-brand-border/30 bg-brand-bg/40 px-3 py-2.5">
      <p className={`font-mono text-xl ${colorClass}`}>{value.toLocaleString()}</p>
      <p className="text-[10px] font-mono uppercase tracking-wide text-brand-muted mt-0.5">
        {label}
      </p>
    </div>
  );
}
