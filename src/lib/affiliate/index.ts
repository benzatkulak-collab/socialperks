/**
 * Affiliate Program
 *
 * Distinct from /lib/referrals (which is business-to-business credit referrals).
 * The affiliate program is a public 30%-recurring-commission growth program for
 * any user who wants to promote Social Perks. Codes are 8-char alphanumeric.
 *
 * In-memory store for now — same pattern as the rest of /lib. Migration-ready
 * for Postgres via the schema in /lib/db/schema.ts.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export type AffiliateStatus = "active" | "paused" | "banned";
export type ReferralStatus = "pending" | "converted";

export interface Affiliate {
  id: string;
  userId: string;
  code: string; // 8-char alphanumeric
  commissionRate: number; // 0..1, default 0.30
  totalEarned: number; // in dollars
  totalReferred: number; // count of referrals (any status)
  status: AffiliateStatus;
  createdAt: string;
}

export interface AffiliateReferral {
  id: string;
  affiliateId: string;
  referredUserId: string | null; // null while only the click is tracked
  status: ReferralStatus;
  commissionAmount: number; // dollars credited at conversion
  createdAt: string;
  convertedAt: string | null;
}

export interface AffiliateClick {
  id: string;
  affiliateId: string;
  ip: string;
  userAgent: string;
  createdAt: string;
}

export interface AffiliateStats {
  code: string;
  link: string;
  status: AffiliateStatus;
  commissionRate: number;
  clicks: number;
  signups: number;
  conversions: number;
  totalEarned: number;
  pendingEarnings: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────

const ALPHANUMERIC = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const CODE_LENGTH = 8;
export const DEFAULT_COMMISSION_RATE = 0.3;

// ─── Storage ────────────────────────────────────────────────────────────────

const affiliates = new Map<string, Affiliate>(); // by id
const codeIndex = new Map<string, string>(); // code -> affiliateId
const userIndex = new Map<string, string>(); // userId -> affiliateId
const referralsByAffiliate = new Map<string, AffiliateReferral[]>();
const clicksByAffiliate = new Map<string, AffiliateClick[]>();

// ─── Helpers ────────────────────────────────────────────────────────────────

function randomCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    out += ALPHANUMERIC[Math.floor(Math.random() * ALPHANUMERIC.length)];
  }
  return out;
}

function uniqueCode(): string {
  let attempts = 0;
  while (attempts < 100) {
    const c = randomCode();
    if (!codeIndex.has(c)) return c;
    attempts++;
  }
  throw new Error("Failed to generate unique affiliate code");
}

function newId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
}

function baseUrl(): string {
  return process.env.NEXT_PUBLIC_BASE_URL ?? "https://socialperks.onrender.com";
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create an affiliate record for a user. Idempotent — returns existing record
 * if the user already has one.
 */
export function createAffiliate(userId: string): Affiliate {
  const existingId = userIndex.get(userId);
  if (existingId) {
    const existing = affiliates.get(existingId);
    if (existing) return existing;
  }

  const id = newId("aff");
  const code = uniqueCode();
  const affiliate: Affiliate = {
    id,
    userId,
    code,
    commissionRate: DEFAULT_COMMISSION_RATE,
    totalEarned: 0,
    totalReferred: 0,
    status: "active",
    createdAt: new Date().toISOString(),
  };

  affiliates.set(id, affiliate);
  codeIndex.set(code, id);
  userIndex.set(userId, id);
  referralsByAffiliate.set(id, []);
  clicksByAffiliate.set(id, []);

  return affiliate;
}

/** Look up an affiliate by their public code. */
export function getAffiliateByCode(code: string): Affiliate | null {
  const id = codeIndex.get(code.toUpperCase());
  if (!id) return null;
  return affiliates.get(id) ?? null;
}

/** Look up an affiliate by user id. */
export function getAffiliateByUser(userId: string): Affiliate | null {
  const id = userIndex.get(userId);
  if (!id) return null;
  return affiliates.get(id) ?? null;
}

/**
 * Record a click on an affiliate's tracking link.
 * Capped at 10 000 clicks per affiliate to keep the in-memory store bounded.
 */
