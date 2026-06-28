import { describe, it, expect } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";

// Fixed epoch so age calculations are fully deterministic (no real Date.now()).
const NOW_MS = new Date("2026-01-15T12:00:00Z").getTime();
const DEFAULT_MAX_AGE = 30;

function freshDate() {
  // 5 days old — well within the 30-day cutoff
  return new Date(NOW_MS - 5 * 86_400_000).toISOString();
}

function agedDate() {
  // 35 days old — past the 30-day cutoff
  return new Date(NOW_MS - 35 * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "other",
    createdAt: freshDate(),
    ...overrides,
  };
}

// ─── Individual weight branches ──────────────────────────────────────────────

describe("scoreLead — individual weight branches", () => {
  it("bare signup (no extras, fresh) → 0.30 base only", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toEqual([]);
  });

  it("referred lead → +0.30 bonus (total 0.60)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-site.com" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("ICP vertical (coffee_shops) → +0.20 bonus (total 0.50)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("named business → +0.10 bonus (total 0.40)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Sunrise Coffee" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("city known → +0.05 bonus (total 0.35)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("aged lead (35d > maxAgeDays 30d) → -0.15 penalty (total 0.15)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: agedDate() }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });
});

// ─── Compound / stacked weights ──────────────────────────────────────────────

describe("scoreLead — compound scores", () => {
  it("fully warm fresh lead → 0.95 (0.30+0.30+0.20+0.10+0.05)", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner.com",
        vertical: "coffee_shops",
        businessName: "Morning Brew",
        city: "Portland",
      }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("fully warm but aged → 0.80 (0.95 − 0.15)", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner.com",
        vertical: "coffee_shops",
        businessName: "Morning Brew",
        city: "Portland",
        createdAt: agedDate(),
      }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.80);
  });

  it("ICP + named + city (no referrer), fresh → 0.65", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Bean Street", city: "Seattle" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.65);
  });

  it("referred + aged (no other bonuses) → 0.45 (0.30+0.30−0.15)", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "intro.io", createdAt: agedDate() }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.45);
  });
});

// ─── Referrer edge cases ─────────────────────────────────────────────────────

describe("scoreLead — referrer edge cases", () => {
  it("undefined referrer → no bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: undefined }), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("empty-string referrer → no bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "" }), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("whitespace-only referrer → no bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });
});

// ─── Age boundary (> vs >=) ──────────────────────────────────────────────────

describe("scoreLead — age boundary", () => {
  it("lead exactly at maxAgeDays (30d) is NOT penalized", () => {
    const exactly30d = new Date(NOW_MS - 30 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: exactly30d }), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("lead one day past maxAgeDays (31d) IS penalized", () => {
    const over31d = new Date(NOW_MS - 31 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: over31d }), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("custom maxAgeDays of 7 penalizes a 10-day-old lead", () => {
    const tenDays = new Date(NOW_MS - 10 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: tenDays }), NOW_MS, 7);
    expect(confidence).toBeCloseTo(0.15);
  });
});

// ─── Threshold gate (default 0.55) ───────────────────────────────────────────

describe("scoreLead — threshold gate", () => {
  it("fully warm lead (0.95) is above default threshold → would act in live", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner.com",
        vertical: "coffee_shops",
        businessName: "Brew Co",
        city: "NYC",
      }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("referred-only (0.60) is above threshold → would act in live", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "intro.io" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("ICP-only (0.50) is below threshold → would NOT act", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeLessThan(0.55);
  });

  it("bare signup (0.30) is below threshold → would NOT act", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeLessThan(0.55);
  });
});

// ─── score clamping ───────────────────────────────────────────────────────────

describe("scoreLead — output stays in [0, 1]", () => {
  it("maximum possible score (all bonuses) is clamped ≤ 1", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "x",
        vertical: "coffee_shops",
        businessName: "Y",
        city: "Z",
      }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeLessThanOrEqual(1);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("minimum possible score (all penalties) is clamped ≥ 0", () => {
    const { confidence } = scoreLead(
      makeLead({ createdAt: agedDate() }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
  });
});

// ─── dry-run contract ─────────────────────────────────────────────────────────

describe("acquisitionAgent.run — dry-run contract", () => {
  it("returns an array with executed:false for every decision when live=false", async () => {
    const ctx = {
      live: false,
      config: {
        threshold: 0.55,
        maxActionsPerRun: 25,
        custom: { maxAgeDays: DEFAULT_MAX_AGE },
      },
      now: new Date(NOW_MS).toISOString(),
    };
    const decisions = await acquisitionAgent.run(ctx);
    expect(Array.isArray(decisions)).toBe(true);
    // In this isolated env fetchUncontactedLeads returns [] — asserts the
    // contract holds for whatever decisions do come back.
    expect(decisions.every((d) => d.executed === false)).toBe(true);
  });
});
