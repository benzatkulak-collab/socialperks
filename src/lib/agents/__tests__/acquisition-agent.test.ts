import { describe, it, expect } from "vitest";
import {
  acquisitionAgent,
  scoreLead,
  type WaitlistLead,
} from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── Fixtures ────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-06-22T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;

/** A fresh lead with the bare minimum (just an email + vertical). */
function baseLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "lead@example.com",
    vertical: "restaurants", // not the ICP vertical
    createdAt: new Date(NOW_MS - 5 * 86_400_000).toISOString(), // 5 days old — fresh
    ...overrides,
  };
}

/** A lead that is older than maxAgeDays. */
function agedLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return baseLead({
    createdAt: new Date(NOW_MS - 45 * 86_400_000).toISOString(), // 45 days — cold
    ...overrides,
  });
}

/** Dry-run AgentRunContext with default config. */
function dryRunCtx(): AgentRunContext {
  return {
    live: false,
    config: { threshold: 0.55, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
    now: NOW_ISO,
  };
}

// ─── scoreLead — individual weight branches ───────────────────────────────────

describe("scoreLead — base score", () => {
  it("fresh lead with no extras scores 0.30", () => {
    const { confidence, reasons } = scoreLead(baseLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toHaveLength(0);
  });
});

describe("scoreLead — +0.30 for referred", () => {
  it("lead with a valid referrer scores 0.60", () => {
    const { confidence, reasons } = scoreLead(
      baseLead({ referrer: "partner-channel" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer is not counted", () => {
    const { confidence, reasons } = scoreLead(
      baseLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).not.toContain("referred");
  });
});

describe("scoreLead — +0.20 for ICP vertical (coffee_shops)", () => {
  it("coffee_shops vertical scores 0.50", () => {
    const { confidence, reasons } = scoreLead(
      baseLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });
});

describe("scoreLead — +0.10 for named business", () => {
  it("businessName present scores 0.40", () => {
    const { confidence, reasons } = scoreLead(
      baseLead({ businessName: "Morning Grind" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });
});

describe("scoreLead — +0.05 for city", () => {
  it("city present scores 0.35", () => {
    const { confidence, reasons } = scoreLead(
      baseLead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });
});

describe("scoreLead — −0.15 for aged lead", () => {
  it("aged lead scores 0.15 (base 0.30 − 0.15)", () => {
    const { confidence, reasons } = scoreLead(agedLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("lead exactly at maxAgeDays boundary is NOT penalised", () => {
    const exactLead = baseLead({
      createdAt: new Date(NOW_MS - MAX_AGE_DAYS * 86_400_000).toISOString(),
    });
    const { confidence } = scoreLead(exactLead, NOW_MS, MAX_AGE_DAYS);
    // ageDays === maxAgeDays → condition is >, not >= → no penalty
    expect(confidence).toBeCloseTo(0.30);
  });
});

describe("scoreLead — additive combos", () => {
  it("all bonuses, no age penalty → 0.95", () => {
    const { confidence, reasons } = scoreLead(
      baseLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Beam Coffee",
        city: "Portland",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toEqual(["referred", "ICP vertical", "named business", "city known"]);
  });

  it("all bonuses, aged → 0.80", () => {
    const { confidence } = scoreLead(
      agedLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Late Riser",
        city: "Denver",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 − 0.15 = 0.80
    expect(confidence).toBeCloseTo(0.80);
  });
});

describe("scoreLead — clamp guards", () => {
  it("confidence never exceeds 1.0", () => {
    const { confidence } = scoreLead(
      baseLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Apex",
        city: "NYC",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  it("confidence never drops below 0.0", () => {
    const { confidence } = scoreLead(agedLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(0.0);
  });
});

// ─── Threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const THRESHOLD = 0.55;

  it("referred lead (0.60) is above threshold → would execute in live", () => {
    const { confidence } = scoreLead(
      baseLead({ referrer: "partner" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base-only lead (0.30) is below threshold → would NOT execute in live", () => {
    const { confidence } = scoreLead(baseLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP-only lead (0.50) is below threshold → would NOT execute in live", () => {
    const { confidence } = scoreLead(
      baseLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP + named business (0.60) is above threshold → would execute in live", () => {
    const { confidence } = scoreLead(
      baseLead({ vertical: "coffee_shops", businessName: "Grind" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.20 + 0.10 = 0.60
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ─── run() — dry-run contract ────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run mode", () => {
  it("returns an array (graceful with no DB)", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    expect(Array.isArray(decisions)).toBe(true);
  });

  it("all decisions have executed=false in dry-run", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("agent id and metadata are correct", () => {
    expect(acquisitionAgent.id).toBe("acquisition-agent");
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
    expect(acquisitionAgent.config.custom?.maxAgeDays.default).toBe(30);
  });
});
