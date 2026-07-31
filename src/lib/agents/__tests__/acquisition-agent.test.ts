import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentRunContext } from "../types";

/**
 * Mock the DB connection so synthetic leads can be injected.
 *
 * Why: fetchUncontactedLeads does `if (db instanceof InMemoryConnection) return []`
 * — by providing a plain object for `db` (not an instance of the mock class),
 * the guard fails and the function proceeds to call db.query(), letting tests
 * control what leads are returned.
 */
vi.mock("@/lib/db/connection", async () => {
  class MockInMemoryConnection {}
  return {
    InMemoryConnection: MockInMemoryConnection,
    db: { query: vi.fn() },
  };
});

import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import { db } from "@/lib/db/connection";

// ─── Fixtures ──────────────────────────────────────────────────────────────

const NOW_ISO = "2026-01-15T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE = 30;

type LeadOverrides = {
  email?: string;
  businessName?: string;
  city?: string;
  vertical?: string;
  referrer?: string;
  createdAt?: string;
};

function freshCreatedAt(daysAgo = 10): string {
  return new Date(NOW_MS - daysAgo * 86_400_000).toISOString();
}

function agedCreatedAt(daysOverMax = 5): string {
  return new Date(NOW_MS - (MAX_AGE + daysOverMax) * 86_400_000).toISOString();
}

function lead(overrides: LeadOverrides = {}) {
  return {
    email: "test@example.com",
    businessName: undefined as string | undefined,
    city: undefined as string | undefined,
    vertical: "other",
    referrer: undefined as string | undefined,
    createdAt: freshCreatedAt(),
    ...overrides,
  };
}

function baseCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    config: { threshold: 0.55, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE } },
    now: NOW_ISO,
    ...overrides,
  };
}

// Synthetic DB row shape (mirrors the SQL SELECT columns)
function dbRow(overrides: Record<string, unknown> = {}) {
  return {
    email: "biz@example.com",
    business_name: null as string | null,
    city: null as string | null,
    vertical: "other",
    referrer: null as string | null,
    created_at: freshCreatedAt(),
    ...overrides,
  };
}

const MOCK_DB = db as { query: ReturnType<typeof vi.fn> };

