/**
 * Unit tests for the Acquisition Agent scoring and dry-run gate.
 *
 * Environment: no DATABASE_URL — the DB mock controls what fetchUncontactedLeads
 * returns so we can exercise the full run() path without a real database.
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { acquisitionAgent, scoreLead, type WaitlistLead } from "../acquisition-agent";

// Fixed "now" keeps age calculations deterministic across runs.
const NOW_ISO = "2025-05-01T00:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55; // default threshold declared in acquisitionAgent.config

// ─── DB mock (lets us inject leads into fetchUncontactedLeads) ──────────────
//
// vi.hoisted ensures mockQuery is defined before vi.mock() runs (vi.mock is
// hoisted to the top of the compiled output, so module-level `const` values
// aren't available to its factory otherwise).
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  // FakeDB is NOT an instanceof the mocked InMemoryConnection, so
  // fetchUncontactedLeads won't short-circuit and will call mockQuery.
  class InMemoryConnection {}
  class FakeDB {
    query = mockQuery;
  }
  return { InMemoryConnection, db: new FakeDB() };
});

// ─── WaitlistLead fixtures ───────────────────────────────────────────────────

const FRESH = "2025-04-25T00:00:00.000Z"; // 6 days before NOW_ISO — well within maxAgeDays

/** All positive signals: referred + ICP vertical + businessName + city, fresh. Expected: 0.95 */
const fullIcpLead: WaitlistLead = {
  email: "full@test.com",
  businessName: "Hot Cup Coffee",
  city: "Austin",
  vertical: "coffee_shops",
  referrer: "partner",
  createdAt: FRESH,
};

/** Referred + non-ICP, no name, no city, fresh. Expected: 0.60 */
const referredNonIcp: WaitlistLead = {
  email: "ref@test.com",
  vertical: "restaurants",
  referrer: "friend",
  createdAt: FRESH,
};

/** ICP vertical + businessName + city, no referral, fresh. Expected: 0.65 */
const icpNamed: WaitlistLead = {
  email: "icp@test.com",
  businessName: "Brew Lab",
  city: "Denver",
  vertical: "coffee_shops",
  createdAt: FRESH,
};

/** No signals at all, fresh. Expected: 0.30 (base only) */
const anonNonIcp: WaitlistLead = {
  email: "anon@test.com",
  vertical: "retail",
  createdAt: FRESH,
};

/** All bonuses but aged 47 days (> maxAgeDays=30). Expected: 0.95 − 0.15 = 0.80 */
const agedFullIcp: WaitlistLead = {
  email: "aged@test.com",
  businessName: "Old Brew",
  city: "Phoenix",
  vertical: "coffee_shops",
  referrer: "partner",
  createdAt: "2025-03-15T00:00:00.000Z", // 47 days before NOW_ISO
};

/** Base only, aged 61 days. Expected: 0.30 − 0.15 = 0.15 */
const agedAnon: WaitlistLead = {
  email: "aged-anon@test.com",
  vertical: "retail",
  createdAt: "2025-03-01T00:00:00.000Z", // 61 days before NOW_ISO
};

/** Referrer is whitespace only — must NOT trigger the +0.30 bonus. Expected: 0.50 (ICP only) */
const whitespaceReferrer: WaitlistLead = {
  email: "ws@test.com",
  vertical: "coffee_shops",
  referrer: "   ",
  createdAt: FRESH,
};

// ─── scoreLead — weight sums ─────────────────────────────────────────────────

