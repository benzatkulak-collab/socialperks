/**
 * Perk Wallet System
 *
 * Manages earned perks for users across businesses.
 * Handles awarding, redemption, expiration, and wallet queries.
 *
 * Storage: durable. An in-memory Map acts as a write-through cache for fast
 * synchronous reads; every award and redemption is persisted to Postgres
 * (table `perk_wallet_entries`, migration 006) and the cache is rehydrated
 * from Postgres on each serverless cold start via `hydrateWallets()`. In
 * tests/dev (InMemoryConnection) the same code path persists to the in-memory
 * row store, so durability is exercised end-to-end — NOT mocked out.
 *
 * IMPORTANT: `awardPerk`/`redeemPerk` stay synchronous and only touch the
 * cache (so existing callers/tests are unchanged). Durability is an explicit,
 * awaited step: callers that mutate the wallet must persist the change —
 *   award:  `const r = awardPerk(...); if (r.success) await persistPerk(r.data, userId, businessId);`
 *   redeem: use `safeRedeemPerk(...)`, which persists the redemption for you.
 * This mirrors the proven write-through pattern in `billing/store.ts`.
 */

import type { DiscountType, PerkStatus } from "./types";
import { emitPerkEvent } from "./events";
import { ledger } from "./financial-ledger";
import { db, getInMemoryStore } from "@/lib/db/connection";
import { captureError } from "@/lib/monitoring";

// ─── In-Memory Store (write-through cache) ───────────────────────────────────

// Key: `${userId}:${businessId}` → wallet
const wallets: Map<string, PerkWallet> = new Map();

// Secondary index: perkId → wallet key (for fast perk lookups)
const perkIndex: Map<string, string> = new Map();

// Durable backing table (migration 006). Flat, TEXT-keyed, FK-free — see the
// migration comment for why we don't reuse the v1 `earned_perks` table.
const PERK_TABLE = "perk_wallet_entries";

// ─── Redemption Lock (prevents double-redemption race conditions) ────────────

const redemptionLocks = new Map<string, Promise<void>>();

async function withRedemptionLock<T>(perkId: string, fn: () => Promise<T>): Promise<T> {
  while (redemptionLocks.has(perkId)) {
    await redemptionLocks.get(perkId);
  }
  let resolve: () => void;
  const lock = new Promise<void>(r => { resolve = r; });
  redemptionLocks.set(perkId, lock);
  try {
    return await fn();
  } finally {
    redemptionLocks.delete(perkId);
    resolve!();
  }
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface EarnedPerk {
  id: string;
  campaignId: string;
  submissionId: string;
  value: number;
  type: DiscountType;
  status: PerkStatus;
  earnedAt: string;
  redeemedAt: string | null;
  expiresAt: string;
  redemptionCode: string;
}

export interface PerkWallet {
  userId: string;
  businessId: string;
  perks: EarnedPerk[];
}

export interface WalletSummary {
  userId: string;
  businessId: string;
  perks: EarnedPerk[];
  totalAvailable: number;
  totalLifetime: number;
  activeCount: number;
  redeemedCount: number;
  expiredCount: number;
}

export interface AwardResult {
  success: boolean;
  data?: EarnedPerk;
  error?: { code: string; message: string };
}

export interface RedeemResult {
  success: boolean;
  data?: { perk: EarnedPerk; redemptionCode: string };
  error?: { code: string; message: string };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generatePerkId(): string {
  return `perk_${crypto.randomUUID()}`;
}

export function generateRedemptionCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No I, O, 0, 1 to avoid confusion
  const randomBytes = new Uint8Array(8);
  crypto.getRandomValues(randomBytes);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[randomBytes[i] % chars.length];
  }
  return code;
}

function walletKey(userId: string, businessId: string): string {
  return `${userId}:${businessId}`;
}

function getOrCreateWallet(userId: string, businessId: string): PerkWallet {
  const key = walletKey(userId, businessId);
  let wallet = wallets.get(key);
  if (!wallet) {
    wallet = { userId, businessId, perks: [] };
    wallets.set(key, wallet);
  }
  return wallet;
}

