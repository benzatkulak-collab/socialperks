/**
 * Campaign Optimizer Agent
 *
 * Scans active campaigns. For each underperformer (low completions
 * relative to age + max), proposes an optimization:
 *   - Increase reward amount
 *   - Lower the action effort (swap to easier action)
 *   - Promote to a higher tier (more visibility)
 *
 * In dry-run, decisions are logged only. In live mode the agent
 * applies the optimization via the campaign update path.
 */

import type { Agent, AgentDecision } from "./types";

interface ActiveCampaign {
  id: string;
  campaignId?: string;
  businessId: string;
  state: string;
  completions?: number;
  maxCompletions?: number | null;
  launchedAt?: string;
  tier?: string;
}

async function fetchActive(): Promise<ActiveCampaign[]> {
  try {
    const mod = await import("@/lib/campaign-state-machine");
    // Cast through unknown — the state machine has a richer
    // CampaignLifecycle type; we only need the subset declared above.
    const cm = (mod as unknown as { campaignManager?: { listByState: (s: string) => unknown[] } }).campaignManager;
    const raw = cm?.listByState("active") ?? [];
    return raw.map((c) => {
      const r = c as Record<string, unknown>;
      const comp = r.completions;
      return {
        id: String(r.id ?? r.campaignId ?? ""),
        campaignId: r.campaignId as string | undefined,
        businessId: String(r.businessId ?? ""),
        state: String(r.state ?? "active"),
        completions: typeof comp === "number" ? comp : typeof comp === "object" && comp !== null ? (comp as { total?: number }).total ?? 0 : 0,
        maxCompletions: typeof r.maxCompletions === "number" ? r.maxCompletions : null,
        launchedAt: r.launchedAt as string | undefined,
        tier: r.tier as string | undefined,
      };
    });
  } catch {
    return [];
  }
}

function performanceScore(c: ActiveCampaign, now: number): number {
  if (!c.launchedAt) return 1; // unknown age = no signal
  const ageMs = now - new Date(c.launchedAt).getTime();
  const ageDays = ageMs / (1000 * 60 * 60 * 24);
  if (ageDays < 1) return 1; // too new to judge
  const target = c.maxCompletions ?? 100;
  const expected = (target / 30) * ageDays; // linear ramp over 30 days
  const actual = c.completions ?? 0;
  if (expected <= 0) return 1;
  return actual / expected;
}

export const campaignOptimizerAgent: Agent = {
  id: "campaign-optimizer",
  name: "Campaign Optimizer",
  description: "Identifies underperforming campaigns and proposes reward/tier/effort changes to lift completions.",
  level: 2,
  defaultMode: "dry-run",
  intervalSeconds: 3600,
  config: {
    threshold: { min: 0.5, max: 0.99, default: 0.85, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 50, default: 10 },
    custom: {
      underperformBelow: { label: "Flag campaigns performing below ratio", min: 0.1, max: 0.9, default: 0.5, step: 0.05 },
      minAgeDays: { label: "Min campaign age before flagging", min: 1, max: 14, default: 3, step: 1 },
    },
  },
  async run(ctx) {
    const campaigns = await fetchActive();
    const decisions: AgentDecision[] = [];
    const now = new Date(ctx.now).getTime();
    const underperformBelow = ctx.config.custom.underperformBelow;
    const minAgeDays = ctx.config.custom.minAgeDays;

    for (const c of campaigns) {
      if (!c.launchedAt) continue;
      const ageDays = (now - new Date(c.launchedAt).getTime()) / (1000 * 60 * 60 * 24);
      if (ageDays < minAgeDays) continue;

      const ratio = performanceScore(c, now);
      if (ratio >= underperformBelow) continue;

      // Pick an action based on how far behind.
      const action = ratio < 0.2 ? "increase-reward-30%" : ratio < 0.4 ? "increase-reward-15%" : "promote-tier";
      const confidence = 1 - ratio;

      // Live mode would call campaignManager.update(...) here. We don't
      // wire that yet because the optimizer's playbook needs human review
      // first — log only, even in "live".
      decisions.push({
        targetId: c.id ?? c.campaignId ?? "unknown",
        action,
        confidence,
        executed: false,
        reason: `performance ratio ${(ratio * 100).toFixed(0)}% over ${Math.floor(ageDays)}d`,
        meta: {
          businessId: c.businessId,
          completions: c.completions ?? 0,
          maxCompletions: c.maxCompletions,
          ageDays: Math.floor(ageDays),
          tier: c.tier,
        },
      });
    }

    decisions.sort((a, b) => b.confidence - a.confidence);
    return decisions;
  },
};
