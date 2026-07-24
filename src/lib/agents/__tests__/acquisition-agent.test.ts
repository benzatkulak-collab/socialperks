/**
 * Acquisition Agent — unit tests
 *
 * Validates three invariants:
 *   (a) scoreLead produces correct weighted sums clamped to [0,1]
 *   (b) the threshold gate holds: leads ≥ threshold act in live; below do not
 *   (c) run() in dry-run mode returns executed:false for ALL leads and never
 *       enqueues email, regardless of confidence score
 *
 * DATABASE_URL is not set in CI / isolated cloud runs — fetchUncontactedLeads
 * normally returns []. The run() tests mock @/lib/db/connection so the agent
 * sees synthetic fixture leads without needing a real database.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";
import { db } from "@/lib/db/connection";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockEmailAdd = vi.fn();

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mockEmailAdd },
}));

// Replace the DB module so fetchUncontactedLeads sees synthetic rows instead of
// returning [] (InMemoryConnection guard). The `db` object is NOT an instance
// of the mocked InMemoryConnection class, so the guard is bypassed and
// db.query() is called — which we configure per-test below.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: vi.fn() } };
});

// ── Constants ─────────────────────────────────────────────────────────────────

/** Stable reference instant — must match the ctx.now we pass to run(). */
const NOW = "2026-07-24T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55;

// ── Helpers ───────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => new Date(NOW_MS - n * 86_400_000).toISOString();

function freshLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return { email: "lead@example.com", vertical: "retail", createdAt: daysAgo(5), ...overrides };
}

/** Map a camelCase WaitlistLead to the snake_case DB row shape. */
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

