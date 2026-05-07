import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createScopeUpgradeRequest,
  getScopeUpgradeRequest,
  listScopeUpgradeRequests,
  decideScopeUpgradeRequest,
  expireOldRequests,
  _resetScopeUpgradeStore,
} from "../scope-upgrades";

beforeEach(() => {
  _resetScopeUpgradeStore();
});

afterEach(() => {
  _resetScopeUpgradeStore();
});

const baseArgs = {
  apiKeyId: "ak_test",
  agentBusinessId: "agent_test",
  currentScopes: ["read"] as const,
  requestedScopes: ["read", "write"] as const,
  justification:
    "We're building a creator-discovery agent for a brand client and need write scope to place sponsorship orders on their behalf.",
};

describe("createScopeUpgradeRequest", () => {
  it("creates a pending request", () => {
    const r = createScopeUpgradeRequest({ ...baseArgs });
    expect(r.id).toMatch(/^scupg_/);
    expect(r.status).toBe("pending");
    expect(r.currentScopes).toEqual(["read"]);
    expect(r.requestedScopes).toEqual(["read", "write"]);
    expect(r.justification).toContain("creator-discovery");
    expect(r.expiresAt).toBeTruthy();
  });

  it("rejects requesting fewer scopes than currently held", () => {
    expect(() =>
      createScopeUpgradeRequest({
        ...baseArgs,
        currentScopes: ["read", "write"],
        requestedScopes: ["read"],
      })
    ).toThrow(/strict superset/);
  });

  it("rejects no-op requests (same scopes)", () => {
    expect(() =>
      createScopeUpgradeRequest({
        ...baseArgs,
        currentScopes: ["read"],
        requestedScopes: ["read"],
      })
    ).toThrow(/strict superset/);
  });

  it("blocks a second pending request for the same key", () => {
    createScopeUpgradeRequest({ ...baseArgs });
    expect(() => createScopeUpgradeRequest({ ...baseArgs })).toThrow(
      /already pending/
    );
  });

  it("after a decision, a new request can be filed", () => {
    const r1 = createScopeUpgradeRequest({ ...baseArgs });
    decideScopeUpgradeRequest({
      id: r1.id,
      decidedBy: "admin-x",
      decision: "reject",
      reason: "abuse signal",
    });
    // Should now succeed
    const r2 = createScopeUpgradeRequest({ ...baseArgs });
    expect(r2.id).not.toBe(r1.id);
  });
});

describe("decideScopeUpgradeRequest", () => {
  it("approve flips status + records decidedBy", () => {
    const r = createScopeUpgradeRequest({ ...baseArgs });
    const updated = decideScopeUpgradeRequest({
      id: r.id,
      decidedBy: "admin-1",
      decision: "approve",
    });
    expect(updated?.status).toBe("approved");
    expect(updated?.decidedBy).toBe("admin-1");
    expect(updated?.decidedAt).toBeTruthy();
  });

  it("reject records the reason", () => {
    const r = createScopeUpgradeRequest({ ...baseArgs });
    const updated = decideScopeUpgradeRequest({
      id: r.id,
      decidedBy: "admin-1",
      decision: "reject",
      reason: "Insufficient justification",
    });
    expect(updated?.status).toBe("rejected");
    expect(updated?.decisionReason).toBe("Insufficient justification");
  });

  it("returns null for unknown request", () => {
    const updated = decideScopeUpgradeRequest({
      id: "scupg_nope",
      decidedBy: "admin-1",
      decision: "approve",
    });
    expect(updated).toBeNull();
  });

  it("returns null on already-decided requests", () => {
    const r = createScopeUpgradeRequest({ ...baseArgs });
    decideScopeUpgradeRequest({
      id: r.id,
      decidedBy: "admin-1",
      decision: "approve",
    });
    const second = decideScopeUpgradeRequest({
      id: r.id,
      decidedBy: "admin-2",
      decision: "reject",
      reason: "second admin tried",
    });
    expect(second).toBeNull();
  });
});

describe("listScopeUpgradeRequests", () => {
  it("filters by status", () => {
    const r1 = createScopeUpgradeRequest({ ...baseArgs, apiKeyId: "ak_a" });
    decideScopeUpgradeRequest({ id: r1.id, decidedBy: "x", decision: "approve" });
    createScopeUpgradeRequest({ ...baseArgs, apiKeyId: "ak_b" });

    expect(listScopeUpgradeRequests({ status: "pending" })).toHaveLength(1);
    expect(listScopeUpgradeRequests({ status: "approved" })).toHaveLength(1);
    expect(listScopeUpgradeRequests({ status: "rejected" })).toHaveLength(0);
  });

  it("returns newest first", () => {
    const a = createScopeUpgradeRequest({ ...baseArgs, apiKeyId: "ak_a" });
    // Wait a tick to ensure distinct timestamps
    return new Promise<void>((resolve) => {
      setTimeout(() => {
        const b = createScopeUpgradeRequest({ ...baseArgs, apiKeyId: "ak_b" });
        const list = listScopeUpgradeRequests({ status: "pending" });
        expect(list[0].id).toBe(b.id);
        expect(list[1].id).toBe(a.id);
        resolve();
      }, 5);
    });
  });
});

describe("expireOldRequests", () => {
  it("flips pending requests past expiresAt to expired", () => {
    const r = createScopeUpgradeRequest({ ...baseArgs });
    // Force expiresAt into the past
    const stored = getScopeUpgradeRequest(r.id);
    if (stored) stored.expiresAt = new Date(Date.now() - 1000).toISOString();
    const expired = expireOldRequests();
    expect(expired).toBe(1);
    expect(getScopeUpgradeRequest(r.id)?.status).toBe("expired");
  });

  it("leaves recent pending alone", () => {
    createScopeUpgradeRequest({ ...baseArgs });
    expect(expireOldRequests()).toBe(0);
  });
});
