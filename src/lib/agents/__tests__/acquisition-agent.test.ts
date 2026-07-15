import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock db/connection so fetchUncontactedLeads is controllable in run() tests.
// The mock db is a plain object — NOT an instance of the mock InMemoryConnection —
// so the "if (db instanceof InMemoryConnection) return []" guard is false and
// query() is called, letting us inject synthetic rows.
const mockDbQuery = vi.fn();

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    db: { query: mockDbQuery },
    InMemoryConnection,
  };
});

import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-01-15T12:00:00Z").getTime();
const MAX_AGE = 30;
const THRESHOLD = 0.55;

function daysAgoIso(days: number): string {
  return new Date(NOW - days * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "other",
    createdAt: daysAgoIso(10),
    ...overrides,
  };
}

function makeCtx(live = false) {
  return {
    live,
    config: {
      threshold: THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE },
    },
    now: new Date(NOW).toISOString(),
  };
}

// Shape fetchUncontactedLeads's raw DB rows (snake_case, nullable columns).
type DbRow = {
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
};

function dbRow(overrides: Partial<DbRow> = {}): DbRow {
  return {
    email: "test@example.com",
    business_name: null,
    city: null,
    vertical: "other",
    referrer: null,
    created_at: daysAgoIso(10),
    ...overrides,
  };
}

// ─── scoreLead — weighted sum ──────────────────────────────────────────────────

describe("scoreLead — weighted sum", () => {
  it("base only: anonymous, unknown vertical, no city, fresh → 0.30", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for non-empty referrer → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer does NOT trigger referred bonus", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Java Hut" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for aged lead (45d > maxAge 30d) → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: daysAgoIso(45) }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fully-loaded ICP lead (referred + ICP + named + city, fresh) → 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Grounds Zero",
        city: "Portland",
      }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("aged fully-loaded lead → 0.80 (0.95 − 0.15)", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Bean There",
        city: "Denver",
        createdAt: daysAgoIso(45),
      }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("score is clamped to [0, 1]", () => {
    // Max possible is 0.95, so upper clamp should never trigger — but verify it
    const { confidence: high } = scoreLead(
      makeLead({
        referrer: "x",
        vertical: "coffee_shops",
        businessName: "x",
        city: "x",
      }),
      NOW,
      MAX_AGE,
    );
    expect(high).toBeLessThanOrEqual(1);

    // Min possible with current weights is 0.15 (base 0.30 − age 0.15),
    // so lower clamp doesn't fire either, but the invariant must hold.
    const { confidence: low } = scoreLead(
      makeLead({ createdAt: daysAgoIso(45) }),
      NOW,
      MAX_AGE,
    );
    expect(low).toBeGreaterThanOrEqual(0);
  });
});

// ─── Threshold gate ────────────────────────────────────────────────────────────

describe("threshold gate (default threshold = 0.55)", () => {
  it("anonymous fresh lead (0.30) is BELOW threshold — would not act in live mode", () => {
    const { confidence } = scoreLead(makeLead(), NOW, MAX_AGE);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred lead (0.60) CLEARS threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP vertical alone (0.50) sits just below threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP + named business (0.60) clears threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Cuppa" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("aged referred+ICP lead (0.65) still clears threshold despite age penalty", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "x",
        vertical: "coffee_shops",
        createdAt: daysAgoIso(45),
      }),
      NOW,
      MAX_AGE,
    );
    // 0.30 + 0.30 + 0.20 − 0.15 = 0.65
    expect(confidence).toBeCloseTo(0.65);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ─── acquisitionAgent.run() — dry-run invariant ───────────────────────────────

describe("acquisitionAgent.run() — dry-run invariant", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("defaultMode is dry-run", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("returns empty decisions when DB returns no rows", async () => {
    mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(0);
  });

  it("all decisions have executed:false in dry-run mode", async () => {
    const rows = [
      // high-confidence: would act if live
      dbRow({
        email: "a@test.com",
        vertical: "coffee_shops",
        referrer: "partner",
        business_name: "Top Shop",
        city: "NYC",
      }),
      // low-confidence: below threshold
      dbRow({ email: "b@test.com", vertical: "other" }),
    ];
    mockDbQuery.mockResolvedValue({ rows, rowCount: rows.length, duration: 1 });

    const decisions = await acquisitionAgent.run(makeCtx(false));

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted highest-confidence first", async () => {
    const rows = [
      // low first in DB result order
      dbRow({ email: "low@test.com", vertical: "other" }),
      // high second
      dbRow({
        email: "high@test.com",
        vertical: "coffee_shops",
        referrer: "partner",
        business_name: "Top",
        city: "LA",
      }),
    ];
    mockDbQuery.mockResolvedValue({ rows, rowCount: rows.length, duration: 1 });

    const decisions = await acquisitionAgent.run(makeCtx(false));

    expect(decisions[0].targetId).toBe("high@test.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("decision meta reflects lead properties", async () => {
    const rows = [
      dbRow({
        email: "meta@test.com",
        vertical: "coffee_shops",
        referrer: "partner",
        business_name: "Meta Cafe",
        city: "Denver",
        created_at: daysAgoIso(5),
      }),
    ];
    mockDbQuery.mockResolvedValue({ rows, rowCount: 1, duration: 1 });

    const [d] = await acquisitionAgent.run(makeCtx(false));

    expect(d.targetId).toBe("meta@test.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.referred).toBe(true);
    expect(d.meta?.businessName).toBe("Meta Cafe");
    expect(d.meta?.city).toBe("Denver");
  });
});
