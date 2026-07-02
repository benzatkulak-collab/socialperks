import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { WaitlistLead } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── Time fixtures ──────────────────────────────────────────────────────────────

const NOW_ISO = "2026-07-02T12:00:00.000Z";
const NOW_MS = new Date(NOW_ISO).getTime();
const FRESH = new Date(NOW_MS - 5 * 86_400_000).toISOString();   // 5 days old — within 30-day cutoff
const AGED  = new Date(NOW_MS - 45 * 86_400_000).toISOString();  // 45 days old — past 30-day cutoff

const MAX_AGE_DAYS = 30; // matches agent defaultMode default
const THRESHOLD = 0.55;  // matches agent config.threshold.default

// ─── Lead fixtures ──────────────────────────────────────────────────────────────

function lead(overrides: Partial<WaitlistLead> & { createdAt: string }): WaitlistLead {
  return { email: "test@example.com", vertical: "retail", ...overrides };
}

// Score: 0.30 + 0.30 (ref) + 0.20 (ICP) + 0.10 (name) + 0.05 (city) = 0.95
const LEAD_ALL_SIGNALS = lead({
  email: "all@ex.com",
  businessName: "Sunrise Cafe",
  city: "Austin",
  vertical: "coffee_shops",
  referrer: "partner.com",
  createdAt: FRESH,
});
// Score: 0.30 + 0.30 (ref) = 0.60 — above threshold
const LEAD_REFERRED_ONLY = lead({ email: "ref@ex.com", referrer: "x.com", createdAt: FRESH });
// Score: 0.30 + 0.20 (ICP) + 0.10 (name) + 0.05 (city) = 0.65 — above threshold
const LEAD_ICP_NAMED_CITY = lead({
  email: "icp-full@ex.com",
  businessName: "Java Joint",
  city: "Denver",
  vertical: "coffee_shops",
  createdAt: FRESH,
});
// Score: 0.30 + 0.20 (ICP) = 0.50 — just BELOW the 0.55 threshold (key edge case)
const LEAD_ICP_ANON = lead({ email: "icp-anon@ex.com", vertical: "coffee_shops", createdAt: FRESH });
// Score: 0.30 + 0.20 (ICP) + 0.05 (city) = 0.55 — exactly AT threshold
const LEAD_AT_THRESHOLD = lead({
  email: "at@ex.com",
  city: "Portland",
  vertical: "coffee_shops",
  createdAt: FRESH,
});
// Score: 0.30 — just signed up, nothing else
const LEAD_BASE_ONLY = lead({ email: "base@ex.com", createdAt: FRESH });
// Score: 0.30 − 0.15 (aged) = 0.15
const LEAD_AGED_BASE = lead({ email: "aged@ex.com", createdAt: AGED });
// Score: 0.30 + 0.30 (ref) − 0.15 (aged) = 0.45 — referred but aged, still below threshold
const LEAD_AGED_REFERRED = lead({ email: "aged-ref@ex.com", referrer: "y.com", createdAt: AGED });

// ─── DB mock (used by run() tests to inject synthetic leads) ────────────────────

const mockDbQuery = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/connection", () => ({
  InMemoryConnection: class {},
  db: { query: mockDbQuery },
}));

// ─── scoreLead — weighted sum ──────────────────────────────────────────────────

