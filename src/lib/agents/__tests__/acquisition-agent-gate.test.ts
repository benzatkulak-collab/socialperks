import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Dry-run gate + send-cap coverage for the acquisition agent.
 *
 * These live in their own file because they need `@/lib/db/connection` and
 * `@/lib/jobs/registry` mocked at module scope, which the pure scoreLead
 * suite must not have.
 *
 * Why this file exists at all: the sibling suite "verified" the dry-run
 * invariant by looping over the decisions array — but with no DATABASE_URL
 * that array is always empty, so the loop body never ran and a broken gate
 * still passed. Sending unsolicited email from a run an operator believes
 * is a dry run is a CAN-SPAM incident, so it needs a test that can fail.
 *
 * Mutation results, measured (not assumed):
 *   - dropping the per-run send cap                        → CAUGHT
 *   - flipping the age boundary `>` to `>=`                → CAUGHT
 *   - removing BOTH dry-run guards                         → CAUGHT
 *   - removing EITHER guard alone                          → survives
 * The last one is by design, not a gap: dry-run is protected twice over
 * (`jobsMod` is only imported when live, AND the send branch re-checks
 * `ctx.live`), so knocking out one leaves the other doing the job. What
 * these tests guarantee is that protection cannot be lost entirely.
 */

const QUEUED: Array<{ to: string }> = [];
const CONTACTED: string[] = [];

// A fake Postgres-ish connection: NOT an InMemoryConnection, so the agent
// treats it as a real durable DB and proceeds to query leads.
class InMemoryConnection {}

let LEADS: Array<Record<string, unknown>> = [];

vi.mock("@/lib/db/connection", () => ({
  InMemoryConnection,
  db: {
    query: async (sql: string, params?: unknown[]) => {
      if (/UPDATE waitlist SET contacted_at/i.test(sql)) {
        CONTACTED.push(String(params?.[0]));
        return { rows: [], rowCount: 1 };
      }
      const limit = Number(params?.[0] ?? LEADS.length);
      return { rows: LEADS.slice(0, limit), rowCount: Math.min(limit, LEADS.length) };
    },
  },
}));

vi.mock("@/lib/jobs/registry", () => ({
  emailQueue: {
    add: (job: { to: string }) => {
      QUEUED.push(job);
    },
  },
}));

const { acquisitionAgent } = await import("../acquisition-agent");

const NOW = new Date("2026-07-09T12:00:00Z");

/** A lead that scores 0.95 — comfortably over the 0.55 send threshold. */
function hotLead(i: number): Record<string, unknown> {
  return {
    email: `lead${i}@example.com`,
    business_name: `Shop ${i}`,
    city: "Portland",
    vertical: "coffee_shops",
    referrer: "partner",
    created_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
  };
}

function run(live: boolean, maxActionsPerRun: number) {
  return acquisitionAgent.run({
    live,
    config: { threshold: 0.55, maxActionsPerRun, custom: { maxAgeDays: 30 } },
    now: NOW.toISOString(),
  });
}

beforeEach(() => {
  QUEUED.length = 0;
  CONTACTED.length = 0;
  LEADS = [];
});

describe("acquisition agent — dry-run gate (with leads present)", () => {
  it("sends NOTHING in dry-run even when every lead clears the threshold", async () => {
    LEADS = Array.from({ length: 10 }, (_, i) => hotLead(i));

    const decisions = await run(false, 25);

    // The decisions must exist — otherwise this test is vacuous, which is
    // exactly the defect it replaces.
    expect(decisions.length).toBe(10);
    expect(decisions.every((d) => d.confidence >= 0.55)).toBe(true);

    // ...and not one of them may have been executed or emailed.
    expect(decisions.some((d) => d.executed)).toBe(false);
    expect(QUEUED).toEqual([]);
    expect(CONTACTED).toEqual([]);
  });

  it("does send in live mode — proving the dry-run assertion above is load-bearing", async () => {
    LEADS = Array.from({ length: 3 }, (_, i) => hotLead(i));

    const decisions = await run(true, 25);

    expect(decisions.every((d) => d.executed)).toBe(true);
    expect(QUEUED).toHaveLength(3);
    expect(CONTACTED).toHaveLength(3);
  });
});

