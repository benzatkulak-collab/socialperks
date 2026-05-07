// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Campaign State Machine
//
// Enforces the campaign lifecycle with explicit state transitions.
// Every transition emits an event through the event store.
// Invalid transitions throw — callers should use canTransition() first.
// ══════════════════════════════════════════════════════════════════════════════

import {
  eventStore,
  emitCampaignEvent,
  type EventActorType,
} from "./events";
import type { DiscountType } from "./types";

// ─── Budget Lock (prevents race conditions on concurrent spend) ─────────────

const budgetLocks = new Map<string, Promise<void>>();

async function withBudgetLock<T>(campaignId: string, fn: () => Promise<T>): Promise<T> {
  while (budgetLocks.has(campaignId)) {
    await budgetLocks.get(campaignId);
  }
  let resolve: () => void;
  const lock = new Promise<void>(r => { resolve = r; });
  budgetLocks.set(campaignId, lock);
  try {
    return await fn();
  } finally {
    budgetLocks.delete(campaignId);
    resolve!();
  }
}

// ─── States & Transitions ───────────────────────────────────────────────────

export type CampaignState = "draft" | "active" | "paused" | "ended" | "expired";

/**
 * Valid transitions:
 *   draft   → active
 *   active  → paused
 *   active  → ended
 *   active  → expired
 *   paused  → active
 *   paused  → ended
 *
 * Terminal states (no outbound transitions):
 *   ended, expired
 */
const VALID_TRANSITIONS: ReadonlyMap<CampaignState, readonly CampaignState[]> =
  new Map([
    ["draft", ["active"]],
    ["active", ["paused", "ended", "expired"]],
    ["paused", ["active", "ended"]],
    ["ended", []],
    ["expired", []],
  ]);

// ─── Data Types ─────────────────────────────────────────────────────────────

export interface CampaignBudget {
  /** Total budget allocated (dollar value or percentage cap). */
  allocated: number;
  /** Amount spent so far. */
  spent: number;
  /** Whether budget is expressed as percentage or dollars. */
  type: DiscountType;
}

export interface CampaignCompletions {
  /** Number of approved completions. */
  current: number;
  /** Maximum allowed completions; null means unlimited. */
  max: number | null;
}

export interface CampaignExpiry {
  /** ISO 8601 timestamp when the campaign was launched. */
  launchedAt: string;
  /** ISO 8601 timestamp when the campaign expires. */
  expiresAt: string;
}

export interface StateTransition {
  readonly from: CampaignState;
  readonly to: CampaignState;
  readonly triggeredBy: string;
  readonly reason: string;
  readonly timestamp: string;
}

export interface CampaignLifecycle {
  readonly id: string;
  state: CampaignState;
  readonly businessId: string;
  budget: CampaignBudget;
  completions: CampaignCompletions;
  expiry: CampaignExpiry;
  transitions: StateTransition[];
}

// ─── Launch Configuration ───────────────────────────────────────────────────

export interface LaunchConfig {
  /** Campaign name (for event data). */
  name: string;
  /** Budget allocation. */
  budgetAllocated: number;
  /** Budget denomination type. */
  budgetType: DiscountType;
  /** Maximum completions; null for unlimited. */
  maxCompletions: number | null;
  /** Number of days until the campaign expires. */
  expiresInDays: number;
}

// ─── State Machine ──────────────────────────────────────────────────────────

class CampaignStateMachine {
  /** campaignId → CampaignLifecycle */
  private campaigns: Map<string, CampaignLifecycle> = new Map();

  // ── Launch ──────────────────────────────────────────────────────────────

