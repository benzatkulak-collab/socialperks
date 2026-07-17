import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ── DB mock ────────────────────────────────────────────────────────────────
//
// `vi.hoisted` runs before the vi.mock factory so `mockQuery` is in scope
// there. The factory returns an `InMemoryConnection` class and a plain-object
// `db` that is NOT an instance of it — which makes the in-memory guard in
// `fetchUncontactedLeads` fall through to the real query path.

const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { InMemoryConnection, db: { query: mockQuery } };
});

// ── helpers ────────────────────────────────────────────────────────────────

const NOW_MS = new Date("2026-01-15T12:00:00Z").getTime();
const MAX_AGE_DAYS = 30;

function fresh(daysAgo: number) {
  return new Date(NOW_MS - daysAgo * 86_400_000).toISOString();
}

function makeDbRow(overrides: {
  email?: string;
  business_name?: string | null;
  city?: string | null;
  vertical?: string;
  referrer?: string | null;
  created_at?: string;
}) {
  return {
    email: overrides.email ?? "default@example.com",
    business_name: overrides.business_name ?? null,
    city: overrides.city ?? null,
    vertical: overrides.vertical ?? "retail",
    referrer: overrides.referrer ?? null,
    created_at: overrides.created_at ?? fresh(5),
  };
}

const dryRunCtx: AgentRunContext = {
  live: false,
  config: {
    threshold: 0.55,
    maxActionsPerRun: 25,
    custom: { maxAgeDays: MAX_AGE_DAYS },
  },
  now: new Date(NOW_MS).toISOString(),
};

// ── scoreLead ──────────────────────────────────────────────────────────────

describe("scoreLead", () => {
  it("returns base 0.30 for anonymous, non-ICP, city-less, fresh lead", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.3, 5);
  });

  it("adds +0.30 for a referred lead → 0.60", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", referrer: "partner", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.6, 5);
  });

  it("adds +0.20 for ICP vertical (coffee_shops) → 0.50", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "coffee_shops", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.5, 5);
  });

  it("adds +0.10 for named business → 0.40", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", businessName: "Acme", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.4, 5);
  });

  it("adds +0.05 for city known → 0.35", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", city: "Austin", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.35, 5);
  });

  it("all positive signals → 0.95", () => {
    const { confidence } = scoreLead(
      {
        email: "a@b.com",
        vertical: "coffee_shops",
        referrer: "partner",
        businessName: "Roast & Toast",
        city: "Austin",
        createdAt: fresh(5),
      },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.95, 5);
  });

  it("deducts −0.15 for aged lead (past maxAgeDays) → 0.15", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", createdAt: fresh(45) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.15, 5);
  });

  it("referred + aged → 0.45 (below default threshold 0.55)", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", referrer: "p", createdAt: fresh(45) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.45, 5);
    expect(confidence).toBeLessThan(0.55);
  });

  it("referred + ICP + aged → 0.65 (above default threshold 0.55)", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "coffee_shops", referrer: "p", createdAt: fresh(45) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeCloseTo(0.65, 5);
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });

  it("confidence is always clamped within [0, 1]", () => {
    // Maximum possible (0.95) must not exceed 1.
    const high = scoreLead(
      {
        email: "a@b.com",
        vertical: "coffee_shops",
        referrer: "p",
        businessName: "Biz",
        city: "DC",
        createdAt: fresh(1),
      },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(high.confidence).toBeLessThanOrEqual(1);
    expect(high.confidence).toBeGreaterThanOrEqual(0);
  });

  it("includes reasons that match the signals applied", () => {
    const { reasons } = scoreLead(
      { email: "a@b.com", vertical: "coffee_shops", referrer: "p", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).not.toContain("named business");
    expect(reasons).not.toContain("city known");
  });

  it("whitespace-only referrer is NOT counted as a referral", () => {
    const { confidence } = scoreLead(
      { email: "a@b.com", vertical: "retail", referrer: "   ", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    // Should stay at base 0.30 — no referral bonus.
    expect(confidence).toBeCloseTo(0.3, 5);
  });
});

// ── threshold gate ─────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("base-only lead (0.30) is below the threshold — would not act in live", () => {
    const { confidence } = scoreLead(
      { email: "x@x.com", vertical: "other", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeLessThan(0.55);
  });

  it("referred fresh lead (0.60) is above the threshold — would act in live", () => {
    const { confidence } = scoreLead(
      { email: "x@x.com", vertical: "other", referrer: "p", createdAt: fresh(5) },
      NOW_MS,
      MAX_AGE_DAYS,
    );
    expect(confidence).toBeGreaterThanOrEqual(0.55);
  });
});

// ── run() in dry-run ───────────────────────────────────────────────────────

describe("acquisitionAgent.run() in dry-run", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockQuery.mockResolvedValue({ rows: [] });
  });

  it("returns an empty array when no leads are in the DB", async () => {
    const decisions = await acquisitionAgent.run(dryRunCtx);
    expect(decisions).toEqual([]);
  });

  it("executed is false for ALL decisions regardless of confidence", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        // High-confidence lead (above threshold)
        makeDbRow({
          email: "high@ex.com",
          vertical: "coffee_shops",
          referrer: "p",
          business_name: "Roast HQ",
          city: "Austin",
          created_at: fresh(3),
        }),
        // Low-confidence lead (below threshold)
        makeDbRow({ email: "low@ex.com", vertical: "retail", created_at: fresh(5) }),
      ],
    });

    const decisions = await acquisitionAgent.run(dryRunCtx);

    expect(decisions.length).toBe(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
    }
  });

  it("decisions are sorted by confidence descending", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        // Return low-confidence first to ensure sort happens.
        makeDbRow({ email: "low@ex.com", vertical: "retail", created_at: fresh(5) }),
        makeDbRow({ email: "high@ex.com", vertical: "coffee_shops", referrer: "p", created_at: fresh(3) }),
      ],
    });

    const decisions = await acquisitionAgent.run(dryRunCtx);

    expect(decisions[0].confidence).toBeGreaterThanOrEqual(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("high@ex.com");
  });

  it("decision fields are populated correctly for a minimal lead", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeDbRow({ email: "bare@ex.com", vertical: "retail", created_at: fresh(5) })],
    });

    const [d] = await acquisitionAgent.run(dryRunCtx);

    expect(d.targetId).toBe("bare@ex.com");
    expect(d.action).toBe("send-early-access-invite");
    expect(d.reason).toBe("list signup only");
    expect(d.executed).toBe(false);
    expect(d.confidence).toBeCloseTo(0.3, 5);
  });

  it("fetch limit is capped at 4× maxActionsPerRun (≤500)", async () => {
    await acquisitionAgent.run(dryRunCtx);

    // query(sql, params) — params[0] is the LIMIT value.
    const [, params] = mockQuery.mock.calls[0] as [string, [number]];
    expect(params[0]).toBeLessThanOrEqual(dryRunCtx.config.maxActionsPerRun * 4);
    expect(params[0]).toBeLessThanOrEqual(500);
  });

  it("defaultMode is 'dry-run' (safety invariant — never flip to live here)", () => {
    expect(acquisitionAgent.defaultMode).toBe("dry-run");
  });
});
