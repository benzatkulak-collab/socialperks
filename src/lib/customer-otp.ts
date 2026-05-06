/**
 * Customer OTP — passwordless auth for the public claim flow.
 *
 * A customer scans a QR sticker at a business, lands on /claim/[code],
 * and is asked to verify their phone (Twilio SMS) or email (Resend
 * magic-link / 6-digit fallback). They never create a full account —
 * the OTP issues a short-lived signed token tied to (programId, contact)
 * that the submit endpoint then validates.
 *
 * Storage: write-through to Postgres `customer_otp` table when
 * DATABASE_URL is set, in-memory Map otherwise. Mirrors the pattern
 * used by `webhook-dedup.ts` so cold-start and hot-reload behavior is
 * the same.
 *
 * Threat model:
 *  - Brute force: max 5 verify attempts per code, 5-minute expiry.
 *  - Replay: codes are single-use; verify deletes the row on success.
 *  - Enumeration: request endpoint always returns 200 regardless of
 *    delivery success or whether the contact "exists" (we have no
 *    customer table to enumerate, but this keeps the path consistent).
 *  - Token forgery: claim tokens are HMAC-SHA256 over the same secret
 *    used for JWTs, with a separate `purpose: "claim"` claim so they
 *    can't be confused with login tokens.
 */

import crypto from "node:crypto";
import { db, InMemoryConnection } from "@/lib/db/connection";
import { getJwtSecret } from "@/lib/auth";

// ─── Constants ──────────────────────────────────────────────────────────────

const OTP_LENGTH = 6;
const OTP_TTL_SECONDS = 5 * 60; // 5 minutes
const OTP_MAX_ATTEMPTS = 5;
const CLAIM_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes — enough to fill the form

const usingDb = !(db instanceof InMemoryConnection);

// ─── Types ──────────────────────────────────────────────────────────────────

export type OtpChannel = "sms" | "email";

interface OtpRow {
  programId: string;
  channel: OtpChannel;
  contact: string; // E.164 phone or lowercased email
  codeHash: string; // SHA-256 of the OTP code
  attempts: number;
  expiresAt: number; // unix ms
}

interface ClaimTokenPayload {
  purpose: "claim";
  programId: string;
  channel: OtpChannel;
  contact: string;
  iat: number;
  exp: number;
}

export interface CreateOtpResult {
  /** The plaintext code — caller is responsible for delivering it. */
  code: string;
  expiresAt: number;
}

export interface VerifyOtpResult {
  success: boolean;
  /** Signed claim token if verification succeeded. */
  token?: string;
  /** Error code: not_found | expired | wrong_code | too_many_attempts. */
  error?: "not_found" | "expired" | "wrong_code" | "too_many_attempts";
}

// ─── In-memory fallback store ──────────────────────────────────────────────

const memStore = new Map<string, OtpRow>();

function memKey(programId: string, channel: OtpChannel, contact: string): string {
  return `${programId}:${channel}:${contact}`;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function hashCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

function constantTimeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate a cryptographically random 6-digit OTP. Uses rejection
 * sampling so the digit distribution stays uniform (naive `% 10` would
 * have a tiny bias on the lower digits).
 */
export function generateOtpCode(): string {
  let code = "";
  while (code.length < OTP_LENGTH) {
    const buf = new Uint8Array(1);
    crypto.getRandomValues(buf);
    if (buf[0] < 250) {
      // 250 = floor(256/10)*10 — keeps the modulo unbiased.
      code += (buf[0] % 10).toString();
    }
  }
  return code;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64url");
}

/**
 * Sign a short-lived claim token. Format mirrors a JWT (header.payload.sig)
 * but uses a `purpose: "claim"` claim so it can't be swapped in for a
 * regular auth token.
 */
export function signClaimToken(
  programId: string,
  channel: OtpChannel,
  contact: string,
  ttlSeconds: number = CLAIM_TOKEN_TTL_SECONDS
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload: ClaimTokenPayload = {
    purpose: "claim",
    programId,
    channel,
    contact,
    iat: now,
    exp: now + ttlSeconds,
  };
  const body = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac("sha256", getJwtSecret())
    .update(`${header}.${body}`)
    .digest("base64url");
  return `${header}.${body}.${signature}`;
}

/**
 * Verify a signed claim token. Returns the payload on success, null on
 * any failure (bad signature, expired, wrong purpose, malformed).
 */
export function verifyClaimToken(token: string): ClaimTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [header, body, signature] = parts;

    // Pin algorithm.
    const headerObj = JSON.parse(Buffer.from(header, "base64url").toString("utf8"));
    if (headerObj.alg !== "HS256") return null;

    const expected = crypto
      .createHmac("sha256", getJwtSecret())
      .update(`${header}.${body}`)
      .digest("base64url");

    if (signature.length !== expected.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
      return null;
    }

    const payload: ClaimTokenPayload = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8")
    );
    if (payload.purpose !== "claim") return null;

    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) return null;
    return payload;
  } catch {
    return null;
  }
}