describe("scoreLead — weight sums", () => {
  it("full ICP lead scores 0.95 (all bonuses, no penalty)", () => {
    const { confidence, reasons } = scoreLead(fullIcpLead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95, 10);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
    expect(reasons.every((r) => !r.startsWith("aged"))).toBe(true);
  });

  it("referred non-ICP lead scores 0.60", () => {
    const { confidence, reasons } = scoreLead(referredNonIcp, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60, 10);
    expect(reasons).toEqual(["referred"]);
  });

  it("ICP + named + city (no referral) scores 0.65", () => {
    const { confidence, reasons } = scoreLead(icpNamed, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.65, 10);
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
    expect(reasons).not.toContain("referred");
  });

  it("anonymous non-ICP lead scores 0.30 (base only)", () => {
    const { confidence, reasons } = scoreLead(anonNonIcp, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30, 10);
    expect(reasons).toHaveLength(0);
  });

  it("aged full ICP (47 days) applies -0.15 penalty: 0.95 → 0.80", () => {
    const { confidence, reasons } = scoreLead(agedFullIcp, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.80, 10);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("aged minimal lead (61 days, base only) scores 0.15", () => {
    const { confidence } = scoreLead(agedAnon, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15, 10);
  });

  it("whitespace-only referrer does NOT trigger the referred (+0.30) bonus", () => {
    const { confidence, reasons } = scoreLead(whitespaceReferrer, NOW_MS, MAX_AGE_DAYS);
    // ICP only: 0.30 + 0.20 = 0.50
    expect(confidence).toBeCloseTo(0.50, 10);
    expect(reasons).not.toContain("referred");
    expect(reasons).toContain("ICP vertical");
  });

  it("score is never negative (clamped to 0)", () => {
    // Worst case with current weights: 0.30 base − 0.15 age = 0.15 (well above 0)
    // Clamp floor is defensive; verify it holds even for extreme age.
    const veryOld: WaitlistLead = {
      email: "ancient@test.com",
      vertical: "other",
      createdAt: "2020-01-01T00:00:00.000Z",
    };
    const { confidence } = scoreLead(veryOld, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("score never exceeds 1 (clamped to 1)", () => {
    const { confidence } = scoreLead(fullIcpLead, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThanOrEqual(1);
  });
});

// ─── threshold gate ──────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("referred non-ICP (0.60) >= threshold — would act in live mode", () => {
    const { confidence } = scoreLead(referredNonIcp, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("anonymous non-ICP (0.30) < threshold — would be skipped in live mode", () => {
    const { confidence } = scoreLead(anonNonIcp, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("whitespace-referrer ICP-only (0.50) < threshold — would be skipped", () => {
    const { confidence } = scoreLead(whitespaceReferrer, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("aged full ICP (0.80) >= threshold despite age penalty", () => {
    const { confidence } = scoreLead(agedFullIcp, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });
});

// ─── run() in dry-run mode ───────────────────────────────────────────────────

describe("acquisitionAgent.run() in dry-run mode", () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("defaultMode is 'dry-run'", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });

  it("returns [] when no leads exist in the DB", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });

    const decisions = await acquisitionAgent.run({
      live: false,
      config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
      now: NOW_ISO,
    });

    expect(decisions).toHaveLength(0);
  });

  it("all decisions have executed:false regardless of confidence", async () => {
    const rows = [
      // High-confidence lead (would act if ctx.live were true)
      {
        email: "high@test.com",
        business_name: "Brew Lab",
        city: "Austin",
        vertical: "coffee_shops",
        referrer: "partner",
        created_at: FRESH,
      },
      // Low-confidence lead (below threshold)
      {
        email: "low@test.com",
        business_name: null,
        city: null,
        vertical: "retail",
        referrer: null,
        created_at: FRESH,
      },
    ];
    mockQuery.mockResolvedValue({ rows, rowCount: rows.length, duration: 5 });

    const decisions = await acquisitionAgent.run({
      live: false,
      config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
      now: NOW_ISO,
    });

    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted by confidence descending (highest-value leads first)", async () => {
    const rows = [
      // Low score delivered first by DB (ORDER BY created_at ASC)
      {
        email: "low@test.com",
        business_name: null,
        city: null,
        vertical: "retail",
        referrer: null,
        created_at: FRESH,
      },
      // High score delivered second
      {
        email: "high@test.com",
        business_name: "Brew Lab",
        city: "Austin",
        vertical: "coffee_shops",
        referrer: "partner",
        created_at: FRESH,
      },
    ];
    mockQuery.mockResolvedValue({ rows, rowCount: rows.length, duration: 5 });

    const decisions = await acquisitionAgent.run({
      live: false,
      config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
      now: NOW_ISO,
    });

    expect(decisions.length).toBe(2);
    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@test.com");
  });

  it("low-confidence lead gets reason 'list signup only' when no signals fire", async () => {
    const rows = [
      {
        email: "bare@test.com",
        business_name: null,
        city: null,
        vertical: "retail",
        referrer: null,
        created_at: FRESH,
      },
    ];
    mockQuery.mockResolvedValue({ rows, rowCount: 1, duration: 5 });

    const decisions = await acquisitionAgent.run({
      live: false,
      config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
      now: NOW_ISO,
    });

    expect(decisions[0].reason).toBe("list signup only");
  });
});
