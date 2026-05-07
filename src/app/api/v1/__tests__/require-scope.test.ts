import { describe, expect, it } from "vitest";
import { requireScope, type AuthUser } from "../_shared";

function agent(permissions: string[]): AuthUser {
  return {
    id: "api-key:test",
    email: "",
    role: "agent",
    businessId: "agent_test",
    permissions,
  };
}

function human(role: string): AuthUser {
  return {
    id: "user-1",
    email: "u@x",
    role,
    businessId: "biz-1",
  };
}

describe("requireScope", () => {
  it("admin scope satisfies any requirement", () => {
    expect(requireScope(agent(["admin"]), "read")).toBeNull();
    expect(requireScope(agent(["admin"]), "write")).toBeNull();
    expect(requireScope(agent(["admin"]), "admin")).toBeNull();
  });

  it("write scope satisfies read but not admin", () => {
    expect(requireScope(agent(["write"]), "read")).toBeNull();
    expect(requireScope(agent(["write"]), "write")).toBeNull();
    expect(requireScope(agent(["write"]), "admin")).not.toBeNull();
  });

  it("read scope only satisfies read", () => {
    expect(requireScope(agent(["read"]), "read")).toBeNull();
    expect(requireScope(agent(["read"]), "write")).not.toBeNull();
    expect(requireScope(agent(["read"]), "admin")).not.toBeNull();
  });

  it("returns 403 INSUFFICIENT_SCOPE on failure", async () => {
    const res = requireScope(agent(["read"]), "write");
    expect(res).not.toBeNull();
    expect(res!.status).toBe(403);
    const body = await res!.json();
    expect(body.error.code).toBe("INSUFFICIENT_SCOPE");
  });

  it("agent with no permissions cannot do anything", () => {
    expect(requireScope(agent([]), "read")).not.toBeNull();
    expect(requireScope(agent([]), "write")).not.toBeNull();
  });

  it("non-agent callers (humans) are pass-through", () => {
    // Humans are gated by role, not scope. requireScope() should be a no-op
    // for any non-agent role so route-level role checks remain authoritative.
    expect(requireScope(human("business"), "read")).toBeNull();
    expect(requireScope(human("business"), "write")).toBeNull();
    expect(requireScope(human("business"), "admin")).toBeNull();
    expect(requireScope(human("admin"), "admin")).toBeNull();
    expect(requireScope(human("influencer"), "write")).toBeNull();
  });
});
