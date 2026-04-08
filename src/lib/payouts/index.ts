// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Payout Management (Stripe Connect)
//
// Uses real Stripe Connect Express accounts when configured, falling back to
// mock data for dev/demo mode. Manages influencer payout accounts, onboarding,
// and transfer lifecycle.
// ══════════════════════════════════════════════════════════════════════════════

import { stripe, isStripeConfigured } from "@/lib/stripe";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface PayoutAccount {
  influencerId: string;
  stripeAccountId: string | null; // Stripe Connect account ID
  status: "pending" | "active" | "restricted";
  onboardingUrl: string | null;
  payoutsEnabled: boolean;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  influencerId: string;
  amount: number; // in cents
  currency: string;
  status: "pending" | "processing" | "completed" | "failed";
  stripeTransferId: string | null;
  createdAt: string;
  completedAt: string | null;
  failureReason: string | null;
}

// ─── In-Memory Store (mock — production uses Stripe + DB) ──────────────────

export const payoutAccounts = new Map<string, PayoutAccount>();
export const payoutRequests = new Map<string, PayoutRequest>();

// Index: influencerId -> list of payout request IDs
const influencerPayouts = new Map<string, string[]>();

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 24)}`;
}

function addPayoutToIndex(influencerId: string, payoutId: string): void {
  const existing = influencerPayouts.get(influencerId) ?? [];
  existing.push(payoutId);
  influencerPayouts.set(influencerId, existing);
}

// ─── Account Management ─────────────────────────────────────────────────────

/**
 * Create a Stripe Connect Express account for an influencer.
 * Uses real Stripe when configured, otherwise returns mock data.
 */
export async function createConnectAccount(
  influencerId: string,
  email: string
): Promise<PayoutAccount & { mock?: boolean }> {
  // Check if account already exists
  const existing = payoutAccounts.get(influencerId);
  if (existing) {
    return existing;
  }

  const now = new Date().toISOString();

  // Real Stripe Connect
  if (stripe && isStripeConfigured()) {
    try {
      const account = await stripe.accounts.create({
        type: "express",
        email,
        capabilities: {
          transfers: { requested: true },
        },
        metadata: {
          influencerId,
          platform: "social-perks",
        },
      });

      const payoutAccount: PayoutAccount = {
        influencerId,
        stripeAccountId: account.id,
        status: "pending",
        onboardingUrl: null,
        payoutsEnabled: false,
        createdAt: now,
      };

      payoutAccounts.set(influencerId, payoutAccount);
      console.info(
        `[Payouts] Created Stripe Connect account ${account.id} for influencer ${influencerId}`
      );

      return payoutAccount;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create Connect account";
      throw new Error(message);
    }
  }

  // Mock mode
  const mockAccountId = generateId("acct");
  const payoutAccount: PayoutAccount = {
    influencerId,
    stripeAccountId: mockAccountId,
    status: "pending",
    onboardingUrl: null,
    payoutsEnabled: false,
    createdAt: now,
  };

  payoutAccounts.set(influencerId, payoutAccount);
  console.info(
    `[Payouts] Created mock Connect account ${mockAccountId} for influencer ${influencerId}`
  );

  return { ...payoutAccount, mock: true };
}

/**
 * Get a Stripe Connect onboarding link for the influencer.
 */
export async function getOnboardingLink(
  influencerId: string,
  returnUrl: string,
  refreshUrl: string
): Promise<{ url: string; mock?: boolean }> {
  const account = payoutAccounts.get(influencerId);
  if (!account) {
    throw new Error("No payout account found. Create one first.");
  }

  if (!account.stripeAccountId) {
    throw new Error("Account has no Stripe account ID.");
  }

  // Real Stripe
  if (stripe && isStripeConfigured()) {
    try {
      const accountLink = await stripe.accountLinks.create({
        account: account.stripeAccountId,
        return_url: returnUrl,
        refresh_url: refreshUrl,
        type: "account_onboarding",
      });

      // Cache the onboarding URL
      payoutAccounts.set(influencerId, {
        ...account,
        onboardingUrl: accountLink.url,
      });

      return { url: accountLink.url };
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create onboarding link";
      throw new Error(message);
    }
  }

  // Mock mode
  const mockUrl = `https://connect.stripe.com/express/onboarding/${account.stripeAccountId}?return_url=${encodeURIComponent(returnUrl)}&refresh_url=${encodeURIComponent(refreshUrl)}`;

  payoutAccounts.set(influencerId, {
    ...account,
    onboardingUrl: mockUrl,
  });

  return { url: mockUrl, mock: true };
}

/**
 * Get current payout account status for an influencer.
 */
export async function getAccountStatus(
  influencerId: string
): Promise<(PayoutAccount & { mock?: boolean }) | null> {
  const account = payoutAccounts.get(influencerId);
  if (!account) return null;

  // Real Stripe — refresh status from Stripe
  if (stripe && isStripeConfigured() && account.stripeAccountId) {
    try {
      const stripeAccount = await stripe.accounts.retrieve(
        account.stripeAccountId
      );

      const updatedAccount: PayoutAccount = {
        ...account,
        status: stripeAccount.details_submitted
          ? stripeAccount.payouts_enabled
            ? "active"
            : "restricted"
          : "pending",
        payoutsEnabled: stripeAccount.payouts_enabled ?? false,
      };

      payoutAccounts.set(influencerId, updatedAccount);
      return updatedAccount;
    } catch (e) {
      console.warn(
        `[Payouts] Failed to refresh account status: ${e instanceof Error ? e.message : "unknown"}`
      );
      // Fall through to return cached status
    }
  }

  // Mock or cached
  return isStripeConfigured()
    ? account
    : { ...account, mock: true };
}

