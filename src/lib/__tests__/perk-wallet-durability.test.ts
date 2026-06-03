/**
 * Perk Wallet — durability tests
 *
 * Proves the wallet survives a serverless cold start: award/redeem are
 * persisted to the durable backing store and rehydrated into the cache. These
 * run against InMemoryConnection, but exercise the SAME persist/hydrate code
 * path that talks to Postgres in production (the store branch vs the SQL
 * branch share structure), so a regression that drops durability fails here.
 *
 * This is the test the audit flagged as missing: the existing perk-wallet
 * suite asserts only the in-memory cache, which stayed green while the product
 * lost data on every deploy.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  awardPerk,
  persistPerk,
  safeRedeemPerk,
  getWallet,
  hydrateWallets,
  clearStore,
  __resetWalletCacheForTests,
} from "@/lib/perk-wallet";

describe("PerkWallet durability", () => {
  beforeEach(() => {
    // Clears the cache AND the durable backing rows, and resets hydration.
    clearStore();
  });

  it("restores earned perks from durable storage after a cold start", async () => {
    const award = awardPerk("user_1", "biz_1", "camp_1", "sub_1", 25, "dol");
    expect(award.success).toBe(true);
    await persistPerk(award.data!, "user_1", "biz_1");

    // Sanity: the live cache has it.
    expect(getWallet("user_1", "biz_1").perks).toHaveLength(1);

    // Simulate a serverless cold start: cache gone, durable rows remain.
    __resetWalletCacheForTests();
    expect(getWallet("user_1", "biz_1").perks).toHaveLength(0);

    // Rehydrate from durable storage.
    await hydrateWallets();

    const wallet = getWallet("user_1", "biz_1");
    expect(wallet.perks).toHaveLength(1);
    expect(wallet.perks[0].id).toBe(award.data!.id);
    expect(wallet.perks[0].value).toBe(25);
    expect(wallet.perks[0].redemptionCode).toBe(award.data!.redemptionCode);
    expect(wallet.totalAvailable).toBe(25);
    expect(wallet.activeCount).toBe(1);
  });

  it("persists redemption status across a cold start", async () => {
    const award = awardPerk("user_2", "biz_2", "camp_2", "sub_2", 10, "dol");
    await persistPerk(award.data!, "user_2", "biz_2");

    const redeem = await safeRedeemPerk(award.data!.id, "user_2");
    expect(redeem.success).toBe(true);

    // Cold start, then rehydrate.
    __resetWalletCacheForTests();
    await hydrateWallets();

    const wallet = getWallet("user_2", "biz_2");
    expect(wallet.perks).toHaveLength(1);
    expect(wallet.perks[0].status).toBe("redeemed");
    expect(wallet.perks[0].redeemedAt).not.toBeNull();
    expect(wallet.redeemedCount).toBe(1);
    expect(wallet.activeCount).toBe(0);
    expect(wallet.totalAvailable).toBe(0);
  });

  it("keeps the duplicate-award guard working after rehydration", async () => {
    const first = awardPerk("user_3", "biz_3", "camp_3", "sub_3", 5, "dol");
    expect(first.success).toBe(true);
    await persistPerk(first.data!, "user_3", "biz_3");

    // Cold start wiped the cache; the guard must still catch a re-award.
    __resetWalletCacheForTests();
    await hydrateWallets();

    const dup = awardPerk("user_3", "biz_3", "camp_3", "sub_3", 5, "dol");
    expect(dup.success).toBe(false);
    expect(dup.error?.code).toBe("DUPLICATE_AWARD");
  });

  it("clearStore isolates durable rows between tests", async () => {
    // Nothing was persisted in this test; hydration must find an empty store.
    __resetWalletCacheForTests();
    await hydrateWallets();
    expect(getWallet("user_1", "biz_1").perks).toHaveLength(0);
    expect(getWallet("user_2", "biz_2").perks).toHaveLength(0);
    expect(getWallet("user_3", "biz_3").perks).toHaveLength(0);
  });

  it("hydrates multiple users and businesses independently", async () => {
    const a = awardPerk("alice", "cafe", "c1", "s1", 15, "dol");
    const b = awardPerk("bob", "cafe", "c1", "s2", 20, "dol");
    const c = awardPerk("alice", "gym", "c2", "s3", 30, "dol");
    await persistPerk(a.data!, "alice", "cafe");
    await persistPerk(b.data!, "bob", "cafe");
    await persistPerk(c.data!, "alice", "gym");

    __resetWalletCacheForTests();
    await hydrateWallets();

    expect(getWallet("alice", "cafe").totalAvailable).toBe(15);
    expect(getWallet("bob", "cafe").totalAvailable).toBe(20);
    expect(getWallet("alice", "gym").totalAvailable).toBe(30);
    // getWallet(userId) returns all wallets for that user across businesses.
    expect(getWallet("alice")).toHaveLength(2);
  });
});
