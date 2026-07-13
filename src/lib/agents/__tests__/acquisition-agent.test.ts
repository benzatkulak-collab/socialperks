import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  scoreLead,
  acquisitionAgent,
  type WaitlistLead,
} from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── DB mock ─────────────────────────────────────────────────────────────────
// vi.hoisted lets us reference mockQueryFn from both the factory and test bodies.
const { mockQueryFn } = vi.hoisted(() => ({ mockQueryFn: vi.fn() }));

// Mock the DB connection module so fetchUncontactedLeads bypasses the
// InMemoryConnection guard and returns whatever mockQueryFn resolves to.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    db: { query: mockQueryFn },
    InMemoryConnection,
  };
});

// ─── Fixtures ─────────────────────────────────────────────────────────────────
// Fixed reference point so scoring math is deterministic.
const NOW_ISO = "2026-07-13T12:00:00Z";
const NOW_MS = new Date(NOW_ISO).getTime();
// 5 days before NOW → fresh (within the default 30-day window)
const FRESH = "2026-07-08T12:00:00Z";
// 35 days before NOW → aged (beyond the default 30-day window)
const AGED = "2026-06-08T12:00:00Z";

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "default@test.com",
    vertical: "retail",
    createdAt: FRESH,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: 30 },
    },
    now: NOW_ISO,
    ...overrides,
  };
}

// Raw DB row shape returned by the waitlist query
function makeDbRow(overrides: Partial<{
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
}> = {}) {
  return {
    email: "default@test.com",
    business_name: null,
    city: null,
    vertical: "retail",
    referrer: null,
    created_at: FRESH,
    ...overrides,
  };
}

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe("scoreLead — weight branches", () => {
  it("base only: 0.30", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for referred lead → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-x" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Acme Cafe" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Portland" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for aged lead (> maxAgeDays) → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: AGED }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fully loaded ICP lead (all bonuses, fresh) → 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Sunrise Cafe",
      city: "Portland",
    });
    const { confidence } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.95);
  });

  it("blank/whitespace referrer is not counted as referred", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
  });
});

describe("scoreLead — clamping", () => {
  it("confidence never goes below 0", () => {
    const { confidence } = scoreLead(makeLead({ createdAt: AGED }), NOW_MS, 30);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("confidence never exceeds 1", () => {
    const lead = makeLead({
      referrer: "x",
      vertical: "coffee_shops",
      businessName: "B",
      city: "C",
    });
    const { confidence } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("referred lead (0.60) meets the threshold → would act in live", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("anonymous base lead (0.30) is below the threshold → would not act", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, 30);
    expect(confidence).toBeLessThan(0.55);
  });
});

// ─── run() — dry-run invariants ───────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns executed:false for ALL decisions regardless of confidence", async () => {
    // Provide two leads: one high-confidence (ICP + referred, ~0.95) and one
    // below-threshold (base only, 0.30). Both must have executed:false in dry-run.
    mockQueryFn.mockResolvedValueOnce({
      rows: [
        makeDbRow({
          email: "cafe@test.com",
          business_name: "Sunrise Cafe",
          city: "Portland",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: FRESH,
        }),
        makeDbRow({
          email: "anon@test.com",
          created_at: FRESH,
        }),
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("produces the correct action and targetId for each lead", async () => {
    mockQueryFn.mockResolvedValueOnce({
      rows: [
        makeDbRow({ email: "test@cafe.com", vertical: "coffee_shops" }),
      ],
      rowCount: 1,
      duration: 0,
    });

    const [decision] = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decision.targetId).toBe("test@cafe.com");
    expect(decision.action).toBe("send-early-access-invite");
    expect(decision.confidence).toBeGreaterThan(0);
    expect(decision.confidence).toBeLessThanOrEqual(1);
  });

  it("returns [] when no leads are available", async () => {
    mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toHaveLength(0);
  });

  it("sorts decisions by confidence descending", async () => {
    mockQueryFn.mockResolvedValueOnce({
      rows: [
        // Low-confidence lead first in DB (oldest first ordering)
        makeDbRow({ email: "low@test.com" }),
        // High-confidence lead second
        makeDbRow({
          email: "high@test.com",
          vertical: "coffee_shops",
          referrer: "partner",
          business_name: "Best Cafe",
          city: "Seattle",
          created_at: FRESH,
        }),
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
  });
});
