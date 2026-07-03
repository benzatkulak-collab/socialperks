import { describe, it, expect, vi, beforeEach } from "vitest";
import { acquisitionAgent, scoreLead, type WaitlistLead } from "../acquisition-agent";

// ─── DB mock ─────────────────────────────────────────────────────────────────
// vi.hoisted ensures mockQuery is initialised before vi.mock's factory runs.
const mockQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => {
  // A class distinct from our plain-object `db` so `db instanceof InMemoryConnection` is false,
  // causing fetchUncontactedLeads to proceed to db.query() rather than short-circuit to [].
  class InMemoryConnection {}
  return { db: { query: mockQuery }, InMemoryConnection };
});

// ─── Shared constants ─────────────────────────────────────────────────────────

const NOW_ISO = "2026-07-03T00:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const MAX_AGE_DAYS = 30;
const THRESHOLD = 0.55;

function daysAgo(n: number): string {
  return new Date(NOW_MS - n * 86_400_000).toISOString();
}

// ─── Scoring fixtures (expected values annotated inline) ──────────────────────
//   base      0.30  — listed on waitlist
//   referred  +0.30 — arrived via a referrer
//   ICP       +0.20 — vertical === "coffee_shops"
//   named     +0.10 — businessName present
//   city      +0.05 — city present
//   aged      -0.15 — older than maxAgeDays
//   clamp     [0, 1]

const LEADS: Record<string, WaitlistLead> = {
  // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 = 0.95
  fullHouse: {
    email: "full@ex.com",
    businessName: "Bean Lab",
    city: "Austin",
    vertical: "coffee_shops",
    referrer: "partner",
    createdAt: daysAgo(5),
  },
  // 0.30 + 0.30 = 0.60
  referredOnly: {
    email: "ref@ex.com",
    vertical: "restaurants",
    referrer: "friend",
    createdAt: daysAgo(5),
  },
  // 0.30 + 0.20 = 0.50
  icpOnly: {
    email: "icp@ex.com",
    vertical: "coffee_shops",
    createdAt: daysAgo(5),
  },
  // 0.30 + 0.10 + 0.05 = 0.45
  namedAndCity: {
    email: "nc@ex.com",
    businessName: "Roast Co",
    city: "Denver",
    vertical: "restaurants",
    createdAt: daysAgo(5),
  },
  // 0.30
  baseOnly: {
    email: "base@ex.com",
    vertical: "restaurants",
    createdAt: daysAgo(5),
  },
  // 0.30 - 0.15 = 0.15
  agedBase: {
    email: "aged@ex.com",
    vertical: "restaurants",
    createdAt: daysAgo(35),
  },
  // 0.30 + 0.30 + 0.20 + 0.10 + 0.05 - 0.15 = 0.80
  agedFull: {
    email: "afull@ex.com",
    businessName: "Old Brew",
    city: "Portland",
    vertical: "coffee_shops",
    referrer: "partner",
    createdAt: daysAgo(35),
  },
};

// ═════════════════════════════════════════════════════════════════════════════
// scoreLead — weight branches
// ═════════════════════════════════════════════════════════════════════════════

