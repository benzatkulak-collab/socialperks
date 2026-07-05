import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";

// ─── Mock setup ───────────────────────────────────────────────────────────────
// vi.hoisted ensures these fn references exist before vi.mock factories run.

const { mockDbQuery, mockEmailAdd } = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
  mockEmailAdd: vi.fn(),
}));

vi.mock("@/lib/db/connection", () => {
  // db is a plain object literal — NOT instanceof InMemoryConnection —
  // so fetchUncontactedLeads proceeds past the early-return guard and calls query().
  class InMemoryConnection {}
  return { db: { query: mockDbQuery }, InMemoryConnection };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mockEmailAdd },
}));

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Anchor time — all age calculations use this.
const NOW_ISO = "2026-01-15T00:00:00Z";
const NOW_MS = new Date(NOW_ISO).getTime();

// 5 days old — comfortably within the 30-day window.
const FRESH = "2026-01-10T00:00:00Z";
// 45 days old — past the default 30-day cold cutoff.
const AGED = "2025-12-01T00:00:00Z";
// Exactly 30 days old → ageDays === maxAgeDays (30), `ageDays > 30` = false → NOT penalised.
const AT_BOUNDARY = "2025-12-16T00:00:00Z";
// Exactly 31 days old → `31 > 30` = true → penalised.
const OVER_BOUNDARY = "2025-12-15T00:00:00Z";

const MAX_AGE = 30;

function lead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "restaurants",
    createdAt: FRESH,
    ...overrides,
  };
}

// DB row shape returned by the waitlist SELECT query.
function dbRow(overrides: Partial<{
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
}> = {}) {
  return {
    email: "test@example.com",
    business_name: null,
    city: null,
    vertical: "restaurants",
    referrer: null,
    created_at: FRESH,
    ...overrides,
  };
}

function makeCtx(live = false, threshold = 0.55, maxAgeDays = 30) {
  return {
    live,
    config: { threshold, maxActionsPerRun: 25, custom: { maxAgeDays } },
    now: NOW_ISO,
  };
}

beforeEach(() => {
  mockDbQuery.mockReset();
  mockEmailAdd.mockReset();
  // Default: SELECT returns no rows; UPDATE returns nothing useful.
  mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
});

// ─── scoreLead: weight branches ───────────────────────────────────────────────