function makeCtx(live: boolean, threshold = THRESHOLD): AgentRunContext {
  return {
    live,
    now: NOW,
    config: { threshold, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
  };
}

/** Configure the mocked db.query to return specific waitlist rows. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function setupDbRows(...leads: WaitlistLead[]) {
  const rows = leads.map(toDbRow);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (db.query as any).mockResolvedValue({ rows, rowCount: rows.length, duration: 0 });
}

// ── (a) scoreLead — weighted sums ─────────────────────────────────────────────

describe("scoreLead — weighted scoring", () => {
  it("base only (no bonuses, fresh): 0.30", () => {
    const { confidence, reasons } = scoreLead(freshLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toHaveLength(0);
  });

  it("+0.30 for non-empty referrer → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ referrer: "partner-abc" }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("whitespace-only referrer is NOT counted (trim guard) → 0.30", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ referrer: "   " }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).not.toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for businessName → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ businessName: "Brew Corner" }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ city: "Austin" }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("-0.15 for age > maxAgeDays → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      freshLead({ createdAt: daysAgo(45) }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("all bonuses + fresh: 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95", () => {
    const { confidence } = scoreLead(
      freshLead({
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Morning Brew",
        city: "Austin",
      }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("referred + ICP, anonymous, fresh: 0.80", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops", referrer: "partner" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.80);
  });

  it("ICP + named + city, no referral, fresh: 0.65", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops", businessName: "Brew", city: "Austin" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.65);
  });

  it("all bonuses + aged: 0.95 - 0.15 = 0.80", () => {
    const { confidence } = scoreLead(
      freshLead({
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Brew",
        city: "Austin",
        createdAt: daysAgo(45),
      }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.80);
  });

  it("score is clamped to [0, 1] — minimum with current weights (0.30 - 0.15 = 0.15) ≥ 0", () => {
    const { confidence } = scoreLead(
      freshLead({ createdAt: daysAgo(60) }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ── (b) scoreLead — threshold gate ───────────────────────────────────────────

describe("scoreLead — threshold gate (default 0.55)", () => {
  it("base only (0.30) is BELOW threshold — would NOT act", () => {
    const { confidence } = scoreLead(freshLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP only (0.50) is BELOW threshold — would NOT act", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP + city (0.55) sits exactly AT threshold — gate is >=, WOULD act", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops", city: "Austin" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    // 0.30 + 0.20 + 0.05 = 0.55
    expect(confidence).toBeCloseTo(0.55);
    expect(confidence >= THRESHOLD).toBe(true);
  });

  it("referred non-ICP (0.60) is ABOVE threshold — would act", () => {
    const { confidence } = scoreLead(
      freshLead({ referrer: "partner" }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence >= THRESHOLD).toBe(true);
  });

  it("ICP + named + city (0.65) is ABOVE threshold — would act", () => {
    const { confidence } = scoreLead(
      freshLead({ vertical: "coffee_shops", businessName: "Brew", city: "Austin" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence >= THRESHOLD).toBe(true);
  });

  it("base only aged (0.15) is well BELOW threshold — would NOT act", () => {
    const { confidence } = scoreLead(
      freshLead({ createdAt: daysAgo(45) }), NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ── (c) run() — dry-run guarantee ────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run (live=false)", () => {
  const HIGH = freshLead({
    email: "high@example.com",
    vertical: "coffee_shops",
    referrer: "partner",
    businessName: "Morning Brew",
    city: "Austin",
  }); // score = 0.95

  const LOW = freshLead({ email: "low@example.com" }); // score = 0.30

  beforeEach(() => {
    vi.clearAllMocks();
    setupDbRows(HIGH, LOW);
  });

  it("returns a decision for each fetched lead", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(2);
  });

  it("every decision has executed:false in dry-run, regardless of confidence", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("never calls emailQueue.add in dry-run", async () => {
    await acquisitionAgent.run(makeCtx(false));
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("decisions are sorted by confidence descending", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("each decision has the required AgentDecision fields", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    for (const d of decisions) {
      expect(typeof d.targetId).toBe("string");
      expect(d.targetId).toBeTruthy();
      expect(d.action).toBe("send-early-access-invite");
      expect(d.confidence).toBeGreaterThanOrEqual(0);
      expect(d.confidence).toBeLessThanOrEqual(1);
      expect(typeof d.reason).toBe("string");
      expect(d.meta).toBeDefined();
    }
  });

  it("high-scoring lead (0.95) is at the top of decisions and correctly scored", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    const high = decisions.find((d) => d.targetId === "high@example.com");
    expect(high).toBeDefined();
    expect(high!.confidence).toBeCloseTo(0.95);
    expect(high!.confidence >= THRESHOLD).toBe(true); // would act in live
    expect(high!.executed).toBe(false);               // but NOT in dry-run
  });

  it("low-scoring lead (0.30) is below threshold and not executed", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(false));
    const low = decisions.find((d) => d.targetId === "low@example.com");
    expect(low).toBeDefined();
    expect(low!.confidence).toBeCloseTo(0.30);
    expect(low!.confidence < THRESHOLD).toBe(true);
    expect(low!.executed).toBe(false);
  });

  it("returns empty array when no leads are available (no-DB posture)", async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (db.query as any).mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toHaveLength(0);
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });
});

// ── live mode — threshold gate enforcement ────────────────────────────────────
//
// Validates that the threshold gate works correctly: above-threshold leads are
// executed in live mode while below-threshold leads are skipped.

describe("acquisitionAgent.run() — live mode gate (live=true)", () => {
  const HIGH = freshLead({
    email: "high@example.com",
    vertical: "coffee_shops",
    referrer: "partner",
    businessName: "Morning Brew",
    city: "Austin",
  }); // score = 0.95 → above 0.55

  const LOW = freshLead({ email: "low@example.com" }); // score = 0.30 → below 0.55

  beforeEach(() => {
    vi.clearAllMocks();
    setupDbRows(HIGH, LOW);
  });

  it("above-threshold lead is executed in live mode", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(true));
    const high = decisions.find((d) => d.targetId === "high@example.com");
    expect(high).toBeDefined();
    expect(high!.executed).toBe(true);
  });

  it("below-threshold lead is NOT executed even in live mode", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(true));
    const low = decisions.find((d) => d.targetId === "low@example.com");
    expect(low).toBeDefined();
    expect(low!.executed).toBe(false);
  });

  it("emailQueue.add is called once for each executed lead", async () => {
    await acquisitionAgent.run(makeCtx(true));
    // Only HIGH passes the threshold
    expect(mockEmailAdd).toHaveBeenCalledTimes(1);
    expect(mockEmailAdd).toHaveBeenCalledWith(
      expect.objectContaining({ to: "high@example.com" }),
    );
  });

  it("raising the threshold above all scores produces no executions", async () => {
    const decisions = await acquisitionAgent.run(makeCtx(true, 0.99));
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
    expect(mockEmailAdd).not.toHaveBeenCalled();
  });
});
