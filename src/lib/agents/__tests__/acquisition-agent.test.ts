import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Mock DB connection so run() receives synthetic leads ────────────────────
//
// The agent does a dynamic `import("@/lib/db/connection")` and checks
// `db instanceof InMemoryConnection`.  We supply a plain-object `db` (not an
// instance of the mocked InMemoryConnection class) so the instanceof guard is
// false and the agent falls through to `db.query`.

const mockDbQuery = vi.fn();

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: mockDbQuery },
  };
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-06-26T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = acquisitionAgent.config.threshold.default; // 0.55

function daysAgoIso(days: number): string {
  return new Date(NOW_MS - days * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "lead@example.com",
    vertical: "retail",
    createdAt: daysAgoIso(1),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: NOW_ISO,
    config: {
      threshold: THRESHOLD,
      maxActionsPerRun: acquisitionAgent.config.maxActionsPerRun.default,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    ...overrides,
  };
}

// ─── (a) scoreLead weighted sums clamped to [0,1] ────────────────────────────

describe("scoreLead — weighted sums", () => {
  it("bare minimum (list signup only) → 0.30", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3, 5);
    expect(reasons).toHaveLength(0);
  });

  it("referred only (+0.30) → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-channel" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6, 5);
    expect(reasons).toContain("referred");
  });

  it("ICP vertical only (+0.20) → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5, 5);
    expect(reasons).toContain("ICP vertical");
  });

  it("named business only (+0.10) → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Acme Retail" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4, 5);
    expect(reasons).toContain("named business");
  });

  it("city only (+0.05) → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35, 5);
    expect(reasons).toContain("city known");
  });

  it("full house (referred + ICP + named + city) → 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Bean Roasters",
      city: "Portland",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95, 5);
  });

  it("aged lead past cutoff (−0.15): bare minimum → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: daysAgoIso(31) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15, 5);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("aged + referred + ICP (−0.15 + 0.30 + 0.20) → 0.65", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "x", vertical: "coffee_shops", createdAt: daysAgoIso(35) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.65, 5);
  });

  it("score is always clamped to [0, 1]", () => {
    const extremeHigh = makeLead({
      referrer: "x",
      vertical: "coffee_shops",
      businessName: "B",
      city: "C",
    });
    const extremeLow = makeLead({ createdAt: daysAgoIso(999) });
    const { confidence: hi } = scoreLead(extremeHigh, NOW_MS, MAX_AGE_DAYS);
    const { confidence: lo } = scoreLead(extremeLow, NOW_MS, MAX_AGE_DAYS);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeGreaterThanOrEqual(0);
  });

  it("whitespace-only referrer is not counted as a referral", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3, 5);
  });
});

// ─── (b) threshold gate ───────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("referred lead (0.60) is ABOVE threshold → would act in live", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "friend" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP + named (0.60) is ABOVE threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "B" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("bare minimum (0.30) is BELOW threshold → would not act in live", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP vertical only (0.50) is BELOW threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("aged + referred (0.45) is BELOW threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "x", createdAt: daysAgoIso(31) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── (c) run() dry-run enforcement ───────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run (ctx.live = false)", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("returns executed:false for ALL leads regardless of confidence", async () => {
    // One lead well above threshold, one well below
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "high@example.com",
          business_name: "Coffee King",
          city: "Portland",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgoIso(1),
        },
        {
          email: "low@example.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgoIso(1),
        },
      ],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("sorts decisions by confidence descending", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        // Deliberately provide low-confidence lead first in DB order
        {
          email: "low@example.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgoIso(1),
        },
        {
          email: "high@example.com",
          business_name: "Coffee King",
          city: "Portland",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgoIso(1),
        },
      ],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@example.com");
  });

  it("returns an empty array when no leads are available", async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 1 });
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toEqual([]);
  });

  it("populates decision meta with expected fields", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "meta@example.com",
          business_name: "Bean HQ",
          city: "Seattle",
          vertical: "coffee_shops",
          referrer: "influencer",
          created_at: daysAgoIso(5),
        },
      ],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decision.action).toBe("send-early-access-invite");
    expect(decision.targetId).toBe("meta@example.com");
    expect(decision.meta?.vertical).toBe("coffee_shops");
    expect(decision.meta?.referred).toBe(true);
    expect(typeof decision.meta?.ageDays).toBe("number");
  });
});
