import { describe, it, expect, beforeEach } from "vitest";
import {
  hashApiKey,
  compareKeyHashes,
  generateApiKey,
  parseApiKey,
  createApiKey,
  verifyApiKey,
  listApiKeysForBusiness,
  revokeApiKey,
  _resetApiKeyStore,
} from "../api-keys";

beforeEach(() => {
  _resetApiKeyStore();
});

// ─── hashApiKey ─────────────────────────────────────────────────────────────

describe("hashApiKey", () => {
  it("produces a 64-char hex string (SHA-256)", () => {
    const h = hashApiKey("sp_live_deadbeef_00112233445566778899aabbccddeeff");
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });

  it("is deterministic for the same input", () => {
    const h1 = hashApiKey("hello");
    const h2 = hashApiKey("hello");
    expect(h1).toBe(h2);
  });

  it("differs for different inputs", () => {
    expect(hashApiKey("a")).not.toBe(hashApiKey("b"));
  });
});

// ─── compareKeyHashes ───────────────────────────────────────────────────────

describe("compareKeyHashes", () => {
  it("returns true for identical hex strings of equal length", () => {
    const h = "a".repeat(64);
    expect(compareKeyHashes(h, h)).toBe(true);
  });

  it("returns false for differing hashes of equal length", () => {
    expect(compareKeyHashes("a".repeat(64), "b".repeat(64))).toBe(false);
  });

  it("returns false for length mismatch (without throwing)", () => {
    expect(compareKeyHashes("abc", "abcd")).toBe(false);
  });

  it("returns false for non-hex input (without throwing)", () => {
    expect(compareKeyHashes("zzzz", "zzzz")).toBe(false);
  });
});

// ─── parseApiKey ────────────────────────────────────────────────────────────

describe("parseApiKey", () => {
  it("parses a valid live key", () => {
    const k = "sp_live_deadbeef_00112233445566778899aabbccddeeff";
    const parsed = parseApiKey(k);
    expect(parsed).toEqual({
      env: "live",
      prefix: "deadbeef",
      random: "00112233445566778899aabbccddeeff",
    });
  });

  it("parses a valid test key", () => {
    const k = "sp_test_cafebabe_aabbccddeeff00112233445566778899";
    expect(parseApiKey(k)?.env).toBe("test");
  });

  it("returns null for non-matching format", () => {
    expect(parseApiKey("not-a-key")).toBeNull();
    expect(parseApiKey("sp_live_short_random")).toBeNull();
    expect(parseApiKey("sp_other_deadbeef_00112233445566778899aabbccddeeff")).toBeNull();
    expect(parseApiKey("")).toBeNull();
  });

  it("rejects uppercase hex (canonical lowercase only)", () => {
    expect(parseApiKey("sp_live_DEADBEEF_00112233445566778899aabbccddeeff")).toBeNull();
  });
});

// ─── generateApiKey ─────────────────────────────────────────────────────────

describe("generateApiKey", () => {
  it("returns plaintext, prefix, and a record without the hash", () => {
    const k = generateApiKey({ businessId: "biz-1", agentName: "test" });
    expect(k.plaintext).toMatch(/^sp_(live|test)_[0-9a-f]{8}_[0-9a-f]{32}$/);
    expect(k.prefix).toMatch(/^[0-9a-f]{8}$/);
    expect(k.record.businessId).toBe("biz-1");
    expect(k.record.agentName).toBe("test");
    expect(k.record.active).toBe(true);
    expect(k.record.lastUsedAt).toBeNull();
    expect((k.record as Record<string, unknown>).keyHash).toBeUndefined();
  });

  it("defaults to live env when not specified", () => {
    const k = generateApiKey({ businessId: "biz-1", agentName: "test" });
    expect(k.plaintext.startsWith("sp_live_")).toBe(true);
  });

  it("honors the test env override", () => {
    const k = generateApiKey({ businessId: "biz-1", agentName: "test", env: "test" });
    expect(k.plaintext.startsWith("sp_test_")).toBe(true);
  });

  it("plaintext prefix matches record.keyPrefix", () => {
    const k = generateApiKey({ businessId: "biz-1", agentName: "test" });
    expect(k.plaintext).toContain(`_${k.record.keyPrefix}_`);
    expect(k.prefix).toBe(k.record.keyPrefix);
  });

  it("produces unique plaintexts on repeated calls (high entropy)", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(generateApiKey({ businessId: "biz-1", agentName: "x" }).plaintext);
    }
    expect(seen.size).toBe(200);
  });

  it("permissions and expiresAt round-trip correctly", () => {
    const exp = new Date(Date.now() + 86_400_000);
    const k = generateApiKey({
      businessId: "biz-1",
      agentName: "test",
      permissions: ["read", "write"],
      expiresAt: exp,
    });
    expect(k.record.permissions).toEqual(["read", "write"]);
    expect(k.record.expiresAt).toEqual(exp);
  });
});

