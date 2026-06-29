import { describe, it, expect } from "vitest";
import { signPerkToken, verifyPerkToken, perkLinkUrl } from "../perk-link";

describe("perk-link magic-link tokens", () => {
  it("round-trips a userId through sign → verify", () => {
    const uid = "cust_abc123def456";
    const token = signPerkToken(uid);
    expect(typeof token).toBe("string");
    expect(token.length).toBeGreaterThan(0);
    expect(verifyPerkToken(token)).toBe(uid);
  });

  it("produces a URL-safe token (no chars that need escaping in a path)", () => {
    const token = signPerkToken("cust_xyz");
    expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("rejects a tampered token", () => {
    const token = signPerkToken("cust_victim");
    // Corrupt the signature itself. NOTE: flipping the LAST base64url char is
    // NOT a reliable tamper — it carries only 2 meaningful bits plus padding
    // that Node's lenient base64url decoder discards, so ~25% of the time the
    // token decodes identically and still verifies (this test used to flake at
    // that rate). Decode, mutate the final signature hex char, and re-encode so
    // a payload byte always changes and the HMAC check always fails.
    const decoded = Buffer.from(token, "base64url").toString("utf8"); // `${uid}.${ts}.${sig}`
    const tampered = Buffer.from(
      decoded.slice(0, -1) + (decoded.slice(-1) === "a" ? "b" : "a"),
      "utf8",
    ).toString("base64url");
    expect(tampered).not.toBe(token);
    expect(verifyPerkToken(tampered)).toBeNull();
  });

  it("rejects a forged token for a different user", () => {
    // An attacker who knows the format but not the secret cannot mint a token
    // for someone else's id.
    const forged = Buffer.from("cust_other.999.deadbeef", "utf8").toString(
      "base64url"
    );
    expect(verifyPerkToken(forged)).toBeNull();
  });

  it("returns null for empty / garbage input", () => {
    expect(verifyPerkToken("")).toBeNull();
    expect(verifyPerkToken("not-a-token")).toBeNull();
    expect(verifyPerkToken("....")).toBeNull();
    // @ts-expect-error — guarding the runtime path
    expect(verifyPerkToken(null)).toBeNull();
  });

  it("two tokens for the same user both verify (timestamped, not equal)", () => {
    const uid = "cust_same";
    const a = signPerkToken(uid);
    const b = signPerkToken(uid);
    expect(verifyPerkToken(a)).toBe(uid);
    expect(verifyPerkToken(b)).toBe(uid);
  });

  it("perkLinkUrl embeds a verifiable token at /perk/", () => {
    const url = perkLinkUrl("cust_link");
    const match = url.match(/\/perk\/([A-Za-z0-9_-]+)$/);
    expect(match).not.toBeNull();
    expect(verifyPerkToken(match![1])).toBe("cust_link");
  });
});
