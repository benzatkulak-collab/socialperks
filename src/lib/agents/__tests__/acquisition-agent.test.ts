import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── DB mock ─────────────────────────────────────────────────────────────────
// We need `db` NOT to be an InMemoryConnection so fetchUncontactedLeads
// exercises the real query path (returning our synthetic rows).
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return {
    InMemoryConnection,
    db: { query: mockQuery },
  };
});

// Prevent the jobs/registry dynamic import from failing in live-mode tests.
const mockEmailAdd = vi.hoisted(() => vi.fn());
vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mockEmailAdd },
}));

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = "2026-07-08T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
const FRESH = new Date(NOW_MS - 5 * 86_400_000).toISOString();   // 5 days old
const AGED  = new Date(NOW_MS - 45 * 86_400_000).toISOString();  // 45 days old

interface WaitlistLead {
  email: string;
  businessName?: string;
  city?: string;
  vertical: string;
  referrer?: string;
  createdAt: string;
}

// Scores: 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
const LEAD_FULL: WaitlistLead = {
  email: "full@example.com",
  businessName: "Hi Coffee",
  city: "Austin",
  vertical: "coffee_shops",
  referrer: "partner-A",
  createdAt: FRESH,
};

// Scores: 0.30 (base only)
const LEAD_BASE: WaitlistLead = {
  email: "base@example.com",
  vertical: "hair_salons",
  createdAt: FRESH,
};

// Scores: 0.30 + 0.30 + 0.20 + 0.10 − 0.15 = 0.75 (no city, 45 d old)
const LEAD_AGED_ICP: WaitlistLead = {
  email: "aged@example.com",
  businessName: "Old Brew",
  vertical: "coffee_shops",
  referrer: "friend",
  createdAt: AGED,
};

// Scores: 0.30 + 0.20 + 0.10 + 0.05 = 0.65 (ICP, named, city — no referral)
const LEAD_ICP_FRESH: WaitlistLead = {
  email: "icp@example.com",
  businessName: "Fresh Roast",
  city: "Denver",
  vertical: "coffee_shops",
  createdAt: FRESH,
};

// Scores: 0.30 − 0.15 = 0.15 (aged, no bonuses)
const LEAD_AGED_BASE: WaitlistLead = {
  email: "cold@example.com",
  vertical: "barbershops",
  createdAt: AGED,
};

// Helper: DB rows format (snake_case from Postgres)
function toDbRow(l: WaitlistLead) {
  return {
    email: l.email,
    business_name: l.businessName ?? null,
    city: l.city ?? null,
    vertical: l.vertical,
    referrer: l.referrer ?? null,
    created_at: l.createdAt,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: NOW,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: 30 },
    },
    ...overrides,
  };
}

// ─── scoreLead — weight arithmetic ───────────────────────────────────────────

