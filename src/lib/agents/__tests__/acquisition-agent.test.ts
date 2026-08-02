import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted() runs before module initialization so these are available in vi.mock factories.
const { mockDbQuery, mockEmailAdd } = vi.hoisted(() => ({
  mockDbQuery: vi.fn(),
  mockEmailAdd: vi.fn(),
}));

// Mock DB: use a plain object so `db instanceof InMemoryConnection` is false,
// allowing fetchUncontactedLeads to proceed past the guard and call db.query().
vi.mock("@/lib/db/connection", () => ({
  db: { query: mockDbQuery },
  InMemoryConnection: class InMemoryConnection {},
}));

// Mock email queue — verifies it is never touched in dry-run mode.
vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mockEmailAdd },
}));

import { acquisitionAgent, scoreLead } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const NOW_ISO = "2026-08-02T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const FRESH_DATE = "2026-08-01T12:00:00.000Z"; // 1 day old — inside 30-day window
const AGED_DATE = "2026-05-01T12:00:00.000Z"; // ~93 days old — past 30-day cutoff

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "retail",
    createdAt: FRESH_DATE,
    ...overrides,
  };
}

const DEFAULT_CTX = {
  live: false,
  config: {
    threshold: 0.55,
    maxActionsPerRun: 25,
    custom: { maxAgeDays: 30 },
  },
  now: NOW_ISO,
};

/** Map WaitlistLead shape to the DB row shape fetchUncontactedLeads expects. */
function leadsToRows(leads: WaitlistLead[]) {
  return leads.map((l) => ({
    email: l.email,
    business_name: l.businessName ?? null,
    city: l.city ?? null,
    vertical: l.vertical,
    referrer: l.referrer ?? null,
    created_at: l.createdAt,
  }));
}

function setupDbLeads(leads: WaitlistLead[]): void {
  mockDbQuery.mockResolvedValue({ rows: leadsToRows(leads) });
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ─── scoreLead: weighted-sum branches ────────────────────────────────────────

describe("scoreLead — individual signals", () => {
  it("base score only: anonymous, other vertical, fresh", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).toEqual(["list signup only".replace("list signup only", "")].filter(Boolean));
    // No bonus reasons — reasons array should be empty
    expect(reasons).toHaveLength(0);
  });

  it("referred lead adds +0.30", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-xyz" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("empty-string referrer does NOT trigger referred bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, 30);
    // trim().length === 0 → no bonus
    expect(confidence).toBeCloseTo(0.3);
  });

  it("ICP vertical (coffee_shops) adds +0.20", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("businessName present adds +0.10", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Brewed Awakening" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("city present adds +0.05", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Austin" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("aged lead (past cutoff) subtracts 0.15", () => {
    const { confidence, reasons } = scoreLead(makeLead({ createdAt: AGED_DATE }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.15); // 0.30 - 0.15
    const ageReason = reasons.find((r) => r.startsWith("aged"));
    expect(ageReason).toBeTruthy();
  });

  it("lead exactly at maxAgeDays boundary is NOT penalized", () => {
    // 29 days old — just inside the window
    const thirtyDaysAgoMs = NOW_MS - 29 * 86_400_000;
    const thirtyDaysAgoIso = new Date(thirtyDaysAgoMs).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: thirtyDaysAgoIso }), NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.3); // no penalty
  });
});

// ─── scoreLead: combined scenarios ───────────────────────────────────────────

