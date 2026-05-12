// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Billing Plan Enforcement
//
// Checks plan limits for campaigns, completions, AI generations, and feature
// access. Returns structured errors the frontend can use to show upgrade modals.
// ══════════════════════════════════════════════════════════════════════════════

import { campaignManager } from "@/lib/campaign-state-machine";
import { subscriptions } from "@/lib/billing/store";

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

// Cap the in-memory usage map to bound memory growth in long-lived server
// processes. Without eviction, every distinct businessId that ever touched
// the AI-generation gate stays in the map forever — and after enough months
// the count grows unbounded. Lib audit MEDIUM #1.
const MAX_USAGE_ENTRIES = 50_000;
const EVICT_BATCH = 1_000;

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function evictStaleEntries(currentMonthStr: string): void {
  if (usageMap.size < MAX_USAGE_ENTRIES) return;
  // First pass: drop any entry whose month is not the current month — those
  // are stale by definition since usage resets monthly.
  let dropped = 0;
  for (const [id, usage] of usageMap) {
    if (usage.month !== currentMonthStr) {
      usageMap.delete(id);
      dropped += 1;
      if (dropped >= EVICT_BATCH) break;
    }
  }
  // If still over cap (everyone is active this month), fall back to FIFO.
  if (usageMap.size >= MAX_USAGE_ENTRIES) {
    const iter = usageMap.keys();
    for (let i = 0; i < EVICT_BATCH; i++) {
      const next = iter.next();
      if (next.done) break;
      usageMap.delete(next.value);
    }
  }
}

function getUsage(businessId: string): MonthlyUsage {
  const month = currentMonth();
  let usage = usageMap.get(businessId);
  if (!usage || usage.month !== month) {
    evictStaleEntries(month);
    usage = { aiGenerations: 0, completions: 0, month };
    usageMap.set(businessId, usage);
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
 */
export function recordCompletion(businessId: string): void {
  const usage = getUsage(businessId);
  usage.completions += 1;
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
 */
export function recordAiGeneration(businessId: string): void {
  const usage = getUsage(businessId);
  usage.aiGenerations += 1;
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

// ─── Testing Helpers ────────────────────────────────────────────────────────

/** Clear all usage tracking. For testing only. */
export function _resetUsage(): void {
  usageMap.clear();
}
