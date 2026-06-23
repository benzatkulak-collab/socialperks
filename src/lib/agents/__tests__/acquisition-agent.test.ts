/**
 * Acquisition Agent — rollout validation tests
 *
 * Validates scoring weights, the threshold gate, and the dry-run invariant
 * (no emails are enqueued and every decision has executed:false) using
 * synthetic in-memory fixtures. DATABASE_URL is not set in this environment,
 * so the DB mock provides controllable lead data.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// Variables prefixed with "mock" are hoisted with vi.mock in Vitest,
// making them available inside the factory before imports are resolved.
const mockQuery = vi.fn();

// Mock the DB so fetchUncontactedLeads bypasses the InMemoryConnection guard
// and falls through to db.query(), which we control via mockQuery.
// db is a plain object — NOT an InMemoryConnection instance — so the
// `db instanceof InMemoryConnection` check in fetchUncontactedLeads is false.
vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockQuery } };
});

import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const NOW = Date.now();
// 5 days old — comfortably within the default 30-day cold cutoff
const FRESH = new Date(NOW - 5 * 86_400_000).toISOString();
// 35 days old — past the default 30-day cutoff, triggers −0.15 penalty
const AGED  = new Date(NOW - 35 * 86_400_000).toISOString();
const MAX_AGE = 30;

function lead(overrides: Partial<WaitlistLead> = {}): WaitlistLead {
  return { email: "test@example.com", vertical: "restaurant", createdAt: FRESH, ...overrides };
}

/** Convert WaitlistLead objects to the DB row shape returned by the waitlist query. */
function toDbRows(leads: WaitlistLead[]) {
  return {
    rows: leads.map((l) => ({
      email: l.email,
      business_name: l.businessName ?? null,
      city: l.city ?? null,
      vertical: l.vertical,
      referrer: l.referrer ?? null,
      created_at: l.createdAt,
    })),
    rowCount: leads.length,
    duration: 1,
  };
}

function runCtx(live = false, threshold = 0.55) {
  return {
    live,
    config: { threshold, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE } },
    now: new Date(NOW).toISOString(),
  };
}

