// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Billing Plan Enforcement
//
// Checks plan limits for campaigns, completions, AI generations, and feature
// access. Returns structured errors the frontend can use to show upgrade modals.
// ══════════════════════════════════════════════════════════════════════════════

import { campaignManager } from "@/lib/campaign-state-machine";
import { subscriptions } from "@/lib/billing/store";
import { db, InMemoryConnection } from "@/lib/db/connection";

const usingDb = !(db instanceof InMemoryConnection);

// ─── Plan Limits ────────────────────────────────────────────────────────────

export interface PlanLimits {
  maxCampaigns: number;
  maxCompletionsPerMonth: number;
  maxActions: number;
  aiGenerations: number;
  hasAnalytics: boolean;
  hasApiAccess: boolean;
  hasQrCodes: boolean;
}

export const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: {
    maxCampaigns: 1,
    maxCompletionsPerMonth: 50,
    maxActions: 5,
    aiGenerations: 3,
    hasAnalytics: false,
    hasApiAccess: false,
    hasQrCodes: false,
  },
  starter: {
    maxCampaigns: 10,
    maxCompletionsPerMonth: 500,
    maxActions: 20,
    aiGenerations: 50,
    hasAnalytics: true,
    hasApiAccess: false,
    hasQrCodes: true,
  },
  pro: {
    maxCampaigns: 50,
    maxCompletionsPerMonth: 5000,
    maxActions: 107,
    aiGenerations: 500,
    hasAnalytics: true,
    hasApiAccess: true,
    hasQrCodes: true,
  },
  enterprise: {
    maxCampaigns: Infinity,
    maxCompletionsPerMonth: Infinity,
    maxActions: 107,
    aiGenerations: Infinity,
    hasAnalytics: true,
    hasApiAccess: true,
    hasQrCodes: true,
  },
};

// ─── Usage Tracking (in-memory, resets monthly) ─────────────────────────────

interface MonthlyUsage {
  aiGenerations: number;
  completions: number;
  /** YYYY-MM key for reset detection */
  month: string;
}

