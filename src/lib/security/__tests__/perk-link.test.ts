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
    // Flip the last character to break the signature.
    const tampered =
      token.slice(0, -1) + (token.slice(-1) === "A" ? "B" : "A");
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
