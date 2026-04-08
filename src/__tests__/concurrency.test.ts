import { describe, it, expect, beforeEach } from 'vitest';
import { campaignManager } from '@/lib/campaign-state-machine';
import { awardPerk, redeemPerk, safeRedeemPerk, clearStore } from '@/lib/perk-wallet';

// ─── Campaign Budget Lock Tests ──────────────────────────────────────────────

describe('Campaign budget concurrency (withBudgetLock)', () => {
  beforeEach(() => {
    campaignManager._reset();
  });

  it('concurrent budget spends do not exceed the budget', async () => {
    // Launch a campaign with a $100 budget
    const lc = campaignManager.launch('conc-budget-1', 'biz-1', {
      name: 'Budget Race Test',
      budgetAllocated: 100,
      budgetType: 'dol',
      maxCompletions: null,
      expiresInDays: 30,
    });

    expect(lc.state).toBe('active');
    expect(lc.budget.allocated).toBe(100);

    // Fire 10 concurrent checkAndSpendBudget calls, each for $15.
    // Total would be $150 if all passed — only 6 should succeed ($90) and the 7th
    // would push past $100, so 6 successes max.
    const promises = Array.from({ length: 10 }, () =>
      campaignManager.checkAndSpendBudget('conc-budget-1', 15)
    );

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.withinBudget).length;
    const failCount = results.filter((r) => !r.withinBudget).length;

    // At most 6 can succeed (6 * $15 = $90 <= $100, but 7 * $15 = $105 > $100)
    expect(successCount).toBe(6);
    expect(failCount).toBe(4);

    // Budget spent should be exactly $90
    const state = campaignManager.getState('conc-budget-1')!;
    expect(state.budget.spent).toBe(90);
  });

  it('budget lock serializes concurrent access', async () => {
    campaignManager.launch('conc-serial-1', 'biz-2', {
      name: 'Serialize Test',
      budgetAllocated: 50,
      budgetType: 'dol',
      maxCompletions: null,
      expiresInDays: 30,
    });

    // 5 concurrent requests for $10 each — exactly $50 = allocated, all should pass
    const promises = Array.from({ length: 5 }, () =>
      campaignManager.checkAndSpendBudget('conc-serial-1', 10)
    );

    const results = await Promise.all(promises);
    const allSucceeded = results.every((r) => r.withinBudget);
    expect(allSucceeded).toBe(true);

    const state = campaignManager.getState('conc-serial-1')!;
    expect(state.budget.spent).toBe(50);

    // One more should fail
    const extra = await campaignManager.checkAndSpendBudget('conc-serial-1', 10);
    expect(extra.withinBudget).toBe(false);
  });

  it('lock is released even when an error occurs', async () => {
    // Campaign does not exist — checkAndSpendBudget should throw
    const promise = campaignManager.checkAndSpendBudget('nonexistent', 10);
    await expect(promise).rejects.toThrow('not found');

    // Verify we can still use the system for other campaigns
    campaignManager.launch('conc-after-error', 'biz-3', {
      name: 'After Error',
      budgetAllocated: 100,
      budgetType: 'dol',
      maxCompletions: null,
      expiresInDays: 30,
    });

    const result = await campaignManager.checkAndSpendBudget('conc-after-error', 10);
    expect(result.withinBudget).toBe(true);
  });
});

// ─── Perk Redemption Lock Tests ──────────────────────────────────────────────

describe('Perk redemption concurrency (withRedemptionLock)', () => {
  beforeEach(() => {
    clearStore();
  });

  it('concurrent perk redemptions do not double-redeem', async () => {
    // Award a perk first
    const award = awardPerk('user-1', 'biz-1', 'camp-1', 'sub-1', 10, 'dol', 30);
    expect(award.success).toBe(true);
    const perkId = award.data!.id;

    // Fire 10 concurrent safeRedeemPerk calls for the same perk
    const promises = Array.from({ length: 10 }, () =>
      safeRedeemPerk(perkId, 'user-1')
    );

    const results = await Promise.all(promises);

    const successCount = results.filter((r) => r.success).length;
    const failCount = results.filter((r) => !r.success).length;

    // Exactly 1 should succeed, 9 should fail with ALREADY_REDEEMED
    expect(successCount).toBe(1);
    expect(failCount).toBe(9);

    // The failures should have ALREADY_REDEEMED error code
    const failures = results.filter((r) => !r.success);
    for (const f of failures) {
      expect(f.error!.code).toBe('ALREADY_REDEEMED');
    }
  });

  it('different perks can be redeemed concurrently without interference', async () => {
    // Award multiple perks
    const award1 = awardPerk('user-2', 'biz-2', 'camp-2', 'sub-a', 5, 'dol', 30);
    const award2 = awardPerk('user-2', 'biz-2', 'camp-2', 'sub-b', 7, 'dol', 30);
    const award3 = awardPerk('user-2', 'biz-2', 'camp-2', 'sub-c', 9, 'dol', 30);

    expect(award1.success).toBe(true);
    expect(award2.success).toBe(true);
    expect(award3.success).toBe(true);

    // Redeem all three concurrently
    const [r1, r2, r3] = await Promise.all([
      safeRedeemPerk(award1.data!.id, 'user-2'),
      safeRedeemPerk(award2.data!.id, 'user-2'),
      safeRedeemPerk(award3.data!.id, 'user-2'),
    ]);

    expect(r1.success).toBe(true);
    expect(r2.success).toBe(true);
    expect(r3.success).toBe(true);
  });

  it('lock is released after redemption error', async () => {
    // Award a perk
    const award = awardPerk('user-3', 'biz-3', 'camp-3', 'sub-d', 10, 'dol', 30);
    expect(award.success).toBe(true);
    const perkId = award.data!.id;

    // Try to redeem with wrong user (should fail but not block the lock)
    const wrongUser = await safeRedeemPerk(perkId, 'wrong-user');
    expect(wrongUser.success).toBe(false);

    // Now redeem with correct user — should succeed
    const correctUser = await safeRedeemPerk(perkId, 'user-3');
    expect(correctUser.success).toBe(true);
  });
});
