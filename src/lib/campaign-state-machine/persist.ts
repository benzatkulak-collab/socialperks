/**
 * Persistence write-through + cold-start hydration for the campaign state machine.
 *
 * The campaignManager keeps an in-memory Map<id, lifecycle> as its authoritative
 * state, but that Map is wiped on every serverless cold start. The durable source
 * of truth is the `launched_campaign_state` table — a flat, TEXT-keyed, FK-free
 * table. The previous implementation wrote to the v1 `launched_campaigns` table
 * (UUID PK + FK to businesses(id), and column names like status/budget_cap that
 * don't match what the engine writes), so every INSERT threw on a type/column/FK
 * mismatch and was silently swallowed — campaigns vanished on every redeploy and
 * `loadLifecycle` returned a lossy record with no `actions` and spent hardcoded
 * to 0. This mirrors the perk-wallet vertical: a dual path that routes through
 * getInMemoryStore() (so durability is exercised under tests, not masked by the
 * no-op InMemoryConnection.query) and Postgres in prod, best-effort, never throws.
 *
 * Callers that read campaigns should `await ensureBusinessCampaignsLoaded(bizId)`
 * (list paths) or `await ensureCampaignLoaded(id)` (single-campaign paths) before
 * reading the manager, and call `persistLifecycle()` after every mutation.
 */

import { db, getInMemoryStore } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";
import { campaignManager } from "@/lib/campaign-state-machine";
import type { CampaignLifecycle, StateTransition } from "@/lib/campaign-state-machine";

const CAMPAIGN_TABLE = "launched_campaign_state";

/** Display/config fields that live alongside the lifecycle but aren't on it. */
export interface CampaignMetaExtra {
  name?: string;
  description?: string;
  guidelines?: string;
  actions?: string[];
  discountValue?: number;
  discountType?: string;
  ftcDisclosures?: string[];
}

interface CampaignDbRow {
  id: string;
  business_id: string;
  name: string | null;
  description: string | null;
  guidelines: string | null;
  actions: string | null;
  state: string;
  budget_allocated: number | string;
  budget_spent: number | string;
  budget_type: string;
  discount_value: number | string | null;
  discount_type: string | null;
  completions: number | string;
  max_completions: number | string | null;
  ftc_disclosures: string | null;
  launched_at: string | Date;
  expires_at: string | Date;
  transitions: string | null;
}

function toIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
function num(v: number | string | null | undefined, fallback = 0): number {
  if (v == null) return fallback;
  return typeof v === "string" ? parseFloat(v) : v;
}
function pjsonArray<T>(v: string | null | undefined): T[] {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? (p as T[]) : [];
  } catch {
    return [];
  }
}

/** Build the snake_case row. `existing` (in-memory path) preserves meta fields
 *  not supplied on this write, mirroring the Postgres COALESCE update below. */
function lifecycleToRow(
  lc: CampaignLifecycle,
  extra?: CampaignMetaExtra,
  existing?: Record<string, unknown> | null,
): Record<string, unknown> {
  const keepMeta = <T>(next: T | undefined, prev: unknown): T | null =>
    next ?? ((prev as T) ?? null);
  return {
    id: lc.id,
    business_id: lc.businessId,
    name: keepMeta(extra?.name ?? lc.name, existing?.name),
    description: keepMeta(extra?.description, existing?.description),
    guidelines: keepMeta(extra?.guidelines, existing?.guidelines),
    actions: JSON.stringify(lc.actions ?? extra?.actions ?? []),
    state: lc.state,
    budget_allocated: lc.budget.allocated,
    budget_spent: lc.budget.spent,
    budget_type: lc.budget.type,
    // discount value/type are the same data as budget.allocated/type.
    discount_value: extra?.discountValue ?? lc.budget.allocated,
    discount_type: extra?.discountType ?? lc.budget.type,
    completions: lc.completions.current,
    max_completions: lc.completions.max,
    ftc_disclosures: JSON.stringify(extra?.ftcDisclosures ?? pjsonArray(existing?.ftc_disclosures as string)),
    launched_at: lc.expiry.launchedAt,
    expires_at: lc.expiry.expiresAt,
    transitions: JSON.stringify(lc.transitions ?? []),
  };
}

