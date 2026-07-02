/**
 * Fraud Sentinel Agent
 *
 * Continuously scores users by aggregating signals across recent activity:
 *   - Submission rejection rate (rolling window)
 *   - Multiple-submissions-to-same-campaign-in-short-window
 *   - IP / device collisions across "different" users (when fingerprint
 *     data is available — placeholder for now)
 *
 * Above the `autoSuspendAbove` threshold the user is suspended (live mode
 * only). The threshold is set conservatively by default; admins should
 * inspect the dry-run log before promoting to live.
 */

import type { Agent, AgentDecision } from "./types";

interface UserRiskSignal {
  userId: string;
  totalSubmissions: number;
  rejections: number;
  approvals: number;
  pending: number;
  /** ISO timestamps of recent submission events. */
  recentTimestamps: string[];
}

async function gatherSignals(): Promise<Map<string, UserRiskSignal>> {
  const signals = new Map<string, UserRiskSignal>();
  try {
    const mod = await import("@/lib/submissions");
    const result = mod.getSubmissions({}, 1, 1000);
    for (const sub of result.submissions) {
      let entry = signals.get(sub.userId);
      if (!entry) {
        entry = {
          userId: sub.userId,
          totalSubmissions: 0,
          rejections: 0,
          approvals: 0,
          pending: 0,
          recentTimestamps: [],
        };
        signals.set(sub.userId, entry);
      }
      entry.totalSubmissions += 1;
      if (sub.status === "rejected") entry.rejections += 1;
      else if (sub.status === "approved") entry.approvals += 1;
      else if (sub.status === "pending") entry.pending += 1;
      entry.recentTimestamps.push(sub.submittedAt);
    }
  } catch {
    // No data available — nothing to do.
  }
  return signals;
}

function scoreUser(s: UserRiskSignal): { score: number; reasons: string[] } {
  const reasons: string[] = [];
  let score = 0;

  // Rejection rate (only meaningful with enough samples).
  if (s.totalSubmissions >= 5) {
    const rejectRate = s.rejections / s.totalSubmissions;
    if (rejectRate > 0.5) {
      score += 0.4;
      reasons.push(`high-reject-rate-${(rejectRate * 100).toFixed(0)}%`);
    } else if (rejectRate > 0.3) {
      score += 0.2;
      reasons.push(`elevated-reject-rate-${(rejectRate * 100).toFixed(0)}%`);
    }
  }

  // Burst behavior: >10 submissions in last hour.
  const oneHourAgo = Date.now() - 60 * 60 * 1000;
  const recentBurst = s.recentTimestamps.filter(
    (t) => new Date(t).getTime() > oneHourAgo
  ).length;
  if (recentBurst > 10) {
    score += 0.3;
    reasons.push(`burst-${recentBurst}-submissions-1h`);
  }

  // High volume overall.
  if (s.totalSubmissions > 100) {
    score += 0.1;
    reasons.push(`high-volume-${s.totalSubmissions}`);
  }

  return { score: Math.min(1, score), reasons };
}

async function suspendUser(userId: string, reason: string): Promise<boolean> {
  // The user store keys on email, not id, so we need to resolve.
  try {
    const mod = await import("@/lib/auth/user-store");
    const user = mod.getUserById(userId);
    if (!user) return false;
    // Await so the auto-suspension is durably persisted before we report
    // success — a fire-and-forget write is lost if the agent's serverless
    // invocation freezes after returning. persistUser is best-effort
    // internally (logs, never throws), so a DB hiccup won't flip this to false.
    await mod.updateUser(user.email, {
      suspendedAt: new Date().toISOString(),
      suspensionReason: `[auto] ${reason}`,
    });
    return true;
  } catch {
    return false;
  }
}

export const fraudSentinelAgent: Agent = {
  id: "fraud-sentinel",
  name: "Fraud Sentinel",
  description: "Scores users for abuse signals and auto-suspends high-risk accounts above threshold.",
  defaultMode: "dry-run",
  intervalSeconds: 300,
  config: {
    threshold: { min: 0.5, max: 0.99, default: 0.85, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 50, default: 10 },
    custom: {
      autoSuspendAbove: { label: "Auto-suspend risk-score above", min: 0.5, max: 0.99, default: 0.8, step: 0.01 },
      minSubmissionsForScoring: { label: "Min submissions before scoring", min: 1, max: 50, default: 5, step: 1 },
    },
  },
  async run(ctx) {
    const signals = await gatherSignals();
    const decisions: AgentDecision[] = [];
    const minSubs = ctx.config.custom.minSubmissionsForScoring;
    const autoSuspendAbove = ctx.config.custom.autoSuspendAbove;

    for (const sig of signals.values()) {
      if (sig.totalSubmissions < minSubs) continue;
      const { score, reasons } = scoreUser(sig);

      // Only emit a decision when the score is non-trivial; everyone else is just noise.
      if (score < 0.1) continue;

      const wouldSuspend = score >= autoSuspendAbove && score >= ctx.config.threshold;
      let executed = false;
      if (wouldSuspend && ctx.live) {
        executed = await suspendUser(sig.userId, reasons.join(", "));
      }

      decisions.push({
        targetId: sig.userId,
        action: wouldSuspend ? "suspend" : "flag",
        confidence: score,
        executed,
        reason: wouldSuspend
          ? `score=${score.toFixed(2)} crosses suspend threshold (${reasons.join(", ")})`
          : `score=${score.toFixed(2)}; flagged for review (${reasons.join(", ")})`,
        meta: {
          rejections: sig.rejections,
          approvals: sig.approvals,
          totalSubmissions: sig.totalSubmissions,
          reasons,
        },
      });
    }

    // Sort by descending score so the riskiest users surface first in the audit log.
    decisions.sort((a, b) => b.confidence - a.confidence);
    return decisions;
  },
};
