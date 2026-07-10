import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ── Hoist mocks so they're available in vi.mock factories ────────────────────

const { mockQuery, mockEmailAdd } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEmailAdd: vi.fn(),
}));

// Make fetchUncontactedLeads reach the DB query branch (not InMemoryConnection
// short-circuit) by providing a non-InMemoryConnection db with a query fn.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: (...args: unknown[]) => mockQuery(...args) },
  };
});

// Capture any email enqueues so dry-run tests can assert none fire.
vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: (...args: unknown[]) => mockEmailAdd(...args) },
}));

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = new Date("2026-07-10T12:00:00Z");
const NOW_MS = NOW.getTime();
const MAX_AGE_DAYS = 30;
const DEFAULT_THRESHOLD = 0.55;

// 5 days ago — fresh (< 30 days)
const FRESH = new Date(NOW_MS - 5 * 86_400_000).toISOString();
// 70 days ago — aged (> 30 days)
const AGED = new Date(NOW_MS - 70 * 86_400_000).toISOString();

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "restaurants", // non-ICP by default
    createdAt: FRESH,
    ...overrides,
  };
}

function toDbRow(lead: WaitlistLead) {
  return {
    email: lead.email,
    business_name: lead.businessName ?? null,
    city: lead.city ?? null,
    vertical: lead.vertical,
    referrer: lead.referrer ?? null,
    created_at: lead.createdAt,
  };
}

function makeCtx(live: boolean): AgentRunContext {
  return {
    live,
    now: NOW.toISOString(),
    config: {
      threshold: DEFAULT_THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
  };
}

function seedLeads(leads: WaitlistLead[]) {
  mockQuery.mockResolvedValueOnce({ rows: leads.map(toDbRow) });
}

// ── scoreLead — weight coverage ───────────────────────────────────────────────

describe("scoreLead — scoring weights", () => {
  it("base score is 0.30 for anonymous, non-ICP, fresh lead", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.3);
  });

  it("+0.30 for referrer → total 0.60", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner.com" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
  });

  it("+0.20 for ICP vertical (coffee_shops) → total 0.50", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
  });

  it("+0.10 for businessName → total 0.40", () => {
    const { confidence } = scoreLead(
      makeLead({ businessName: "Bean & Brew" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
  });

  it("+0.05 for city → total 0.35", () => {
    const { confidence } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
  });

  it("-0.15 for aged lead (> maxAgeDays) → total 0.15", () => {
    const { confidence } = scoreLead(
      makeLead({ createdAt: AGED }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
  });

  it("full bonus stack: referred + ICP + named + city → 0.95", () => {
    const lead = makeLead({
      referrer: "partner.com",
      vertical: "coffee_shops",
      businessName: "The Daily Grind",
      city: "Portland",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95);
  });

  it("full bonus + aged → 0.80 (well above threshold despite age)", () => {
    const lead = makeLead({
      referrer: "partner.com",
      vertical: "coffee_shops",
      businessName: "The Daily Grind",
      city: "Portland",
      createdAt: AGED,
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.8);
  });

  it("confidence is always in [0, 1]", () => {
    const cases: WaitlistLead[] = [
      makeLead(),
      makeLead({ referrer: "p", vertical: "coffee_shops", businessName: "X", city: "Y" }),
      makeLead({ createdAt: AGED }),
    ];
    for (const lead of cases) {
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });

  it("whitespace-only referrer does not count as a referral", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3);
  });

  it("reason labels match every applied bonus", () => {
    const lead = makeLead({
      referrer: "partner.com",
      vertical: "coffee_shops",
      businessName: "Grind",
      city: "NYC",
    });
    const { reasons } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("aged lead includes an 'aged Nd' reason label", () => {
    const { reasons } = scoreLead(
      makeLead({ createdAt: AGED }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fresh lead has no age penalty reason", () => {
    const { reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(false);
  });
});

// ── Threshold gate ────────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("referred lead (0.60) clears the gate — would be acted on in live", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner.com" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("ICP-only fresh lead (0.50) is below gate — would NOT act in live", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("base anonymous lead (0.30) is below gate", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("full-bonus lead (0.95) is clearly above gate", () => {
    const lead = makeLead({
      referrer: "p",
      vertical: "coffee_shops",
      businessName: "B",
      city: "C",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });
});

// ── run() — dry-run guarantees ────────────────────────────────────────────────

describe("acquisitionAgent.run — dry-run (live=false)", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEmailAdd.mockReset();
  });

  it("returns empty decisions when no leads exist", async () => {
    seedLeads([]);
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(0);
  });

  it("returns executed:false for ALL decisions — never acts in dry-run", async () => {
    const leads = [
      // above threshold (0.60)
      makeLead({ email: "hot@test.com", referrer: "partner" }),
      // below threshold (0.30)
      makeLead({ email: "cold@test.com" }),
    ];
    seedLeads(leads);
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("does NOT enqueue any emails in dry-run even for high-confidence leads", async () => {
    const leads = [
      // 0.95 — well above threshold
      makeLead({
        email: "vip@test.com",
        referrer: "vip-partner.com",
        vertical: "coffee_shops",
        businessName: "Top Brew",
        city: "Denver",
      }),
    ];
    seedLeads(leads);
    await acquisitionAgent.run(makeCtx(false));
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("decisions are sorted highest-confidence first", async () => {
    const leads = [
      makeLead({ email: "low@t.com" }), // 0.30
      makeLead({
        email: "high@t.com",
        referrer: "p",
        vertical: "coffee_shops",
        businessName: "B",
        city: "SF",
      }), // 0.95
    ];
    seedLeads(leads);
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(2);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
  });

  it("decision metadata reflects lead fields correctly", async () => {
    const lead = makeLead({
      email: "meta@t.com",
      businessName: "Biz",
      city: "LA",
      referrer: "ref",
      vertical: "coffee_shops",
    });
    seedLeads([lead]);
    const [d] = await acquisitionAgent.run(makeCtx(false));
    expect(d.targetId).toBe("meta@t.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.meta?.businessName).toBe("Biz");
    expect(d.meta?.city).toBe("LA");
    expect(d.meta?.referred).toBe(true);
    expect(d.meta?.vertical).toBe("coffee_shops");
  });

  it("anonymous lead reason is 'list signup only'", async () => {
    seedLeads([makeLead({ email: "anon@t.com" })]);
    const [d] = await acquisitionAgent.run(makeCtx(false));
    expect(d.reason).toBe("list signup only");
  });
});
