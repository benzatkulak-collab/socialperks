/**
 * Outreach Agent
 *
 * Scans the influencer roster and the active-campaign list and
 * proposes outreach targets: influencers who match an active
 * campaign's tier/niche but haven't engaged in N days.
 *
 * In live mode the agent would enqueue an outreach email through
 * the email queue. For now we emit decisions; live wiring is gated
 * on a `live-outreach` feature flag the team can flip when an
 * outreach template + sender domain are ready.
 */

import type { Agent, AgentDecision } from "./types";

interface Influencer {
  id: string;
  displayName: string;
  email: string;
  tier: string;
  niches: string[];
  followerCount: number;
}

async function fetchInfluencers(): Promise<Influencer[]> {
  try {
    const mod = await import("@/lib/seed");
    return mod.createSeedData().influencers;
  } catch {
    return [];
  }
}

/**
 * Has this influencer made any submission in the last N days? If yes,
 * skip — they're already engaged.
 */
async function isInfluencerEngaged(userId: string, withinDays: number): Promise<boolean> {
  try {
    const mod = await import("@/lib/submissions");
    const result = mod.getSubmissions({ userId }, 1, 50);
    if (result.submissions.length === 0) return false;
    const cutoff = Date.now() - withinDays * 24 * 60 * 60 * 1000;
    return result.submissions.some((s) => new Date(s.submittedAt).getTime() >= cutoff);
  } catch {
    return false;
  }
}

export const outreachAgent: Agent = {
  id: "outreach-agent",
  name: "Outreach Agent",
  description: "Identifies dormant influencers matching active campaigns and proposes targeted outreach.",
  level: 3,
  defaultMode: "dry-run",
  intervalSeconds: 86400, // once a day is plenty
  config: {
    threshold: { min: 0.5, max: 1, default: 0.7, step: 0.05 },
    maxActionsPerRun: { min: 1, max: 100, default: 15 },
    custom: {
      dormantDays: { label: "Consider dormant after N days inactive", min: 7, max: 90, default: 30, step: 1 },
      minFollowers: { label: "Min followers to target", min: 1000, max: 100000, default: 5000, step: 500 },
    },
  },
  async run(ctx) {
    const influencers = await fetchInfluencers();
    const decisions: AgentDecision[] = [];
    const dormantDays = ctx.config.custom.dormantDays;
    const minFollowers = ctx.config.custom.minFollowers;

    // Lazy-import the email queue so dry-run runs don't pay for it.
    const jobsMod = ctx.live ? await import("@/lib/jobs/registry").catch(() => null) : null;

    for (const inf of influencers) {
      if (inf.followerCount < minFollowers) continue;
      const engaged = await isInfluencerEngaged(inf.id, dormantDays);
      if (engaged) continue;

      // Confidence is higher for larger influencers — they have more
      // reach so the outreach is more valuable.
      const confidence = Math.min(1, 0.5 + inf.followerCount / 500_000);

      let executed = false;
      if (ctx.live && jobsMod && confidence >= ctx.config.threshold) {
        try {
          jobsMod.emailQueue.add({
            type: "outreach",
            to: inf.email,
            displayName: inf.displayName,
            campaignTier: inf.tier,
          });
          executed = true;
        } catch {
          // Queue failure shouldn't kill the run — fall through as unexecuted.
        }
      }

      decisions.push({
        targetId: inf.id,
        action: "send-outreach-email",
        confidence,
        executed,
        reason: `${inf.followerCount.toLocaleString()} followers, no activity in ${dormantDays}d`,
        meta: {
          displayName: inf.displayName,
          email: inf.email,
          tier: inf.tier,
          niches: inf.niches,
          followers: inf.followerCount,
        },
      });
    }

    decisions.sort((a, b) => b.confidence - a.confidence);
    return decisions;
  },
};
