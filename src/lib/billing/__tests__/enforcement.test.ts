import { describe, it, expect, beforeEach } from "vitest";
import {
  getPlanLimits,
  checkCampaignLimit,
  checkCompletionLimit,
  checkAiGenerationLimit,
  checkFeatureAccess,
  recordCompletion,
  recordAiGeneration,
  buildPlanLimitError,
  PLAN_LIMITS,
  _resetUsage,
} from "../enforcement";
import { PLATFORMS } from "@/lib/platforms";
import { campaignManager } from "@/lib/campaign-state-machine";
import type { LaunchConfig } from "@/lib/campaign-state-machine";

// ═══════════════ Helpers ═══════════════

let counter = 0;

function uid(prefix = "camp"): string {
  counter += 1;
  return `${prefix}-enf-${counter}-${Date.now()}`;
}

function defaultConfig(overrides?: Partial<LaunchConfig>): LaunchConfig {
  return {
    name: "Enforcement Test Campaign",
    budgetAllocated: 100,
    budgetType: "dol",
    maxCompletions: null,
    expiresInDays: 30,
    ...overrides,
  };
}

// ═══════════════ Setup ═══════════════

beforeEach(() => {
  campaignManager._reset();
  _resetUsage();
});

// ═══════════════ getPlanLimits ═══════════════

describe("getPlanLimits", () => {
  it("returns correct limits for every known plan", () => {
    expect(getPlanLimits("free")).toEqual(PLAN_LIMITS.free);
    expect(getPlanLimits("starter")).toEqual(PLAN_LIMITS.starter);
    expect(getPlanLimits("pro")).toEqual(PLAN_LIMITS.pro);
    expect(getPlanLimits("enterprise")).toEqual(PLAN_LIMITS.enterprise);
  });

  it("defaults unknown plans to free limits", () => {
    expect(getPlanLimits("unknown-plan")).toEqual(PLAN_LIMITS.free);
    expect(getPlanLimits("")).toEqual(PLAN_LIMITS.free);
  });

  it("free plan has strictest limits", () => {
    const free = getPlanLimits("free");
    expect(free.maxCampaigns).toBe(1);
    expect(free.maxCompletionsPerMonth).toBe(10);
    expect(free.maxActions).toBe(5);
    expect(free.aiGenerations).toBe(3);
    // Free gets the core loop (QR codes) and basic analytics on purpose —
    // those are what make the tier a real trial and what carry the
    // "Powered by Social Perks" attribution. API access stays paid-only.
    expect(free.hasAnalytics).toBe(true);
    expect(free.hasApiAccess).toBe(false);
    expect(free.hasQrCodes).toBe(true);
  });

  it("enterprise plan has unlimited campaigns and completions", () => {
    const ent = getPlanLimits("enterprise");
    expect(ent.maxCampaigns).toBe(Infinity);
    expect(ent.maxCompletionsPerMonth).toBe(Infinity);
    expect(ent.aiGenerations).toBe(Infinity);
  });
});

// ═══════════════ checkCampaignLimit ═══════════════

describe("checkCampaignLimit", () => {
  const bizId = "biz-camp-test";

  it("allows first campaign on free plan", () => {
    const result = checkCampaignLimit(bizId, "free");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(1);
  });

  it("blocks second campaign on free plan", () => {
    // Launch one active campaign
    campaignManager.launch(uid(), bizId, defaultConfig());

    const result = checkCampaignLimit(bizId, "free");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(1);
    expect(result.limit).toBe(1);
  });

  it("does not count ended campaigns against limit", () => {
    const campId = uid();
    campaignManager.launch(campId, bizId, defaultConfig());
    campaignManager.end(campId, bizId, "done");

    const result = checkCampaignLimit(bizId, "free");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
  });

  it("counts paused campaigns against limit", () => {
    const campId = uid();
    campaignManager.launch(campId, bizId, defaultConfig());
    campaignManager.pause(campId, bizId, "pausing");

    const result = checkCampaignLimit(bizId, "free");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(1);
  });

  it("allows many campaigns on starter plan", () => {
    // Launch 9 active campaigns
    for (let i = 0; i < 9; i++) {
      campaignManager.launch(uid(), bizId, defaultConfig());
    }

    const result = checkCampaignLimit(bizId, "starter");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(9);
    expect(result.limit).toBe(10);
  });

  it("blocks 11th campaign on starter plan", () => {
    for (let i = 0; i < 10; i++) {
      campaignManager.launch(uid(), bizId, defaultConfig());
    }

    const result = checkCampaignLimit(bizId, "starter");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(10);
    expect(result.limit).toBe(10);
  });

  it("never blocks enterprise plan", () => {
    for (let i = 0; i < 100; i++) {
      campaignManager.launch(uid(), bizId, defaultConfig());
    }

    const result = checkCampaignLimit(bizId, "enterprise");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(100);
    expect(result.limit).toBe(Infinity);
  });

  it("isolates counts per business", () => {
    campaignManager.launch(uid(), "biz-a", defaultConfig());
    campaignManager.launch(uid(), "biz-b", defaultConfig());

    expect(checkCampaignLimit("biz-a", "free").current).toBe(1);
    expect(checkCampaignLimit("biz-b", "free").current).toBe(1);
    expect(checkCampaignLimit("biz-c", "free").current).toBe(0);
  });
});

// ═══════════════ checkCompletionLimit ═══════════════

