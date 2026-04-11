/**
 * TOTP (Time-based One-Time Password) Implementation
 * ───────────────────────────────────────────────────
 * RFC 6238 compliant TOTP using Node.js built-in crypto.
 * No external dependencies required.
 *
 * Used for 2FA/MFA on user accounts.
 */

import { createHmac, randomBytes } from "crypto";

const TOTP_DIGITS = 6;
const TOTP_PERIOD = 30;
const TOTP_WINDOW = 1; // Allow 1 period before/after for clock drift

// ─── Secret Generation ──────────────────────────────────────────────────────

/**
 * Generate a random TOTP secret (20 bytes, returned as hex string).
 */
export function generateTOTPSecret(): string {
  return randomBytes(20).toString("hex");
}

// ─── Base32 Encoding ────────────────────────────────────────────────────────

/**
 * Convert a hex string to base32 encoding (for OTP Auth URIs / QR codes).
 */
export function hexToBase32(hex: string): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  const bytes = Buffer.from(hex, "hex");
  let bits = "";
  for (const byte of bytes) bits += byte.toString(2).padStart(8, "0");
  let base32 = "";
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, "0");
    base32 += alphabet[parseInt(chunk, 2)];
  }
  return base32;
}

// ─── OTP Auth URI ───────────────────────────────────────────────────────────

/**
 * Generate an OTP Auth URI for use with authenticator apps (Google Auth, Authy, etc.).
 * Can be encoded into a QR code for easy scanning.
 */
export function generateTOTPUri(
  secret: string,
  email: string,
  issuer = "Social Perks"
): string {
  const base32Secret = hexToBase32(secret);
  return `otpauth://totp/${encodeURIComponent(issuer)}:${encodeURIComponent(email)}?secret=${base32Secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=${TOTP_DIGITS}&period=${TOTP_PERIOD}`;
}

// ─── TOTP Generation ────────────────────────────────────────────────────────

/**
 * Generate a TOTP code for a given unix timestamp (in seconds).
 */
function generateTOTP(secret: string, time: number): string {
  const counter = Math.floor(time / TOTP_PERIOD);
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64BE(BigInt(counter));

  const hmac = createHmac("sha1", Buffer.from(secret, "hex"));
  hmac.update(buffer);
  const hash = hmac.digest();

  const offset = hash[hash.length - 1] & 0x0f;
  const code =
    (((hash[offset] & 0x7f) << 24) |
      ((hash[offset + 1] & 0xff) << 16) |
      ((hash[offset + 2] & 0xff) << 8) |
      (hash[offset + 3] & 0xff)) %
    Math.pow(10, TOTP_DIGITS);

  return code.toString().padStart(TOTP_DIGITS, "0");
}

// ─── TOTP Verification ──────────────────────────────────────────────────────

/**
 * Constant-time string comparison to prevent timing attacks.
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Verify a TOTP code against a secret.
 * Checks the current period plus +/- TOTP_WINDOW periods
 * to account for slight clock drift between server and authenticator app.
 */
export function verifyTOTP(secret: string, code: string): boolean {
  if (!secret || !code || code.length !== TOTP_DIGITS) return false;

  const now = Math.floor(Date.now() / 1000);
  for (let i = -TOTP_WINDOW; i <= TOTP_WINDOW; i++) {
    const expected = generateTOTP(secret, now + i * TOTP_PERIOD);
    if (timingSafeEqual(code, expected)) return true;
  }
  return false;
}