// ─── createApiKey + verifyApiKey round-trip ─────────────────────────────────

describe("createApiKey + verifyApiKey", () => {
  it("verifies a freshly created key", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "claude" });
    const v = verifyApiKey(k.plaintext);
    expect(v).not.toBeNull();
    expect(v?.businessId).toBe("biz-1");
    expect(v?.agentName).toBe("claude");
    expect(v?.active).toBe(true);
  });

  it("returns null for an unknown key", () => {
    expect(verifyApiKey("sp_live_00000000_11111111111111111111111111111111")).toBeNull();
  });

  it("returns null for malformed input", () => {
    expect(verifyApiKey("not a key")).toBeNull();
    expect(verifyApiKey("")).toBeNull();
  });

  it("rejects a tampered key with the same prefix", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "claude" });
    const parsed = parseApiKey(k.plaintext)!;
    // Same prefix, different random portion.
    const tampered = `sp_${parsed.env}_${parsed.prefix}_${"0".repeat(32)}`;
    expect(verifyApiKey(tampered)).toBeNull();
  });

  it("rejects a revoked key", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "claude" });
    revokeApiKey({ id: k.record.id, businessId: "biz-1" });
    expect(verifyApiKey(k.plaintext)).toBeNull();
  });

  it("rejects an expired key", () => {
    const past = new Date(Date.now() - 1000);
    const k = createApiKey({
      businessId: "biz-1",
      agentName: "claude",
      expiresAt: past,
    });
    expect(verifyApiKey(k.plaintext)).toBeNull();
  });

  it("accepts a non-expired key", () => {
    const future = new Date(Date.now() + 60_000);
    const k = createApiKey({
      businessId: "biz-1",
      agentName: "claude",
      expiresAt: future,
    });
    expect(verifyApiKey(k.plaintext)).not.toBeNull();
  });

  it("updates lastUsedAt on first use", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "claude" });
    expect(k.record.lastUsedAt).toBeNull();
    verifyApiKey(k.plaintext);
    const list = listApiKeysForBusiness("biz-1");
    expect(list[0].lastUsedAt).not.toBeNull();
  });

  it("never returns the keyHash field on verified record", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "claude" });
    const v = verifyApiKey(k.plaintext);
    expect((v as Record<string, unknown>).keyHash).toBeUndefined();
  });
});

// ─── listApiKeysForBusiness ─────────────────────────────────────────────────

describe("listApiKeysForBusiness", () => {
  it("returns only keys owned by the business", () => {
    createApiKey({ businessId: "biz-1", agentName: "a" });
    createApiKey({ businessId: "biz-1", agentName: "b" });
    createApiKey({ businessId: "biz-2", agentName: "c" });
    expect(listApiKeysForBusiness("biz-1")).toHaveLength(2);
    expect(listApiKeysForBusiness("biz-2")).toHaveLength(1);
    expect(listApiKeysForBusiness("biz-other")).toHaveLength(0);
  });

  it("never includes keyHash in returned records", () => {
    createApiKey({ businessId: "biz-1", agentName: "a" });
    const list = listApiKeysForBusiness("biz-1");
    for (const k of list) {
      expect((k as Record<string, unknown>).keyHash).toBeUndefined();
    }
  });

  it("returns newest first", async () => {
    createApiKey({ businessId: "biz-1", agentName: "first" });
    // Tiny delay to make sure createdAt differs.
    await new Promise((r) => setTimeout(r, 5));
    createApiKey({ businessId: "biz-1", agentName: "second" });
    const list = listApiKeysForBusiness("biz-1");
    expect(list[0].agentName).toBe("second");
    expect(list[1].agentName).toBe("first");
  });
});

// ─── revokeApiKey ───────────────────────────────────────────────────────────

describe("revokeApiKey", () => {
  it("revokes a key the business owns", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "x" });
    expect(revokeApiKey({ id: k.record.id, businessId: "biz-1" })).toBe(true);
    expect(verifyApiKey(k.plaintext)).toBeNull();
  });

  it("refuses cross-business revocation", () => {
    const k = createApiKey({ businessId: "biz-1", agentName: "x" });
    expect(revokeApiKey({ id: k.record.id, businessId: "biz-other" })).toBe(false);
    // Original key still works for biz-1.
    expect(verifyApiKey(k.plaintext)).not.toBeNull();
  });

  it("is idempotent on unknown ids", () => {
    expect(revokeApiKey({ id: "does-not-exist", businessId: "biz-1" })).toBe(false);
  });
});
