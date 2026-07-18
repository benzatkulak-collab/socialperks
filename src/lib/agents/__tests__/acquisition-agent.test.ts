import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";

// ─── Reference time ────────────────────────────────────────────────────────
const NOW = "2026-07-18T00:00:00Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55;

// ─── DB Mock (intercepts the dynamic import inside fetchUncontactedLeads) ──
const { mockQuery } = vi.hoisted(() => ({
  mockQuery: vi.fn().mockResolvedValue({ rows: [] }),
}));

vi.mock("@/lib/db/connection", () => {
  // PgConnection is a different class than InMemoryConnection so the
  // `db instanceof InMemoryConnection` guard inside fetchUncontactedLeads
  // evaluates to false, letting the query path execute.
  class InMemoryConnection {}
  class PgConnection {
    query = mockQuery;
  }
  return { db: new PgConnection(), InMemoryConnection };
});

// ─── Helpers ───────────────────────────────────────────────────────────────
function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "restaurants",
    createdAt: "2026-07-15T00:00:00Z", // 3 days before NOW — fresh
    ...overrides,
  };
}

function dryRunCtx(opts: { threshold?: number; maxActionsPerRun?: number; maxAgeDays?: number } = {}) {
  return {
    live: false as const,
    config: {
      threshold: opts.threshold ?? THRESHOLD,
      maxActionsPerRun: opts.maxActionsPerRun ?? 25,
      custom: { maxAgeDays: opts.maxAgeDays ?? MAX_AGE_DAYS },
    },
    now: NOW,
  };
}

// ─── scoreLead ─────────────────────────────────────────────────────────────

describe("scoreLead — weight branches", () => {
  it("base only: list signup with no extras → 0.30", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for referred lead (warm intro / partner channel)", () => {
    const { confidence, reasons } = scoreLead(makeLead({ referrer: "partner" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer does NOT earn the +0.30 bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence, reasons } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName present", () => {
    const { confidence, reasons } = scoreLead(makeLead({ businessName: "Joe's Cafe" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city present", () => {
    const { confidence, reasons } = scoreLead(makeLead({ city: "Austin" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for a lead past maxAgeDays", () => {
    const aged = new Date(NOW_MS - 45 * 86_400_000).toISOString(); // 45 days ago
    const { confidence, reasons } = scoreLead(makeLead({ createdAt: aged }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("no age penalty for a lead at exactly maxAgeDays boundary (not strictly greater)", () => {
    const boundary = new Date(NOW_MS - 30 * 86_400_000).toISOString(); // exactly 30 days
    const { confidence } = scoreLead(makeLead({ createdAt: boundary }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("accumulates all positive factors for a full-ICP fresh lead → 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Brew Bliss",
      city: "Austin",
    });
    const { confidence, reasons } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toEqual(["referred", "ICP vertical", "named business", "city known"]);
  });

  it("clamps score to [0, 1] — confidence is always non-negative", () => {
    const aged = new Date(NOW_MS - 45 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: aged }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("referred non-ICP lead (0.60) is above the gate — would act in live", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "email-blast" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base-only lead (0.30) is below the gate — would NOT act in live", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP-only lead (0.50) is also below the gate", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── run() — dry-run guarantees ────────────────────────────────────────────

describe("run() — dry-run mode", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns executed:false for EVERY decision regardless of confidence", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          email: "alice@example.com",
          business_name: "Alice Cafe",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: "2026-07-10T00:00:00Z",
        },
        {
          email: "bob@example.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: "2026-07-15T00:00:00Z",
        },
      ],
    });

    const decisions = await acquisitionAgent.run(dryRunCtx());

    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("sorts decisions by confidence descending so the best leads appear first", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          email: "low@example.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: "2026-07-15T00:00:00Z",
        },
        {
          email: "high@example.com",
          business_name: "High Coffee",
          city: "NYC",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: "2026-07-10T00:00:00Z",
        },
      ],
    });

    const decisions = await acquisitionAgent.run(dryRunCtx());

    expect(decisions[0].targetId).toBe("high@example.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("returns an empty array when no leads are available", async () => {
    mockQuery.mockResolvedValue({ rows: [] });
    const decisions = await acquisitionAgent.run(dryRunCtx());
    expect(decisions).toEqual([]);
  });
});
