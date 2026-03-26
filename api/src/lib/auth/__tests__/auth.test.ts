import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
  sessionStore,
} from "../index";

// =============================================================================
// Password Hashing
// =============================================================================

describe("hashPassword", () => {
  it("produces a salt:hash string", async () => {
    const hash = await hashPassword("mysecret");
    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt.length).toBe(32); // 16 bytes in hex
    expect(key.length).toBe(128); // 64 bytes in hex
  });

  it("produces different hashes for the same password (random salt)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");
    expect(hash1).not.toBe(hash2);
  });

  it("produces different hashes for different passwords", async () => {
    const hash1 = await hashPassword("password1");
    const hash2 = await hashPassword("password2");
    const key1 = hash1.split(":")[1];
    const key2 = hash2.split(":")[1];
    expect(key1).not.toBe(key2);
  });
});

// =============================================================================
// Password Verification
// =============================================================================

describe("verifyPassword", () => {
  it("returns true for correct password", async () => {
    const hash = await hashPassword("correct");
    const result = await verifyPassword("correct", hash);
    expect(result).toBe(true);
  });

  it("returns false for wrong password", async () => {
    const hash = await hashPassword("correct");
    const result = await verifyPassword("wrong", hash);
    expect(result).toBe(false);
  });

  it("works with special characters", async () => {
    const hash = await hashPassword("p@$$w0rd!#%&*");
    const result = await verifyPassword("p@$$w0rd!#%&*", hash);
    expect(result).toBe(true);
  });

  it("works with empty string password", async () => {
    const hash = await hashPassword("");
    const result = await verifyPassword("", hash);
    expect(result).toBe(true);
  });
});

// =============================================================================
// Session Token Generation
// =============================================================================

describe("generateSessionToken", () => {
  it("produces a 64-character hex string", () => {
    const token = generateSessionToken();
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it("produces unique tokens", () => {
    const tokens = new Set(Array.from({ length: 100 }, () => generateSessionToken()));
    expect(tokens.size).toBe(100);
  });
});

// =============================================================================
// Session Store
// =============================================================================

describe("SessionStore", () => {
  beforeEach(() => {
    // Destroy any leftover sessions by creating and immediately destroying
    // The store is a singleton so we need to be careful
  });

  describe("create", () => {
    it("creates a session with correct fields", () => {
      const session = sessionStore.create("user1", "business", "user1@test.com", "biz1");

      expect(session.userId).toBe("user1");
      expect(session.userRole).toBe("business");
      expect(session.email).toBe("user1@test.com");
      expect(session.businessId).toBe("biz1");
      expect(session.token).toMatch(/^[0-9a-f]{64}$/);
      expect(typeof session.createdAt).toBe("number");
      expect(typeof session.expiresAt).toBe("number");
      expect(session.expiresAt).toBeGreaterThan(session.createdAt);

      // cleanup
      sessionStore.destroy(session.token);
    });

    it("creates session with null businessId for influencers", () => {
      const session = sessionStore.create("inf1", "influencer", "inf1@test.com", null);
      expect(session.businessId).toBeNull();
      expect(session.userRole).toBe("influencer");

      sessionStore.destroy(session.token);
    });

    it("creates unique tokens for each session", () => {
      const s1 = sessionStore.create("u1", "business", "a@test.com", null);
      const s2 = sessionStore.create("u2", "influencer", "b@test.com", null);

      expect(s1.token).not.toBe(s2.token);

      sessionStore.destroy(s1.token);
      sessionStore.destroy(s2.token);
    });
  });

  describe("get", () => {
    it("returns session for valid token", () => {
      const created = sessionStore.create("user2", "business", "user2@test.com", "biz2");
      const retrieved = sessionStore.get(created.token);

      expect(retrieved).not.toBeNull();
      expect(retrieved!.userId).toBe("user2");
      expect(retrieved!.email).toBe("user2@test.com");

      sessionStore.destroy(created.token);
    });

    it("returns null for invalid token", () => {
      const result = sessionStore.get("nonexistent-token");
      expect(result).toBeNull();
    });

    it("returns null for expired session", () => {
      const session = sessionStore.create("user3", "enterprise", "user3@test.com", null);

      // Manually expire the session by mocking Date.now
      const originalDateNow = Date.now;
      Date.now = () => session.expiresAt + 1000;

      const result = sessionStore.get(session.token);
      expect(result).toBeNull();

      // Restore Date.now
      Date.now = originalDateNow;
    });
  });

  describe("destroy", () => {
    it("removes the session", () => {
      const session = sessionStore.create("user4", "business", "user4@test.com", "biz4");
      expect(sessionStore.get(session.token)).not.toBeNull();

      const result = sessionStore.destroy(session.token);
      expect(result).toBe(true);
      expect(sessionStore.get(session.token)).toBeNull();
    });

    it("returns false for non-existent token", () => {
      const result = sessionStore.destroy("does-not-exist");
      expect(result).toBe(false);
    });
  });
});
