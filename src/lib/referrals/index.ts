/**
 * Referral Tracking System
 *
 * Allows business customers to refer other businesses and earn credits.
 * Codes follow the format REF-XXXX-XXXX (uppercase alphanumeric).
 *
 * Persistence: durable. The Maps below are a per-process write-through cache;
 * records persist to Postgres (migration 009) and the cache is rehydrated on
 * cold start via hydrateReferrals(). The public functions stay synchronous
 * (callers/tests unchanged) — routes persist the returned record and warm the
 * cache before any lookup. Mirrors perk-wallet / payouts.
 */

import { db, getInMemoryStore } from "@/lib/db/connection";

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

/** Lookup: refereeId -> referral id (referee can only have one). Populated
 *  when trackReferralSignup runs. Used by the billing webhook to credit
 *  the referrer when the referee converts to a paid plan. */
const refereeIndex = new Map<string, string>();

// ─── Helpers ────────────────────────────────────────────────────────────────

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomChars(length: number): string {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
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
  const id = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;

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
      refereeIndex.set(refereeId, existingId);
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
  const id = `ref_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
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
  refereeIndex.set(refereeId, id);

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
 * Look up a referral by the referee's business ID.
 * Returns null if this business wasn't referred. Used by the billing
 * webhook to credit the referrer when the referee converts to paid.
 */
export function findReferralByReferee(refereeId: string): Referral | null {
  const id = refereeIndex.get(refereeId);
  if (!id) return null;
  return referrals.get(id) ?? null;
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

  // signed_up → credited (skip "activated" intermediate; Stripe payment is
  // a stronger conversion signal than activation).
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

// ─── Durable persistence (write-through + cold-start hydration) ───────────────

const REFERRALS_TABLE = "referrals";
const BIZ_CODES_TABLE = "business_referral_codes";

interface ReferralRow {
  id: string;
  referrer_id: string;
  referrer_email: string;
  referee_id: string | null;
  referee_email: string;
  code: string;
  status: string;
  credit_amount: number | string;
  created_at: string | Date;
  converted_at: string | Date | null;
  credited_at: string | Date | null;
}
interface BizCodeRow {
  business_id: string;
  code: string;
}

function rIso(v: string | Date): string {
  return v instanceof Date ? v.toISOString() : String(v);
}
function rIsoOrNull(v: string | Date | null): string | null {
  return v == null ? null : rIso(v);
}

function referralToRow(r: Referral): Record<string, unknown> {
  return {
    id: r.id,
    referrer_id: r.referrerId,
    referrer_email: r.referrerEmail,
    referee_id: r.refereeId,
    referee_email: r.refereeEmail,
    code: r.code,
    status: r.status,
    credit_amount: r.creditAmount,
    created_at: r.createdAt,
    converted_at: r.convertedAt,
    credited_at: r.creditedAt,
  };
}
function rowToReferral(r: ReferralRow): Referral {
  return {
    id: r.id,
    referrerId: r.referrer_id,
    referrerEmail: r.referrer_email,
    refereeId: r.referee_id,
    refereeEmail: r.referee_email,
    code: r.code,
    status: r.status as Referral["status"],
    creditAmount: typeof r.credit_amount === "string" ? parseFloat(r.credit_amount) : r.credit_amount,
    createdAt: rIso(r.created_at),
    convertedAt: rIsoOrNull(r.converted_at),
    creditedAt: rIsoOrNull(r.credited_at),
  };
}

/** Write-through persist for a referral record (insert on create, upsert on conversion/credit). Best-effort; never throws. */
export async function persistReferral(referral: Referral): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    if (store.selectById(REFERRALS_TABLE, referral.id)) {
      store.update(REFERRALS_TABLE, referral.id, referralToRow(referral));
    } else {
      store.insert(REFERRALS_TABLE, referralToRow(referral));
    }
    return;
  }
  try {
    await db.query(
      `INSERT INTO referrals
         (id, referrer_id, referrer_email, referee_id, referee_email, code,
          status, credit_amount, created_at, converted_at, credited_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (id) DO UPDATE SET
         referee_id = EXCLUDED.referee_id,
         status = EXCLUDED.status,
         converted_at = EXCLUDED.converted_at,
         credited_at = EXCLUDED.credited_at,
         updated_at = NOW()`,
      [
        referral.id, referral.referrerId, referral.referrerEmail, referral.refereeId,
        referral.refereeEmail, referral.code, referral.status, referral.creditAmount,
        referral.createdAt, referral.convertedAt, referral.creditedAt,
      ],
    );
  } catch (e) {
    console.error("[Referrals] DB persistReferral failed:", e instanceof Error ? e.message : e);
  }
}

/** Persist a business's generated referral code so shared links stay stable across deploys. */
export async function persistBusinessCode(businessId: string, code: string): Promise<void> {
  const store = getInMemoryStore();
  if (store) {
    if (!store.selectById(BIZ_CODES_TABLE, businessId)) {
      store.insert(BIZ_CODES_TABLE, { id: businessId, business_id: businessId, code });
    }
    return;
  }
  try {
    await db.query(
      `INSERT INTO business_referral_codes (business_id, code)
       VALUES ($1, $2) ON CONFLICT (business_id) DO NOTHING`,
      [businessId, code],
    );
  } catch (e) {
    console.error("[Referrals] DB persistBusinessCode failed:", e instanceof Error ? e.message : e);
  }
}

let _hydrationPromise: Promise<void> | null = null;

/**
 * Load persisted referrals + business codes into the cache once per process,
 * rebuilding every in-memory index. Best-effort; never throws. Routes await
 * this before any read/lookup so a cold instance doesn't miss a referral.
 */
export function hydrateReferrals(): Promise<void> {
  if (_hydrationPromise) return _hydrationPromise;
  _hydrationPromise = (async () => {
    try {
      const store = getInMemoryStore();
      const refRows: ReferralRow[] = store
        ? (store.selectMany(REFERRALS_TABLE, {}, { perPage: 1_000_000 }).rows as unknown as ReferralRow[])
        : (
            await db.query<ReferralRow>(
              `SELECT id, referrer_id, referrer_email, referee_id, referee_email, code,
                      status, credit_amount, created_at, converted_at, credited_at
                 FROM referrals`,
            )
          ).rows;
      for (const row of refRows) {
        const r = rowToReferral(row);
        if (referrals.has(r.id)) continue;
        referrals.set(r.id, r);
        codeIndex.set(`${r.code}:${r.refereeEmail}`, r.id);
        let refs = referrerIndex.get(r.referrerId);
        if (!refs) {
          refs = new Set();
          referrerIndex.set(r.referrerId, refs);
        }
        refs.add(r.id);
        if (r.refereeId) refereeIndex.set(r.refereeId, r.id);
      }

      const codeRows: BizCodeRow[] = store
        ? (store.selectMany(BIZ_CODES_TABLE, {}, { perPage: 1_000_000 }).rows as unknown as BizCodeRow[])
        : (await db.query<BizCodeRow>(`SELECT business_id, code FROM business_referral_codes`)).rows;
      for (const row of codeRows) {
        if (!businessCodeIndex.has(row.business_id)) businessCodeIndex.set(row.business_id, row.code);
      }
    } catch (e) {
      console.error("[Referrals] hydration failed:", e instanceof Error ? e.message : e);
      _hydrationPromise = null;
    }
  })();
  return _hydrationPromise;
}

// Warm the cache as soon as this module loads on a fresh instance.
void hydrateReferrals();

/**
 * Reset all referral data (cache AND durable rows). Used for testing isolation.
 */
export function _resetReferrals(): void {
  referrals.clear();
  codeIndex.clear();
  referrerIndex.clear();
  businessCodeIndex.clear();
  refereeIndex.clear();
  const store = getInMemoryStore();
  if (store) {
    for (const row of store.selectMany(REFERRALS_TABLE, {}, { perPage: 1_000_000 }).rows) {
      store.delete(REFERRALS_TABLE, row.id as string);
    }
    for (const row of store.selectMany(BIZ_CODES_TABLE, {}, { perPage: 1_000_000 }).rows) {
      store.delete(BIZ_CODES_TABLE, row.id as string);
    }
  }
  _hydrationPromise = null;
}

/**
 * Test-only: simulate a serverless cold start. Drops the in-memory cache but
 * keeps the durable backing rows, and resets hydration.
 */
export function __resetReferralCacheForTests(): void {
  referrals.clear();
  codeIndex.clear();
  referrerIndex.clear();
  businessCodeIndex.clear();
  refereeIndex.clear();
  _hydrationPromise = null;
}
