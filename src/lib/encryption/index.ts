import { createCipheriv, createDecipheriv, createHmac, randomBytes } from "crypto";

// =============================================================================
// Types
// =============================================================================

export interface EncryptedField {
  ct: string; // ciphertext (base64)
  iv: string; // initialization vector (base64)
  tag: string; // auth tag (base64)
  v: number; // version (for key rotation)
}

// =============================================================================
// Constants
// =============================================================================

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recommended for GCM
const KEY_LENGTH = 32; // 256 bits
const CURRENT_VERSION = 1;
const HKDF_HASH = "sha256";

// Dev-only fallback — production MUST set ENCRYPTION_MASTER_KEY
const DEV_MASTER_KEY = "dev-only-master-key-do-not-use-in-production-00";

// =============================================================================
// Internal Helpers
// =============================================================================

function getMasterKey(): string {
  return process.env.ENCRYPTION_MASTER_KEY || DEV_MASTER_KEY;
}

/**
 * HKDF-Expand using HMAC-SHA256.
 * Simplified single-step extraction since our master key is already
 * high-entropy and we only need one key per tenant.
 */
function hkdfDeriveKey(ikm: string, info: string): Buffer {
  // Extract: PRK = HMAC-SHA256(salt, ikm)
  const salt = Buffer.alloc(32, 0); // fixed zero salt — ikm is already a key
  const prk = createHmac(HKDF_HASH, salt).update(ikm).digest();

  // Expand: OKM = HMAC-SHA256(PRK, info || 0x01) truncated to KEY_LENGTH
  const okm = createHmac(HKDF_HASH, prk)
    .update(Buffer.concat([Buffer.from(info, "utf8"), Buffer.from([0x01])]))
    .digest();

  return okm.subarray(0, KEY_LENGTH);
}

// =============================================================================
// Key Derivation
// =============================================================================

/**
 * Derive a per-tenant encryption key from master key + tenant ID.
 * Uses HKDF (HMAC-based Key Derivation Function) so each tenant gets
 * a cryptographically independent key.
 */
export function deriveTenantKey(masterKey: string, tenantId: string): Buffer {
  return hkdfDeriveKey(masterKey, `social-perks:tenant:${tenantId}`);
}

// =============================================================================
// Standard Encryption (AES-256-GCM, random IV)
// =============================================================================

/**
 * Encrypt a string value using AES-256-GCM with a random IV.
 * Every call produces a different ciphertext even for the same plaintext.
 */
export function encrypt(plaintext: string, tenantKey: Buffer): EncryptedField {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, tenantKey, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return {
    ct: encrypted.toString("base64"),
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    v: CURRENT_VERSION,
  };
}

/**
 * Decrypt an encrypted field using AES-256-GCM.
 * Throws if the ciphertext or auth tag has been tampered with.
 */
export function decrypt(encrypted: EncryptedField, tenantKey: Buffer): string {
  const iv = Buffer.from(encrypted.iv, "base64");
  const tag = Buffer.from(encrypted.tag, "base64");
  const ct = Buffer.from(encrypted.ct, "base64");

  const decipher = createDecipheriv(ALGORITHM, tenantKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);

  return decrypted.toString("utf8");
}

// =============================================================================
// Deterministic Encryption (AES-256-GCM, HMAC-derived IV)
// =============================================================================

/**
 * Deterministic encryption for searchable fields (e.g. email lookups).
 * Uses HMAC-SHA256 of the plaintext as the IV, so the same plaintext
 * always produces the same ciphertext. This trades some security
 * (leaks equality) for the ability to do lookups on encrypted data.
 *
 * Returns a single base64 string: iv + ciphertext + tag concatenated.
 */
export function encryptDeterministic(
  plaintext: string,
  tenantKey: Buffer
): string {
  // Derive a deterministic IV from HMAC-SHA256(key, plaintext), truncated to IV_LENGTH
  const ivFull = createHmac("sha256", tenantKey)
    .update(plaintext, "utf8")
    .digest();
  const iv = ivFull.subarray(0, IV_LENGTH);

  const cipher = createCipheriv(ALGORITHM, tenantKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();

  // Pack iv + ciphertext + tag into a single base64 string
  return Buffer.concat([iv, encrypted, tag]).toString("base64");
}

/**
 * Decrypt a deterministically encrypted value.
 */
export function decryptDeterministic(
  ciphertext: string,
  tenantKey: Buffer
): string {
  const buf = Buffer.from(ciphertext, "base64");

  const iv = buf.subarray(0, IV_LENGTH);
  const tag = buf.subarray(buf.length - 16); // GCM tag is always 16 bytes
  const ct = buf.subarray(IV_LENGTH, buf.length - 16);

  const decipher = createDecipheriv(ALGORITHM, tenantKey, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([decipher.update(ct), decipher.final()]);

  return decrypted.toString("utf8");
}

// =============================================================================
// Object-Level PII Encryption / Decryption
// =============================================================================

/**
 * Encrypt specified PII fields on an object (in place copy).
 * Non-PII fields are left untouched. Fields that are undefined/null are skipped.
 */
export function encryptPII<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
  tenantKey: Buffer
): T {
  const result = { ...obj };

  for (const field of fields) {
    const value = result[field];
    if (value === undefined || value === null) continue;
    if (typeof value !== "string") {
      // Serialize non-string values before encrypting
      (result as Record<string, unknown>)[field] = encrypt(
        JSON.stringify(value),
        tenantKey
      );
    } else {
      (result as Record<string, unknown>)[field] = encrypt(value, tenantKey);
    }
  }

  return result;
}

/**
 * Decrypt specified PII fields on an object.
 * Fields that are not EncryptedField objects are left untouched.
 */
export function decryptPII<T extends Record<string, unknown>>(
  obj: T,
  fields: string[],
  tenantKey: Buffer
): T {
  const result = { ...obj };

  for (const field of fields) {
    const value = result[field];
    if (value === undefined || value === null) continue;

    // Check if the value looks like an EncryptedField
    if (
      typeof value === "object" &&
      value !== null &&
      "ct" in value &&
      "iv" in value &&
      "tag" in value &&
      "v" in value
    ) {
      (result as Record<string, unknown>)[field] = decrypt(
        value as EncryptedField,
        tenantKey
      );
    }
  }

  return result;
}

// =============================================================================
// Key Rotation
// =============================================================================

/**
 * Re-encrypt an encrypted field with a new key.
 * Decrypts with the old key, re-encrypts with the new key,
 * and bumps the version number.
 */
export function rotateKey(
  encrypted: EncryptedField,
  oldKey: Buffer,
  newKey: Buffer
): EncryptedField {
  const plaintext = decrypt(encrypted, oldKey);
  const reEncrypted = encrypt(plaintext, newKey);
  return {
    ...reEncrypted,
    v: encrypted.v + 1,
  };
}

// =============================================================================
// Convenience: get tenant key using env master key
// =============================================================================

/**
 * Shorthand to derive a tenant key using the configured master key.
 */
export function getTenantKey(tenantId: string): Buffer {
  return deriveTenantKey(getMasterKey(), tenantId);
}
