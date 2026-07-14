import { describe, it, expect, vi, beforeEach } from "vitest";
import { scoreLead, acquisitionAgent } from "../acquisition-agent";
import type { AgentRunContext } from "../types";

// ─── Mocks for DB and email queue ─────────────────────────────────────────────

const { mockQuery, mockEmailAdd } = vi.hoisted(() => ({
  mockQuery: vi.fn(),
  mockEmailAdd: vi.fn(),
}));

vi.mock("@/lib/db/connection", () => {
  class InMemoryConnection {}
  return { db: { query: mockQuery }, InMemoryConnection };
});

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: { add: mockEmailAdd },
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

function msAgo(days: number): number {
  return Date.now() - days * 86_400_000;
}

function isoAgo(days: number): string {
  return new Date(msAgo(days)).toISOString();
}

interface LeadOverrides {
  email?: string;
  businessName?: string;
  city?: string;
  vertical?: string;
  referrer?: string;
  createdAt?: string;
}

function makeLead(overrides: LeadOverrides = {}) {
  return {
    email: overrides.email ?? "test@example.com",
    businessName: overrides.businessName,
    city: overrides.city,
    vertical: overrides.vertical ?? "retail",
    referrer: overrides.referrer,
    createdAt: overrides.createdAt ?? isoAgo(5),
  };
}

function makeDbRow(overrides: LeadOverrides = {}) {
  return {
    email: overrides.email ?? "test@example.com",
    business_name: overrides.businessName ?? null,
    city: overrides.city ?? null,
    vertical: overrides.vertical ?? "retail",
    referrer: overrides.referrer ?? null,
    created_at: overrides.createdAt ?? isoAgo(5),
  };
}

function makeCtx(live: boolean, threshold = 0.55): AgentRunContext {
  return {
    live,
    now: new Date().toISOString(),
    config: { threshold, maxActionsPerRun: 25, custom: { maxAgeDays: 30 } },
  };
}

const NOW_MS = Date.now();
const MAX_AGE = 30;

// ─── scoreLead — individual weight branches ────────────────────────────────

describe("scoreLead — weight branches", () => {
  it("base score is 0.30 with no bonuses", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("+0.30 for non-empty referrer", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.60);
  });

  it("+0.20 for ICP vertical (coffee_shops)", () => {
    const { confidence } = scoreLead(makeLead({ vertical: "coffee_shops" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.50);
  });

  it("+0.10 for businessName", () => {
    const { confidence } = scoreLead(makeLead({ businessName: "Acme Cafe" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.40);
  });

  it("+0.05 for city", () => {
    const { confidence } = scoreLead(makeLead({ city: "Austin" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.35);
  });

  it("-0.15 for lead older than maxAgeDays", () => {
    const { confidence } = scoreLead(makeLead({ createdAt: isoAgo(35) }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.15);
  });

  it("all bonuses, fresh lead sums to 0.95", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Brew Co",
      city: "NYC",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.95);
  });

  it("all bonuses, aged lead sums to 0.80", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Brew Co",
      city: "NYC",
      createdAt: isoAgo(35),
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.80);
  });

  it("whitespace-only referrer gives no bonus", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "   " }), NOW_MS, MAX_AGE);
    expect(confidence).toBeCloseTo(0.30);
  });

  it("confidence is clamped to [0, 1]", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Brew Co",
      city: "NYC",
    });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
    expect(confidence).toBeLessThanOrEqual(1);
  });

  it("age penalty does not push confidence below 0", () => {
    // Very old lead with no bonuses: 0.30 - 0.15 = 0.15 (still positive, but clamped floor is 0)
    const lead = makeLead({ createdAt: isoAgo(200) });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(0);
  });

  it("reasons list includes all applied factors", () => {
    const lead = makeLead({
      referrer: "partner",
      vertical: "coffee_shops",
      businessName: "Brew Co",
      city: "NYC",
    });
    const { reasons } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(reasons).toContain("referred");
    expect(reasons).toContain("ICP vertical");
    expect(reasons).toContain("named business");
    expect(reasons).toContain("city known");
  });

  it("aged lead reason includes day count", () => {
    const { reasons } = scoreLead(makeLead({ createdAt: isoAgo(40) }), NOW_MS, MAX_AGE);
    expect(reasons.some((r) => r.startsWith("aged"))).toBe(true);
  });

  it("fresh lead at exactly maxAgeDays boundary incurs no penalty", () => {
    const lead = makeLead({ createdAt: isoAgo(30) });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    // ageDays is ~30 which is NOT > 30, so no penalty: expected 0.30
    expect(confidence).toBeCloseTo(0.30);
  });
});

