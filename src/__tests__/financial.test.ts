import { describe, it, expect, beforeEach } from 'vitest';
import { FinancialLedger } from '@/lib/financial-ledger';

describe('FinancialLedger', () => {
  let ledger: FinancialLedger;

  beforeEach(() => {
    ledger = new FinancialLedger();
  });

  // ─── Double-entry bookkeeping ────────────────────────────────────────────

  describe('double-entry bookkeeping', () => {
    it('every debit has a matching credit of the same amount', () => {
      const acc1 = ledger.createAccount('biz-1', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('cust-1', 'customer', 'perk_balance');

      const entry = ledger.recordTransaction(
        'perk_awarded',
        acc1.id,
        acc2.id,
        25.5,
        'Test perk award',
        'camp-1',
        'campaign'
      );

      expect(entry.amount).toBe(25.5);
      expect(entry.debitAccountId).toBe(acc1.id);
      expect(entry.creditAccountId).toBe(acc2.id);

      // Debit decreases, credit increases
      expect(ledger.getBalance(acc1.id)).toBe(-25.5);
      expect(ledger.getBalance(acc2.id)).toBe(25.5);

      // Sum of all balances should be zero
      const totalBalance = ledger.getBalance(acc1.id) + ledger.getBalance(acc2.id);
      expect(totalBalance).toBe(0);
    });

    it('maintains zero-sum across multiple transactions', () => {
      const bizAcc = ledger.createAccount('biz-2', 'business', 'perk_balance');
      const custAcc = ledger.createAccount('cust-2', 'customer', 'perk_balance');
      const platAcc = ledger.createAccount('platform', 'platform', 'platform_revenue');

      // Award perk: biz -$50, cust +$50
      ledger.recordTransaction('perk_awarded', bizAcc.id, custAcc.id, 50, 'Award', 'c1', 'campaign');

      // Redeem perk: cust -$50, biz +$50
      ledger.recordTransaction('perk_redeemed', custAcc.id, bizAcc.id, 50, 'Redeem', 'p1', 'perk');

      // Platform fee: biz -$5, platform +$5
      ledger.recordTransaction('platform_fee', bizAcc.id, platAcc.id, 5, 'Fee', 'c1', 'campaign');

      const totalBalance =
        ledger.getBalance(bizAcc.id) +
        ledger.getBalance(custAcc.id) +
        ledger.getBalance(platAcc.id);

      expect(totalBalance).toBe(0);
    });

    it('handles high-precision amounts using integer-cent arithmetic', () => {
      const acc1 = ledger.createAccount('biz-fp', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('cust-fp', 'customer', 'perk_balance');

      // Multiple small amounts that could cause floating-point drift
      for (let i = 0; i < 100; i++) {
        ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 0.01, 'Micro perk', 'c', 'campaign');
      }

      // Should be exactly $1.00, not something like 0.9999999999...
      expect(ledger.getBalance(acc2.id)).toBe(1);
      expect(ledger.getBalance(acc1.id)).toBe(-1);
    });
  });

  // ─── Balance calculations ────────────────────────────────────────────────

  describe('balance calculations', () => {
    it('correct balances after multiple operations', () => {
      const bizAcc = ledger.createAccount('biz-bal', 'business', 'perk_balance');
      const custAcc = ledger.createAccount('cust-bal', 'customer', 'perk_balance');

      ledger.recordTransaction('perk_awarded', bizAcc.id, custAcc.id, 10, 'Award 1', 'c1', 'campaign');
      ledger.recordTransaction('perk_awarded', bizAcc.id, custAcc.id, 20, 'Award 2', 'c2', 'campaign');
      ledger.recordTransaction('perk_redeemed', custAcc.id, bizAcc.id, 15, 'Redeem 1', 'p1', 'perk');

      // Customer: +10 + 20 - 15 = 15
      expect(ledger.getBalance(custAcc.id)).toBe(15);
      // Business: -10 - 20 + 15 = -15
      expect(ledger.getBalance(bizAcc.id)).toBe(-15);
    });

    it('verifyBalance confirms consistency', () => {
      const acc1 = ledger.createAccount('verify-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('verify-cust', 'customer', 'perk_balance');

      ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 100, 'Award', 'c', 'campaign');

      const v1 = ledger.verifyBalance(acc1.id);
      expect(v1.isConsistent).toBe(true);
      expect(v1.discrepancy).toBe(0);
      expect(v1.storedBalance).toBe(-100);
      expect(v1.calculatedBalance).toBe(-100);

      const v2 = ledger.verifyBalance(acc2.id);
      expect(v2.isConsistent).toBe(true);
      expect(v2.storedBalance).toBe(100);
    });
  });

  // ─── Overflow protection ─────────────────────────────────────────────────

  describe('overflow protection', () => {
    it('evicts oldest entries when maxEntries is exceeded', () => {
      // The FinancialLedger has maxEntries = 200,000. We will create a fresh one
      // and simulate the eviction behavior by accessing internal state.
      const acc1 = ledger.createAccount('overflow-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('overflow-cust', 'customer', 'perk_balance');

      // Pre-populate entries near the limit by pushing directly
      const entries = ledger.getEntriesStore();
      for (let i = 0; i < 200_000; i++) {
        entries.push({
          id: `txn_filler_${i}`,
          type: 'perk_awarded',
          debitAccountId: acc1.id,
          creditAccountId: acc2.id,
          amount: 0.01,
          currency: 'USD',
          description: 'filler',
          relatedEntityId: 'x',
          relatedEntityType: 'x',
          createdAt: new Date().toISOString(),
          metadata: {},
        });
      }

      expect(entries.length).toBe(200_000);

      // Now record one more real transaction — this should trigger eviction
      ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 1, 'Over limit', 'c', 'campaign');

      // After eviction, the store should have fewer entries
      // Eviction removes 10% (20,000) of 200,000, then the new one is added
      // So: 200_001 - 20_000 = 180_001
      expect(entries.length).toBe(180_001);

      // A warning should have been accumulated
      const warnings = ledger.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('Evicting oldest'))).toBe(true);
    });

    it('warns when approaching the entry limit (90%)', () => {
      const acc1 = ledger.createAccount('warn-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('warn-cust', 'customer', 'perk_balance');

      // Pre-populate to 90% of limit
      const entries = ledger.getEntriesStore();
      for (let i = 0; i < 180_000; i++) {
        entries.push({
          id: `txn_warn_${i}`,
          type: 'perk_awarded',
          debitAccountId: acc1.id,
          creditAccountId: acc2.id,
          amount: 0.01,
          currency: 'USD',
          description: 'filler',
          relatedEntityId: 'x',
          relatedEntityType: 'x',
          createdAt: new Date().toISOString(),
          metadata: {},
        });
      }

      // Record one more — should trigger the 90% warning
      ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 1, 'Near limit', 'c', 'campaign');

      const warnings = ledger.getWarnings();
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings.some((w) => w.includes('Approaching entry limit'))).toBe(true);
    });
  });

  // ─── Warnings drain ──────────────────────────────────────────────────────

  describe('warnings system', () => {
    it('drainWarnings returns and clears warnings', () => {
      const acc1 = ledger.createAccount('drain-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('drain-cust', 'customer', 'perk_balance');

      // Pre-populate to trigger warning
      const entries = ledger.getEntriesStore();
      for (let i = 0; i < 180_001; i++) {
        entries.push({
          id: `txn_drain_${i}`,
          type: 'perk_awarded',
          debitAccountId: acc1.id,
          creditAccountId: acc2.id,
          amount: 0.01,
          currency: 'USD',
          description: 'filler',
          relatedEntityId: 'x',
          relatedEntityType: 'x',
          createdAt: new Date().toISOString(),
          metadata: {},
        });
      }

      ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 1, 'Trigger warning', 'c', 'campaign');

      const warnings = ledger.drainWarnings();
      expect(warnings.length).toBeGreaterThan(0);

      // After drain, warnings should be empty
      const afterDrain = ledger.getWarnings();
      expect(afterDrain.length).toBe(0);
    });

    it('getWarnings returns empty array when no warnings exist', () => {
      expect(ledger.getWarnings().length).toBe(0);
    });
  });

  // ─── Insufficient balance ────────────────────────────────────────────────

  describe('insufficient balance', () => {
    it('prevents withdrawal when customer has insufficient perk balance', () => {
      // Award a perk to give the customer some balance
      ledger.awardPerk('biz-insuf', 'cust-insuf', 10, 'camp-insuf');

      // Try to redeem more than the customer has
      expect(() => {
        ledger.redeemPerk('cust-insuf', 'biz-insuf', 20, 'perk-insuf');
      }).toThrow('Insufficient perk balance');
    });

    it('prevents influencer payout when earnings are insufficient', () => {
      // Record a small earning
      ledger.recordInfluencerEarning('inf-1', 'biz-inf', 50, 'camp-inf');

      // Try to pay out more than earned
      expect(() => {
        ledger.processInfluencerPayout('inf-1', 100);
      }).toThrow('Insufficient earnings balance');
    });

    it('allows redemption up to the exact available balance', () => {
      ledger.awardPerk('biz-exact', 'cust-exact', 25.50, 'camp-exact');

      // Should not throw — exact amount
      expect(() => {
        ledger.redeemPerk('cust-exact', 'biz-exact', 25.50, 'perk-exact');
      }).not.toThrow();

      // Customer balance should now be zero
      const custAcc = ledger.getAccountByOwner('cust-exact', 'perk_balance')!;
      expect(ledger.getBalance(custAcc.id)).toBe(0);
    });
  });

  // ─── Transaction validation ──────────────────────────────────────────────

  describe('transaction validation', () => {
    it('rejects zero amount', () => {
      const acc1 = ledger.createAccount('val-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('val-cust', 'customer', 'perk_balance');

      expect(() => {
        ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 0, 'Zero', 'c', 'campaign');
      }).toThrow('finite positive number');
    });

    it('rejects negative amount', () => {
      const acc1 = ledger.createAccount('neg-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('neg-cust', 'customer', 'perk_balance');

      expect(() => {
        ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, -10, 'Negative', 'c', 'campaign');
      }).toThrow('finite positive number');
    });

    it('rejects missing description', () => {
      const acc1 = ledger.createAccount('desc-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('desc-cust', 'customer', 'perk_balance');

      expect(() => {
        ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 10, '', 'c', 'campaign');
      }).toThrow('description is required');
    });

    it('rejects non-existent debit account', () => {
      const acc = ledger.createAccount('exist-cust', 'customer', 'perk_balance');

      expect(() => {
        ledger.recordTransaction('perk_awarded', 'fake-id', acc.id, 10, 'Test', 'c', 'campaign');
      }).toThrow('not found');
    });

    it('rejects non-existent credit account', () => {
      const acc = ledger.createAccount('exist-biz', 'business', 'perk_balance');

      expect(() => {
        ledger.recordTransaction('perk_awarded', acc.id, 'fake-id', 10, 'Test', 'c', 'campaign');
      }).toThrow('not found');
    });

    it('rejects currency mismatch between accounts', () => {
      const acc1 = ledger.createAccount('usd-biz', 'business', 'perk_balance', 'USD');
      const acc2 = ledger.createAccount('eur-cust', 'customer', 'perk_balance', 'EUR');

      expect(() => {
        ledger.recordTransaction('perk_awarded', acc1.id, acc2.id, 10, 'Mismatch', 'c', 'campaign');
      }).toThrow('Currency mismatch');
    });
  });

  // ─── Business operations ─────────────────────────────────────────────────

  describe('business operations', () => {
    it('awardPerk auto-creates accounts and records transaction', () => {
      const entry = ledger.awardPerk('biz-op', 'cust-op', 15, 'camp-op');

      expect(entry.type).toBe('perk_awarded');
      expect(entry.amount).toBe(15);

      const bizAcc = ledger.getAccountByOwner('biz-op', 'perk_balance')!;
      const custAcc = ledger.getAccountByOwner('cust-op', 'perk_balance')!;

      expect(ledger.getBalance(bizAcc.id)).toBe(-15);
      expect(ledger.getBalance(custAcc.id)).toBe(15);
    });

    it('chargeSubscription debits business and credits platform', () => {
      const entry = ledger.chargeSubscription('biz-sub', 29.99);

      expect(entry.type).toBe('subscription_charge');
      expect(entry.amount).toBe(29.99);

      const bizAcc = ledger.getAccountByOwner('biz-sub', 'subscription')!;
      const platAcc = ledger.getAccountByOwner('platform', 'platform_revenue')!;

      expect(ledger.getBalance(bizAcc.id)).toBe(-29.99);
      expect(ledger.getBalance(platAcc.id)).toBe(29.99);
    });

    it('refund reverses a transaction', () => {
      const original = ledger.awardPerk('biz-refund', 'cust-refund', 30, 'camp-refund');
      const refund = ledger.refund(original.id, 'Customer requested');

      expect(refund.type).toBe('refund');
      expect(refund.amount).toBe(30);

      // Both balances should be back to zero
      const bizAcc = ledger.getAccountByOwner('biz-refund', 'perk_balance')!;
      const custAcc = ledger.getAccountByOwner('cust-refund', 'perk_balance')!;

      expect(ledger.getBalance(bizAcc.id)).toBe(0);
      expect(ledger.getBalance(custAcc.id)).toBe(0);
    });
  });

  // ─── Account creation ────────────────────────────────────────────────────

  describe('account creation', () => {
    it('prevents duplicate accounts for same owner + type', () => {
      ledger.createAccount('dup-owner', 'business', 'perk_balance');
      expect(() => {
        ledger.createAccount('dup-owner', 'business', 'perk_balance');
      }).toThrow('already exists');
    });

    it('allows same owner to have different account types', () => {
      const acc1 = ledger.createAccount('multi-biz', 'business', 'perk_balance');
      const acc2 = ledger.createAccount('multi-biz', 'business', 'subscription');

      expect(acc1.id).not.toBe(acc2.id);
      expect(acc1.type).toBe('perk_balance');
      expect(acc2.type).toBe('subscription');
    });

    it('rejects missing ownerId', () => {
      expect(() => {
        ledger.createAccount('', 'business', 'perk_balance');
      }).toThrow('ownerId is required');
    });
  });

  // ─── Clear ───────────────────────────────────────────────────────────────

  describe('clear', () => {
    it('removes all accounts and entries', () => {
      ledger.awardPerk('biz-clear', 'cust-clear', 10, 'camp-clear');

      expect(ledger.getAccountCount()).toBeGreaterThan(0);
      expect(ledger.getEntryCount()).toBeGreaterThan(0);

      ledger.clear();

      expect(ledger.getAccountCount()).toBe(0);
      expect(ledger.getEntryCount()).toBe(0);
    });
  });
});