describe("scoreLead — scoring weights", () => {
  it("base only (fresh, no extras) → 0.30", () => {
    const { confidence } = scoreLead(lead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("referred only → base 0.30 + referred 0.30 = 0.60", () => {
    const { confidence } = scoreLead(lead({ referrer: "partner-site" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.6);
  });

  it("ICP vertical (coffee_shops) only → base 0.30 + ICP 0.20 = 0.50", () => {
    const { confidence } = scoreLead(lead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.5);
  });

  it("businessName only → base 0.30 + named 0.10 = 0.40", () => {
    const { confidence } = scoreLead(lead({ businessName: "Acme" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.4);
  });

  it("city only → base 0.30 + city 0.05 = 0.35", () => {
    const { confidence } = scoreLead(lead({ city: "Austin" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.35);
  });

  it("ICP + named → 0.30 + 0.20 + 0.10 = 0.60", () => {
    const { confidence } = scoreLead(
      lead({ vertical: "coffee_shops", businessName: "Brew Lab" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.6);
  });

  it("ICP + named + city → 0.30 + 0.20 + 0.10 + 0.05 = 0.65", () => {
    const { confidence } = scoreLead(
      lead({ vertical: "coffee_shops", businessName: "Brew Lab", city: "Portland" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.65);
  });

  it("all bonuses, fresh → 0.30+0.30+0.20+0.10+0.05 = 0.95", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "x", vertical: "coffee_shops", businessName: "Brew", city: "NY" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("max possible score is 0.95 (never exceeds 1.0)", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "x", vertical: "coffee_shops", businessName: "B", city: "C" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeLessThanOrEqual(1.0);
    expect(confidence).toBeCloseTo(0.95);
  });
});

// ─── scoreLead: age penalty ───────────────────────────────────────────────────

describe("scoreLead — age penalty", () => {
  it("fresh lead (5 days) incurs no penalty", () => {
    const { confidence, reasons } = scoreLead(lead({ createdAt: FRESH }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(false);
  });

  it("aged lead (45 days) → base 0.30 − 0.15 = 0.15", () => {
    const { confidence, reasons } = scoreLead(lead({ createdAt: AGED }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("all bonuses + aged → 0.95 − 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "x", vertical: "coffee_shops", businessName: "B", city: "C", createdAt: AGED }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("referred + aged → 0.60 − 0.15 = 0.45 (drops below threshold)", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "x", createdAt: AGED }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.45);
  });

  it("at exactly maxAgeDays boundary → no penalty (strict >)", () => {
    const { confidence } = scoreLead(lead({ createdAt: AT_BOUNDARY }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("one day over boundary → penalty applied", () => {
    const { confidence } = scoreLead(lead({ createdAt: OVER_BOUNDARY }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("score is always ≥ 0 (clamped)", () => {
    const { confidence } = scoreLead(lead({ createdAt: AGED }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });
});

// ─── scoreLead: edge cases ────────────────────────────────────────────────────

describe("scoreLead — edge cases", () => {
  it("whitespace-only referrer does not count as referred", () => {
    const { confidence, reasons } = scoreLead(lead({ referrer: "   " }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("empty referrer string does not count as referred", () => {
    const { confidence } = scoreLead(lead({ referrer: "" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("reasons list is empty when only base score applies", () => {
    const { reasons } = scoreLead(lead(), NOW_MS, MAX_AGE);
    expect(reasons).toHaveLength(0);
  });

  it("reasons list correctly enumerates all applicable bonuses", () => {
    const { reasons } = scoreLead(
      lead({ referrer: "x", vertical: "coffee_shops", businessName: "B", city: "C" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });
});

// ─── Threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const threshold = 0.55;

  it("referred lead (0.60) is above threshold → would act in live", () => {
    const { confidence } = scoreLead(lead({ referrer: "x" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(threshold);
  });

  it("ICP-only lead (0.50) is below threshold → would NOT act in live", () => {
    const { confidence } = scoreLead(lead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(threshold);
  });

  it("base-only lead (0.30) is well below threshold", () => {
    const { confidence } = scoreLead(lead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(threshold);
  });

  it("all-bonuses lead (0.95) is well above threshold", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "x", vertical: "coffee_shops", businessName: "B", city: "C" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(threshold);
  });

  it("referred + aged (0.45) drops below threshold after penalty", () => {
    const { confidence } = scoreLead(lead({ referrer: "x", createdAt: AGED }), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(threshold);
  });
});

// ─── run(): dry-run mode ─────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run (ctx.live=false)", () => {
  it("returns executed:false for ALL decisions regardless of confidence", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        dbRow({ referrer: "x", vertical: "coffee_shops", business_name: "Brew", city: "NY" }), // ~0.95
        dbRow({ email: "low@x.com" }),                                                          // 0.30
      ],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("enqueues NO emails in dry-run mode", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow({ referrer: "x", vertical: "coffee_shops", business_name: "B", city: "C" })],
      rowCount: 1,
      duration: 1,
    });

    await acquisitionAgent.run(makeCtx(false));
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("returns decisions sorted by confidence descending", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        dbRow({ email: "low@x.com" }),                                       // 0.30
        dbRow({ email: "high@x.com", referrer: "p", vertical: "coffee_shops" }), // 0.80
        dbRow({ email: "mid@x.com", referrer: "p" }),                        // 0.60
      ],
      rowCount: 3,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions[0].targetId).toBe("high@x.com");
    expect(decisions[1].targetId).toBe("mid@x.com");
    expect(decisions[2].targetId).toBe("low@x.com");
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("returns an empty array when there are no uncontacted leads", async () => {
    // mockDbQuery already defaults to { rows: [] }
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(0);
  });
});

// ─── run(): live mode ────────────────────────────────────────────────────────

describe("acquisitionAgent.run() — live mode (ctx.live=true)", () => {
  it("executes and enqueues email for lead above threshold", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow({ email: "warm@x.com", referrer: "partner", vertical: "coffee_shops" })], // 0.80
      rowCount: 1,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx(true));
    expect(decisions[0].executed).toBe(true);
    expect(mockEmailAdd).toHaveBeenCalledOnce();
    const call = mockEmailAdd.mock.calls[0][0];
    expect(call.to).toBe("warm@x.com");
    expect(call.type).toBe("drip");
  });

  it("does NOT execute for lead below threshold", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow({ email: "cold@x.com" })], // 0.30 — below 0.55
      rowCount: 1,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx(true));
    expect(decisions[0].executed).toBe(false);
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("only executes above-threshold leads in a mixed batch", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        dbRow({ email: "warm@x.com", referrer: "x" }),     // 0.60 ≥ 0.55 → act
        dbRow({ email: "cold@x.com" }),                     // 0.30 < 0.55 → skip
        dbRow({ email: "icp@x.com", vertical: "coffee_shops", business_name: "B" }), // 0.60 → act
      ],
      rowCount: 3,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx(true));
    const executed = decisions.filter((d) => d.executed);
    const skipped = decisions.filter((d) => !d.executed);
    expect(executed).toHaveLength(2);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].targetId).toBe("cold@x.com");
    expect(mockEmailAdd).toHaveBeenCalledTimes(2);
  });
});

// ─── run(): decision metadata ────────────────────────────────────────────────

describe("acquisitionAgent.run() — decision metadata", () => {
  it("decision reason is 'list signup only' when no scoring bonuses applied", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow()],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx(false));
    expect(decision.reason).toBe("list signup only");
  });

  it("decision reason lists applicable bonuses", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow({ referrer: "x", vertical: "coffee_shops" })],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx(false));
    expect(decision.reason).toContain("referred");
    expect(decision.reason).toContain("ICP vertical");
  });

  it("decision meta carries vertical, referred flag, and ageDays", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow({ vertical: "coffee_shops", referrer: "p", city: "LA", created_at: AGED })],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx(false));
    expect(decision.meta?.vertical).toBe("coffee_shops");
    expect(decision.meta?.referred).toBe(true);
    expect(decision.meta?.city).toBe("LA");
    expect(typeof decision.meta?.ageDays).toBe("number");
    expect((decision.meta?.ageDays as number)).toBeGreaterThan(30);
  });

  it("action is 'send-early-access-invite'", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [dbRow()],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx(false));
    expect(decision.action).toBe("send-early-access-invite");
  });
});
