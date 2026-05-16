"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { Skeleton } from "@/components/ui/skeleton";
import { AdminPageContainer, AdminPageHeader } from "@/components/admin/admin-page-header";
import { useAdminUser } from "@/components/admin/admin-guard";

type Status = "pending" | "approved" | "rejected";

interface Submission {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  status: Status;
  proofUrl: string;
  submittedAt: string;
  reviewedAt?: string;
}

const STATUS_FILTERS: Array<{ value: Status | "all"; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

function statusColor(s: Status): "green" | "amber" | "red" {
  return s === "approved" ? "green" : s === "pending" ? "amber" : "red";
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
}

export default function AdminSubmissionsPage() {
  const user = useAdminUser();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Status | "all">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState<string | null>(null);
  const [detailSub, setDetailSub] = useState<Submission | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    params.set("perPage", "100");
    const res = await fetch(`/api/v1/submissions?${params}`, { credentials: "include" });
    const json = await res.json();
    if (json.success) {
      let list: Submission[] = json.data?.submissions ?? [];
      if (search) {
        const s = search.toLowerCase();
        list = list.filter(
          (sub) =>
            sub.id.toLowerCase().includes(s) ||
            sub.campaignId.toLowerCase().includes(s) ||
            sub.userId.toLowerCase().includes(s)
        );
      }
      list.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
      setSubmissions(list);
    }
    setLoading(false);
    setSelected(new Set());
  }, [search, statusFilter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const selectAllPending = () => {
    const pending = submissions.filter((s) => s.status === "pending").map((s) => s.id);
    setSelected(new Set(pending));
  };

  const bulkReview = async (decision: "approve" | "reject") => {
    if (!user || selected.size === 0) return;
    setWorking(decision);
    const ids = Array.from(selected);
    let succeeded = 0;
    for (const id of ids) {
      try {
        const res = await fetch("/api/v1/submissions/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ submissionId: id, reviewerId: user.id, decision }),
        });
        if (res.ok) succeeded += 1;
      } catch {
        // swallow per-row error; we still try the rest
      }
    }
    setWorking(null);
    alert(`${decision === "approve" ? "Approved" : "Rejected"} ${succeeded} / ${ids.length}`);
    fetchData();
  };

  const counts = {
    total: submissions.length,
    pending: submissions.filter((s) => s.status === "pending").length,
    approved: submissions.filter((s) => s.status === "approved").length,
    rejected: submissions.filter((s) => s.status === "rejected").length,
  };

  return (
    <AdminPageContainer>
      <AdminPageHeader
        title="Submissions"
        description="Review queue with bulk actions"
        actions={
          <>
            <Button variant="outline" size="sm" onClick={fetchData}>Refresh</Button>
            <Button variant="outline" size="sm" onClick={selectAllPending} disabled={counts.pending === 0}>
              Select all pending ({counts.pending})
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Card padding="sm" borderColor="cyan">
          <Stat value={counts.total} label="Total" color="cyan" size="sm" />
        </Card>
        <Card padding="sm" borderColor="amber">
          <Stat value={counts.pending} label="Pending" color="amber" size="sm" />
        </Card>
        <Card padding="sm" borderColor="green">
          <Stat value={counts.approved} label="Approved" color="green" size="sm" />
        </Card>
        <Card padding="sm" borderColor="red">
          <Stat value={counts.rejected} label="Rejected" color="red" size="sm" />
        </Card>
      </div>

      <Card padding="md" className="mb-4">
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by submission ID, campaign ID, user ID…"
            className="flex-1 bg-brand-bg border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan"
          />
          <div className="flex gap-1 flex-wrap">
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setStatusFilter(f.value)}
                className={`px-3 py-1.5 rounded-md text-xs font-mono transition-colors ${
                  statusFilter === f.value
                    ? "bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/40"
                    : "bg-brand-surface/50 text-brand-dim hover:text-brand-text border border-brand-border"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <Card borderColor="cyan" padding="sm" className="mb-4">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-brand-text">
              {selected.size} selected
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setSelected(new Set())}>Clear</Button>
              <Button variant="success" size="sm" loading={working === "approve"} onClick={() => bulkReview("approve")}>
                Approve {selected.size}
              </Button>
              <Button variant="danger" size="sm" loading={working === "reject"} onClick={() => bulkReview("reject")}>
                Reject {selected.size}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card padding="none">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-border text-brand-muted text-2xs uppercase tracking-wider font-mono">
                <th className="w-10 px-4 py-3"></th>
                <th className="text-left px-4 py-3">Submission</th>
                <th className="text-left px-4 py-3">Campaign</th>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Submitted</th>
                <th className="text-left px-4 py-3">Proof</th>
              </tr>
            </thead>
            <tbody>
              {loading && Array.from({ length: 6 }).map((_, i) => (
                <tr key={i} className="border-b border-brand-border/50">
                  <td colSpan={7} className="px-4 py-3"><Skeleton width="w-full" height="h-4" /></td>
                </tr>
              ))}
              {!loading && submissions.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-brand-muted text-sm">No submissions match.</td></tr>
              )}
              {!loading && submissions.map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-brand-border/50 hover:bg-brand-surface/30 transition-colors cursor-pointer"
                  onClick={() => setDetailSub(s)}
                >
                  <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                    {s.status === "pending" && (
                      <input
                        type="checkbox"
                        checked={selected.has(s.id)}
                        onChange={() => toggleSelect(s.id)}
                        className="accent-brand-cyan"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3 text-2xs text-brand-text font-mono">{s.id.slice(0, 16)}…</td>
                  <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{s.campaignId.slice(0, 16)}…</td>
                  <td className="px-4 py-3 text-2xs text-brand-dim font-mono">{s.userId.slice(0, 16)}…</td>
                  <td className="px-4 py-3">
                    <Badge color={statusColor(s.status)} dot size="sm">{s.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs text-brand-dim font-mono">{formatDate(s.submittedAt)}</td>
                  <td className="px-4 py-3">
                    {s.proofUrl ? (
                      <a
                        href={s.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-cyan hover:underline font-mono"
                      >
                        view →
                      </a>
                    ) : (
                      <span className="text-2xs text-brand-muted">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {detailSub && (
        <SubmissionDrawer
          submission={detailSub}
          reviewerId={user?.id ?? ""}
          onClose={() => setDetailSub(null)}
          onReviewed={(updated) => {
            setSubmissions((prev) => prev.map((s) => (s.id === updated.id ? { ...s, ...updated } : s)));
            setDetailSub(updated);
          }}
        />
      )}
    </AdminPageContainer>
  );
}

function SubmissionDrawer({
  submission,
  reviewerId,
  onClose,
  onReviewed,
}: {
  submission: Submission;
  reviewerId: string;
  onClose: () => void;
  onReviewed: (updated: Submission) => void;
}) {
  const [note, setNote] = useState("");
  const [working, setWorking] = useState<string | null>(null);

  const review = async (decision: "approve" | "reject") => {
    if (!reviewerId) {
      alert("No reviewer id — try refreshing.");
      return;
    }
    setWorking(decision);
    try {
      const res = await fetch("/api/v1/submissions/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          submissionId: submission.id,
          reviewerId,
          decision,
          note: note || undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onReviewed({
          ...submission,
          status: decision === "approve" ? "approved" : "rejected",
          reviewedAt: new Date().toISOString(),
        });
      } else {
        alert(json.error?.message ?? "Review failed");
      }
    } catch {
      alert("Network error");
    }
    setWorking(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md bg-brand-bg border-l border-brand-border overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-brand-border flex items-center justify-between">
          <div className="min-w-0">
            <h2 className="font-heading text-lg text-brand-white italic truncate">Submission</h2>
            <p className="text-xs text-brand-muted font-mono truncate">{submission.id}</p>
          </div>
          <button onClick={onClose} className="text-brand-muted hover:text-brand-text text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 gap-3">
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Status</p>
              <Badge color={statusColor(submission.status)} dot size="md">{submission.status}</Badge>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Campaign ID</p>
              <p className="text-xs text-brand-text font-mono break-all">{submission.campaignId}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">User ID</p>
              <p className="text-xs text-brand-text font-mono break-all">{submission.userId}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Action</p>
              <p className="text-xs text-brand-text font-mono">{submission.actionId}</p>
            </div>
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Submitted</p>
              <p className="text-xs text-brand-dim font-mono">{formatDate(submission.submittedAt)}</p>
            </div>
            {submission.reviewedAt && (
              <div>
                <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Reviewed</p>
                <p className="text-xs text-brand-dim font-mono">{formatDate(submission.reviewedAt)}</p>
              </div>
            )}
            <div>
              <p className="text-2xs uppercase font-mono text-brand-muted mb-1">Proof</p>
              {submission.proofUrl ? (
                <a
                  href={submission.proofUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand-cyan hover:underline font-mono break-all"
                >
                  {submission.proofUrl}
                </a>
              ) : (
                <p className="text-xs text-brand-muted">No proof URL</p>
              )}
            </div>
          </div>

          {/* Review actions */}
          <div className="border-t border-brand-border pt-5">
            <p className="text-2xs uppercase font-mono text-brand-muted mb-2">
              {submission.status === "pending" ? "Review" : "Override prior decision"}
            </p>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note (optional, logged to audit)"
              className="w-full bg-brand-surface border border-brand-border rounded-md px-3 py-2 text-sm text-brand-text placeholder:text-brand-muted focus:outline-none focus:border-brand-cyan mb-3"
            />
            <div className="flex gap-2">
              <Button
                variant="success"
                size="sm"
                disabled={submission.status === "approved"}
                loading={working === "approve"}
                onClick={() => review("approve")}
              >
                Approve
              </Button>
              <Button
                variant="danger"
                size="sm"
                disabled={submission.status === "rejected"}
                loading={working === "reject"}
                onClick={() => review("reject")}
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