function rowToLifecycle(r: CampaignDbRow): CampaignLifecycle {
  const actions = pjsonArray<string>(r.actions);
  return {
    id: r.id,
    businessId: r.business_id,
    state: r.state as CampaignLifecycle["state"],
    budget: {
      allocated: num(r.budget_allocated),
      spent: num(r.budget_spent),
      type: r.budget_type as CampaignLifecycle["budget"]["type"],
    },
    completions: {
      current: num(r.completions),
      max: r.max_completions == null ? null : num(r.max_completions),
    },
    expiry: { launchedAt: toIso(r.launched_at), expiresAt: toIso(r.expires_at) },
    transitions: pjsonArray<StateTransition>(r.transitions),
    actions: actions.length > 0 ? actions : undefined,
    name: r.name ?? undefined,
  };
}

/**
 * Durably persist a campaign lifecycle (insert on launch, upsert on every
 * subsequent transition/edit). Best-effort — the manager already holds the
 * canonical in-memory record, so a DB error is captured but never thrown.
 */
export async function persistLifecycle(
  lifecycle: CampaignLifecycle,
  extra?: CampaignMetaExtra,
): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    const existing = store.selectById(CAMPAIGN_TABLE, lifecycle.id);
    const row = lifecycleToRow(lifecycle, extra, existing);
    if (existing) store.update(CAMPAIGN_TABLE, lifecycle.id, row);
    else store.insert(CAMPAIGN_TABLE, row);
    return;
  }
  try {
    await db.query(
      `INSERT INTO launched_campaign_state
         (id, business_id, name, description, guidelines, actions, state,
          budget_allocated, budget_spent, budget_type, discount_value, discount_type,
          completions, max_completions, ftc_disclosures, launched_at, expires_at,
          transitions, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         name = COALESCE(EXCLUDED.name, launched_campaign_state.name),
         description = COALESCE(EXCLUDED.description, launched_campaign_state.description),
         guidelines = COALESCE(EXCLUDED.guidelines, launched_campaign_state.guidelines),
         actions = EXCLUDED.actions,
         state = EXCLUDED.state,
         budget_allocated = EXCLUDED.budget_allocated,
         budget_spent = EXCLUDED.budget_spent,
         budget_type = EXCLUDED.budget_type,
         discount_value = COALESCE(EXCLUDED.discount_value, launched_campaign_state.discount_value),
         discount_type = COALESCE(EXCLUDED.discount_type, launched_campaign_state.discount_type),
         completions = EXCLUDED.completions,
         max_completions = EXCLUDED.max_completions,
         ftc_disclosures = COALESCE(EXCLUDED.ftc_disclosures, launched_campaign_state.ftc_disclosures),
         expires_at = EXCLUDED.expires_at,
         transitions = EXCLUDED.transitions,
         updated_at = NOW()`,
      [
        lifecycle.id,
        lifecycle.businessId,
        extra?.name ?? lifecycle.name ?? null,
        extra?.description ?? null,
        extra?.guidelines ?? null,
        JSON.stringify(lifecycle.actions ?? extra?.actions ?? []),
        lifecycle.state,
        lifecycle.budget.allocated,
        lifecycle.budget.spent,
        lifecycle.budget.type,
        // discount value/type are the same data as budget.allocated/type.
        extra?.discountValue ?? lifecycle.budget.allocated,
        extra?.discountType ?? lifecycle.budget.type,
        lifecycle.completions.current,
        lifecycle.completions.max,
        // Bind NULL (not '[]') when no disclosures supplied so the COALESCE above
        // preserves any previously-stored value, matching the in-memory keepMeta.
        extra?.ftcDisclosures != null ? JSON.stringify(extra.ftcDisclosures) : null,
        lifecycle.expiry.launchedAt,
        lifecycle.expiry.expiresAt,
        JSON.stringify(lifecycle.transitions ?? []),
      ],
    );
  } catch (e) {
    captureError(e, { source: "campaign-persist.persistLifecycle" });
  }
}