  /**
   * Create a new campaign in draft state, then immediately transition to active.
   * Emits both campaign.created and campaign.launched events.
   */
  launch(
    campaignId: string,
    businessId: string,
    config: LaunchConfig
  ): CampaignLifecycle {
    if (this.campaigns.has(campaignId)) {
      throw new Error(
        `Campaign ${campaignId} already exists. Use resume() to reactivate a paused campaign.`
      );
    }

    if (!campaignId || typeof campaignId !== "string") {
      throw new Error("campaignId is required");
    }

    if (!businessId || typeof businessId !== "string") {
      throw new Error("businessId is required");
    }

    if (config.expiresInDays < 1) {
      throw new Error("expiresInDays must be at least 1");
    }

    if (config.budgetAllocated < 0) {
      throw new Error("budgetAllocated cannot be negative");
    }

    const now = new Date();
    const expiresAt = new Date(now);
    expiresAt.setDate(expiresAt.getDate() + config.expiresInDays);

    const lifecycle: CampaignLifecycle = {
      id: campaignId,
      state: "draft",
      businessId,
      budget: {
        allocated: config.budgetAllocated,
        spent: 0,
        type: config.budgetType,
      },
      completions: {
        current: 0,
        max: config.maxCompletions,
      },
      expiry: {
        launchedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
      },
      transitions: [],
    };

    this.campaigns.set(campaignId, lifecycle);

    // Emit created event
    emitCampaignEvent("campaign.created", campaignId, businessId, {
      name: config.name,
      budgetAllocated: config.budgetAllocated,
      budgetType: config.budgetType,
      maxCompletions: config.maxCompletions,
      expiresInDays: config.expiresInDays,
    });

    // Transition draft → active
    this.transition(lifecycle, "active", businessId, "business", "Campaign launched");

    // Emit launched event
    emitCampaignEvent("campaign.launched", campaignId, businessId, {
      name: config.name,
      expiresAt: expiresAt.toISOString(),
    });

    return lifecycle;
  }

  // ── Pause ───────────────────────────────────────────────────────────────

  /**
   * Pause an active campaign. Only valid from the "active" state.
   */
  pause(
    campaignId: string,
    actorId: string,
    reason: string = "Manually paused"
  ): CampaignLifecycle {
    const lifecycle = this.requireCampaign(campaignId);
    this.transition(lifecycle, "paused", actorId, "business", reason);

    emitCampaignEvent("campaign.paused", campaignId, actorId, { reason });
    return lifecycle;
  }

  // ── Resume ──────────────────────────────────────────────────────────────

  /**
   * Resume a paused campaign. Only valid from the "paused" state.
   */
  resume(
    campaignId: string,
    actorId: string
  ): CampaignLifecycle {
    const lifecycle = this.requireCampaign(campaignId);
    this.transition(lifecycle, "active", actorId, "business", "Campaign resumed");

    emitCampaignEvent("campaign.resumed", campaignId, actorId, {});
    return lifecycle;
  }

  // ── End ─────────────────────────────────────────────────────────────────

  /**
   * Permanently end a campaign. Valid from "active" or "paused".
   * This is a terminal state — the campaign cannot be restarted.
   */
  end(
    campaignId: string,
    actorId: string,
    reason: string = "Manually ended"
  ): CampaignLifecycle {
    const lifecycle = this.requireCampaign(campaignId);
    this.transition(lifecycle, "ended", actorId, "business", reason);

    emitCampaignEvent("campaign.ended", campaignId, actorId, {
      reason,
      totalCompletions: lifecycle.completions.current,
      totalSpent: lifecycle.budget.spent,
    });

    return lifecycle;
  }

  // ── Record Completion ───────────────────────────────────────────────────

  /**
   * Increment the completion count. If max completions is reached, the
   * campaign is automatically ended.
   *
   * Returns { lifecycle, autoEnded } so the caller knows whether the
   * campaign was terminated.
   */
  recordCompletion(
    campaignId: string
  ): { lifecycle: CampaignLifecycle; autoEnded: boolean } {
    const lifecycle = this.requireCampaign(campaignId);

    if (lifecycle.state !== "active") {
      throw new Error(
        `Cannot record completion: campaign ${campaignId} is "${lifecycle.state}", not "active".`
      );
    }

    lifecycle.completions.current += 1;

    let autoEnded = false;
    if (
      lifecycle.completions.max !== null &&
      lifecycle.completions.current >= lifecycle.completions.max
    ) {
      this.transition(
        lifecycle,
        "ended",
        "system",
        "system",
        `Max completions reached (${lifecycle.completions.max})`
      );

      emitCampaignEvent(
        "campaign.ended",
        campaignId,
        "system",
        {
          reason: "max_completions_reached",
          completions: lifecycle.completions.current,
          max: lifecycle.completions.max,
        },
        "system"
      );

      autoEnded = true;
    }

    return { lifecycle, autoEnded };
  }