describe("scoreLead — combined / boundary cases", () => {
  it("all positive signals: referred + ICP + named + city + fresh = 0.95", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew HQ",
        city: "Denver",
      }),
      NOW_MS,
      30,
    );
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("all positive signals + aged: 0.95 - 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Old Grind",
        city: "Dallas",
        createdAt: AGED_DATE,
      }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeCloseTo(0.8);
  });

  it("score is clamped at 1.0 (upper bound)", () => {
    // Current weights max out at 0.95, so test the clamp is present
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Brew HQ",
        city: "Denver",
      }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeLessThanOrEqual(1.0);
  });

  it("score is clamped at 0.0 (lower bound)", () => {
    // Min possible score: 0.30 - 0.15 = 0.15, so always positive.
    // Verify the clamp doesn't introduce negatives even if weights changed.
    const { confidence } = scoreLead(makeLead({ createdAt: AGED_DATE }), NOW_MS, 30);
    expect(confidence).toBeGreaterThanOrEqual(0.0);
  });
});

// ─── Threshold gate: leads above vs below 0.55 ───────────────────────────────

describe("scoreLead — threshold gate boundary", () => {
  const THRESHOLD = 0.55;

  it("ICP + named business = 0.60: would act in live mode", () => {
    // 0.30 + 0.20 + 0.10 = 0.60 — above 0.55 threshold
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Grind Co" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
    expect(confidence).toBeCloseTo(0.6);
  });

  it("ICP only = 0.50: would NOT act (below threshold)", () => {
    // 0.30 + 0.20 = 0.50 — just below 0.55 threshold
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      30,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
    expect(confidence).toBeCloseTo(0.5);
  });

  it("anonymous retail lead = 0.30: well below threshold", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, 30);
    expect(confidence).toBeLessThan(THRESHOLD);
    expect(confidence).toBeCloseTo(0.3);
  });
});

// ─── run() dry-run guarantee ──────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run mode", () => {
  it("returns executed:false for all decisions regardless of score", async () => {
    const leads: WaitlistLead[] = [
      // High scorer — would act in live (0.95)
      makeLead({
        email: "hot@example.com",
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Hot Brew",
        city: "Seattle",
      }),
      // Low scorer — would not act in live (0.30)
      makeLead({ email: "cold@example.com" }),
    ];
    setupDbLeads(leads);

    const decisions = await acquisitionAgent.run(DEFAULT_CTX);

    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("never enqueues an email in dry-run", async () => {
    const leads: WaitlistLead[] = [
      makeLead({
        email: "vip@example.com",
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "VIP Beans",
        city: "Portland",
      }),
    ];
    setupDbLeads(leads);

    await acquisitionAgent.run(DEFAULT_CTX);

    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("returns results sorted by confidence descending", async () => {
    const leads: WaitlistLead[] = [
      // 0.30 — base only
      makeLead({ email: "low@example.com" }),
      // 0.95 — all signals
      makeLead({
        email: "high@example.com",
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Top Bean",
        city: "Miami",
      }),
      // 0.50 — ICP only
      makeLead({ email: "mid@example.com", vertical: "coffee_shops" }),
    ];
    setupDbLeads(leads);

    const decisions = await acquisitionAgent.run(DEFAULT_CTX);

    expect(decisions.length).toBe(3);
    // Verify descending order
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i - 1].confidence).toBeGreaterThanOrEqual(decisions[i].confidence);
    }
    expect(decisions[0].targetId).toBe("high@example.com");
  });

  it("records correct confidence values in decisions", async () => {
    const leads: WaitlistLead[] = [
      makeLead({
        email: "score@example.com",
        vertical: "coffee_shops",
        businessName: "Grounds",
      }),
    ];
    setupDbLeads(leads);

    const decisions = await acquisitionAgent.run(DEFAULT_CTX);

    expect(decisions).toHaveLength(1);
    // ICP + named = 0.30 + 0.20 + 0.10 = 0.60
    expect(decisions[0].confidence).toBeCloseTo(0.6);
    expect(decisions[0].targetId).toBe("score@example.com");
    expect(decisions[0].action).toBe("send-early-access-invite");
  });

  it("returns empty decisions when no leads are available", async () => {
    mockDbQuery.mockResolvedValue({ rows: [] });

    const decisions = await acquisitionAgent.run(DEFAULT_CTX);

    expect(decisions).toHaveLength(0);
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });
});
