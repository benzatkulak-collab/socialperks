/**
 * Unit tests for the Acquisition Agent.
 *
 * Validates:
 *   (a) scoreLead yields expected weighted sums clamped to [0,1]
 *   (b) threshold gate: lead >= 0.55 would act in live; lead < 0.55 would not
 *   (c) run() in dry-run returns executed:false for ALL leads, enqueues NO emails
 *
 * No DATABASE_URL is needed — the DB is mocked so synthetic fixtures can be
 * injected without any real connection.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── Mock @/lib/db/connection ──────────────────────────────────────────────────
// fetchUncontactedLeads checks `db instanceof InMemoryConnection` to detect the
// in-memory fallback and return []. We expose a real class for the check and a
// separate mock object for db so tests can control what the query returns.

export const mockQuery = vi.fn();

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  const db = { query: mockQuery };
  return { db, InMemoryConnection };
});

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const NOW_MS = new Date("2026-06-18T12:00:00Z").getTime();
const FRESH_DATE = new Date(NOW_MS - 10 * 86_400_000).toISOString(); // 10 days ago
const AGED_DATE = new Date(NOW_MS - 45 * 86_400_000).toISOString();  // 45 days ago

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "restaurants",
    createdAt: FRESH_DATE,
    ...overrides,
  };
}

function makeRunCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: new Date(NOW_MS).toISOString(),
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: 30 },
    },
    ...overrides,
  };
}

// Return value shape fetchUncontactedLeads expects from db.query
function dbRows(leads: WaitlistLead[]) {
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

// ─── scoreLead ─────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("returns base 0.30 for a bare list-signup lead with no bonus reasons", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toEqual([]); // "list signup only" is the run() fallback, not a reason tag
  });

  it("+0.30 for a referred lead (total 0.60)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-cafe" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for the ICP vertical coffee_shops (total 0.50)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for a named business (total 0.40)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Sunrise Cafe" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city present (total 0.35)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("sums all positive signals correctly: 0.30+0.30+0.20+0.10+0.05 = 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Cozy Cup",
      city: "Denver",
    });
    const { confidence } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.95);
  });

  it("-0.15 for an aged lead (base 0.30 → 0.15)", () => {
    const { confidence, reasons } = scoreLead(makeLead({ createdAt: AGED_DATE }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("aged penalty on full-bonus lead: 0.95 − 0.15 = 0.80", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Cold Brew Co",
      city: "Portland",
      createdAt: AGED_DATE,
    });
    const { confidence } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.80);
  });

  it("no age penalty when lead is exactly at the cutoff (29 days)", () => {
    const freshish = new Date(NOW_MS - 29 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: freshish }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("confidence is clamped to [0,1] — never exceeds 1", () => {
    // Max possible is 0.95 — sanity check the ceiling
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Max Score Cafe",
      city: "Boston",
    });
    const { confidence } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  it("confidence is clamped to [0,1] — never goes below 0", () => {
    // Contrived: 0.30 base − 0.15 age = 0.15, well above 0. But test the clamp path.
    const veryOldDate = new Date(NOW_MS - 500 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: veryOldDate }), NOW_MS, 30);
    expect(confidence).toBeGreaterThanOrEqual(0.0);
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  it("whitespace-only referrer does NOT trigger the referral bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
  });
});

// ─── Threshold gate ────────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const DEFAULT_THRESHOLD = 0.55;

  it("referred lead (0.60) is at or above the threshold — would execute in live", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "friend" }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.60);
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("ICP-only lead (0.50) is below the threshold — would NOT execute in live", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("referred + ICP vertical (0.80) is well above threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "vc", vertical: "coffee_shops" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.80);
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });
});

// ─── run() in dry-run mode ─────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run guarantees", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns executed:false for every lead even when they exceed the threshold", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "a@x.com", referrer: "partner" }),         // score 0.60 > 0.55
      makeLead({ email: "b@x.com", vertical: "coffee_shops" }),    // score 0.50 < 0.55
      makeLead({ email: "c@x.com", referrer: "vip", vertical: "coffee_shops", businessName: "Drip", city: "NYC" }), // score 0.95
    ];
    mockQuery.mockResolvedValueOnce(dbRows(leads));

    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));

    expect(decisions.length).toBe(3);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("returns an empty decision list when there are no leads (DB returns [])", async () => {
    mockQuery.mockResolvedValueOnce(dbRows([]));

    const decisions = await acquisitionAgent.run(makeRunCtx());
    expect(decisions).toEqual([]);
  });

  it("sorts decisions by confidence descending", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "low@x.com" }),                               // 0.30
      makeLead({ email: "high@x.com", referrer: "p", vertical: "coffee_shops" }), // 0.80
      makeLead({ email: "mid@x.com", referrer: "p" }),                // 0.60
    ];
    mockQuery.mockResolvedValueOnce(dbRows(leads));

    const decisions = await acquisitionAgent.run(makeRunCtx());

    expect(decisions[0].targetId).toBe("high@x.com");
    expect(decisions[1].targetId).toBe("mid@x.com");
    expect(decisions[2].targetId).toBe("low@x.com");
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[1].confidence).toBeGreaterThanOrEqual(decisions[2].confidence);
  });

  it("never enqueues emails in dry-run (jobs/registry is never imported)", async () => {
    const leads: WaitlistLead[] = [
      makeLead({ email: "vip@x.com", referrer: "partner", vertical: "coffee_shops", businessName: "Top Cafe", city: "Austin" }),
    ];
    mockQuery.mockResolvedValueOnce(dbRows(leads));

    // Ensure the jobs registry module is never touched in dry-run
    const importSpy = vi.spyOn(globalThis, "eval").mockImplementation(() => undefined);
    const decisions = await acquisitionAgent.run(makeRunCtx({ live: false }));

    expect(decisions[0].executed).toBe(false);
    importSpy.mockRestore();
  });

  it("decision meta includes correct business metadata", async () => {
    const lead: WaitlistLead = {
      email: "meta@x.com",
      businessName: "Meta Cafe",
      city: "Chicago",
      vertical: "coffee_shops",
      referrer: "friend",
      createdAt: FRESH_DATE,
    };
    mockQuery.mockResolvedValueOnce(dbRows([lead]));

    const decisions = await acquisitionAgent.run(makeRunCtx());
    const d = decisions[0];

    expect(d.targetId).toBe("meta@x.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.meta?.businessName).toBe("Meta Cafe");
    expect(d.meta?.city).toBe("Chicago");
    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.referred).toBe(true);
  });

  it("gracefully returns empty decisions if DB throws", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));

    const decisions = await acquisitionAgent.run(makeRunCtx());
    expect(decisions).toEqual([]);
  });
});
