/**
 * Payout durability tests — prove the influencer→Connect-account mapping and
 * payout history survive a serverless cold start (the bug the v7 tables fix).
 *
 * Uses the InMemoryConnection durable row store (same path prod uses against
 * Postgres), so durability is exercised end-to-end, not mocked.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  createConnectAccount,
  requestPayout,
  getAccountStatus,
  getPayoutHistory,
  handleAccountUpdated,
  hydratePayouts,
  payoutAccounts,
  payoutRequests,
  _resetStores,
  __resetPayoutCacheForTests,
} from "../index";
import { recordEarning } from "../../earnings";

// requestPayout caps payouts at the influencer's earned balance, so seed a
// generous balance for the ids these durability tests pay out to.
function seedEarnings(influencerId: string) {
  return recordEarning({
    influencerId,
    campaignId: "camp_seed",
    businessId: "biz_seed",
    submissionId: `sub_seed_${influencerId}`,
    amountCents: 1_000_000,
    currency: "usd",
    payoutId: null,
    payoutAt: null,
  });
}

describe("Payouts durability (survives cold start)", () => {
  beforeEach(async () => {
    _resetStores();
    for (const id of ["inf_dur", "inf_multi", "inf_once"]) await seedEarnings(id);
  });

  it("rehydrates the account mapping + payout history from the durable store", async () => {
    const created = await createConnectAccount("inf_dur", "d@example.com");
    const stripeAccountId = created.stripeAccountId;
    expect(stripeAccountId).toBeTruthy();

    // Onboarding completes (Stripe account.updated webhook) → enable payouts.
    await handleAccountUpdated(stripeAccountId!, true, true);
    const payout = await requestPayout("inf_dur", 2500);
    expect(payout.amount).toBe(2500);

    // Simulate a serverless cold start: in-memory cache gone, durable rows kept.
    __resetPayoutCacheForTests();
    expect(payoutAccounts.size).toBe(0);
    expect(payoutRequests.size).toBe(0);

    // Rehydrate from the durable store.
    await hydratePayouts();

    const account = await getAccountStatus("inf_dur");
    expect(account).not.toBeNull();
    expect(account!.stripeAccountId).toBe(stripeAccountId); // mapping survived
    expect(account!.payoutsEnabled).toBe(true);
    expect(account!.status).toBe("active");

    const history = getPayoutHistory("inf_dur");
    expect(history).toHaveLength(1);
    expect(history[0].amount).toBe(2500);
    expect(history[0].id).toBe(payout.id);
  });

  it("preserves all payout history across repeated cold starts", async () => {
    await createConnectAccount("inf_multi", "m@example.com");
    const acct = payoutAccounts.get("inf_multi")!;
    await handleAccountUpdated(acct.stripeAccountId!, true, true);
    await requestPayout("inf_multi", 1500);
    await requestPayout("inf_multi", 3000);

    for (let i = 0; i < 3; i++) {
      __resetPayoutCacheForTests();
      await hydratePayouts();
    }

    const history = getPayoutHistory("inf_multi");
    expect(history).toHaveLength(2);
    expect(new Set(history.map((p) => p.amount))).toEqual(new Set([1500, 3000]));
  });

  it("does not re-create a Connect account that already exists durably", async () => {
    const first = await createConnectAccount("inf_once", "o@example.com");

    // Cold start, rehydrate, then a second create attempt must return the same account.
    __resetPayoutCacheForTests();
    await hydratePayouts();
    const second = await createConnectAccount("inf_once", "o@example.com");

    expect(second.stripeAccountId).toBe(first.stripeAccountId);
    expect(payoutAccounts.size).toBe(1);
  });
});
