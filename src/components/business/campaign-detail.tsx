"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Stat } from "@/components/ui/stat";
import { useToast } from "@/lib/context/app-context";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { apiFetch } from "@/lib/api/csrf-fetch";

// ─── Types ──────────────────────────────────────────────────────────────────

interface CampaignSubmission {
  id: string;
  userId: string;
  userName: string;
  actionId: string;
  proofUrl: string;
  proofType: string;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  notes?: string;
}

interface CampaignActivity {
  id: string;
  type: "created" | "submission" | "approved" | "rejected" | "paused" | "resumed" | "ended" | "milestone";
  message: string;
  timestamp: string;
}

interface CampaignData {
  id: string;
  name: string;
  description: string;
  status: "active" | "paused" | "ended";
  createdAt: string;
  expiresAt?: string;
  completions: number;
  budgetCap?: number | null;
  budgetUsed?: number;
  discountValue: number;
  discountType: "pct" | "dol";
  actions: string[];
  submissions: CampaignSubmission[];
  activity: CampaignActivity[];
}

export interface CampaignDetailProps {
  campaignId: string;
  onBack: () => void;
  onEdit: () => void;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, "green" | "amber" | "red" | "muted"> = {
  active: "green",
  paused: "amber",
  ended: "muted",
};

const SUBMISSION_STATUS_COLORS: Record<string, "green" | "amber" | "red"> = {
  approved: "green",
  pending: "amber",
  rejected: "red",
};

const ACTIVITY_ICONS: Record<string, string> = {
  created: "\u2728",
  submission: "\uD83D\uDCE5",
  approved: "\u2705",
  rejected: "\u274C",
  paused: "\u23F8\uFE0F",
  resumed: "\u25B6\uFE0F",
  ended: "\uD83C\uDFC1",
  milestone: "\uD83C\uDF89",
};

function getToken(): string | undefined {
  if (typeof document === "undefined") return undefined;
  return document.cookie.match(/sp-access-token=([^;]+)/)?.[1];
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CampaignDetail({
  campaignId,
  onBack,
  onEdit,
}: CampaignDetailProps) {
  const showToast = useToast();
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

  // ── Fetch campaign data ─────────────────────────────────────────────────
  const fetchCampaign = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = getToken();
      const res = await fetch(`/api/v1/campaigns?id=${encodeURIComponent(campaignId)}`, {
        credentials: "include",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      if (!res.ok) {
        throw new Error("Failed to load campaign details.");
      }

      const json = await res.json();
      const raw = json.data?.campaign ?? json.data?.campaigns?.[0] ?? json.data;

      if (!raw || typeof raw !== "object") {
        throw new Error("Campaign not found.");
      }

      // Map API response to CampaignData
      const mapped: CampaignData = {
        id: (raw.id as string) ?? campaignId,
        name: (raw.name as string) ?? "Untitled Campaign",
        description: (raw.description as string) ?? "",
        status: ((raw.status as string) ?? "active") as CampaignData["status"],
        createdAt: (raw.createdAt as string) ?? new Date().toISOString(),
        expiresAt: raw.expiresAt as string | undefined,
        completions: (raw.completionCount as number) ?? (raw.completions as number) ?? 0,
        budgetCap: raw.budgetCap as number | null | undefined,
        budgetUsed: (raw.budgetUsed as number) ?? 0,
        discountValue: (raw.discountValue as number) ?? 0,
        discountType: ((raw.discountType as string) ?? "pct") as "pct" | "dol",
        actions: (raw.actions as string[]) ?? [],
        submissions: [],
        activity: [],
      };

      // Fetch submissions for this campaign
      try {
        const subRes = await fetch(`/api/v1/submissions?campaignId=${encodeURIComponent(campaignId)}`, {
          credentials: "include",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        if (subRes.ok) {
          const subJson = await subRes.json();
          const subs = subJson.data?.submissions ?? subJson.data ?? [];
          if (Array.isArray(subs)) {
            mapped.submissions = subs.map((s: Record<string, unknown>) => ({
              id: (s.id as string) ?? "",
              userId: (s.userId as string) ?? "",
              userName: (s.userName as string) ?? (s.influencerName as string) ?? "User",
              actionId: (s.actionId as string) ?? "",
              proofUrl: (s.proofUrl as string) ?? "",
              proofType: (s.proofType as string) ?? "url",
              status: ((s.status as string) ?? "pending") as CampaignSubmission["status"],
              submittedAt: (s.submittedAt as string) ?? (s.createdAt as string) ?? new Date().toISOString(),
              notes: s.notes as string | undefined,
            }));
          }
        }
      } catch {
        // Non-critical: submissions will just be empty
      }

      // Build activity timeline from available data
      const activities: CampaignActivity[] = [
        {
          id: "act-created",
          type: "created",
          message: "Campaign created",
          timestamp: mapped.createdAt,
        },
      ];

      // Add submission activities
      mapped.submissions.forEach((sub) => {
        activities.push({
          id: `act-sub-${sub.id}`,
          type: "submission",
          message: `${sub.userName} submitted proof`,
          timestamp: sub.submittedAt,
        });
        if (sub.status === "approved") {
          activities.push({
            id: `act-apr-${sub.id}`,
            type: "approved",
            message: `${sub.userName}'s submission approved`,
            timestamp: sub.submittedAt,
          });
        } else if (sub.status === "rejected") {
          activities.push({
            id: `act-rej-${sub.id}`,
            type: "rejected",
            message: `${sub.userName}'s submission rejected`,
            timestamp: sub.submittedAt,
          });
        }
      });

      // Sort activities by timestamp (newest first)
      activities.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      mapped.activity = activities.slice(0, 20);

      setCampaign(mapped);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to load campaign.";
      setError(msg);

      // Provide a fallback demo campaign so the UI is still usable
      setCampaign({
        id: campaignId,
        name: "Campaign",
        description: "",
        status: "active",
        createdAt: new Date().toISOString(),
        completions: 0,
        discountValue: 0,
        discountType: "pct",
        actions: [],
        submissions: [],
        activity: [
          { id: "act-created", type: "created", message: "Campaign created", timestamp: new Date().toISOString() },
        ],
      });
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => {
    fetchCampaign();
  }, [fetchCampaign]);

  // ── Campaign lifecycle actions ──────────────────────────────────────────
  const handleAction = useCallback(async (action: "pause" | "resume" | "end") => {
    if (!campaign) return;
    setActionLoading(true);
    try {
      const res = await apiFetch("/api/v1/campaigns", {
        method: "PUT",
        body: JSON.stringify({ campaignId: campaign.id, action }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error?.message ?? `Failed to ${action} campaign.`, "error", 4000);
        return;
      }

      const newStatus = action === "pause" ? "paused" : action === "resume" ? "active" : "ended";
      setCampaign(prev => prev ? { ...prev, status: newStatus as CampaignData["status"] } : prev);
      const labels = { pause: "paused", resume: "resumed", end: "ended" } as const;
      showToast(`Campaign ${labels[action]}.`, "success", 3000);
    } catch {
      showToast(`Network error. Failed to ${action} campaign.`, "error", 4000);
    } finally {
      setActionLoading(false);
      setShowEndConfirm(false);
    }
  }, [campaign, showToast]);

  // ── Submission review ───────────────────────────────────────────────────
  const handleReview = useCallback(async (submissionId: string, decision: "approve" | "reject") => {
    try {
      const res = await apiFetch("/api/v1/submissions/review", {
        method: "POST",
        body: JSON.stringify({ submissionId, decision }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        showToast(data?.error?.message ?? `Failed to ${decision} submission.`, "error", 4000);
        return;
      }

      // Optimistically update
      setCampaign(prev => {
        if (!prev) return prev;
        const newStatus = decision === "approve" ? "approved" : "rejected";
        return {
          ...prev,
          completions: decision === "approve" ? prev.completions + 1 : prev.completions,
          submissions: prev.submissions.map(s =>
            s.id === submissionId ? { ...s, status: newStatus as CampaignSubmission["status"] } : s
          ),
        };
      });

      showToast(`Submission ${decision === "approve" ? "approved" : "rejected"}.`, "success", 3000);
    } catch {
      showToast("Network error. Please try again.", "error", 4000);
    }
  }, [showToast]);

  // ── Share campaign URL ──────────────────────────────────────────────────
  const handleShare = useCallback(() => {
    const url = `${window.location.origin}/campaign/${campaignId}`;
    navigator.clipboard.writeText(url).then(
      () => showToast("Campaign URL copied to clipboard!", "success", 3000),
      () => showToast("Failed to copy URL.", "error", 3000)
    );
  }, [campaignId, showToast]);

  // ── Computed values ─────────────────────────────────────────────────────
  const approvalRate = useMemo(() => {
    if (!campaign || campaign.submissions.length === 0) return "N/A";
    const approved = campaign.submissions.filter(s => s.status === "approved").length;
    const reviewed = campaign.submissions.filter(s => s.status !== "pending").length;
    if (reviewed === 0) return "N/A";
    return `${Math.round((approved / reviewed) * 100)}%`;
  }, [campaign]);

  const budgetDisplay = useMemo(() => {
    if (!campaign) return "N/A";
    const used = campaign.budgetUsed ?? 0;
    const cap = campaign.budgetCap;
    if (cap != null && cap > 0) {
      return `$${used} / $${cap}`;
    }
    return used > 0 ? `$${used}` : "$0";
  }, [campaign]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="animate-fade-up space-y-4">
        <div className="flex items-center gap-3 mb-6">
          <Button variant="ghost" size="sm" onClick={onBack}>
            &#8592; Back
          </Button>
        </div>
        <div className="space-y-4">
          <div className="skeleton h-8 w-64 rounded-lg" />
          <div className="skeleton h-4 w-40 rounded-lg" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
          <div className="skeleton h-40 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!campaign) {
    return (
      <div className="animate-fade-up">
        <Button variant="ghost" size="sm" onClick={onBack} className="mb-4">
          &#8592; Back
        </Button>
        <Card className="text-center py-12">
          <div className="text-2xl mb-3">&#x26A0;</div>
          <div className="text-sm font-bold text-brand-text mb-1">Campaign not found</div>
          <div className="text-xs text-brand-dim">The campaign you are looking for does not exist or was removed.</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-6">
      {/* ── Back Button ───────────────────────────────────────────────── */}
      <Button variant="ghost" size="sm" onClick={onBack}>
        &#8592; Back to Campaigns
      </Button>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-heading text-2xl italic text-brand-white sm:text-3xl">
              {campaign.name}
            </h1>
            <Badge color={STATUS_COLORS[campaign.status] ?? "muted"} dot>
              {campaign.status}
            </Badge>
          </div>
          {campaign.description && (
            <p className="text-sm text-brand-dim mb-2">{campaign.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-brand-muted">
            <span>Created {new Date(campaign.createdAt).toLocaleDateString()}</span>
            {campaign.expiresAt && (
              <span>Expires {new Date(campaign.expiresAt).toLocaleDateString()}</span>
            )}
            <span className="font-mono text-brand-green">
              {campaign.discountValue}{campaign.discountType === "pct" ? "%" : "$"} perk
            </span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" onClick={handleShare}>
            Share
          </Button>
          <Button variant="outline" size="sm" onClick={onEdit}>
            Edit
          </Button>
          {campaign.status === "active" && (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleAction("pause")}
              loading={actionLoading}
            >
              Pause
            </Button>
          )}
          {campaign.status === "paused" && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleAction("resume")}
              loading={actionLoading}
            >
              Resume
            </Button>
          )}
          {campaign.status !== "ended" && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              disabled={actionLoading}
            >
              End
            </Button>
          )}
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="bg-brand-amber/10 border border-brand-amber/30 rounded-lg px-4 py-3 text-sm text-brand-amber font-medium" role="alert">
          {error} Showing cached data.
        </div>
      )}

      {/* ── Stats Row ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <Stat value={String(campaign.completions)} label="Completions" color="#34D399" />
        </Card>
        <Card>
          <Stat value={budgetDisplay} label="Budget Used" color="#22D3EE" />
        </Card>
        <Card>
          <Stat value={approvalRate} label="Approval Rate" color="#FBBF24" />
        </Card>
        <Card>
          <Stat value={String(campaign.submissions.length)} label="Submissions" color="#A78BFA" />
        </Card>
      </div>

      {/* ── Submissions Table ─────────────────────────────────────────── */}
      <Card>
        <h2 className="text-sm font-semibold text-brand-white mb-4">Submissions</h2>

        {campaign.submissions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-2xl mb-2">&#x1F4E5;</div>
            <div className="text-sm text-brand-muted">No submissions yet</div>
            <div className="text-xs text-brand-dim mt-1">Submissions will appear here as users complete campaign actions</div>
          </div>
        ) : (
          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[600px]">
              <thead>
                <tr className="border-b border-brand-border">
                  <th className="text-left text-2xs font-mono text-brand-muted uppercase tracking-wider px-6 py-2">User</th>
                  <th className="text-left text-2xs font-mono text-brand-muted uppercase tracking-wider px-3 py-2">Status</th>
                  <th className="text-left text-2xs font-mono text-brand-muted uppercase tracking-wider px-3 py-2">Date</th>
                  <th className="text-left text-2xs font-mono text-brand-muted uppercase tracking-wider px-3 py-2">Proof</th>
                  <th className="text-right text-2xs font-mono text-brand-muted uppercase tracking-wider px-6 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/50">
                {campaign.submissions.map((sub) => (
                  <tr key={sub.id} className="hover:bg-brand-elevated/30 transition-colors">
                    <td className="px-6 py-3">
                      <div className="text-sm font-medium text-brand-text">{sub.userName}</div>
                      {sub.notes && <div className="text-xs text-brand-dim mt-0.5 truncate max-w-[200px]">{sub.notes}</div>}
                    </td>
                    <td className="px-3 py-3">
                      <Badge color={SUBMISSION_STATUS_COLORS[sub.status]} size="sm">
                        {sub.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-3">
                      <span className="text-xs text-brand-dim font-mono">
                        {new Date(sub.submittedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-3 py-3">
                      {sub.proofUrl ? (
                        <a
                          href={sub.proofUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-brand-cyan hover:underline"
                        >
                          View proof &#8599;
                        </a>
                      ) : (
                        <span className="text-xs text-brand-muted">No proof</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {sub.status === "pending" ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleReview(sub.id, "approve")}
                          >
                            Approve
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReview(sub.id, "reject")}
                            className="text-brand-red hover:text-brand-red hover:bg-brand-red/10"
                          >
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-brand-dim">Reviewed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ── Activity Timeline ─────────────────────────────────────────── */}
      <Card>
        <h2 className="text-sm font-semibold text-brand-white mb-4">Activity Timeline</h2>

        {campaign.activity.length === 0 ? (
          <div className="text-center py-6 text-sm text-brand-muted">No activity recorded yet</div>
        ) : (
          <div className="space-y-0">
            {campaign.activity.map((event, idx) => (
              <div
                key={event.id}
                className="flex gap-3 py-3 relative"
              >
                {/* Timeline line */}
                {idx < campaign.activity.length - 1 && (
                  <div className="absolute left-[15px] top-[36px] bottom-0 w-px bg-brand-border" />
                )}
                {/* Icon */}
                <div className="flex-shrink-0 w-[30px] h-[30px] rounded-full bg-brand-elevated border border-brand-border flex items-center justify-center text-sm z-raised">
                  {ACTIVITY_ICONS[event.type] ?? "\u2022"}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0 pt-0.5">
                  <div className="text-sm text-brand-text">{event.message}</div>
                  <div className="text-xs text-brand-muted font-mono mt-0.5">
                    {new Date(event.timestamp).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* End Campaign Confirmation */}
      <ConfirmDialog
        open={showEndConfirm}
        title="End this campaign?"
        message="This will permanently end the campaign. No more submissions will be accepted. This action cannot be undone."
        confirmLabel="End Campaign"
        cancelLabel="Keep Running"
        variant="danger"
        onConfirm={() => handleAction("end")}
        onCancel={() => setShowEndConfirm(false)}
      />
    </div>
  );
}
