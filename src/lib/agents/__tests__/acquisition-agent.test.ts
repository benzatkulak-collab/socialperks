import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Mutable row array — tests splice this in beforeEach to inject synthetic leads.
const mockDbRows: Array<{
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
}> = [];

vi.mock("@/lib/db/connection", () => ({
  // db must NOT be an InMemoryConnection instance so the agent's DB query path runs.
  db: {
    query: async () => ({ rows: mockDbRows, rowCount: mockDbRows.length, duration: 0 }),
  },
  InMemoryConnection: class InMemoryConnection {},
}));

// Prevent accidental real email enqueuing even if a future test sets live=true.
vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: vi.fn() },
}));

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW = "2026-06-20T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE = 30;
const THRESHOLD = 0.55; // acquisitionAgent.config.threshold.default

// ─── Helpers ──────────────────────────────────────────────────────────────────

function freshDate(daysAgo = 5): string {
  return new Date(NOW_MS - daysAgo * 86_400_000).toISOString();
}

function agedDate(): string {
  // 45 days > 30-day cold cutoff → triggers the -0.15 penalty
  return new Date(NOW_MS - 45 * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "lead@example.com",
    vertical: "restaurants",
    createdAt: freshDate(),
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: NOW,
    config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE } },
    ...overrides,
  };
}

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("base (list signup only) → 0.30, no reason tags", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for any non-empty referrer", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-blog" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer does NOT grant the referral bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName present", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Acme Café" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city present", () => {
    const { confidence, reasons } = scoreLead(makeLead({ city: "Austin" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for lead older than maxAgeDays", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("lead at exactly maxAgeDays boundary is NOT penalized (ageDays > not >=)", () => {
    const boundaryDate = new Date(NOW_MS - MAX_AGE * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: boundaryDate }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("fully warm ICP lead stacks all bonuses → 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Java House",
      city: "Portland",
    });
    const { confidence, reasons } = scoreLead(lead, NOW_MS, MAX_AGE);
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toEqual(["referred", "ICP vertical", "named business", "city known"]);
  });

  it("aged warm lead: 0.95 - 0.15 = 0.80", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Java House",
      city: "Portland",
      createdAt: agedDate(),
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.8);
  });

  it("score is always clamped to [0, 1]", () => {
    // Aged base-only: 0.30 - 0.15 = 0.15; can never go negative
    const { confidence } = scoreLead(makeLead({ createdAt: agedDate() }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate (scoreLead vs default 0.55)", () => {
  it("ICP-only lead (0.50) falls BELOW the threshold → would not act in live mode", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    // 0.30 + 0.20 = 0.50
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred non-ICP lead (0.60) CLEARS the threshold → would act in live mode", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner" }), NOW_MS, MAX_AGE);
    // 0.30 + 0.30 = 0.60
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP + businessName + city (0.65) CLEARS the threshold without a referral", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Grounds", city: "Seattle" }),
      NOW_MS,
      MAX_AGE,
    );
    // 0.30 + 0.20 + 0.10 + 0.05 = 0.65
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("aged referred lead (0.45) falls BELOW the threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE,
    );
    // 0.30 + 0.30 - 0.15 = 0.45
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── run() – dry-run behaviour ────────────────────────────────────────────────

describe("acquisitionAgent.run() – dry-run", () => {
  beforeEach(() => {
    mockDbRows.length = 0;
    mockDbRows.push(
      {
        email: "warm@example.com",
        business_name: "Warm Café",
        city: "Portland",
        vertical: "coffee_shops",
        referrer: "partner",
        created_at: freshDate(),
      },
      {
        email: "cold@example.com",
        business_name: null,
        city: null,
        vertical: "restaurants",
        referrer: null,
        created_at: freshDate(),
      },
    );
  });

  it("all decisions have executed=false regardless of confidence", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted descending by confidence", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("decision targetId is the lead's email address", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    const targets = decisions.map((d) => d.targetId);
    expect(targets).toContain("warm@example.com");
    expect(targets).toContain("cold@example.com");
  });

  it("action field is 'send-early-access-invite' for all decisions", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    for (const d of decisions) {
      expect(d.action).toBe("send-early-access-invite");
    }
  });

  it("empty lead list returns empty decisions", async () => {
    mockDbRows.length = 0;
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toEqual([]);
  });
});
