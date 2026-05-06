"use client";

import { useCallback, useEffect, useState } from "react";

interface AuditEntry {
  action: string;
  actor: string;
  businessId: string | null;
  resourceId: string | null;
  ok: boolean;
  ip?: string;
  meta?: Record<string, unknown>;
  timestamp: string;
}

interface AuditResponse {
  entries: AuditEntry[];
  total: number;
  fromDb: boolean;
  pagination: { limit: number; offset: number };
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; data: AuditResponse }
  | { status: "unauthenticated" }
  | { status: "forbidden" }
  | { status: "error"; message: string };

const ACTION_PREFIXES = [
  { value: "", label: "All actions" },
  { value: "auth", label: "Authentication" },
  { value: "api_key", label: "API keys" },
  { value: "billing", label: "Billing & subscriptions" },
  { value: "submission", label: "Submissions" },
  { value: "cashback", label: "Cashback / payouts" },
  { value: "program", label: "Programs" },
  { value: "tenant", label: "Tenant access denials" },
  { value: "admin", label: "Admin reads" },
];

export function AuditClient() {
  const [state, setState] = useState<State>({ status: "idle" });
  const [actionPrefix, setActionPrefix] = useState("");
  const [actor, setActor] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [onlyFailures, setOnlyFailures] = useState(false);
  const [offset, setOffset] = useState(0);
  const limit = 50;

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const params = new URLSearchParams();
      if (actionPrefix) params.set("actionPrefix", actionPrefix);
      if (actor) params.set("actor", actor);
      if (businessId) params.set("businessId", businessId);
      if (onlyFailures) params.set("onlyFailures", "true");
      params.set("limit", String(limit));
      params.set("offset", String(offset));

      const res = await fetch(`/api/v1/admin/audit?${params.toString()}`, {
        credentials: "include",
      });
      if (res.status === 401) {
        setState({ status: "unauthenticated" });
        return;
      }
      if (res.status === 403) {
        setState({ status: "forbidden" });
        return;
      }
      const json = await res.json();
      if (!json.success) {
        setState({ status: "error", message: json.error?.message ?? `HTTP ${res.status}` });
        return;
      }
      setState({ status: "ready", data: json.data });
    } catch (e) {
      setState({ status: "error", message: e instanceof Error ? e.message : "Network error" });
    }
  }, [actionPrefix, actor, businessId, onlyFailures, offset]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    setOffset(0);
    void load();
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <form
        onSubmit={applyFilters}
        className="rounded-lg border border-brand-border bg-brand-card p-5"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-brand-text-dim mb-1.5" htmlFor="actionPrefix">
              Action category
            </label>
            <select
              id="actionPrefix"
              value={actionPrefix}
              onChange={(e) => setActionPrefix(e.target.value)}
              className="w-full bg-black/40 border border-brand-border rounded px-3 py-2 text-brand-white text-sm"
            >
              {ACTION_PREFIXES.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-brand-text-dim mb-1.5" htmlFor="actor">
              Actor (e.g. <code className="font-mono">user:abc</code>, <code className="font-mono">stripe-webhook</code>)
            </label>
            <input
              id="actor"
              type="text"
              value={actor}
              onChange={(e) => setActor(e.target.value)}
              placeholder="user:..."
              className="w-full bg-black/40 border border-brand-border rounded px-3 py-2 text-brand-white text-sm font-mono"
            />
          </div>
          <div>
            <label className="block text-xs text-brand-text-dim mb-1.5" htmlFor="businessId">
              Tenant (businessId)
            </label>
            <input
              id="businessId"
              type="text"
              value={businessId}
              onChange={(e) => setBusinessId(e.target.value)}
              placeholder="b_..."
              className="w-full bg-black/40 border border-brand-border rounded px-3 py-2 text-brand-white text-sm font-mono"
            />
          </div>
          <div className="flex items-end">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={onlyFailures}
                onChange={(e) => setOnlyFailures(e.target.checked)}
              />
              <span className="text-brand-text">Only failures (ok = false)</span>
            </label>
          </div>
        </div>
        <div className="mt-4 flex gap-2">
          <button
            type="submit"
            className="px-4 py-2 bg-brand-cyan text-black font-medium rounded hover:bg-brand-cyan/90 text-sm"
          >
            Apply filters
          </button>
          <button
            type="button"
            onClick={() => {
              setActionPrefix("");
              setActor("");
              setBusinessId("");
              setOnlyFailures(false);
              setOffset(0);
            }}
            className="px-4 py-2 border border-brand-border text-brand-text rounded hover:bg-brand-elevated text-sm"
          >
            Clear
          </button>
        </div>
      </form>

      {/* Status / data area */}
      {state.status === "loading" && (
        <p className="text-brand-text-dim text-sm">Loading…</p>
      )}

      {state.status === "unauthenticated" && (
        <div className="rounded-lg border border-brand-border bg-brand-card p-6">
          <p className="text-brand-text mb-3">Sign in as an admin to view audit logs.</p>
          <a
            href="/dashboard"
            className="inline-block px-4 py-2 bg-brand-cyan text-black font-medium rounded"
          >
            Go to dashboard
          </a>
        </div>
      )}

      {state.status === "forbidden" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-6">
          <p className="text-red-300 mb-2 font-medium">Admin role required</p>
          <p className="text-sm text-red-200/80">
            This view is restricted to users with the <code>admin</code> role.
            Your access attempt has been logged.
          </p>
        </div>
      )}

      {state.status === "error" && (
        <div className="rounded-lg border border-red-500/40 bg-red-500/5 p-6">
          <p className="text-red-300">Couldn&apos;t load audit log: {state.message}</p>
          <button
            onClick={() => void load()}
            className="mt-3 text-sm text-red-200 underline hover:text-red-100"
          >
            Retry
          </button>
        </div>
      )}

      {state.status === "ready" && (
        <div className="space-y-4">
          <div className="flex items-baseline justify-between text-sm">
            <p className="text-brand-text-dim">
              {state.data.total.toLocaleString()} entries match · showing{" "}
              {state.data.entries.length} starting at offset {offset}
            </p>
            <p className="text-xs text-brand-text-dim font-mono">
              source: {state.data.fromDb ? "postgres" : "in-memory ring buffer"}
            </p>
          </div>

          <div className="rounded-lg border border-brand-border overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-brand-card">
                <tr className="border-b border-brand-border">
                  <Th>When</Th>
                  <Th>Action</Th>
                  <Th>Actor</Th>
                  <Th>Tenant</Th>
                  <Th>Resource</Th>
                  <Th>OK</Th>
                  <Th>IP</Th>
                </tr>
              </thead>
              <tbody>
                {state.data.entries.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-6 text-center text-brand-text-dim">
                      No entries match your filters.
                    </td>
                  </tr>
                )}
                {state.data.entries.map((e, i) => (
                  <tr
                    key={`${e.timestamp}-${i}`}
                    className="border-b border-brand-border last:border-0"
                  >
                    <Td className="font-mono text-xs text-brand-text-dim whitespace-nowrap">
                      {new Date(e.timestamp).toLocaleString()}
                    </Td>
                    <Td className="font-mono text-xs text-brand-cyan">{e.action}</Td>
                    <Td className="font-mono text-xs">{e.actor}</Td>
                    <Td className="font-mono text-xs">{e.businessId ?? "—"}</Td>
                    <Td className="font-mono text-xs">{e.resourceId ?? "—"}</Td>
                    <Td>
                      {e.ok ? (
                        <span className="text-emerald-400">✓</span>
                      ) : (
                        <span className="text-red-400">✗</span>
                      )}
                    </Td>
                    <Td className="font-mono text-xs">{e.ip ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-3 py-1.5 border border-brand-border text-brand-text rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              ← Previous
            </button>
            <p className="text-xs text-brand-text-dim font-mono">
              {offset + 1}–{offset + state.data.entries.length} of {state.data.total}
            </p>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + state.data.entries.length >= state.data.total}
              className="px-3 py-1.5 border border-brand-border text-brand-text rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left p-3 font-medium text-brand-text-dim text-xs uppercase tracking-wide">
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`p-3 align-top ${className}`}>{children}</td>;
}
