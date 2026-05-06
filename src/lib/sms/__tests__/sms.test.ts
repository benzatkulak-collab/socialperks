import { describe, expect, it } from "vitest";
import { ConsoleSmsProvider, isValidE164 } from "../index";

describe("ConsoleSmsProvider", () => {
  it("records sent messages", async () => {
    const provider = new ConsoleSmsProvider();
    const result = await provider.send({
      to: "+15551234567",
      body: "Hello",
    });
    expect(result.success).toBe(true);
    expect(result.messageId).toMatch(/^sms_/);
    expect(provider.sentMessages).toHaveLength(1);
    expect(provider.sentMessages[0].to).toBe("+15551234567");
  });

  it("falls back to default From when omitted", async () => {
    const provider = new ConsoleSmsProvider();
    await provider.send({ to: "+15551234567", body: "Hi" });
    expect(provider.sentMessages[0].from).toBeTruthy();
  });
});

describe("isValidE164", () => {
  it("accepts well-formed E.164 numbers", () => {
    expect(isValidE164("+15551234567")).toBe(true);
    expect(isValidE164("+447911123456")).toBe(true); // UK
    expect(isValidE164("+861234567890")).toBe(true); // CN
  });

  it("rejects malformed numbers", () => {
    expect(isValidE164("5551234567")).toBe(false); // no +
    expect(isValidE164("+0551234567")).toBe(false); // leading 0 after +
    expect(isValidE164("+1")).toBe(false); // too short
    expect(isValidE164("+12345678901234567")).toBe(false); // too long
    expect(isValidE164("+1-555-123-4567")).toBe(false); // hyphens
    expect(isValidE164("")).toBe(false);
    expect(isValidE164(null)).toBe(false);
    expect(isValidE164(undefined)).toBe(false);
    expect(isValidE164(15551234567)).toBe(false);
  });
});
