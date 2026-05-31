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

/**
 * Load a single campaign lifecycle from Postgres by id and reconstruct a full
 * `CampaignLifecycle`. Used as a cold-start fallback by the public campaign
 * page: both the campaignManager's in-memory Map AND the event store are
 * per-process, so after a redeploy the only durable copy of a launched
 * campaign is this row — without this, /c/{id} 404s for a live campaign.
 *
 * `budget.spent` isn't persisted in launched_campaigns; it's reconstructed as
 * 0 (the consumer page doesn't display spend). Returns null if not found.
 */
export async function loadLifecycle(
  campaignId: string,
): Promise<CampaignLifecycle | null> {
  if (!usingDb) return null;
  try {
    const result = await db.query<{
      id: string;
      business_id: string;
      state: string;
      budget_allocated: number;
      budget_type: string;
      completions: number;
      max_completions: number | null;
      expires_at: string;
      launched_at: string;
      transitions: unknown;
    }>(
      `SELECT id, business_id, state, budget_allocated, budget_type, completions,
              max_completions, expires_at, launched_at, transitions
       FROM launched_campaigns
       WHERE id = $1
       LIMIT 1`,
      [campaignId],
    );
    const r = result.rows[0];
    if (!r) return null;

    let transitions: CampaignLifecycle["transitions"] = [];
    try {
      const parsed =
        typeof r.transitions === "string" ? JSON.parse(r.transitions) : r.transitions;
      if (Array.isArray(parsed)) transitions = parsed as CampaignLifecycle["transitions"];
    } catch {
      transitions = [];
    }

    return {
      id: r.id,
      businessId: r.business_id,
      state: r.state as CampaignLifecycle["state"],
      budget: {
        allocated: r.budget_allocated,
        spent: 0,
        type: r.budget_type as CampaignLifecycle["budget"]["type"],
      },
      completions: { current: r.completions, max: r.max_completions },
      expiry: { launchedAt: r.launched_at, expiresAt: r.expires_at },
      transitions,
    };
  } catch (e) {
    console.error("[campaign-persist] loadLifecycle failed:", e instanceof Error ? e.message : e);
    return null;
  }
}
