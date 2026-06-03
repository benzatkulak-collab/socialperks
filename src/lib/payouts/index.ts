// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Payout Management (Stripe Connect)
//
// Uses real Stripe Connect Express accounts when configured, falling back to
// mock data for dev/demo mode. Manages influencer payout accounts, onboarding,
// and transfer lifecycle.
// ══════════════════════════════════════════════════════════════════════════════

import { stripe, isStripeConfigured } from "@/lib/stripe";
import { db, getInMemoryStore } from "@/lib/db/connection";

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

// ─── Durable persistence (write-through cache + cold-start hydration) ─────────
//
// The Maps above are a per-process write-through cache. Every mutation is also
// persisted to Postgres (tables `payout_accounts` / `payout_requests`, migration
// 007) so the influencer→Connect-account mapping and payout history survive a
// serverless cold start — otherwise an onboarded creator gets a duplicate
// Connect account and loses their cash-out history on every deploy. In tests/dev
// (InMemoryConnection) the same code path persists to the in-memory row store,
// so durability is exercised end-to-end, not mocked. Stripe remains the source
// of truth for the transfer itself.

const ACCOUNTS_TABLE = "payout_accounts";
const REQUESTS_TABLE = "payout_requests";

interface PayoutAccountRow {
  influencer_id: string;
  stripe_account_id: string | null;
  status: string;
  onboarding_url: string | null;
  payouts_enabled: boolean;
  created_at: string | Date;
}

interface PayoutRequestRow {
  id: string;
  influencer_id: string;
  amount: number | string;
  currency: string;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string | Date;
  completed_at: string | Date | null;
  failure_reason: string | null;
}

function iso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
function isoOrNull(v: string | Date | null): string | null {
  return v == null ? null : iso(v);
}

// Note: *toRow helpers are used only for the InMemoryConnection path (the
// Postgres path uses positional params). The in-memory store keys by `id`, so
// the account row carries `id = influencerId` (its real PK).
function accountToRow(a: PayoutAccount): Record<string, unknown> {
  return {
    id: a.influencerId,
    influencer_id: a.influencerId,
    stripe_account_id: a.stripeAccountId,
    status: a.status,
    onboarding_url: a.onboardingUrl,
    payouts_enabled: a.payoutsEnabled,
    created_at: a.createdAt,
  };
}
function rowToAccount(r: PayoutAccountRow): PayoutAccount {
  return {
    influencerId: r.influencer_id,
    stripeAccountId: r.stripe_account_id,
    status: r.status as PayoutAccount["status"],
    onboardingUrl: r.onboarding_url,
    payoutsEnabled: Boolean(r.payouts_enabled),
    createdAt: iso(r.created_at),
  };
}
function requestToRow(p: PayoutRequest): Record<string, unknown> {
  return {
    id: p.id,
    influencer_id: p.influencerId,
    amount: p.amount,
    currency: p.currency,
    status: p.status,
    stripe_transfer_id: p.stripeTransferId,
    created_at: p.createdAt,
    completed_at: p.completedAt,
    failure_reason: p.failureReason,
  };
}
function rowToRequest(r: PayoutRequestRow): PayoutRequest {
  return {
    id: r.id,
    influencerId: r.influencer_id,
    amount: typeof r.amount === "string" ? parseInt(r.amount, 10) : r.amount,
    currency: r.currency,
    status: r.status as PayoutRequest["status"],
    stripeTransferId: r.stripe_transfer_id,
    createdAt: iso(r.created_at),
    completedAt: isoOrNull(r.completed_at),
    failureReason: r.failure_reason,
  };
}

/** Write-through persist for a payout account (best-effort; never throws). */
export async function persistAccount(a: PayoutAccount): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    if (store.selectById(ACCOUNTS_TABLE, a.influencerId)) {
      store.update(ACCOUNTS_TABLE, a.influencerId, accountToRow(a));
    } else {
      store.insert(ACCOUNTS_TABLE, accountToRow(a));
    }
    return;
  }
  try {
    await db.query(
      `INSERT INTO payout_accounts
         (influencer_id, stripe_account_id, status, onboarding_url,
          payouts_enabled, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (influencer_id) DO UPDATE SET
         stripe_account_id = EXCLUDED.stripe_account_id,
         status = EXCLUDED.status,
         onboarding_url = EXCLUDED.onboarding_url,
         payouts_enabled = EXCLUDED.payouts_enabled,
         updated_at = NOW()`,
      [a.influencerId, a.stripeAccountId, a.status, a.onboardingUrl, a.payoutsEnabled, a.createdAt],
    );
  } catch (e) {
    console.error("[Payouts] DB persistAccount failed:", e instanceof Error ? e.message : e);
  }
}

