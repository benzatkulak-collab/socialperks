import { describe, it, expect, beforeEach, vi } from "vitest";
import { acquisitionAgent, scoreLead } from "@/lib/agents/acquisition-agent";

// fetchUncontactedLeads dynamic-imports "@/lib/db/connection" and returns []
// when `db instanceof InMemoryConnection`. We mock the module so `db` is a
// plain object (NOT an InMemoryConnection instance), letting tests inject
// synthetic leads via the mocked query fn without a real database.

const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
}));

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: mockQuery },
  };
});

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW = "2026-06-24T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE = 30;
const DEFAULT_THRESHOLD = 0.55;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshDate(): string {
  return new Date(NOW_MS - 5 * 86_400_000).toISOString(); // 5 days old
}

function agedDate(): string {
  return new Date(NOW_MS - 45 * 86_400_000).toISOString(); // 45 days old — past maxAgeDays
}

function makeCtx(live = false, threshold = DEFAULT_THRESHOLD) {
  return {
    live,
    config: {
      threshold,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE },
    },
    now: NOW,
  };
}

/** Shape that fetchUncontactedLeads maps from the query result. */
function makeRow(overrides: {
  email?: string;
  business_name?: string | null;
  city?: string | null;
  vertical?: string;
  referrer?: string | null;
  created_at?: string;
} = {}) {
  return {
    email: overrides.email ?? "test@example.com",
    business_name: overrides.business_name ?? null,
    city: overrides.city ?? null,
    vertical: overrides.vertical ?? "restaurants",
    referrer: overrides.referrer ?? null,
    created_at: overrides.created_at ?? freshDate(),
  };
}

function queryResult(rows: ReturnType<typeof makeRow>[]) {
  return { rows, rowCount: rows.length, duration: 0 };
}

// ─── scoreLead — branch coverage ─────────────────────────────────────────────

describe("scoreLead", () => {
  it("base only: no bonuses, fresh → 0.30", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.30, 5);
    expect(reasons).toEqual([]);
  });

  it("referred lead: +0.30 bonus → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", referrer: "partner", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.60, 5);
    expect(reasons).toContain("referred");
  });

  it("ICP vertical (coffee_shops): +0.20 → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "coffee_shops", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.50, 5);
    expect(reasons).toContain("ICP vertical");
  });

  it("businessName present: +0.10 → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", businessName: "Sunrise Cafe", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.40, 5);
    expect(reasons).toContain("named business");
  });

  it("city present: +0.05 → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", city: "Austin", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35, 5);
    expect(reasons).toContain("city known");
  });

  it("aged lead: −0.15 penalty → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", createdAt: agedDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.15, 5);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("all bonuses, fresh: base+referred+ICP+businessName+city = 0.95", () => {
    const { confidence } = scoreLead(
      {
        email: "a@x.com",
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Good Beans",
        city: "Portland",
        createdAt: freshDate(),
      },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95, 5);
  });

  it("all bonuses + aged: 0.95 − 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      {
        email: "a@x.com",
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Good Beans",
        city: "Portland",
        createdAt: agedDate(),
      },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.80, 5);
  });

  it("whitespace-only referrer is not counted as referred", () => {
    const { confidence, reasons } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", referrer: "   ", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.30, 5);
    expect(reasons).not.toContain("referred");
  });

  it("score is clamped to [0, 1]", () => {
    // Current weights make 0 and 1 hard to hit naturally; verify defensive clamp holds.
    const low = scoreLead(
      { email: "a@x.com", vertical: "restaurants", createdAt: agedDate() },
      NOW_MS,
      MAX_AGE,
    );
    const high = scoreLead(
      {
        email: "a@x.com",
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "B",
        city: "C",
        createdAt: freshDate(),
      },
      NOW_MS,
      MAX_AGE,
    );
    expect(low.confidence).toBeGreaterThanOrEqual(0);
    expect(high.confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("base-only lead (0.30) is below threshold → would NOT act in live", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("ICP-only lead (0.50) is below threshold → would NOT act in live", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "coffee_shops", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("referred lead (0.60) is above threshold → WOULD act in live", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "restaurants", referrer: "partner", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("referred + ICP lead (0.80) comfortably clears threshold", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "coffee_shops", referrer: "partner", createdAt: freshDate() },
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });
});

// ─── acquisitionAgent.run() — dry-run ────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    // Default: no leads (covers the "empty list" path)
    mockQuery.mockResolvedValue(queryResult([]));
  });

  it("returns empty decisions when there are no leads", async () => {
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });

  it("all decisions have executed:false regardless of confidence", async () => {
    const rows = [
      makeRow({ email: "high@x.com", vertical: "coffee_shops", referrer: "partner" }), // 0.80
      makeRow({ email: "low@x.com", vertical: "restaurants" }),                          // 0.30
    ];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    const decisions = await acquisitionAgent.run(makeCtx(false));

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("sorts decisions by confidence descending", async () => {
    const rows = [
      makeRow({ email: "low@x.com", vertical: "restaurants" }),                          // 0.30
      makeRow({ email: "high@x.com", vertical: "coffee_shops", referrer: "partner" }), // 0.80
    ];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions[0].targetId).toBe("high@x.com");
    expect(decisions[1].targetId).toBe("low@x.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("decision confidence matches scoreLead output for referred+ICP+businessName", async () => {
    const rows = [makeRow({ email: "a@x.com", vertical: "coffee_shops", referrer: "partner", business_name: "Beans" })];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    const [d] = await acquisitionAgent.run(makeCtx());
    // base 0.30 + referred 0.30 + ICP 0.20 + businessName 0.10 = 0.90
    expect(d.confidence).toBeCloseTo(0.90, 5);
  });

  it("action field is always 'send-early-access-invite'", async () => {
    const rows = [makeRow()];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.action).toBe("send-early-access-invite");
  });

  it("reason is 'list signup only' for a lead with no signal", async () => {
    const rows = [makeRow({ vertical: "restaurants" })];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.reason).toBe("list signup only");
  });

  it("meta includes referred:true when referrer is set", async () => {
    const rows = [makeRow({ referrer: "twitter-ad" })];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.meta?.referred).toBe(true);
  });

  it("does not call markContacted (UPDATE) in dry-run", async () => {
    const rows = [
      makeRow({ email: "hi@x.com", vertical: "coffee_shops", referrer: "partner" }), // 0.80 — above threshold
    ];
    mockQuery.mockResolvedValueOnce(queryResult(rows));

    await acquisitionAgent.run(makeCtx(false));

    // Only the SELECT query should have fired; markContacted is gated on ctx.live
    const calls = mockQuery.mock.calls;
    const updateCalls = calls.filter(([sql]: [string]) => /UPDATE/i.test(sql));
    expect(updateCalls).toHaveLength(0);
  });
});
