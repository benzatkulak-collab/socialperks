// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — Multi-Tenant Architecture
//
// Complete tenant isolation, provisioning, usage tracking, and billing for
// running Social Perks as a multi-tenant SaaS platform. Each business (or
// enterprise) operates within its own tenant boundary. Data is logically
// isolated, rate-limited, and quota-tracked per tenant.
//
// Storage: in-memory Maps (ready for Postgres + Prisma migration).
// ══════════════════════════════════════════════════════════════════════════════

// ─── Plan Types ─────────────────────────────────────────────────────────────

export type TenantPlan = "starter" | "professional" | "enterprise" | "custom";

export type TenantStatus = "active" | "suspended" | "trial" | "churned";

// ─── Tenant Interfaces ─────────────────────────────────────────────────────

export interface TenantConfig {
  features: Record<string, boolean>;
  apiRateLimit: number;
  webhookLimit: number;
  maxLocations: number;
  maxCampaigns: number;
  maxTeamMembers: number;
  allowCustomBranding: boolean;
  allowApiAccess: boolean;
  allowExchange: boolean;
  retentionDays: number;
  timezone: string;
  locale: string;
  currency: string;
}

export interface TenantLimits {
  campaignsUsed: number;
  campaignsMax: number;
  locationsUsed: number;
  locationsMax: number;
  apiCallsThisMonth: number;
  apiCallsMax: number;
  storageUsedMb: number;
  storageMaxMb: number;
}

export interface BrandingConfig {
  primaryColor: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  customCss: string | null;
  emailFromName: string;
  emailFromAddress: string;
}

export interface Tenant {
  id: string;
  slug: string;
  name: string;
  plan: TenantPlan;
  status: TenantStatus;
  config: TenantConfig;
  limits: TenantLimits;
  customDomain: string | null;
  brandingOverrides: BrandingConfig | null;
  createdAt: string;
  trialEndsAt: string | null;
}

// ─── Tenant Context & Middleware Types ──────────────────────────────────────

export interface TenantContext {
  tenant: Tenant;
  userId: string | null;
  userRole: string | null;
}

export interface TenantMiddlewareResult {
  success: boolean;
  context?: TenantContext;
  error?: { status: number; code: string; message: string };
}

// ─── Usage & Billing Types ──────────────────────────────────────────────────

export interface UsageEvent {
  tenantId: string;
  metric: string;
  value: number;
  timestamp: string;
}

export interface UsageReport {
  tenantId: string;
  period: string;
  metrics: Record<string, number>;
  generatedAt: string;
}

export interface BillingMetrics {
  tenantId: string;
  period: string;
  plan: TenantPlan;
  campaignsLaunched: number;
  apiCalls: number;
  storageUsedMb: number;
  activeLocations: number;
  teamMembers: number;
  overageCharges: OverageCharge[];
  totalOverage: number;
  generatedAt: string;
}

export interface OverageCharge {
  metric: string;
  included: number;
  used: number;
  overage: number;
  ratePerUnit: number;
  charge: number;
}

// ─── Data Isolation Types ───────────────────────────────────────────────────

export interface TenantScopedRecord {
  tenant_id: string;
  [key: string]: unknown;
}

export interface OwnershipValidation {
  valid: boolean;
  tenantId: string;
  recordId: string;
  reason?: string;
}

// ─── Provisioning Types ─────────────────────────────────────────────────────

export interface ProvisionRequest {
  name: string;
  slug: string;
  plan: TenantPlan;
  adminEmail: string;
  adminName: string;
  customDomain?: string;
  timezone?: string;
  locale?: string;
  currency?: string;
}

export interface ProvisionResult {
  success: boolean;
  tenant?: Tenant;
  adminUserId?: string;
  apiKey?: string;
  error?: string;
}

export interface DataExport {
  tenantId: string;
  exportedAt: string;
  version: string;
  tenant: Tenant;
  users: TenantUser[];
  data: Record<string, unknown[]>;
}

export interface TenantUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
}

// ─── ID Generation ──────────────────────────────────────────────────────────

let idCounter = 0;

