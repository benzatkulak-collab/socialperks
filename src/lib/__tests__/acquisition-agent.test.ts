import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Mock DB ─────────────────────────────────────────────────────────────────
// vi.hoisted runs before vi.mock, so mockQuery is available inside the factory.
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => ({
  // A distinct class so `db instanceof InMemoryConnection` is false → real query path runs.
  InMemoryConnection: class InMemoryConnection {},
  db: { query: mockQuery },
}));

import { acquisitionAgent } from "@/lib/agents/acquisition-agent";

// ─── Shared constants ─────────────────────────────────────────────────────────

const NOW = "2026-07-27T12:00:00.000Z";

// 1 day before NOW → not aged
const FRESH = "2026-07-26T12:00:00.000Z";

// 45 days before NOW → aged (past the 30-day default cutoff)
const AGED = "2026-06-12T12:00:00.000Z";

const BASE_CTX: AgentRunContext = {
  live: false,
  config: { threshold: 0.55, maxActionsPerRun: 25, custom: { maxAgeDays: 30 } },
  now: NOW,
};

// ─── Fixture helpers ──────────────────────────────────────────────────────────

type LeadRow = {
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
};

function makeRow(overrides: Partial<LeadRow> & { email: string }): LeadRow {
  return {
    business_name: null,
    city: null,
    vertical: "retail",
    referrer: null,
    created_at: FRESH,
    ...overrides,
  };
}

function setupLeads(rows: LeadRow[]) {
  mockQuery.mockResolvedValueOnce({ rows, rowCount: rows.length, duration: 0 });
}

// ─────────────────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQuery.mockReset();
});

// ─── Scoring branches ─────────────────────────────────────────────────────────

