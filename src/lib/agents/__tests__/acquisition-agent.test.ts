import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── DB mock ────────────────────────────────────────────────────────────────
// fetchUncontactedLeads does a dynamic import of @/lib/db/connection and
// checks `db instanceof InMemoryConnection`. Make db a plain object so the
// check is false and db.query is called; control the return value per-test.

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockQuery } };
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const NOW_ISO = "2026-07-04T12:00:00Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const FRESH_DATE = new Date(NOW_MS - 10 * 86_400_000).toISOString(); // 10d ago
const AGED_DATE = new Date(NOW_MS - 40 * 86_400_000).toISOString(); // 40d ago > default 30d cutoff

const DEFAULT_MAX_AGE = 30;
const DEFAULT_THRESHOLD = 0.55;

type LeadShape = {
  email?: string;
  businessName?: string;
  city?: string;
  vertical?: string;
  referrer?: string;
  createdAt?: string;
};

function freshLead(overrides: LeadShape = {}) {
  return {
    email: "test@example.com",
    vertical: "bakery",
    createdAt: FRESH_DATE,
    ...overrides,
  };
}

function agedLead(overrides: LeadShape = {}) {
  return freshLead({ createdAt: AGED_DATE, ...overrides });
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    config: {
      threshold: DEFAULT_THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: DEFAULT_MAX_AGE },
    },
    now: NOW_ISO,
    ...overrides,
  };
}

// Convert a lead object to the DB row shape that fetchUncontactedLeads maps.
function toDbRow(lead: ReturnType<typeof freshLead>) {
  return {
    email: lead.email,
    business_name: ("businessName" in lead ? lead.businessName : undefined) ?? null,
    city: ("city" in lead ? lead.city : undefined) ?? null,
    vertical: lead.vertical,
    referrer: ("referrer" in lead ? lead.referrer : undefined) ?? null,
    created_at: lead.createdAt,
  };
}

function mockLeads(leads: ReturnType<typeof freshLead>[]) {
  mockQuery.mockResolvedValueOnce({
    rows: leads.map(toDbRow),
    rowCount: leads.length,
    duration: 1,
  });
}

// ─── scoreLead unit tests ────────────────────────────────────────────────────

describe("scoreLead — weighted sums", () => {
  it("base only: 0.30 for a minimal fresh signup", () => {
    const { confidence, reasons } = scoreLead(freshLead(), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toEqual(["list signup only".slice(0, 0)].slice(0, 0)); // reasons is empty for base-only
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for a referral: 0.60", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ referrer: "partner@site.com" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops): 0.50", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for named business: 0.40", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ businessName: "Acme Café" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city known: 0.35", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ city: "Austin" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("all positive signals (referred + ICP + name + city, fresh): 0.95", () => {
    const { confidence } = scoreLead(
      freshLead({
        referrer: "p",
        vertical: "coffee_shops",
        businessName: "Peak Brew",
        city: "Portland",
      }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("-0.15 for aged lead (40d > 30d default cutoff): 0.15", () => {
    const { confidence, reasons } = scoreLead(agedLead(), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("referred + aged: 0.45 (0.30 + 0.30 - 0.15)", () => {
    const { confidence } = scoreLead(
      agedLead({ referrer: "r" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.45);
  });

  it("ICP + aged: 0.35 (0.30 + 0.20 - 0.15)", () => {
    const { confidence } = scoreLead(
      agedLead({ vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
  });

  it("referred + ICP + aged: 0.65 (survives the cold penalty)", () => {
    const { confidence } = scoreLead(
      agedLead({ referrer: "r", vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.65);
  });

  it("whitespace-only referrer is not counted", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ referrer: "   " }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("confidence is always in [0, 1]", () => {
    const cases = [
      freshLead(),
      freshLead({ referrer: "r", vertical: "coffee_shops", businessName: "B", city: "C" }),
      agedLead(),
      agedLead({ referrer: "r", vertical: "coffee_shops", businessName: "B", city: "C" }),
    ];
    for (const lead of cases) {
      const { confidence } = scoreLead(lead, NOW_MS, DEFAULT_MAX_AGE);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ─── Threshold gate ──────────────────────────────────────────────────────────

describe("scoreLead — threshold gate (default 0.55)", () => {
  it("referred fresh lead (0.60) is at or above threshold → would fire in live", () => {
    const { confidence } = scoreLead(
      freshLead({ referrer: "partner" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });

  it("ICP-only fresh lead (0.50) is below threshold → would not fire in live", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("minimal fresh lead (0.30) is below threshold", () => {
    const { confidence } = scoreLead(freshLead(), NOW_MS, DEFAULT_MAX_AGE);
    expect(confidence).toBeLessThan(DEFAULT_THRESHOLD);
  });

  it("referred + ICP + aged (0.65) clears threshold despite cold penalty", () => {
    const { confidence } = scoreLead(
      agedLead({ referrer: "r", vertical: "coffee_shops" }),
      NOW_MS,
      DEFAULT_MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(DEFAULT_THRESHOLD);
  });
});

// ─── run() dry-run ───────────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("sets executed:false on every decision when ctx.live=false", async () => {
    const leads = [
      freshLead({ email: "a@test.com", referrer: "p", vertical: "coffee_shops", businessName: "Brew A", city: "NYC" }),
      freshLead({ email: "b@test.com", vertical: "bakery" }),
      freshLead({ email: "c@test.com" }),
    ];
    mockLeads(leads);

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions).toHaveLength(3);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("returns empty decisions when no leads exist (no-DB posture)", async () => {
    mockQuery.mockRejectedValueOnce(new Error("simulated no-db"));

    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
  });

  it("decisions are sorted highest-confidence first", async () => {
    const leads = [
      freshLead({ email: "low@test.com", vertical: "bakery" }),           // 0.30
      freshLead({ email: "high@test.com", referrer: "r", vertical: "coffee_shops", businessName: "B", city: "C" }), // 0.95
      freshLead({ email: "mid@test.com", referrer: "r" }),                 // 0.60
    ];
    mockLeads(leads);

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions[0].targetId).toBe("high@test.com");
    expect(decisions[1].targetId).toBe("mid@test.com");
    expect(decisions[2].targetId).toBe("low@test.com");
  });

  it("decisions carry correct meta fields", async () => {
    mockLeads([
      freshLead({ email: "meta@test.com", referrer: "p", vertical: "coffee_shops", businessName: "Meta Brew", city: "LA" }),
    ]);

    const [d] = await acquisitionAgent.run(makeCtx());

    expect(d.targetId).toBe("meta@test.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.meta?.referred).toBe(true);
    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.businessName).toBe("Meta Brew");
    expect(d.meta?.city).toBe("LA");
    expect(typeof d.meta?.ageDays).toBe("number");
  });

  it("reason string is 'list signup only' for a lead with no scoring signals", async () => {
    mockLeads([freshLead({ email: "plain@test.com" })]);

    const [d] = await acquisitionAgent.run(makeCtx());

    expect(d.reason).toBe("list signup only");
  });
});