// ─── Award Perk ──────────────────────────────────────────────────────────────

export function awardPerk(
  userId: string,
  businessId: string,
  campaignId: string,
  submissionId: string,
  value: number,
  type: DiscountType,
  expiryDays = 30
): AwardResult {
  // Validate inputs
  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_USER_ID", message: "userId is required" },
    };
  }

  if (!businessId || typeof businessId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_BUSINESS_ID", message: "businessId is required" },
    };
  }

  if (!campaignId || typeof campaignId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_CAMPAIGN_ID", message: "campaignId is required" },
    };
  }

  if (!submissionId || typeof submissionId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_SUBMISSION_ID", message: "submissionId is required" },
    };
  }

  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return {
      success: false,
      error: { code: "INVALID_VALUE", message: "value must be a finite positive number" },
    };
  }

  if (type !== "pct" && type !== "dol") {
    return {
      success: false,
      error: {
        code: "INVALID_TYPE",
        message: "type must be 'pct' or 'dol'",
      },
    };
  }

  if (type === "pct" && value > 100) {
    return {
      success: false,
      error: {
        code: "INVALID_VALUE",
        message: "Percentage perk cannot exceed 100%",
      },
    };
  }

  if (typeof expiryDays !== "number" || !Number.isFinite(expiryDays) || expiryDays < 1) {
    return {
      success: false,
      error: {
        code: "INVALID_EXPIRY",
        message: "expiryDays must be a finite positive number",
      },
    };
  }

  // Check for duplicate award (same submission should not award twice)
  const wallet = getOrCreateWallet(userId, businessId);
  const alreadyAwarded = wallet.perks.find(
    (p) => p.submissionId === submissionId
  );
  if (alreadyAwarded) {
    return {
      success: false,
      error: {
        code: "DUPLICATE_AWARD",
        message: `Perk already awarded for submission '${submissionId}'`,
      },
    };
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setDate(expiresAt.getDate() + expiryDays);

  const perk: EarnedPerk = {
    id: generatePerkId(),
    campaignId,
    submissionId,
    value: Math.round(value * 100) / 100,
    type,
    status: "available",
    earnedAt: now.toISOString(),
    redeemedAt: null,
    expiresAt: expiresAt.toISOString(),
    redemptionCode: generateRedemptionCode(),
  };

  wallet.perks.push(perk);

  // Update secondary index
  const key = walletKey(userId, businessId);
  perkIndex.set(perk.id, key);

  // Emit event for analytics
  emitPerkEvent("perk.awarded", perk.id, userId, {
    campaignId, businessId, submissionId, value: perk.value, type: perk.type,
  });

  // Record in financial ledger
  try {
    ledger.awardPerk(businessId, userId, perk.value, campaignId);
  } catch (err) {
    console.error('[PerkWallet] Ledger awardPerk failed:', err instanceof Error ? err.message : err);
    // Continue execution but log the failure for monitoring
  }

  return { success: true, data: perk };
}

// ─── Redeem Perk ─────────────────────────────────────────────────────────────

