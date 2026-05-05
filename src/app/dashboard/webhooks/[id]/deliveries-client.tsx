"use client";

import { Fragment, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Delivery {
  id: string;
  webhookId: string;
  eventType: string;
  status: "pending" | "delivered" | "failed" | "dead";
  statusCode: number | null;
  attempts: number;
  maxAttempts: number;
  nextRetry: string | null;
  response: string | null;
  error: string | null;
  createdAt: string;
  deliveredAt: string | null;
}

interface DeliveriesClientProps {
  webhookId: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtAbsolute(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function fmtRelative(iso: string | null): string {
  if (!iso) return "—";
  const then = new Date(iso).getTime();
  const now = Date.now();
  const diff = then - now; // future = positive
  const abs = Math.abs(diff);
  const sec = Math.floor(abs / 1000);
  const fmt = (n: number, unit: string) =>
    diff > 0 ? `in ${n}${unit}` : `${n}${unit} ago`;
  if (sec < 60) return fmt(sec, "s");
  const min = Math.floor(sec / 60);
  if (min < 60) return fmt(min, "m");
  const hr = Math.floor(min / 60);
  if (hr < 24) return fmt(hr, "h");
  const days = Math.floor(hr / 24);
  return fmt(days, "d");
}

function statusColor(s: Delivery["status"]): "green" | "amber" | "red" | "muted" {
  if (s === "delivered") return "green";
  if (s === "failed") return "amber";
  if (s === "dead") return "red";
  return "muted";
}

// ─── Component ──────────────────────────────────────────────────────────────

export function DeliveriesClient({ webhookId }: DeliveriesClientProps) {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/v1/webhooks/deliveries?webhookId=${encodeURIComponent(webhookId)}&limit=50`,
        {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
      }
      const data = await res.json();
      setDeliveries(data?.data?.deliveries ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load deliveries");
    } finally {
      setLoading(false);
    }
  }, [webhookId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleRetry = useCallback(
    async (deliveryId: string) => {
      setRetryingId(deliveryId);
      try {
        const res = await fetch(`/api/v1/webhooks/deliveries`, {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ deliveryId }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data?.error?.message ?? `HTTP ${res.status}`);
        }
        await refresh();
      } catch (e) {
        alert(e instanceof Error ? e.message : "Retry failed");
      } finally {
        setRetryingId(null);
      }
    },
    [refresh]
  );

  return (
    <main id="main-content" className="min-h-screen bg-brand-bg text-brand-text">
      <header className="border-b border-brand-border">
        <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 flex items-center justify-between">
          <Link
            href="/dashboard/webhooks"
            className="text-xs font-mono uppercase tracking-widest text-brand-dim hover:text-brand-text transition-colors"
          >
            &larr; Webhooks
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <p className="text-xs font-mono uppercase tracking-widest text-brand-cyan mb-2">
              Delivery log
            </p>
            <h1 className="font-heading text-4xl italic text-brand-white sm:text-5xl">
              Recent deliveries
            </h1>
            <p className="mt-2 text-3xs font-mono text-brand-muted">{webhookId}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void refresh()}>
            Refresh
          </Button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl border border-brand-red/30 bg-brand-red/10 p-4 text-sm text-brand-red">
            {error}
          </div>
        )}

        {loading ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-brand-dim">Loading deliveries…</p>
          </Card>
        ) : deliveries.length === 0 ? (
          <Card padding="lg" className="text-center">
            <p className="text-sm text-brand-dim">
              No deliveries yet. Trigger a test from the webhooks list, or wait
              for a real event to fire.
            </p>
          </Card>
        ) : (
          <Card padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-3xs font-mono uppercase tracking-wider text-brand-muted">
                    <th className="text-left px-4 py-3 font-medium">Event</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">HTTP</th>
                    <th className="text-left px-4 py-3 font-medium">Attempts</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                    <th className="text-left px-4 py-3 font-medium">Result</th>
                    <th className="text-right px-4 py-3 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border">
                  {deliveries.map((d) => {
                    const isOpen = expanded === d.id;
                    const canRetry = d.status === "failed" || d.status === "dead";
                    const resultText =
                      d.status === "delivered"
                        ? `delivered ${fmtRelative(d.deliveredAt)}`
                        : d.status === "failed" && d.nextRetry
                          ? `next retry ${fmtRelative(d.nextRetry)}`
                          : d.status === "dead"
                            ? "exhausted"
                            : "pending";
                    return (
                      <Fragment key={d.id}>
                        <tr
                          className="hover:bg-brand-elevated/40 cursor-pointer transition-colors"
                          onClick={() => setExpanded(isOpen ? null : d.id)}
                        >
                          <td className="px-4 py-3 font-mono text-3xs text-brand-text">
                            {d.eventType}
                          </td>
                          <td className="px-4 py-3">
                            <Badge color={statusColor(d.status)} size="sm" dot>
                              {d.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                            {d.statusCode ?? "—"}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                            {d.attempts}/{d.maxAttempts}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                            {fmtRelative(d.createdAt)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                            {resultText}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {canRetry ? (
                              <Button
                                size="sm"
                                variant="outline"
                                loading={retryingId === d.id}
                                onClick={() => {
                                  void handleRetry(d.id);
                                }}
                              >
                                Retry
                              </Button>
                            ) : (
                              <span className="text-3xs text-brand-muted font-mono">
                                {isOpen ? "▾" : "▸"}
                              </span>
                            )}
                          </td>
                        </tr>
                        {isOpen && (
                          <tr className="bg-brand-bg">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                                <div>
                                  <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted mb-1">
                                    Delivery ID
                                  </div>
                                  <div className="font-mono text-brand-dim break-all">
                                    {d.id}
                                  </div>
                                </div>
                                <div>
                                  <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted mb-1">
                                    Created at
                                  </div>
                                  <div className="font-mono text-brand-dim">
                                    {fmtAbsolute(d.createdAt)}
                                  </div>
                                </div>
                                {d.deliveredAt && (
                                  <div>
                                    <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted mb-1">
                                      Delivered at
                                    </div>
                                    <div className="font-mono text-brand-green">
                                      {fmtAbsolute(d.deliveredAt)}
                                    </div>
                                  </div>
                                )}
                                {d.nextRetry && d.status === "failed" && (
                                  <div>
                                    <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted mb-1">
                                      Next retry
                                    </div>
                                    <div className="font-mono text-brand-amber">
                                      {fmtAbsolute(d.nextRetry)}
                                    </div>
                                  </div>
                                )}
                                {d.error && (
                                  <div className="md:col-span-2">
                                    <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted mb-1">
                                      Error
                                    </div>
                                    <pre className="font-mono text-brand-amber bg-brand-surface border border-brand-border rounded p-3 overflow-x-auto whitespace-pre-wrap">
                                      {d.error}
                                    </pre>
                                  </div>
                                )}
                                {d.response && (
                                  <div className="md:col-span-2">
                                    <div className="text-3xs font-mono uppercase tracking-wider text-brand-muted mb-1">
                                      Response body
                                    </div>
                                    <pre className="font-mono text-brand-dim bg-brand-surface border border-brand-border rounded p-3 overflow-x-auto whitespace-pre-wrap max-h-48">
                                      {d.response}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </section>
    </main>
  );
}
