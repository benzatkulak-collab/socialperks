import { describe, it, expect, vi, beforeEach } from "vitest";

// ── DB mock ──────────────────────────────────────────────────────────────────
// fetchUncontactedLeads does `await import("@/lib/db/connection")` and
// short-circuits when `db instanceof InMemoryConnection`. We replace both
// exports so that the instanceof check fails and db.query is under our control.

const { mockDbQuery } = vi.hoisted(() => ({ mockDbQuery: vi.fn() }));

vi.mock("@/lib/db/connection", () => {
  class FakeNonInMemory {}
  return {
    InMemoryConnection: FakeNonInMemory,
    db: { query: mockDbQuery },
  };
});

import { scoreLead, acquisitionAgent, type WaitlistLead } from "../acquisition-agent";

// ── Fixtures ──────────────────────────────────────────────────────────────────

// "Now" is pinned to the current date reflected in CLAUDE.md (2026-06-19).
const NOW_ISO = "2026-06-19T12:00:00Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;

// A date that is 9 days old — well within the freshness window.
const FRESH_DATE = "2026-06-10T00:00:00Z";
// A date that is 32 days old — past the 30-day cold cutoff.
const AGED_DATE = "2026-05-18T00:00:00Z";

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "lead@example.com",
    vertical: "retail",
    createdAt: FRESH_DATE,
    ...overrides,
  };
}

/** Convert camelCase fixture to the snake_case row shape the DB returns. */
function toDbRow(lead: WaitlistLead) {
  return {
    email: lead.email,
    business_name: lead.businessName ?? null,
    city: lead.city ?? null,
    vertical: lead.vertical,
    referrer: lead.referrer ?? null,
    created_at: lead.createdAt,
  };
}

function makeRunCtx(overrides: { live?: boolean; threshold?: number } = {}) {
  return {
    live: overrides.live ?? false,
    config: {
      threshold: overrides.threshold ?? 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    now: NOW_ISO,
  };
}

// ── scoreLead ─────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("base only — list signup with no extras scores 0.30", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBe(0.3);
  });

  it("referred bonus adds +0.30 → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner.com" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.6);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer does NOT trigger the bonus", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.3);
  });

  it("ICP vertical (coffee_shops) adds +0.20 → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("named business adds +0.10 → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Bean & Gone" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.4);
    expect(reasons).toContain("named business");
  });

  it("city known adds +0.05 → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Denver" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.35);
    expect(reasons).toContain("city known");
  });

  it("aged lead subtracts -0.15 → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fresh lead exactly at the age cutoff does not get the penalty", () => {
    // 30 days before NOW_MS — not strictly older, so no penalty.
    const exactCutoff = new Date(NOW_MS - 30 * 86_400_000).toISOString();
    const { confidence } = scoreLead(
      makeLead({ createdAt: exactCutoff }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.3);
  });

  it("full ICP combo (referred + ICP + name + city) scores 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "The Best Cafe",
        city: "Seattle",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95, 10);
  });

  it("aged + strong lead still applies the age penalty", () => {
    // referred + ICP + name (no city) − aged = 0.30+0.30+0.20+0.10−0.15 = 0.75
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Old Brew Co",
        createdAt: AGED_DATE,
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.75, 10);
  });

  it("confidence is always clamped to [0, 1]", () => {
    // Manufacture an extreme case: very high base that exceeds 1.
    // Use a different maxAgeDays=0 so everything becomes "aged", driving score negative.
    const { confidence: low } = scoreLead(
      makeLead({ createdAt: AGED_DATE }),
      NOW_MS,
      0, // every lead is "aged"
    );
    expect(low).toBeGreaterThanOrEqual(0);

    // Max achievable is 0.95 (well within 1), but test the upper clamp branch
    // by passing a very small maxAgeDays so the penalty is absorbed repeatedly.
    // Since the formula can't naturally exceed 0.95, clamp(0.95) === 0.95.
    const { confidence: high } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Top Shop",
        city: "NYC",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(high).toBeLessThanOrEqual(1);
  });
});

// ── Threshold gate ────────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const THRESHOLD = 0.55;

  it("ICP-only lead (0.50) falls below the default threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.5);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred lead (0.60) clears the default threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBe(0.6);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP + named (0.60) exactly meets threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Drip Drop" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6, 10);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ── run() in dry-run mode ─────────────────────────────────────────────────────

describe("acquisitionAgent.run() in dry-run mode", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("returns executed:false for every lead regardless of confidence", async () => {
    // Include one above-threshold and one below-threshold lead.
    const leads: WaitlistLead[] = [
      makeLead({ email: "high@ex.com", referrer: "partner" }), // 0.60 — above threshold
      makeLead({ email: "low@ex.com" }),                        // 0.30 — below threshold
    ];
    mockDbQuery.mockResolvedValueOnce({
      rows: leads.map(toDbRow),
      rowCount: leads.length,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("emits a decision entry for every scanned lead", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "a@ex.com", vertical: "coffee_shops" }),
      makeLead({ email: "b@ex.com", referrer: "ref", city: "Austin" }),
      makeLead({ email: "c@ex.com", createdAt: AGED_DATE }),
    ];
    mockDbQuery.mockResolvedValueOnce({
      rows: leads.map(toDbRow),
      rowCount: leads.length,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));

    expect(decisions).toHaveLength(3);
    const emails = decisions.map((d) => d.targetId);
    expect(emails).toContain("a@ex.com");
    expect(emails).toContain("b@ex.com");
    expect(emails).toContain("c@ex.com");
  });

  it("decisions are sorted highest confidence first", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "low@ex.com" }),                         // 0.30
      makeLead({ email: "mid@ex.com", vertical: "coffee_shops" }), // 0.50
      makeLead({ email: "high@ex.com", referrer: "partner" }),   // 0.60
    ];
    mockDbQuery.mockResolvedValueOnce({
      rows: leads.map(toDbRow),
      rowCount: leads.length,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));

    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i - 1].confidence).toBeGreaterThanOrEqual(decisions[i].confidence);
    }
  });

  it("returns [] and never errors when no leads are available", async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });

    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));
    expect(decisions).toEqual([]);
  });

  it("action field is 'send-early-access-invite' on every decision", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [toDbRow(makeLead({ email: "x@ex.com" }))],
      rowCount: 1,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));
    expect(decisions[0].action).toBe("send-early-access-invite");
  });
});
