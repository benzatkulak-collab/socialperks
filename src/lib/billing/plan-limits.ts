// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Per-plan limits (pure data, no imports)
//
// Split out of enforcement.ts so that code which only needs the limits (e.g.
// the partner API) does not pull in the billing store, which loads whole tables
// at module load. enforcement.ts re-exports everything here unchanged.
// ══════════════════════════════════════════════════════════════════════════════

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
  // NOTE: key MUST match the plan slug sold in src/lib/billing/store.ts
  // ("professional"). It was previously "pro" only, so
  // getPlanLimits("professional") fell through to the free tier and every
  // paying Professional customer was silently capped at free limits.
  professional: {
    maxCampaigns: 50,
    maxCompletionsPerMonth: 5000,
    maxActions: 107,
    aiGenerations: 500,
    hasAnalytics: true,
    hasApiAccess: true,
    hasQrCodes: true,
  },
  // Back-compat alias for the legacy "pro" slug (older code + tests still
  // reference it). Keep in sync with `professional` above — same paid tier.
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

/**
 * Return the PlanLimits for a plan. Unknown plans default to "free".
 */
export function getPlanLimits(plan: string): PlanLimits {
  return PLAN_LIMITS[plan] ?? PLAN_LIMITS.free;
}