export function redeemPerk(perkId: string, userId: string): RedeemResult {
  if (!perkId || typeof perkId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_PERK_ID", message: "perkId is required" },
    };
  }

  if (!userId || typeof userId !== "string") {
    return {
      success: false,
      error: { code: "INVALID_USER_ID", message: "userId is required" },
    };
  }

  // Find the perk via index
  const key = perkIndex.get(perkId);
  if (!key) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Perk '${perkId}' not found` },
    };
  }

  const wallet = wallets.get(key);
  if (!wallet) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Wallet not found for perk '${perkId}'` },
    };
  }

  // Verify ownership
  if (wallet.userId !== userId) {
    return {
      success: false,
      error: { code: "UNAUTHORIZED", message: "This perk does not belong to you" },
    };
  }

  const perkIdx = wallet.perks.findIndex((p) => p.id === perkId);
  if (perkIdx === -1) {
    return {
      success: false,
      error: { code: "NOT_FOUND", message: `Perk '${perkId}' not found in wallet` },
    };
  }

  const perk = wallet.perks[perkIdx];

  // Check if perk has passed its expiration date (do this first to update status)
  if (
    perk.status === "available" &&
    new Date(perk.expiresAt).getTime() < Date.now()
  ) {
    // Mark as expired
    wallet.perks[perkIdx] = { ...perk, status: "expired" };
    return {
      success: false,
      error: { code: "PERK_EXPIRED", message: "This perk has expired" },
    };
  }

  // Only "available" perks can be redeemed — reject all other statuses explicitly
  if (perk.status !== "available") {
    if (perk.status === "redeemed") {
      return {
        success: false,
        error: {
          code: "ALREADY_REDEEMED",
          message: `Perk was already redeemed on ${perk.redeemedAt}`,
        },
      };
    }
    if (perk.status === "expired") {
      return {
        success: false,
        error: { code: "PERK_EXPIRED", message: "This perk has expired" },
      };
    }
    // Catch-all for any unexpected status values
    return {
      success: false,
      error: {
        code: "INVALID_STATUS",
        message: `Perk cannot be redeemed: current status is "${perk.status}"`,
      },
    };
  }

  const now = new Date().toISOString();
  const redeemed: EarnedPerk = {
    ...perk,
    status: "redeemed",
    redeemedAt: now,
  };

  wallet.perks[perkIdx] = redeemed;

  // Emit event for analytics
  emitPerkEvent("perk.redeemed", perk.id, userId, {
    campaignId: perk.campaignId, businessId: wallet.businessId, value: perk.value, type: perk.type,
  });

  // Record in financial ledger
  try {
    ledger.redeemPerk(userId, wallet.businessId, perk.value, perk.id);
  } catch (err) {
    console.error('[PerkWallet] Ledger redeemPerk failed:', err instanceof Error ? err.message : err);
    // Continue execution but log the failure for monitoring
  }

  return {
    success: true,
    data: { perk: redeemed, redemptionCode: redeemed.redemptionCode },
  };
}

// ─── Safe Redeem Perk (with lock) ─────────────────────────────────────────────

/**
 * Redeem a perk with a per-perk lock to prevent double-redemption
 * from concurrent requests. Wraps the synchronous redeemPerk in a lock.
 */
export async function safeRedeemPerk(perkId: string, userId: string): Promise<RedeemResult> {
  return withRedemptionLock(perkId, async () => {
    const result = redeemPerk(perkId, userId);
    // Persist the redemption (status → redeemed) durably. Best-effort: a DB
    // failure must not undo a redemption the user already saw succeed.
    if (result.success && result.data) {
      const key = perkIndex.get(perkId);
      const wallet = key ? wallets.get(key) : undefined;
      if (wallet) await persistPerk(result.data.perk, wallet.userId, wallet.businessId);
    }
    return result;
  });
}

// ─── Get Wallet ──────────────────────────────────────────────────────────────

/**
 * Get wallet summary for a user.
 * When businessId is provided, returns a single WalletSummary.
 * When businessId is omitted, returns an array of WalletSummary across all businesses.
 */
export function getWallet(
  userId: string,
  businessId: string
): WalletSummary;
export function getWallet(
  userId: string
): WalletSummary[];
export function getWallet(
  userId: string,
  businessId?: string
): WalletSummary | WalletSummary[] {
  if (!userId || typeof userId !== "string") {
    return businessId ? buildWalletSummary({ userId: userId ?? "", businessId: businessId ?? "", perks: [] }) : [];
  }
  if (businessId) {
    const key = walletKey(userId, businessId);
    const wallet = wallets.get(key);
    if (!wallet) {
      return buildWalletSummary({ userId, businessId, perks: [] });
    }
    return buildWalletSummary(wallet);
  }

  // All wallets for a user across all businesses
  const userWallets: WalletSummary[] = [];
  for (const wallet of wallets.values()) {
    if (wallet.userId === userId) {
      userWallets.push(buildWalletSummary(wallet));
    }
  }

  return userWallets;
}