/**
 * Request a payout (transfer) to the influencer's connected account.
 * Amount is in cents. Minimum $10.00 (1000 cents).
 */
export async function requestPayout(
  influencerId: string,
  amount: number,
  currency = "usd"
): Promise<PayoutRequest & { mock?: boolean }> {
  const account = payoutAccounts.get(influencerId);
  if (!account) {
    throw new Error("No payout account found. Create one first.");
  }

  if (!account.stripeAccountId) {
    throw new Error("Account has no Stripe account ID.");
  }

  if (!account.payoutsEnabled && account.status !== "active") {
    throw new Error(
      "Payouts are not enabled on this account. Complete onboarding first."
    );
  }

  if (amount < 1000) {
    throw new Error("Minimum payout amount is $10.00 (1000 cents).");
  }

  const now = new Date().toISOString();
  const payoutId = generateId("po");

  // Real Stripe
  if (stripe && isStripeConfigured()) {
    try {
      const transfer = await stripe.transfers.create({
        amount,
        currency,
        destination: account.stripeAccountId,
        metadata: {
          influencerId,
          payoutId,
          platform: "social-perks",
        },
      });

      const payout: PayoutRequest = {
        id: payoutId,
        influencerId,
        amount,
        currency,
        status: "processing",
        stripeTransferId: transfer.id,
        createdAt: now,
        completedAt: null,
        failureReason: null,
      };

      payoutRequests.set(payoutId, payout);
      addPayoutToIndex(influencerId, payoutId);

      console.info(
        `[Payouts] Created transfer ${transfer.id} for $${(amount / 100).toFixed(2)} to ${account.stripeAccountId}`
      );

      return payout;
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create transfer";

      // Record the failed payout
      const failedPayout: PayoutRequest = {
        id: payoutId,
        influencerId,
        amount,
        currency,
        status: "failed",
        stripeTransferId: null,
        createdAt: now,
        completedAt: now,
        failureReason: message,
      };

      payoutRequests.set(payoutId, failedPayout);
      addPayoutToIndex(influencerId, payoutId);

      throw new Error(message);
    }
  }

  // Mock mode — simulate successful transfer
  const mockTransferId = generateId("tr");
  const payout: PayoutRequest = {
    id: payoutId,
    influencerId,
    amount,
    currency,
    status: "processing",
    stripeTransferId: mockTransferId,
    createdAt: now,
    completedAt: null,
    failureReason: null,
  };

  payoutRequests.set(payoutId, payout);
  addPayoutToIndex(influencerId, payoutId);

  console.info(
    `[Payouts] Created mock transfer ${mockTransferId} for $${(amount / 100).toFixed(2)}`
  );

  return { ...payout, mock: true };
}

/**
 * Get payout history for an influencer.
 * Returns payouts sorted newest-first (by insertion order, most recent last in the index).
 */
export function getPayoutHistory(
  influencerId: string
): PayoutRequest[] {
  const payoutIds = influencerPayouts.get(influencerId) ?? [];
  return payoutIds
    .map((id) => payoutRequests.get(id))
    .filter((p): p is PayoutRequest => p != null)
    .reverse(); // Index is insertion-ordered; reverse gives newest first
}

// ─── Webhook Handlers (called by webhook route) ────────────────────────────

/**
 * Update account status when Stripe sends account.updated event.
 */
export function handleAccountUpdated(
  stripeAccountId: string,
  detailsSubmitted: boolean,
  payoutsEnabled: boolean
): void {
  for (const [influencerId, account] of payoutAccounts) {
    if (account.stripeAccountId === stripeAccountId) {
      const newStatus: PayoutAccount["status"] = detailsSubmitted
        ? payoutsEnabled
          ? "active"
          : "restricted"
        : "pending";

      payoutAccounts.set(influencerId, {
        ...account,
        status: newStatus,
        payoutsEnabled,
      });

      console.info(
        `[Payouts] Account ${stripeAccountId} updated: status=${newStatus}, payoutsEnabled=${payoutsEnabled}`
      );
      break;
    }
  }
}

/**
 * Mark a payout as processing when transfer.created fires.
 */
export function handleTransferCreated(stripeTransferId: string): void {
  for (const [id, payout] of payoutRequests) {
    if (payout.stripeTransferId === stripeTransferId) {
      payoutRequests.set(id, { ...payout, status: "processing" });
      console.info(`[Payouts] Transfer ${stripeTransferId} created (processing)`);
      break;
    }
  }
}

/**
 * Mark a payout as completed when transfer.paid fires.
 */
export function handleTransferPaid(stripeTransferId: string): void {
  for (const [id, payout] of payoutRequests) {
    if (payout.stripeTransferId === stripeTransferId) {
      payoutRequests.set(id, {
        ...payout,
        status: "completed",
        completedAt: new Date().toISOString(),
      });
      console.info(`[Payouts] Transfer ${stripeTransferId} paid (completed)`);
      break;
    }
  }
}

/**
 * Mark a payout as failed when transfer.failed fires.
 */
export function handleTransferFailed(
  stripeTransferId: string,
  failureReason: string
): void {
  for (const [id, payout] of payoutRequests) {
    if (payout.stripeTransferId === stripeTransferId) {
      payoutRequests.set(id, {
        ...payout,
        status: "failed",
        completedAt: new Date().toISOString(),
        failureReason,
      });
      console.info(
        `[Payouts] Transfer ${stripeTransferId} failed: ${failureReason}`
      );
      break;
    }
  }
}

/**
 * Reset all stores. Useful for testing.
 */
export function _resetStores(): void {
  payoutAccounts.clear();
  payoutRequests.clear();
  influencerPayouts.clear();
}
