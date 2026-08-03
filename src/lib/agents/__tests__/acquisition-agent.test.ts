import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { acquisitionAgent, scoreLead, type WaitlistLead } from "../acquisition-agent";

// ─── Hoisted DB mock ──────────────────────────────────────────────────────────
// fetchUncontactedLeads uses dynamic import("@/lib/db/connection"). We hoist a
// mutable mock so individual run() tests can control what leads come back.

const { mockQuery } = vi.hoisted(() => ({ mockQuery: vi.fn() }));

vi.mock("@/lib/db/connection", async () => {
  // Distinct class so `db instanceof InMemoryConnection` is false for our stub,
  // letting fetchUncontactedLeads proceed to db.query() instead of returning [].
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockQuery } };
});

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-08-03T12:00:00Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
// 14.5 days before NOW — well inside the freshness window
const FRESH_DATE = "2026-07-20T00:00:00Z";
// 63.5 days before NOW — past the default 30-day cutoff
const AGED_DATE = "2026-06-01T00:00:00Z";
const DEFAULT_THRESHOLD = 0.55;

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return { email: "test@example.com", vertical: "retail", createdAt: FRESH_DATE, ...overrides };
}

function makeDbRow(overrides: Partial<{
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
}> = {}) {
  return {
    email: "lead@example.com",
    business_name: null,
    city: null,
    vertical: "retail",
    referrer: null,
    created_at: FRESH_DATE,
    ...overrides,
  };
}

// ─── scoreLead: weight branches ───────────────────────────────────────────────

describe("scoreLead — individual weights", () => {
  it("base 0.30: list signup with no bonuses, fresh lead", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 10);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for referrer → 0.60", () => {
    const { confidence, reasons } = scoreLead(makeLead({ referrer: "partner.com" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60, 10);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.50, 10);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName present → 0.40", () => {
    const { confidence, reasons } = scoreLead(makeLead({ businessName: "Joe's Coffee" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.40, 10);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city present → 0.35", () => {
    const { confidence, reasons } = scoreLead(makeLead({ city: "Seattle" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.35, 10);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for aged lead (base only) → 0.15", () => {
    const { confidence, reasons } = scoreLead(makeLead({ createdAt: AGED_DATE }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15, 10);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });
});

// ─── scoreLead: combinations ──────────────────────────────────────────────────

describe("scoreLead — combined weights", () => {
  it("all bonuses, fresh: 0.30+0.30+0.20+0.10+0.05 = 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Brew Co",
      city: "Austin",
    });
    const { confidence, reasons } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95, 10);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("referred + aged: 0.60 - 0.15 = 0.45", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.45, 10);
  });

  it("ICP + named + fresh: 0.30+0.20+0.10 = 0.60", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Brew Co" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.60, 10);
  });
});

// ─── scoreLead: edge cases ────────────────────────────────────────────────────

describe("scoreLead — edge cases", () => {
  it("whitespace-only referrer does not trigger +0.30", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 10);
  });

  it("empty-string referrer does not trigger +0.30", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 10);
  });

  it("confidence is always within [0, 1]", () => {
    const cases: WaitlistLead[] = [
      makeLead(),
      makeLead({ referrer: "p", vertical: "coffee_shops", businessName: "B", city: "C" }),
      makeLead({ createdAt: AGED_DATE }),
      makeLead({ referrer: "p", createdAt: AGED_DATE }),
    ];
    for (const lead of cases) {
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("base-only lead (0.30) is below the threshold — would not act in live", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("ICP-only lead (0.50) is still below the threshold", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("referred fresh lead (0.60) is above the threshold — would act in live", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("referred + ICP lead (0.80) is comfortably above the threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "p", vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("referred + aged lead (0.45) is below the threshold even with referrer bonus", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });
});

// ─── acquisitionAgent.run() — dry-run invariant ───────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  const DRY_CTX = {
    live: false,
    config: { threshold: DEFAULT_THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
    now: NOW_ISO,
  };

  beforeEach(() => {
    // Two synthetic leads: one above threshold, one well below — covers both paths
    mockQuery.mockResolvedValue({
      rows: [
        makeDbRow({
          email: "hot@test.com",
          business_name: "Brew Co",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner.com",
          created_at: FRESH_DATE,
        }),
        makeDbRow({ email: "cold@test.com" }),
      ],
    });
  });

  afterEach(() => {
    mockQuery.mockReset();
  });

  it("all decisions have executed:false regardless of confidence", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    expect(decisions.length).toBeGreaterThan(0);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("even the high-confidence lead (0.95 ≥ threshold) is not executed in dry-run", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    const hot = decisions.find((d) => d.targetId === "hot@test.com");
    expect(hot).toBeDefined();
    expect(hot!.confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
    expect(hot!.executed).toBe(false);
  });

  it("decisions are sorted by confidence descending", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("hot lead confidence matches expected score (0.95)", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    const hot = decisions.find((d) => d.targetId === "hot@test.com");
    expect(hot!.confidence).toBeCloseTo(0.95, 10);
  });

  it("cold lead confidence matches expected score (0.30)", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    const cold = decisions.find((d) => d.targetId === "cold@test.com");
    expect(cold!.confidence).toBeCloseTo(0.30, 10);
  });
});
