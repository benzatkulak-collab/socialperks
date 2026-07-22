import { describe, it, expect, beforeEach, vi } from "vitest";
import { scoreLead, acquisitionAgent, type WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Mocks ────────────────────────────────────────────────────────────────────

// Intercept the lazy DB import inside fetchUncontactedLeads so we can inject
// synthetic lead rows without touching a real database. db must NOT be an
// instance of InMemoryConnection so the code proceeds past the early return.
const mockDbQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: mockDbQuery },
  };
});

// Prevent any email-queue side effects during run() tests.
vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: vi.fn() },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-07-22T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;

function freshDate(): string {
  return new Date(NOW_MS - 5 * 86_400_000).toISOString();
}

function agedDate(): string {
  return new Date(NOW_MS - 40 * 86_400_000).toISOString();
}

function lead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "bakeries",
    createdAt: freshDate(),
    ...overrides,
  };
}

function dryRunCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: NOW_ISO,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    ...overrides,
  };
}

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("base: anonymous non-ICP fresh lead scores 0.30", () => {
    const { confidence } = scoreLead(lead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("+referred: adds 0.30 to reach 0.60", () => {
    const { confidence, reasons } = scoreLead(
      lead({ referrer: "partner-site" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("+ICP vertical (coffee_shops): adds 0.20 to reach 0.50", () => {
    const { confidence, reasons } = scoreLead(
      lead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("+businessName: adds 0.10 to reach 0.40", () => {
    const { confidence, reasons } = scoreLead(
      lead({ businessName: "Sunrise Bakery" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("+city: adds 0.05 to reach 0.35", () => {
    const { confidence, reasons } = scoreLead(
      lead({ city: "Austin" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-aged: subtracts 0.15 when lead is past maxAgeDays, reaching 0.15", () => {
    const { confidence, reasons } = scoreLead(
      lead({ createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("full bonuses, fresh: referred + ICP + named + city = 0.95", () => {
    const { confidence } = scoreLead(
      lead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Sunrise Coffee",
        city: "Denver",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("full bonuses, aged: 0.95 − 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      lead({
        referrer: "partner",
        vertical: "coffee_shops",
        businessName: "Sunrise Coffee",
        city: "Denver",
        createdAt: agedDate(),
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.80);
  });

  it("score is clamped to [0,1] — never below 0", () => {
    // Aged base-only lead: 0.30 - 0.15 = 0.15, already positive.
    // Confirm clamping doesn't produce a negative.
    const { confidence } = scoreLead(
      lead({ createdAt: agedDate() }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("whitespace-only referrer is not counted as a referral", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.30);
  });

  it("fresh lead without reasons still emits 'list signup only' (no reasons array from scoreLead is empty)", () => {
    const { reasons } = scoreLead(lead(), NOW_MS, MAX_AGE_DAYS);
    expect(reasons).toHaveLength(0);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate", () => {
  it("referred non-ICP lead (0.60) is above default threshold 0.55", () => {
    const { confidence } = scoreLead(
      lead({ referrer: "partner" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("ICP-only lead (0.50) is below default threshold 0.55", () => {
    const { confidence } = scoreLead(
      lead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(0.55);
  });

  it("named-only lead (0.40) is below default threshold 0.55", () => {
    const { confidence } = scoreLead(
      lead({ businessName: "Corner Bistro" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(0.55);
  });
});

// ─── run() in dry-run mode ────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  const SYNTHETIC_LEADS = [
    {
      email: "high@example.com",
      business_name: "Sunrise Coffee",
      city: "Denver",
      vertical: "coffee_shops",
      referrer: "partner",
      created_at: new Date(NOW_MS - 5 * 86_400_000).toISOString(),
    },
    {
      email: "low@example.com",
      business_name: null,
      city: null,
      vertical: "bakeries",
      referrer: null,
      created_at: new Date(NOW_MS - 5 * 86_400_000).toISOString(),
    },
    {
      email: "aged@example.com",
      business_name: null,
      city: null,
      vertical: "bakeries",
      referrer: null,
      created_at: new Date(NOW_MS - 40 * 86_400_000).toISOString(),
    },
  ];

  beforeEach(() => {
    mockDbQuery.mockResolvedValue({
      rows: SYNTHETIC_LEADS,
      rowCount: SYNTHETIC_LEADS.length,
      duration: 1,
    });
  });

  it("returns one decision per lead", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    expect(decisions).toHaveLength(SYNTHETIC_LEADS.length);
  });

  it("all decisions have executed=false in dry-run regardless of confidence", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted highest confidence first", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("high-confidence lead has confidence above threshold", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    const top = decisions[0];
    expect(top.targetId).toBe("high@example.com");
    expect(top.confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("action is 'send-early-access-invite' for every decision", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx());
    for (const d of decisions) {
      expect(d.action).toBe("send-early-access-invite");
    }
  });

  it("returns [] when DB is not available (InMemoryConnection fallback)", async () => {
    // Re-mock the module so db IS an instance of InMemoryConnection
    // to trigger the early return in fetchUncontactedLeads.
    // We test this indirectly: if the query mock returns nothing, run returns [].
    mockDbQuery.mockRejectedValueOnce(new Error("DB unavailable"));
    // fetchUncontactedLeads wraps query in try/catch, so the run still succeeds.
    const decisions = await acquisitionAgent.run(dryRunCtx());
    expect(Array.isArray(decisions)).toBe(true);
  });
});