// ─── scoreLead ────────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("base only → 0.30, no reasons", () => {
    const { confidence, reasons } = scoreLead(lead(), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).toEqual([]);
  });

  it("referred adds +0.30 → 0.60", () => {
    const { confidence, reasons } = scoreLead(lead({ referrer: "partner.co" }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.60);
    expect(reasons).toContain("referred");
  });

  it("ICP vertical (coffee_shops) adds +0.20 → 0.50", () => {
    const { confidence, reasons } = scoreLead(lead({ vertical: "coffee_shops" }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.50);
    expect(reasons).toContain("ICP vertical");
  });

  it("named business adds +0.10 → 0.40", () => {
    const { confidence, reasons } = scoreLead(lead({ businessName: "My Cafe" }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.40);
    expect(reasons).toContain("named business");
  });

  it("city adds +0.05 → 0.35", () => {
    const { confidence, reasons } = scoreLead(lead({ city: "Austin" }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.35);
    expect(reasons).toContain("city known");
  });

  it("all bonuses + fresh lead → 0.95", () => {
    const { confidence, reasons } = scoreLead(
      lead({ referrer: "p", vertical: "coffee_shops", businessName: "Brew Co", city: "NYC" }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.95);
    expect(reasons).toEqual(["referred", "ICP vertical", "named business", "city known"]);
  });

  it("aged lead (> maxAgeDays) applies −0.15 penalty → 0.15", () => {
    const { confidence, reasons } = scoreLead(lead({ createdAt: AGED }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("referred + aged → 0.45 (below default threshold 0.55)", () => {
    const { confidence } = scoreLead(lead({ referrer: "p", createdAt: AGED }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.45);
    expect(confidence).toBeLessThan(0.55);
  });

  it("ICP + aged → 0.35", () => {
    const { confidence } = scoreLead(
      lead({ vertical: "coffee_shops", createdAt: AGED }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.35);
  });

  it("all bonuses + aged → 0.80 (still above threshold)", () => {
    const { confidence } = scoreLead(
      lead({
        referrer: "p",
        vertical: "coffee_shops",
        businessName: "Brew",
        city: "NYC",
        createdAt: AGED,
      }),
      NOW,
      MAX_AGE,
    );
    expect(confidence).toBeCloseTo(0.80);
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("whitespace-only referrer is NOT counted as a referral", () => {
    const { confidence, reasons } = scoreLead(lead({ referrer: "   " }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).not.toContain("referred");
  });

  it("empty string referrer is NOT counted as a referral", () => {
    const { confidence } = scoreLead(lead({ referrer: "" }), NOW, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("confidence is clamped to [0, 1] in all cases", () => {
    const worst = scoreLead(lead({ createdAt: AGED }), NOW, MAX_AGE);
    const best = scoreLead(
      lead({ referrer: "p", vertical: "coffee_shops", businessName: "B", city: "C" }),
      NOW,
      MAX_AGE,
    );
    expect(worst.confidence).toBeGreaterThanOrEqual(0);
    expect(worst.confidence).toBeLessThanOrEqual(1);
    expect(best.confidence).toBeGreaterThanOrEqual(0);
    expect(best.confidence).toBeLessThanOrEqual(1);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("referred-only lead (0.60) exceeds the threshold → would act in live", () => {
    const { confidence } = scoreLead(lead({ referrer: "p" }), NOW, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("base-only fresh lead (0.30) is below the threshold → would NOT act", () => {
    const { confidence } = scoreLead(lead(), NOW, MAX_AGE);
    expect(confidence).toBeLessThan(0.55);
  });

  it("aged-only lead (0.15) is below the threshold → would NOT act", () => {
    const { confidence } = scoreLead(lead({ createdAt: AGED }), NOW, MAX_AGE);
    expect(confidence).toBeLessThan(0.55);
  });

  it("referred + aged (0.45) is below the threshold → would NOT act", () => {
    const { confidence } = scoreLead(lead({ referrer: "p", createdAt: AGED }), NOW, MAX_AGE);
    expect(confidence).toBeLessThan(0.55);
  });
});

// ─── run() — dry-run mode ────────────────────────────────────────────────────

describe("run — dry-run mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty decisions when no leads are available", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 1 });
    const decisions = await acquisitionAgent.run(runCtx(false));
    expect(decisions).toEqual([]);
  });

  it("sets executed:false for ALL decisions regardless of confidence", async () => {
    mockQuery.mockResolvedValue(
      toDbRows([
        lead({ email: "hot@x.com", referrer: "p", vertical: "coffee_shops", businessName: "Brew", city: "NYC" }), // 0.95
        lead({ email: "warm@x.com", referrer: "p" }),  // 0.60 — above threshold
        lead({ email: "cold@x.com" }),                  // 0.30 — below threshold
      ]),
    );

    const decisions = await acquisitionAgent.run(runCtx(false));

    expect(decisions.length).toBe(3);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("sorts decisions by confidence descending", async () => {
    // Insert intentionally out of confidence order to confirm sort is applied.
    mockQuery.mockResolvedValue(
      toDbRows([
        lead({ email: "cold@x.com" }),                  // 0.30 — listed first
        lead({ email: "hot@x.com", referrer: "p", vertical: "coffee_shops", businessName: "Brew", city: "NYC" }), // 0.95
        lead({ email: "warm@x.com", referrer: "p" }),  // 0.60
      ]),
    );

    const decisions = await acquisitionAgent.run(runCtx(false));

    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
    expect(decisions[0].targetId).toBe("hot@x.com");
  });

  it("confidence scores match expected weighted sums", async () => {
    mockQuery.mockResolvedValue(
      toDbRows([
        lead({ email: "hot@x.com", referrer: "p", vertical: "coffee_shops", businessName: "Brew", city: "NYC" }),
        lead({ email: "warm@x.com", referrer: "p" }),
        lead({ email: "cold@x.com" }),
      ]),
    );

    const decisions = await acquisitionAgent.run(runCtx(false));
    const byEmail = Object.fromEntries(decisions.map((d) => [d.targetId, d]));

    expect(byEmail["hot@x.com"].confidence).toBeCloseTo(0.95);
    expect(byEmail["warm@x.com"].confidence).toBeCloseTo(0.60);
    expect(byEmail["cold@x.com"].confidence).toBeCloseTo(0.30);
  });

  it("decision action is 'send-early-access-invite' for every lead", async () => {
    mockQuery.mockResolvedValue(toDbRows([lead({ email: "a@x.com" })]));

    const [decision] = await acquisitionAgent.run(runCtx(false));

    expect(decision.action).toBe("send-early-access-invite");
    expect(decision.targetId).toBe("a@x.com");
  });

  it("reason falls back to 'list signup only' for a base-only lead", async () => {
    mockQuery.mockResolvedValue(toDbRows([lead({ email: "a@x.com" })]));

    const [decision] = await acquisitionAgent.run(runCtx(false));

    expect(decision.reason).toBe("list signup only");
  });

  it("does not call markContacted (db.query UPDATE) in dry-run", async () => {
    mockQuery.mockResolvedValue(
      toDbRows([lead({ email: "hot@x.com", referrer: "p", vertical: "coffee_shops" })]),
    );

    await acquisitionAgent.run(runCtx(false));

    // fetchUncontactedLeads calls db.query once (SELECT).
    // markContacted calls db.query once (UPDATE) — only in live mode.
    expect(mockQuery).toHaveBeenCalledTimes(1);
  });
});
