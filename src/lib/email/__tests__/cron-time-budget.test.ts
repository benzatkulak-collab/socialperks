import { describe, it, expect } from "vitest";
import { sendDripBatch, type DripEntry } from "../waitlist-drip";
import { businessesAfter } from "../send-weekly-digests";
import type { EmailProvider } from "../index";
import type { TimeBudget } from "@/lib/cron/time-budget";

// Netlify Free stops a function after 10s. These jobs must stop at their
// time budget and report what's left, rather than be killed mid-batch.

const entries: DripEntry[] = ["a@x.com", "b@x.com", "c@x.com"].map((email) => ({
  email,
  vertical: "cafe",
  createdAt: new Date().toISOString(),
}));

function countingProvider(): EmailProvider & { sent: string[] } {
  const sent: string[] = [];
  return {
    sent,
    async send(m) {
      sent.push(m.to);
      return { success: true, messageId: "m" };
    },
  } as EmailProvider & { sent: string[] };
}

/** Budget that expires after `n` checks. */
function budgetOf(n: number): TimeBudget {
  let checks = 0;
  return { expired: () => checks++ >= n, remainingMs: () => 0 };
}

describe("sendDripBatch time budget", () => {
  it("sends everything and reports no more work when the budget holds", async () => {
    const provider = countingProvider();
    const r = await sendDripBatch(entries, "day3", { provider });
    expect(r).toMatchObject({ sent: 3, failed: 0, more: false });
    expect(r.attempted).toEqual(["a@x.com", "b@x.com", "c@x.com"]);
  });

  it("stops when the budget runs out and lists only what it attempted", async () => {
    const provider = countingProvider();
    const r = await sendDripBatch(entries, "day7", { provider, budget: budgetOf(2) });
    expect(provider.sent).toEqual(["a@x.com", "b@x.com"]);
    expect(r).toMatchObject({ sent: 2, more: true });
    expect(r.attempted).toEqual(["a@x.com", "b@x.com"]);
  });

  it("counts a send that throws as attempted, so it isn't retried forever", async () => {
    const provider = {
      async send() {
        throw new Error("boom");
      },
    } as unknown as EmailProvider;
    const r = await sendDripBatch(entries.slice(0, 1), "day3", { provider });
    expect(r).toMatchObject({ sent: 0, failed: 1, more: false, attempted: ["a@x.com"] });
  });
});

describe("businessesAfter", () => {
  const rows = [{ id: "c" }, { id: "a" }, { id: "b" }];

  it("orders by id so a resumed run is deterministic", () => {
    expect(businessesAfter(rows).map((r) => r.id)).toEqual(["a", "b", "c"]);
  });

  it("skips businesses at or before the cursor", () => {
    expect(businessesAfter(rows, "a").map((r) => r.id)).toEqual(["b", "c"]);
    expect(businessesAfter(rows, "c")).toEqual([]);
  });
});