  // ── Check Expiry ────────────────────────────────────────────────────────

  /**
   * Check whether the campaign has passed its expiry date.
   * If expired, transitions to the "expired" terminal state.
   *
   * Safe to call repeatedly — it is a no-op if already expired/ended
   * or if the expiry date is in the future.
   */
  checkExpiry(campaignId: string): { lifecycle: CampaignLifecycle; expired: boolean } {
    const lifecycle = this.requireCampaign(campaignId);

    // Already in a terminal state — nothing to do.
    if (lifecycle.state === "ended" || lifecycle.state === "expired") {
      return { lifecycle, expired: lifecycle.state === "expired" };
    }

    const now = Date.now();
    const expiresAt = new Date(lifecycle.expiry.expiresAt).getTime();

    if (now >= expiresAt) {
      // Can only expire from "active" — if paused, end it instead.
      if (lifecycle.state === "active") {
        this.transition(
          lifecycle,
          "expired",
          "system",
          "system",
          "Campaign reached its expiration date"
        );

        emitCampaignEvent(
          "campaign.expired",
          campaignId,
          "system",
          {
            expiresAt: lifecycle.expiry.expiresAt,
            completions: lifecycle.completions.current,
          },
          "system"
        );
      } else if (lifecycle.state === "paused") {
        // A paused campaign that passes its expiry date is ended, not expired.
        this.transition(
          lifecycle,
          "ended",
          "system",
          "system",
          "Campaign expired while paused"
        );

        emitCampaignEvent(
          "campaign.ended",
          campaignId,
          "system",
          {
            reason: "expired_while_paused",
            expiresAt: lifecycle.expiry.expiresAt,
          },
          "system"
        );
      }

      return { lifecycle, expired: true };
    }

    return { lifecycle, expired: false };
  }

  // ── Check Budget ────────────────────────────────────────────────────────

  /**
   * Check whether recording a perk of `perkValue` would exceed the budget.
   * If the budget would be exceeded, the campaign is auto-paused.
   *
   * Call this BEFORE awarding a perk to decide whether to proceed.
   *
   * CONCURRENCY NOTE: For atomic check-and-spend in a single-process
   * environment, use `checkAndSpendBudget()` which acquires a per-campaign
   * lock to prevent concurrent requests from passing checkBudget
   * simultaneously and causing overspend. In a distributed/multi-process
   * environment, this still needs an atomic compare-and-increment
   * (e.g., Postgres UPDATE ... SET spent = spent + $1 WHERE spent + $1
   * <= allocated RETURNING *) or a distributed lock/lease.
   */
  checkBudget(
    campaignId: string,
    perkValue: number
  ): { lifecycle: CampaignLifecycle; withinBudget: boolean; autoPaused: boolean } {
    const lifecycle = this.requireCampaign(campaignId);

    if (lifecycle.state !== "active") {
      return { lifecycle, withinBudget: false, autoPaused: false };
    }

    // Unlimited budget
    if (lifecycle.budget.allocated <= 0) {
      return { lifecycle, withinBudget: true, autoPaused: false };
    }

    const projectedSpend = lifecycle.budget.spent + perkValue;

    if (projectedSpend > lifecycle.budget.allocated) {
      this.transition(
        lifecycle,
        "paused",
        "system",
        "system",
        `Budget cap reached ($${lifecycle.budget.spent.toFixed(2)} of $${lifecycle.budget.allocated.toFixed(2)} spent, next perk would be $${perkValue.toFixed(2)})`
      );

      emitCampaignEvent(
        "campaign.paused",
        campaignId,
        "system",
        {
          reason: "budget_exceeded",
          budgetAllocated: lifecycle.budget.allocated,
          budgetSpent: lifecycle.budget.spent,
          perkValue,
        },
        "system"
      );

      return { lifecycle, withinBudget: false, autoPaused: true };
    }

    return { lifecycle, withinBudget: true, autoPaused: false };
  }