describe("scoreLead — weight arithmetic", () => {
  it("full-bonus fresh lead scores 0.95", () => {
    const { confidence, reasons } = scoreLead(LEAD_FULL, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("base-only lead scores exactly 0.30", () => {
    const { confidence } = scoreLead(LEAD_BASE, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("aged ICP with referral and name scores 0.75", () => {
    // 0.30 + 0.30(ref) + 0.20(ICP) + 0.10(name) − 0.15(aged) = 0.75
    const { confidence, reasons } = scoreLead(LEAD_AGED_ICP, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.75);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("ICP lead without referral scores 0.65", () => {
    // 0.30 + 0.20 + 0.10 + 0.05 = 0.65
    const { confidence } = scoreLead(LEAD_ICP_FRESH, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.65);
  });

  it("aged base-only lead scores 0.15", () => {
    // 0.30 − 0.15 = 0.15
    const { confidence } = scoreLead(LEAD_AGED_BASE, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("clamps score to ≥ 0 when penalties would push it negative", () => {
    // Negative score would only be possible with many concurrent penalties, but
    // ensure the clamp works in principle.
    const deeplyAged = new Date(NOW_MS - 9999 * 86_400_000).toISOString();
    const lead: WaitlistLead = { email: "x@x.com", vertical: "other", createdAt: deeplyAged };
    const { confidence } = scoreLead(lead, NOW_MS, 1);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("whitespace-only referrer does NOT grant referral bonus", () => {
    const lead: WaitlistLead = { ...LEAD_BASE, referrer: "   " };
    const { confidence, reasons } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).not.toContain("referred");
  });

  it("empty referrer does NOT grant referral bonus", () => {
    const lead: WaitlistLead = { ...LEAD_BASE, referrer: "" };
    const { confidence } = scoreLead(lead, NOW_MS, 30);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("age is measured against the supplied maxAgeDays, not a hard-coded constant", () => {
    // 45-day-old lead is NOT aged when maxAgeDays = 90
    const { confidence: score90 } = scoreLead(LEAD_AGED_ICP, NOW_MS, 90);
    // 0.30 + 0.30 + 0.20 + 0.10 = 0.90 (no penalty)
    expect(score90).toBeCloseTo(0.90);

    // Same lead IS aged when maxAgeDays = 30
    const { confidence: score30 } = scoreLead(LEAD_AGED_ICP, NOW_MS, 30);
    expect(score30).toBeCloseTo(0.75); // 0.90 − 0.15
  });

  it("score is clamped to ≤ 1", () => {
    // Even with all bonuses, score is at most 1.
    const { confidence } = scoreLead(LEAD_FULL, NOW_MS, 30);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── threshold gate ───────────────────────────────────────────────────────────

describe("scoreLead — threshold gate", () => {
  const THRESHOLD = 0.55;

  it("leads at or above threshold would act in live mode", () => {
    for (const lead of [LEAD_FULL, LEAD_AGED_ICP, LEAD_ICP_FRESH]) {
      const { confidence } = scoreLead(lead, NOW_MS, 30);
      expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
    }
  });

  it("leads below threshold would NOT act in live mode", () => {
    for (const lead of [LEAD_BASE, LEAD_AGED_BASE]) {
      const { confidence } = scoreLead(lead, NOW_MS, 30);
      expect(confidence).toBeLessThan(THRESHOLD);
    }
  });
});

// ─── run() — dry-run mode ─────────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({
      rows: [LEAD_FULL, LEAD_BASE, LEAD_AGED_ICP].map(toDbRow),
      rowCount: 3,
      duration: 1,
    });
    mockEmailAdd.mockClear();
  });

  it("returns executed=false for every lead in dry-run regardless of score", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions.length).toBe(3);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("does NOT enqueue any emails in dry-run", async () => {
    await acquisitionAgent.run(makeCtx({ live: false }));
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("sorts decisions by confidence descending", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("populates meta with expected fields", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    for (const d of decisions) {
      expect(d.meta).toBeDefined();
      expect(typeof (d.meta as Record<string, unknown>).ageDays).toBe("number");
      expect(typeof (d.meta as Record<string, unknown>).vertical).toBe("string");
    }
  });

  it("reason is 'list signup only' for a base-only lead", async () => {
    mockQuery.mockResolvedValue({
      rows: [toDbRow(LEAD_BASE)],
      rowCount: 1,
      duration: 1,
    });
    const [d] = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(d.reason).toBe("list signup only");
  });

  it("returns empty array when no leads are available", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));
    expect(decisions).toEqual([]);
  });
});

// ─── run() — live-mode threshold gate ────────────────────────────────────────

describe("acquisitionAgent.run() — live threshold gate", () => {
  beforeEach(() => {
    mockQuery.mockResolvedValue({
      // LEAD_FULL (0.95 — above threshold) and LEAD_BASE (0.30 — below)
      rows: [LEAD_FULL, LEAD_BASE].map(toDbRow),
      rowCount: 2,
      duration: 1,
    });
    mockEmailAdd.mockClear();
    // markContacted also calls db.query; return a safe stub for the UPDATE
    mockQuery.mockResolvedValueOnce({
      rows: [LEAD_FULL, LEAD_BASE].map(toDbRow),
      rowCount: 2,
      duration: 1,
    });
  });

  it("executes leads above threshold in live mode", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: true }));
    const aboveThreshold = decisions.filter((d) => d.confidence >= 0.55);
    expect(aboveThreshold.every((d) => d.executed)).toBe(true);
  });

  it("does NOT execute leads below threshold in live mode", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: true }));
    const belowThreshold = decisions.filter((d) => d.confidence < 0.55);
    expect(belowThreshold.every((d) => !d.executed)).toBe(true);
  });

  it("enqueues exactly one email per executed lead", async () => {
    const decisions = await acquisitionAgent.run(makeCtx({ live: true }));
    const executedCount = decisions.filter((d) => d.executed).length;
    expect(mockEmailAdd).toHaveBeenCalledTimes(executedCount);
  });
});
