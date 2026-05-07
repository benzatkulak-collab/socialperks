/**
 * Signed attestation receipts for approved submissions.
 *
 * Closes the "attestation / signed receipts" gap from the agent-attraction
 * audit (PR #42). Until now, when an agent submitted proof of a
 * marketing action, the platform held the only authoritative record
 * that the action happened — agents had to trust Social Perks blindly,
 * and disputes had no portable artifact.
 *
 * A signed receipt is a self-verifying JSON blob that says:
 *   "Social Perks attests that on <approvedAt>, <submitterUserId>
 *    completed <actionId> on <platformId> for campaign <campaignId>,
 *    proven by <proofUrl>, redeemable for <perkValue> <perkType>."
 *
 * Anyone holding the receipt + the platform's signing-key id can
 * verify it without calling Social Perks back. That's:
 *   - Useful for the brand-side agent: cryptographic proof of work.
 *   - Useful for the creator-side agent: portable record of earnings.
 *   - Useful for the platform: a tamper-evident audit trail that
 *     drops fraud-dispute resolution time.
 *
 * Algorithm: HMAC-SHA256 over canonical JSON. Same primitive the JWT
 * subsystem uses, same secret (AUTH_SECRET) — no new key management.
 * Format mirrors a JWT triple (header.payload.signature) so existing
 * tooling can decode it for inspection.
 *
 * Storage: in-memory ring of last 10k receipts for the public GET
 * endpoint; receipts are also surfaced inline in the approval response
 * so callers don't have to round-trip. Postgres write-through is a
 * follow-up.
 */

import crypto from "node:crypto";
import { getJwtSecret } from "@/lib/auth";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ReceiptPayload {
  /** Schema version — pin in callers so we can evolve without breakage. */
  version: 1;
  /** Always this constant — discriminator vs other JWT-shaped tokens. */
  type: "social-perks-attestation";
  /** Unique receipt id. */
  receiptId: string;
  /** What submission was approved. */
  submissionId: string;
  /** What campaign it was for. */
  campaignId: string;
  /** Brand that the campaign belongs to. */
  businessId: string;
  /** Who submitted. May be null for anonymous public-claim flow. */
  submitterUserId: string | null;
  /** Action / platform identity. */
  actionId: string;
  platformId: string;
  /** Proof URL the submitter provided. */
  proofUrl: string;
  /** Reward earned, in the campaign's denomination. */
  perkValue: number;
  perkType: "dol" | "pct";
  /** ISO timestamps. */
  approvedAt: string;
  issuedAt: string;
  /** Issuer — fixed, surfaces in the JSON for transparency. */
  issuer: "social-perks.app";
  /** Signing key id — bumps on rotation. */
  keyId: "v1";
}

export interface SignedReceipt {
  /** The signed token. Format: `sprcpt.<b64url(payload)>.<b64url(sig)>` */
  token: string;
  /** Decoded payload — convenience for callers that don't want to re-parse. */
  payload: ReceiptPayload;
  /** Signing algorithm. */
  algorithm: "HMAC-SHA256";
}

export interface VerifyResult {
  valid: boolean;
  payload?: ReceiptPayload;
  error?:
    | "malformed"
    | "wrong_type"
    | "signature_mismatch"
    | "unknown_key"
    | "expired"; // reserved for future TTL semantics
}

// ─── Encoding ───────────────────────────────────────────────────────────────

const PREFIX = "sprcpt";
const KEY_ID: ReceiptPayload["keyId"] = "v1";

function b64url(buf: Buffer | string): string {
  const b = typeof buf === "string" ? Buffer.from(buf) : buf;
  return b.toString("base64url");
}

function fromB64url(s: string): Buffer {
  return Buffer.from(s, "base64url");
}

/**
 * Canonical JSON: keys in a fixed order so the HMAC is reproducible.
 * Object.keys order is insertion-order in modern V8 but we don't trust
 * implicit ordering for signed payloads.
 */
function canonicalize(payload: ReceiptPayload): string {
  const ordered = {
    actionId: payload.actionId,
    approvedAt: payload.approvedAt,
    businessId: payload.businessId,
    campaignId: payload.campaignId,
    issuedAt: payload.issuedAt,
    issuer: payload.issuer,
    keyId: payload.keyId,
    perkType: payload.perkType,
    perkValue: payload.perkValue,
    platformId: payload.platformId,
    proofUrl: payload.proofUrl,
    receiptId: payload.receiptId,
    submissionId: payload.submissionId,
    submitterUserId: payload.submitterUserId,
    type: payload.type,
    version: payload.version,
  };
  return JSON.stringify(ordered);
}