  /**
   * Record spending against the campaign budget.
   *
   * SECURITY: this method is private because it does NOT acquire the
   * per-campaign budget lock. Calling it from outside the
   * `checkAndSpendBudget` flow opens a check-then-write race that lets
   * concurrent perk awards push `budget.spent` past `budget.allocated`
   * (the architecture audit, PR #43, flagged this exact path as P0).
   * If you need to spend, use `checkAndSpendBudget()` — it wraps this
   * call in a lock alongside the budget check.
   */
  private recordSpend(campaignId: string, amount: number): void {
    if (typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      throw new Error("Spend amount must be a finite non-negative number");
    }
    const lifecycle = this.requireCampaign(campaignId);
    lifecycle.budget.spent += amount;
  }

  /**
   * Atomic check-and-spend: acquires a per-campaign lock so that the
   * budget check and spend recording cannot be interleaved by concurrent
   * requests. Returns the same result shape as checkBudget, but the
   * spend is already recorded when withinBudget is true.
   */
  async checkAndSpendBudget(
    campaignId: string,
    perkValue: number
  ): Promise<{ lifecycle: CampaignLifecycle; withinBudget: boolean; autoPaused: boolean }> {
    return withBudgetLock(campaignId, async () => {
      const result = this.checkBudget(campaignId, perkValue);
      if (result.withinBudget) {
        this.recordSpend(campaignId, perkValue);
      }
      return result;
    });
  }

  // ── Queries ─────────────────────────────────────────────────────────────

  /** Get the current lifecycle state for a campaign. */
  getState(campaignId: string): CampaignLifecycle | undefined {
    return this.campaigns.get(campaignId);
  }

  /** Get the full transition history for a campaign. */
  getHistory(campaignId: string): StateTransition[] {
    const lifecycle = this.campaigns.get(campaignId);
    return lifecycle ? [...lifecycle.transitions] : [];
  }

  /** Check if a specific transition is valid from the campaign's current state. */
  canTransition(campaignId: string, to: CampaignState): boolean {
    const lifecycle = this.campaigns.get(campaignId);
    if (!lifecycle) return false;

    const allowed = VALID_TRANSITIONS.get(lifecycle.state);
    return allowed !== undefined && allowed.includes(to);
  }

  /** List all campaigns in a specific state. */
  listByState(state: CampaignState): CampaignLifecycle[] {
    const result: CampaignLifecycle[] = [];
    for (const lc of this.campaigns.values()) {
      if (lc.state === state) {
        result.push(lc);
      }
    }
    return result;
  }

  /** List all tracked campaigns. */
  listAll(): CampaignLifecycle[] {
    return Array.from(this.campaigns.values());
  }

  /** List all campaigns for a specific business. */
  listByBusiness(businessId: string): CampaignLifecycle[] {
    const result: CampaignLifecycle[] = [];
    for (const lc of this.campaigns.values()) {
      if (lc.businessId === businessId) {
        result.push(lc);
      }
    }
    return result;
  }

  /**
   * Run expiry checks across ALL active campaigns.
   * Call this on a timer (e.g., every minute) to auto-expire campaigns.
   */
  checkAllExpiries(): { expired: string[]; ended: string[] } {
    const expired: string[] = [];
    const ended: string[] = [];

    for (const lc of this.campaigns.values()) {
      if (lc.state === "active" || lc.state === "paused") {
        const result = this.checkExpiry(lc.id);
        if (result.expired) {
          if (result.lifecycle.state === "expired") {
            expired.push(lc.id);
          } else if (result.lifecycle.state === "ended") {
            ended.push(lc.id);
          }
        }
      }
    }

    return { expired, ended };
  }

  // ── Diagnostics ─────────────────────────────────────────────────────────

  /** Total number of tracked campaigns. */
  get size(): number {
    return this.campaigns.size;
  }

  /** Clear all state. For testing only. */
  _reset(): void {
    this.campaigns.clear();
  }

  // ── Reconstruct from Events ─────────────────────────────────────────────