const usageMap = new Map<string, MonthlyUsage>();

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function getUsage(businessId: string): MonthlyUsage {
  const month = currentMonth();
  let usage = usageMap.get(businessId);
  if (!usage || usage.month !== month) {
    usage = { aiGenerations: 0, completions: 0, month };
    usageMap.set(businessId, usage);
    // First time we've seen this (business, month) tuple this process —
    // schedule a background load from Postgres to merge any usage that
    // happened on previous instances. Idempotent across calls.
    scheduleHydration(businessId, month, usage);
  }
  return usage;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Resolve the plan slug for a business. Falls back to "free" if no
 * active subscription is found or the plan is unknown.
 */
export function getBusinessPlan(businessId: string): string {
  for (const sub of subscriptions.values()) {
    if (sub.businessId === businessId && sub.status === "active") {
      return sub.plan;
    }
  }
  return "free";
}

/**
 * Return the PlanLimits for a plan. Unknown plans default to "free".
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}

// ─── Enforcement Error ──────────────────────────────────────────────────────

export interface EnforcementResult {
  allowed: boolean;
  current: number;
  limit: number;
}

export interface PlanLimitError {
  code: "PLAN_LIMIT_EXCEEDED";
  message: string;
  limit: number;
  current: number;
  plan: string;
  upgradeUrl: string;
}

export function buildPlanLimitError(
  message: string,
  limit: number,
  current: number,
  plan: string
): { success: false; error: PlanLimitError } {
  return {
    success: false,
    error: {
      code: "PLAN_LIMIT_EXCEEDED",
      message,
      limit,
      current,
      plan,
      upgradeUrl: "/pricing",
    },
  };
}

// ─── Campaign Limit ─────────────────────────────────────────────────────────

/**
 * Check whether the business can create a new campaign under their plan.
 * Counts only active + paused campaigns (not ended/expired/draft).
 */
export function checkCampaignLimit(
  businessId: string,
  plan: string
): EnforcementResult {
  const limits = getPlanLimits(plan);
  const campaigns = campaignManager.listByBusiness(businessId);
  const activeCampaigns = campaigns.filter(
    (c) => c.state === "active" || c.state === "paused"
  );
  const current = activeCampaigns.length;
  return {
    allowed: current < limits.maxCampaigns,
    current,
    limit: limits.maxCampaigns,
  };
}

// ─── Completion Limit ───────────────────────────────────────────────────────

/**
 * Check whether the business can record another completion this month.
 */
export function checkCompletionLimit(
  businessId: string,
  plan: string
): EnforcementResult {
  const limits = getPlanLimits(plan);
  const usage = getUsage(businessId);
  return {
    allowed: usage.completions < limits.maxCompletionsPerMonth,
    current: usage.completions,
    limit: limits.maxCompletionsPerMonth,
  };
}

/**
 * Increment the monthly completion counter for a business.
 * Call this after a submission is approved and perk awarded.
 *
 * Writes to in-memory cache synchronously AND fires a write-through to
 * Postgres so the counter survives cold starts (was the revenue leak —
 * free tier got effectively unlimited completions across redeploys).
 */
export function recordCompletion(businessId: string): void {
  const usage = getUsage(businessId);
  usage.completions += 1;
  void persistUsageDelta(businessId, usage.month, "completions");
}

// ─── AI Generation Limit ───────────────────────────────────────────────────

/**
 * Check whether the business can make another AI generation call this month.
 */
export function checkAiGenerationLimit(
  businessId: string,
  plan: string
): EnforcementResult {
  const limits = getPlanLimits(plan);
  const usage = getUsage(businessId);
  return {
    allowed: usage.aiGenerations < limits.aiGenerations,
    current: usage.aiGenerations,
    limit: limits.aiGenerations,
  };
}

/**
 * Increment the monthly AI generation counter for a business.
 * Call this after a successful AI generation.
 *
 * Writes to in-memory cache synchronously AND fires a write-through to
 * Postgres so the counter survives cold starts.
 */
export function recordAiGeneration(businessId: string): void {
  const usage = getUsage(businessId);
  usage.aiGenerations += 1;
  void persistUsageDelta(businessId, usage.month, "aiGenerations");
}

// ─── Postgres write-through + read-through hydration ───────────────────────

/**
 * Atomically increment a usage counter in Postgres. Uses ON CONFLICT
 * upsert so first increment of the month creates the row.
 *
 * Best-effort — silently swallows errors. The in-memory cache stays
 * authoritative for the current process; the DB sync is for durability
 * across cold starts.
 */
async function persistUsageDelta(
  businessId: string,
  month: string,
  counter: "aiGenerations" | "completions"
): Promise<void> {
  if (!usingDb) return;
  const column = counter === "aiGenerations" ? "ai_generations" : "completions";
  try {
    await db.query(
      `INSERT INTO monthly_usage (business_id, month, ${column}, updated_at)
       VALUES ($1, $2, 1, now())
       ON CONFLICT (business_id, month)
       DO UPDATE SET ${column} = monthly_usage.${column} + 1, updated_at = now()`,
      [businessId, month]
    );
  } catch (e) {
    console.error(`[enforcement] usage write failed:`, e instanceof Error ? e.message : e);
  }
}

/**
 * Load this month's usage counters from Postgres. Called lazily by
 * getUsage on first access for a (business, month) tuple in this
 * process. After that the in-memory map is the source of truth for the
 * process's lifetime.
 */
async function hydrateUsageFromDb(businessId: string, month: string): Promise<MonthlyUsage | null> {
  if (!usingDb) return null;
  try {
    const result = await db.query<{ ai_generations: number; completions: number }>(
      `SELECT ai_generations, completions FROM monthly_usage
       WHERE business_id = $1 AND month = $2`,
      [businessId, month]
    );
    if (result.rows.length === 0) return null;
    return {
      aiGenerations: Number(result.rows[0].ai_generations),
      completions: Number(result.rows[0].completions),
      month,
    };
  } catch (e) {
    console.error(`[enforcement] usage read failed:`, e instanceof Error ? e.message : e);
    return null;
  }
}

/**
 * Hydration scheduler — kicks off a background load whenever a new
 * (business, month) tuple appears in getUsage. Once hydration completes
 * the in-memory counters are updated to match the DB.
 *
 * Note: there's a brief window where the counter is 0-locally but
 * non-zero in the DB. Callers reading immediately after cold start may
 * pass a limit check that should fail. The window is bounded by DB
 * round-trip (~50ms) and is acceptable given (a) the alternative is
 * making every getUsage call async, (b) the leak is tiny per cold start.
 */
const _hydratedKeys = new Set<string>();
function scheduleHydration(businessId: string, month: string, target: MonthlyUsage): void {
  const key = `${businessId}:${month}`;
  if (_hydratedKeys.has(key)) return;
  _hydratedKeys.add(key);
  void hydrateUsageFromDb(businessId, month).then((row) => {
    if (row) {
      target.aiGenerations = Math.max(target.aiGenerations, row.aiGenerations);
      target.completions = Math.max(target.completions, row.completions);
    }
  });
}

// ─── Feature Access ─────────────────────────────────────────────────────────

const FEATURE_MAP: Record<string, keyof PlanLimits> = {
  analytics: "hasAnalytics",
  api: "hasApiAccess",
  qrCodes: "hasQrCodes",
};

/**
 * Check whether a plan includes access to a specific feature.
 */
export function checkFeatureAccess(
  plan: string,
  feature: "analytics" | "api" | "qrCodes"
): boolean {
  const limits = getPlanLimits(plan);
  const key = FEATURE_MAP[feature];
  return Boolean(limits[key]);
}

// ─── Lazy import to avoid module cycle ──────────────────────────────────────

/**
 * Tiny import wrapper so the lazy require can stay typed without leaking
 * a top-of-file import that would create a cycle (campaign-state-machine
 * depends on enforcement transitively).
 */
function importCampaignManager(): {
  campaignManager: { listByBusiness: (id: string) => unknown[] };
} {
  // Use dynamic require here intentionally; static import would cycle.
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require("../campaign-state-machine") as {
    campaignManager: { listByBusiness: (id: string) => unknown[] };
  };
}

// ─── Public usage summary ───────────────────────────────────────────────────

export interface UsageSummary {
  /** YYYY-MM identifier for the current period. */
  month: string;
  campaigns: { used: number; limit: number };
  completions: { used: number; limit: number };
  aiGenerations: { used: number; limit: number };
}

/**
 * Snapshot the calling business's usage for the current month, paired
 * with the plan's limits. Used by the billing dashboard to render usage
 * bars and trigger upgrade prompts when thresholds are crossed.
 *
 * Campaign count is derived live from the campaign manager since
 * campaigns aren't tracked in the monthly usageMap.
 */
export function getUsageSummary(businessId: string): UsageSummary {
  const plan = getBusinessPlan(businessId);
  const limits = getPlanLimits(plan);
  const usage = getUsage(businessId);

  // Live count of campaigns for this business — read from the campaign
  // state machine which is the source of truth for active campaigns.
  // Imported lazily inside a try to avoid a module cycle (campaigns
  // depend on enforcement for the limit check).
  let campaignsUsed = 0;
  try {
    const { campaignManager } = importCampaignManager();
    campaignsUsed = campaignManager.listByBusiness(businessId).length;
  } catch {
    campaignsUsed = 0;
  }

  return {
    month: usage.month,
    campaigns: {
      used: campaignsUsed,
      limit: limits.maxCampaigns === Infinity ? Number.POSITIVE_INFINITY : limits.maxCampaigns,
    },
    completions: {
      used: usage.completions,
      limit: limits.maxCompletionsPerMonth === Infinity ? Number.POSITIVE_INFINITY : limits.maxCompletionsPerMonth,
    },
    aiGenerations: {
      used: usage.aiGenerations,
      limit: limits.aiGenerations === Infinity ? Number.POSITIVE_INFINITY : limits.aiGenerations,
    },
  };
}

// ─── Testing Helpers ────────────────────────────────────────────────────────

/** Clear all usage tracking. For testing only. */
export function _resetUsage(): void {
  usageMap.clear();
}
