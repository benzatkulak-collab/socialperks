"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";

interface Referral {
  id: string;
  referrerId?: string;
  refereeEmail?: string;
  status?: string;
  signedUpAt?: string;
  rewardCents?: number;
}

interface ReferralResponse {
  code: string;
  link: string;
  stats: { uses: number; clicks: number; signups: number };
  referrals: Referral[];
}

function formatDate(iso?: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function AdminReferralsPage() {
  const [data, setData] = useState<ReferralResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/v1/referrals", { credentials: "include" });
    const json = await res.json();
    if (json.success) setData(json.data);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Referrals"
        description="Referral program activity, leaderboards, suspicious patterns"
        actions={<Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>}
      />

      {loading && <Skeleton width="w-full" height="h-32" />}

      {!loading && data && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            <Card padding="sm" borderColor="cyan">
              <Stat value={data.stats.clicks} label="Clicks" color="cyan" size="sm" />
            </Card>
            <Card padding="sm" borderColor="amber">
              <Stat value={data.stats.signups} label="Signups" color="amber" size="sm" />
            </Card>
            <Card padding="sm" borderColor="green">
              <Stat value={data.stats.uses} label="Conversions" color="green" size="sm" />
            </Card>
            <Card padding="sm" borderColor="purple">
              <Stat
                value={data.stats.clicks > 0 ? `${((data.stats.signups / data.stats.clicks) * 100).toFixed(1)}%` : "—"}
                label="CVR (signup/click)"
                color="purple"
                size="sm"
              />
            </Card>
          </div>

          <Card padding="md" className="mb-6">
            <div className="flex flex-col md:flex-row gap-3 items-start md:items-center">
              <span className="text-2xs uppercase font-mono text-brand-muted">Your admin code</span>
              <code className="text-sm text-brand-cyan font-mono">{data.code}</code>
              <span className="text-2xs uppercase font-mono text-brand-muted md:ml-4">Link</span>
              <code className="text-xs text-brand-dim font-mono break-all">{data.link}</code>
            </div>
          </Card>

          <Card padding="none">
            <div className="px-4 py-3 border-b border-brand-border">
              <span className="text-xs text-brand-muted font-mono uppercase tracking-wider">Recent referrals</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                    <th className="text-left px-4 py-3">ID</th>
                    <th className="text-left px-4 py-3">Referee</th>
                    <th className="text-left px-4 py-3">Status</th>
                    <th className="text-left px-4 py-3">Signed Up</th>
                    <th className="text-left px-4 py-3">Reward</th>
                  </tr>
                </thead>
                <tbody>
                  {data.referrals.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-brand-muted text-sm">No referrals yet.</td></tr>
                  )}
                  {data.referrals.map((r) => (
                    <tr key={r.id} className="border-b border-brand-border/50">
                      <td className="px-4 py-3 text-xs text-brand-text font-mono">{r.id.slice(0, 16)}…</td>
                      <td className="px-4 py-3 text-xs text-brand-text font-mono">{r.refereeEmail ?? "—"}</td>
                      <td className="px-4 py-3">
                        <Badge
                          color={r.status === "completed" ? "green" : r.status === "pending" ? "amber" : "muted"}
                          size="sm"
                        >
                          {r.status ?? "—"}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(r.signedUpAt)}</td>
                      <td className="px-4 py-3 text-xs text-brand-text font-mono">
                        {r.rewardCents !== undefined ? `$${(r.rewardCents / 100).toFixed(2)}` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </AdminPageContainer>
  );
}
