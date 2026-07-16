import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoist DB mock so vi.mock factory can reference it ─────────────────────
const { mockDbQuery } = vi.hoisted(() => ({ mockDbQuery: vi.fn() }));

vi.mock("@/lib/db/connection", () => {
  // MockInMemoryConnection is a NEW class — db below is not instanceof it,
  // so fetchUncontactedLeads proceeds past the early-return guard.
  class MockInMemoryConnection {}
  return {
    InMemoryConnection: MockInMemoryConnection,
    db: { query: mockDbQuery },
  };
});

import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// Fixed "now" so age calculations don't drift with calendar time.
const NOW_ISO = "2026-07-16T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55;

function daysAgo(n: number): string {
  return new Date(NOW_MS - n * 86_400_000).toISOString();
}

// ─── scoreLead fixtures ───────────────────────────────────────────────────

const FULLY_LOADED_FRESH: WaitlistLead = {
  email: "full@test.com",
  businessName: "Blue Cup Coffee",
  city: "Austin",
  vertical: "coffee_shops",
  referrer: "partner-x",
  createdAt: daysAgo(5),
  // Expected: 0.30 base + 0.30 referred + 0.20 ICP + 0.10 named + 0.05 city = 0.95
};

const REFERRED_ONLY_FRESH: WaitlistLead = {
  email: "ref@test.com",
  vertical: "restaurants",
  referrer: "partner-y",
  createdAt: daysAgo(5),
  // Expected: 0.30 + 0.30 = 0.60  → above threshold
};

const ICP_ONLY_FRESH: WaitlistLead = {
  email: "icp@test.com",
  vertical: "coffee_shops",
  createdAt: daysAgo(5),
  // Expected: 0.30 + 0.20 = 0.50  → below threshold
};

const BASE_ONLY_FRESH: WaitlistLead = {
  email: "base@test.com",
  vertical: "gyms",
  createdAt: daysAgo(5),
  // Expected: 0.30  → below threshold
};

const REFERRED_AGED: WaitlistLead = {
  email: "aged-ref@test.com",
  vertical: "restaurants",
  referrer: "partner-z",
  createdAt: daysAgo(45),
  // Expected: 0.30 + 0.30 − 0.15 = 0.45  → below threshold
};

const FULLY_LOADED_AGED: WaitlistLead = {
  email: "aged-full@test.com",
  businessName: "Old Grounds",
  city: "Portland",
  vertical: "coffee_shops",
  referrer: "partner-a",
  createdAt: daysAgo(45),
  // Expected: 0.95 − 0.15 = 0.80  → above threshold
};

const WHITESPACE_REFERRER: WaitlistLead = {
  email: "ws@test.com",
  vertical: "coffee_shops",
  referrer: "   ",
  createdAt: daysAgo(5),
  // trim().length === 0 → no referral bonus
  // Expected: 0.30 + 0.20 = 0.50  → below threshold
};

// ─── Tests ────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("scores the maximum combination: referred + ICP + named + city, fresh", () => {
    const { confidence, reasons } = scoreLead(FULLY_LOADED_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95, 10);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
    expect(reasons).not.toContain(expect.stringMatching(/aged/));
  });

  it("scores referred-only lead above the 0.55 threshold", () => {
    const { confidence, reasons } = scoreLead(REFERRED_ONLY_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60, 10);
    expect(reasons).toContain("referred");
    expect(reasons).not.toContain("ICP vertical");
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("scores ICP-only lead below the 0.55 threshold", () => {
    const { confidence, reasons } = scoreLead(ICP_ONLY_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.50, 10);
    expect(reasons).toContain("ICP vertical");
    expect(reasons).not.toContain("referred");
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("scores a bare-minimum (base only) lead below the threshold", () => {
    const { confidence, reasons } = scoreLead(BASE_ONLY_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 10);
    expect(reasons).toHaveLength(0);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("applies the staleness penalty when age > maxAgeDays", () => {
    const { confidence, reasons } = scoreLead(REFERRED_AGED, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.45, 10);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("a strong lead aged past the cutoff still clears the threshold", () => {
    const { confidence } = scoreLead(FULLY_LOADED_AGED, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.80, 10);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("whitespace-only referrer does not earn the referral bonus", () => {
    const { confidence, reasons } = scoreLead(WHITESPACE_REFERRER, NOW_MS, MAX_AGE_DAYS);
    // Same score as ICP-only: base + ICP, no referral
    expect(confidence).toBeCloseTo(0.50, 10);
    expect(reasons).not.toContain("referred");
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("clamps confidence to [0, 1]", () => {
    // Max possible score is 0.95 (< 1) and min positive score is 0.15 (> 0),
    // so the real clamp range is exercised only at the boundaries.
    const { confidence: hi } = scoreLead(FULLY_LOADED_FRESH, NOW_MS, MAX_AGE_DAYS);
    const { confidence: lo } = scoreLead(BASE_ONLY_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(hi).toBeLessThanOrEqual(1);
    expect(lo).toBeGreaterThanOrEqual(0);
  });

  it("staleness penalty does not apply when lead is exactly at the cutoff (boundary)", () => {
    const exactBoundary: WaitlistLead = {
      email: "boundary@test.com",
      vertical: "gyms",
      createdAt: daysAgo(MAX_AGE_DAYS),
    };
    const { reasons } = scoreLead(exactBoundary, NOW_MS, MAX_AGE_DAYS);
    // age === maxAgeDays → condition is strictly >, so no penalty
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(false);
  });
});

// ─── threshold gate ────────────────────────────────────────────────────────

describe("threshold gate", () => {
  it("a lead at 0.60 clears the default 0.55 threshold", () => {
    const { confidence } = scoreLead(REFERRED_ONLY_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(confidence >= THRESHOLD).toBe(true);
  });

  it("a lead at 0.50 does not clear the default 0.55 threshold", () => {
    const { confidence } = scoreLead(ICP_ONLY_FRESH, NOW_MS, MAX_AGE_DAYS);
    expect(confidence >= THRESHOLD).toBe(false);
  });
});

// ─── run() dry-run invariant ──────────────────────────────────────────────

describe("acquisitionAgent.run() in dry-run mode", () => {
  beforeEach(() => {
    mockDbQuery.mockResolvedValue({
      rows: [
        // Row above threshold (referred + ICP)
        {
          email: "a@example.com",
          business_name: "Drip Coffee",
          city: "Seattle",
          vertical: "coffee_shops",
          referrer: "partner-q",
          created_at: daysAgo(5),
        },
        // Row below threshold (base only)
        {
          email: "b@example.com",
          business_name: null,
          city: null,
          vertical: "gyms",
          referrer: null,
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 0,
    });
  });

  const dryRunCtx: AgentRunContext = {
    live: false,
    now: NOW_ISO,
    config: {
      threshold: THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
  };

  it("returns a decision for every scanned lead", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions).toHaveLength(2);
  });

  it("marks every decision as NOT executed in dry-run", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions.every((d) => d.executed === false)).toBe(true);
  });

  it("sorts decisions highest-confidence-first", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
  });

  it("attaches correct targetId (email) and action to each decision", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx);
    const emails = new Set(decisions.map((d) => d.targetId));
    expect(emails.has("a@example.com")).toBe(true);
    expect(emails.has("b@example.com")).toBe(true);
    expect(decisions.every((d) => d.action === "send-early-access-invite")).toBe(true);
  });
});
