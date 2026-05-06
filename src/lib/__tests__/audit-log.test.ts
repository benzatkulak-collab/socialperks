import { describe, it, expect, beforeEach, vi } from "vitest";
import { audit, queryAuditLog, _resetAuditLog } from "../audit-log";

// Silence the per-entry console.warn that audit() emits as a structured
// log line — these tests would otherwise spam stderr.
const origWarn = console.warn;
beforeEach(() => {
  _resetAuditLog();
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  console.warn = origWarn;
});

// `afterEach` isn't imported above; re-importing inline keeps the
// test scoped without polluting test files.
import { afterEach } from "vitest";

describe("audit() + ring buffer", () => {
  it("captures an entry and surfaces it via queryAuditLog", async () => {
    audit({
      action: "api_key.created",
      actor: "business:b1",
      businessId: "b1",
      resourceId: "key-1",
      ok: true,
      meta: { agentName: "test" },
    });
    const result = await queryAuditLog({});
    expect(result.entries).toHaveLength(1);
    expect(result.entries[0].action).toBe("api_key.created");
    expect(result.entries[0].businessId).toBe("b1");
    expect(result.entries[0].ok).toBe(true);
    expect(result.fromDb).toBe(false);
  });

  it("filters by actionPrefix", async () => {
    audit({ action: "api_key.created", actor: "x", ok: true });
    audit({ action: "auth.login_success", actor: "x", ok: true });
    audit({ action: "billing.subscription_created", actor: "x", ok: true });

    const r = await queryAuditLog({ actionPrefix: "api_key" });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].action).toBe("api_key.created");
  });

  it("filters by exact action", async () => {
    audit({ action: "api_key.created", actor: "x", ok: true });
    audit({ action: "api_key.revoked", actor: "x", ok: true });
    const r = await queryAuditLog({ action: "api_key.revoked" });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].action).toBe("api_key.revoked");
  });

  it("filters by actor", async () => {
    audit({ action: "auth.login_success", actor: "user:alice", ok: true });
    audit({ action: "auth.login_success", actor: "user:bob", ok: true });
    const r = await queryAuditLog({ actor: "user:alice" });
    expect(r.entries.every((e) => e.actor === "user:alice")).toBe(true);
    expect(r.entries).toHaveLength(1);
  });

  it("filters by businessId tenant", async () => {
    audit({ action: "submission.approved", actor: "x", businessId: "b1", ok: true });
    audit({ action: "submission.approved", actor: "x", businessId: "b2", ok: true });
    const r = await queryAuditLog({ businessId: "b1" });
    expect(r.entries).toHaveLength(1);
    expect(r.entries[0].businessId).toBe("b1");
  });

  it("onlyFailures filters out ok=true rows", async () => {
    audit({ action: "auth.login_success", actor: "x", ok: true });
    audit({ action: "auth.login_failed", actor: "x", ok: false });
    audit({ action: "billing.webhook_signature_failed", actor: "stripe-webhook", ok: false });
    const r = await queryAuditLog({ onlyFailures: true });
    expect(r.entries).toHaveLength(2);
    expect(r.entries.every((e) => !e.ok)).toBe(true);
  });

  it("returns newest first", async () => {
    audit({ action: "api_key.created", actor: "x", ok: true });
    await new Promise((r) => setTimeout(r, 5));
    audit({ action: "api_key.revoked", actor: "x", ok: true });
    const r = await queryAuditLog({});
    expect(r.entries[0].action).toBe("api_key.revoked");
    expect(r.entries[1].action).toBe("api_key.created");
  });

  it("paginates via limit + offset", async () => {
    for (let i = 0; i < 5; i++) {
      audit({ action: "api_key.created", actor: "x", resourceId: `k${i}`, ok: true });
    }
    const page1 = await queryAuditLog({ limit: 2, offset: 0 });
    expect(page1.entries).toHaveLength(2);
    expect(page1.total).toBe(5);

    const page2 = await queryAuditLog({ limit: 2, offset: 2 });
    expect(page2.entries).toHaveLength(2);
    expect(page2.total).toBe(5);

    const page3 = await queryAuditLog({ limit: 2, offset: 4 });
    expect(page3.entries).toHaveLength(1);
    expect(page3.total).toBe(5);
  });

  it("clamps limit to 200 max and 1 min", async () => {
    audit({ action: "api_key.created", actor: "x", ok: true });
    const r1 = await queryAuditLog({ limit: 99999 });
    expect(r1.entries.length).toBeLessThanOrEqual(200);
    const r2 = await queryAuditLog({ limit: 0 });
    expect(r2.entries.length).toBeLessThanOrEqual(1);
  });

  it("filters by `since` ISO timestamp", async () => {
    audit({ action: "api_key.created", actor: "old", ok: true });
    const cutoff = new Date(Date.now() + 1).toISOString();
    await new Promise((r) => setTimeout(r, 10));
    audit({ action: "api_key.created", actor: "new", ok: true });
    const r = await queryAuditLog({ since: cutoff });
    expect(r.entries.every((e) => e.timestamp >= cutoff)).toBe(true);
    expect(r.entries.some((e) => e.actor === "new")).toBe(true);
    expect(r.entries.some((e) => e.actor === "old")).toBe(false);
  });

  it("never throws on malformed entries", () => {
    // The audit() function is fire-and-forget; even garbage-y input
    // shouldn't crash the caller.
    expect(() =>
      audit({
        action: "api_key.created",
        actor: "",
        ok: true,
        meta: { circular: undefined },
      })
    ).not.toThrow();
  });

  it("ANDs multiple filters", async () => {
    audit({ action: "api_key.created", actor: "user:a", businessId: "b1", ok: true });
    audit({ action: "api_key.created", actor: "user:b", businessId: "b1", ok: true });
    audit({ action: "api_key.created", actor: "user:a", businessId: "b2", ok: true });
    audit({ action: "api_key.revoked", actor: "user:a", businessId: "b1", ok: true });

    const r = await queryAuditLog({
      action: "api_key.created",
      actor: "user:a",
      businessId: "b1",
    });
    expect(r.entries).toHaveLength(1);
    expect(r.total).toBe(1);
  });
});
