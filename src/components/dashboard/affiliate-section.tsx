"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stat } from "@/components/ui/stat";
import { Button } from "@/components/ui/button";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AffiliateRecord {
  id: string;
  code: string;
  commissionRate: number;
  status: "active" | "paused" | "banned";
  createdAt: string;
}

interface AffiliateStats {
  code: string;
  link: string;
  status: "active" | "paused" | "banned";
  commissionRate: number;
  clicks: number;
  signups: number;
  conversions: number;
  totalEarned: number;
  pendingEarnings: number;
}

interface ReferralRow {
  id: string;
  referredUserId: string | null;
  status: "pending" | "converted";
  commissionAmount: number;
  createdAt: string;
  convertedAt: string | null;
}

interface AffiliateResponse {
  enrolled: boolean;
  affiliate?: AffiliateRecord;
  stats?: AffiliateStats;
  referrals?: ReferralRow[];
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatDollars(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function shortId(id: string | null): string {
  if (!id) return "—";
  return id.length > 12 ? `${id.slice(0, 12)}…` : id;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AffiliateSection() {
  const [data, setData] = useState<AffiliateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [enrolling, setEnrolling] = useState(false);
  const [copied, setCopied] = useState<"link" | "code" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/affiliate", {
        method: "GET",
        credentials: "include",
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to load affiliate data.");
        return;
      }
      setData(json.data as AffiliateResponse);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const enroll = useCallback(async () => {
    setEnrolling(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/affiliate", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create" }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to enroll.");
        return;
      }
      await load();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setEnrolling(false);
    }
  }, [load]);

  const copy = useCallback(async (text: string, kind: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // clipboard blocked — silently ignore
    }
  }, []);

  // ── Loading
  if (loading) {
    return (
      <Card className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-5 w-48 rounded bg-brand-border/50" />
          <div className="h-12 w-full rounded bg-brand-border/30" />
          <div className="h-32 w-full rounded bg-brand-border/20" />
        </div>
      </Card>
    );
  }

  // ── Not enrolled — opt-in CTA
  if (!data?.enrolled) {
    return (
      <Card className="p-8">
        <div className="flex items-center gap-3">
          <Badge color="cyan">New</Badge>
          <h2 className="font-heading text-xl italic text-brand-white">
            Affiliate program
          </h2>
        </div>
        <p className="mt-4 text-sm text-brand-dim leading-relaxed">
          Earn <strong className="text-brand-cyan">30% recurring</strong>{" "}
          commission for every customer you refer. No caps, paid monthly.
        </p>

        {error && (
          <p className="mt-3 rounded-md border border-brand-red/20 bg-brand-red/5 px-3 py-2 text-xs text-brand-red">
            {error}
          </p>
        )}

        <div className="mt-6">
          <Button onClick={enroll} disabled={enrolling}>
            {enrolling ? "Enrolling…" : "Get my affiliate link"}
          </Button>
        </div>
      </Card>
    );
  }

  const { affiliate, stats, referrals } = data;
  if (!affiliate || !stats) {
    // shouldn't happen, but be defensive
    return (
      <Card className="p-8">
        <p className="text-sm text-brand-red">
          Unexpected response — affiliate is enrolled but missing data.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Header card with link ──────────────────────────────────── */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <Badge color={affiliate.status === "active" ? "green" : "amber"}>
                {affiliate.status === "active" ? "Active" : affiliate.status}
              </Badge>
              <h2 className="font-heading text-xl italic text-brand-white">
                Affiliate program
              </h2>
            </div>
            <p className="mt-2 text-sm text-brand-dim">
              {Math.round(affiliate.commissionRate * 100)}% recurring · paid
              monthly
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
              Your code
            </p>
            <button
              onClick={() => copy(affiliate.code, "code")}
              className="mt-1 font-mono text-lg font-semibold tracking-widest text-brand-cyan transition-colors hover:text-brand-cyan/80"
              aria-label="Copy affiliate code"
            >
              {affiliate.code}
            </button>
            {copied === "code" && (
              <p className="text-2xs text-brand-green">Copied!</p>
            )}
          </div>
        </div>

        <div className="mt-6">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
            Share link
          </p>
          <div className="mt-2 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={stats.link}
              onFocus={(e) => e.currentTarget.select()}
              className="flex-1 truncate rounded-md border border-brand-border bg-brand-elevated/50 px-3 py-2 font-mono text-xs text-brand-text focus:border-brand-cyan focus:outline-none"
              aria-label="Your affiliate share link"
            />
            <Button
              onClick={() => copy(stats.link, "link")}
              className="whitespace-nowrap"
            >
              {copied === "link" ? "Copied!" : "Copy link"}
            </Button>
          </div>
        </div>
      </Card>

      {/* ── Stats grid ─────────────────────────────────────────────── */}
      <Card className="p-6 sm:p-8">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          <Stat label="Clicks" value={stats.clicks} color="white" size="lg" />
          <Stat
            label="Signups"
            value={stats.signups}
            color="cyan"
            size="lg"
          />
          <Stat
            label="Conversions"
            value={stats.conversions}
            color="green"
            size="lg"
          />
          <Stat
            label="Earned"
            value={formatDollars(stats.totalEarned)}
            color="green"
            size="lg"
          />
        </div>
      </Card>

      {/* ── Recent referrals ───────────────────────────────────────── */}
      <Card className="p-6 sm:p-8">
        <h3 className="font-heading text-lg italic text-brand-white">
          Recent referrals
        </h3>

        {!referrals || referrals.length === 0 ? (
          <p className="mt-4 text-sm text-brand-dim">
            No referrals yet. Share your link to get started.
          </p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-brand-border text-left font-mono text-[10px] uppercase tracking-[0.18em] text-brand-muted">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2 pr-4">Commission</th>
                  <th className="pb-2">Date</th>
                </tr>
              </thead>
              <tbody>
                {referrals.slice(0, 25).map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-brand-border/30 last:border-0"
                  >
                    <td className="py-3 pr-4 font-mono text-xs text-brand-text">
                      {shortId(r.referredUserId)}
                    </td>
                    <td className="py-3 pr-4">
                      <Badge
                        color={r.status === "converted" ? "green" : "amber"}
                      >
                        {r.status}
                      </Badge>
                    </td>
                    <td className="py-3 pr-4 font-mono text-brand-text">
                      {formatDollars(r.commissionAmount)}
                    </td>
                    <td className="py-3 text-brand-dim">
                      {formatDate(r.convertedAt ?? r.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