// ─── Persistence ────────────────────────────────────────────────────────────

async function dbPut(row: OtpRow): Promise<void> {
  if (!usingDb) {
    memStore.set(memKey(row.programId, row.channel, row.contact), row);
    return;
  }
  // Upsert — issuing a new code for the same (program, contact) replaces
  // the prior one. Resets attempts so a fresh code starts with the
  // full attempt budget.
  await db.query(
    `INSERT INTO customer_otp (program_id, channel, contact, code_hash, attempts, expires_at)
     VALUES ($1, $2, $3, $4, 0, to_timestamp($5/1000.0))
     ON CONFLICT (program_id, channel, contact)
     DO UPDATE SET code_hash = EXCLUDED.code_hash,
                   attempts  = 0,
                   expires_at = EXCLUDED.expires_at`,
    [row.programId, row.channel, row.contact, row.codeHash, row.expiresAt]
  );
}

async function dbGet(
  programId: string,
  channel: OtpChannel,
  contact: string
): Promise<OtpRow | null> {
  if (!usingDb) {
    return memStore.get(memKey(programId, channel, contact)) ?? null;
  }
  const result = await db.query<{
    program_id: string;
    channel: OtpChannel;
    contact: string;
    code_hash: string;
    attempts: number;
    expires_at: string;
  }>(
    `SELECT program_id, channel, contact, code_hash, attempts, expires_at
     FROM customer_otp WHERE program_id = $1 AND channel = $2 AND contact = $3`,
    [programId, channel, contact]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    programId: row.program_id,
    channel: row.channel,
    contact: row.contact,
    codeHash: row.code_hash,
    attempts: row.attempts,
    expiresAt: new Date(row.expires_at).getTime(),
  };
}

async function dbIncrementAttempts(
  programId: string,
  channel: OtpChannel,
  contact: string
): Promise<void> {
  if (!usingDb) {
    const existing = memStore.get(memKey(programId, channel, contact));
    if (existing) {
      existing.attempts += 1;
      memStore.set(memKey(programId, channel, contact), existing);
    }
    return;
  }
  await db.query(
    `UPDATE customer_otp SET attempts = attempts + 1
     WHERE program_id = $1 AND channel = $2 AND contact = $3`,
    [programId, channel, contact]
  );
}

async function dbDelete(
  programId: string,
  channel: OtpChannel,
  contact: string
): Promise<void> {
  if (!usingDb) {
    memStore.delete(memKey(programId, channel, contact));
    return;
  }
  await db.query(
    `DELETE FROM customer_otp WHERE program_id = $1 AND channel = $2 AND contact = $3`,
    [programId, channel, contact]
  );
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create (or replace) an OTP for a (program, contact) pair. Returns the
 * plaintext code which the caller is responsible for delivering — this
 * function does NOT send anything itself.
 */
export async function createOtp(
  programId: string,
  channel: OtpChannel,
  contact: string
): Promise<CreateOtpResult> {
  const code = generateOtpCode();
  const expiresAt = Date.now() + OTP_TTL_SECONDS * 1000;
  await dbPut({
    programId,
    channel,
    contact,
    codeHash: hashCode(code),
    attempts: 0,
    expiresAt,
  });
  return { code, expiresAt };
}

/**
 * Verify an OTP and, on success, return a signed claim token. Each call
 * increments the attempt counter; once the budget is exhausted the row
 * is removed so the customer must request a fresh code.
 */
export async function verifyOtp(
  programId: string,
  channel: OtpChannel,
  contact: string,
  code: string
): Promise<VerifyOtpResult> {
  const row = await dbGet(programId, channel, contact);
  if (!row) return { success: false, error: "not_found" };

  if (Date.now() > row.expiresAt) {
    await dbDelete(programId, channel, contact);
    return { success: false, error: "expired" };
  }

  if (row.attempts >= OTP_MAX_ATTEMPTS) {
    await dbDelete(programId, channel, contact);
    return { success: false, error: "too_many_attempts" };
  }

  const expected = row.codeHash;
  const provided = hashCode(code);
  if (!constantTimeEq(provided, expected)) {
    await dbIncrementAttempts(programId, channel, contact);
    return { success: false, error: "wrong_code" };
  }

  // Success — burn the code so it can't be replayed.
  await dbDelete(programId, channel, contact);
  const token = signClaimToken(programId, channel, contact);
  return { success: true, token };
}

// ─── Test Helpers ───────────────────────────────────────────────────────────

/** Clear the in-memory store. No-op when running against Postgres. */
export function _resetCustomerOtpStore(): void {
  memStore.clear();
}

export const OTP_CONSTANTS = {
  OTP_LENGTH,
  OTP_TTL_SECONDS,
  OTP_MAX_ATTEMPTS,
  CLAIM_TOKEN_TTL_SECONDS,
} as const;
