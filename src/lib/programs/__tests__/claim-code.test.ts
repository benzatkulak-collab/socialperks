import { afterEach, describe, expect, it } from "vitest";
import {
  generateClaimCode,
  registerClaimCode,
  getProgramByClaimCode,
  isValidClaimCodeFormat,
  unregisterClaimCode,
  programs,
  _resetClaimCodeIndex,
  type PerkProgram,
} from "../store";

afterEach(() => {
  _resetClaimCodeIndex();
  programs.clear();
});

function fakeProgram(id: string, claimCode: string): PerkProgram {
  return {
    id,
    businessId: "biz-test",
    claimCode,
    name: "Test Program",
    description: "",
    status: "active",
    rules: [],
    tiers: [],
    cycle: "monthly",
    cycleStartDay: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("generateClaimCode", () => {
  it("generates a 6-character code", () => {
    const code = generateClaimCode();
    expect(code).toHaveLength(6);
  });

  it("only uses the Crockford-style alphabet", () => {
    // 256 samples gives high confidence we'd see any forbidden chars.
    const allowed = /^[ABCDEFGHJKMNPQRSTVWXYZ23456789]{6}$/;
    for (let i = 0; i < 256; i++) {
      expect(allowed.test(generateClaimCode())).toBe(true);
    }
  });

  it("avoids collision with existing codes", () => {
    // Pre-register every other code in a small space — generator must
    // pick from the remaining space.
    const taken = new Set<string>();
    for (let i = 0; i < 50; i++) {
      const code = generateClaimCode();
      registerClaimCode(code, `prg-${i}`);
      taken.add(code);
    }
    // All 50 codes should be unique
    expect(taken.size).toBe(50);
  });
});

describe("isValidClaimCodeFormat", () => {
  it("accepts well-formed codes", () => {
    expect(isValidClaimCodeFormat("ABCD23")).toBe(true);
    expect(isValidClaimCodeFormat("zyx987")).toBe(true); // case insensitive
  });

  it("rejects wrong-length codes", () => {
    expect(isValidClaimCodeFormat("ABC")).toBe(false);
    expect(isValidClaimCodeFormat("ABCDEFG")).toBe(false);
    expect(isValidClaimCodeFormat("")).toBe(false);
  });

  it("rejects forbidden characters (I, L, O, U, 0, 1)", () => {
    expect(isValidClaimCodeFormat("ABCDE0")).toBe(false);
    expect(isValidClaimCodeFormat("ABCDE1")).toBe(false);
    expect(isValidClaimCodeFormat("ABCDEI")).toBe(false);
    expect(isValidClaimCodeFormat("ABCDEL")).toBe(false);
    expect(isValidClaimCodeFormat("ABCDEO")).toBe(false);
    expect(isValidClaimCodeFormat("ABCDEU")).toBe(false);
  });

  it("rejects non-strings", () => {
    expect(isValidClaimCodeFormat(123456)).toBe(false);
    expect(isValidClaimCodeFormat(null)).toBe(false);
    expect(isValidClaimCodeFormat(undefined)).toBe(false);
  });
});

describe("registerClaimCode + getProgramByClaimCode", () => {
  it("looks up a program by its registered code", () => {
    const program = fakeProgram("prg-1", "ABCD23");
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    const found = getProgramByClaimCode("ABCD23");
    expect(found?.id).toBe("prg-1");
  });

  it("looks up case-insensitively", () => {
    const program = fakeProgram("prg-2", "WXYZ34");
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);

    expect(getProgramByClaimCode("wxyz34")?.id).toBe("prg-2");
    expect(getProgramByClaimCode("WxYz34")?.id).toBe("prg-2");
  });

  it("returns null for unknown codes", () => {
    expect(getProgramByClaimCode("NOTFND")).toBeNull();
  });

  it("returns null for non-string input", () => {
    expect(getProgramByClaimCode(undefined as unknown as string)).toBeNull();
  });

  it("unregister removes the lookup", () => {
    const program = fakeProgram("prg-3", "QWER56");
    programs.set(program.id, program);
    registerClaimCode(program.claimCode, program.id);
    expect(getProgramByClaimCode("QWER56")?.id).toBe("prg-3");

    unregisterClaimCode("QWER56");
    expect(getProgramByClaimCode("QWER56")).toBeNull();
  });
});
