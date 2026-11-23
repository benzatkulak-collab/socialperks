import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getInternalApiKey, isInternalApiKey } from "../internal-key";

const KEYS = ["DRIP_API_KEY", "INTERNAL_API_KEY", "CRON_SECRET"] as const;

describe("internal API key", () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }
  });

  it("is unset when no key is configured, and rejects everything", () => {
    expect(getInternalApiKey()).toBeUndefined();
    expect(isInternalApiKey("anything")).toBe(false);
    expect(isInternalApiKey("")).toBe(false);
    expect(isInternalApiKey(null)).toBe(false);
  });

  it("falls back to CRON_SECRET when only that is set (the production case)", () => {
    process.env.CRON_SECRET = "cron-only";
    expect(getInternalApiKey()).toBe("cron-only");
    expect(isInternalApiKey("cron-only")).toBe(true);
    expect(isInternalApiKey("wrong")).toBe(false);
  });

  it("prefers DRIP_API_KEY, then INTERNAL_API_KEY, over CRON_SECRET", () => {
    process.env.CRON_SECRET = "cron";
    process.env.INTERNAL_API_KEY = "internal";
    expect(getInternalApiKey()).toBe("internal");
    process.env.DRIP_API_KEY = "drip";
    expect(getInternalApiKey()).toBe("drip");
    expect(isInternalApiKey("cron")).toBe(false);
    expect(isInternalApiKey("drip")).toBe(true);
  });

  it("treats empty-string vars as unset", () => {
    process.env.DRIP_API_KEY = "";
    process.env.CRON_SECRET = "cron";
    expect(getInternalApiKey()).toBe("cron");
  });
});
