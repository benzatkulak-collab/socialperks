/**
 * Redemption codes — one-time, human-readable codes the customer
 * shows the business at checkout to claim their perk.
 *
 * Format: 8 chars, base32 alphabet that excludes ambiguous glyphs
 * (no I, L, O, U, 0, 1). Random; we don't worry about collision because
 * each code is scoped to a single submission and the business looks it
 * up by the (programId, code) pair.
 */

import { programSubmissions, type ProgramSubmission } from "./store";

const ALPHABET = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
const CODE_LENGTH = 8;

export function generateRedemptionCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  // Pretty-print as XXXX-XXXX so the customer can read it back at the
  // counter without confusion. Stored unhyphenated so the lookup
  // doesn't have to normalize.
  return code;
}

/**
 * Format a code for display (XXXX-XXXX). The stored form is
 * unhyphenated; this is purely a presentation helper.
 */
export function formatRedemptionCode(code: string): string {
  if (code.length !== CODE_LENGTH) return code;
  return `${code.slice(0, 4)}-${code.slice(4, 8)}`;
}

/**
 * Look up a submission by program + redemption code. Used by the
 * business "redeem" action so a manual lookup at checkout works
 * without needing the submission UUID.
 */
export function findSubmissionByRedemptionCode(
  programId: string,
  rawCode: string
): ProgramSubmission | null {
  const code = rawCode.replace(/-/g, "").toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const sub of programSubmissions.values()) {
    if (sub.programId === programId && sub.redemptionCode === code) {
      return sub;
    }
  }
  return null;
}
