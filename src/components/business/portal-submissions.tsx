"use client";

/**
 * Business-facing submission review queue.
 *
 * Lets a business owner (role "business") see the proof their customers
 * submitted and Approve/Reject it from their own portal — previously the ONLY
 * approve/reject surface lived in the admin console (role-gated to admin), so a
 * normal SMB literally could not complete the loop without Social Perks staff.
 *
 * Approving calls POST /api/v1/submissions/review, which resolves the campaign
 * and the customer's email server-side and awards the perk + emails the magic
 * link — so the customer can redeem at /perk/[token]. The GET list endpoint is
 * tenant-scoped server-side (it only returns submissions for THIS business's
 * campaigns), and apiFetch attaches the Bearer token + CSRF token.
 */

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api/csrf-fetch";
import { track } from "@/lib/analytics";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { findAction } from "@/lib/platforms";

type SubStatus = "pending" | "approved" | "rejected" | "expired";

interface SubmissionRow {
  id: string;
  campaignId: string;
  userId: string;
  actionId: string;
  status: SubStatus;
  proofUrl: string;
  submittedAt: string;
  reviewedAt?: string | null;
  metadata?: Record<string, unknown>;
}

interface PortalSubmissionsProps {
  /** This business's campaigns, for mapping campaignId → a readable name. */
  campaigns: Array<{ id: string; name?: string }>;
  /** Reports the current pending count up to the portal (for the nav badge). */
  onPendingCount?: (n: number) => void;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusColor(s: SubStatus): "green" | "amber" | "red" | "muted" {
  if (s === "approved") return "green";
  if (s === "pending") return "amber";
  if (s === "rejected") return "red";
  return "muted";
}

/** A friendly, lightly-masked label for the customer who submitted. */
function customerLabel(row: SubmissionRow): string {
  const md = row.metadata ?? {};
  if (typeof md.name === "string" && md.name.trim()) return md.name.trim();
  if (typeof md.email === "string" && md.email.includes("@")) {
    const [user, domain] = md.email.split("@");
    return `${user.slice(0, 2)}…@${domain}`;
  }
  return "A customer";
}

export function PortalSubmissions({ campaigns, onPendingCount }: PortalSubmissionsProps) {
  const [rows, setRows] = useState<SubmissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"pending" | "all">("pending");
  const [working, setWorking] = useState<string | null>(null);
  const [toast, setToast] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const campaignName = useCallback(
    (id: string) => campaigns.find((c) => c.id === id)?.name ?? `${id.slice(0, 10)}…`,
    [campaigns],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ perPage: "100" });
      if (filter !== "all") params.set("status", filter);
      const res = await apiFetch(`/api/v1/submissions?${params.toString()}`);
      const json = await res.json();
      if (json?.success) {
        const list: SubmissionRow[] = json.data?.submissions ?? [];
        list.sort(
          (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
        );
        setRows(list);
        onPendingCount?.(list.filter((s) => s.status === "pending").length);
      } else {
        setToast({ kind: "err", msg: json?.error?.message ?? "Couldn't load submissions." });
      }
    } catch {
      setToast({ kind: "err", msg: "Couldn't load submissions — check your connection and refresh." });
    } finally {
      setLoading(false);
    }
  }, [filter, onPendingCount]);

  useEffect(() => {
    void load();
  }, [load]);

  const review = useCallback(
    async (row: SubmissionRow, decision: "approve" | "reject") => {
      setWorking(`${row.id}:${decision}`);
      setToast(null);
      try {
        const res = await apiFetch("/api/v1/submissions/review", {
          method: "POST",
          body: JSON.stringify({ submissionId: row.id, decision }),
        });
        const json = await res.json();
        if (json?.success) {
          // Activation event: a business reviewed a real customer submission —
          // the step that turns proof into a perk and drives toward redemption.
          track("submission_reviewed", { decision: decision === "approve" ? "approved" : "rejected" });
          const awarded = json.data?.perk?.calculation?.totalValue;
          setToast({
            kind: "ok",
            msg:
              decision === "approve"
                ? awarded != null
                  ? `Approved — a $${Number(awarded).toFixed(2)} perk was sent to the customer by email.`
                  : "Approved — the customer was emailed their perk."
                : "Rejected — the customer was notified.",
          });
          await load();
        } else {
          setToast({ kind: "err", msg: json?.error?.message ?? "Review failed — please try again." });
        }
      } catch {
        setToast({ kind: "err", msg: "Network error — please try again." });
      } finally {
        setWorking(null);
      }
    },
    [load],
  );

  const pendingCount = rows.filter((s) => s.status === "pending").length;

  return (
    <div className="animate-fade-up">
      <div className="flex items-start justify-between gap-4 mb-1">
        <h1 className="font-heading text-2xl italic text-brand-white sm:text-3xl">Submissions</h1>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          Refresh
        </Button>
      </div>
      <p className="text-sm text-brand-dim mb-6 sm:mb-8">
        Approve a customer&apos;s post to send them their perk. Rewards are only paid out after you
        approve — you&apos;re always in control.
      </p>

      {/* Filter toggle */}
      <div className="flex items-center gap-2 mb-5">
        {(["pending", "all"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-cyan/40 ${
              filter === f
                ? "bg-brand-cyan/10 text-brand-cyan"
                : "text-brand-dim hover:text-brand-white hover:bg-brand-elevated/50"
            }`}
          >
            {f === "pending" ? `Pending${pendingCount ? ` (${pendingCount})` : ""}` : "All"}
          </button>
        ))}
      </div>

      {/* Toast */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className={`mb-5 rounded-xl px-4 py-3 text-sm font-medium ${
            toast.kind === "ok"
              ? "bg-brand-green/10 border border-brand-green/30 text-brand-green"
              : "bg-brand-red/10 border border-brand-red/30 text-brand-red"
          }`}
        >
          {toast.msg}
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} padding="md">
              <div className="h-12 animate-pulse bg-brand-elevated/40 rounded" />
            </Card>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <Card padding="lg" className="text-center">
          <p className="text-sm text-brand-dim">
            {filter === "pending"
              ? "No submissions waiting for review. When a customer posts and submits proof from your campaign's claim page, it shows up here for you to approve."
              : "No submissions yet."}
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => {
            const action = findAction(row.actionId);
            const isPending = row.status === "pending";
            return (
              <Card key={row.id} padding="md" borderColor={isPending ? "amber" : undefined}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge color={statusColor(row.status)} dot size="sm">
                        {row.status}
                      </Badge>
                      <span className="text-xs text-brand-dim font-mono">{fmtDate(row.submittedAt)}</span>
                    </div>
                    <p className="text-sm text-brand-text">
                      <span className="font-medium">{customerLabel(row)}</span>
                      {" · "}
                      {action?.label ?? row.actionId}
                      {" · "}
                      <span className="text-brand-dim">{campaignName(row.campaignId)}</span>
                    </p>
                    {row.proofUrl ? (
                      <a
                        href={row.proofUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-brand-cyan hover:underline font-mono break-all"
                      >
                        View proof →
                      </a>
                    ) : (
                      <span className="text-xs text-brand-muted">No proof link provided</span>
                    )}
                  </div>
                  {isPending && (
                    <div className="flex gap-2 shrink-0">
                      <Button
                        variant="success"
                        size="sm"
                        loading={working === `${row.id}:approve`}
                        disabled={working !== null}
                        onClick={() => void review(row, "approve")}
                      >
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={working === `${row.id}:reject`}
                        disabled={working !== null}
                        onClick={() => void review(row, "reject")}
                      >
                        Reject
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
