import { describe, it, expect, beforeEach, vi } from "vitest";
import { acquisitionAgent, scoreLead, type WaitlistLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── DB mock ─────────────────────────────────────────────────────────────────
// fetchUncontactedLeads does a dynamic import of @/lib/db/connection and
// early-returns [] when db instanceof InMemoryConnection. By providing a
// plain-object db (not an instance of the fake class) vitest intercepts the
// dynamic import and lets us inject synthetic rows per test.

const mockQuery = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ rows: [], rowCount: 0, duration: 0 }),
);

vi.mock("@/lib/db/connection", () => {
  class FakeInMemoryConnection {}
  return {
    InMemoryConnection: FakeInMemoryConnection,
    db: { query: mockQuery },
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-06T12:00:00Z");
const NOW_MS = NOW.getTime();
const MAX_AGE_DAYS = 30;
const DEFAULT_THRESHOLD = 0.55;

function daysAgo(days: number): string {
  return new Date(NOW_MS - days * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "salons",
    createdAt: daysAgo(5),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: NOW.toISOString(),
    config: {
      threshold: DEFAULT_THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    ...overrides,
  };
}

// ─── scoreLead — weighted sums ────────────────────────────────────────────────

describe("scoreLead – weighted sums", () => {
  it("base score 0.30 for a plain signup with no extras", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBe(0.3);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for referred → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-cafe" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Sunrise Cuts" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for aged lead → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: daysAgo(45) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("full ICP (referred + coffee_shops + businessName + city) = 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Latte Lab",
        city: "Austin",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("full ICP aged (all bonuses − age penalty) = 0.80", () => {
    const { confidence } = scoreLead(
      makeLead({
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Latte Lab",
        city: "Austin",
        createdAt: daysAgo(45),
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("whitespace-only referrer does NOT earn the referral bonus", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3);
  });

  it("confidence is always in [0, 1]", () => {
    for (const lead of [
      makeLead(),
      makeLead({ referrer: "p", vertical: "coffee_shops", businessName: "X", city: "Y" }),
      makeLead({ createdAt: daysAgo(90) }),
    ]) {
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate", () => {
  it("referred lead (0.60) clears the default threshold (0.55)", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("base-only lead (0.30) does NOT clear the default threshold", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("ICP-only lead (0.50) does NOT clear the default threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });
});

// ─── run() – dry-run ─────────────────────────────────────────────────────────

describe("run() – dry-run", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
  });

  it("returns empty decisions when no leads exist", async () => {
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });

  it("all decisions have executed=false regardless of confidence", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "warm@test.com",
          business_name: "Latte Lab",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
        {
          email: "cold@test.com",
          business_name: null,
          city: null,
          vertical: "salons",
          referrer: null,
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 5,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toHaveLength(2);
    expect(decisions.every((d) => d.executed === false)).toBe(true);
  });

  it("decisions are sorted highest-confidence first", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        // cold lead first in DB order
        {
          email: "cold@test.com",
          business_name: null,
          city: null,
          vertical: "salons",
          referrer: null,
          created_at: daysAgo(5),
        },
        // warm lead second in DB order
        {
          email: "warm@test.com",
          business_name: "Warm Cup",
          city: "Seattle",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(3),
        },
      ],
      rowCount: 2,
      duration: 3,
    });

    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("decision targetId is the lead email", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "hello@coffee.com",
          business_name: null,
          city: null,
          vertical: "coffee_shops",
          referrer: null,
          created_at: daysAgo(5),
        },
      ],
      rowCount: 1,
      duration: 2,
    });

    const [decision] = await acquisitionAgent.run(makeCtx());
    expect(decision.targetId).toBe("hello@coffee.com");
    expect(decision.action).toBe("send-early-access-invite");
  });
});

// ─── Agent metadata ──────────────────────────────────────────────────────────

describe("agent metadata", () => {
  it("defaultMode is dry-run", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("threshold default is 0.55", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
  });

  it("maxAgeDays default is 30", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays.default).toBe(30);
  });
});
