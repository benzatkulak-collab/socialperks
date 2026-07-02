/**
 * Tests for the second batch of security quick-wins, drawn from
 * findings in the 200-item audit (PR #55):
 *
 *   1. Outbound webhook SSRF — registerWebhook now rejects unsafe URLs
 *      via isSafeUrl, and deliverWebhook re-validates with assertSafeUrl
 *      at fetch time so DNS rebinding is also caught.
 *
 *   2. ENCRYPTION_MASTER_KEY no longer silently falls through to the
 *      hardcoded dev key in production — it now hard-errors, matching
 *      the AUTH_SECRET / CSRF_SECRET pattern.
 */

import { afterEach, describe, expect, it } from "vitest";
import { _resetEncryptionKeyCache } from "@/lib/encryption";
import { webhookStore } from "@/lib/webhooks";

describe("Quick-win: outbound webhook SSRF defense", () => {
  it("registerWebhook rejects http:// (non-https scheme)", () => {
    expect(() =>
      webhookStore.registerWebhook("biz-1", "http://example.com/hook", ["test.event"])
    ).toThrow(/Webhook URL rejected/);
  });

  it("registerWebhook rejects file:// scheme", () => {
    expect(() =>
      webhookStore.registerWebhook("biz-1", "file:///etc/passwd", ["test.event"])
    ).toThrow(/Webhook URL rejected/);
  });

  it("registerWebhook rejects loopback (127.0.0.1)", () => {
    expect(() =>
      webhookStore.registerWebhook("biz-1", "https://127.0.0.1/hook", ["test.event"])
    ).toThrow(/Webhook URL rejected/);
  });

  it("registerWebhook rejects RFC1918 (10.x.x.x)", () => {
    expect(() =>
      webhookStore.registerWebhook("biz-1", "https://10.0.0.1/hook", ["test.event"])
    ).toThrow(/Webhook URL rejected/);
  });

  it("registerWebhook rejects AWS metadata (169.254.169.254)", () => {
    expect(() =>
      webhookStore.registerWebhook(
        "biz-1",
        "https://169.254.169.254/latest/meta-data/",
        ["test.event"]
      )
    ).toThrow(/Webhook URL rejected/);
  });

  it("registerWebhook rejects IPv6 loopback ([::1])", () => {
    expect(() =>
      webhookStore.registerWebhook("biz-1", "https://[::1]/hook", ["test.event"])
    ).toThrow(/Webhook URL rejected/);
  });

  it("registerWebhook accepts a normal public https URL", () => {
    const w = webhookStore.registerWebhook(
      "biz-1",
      "https://hooks.example.com/incoming",
      ["test.event"]
    );
    expect(w.url).toBe("https://hooks.example.com/incoming");
  });

  it("updateWebhook also re-validates the URL", () => {
    const w = webhookStore.registerWebhook(
      "biz-update-test",
      "https://hooks.example.com/initial",
      ["test.event"]
    );
    expect(() =>
      webhookStore.updateWebhook(w.id, { url: "https://192.168.1.1/hook" })
    ).toThrow(/Webhook URL rejected/);
  });
});

describe("Quick-win: ENCRYPTION_MASTER_KEY production guard", () => {
  const originalKey = process.env.ENCRYPTION_MASTER_KEY;
  const originalNodeEnv = process.env.NODE_ENV;

  afterEach(() => {
    if (originalKey === undefined) delete process.env.ENCRYPTION_MASTER_KEY;
    else process.env.ENCRYPTION_MASTER_KEY = originalKey;
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    _resetEncryptionKeyCache();
  });

  it("throws in production when ENCRYPTION_MASTER_KEY is unset", async () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    process.env.NODE_ENV = "production";
    _resetEncryptionKeyCache();
    const { getTenantKey } = await import("@/lib/encryption");
    expect(() => getTenantKey("tenant-1")).toThrow(
      /ENCRYPTION_MASTER_KEY environment variable must be set in production/
    );
  });

  it("rejects too-short keys even when set", async () => {
    process.env.ENCRYPTION_MASTER_KEY = "tooshort";
    process.env.NODE_ENV = "production";
    _resetEncryptionKeyCache();
    const { getTenantKey } = await import("@/lib/encryption");
    expect(() => getTenantKey("tenant-1")).toThrow(/too short/);
  });

  it("accepts a valid production key end-to-end", async () => {
    process.env.ENCRYPTION_MASTER_KEY =
      "this-is-a-very-long-production-key-with-plenty-of-entropy-12345";
    process.env.NODE_ENV = "production";
    _resetEncryptionKeyCache();
    const { getTenantKey, encrypt, decrypt } = await import("@/lib/encryption");
    const key = getTenantKey("tenant-1");
    const enc = encrypt("hello", key);
    expect(decrypt(enc, key)).toBe("hello");
  });

  it("falls back to dev key in non-production with a warning", async () => {
    delete process.env.ENCRYPTION_MASTER_KEY;
    process.env.NODE_ENV = "test";
    _resetEncryptionKeyCache();
    const { getTenantKey, encrypt, decrypt } = await import("@/lib/encryption");
    const key = getTenantKey("tenant-1");
    const enc = encrypt("hello", key);
    expect(decrypt(enc, key)).toBe("hello");
  });
});