/** Write-through persist for a payout request (insert on create, upsert on status change). */
export async function persistRequest(p: PayoutRequest): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    if (store.selectById(REQUESTS_TABLE, p.id)) {
      store.update(REQUESTS_TABLE, p.id, requestToRow(p));
    } else {
      store.insert(REQUESTS_TABLE, requestToRow(p));
    }
    return;
  }
  try {
    await db.query(
      `INSERT INTO payout_requests
         (id, influencer_id, amount, currency, status, stripe_transfer_id,
          created_at, completed_at, failure_reason, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         stripe_transfer_id = EXCLUDED.stripe_transfer_id,
         completed_at = EXCLUDED.completed_at,
         failure_reason = EXCLUDED.failure_reason,
         updated_at = NOW()`,
      [p.id, p.influencerId, p.amount, p.currency, p.status, p.stripeTransferId, p.createdAt, p.completedAt, p.failureReason],
    );
  } catch (e) {
    console.error("[Payouts] DB persistRequest failed:", e instanceof Error ? e.message : e);
  }
}

let _hydrationPromise: Promise<void> | null = null;

/**
 * Load persisted payout accounts + requests into the cache once per process
 * (cached promise). Best-effort: on error log, clear the promise to allow retry,
 * never throw. Routes that read or mutate payout state await this first so a
 * cold instance never sees an empty store.
 */
export function hydratePayouts(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;
  _hydrationPromise = (async () => {
    try {
      const store = getInMemoryStore();
      const accountRows: PayoutAccountRow[] = store
        ? (store.selectMany(ACCOUNTS_TABLE, {}, { perPage: 1_000_000 }).rows as unknown as PayoutAccountRow[])
        : (
            await db.query<PayoutAccountRow>(
              `SELECT influencer_id, stripe_account_id, status, onboarding_url,
                      payouts_enabled, created_at
                 FROM payout_accounts`,
            )
          ).rows;
      for (const r of accountRows) {
        const a = rowToAccount(r);
        if (!payoutAccounts.has(a.influencerId)) payoutAccounts.set(a.influencerId, a);
      }

      const requestRows: PayoutRequestRow[] = store
        ? (store.selectMany(REQUESTS_TABLE, {}, { perPage: 1_000_000 }).rows as unknown as PayoutRequestRow[])
        : (
            await db.query<PayoutRequestRow>(
              `SELECT id, influencer_id, amount, currency, status, stripe_transfer_id,
                      created_at, completed_at, failure_reason
                 FROM payout_requests ORDER BY created_at ASC`,
            )
          ).rows;
      // Stable created_at order so getPayoutHistory's reverse() yields newest-first.
      const sorted = [...requestRows].sort((x, y) => iso(x.created_at).localeCompare(iso(y.created_at)));
      for (const r of sorted) {
        const p = rowToRequest(r);
        if (!payoutRequests.has(p.id)) {
          payoutRequests.set(p.id, p);
          addPayoutToIndex(p.influencerId, p.id);
        }
      }
    } catch (e) {
      console.error("[Payouts] hydration failed:", e instanceof Error ? e.message : e);
      _hydrationPromise = null;
    }
  })();
  return _hydrationPromise;
}