describe("checkCompletionLimit", () => {
  const bizId = "biz-comp-test";

  it("allows completions when under limit", () => {
    const result = checkCompletionLimit(bizId, "free");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(10);
  });

  it("blocks completions at limit", () => {
    for (let i = 0; i < 10; i++) {
      recordCompletion(bizId);
    }

    const result = checkCompletionLimit(bizId, "free");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(10);
    expect(result.limit).toBe(10);
  });

  it("starter plan has 500 completion limit", () => {
    const result = checkCompletionLimit(bizId, "starter");
    expect(result.limit).toBe(500);
    expect(result.allowed).toBe(true);
  });

  it("enterprise plan has infinite completions", () => {
    for (let i = 0; i < 1000; i++) {
      recordCompletion(bizId);
    }

    const result = checkCompletionLimit(bizId, "enterprise");
    expect(result.allowed).toBe(true);
    expect(result.limit).toBe(Infinity);
  });

  it("isolates counts per business", () => {
    recordCompletion("biz-x");
    recordCompletion("biz-x");
    recordCompletion("biz-y");

    expect(checkCompletionLimit("biz-x", "free").current).toBe(2);
    expect(checkCompletionLimit("biz-y", "free").current).toBe(1);
    expect(checkCompletionLimit("biz-z", "free").current).toBe(0);
  });
});

// ═══════════════ checkAiGenerationLimit ═══════════════

describe("checkAiGenerationLimit", () => {
  const bizId = "biz-ai-test";

  it("allows AI generations when under limit", () => {
    const result = checkAiGenerationLimit(bizId, "free");
    expect(result.allowed).toBe(true);
    expect(result.current).toBe(0);
    expect(result.limit).toBe(3);
  });

  it("blocks AI generations at free plan limit", () => {
    for (let i = 0; i < 3; i++) {
      recordAiGeneration(bizId);
    }

    const result = checkAiGenerationLimit(bizId, "free");
    expect(result.allowed).toBe(false);
    expect(result.current).toBe(3);
    expect(result.limit).toBe(3);
  });

  it("pro plan has 500 AI generation limit", () => {
    const result = checkAiGenerationLimit(bizId, "pro");
    expect(result.limit).toBe(500);
    expect(result.allowed).toBe(true);
  });
});

// ═══════════════ checkFeatureAccess ═══════════════

describe("checkFeatureAccess", () => {
  it("free plan gets QR codes and basic analytics, but not API", () => {
    expect(checkFeatureAccess("free", "analytics")).toBe(true);
    expect(checkFeatureAccess("free", "qrCodes")).toBe(true);
    expect(checkFeatureAccess("free", "api")).toBe(false);
  });

  it("starter plan has analytics and QR codes but no API", () => {
    expect(checkFeatureAccess("starter", "analytics")).toBe(true);
    expect(checkFeatureAccess("starter", "api")).toBe(false);
    expect(checkFeatureAccess("starter", "qrCodes")).toBe(true);
  });

  it("pro plan has all features", () => {
    expect(checkFeatureAccess("pro", "analytics")).toBe(true);
    expect(checkFeatureAccess("pro", "api")).toBe(true);
    expect(checkFeatureAccess("pro", "qrCodes")).toBe(true);
  });

  it("enterprise plan has all features", () => {
    expect(checkFeatureAccess("enterprise", "analytics")).toBe(true);
    expect(checkFeatureAccess("enterprise", "api")).toBe(true);
    expect(checkFeatureAccess("enterprise", "qrCodes")).toBe(true);
  });

  it("unknown plan defaults to free feature access", () => {
    expect(checkFeatureAccess("nonexistent", "analytics")).toBe(true);
    expect(checkFeatureAccess("nonexistent", "qrCodes")).toBe(true);
    // API access is the one that must never fall open on an unknown plan.
    expect(checkFeatureAccess("nonexistent", "api")).toBe(false);
  });
});

// ═══════════════ buildPlanLimitError ═══════════════

describe("buildPlanLimitError", () => {
  it("returns correctly structured error object", () => {
    const result = buildPlanLimitError("Test message", 10, 10, "starter");
    expect(result).toEqual({
      success: false,
      error: {
        code: "PLAN_LIMIT_EXCEEDED",
        message: "Test message",
        limit: 10,
        current: 10,
        plan: "starter",
        upgradeUrl: "/pricing",
      },
    });
  });
});

// ═══════════════ Action caps vs the live catalog ═══════════════
//
// Regression guard for a real drift bug: PLAN_LIMITS hardcoded
// `maxActions: 107` on every paid tier — the catalog size at the time it was
// written. PLATFORMS later grew to 125 actions, so the paid plans silently
// capped below the catalog they advertise, and /api/v1/billing reported the
// stale number to agents. These assertions fail the build the next time the
// catalog grows past a hardcoded cap.

describe("maxActions vs the PLATFORMS catalog", () => {
  const catalogActionCount = PLATFORMS.reduce(
    (total, platform) => total + platform.actions.length,
    0
  );

  it("has a non-empty action catalog to compare against", () => {
    expect(catalogActionCount).toBeGreaterThan(0);
  });

  it("never caps a paid tier below the full action catalog", () => {
    for (const plan of ["starter", "professional", "pro", "enterprise"]) {
      const limits = getPlanLimits(plan);
      if (plan === "starter") {
        // Starter is a deliberate, sold-as-such subset — it just must not
        // exceed the catalog.
        expect(limits.maxActions).toBeLessThanOrEqual(catalogActionCount);
      } else {
        expect(limits.maxActions).toBeGreaterThanOrEqual(catalogActionCount);
      }
    }
  });

  it("keeps the free tier's sample below the full catalog", () => {
    expect(getPlanLimits("free").maxActions).toBeLessThan(catalogActionCount);
  });
});
