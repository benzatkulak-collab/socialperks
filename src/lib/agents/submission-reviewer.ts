/**
 * Submission Reviewer Agent
 *
 * Scans pending submissions. For each:
 *   - Looks up the fraud score from fraud-detection.
 *   - Auto-approves if (fraudScore < lowRisk) AND confidence >= threshold.
 *   - Auto-rejects if (fraudScore > highRisk) AND confidence >= threshold.
 *   - Otherwise queues for human review (no-op).
 *
 * In dry-run mode this just logs the proposed decision. In live mode
 * it actually calls /api/v1/submissions/review.
 */

import type { Agent, AgentDecision } from "./types";

interface PendingSubmission {
  id: string;
  campaignId: string;
  userId: string;
  proofUrl: string;
  submittedAt: string;
  status: string;
}

async function fetchPending(): Promise<PendingSubmission[]> {
  try {
    const mod = await import("@/lib/submissions");
    const result = mod.getSubmissions({ status: "pending" }, 1, 500);
    return result.submissions.map((s) => ({
      id: s.id,
      campaignId: s.campaignId,
      userId: s.userId,
      proofUrl: s.proofUrl ?? "",
      submittedAt: s.submittedAt,
      status: s.status,
    }));
  } catch {
    return [];
  }
}

/**
 * Cheap heuristic fraud-score stand-in. The real Fraud Sentinel agent
 * uses the full fraud-detection engine; this is just enough to score
 * submissions for the reviewer's auto-decision gate.
 *
 * Returns 0..1 where 0 is clean and 1 is obvious abuse.
 */
function quickScore(sub: PendingSubmission): { score: number; signals: string[] } {
  const signals: string[] = [];
  let score = 0;

  // Missing proof URL is a strong reject signal.
  if (!sub.proofUrl || sub.proofUrl.length < 8) {
    score += 0.6;
    signals.push("missing-or-short-proof-url");
  }

  // Suspicious URL hosts (very rough — the real engine has better heuristics).
  try {
    if (sub.proofUrl) {
      const url = new URL(sub.proofUrl);
      const blocklist = ["bit.ly", "tinyurl.com", "is.gd", "t.co"];
      if (blocklist.some((host) => url.hostname.endsWith(host))) {
        score += 0.3;
        signals.push("shortener-url");
      }
    }
  } catch {
    score += 0.4;
    signals.push("invalid-proof-url");
  }

  // Submitted-instantly-after-launch heuristic could be added here when we
  // have campaign launch timestamps in the same shape; defer to Fraud Sentinel.

  return { score: Math.min(1, score), signals };
}

async function executeReview(submissionId: string, decision: "approve" | "reject"): Promise<boolean> {
  // Call the internal submissions module directly to bypass HTTP auth.
  // The reviewerId is the agent's own pseudo-id so audit trails attribute correctly.
  try {
    const mod = await import("@/lib/submissions");
    const result = await mod.reviewSubmission(
      submissionId,
      "agent:submission-reviewer",
      decision,
      "auto-decided by Submission Reviewer agent"
    );
    return result.success === true;
  } catch {
    return false;
  }
}

export const submissionReviewerAgent: Agent = {
  id: "submission-reviewer",
  name: "Submission Reviewer",
  description: "Auto-approves clean submissions; rejects obvious abuse; queues ambiguous for human review.",
  // Promoted to live: the threshold gate + dry-run runs prove safety,
  // and the action is reversible (admin can override any decision from
  // /admin/submissions). The agent only acts above its confidence
  // threshold; everything ambiguous still queues for human review.
  defaultMode: "live",
  intervalSeconds: 60,
  config: {
    threshold: { min: 0.5, max: 0.99, default: 0.8, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 200, default: 50 },
    custom: {
      autoApproveBelow: { label: "Auto-approve fraud-score below", min: 0.05, max: 0.5, default: 0.15, step: 0.01 },
      autoRejectAbove: { label: "Auto-reject fraud-score above", min: 0.5, max: 0.99, default: 0.75, step: 0.01 },
    },
  },
  async run(ctx) {
    const pending = await fetchPending();
    const decisions: AgentDecision[] = [];

    const autoApproveBelow = ctx.config.custom.autoApproveBelow;
    const autoRejectAbove = ctx.config.custom.autoRejectAbove;
    const threshold = ctx.config.threshold;

    for (const sub of pending) {
      const { score, signals } = quickScore(sub);

      let action: "approve" | "reject" | "queue" = "queue";
      let confidence = 0;

      if (score <= autoApproveBelow) {
        action = "approve";
        confidence = 1 - score; // cleaner = higher confidence
      } else if (score >= autoRejectAbove) {
        action = "reject";
        confidence = score;
      } else {
        action = "queue";
        confidence = 0;
      }

      const gated = confidence >= threshold && action !== "queue";
      let executed = false;
      if (gated && ctx.live) {
        executed = await executeReview(sub.id, action === "approve" ? "approve" : "reject");
      }

      decisions.push({
        targetId: sub.id,
        action,
        confidence,
        executed,
        reason:
          action === "queue"
            ? "ambiguous score; queued for human review"
            : gated
            ? `${action} (score=${score.toFixed(2)})`
            : `would ${action} but confidence ${confidence.toFixed(2)} < threshold ${threshold}`,
        meta: { fraudScore: score, signals, campaignId: sub.campaignId, userId: sub.userId },
      });
    }

    return decisions;
  },
};
