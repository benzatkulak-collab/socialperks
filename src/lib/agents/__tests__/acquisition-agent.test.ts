import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── DB + jobs mocks ────────────────────────────────────────────────────────
// vi.hoisted ensures these fns exist before the hoisted vi.mock() factories run.

const { mockQuery, emailAddMock } = vi.hoisted(() => ({
  mockQuery: vi.fn(async () => ({ rows: [] as Record<string, unknown>[] })),
  emailAddMock: vi.fn(),
}));

vi.mock("@/lib/db/connection", () => {
  // A plain class distinct from InMemoryConnection so the instanceof guard fails
  // and fetchUncontactedLeads proceeds to call db.query().
  class FakeDb {
    query = mockQuery;
  }
  class InMemoryConnection {}
  return { db: new FakeDb(), InMemoryConnection };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: emailAddMock },
}));

// ─── Constants ───────────────────────────────────────────────────────────────

const NOW_ISO = "2026-07-23T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
const DEFAULT_THRESHOLD = 0.55;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function freshDate(daysAgo = 5): string {
  return new Date(NOW_MS - daysAgo * 86_400_000).toISOString();
}

function agedDate(): string {
  return new Date(NOW_MS - (MAX_AGE_DAYS + 1) * 86_400_000).toISOString();
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
    config: {
      threshold: DEFAULT_THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    now: NOW_ISO,
    ...overrides,
  };
}

// Rows the mock DB returns for run() tests.
function makeDbRows(leads: WaitlistLead[]) {
  return leads.map((l) => ({
    email: l.email,
    business_name: l.businessName ?? null,
    city: l.city ?? null,
    vertical: l.vertical,
    referrer: l.referrer ?? null,
    created_at: l.createdAt,
  }));
}

// ─── scoreLead — branch coverage ────────────────────────────────────────────

describe("scoreLead", () => {
  it("base score only (bare minimum lead)", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBe(0.3);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for referred lead", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-coffee-co" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("referrer with only whitespace does NOT trigger the bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBe(0.3);
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for named business", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Sunrise Cafe" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city known", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Portland" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for aged lead (past maxAgeDays)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("full-bonus fresh lead: 0.30+0.30+0.20+0.10+0.05 = 0.95", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew & Co",
        city: "Seattle",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("full-bonus aged lead: 0.95 - 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew & Co",
        city: "Seattle",
        createdAt: agedDate(),
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("score is clamped to [0, 1]", () => {
    // All bonuses cannot exceed 0.95, but verify clamp is applied.
    const { confidence } = scoreLead(
      makeLead({
        referrer: "p",
        vertical: "coffee_shops",
        businessName: "B",
        city: "C",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("score with only age penalty stays >= 0 (no negative scores)", () => {
    const { confidence } = scoreLead(
      makeLead({ createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  // ─── Threshold gate logic (asserted on score values, not run()) ───────────

  it("bare lead (0.30) is below the default threshold 0.55 — would NOT act in live", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("referred fresh lead (0.60) is above threshold — WOULD act in live", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("ICP-only lead (0.50) is below threshold — would NOT act in live", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("referred + aged lead (0.45) falls below threshold after aging", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // 0.30 + 0.30 - 0.15 = 0.45
    expect(confidence).toBeCloseTo(0.45);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });
});

// ─── run() — dry-run gate ────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns [] when the DB has no leads (no-DB posture)", async () => {
    mockQuery.mockResolvedValueOnce({ rows: [] });
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
  });

  it("returns executed:false for ALL leads — never acts in dry-run", async () => {
    const leads: WaitlistLead[] = [
      // Above threshold (0.95) — would fire in live
      makeLead({
        email: "hot@example.com",
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew & Co",
        city: "Portland",
      }),
      // Below threshold (0.30) — would not fire even in live
      makeLead({ email: "cold@example.com" }),
    ];
    mockQuery.mockResolvedValueOnce({ rows: makeDbRows(leads) });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("enqueues NO emails in dry-run", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "hot@example.com", referrer: "partner", vertical: "coffee_shops" }),
    ];
    mockQuery.mockResolvedValueOnce({ rows: makeDbRows(leads) });

    await acquisitionAgent.run(makeCtx({ live: false }));

    expect(emailAddMock).not.toHaveBeenCalled();
  });

  it("decisions are sorted highest-confidence first", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "cold@example.com" }), // 0.30
      makeLead({ email: "hot@example.com", referrer: "p", vertical: "coffee_shops" }), // 0.80
    ];
    mockQuery.mockResolvedValueOnce({ rows: makeDbRows(leads) });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions[0].targetId).toBe("hot@example.com");
    expect(decisions[1].targetId).toBe("cold@example.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("every decision carries the expected action label", async () => {
    const leads: WaitlistLead[] = [makeLead({ email: "a@example.com" })];
    mockQuery.mockResolvedValueOnce({ rows: makeDbRows(leads) });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions[0].action).toBe("send-early-access-invite");
  });

  it("decision meta includes vertical, referred flag, and ageDays", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "m@example.com", referrer: "ref", vertical: "coffee_shops" }),
    ];
    mockQuery.mockResolvedValueOnce({ rows: makeDbRows(leads) });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    const meta = decisions[0].meta as Record<string, unknown>;

    expect(meta.vertical).toBe("coffee_shops");
    expect(meta.referred).toBe(true);
    expect(typeof meta.ageDays).toBe("number");
  });
});

// ─── Agent metadata ──────────────────────────────────────────────────────────

describe("acquisitionAgent metadata", () => {
  it("defaults to dry-run mode", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("threshold default is 0.55", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
  });

  it("maxAgeDays custom knob is declared", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays).toBeDefined();
    expect(acquisitionAgent.config.custom!.maxAgeDays.default).toBe(30);
  });
});
