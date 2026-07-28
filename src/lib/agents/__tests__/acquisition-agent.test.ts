import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Hoisted mocks (must be declared before vi.mock factories run) ─────────────

const mocks = vi.hoisted(() => ({
  dbQuery: vi.fn(),
  emailQueueAdd: vi.fn(),
}));

// Replace the DB connection so fetchUncontactedLeads doesn't short-circuit on
// InMemoryConnection and actually calls db.query with our controlled data.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    db: { query: mocks.dbQuery },
    InMemoryConnection,
  };
});

// Replace the email queue so we can assert enqueue calls without side-effects.
vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mocks.emailQueueAdd },
}));

import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

/** Fixed epoch used as "now" across all tests so age arithmetic is deterministic. */
const BASE_NOW_MS = 1_700_000_000_000;
const BASE_NOW = new Date(BASE_NOW_MS).toISOString();

function daysBefore(days: number): string {
  return new Date(BASE_NOW_MS - days * 86_400_000).toISOString();
}

interface LeadFixture {
  email: string;
  businessName?: string;
  city?: string;
  vertical: string;
  referrer?: string;
  createdAt: string;
}

function makeLead(overrides: Partial<LeadFixture> = {}): LeadFixture {
  return {
    email: "test@example.com",
    vertical: "other",
    createdAt: daysBefore(5), // fresh — inside 30-day window
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: BASE_NOW,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: 30 },
    },
    ...overrides,
  };
}

/** Map a LeadFixture to the raw DB-row shape that fetchUncontactedLeads expects. */
function toDbRow(lead: LeadFixture) {
  return {
    email: lead.email,
    business_name: lead.businessName ?? null,
    city: lead.city ?? null,
    vertical: lead.vertical,
    referrer: lead.referrer ?? null,
    created_at: lead.createdAt,
  };
}

/** Wire up dbQuery so SELECT returns the given leads and UPDATE is a no-op. */
function setupDbWithLeads(leads: LeadFixture[]) {
  mocks.dbQuery.mockImplementation((sql: string) => {
    if (sql.trim().toUpperCase().startsWith("SELECT")) {
      return Promise.resolve({
        rows: leads.map(toDbRow),
        rowCount: leads.length,
        duration: 1,
      });
    }
    // UPDATE contacted_at — just acknowledge
    return Promise.resolve({ rows: [], rowCount: 1, duration: 1 });
  });
}

// ─── scoreLead — pure-function unit tests ─────────────────────────────────────

