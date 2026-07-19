import { describe, it, expect, beforeEach, vi } from "vitest";
import type { AgentRunContext } from "../types";

// ─── Mock @/lib/db/connection ──────────────────────────────────────────────────
// vi.hoisted runs before any import so the factory below can reference it.
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => ({
  InMemoryConnection: class InMemoryConnection {},
  // A plain object (not an instanceof InMemoryConnection) causes fetchUncontactedLeads
  // to proceed to the real query path, returning whatever mockQuery resolves to.
  db: { query: mockQuery },
}));

// Import AFTER the mock is registered.
import { acquisitionAgent } from "../acquisition-agent";

// ─── Fixtures ──────────────────────────────────────────────────────────────────

const NOW = "2026-01-15T12:00:00.000Z";
const NOW_MS = new Date(NOW).getTime();
/** 10 days before NOW — well inside the default 30-day maxAgeDays window. */
const FRESH = new Date(NOW_MS - 10 * 86_400_000).toISOString();
/** 45 days before NOW — past the 30-day cold cutoff. */
const AGED = new Date(NOW_MS - 45 * 86_400_000).toISOString();

const BASE_CTX: AgentRunContext = {
  live: false,
  config: { threshold: 0.55, maxActionsPerRun: 25, custom: { maxAgeDays: 30 } },
  now: NOW,
};

/** Build a minimal DB row; all bonuses off and fresh by default. */
function row(overrides: Record<string, unknown> = {}) {
  return {
    email: "test@example.com",
    business_name: null as string | null,
    city: null as string | null,
    vertical: "restaurant",
    referrer: null as string | null,
    created_at: FRESH,
    ...overrides,
  };
}

/** Wire mockQuery to return the given rows on the next SELECT call. */
function queryReturning(...rows: ReturnType<typeof row>[]) {
  mockQuery.mockResolvedValueOnce({ rows, rowCount: rows.length, duration: 0 });
}

beforeEach(() => mockQuery.mockReset());

// ─── scoreLead — weight branches ──────────────────────────────────────────────

describe("scoreLead — weight branches", () => {
  it("base only: anonymous, non-ICP, no city, fresh → 0.30", async () => {
    queryReturning(row());
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBe(0.3);
    expect(d.reason).toBe("list signup only");
  });

  it("+0.30 for non-empty referrer → 0.60", async () => {
    queryReturning(row({ referrer: "partner.com", email: "ref@example.com" }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.6);
    expect(d.reason).toContain("referred");
  });

  it("+0.20 for ICP vertical (coffee_shops) → 0.50", async () => {
    queryReturning(row({ vertical: "coffee_shops" }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.5);
    expect(d.reason).toContain("ICP vertical");
  });

  it("+0.10 for businessName → 0.40", async () => {
    queryReturning(row({ business_name: "Bean & Gone" }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.4);
    expect(d.reason).toContain("named business");
  });

  it("+0.05 for city → 0.35", async () => {
    queryReturning(row({ city: "Austin" }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.35);
    expect(d.reason).toContain("city known");
  });

  it("full profile: referred + ICP + named + city → 0.95", async () => {
    queryReturning(
      row({ referrer: "yelp", vertical: "coffee_shops", business_name: "Bean & Gone", city: "Austin" }),
    );
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.95);
    expect(d.reason).toContain("referred");
    expect(d.reason).toContain("ICP vertical");
    expect(d.reason).toContain("named business");
    expect(d.reason).toContain("city known");
  });

  it("-0.15 penalty when age > maxAgeDays: referred (0.60) - 0.15 = 0.45", async () => {
    queryReturning(row({ referrer: "partner", email: "old@example.com", created_at: AGED }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.45);
    expect(d.reason).toMatch(/aged \d+d/);
  });

  it("aged anonymous: 0.30 - 0.15 = 0.15 (stays above 0, no clamp needed)", async () => {
    queryReturning(row({ created_at: AGED }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.15);
  });

  it("score is always clamped to [0, 1]", async () => {
    queryReturning(
      row({ referrer: "x", vertical: "coffee_shops", business_name: "B", city: "C" }),
    );
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeGreaterThanOrEqual(0);
    expect(d.confidence).toBeLessThanOrEqual(1);
  });

  it("whitespace-only referrer does NOT trigger the +0.30 bonus", async () => {
    queryReturning(row({ referrer: "   " }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.3);
    expect(d.reason).not.toContain("referred");
  });
});

// ─── threshold gate + dry-run contract ────────────────────────────────────────

describe("threshold gate + dry-run contract", () => {
  it("dry-run: executed = false for ALL leads regardless of confidence", async () => {
    queryReturning(
      // confidence 0.95 — well above threshold 0.55
      row({ email: "high@example.com", referrer: "x", vertical: "coffee_shops", business_name: "B", city: "C" }),
      // confidence 0.30 — below threshold
      row({ email: "low@example.com" }),
    );
    const decisions = await acquisitionAgent.run(BASE_CTX);
    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("a lead at exactly the threshold (0.55) would be above it (0.60 referred)", async () => {
    // 0.60 >= 0.55 threshold; in dry-run still executed:false but in live would act
    queryReturning(row({ referrer: "partner", email: "at-thresh@example.com" }));
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.confidence).toBeCloseTo(0.6);
    expect(d.confidence).toBeGreaterThanOrEqual(BASE_CTX.config.threshold);
    expect(d.executed).toBe(false); // dry-run never executes
  });

  it("decisions are sorted highest-confidence first", async () => {
    queryReturning(
      row({ email: "low@example.com" }), // 0.30 — listed first in DB order
      row({ email: "high@example.com", referrer: "x", vertical: "coffee_shops" }), // 0.80
    );
    const decisions = await acquisitionAgent.run(BASE_CTX);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@example.com");
  });

  it("returns an empty array when no leads are available", async () => {
    queryReturning(); // 0 rows
    const decisions = await acquisitionAgent.run(BASE_CTX);
    expect(decisions).toHaveLength(0);
  });

  it("meta captures business context fields", async () => {
    queryReturning(
      row({ vertical: "coffee_shops", city: "Austin", referrer: "ref", email: "meta@example.com" }),
    );
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.meta).toMatchObject({
      vertical: "coffee_shops",
      city: "Austin",
      referred: true,
      businessName: undefined,
    });
    expect(typeof d.meta?.ageDays).toBe("number");
  });

  it("action is always 'send-early-access-invite'", async () => {
    queryReturning(row());
    const [d] = await acquisitionAgent.run(BASE_CTX);
    expect(d.action).toBe("send-early-access-invite");
  });
});
