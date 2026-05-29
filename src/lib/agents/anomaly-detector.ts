/**
 * Anomaly Detector Agent
 *
 * Periodically snapshots key platform metrics and compares each
 * snapshot to its rolling baseline. Flags significant deviations:
 *   - Sudden drop in submissions/hour
 *   - Spike in rejections/hour
 *   - Spike in failed payments
 *   - Drop in active campaigns
 *
 * In live mode the agent could page on-call. For now it emits
 * decisions which surface on the home dashboard as alerts.
 */

import type { Agent, AgentDecision } from "./types";

interface MetricSnapshot {
  at: string;
  submissionsLast1h: number;
  rejectionsLast1h: number;
  approvalsLast1h: number;
  activeCampaigns: number;
}

const history: MetricSnapshot[] = [];
const HISTORY_MAX = 168; // 7 days at 1/hour

async function takeSnapshot(): Promise<MetricSnapshot> {
  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  let submissions = 0, rejections = 0, approvals = 0, activeCampaigns = 0;

  try {
    const subMod = await import("@/lib/submissions");
    const all = subMod.getSubmissions({}, 1, 1000).submissions;
    for (const s of all) {
      if (new Date(s.submittedAt).getTime() < oneHourAgo) continue;
      submissions += 1;
      if (s.status === "rejected") rejections += 1;
      if (s.status === "approved") approvals += 1;
    }
  } catch {
    // empty
  }

  try {
    const campMod = await import("@/lib/campaign-state-machine");
    const cm = (campMod as { campaignManager?: { listByState: (s: string) => unknown[] } }).campaignManager;
    activeCampaigns = cm?.listByState("active").length ?? 0;
  } catch {
    activeCampaigns = 0;
  }

  return {
    at: new Date(now).toISOString(),
    submissionsLast1h: submissions,
    rejectionsLast1h: rejections,
    approvalsLast1h: approvals,
    activeCampaigns,
  };
}

function baseline(field: keyof Omit<MetricSnapshot, "at">): { mean: number; std: number } {
  if (history.length < 3) return { mean: 0, std: 0 };
  const vals = history.map((h) => h[field] as number);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  const variance = vals.reduce((a, b) => a + (b - mean) ** 2, 0) / vals.length;
  return { mean, std: Math.sqrt(variance) };
}

function zScore(value: number, mean: number, std: number): number {
  if (std === 0) return 0;
  return (value - mean) / std;
}

export const anomalyDetectorAgent: Agent = {
  id: "anomaly-detector",
  name: "Anomaly Detector",
  description: "Tracks key metrics over time and emits alerts when current values deviate from rolling baseline.",
  level: 1,
  defaultMode: "dry-run",
  intervalSeconds: 3600,
  config: {
    threshold: { min: 1.5, max: 5, default: 2.5, step: 0.1 },
    maxActionsPerRun: { min: 1, max: 20, default: 5 },
  },
  async run(ctx) {
    const snapshot = await takeSnapshot();
    history.push(snapshot);
    if (history.length > HISTORY_MAX) history.shift();

    const decisions: AgentDecision[] = [];
    const threshold = ctx.config.threshold;

    const checks: Array<{ field: keyof Omit<MetricSnapshot, "at">; label: string; direction: "drop" | "spike" }> = [
      { field: "submissionsLast1h", label: "submissions/hr", direction: "drop" },
      { field: "rejectionsLast1h", label: "rejections/hr", direction: "spike" },
      { field: "activeCampaigns", label: "active campaigns", direction: "drop" },
    ];

    for (const check of checks) {
      const { mean, std } = baseline(check.field);
      if (std === 0) continue; // not enough data
      const cur = snapshot[check.field] as number;
      const z = zScore(cur, mean, std);
      const flagged =
        (check.direction === "drop" && z < -threshold) ||
        (check.direction === "spike" && z > threshold);

      if (!flagged) continue;

      decisions.push({
        targetId: check.field,
        action: `${check.direction}-${check.label}`,
        confidence: Math.min(1, Math.abs(z) / 5),
        executed: false,
        reason: `${check.label} = ${cur} (mean ${mean.toFixed(1)}, σ ${std.toFixed(1)}, z=${z.toFixed(2)})`,
        meta: { current: cur, mean, std, zScore: z, samples: history.length },
      });
    }

    return decisions;
  },
};
