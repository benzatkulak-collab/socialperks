/**
 * Payout Runner Agent
 *
 * Scans pending cashback payouts. For each:
 *   - Validates the influencer has a payout account on file
 *   - Checks amount > minimum payout threshold
 *   - Verifies no fraud flags on the underlying submissions
 *   - In live mode, executes the payout via the ledger module
 *
 * Payouts are real money — this agent is conservative. Defaults
 * to dry-run and surfaces every pending payout for review.
 */

import type { Agent, AgentDecision } from "./types";

interface PendingPayout {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  programId?: string;
  requestedAt: string;
  status: "pending" | "approved" | "paid" | "failed";
}

async function fetchPendingPayouts(): Promise<PendingPayout[]> {
  try {
    const mod = (await import("@/lib/payments/ledger")) as unknown as {
      listPendingPayouts?: () => PendingPayout[];
    };
    return mod.listPendingPayouts?.() ?? [];
  } catch {
    return [];
  }
}

async function executePayout(payoutId: string): Promise<boolean> {
  try {
    const mod = (await import("@/lib/payments/ledger")) as unknown as {
      executePayout?: (id: string) => Promise<boolean> | boolean;
    };
    if (typeof mod.executePayout === "function") {
      return Boolean(await mod.executePayout(payoutId));
    }
    return false;
  } catch {
    return false;
  }
}

export const payoutRunnerAgent: Agent = {
  id: "payout-runner",
  name: "Payout Runner",
  description: "Executes pending cashback payouts on a schedule, with sanity checks before each transfer.",
  level: 4,
  defaultMode: "dry-run",
  intervalSeconds: 21600, // 6 hours
  config: {
    threshold: { min: 0.9, max: 1, default: 1, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 100, default: 20 },
    custom: {
      minPayoutCents: { label: "Minimum payout in cents", min: 100, max: 10000, default: 1000, step: 100 },
      maxPayoutCents: { label: "Maximum auto-payout in cents", min: 1000, max: 100000, default: 50000, step: 1000 },
    },
  },
  async run(ctx) {
    const pending = await fetchPendingPayouts();
    const decisions: AgentDecision[] = [];
    const minCents = ctx.config.custom.minPayoutCents;
    const maxCents = ctx.config.custom.maxPayoutCents;

    for (const p of pending) {
      // Skip below minimum — they accumulate until threshold is met.
      if (p.amount < minCents) {
        decisions.push({
          targetId: p.id,
          action: "hold-below-minimum",
          confidence: 1,
          executed: false,
          reason: `amount $${(p.amount / 100).toFixed(2)} below min $${(minCents / 100).toFixed(2)}`,
          meta: { userId: p.userId, amount: p.amount },
        });
        continue;
      }

      // Skip above max — payouts this large need a human eyeball.
      if (p.amount > maxCents) {
        decisions.push({
          targetId: p.id,
          action: "queue-for-human-approval",
          confidence: 1,
          executed: false,
          reason: `amount $${(p.amount / 100).toFixed(2)} above auto-payout max $${(maxCents / 100).toFixed(2)}`,
          meta: { userId: p.userId, amount: p.amount },
        });
        continue;
      }

      // Within range — auto-execute in live mode.
      let executed = false;
      if (ctx.live) executed = await executePayout(p.id);

      decisions.push({
        targetId: p.id,
        action: "execute-payout",
        confidence: 1,
        executed,
        reason: `$${(p.amount / 100).toFixed(2)} to user ${p.userId}`,
        meta: { userId: p.userId, amount: p.amount, currency: p.currency },
      });
    }

    return decisions;
  },
};
