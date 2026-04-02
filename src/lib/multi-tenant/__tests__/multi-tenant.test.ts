import { describe, it, expect, beforeEach } from "vitest";
import {
  tenantManager,
  tenantResolver,
  tenantProvisioner,
  usageTracker,
  tenantRateLimiter,
} from "../index";

// Reset all singletons before each test
beforeEach(() => {
  tenantManager._reset();
  tenantProvisioner._reset();
  tenantRateLimiter._reset();
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT MANAGER
// ═══════════════════════════════════════════════════════════════════════════════

describe("TenantManager", () => {
  it("creates a tenant with plan defaults", () => {
    const tenant = tenantManager.create({
      name: "Test Biz",
      slug: "test-biz",
      plan: "starter",
    });
    expect(tenant.id).toBeDefined();
    expect(tenant.slug).toBe("test-biz");
    expect(tenant.plan).toBe("starter");
    expect(tenant.status).toBe("active");
    expect(tenant.limits.campaignsMax).toBe(5);
  });

  it("creates a trial tenant", () => {
    const tenant = tenantManager.create({
      name: "Trial",
      slug: "trial-biz",
      plan: "professional",
      trialDays: 14,
    });
    expect(tenant.status).toBe("trial");
    expect(tenant.trialEndsAt).toBeDefined();
  });

  it("rejects duplicate slugs", () => {
    tenantManager.create({ name: "A", slug: "same-slug", plan: "starter" });
    expect(() =>
      tenantManager.create({ name: "B", slug: "same-slug", plan: "starter" })
    ).toThrow(/already in use/);
  });

  it("rejects invalid slug format", () => {
    expect(() =>
      tenantManager.create({ name: "Bad", slug: "a", plan: "starter" })
    ).toThrow(); // too short
  });

  it("getBySlug finds a tenant", () => {
    tenantManager.create({ name: "Find Me", slug: "find-me", plan: "starter" });
    const tenant = tenantManager.getBySlug("find-me");
    expect(tenant).not.toBeNull();
    expect(tenant!.name).toBe("Find Me");
  });

  it("getBySlug is case-insensitive", () => {
    tenantManager.create({ name: "Case", slug: "case-test", plan: "starter" });
    expect(tenantManager.getBySlug("CASE-TEST")).not.toBeNull();
  });

  it("getById finds a tenant", () => {
    const created = tenantManager.create({ name: "ById", slug: "by-id", plan: "starter" });
    const found = tenantManager.getById(created.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(created.id);
  });

  it("getById returns null for nonexistent", () => {
    expect(tenantManager.getById("nope")).toBeNull();
  });

  it("checkLimit returns correct values", () => {
    const tenant = tenantManager.create({ name: "Lim", slug: "lim-test", plan: "starter" });
    const check = tenantManager.checkLimit(tenant.id, "campaigns");
    expect(check.reached).toBe(false);
    expect(check.current).toBe(0);
    expect(check.max).toBe(5);
    expect(check.remaining).toBe(5);
  });

  it("incrementUsage updates counters", () => {
    const tenant = tenantManager.create({ name: "Inc", slug: "inc-test", plan: "starter" });
    tenantManager.incrementUsage(tenant.id, "campaigns", 3);
    const check = tenantManager.checkLimit(tenant.id, "campaigns");
    expect(check.current).toBe(3);
    expect(check.remaining).toBe(2);
  });

  it("checkLimit detects when limit is reached", () => {
    const tenant = tenantManager.create({ name: "Full", slug: "full-test", plan: "starter" });
    tenantManager.incrementUsage(tenant.id, "campaigns", 5);
    const check = tenantManager.checkLimit(tenant.id, "campaigns");
    expect(check.reached).toBe(true);
    expect(check.remaining).toBe(0);
  });

  it("suspend changes status to suspended", () => {
    const tenant = tenantManager.create({ name: "Sus", slug: "sus-test", plan: "starter" });
    const suspended = tenantManager.suspend(tenant.id, "Terms violation");
    expect(suspended.status).toBe("suspended");
  });

  it("suspend rejects already-suspended tenant", () => {
    const tenant = tenantManager.create({ name: "Dup", slug: "dup-sus", plan: "starter" });
    tenantManager.suspend(tenant.id);
    expect(() => tenantManager.suspend(tenant.id)).toThrow(/already suspended/);
  });

  it("reactivate changes status from suspended to active", () => {
    const tenant = tenantManager.create({ name: "React", slug: "react-test", plan: "starter" });
    tenantManager.suspend(tenant.id);
    const reactivated = tenantManager.reactivate(tenant.id);
    expect(reactivated.status).toBe("active");
  });

  it("reactivate rejects non-suspended tenant", () => {
    const tenant = tenantManager.create({ name: "NotSus", slug: "not-sus", plan: "starter" });
    expect(() => tenantManager.reactivate(tenant.id)).toThrow(/not suspended/);
  });

  it("isFeatureEnabled checks plan features", () => {
    const tenant = tenantManager.create({ name: "Feat", slug: "feat-test", plan: "starter" });
    expect(tenantManager.isFeatureEnabled(tenant.id, "campaigns")).toBe(true);
    expect(tenantManager.isFeatureEnabled(tenant.id, "aiGeneration")).toBe(false);
  });

  it("enterprise plan has all features enabled", () => {
    const tenant = tenantManager.create({ name: "Ent", slug: "ent-test", plan: "enterprise" });
    expect(tenantManager.isFeatureEnabled(tenant.id, "aiGeneration")).toBe(true);
    expect(tenantManager.isFeatureEnabled(tenant.id, "sso")).toBe(true);
    expect(tenantManager.isFeatureEnabled(tenant.id, "exchange")).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT RESOLVER
// ═══════════════════════════════════════════════════════════════════════════════

describe("TenantResolver", () => {
  it("resolves from X-Tenant-ID header", () => {
    const tenant = tenantManager.create({ name: "Res", slug: "res-test", plan: "starter" });
    const resolved = tenantResolver.resolve({ "x-tenant-id": tenant.id });
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(tenant.id);
  });

  it("resolves from X-Tenant-Domain header", () => {
    const tenant = tenantManager.create({
      name: "Dom",
      slug: "dom-test",
      plan: "professional",
      customDomain: "custom.example.com",
    });
    const resolved = tenantResolver.resolve({ "x-tenant-domain": "custom.example.com" });
    expect(resolved).not.toBeNull();
    expect(resolved!.id).toBe(tenant.id);
  });

  it("resolves from Host header (subdomain)", () => {
    tenantManager.create({ name: "Sub", slug: "my-shop", plan: "starter" });
    const resolved = tenantResolver.resolve({ host: "my-shop.socialperks.io" });
    expect(resolved).not.toBeNull();
    expect(resolved!.slug).toBe("my-shop");
  });

  it("resolves from Host header with port", () => {
    tenantManager.create({ name: "Port", slug: "port-shop", plan: "starter" });
    const resolved = tenantResolver.resolve({ host: "port-shop.socialperks.io:3000" });
    expect(resolved).not.toBeNull();
    expect(resolved!.slug).toBe("port-shop");
  });

  it("returns null when no tenant can be resolved", () => {
    const resolved = tenantResolver.resolve({});
    expect(resolved).toBeNull();
  });

  it("returns null for www subdomain", () => {
    const resolved = tenantResolver.resolve({ host: "www.socialperks.io" });
    expect(resolved).toBeNull();
  });

  it("returns null for non-socialperks domain", () => {
    const resolved = tenantResolver.resolve({ host: "myshop.otherdomain.com" });
    expect(resolved).toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// TENANT PROVISIONER
// ═══════════════════════════════════════════════════════════════════════════════

describe("TenantProvisioner", () => {
  it("provisions a tenant with admin user", () => {
    const result = tenantProvisioner.provision({
      name: "New Business",
      slug: "new-biz",
      plan: "professional",
      adminEmail: "admin@newbiz.com",
      adminName: "Admin User",
    });
    expect(result.success).toBe(true);
    expect(result.tenant).toBeDefined();
    expect(result.adminUserId).toBeDefined();
  });

  it("provisions with API key for API-enabled plans", () => {
    const result = tenantProvisioner.provision({
      name: "API Biz",
      slug: "api-biz",
      plan: "professional",
      adminEmail: "api@biz.com",
      adminName: "API Admin",
    });
    expect(result.success).toBe(true);
    expect(result.apiKeyHint).toBeDefined();
    expect(result.apiKeyHint!.startsWith("sk_")).toBe(true);
  });

  it("starter plan does not get API key", () => {
    const result = tenantProvisioner.provision({
      name: "Starter Biz",
      slug: "starter-biz",
      plan: "starter",
      adminEmail: "s@biz.com",
      adminName: "Starter Admin",
    });
    expect(result.success).toBe(true);
    expect(result.apiKeyHint).toBeUndefined();
  });

  it("provision fails with missing name", () => {
    const result = tenantProvisioner.provision({
      name: "",
      slug: "no-name",
      plan: "starter",
      adminEmail: "a@b.com",
      adminName: "A",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("name");
  });

  it("provision fails with invalid email", () => {
    const result = tenantProvisioner.provision({
      name: "Valid Name",
      slug: "valid-slug",
      plan: "starter",
      adminEmail: "invalid-email",
      adminName: "A",
    });
    expect(result.success).toBe(false);
    expect(result.error).toContain("email");
  });

  it("deprovision soft-deletes a tenant", () => {
    const provisioned = tenantProvisioner.provision({
      name: "To Delete",
      slug: "to-delete",
      plan: "starter",
      adminEmail: "del@test.com",
      adminName: "Del Admin",
    });
    const result = tenantProvisioner.deprovision(provisioned.tenant!.id);
    expect(result.success).toBe(true);

    // The tenant should be suspended
    const tenant = tenantManager.getById(provisioned.tenant!.id);
    expect(tenant!.status).toBe("suspended");
  });

  it("deprovision returns error for non-existent tenant", () => {
    const result = tenantProvisioner.deprovision("nonexistent");
    expect(result.success).toBe(false);
  });

  it("getTenantUsers returns users for a tenant", () => {
    const prov = tenantProvisioner.provision({
      name: "Users Biz",
      slug: "users-biz",
      plan: "starter",
      adminEmail: "u@biz.com",
      adminName: "Admin",
    });
    const users = tenantProvisioner.getTenantUsers(prov.tenant!.id);
    expect(users.length).toBe(1);
    expect(users[0].role).toBe("admin");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// USAGE TRACKER
// ═══════════════════════════════════════════════════════════════════════════════

describe("UsageTracker", () => {
  it("records a usage event", () => {
    const event = usageTracker.record("tn1", "api_calls", 1);
    expect(event.tenantId).toBe("tn1");
    expect(event.metric).toBe("api_calls");
    expect(event.value).toBe(1);
  });

  it("getUsage aggregates events", () => {
    usageTracker.record("tn2", "api_calls", 5);
    usageTracker.record("tn2", "api_calls", 3);
    usageTracker.record("tn2", "campaigns", 1);

    const usage = usageTracker.getUsage("tn2", "api_calls");
    expect(usage.total).toBe(8);
    expect(usage.count).toBe(2);
  });

  it("getUsage filters by tenant and metric", () => {
    usageTracker.record("tn3", "api_calls", 10);
    usageTracker.record("tn4", "api_calls", 20);

    const usage3 = usageTracker.getUsage("tn3", "api_calls");
    expect(usage3.total).toBe(10);

    const usage4 = usageTracker.getUsage("tn4", "api_calls");
    expect(usage4.total).toBe(20);
  });

  it("checkQuota returns correct quota status", () => {
    usageTracker.record("tn5", "api_calls", 80);
    const quota = usageTracker.checkQuota("tn5", "api_calls", 100);
    expect(quota.withinQuota).toBe(true);
    expect(quota.used).toBe(80);
    expect(quota.max).toBe(100);
    expect(quota.remaining).toBe(20);
    expect(quota.percentUsed).toBe(80);
  });

  it("checkQuota detects exceeded quota", () => {
    usageTracker.record("tn6", "storage", 150);
    const quota = usageTracker.checkQuota("tn6", "storage", 100);
    expect(quota.withinQuota).toBe(false);
    expect(quota.remaining).toBe(0);
    expect(quota.percentUsed).toBe(100);
  });

  it("getUsage supports time-range filtering", () => {
    const past = new Date(Date.now() - 3600 * 1000).toISOString();
    const future = new Date(Date.now() + 3600 * 1000).toISOString();

    usageTracker.record("tn7", "api_calls", 5);
    const usage = usageTracker.getUsage("tn7", "api_calls", { after: past, before: future });
    expect(usage.total).toBe(5);
  });

  it("getUsage returns zero for unknown tenant/metric", () => {
    const usage = usageTracker.getUsage("unknown", "unknown_metric");
    expect(usage.total).toBe(0);
    expect(usage.count).toBe(0);
  });
});
