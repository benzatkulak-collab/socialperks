import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";

// ─── DB mock ──────────────────────────────────────────────────────────────────
// vi.mock is hoisted above imports by vitest's transformer, so the module
// substitution is in place before acquisition-agent.ts loads.
//
// We give `db` a vi.fn() for `query` so tests can inject synthetic rows.
// Using a plain-object `db` (not an instance of NotInMemory) ensures the
// `db instanceof InMemoryConnection` check inside fetchUncontactedLeads is
// false → the agent proceeds to call db.query() instead of returning [].
vi.mock("@/lib/db/connection", () => {
  class NotInMemory {}
  return { InMemoryConnection: NotInMemory, db: { query: vi.fn() } };
});

import { db } from "@/lib/db/connection";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = "2026-06-25T00:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE = 30;

function freshLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "a@test.com",
    vertical: "retail",
    createdAt: "2026-06-24T00:00:00.000Z", // 1 day old
    ...overrides,
  };
}

function agedLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return freshLead({
    email: "old@test.com",
    createdAt: "2026-05-01T00:00:00.000Z", // ~55 days old
    ...overrides,
  });
}

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    live: false,
    now: NOW,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE },
    },
    ...overrides,
  };
}

// DB row shape returned by the waitlist SELECT
function dbRow(lead: WaitlistLead) {
  return {
    email: lead.email,
    business_name: lead.businessName ?? null,
    city: lead.city ?? null,
    vertical: lead.vertical,
    referrer: lead.referrer ?? null,
    created_at: lead.createdAt,
  };
}

beforeEach(() => {
  // Default: empty waitlist so tests that don't inject leads get []
  vi.mocked(db.query).mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
});

// ─── scoreLead — weight branches ──────────────────────────────────────────────

describe("scoreLead", () => {
  it("base-only lead scores 0.30", () => {
    const { confidence, reasons } = scoreLead(freshLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for a non-empty referrer", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ referrer: "partner-coffee" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("blank-string referrer does not earn the referral bonus", () => {
    const { confidence } = scoreLead(freshLead({ referrer: "   " }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("+0.20 for the ICP vertical (coffee_shops)", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for a named business", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ businessName: "The Bean" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for a known city", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for a lead older than maxAgeDays", () => {
    const { confidence, reasons } = scoreLead(agedLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
    const agingReason = reasons.find((r) => r.startsWith("aged"));
    expect(agingReason).toBeDefined();
  });

  it("full ICP lead (referred + coffee_shops + name + city, fresh) scores 0.95", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "The Bean",
        city: "Austin",
      }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("full ICP lead that went cold scores 0.80", () => {
    const { confidence } = scoreLead(
      agedLead({
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "The Bean",
        city: "Austin",
      }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("confidence is clamped to [0, 1] — never goes negative", () => {
    // Manufacture a worst-case: very old lead with no bonuses.
    // score = 0.30 - 0.15 = 0.15 → already positive; clamping is defensive.
    const { confidence } = scoreLead(agedLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("confidence never exceeds 1 even with all bonuses", () => {
    const { confidence } = scoreLead(
      freshLead({
        vertical: "coffee_shops",
        referrer: "p",
        businessName: "B",
        city: "C",
      }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate", () => {
  it("a referred lead (0.60) clears the default 0.55 threshold", () => {
    const { confidence } = scoreLead(freshLead({ referrer: "p" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("a base-only lead (0.30) does not clear the default 0.55 threshold", () => {
    const { confidence } = scoreLead(freshLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(0.55);
  });

  it("an ICP-only lead (0.50) does not clear the default 0.55 threshold", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeLessThan(0.55);
  });

  it("ICP + named business (0.60) clears the default 0.55 threshold", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops", businessName: "The Bean" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });
});

// ─── run() — dry-run guarantee ────────────────────────────────────────────────

describe("acquisitionAgent.run() in dry-run mode", () => {
  it("returns an empty decision list when waitlist has no leads", async () => {
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
  });

  it("returns executed:false for every decision regardless of confidence", async () => {
    // Inject two synthetic leads — one above and one below threshold
    const aboveThreshold = freshLead({ referrer: "p" }); // confidence 0.60
    const belowThreshold = freshLead({ email: "b@test.com" }); // confidence 0.30

    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [dbRow(aboveThreshold), dbRow(belowThreshold)],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decision confidence matches scoreLead output", async () => {
    const icpLead = freshLead({
      email: "icp@test.com",
      vertical: "coffee_shops",
      referrer: "partner",
      businessName: "The Bean",
      city: "Austin",
    });
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [dbRow(icpLead)],
      rowCount: 1,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(1);
    expect(decisions[0].confidence).toBeCloseTo(0.95);
    expect(decisions[0].targetId).toBe("icp@test.com");
    expect(decisions[0].action).toBe("send-early-access-invite");
  });

  it("sorts decisions highest-confidence first", async () => {
    const highConf = freshLead({ email: "high@test.com", referrer: "p" }); // 0.60
    const lowConf = freshLead({ email: "low@test.com" }); // 0.30

    // Insert in low → high order to confirm sorting is applied
    vi.mocked(db.query).mockResolvedValueOnce({
      rows: [dbRow(lowConf), dbRow(highConf)],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
  });
});
