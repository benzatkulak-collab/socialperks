/**
 * Unit tests for the Acquisition Agent's scoring logic and dry-run contract.
 *
 * Environment check: DATABASE_URL is not configured in this environment, so
 * fetchUncontactedLeads() returns []. We validate against synthetic leads by
 * mocking @/lib/db/connection with a non-InMemoryConnection fake that returns
 * configurable rows, letting us exercise scoreLead and run() without a real DB.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ---------------------------------------------------------------------------
// Mock: @/lib/db/connection
// Provides a FakeConnection (not instanceof InMemoryConnection) so the agent's
// fetchUncontactedLeads() proceeds past the guard and queries our fake.
// ---------------------------------------------------------------------------

const mockQuery = vi.fn();

vi.mock("@/lib/db/connection", () => {
  class FakeConnection {
    // Lazy wrapper — looks up mockQuery at call time, not factory time.
    query(...args: unknown[]) {
      return mockQuery(...args);
    }
  }
  class InMemoryConnection {}
  return { db: new FakeConnection(), InMemoryConnection };
});

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

/** Fixed reference timestamp so score assertions are deterministic. */
const NOW_MS = Date.UTC(2026, 6, 26, 12, 0, 0); // 2026-07-26 12:00 UTC
const NOW_ISO = new Date(NOW_MS).toISOString();
const MAX_AGE_DAYS = 30;

/** Build a createdAt ISO string N days before NOW_MS. */
const daysAgo = (n: number) => new Date(NOW_MS - n * 86_400_000).toISOString();

/** Minimal dry-run AgentRunContext. */
const dryRunCtx: AgentRunContext = {
  live: false,
  now: NOW_ISO,
  config: {
    threshold: 0.55,
    maxActionsPerRun: 25,
    custom: { maxAgeDays: MAX_AGE_DAYS },
  },
};

// ---------------------------------------------------------------------------
// scoreLead() — weighted sum assertions
// ---------------------------------------------------------------------------

describe("scoreLead()", () => {
  it("base-only lead (list signup, no extras): 0.30", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3, 5);
  });

  it("referred lead (+0.30): 0.60", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", referrer: "partner.io", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6, 5);
  });

  it("ICP vertical (coffee_shops, +0.20): 0.50", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "coffee_shops", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5, 5);
  });

  it("businessName present (+0.10): 0.40", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", businessName: "Joe's", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4, 5);
  });

  it("city present (+0.05): 0.35", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", city: "Austin", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35, 5);
  });

  it("full profile (referred + ICP + name + city, fresh): 0.95", () => {
    const { confidence } = scoreLead(
      {
        email: "a@x.com",
        vertical: "coffee_shops",
        referrer: "partner.io",
        businessName: "Warm Cafe",
        city: "Austin",
        createdAt: daysAgo(5),
      },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95, 5);
  });

  it("aged base-only (>30d cold cutoff, -0.15): 0.15", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", createdAt: daysAgo(35) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15, 5);
  });

  it("aged full-profile (all bonuses minus aged penalty): 0.80", () => {
    const { confidence } = scoreLead(
      {
        email: "a@x.com",
        vertical: "coffee_shops",
        referrer: "partner.io",
        businessName: "Warm Cafe",
        city: "Austin",
        createdAt: daysAgo(35),
      },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.8, 5);
  });

  it("blank-string referrer gives no bonus: 0.30", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", referrer: "   ", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3, 5);
  });

  it("reasons list reflects every bonus that fired", () => {
    const { reasons } = scoreLead(
      {
        email: "a@x.com",
        vertical: "coffee_shops",
        referrer: "p",
        businessName: "Cafe",
        city: "NY",
        createdAt: daysAgo(5),
      },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("aged reason is appended when the cold-cutoff penalty fires", () => {
    const { reasons } = scoreLead(
      { email: "a@x.com", vertical: "retail", createdAt: daysAgo(35) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Threshold gate
// ---------------------------------------------------------------------------

describe("scoreLead() — threshold gate (default 0.55)", () => {
  const THRESHOLD = 0.55;

  it("referred lead (0.60) clears the threshold → would fire in live mode", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", referrer: "partner", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base-only lead (0.30) is below the threshold → no action in any mode", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "retail", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP-only lead (0.50) is also below the threshold without referral", () => {
    const { confidence } = scoreLead(
      { email: "a@x.com", vertical: "coffee_shops", createdAt: daysAgo(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ---------------------------------------------------------------------------
// acquisitionAgent.run() — dry-run contract
// ---------------------------------------------------------------------------

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    // Default: empty rows (no DB / empty waitlist scenario).
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
  });

  it("returns an empty decision list when there are no leads", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions).toEqual([]);
  });

  it("executed is false for ALL leads in dry-run, even those above the threshold", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        // High-scoring: all bonuses → 0.95, well above 0.55 threshold
        {
          email: "warm@example.com",
          business_name: "Warm Cafe",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
        // Low-scoring: base only → 0.30, below threshold
        {
          email: "cold@example.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(dryRunCtx);

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("sorts decisions highest-confidence first", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        // Low-scoring arrives first from DB (oldest first ordering)
        {
          email: "cold@example.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgo(5),
        },
        // High-scoring second
        {
          email: "warm@example.com",
          business_name: "Warm Cafe",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(dryRunCtx);

    expect(decisions[0].targetId).toBe("warm@example.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("populates decision metadata correctly", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "meta@example.com",
          business_name: "Meta Cafe",
          city: "Portland",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
      ],
      rowCount: 1,
      duration: 0,
    });

    const [decision] = await acquisitionAgent.run(dryRunCtx);

    expect(decision.targetId).toBe("meta@example.com");
    expect(decision.action).toBe("send-early-access-invite");
    expect(decision.meta?.businessName).toBe("Meta Cafe");
    expect(decision.meta?.city).toBe("Portland");
    expect(decision.meta?.vertical).toBe("coffee_shops");
    expect(decision.meta?.referred).toBe(true);
  });
});
