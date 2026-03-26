/**
 * Perk Wallet System
 *
 * Manages earned perks for users across businesses.
 * Handles awarding, redemption, expiration, and wallet queries.
 *
 * Storage: in-memory Map (ready for Postgres + Prisma migration).
 */

import type { DiscountType, PerkStatus } from "./types";
import { emitPerkEvent } from "./events";
import { ledger } from "./financial-ledger";

// ─── In-Memory Store ─────────────────────────────────────────────────────────

// Key: `${userId}:${businessId}` → wallet
const wallets: Map<string, PerkWallet> = new Map();

// Secondary index: perkId → wallet key (for fast perk lookups)
const perkIndex: Map<string, string> = new Map();

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
    return redeemPerk(perkId, userId);
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

// ─── Store Access (for testing / admin) ──────────────────────────────────────

export function getWalletStore(): Map<string, PerkWallet> {
  return wallets;
}

export function getPerkIndex(): Map<string, string> {
  return perkIndex;
}

export function clearStore(): void {
  wallets.clear();
  perkIndex.clear();
}