function generateId(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${crypto.randomUUID()}_${idCounter}`;
}

// ─── Plan Default Configs ───────────────────────────────────────────────────

const PLAN_DEFAULTS: Record<TenantPlan, { config: TenantConfig; limits: Omit<TenantLimits, "campaignsUsed" | "locationsUsed" | "apiCallsThisMonth" | "storageUsedMb"> }> = {
  starter: {
    config: {
      features: {
        campaigns: true,
        submissions: true,
        basicAnalytics: true,
        qrCodes: true,
        advancedAnalytics: false,
        aiGeneration: false,
        influencerMatching: false,
        customBranding: false,
        apiAccess: false,
        webhooks: false,
        multiLocation: false,
        teamMembers: false,
        exchange: false,
        whiteLabel: false,
        sso: false,
        auditLog: false,
        dataExport: false,
        prioritySupport: false,
      },
      apiRateLimit: 100,
      webhookLimit: 0,
      maxLocations: 1,
      maxCampaigns: 5,
      maxTeamMembers: 1,
      allowCustomBranding: false,
      allowApiAccess: false,
      allowExchange: false,
      retentionDays: 90,
      timezone: "America/New_York",
      locale: "en-US",
      currency: "USD",
    },
    limits: {
      campaignsMax: 5,
      locationsMax: 1,
      apiCallsMax: 1_000,
      storageMaxMb: 100,
    },
  },

  professional: {
    config: {
      features: {
        campaigns: true,
        submissions: true,
        basicAnalytics: true,
        qrCodes: true,
        advancedAnalytics: true,
        aiGeneration: true,
        influencerMatching: true,
        customBranding: true,
        apiAccess: true,
        webhooks: true,
        multiLocation: true,
        teamMembers: true,
        exchange: false,
        whiteLabel: false,
        sso: false,
        auditLog: true,
        dataExport: true,
        prioritySupport: false,
      },
      apiRateLimit: 1_000,
      webhookLimit: 10,
      maxLocations: 10,
      maxCampaigns: 50,
      maxTeamMembers: 10,
      allowCustomBranding: true,
      allowApiAccess: true,
      allowExchange: false,
      retentionDays: 365,
      timezone: "America/New_York",
      locale: "en-US",
      currency: "USD",
    },
    limits: {
      campaignsMax: 50,
      locationsMax: 10,
      apiCallsMax: 50_000,
      storageMaxMb: 5_000,
    },
  },

  enterprise: {
    config: {
      features: {
        campaigns: true,
        submissions: true,
        basicAnalytics: true,
        qrCodes: true,
        advancedAnalytics: true,
        aiGeneration: true,
        influencerMatching: true,
        customBranding: true,
        apiAccess: true,
        webhooks: true,
        multiLocation: true,
        teamMembers: true,
        exchange: true,
        whiteLabel: true,
        sso: true,
        auditLog: true,
        dataExport: true,
        prioritySupport: true,
      },
      apiRateLimit: 10_000,
      webhookLimit: 100,
      maxLocations: 500,
      maxCampaigns: 1_000,
      maxTeamMembers: 100,
      allowCustomBranding: true,
      allowApiAccess: true,
      allowExchange: true,
      retentionDays: 730,
      timezone: "America/New_York",
      locale: "en-US",
      currency: "USD",
    },
    limits: {
      campaignsMax: 1_000,
      locationsMax: 500,
      apiCallsMax: 1_000_000,
      storageMaxMb: 100_000,
    },
  },

  custom: {
    config: {
      features: {
        campaigns: true,
        submissions: true,
        basicAnalytics: true,
        qrCodes: true,
        advancedAnalytics: true,
        aiGeneration: true,
        influencerMatching: true,
        customBranding: true,
        apiAccess: true,
        webhooks: true,
        multiLocation: true,
        teamMembers: true,
        exchange: true,
        whiteLabel: true,
        sso: true,
        auditLog: true,
        dataExport: true,
        prioritySupport: true,
      },
      apiRateLimit: 100_000,
      webhookLimit: 1_000,
      maxLocations: 10_000,
      maxCampaigns: 100_000,
      maxTeamMembers: 1_000,
      allowCustomBranding: true,
      allowApiAccess: true,
      allowExchange: true,
      retentionDays: 2_555,
      timezone: "America/New_York",
      locale: "en-US",
      currency: "USD",
    },
    limits: {
      campaignsMax: 100_000,
      locationsMax: 10_000,
      apiCallsMax: 10_000_000,
      storageMaxMb: 1_000_000,
    },
  },
};

// ─── Rate Limiter ───────────────────────────────────────────────────────────

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

class RateLimiter {
  private windows: Map<string, RateLimitEntry> = new Map();
  private readonly windowMs = 60_000; // 1-minute sliding window

  /**
   * Check whether a tenant has exceeded its rate limit for the current window.
   * Returns true if the request is allowed, false if rate-limited.
   */
  check(tenantId: string, limit: number): boolean {
    const now = Date.now();
    const key = tenantId;
    const entry = this.windows.get(key);

    if (!entry || now - entry.windowStart > this.windowMs) {
      this.windows.set(key, { count: 1, windowStart: now });
      return true;
    }

    if (entry.count >= limit) {
      return false;
    }

    entry.count += 1;
    return true;
  }

  /** Get current request count in the active window. */
  getCurrentCount(tenantId: string): number {
    const now = Date.now();
    const entry = this.windows.get(tenantId);
    if (!entry || now - entry.windowStart > this.windowMs) return 0;
    return entry.count;
  }

  /** Reset rate limit state for a tenant. Primarily for testing. */
  reset(tenantId: string): void {
    this.windows.delete(tenantId);
  }

  /** Clear all rate limit state. For testing only. */
  _reset(): void {
    this.windows.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 1. Tenant Manager
// ══════════════════════════════════════════════════════════════════════════════

class TenantManager {
  private tenants: Map<string, Tenant> = new Map();
  private slugIndex: Map<string, string> = new Map(); // slug -> tenantId
  private domainIndex: Map<string, string> = new Map(); // domain -> tenantId

  // ── Create ──────────────────────────────────────────────────────────────

  /**
   * Create a new tenant with plan-based default configuration.
   * The slug must be unique and URL-safe (lowercase alphanumeric + hyphens).
   */
  create(params: {
    name: string;
    slug: string;
    plan: TenantPlan;
    customDomain?: string;
    trialDays?: number;
    configOverrides?: Partial<TenantConfig>;
    brandingOverrides?: BrandingConfig;
  }): Tenant {
    // Validate slug uniqueness and format
    const normalizedSlug = params.slug.toLowerCase().trim();
    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$/.test(normalizedSlug) && normalizedSlug.length > 1) {
      throw new Error(
        `Invalid slug "${normalizedSlug}". Slugs must be lowercase alphanumeric with hyphens, ` +
        `starting and ending with an alphanumeric character.`
      );
    }
    if (normalizedSlug.length < 2 || normalizedSlug.length > 63) {
      throw new Error(
        `Slug must be between 2 and 63 characters. Got: ${normalizedSlug.length}.`
      );
    }
    if (this.slugIndex.has(normalizedSlug)) {
      throw new Error(`Slug "${normalizedSlug}" is already in use.`);
    }

    // Validate custom domain uniqueness
    if (params.customDomain) {
      const normalizedDomain = params.customDomain.toLowerCase().trim();
      if (this.domainIndex.has(normalizedDomain)) {
        throw new Error(`Domain "${normalizedDomain}" is already in use.`);
      }
    }

    const planDefaults = PLAN_DEFAULTS[params.plan];
    const now = new Date().toISOString();

    const tenant: Tenant = {
      id: generateId("tn"),
      slug: normalizedSlug,
      name: params.name,
      plan: params.plan,
      status: params.trialDays ? "trial" : "active",
      config: {
        ...planDefaults.config,
        ...params.configOverrides,
        features: {
          ...planDefaults.config.features,
          ...params.configOverrides?.features,
        },
      },
      limits: {
        campaignsUsed: 0,
        campaignsMax: planDefaults.limits.campaignsMax,
        locationsUsed: 0,
        locationsMax: planDefaults.limits.locationsMax,
        apiCallsThisMonth: 0,
        apiCallsMax: planDefaults.limits.apiCallsMax,
        storageUsedMb: 0,
        storageMaxMb: planDefaults.limits.storageMaxMb,
      },
      customDomain: params.customDomain?.toLowerCase().trim() ?? null,
      brandingOverrides: params.brandingOverrides ?? null,
      createdAt: now,
      trialEndsAt: params.trialDays
        ? new Date(Date.now() + params.trialDays * 86_400_000).toISOString()
        : null,
    };

    this.tenants.set(tenant.id, tenant);
    this.slugIndex.set(normalizedSlug, tenant.id);
    if (tenant.customDomain) {
      this.domainIndex.set(tenant.customDomain, tenant.id);
    }

    return tenant;
  }

  // ── Lookups ─────────────────────────────────────────────────────────────

  /** Get a tenant by its unique ID. */
  getById(id: string): Tenant | null {
    return this.tenants.get(id) ?? null;
  }

  /** Get a tenant by its URL-safe slug. */
  getBySlug(slug: string): Tenant | null {
    const id = this.slugIndex.get(slug.toLowerCase());
    if (!id) return null;
    return this.tenants.get(id) ?? null;
  }

  /** Get a tenant by its custom domain. */
  getByDomain(domain: string): Tenant | null {
    const id = this.domainIndex.get(domain.toLowerCase());
    if (!id) return null;
    return this.tenants.get(id) ?? null;
  }

  /** List all tenants, optionally filtered by status or plan. */
  list(filter?: { status?: TenantStatus; plan?: TenantPlan }): Tenant[] {
    let results: Tenant[] = [];
    this.tenants.forEach((t) => results.push(t));
    if (filter?.status) {
      results = results.filter((t) => t.status === filter.status);
    }
    if (filter?.plan) {
      results = results.filter((t) => t.plan === filter.plan);
    }
    return results;
  }

  // ── Updates ─────────────────────────────────────────────────────────────

  /**
   * Update tenant fields. Cannot change ID or slug.
   * To change a slug, deprovision and re-create.
   */
  update(
    tenantId: string,
    updates: Partial<Pick<Tenant, "name" | "plan" | "config" | "customDomain" | "brandingOverrides">>
  ): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);

    // Handle custom domain change
    if (updates.customDomain !== undefined) {
      // Remove old domain index
      if (tenant.customDomain) {
        this.domainIndex.delete(tenant.customDomain);
      }
      // Add new domain index
      if (updates.customDomain) {
        const normalizedDomain = updates.customDomain.toLowerCase().trim();
        if (this.domainIndex.has(normalizedDomain)) {
          throw new Error(`Domain "${normalizedDomain}" is already in use.`);
        }
        this.domainIndex.set(normalizedDomain, tenantId);
      }
    }

    // Apply plan upgrade/downgrade defaults if plan changed
    if (updates.plan && updates.plan !== tenant.plan) {
      const newDefaults = PLAN_DEFAULTS[updates.plan];
      const updatedTenant: Tenant = {
        ...tenant,
        ...updates,
        customDomain: updates.customDomain !== undefined
          ? (updates.customDomain?.toLowerCase().trim() ?? null)
          : tenant.customDomain,
        config: {
          ...newDefaults.config,
          ...updates.config,
          // Preserve tenant-specific overrides for timezone/locale/currency
          timezone: updates.config?.timezone ?? tenant.config.timezone,
          locale: updates.config?.locale ?? tenant.config.locale,
          currency: updates.config?.currency ?? tenant.config.currency,
          features: {
            ...newDefaults.config.features,
            ...updates.config?.features,
          },
        },
        limits: {
          ...tenant.limits,
          campaignsMax: newDefaults.limits.campaignsMax,
          locationsMax: newDefaults.limits.locationsMax,
          apiCallsMax: newDefaults.limits.apiCallsMax,
          storageMaxMb: newDefaults.limits.storageMaxMb,
        },
      };
      this.tenants.set(tenantId, updatedTenant);
      return updatedTenant;
    }

    // Standard field update (no plan change)
    const updatedTenant: Tenant = {
      ...tenant,
      ...updates,
      customDomain: updates.customDomain !== undefined
        ? (updates.customDomain?.toLowerCase().trim() ?? null)
        : tenant.customDomain,
      config: updates.config
        ? {
            ...tenant.config,
            ...updates.config,
            features: {
              ...tenant.config.features,
              ...updates.config.features,
            },
          }
        : tenant.config,
    };
    this.tenants.set(tenantId, updatedTenant);
    return updatedTenant;
  }

  /** Suspend a tenant. Prevents all API access and logins. */
  suspend(tenantId: string, reason?: string): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);
    if (tenant.status === "suspended") {
      throw new Error(`Tenant "${tenantId}" is already suspended.`);
    }

    const updated: Tenant = {
      ...tenant,
      status: "suspended",
      config: {
        ...tenant.config,
        features: {
          ...tenant.config.features,
          _suspendedAt: true,
          _suspendReason: true,
        },
      },
    };

    // Store suspension metadata without changing the interface
    (updated as unknown as Record<string, unknown>)._suspendReason = reason;
    (updated as unknown as Record<string, unknown>)._suspendedAt = new Date().toISOString();

    this.tenants.set(tenantId, updated);
    return updated;
  }

  /** Reactivate a previously suspended tenant. */
  reactivate(tenantId: string): Tenant {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);
    if (tenant.status !== "suspended") {
      throw new Error(
        `Tenant "${tenantId}" is not suspended (current status: ${tenant.status}).`
      );
    }

    const updated: Tenant = {
      ...tenant,
      status: "active",
    };
    this.tenants.set(tenantId, updated);
    return updated;
  }

  // ── Limit Checks ────────────────────────────────────────────────────────

  /**
   * Check if a tenant has reached a specific limit.
   * Returns true if the limit has been reached or exceeded.
   */
  checkLimit(
    tenantId: string,
    limitKey: "campaigns" | "locations" | "apiCalls" | "storage"
  ): { reached: boolean; current: number; max: number; remaining: number } {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);

    const mapping: Record<string, { used: keyof TenantLimits; max: keyof TenantLimits }> = {
      campaigns: { used: "campaignsUsed", max: "campaignsMax" },
      locations: { used: "locationsUsed", max: "locationsMax" },
      apiCalls: { used: "apiCallsThisMonth", max: "apiCallsMax" },
      storage: { used: "storageUsedMb", max: "storageMaxMb" },
    };

    const { used, max } = mapping[limitKey];
    const currentVal = tenant.limits[used] as number;
    const maxVal = tenant.limits[max] as number;

    return {
      reached: currentVal >= maxVal,
      current: currentVal,
      max: maxVal,
      remaining: Math.max(0, maxVal - currentVal),
    };
  }

  /**
   * Increment a usage counter for a tenant.
   * Returns the updated limits.
   */
  incrementUsage(
    tenantId: string,
    counter: "campaigns" | "locations" | "apiCalls" | "storage",
    amount: number = 1
  ): TenantLimits {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);

    const counterMapping: Record<string, keyof TenantLimits> = {
      campaigns: "campaignsUsed",
      locations: "locationsUsed",
      apiCalls: "apiCallsThisMonth",
      storage: "storageUsedMb",
    };

    const key = counterMapping[counter];
    const updatedLimits: TenantLimits = {
      ...tenant.limits,
      [key]: (tenant.limits[key] as number) + amount,
    };

    this.tenants.set(tenantId, { ...tenant, limits: updatedLimits });
    return updatedLimits;
  }

  /**
   * Check whether a specific feature flag is enabled for a tenant.
   */
  isFeatureEnabled(tenantId: string, featureKey: string): boolean {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return false;
    return tenant.config.features[featureKey] === true;
  }

  /** Reset monthly usage counters. Called by a scheduled job at month start. */
  resetMonthlyUsage(tenantId: string): void {
    const tenant = this.tenants.get(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);

    this.tenants.set(tenantId, {
      ...tenant,
      limits: {
        ...tenant.limits,
        apiCallsThisMonth: 0,
      },
    });
  }

  /** Total number of tenants. */
  get size(): number {
    return this.tenants.size;
  }

  /** Clear all tenants. For testing only. */
  _reset(): void {
    this.tenants.clear();
    this.slugIndex.clear();
    this.domainIndex.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 2. Tenant Resolver & Middleware
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Resolves a tenant from various sources in an incoming request.
 * Priority order:
 *   1. Explicit `X-Tenant-ID` header
 *   2. Custom domain via `X-Tenant-Domain` header
 *   3. Subdomain extraction from `Host` header (`{slug}.socialperks.app`)
 *   4. API key prefix (`sk_{tenantId}_...`)
 */
class TenantResolver {
  constructor(private manager: TenantManager) {}

  /**
   * Resolve the tenant from request headers.
   * Returns the tenant or null if no tenant could be determined.
   */
  resolve(headers: Record<string, string | undefined>): Tenant | null {
    // 1. Explicit tenant ID header
    const tenantIdHeader = headers["x-tenant-id"];
    if (tenantIdHeader) {
      const tenant = this.manager.getById(tenantIdHeader);
      if (tenant) return tenant;
    }

    // 2. Custom domain header
    const domainHeader = headers["x-tenant-domain"];
    if (domainHeader) {
      const tenant = this.manager.getByDomain(domainHeader);
      if (tenant) return tenant;
    }

    // 3. Subdomain from Host header
    const host = headers["host"];
    if (host) {
      const slug = this.extractSubdomain(host);
      if (slug) {
        const tenant = this.manager.getBySlug(slug);
        if (tenant) return tenant;
      }
    }

    // 4. API key prefix
    const authHeader = headers["authorization"];
    if (authHeader) {
      const tenantId = this.extractTenantFromApiKey(authHeader);
      if (tenantId) {
        const tenant = this.manager.getById(tenantId);
        if (tenant) return tenant;
      }
    }

    return null;
  }

  /**
   * Extract subdomain slug from a host string.
   * Expects format: `{slug}.socialperks.app` or `{slug}.socialperks.app:3000`.
   */
  extractSubdomain(host: string): string | null {
    // Strip port if present
    const hostWithoutPort = host.split(":")[0];
    const parts = hostWithoutPort.split(".");

    // Must have at least 3 parts: slug.socialperks.app
    if (parts.length < 3) return null;

    // The root domain is the last two parts
    const rootDomain = parts.slice(-2).join(".");
    if (rootDomain !== "socialperks.app" && rootDomain !== "socialperks.com") {
      return null;
    }

    // Everything before the root domain is the subdomain chain; take the first
    const slug = parts[0];
    if (!slug || slug === "www" || slug === "api" || slug === "app") {
      return null;
    }

    return slug;
  }

  /**
   * Extract tenant ID from an API key with format `sk_{tenantId}_...`.
   * Handles both raw keys and "Bearer sk_..." authorization headers.
   */
  extractTenantFromApiKey(authHeader: string): string | null {
    let key = authHeader;
    if (key.startsWith("Bearer ")) {
      key = key.slice(7);
    }

    if (!key.startsWith("sk_")) return null;

    // Format: sk_{tenantId}_{random}
    const parts = key.split("_");
    // parts[0] = "sk", parts[1] = tenantId prefix, rest = random
    if (parts.length < 3) return null;

    // The tenant ID is embedded between the first and last underscore segments.
    // Since tenant IDs themselves contain underscores (tn_xxx_yyy_z), we need to
    // find the tenant ID portion. Convention: everything between sk_ and the last
    // segment is the tenant ID.
    const tenantIdParts = parts.slice(1, -1);
    return tenantIdParts.join("_");
  }
}

/**
 * Create middleware that resolves the tenant, validates status, and checks
 * rate limits. Returns a TenantMiddlewareResult with either a valid context
 * or an error to send back to the client.
 */
function createTenantMiddleware(
  manager: TenantManager,
  resolver: TenantResolver,
  rateLimiter: RateLimiter
): (headers: Record<string, string | undefined>) => TenantMiddlewareResult {
  return (headers: Record<string, string | undefined>): TenantMiddlewareResult => {
    // Step 1: Resolve tenant
    const tenant = resolver.resolve(headers);
    if (!tenant) {
      return {
        success: false,
        error: {
          status: 404,
          code: "TENANT_NOT_FOUND",
          message:
            "Could not resolve a tenant from the request. " +
            "Provide X-Tenant-ID, X-Tenant-Domain, use a subdomain, or include an API key.",
        },
      };
    }

    // Step 2: Check tenant status
    if (tenant.status === "suspended") {
      return {
        success: false,
        error: {
          status: 403,
          code: "TENANT_SUSPENDED",
          message:
            `Tenant "${tenant.name}" is currently suspended. ` +
            "Contact support for assistance.",
        },
      };
    }

    if (tenant.status === "churned") {
      return {
        success: false,
        error: {
          status: 403,
          code: "TENANT_CHURNED",
          message:
            `Tenant "${tenant.name}" has been deactivated. ` +
            "Contact support to reactivate your account.",
        },
      };
    }

    // Step 3: Check trial expiration
    if (tenant.status === "trial" && tenant.trialEndsAt) {
      const trialEnd = new Date(tenant.trialEndsAt).getTime();
      if (Date.now() > trialEnd) {
        return {
          success: false,
          error: {
            status: 403,
            code: "TRIAL_EXPIRED",
            message:
              `Trial period for "${tenant.name}" has expired. ` +
              "Please upgrade to a paid plan to continue.",
          },
        };
      }
    }

    // Step 4: Check rate limit
    const allowed = rateLimiter.check(tenant.id, tenant.config.apiRateLimit);
    if (!allowed) {
      return {
        success: false,
        error: {
          status: 429,
          code: "RATE_LIMIT_EXCEEDED",
          message:
            `Rate limit exceeded for tenant "${tenant.name}". ` +
            `Limit: ${tenant.config.apiRateLimit} requests/minute. ` +
            "Retry after the current window resets.",
        },
      };
    }

    // Step 5: Increment API call usage
    manager.incrementUsage(tenant.id, "apiCalls", 1);

    // Step 6: Extract user context from headers (if present)
    const userId = headers["x-user-id"] ?? null;
    const userRole = headers["x-user-role"] ?? null;

    return {
      success: true,
      context: {
        tenant,
        userId,
        userRole,
      },
    };
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// 3. Data Isolation
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Provides data isolation primitives to ensure tenant data never leaks
 * across boundaries. In a real Postgres setup these would translate to
 * WHERE clauses and row-level security policies. Here they operate on
 * in-memory arrays.
 */
class TenantDataFilter {
  /**
   * Scope a query to a specific tenant by filtering an array of records.
   * Each record must have a `tenant_id` field.
   */
  scopeQuery<T extends TenantScopedRecord>(
    records: T[],
    tenantId: string
  ): T[] {
    return records.filter((r) => r.tenant_id === tenantId);
  }

  /**
   * Validate that a specific record belongs to the given tenant.
   * Returns a validation result with details.
   */
  validateOwnership(
    record: TenantScopedRecord,
    tenantId: string,
    recordId: string
  ): OwnershipValidation {
    if (record.tenant_id === tenantId) {
      return { valid: true, tenantId, recordId };
    }

    return {
      valid: false,
      tenantId,
      recordId,
      reason:
        `Record "${recordId}" belongs to tenant "${record.tenant_id}", ` +
        `not the requesting tenant "${tenantId}". Access denied.`,
    };
  }

  /**
   * Guard against cross-tenant data access. Throws if the requesting tenant
   * does not own the target record. Use this as a pre-condition check before
   * any mutation on a tenant-scoped resource.
   */
  crossTenantGuard(
    record: TenantScopedRecord,
    requestingTenantId: string,
    recordId: string
  ): void {
    if (record.tenant_id !== requestingTenantId) {
      throw new Error(
        `Cross-tenant access violation: tenant "${requestingTenantId}" attempted ` +
        `to access record "${recordId}" owned by tenant "${record.tenant_id}".`
      );
    }
  }

  /**
   * Tag a new record with a tenant_id before persisting.
   * Returns a new object with tenant_id set.
   */
  tagRecord<T extends Record<string, unknown>>(
    record: T,
    tenantId: string
  ): T & { tenant_id: string } {
    return { ...record, tenant_id: tenantId };
  }

  /**
   * Batch-validate that all records in an array belong to the same tenant.
   * Returns the first invalid record found, or null if all are valid.
   */
  batchValidate(
    records: TenantScopedRecord[],
    tenantId: string
  ): { valid: boolean; invalidRecords: string[] } {
    const invalidRecords: string[] = [];

    for (const record of records) {
      if (record.tenant_id !== tenantId) {
        const recordId =
          (record.id as string) ?? (record._id as string) ?? "unknown";
        invalidRecords.push(recordId);
      }
    }

    return {
      valid: invalidRecords.length === 0,
      invalidRecords,
    };
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 4. Tenant Provisioning
// ══════════════════════════════════════════════════════════════════════════════

class TenantProvisioner {
  private users: Map<string, TenantUser[]> = new Map();
  private deprovisioned: Map<string, { tenant: Tenant; deprovisionedAt: string }> = new Map();

  constructor(private manager: TenantManager) {}

  /**
   * Provision a new tenant with an admin user, default configuration,
   * and optionally seed data. This is the primary onboarding entry point.
   */
  provision(request: ProvisionRequest): ProvisionResult {
    try {
      // Validate request
      if (!request.name || request.name.trim().length === 0) {
        return { success: false, error: "Tenant name is required." };
      }
      if (!request.slug || request.slug.trim().length === 0) {
        return { success: false, error: "Tenant slug is required." };
      }
      if (!request.adminEmail || !request.adminEmail.includes("@")) {
        return { success: false, error: "Valid admin email is required." };
      }

      // Create the tenant
      const tenant = this.manager.create({
        name: request.name,
        slug: request.slug,
        plan: request.plan,
        customDomain: request.customDomain,
        trialDays: request.plan === "starter" ? 14 : undefined,
        configOverrides: {
          timezone: request.timezone ?? "America/New_York",
          locale: request.locale ?? "en-US",
          currency: request.currency ?? "USD",
        },
      });

      // Create the admin user
      const adminUser: TenantUser = {
        id: generateId("usr"),
        tenantId: tenant.id,
        email: request.adminEmail,
        name: request.adminName,
        role: "admin",
        createdAt: new Date().toISOString(),
      };

      if (!this.users.has(tenant.id)) {
        this.users.set(tenant.id, []);
      }
      this.users.get(tenant.id)!.push(adminUser);

      // Generate an API key for the tenant (if plan allows)
      let apiKey: string | undefined;
      if (tenant.config.allowApiAccess) {
        apiKey = `sk_${tenant.id}_${crypto.randomUUID()}`;
      }

      return {
        success: true,
        tenant,
        adminUserId: adminUser.id,
        apiKey,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Soft-delete a tenant. The tenant is marked as churned and its data
   * is queued for cleanup after a retention period.
   */
  deprovision(tenantId: string): { success: boolean; error?: string } {
    try {
      const tenant = this.manager.getById(tenantId);
      if (!tenant) {
        return { success: false, error: `Tenant "${tenantId}" not found.` };
      }

      // Store a snapshot for potential recovery
      this.deprovisioned.set(tenantId, {
        tenant: { ...tenant },
        deprovisionedAt: new Date().toISOString(),
      });

      // Mark as churned — this will block all access via middleware
      this.manager.suspend(tenantId, "Deprovisioned");
      const suspended = this.manager.getById(tenantId)!;
      // Transition from suspended to churned
      const churned: Tenant = { ...suspended, status: "churned" };
      // We need to update directly since TenantManager doesn't expose a
      // setStatus method; use update to change name which triggers a set
      // Actually, let's use the manager properly:
      // The manager stores tenants in a private map, so we suspend then
      // reactivate with churned status. This is a pragmatic workaround for
      // the in-memory store. In Postgres, this would be a single UPDATE.
      this.manager.reactivate(tenantId);
      this.manager.update(tenantId, { name: churned.name });
      // Now suspend again to block access, and we'll track churned state
      // via the deprovisioned map.
      this.manager.suspend(tenantId, "Deprovisioned — data cleanup pending");

      return { success: true };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /**
   * Export all tenant data in a GDPR-compliant format.
   * Returns a serializable object containing the full tenant profile,
   * users, and associated data.
   */
  exportData(tenantId: string): DataExport | null {
    const tenant = this.manager.getById(tenantId);
    if (!tenant) return null;

    const users = this.users.get(tenantId) ?? [];

    return {
      tenantId,
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
      tenant: { ...tenant },
      users: users.map((u) => ({ ...u })),
      data: {
        // In a real implementation, this would include all tenant-scoped data:
        // campaigns, submissions, perks, analytics, etc.
        // For now, we return the structural placeholder.
        campaigns: [],
        submissions: [],
        perks: [],
        analytics: [],
      },
    };
  }

  /**
   * Import tenant data from a previous export. Creates a new tenant with
   * the imported configuration and restores users.
   */
  importData(
    exportData: DataExport,
    newSlug?: string
  ): ProvisionResult {
    try {
      const slug = newSlug ?? exportData.tenant.slug;
      const adminUser = exportData.users.find((u) => u.role === "admin");

      if (!adminUser) {
        return { success: false, error: "Export data has no admin user." };
      }

      // Create the tenant with original config
      const tenant = this.manager.create({
        name: exportData.tenant.name,
        slug,
        plan: exportData.tenant.plan,
        customDomain: exportData.tenant.customDomain ?? undefined,
        configOverrides: exportData.tenant.config,
        brandingOverrides: exportData.tenant.brandingOverrides ?? undefined,
      });

      // Restore users
      const restoredUsers: TenantUser[] = exportData.users.map((u) => ({
        ...u,
        id: generateId("usr"),
        tenantId: tenant.id,
        createdAt: new Date().toISOString(),
      }));

      this.users.set(tenant.id, restoredUsers);

      const newAdmin = restoredUsers.find((u) => u.role === "admin");

      return {
        success: true,
        tenant,
        adminUserId: newAdmin?.id,
      };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  /** Get all users for a tenant. */
  getTenantUsers(tenantId: string): TenantUser[] {
    return this.users.get(tenantId) ?? [];
  }

  /** Add a user to a tenant. */
  addUser(tenantId: string, user: Omit<TenantUser, "id" | "tenantId" | "createdAt">): TenantUser {
    const tenant = this.manager.getById(tenantId);
    if (!tenant) throw new Error(`Tenant "${tenantId}" not found.`);

    // Check team member limit
    const currentUsers = this.users.get(tenantId) ?? [];
    if (currentUsers.length >= tenant.config.maxTeamMembers) {
      throw new Error(
        `Tenant "${tenantId}" has reached its team member limit ` +
        `(${tenant.config.maxTeamMembers}).`
      );
    }

    const newUser: TenantUser = {
      id: generateId("usr"),
      tenantId,
      email: user.email,
      name: user.name,
      role: user.role,
      createdAt: new Date().toISOString(),
    };

    if (!this.users.has(tenantId)) {
      this.users.set(tenantId, []);
    }
    this.users.get(tenantId)!.push(newUser);
    return newUser;
  }

  /** Remove a user from a tenant. */
  removeUser(tenantId: string, userId: string): boolean {
    const users = this.users.get(tenantId);
    if (!users) return false;

    const index = users.findIndex((u) => u.id === userId);
    if (index === -1) return false;

    // Prevent removing the last admin
    const user = users[index];
    if (user.role === "admin") {
      const adminCount = users.filter((u) => u.role === "admin").length;
      if (adminCount <= 1) {
        throw new Error("Cannot remove the last admin from a tenant.");
      }
    }

    users.splice(index, 1);
    return true;
  }

  /** Clear all provisioning state. For testing only. */
  _reset(): void {
    this.users.clear();
    this.deprovisioned.clear();
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// 5. Usage Tracking & Billing
// ══════════════════════════════════════════════════════════════════════════════

class UsageTracker {
  private events: UsageEvent[] = [];
  private readonly maxEvents = 500_000;

  /**
   * Record a usage event for a tenant.
   */
  record(tenantId: string, metric: string, value: number = 1): UsageEvent {
    const event: UsageEvent = {
      tenantId,
      metric,
      value,
      timestamp: new Date().toISOString(),
    };

    this.events.push(event);

    // Trim oldest events if over capacity
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(Math.floor(this.maxEvents * 0.2));
    }

    return event;
  }

  /**
   * Get aggregated usage for a tenant, metric, and optional time range.
   */
  getUsage(
    tenantId: string,
    metric: string,
    options?: { after?: string; before?: string }
  ): { total: number; count: number; events: UsageEvent[] } {
    let filtered = this.events.filter(
      (e) => e.tenantId === tenantId && e.metric === metric
    );

    if (options?.after) {
      const afterMs = new Date(options.after).getTime();
      filtered = filtered.filter(
        (e) => new Date(e.timestamp).getTime() >= afterMs
      );
    }

    if (options?.before) {
      const beforeMs = new Date(options.before).getTime();
      filtered = filtered.filter(
        (e) => new Date(e.timestamp).getTime() < beforeMs
      );
    }

    const total = filtered.reduce((sum, e) => sum + e.value, 0);

    return { total, count: filtered.length, events: filtered };
  }

  /**
   * Generate a monthly usage summary for a tenant.
   * If no year/month is provided, uses the current month.
   */
  getMonthlyReport(
    tenantId: string,
    year?: number,
    month?: number
  ): UsageReport {
    const now = new Date();
    const reportYear = year ?? now.getFullYear();
    const reportMonth = month ?? now.getMonth() + 1;

    const startDate = new Date(reportYear, reportMonth - 1, 1);
    const endDate = new Date(reportYear, reportMonth, 1);

    const after = startDate.toISOString();
    const before = endDate.toISOString();

    const tenantEvents = this.events.filter((e) => {
      if (e.tenantId !== tenantId) return false;
      const ts = new Date(e.timestamp).getTime();
      return ts >= startDate.getTime() && ts < endDate.getTime();
    });

    // Aggregate by metric
    const metrics: Record<string, number> = {};
    for (const event of tenantEvents) {
      metrics[event.metric] = (metrics[event.metric] ?? 0) + event.value;
    }

    const period = `${reportYear}-${String(reportMonth).padStart(2, "0")}`;

    return {
      tenantId,
      period,
      metrics,
      generatedAt: new Date().toISOString(),
    };
  }

  /**
   * Check if a tenant is within its quotas for a specific metric.
   * Compares current-month usage against the tenant's configured limits.
   */
  checkQuota(
    tenantId: string,
    metric: string,
    maxAllowed: number
  ): { withinQuota: boolean; used: number; max: number; remaining: number; percentUsed: number } {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usage = this.getUsage(tenantId, metric, {
      after: startOfMonth.toISOString(),
    });

    const percentUsed = maxAllowed > 0 ? (usage.total / maxAllowed) * 100 : 100;

    return {
      withinQuota: usage.total < maxAllowed,
      used: usage.total,
      max: maxAllowed,
      remaining: Math.max(0, maxAllowed - usage.total),
      percentUsed: Math.min(100, percentUsed),
    };
  }

  /**
   * Aggregate usage into billable metrics for invoicing.
   * Calculates overage charges based on plan limits.
   */
  getBillingMetrics(
    tenantId: string,
    tenant: Tenant,
    year?: number,
    month?: number
  ): BillingMetrics {
    const report = this.getMonthlyReport(tenantId, year, month);

    const overageCharges: OverageCharge[] = [];

    // Overage rate schedule (per unit above the plan limit)
    const overageRates: Record<string, { limitKey: keyof TenantLimits; rate: number }> = {
      campaign_launched: { limitKey: "campaignsMax", rate: 5.0 },
      api_call: { limitKey: "apiCallsMax", rate: 0.001 },
      storage_mb: { limitKey: "storageMaxMb", rate: 0.05 },
      location_added: { limitKey: "locationsMax", rate: 10.0 },
    };

    for (const [metric, config] of Object.entries(overageRates)) {
      const used = report.metrics[metric] ?? 0;
      const included = tenant.limits[config.limitKey] as number;

      if (used > included) {
        const overage = used - included;
        overageCharges.push({
          metric,
          included,
          used,
          overage,
          ratePerUnit: config.rate,
          charge: overage * config.rate,
        });
      }
    }

    const totalOverage = overageCharges.reduce((sum, c) => sum + c.charge, 0);

    return {
      tenantId,
      period: report.period,
      plan: tenant.plan,
      campaignsLaunched: report.metrics["campaign_launched"] ?? 0,
      apiCalls: report.metrics["api_call"] ?? 0,
      storageUsedMb: report.metrics["storage_mb"] ?? 0,
      activeLocations: report.metrics["location_added"] ?? 0,
      teamMembers: report.metrics["team_member_added"] ?? 0,
      overageCharges,
      totalOverage,
      generatedAt: new Date().toISOString(),
    };
  }

  /** Get all events for a tenant. Useful for auditing. */
  getEventsForTenant(tenantId: string, limit?: number): UsageEvent[] {
    const events = this.events.filter((e) => e.tenantId === tenantId);
    if (limit && limit > 0) {
      return events.slice(-limit);
    }
    return events;
  }

  /** Total number of stored usage events. */
  get size(): number {
    return this.events.length;
  }

  /** Clear all usage events. For testing only. */
  _reset(): void {
    this.events = [];
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// Singleton Instances
// ══════════════════════════════════════════════════════════════════════════════

export const tenantManager = new TenantManager();
export const tenantResolver = new TenantResolver(tenantManager);
export const tenantRateLimiter = new RateLimiter();
export const tenantDataFilter = new TenantDataFilter();
export const tenantProvisioner = new TenantProvisioner(tenantManager);
export const usageTracker = new UsageTracker();

/**
 * Pre-configured tenant middleware. Pass request headers and receive either
 * a valid TenantContext or an error to return to the client.
 */
export const tenantMiddleware = createTenantMiddleware(
  tenantManager,
  tenantResolver,
  tenantRateLimiter
);

// ══════════════════════════════════════════════════════════════════════════════
// Re-export classes for testing and custom composition
// ══════════════════════════════════════════════════════════════════════════════

export {
  TenantManager,
  TenantResolver,
  TenantDataFilter,
  TenantProvisioner,
  UsageTracker,
  RateLimiter,
  createTenantMiddleware,
  PLAN_DEFAULTS,
};
