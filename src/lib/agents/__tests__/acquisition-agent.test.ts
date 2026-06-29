/**
 * Unit tests for the Acquisition Agent.
 *
 * Validates scoreLead weights and the dry-run gate by injecting synthetic
 * WaitlistLead fixtures via a mocked DB connection. No real DB is required.
 *
 * Scoring reference (src/lib/agents/acquisition-agent.ts):
 *   base   +0.30
 *   referred  +0.30
 *   ICP vertical (coffee_shops)  +0.20
 *   business name given  +0.10
 *   city given  +0.05
 *   aged > maxAgeDays (default 30)  −0.15
 *   result clamped [0, 1]
 *
 * Default threshold: 0.55. In live mode only confidence >= threshold executes.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// Hoist the mock fn so it's available inside the factory below.
const mockQueryFn = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => ({
  // A plain object is NOT an instance of InMemoryConnection, so the agent
  // proceeds past the early-return guard and calls .query() on it.
  db: { query: mockQueryFn },
  InMemoryConnection: class InMemoryConnection {},
}));

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW = new Date("2026-06-29T00:00:00Z");
/** 5 days old — well inside the 30-day window. */
const FRESH = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
/** 35 days old — past the default 30-day cold cutoff. */
const AGED = new Date(NOW.getTime() - 35 * 86_400_000).toISOString();

function makeCtx(overrides?: Partial<AgentRunContext>): AgentRunContext {
  return {
    live: false,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: 30 },
    },
    now: NOW.toISOString(),
    ...overrides,
  };
}

/** Seed the mock DB to return these rows from the next query call. */
function seedLeads(
  leads: Array<{
    email: string;
    business_name?: string | null;
    city?: string | null;
    vertical: string;
    referrer?: string | null;
    created_at: string;
  }>,
) {
  mockQueryFn.mockResolvedValueOnce({ rows: leads, rowCount: leads.length, duration: 0 });
}

// ─── Tests ───────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockQueryFn.mockReset();
});

