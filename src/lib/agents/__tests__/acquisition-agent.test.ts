/**
 * Unit tests for the Acquisition Agent.
 *
 * Environment: DATABASE_URL is NOT set in CI/dev — fetchUncontactedLeads
 * falls back to [] via InMemoryConnection. We stub the DB module with a
 * controllable query mock so run() tests can inject synthetic leads while
 * scoreLead tests remain pure (no mocking required).
 */

import { describe, it, expect, vi } from "vitest";
import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";

// ── DB stub ─────────────────────────────────────────────────────────────────
// A plain object (not instanceof InMemoryConnection) passes the DB guard in
// fetchUncontactedLeads and lets us control what db.query() returns per test.

const mockDbQuery = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ rows: [], rowCount: 0, duration: 0 }),
);

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockDbQuery } };
});

// ── Fixtures ─────────────────────────────────────────────────────────────────

const NOW_MS = Date.now();
const FRESH_ISO = new Date(NOW_MS - 5 * 86_400_000).toISOString();  // 5d old — below cutoff
const AGED_ISO = new Date(NOW_MS - 35 * 86_400_000).toISOString();  // 35d old — above 30d cutoff

function makeLead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return {
    email: "test@example.com",
    vertical: "salons",       // non-ICP by default
    createdAt: FRESH_ISO,
    ...overrides,
  };
}

const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55;      // agent's default threshold

// ── scoreLead — individual weight contributions ───────────────────────────

describe("scoreLead — individual weights", () => {
  it("bare signup → base score 0.30, no reasons", () => {
    const { confidence, reasons } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toEqual([]);
  });

  it("referred lead → +0.30 (total 0.60)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ referrer: "partner-page" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("ICP vertical (coffee_shops) → +0.20 (total 0.50)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("named business → +0.10 (total 0.40)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ businessName: "Brews & Co" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("city provided → +0.05 (total 0.35)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ city: "Portland" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("aged lead (>30d) → −0.15 (total 0.15)", () => {
    const { confidence, reasons } = scoreLead(
      makeLead({ createdAt: AGED_ISO }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });
});

// ── scoreLead — combined scores ───────────────────────────────────────────

describe("scoreLead — combined scores", () => {
  it("referred + ICP + named + city (fresh) → 0.95", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "friend",
        vertical: "coffee_shops",
        businessName: "Good Brew",
        city: "Austin",
      }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95);
  });

  it("referred + ICP + named + city (aged) → 0.80", () => {
    const { confidence } = scoreLead(
      makeLead({
        referrer: "friend",
        vertical: "coffee_shops",
        businessName: "Good Brew",
        city: "Austin",
        createdAt: AGED_ISO,
      }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.80);
  });
});

// ── scoreLead — edge cases ────────────────────────────────────────────────

describe("scoreLead — edge cases", () => {
  it("whitespace-only referrer earns no referral bonus", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "   " }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.30);
  });

  it("confidence is always in [0, 1] regardless of inputs", () => {
    const cases: WaitlistLead[] = [
      makeLead(),
      makeLead({ createdAt: AGED_ISO }),
      makeLead({ referrer: "p", vertical: "coffee_shops", businessName: "B", city: "C" }),
      makeLead({ referrer: "p", vertical: "coffee_shops", businessName: "B", city: "C", createdAt: AGED_ISO }),
    ];
    for (const lead of cases) {
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });
});

// ── threshold gate (default 0.55) ────────────────────────────────────────

describe("scoreLead — threshold gate", () => {
  it("bare lead (0.30) is below threshold — would NOT act", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP-only lead (0.50) is below threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("referred lead (0.60) clears threshold — would act in live mode", () => {
    const { confidence } = scoreLead(
      makeLead({ referrer: "partner" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP + named business (0.60) clears threshold", () => {
    const { confidence } = scoreLead(
      makeLead({ vertical: "coffee_shops", businessName: "Brew" }),
      NOW_MS, MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.60);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ── acquisitionAgent — metadata ───────────────────────────────────────────

describe("acquisitionAgent — metadata", () => {
  it("default mode is dry-run", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("threshold default is 0.55", () => {
    expect(acquisitionAgent.config.threshold.default).toBe(0.55);
  });

  it("maxAgeDays default is 30", () => {
    expect(acquisitionAgent.config.custom?.maxAgeDays.default).toBe(30);
  });
});

// ── acquisitionAgent.run() — dry-run guard ───────────────────────────────

describe("acquisitionAgent.run() — dry-run guard", () => {
  const dryCtx = {
    live: false,
    config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
    now: new Date(NOW_MS).toISOString(),
  };

  it("returns [] when DB has no leads", async () => {
    // mockDbQuery defaults to { rows: [] } — no leads to process
    const decisions = await acquisitionAgent.run(dryCtx);
    expect(decisions).toEqual([]);
  });

  it("returns executed:false even when a lead clears the threshold", async () => {
    // Inject a high-confidence lead: referred + ICP + named + city → 0.95 (> 0.55)
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "cafe@example.com",
          business_name: "Good Brew",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: FRESH_ISO,
        },
      ],
      rowCount: 1,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(dryCtx);

    expect(decisions).toHaveLength(1);
    expect(decisions[0].targetId).toBe("cafe@example.com");
    expect(decisions[0].action).toBe("send-early-access-invite");
    expect(decisions[0].confidence).toBeCloseTo(0.95);
    expect(decisions[0].executed).toBe(false);  // dry-run gate holds
  });

  it("decisions are sorted highest-confidence first", async () => {
    // Two leads: referred (0.60) and bare (0.30)
    mockDbQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "bare@example.com",
          business_name: null,
          city: null,
          vertical: "salons",
          referrer: null,
          created_at: FRESH_ISO,
        },
        {
          email: "referred@example.com",
          business_name: null,
          city: null,
          vertical: "salons",
          referrer: "friend",
          created_at: FRESH_ISO,
        },
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(dryCtx);

    expect(decisions).toHaveLength(2);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("referred@example.com");
  });
});
