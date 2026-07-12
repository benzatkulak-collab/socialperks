import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";
import { db } from "@/lib/db/connection";

// ─── DB mock ─────────────────────────────────────────────────────────────────
// fetchUncontactedLeads does: const { db, InMemoryConnection } = await import(...)
// then checks `db instanceof InMemoryConnection` — returns [] if true.
// Our mock object is NOT an instance of the mock InMemoryConnection class,
// so the function proceeds to call db.query() which we control per-test.

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  const db = {
    query: vi.fn(),
    transaction: vi.fn(),
    healthCheck: vi.fn(),
    close: vi.fn(),
  };
  return { InMemoryConnection, db };
});

// ─── Constants ────────────────────────────────────────────────────────────────

const NOW_ISO = "2026-07-12T00:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;

// 10 days old — within the maxAgeDays window (fresh)
const FRESH = new Date(NOW_MS - 10 * 86_400_000).toISOString();
// 45 days old — past the maxAgeDays window (aged)
const AGED = new Date(NOW_MS - 45 * 86_400_000).toISOString();

function makeCtx(live = false): AgentRunContext {
  return {
    live,
    now: NOW_ISO,
    config: {
      threshold: 0.55,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
  };
}

// ─── DB-row helpers ───────────────────────────────────────────────────────────

type LeadRow = {
  email: string;
  business_name: string | null;
  city: string | null;
  vertical: string;
  referrer: string | null;
  created_at: string;
};

function leadRow(
  email: string,
  vertical: string,
  opts: { referrer?: string; businessName?: string; city?: string; createdAt?: string } = {},
): LeadRow {
  return {
    email,
    business_name: opts.businessName ?? null,
    city: opts.city ?? null,
    vertical,
    referrer: opts.referrer ?? null,
    created_at: opts.createdAt ?? FRESH,
  };
}

function mockLeads(rows: LeadRow[]) {
  vi.mocked(db.query).mockResolvedValueOnce({
    rows,
    rowCount: rows.length,
    duration: 0,
  });
}

// ─── scoreLead expected values ────────────────────────────────────────────────
//
// Weight table (from acquisition-agent.ts):
//   base                             0.30
//   +referred (referrer non-empty)   0.30
//   +ICP vertical (coffee_shops)     0.20
//   +businessName present            0.10
//   +city present                    0.05
//   −aged (> maxAgeDays days old)    0.15
//   result clamped to [0, 1]
//
// Fixture → expected confidence:
//   fresh, referred + ICP + name + city  → 0.30+0.30+0.20+0.10+0.05 = 0.95
//   fresh, referred only                 → 0.30+0.30               = 0.60
//   fresh, ICP only                      → 0.30+0.20               = 0.50
//   fresh, name + city, non-ICP          → 0.30+0.10+0.05          = 0.45
//   fresh, no bonuses                    → 0.30
//   aged,  referred + ICP                → 0.30+0.30+0.20−0.15     = 0.65
//   aged,  no bonuses                    → 0.30−0.15               = 0.15

describe("acquisitionAgent — scoreLead weights", () => {
  beforeEach(() => vi.mocked(db.query).mockClear());

  it("fresh referred + ICP + name + city → 0.95", async () => {
    mockLeads([
      leadRow("a@t.com", "coffee_shops", {
        referrer: "partner",
        businessName: "Brew Co",
        city: "Denver",
        createdAt: FRESH,
      }),
    ]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.95, 5);
    expect(d.reason).toContain("referred");
    expect(d.reason).toContain("ICP vertical");
  });

  it("fresh referred only → 0.60", async () => {
    mockLeads([leadRow("b@t.com", "restaurants", { referrer: "friend" })]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.6, 5);
  });

  it("fresh ICP only → 0.50", async () => {
    mockLeads([leadRow("c@t.com", "coffee_shops")]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.5, 5);
  });

  it("fresh name + city, non-ICP, no referrer → 0.45", async () => {
    mockLeads([
      leadRow("d@t.com", "bakeries", { businessName: "Sweet Rolls", city: "Austin" }),
    ]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.45, 5);
  });

  it("fresh anonymous non-ICP → 0.30 (base only)", async () => {
    mockLeads([leadRow("e@t.com", "salons")]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.3, 5);
    expect(d.reason).toBe("list signup only");
  });

  it("aged referred + ICP → 0.65 (age penalty applied)", async () => {
    mockLeads([
      leadRow("f@t.com", "coffee_shops", { referrer: "partner", createdAt: AGED }),
    ]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.65, 5);
    expect(d.reason).toMatch(/aged \d+d/);
  });

  it("aged anonymous → 0.15 (penalty without bonuses)", async () => {
    mockLeads([leadRow("g@t.com", "salons", { createdAt: AGED })]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeCloseTo(0.15, 5);
  });

  it("confidence is clamped to [0, 1] even with all bonuses", async () => {
    mockLeads([
      leadRow("h@t.com", "coffee_shops", {
        referrer: "partner",
        businessName: "Max Biz",
        city: "NYC",
        createdAt: FRESH,
      }),
    ]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeLessThanOrEqual(1);
    expect(d.confidence).toBeGreaterThanOrEqual(0);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("acquisitionAgent — threshold gate (default 0.55)", () => {
  beforeEach(() => vi.mocked(db.query).mockClear());

  it("lead at 0.60 (referred, non-ICP) is above the 0.55 gate", async () => {
    mockLeads([leadRow("b@t.com", "restaurants", { referrer: "friend" })]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("lead at 0.50 (ICP only) is below the 0.55 gate", async () => {
    mockLeads([leadRow("c@t.com", "coffee_shops")]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeLessThan(0.55);
  });

  it("lead at 0.45 (name+city, non-ICP) is below the 0.55 gate", async () => {
    mockLeads([leadRow("d@t.com", "bakeries", { businessName: "X", city: "Austin" })]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeLessThan(0.55);
  });

  it("aged referred+ICP at 0.65 remains above the gate", async () => {
    mockLeads([leadRow("f@t.com", "coffee_shops", { referrer: "p", createdAt: AGED })]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.confidence).toBeGreaterThanOrEqual(0.55);
  });
});

// ─── Dry-run invariants ───────────────────────────────────────────────────────

describe("acquisitionAgent — dry-run (ctx.live = false)", () => {
  beforeEach(() => vi.mocked(db.query).mockClear());

  it("all decisions have executed:false regardless of confidence", async () => {
    mockLeads([
      leadRow("a@t.com", "coffee_shops", {
        referrer: "partner",
        businessName: "Brew Co",
        city: "Denver",
      }),                                             // 0.95 — above threshold
      leadRow("b@t.com", "restaurants", { referrer: "friend" }), // 0.60 — above threshold
      leadRow("c@t.com", "coffee_shops"),             // 0.50 — below threshold
      leadRow("e@t.com", "salons"),                   // 0.30 — below threshold
    ]);
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(4);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("each decision carries required AgentDecision fields", async () => {
    mockLeads([
      leadRow("z@t.com", "coffee_shops", {
        referrer: "ref",
        businessName: "Z Biz",
        city: "Boston",
      }),
    ]);
    const [d] = await acquisitionAgent.run(makeCtx());
    expect(d.targetId).toBe("z@t.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(typeof d.confidence).toBe("number");
    expect(typeof d.reason).toBe("string");
    expect(d.executed).toBe(false);
    expect(d.meta).toMatchObject({
      vertical: "coffee_shops",
      referred: true,
      businessName: "Z Biz",
      city: "Boston",
    });
  });

  it("decisions are sorted highest-confidence first", async () => {
    mockLeads([
      leadRow("low@t.com", "salons"),                           // 0.30
      leadRow("high@t.com", "coffee_shops", { referrer: "p" }), // 0.80
      leadRow("mid@t.com", "restaurants", { referrer: "f" }),   // 0.60
    ]);
    const decisions = await acquisitionAgent.run(makeCtx());
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i - 1].confidence).toBeGreaterThanOrEqual(decisions[i].confidence);
    }
  });
});

// ─── No-DB / error posture ────────────────────────────────────────────────────

describe("acquisitionAgent — no-DB posture", () => {
  beforeEach(() => vi.mocked(db.query).mockClear());

  it("returns empty decisions when DB query throws (graceful degradation)", async () => {
    vi.mocked(db.query).mockRejectedValueOnce(new Error("connection refused"));
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });

  it("returns empty decisions when no leads are returned", async () => {
    mockLeads([]);
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });
});

// ─── Agent metadata ───────────────────────────────────────────────────────────

describe("acquisitionAgent — metadata", () => {
  it("defaults to dry-run mode", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("has a threshold config knob", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
    expect(acquisitionAgent.config.threshold.min).toBeGreaterThanOrEqual(0);
    expect(acquisitionAgent.config.threshold.max).toBeLessThanOrEqual(1);
  });

  it("exposes maxAgeDays as a custom config knob", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays).toBeDefined();
    expect(acquisitionAgent.config.custom!.maxAgeDays.default).toBe(30);
  });
});
