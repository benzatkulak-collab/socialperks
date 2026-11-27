import { describe, it, expect } from "vitest";
import { generatePartnerKey, hashPartnerKey, parsePartnerKey } from "../keys";

describe("partner keys", () => {
  it("makes a key of the form spp_live_<8 hex>_<32 hex> whose prefix is the 8 hex", () => {
    const { key, prefix, hash } = generatePartnerKey();
    expect(key).toMatch(/^spp_live_[0-9a-f]{8}_[0-9a-f]{32}$/);
    expect(key.split("_")[2]).toBe(prefix);
    expect(hash).toBe(hashPartnerKey(key));
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("makes a different key each time", () => {
    expect(generatePartnerKey().key).not.toBe(generatePartnerKey().key);
  });

  it("parses a well-formed key to its prefix", () => {
    const { key, prefix } = generatePartnerKey();
    expect(parsePartnerKey(key)).toEqual({ prefix });
  });

  it("refuses an sp_live_ business key and junk", () => {
    expect(parsePartnerKey("sp_live_0123abcd_" + "0".repeat(32))).toBeNull();
    expect(parsePartnerKey("spp_live_xyz")).toBeNull();
    expect(parsePartnerKey("")).toBeNull();
    expect(parsePartnerKey("spp_live_0123abcd_" + "0".repeat(31))).toBeNull();
    expect(parsePartnerKey("spp_live_0123abcd_" + "0".repeat(32) + "x")).toBeNull();
    expect(parsePartnerKey("spp_live_0123ABCD_" + "0".repeat(32))).toBeNull();
  });
});
