/**
 * Ledger / Perk-Wallet Reconciler Agent  (autonomy level 5)
 *
 * The platform's financial truth is the event-sourced ledger: every
 * balance is derivable from immutable entries. This agent reconciles the
 * cached balance projections against that truth and runs the policy-driven
 * perk-expiry sweep:
 *   - For each ledger account: recompute the balance from entries
 *     (ledger.verifyBalance) and, on drift, correct the cached balance.
 *   - Sweep perks past their expiresAt (perk-wallet.expirePerks).
 *
 * Why this is safe to run fully autonomously (L5 — no human in the loop):
 * every action is idempotent and self-correcting. Reconciliation only ever
 * sets a projection equal to what the entries already say, and the sweep
 * only expires perks already past expiry. A duplicated or mistimed run
 * converges to the same correct state — nothing is irreversible and no
 * money leaves the system.
 *
 * Ships dry-run by default (platform convention: prove safety via the
 * decision log first); an admin flips it to live from /admin/agents.
 */

import type { Agent, AgentDecision } from "./types";

async function listAccountIds(): Promise<string[]> {
  try {
    const mod = (await import("@/lib/financial-ledger")) as unknown as {
      ledger?: { getAccountsStore?: () => Map<string, unknown> };
    };
    const store = mod.ledger?.getAccountsStore?.();
    return store ? Array.from(store.keys()) : [];
  } catch {
    return [];
  }
}

interface BalanceCheck {
  accountId: string;
  storedBalance: number;
  calculatedBalance: number;
  isConsistent: boolean;
  discrepancy: number;
}

async function verifyBalance(accountId: string): Promise<BalanceCheck | null> {
  try {
    const mod = (await import("@/lib/financial-ledger")) as unknown as {
      ledger?: { verifyBalance?: (id: string) => BalanceCheck };
    };
    return mod.ledger?.verifyBalance?.(accountId) ?? null;
  } catch {
    return null;
  }
}

/**
 * Correct a drifted projection by setting the cached balance equal to the
 * entry-derived balance. The repair entry point is optional — until the
 * ledger exposes one, the agent detects + reports drift but reports the
 * correction as un-executed (no silent destructive writes).
 */
async function reconcileBalance(accountId: string): Promise<boolean> {
  try {
    const mod = (await import("@/lib/financial-ledger")) as unknown as {
      ledger?: { reconcileBalance?: (id: string) => boolean | Promise<boolean> };
    };
    if (typeof mod.ledger?.reconcileBalance === "function") {
      return Boolean(await mod.ledger.reconcileBalance(accountId));
    }
    return false;
  } catch {
    return false;
  }
}

/** Count perks past expiry but still active — dry-run preview only. */
async function countExpirable(now: string): Promise<number> {
  try {
    const mod = (await import("@/lib/perk-wallet")) as unknown as {
      getWalletStore?: () => Map<string, { perks: Array<{ status: string; expiresAt: string }> }>;
    };
    const store = mod.getWalletStore?.();
    if (!store) return 0;
    const t = new Date(now).getTime();
    let n = 0;
    for (const wallet of store.values()) {
      for (const perk of wallet.perks) {
        if (perk.status === "active" && new Date(perk.expiresAt).getTime() < t) n += 1;
      }
    }
    return n;
  } catch {
    return 0;
  }
}

async function runExpirySweep(): Promise<{ expired: number; ids: string[] }> {
  try {
    const mod = (await import("@/lib/perk-wallet")) as unknown as {
      expirePerks?: () => { expired: number; ids: string[] };
    };
    return mod.expirePerks?.() ?? { expired: 0, ids: [] };
  } catch {
    return { expired: 0, ids: [] };
  }
}

export const ledgerReconcilerAgent: Agent = {
  id: "ledger-reconciler",
  name: "Ledger Reconciler",
  description:
    "Reconciles wallet/ledger balances against the event-sourced truth and runs the perk-expiry sweep. Idempotent and self-healing.",
  level: 5,
  defaultMode: "dry-run",
  intervalSeconds: 3600,
  config: {
    threshold: { min: 0.9, max: 1, default: 1, step: 0.01 },
    maxActionsPerRun: { min: 1, max: 1000, default: 500 },
  },
  async run(ctx) {
    const decisions: AgentDecision[] = [];

    // 1) Balance reconciliation — recompute from entries, correct drift.
    const accountIds = await listAccountIds();
    for (const accountId of accountIds) {
      const check = await verifyBalance(accountId);
      if (!check || check.isConsistent) continue; // only act on drift

      let executed = false;
      if (ctx.live) executed = await reconcileBalance(accountId);

      decisions.push({
        targetId: accountId,
        action: "reconcile-balance",
        confidence: 1,
        executed,
        reason: `drift: stored ${check.storedBalance} vs derived ${check.calculatedBalance} (Δ ${check.discrepancy})`,
        meta: {
          storedBalance: check.storedBalance,
          calculatedBalance: check.calculatedBalance,
          discrepancy: check.discrepancy,
        },
      });
    }

    // 2) Perk-expiry sweep — idempotent policy action.
    if (ctx.live) {
      const { expired, ids } = await runExpirySweep();
      if (expired > 0) {
        decisions.push({
          targetId: "perk-expiry-sweep",
          action: "expire-perks",
          confidence: 1,
          executed: true,
          reason: `expired ${expired} perk(s) past expiry`,
          meta: { expired, sample: ids.slice(0, 10) },
        });
      }
    } else {
      const expirable = await countExpirable(ctx.now);
      if (expirable > 0) {
        decisions.push({
          targetId: "perk-expiry-sweep",
          action: "expire-perks",
          confidence: 1,
          executed: false,
          reason: `${expirable} perk(s) eligible for expiry`,
          meta: { expirable },
        });
      }
    }

    return decisions;
  },
};
