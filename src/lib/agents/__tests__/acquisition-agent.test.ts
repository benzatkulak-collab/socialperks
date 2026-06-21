import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Hoist the mock query fn so the vi.mock factory closure can reference it
const { mockDbQuery } = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
}));

// Replace @/lib/db/connection so fetchUncontactedLeads receives synthetic rows.
// `db` is a plain object (NOT an InMemoryConnection instance), so the
// `db instanceof InMemoryConnection` guard is false and db.query() is called.
vi.mock("@/lib/db/connection", () => ({
  InMemoryConnection: class InMemoryConnection {},
  db: { query: mockDbQuery },
}));

import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Helpers ────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-06-21T00:00:00Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
const FRESH_CREATED = new Date(NOW_MS - 5 * 86_400_000).toISOString(); // 5 days old

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "other",
    createdAt: FRESH_CREATED,
    ...overrides,
  };
}

function makeCtx(live = false): AgentRunContext {
  return {
    live,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    now: NOW_ISO,
  };
}

/** Convert WaitlistLead objects into the DB row shape the agent expects. */
function makeDbRows(leads: WaitlistLead[]) {
  return {
    rows: leads.map((l) => ({
      email: l.email,
      business_name: l.businessName ?? null,
      city: l.city ?? null,
      vertical: l.vertical,
      referrer: l.referrer ?? null,
      created_at: l.createdAt,
    })),
    rowCount: leads.length,
    duration: 0,
  };
}

// ─── scoreLead — weighted sums ───────────────────────────────────────────────

describe("scoreLead — weighted sums", () => {
  it("base 0.30 for anonymous minimal lead with no bonuses", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for referred lead (total 0.60)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-site" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer is not counted (+0.00)", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3); // base only
  });

  it("+0.20 for ICP vertical coffee_shops (total 0.50)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for named business (total 0.40)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "My Cafe" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city (total 0.35)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("perfect lead: referred + ICP + named + city = 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Sunrise Coffee",
        city: "Portland",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("-0.15 for lead older than maxAgeDays; reason includes 'aged Nd'", () => {
    const agedCreated = new Date(NOW_MS - 40 * 86_400_000).toISOString(); // 40d old
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: agedCreated }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15); // 0.30 - 0.15
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fresh lead exactly at the age boundary is NOT penalised", () => {
    // 30 days old == maxAgeDays — strictly >, so no penalty
    const boundaryCreated = new Date(NOW_MS - 30 * 86_400_000).toISOString();
    const { confidence } = scoreLead(
      makeLead({ createdAt: boundaryCreated }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3); // no penalty
  });

  it("score is clamped to >= 0 (never negative)", () => {
    // Worst possible: base 0.30 - 0.15 (aged) = 0.15 — already positive,
    // but the clamp is still important for future weight changes.
    const agedCreated = new Date(NOW_MS - 365 * 86_400_000).toISOString();
    const { confidence } = scoreLead(
      makeLead({ createdAt: agedCreated }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("score is clamped to <= 1 (never exceeds 1)", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Best Cafe",
        city: "NYC",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const THRESHOLD = 0.55;

  it("referred + ICP lead (0.80) clears the threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP-only lead (0.50) is below the threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred + named non-ICP lead (0.70) clears the threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "source", businessName: "Artisan Tacos" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("anonymous minimal lead (0.30) is well below the threshold", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── run() dry-run invariants ────────────────────────────────────────────────

describe("acquisitionAgent.run() dry-run", () => {
  const syntheticLeads = [
    // High confidence — 0.95 (would trigger in live, must NOT in dry-run)
    makeLead({
      email: "high@test.com",
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Sunrise",
      city: "Austin",
    }),
    // Below threshold — 0.50
    makeLead({ email: "mid@test.com", vertical: "coffee_shops" }),
    // Base only — 0.30
    makeLead({ email: "low@test.com" }),
  ];

  beforeEach(() => {
    mockDbQuery.mockResolvedValue(makeDbRows(syntheticLeads));
  });

  afterEach(() => {
    mockDbQuery.mockReset();
  });

  it("returns one decision per lead", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(3);
  });

  it("ALL decisions have executed=false in dry-run (including high-confidence ones)", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted by confidence descending", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("action is 'send-early-access-invite' for every decision", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (const d of decisions) {
      expect(d.action).toBe("send-early-access-invite");
    }
  });

  it("high-confidence lead reports correct score and all reasons", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    const top = decisions[0]; // sorted desc, so highest first
    expect(top.confidence).toBeCloseTo(0.95);
    expect(top.reason).toContain("referred");
    expect(top.reason).toContain("ICP vertical");
    expect(top.reason).toContain("named business");
    expect(top.reason).toContain("city known");
  });

  it("below-threshold lead still appears in decisions (just not executed)", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    const midDecision = decisions.find((d) => d.targetId === "mid@test.com");
    expect(midDecision).toBeDefined();
    expect(midDecision!.executed).toBe(false);
    expect(midDecision!.confidence).toBeCloseTo(0.5);
  });

  it("no-op when DB returns empty list", async () => {
    mockDbQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(0);
  });
});