describe("acquisition agent — per-run send cap", () => {
  it("never emails more leads than maxActionsPerRun, even though it over-fetches 4x", async () => {
    // 40 eligible leads, cap of 5. The agent fetches min(5*4, 500) = 20 of
    // them. Before the fix it emailed all 20 and the registry's post-hoc
    // slice trimmed only the RETURNED list to 5 — so the operator saw 5
    // actions while 20 emails had gone out.
    LEADS = Array.from({ length: 40 }, (_, i) => hotLead(i));

    const decisions = await run(true, 5);

    expect(QUEUED).toHaveLength(5);
    expect(CONTACTED).toHaveLength(5);
    expect(decisions.filter((d) => d.executed)).toHaveLength(5);
  });

  it("spends the cap on the highest-confidence leads, not fetch order", async () => {
    // One hot lead (0.95) sitting LAST in created_at order, behind cold ones
    // (0.30, under threshold). The DB returns them oldest-first, so ranking
    // by confidence is the only thing that can pull the hot lead forward.
    // Keep the fixture inside the fetch window: fetchLimit is
    // min(maxActionsPerRun * 4, 500), so a cap of 2 fetches 8 rows.
    const cold = (i: number) => ({
      email: `cold${i}@example.com`,
      business_name: null,
      city: null,
      vertical: "other",
      referrer: null,
      created_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
    });
    LEADS = [...Array.from({ length: 5 }, (_, i) => cold(i)), hotLead(99)];

    await run(true, 2);

    expect(QUEUED.map((q) => q.to)).toEqual(["lead99@example.com"]);
  });

  it("ranking determines cap allocation when multiple above-threshold leads compete", async () => {
    // Previous test's cold leads score 0.30 (below threshold) so they can
    // never consume a cap slot regardless of sort order — it only proved that
    // below-threshold leads are skipped, not that ranking happens before
    // capping. This fixture uses three leads ALL above the 0.55 threshold
    // with distinct scores, fed to the mock in ascending confidence order so
    // that fetch order and rank order diverge. Removing the pre-send sort
    // would change which two get the cap.
    //
    // Scores (max-age 30, fresh leads):
    //   lead_lo  — referrer only:         0.30 + 0.30 = 0.60
    //   lead_mid — ICP + city:            0.30 + 0.20 + 0.05 = 0.55  (at threshold)
    //   lead_hi  — referrer + ICP:        0.30 + 0.30 + 0.20 = 0.80
    //
    // Fetch order fed to mock: [lo, mid, hi]
    // Ranked order (descending):          [hi (0.80), lo (0.60), mid (0.55)]
    // cap=2 → hi + lo are emailed; mid is NOT
    //
    // Without sort, cap=2 iterates fetch order: lo (sent=1) + mid (sent=2);
    // hi is skipped because the cap is exhausted. The assertion below fails
    // in that case, proving the sort is load-bearing.
    const FRESH_ISO = new Date(NOW.getTime() - 5 * 86_400_000).toISOString();
    LEADS = [
      // lo: 0.60 — first in fetch order, second in ranked order
      { email: "lo@example.com",  business_name: null, city: null,     vertical: "other",        referrer: "blog", created_at: FRESH_ISO },
      // mid: 0.55 — second in fetch order, last in ranked order
      { email: "mid@example.com", business_name: null, city: "Austin", vertical: "coffee_shops", referrer: null,   created_at: FRESH_ISO },
      // hi: 0.80 — last in fetch order, first in ranked order
      { email: "hi@example.com",  business_name: null, city: null,     vertical: "coffee_shops", referrer: "conf", created_at: FRESH_ISO },
    ];

    await run(true, 2);

    const sent = QUEUED.map((q) => q.to).sort();
    expect(sent).toEqual(["hi@example.com", "lo@example.com"].sort());
    // mid scored lowest of the three; the cap should have been spent on hi + lo
    expect(QUEUED).not.toContainEqual(expect.objectContaining({ to: "mid@example.com" }));
  });

  it("emails nobody when every lead is below threshold", async () => {
    LEADS = Array.from({ length: 5 }, (_, i) => ({
      email: `cold${i}@example.com`,
      business_name: null,
      city: null,
      vertical: "other",
      referrer: null,
      created_at: new Date(NOW.getTime() - 5 * 86_400_000).toISOString(),
    }));

    const decisions = await run(true, 25);

    expect(QUEUED).toEqual([]);
    expect(decisions.every((d) => !d.executed)).toBe(true);
  });
});

describe("acquisition agent — outbound copy compliance", () => {
  it("never offers a perk for a review (Google/Yelp/TripAdvisor reviews are banned)", async () => {
    LEADS = [hotLead(0)];
    const mod = await import("../acquisition-agent");
    void mod;

    await run(true, 5);

    // The invite pairs a reward with a list of actions; "review" must not be
    // among them — incentivized reviews violate Google/Yelp ToS and the FTC
    // rule, and the platform's own launch route 422s those actions.
    expect(QUEUED).toHaveLength(1);
    const body = JSON.stringify(QUEUED[0]);
    expect(body).not.toMatch(/a review/i);
  });
});