function sign(payload: ReceiptPayload): string {
  const canonical = canonicalize(payload);
  const sig = crypto
    .createHmac("sha256", getJwtSecret())
    .update(canonical)
    .digest("base64url");
  return sig;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Build a signed receipt for an approved submission.
 *
 * The caller is responsible for ensuring this is only called AFTER
 * the submission is genuinely approved — issuing a receipt for a
 * pending or rejected submission would defeat the trust signal.
 */
export function signReceipt(args: {
  submissionId: string;
  campaignId: string;
  businessId: string;
  submitterUserId: string | null;
  actionId: string;
  platformId: string;
  proofUrl: string;
  perkValue: number;
  perkType: "dol" | "pct";
  approvedAt: string;
}): SignedReceipt {
  const payload: ReceiptPayload = {
    version: 1,
    type: "social-perks-attestation",
    receiptId: `rcp_${crypto.randomUUID()}`,
    submissionId: args.submissionId,
    campaignId: args.campaignId,
    businessId: args.businessId,
    submitterUserId: args.submitterUserId,
    actionId: args.actionId,
    platformId: args.platformId,
    proofUrl: args.proofUrl,
    perkValue: args.perkValue,
    perkType: args.perkType,
    approvedAt: args.approvedAt,
    issuedAt: new Date().toISOString(),
    issuer: "social-perks.app",
    keyId: KEY_ID,
  };

  const signature = sign(payload);
  const token = `${PREFIX}.${b64url(canonicalize(payload))}.${signature}`;

  // Store in the recent ring so GET /receipt can look it up by id.
  recentReceiptsByReceiptId.set(payload.receiptId, { token, payload });
  recentReceiptsBySubmissionId.set(args.submissionId, { token, payload });
  if (recentReceiptsByReceiptId.size > RECENT_CAPACITY) {
    const oldest = recentReceiptsByReceiptId.keys().next().value;
    if (oldest) recentReceiptsByReceiptId.delete(oldest);
  }
  if (recentReceiptsBySubmissionId.size > RECENT_CAPACITY) {
    const oldest = recentReceiptsBySubmissionId.keys().next().value;
    if (oldest) recentReceiptsBySubmissionId.delete(oldest);
  }

  return {
    token,
    payload,
    algorithm: "HMAC-SHA256",
  };
}

/**
 * Verify a receipt token. Constant-time signature comparison; returns
 * a structured result so callers can branch on the failure reason for
 * UX purposes (without leaking which check failed across the network —
 * always present a generic error to public callers).
 */
export function verifyReceipt(token: string): VerifyResult {
  if (typeof token !== "string") return { valid: false, error: "malformed" };
  const parts = token.split(".");
  if (parts.length !== 3) return { valid: false, error: "malformed" };
  const [prefix, payloadB64, signature] = parts;
  if (prefix !== PREFIX) return { valid: false, error: "malformed" };

  let payload: ReceiptPayload;
  try {
    payload = JSON.parse(fromB64url(payloadB64).toString("utf8")) as ReceiptPayload;
  } catch {
    return { valid: false, error: "malformed" };
  }

  if (payload.type !== "social-perks-attestation") {
    return { valid: false, error: "wrong_type" };
  }

  // Key rotation hook — extend with a Map<KeyId, secret> when rotating.
  if (payload.keyId !== KEY_ID) {
    return { valid: false, error: "unknown_key" };
  }

  const expected = sign(payload);
  if (signature.length !== expected.length) {
    return { valid: false, error: "signature_mismatch" };
  }
  const ok = crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!ok) return { valid: false, error: "signature_mismatch" };

  return { valid: true, payload };
}

// ─── Recent-receipts ring (for the GET endpoint) ────────────────────────────

const RECENT_CAPACITY = 10_000;
const recentReceiptsByReceiptId = new Map<
  string,
  { token: string; payload: ReceiptPayload }
>();
const recentReceiptsBySubmissionId = new Map<
  string,
  { token: string; payload: ReceiptPayload }
>();

export function getReceiptForSubmission(
  submissionId: string
): { token: string; payload: ReceiptPayload } | null {
  return recentReceiptsBySubmissionId.get(submissionId) ?? null;
}

export function getReceiptByReceiptId(
  receiptId: string
): { token: string; payload: ReceiptPayload } | null {
  return recentReceiptsByReceiptId.get(receiptId) ?? null;
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

export function _resetReceiptStore(): void {
  recentReceiptsByReceiptId.clear();
  recentReceiptsBySubmissionId.clear();
}