describe("scoreLead", () => {
  it("gives a base score of 0.30 for a list-signup-only lead", () => {
    const { confidence } = scoreLead(makeLead(), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("adds 0.30 for a referred lead (+0.30 → 0.60)", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner-xyz" }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.6);
  });

  it("treats a whitespace-only referrer as absent (no bonus)", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("adds 0.20 for the ICP vertical coffee_shops (+0.20 → 0.50)", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.5);
  });

  it("adds 0.10 for a named business (+0.10 → 0.40)", () => {
    const { confidence } = scoreLead(makeLead({ businessName: "Acme Café" }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.4);
  });

  it("adds 0.05 for a known city (+0.05 → 0.35)", () => {
    const { confidence } = scoreLead(makeLead({ city: "Portland" }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.35);
  });

  it("subtracts 0.15 when lead age exceeds maxAgeDays (-0.15 → 0.15)", () => {
    const { confidence } = scoreLead(makeLead({ createdAt: daysBefore(31) }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("does NOT apply the age penalty when lead is exactly at the boundary", () => {
    // ageDays === maxAgeDays (30 > 30 is false)
    const { confidence } = scoreLead(makeLead({ createdAt: daysBefore(30) }), BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("scores a fully-featured fresh ICP referred lead at 0.95", () => {
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    const lead = makeLead({
      referrer: "influencer-x",
      vertical: "coffee_shops",
      businessName: "Sunrise Coffee",
      city: "Austin",
    });
    const { confidence } = scoreLead(lead, BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.95);
  });

  it("scores an aged referred ICP lead at 0.80 (all bonuses minus age penalty)", () => {
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 - 0.15 = 0.80
    const lead = makeLead({
      referrer: "r",
      vertical: "coffee_shops",
      businessName: "Bean Co",
      city: "NYC",
      createdAt: daysBefore(45),
    });
    const { confidence } = scoreLead(lead, BASE_NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.8);
  });

  it("clamps result to a minimum of 0 (defensive floor)", () => {
    // Current weights floor at 0.15 (base 0.30 - age 0.15), but the clamp
    // must be present for future weight changes.
    const { confidence } = scoreLead(makeLead({ createdAt: daysBefore(365) }), BASE_NOW_MS, 30);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("clamps result to a maximum of 1", () => {
    const lead = makeLead({
      referrer: "r",
      vertical: "coffee_shops",
      businessName: "B",
      city: "C",
    });
    const { confidence } = scoreLead(lead, BASE_NOW_MS, 30);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("populates reasons for every active bonus", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Bean Co",
      city: "Chicago",
    });
    const { reasons } = scoreLead(lead, BASE_NOW_MS, 30);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("includes an 'aged Nd' reason for stale leads", () => {
    const { reasons } = scoreLead(makeLead({ createdAt: daysBefore(45) }), BASE_NOW_MS, 30);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("returns an empty reasons array for a base-only lead", () => {
    const { reasons } = scoreLead(makeLead(), BASE_NOW_MS, 30);
    expect(reasons).toHaveLength(0);
  });
});

// ─── run() — dry-run contract ─────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns an empty array when there are no uncontacted leads", async () => {
    setupDbWithLeads([]);
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
    expect(mocks.emailQueueAdd).not.toHaveBeenCalled();
  });

  it("returns one decision per lead, each with executed=false", async () => {
    const leads = [
      makeLead({ email: "a@test.com", referrer: "r", vertical: "coffee_shops" }),
      makeLead({ email: "b@test.com" }),
    ];
    setupDbWithLeads(leads);

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("never enqueues an email in dry-run even when confidence exceeds the threshold", async () => {
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95 > 0.55
    const leads = [
      makeLead({
        email: "high@test.com",
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Top Bean",
        city: "NYC",
      }),
    ];
    setupDbWithLeads(leads);

    await acquisitionAgent.run(makeCtx({ live: false }));
    expect(mocks.emailQueueAdd).not.toHaveBeenCalled();
  });

  it("sorts decisions by confidence descending so best leads surface first", async () => {
    const leads = [
      makeLead({ email: "base@test.com" }), // ~0.30
      makeLead({ email: "icp@test.com", referrer: "r", vertical: "coffee_shops" }), // ~0.80
    ];
    setupDbWithLeads(leads);

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
  });

  it("uses the lead email as targetId in each decision", async () => {
    setupDbWithLeads([makeLead({ email: "user@example.com" })]);
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions[0].targetId).toBe("user@example.com");
  });

  it("uses 'list signup only' as reason when there are no scoring bonuses", async () => {
    setupDbWithLeads([makeLead({ email: "plain@test.com" })]);
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions[0].reason).toBe("list signup only");
  });
});

// ─── run() — threshold gate in live mode ──────────────────────────────────────

describe("acquisitionAgent.run() — threshold gate (live mode)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("executes and enqueues a drip email for a lead whose confidence >= threshold", async () => {
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95 — well above 0.55
    const leads = [
      makeLead({
        email: "top@test.com",
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Top Bean",
        city: "Austin",
      }),
    ];
    setupDbWithLeads(leads);

    const decisions = await acquisitionAgent.run(makeCtx({ live: true }));
    expect(decisions[0].executed).toBe(true);
    expect(mocks.emailQueueAdd).toHaveBeenCalledOnce();

    const queued = mocks.emailQueueAdd.mock.calls[0][0];
    expect(queued.type).toBe("drip");
    expect(queued.to).toBe("top@test.com");
    expect(queued.subject).toBeTruthy();
  });

  it("does NOT execute for a lead whose confidence is below the threshold", async () => {
    // 0.30 only — below 0.55
    const leads = [makeLead({ email: "cold@test.com" })];
    setupDbWithLeads(leads);

    const decisions = await acquisitionAgent.run(makeCtx({ live: true }));
    expect(decisions[0].executed).toBe(false);
    expect(mocks.emailQueueAdd).not.toHaveBeenCalled();
  });

  it("stamps contacted_at (UPDATE) only for executed leads", async () => {
    const leads = [
      makeLead({ email: "mark@test.com", referrer: "r", vertical: "coffee_shops" }),
    ];
    setupDbWithLeads(leads);

    await acquisitionAgent.run(makeCtx({ live: true }));

    const updateCall = mocks.dbQuery.mock.calls.find(([sql]: [string]) =>
      sql.trim().toUpperCase().startsWith("UPDATE"),
    );
    expect(updateCall).toBeDefined();
    expect(updateCall![1]).toContain("mark@test.com");
  });

  it("respects a custom threshold — skips lead that would pass the default but not a stricter one", async () => {
    // Score: 0.30 + 0.30 = 0.60 — passes default 0.55 but not a 0.70 threshold
    const leads = [makeLead({ email: "mid@test.com", referrer: "r" })];
    setupDbWithLeads(leads);

    const strictCtx = makeCtx({ live: true, config: { threshold: 0.70, maxActionsPerRun: 25, custom: { maxAgeDays: 30 } } });
    const decisions = await acquisitionAgent.run(strictCtx);
    expect(decisions[0].executed).toBe(false);
    expect(mocks.emailQueueAdd).not.toHaveBeenCalled();
  });
});

// ─── agent metadata ───────────────────────────────────────────────────────────

describe("acquisitionAgent metadata", () => {
  it("uses the stable id 'acquisition-agent'", () => {
    expect(acquisitionAgent.id).toBe("acquisition-agent");
  });

  it("defaults to dry-run mode (never live without explicit admin opt-in)", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("has a threshold config with the expected default and valid range", () => {
    const { threshold } = acquisitionAgent.config;
    expect(threshold.default).toBe(0.55);
    expect(threshold.min).toBeGreaterThanOrEqual(0);
    expect(threshold.max).toBeLessThanOrEqual(1);
    expect(threshold.min).toBeLessThan(threshold.default);
    expect(threshold.default).toBeLessThan(threshold.max);
  });

  it("declares a maxAgeDays custom knob with a default of 30", () => {
    const maxAgeDays = acquisitionAgent.config.custom?.maxAgeDays;
    expect(maxAgeDays).toBeDefined();
    expect(maxAgeDays!.default).toBe(30);
    expect(maxAgeDays!.min).toBeGreaterThan(0);
    expect(maxAgeDays!.max).toBeGreaterThan(maxAgeDays!.default);
  });
});