function buildWalletSummary(wallet: PerkWallet): WalletSummary {
  const now = Date.now();

  // Build snapshot of perks with expired status applied (without mutating the store)
  const perksSnapshot = wallet.perks.map((p) => {
    if (p.status === "available" && new Date(p.expiresAt).getTime() < now) {
      return { ...p, status: "expired" as const };
    }
    return p;
  });

  const available = perksSnapshot.filter((p) => p.status === "available");
  const redeemed = perksSnapshot.filter((p) => p.status === "redeemed");
  const expired = perksSnapshot.filter((p) => p.status === "expired");

  // Calculate totals (only for dollar-type perks; percentage perks are counted as-is)
  const totalAvailable = available.reduce((sum, p) => sum + p.value, 0);
  const totalLifetime = perksSnapshot.reduce((sum, p) => sum + p.value, 0);

  return {
    userId: wallet.userId,
    businessId: wallet.businessId,
    perks: perksSnapshot,
    totalAvailable: Math.round(totalAvailable * 100) / 100,
    totalLifetime: Math.round(totalLifetime * 100) / 100,
    activeCount: available.length,
    redeemedCount: redeemed.length,
    expiredCount: expired.length,
  };
}

// ─── Expire Perks ────────────────────────────────────────────────────────────

export function expirePerks(): { expired: number; ids: string[] } {
  const now = Date.now();
  const expiredIds: string[] = [];

  for (const wallet of wallets.values()) {
    for (let i = 0; i < wallet.perks.length; i++) {
      const perk = wallet.perks[i];
      if (
        perk.status === "available" &&
        new Date(perk.expiresAt).getTime() < now
      ) {
        wallet.perks[i] = { ...perk, status: "expired" };
        expiredIds.push(perk.id);
      }
    }
  }

  return { expired: expiredIds.length, ids: expiredIds };
}

// ─── Durable persistence (Postgres / in-memory row store) ────────────────────
//
// The wallets/perkIndex Maps above are a per-process write-through cache. The
// source of truth that survives a serverless cold start is the
// `perk_wallet_entries` table. Reads stay synchronous (off the cache); writes
// are persisted here and the cache is rehydrated from the table on cold start.

interface PerkRow {
  id: string;
  user_id: string;
  business_id: string;
  campaign_id: string;
  submission_id: string;
  value: number | string;
  type: string;
  status: string;
  earned_at: string | Date;
  redeemed_at: string | Date | null;
  expires_at: string | Date;
  redemption_code: string;
}

function toIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : String(v);
}

function perkToRow(perk: EarnedPerk, userId: string, businessId: string): Record<string, unknown> {
  return {
    id: perk.id,
    user_id: userId,
    business_id: businessId,
    campaign_id: perk.campaignId,
    submission_id: perk.submissionId,
    value: perk.value,
    type: perk.type,
    status: perk.status,
    earned_at: perk.earnedAt,
    redeemed_at: perk.redeemedAt,
    expires_at: perk.expiresAt,
    redemption_code: perk.redemptionCode,
  };
}

function rowToPerk(r: PerkRow): { perk: EarnedPerk; userId: string; businessId: string } {
  return {
    userId: r.user_id,
    businessId: r.business_id,
    perk: {
      id: r.id,
      campaignId: r.campaign_id,
      submissionId: r.submission_id,
      value: typeof r.value === "string" ? parseFloat(r.value) : r.value,
      type: r.type as DiscountType,
      status: r.status as PerkStatus,
      earnedAt: toIso(r.earned_at),
      redeemedAt: r.redeemed_at == null ? null : toIso(r.redeemed_at),
      expiresAt: toIso(r.expires_at),
      redemptionCode: r.redemption_code,
    },
  };
}

/**
 * Durably persist an earned perk (insert on award, upsert on redemption).
 * Best-effort: an in-memory cache write has already succeeded, so a DB error is
 * logged but never thrown — the request must not fail because persistence
 * hiccuped (Postgres retries / the next write reconciles).
 */
