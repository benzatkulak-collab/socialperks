import { describe, it, expect, beforeEach } from "vitest";
import {
  getTenantContext,
  assertTenantAccess,
  scopeToTenant,
  recordUsage,
  getUsage,
  getUsageSummary,
  TenantAccessError,
  _resetUsage,
} from "../isolation";
import type { AuthUser } from "@/app/api/v1/_shared";

// Reset usage buckets before each test
beforeEach(() => {
  _resetUsage();
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT CONTEXT EXTRACTION
// ═══════════════════════════════════════════════════════════════════════════════

describe("getTenantContext", () => {
  it("extracts tenant context from an authenticated business user", () => {
    const user: AuthUser = {
      id: "usr_1",
      email: "owner@test.com",
      role: "owner",
      businessId: "biz_abc",
    };

    const ctx = getTenantContext(user);
    expect(ctx).not.toBeNull();
    expect(ctx!.tenantId).toBe("biz_abc");
    expect(ctx!.userId).toBe("usr_1");
    expect(ctx!.role).toBe("owner");
  });

  it("returns null when user has no businessId", () => {
    const user: AuthUser = {
      id: "usr_2",
      email: "admin@platform.com",
      role: "admin",
      businessId: null,
    };

    const ctx = getTenantContext(user);
    expect(ctx).toBeNull();
  });

  it("maps admin role correctly", () => {
    const user: AuthUser = {
      id: "usr_3",
      email: "manager@test.com",
      role: "admin",
      businessId: "biz_xyz",
    };

    const ctx = getTenantContext(user);
    expect(ctx!.role).toBe("admin");
  });

  it("maps manager role to admin", () => {
    const user: AuthUser = {
      id: "usr_4",
      email: "manager@test.com",
      role: "manager",
      businessId: "biz_xyz",
    };

    const ctx = getTenantContext(user);
    expect(ctx!.role).toBe("admin");
  });

  it("maps unknown roles to viewer", () => {
    const user: AuthUser = {
      id: "usr_5",
      email: "custom@test.com",
      role: "custom_role",
      businessId: "biz_xyz",
    };

    const ctx = getTenantContext(user);
    expect(ctx!.role).toBe("viewer");
  });

  it("maps influencer role to viewer", () => {
    const user: AuthUser = {
      id: "usr_6",
      email: "influencer@test.com",
      role: "influencer",
      businessId: "biz_xyz",
    };

    const ctx = getTenantContext(user);
    expect(ctx!.role).toBe("viewer");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// assertTenantAccess
// ═══════════════════════════════════════════════════════════════════════════════

describe("assertTenantAccess", () => {
  it("allows access when tenantId matches resourceOwnerId", () => {
    expect(() => assertTenantAccess("biz_abc", "biz_abc")).not.toThrow();
  });

  it("blocks cross-tenant access", () => {
    expect(() => assertTenantAccess("biz_abc", "biz_xyz")).toThrow(
      TenantAccessError
    );
  });

  it("throws TenantAccessError with correct properties", () => {
    try {
      assertTenantAccess("biz_abc", "biz_xyz");
      // Should not reach here
      expect(true).toBe(false);
    } catch (e) {
      expect(e).toBeInstanceOf(TenantAccessError);
      const err = e as TenantAccessError;
      expect(err.code).toBe("TENANT_ACCESS_DENIED");
      expect(err.status).toBe(403);
      expect(err.message).toContain("biz_abc");
      expect(err.message).toContain("biz_xyz");
    }
  });

  it("blocks access even with similar IDs", () => {
    expect(() => assertTenantAccess("biz_abc", "biz_abc_2")).toThrow(
      TenantAccessError
    );
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// scopeToTenant
// ═══════════════════════════════════════════════════════════════════════════════

describe("scopeToTenant", () => {
  it("adds businessId filter to an empty filter", () => {
    const scoped = scopeToTenant({}, "biz_abc");
    expect(scoped).toEqual({ businessId: "biz_abc" });
  });

  it("preserves existing filter fields", () => {
    const scoped = scopeToTenant({ status: "active", page: 1 }, "biz_abc");
    expect(scoped).toEqual({
      status: "active",
      page: 1,
      businessId: "biz_abc",
    });
  });

  it("overrides existing businessId with tenant's", () => {
    const scoped = scopeToTenant(
      { businessId: "biz_other" } as Record<string, unknown>,
      "biz_abc"
    );
    expect(scoped.businessId).toBe("biz_abc");
  });

  it("returns a new object (no mutation)", () => {
    const original = { foo: "bar" };
    const scoped = scopeToTenant(original, "biz_abc");
    expect(scoped).not.toBe(original);
    expect(original).not.toHaveProperty("businessId");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE METERING
// ═══════════════════════════════════════════════════════════════════════════════

describe("Usage Recording and Retrieval", () => {
  it("records and retrieves usage for a metric", () => {
    recordUsage("biz_abc", "api_calls");
    recordUsage("biz_abc", "api_calls");
    recordUsage("biz_abc", "api_calls");

    const usage = getUsage("biz_abc", "api_calls");
    expect(usage).toBe(3);
  });

  it("records usage with custom amounts", () => {
    recordUsage("biz_abc", "storage_bytes", 1024);
    recordUsage("biz_abc", "storage_bytes", 2048);

    const usage = getUsage("biz_abc", "storage_bytes");
    expect(usage).toBe(3072);
  });

  it("returns 0 for unrecorded metrics", () => {
    const usage = getUsage("biz_abc", "nonexistent_metric");
    expect(usage).toBe(0);
  });

  it("returns 0 for unrecorded tenants", () => {
    recordUsage("biz_abc", "api_calls", 5);
    const usage = getUsage("biz_xyz", "api_calls");
    expect(usage).toBe(0);
  });

  it("isolates usage between tenants", () => {
    recordUsage("biz_abc", "api_calls", 10);
    recordUsage("biz_xyz", "api_calls", 20);

    expect(getUsage("biz_abc", "api_calls")).toBe(10);
    expect(getUsage("biz_xyz", "api_calls")).toBe(20);
  });

  it("isolates usage between metrics", () => {
    recordUsage("biz_abc", "api_calls", 5);
    recordUsage("biz_abc", "campaigns_created", 3);

    expect(getUsage("biz_abc", "api_calls")).toBe(5);
    expect(getUsage("biz_abc", "campaigns_created")).toBe(3);
  });
});

describe("Monthly Usage Reset", () => {
  it("returns 0 for a different month", () => {
    recordUsage("biz_abc", "api_calls", 100);

    // Query a different month (last month)
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);

    const usage = getUsage("biz_abc", "api_calls", lastMonth);
    expect(usage).toBe(0);
  });

  it("current month usage is independent of other months", () => {
    // Record in current month
    recordUsage("biz_abc", "api_calls", 50);

    // Query future month
    const futureMonth = new Date();
    futureMonth.setMonth(futureMonth.getMonth() + 1);

    expect(getUsage("biz_abc", "api_calls")).toBe(50);
    expect(getUsage("biz_abc", "api_calls", futureMonth)).toBe(0);
  });
});

describe("Usage Summary Aggregation", () => {
  it("returns a complete summary with all metrics", () => {
    recordUsage("biz_abc", "api_calls", 100);
    recordUsage("biz_abc", "campaigns_created", 5);
    recordUsage("biz_abc", "submissions_received", 25);
    recordUsage("biz_abc", "ai_generations", 10);
    recordUsage("biz_abc", "storage_bytes", 1048576);
    recordUsage("biz_abc", "bandwidth_bytes", 5242880);

    const summary = getUsageSummary("biz_abc");

    expect(summary.tenantId).toBe("biz_abc");
    expect(summary.apiCalls).toBe(100);
    expect(summary.campaignsCreated).toBe(5);
    expect(summary.submissionsReceived).toBe(25);
    expect(summary.aiGenerations).toBe(10);
    expect(summary.storageBytes).toBe(1048576);
    expect(summary.bandwidthBytes).toBe(5242880);
    expect(summary.period).toMatch(/^\d{4}-\d{2}$/);
  });

  it("returns zero values for a tenant with no usage", () => {
    const summary = getUsageSummary("biz_empty");

    expect(summary.tenantId).toBe("biz_empty");
    expect(summary.apiCalls).toBe(0);
    expect(summary.campaignsCreated).toBe(0);
    expect(summary.submissionsReceived).toBe(0);
    expect(summary.aiGenerations).toBe(0);
    expect(summary.storageBytes).toBe(0);
    expect(summary.bandwidthBytes).toBe(0);
  });

  it("does not leak usage between tenants in summary", () => {
    recordUsage("biz_abc", "api_calls", 100);
    recordUsage("biz_xyz", "api_calls", 200);

    const summaryAbc = getUsageSummary("biz_abc");
    const summaryXyz = getUsageSummary("biz_xyz");

    expect(summaryAbc.apiCalls).toBe(100);
    expect(summaryXyz.apiCalls).toBe(200);
  });

  it("includes the current month period", () => {
    const summary = getUsageSummary("biz_abc");
    const now = new Date();
    const expectedPeriod = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    expect(summary.period).toBe(expectedPeriod);
  });
});
