/**
 * Unit tests for the Acquisition Agent scoring + decision logic.
 *
 * Environment: DATABASE_URL is not set in CI/dev, so fetchUncontactedLeads
 * returns [] by default. The DB mock below lets the run() tests feed synthetic
 * leads through the full pipeline without a real database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ── DB mock ──────────────────────────────────────────────────────────────────
// Override the singleton so fetchUncontactedLeads sees a non-InMemoryConnection
// and falls through to db.query(), which we control per test.

const mockQuery = vi.fn();

vi.mock("@/lib/db/connection", async (importOriginal) => {
  const mod = await importOriginal<typeof import("@/lib/db/connection")>();
  return {
    ...mod,
    db: {
      query: mockQuery,
      transaction: vi.fn(),
      healthCheck: vi.fn(),
      close: vi.fn(),
    },
  };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-06-30T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const FRESH_DATE = new Date(NOW_MS - 5 * 86_400_000).toISOString();  // 5 days old
const AGED_DATE = new Date(NOW_MS - 40 * 86_400_000).toISOString();  // 40 days old
const MAX_AGE_DAYS = 30;

function lead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "retail",
    createdAt: FRESH_DATE,
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    now: NOW_ISO,
    ...overrides,
  };
}

// ── scoreLead ─────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("base score: list signup only", () => {
    const { confidence, reasons } = scoreLead(
      lead({ vertical: "retail" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for referrer (warm intro)", () => {
    const { confidence, reasons } = scoreLead(
      lead({ referrer: "partner-link" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence, reasons } = scoreLead(
      lead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for named business", () => {
    const { confidence, reasons } = scoreLead(
      lead({ businessName: "Joe's Roastery" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city known", () => {
    const { confidence, reasons } = scoreLead(
      lead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for leads older than maxAgeDays", () => {
    const { confidence, reasons } = scoreLead(
      lead({ createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 - 0.15 = 0.15
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fully-loaded fresh ICP lead scores 0.95", () => {
    const { confidence } = scoreLead(
      lead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Blue Bottle",
        city: "SF",
        createdAt: FRESH_DATE,
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    expect(confidence).toBeCloseTo(0.95);
  });

  it("fully-loaded aged lead scores 0.80", () => {
    const { confidence } = scoreLead(
      lead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Blue Bottle",
        city: "SF",
        createdAt: AGED_DATE,
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.95 - 0.15 = 0.80
    expect(confidence).toBeCloseTo(0.8);
  });

  it("score is clamped to [0, 1]", () => {
    // Worst case: base - age penalty = 0.15 (already > 0, but verify clamp logic)
    const { confidence } = scoreLead(
      lead({ createdAt: AGED_DATE }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("whitespace-only referrer is not counted as a referral", () => {
    const { confidence, reasons } = scoreLead(
      lead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("threshold gate: ICP-only lead (0.50) is below 0.55 threshold", () => {
    const { confidence } = scoreLead(
      lead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(confidence).toBeLessThan(0.55);
  });

  it("threshold gate: referred lead (0.60) is at or above 0.55 threshold", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "partner" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });
});

// ── run() in dry-run ─────────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty decisions when no leads are available", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });

  it("returns executed:false for ALL leads regardless of confidence", async () => {
    // Two leads: one above threshold (referred), one below (ICP only)
    mockQuery.mockResolvedValue({
      rows: [
        {
          email: "hot@example.com",
          business_name: "Bean & Gone",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: FRESH_DATE,
        },
        {
          email: "cold@example.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: FRESH_DATE,
        },
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

  it("decisions are sorted highest-confidence first", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        // Low-confidence row first in the DB result
        {
          email: "low@example.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: FRESH_DATE,
        },
        // High-confidence row second
        {
          email: "high@example.com",
          business_name: "Top Shop",
          city: "NYC",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: FRESH_DATE,
        },
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@example.com");
  });

  it("each decision carries correct action label and meta", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        {
          email: "meta@example.com",
          business_name: "Test Biz",
          city: "LA",
          vertical: "coffee_shops",
          referrer: "friend",
          created_at: FRESH_DATE,
        },
      ],
      rowCount: 1,
      duration: 0,
    });

    const [d] = await acquisitionAgent.run(makeCtx());

    expect(d.action).toBe("send-early-access-invite");
    expect(d.targetId).toBe("meta@example.com");
    expect(d.meta?.businessName).toBe("Test Biz");
    expect(d.meta?.city).toBe("LA");
    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.referred).toBe(true);
  });
});

// ── static config sanity ──────────────────────────────────────────────────────

describe("acquisitionAgent static config", () => {
  it("defaultMode is dry-run", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("default threshold is 0.55", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
  });

  it("default maxAgeDays is 30", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays.default).toBe(30);
  });
});
