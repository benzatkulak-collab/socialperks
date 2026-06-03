/**
 * Referral ledger durability — proves referral records + per-business codes
 * survive a serverless cold start, so the billing webhook can still credit the
 * referrer on paid conversion and shared links keep resolving.
 *
 * The lib functions are synchronous (cache mutation); routes persist the
 * returned record + warm the cache — this test exercises that same contract.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  generateReferralCode,
  trackReferralSignup,
  createReferral,
  findReferralByReferee,
  getReferralsByReferrer,
  creditReferral,
  persistReferral,
  persistBusinessCode,
  hydrateReferrals,
  _resetReferrals,
  __resetReferralCacheForTests,
} from "../index";

describe("Referrals durability (survives cold start)", () => {
  beforeEach(() => _resetReferrals());

  it("keeps each business's referral code stable across a cold start", async () => {
    const code = generateReferralCode("biz_dur");
    await persistBusinessCode("biz_dur", code);

    __resetReferralCacheForTests(); // serverless cold start
    await hydrateReferrals();

    // Same business must get the SAME code back, or shared /ref/<code> links rot.
    expect(generateReferralCode("biz_dur")).toBe(code);
  });

  it("rehydrates a signed-up referral so the billing webhook can still credit it", async () => {
    const code = generateReferralCode("biz_ref");
    await persistBusinessCode("biz_ref", code);
    const ref = trackReferralSignup(code, "usr_referee", "referee@example.com");
    await persistReferral(ref);
    expect(ref.status).toBe("signed_up");
    expect(ref.referrerId).toBe("biz_ref");

    __resetReferralCacheForTests(); // cold start
    await hydrateReferrals();

    // The referee→referral mapping the billing webhook depends on survived.
    const found = findReferralByReferee("usr_referee");
    expect(found).not.toBeNull();
    expect(found!.id).toBe(ref.id);
    expect(found!.referrerId).toBe("biz_ref"); // resolved, not "unknown"

    // …and it can actually be credited after the cold start.
    const credited = creditReferral(found!.id);
    expect(credited.status).toBe("credited");
  });

  it("rehydrates pending referrals into the referrer index", async () => {
    const code = generateReferralCode("biz_x");
    await persistBusinessCode("biz_x", code);
    const r = createReferral("biz_x", "owner@x.com", "friend@y.com", code);
    await persistReferral(r);

    __resetReferralCacheForTests();
    await hydrateReferrals();

    const list = getReferralsByReferrer("biz_x");
    expect(list).toHaveLength(1);
    expect(list[0].id).toBe(r.id);
    expect(list[0].status).toBe("pending");
  });
});
