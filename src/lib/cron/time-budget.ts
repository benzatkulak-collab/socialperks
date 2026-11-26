// ==============================================================================
// Cron time budget
//
// Netlify Free stops a synchronous function after 10 seconds (Pro can ask for
// 26). A cron job that loops over emails one at a time can blow past that,
// get killed mid-batch and lose its progress. Each long-running cron job
// takes a budget, stops starting new work once the budget is spent, and
// reports `more: true` so .github/workflows/cron.yml calls it again.
//
// The default leaves ~3s of headroom under Netlify's 10s for the final DB
// write and the response. Override with CRON_TIME_BUDGET_MS (e.g. on a host
// with a longer limit).
// ==============================================================================

export const DEFAULT_CRON_TIME_BUDGET_MS = 7_000;

export interface TimeBudget {
  /** True once the budget is spent: start no new unit of work. */
  expired(): boolean;
  /** Milliseconds left, never negative. */
  remainingMs(): number;
}

export function cronTimeBudgetMs(env: Record<string, string | undefined> = process.env): number {
  const raw = Number(env.CRON_TIME_BUDGET_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_CRON_TIME_BUDGET_MS;
}

export function createTimeBudget(
  ms: number = cronTimeBudgetMs(),
  now: () => number = Date.now,
): TimeBudget {
  const end = now() + ms;
  return {
    expired: () => now() >= end,
    remainingMs: () => Math.max(0, end - now()),
  };
}

/** A budget that never runs out — for callers outside the cron path and tests. */
export const UNLIMITED_BUDGET: TimeBudget = {
  expired: () => false,
  remainingMs: () => Number.POSITIVE_INFINITY,
};
