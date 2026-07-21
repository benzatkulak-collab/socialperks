import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────
// vi.hoisted runs before module evaluation, making the vi.fn() instances
// available inside the vi.mock() factories below.
const mockQuery = vi.hoisted(() => vi.fn());
const mockEmailQueueAdd = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  // db is a plain object — NOT an instance of InMemoryConnection — so
  // fetchUncontactedLeads proceeds past the early-return guard and calls query().
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockQuery } };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mockEmailQueueAdd },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const NOW = "2026-07-21T12:00:00Z";
const NOW_MS = new Date(NOW).getTime();
// 20 days ago → within the 30-day window → NOT aged
const FRESH_DATE = "2026-07-01T00:00:00Z";
// 50 days ago → past the 30-day window → AGED (−0.15)
const AGED_DATE = "2026-06-01T00:00:00Z";
const MAX_AGE_DAYS = 30;

function makeCtx(live = false): AgentRunContext {
  return {
    live,
    now: NOW,
    config: { threshold: 0.55, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
  };
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return { email: "test@example.com", vertical: "other", createdAt: FRESH_DATE, ...overrides };
}

/** One DB row in the format the SELECT query returns (snake_case). */
function makeDbRow(overrides: Record<string, unknown> = {}) {
  return {
    email: "row@example.com",
    business_name: null,
    city: null,
    vertical: "other",
    referrer: null,
    created_at: FRESH_DATE,
    ...overrides,
  };
}

/** Configure mockQuery to return the given rows for SELECT and {} for UPDATE. */
function seedLeads(rows: ReturnType<typeof makeDbRow>[]) {
  mockQuery.mockImplementation((sql: string) => {
    if (sql.trimStart().toUpperCase().startsWith("SELECT")) {
      return Promise.resolve({ rows });
    }
    return Promise.resolve({ rows: [] });
  });
}

// ─── scoreLead ────────────────────────────────────────────────────────────────
describe("scoreLead — weighted scoring", () => {
  it("base only (no extras, fresh): 0.30", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toHaveLength(0);
  });

  it("referred (+0.30) → 0.60", () => {
    const { confidence, reasons } = scoreLead(makeLead({ referrer: "partner-site" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer does NOT grant the referral bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("ICP vertical (coffee_shops) (+0.20) → 0.50", () => {
    const { confidence, reasons } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("businessName present (+0.10) → 0.40", () => {
    const { confidence, reasons } = scoreLead(makeLead({ businessName: "Joe's" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("city present (+0.05) → 0.35", () => {
    const { confidence, reasons } = scoreLead(makeLead({ city: "Austin" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("all bonuses (referred + ICP + name + city): 0.30+0.30+0.20+0.10+0.05 = 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "r", vertical: "coffee_shops", businessName: "B", city: "C" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("all bonuses + aged (−0.15) → 0.80", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "r", vertical: "coffee_shops", businessName: "B", city: "C", createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.8);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("base + aged only → 0.15 (no clamp needed; still > 0)", () => {
    const { confidence } = scoreLead(makeLead({ createdAt: AGED_DATE }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("result is always clamped to [0, 1]", () => {
    const cases: WaitlistLead[] = [
      makeLead(),
      makeLead({ referrer: "r", vertical: "coffee_shops", businessName: "B", city: "C", createdAt: AGED_DATE }),
      makeLead({ createdAt: AGED_DATE }),
    ];
    for (const lead of cases) {
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────
describe("threshold gate (live mode)", () => {
  beforeEach(() => {
    mockEmailQueueAdd.mockClear();
    mockQuery.mockClear();
  });

  it("lead above threshold (score 0.60) is executed in live mode", async () => {
    // referred only: 0.30 + 0.30 = 0.60 ≥ 0.55 threshold
    seedLeads([makeDbRow({ email: "above@x.com", referrer: "partner" })]);

    const decisions = await acquisitionAgent.run(makeCtx(true));
    const d = decisions.find((x) => x.targetId === "above@x.com");
    expect(d).toBeDefined();
    expect(d!.executed).toBe(true);
    expect(mockEmailQueueAdd).toHaveBeenCalledOnce();
  });

  it("lead below threshold (score 0.40) is NOT executed even in live mode", async () => {
    // businessName only: 0.30 + 0.10 = 0.40 < 0.55 threshold
    seedLeads([makeDbRow({ email: "below@x.com", business_name: "Shop" })]);

    const decisions = await acquisitionAgent.run(makeCtx(true));
    const d = decisions.find((x) => x.targetId === "below@x.com");
    expect(d).toBeDefined();
    expect(d!.executed).toBe(false);
    expect(mockEmailQueueAdd).not.toHaveBeenCalled();
  });
});

// ─── Dry-run behavior ─────────────────────────────────────────────────────────
describe("dry-run mode (ctx.live = false)", () => {
  beforeEach(() => {
    mockEmailQueueAdd.mockClear();
    seedLeads([
      // high-confidence: 0.95 → would execute in live
      makeDbRow({
        email: "hot@x.com",
        business_name: "Coffee Co",
        city: "Austin",
        vertical: "coffee_shops",
        referrer: "partner",
      }),
      // low-confidence: 0.30 → would NOT execute even in live
      makeDbRow({ email: "cold@x.com" }),
    ]);
  });

  it("all decisions have executed=false", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions.length).toBeGreaterThan(0);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("no emails are enqueued", async () => {
    await acquisitionAgent.run(makeCtx(false));
    expect(mockEmailQueueAdd).not.toHaveBeenCalled();
  });

  it("decisions are sorted highest confidence first", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("decision metadata includes vertical, referred flag, and ageDays", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    const hot = decisions.find((d) => d.targetId === "hot@x.com");
    expect(hot?.meta?.vertical).toBe("coffee_shops");
    expect(hot?.meta?.referred).toBe(true);
    expect(typeof hot?.meta?.ageDays).toBe("number");
  });
});

// ─── No-DB fallback ───────────────────────────────────────────────────────────
describe("no-DB fallback", () => {
  it("returns [] decisions when db.query throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("Connection refused"));
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toEqual([]);
  });
});