describe("scoreLead — weighted sum", () => {
  it("all signals present → 0.95", () => {
    const { confidence } = scoreLead(LEAD_ALL_SIGNALS, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.95);
  });

  it("referred only → 0.60", () => {
    const { confidence } = scoreLead(LEAD_REFERRED_ONLY, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.60);
  });

  it("ICP + name + city (not referred) → 0.65", () => {
    const { confidence } = scoreLead(LEAD_ICP_NAMED_CITY, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.65);
  });

  it("ICP anon (no referrer, no name, no city) → 0.50 — below default threshold", () => {
    const { confidence } = scoreLead(LEAD_ICP_ANON, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.50);
  });

  it("ICP + city (no referrer, no name) → 0.55 exactly at threshold", () => {
    const { confidence } = scoreLead(LEAD_AT_THRESHOLD, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.55);
  });

  it("base only → 0.30", () => {
    const { confidence } = scoreLead(LEAD_BASE_ONLY, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("aged base → 0.15 (age penalty applied)", () => {
    const { confidence } = scoreLead(LEAD_AGED_BASE, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("aged + referred → 0.45 (penalty partially offset by referral bonus)", () => {
    const { confidence } = scoreLead(LEAD_AGED_REFERRED, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.45);
  });

  it("result is always clamped to [0, 1]", () => {
    const fixtures = [
      LEAD_ALL_SIGNALS,
      LEAD_BASE_ONLY,
      LEAD_AGED_BASE,
      LEAD_REFERRED_ONLY,
      LEAD_ICP_ANON,
    ];
    for (const l of fixtures) {
      const { confidence } = scoreLead(l, NOW_MS, MAX_AGE_DAYS);
      expect(confidence).toBeGreaterThanOrEqual(0);
      expect(confidence).toBeLessThanOrEqual(1);
    }
  });

  it("whitespace-only referrer does NOT add referral bonus", () => {
    const blankRef = lead({ email: "z@ex.com", referrer: "   ", createdAt: FRESH });
    const { confidence, reasons } = scoreLead(blankRef, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeCloseTo(0.30);
    expect(reasons).not.toContain("referred");
  });
});

// ─── scoreLead — reason labels ────────────────────────────────────────────────

describe("scoreLead — reason labels", () => {
  it("includes all expected labels for a fully-qualified lead", () => {
    const { reasons } = scoreLead(LEAD_ALL_SIGNALS, NOW_MS, MAX_AGE_DAYS);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("includes aged label when past the cutoff", () => {
    const { reasons } = scoreLead(LEAD_AGED_BASE, NOW_MS, MAX_AGE_DAYS);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("no aged label when lead is fresh", () => {
    const { reasons } = scoreLead(LEAD_BASE_ONLY, NOW_MS, MAX_AGE_DAYS);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(false);
  });

  it("base-only lead has no reason labels (listed as list signup only by run())", () => {
    const { reasons } = scoreLead(LEAD_BASE_ONLY, NOW_MS, MAX_AGE_DAYS);
    expect(reasons).toHaveLength(0);
  });
});

// ─── Threshold gate ───────────────────────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  it("lead scoring 0.60 passes (above threshold)", () => {
    const { confidence } = scoreLead(LEAD_REFERRED_ONLY, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("lead scoring 0.50 does NOT pass (below threshold by 0.05 — ICP-anon edge case)", () => {
    const { confidence } = scoreLead(LEAD_ICP_ANON, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("lead scoring exactly 0.55 passes (>= is inclusive)", () => {
    const { confidence } = scoreLead(LEAD_AT_THRESHOLD, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("aged+referred lead scoring 0.45 does NOT pass", () => {
    const { confidence } = scoreLead(LEAD_AGED_REFERRED, NOW_MS, MAX_AGE_DAYS);
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── acquisitionAgent.run() — dry-run mode ────────────────────────────────────

const DRY_RUN_CTX: AgentRunContext = {
  live: false,
  config: { threshold: THRESHOLD, maxActionsPerRun: 25, custom: { maxAgeDays: MAX_AGE_DAYS } },
  now: NOW_ISO,
};

// DB rows in the snake_case shape that fetchUncontactedLeads reads from Postgres
const SYNTHETIC_DB_ROWS = [
  { email: "all@ex.com",      business_name: "Sunrise Cafe", city: "Austin",  vertical: "coffee_shops", referrer: "partner.com", created_at: FRESH },
  { email: "icp-anon@ex.com", business_name: null,           city: null,      vertical: "coffee_shops", referrer: null,          created_at: FRESH },
  { email: "base@ex.com",     business_name: null,           city: null,      vertical: "retail",       referrer: null,          created_at: FRESH },
  { email: "aged@ex.com",     business_name: null,           city: null,      vertical: "retail",       referrer: null,          created_at: AGED  },
];

describe("acquisitionAgent.run() — dry-run", () => {
  beforeEach(() => {
    mockDbQuery.mockResolvedValue({ rows: SYNTHETIC_DB_ROWS });
  });

  it("returns one decision per lead", async () => {
    const decisions = await acquisitionAgent.run(DRY_RUN_CTX);
    expect(decisions).toHaveLength(SYNTHETIC_DB_ROWS.length);
  });

  it("ALL decisions have executed:false regardless of confidence", async () => {
    const decisions = await acquisitionAgent.run(DRY_RUN_CTX);
    expect(decisions.every((d) => d.executed === false)).toBe(true);
  });

  it("decisions are sorted by confidence descending (best opportunities first)", async () => {
    const decisions = await acquisitionAgent.run(DRY_RUN_CTX);
    for (let i = 1; i < decisions.length; i++) {
      expect(decisions[i].confidence).toBeLessThanOrEqual(decisions[i - 1].confidence);
    }
  });

  it("highest-confidence lead (all signals, 0.95) is ranked first", async () => {
    const decisions = await acquisitionAgent.run(DRY_RUN_CTX);
    expect(decisions[0].targetId).toBe("all@ex.com");
    expect(decisions[0].confidence).toBeCloseTo(0.95);
  });

  it("all decisions carry the correct action label", async () => {
    const decisions = await acquisitionAgent.run(DRY_RUN_CTX);
    expect(decisions.every((d) => d.action === "send-early-access-invite")).toBe(true);
  });

  it("returns empty decisions when no leads are available", async () => {
    mockDbQuery.mockResolvedValueOnce({ rows: [] });
    const decisions = await acquisitionAgent.run(DRY_RUN_CTX);
    expect(decisions).toHaveLength(0);
  });

  it("DB error is swallowed gracefully (returns empty, does not throw)", async () => {
    mockDbQuery.mockRejectedValueOnce(new Error("connection refused"));
    await expect(acquisitionAgent.run(DRY_RUN_CTX)).resolves.toHaveLength(0);
  });
});
