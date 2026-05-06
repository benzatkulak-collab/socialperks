/**
 * Social Perks — Perk Programs Store
 *
 * Shared types and in-memory stores for perk programs.
 * Used by all /api/v1/programs/* route handlers.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProgramTier {
  name: string;
  requiredActions: number;
  perkValue: number;
  perkType: "pct" | "dol";
}

export interface ProgramRule {
  actionId: string;
  platformId: string;
  pointsPerAction: number;
  maxPerCycle: number;
}

export interface PerkProgram {
  id: string;
  businessId: string;
  /** Short, public claim code (6 chars, base32, customer-facing). */
  claimCode: string;
  name: string;
  description: string;
  status: "active" | "paused" | "ended";
  rules: ProgramRule[];
  tiers: ProgramTier[];
  cycle: "weekly" | "monthly" | "quarterly";
  cycleStartDay: number;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramMember {
  id: string;
  programId: string;
  memberId: string;
  name: string;
  email: string;
  enrolledAt: string;
  totalPoints: number;
  currentTier: string | null;
}

export interface ProgramSubmission {
  id: string;
  programId: string;
  memberId: string;
  actionId: string;
  platformId: string;
  proofUrl: string;
  proofType: string;
  points: number;
  status: "pending" | "approved" | "rejected";
  submittedAt: string;
  reviewedAt: string | null;
  /**
   * One-time redemption code shown to the customer after submitting.
   * Visible immediately for an optimistic UX; flips to redeemedAt once
   * the business marks it used. Null for legacy submissions created
   * before PR D landed.
   */
  redemptionCode: string | null;
  redeemedAt: string | null;
  /** Channel + contact the redemption code was emailed/SMSed to. */
  notifiedChannel: "sms" | "email" | null;
  notifiedContact: string | null;
}

export interface Payout {
  id: string;
  programId: string;
  memberId: string;
  amount: number;
  currency: string;
  status: "pending" | "approved" | "paid" | "rejected";
  requestedAt: string;
  processedAt: string | null;
  note: string | null;
}

// ─── In-Memory Stores ───────────────────────────────────────────────────────

export const programs = new Map<string, PerkProgram>();
export const programMembers = new Map<string, ProgramMember>();
export const programSubmissions = new Map<string, ProgramSubmission>();
export const payouts = new Map<string, Payout>();

// ─── Claim Code Helpers ─────────────────────────────────────────────────────

// Crockford-style base32 alphabet (no I, L, O, U, 0, 1 — humans can read).
const CLAIM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CLAIM_CODE_LENGTH = 6;

/** Reverse index: upper-case claim code → program id. */
const claimCodeIndex = new Map<string, string>();

/**
 * Generate a random 6-char base32 claim code that does not collide with
 * any existing program. Caller is responsible for storing the program
 * with this code via {@link registerClaimCode}.
 */
export function generateClaimCode(): string {
  // Crypto-randomness so attackers can't enumerate by guessing.
  for (let attempt = 0; attempt < 25; attempt++) {
    const bytes = new Uint8Array(CLAIM_CODE_LENGTH);
    crypto.getRandomValues(bytes);
    let code = "";
    for (let i = 0; i < CLAIM_CODE_LENGTH; i++) {
      code += CLAIM_CODE_ALPHABET[bytes[i] % CLAIM_CODE_ALPHABET.length];
    }
    if (!claimCodeIndex.has(code)) return code;
  }
  // 30^6 = 729M space — collisions after 25 retries are statistically impossible
  // unless someone is calling this in a tight loop with the index seeded.
  throw new Error("Failed to generate unique claim code after 25 attempts");
}

/** Add a (code → programId) entry to the reverse index. */
export function registerClaimCode(code: string, programId: string): void {
  claimCodeIndex.set(code.toUpperCase(), programId);
}

/** Look up a program by its public claim code. Case-insensitive. */
export function getProgramByClaimCode(code: string): PerkProgram | null {
  if (typeof code !== "string") return null;
  const programId = claimCodeIndex.get(code.toUpperCase());
  if (!programId) return null;
  return programs.get(programId) ?? null;
}

/** Drop a claim code from the index — used when a program is deleted. */
export function unregisterClaimCode(code: string): void {
  claimCodeIndex.delete(code.toUpperCase());
}

/**
 * Validate the shape of a claim code. The format is fixed (6 chars from the
 * Crockford alphabet) so we can reject malformed input cheaply before any
 * downstream lookup.
 */
export function isValidClaimCodeFormat(code: unknown): code is string {
  if (typeof code !== "string") return false;
  if (code.length !== CLAIM_CODE_LENGTH) return false;
  const upper = code.toUpperCase();
  for (let i = 0; i < upper.length; i++) {
    if (!CLAIM_CODE_ALPHABET.includes(upper[i])) return false;
  }
  return true;
}

/** Test helper — clear the claim code index. Not exported in production paths. */
export function _resetClaimCodeIndex(): void {
  claimCodeIndex.clear();
}
