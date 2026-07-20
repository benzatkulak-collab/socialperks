import { describe, it, expect, vi, beforeEach } from "vitest";

// Must be declared before any imports so vitest hoists them before dynamic
// imports inside fetchUncontactedLeads / markContacted execute.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: vi.fn().mockResolvedValue({ rows: [] }) },
  };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: vi.fn() },
}));

import { acquisitionAgent, scoreLead, type WaitlistLead } from "@/lib/agents/acquisition-agent";
import { db } from "@/lib/db/connection";

// ─── Fixtures ────────────────────────────────────────────────────────────────

// Pinned to 2026-07-20 (today per system context)
const NOW = "2026-07-20T00:00:00Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE = 30;

// Lead ages relative to NOW:
const FRESH = "2026-07-15T00:00:00Z";   // 5 days old
const MID   = "2026-07-01T00:00:00Z";   // 19 days old
const AGED  = "2026-01-01T00:00:00Z";   // ~200 days old

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "retail",
    createdAt: FRESH,
    ...overrides,
  };
}

// Default run context (dry-run, defaults)
const DRY_CTX = {
  live: false,
  config: { threshold: 0.55, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE } },
  now: NOW,
};

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe("scoreLead — base + individual bonuses", () => {
  it("minimal lead scores 0.30 (base only)", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("+0.30 for a non-empty referrer", () => {
    const { confidence, reasons } = scoreLead(makeLead({ referrer: "partner-site" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer is not counted as a referral", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence, reasons } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for a named business", () => {
    const { confidence, reasons } = scoreLead(makeLead({ businessName: "Cafe Uno" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for a city", () => {
    const { confidence, reasons } = scoreLead(makeLead({ city: "NYC" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for an aged lead (age > maxAgeDays)", () => {
    const { confidence, reasons } = scoreLead(makeLead({ createdAt: AGED }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("age exactly at cutoff is NOT penalised (strictly greater-than check)", () => {
    // 30 days ago → ageDays ≈ 30, which is NOT > 30
    const thirtyDaysAgo = new Date(NOW_MS - 30 * 86_400_000).toISOString();
    const { confidence } = scoreLead(makeLead({ createdAt: thirtyDaysAgo }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });
});

describe("scoreLead — combined weight sums", () => {
  it("fully-loaded ICP lead (all bonuses, fresh) scores 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Espresso Bar",
      city: "Seattle",
      createdAt: FRESH,
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
    expect(confidence).toBeCloseTo(0.95);
  });

  it("aged fully-loaded ICP lead scores 0.80 after penalty", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Old Brew",
      city: "Portland",
      createdAt: AGED,
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    // 0.95 − 0.15 = 0.80
    expect(confidence).toBeCloseTo(0.80);
  });

  it("referred non-ICP lead scores 0.60", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "newsletter" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.60);
  });
});

describe("scoreLead — score is clamped to [0, 1]", () => {
  it("score never exceeds 1", () => {
    // Even with all bonuses active, score is capped
    const lead = makeLead({
      referrer: "r",
      vertical: "coffee_shops",
      businessName: "B",
      city: "C",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("score never goes below 0 (extremely aged lead)", () => {
    const veryOld = new Date(0).toISOString(); // 1970
    const { confidence } = scoreLead(makeLead({ createdAt: veryOld }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate at default 0.55", () => {
  const THRESHOLD = 0.55;

  it("bare lead (0.30) is below threshold — would not execute in live mode", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP-only lead (0.50) is below threshold", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred lead (0.60) is above threshold — would execute in live mode", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("referred+ICP lead (0.80) is well above threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ─── run() — dry-run mode ─────────────────────────────────────────────────────

describe("run() in dry-run mode", () => {
  // Two DB rows — one high-confidence, one low-confidence
  const HIGH_CONF_ROW = {
    email: "hot@lead.com",
    business_name: "Espresso Bar",
    city: "Seattle",
    vertical: "coffee_shops",
    referrer: "partner",
    created_at: FRESH,
  };
  const LOW_CONF_ROW = {
    email: "cold@lead.com",
    business_name: null,
    city: null,
    vertical: "retail",
    referrer: null,
    created_at: AGED,
  };

  beforeEach(() => {
    // Reset the mock between tests
    vi.mocked(db.query).mockReset();
    vi.mocked(db.query).mockResolvedValue({ rows: [HIGH_CONF_ROW, LOW_CONF_ROW] });
  });

  it("returns one decision per lead", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    expect(decisions).toHaveLength(2);
  });

  it("all decisions have executed=false in dry-run", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted highest-confidence first", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("decision targetId matches lead email", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    const emails = decisions.map((d) => d.targetId);
    expect(emails).toContain("hot@lead.com");
    expect(emails).toContain("cold@lead.com");
  });

  it("action is 'send-early-access-invite' for all decisions", async () => {
    const decisions = await acquisitionAgent.run(DRY_CTX);
    for (const d of decisions) {
      expect(d.action).toBe("send-early-access-invite");
    }
  });

  it("does not call db.query a second time (markContacted skipped)", async () => {
    await acquisitionAgent.run(DRY_CTX);
    // fetchUncontactedLeads = 1 SELECT; markContacted should NOT be called (dry-run)
    expect(vi.mocked(db.query)).toHaveBeenCalledTimes(1);
  });

  it("returns empty decisions when no leads are available", async () => {
    vi.mocked(db.query).mockResolvedValueOnce({ rows: [] });
    const decisions = await acquisitionAgent.run(DRY_CTX);
    expect(decisions).toHaveLength(0);
  });
});