export function recordClick(code: string, ip: string, userAgent: string): AffiliateClick | null {
  const aff = getAffiliateByCode(code);
  if (!aff || aff.status !== "active") return null;

  const click: AffiliateClick = {
    id: newId("clk"),
    affiliateId: aff.id,
    ip,
    userAgent: userAgent.slice(0, 500),
    createdAt: new Date().toISOString(),
  };

  const list = clicksByAffiliate.get(aff.id) ?? [];
  list.push(click);
  if (list.length > 10_000) list.shift();
  clicksByAffiliate.set(aff.id, list);

  return click;
}

/**
 * Record that a user signed up via an affiliate code. Creates a pending
 * referral. Idempotent on (code, userId) — returns the existing referral if
 * one already exists for this pair.
 */
export function recordReferral(code: string, userId: string): AffiliateReferral | null {
  const aff = getAffiliateByCode(code);
  if (!aff || aff.status !== "active") return null;

  // Don't let an affiliate refer themselves.
  if (aff.userId === userId) return null;

  const list = referralsByAffiliate.get(aff.id) ?? [];
  const existing = list.find((r) => r.referredUserId === userId);
  if (existing) return existing;

  const referral: AffiliateReferral = {
    id: newId("aref"),
    affiliateId: aff.id,
    referredUserId: userId,
    status: "pending",
    commissionAmount: 0,
    createdAt: new Date().toISOString(),
    convertedAt: null,
  };
  list.push(referral);
  referralsByAffiliate.set(aff.id, list);

  aff.totalReferred += 1;

  return referral;
}

/**
 * Mark a referral as converted (the referred user paid for a subscription)
 * and credit the commission to the affiliate.
 *
 * `amount` is the gross subscription payment; the affiliate is credited
 * `amount * commissionRate`.
 */
export function markReferralConverted(referralId: string, amount: number): AffiliateReferral {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("amount must be a positive number");
  }

  // Find the referral across all affiliates.
  for (const [affiliateId, list] of referralsByAffiliate.entries()) {
    const referral = list.find((r) => r.id === referralId);
    if (!referral) continue;

    // Idempotent — don't double-credit.
    if (referral.status === "converted") return referral;

    const aff = affiliates.get(affiliateId);
    if (!aff) throw new Error(`Affiliate ${affiliateId} not found`);

    const commission = Math.round(amount * aff.commissionRate * 100) / 100;
    referral.status = "converted";
    referral.commissionAmount = commission;
    referral.convertedAt = new Date().toISOString();
    aff.totalEarned = Math.round((aff.totalEarned + commission) * 100) / 100;

    return referral;
  }

  throw new Error(`Referral not found: ${referralId}`);
}

/** Aggregate stats for an affiliate's dashboard. */
export function getStats(affiliateId: string): AffiliateStats {
  const aff = affiliates.get(affiliateId);
  if (!aff) throw new Error(`Affiliate not found: ${affiliateId}`);

  const refs = referralsByAffiliate.get(affiliateId) ?? [];
  const clicks = clicksByAffiliate.get(affiliateId) ?? [];

  const conversions = refs.filter((r) => r.status === "converted");
  const pendingEarnings = 0; // Recurring commissions are credited immediately on each payment.

  return {
    code: aff.code,
    link: getAffiliateLink(aff.code),
    status: aff.status,
    commissionRate: aff.commissionRate,
    clicks: clicks.length,
    signups: refs.length,
    conversions: conversions.length,
    totalEarned: aff.totalEarned,
    pendingEarnings,
  };
}

/** All referrals for an affiliate, newest first. */
export function getReferrals(affiliateId: string): AffiliateReferral[] {
  const list = referralsByAffiliate.get(affiliateId) ?? [];
  return [...list].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/** Public-facing share link. */
export function getAffiliateLink(code: string, redirect = "/signup"): string {
  const params = new URLSearchParams({ code, redirect });
  return `${baseUrl()}/api/v1/affiliate/track?${params.toString()}`;
}

/** Reset all state. Used in tests. */
export function _resetAffiliates(): void {
  affiliates.clear();
  codeIndex.clear();
  userIndex.clear();
  referralsByAffiliate.clear();
  clicksByAffiliate.clear();
}
