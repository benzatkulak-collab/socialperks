import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";

// Fixed reference time: 2026-07-07T00:00:00.000Z
const NOW_ISO = "2026-07-07T00:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE = 30;

// Hoist the mock query fn so it can be referenced inside vi.mock (factory is
// hoisted before regular module scope runs).
const mockDbQuery = vi.hoisted(() => vi.fn());

// Intercept the dynamic `await import("@/lib/db/connection")` inside
// fetchUncontactedLeads. db is NOT an InMemoryConnection → the function
// will call db.query and return its rows.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockDbQuery } };
});

function daysAgo(n: number): string {
  return new Date(NOW_MS - n * 86_400_000).toISOString();
}

function makeCtx(overrides: Partial<Parameters<typeof acquisitionAgent.run>[0]> = {}) {
  return {
    live: false as const,
    now: NOW_ISO,
    config: { threshold: 0.55, maxActionsPerRun: 10, custom: { maxAgeDays: MAX_AGE } },
    ...overrides,
  };
}

type DbRow = {
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
};

function dbRows(leads: DbRow[]) {
  return { rows: leads, rowCount: leads.length, duration: 0 };
}

// ─── scoreLead — individual weight branches ──────────────────────────────────

describe("scoreLead", () => {
  it("base only → 0.30", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "retail", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toHaveLength(0);
  });

  it("referrer adds +0.30", () => {
    const { confidence, reasons } = scoreLead(
      { email: "b@x.com", vertical: "retail", referrer: "partner", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer is not counted as referred", () => {
    const { confidence } = scoreLead(
      { email: "b2@x.com", vertical: "retail", referrer: "   ", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.3);
  });

  it("ICP vertical (coffee_shops) adds +0.20", () => {
    const { confidence, reasons } = scoreLead(
      { email: "c@x.com", vertical: "coffee_shops", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("businessName adds +0.10", () => {
    const { confidence, reasons } = scoreLead(
      { email: "d@x.com", vertical: "retail", businessName: "My Shop", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("city adds +0.05", () => {
    const { confidence, reasons } = scoreLead(
      { email: "e@x.com", vertical: "retail", city: "Austin", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("age > maxAgeDays subtracts 0.15 and notes the age", () => {
    const { confidence, reasons } = scoreLead(
      { email: "f@x.com", vertical: "retail", createdAt: daysAgo(35) },
      NOW_MS,
      MAX_AGE,
    );
    // 0.30 - 0.15 = 0.15 (still positive, not clamped)
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("all positive signals → 0.95 (0.30+0.30+0.20+0.10+0.05)", () => {
    const { confidence } = scoreLead(
      {
        email: "g@x.com",
        businessName: "Brew Co",
        city: "Denver",
        vertical: "coffee_shops",
        referrer: "ref",
        createdAt: daysAgo(1),
      },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("scores are always clamped to [0, 1]", () => {
    // Maximally penalised lead still can't go below 0
    const { confidence: low } = scoreLead(
      { email: "h1@x.com", vertical: "retail", createdAt: daysAgo(999) },
      NOW_MS,
      MAX_AGE,
    );
    expect(low).toBeGreaterThanOrEqual(0);

    // Maximally boosted lead still can't exceed 1
    const { confidence: high } = scoreLead(
      {
        email: "h2@x.com",
        businessName: "X",
        city: "Y",
        vertical: "coffee_shops",
        referrer: "z",
        createdAt: daysAgo(1),
      },
      NOW_MS,
      MAX_AGE,
    );
    expect(high).toBeLessThanOrEqual(1);
  });
});

// ─── threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const THRESHOLD = 0.55;

  it("ICP + named + city lead (0.65) is above threshold — would act in live", () => {
    const { confidence } = scoreLead(
      {
        email: "t1@x.com",
        businessName: "Bean Spot",
        city: "NYC",
        vertical: "coffee_shops",
        createdAt: daysAgo(5),
      },
      NOW_MS,
      MAX_AGE,
    );
    // 0.30 + 0.20 + 0.10 + 0.05 = 0.65
    expect(confidence).toBeCloseTo(0.65);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base-only lead (0.30) is below threshold — would not act", () => {
    const { confidence } = scoreLead(
      { email: "t2@x.com", vertical: "retail", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("aged referred+ICP lead (0.65) is still above threshold", () => {
    const { confidence } = scoreLead(
      {
        email: "t3@x.com",
        vertical: "coffee_shops",
        referrer: "ref",
        createdAt: daysAgo(40),
      },
      NOW_MS,
      MAX_AGE,
    );
    // 0.30 + 0.30 + 0.20 - 0.15 = 0.65
    expect(confidence).toBeCloseTo(0.65);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ─── run() dry-run mode ──────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("returns [] when there are no uncontacted leads", async () => {
    mockDbQuery.mockResolvedValueOnce(dbRows([]));
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
  });

  it("all decisions have executed:false regardless of confidence score", async () => {
    mockDbQuery.mockResolvedValueOnce(
      dbRows([
        // High-confidence (0.95) — above threshold, but dry-run must block execution
        {
          email: "hi@x.com",
          business_name: "Brew",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "r",
          created_at: daysAgo(5),
        },
        // Low-confidence (0.30) — below threshold
        {
          email: "lo@x.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgo(5),
        },
      ]),
    );

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted highest-confidence first", async () => {
    mockDbQuery.mockResolvedValueOnce(
      dbRows([
        // Low inserted first intentionally
        {
          email: "lo@x.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgo(5),
        },
        {
          email: "hi@x.com",
          business_name: "Brew",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "r",
          created_at: daysAgo(5),
        },
      ]),
    );

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("hi@x.com");
  });

  it("decision meta contains the expected fields", async () => {
    mockDbQuery.mockResolvedValueOnce(
      dbRows([
        {
          email: "m@x.com",
          business_name: "Café Sol",
          city: "Denver",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(3),
        },
      ]),
    );

    const [d] = await acquisitionAgent.run(makeCtx());

    expect(d.targetId).toBe("m@x.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.meta).toMatchObject({
      businessName: "Café Sol",
      city: "Denver",
      vertical: "coffee_shops",
      referred: true,
    });
  });

  it("DB error is caught — returns [] without throwing", async () => {
    mockDbQuery.mockRejectedValueOnce(new Error("DB connection refused"));
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
  });
});