describe("Acquisition Agent — scoreLead", () => {
  it("max-signal fresh lead scores 0.95 (all positive signals, not aged)", async () => {
    // 0.30 + 0.30 (referred) + 0.20 (ICP) + 0.10 (name) + 0.05 (city) = 0.95
    seedLeads([
      {
        email: "max@example.com",
        business_name: "Best Coffee",
        city: "Austin",
        vertical: "coffee_shops",
        referrer: "partner.com",
        created_at: FRESH,
      },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    const d = decisions.find((x) => x.targetId === "max@example.com")!;
    expect(d).toBeDefined();
    expect(d.confidence).toBeCloseTo(0.95, 5);
  });

  it("bare-minimum lead (list-only, no extras, non-ICP) scores 0.30", async () => {
    // 0.30 base only
    seedLeads([{ email: "bare@example.com", vertical: "restaurants", created_at: FRESH }]);
    const decisions = await acquisitionAgent.run(makeCtx());
    const d = decisions.find((x) => x.targetId === "bare@example.com")!;
    expect(d.confidence).toBeCloseTo(0.30, 5);
  });

  it("referred non-ICP lead (no name, no city) scores 0.60", async () => {
    // 0.30 + 0.30 = 0.60
    seedLeads([
      { email: "ref@example.com", vertical: "restaurants", referrer: "friend.com", created_at: FRESH },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    const d = decisions.find((x) => x.targetId === "ref@example.com")!;
    expect(d.confidence).toBeCloseTo(0.60, 5);
  });

  it("non-referred ICP lead with name and city (fresh) scores 0.65", async () => {
    // 0.30 + 0.20 + 0.10 + 0.05 = 0.65
    seedLeads([
      {
        email: "icp@example.com",
        business_name: "Local Cup",
        city: "Seattle",
        vertical: "coffee_shops",
        created_at: FRESH,
      },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    const d = decisions.find((x) => x.targetId === "icp@example.com")!;
    expect(d.confidence).toBeCloseTo(0.65, 5);
  });

  it("full-signal aged lead takes −0.15 penalty → 0.80", async () => {
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 − 0.15 = 0.80
    seedLeads([
      {
        email: "aged@example.com",
        business_name: "Old Bean",
        city: "Denver",
        vertical: "coffee_shops",
        referrer: "partner",
        created_at: AGED,
      },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    const d = decisions.find((x) => x.targetId === "aged@example.com")!;
    expect(d.confidence).toBeCloseTo(0.80, 5);
  });

  it("score is clamped to [0, 1] for every lead", async () => {
    // Very old lead with no signals: 0.30 − 0.15 = 0.15 — tests lower bound stays ≥ 0
    const veryOld = new Date(NOW.getTime() - 180 * 86_400_000).toISOString();
    seedLeads([
      {
        email: "high@example.com",
        business_name: "Peak",
        city: "NYC",
        vertical: "coffee_shops",
        referrer: "big-partner",
        created_at: FRESH,
      },
      {
        email: "cold@example.com",
        vertical: "restaurants",
        created_at: veryOld,
      },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    for (const d of decisions) {
      expect(d.confidence).toBeGreaterThanOrEqual(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
    }
  });
});

describe("Acquisition Agent — threshold gate", () => {
  it("above-threshold lead (0.60 ≥ 0.55) has executed=false in dry-run", async () => {
    seedLeads([
      { email: "above@example.com", vertical: "restaurants", referrer: "p", created_at: FRESH },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    const d = decisions.find((x) => x.targetId === "above@example.com")!;
    expect(d.confidence).toBeGreaterThanOrEqual(0.55);
    expect(d.executed).toBe(false);
  });

  it("below-threshold lead (0.30 < 0.55) is not executed in dry-run", async () => {
    seedLeads([{ email: "below@example.com", vertical: "restaurants", created_at: FRESH }]);
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    const d = decisions.find((x) => x.targetId === "below@example.com")!;
    expect(d.confidence).toBeLessThan(0.55);
    expect(d.executed).toBe(false);
  });
});

describe("Acquisition Agent — dry-run invariants", () => {
  it("all decisions have executed:false regardless of confidence", async () => {
    seedLeads([
      {
        email: "a@example.com",
        vertical: "coffee_shops",
        referrer: "p",
        business_name: "Biz",
        city: "LA",
        created_at: FRESH,
      },
      { email: "b@example.com", vertical: "restaurants", created_at: FRESH },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("returns an empty array when no leads are available", async () => {
    mockQueryFn.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });

  it("decisions are sorted by confidence descending", async () => {
    seedLeads([
      { email: "low@example.com", vertical: "restaurants", created_at: FRESH },
      {
        email: "high@example.com",
        vertical: "coffee_shops",
        referrer: "p",
        business_name: "B",
        city: "C",
        created_at: FRESH,
      },
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@example.com");
  });
});

describe("Acquisition Agent — decision shape", () => {
  it("populates action, reason, and meta correctly for a full-signal lead", async () => {
    seedLeads([
      {
        email: "meta@example.com",
        business_name: "Meta Bean",
        city: "Portland",
        vertical: "coffee_shops",
        referrer: "x",
        created_at: FRESH,
      },
    ]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.action).toBe("send-early-access-invite");
    expect(d.reason).toContain("referred");
    expect(d.reason).toContain("ICP vertical");
    expect(d.reason).toContain("named business");
    expect(d.reason).toContain("city known");
    expect(d.meta).toMatchObject({
      businessName: "Meta Bean",
      city: "Portland",
      vertical: "coffee_shops",
      referred: true,
    });
  });

  it("uses 'list signup only' as reason for a bare-minimum lead", async () => {
    seedLeads([{ email: "bare2@example.com", vertical: "restaurants", created_at: FRESH }]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.reason).toBe("list signup only");
  });
});
