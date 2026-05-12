/**
 * Referral Tracking System
 *
 * Allows business customers to refer other businesses and earn credits.
 * Codes follow the format REF-XXXX-XXXX (uppercase alphanumeric).
 */

import { randomBytes, randomUUID } from "crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface Referral {
  id: string;
  referrerId: string;
  referrerEmail: string;
  refereeId: string | null;
  refereeEmail: string;
  code: string;
  status: "pending" | "signed_up" | "activated" | "credited";
  creditAmount: number;
  createdAt: string;
  convertedAt: string | null;
  creditedAt: string | null;
}

export interface ReferralStats {
  totalReferred: number;
  totalConverted: number;
  totalCredits: number;
  pendingCredits: number;
}

// ─── Storage ────────────────────────────────────────────────────────────────

/** All referrals keyed by referral id */
const referrals = new Map<string, Referral>();

/** Lookup: code -> referral id */
const codeIndex = new Map<string, string>();

/** Lookup: referrerId -> Set of referral ids */
const referrerIndex = new Map<string, Set<string>>();

/** Lookup: businessId -> referral code (one code per business) */
const businessCodeIndex = new Map<string, string>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomChars(length: number): string {
  // crypto.randomBytes + rejection sampling — unpredictable codes, uniform
  // distribution over the 36-character alphabet.
  const bytes = randomBytes(length * 2);
  let result = "";
  let i = 0;
  while (result.length < length && i < bytes.length) {
    const b = bytes[i++];
    if (b < 252) result += ALPHANUMERIC[b % ALPHANUMERIC.length];
  }
  while (result.length < length) {
    result += ALPHANUMERIC[randomBytes(1)[0] % ALPHANUMERIC.length];
  }
  return result;
}

const DEFAULT_CREDIT_AMOUNT = 10;

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Generate a unique referral code for a business.
 * Format: REF-XXXX-XXXX (uppercase alphanumeric).
 * If the business already has a code, returns the existing one.
 */
export function generateReferralCode(businessId: string): string {
  const existing = businessCodeIndex.get(businessId);
  if (existing) return existing;

  let code: string;
  let attempts = 0;
  do {
    code = `REF-${randomChars(4)}-${randomChars(4)}`;
    attempts++;
    if (attempts > 100) {
      throw new Error("Failed to generate unique referral code");
    }
  } while (codeIndex.has(code));

  businessCodeIndex.set(businessId, code);
  return code;
}

/**
 * Create a full referral link from a code.
 */
export function createReferralLink(code: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://socialperks.app";
  return `${baseUrl}/ref/${code}`;
}

/**
 * Get all referrals created by a specific referrer.
 */
export function getReferralsByReferrer(referrerId: string): Referral[] {
  const ids = referrerIndex.get(referrerId);
  if (!ids) return [];
  const result: Referral[] = [];
  for (const id of ids) {
    const ref = referrals.get(id);
    if (ref) result.push(ref);
  }
  return result.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Look up a referral by its code.
 */
export function getReferralByCode(code: string): Referral | null {
  const id = codeIndex.get(code);
  if (!id) return null;
  return referrals.get(id) ?? null;
}

/**
 * Create a new pending referral invitation.
 * Called when a business shares their referral link and someone enters their email.
 */
export function createReferral(
  referrerId: string,
  referrerEmail: string,
  refereeEmail: string,
  code: string
): Referral {
  const id = `ref_${randomUUID().replace(/-/g, "").slice(0, 16)}`;

  const referral: Referral = {
    id,
    referrerId,
    referrerEmail,
    refereeId: null,
    refereeEmail,
    code,
    status: "pending",
    creditAmount: DEFAULT_CREDIT_AMOUNT,
    createdAt: new Date().toISOString(),
    convertedAt: null,
    creditedAt: null,
  };

  referrals.set(id, referral);
  codeIndex.set(`${code}:${refereeEmail}`, id);

  let refs = referrerIndex.get(referrerId);
  if (!refs) {
    refs = new Set();
    referrerIndex.set(referrerId, refs);
  }
  refs.add(id);

  return referral;
}

/**
 * Track when a referred user signs up.
 * Transitions referral status from "pending" to "signed_up".
 * If no existing referral record exists for this code, creates one.
 */
export function trackReferralSignup(
  code: string,
  refereeId: string,
  refereeEmail: string
): Referral {
  // Find the referrer's business ID from the code
  let referrerId: string | null = null;
  let referrerEmail = "";
  for (const [bizId, bizCode] of businessCodeIndex.entries()) {
    if (bizCode === code) {
      referrerId = bizId;
      break;
    }
  }

  // Find existing referral for this code + email combination
  const existingId = codeIndex.get(`${code}:${refereeEmail}`);
  if (existingId) {
    const existing = referrals.get(existingId);
    if (existing) {
      existing.refereeId = refereeId;
      existing.status = "signed_up";
      existing.convertedAt = new Date().toISOString();
      return existing;
    }
  }

  // Look up referrer email from existing referrals
  if (referrerId) {
    const existingReferrals = getReferralsByReferrer(referrerId);
    if (existingReferrals.length > 0) {
      referrerEmail = existingReferrals[0].referrerEmail;
    }
  }

  // Create a new referral record for this signup
  const id = `ref_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
  const referral: Referral = {
    id,
    referrerId: referrerId ?? "unknown",
    referrerEmail,
    refereeId,
    refereeEmail,
    code,
    status: "signed_up",
    creditAmount: DEFAULT_CREDIT_AMOUNT,
    createdAt: new Date().toISOString(),
    convertedAt: new Date().toISOString(),
    creditedAt: null,
  };

  referrals.set(id, referral);
  codeIndex.set(`${code}:${refereeEmail}`, id);

  if (referrerId) {
    let refs = referrerIndex.get(referrerId);
    if (!refs) {
      refs = new Set();
      referrerIndex.set(referrerId, refs);
    }
    refs.add(id);
  }

  return referral;
}

/**
 * Mark a referral as credited (payout processed).
 */
export function creditReferral(referralId: string): Referral {
  const referral = referrals.get(referralId);
  if (!referral) {
    throw new Error(`Referral not found: ${referralId}`);
  }
  if (referral.status === "credited") {
    return referral; // idempotent
  }
  if (referral.status === "pending") {
    throw new Error("Cannot credit a referral that has not been converted yet");
  }

  referral.status = "credited";
  referral.creditedAt = new Date().toISOString();
  return referral;
}

/**
 * Get aggregate stats for a referrer.
 */
export function getReferralStats(referrerId: string): ReferralStats {
  const refs = getReferralsByReferrer(referrerId);

  const totalReferred = refs.length;
  const converted = refs.filter(
    (r) => r.status === "signed_up" || r.status === "activated" || r.status === "credited"
  );
  const totalConverted = converted.length;
  const credited = refs.filter((r) => r.status === "credited");
  const totalCredits = credited.reduce((sum, r) => sum + r.creditAmount, 0);
  const pendingCredits = converted
    .filter((r) => r.status !== "credited")
    .reduce((sum, r) => sum + r.creditAmount, 0);

  return { totalReferred, totalConverted, totalCredits, pendingCredits };
}

/**
 * Reset all referral data. Used for testing.
 */
export function _resetReferrals(): void {
  referrals.clear();
  codeIndex.clear();
  referrerIndex.clear();
  businessCodeIndex.clear();
}