describe("scoreLead", () => {
  describe("weights", () => {
    it("base score is 0.30 for a list-only signup with no other signals", () => {
      const { confidence, reasons } = scoreLead(LEADS.baseOnly, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.3, 5);
      expect(reasons).toHaveLength(0);
    });

    it("adds 0.30 for a non-empty referrer", () => {
      const { confidence, reasons } = scoreLead(LEADS.referredOnly, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.6, 5);
      expect(reasons).toContain("referred");
    });

    it("does NOT add referral bonus for a whitespace-only referrer", () => {
      const lead: WaitlistLead = { ...LEADS.baseOnly, referrer: "   " };
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.3, 5);
    });

    it("adds 0.20 for the ICP vertical (coffee_shops)", () => {
      const { confidence, reasons } = scoreLead(LEADS.icpOnly, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.5, 5);
      expect(reasons).toContain("ICP vertical");
    });

    it("adds 0.10 for businessName and 0.05 for city", () => {
      const { confidence, reasons } = scoreLead(LEADS.namedAndCity, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.45, 5);
      expect(reasons).toContain("named business");
      expect(reasons).toContain("city known");
    });

    it("all positive signals (fresh lead) sum to 0.95", () => {
      const { confidence, reasons } = scoreLead(LEADS.fullHouse, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.95, 5);
      expect(reasons).toEqual(["referred", "ICP vertical", "named business", "city known"]);
    });

    it("deducts 0.15 and appends an aged reason for a lead past maxAgeDays", () => {
      const { confidence, reasons } = scoreLead(LEADS.agedBase, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.15, 5);
      expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
    });

    it("all signals with age penalty yields 0.80", () => {
      const { confidence } = scoreLead(LEADS.agedFull, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeCloseTo(0.8, 5);
    });

    it("clamps score to 0 when negative (extreme age on base-only lead)", () => {
      const lead: WaitlistLead = { ...LEADS.baseOnly, createdAt: daysAgo(365) };
      const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    });
  });

  // ─── threshold gate ─────────────────────────────────────────────────────────

  describe("threshold gate (default 0.55)", () => {
    it("leads >= 0.55 are above the gate and would be actioned in live mode", () => {
      // 0.95 — full house fresh
      expect(scoreLead(LEADS.fullHouse, NOW_MS, MAX_AGE_DAYS).confidence).toBeGreaterThanOrEqual(THRESHOLD);
      // 0.60 — referred only
      expect(scoreLead(LEADS.referredOnly, NOW_MS, MAX_AGE_DAYS).confidence).toBeGreaterThanOrEqual(THRESHOLD);
      // 0.80 — aged full
      expect(scoreLead(LEADS.agedFull, NOW_MS, MAX_AGE_DAYS).confidence).toBeGreaterThanOrEqual(THRESHOLD);
    });

    it("leads < 0.55 are below the gate and would NOT be actioned in live mode", () => {
      // 0.50 — ICP only (just under threshold)
      expect(scoreLead(LEADS.icpOnly, NOW_MS, MAX_AGE_DAYS).confidence).toBeLessThan(THRESHOLD);
      // 0.45 — named + city only
      expect(scoreLead(LEADS.namedAndCity, NOW_MS, MAX_AGE_DAYS).confidence).toBeLessThan(THRESHOLD);
      // 0.30 — base only
      expect(scoreLead(LEADS.baseOnly, NOW_MS, MAX_AGE_DAYS).confidence).toBeLessThan(THRESHOLD);
      // 0.15 — aged base (no referral, no ICP)
      expect(scoreLead(LEADS.agedBase, NOW_MS, MAX_AGE_DAYS).confidence).toBeLessThan(THRESHOLD);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// acquisitionAgent.run() — dry-run mode
// ═════════════════════════════════════════════════════════════════════════════

describe("acquisitionAgent.run() — dry-run", () => {
  function makeCtx() {
    return {
      live: false as const,
      config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
      now: NOW_ISO,
    };
  }

  beforeEach(() => {
    mockQuery.mockReset();
  });

  it("returns an empty array when the DB throws (no DATABASE_URL posture)", async () => {
    mockQuery.mockRejectedValueOnce(new Error("connection refused"));
    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions).toHaveLength(0);
  });

  it("all decisions have executed=false regardless of confidence", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        // confidence 0.95 — above threshold, but dry-run must not execute
        {
          email: "cafe@ex.com",
          business_name: "Bean Lab",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
        // confidence 0.30 — below threshold
        {
          email: "anon@ex.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx());

    expect(decisions).toHaveLength(2);
    for (const d of decisions) {
      expect(d.executed).toBe(false);
      expect(d.action).toBe("send-early-access-invite");
    }
  });

  it("sorts decisions highest confidence first", async () => {
    // Feed leads in low-confidence order; run() must re-sort
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "anon@ex.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: daysAgo(5),
        },
        {
          email: "cafe@ex.com",
          business_name: "Bean Lab",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
      ],
      rowCount: 2,
      duration: 1,
    });

    const decisions = await acquisitionAgent.run(makeCtx());
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
    expect(decisions[0].targetId).toBe("cafe@ex.com");
  });

  it("attaches expected metadata to each decision", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "cafe@ex.com",
          business_name: "Bean Lab",
          city: "Austin",
          vertical: "coffee_shops",
          referrer: "partner",
          created_at: daysAgo(5),
        },
      ],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx());
    expect(decision.meta?.businessName).toBe("Bean Lab");
    expect(decision.meta?.city).toBe("Austin");
    expect(decision.meta?.vertical).toBe("coffee_shops");
    expect(decision.meta?.referred).toBe(true);
    expect(decision.meta?.ageDays).toBe(5);
  });

  it("uses 'list signup only' reason text for base-only leads with no positive signals", async () => {
    mockQuery.mockResolvedValueOnce({
      rows: [
        {
          email: "anon@ex.com",
          business_name: null,
          city: null,
          vertical: "restaurants",
          referrer: null,
          created_at: daysAgo(5),
        },
      ],
      rowCount: 1,
      duration: 1,
    });

    const [decision] = await acquisitionAgent.run(makeCtx());
    expect(decision.reason).toBe("list signup only");
  });
});
