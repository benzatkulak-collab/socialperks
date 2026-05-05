/**
 * Persistence write-through for the campaign state machine.
 *
 * The campaignManager keeps an in-memory Map<id, lifecycle> as its
 * authoritative state for routing/business logic, but on every write
 * we also push to Postgres when DATABASE_URL is set so the campaign
 * survives a redeploy.
 *
 * On cold start, callers can use `rehydrateCampaign(id)` to load a
 * lifecycle back from DB if the manager's Map is empty.
 *
 * This file lives outside the state machine so the existing module
 * stays unchanged (the manager is widely imported); routes that
 * mutate state should call `persistLifecycle()` after each successful
 * transition.
 */

import { db, InMemoryConnection } from "@/lib/db/connection";
import type { CampaignLifecycle } from "@/lib/campaign-state-machine";

const usingDb = !(db instanceof InMemoryConnection);

export async function persistLifecycle(
  lifecycle: CampaignLifecycle,
  extra?: { name?: string; actions?: string[] },
): Promise<void> {
  if (!usingDb) return;
  try {
    await db.query(
      `INSERT INTO launched_campaigns
         (id, business_id, name, state, budget_allocated, budget_type,
          completions, max_completions, expires_at, launched_at, transitions)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (id) DO UPDATE SET
         state = EXCLUDED.state,
         budget_allocated = EXCLUDED.budget_allocated,
         completions = EXCLUDED.completions,
         max_completions = EXCLUDED.max_completions,
         expires_at = EXCLUDED.expires_at,
         transitions = EXCLUDED.transitions,
         updated_at = NOW()`,
      [
        lifecycle.id,
        lifecycle.businessId,
        extra?.name ?? null,
        lifecycle.state,
        lifecycle.budget.allocated,
        lifecycle.budget.type,
        lifecycle.completions.current,
        lifecycle.completions.max,
        lifecycle.expiry.expiresAt,
        lifecycle.expiry.launchedAt,
        JSON.stringify(lifecycle.transitions),
      ],
    );
  } catch (e) {
    // Don't throw — manager already has the canonical in-memory record.
    console.error("[campaign-persist] failed:", e instanceof Error ? e.message : e);
  }
}

export async function loadLifecyclesForBusiness(
  businessId: string,
): Promise<Array<{
  id: string;
  state: string;
  budgetAllocated: number;
  budgetType: string;
  completions: number;
  maxCompletions: number | null;
  expiresAt: string;
  launchedAt: string;
}>> {
  if (!usingDb) return [];
  try {
    const result = await db.query<{
      id: string;
      state: string;
      budget_allocated: number;
      budget_type: string;
      completions: number;
      max_completions: number | null;
      expires_at: string;
      launched_at: string;
    }>(
      `SELECT id, state, budget_allocated, budget_type, completions, max_completions, expires_at, launched_at
       FROM launched_campaigns
       WHERE business_id = $1
       ORDER BY launched_at DESC
       LIMIT 200`,
      [businessId],
    );
    return result.rows.map((r) => ({
      id: r.id,
      state: r.state,
      budgetAllocated: r.budget_allocated,
      budgetType: r.budget_type,
      completions: r.completions,
      maxCompletions: r.max_completions,
      expiresAt: r.expires_at,
      launchedAt: r.launched_at,
    }));
  } catch (e) {
    console.error("[campaign-persist] load failed:", e instanceof Error ? e.message : e);
    return [];
  }
}