/** Load one campaign lifecycle (incl. actions + real budget.spent) by id. */
export async function loadLifecycle(campaignId: string): Promise<CampaignLifecycle | null> {
  const store = getInMemoryStore();
  if (store) {
    const r = store.selectById(CAMPAIGN_TABLE, campaignId) as unknown as CampaignDbRow | null;
    return r ? rowToLifecycle(r) : null;
  }
  try {
    const res = await db.query<CampaignDbRow>(
      `SELECT id, business_id, name, description, guidelines, actions, state,
              budget_allocated, budget_spent, budget_type, discount_value, discount_type,
              completions, max_completions, ftc_disclosures, launched_at, expires_at, transitions
         FROM launched_campaign_state WHERE id = $1 LIMIT 1`,
      [campaignId],
    );
    return res.rows[0] ? rowToLifecycle(res.rows[0]) : null;
  } catch (e) {
    captureError(e, { source: "campaign-persist.loadLifecycle" });
    return null;
  }
}

/** Load all of a business's campaigns as full lifecycles (for cold-start hydration). */
export async function loadLifecyclesForBusiness(businessId: string): Promise<CampaignLifecycle[]> {
  const store = getInMemoryStore();
  if (store) {
    return (
      store.selectMany(CAMPAIGN_TABLE, { business_id: businessId }, { perPage: 1_000_000 })
        .rows as unknown as CampaignDbRow[]
    ).map(rowToLifecycle);
  }
  try {
    const res = await db.query<CampaignDbRow>(
      `SELECT id, business_id, name, description, guidelines, actions, state,
              budget_allocated, budget_spent, budget_type, discount_value, discount_type,
              completions, max_completions, ftc_disclosures, launched_at, expires_at, transitions
         FROM launched_campaign_state WHERE business_id = $1
         ORDER BY launched_at DESC LIMIT 500`,
      [businessId],
    );
    return res.rows.map(rowToLifecycle);
  } catch (e) {
    captureError(e, { source: "campaign-persist.loadLifecyclesForBusiness" });
    return [];
  }
}

// ─── Cold-start hydration into the campaignManager ───────────────────────────

/**
 * Per-business in-flight load promise. We cache the PROMISE (not a boolean) so
 * concurrent callers on a freshly-warmed lambda await the SAME load and never
 * read the manager before its register() loop has run — the read-after-mark race
 * a boolean guard would allow. Mirrors the perk-wallet/programs `_hydrationPromise`.
 */
const businessLoads = new Map<string, Promise<void>>();

/**
 * Ensure a single campaign is in the manager, loading + registering it from the
 * durable store on a cold start. Returns the lifecycle (in-memory or freshly
 * loaded), or null if it doesn't exist anywhere.
 */
export async function ensureCampaignLoaded(campaignId: string): Promise<CampaignLifecycle | null> {
  const inMem = campaignManager.getState(campaignId);
  if (inMem) return inMem;
  const loaded = await loadLifecycle(campaignId);
  if (loaded && !campaignManager.getState(loaded.id)) campaignManager.register(loaded);
  return loaded;
}

/**
 * Ensure all of a business's campaigns are in the manager. Runs the durable load
 * once per business per process; registers only ids the manager doesn't already
 * hold so a fresher in-memory write is never clobbered. Concurrent callers share
 * the in-flight promise, so the manager is fully populated before any of them read.
 */
export function ensureBusinessCampaignsLoaded(businessId: string): Promise<void> {
  const existing = businessLoads.get(businessId);
  if (existing) return existing;
  const p = (async () => {
    try {
      const rows = await loadLifecyclesForBusiness(businessId);
      for (const lc of rows) {
        if (!campaignManager.getState(lc.id)) campaignManager.register(lc);
      }
    } catch (e) {
      businessLoads.delete(businessId); // allow a retry on the next request
      captureError(e, { source: "campaign-persist.ensureBusinessCampaignsLoaded" });
    }
  })();
  businessLoads.set(businessId, p);
  return p;
}

/** Test helper: drop durable rows + the per-business load guard. */
export function clearCampaignStore(): void {
  businessLoads.clear();
  const store = getInMemoryStore();
  if (!store) return;
  for (const r of store.selectMany(CAMPAIGN_TABLE, {}, { perPage: 1_000_000 }).rows) {
    store.delete(CAMPAIGN_TABLE, r.id as string);
  }
}

/** Test helper: simulate a cold start — forget which businesses were hydrated. */
export function __resetCampaignHydrationForTests(): void {
  businessLoads.clear();
}