  /**
   * Rebuild a campaign's lifecycle from the event store.
   * Useful after a cold start or when the in-memory state is lost.
   */
  rehydrate(campaignId: string): CampaignLifecycle | null {
    const events = eventStore.getEntityHistory(campaignId);
    if (events.length === 0) return null;

    let lifecycle: CampaignLifecycle | null = null;

    for (const event of events) {
      switch (event.type) {
        case "campaign.created": {
          const d = event.data;
          const launchedAt = event.timestamp;
          const expiresInDays = (d.expiresInDays as number) ?? 30;
          // Provisional expiresAt from created event; overridden by launched event if present
          const expiresAt = new Date(
            new Date(launchedAt).getTime() + expiresInDays * 86_400_000
          ).toISOString();

          lifecycle = {
            id: campaignId,
            state: "draft",
            businessId: event.actorId,
            budget: {
              allocated: (d.budgetAllocated as number) ?? 0,
              spent: 0,
              type: (d.budgetType as DiscountType) ?? "dol",
            },
            completions: {
              current: 0,
              max: (d.maxCompletions as number | null) ?? null,
            },
            expiry: { launchedAt, expiresAt },
            transitions: [],
          };
          break;
        }
        case "campaign.launched":
          if (lifecycle) {
            lifecycle.state = "active";
            lifecycle.transitions.push({
              from: "draft",
              to: "active",
              triggeredBy: event.actorId,
              reason: "Campaign launched",
              timestamp: event.timestamp,
            });
            // Use the authoritative expiresAt from the launched event to avoid drift
            if (typeof event.data.expiresAt === "string") {
              lifecycle.expiry = {
                launchedAt: event.timestamp,
                expiresAt: event.data.expiresAt as string,
              };
            }
          }
          break;
        case "campaign.paused":
          if (lifecycle) {
            const prev = lifecycle.state;
            lifecycle.state = "paused";
            lifecycle.transitions.push({
              from: prev,
              to: "paused",
              triggeredBy: event.actorId,
              reason: (event.data.reason as string) ?? "Paused",
              timestamp: event.timestamp,
            });
          }
          break;
        case "campaign.resumed":
          if (lifecycle) {
            lifecycle.state = "active";
            lifecycle.transitions.push({
              from: "paused",
              to: "active",
              triggeredBy: event.actorId,
              reason: "Campaign resumed",
              timestamp: event.timestamp,
            });
          }
          break;
        case "campaign.ended":
          if (lifecycle) {
            const prev = lifecycle.state;
            lifecycle.state = "ended";
            lifecycle.transitions.push({
              from: prev,
              to: "ended",
              triggeredBy: event.actorId,
              reason: (event.data.reason as string) ?? "Ended",
              timestamp: event.timestamp,
            });
          }
          break;
        case "campaign.expired":
          if (lifecycle) {
            const prev = lifecycle.state;
            lifecycle.state = "expired";
            lifecycle.transitions.push({
              from: prev,
              to: "expired",
              triggeredBy: event.actorId,
              reason: "Campaign reached its expiration date",
              timestamp: event.timestamp,
            });
          }
          break;
      }
    }

    if (lifecycle) {
      this.campaigns.set(campaignId, lifecycle);
    }

    return lifecycle;
  }

  // ── Private Helpers ─────────────────────────────────────────────────────

  private requireCampaign(campaignId: string): CampaignLifecycle {
    const lifecycle = this.campaigns.get(campaignId);
    if (!lifecycle) {
      throw new Error(`Campaign ${campaignId} not found in state machine.`);
    }
    return lifecycle;
  }

  private transition(
    lifecycle: CampaignLifecycle,
    to: CampaignState,
    triggeredBy: string,
    _actorType: EventActorType,
    reason: string
  ): void {
    const from = lifecycle.state;
    const allowed = VALID_TRANSITIONS.get(from);

    if (!allowed || !allowed.includes(to)) {
      throw new Error(
        `Invalid transition: "${from}" → "${to}" for campaign ${lifecycle.id}. ` +
        `Allowed from "${from}": [${allowed?.join(", ") ?? "none"}].`
      );
    }

    const record: StateTransition = {
      from,
      to,
      triggeredBy,
      reason,
      timestamp: new Date().toISOString(),
    };

    lifecycle.transitions.push(record);
    lifecycle.state = to;
  }
}

// ─── Singleton ──────────────────────────────────────────────────────────────

export const campaignManager = new CampaignStateMachine();