export async function persistPerk(
  perk: EarnedPerk,
  userId: string,
  businessId: string,
): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    const row = perkToRow(perk, userId, businessId);
    if (store.selectById(PERK_TABLE, perk.id)) {
      store.update(PERK_TABLE, perk.id, row);
    } else {
      store.insert(PERK_TABLE, row);
    }
    return;
  }
  try {
    await db.query(
      `INSERT INTO perk_wallet_entries
         (id, user_id, business_id, campaign_id, submission_id, value, type,
          status, earned_at, redeemed_at, expires_at, redemption_code,
          created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
       ON CONFLICT (id) DO UPDATE SET
         status = EXCLUDED.status,
         redeemed_at = EXCLUDED.redeemed_at,
         updated_at = NOW()`,
      [
        perk.id,
        userId,
        businessId,
        perk.campaignId,
        perk.submissionId,
        perk.value,
        perk.type,
        perk.status,
        perk.earnedAt,
        perk.redeemedAt,
        perk.expiresAt,
        perk.redemptionCode,
      ],
    );
  } catch (e) {
    captureError(e, { source: "perk-wallet.persistPerk" });
  }
}

// ─── Cold-start hydration ────────────────────────────────────────────────────
//
// The cache is empty on every serverless cold start. Without rehydration,
// getWallet() reports an empty wallet for a user who has earned perks (and
// awardPerk's duplicate-submission guard would re-award), until a write happens
// to repopulate the cache. Warm the cache from the table once per process.

let _hydrationPromise: Promise<void> | null = null;

/**
 * Load all persisted perks into the in-memory cache. Runs once per process
 * (cached promise). Best-effort: on error we log, clear the cached promise so a
 * later call can retry, and never throw.
 */
export function hydrateWallets(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;
  _hydrationPromise = (async () => {
    try {
      const store = getInMemoryStore();
      const rows: PerkRow[] = store
        ? (store.selectMany(PERK_TABLE, {}, { perPage: 1_000_000 }).rows as unknown as PerkRow[])
        : (
            await db.query<PerkRow>(
              `SELECT id, user_id, business_id, campaign_id, submission_id, value,
                      type, status, earned_at, redeemed_at, expires_at, redemption_code
                 FROM perk_wallet_entries`,
            )
          ).rows;

      for (const r of rows) {
        const { perk, userId, businessId } = rowToPerk(r);
        const key = walletKey(userId, businessId);
        let wallet = wallets.get(key);
        if (!wallet) {
          wallet = { userId, businessId, perks: [] };
          wallets.set(key, wallet);
        }
        // Don't clobber a fresher entry a concurrent write added after hydration began.
        if (!wallet.perks.some((p) => p.id === perk.id)) {
          wallet.perks.push(perk);
          perkIndex.set(perk.id, key);
        }
      }
    } catch (e) {
      captureError(e, { source: "perk-wallet.hydrate" });
      _hydrationPromise = null;
    }
  })();
  return _hydrationPromise;
}

// Warm the cache as soon as this module loads on a fresh instance.
void hydrateWallets();

// ─── Store Access (for testing / admin) ──────────────────────────────────────

export function getWalletStore(): Map<string, PerkWallet> {
  return wallets;
}

export function getPerkIndex(): Map<string, string> {
  return perkIndex;
}

/**
 * Clear both the in-memory cache AND the durable backing rows. Used by tests
 * for isolation. (In production the durable store is Postgres, never an
 * InMemoryConnection, so the row-deletion branch is a no-op there.)
 */
export function clearStore(): void {
  wallets.clear();
  perkIndex.clear();
  const store = getInMemoryStore();
  if (store) {
    for (const r of store.selectMany(PERK_TABLE, {}, { perPage: 1_000_000 }).rows) {
      store.delete(PERK_TABLE, r.id as string);
    }
  }
  _hydrationPromise = null;
}

/**
 * Test-only: simulate a serverless cold start. Drops the in-memory cache but
 * KEEPS the durable backing rows, and resets hydration so a subsequent
 * `hydrateWallets()` reloads from the durable store.
 */
export function __resetWalletCacheForTests(): void {
  wallets.clear();
  perkIndex.clear();
  _hydrationPromise = null;
}