// ─── scoreLead ─────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("bare minimum: base 0.30 for list signup only", () => {
    const { confidence, reasons } = scoreLead(lead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for referred lead → 0.60", () => {
    const { confidence, reasons } = scoreLead(lead({ referrer: "partner-a" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(lead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for named business → 0.40", () => {
    const { confidence, reasons } = scoreLead(lead({ businessName: "My Cafe" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city known → 0.35", () => {
    const { confidence, reasons } = scoreLead(lead({ city: "Austin" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for aged lead (past maxAgeDays) → 0.15", () => {
    const { confidence, reasons } = scoreLead(lead({ createdAt: agedCreatedAt() }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("full house: referred + ICP + named + city → 0.95", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "partner", vertical: "coffee_shops", businessName: "Brew Co", city: "Austin" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("aged but referred: 0.60 − 0.15 = 0.45", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "partner", createdAt: agedCreatedAt(10) }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.45);
  });

  it("whitespace-only referrer does NOT trigger the referred bonus", () => {
    const { confidence, reasons } = scoreLead(lead({ referrer: "   " }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("score is always clamped to [0, 1]", () => {
    const extreme = lead({
      referrer: "r",
      vertical: "coffee_shops",
      businessName: "B",
      city: "C",
      createdAt: agedCreatedAt(100),
    });
    const { confidence } = scoreLead(extreme, NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("lead exactly at maxAgeDays boundary is NOT penalised", () => {
    const exactBoundary = new Date(NOW_MS - MAX_AGE * 86_400_000).toISOString();
    const { confidence } = scoreLead(lead({ createdAt: exactBoundary }), NOW_MS, MAX_AGE);
    // ageDays === maxAgeDays → no penalty → base 0.30
    expect(confidence).toBeCloseTo(0.3);
  });
});

// ─── Threshold gate ────────────────────────────────────────────────────────

describe("threshold gate", () => {
  const THRESHOLD = 0.55;

  it("referred lead (0.60) is at or above default threshold", () => {
    const { confidence } = scoreLead(lead({ referrer: "partner" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("bare minimum lead (0.30) is below default threshold — should not act", () => {
    const { confidence } = scoreLead(lead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("aged + referred lead (0.45) is below default threshold — should not act", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "partner", createdAt: agedCreatedAt(1) }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP coffee lead with business name + city (0.65) clears threshold", () => {
    const { confidence } = scoreLead(
      lead({ vertical: "coffee_shops", businessName: "Roast", city: "Portland" }),
      NOW_MS,
      MAX_AGE,
    );
    // 0.30 + 0.20 + 0.10 + 0.05 = 0.65
    expect(confidence).toBeCloseTo(0.65);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ─── run() — dry-run behaviour ─────────────────────────────────────────────

describe("acquisitionAgent.run() in dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] when no leads are available (DB error fallback)", async () => {
    MOCK_DB.query.mockRejectedValueOnce(new Error("no db"));
    const decisions = await acquisitionAgent.run(baseCtx());
    expect(decisions).toEqual([]);
  });

  it("all decisions have executed:false in dry-run, even for high-confidence leads", async () => {
    MOCK_DB.query.mockResolvedValueOnce({
      rows: [
        dbRow({
          email: "hot@example.com",
          business_name: "Prime Coffee",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "trusted-partner",
          created_at: freshCreatedAt(2),
        }),
      ],
      rowCount: 1,
      duration: 1,
    });
    const decisions = await acquisitionAgent.run(baseCtx({ live: false }));
    expect(decisions.length).toBeGreaterThan(0);
    expect(decisions.every((d) => d.executed === false)).toBe(true);
  });

  it("decisions carry targetId=email, action=send-early-access-invite, and a confidence", async () => {
    MOCK_DB.query.mockResolvedValueOnce({
      rows: [dbRow({ email: "biz@test.com", vertical: "coffee_shops", created_at: freshCreatedAt(3) })],
      rowCount: 1,
      duration: 1,
    });
    const decisions = await acquisitionAgent.run(baseCtx());
    const [d] = decisions;
    expect(d.targetId).toBe("biz@test.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.confidence).toBeGreaterThan(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });

  it("decisions are sorted highest-confidence first", async () => {
    MOCK_DB.query.mockResolvedValueOnce({
      rows: [
        // DB order: low-confidence first
        dbRow({ email: "low@example.com", vertical: "other", created_at: freshCreatedAt(10) }),
        // high-confidence second
        dbRow({
          email: "high@example.com",
          business_name: "Top Coffee",
          city: "NYC",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: freshCreatedAt(2),
        }),
      ],
      rowCount: 2,
      duration: 1,
    });
    const decisions = await acquisitionAgent.run(baseCtx());
    expect(decisions.length).toBe(2);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@example.com");
  });

  it("meta includes businessName, city, vertical, referred flag, and ageDays", async () => {
    MOCK_DB.query.mockResolvedValueOnce({
      rows: [
        dbRow({
          email: "meta@test.com",
          business_name: "Corner Brew",
          city: "Denver",
          vertical: "coffee_shops",
          referrer: "friend",
          created_at: freshCreatedAt(7),
        }),
      ],
      rowCount: 1,
      duration: 1,
    });
    const decisions = await acquisitionAgent.run(baseCtx());
    const meta = decisions[0].meta as Record<string, unknown>;
    expect(meta.businessName).toBe("Corner Brew");
    expect(meta.city).toBe("Denver");
    expect(meta.vertical).toBe("coffee_shops");
    expect(meta.referred).toBe(true);
    expect(typeof meta.ageDays).toBe("number");
  });
});
