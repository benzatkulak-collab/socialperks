"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface Subscriber {
  id: string;
  email: string;
  source: string;
  subscribedAt: string;
  confirmed: boolean;
}

interface ApiPayload {
  count: number;
  breakdown: Record<string, number>;
  subscribers: Subscriber[];
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toCsv(subs: Subscriber[]): string {
  const header = "id,email,source,subscribedAt,confirmed";
  const rows = subs.map((s) => {
    // Escape any commas/quotes in fields per RFC 4180
    const cells = [s.id, s.email, s.source, s.subscribedAt, String(s.confirmed)];
    return cells
      .map((c) => {
        const needsQuote = /[",\n]/.test(c);
        const escaped = c.replace(/"/g, '""');
        return needsQuote ? `"${escaped}"` : escaped;
      })
      .join(",");
  });
  return [header, ...rows].join("\n");
}

export default function AdminNewsletterPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [authorized, setAuthorized] = useState(false);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ApiPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Auth Check (mirror /admin pattern) ────────────────────────────────
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
        const role = json?.data?.user?.role;
        setAuthorized(role === "admin");
      } catch {
        setAuthorized(false);
      }
      setAuthChecked(true);
    }
    checkAuth();
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/newsletter", {
        credentials: "include",
      });
      if (!res.ok) {
        setError(`Failed to load (HTTP ${res.status}).`);
        setLoading(false);
        return;
      }
      const json = await res.json();
      if (json?.success && json.data) {
        setData(json.data as ApiPayload);
      } else {
        setError(json?.error?.message ?? "Failed to load subscribers.");
      }
    } catch {
      setError("Network error loading subscribers.");
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (authChecked && authorized) fetchData();
  }, [authChecked, authorized, fetchData]);

  const breakdownEntries = useMemo(
    () =>
      data
        ? Object.entries(data.breakdown).sort((a, b) => b[1] - a[1])
        : [],
    [data]
  );

  function handleExport() {
    if (!data) return;
    const csv = toCsv(data.subscribers);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ── Render ────────────────────────────────────────────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-brand-bg p-8 text-brand-dim">
        Checking access&hellip;
      </div>
    );
  }

  if (!authorized) {
    return (
      <div className="min-h-screen bg-brand-bg p-8">
        <div className="mx-auto max-w-md">
          <Card padding="md">
            <h1 className="font-heading text-2xl italic text-brand-white">
              Admin access required
            </h1>
            <p className="mt-2 text-sm text-brand-dim">
              You need an admin account to view newsletter subscribers.
            </p>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm text-brand-cyan hover:underline"
              >
                &larr; Back to home
              </Link>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-brand-bg">
      <header className="border-b border-brand-border/50">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-wider text-brand-cyan">
              Admin
            </p>
            <h1 className="font-heading text-2xl italic text-brand-white">
              Newsletter Subscribers
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={fetchData} disabled={loading} size="sm">
              {loading ? "Refreshing\u2026" : "Refresh"}
            </Button>
            <Button
              onClick={handleExport}
              disabled={!data || data.subscribers.length === 0}
              size="sm"
            >
              Export CSV
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8 space-y-8">
        {error && (
          <Card borderColor="red" padding="md">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {/* Overview */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card borderColor="cyan" padding="md">
            <Stat
              value={data?.count ?? 0}
              label="Total Subscribers"
              color="cyan"
              size="lg"
            />
          </Card>
          <Card borderColor="green" padding="md">
            <Stat
              value={breakdownEntries.length}
              label="Sources Tracked"
              color="green"
              size="lg"
            />
          </Card>
          <Card borderColor="purple" padding="md">
            <Stat
              value={data?.subscribers.length ?? 0}
              label="Shown (last 100)"
              color="purple"
              size="lg"
            />
          </Card>
        </div>

        {/* Source breakdown */}
        <section>
          <h2 className="mb-3 font-heading text-xl italic text-brand-white">
            Sources
          </h2>
          {breakdownEntries.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-brand-muted">No subscribers yet.</p>
            </Card>
          ) : (
            <Card padding="md">
              <div className="flex flex-wrap gap-3">
                {breakdownEntries.map(([source, count]) => (
                  <div
                    key={source}
                    className="flex items-center gap-2 rounded-lg border border-brand-border/60 bg-brand-surface/40 px-3 py-2"
                  >
                    <Badge color="cyan" size="sm">
                      {source}
                    </Badge>
                    <span className="font-mono text-sm text-brand-white">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </section>

        {/* Recent signups */}
        <section>
          <h2 className="mb-3 font-heading text-xl italic text-brand-white">
            Recent Signups
          </h2>
          {!data || data.subscribers.length === 0 ? (
            <Card padding="md">
              <p className="text-sm text-brand-muted">No subscribers yet.</p>
            </Card>
          ) : (
            <Card padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                      <th className="text-left px-4 py-3">Email</th>
                      <th className="text-left px-4 py-3">Source</th>
                      <th className="text-left px-4 py-3">Subscribed</th>
                      <th className="text-left px-4 py-3">Confirmed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.subscribers.map((s) => (
                      <tr
                        key={s.id}
                        className="border-b border-brand-border/50 hover:bg-brand-surface/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-brand-white">
                          {s.email}
                        </td>
                        <td className="px-4 py-3">
                          <Badge color="cyan" size="sm">
                            {s.source}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-brand-dim">
                          {formatDate(s.subscribedAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            color={s.confirmed ? "green" : "amber"}
                            size="sm"
                          >
                            {s.confirmed ? "yes" : "pending"}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </section>
      </main>
    </div>
  );
}
