/**
 * Acquisition Agent — unit tests
 *
 * Validates scoring weights, threshold gate, and dry-run guarantee against
 * synthetic in-memory WaitlistLead fixtures (DATABASE_URL is not set in CI
 * or this isolated checkout, so fetchUncontactedLeads returns [] by default).
 *
 * The mock* prefix on mockDbQuery is required for vitest's automatic hoisting
 * so the variable is available when the vi.mock factory is registered.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ─── DB mock (must use `mock*` prefix so vitest can hoist it) ────────────────
const mockDbQuery = vi.fn().mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { db: { query: mockDbQuery }, InMemoryConnection };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: vi.fn() },
}));

import { scoreLead, acquisitionAgent } from "@/lib/agents/acquisition-agent";
import type { WaitlistLead } from "@/lib/agents/acquisition-agent";
import type { AgentRunContext } from "@/lib/agents/types";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Pinned to today's date in the codebase context (2026-07-11). */
const NOW_ISO = "2026-07-11T00:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30; // matches agent default
const THRESHOLD = 0.55;  // matches agent default

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): string {
  return new Date(NOW_MS - n * 86_400_000).toISOString();
}

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "retail",
    createdAt: daysAgo(5), // fresh by default
    ...overrides,
  };
}

function makeCtx(overrides: Partial<AgentRunContext> = {}): AgentRunContext {
  return {
    live: false,
    now: NOW_ISO,
    config: {
      threshold: THRESHOLD,
      maxActionsPerRun: 25,
      custom: { maxAgeDays: MAX_AGE_DAYS },
    },
    ...overrides,
  };
}

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe("scoreLead — weight assertions", () => {
  it("base score is 0.30 for a fresh generic lead", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBe(0.3);
    expect(reasons).toEqual([]);
  });

  it("+0.30 for a referred lead → 0.60", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-x" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6);
    expect(reasons).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5);
    expect(reasons).toContain("ICP vertical");
  });

  it("+0.10 for named business → 0.40", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Acme Coffee" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4);
    expect(reasons).toContain("named business");
  });

  it("+0.05 for city known → 0.35", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Denver" }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("full ICP profile (referred + ICP + named + city) reaches 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "partner-x",
        vertical: "coffee_shops",
        businessName: "Drip Coffee Co",
        city: "Denver",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("-0.15 penalty for lead aged past maxAgeDays → 0.15", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: daysAgo(45) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("referred + aged: 0.30 + 0.30 - 0.15 = 0.45", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner", createdAt: daysAgo(45) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.45);
  });

  it("whitespace-only referrer does not count as referral", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3);
    expect(reasons).not.toContain("referred");
  });

  it("score is clamped to [0, 1] (max and min stay in range)", () => {
    const aged = scoreLead(makeLead({ createdAt: daysAgo(45) }), NOW_MS, MAX_AGE_DAYS);
    const full = scoreLead(
      makeLead({
        referrer: "x",
        vertical: "coffee_shops",
        businessName: "A",
        city: "B",
      }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(aged.confidence).toBeGreaterThanOrEqual(0);
    expect(full.confidence).toBeLessThanOrEqual(1);
  });

  it("no penalty when lead is exactly at the age boundary (ageDays === maxAgeDays)", () => {
    const { confidence } = scoreLead(
      makeLead({ createdAt: daysAgo(30) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // ageDays = 30, NOT > 30, so no penalty applied
    expect(confidence).toBeCloseTo(0.3);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("scoreLead — threshold gate (default 0.55)", () => {
  it("referred lead (0.60) clears the threshold → would act in live", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "x" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("bare lead (0.30) does not clear the threshold", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP-only lead (0.50) does not clear the threshold by itself", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred + aged (0.45) does not clear the threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "p", createdAt: daysAgo(45) }),
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── run() — dry-run guarantee ────────────────────────────────────────────────

describe("acquisitionAgent.run() — dry-run (ctx.live=false)", () => {
  beforeEach(() => {
    mockDbQuery.mockReset();
  });

  it("returns [] when the DB returns no uncontacted leads", async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });

  it("all decisions have executed=false even for above-threshold leads", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        // High-confidence lead — would act in live, must not act in dry-run
        {
          email: "hi@coffee.com",
          business_name: "Drip Coffee",
          city: "Denver",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
        // Low-confidence lead
        {
          email: "anon@other.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgo(45),
        },
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx({ live: false }));

    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted by confidence descending", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        // Low: base only
        {
          email: "low@other.com",
          business_name: null,
          city: null,
          vertical: "retail",
          referrer: null,
          created_at: daysAgo(5),
        },
        // High: full ICP profile
        {
          email: "hi@coffee.com",
          business_name: "Drip Coffee",
          city: "Denver",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions.length).toBe(2);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("hi@coffee.com");
  });

  it("decision meta captures vertical, referred flag, and ageDays", async () => {
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "test@coffee.com",
          business_name: "Brew Haus",
          city: null,
          vertical: "coffee_shops",
          referrer: "blog",
          created_at: daysAgo(10),
        },
      ],
      rowCount: 1,
      duration: 0,
    });

    const [d] = await acquisitionAgent.run(makeCtx());

    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.referred).toBe(true);
    expect(typeof d.meta?.ageDays).toBe("number");
    expect(d.action).toBe("send-early-access-invite");
  });

  it("gracefully returns [] when the DB import throws", async () => {
    mockDbQuery.mockRejectedValueOnce(new Error("connection refused"));
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toEqual([]);
  });
});