// Warm the cache as soon as this module loads on a fresh instance.
void hydratePayouts();

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
      await persistAccount(payoutAccount);
      console.warn(
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
  await persistAccount(payoutAccount);
  console.warn(
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

      // Cache + persist the onboarding URL
      const linked: PayoutAccount = { ...account, onboardingUrl: accountLink.url };
      payoutAccounts.set(influencerId, linked);
      await persistAccount(linked);

      return { url: accountLink.url };
    } catch (e) {
      const message =
        e instanceof Error ? e.message : "Failed to create onboarding link";
      throw new Error(message);
    }
  }

  // Mock mode
  const mockUrl = `https://connect.stripe.com/express/onboarding/${account.stripeAccountId}?return_url=${encodeURIComponent(returnUrl)}&refresh_url=${encodeURIComponent(refreshUrl)}`;

  const linkedMock: PayoutAccount = { ...account, onboardingUrl: mockUrl };
  payoutAccounts.set(influencerId, linkedMock);
  await persistAccount(linkedMock);

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
      await persistAccount(updatedAccount);
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
      await persistRequest(payout);

      console.warn(
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
      await persistRequest(failedPayout);

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
  await persistRequest(payout);

  console.warn(
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
export async function handleAccountUpdated(
  stripeAccountId: string,
  detailsSubmitted: boolean,
  payoutsEnabled: boolean
): Promise<void> {
  for (const [influencerId, account] of payoutAccounts) {
    if (account.stripeAccountId === stripeAccountId) {
      const newStatus: PayoutAccount["status"] = detailsSubmitted
        ? payoutsEnabled
          ? "active"
          : "restricted"
        : "pending";

      // Cache write is synchronous (before the await) so callers that don't
      // await still see the update; persistence is the awaited durable step.
      const updated: PayoutAccount = { ...account, status: newStatus, payoutsEnabled };
      payoutAccounts.set(influencerId, updated);

      console.warn(
        `[Payouts] Account ${stripeAccountId} updated: status=${newStatus}, payoutsEnabled=${payoutsEnabled}`
      );
      await persistAccount(updated);
      break;
    }
  }
}

/**
 * Mark a payout as processing when transfer.created fires.
 */
export async function handleTransferCreated(stripeTransferId: string): Promise<void> {
  for (const [id, payout] of payoutRequests) {
    if (payout.stripeTransferId === stripeTransferId) {
      const updated: PayoutRequest = { ...payout, status: "processing" };
      payoutRequests.set(id, updated);
      console.warn(`[Payouts] Transfer ${stripeTransferId} created (processing)`);
      await persistRequest(updated);
      break;
    }
  }
}

/**
 * Mark a payout as completed when transfer.paid fires.
 */
export async function handleTransferPaid(stripeTransferId: string): Promise<void> {
  for (const [id, payout] of payoutRequests) {
    if (payout.stripeTransferId === stripeTransferId) {
      const updated: PayoutRequest = {
        ...payout,
        status: "completed",
        completedAt: new Date().toISOString(),
      };
      payoutRequests.set(id, updated);
      console.warn(`[Payouts] Transfer ${stripeTransferId} paid (completed)`);
      await persistRequest(updated);
      break;
    }
  }
}

/**
 * Mark a payout as failed when transfer.failed fires.
 */
export async function handleTransferFailed(
  stripeTransferId: string,
  failureReason: string
): Promise<void> {
  for (const [id, payout] of payoutRequests) {
    if (payout.stripeTransferId === stripeTransferId) {
      const updated: PayoutRequest = {
        ...payout,
        status: "failed",
        completedAt: new Date().toISOString(),
        failureReason,
      };
      payoutRequests.set(id, updated);
      console.warn(
        `[Payouts] Transfer ${stripeTransferId} failed: ${failureReason}`
      );
      await persistRequest(updated);
      break;
    }
  }
}

/**
 * Reset all stores (cache AND durable rows). Useful for testing isolation.
 * In production the durable store is Postgres (never InMemoryConnection), so the
 * row-deletion branch is a no-op there.
 */
export function _resetStores(): void {
  payoutAccounts.clear();
  payoutRequests.clear();
  influencerPayouts.clear();
  const store = getInMemoryStore();
  if (store) {
    for (const r of store.selectMany(ACCOUNTS_TABLE, {}, { perPage: 1_000_000 }).rows) {
      store.delete(ACCOUNTS_TABLE, r.id as string);
    }
    for (const r of store.selectMany(REQUESTS_TABLE, {}, { perPage: 1_000_000 }).rows) {
      store.delete(REQUESTS_TABLE, r.id as string);
    }
  }
  _hydrationPromise = null;
}

/**
 * Test-only: simulate a serverless cold start. Drops the in-memory cache but
 * KEEPS the durable backing rows, and resets hydration so a subsequent
 * `hydratePayouts()` reloads from the durable store.
 */
export function __resetPayoutCacheForTests(): void {
  payoutAccounts.clear();
  payoutRequests.clear();
  influencerPayouts.clear();
  _hydrationPromise = null;
}
