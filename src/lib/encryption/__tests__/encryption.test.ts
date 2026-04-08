import { describe, it, expect } from "vitest";
import {
  deriveTenantKey,
  encrypt,
  decrypt,
  encryptDeterministic,
  decryptDeterministic,
  encryptPII,
  decryptPII,
  rotateKey,
  type EncryptedField,
} from "../index";

// =============================================================================
// Helpers
// =============================================================================

const MASTER_KEY = "test-master-key-for-encryption-tests";
const TENANT_A = "tenant-a";
const TENANT_B = "tenant-b";

function keyA(): Buffer {
  return deriveTenantKey(MASTER_KEY, TENANT_A);
}

function keyB(): Buffer {
  return deriveTenantKey(MASTER_KEY, TENANT_B);
}

// =============================================================================
// Key Derivation
// =============================================================================

describe("deriveTenantKey", () => {
  it("is deterministic (same inputs produce same key)", () => {
    const key1 = deriveTenantKey(MASTER_KEY, TENANT_A);
    const key2 = deriveTenantKey(MASTER_KEY, TENANT_A);
    expect(key1.equals(key2)).toBe(true);
  });

  it("different tenant IDs produce different keys", () => {
    const a = deriveTenantKey(MASTER_KEY, TENANT_A);
    const b = deriveTenantKey(MASTER_KEY, TENANT_B);
    expect(a.equals(b)).toBe(false);
  });

  it("different master keys produce different keys", () => {
    const k1 = deriveTenantKey("master-one", TENANT_A);
    const k2 = deriveTenantKey("master-two", TENANT_A);
    expect(k1.equals(k2)).toBe(false);
  });

  it("produces a 32-byte key (256 bits)", () => {
    const key = deriveTenantKey(MASTER_KEY, TENANT_A);
    expect(key.length).toBe(32);
  });
});

// =============================================================================
// Standard Encryption (AES-256-GCM)
// =============================================================================

describe("encrypt / decrypt", () => {
  it("round-trip preserves plaintext", () => {
    const plaintext = "Hello, Social Perks!";
    const encrypted = encrypt(plaintext, keyA());
    const decrypted = decrypt(encrypted, keyA());
    expect(decrypted).toBe(plaintext);
  });

  it("different plaintexts produce different ciphertexts", () => {
    const enc1 = encrypt("plaintext-one", keyA());
    const enc2 = encrypt("plaintext-two", keyA());
    expect(enc1.ct).not.toBe(enc2.ct);
  });

  it("same plaintext produces different ciphertexts (random IV)", () => {
    const enc1 = encrypt("same-text", keyA());
    const enc2 = encrypt("same-text", keyA());
    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ct).not.toBe(enc2.ct);
  });

  it("different tenant keys produce different ciphertexts", () => {
    // We can't directly compare because IVs are random, but decrypting
    // with the wrong key should fail
    const encrypted = encrypt("secret", keyA());
    expect(() => decrypt(encrypted, keyB())).toThrow();
  });

  it("tampering with ciphertext causes decrypt to fail", () => {
    const encrypted = encrypt("sensitive data", keyA());
    const tampered: EncryptedField = {
      ...encrypted,
      ct: Buffer.from("tampered-data").toString("base64"),
    };
    expect(() => decrypt(tampered, keyA())).toThrow();
  });

  it("tampering with auth tag causes decrypt to fail", () => {
    const encrypted = encrypt("sensitive data", keyA());
    const tampered: EncryptedField = {
      ...encrypted,
      tag: Buffer.from("0000000000000000").toString("base64"),
    };
    expect(() => decrypt(tampered, keyA())).toThrow();
  });

  it("tampering with IV causes decrypt to fail", () => {
    const encrypted = encrypt("sensitive data", keyA());
    const tampered: EncryptedField = {
      ...encrypted,
      iv: Buffer.from("000000000000").toString("base64"),
    };
    expect(() => decrypt(tampered, keyA())).toThrow();
  });

  it("encrypted field contains version number", () => {
    const encrypted = encrypt("test", keyA());
    expect(encrypted.v).toBe(1);
  });

  it("handles empty string encryption", () => {
    const encrypted = encrypt("", keyA());
    const decrypted = decrypt(encrypted, keyA());
    expect(decrypted).toBe("");
  });

  it("handles unicode text encryption", () => {
    const unicode = "Hej verden! 日本語テスト 🎉 Привет мир Ñoño";
    const encrypted = encrypt(unicode, keyA());
    const decrypted = decrypt(encrypted, keyA());
    expect(decrypted).toBe(unicode);
  });

  it("handles large text encryption (10KB)", () => {
    const largeText = "A".repeat(10 * 1024);
    const encrypted = encrypt(largeText, keyA());
    const decrypted = decrypt(encrypted, keyA());
    expect(decrypted).toBe(largeText);
    expect(decrypted.length).toBe(10 * 1024);
  });
});

// =============================================================================
// Deterministic Encryption
// =============================================================================

