import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent, type WaitlistLead } from "../acquisition-agent";

// ─── Mock DB so fetchUncontactedLeads can return synthetic leads ───────────────

// vi.hoisted ensures this runs before vi.mock factories (which are hoisted to
// the top of the file by the vitest transformer).
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  // RealDbStub is NOT InMemoryConnection, so the isinstance guard passes it through.
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: mockQuery },
  };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: vi.fn() },
}));

// ─── Constants ─────────────────────────────────────────────────────────────────

const NOW_MS = Date.now();
const NOW_ISO = new Date(NOW_MS).toISOString();
const MAX_AGE_DAYS = 30;
const FRESH_DATE = new Date(NOW_MS - 5 * 86_400_000).toISOString(); // 5 days old
const AGED_DATE = new Date(NOW_MS - 40 * 86_400_000).toISOString(); // 40 days > 30d cutoff

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "restaurants",
    createdAt: FRESH_DATE,
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

function makeDbRow(overrides: Partial<DbRow> = {}): DbRow {
  return {
    email: "test@example.com",
    business_name: null,
    city: null,
    vertical: "restaurants",
    referrer: null,
    created_at: FRESH_DATE,
    ...overrides,
  };
}

function makeCtx(live = false, threshold = 0.55, maxAgeDays = 30) {
  return {
    live,
    config: {
      threshold,
      maxActionsPerRun: 25,
      custom: { maxAgeDays },
    },
    now: NOW_ISO,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// scoreLead — pure scoring function
// ═══════════════════════════════════════════════════════════════════════════════

describe("scoreLead", () => {
  it("base only: 0.30", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for referred lead → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-site" }),
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

  it("+0.10 for named business → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Sunrise Bakery" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city known → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Denver" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("all positive signals: 0.30+0.30+0.20+0.10+0.05 = 0.95", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew & Go",
        city: "Austin",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toHaveLength(4);
  });

  it("-0.15 for aged lead: base only → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("all positive signals + aged: 0.95 - 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew & Go",
        city: "Austin",
        createdAt: AGED_DATE,
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("whitespace-only referrer is NOT counted as a referral", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("score is always clamped to [0, 1]", () => {
    const worst = scoreLead(makeLead({ createdAt: AGED_DATE }), NOW_MS, MAX_AGE_DAYS);
    const best = scoreLead(
      makeLead({ referrer: "p", vertical: "coffee_shops", businessName: "B", city: "C" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(worst.confidence).toBeGreaterThanOrEqual(0);
    expect(best.confidence).toBeLessThanOrEqual(1);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Threshold gate
// ═══════════════════════════════════════════════════════════════════════════════

describe("threshold gate", () => {
  const THRESHOLD = 0.55;

  it("referred+ICP lead (0.80) is above default threshold → would act in live", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.30 + 0.20 = 0.80
    expect(confidence).toBeCloseTo(0.8);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base-only lead (0.30) is below default threshold → would NOT act", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP + business + city lead (0.65) clears threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Beans", city: "LA" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.20 + 0.10 + 0.05 = 0.65
    expect(confidence).toBeCloseTo(0.65);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base + city lead (0.35) stays below threshold", () => {
    const { confidence } = scoreLead(makeLead({ city: "Chicago" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.35);
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// run() — dry-run enforcement
// ═══════════════════════════════════════════════════════════════════════════════

describe("acquisitionAgent.run() in dry-run", () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
  });

  it("returns no decisions when there are no leads", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(0);
  });

  it("every decision has executed=false when ctx.live is false", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeDbRow({
          email: "high@example.com",
          business_name: "Best Brew",
          city: "Denver",
          vertical: "coffee_shops",
          referrer: "partner",
        }),
        makeDbRow({
          email: "low@example.com",
          vertical: "gyms",
        }),
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));

    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("never executes even when threshold is 0 (every lead would qualify in live)", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeDbRow({ email: "a@example.com", referrer: "p", vertical: "coffee_shops" }),
      ],
      rowCount: 1,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false, 0.0));

    expect(decisions.length).toBeGreaterThan(0);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted highest-confidence first", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        // Low score first in DB order
        makeDbRow({ email: "low@example.com" }),
        // High score second
        makeDbRow({
          email: "high@example.com",
          referrer: "partner",
          vertical: "coffee_shops",
          business_name: "Brew",
          city: "NY",
        }),
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));

    expect(decisions[0].targetId).toBe("high@example.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("decision meta includes vertical, referred, and ageDays", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        makeDbRow({
          email: "meta@example.com",
          vertical: "coffee_shops",
          referrer: "partner",
          business_name: "Shop",
          city: "Boston",
        }),
      ],
      rowCount: 1,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));
    const d = decisions[0];

    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.referred).toBe(true);
    expect(typeof d.meta?.ageDays).toBe("number");
    expect(d.action).toBe("send-early-access-invite");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// Agent metadata sanity
// ═══════════════════════════════════════════════════════════════════════════════

describe("acquisitionAgent metadata", () => {
  it("defaults to dry-run mode", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("threshold config: default 0.55 within [min, max]", () => {
    const { threshold } = acquisitionAgent.config;
    expect(threshold.default).toBe(0.55);
    expect(threshold.min).toBeLessThanOrEqual(threshold.default);
    expect(threshold.max).toBeGreaterThanOrEqual(threshold.default);
  });

  it("maxAgeDays custom knob defaults to 30", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays.default).toBe(30);
  });

  it("interval is daily (86400s)", () => {
    expect(acquisitionAgent.intervalSeconds).toBe(86400);
  });
});
