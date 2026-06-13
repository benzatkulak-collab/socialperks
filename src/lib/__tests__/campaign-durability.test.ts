/**
 * Campaign lifecycle — durability tests
 *
 * Proves a launched campaign survives a serverless cold start: launch/transition
 * are persisted to `launched_campaign_state` and rehydrated into the manager.
 * These run against InMemoryConnection but exercise the SAME persist/hydrate code
 * path that talks to Postgres in production.
 *
 * This is the "dashboard amnesia" bug the audit flagged: the old persist wrote to
 * the v1 UUID/FK `launched_campaigns` table with mismatched columns (silently
 * rejected for TEXT `camp_`/`biz_` ids) and `loadLifecyclesForBusiness` had no
 * callers — so a returning owner saw zero campaigns after every deploy.
 */

import { describe, it, expect, beforeEach } from "vitest";
import { campaignManager } from "@/lib/campaign-state-machine";
import {
  persistLifecycle,
  loadLifecycle,
  ensureBusinessCampaignsLoaded,
  ensureCampaignLoaded,
  clearCampaignStore,
  __resetCampaignHydrationForTests,
} from "@/lib/campaign-state-machine/persist";

/** Simulate a serverless cold start: wipe the manager's Map + the load guard,
 *  but keep the durable rows. */
function coldStart(): void {
  campaignManager._reset();
  __resetCampaignHydrationForTests();
}

describe("Campaign durability", () => {
  beforeEach(() => {
    campaignManager._reset();
    clearCampaignStore();
  });

  it("restores a launched campaign (state, budget, actions) after a cold start", async () => {
    const lc = campaignManager.launch("camp_d1", "biz_d1", {
      name: "Story Tag Special",
      budgetAllocated: 15,
      budgetType: "pct",
      maxCompletions: 100,
      expiresInDays: 30,
      actions: ["ig_st", "ig_rl"],
    });
    await persistLifecycle(lc, { name: "Story Tag Special", actions: ["ig_st", "ig_rl"] });
    expect(lc.state).toBe("active");

    coldStart();
    expect(campaignManager.getState("camp_d1")).toBeUndefined();

    const restored = await loadLifecycle("camp_d1");
    expect(restored).not.toBeNull();
    expect(restored!.businessId).toBe("biz_d1");
    expect(restored!.state).toBe("active");
    expect(restored!.budget.allocated).toBe(15);
    expect(restored!.budget.type).toBe("pct");
    expect(restored!.completions.max).toBe(100);
    // actions must round-trip — the public claim page gates allowed actions on it.
    expect(restored!.actions).toEqual(["ig_st", "ig_rl"]);
    // name must round-trip — else the dashboard shows the raw camp_… id.
    expect(restored!.name).toBe("Story Tag Special");
  });

  it("rehydrates a business's full campaign list into the manager (dashboard fix)", async () => {
    const a = campaignManager.launch("camp_a", "biz_x", { name: "A", budgetAllocated: 10, budgetType: "pct", maxCompletions: null, expiresInDays: 30, actions: ["ig_st"] });
    const b = campaignManager.launch("camp_b", "biz_x", { name: "B", budgetAllocated: 5, budgetType: "dol", maxCompletions: 50, expiresInDays: 14, actions: ["tt_vd"] });
    await persistLifecycle(a, { name: "A" });
    await persistLifecycle(b, { name: "B" });

    coldStart();
    expect(campaignManager.listByBusiness("biz_x")).toHaveLength(0);

    await ensureBusinessCampaignsLoaded("biz_x");

    const list = campaignManager.listByBusiness("biz_x");
    expect(list).toHaveLength(2);
    expect(list.map((c) => c.id).sort()).toEqual(["camp_a", "camp_b"]);
  });

  it("persists a pause transition across a cold start", async () => {
    const lc = campaignManager.launch("camp_p", "biz_p", { name: "P", budgetAllocated: 20, budgetType: "pct", maxCompletions: null, expiresInDays: 30, actions: ["ig_st"] });
    await persistLifecycle(lc, { name: "P" });
    const paused = campaignManager.pause("camp_p", "biz_p", "holiday");
    await persistLifecycle(paused);
    expect(paused.state).toBe("paused");

    coldStart();
    const restored = await ensureCampaignLoaded("camp_p");
    expect(restored!.state).toBe("paused");
  });

  it("persists completion increments across a cold start", async () => {
    const lc = campaignManager.launch("camp_c", "biz_c", { name: "C", budgetAllocated: 10, budgetType: "pct", maxCompletions: 5, expiresInDays: 30, actions: ["ig_st"] });
    await persistLifecycle(lc, { name: "C" });
    const { lifecycle: after } = campaignManager.recordCompletion("camp_c");
    await persistLifecycle(after);
    expect(after.completions.current).toBe(1);

    coldStart();
    const restored = await loadLifecycle("camp_c");
    expect(restored!.completions.current).toBe(1);
  });
});