describe("encryptDeterministic / decryptDeterministic", () => {
  it("same plaintext produces same ciphertext", () => {
    const ct1 = encryptDeterministic("user@example.com", keyA());
    const ct2 = encryptDeterministic("user@example.com", keyA());
    expect(ct1).toBe(ct2);
  });

  it("round-trip preserves plaintext", () => {
    const plaintext = "search@lookup.com";
    const ct = encryptDeterministic(plaintext, keyA());
    const decrypted = decryptDeterministic(ct, keyA());
    expect(decrypted).toBe(plaintext);
  });

  it("different plaintexts produce different ciphertexts", () => {
    const ct1 = encryptDeterministic("alice@example.com", keyA());
    const ct2 = encryptDeterministic("bob@example.com", keyA());
    expect(ct1).not.toBe(ct2);
  });

  it("different keys produce different ciphertexts for same plaintext", () => {
    const ct1 = encryptDeterministic("same@email.com", keyA());
    const ct2 = encryptDeterministic("same@email.com", keyB());
    expect(ct1).not.toBe(ct2);
  });

  it("handles empty string", () => {
    const ct = encryptDeterministic("", keyA());
    const decrypted = decryptDeterministic(ct, keyA());
    expect(decrypted).toBe("");
  });

  it("handles unicode text", () => {
    const unicode = "ユーザー@例え.jp";
    const ct = encryptDeterministic(unicode, keyA());
    const decrypted = decryptDeterministic(ct, keyA());
    expect(decrypted).toBe(unicode);
  });

  it("decrypting with wrong key fails", () => {
    const ct = encryptDeterministic("secret@email.com", keyA());
    expect(() => decryptDeterministic(ct, keyB())).toThrow();
  });
});

// =============================================================================
// Object-Level PII Encryption / Decryption
// =============================================================================

describe("encryptPII / decryptPII", () => {
  it("round-trip on objects preserves all fields", () => {
    const user = {
      id: "user-123",
      email: "alice@example.com",
      name: "Alice Smith",
      phone: "+1-555-0100",
      role: "admin",
      createdAt: "2026-01-01",
    };

    const piiFields = ["email", "name", "phone"];
    const encrypted = encryptPII(user, piiFields, keyA());

    // PII fields should be EncryptedField objects, not strings
    expect(typeof encrypted.email).toBe("object");
    expect(typeof encrypted.name).toBe("object");
    expect(typeof encrypted.phone).toBe("object");

    // Non-PII fields should be untouched
    expect(encrypted.id).toBe("user-123");
    expect(encrypted.role).toBe("admin");
    expect(encrypted.createdAt).toBe("2026-01-01");

    const decrypted = decryptPII(encrypted, piiFields, keyA());
    expect(decrypted.email).toBe("alice@example.com");
    expect(decrypted.name).toBe("Alice Smith");
    expect(decrypted.phone).toBe("+1-555-0100");
    expect(decrypted.id).toBe("user-123");
    expect(decrypted.role).toBe("admin");
  });

  it("skips null and undefined fields", () => {
    const obj = {
      id: "biz-1",
      email: "shop@example.com",
      phone: null,
      address: undefined,
    };

    const encrypted = encryptPII(obj, ["email", "phone", "address"], keyA());
    expect(typeof encrypted.email).toBe("object"); // encrypted
    expect(encrypted.phone).toBeNull(); // skipped
    expect(encrypted.address).toBeUndefined(); // skipped
  });

  it("does not modify the original object", () => {
    const original = { id: "1", email: "test@test.com" };
    const copy = { ...original };
    encryptPII(original, ["email"], keyA());
    expect(original.email).toBe(copy.email); // unchanged
  });
});

// =============================================================================
// Key Rotation
// =============================================================================

describe("rotateKey", () => {
  it("preserves plaintext after rotation", () => {
    const plaintext = "rotate-me@example.com";
    const encrypted = encrypt(plaintext, keyA());

    const rotated = rotateKey(encrypted, keyA(), keyB());
    const decrypted = decrypt(rotated, keyB());

    expect(decrypted).toBe(plaintext);
  });

  it("bumps the version number", () => {
    const encrypted = encrypt("test", keyA());
    expect(encrypted.v).toBe(1);

    const rotated = rotateKey(encrypted, keyA(), keyB());
    expect(rotated.v).toBe(2);
  });

  it("old key can no longer decrypt after rotation", () => {
    const encrypted = encrypt("secret", keyA());
    const rotated = rotateKey(encrypted, keyA(), keyB());

    expect(() => decrypt(rotated, keyA())).toThrow();
  });

  it("handles multiple rotations", () => {
    const plaintext = "multi-rotate";
    const keyC = deriveTenantKey(MASTER_KEY, "tenant-c");

    const v1 = encrypt(plaintext, keyA());
    expect(v1.v).toBe(1);

    const v2 = rotateKey(v1, keyA(), keyB());
    expect(v2.v).toBe(2);

    const v3 = rotateKey(v2, keyB(), keyC);
    expect(v3.v).toBe(3);

    expect(decrypt(v3, keyC)).toBe(plaintext);
  });
});