describe("acquisition-agent: scoreLead branches", () => {
  it("fully warm fresh lead: all bonuses, no age penalty → 0.95", async () => {
    // base 0.30 + referred 0.30 + ICP 0.20 + name 0.10 + city 0.05 = 0.95
    setupLeads([
      makeRow({
        email: "warm@example.com",
        referrer: "partner.com",
        vertical: "coffee_shops",
        business_name: "Warm Cafe",
        city: "Austin",
      }),
    ]);
    const decisions = await acquisitionAgent.run(BASE_CTX);
    expect(decisions).toHaveLength(1);
    expect(decisions[0].confidence).toBeCloseTo(0.95, 5);
    expect(decisions[0].reason).toContain("referred");
    expect(decisions[0].reason).toContain("ICP vertical");
    expect(decisions[0].reason).toContain("named business");
    expect(decisions[0].reason).toContain("city known");
  });

  it("referred only, fresh → 0.60", async () => {
    // base 0.30 + referred 0.30 = 0.60
    setupLeads([makeRow({ email: "ref@example.com", referrer: "partner.com" })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.6, 5);
    expect(d.reason).toBe("referred");
  });

  it("ICP vertical only, fresh → 0.50", async () => {
    // base 0.30 + ICP 0.20 = 0.50
    setupLeads([makeRow({ email: "icp@example.com", vertical: "coffee_shops" })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.5, 5);
    expect(d.reason).toBe("ICP vertical");
  });

  it("business name only, fresh → 0.40", async () => {
    // base 0.30 + name 0.10 = 0.40
    setupLeads([makeRow({ email: "named@example.com", business_name: "My Shop" })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.4, 5);
    expect(d.reason).toContain("named business");
  });

  it("city only, fresh → 0.35", async () => {
    // base 0.30 + city 0.05 = 0.35
    setupLeads([makeRow({ email: "city@example.com", city: "Denver" })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.35, 5);
    expect(d.reason).toContain("city known");
  });

  it("base only, fresh → 0.30, reason 'list signup only'", async () => {
    // base 0.30; no bonuses, no age penalty
    setupLeads([makeRow({ email: "base@example.com" })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.3, 5);
    expect(d.reason).toBe("list signup only");
  });

  it("referred + aged → 0.45 (age penalty applied)", async () => {
    // base 0.30 + referred 0.30 − aged 0.15 = 0.45
    setupLeads([
      makeRow({ email: "ref-aged@example.com", referrer: "partner.com", created_at: AGED }),
    ]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.45, 5);
    expect(d.reason).toContain("referred");
    expect(d.reason).toMatch(/aged \d+d/);
  });

  it("base + aged → 0.15", async () => {
    // base 0.30 − aged 0.15 = 0.15
    setupLeads([makeRow({ email: "base-aged@example.com", created_at: AGED })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.15, 5);
    expect(d.reason).toMatch(/aged \d+d/);
  });

  it("all bonuses + aged → 0.80", async () => {
    // 0.30+0.30+0.20+0.10+0.05 − 0.15 = 0.80
    setupLeads([
      makeRow({
        email: "all-aged@example.com",
        referrer: "old.com",
        vertical: "coffee_shops",
        business_name: "Old Cafe",
        city: "Boston",
        created_at: AGED,
      }),
    ]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.8, 5);
  });

  it("whitespace-only referrer does not earn the referral bonus", async () => {
    // referrer.trim().length === 0 → no +0.30
    setupLeads([makeRow({ email: "ws@example.com", referrer: "   " })]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.3, 5);
    expect(d.reason).toBe("list signup only");
  });

  it("confidence is clamped to [0, 1]", async () => {
    setupLeads([
      makeRow({
        email: "max@example.com",
        referrer: "r.com",
        vertical: "coffee_shops",
        business_name: "Max",
        city: "NYC",
      }),
    ]);
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeGreaterThanOrEqual(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("acquisition-agent: threshold gate", () => {
  it("above-threshold lead (0.60) would act in live; below-threshold (0.50) would not", async () => {
    setupLeads([
      makeRow({ email: "above@example.com", referrer: "p.com" }), // 0.60 ≥ 0.55
      makeRow({ email: "below@example.com", vertical: "coffee_shops" }),   // 0.50 < 0.55
    ]);
    const decisions = await acquisitionAgent.run(BASE_CTX);
    const above = decisions.find((d) => d.targetId === "above@example.com")!;
    const below = decisions.find((d) => d.targetId === "below@example.com")!;

    expect(above.confidence).toBeGreaterThanOrEqual(BASE_CTX.config.threshold);
    expect(below.confidence).toBeLessThan(BASE_CTX.config.threshold);
    // Both unexecuted in dry-run
    expect(above.executed).toBe(false);
    expect(below.executed).toBe(false);
  });

  it("custom threshold of 0.45 admits the 0.50 ICP lead", async () => {
    const lowThresholdCtx: AgentRunContext = {
      ...BASE_CTX,
      config: { ...BASE_CTX.config, threshold: 0.45 },
    };
    setupLeads([makeRow({ email: "icp@example.com", vertical: "coffee_shops" })]);
    // In dry-run it's still unexecuted, but confidence ≥ threshold
    const [d] = await acquisitionAgent.run(lowThresholdCtx);
    expect(d.confidence).toBeGreaterThanOrEqual(lowThresholdCtx.config.threshold);
    expect(d.executed).toBe(false); // still dry-run
  });
});

// ─── Dry-run guarantee ────────────────────────────────────────────────────────

describe("acquisition-agent: dry-run guarantee", () => {
  it("all decisions have executed:false regardless of confidence", async () => {
    setupLeads([
      makeRow({ email: "a@x.com", referrer: "p.com", vertical: "coffee_shops", business_name: "A", city: "X" }), // 0.95
      makeRow({ email: "b@x.com", referrer: "p.com" }), // 0.60
      makeRow({ email: "c@x.com" }),                     // 0.30
    ]);
    const decisions = await acquisitionAgent.run({ ...BASE_CTX, live: false });
    expect(decisions).toHaveLength(3);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("does NOT call markContacted (no second db.query) in dry-run", async () => {
    setupLeads([
      makeRow({ email: "hi@x.com", referrer: "p.com", vertical: "coffee_shops", business_name: "H", city: "C" }),
    ]);
    await acquisitionAgent.run({ ...BASE_CTX, live: false });
    // fetchUncontactedLeads → 1 call; markContacted (UPDATE) must NOT fire
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });

  it("returns empty array when no uncontacted leads exist", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(BASE_CTX);
    expect(decisions).toEqual([]);
  });
});

// ─── Sort order ───────────────────────────────────────────────────────────────

describe("acquisition-agent: decisions sorted by confidence descending", () => {
  it("highest-confidence lead appears first", async () => {
    setupLeads([
      makeRow({ email: "low@x.com" }),                                                                  // 0.30
      makeRow({ email: "high@x.com", referrer: "p.com", vertical: "coffee_shops", business_name: "H", city: "Y" }), // 0.95
      makeRow({ email: "mid@x.com", referrer: "p.com" }),                                               // 0.60
    ]);
    const decisions = await acquisitionAgent.run(BASE_CTX);
    const confidences = decisions.map((d) => d.confidence);
    for (let i = 1; i < confidences.length; i++) {
      expect(confidences[i]).toBeLessThanOrEqual(confidences[i - 1]);
    }
    expect(decisions[0].targetId).toBe("high@x.com");
  });
});

// ─── Static metadata ──────────────────────────────────────────────────────────

describe("acquisition-agent: static metadata", () => {
  it("defaultMode is 'dry-run'", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("threshold default is 0.55", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
  });

  it("maxAgeDays default is 30", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays.default).toBe(30);
  });

  it("intervalSeconds is daily (86400)", () => {
    expect(acquisitionAgent.intervalSeconds).toBe(86400);
  });
});