// ─── Threshold gate (via scoreLead) ───────────────────────────────────────────

describe("threshold gate (default 0.55)", () => {
  const THRESHOLD = 0.55;

  it("referred non-ICP lead (0.60) is above threshold — would act in live", () => {
    const { confidence } = scoreLead(makeLead({ referrer: "partner" }), NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("base-only lead (0.30) is below threshold — would NOT act in live", () => {
    const { confidence } = scoreLead(makeLead(), NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(THRESHOLD);
  });

  it("ICP + named + city (0.65) is above threshold", () => {
    const lead = makeLead({ vertical: "coffee_shops", businessName: "Brew", city: "NYC" });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeGreaterThanOrEqual(THRESHOLD);
  });

  it("ICP aged only (0.35) is below threshold", () => {
    const lead = makeLead({ vertical: "coffee_shops", createdAt: isoAgo(35) });
    const { confidence } = scoreLead(lead, NOW_MS, MAX_AGE);
    expect(confidence).toBeLessThan(THRESHOLD);
  });
});

// ─── run() — dry-run behavior ─────────────────────────────────────────────────

describe("run() dry-run", () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockEmailAdd.mockReset();
  });

  it("returns empty array when no leads are available", async () => {
    mockQuery.mockResolvedValue({ rows: [], rowCount: 0, duration: 0 });
    const decisions = await acquisitionAgent.run(makeCtx(false));
    expect(decisions).toEqual([]);
  });

  it("all decisions have executed:false regardless of confidence", async () => {
    // high-confidence (above threshold) + low-confidence (below threshold)
    mockQuery.mockResolvedValue({
      rows: [
        makeDbRow({ email: "hi@test.com", referrer: "p", vertical: "coffee_shops", businessName: "B", city: "NYC" }),
        makeDbRow({ email: "lo@test.com" }),
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));

    expect(decisions).toHaveLength(2);
    expect(decisions.every((d) => d.executed === false)).toBe(true);
  });

  it("never enqueues emails in dry-run", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        makeDbRow({ email: "hi@test.com", referrer: "p", vertical: "coffee_shops", businessName: "B", city: "NYC" }),
      ],
      rowCount: 1,
      duration: 0,
    });

    await acquisitionAgent.run(makeCtx(false));

    expect(mockEmailAdd).not.toHaveBeenCalled();
  });

  it("decisions are sorted by confidence descending", async () => {
    mockQuery.mockResolvedValue({
      rows: [
        makeDbRow({ email: "lo@test.com" }),
        makeDbRow({ email: "hi@test.com", referrer: "p", vertical: "coffee_shops", businessName: "B", city: "NYC" }),
      ],
      rowCount: 2,
      duration: 0,
    });

    const decisions = await acquisitionAgent.run(makeCtx(false));

    expect(decisions[0].targetId).toBe("hi@test.com");
    expect(decisions[1].targetId).toBe("lo@test.com");
    expect(decisions[0].confidence).toBeGreaterThan(decisions[1].confidence);
  });

  it("decision metadata includes vertical, referred flag, and ageDays", async () => {
    mockQuery.mockResolvedValue({
      rows: [makeDbRow({ email: "m@test.com", referrer: "p", vertical: "coffee_shops", city: "LA" })],
      rowCount: 1,
      duration: 0,
    });

    const [d] = await acquisitionAgent.run(makeCtx(false));

    expect(d.meta?.vertical).toBe("coffee_shops");
    expect(d.meta?.referred).toBe(true);
    expect(typeof d.meta?.ageDays).toBe("number");
  });
});
