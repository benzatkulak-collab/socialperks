/**
 * Unit tests for the Acquisition Agent.
 *
 * Validates:
 *   (a) scoreLead yields the expected weighted sums clamped to [0,1]
 *   (b) the threshold gate — leads >= threshold would act in live; below would not
 *   (c) run() in dry-run returns executed:false for ALL leads, enqueues no emails
 *
 * Environment note: DATABASE_URL is not configured in this environment, so
 * fetchUncontactedLeads returns []. Tests that need synthetic leads mock the
 * DB layer directly.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock must be declared before the imports that use the module.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    // db is NOT an instance of InMemoryConnection, so fetchUncontactedLeads
    // will proceed to call db.query (returning whatever we give it per-test).
    db: {
      query: vi.fn().mockResolvedValue({ rows: [], rowCount: 0, duration: 0 }),
    },
  };
});

import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";
import { db } from "@/lib/db/connection";

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW = "2026-07-30T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55;

function freshDate(): string {
  return new Date(NOW_MS - 1 * 86_400_000).toISOString(); // 1 day old — well within window
}

function agedDate(): string {
  return new Date(NOW_MS - 45 * 86_400_000).toISOString(); // 45 days — past the cold cutoff
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "restaurants",
    createdAt: freshDate(),
    ...overrides,
  };
}

const dryRunCtx: AgentRunContext = {
  live: false,
  config: {
    threshold: THRESHOLD,
    maxActionsPerRun: 25,
    custom: { maxAgeDays: MAX_AGE_DAYS },
  },
  now: NOW,
};

// ─── scoreLead — individual weights ──────────────────────────────────────────

describe("scoreLead — individual weights", () => {
  it("base score is 0.30 for a minimal lead (no bonuses, fresh)", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 5);
  });

  it("+0.30 for a non-empty referrer", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner.com" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60, 5);
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.50, 5);
  });

  it("+0.10 for businessName present", () => {
    const { confidence } = scoreLead(makeLead({ businessName: "The Bean" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.40, 5);
  });

  it("+0.05 for city present", () => {
    const { confidence } = scoreLead(makeLead({ city: "Austin" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.35, 5);
  });

  it("-0.15 for aged lead (> maxAgeDays)", () => {
    const { confidence } = scoreLead(makeLead({ createdAt: agedDate() }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15, 5);
  });

  it("whitespace-only referrer is NOT counted as referred", () => {
    const { confidence, reasons } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 5);
    expect(reasons).not.toContain("referred");
  });
});

// ─── scoreLead — combined fixtures ───────────────────────────────────────────

describe("scoreLead — combined fixtures", () => {
  it("fully loaded ICP lead (all bonuses, fresh) scores 0.95", () => {
    const lead = makeLead({
      vertical: "coffee_shops",
      referrer: "partner.com",
      businessName: "The Bean",
      city: "Austin",
    });
    const { confidence, reasons } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95, 5);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("fully loaded ICP lead aged 45 days scores 0.80", () => {
    const lead = makeLead({
      vertical: "coffee_shops",
      referrer: "partner.com",
      businessName: "The Bean",
      city: "Austin",
      createdAt: agedDate(),
    });
    const { confidence, reasons } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.80, 5);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("referred non-ICP lead (0.30+0.30=0.60) just clears the threshold", () => {
    const lead = makeLead({ referrer: "partner.com" }); // non-ICP vertical
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60, 5);
  });

  it("ICP-only lead (0.30+0.20=0.50) falls below the threshold", () => {
    const lead = makeLead({ vertical: "coffee_shops" });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.50, 5);
  });

  it("score is always clamped to [0, 1]", () => {
    const maxLead = makeLead({
      vertical: "coffee_shops",
      referrer: "p",
      businessName: "B",
      city: "C",
    });
    const { confidence: maxScore } = scoreLead(maxLead, NOW_MS, MAX_AGE_DAYS);
    expect(maxScore).toBeGreaterThanOrEqual(0);
    expect(maxScore).toBeLessThanOrEqual(1);

    // Most penalized possible: 0.30 - 0.15 = 0.15 (well above 0, never clamped negative)
    const minLead = makeLead({ createdAt: agedDate() });
    const { confidence: minScore } = scoreLead(minLead, NOW_MS, MAX_AGE_DAYS);
    expect(minScore).toBeGreaterThanOrEqual(0);
    expect(minScore).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate (THRESHOLD=0.55)", () => {
  it("high-confidence lead (0.95) is >= threshold → would act in live", () => {
    const lead = makeLead({
      vertical: "coffee_shops",
      referrer: "partner.com",
      businessName: "B",
      city: "C",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("bare lead (0.30) is < threshold → would NOT act in live", () => {
    const lead = makeLead();
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("aged referred lead (0.60-0.15=0.45) falls below threshold after age penalty", () => {
    const lead = makeLead({ referrer: "partner.com", createdAt: agedDate() });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.45, 5);
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── Agent configuration ──────────────────────────────────────────────────────

describe("acquisitionAgent configuration", () => {
  it("defaultMode is dry-run", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("default threshold is 0.55", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
  });

  it("default maxAgeDays is 30", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays?.default).toBe(30);
  });
});

// ─── run() — dry-run mode ─────────────────────────────────────────────────────

describe("run() — dry-run (ctx.live=false)", () => {
  const mockedQuery = vi.mocked(db.query);

  beforeEach(() => {
    mockedQuery.mockReset();
  });

  it("returns empty decisions when the DB has no leads", async () => {
    mockedQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions).toHaveLength(0);
  });

  it("all decisions have executed:false regardless of confidence score", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        // High-confidence lead (would act if live)
        {
          email: "high@ex.com",
          business_name: "The Bean",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner.com",
          created_at: freshDate(),
        },
        // Low-confidence lead (would not act even in live)
        {
          email: "low@ex.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: freshDate(),
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

  it("decisions include the correct targetId (email) and action", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "cafe@ex.com",
          business_name: "Roast Co",
          city: "Portland",
          vertical: "coffee_shops",
          referrer: "p",
          created_at: freshDate(),
        },
      ],
      rowCount: 1,
      duration: 0,
    });
    const [d] = await acquisitionAgent.run(dryRunCtx);
    expect(d.targetId).toBe("cafe@ex.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.confidence).toBeCloseTo(0.95, 4);
    expect(d.meta?.referred).toBe(true);
    expect(d.meta?.vertical).toBe("coffee_shops");
  });

  it("decisions are sorted highest-confidence first", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        // Low-score row arrives first from DB (oldest)
        {
          email: "low@ex.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: freshDate(),
        },
        // High-score row arrives second
        {
          email: "high@ex.com",
          business_name: "The Bean",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner.com",
          created_at: freshDate(),
        },
      ],
      rowCount: 2,
      duration: 0,
    });
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@ex.com");
  });

  it("does not call markContacted (no DB writes) in dry-run", async () => {
    mockedQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "cafe@ex.com",
          business_name: "Roast Co",
          city: "Portland",
          vertical: "coffee_shops",
          referrer: "partner.com",
          created_at: freshDate(),
        },
      ],
      rowCount: 1,
      duration: 0,
    });
    await acquisitionAgent.run(dryRunCtx);
    // Only the SELECT should have fired — no UPDATE for contacted_at
    expect(mockedQuery).toHaveBeenCalledTimes(1);
    expect(mockedQuery.mock.calls[0][0]).toMatch(/SELECT/i);
  });
});
