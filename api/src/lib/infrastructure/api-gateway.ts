// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — API Gateway & Developer Platform
// OpenAPI spec generation, versioning, rate limiting, usage metering,
// and SDK generation for the Social Perks developer ecosystem.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ParameterSpec {
  name: string;
  in: "query" | "path" | "header" | "cookie";
  required: boolean;
  description: string;
  schema: SchemaSpec;
}

export interface SchemaSpec {
  type: "string" | "number" | "integer" | "boolean" | "array" | "object";
  format?: string;
  description?: string;
  enum?: string[];
  items?: SchemaSpec;
  properties?: Record<string, SchemaSpec>;
  required?: string[];
  example?: unknown;
}

export interface ResponseSpec {
  description: string;
  schema?: SchemaSpec;
}

export interface EndpointSpec {
  path: string;
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH";
  summary: string;
  description: string;
  tags: string[];
  auth: boolean;
  parameters: ParameterSpec[];
  requestBody?: SchemaSpec;
  responses: Record<string, ResponseSpec>;
  rateLimit: { requests: number; window: string };
}

// ─── OpenAPI Spec Types ─────────────────────────────────────────────────────

interface OpenAPISpec {
  openapi: string;
  info: {
    title: string;
    description: string;
    version: string;
    contact: { name: string; url: string; email: string };
    license: { name: string; url: string };
  };
  servers: { url: string; description: string }[];
  paths: Record<string, Record<string, unknown>>;
  components: {
    securitySchemes: Record<string, unknown>;
    schemas: Record<string, unknown>;
  };
  tags: { name: string; description: string }[];
  security?: Record<string, unknown[]>[];
}

// ═══════════════════════════════════════════════════════════════════════════════
// OpenAPI Generator
// ═══════════════════════════════════════════════════════════════════════════════

export class OpenAPIGenerator {
  private endpoints: EndpointSpec[] = [];
  private tagSet: Map<string, string> = new Map();

  addEndpoint(spec: EndpointSpec): void {
    this.endpoints.push(spec);
    for (const tag of spec.tags) {
      if (!this.tagSet.has(tag)) {
        this.tagSet.set(tag, `${tag} operations`);
      }
    }
  }

  validate(spec: EndpointSpec): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!spec.path || !spec.path.startsWith("/")) {
      errors.push("Path must start with /");
    }
    if (!["GET", "POST", "PUT", "DELETE", "PATCH"].includes(spec.method)) {
      errors.push(`Invalid HTTP method: ${spec.method}`);
    }
    if (!spec.summary || spec.summary.length === 0) {
      errors.push("Summary is required");
    }
    if (!spec.description || spec.description.length === 0) {
      errors.push("Description is required");
    }
    if (!spec.tags || spec.tags.length === 0) {
      errors.push("At least one tag is required");
    }
    if (!spec.responses || Object.keys(spec.responses).length === 0) {
      errors.push("At least one response is required");
    }
    if (!spec.rateLimit || !spec.rateLimit.requests || !spec.rateLimit.window) {
      errors.push("Rate limit configuration is required");
    }
    for (const param of spec.parameters) {
      if (!param.name) errors.push("Parameter name is required");
      if (!["query", "path", "header", "cookie"].includes(param.in)) {
        errors.push(`Invalid parameter location: ${param.in}`);
      }
    }
    if (spec.method === "GET" && spec.requestBody) {
      errors.push("GET requests should not have a request body");
    }

    return { valid: errors.length === 0, errors };
  }

  generate(): OpenAPISpec {
    const paths: Record<string, Record<string, unknown>> = {};

    for (const endpoint of this.endpoints) {
      if (!paths[endpoint.path]) {
        paths[endpoint.path] = {};
      }

      const method = endpoint.method.toLowerCase();
      const operation: Record<string, unknown> = {
        summary: endpoint.summary,
        description: endpoint.description,
        tags: endpoint.tags,
        operationId: this.generateOperationId(endpoint),
        parameters: endpoint.parameters.map((p) => ({
          name: p.name,
          in: p.in,
          required: p.required,
          description: p.description,
          schema: this.schemaToOpenAPI(p.schema),
        })),
        responses: this.buildResponses(endpoint.responses),
        "x-rate-limit": endpoint.rateLimit,
      };

      if (endpoint.auth) {
        operation.security = [{ BearerAuth: [] }, { ApiKeyAuth: [] }];
      }

      if (endpoint.requestBody) {
        operation.requestBody = {
          required: true,
          content: {
            "application/json": {
              schema: this.schemaToOpenAPI(endpoint.requestBody),
            },
          },
        };
      }

      paths[endpoint.path][method] = operation;
    }

    return {
      openapi: "3.1.0",
      info: {
        title: "Social Perks API",
        description:
          "Turn customers into your marketing team. The Social Perks API enables businesses to create campaigns, manage influencer relationships, track submissions, and distribute perks.",
        version: "1.0.0",
        contact: {
          name: "Social Perks Developer Support",
          url: "https://developers.socialperks.app",
          email: "api@socialperks.app",
        },
        license: {
          name: "Proprietary",
          url: "https://socialperks.app/terms",
        },
      },
      servers: [
        {
          url: "https://api.socialperks.app/v1",
          description: "Production",
        },
        {
          url: "https://sandbox.socialperks.app/v1",
          description: "Sandbox",
        },
        {
          url: "http://localhost:3000/api/v1",
          description: "Local Development",
        },
      ],
      paths,
      components: {
        securitySchemes: {
          BearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
          ApiKeyAuth: {
            type: "apiKey",
            in: "header",
            name: "X-API-Key",
          },
        },
        schemas: {},
      },
      tags: Array.from(this.tagSet.entries()).map(([name, description]) => ({
        name,
        description,
      })),
      security: [{ BearerAuth: [] }],
    };
  }

  private generateOperationId(endpoint: EndpointSpec): string {
    const method = endpoint.method.toLowerCase();
    const parts = endpoint.path
      .split("/")
      .filter((p) => p && !p.startsWith("{"))
      .map((p) => p.replace(/[^a-zA-Z0-9]/g, ""));
    return `${method}_${parts.join("_")}`;
  }

  private schemaToOpenAPI(schema: SchemaSpec): Record<string, unknown> {
    const result: Record<string, unknown> = { type: schema.type };
    if (schema.format) result.format = schema.format;
    if (schema.description) result.description = schema.description;
    if (schema.enum) result.enum = schema.enum;
    if (schema.example !== undefined) result.example = schema.example;
    if (schema.items) result.items = this.schemaToOpenAPI(schema.items);
    if (schema.properties) {
      result.properties = Object.fromEntries(
        Object.entries(schema.properties).map(([k, v]) => [
          k,
          this.schemaToOpenAPI(v),
        ]),
      );
    }
    if (schema.required) result.required = schema.required;
    return result;
  }

  private buildResponses(
    responses: Record<string, ResponseSpec>,
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [code, resp] of Object.entries(responses)) {
      const entry: Record<string, unknown> = { description: resp.description };
      if (resp.schema) {
        entry.content = {
          "application/json": {
            schema: this.schemaToOpenAPI(resp.schema),
          },
        };
      }
      result[code] = entry;
    }
    return result;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// API Versioning
// ═══════════════════════════════════════════════════════════════════════════════

export interface VersionedRoute {
  path: string;
  method: string;
  handler: string; // handler reference identifier
  addedIn: string; // version string e.g. "1.0.0"
  deprecatedIn?: string;
  removedIn?: string;
  changelog?: string;
}

export interface APIVersion {
  version: string;
  releaseDate: string;
  deprecationDate?: string;
  sunsetDate?: string;
  routes: VersionedRoute[];
}

export interface VersionChangeEntry {
  type: "added" | "modified" | "deprecated" | "removed";
  path: string;
  method: string;
  description: string;
}

export class APIVersionManager {
  private versions: Map<string, APIVersion> = new Map();

  registerVersion(version: string, config: Omit<APIVersion, "version">): void {
    this.versions.set(version, { version, ...config });
  }

  resolveVersion(request: {
    url: string;
    headers?: Record<string, string>;
  }): string {
    // Strategy 1: URL path version (e.g. /v1/campaigns, /v2/campaigns)
    const urlMatch = request.url.match(/\/v(\d+(?:\.\d+)*)\//);
    if (urlMatch) {
      const urlVersion = this.normalizeVersion(urlMatch[1]);
      if (this.versions.has(urlVersion)) {
        return urlVersion;
      }
    }

    // Strategy 2: Accept header (e.g. application/vnd.socialperks.v2+json)
    const accept = request.headers?.["accept"] ?? request.headers?.["Accept"];
    if (accept) {
      const headerMatch = accept.match(
        /application\/vnd\.socialperks\.v(\d+(?:\.\d+)*)\+json/,
      );
      if (headerMatch) {
        const headerVersion = this.normalizeVersion(headerMatch[1]);
        if (this.versions.has(headerVersion)) {
          return headerVersion;
        }
      }
    }

    // Strategy 3: X-API-Version header
    const explicitVersion = request.headers?.["x-api-version"];
    if (explicitVersion && this.versions.has(explicitVersion)) {
      return explicitVersion;
    }

    // Default to latest non-deprecated version
    return this.getLatestVersion();
  }

  getDeprecatedVersions(): APIVersion[] {
    const now = new Date().toISOString();
    return Array.from(this.versions.values()).filter(
      (v) => v.deprecationDate && v.deprecationDate <= now,
    );
  }

  getChangelog(
    fromVersion: string,
    toVersion: string,
  ): VersionChangeEntry[] {
    const from = this.versions.get(fromVersion);
    const to = this.versions.get(toVersion);
    if (!from || !to) {
      throw new Error(
        `Version ${!from ? fromVersion : toVersion} not found`,
      );
    }

    const changes: VersionChangeEntry[] = [];

    const fromRoutes = new Map(
      from.routes.map((r) => [`${r.method}:${r.path}`, r]),
    );
    const toRoutes = new Map(
      to.routes.map((r) => [`${r.method}:${r.path}`, r]),
    );

    // Added routes
    for (const [key, route] of Array.from(toRoutes.entries())) {
      if (!fromRoutes.has(key)) {
        changes.push({
          type: "added",
          path: route.path,
          method: route.method,
          description: route.changelog ?? `New endpoint: ${route.method} ${route.path}`,
        });
      }
    }

    // Removed routes
    for (const [key, route] of Array.from(fromRoutes.entries())) {
      if (!toRoutes.has(key)) {
        changes.push({
          type: "removed",
          path: route.path,
          method: route.method,
          description: route.changelog ?? `Removed endpoint: ${route.method} ${route.path}`,
        });
      }
    }

    // Modified / deprecated routes
    for (const [key, toRoute] of Array.from(toRoutes.entries())) {
      const fromRoute = fromRoutes.get(key);
      if (!fromRoute) continue;

      if (toRoute.deprecatedIn && !fromRoute.deprecatedIn) {
        changes.push({
          type: "deprecated",
          path: toRoute.path,
          method: toRoute.method,
          description: toRoute.changelog ?? `Deprecated: ${toRoute.method} ${toRoute.path}`,
        });
      } else if (toRoute.handler !== fromRoute.handler || toRoute.changelog) {
        changes.push({
          type: "modified",
          path: toRoute.path,
          method: toRoute.method,
          description: toRoute.changelog ?? `Modified endpoint: ${toRoute.method} ${toRoute.path}`,
        });
      }
    }

    return changes;
  }

  getVersion(version: string): APIVersion | undefined {
    return this.versions.get(version);
  }

  getAllVersions(): APIVersion[] {
    return Array.from(this.versions.values()).sort((a, b) =>
      b.version.localeCompare(a.version, undefined, { numeric: true }),
    );
  }

  private normalizeVersion(v: string): string {
    // Turn "1" into "1.0.0", "2.1" into "2.1.0", etc.
    const parts = v.split(".");
    while (parts.length < 3) parts.push("0");
    return parts.join(".");
  }

  private getLatestVersion(): string {
    const sorted = Array.from(this.versions.keys()).sort((a, b) =>
      b.localeCompare(a, undefined, { numeric: true }),
    );
    return sorted[0] ?? "1.0.0";
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Per-Key Rate Limiter
// ═══════════════════════════════════════════════════════════════════════════════

export type RateLimitPlan = "starter" | "professional" | "enterprise";

interface RateLimitBucket {
  requests: number[];
  plan: RateLimitPlan;
}

const PLAN_LIMITS: Record<RateLimitPlan, number> = {
  starter: 100,
  professional: 1000,
  enterprise: 10000,
};

const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
}

export class APIKeyRateLimiter {
  private buckets: Map<string, RateLimitBucket> = new Map();

  registerKey(apiKey: string, plan: RateLimitPlan): void {
    if (!this.buckets.has(apiKey)) {
      this.buckets.set(apiKey, { requests: [], plan });
    } else {
      this.buckets.get(apiKey)!.plan = plan;
    }
  }

  checkLimit(apiKey: string): RateLimitResult {
    const bucket = this.getOrCreateBucket(apiKey);
    this.pruneOldRequests(bucket);

    const limit = PLAN_LIMITS[bucket.plan];
    const remaining = Math.max(0, limit - bucket.requests.length);
    const resetAt = new Date(Date.now() + WINDOW_MS).toISOString();

    return {
      allowed: remaining > 0,
      remaining,
      limit,
      resetAt,
    };
  }

  recordRequest(apiKey: string): RateLimitResult {
    const bucket = this.getOrCreateBucket(apiKey);
    this.pruneOldRequests(bucket);

    const limit = PLAN_LIMITS[bucket.plan];
    const now = Date.now();

    if (bucket.requests.length >= limit) {
      return {
        allowed: false,
        remaining: 0,
        limit,
        resetAt: new Date(now + WINDOW_MS).toISOString(),
      };
    }

    bucket.requests.push(now);

    return {
      allowed: true,
      remaining: Math.max(0, limit - bucket.requests.length),
      limit,
      resetAt: new Date(now + WINDOW_MS).toISOString(),
    };
  }

  getUsage(apiKey: string): {
    plan: RateLimitPlan;
    used: number;
    limit: number;
    remaining: number;
    windowMs: number;
  } {
    const bucket = this.getOrCreateBucket(apiKey);
    this.pruneOldRequests(bucket);

    const limit = PLAN_LIMITS[bucket.plan];
    return {
      plan: bucket.plan,
      used: bucket.requests.length,
      limit,
      remaining: Math.max(0, limit - bucket.requests.length),
      windowMs: WINDOW_MS,
    };
  }

  private getOrCreateBucket(apiKey: string): RateLimitBucket {
    if (!this.buckets.has(apiKey)) {
      this.buckets.set(apiKey, { requests: [], plan: "starter" });
    }
    return this.buckets.get(apiKey)!;
  }

  private pruneOldRequests(bucket: RateLimitBucket): void {
    const cutoff = Date.now() - WINDOW_MS;
    bucket.requests = bucket.requests.filter((ts) => ts > cutoff);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Usage Metering
// ═══════════════════════════════════════════════════════════════════════════════

export interface APICallRecord {
  apiKey: string;
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: string; // ISO
}

export interface UsageReport {
  apiKey: string;
  periodStart: string;
  periodEnd: string;
  totalCalls: number;
  successCalls: number;
  errorCalls: number;
  avgLatencyMs: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  byEndpoint: Record<string, { calls: number; avgLatencyMs: number }>;
  byStatusCode: Record<string, number>;
  byMethod: Record<string, number>;
}

export interface BillingMetrics {
  apiKey: string;
  month: string; // YYYY-MM
  totalCalls: number;
  includedCalls: number;
  overageCalls: number;
  overageRate: number; // $ per call
  estimatedCost: number;
}

export class UsageMeter {
  private records: APICallRecord[] = [];

  recordAPICall(
    apiKey: string,
    endpoint: string,
    method: string,
    statusCode: number,
    latencyMs: number,
  ): void {
    this.records.push({
      apiKey,
      endpoint,
      method,
      statusCode,
      latencyMs,
      timestamp: new Date().toISOString(),
    });
  }

  getUsageReport(
    apiKey: string,
    periodStart: string,
    periodEnd: string,
  ): UsageReport {
    const filtered = this.records.filter(
      (r) =>
        r.apiKey === apiKey &&
        r.timestamp >= periodStart &&
        r.timestamp <= periodEnd,
    );

    const totalCalls = filtered.length;
    const successCalls = filtered.filter(
      (r) => r.statusCode >= 200 && r.statusCode < 400,
    ).length;
    const errorCalls = totalCalls - successCalls;

    const latencies = filtered.map((r) => r.latencyMs).sort((a, b) => a - b);
    const avgLatencyMs =
      totalCalls > 0
        ? latencies.reduce((sum, l) => sum + l, 0) / totalCalls
        : 0;
    const p95LatencyMs =
      totalCalls > 0 ? latencies[Math.floor(totalCalls * 0.95)] ?? 0 : 0;
    const p99LatencyMs =
      totalCalls > 0 ? latencies[Math.floor(totalCalls * 0.99)] ?? 0 : 0;

    const byEndpoint: Record<string, { calls: number; avgLatencyMs: number }> = {};
    for (const r of filtered) {
      if (!byEndpoint[r.endpoint]) {
        byEndpoint[r.endpoint] = { calls: 0, avgLatencyMs: 0 };
      }
      const ep = byEndpoint[r.endpoint];
      ep.avgLatencyMs = (ep.avgLatencyMs * ep.calls + r.latencyMs) / (ep.calls + 1);
      ep.calls++;
    }

    const byStatusCode: Record<string, number> = {};
    for (const r of filtered) {
      const key = String(r.statusCode);
      byStatusCode[key] = (byStatusCode[key] ?? 0) + 1;
    }

    const byMethod: Record<string, number> = {};
    for (const r of filtered) {
      byMethod[r.method] = (byMethod[r.method] ?? 0) + 1;
    }

    return {
      apiKey,
      periodStart,
      periodEnd,
      totalCalls,
      successCalls,
      errorCalls,
      avgLatencyMs: Math.round(avgLatencyMs * 100) / 100,
      p95LatencyMs,
      p99LatencyMs,
      byEndpoint,
      byStatusCode,
      byMethod,
    };
  }

  getTopEndpoints(
    apiKey: string,
    limit: number = 10,
  ): { endpoint: string; calls: number; avgLatencyMs: number }[] {
    const map = new Map<string, { calls: number; totalLatency: number }>();

    for (const r of this.records) {
      if (r.apiKey !== apiKey) continue;
      const existing = map.get(r.endpoint) ?? { calls: 0, totalLatency: 0 };
      existing.calls++;
      existing.totalLatency += r.latencyMs;
      map.set(r.endpoint, existing);
    }

    return Array.from(map.entries())
      .map(([endpoint, data]) => ({
        endpoint,
        calls: data.calls,
        avgLatencyMs:
          Math.round((data.totalLatency / data.calls) * 100) / 100,
      }))
      .sort((a, b) => b.calls - a.calls)
      .slice(0, limit);
  }

  getBillingMetrics(apiKey: string, month: string): BillingMetrics {
    const monthStart = `${month}-01T00:00:00.000Z`;
    // Compute last day of month
    const [year, mon] = month.split("-").map(Number);
    const lastDay = new Date(year, mon, 0).getDate();
    const monthEnd = `${month}-${String(lastDay).padStart(2, "0")}T23:59:59.999Z`;

    const filtered = this.records.filter(
      (r) =>
        r.apiKey === apiKey &&
        r.timestamp >= monthStart &&
        r.timestamp <= monthEnd,
    );

    const totalCalls = filtered.length;

    // Plan-based included calls per month
    const MONTHLY_INCLUDED: Record<string, number> = {
      starter: 10000,
      professional: 100000,
      enterprise: 1000000,
    };

    // Detect plan from existing rate limiter or default to starter
    const plan = "starter"; // In production, this would query the key's plan
    const includedCalls = MONTHLY_INCLUDED[plan] ?? 10000;
    const overageCalls = Math.max(0, totalCalls - includedCalls);
    const overageRate = 0.001; // $0.001 per overage call
    const estimatedCost =
      Math.round(overageCalls * overageRate * 100) / 100;

    return {
      apiKey,
      month,
      totalCalls,
      includedCalls,
      overageCalls,
      overageRate,
      estimatedCost,
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SDK Generator
// ═══════════════════════════════════════════════════════════════════════════════

export class SDKGenerator {
  generateTypeScript(spec: ReturnType<OpenAPIGenerator["generate"]>): string {
    const lines: string[] = [];

    lines.push("// Auto-generated Social Perks TypeScript SDK");
    lines.push(`// Generated from OpenAPI ${spec.openapi} spec`);
    lines.push(`// API Version: ${spec.info.version}`);
    lines.push("");
    lines.push("export interface SocialPerksConfig {");
    lines.push("  baseUrl: string;");
    lines.push("  apiKey: string;");
    lines.push("  timeout?: number;");
    lines.push("}");
    lines.push("");
    lines.push("export interface ApiResponse<T> {");
    lines.push("  data: T;");
    lines.push("  status: number;");
    lines.push("  headers: Record<string, string>;");
    lines.push("}");
    lines.push("");
    lines.push("export class SocialPerksClient {");
    lines.push("  private config: SocialPerksConfig;");
    lines.push("");
    lines.push("  constructor(config: SocialPerksConfig) {");
    lines.push("    this.config = config;");
    lines.push("  }");
    lines.push("");
    lines.push("  private async request<T>(");
    lines.push("    method: string,");
    lines.push("    path: string,");
    lines.push("    options?: { params?: Record<string, string>; body?: unknown },");
    lines.push("  ): Promise<ApiResponse<T>> {");
    lines.push("    const url = new URL(path, this.config.baseUrl);");
    lines.push("    if (options?.params) {");
    lines.push("      for (const [k, v] of Object.entries(options.params)) {");
    lines.push("        url.searchParams.set(k, v);");
    lines.push("      }");
    lines.push("    }");
    lines.push("    const resp = await fetch(url.toString(), {");
    lines.push("      method,");
    lines.push("      headers: {");
    lines.push('        "Content-Type": "application/json",');
    lines.push('        "X-API-Key": this.config.apiKey,');
    lines.push("      },");
    lines.push("      body: options?.body ? JSON.stringify(options.body) : undefined,");
    lines.push("      signal: this.config.timeout");
    lines.push("        ? AbortSignal.timeout(this.config.timeout)");
    lines.push("        : undefined,");
    lines.push("    });");
    lines.push("    const data = await resp.json() as T;");
    lines.push("    const headers: Record<string, string> = {};");
    lines.push("    resp.headers.forEach((v, k) => { headers[k] = v; });");
    lines.push("    return { data, status: resp.status, headers };");
    lines.push("  }");

    // Generate methods from each endpoint
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operationRaw] of Object.entries(
        methods as Record<string, Record<string, unknown>>,
      )) {
        const operation = operationRaw as Record<string, unknown>;
        const operationId = (operation.operationId as string) ?? "";
        const methodName = this.toCamelCase(operationId);
        const summary = (operation.summary as string) ?? "";
        const params = (operation.parameters as Array<Record<string, unknown>>) ?? [];

        lines.push("");
        lines.push(`  /** ${summary} */`);

        const hasBody = !!operation.requestBody;
        const queryParams = params.filter((p) => p.in === "query");
        const pathParams = params.filter((p) => p.in === "path");

        const args: string[] = [];
        for (const p of pathParams) {
          args.push(`${p.name}: string`);
        }
        if (queryParams.length > 0) {
          const paramFields = queryParams
            .map((p) => `${p.name}${p.required ? "" : "?"}: string`)
            .join("; ");
          args.push(`params: { ${paramFields} }`);
        }
        if (hasBody) {
          args.push("body: Record<string, unknown>");
        }

        lines.push(`  async ${methodName}(${args.join(", ")}): Promise<ApiResponse<unknown>> {`);

        // Build path with substitutions
        let resolvedPath = path;
        for (const p of pathParams) {
          resolvedPath = resolvedPath.replace(
            `{${p.name}}`,
            `\${${p.name}}`,
          );
        }

        const fetchOptions: string[] = [];
        if (queryParams.length > 0) {
          fetchOptions.push("params: params as unknown as Record<string, string>");
        }
        if (hasBody) {
          fetchOptions.push("body");
        }

        const optionsStr =
          fetchOptions.length > 0 ? `, { ${fetchOptions.join(", ")} }` : "";

        lines.push(
          `    return this.request("${method.toUpperCase()}", \`${resolvedPath}\`${optionsStr});`,
        );
        lines.push("  }");
      }
    }

    lines.push("}");
    lines.push("");

    return lines.join("\n");
  }

  generatePython(spec: ReturnType<OpenAPIGenerator["generate"]>): string {
    const lines: string[] = [];

    lines.push("# Auto-generated Social Perks Python SDK");
    lines.push(`# Generated from OpenAPI ${spec.openapi} spec`);
    lines.push(`# API Version: ${spec.info.version}`);
    lines.push("");
    lines.push("import requests");
    lines.push("from typing import Any, Dict, Optional");
    lines.push("from dataclasses import dataclass");
    lines.push("");
    lines.push("");
    lines.push("@dataclass");
    lines.push("class ApiResponse:");
    lines.push('    """API response wrapper."""');
    lines.push("    data: Any");
    lines.push("    status: int");
    lines.push("    headers: Dict[str, str]");
    lines.push("");
    lines.push("");
    lines.push("class SocialPerksClient:");
    lines.push('    """Social Perks API client."""');
    lines.push("");
    lines.push("    def __init__(self, base_url: str, api_key: str, timeout: int = 30):");
    lines.push("        self.base_url = base_url.rstrip('/')");
    lines.push("        self.api_key = api_key");
    lines.push("        self.timeout = timeout");
    lines.push("        self.session = requests.Session()");
    lines.push("        self.session.headers.update({");
    lines.push("            'Content-Type': 'application/json',");
    lines.push("            'X-API-Key': self.api_key,");
    lines.push("        })");
    lines.push("");
    lines.push("    def _request(");
    lines.push("        self,");
    lines.push("        method: str,");
    lines.push("        path: str,");
    lines.push("        params: Optional[Dict[str, str]] = None,");
    lines.push("        json_body: Optional[Dict[str, Any]] = None,");
    lines.push("    ) -> ApiResponse:");
    lines.push("        url = f'{self.base_url}{path}'");
    lines.push("        resp = self.session.request(");
    lines.push("            method=method,");
    lines.push("            url=url,");
    lines.push("            params=params,");
    lines.push("            json=json_body,");
    lines.push("            timeout=self.timeout,");
    lines.push("        )");
    lines.push("        return ApiResponse(");
    lines.push("            data=resp.json(),");
    lines.push("            status=resp.status_code,");
    lines.push("            headers=dict(resp.headers),");
    lines.push("        )");

    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operationRaw] of Object.entries(
        methods as Record<string, Record<string, unknown>>,
      )) {
        const operation = operationRaw as Record<string, unknown>;
        const operationId = (operation.operationId as string) ?? "";
        const fnName = this.toSnakeCase(operationId);
        const summary = (operation.summary as string) ?? "";
        const params = (operation.parameters as Array<Record<string, unknown>>) ?? [];

        const hasBody = !!operation.requestBody;
        const queryParams = params.filter((p) => p.in === "query");
        const pathParams = params.filter((p) => p.in === "path");

        lines.push("");
        lines.push(`    def ${fnName}(`);
        lines.push("        self,");
        for (const p of pathParams) {
          lines.push(`        ${p.name}: str,`);
        }
        for (const p of queryParams) {
          if (p.required) {
            lines.push(`        ${p.name}: str,`);
          } else {
            lines.push(`        ${p.name}: Optional[str] = None,`);
          }
        }
        if (hasBody) {
          lines.push("        body: Optional[Dict[str, Any]] = None,");
        }
        lines.push("    ) -> ApiResponse:");
        lines.push(`        """${summary}"""`);

        // Build path
        let pyPath = path;
        for (const p of pathParams) {
          pyPath = pyPath.replace(`{${p.name}}`, `{${p.name}}`);
        }
        if (pathParams.length > 0) {
          lines.push(`        path = f'${pyPath}'`);
        } else {
          lines.push(`        path = '${pyPath}'`);
        }

        if (queryParams.length > 0) {
          lines.push("        query_params = {}");
          for (const p of queryParams) {
            lines.push(`        if ${p.name} is not None:`);
            lines.push(`            query_params['${p.name}'] = ${p.name}`);
          }
        }

        const callArgs: string[] = [`'${method.toUpperCase()}'`, "path"];
        if (queryParams.length > 0) {
          callArgs.push("params=query_params");
        }
        if (hasBody) {
          callArgs.push("json_body=body");
        }

        lines.push(`        return self._request(${callArgs.join(", ")})`);
      }
    }

    lines.push("");

    return lines.join("\n");
  }

  generateCurl(endpoint: EndpointSpec): string {
    const lines: string[] = [];
    const baseUrl = "https://api.socialperks.app/v1";

    let url = `${baseUrl}${endpoint.path}`;

    // Replace path params with example values
    url = url.replace(/\{(\w+)\}/g, ":$1");

    // Add query params for GET
    const queryParams = endpoint.parameters.filter((p) => p.in === "query");
    if (queryParams.length > 0) {
      const paramParts = queryParams.map(
        (p) => `${p.name}=${p.schema.example ?? `<${p.name}>`}`,
      );
      url += `?${paramParts.join("&")}`;
    }

    lines.push(`curl -X ${endpoint.method} \\`);
    lines.push(`  '${url}' \\`);
    lines.push(`  -H 'Content-Type: application/json' \\`);

    if (endpoint.auth) {
      lines.push(`  -H 'X-API-Key: YOUR_API_KEY' \\`);
    }

    if (endpoint.requestBody) {
      const example = this.generateExampleBody(endpoint.requestBody);
      lines.push(`  -d '${JSON.stringify(example, null, 2)}'`);
    } else {
      // Remove trailing backslash from last line
      const lastIdx = lines.length - 1;
      lines[lastIdx] = lines[lastIdx].replace(/ \\$/, "");
    }

    return lines.join("\n");
  }

  private toCamelCase(str: string): string {
    return str
      .split(/[_\-\s]+/)
      .map((word, i) =>
        i === 0
          ? word.toLowerCase()
          : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
      )
      .join("");
  }

  private toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, "_$1")
      .toLowerCase()
      .replace(/^_/, "")
      .replace(/[_]+/g, "_");
  }

  private generateExampleBody(schema: SchemaSpec): unknown {
    switch (schema.type) {
      case "string":
        return schema.example ?? schema.enum?.[0] ?? "string";
      case "number":
      case "integer":
        return schema.example ?? 0;
      case "boolean":
        return schema.example ?? true;
      case "array":
        return schema.items ? [this.generateExampleBody(schema.items)] : [];
      case "object": {
        const obj: Record<string, unknown> = {};
        if (schema.properties) {
          for (const [key, propSchema] of Object.entries(schema.properties)) {
            obj[key] = this.generateExampleBody(propSchema);
          }
        }
        return schema.example ?? obj;
      }
      default:
        return null;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-configured Endpoints
// ═══════════════════════════════════════════════════════════════════════════════

export function createSocialPerksOpenAPISpec(): OpenAPIGenerator {
  const gen = new OpenAPIGenerator();

  // ── Campaigns ───────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/campaigns",
    method: "GET",
    summary: "List campaigns",
    description:
      "Retrieve a paginated list of campaigns. Filter by business, tier, status, and more.",
    tags: ["Campaigns"],
    auth: true,
    parameters: [
      {
        name: "businessId",
        in: "query",
        required: false,
        description: "Filter by business ID",
        schema: { type: "string", example: "b1" },
      },
      {
        name: "tier",
        in: "query",
        required: false,
        description: "Filter by campaign tier",
        schema: {
          type: "string",
          enum: ["essential", "high_impact", "growth", "premium", "starter"],
        },
      },
      {
        name: "status",
        in: "query",
        required: false,
        description: "Filter by campaign status",
        schema: { type: "string", enum: ["active", "paused", "ended"] },
      },
      {
        name: "page",
        in: "query",
        required: false,
        description: "Page number",
        schema: { type: "integer", example: 1 },
      },
      {
        name: "perPage",
        in: "query",
        required: false,
        description: "Results per page",
        schema: { type: "integer", example: 20 },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of campaigns",
        schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { type: "object", description: "Campaign object" },
            },
            total: { type: "integer" },
            page: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  gen.addEndpoint({
    path: "/campaigns",
    method: "POST",
    summary: "Create a campaign",
    description:
      "Create and launch a new campaign for a business. Requires business authentication.",
    tags: ["Campaigns"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["businessId", "name", "actions", "discountValue", "discountType"],
      properties: {
        businessId: { type: "string", description: "Business ID" },
        name: { type: "string", description: "Campaign name" },
        description: { type: "string", description: "Campaign description" },
        actions: {
          type: "array",
          items: { type: "string" },
          description: "Action IDs",
        },
        discountValue: { type: "number", description: "Discount amount" },
        discountType: {
          type: "string",
          enum: ["pct", "dol"],
          description: "Discount type",
        },
        guidelines: { type: "string", description: "Campaign guidelines" },
        maxCompletions: { type: "integer", description: "Max completions" },
        expiresInDays: { type: "integer", description: "Days until expiry" },
        useTiers: { type: "boolean", description: "Use follower tiers" },
      },
    },
    responses: {
      "201": {
        description: "Campaign created",
        schema: { type: "object", description: "Created campaign" },
      },
      "400": { description: "Invalid request body" },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 50, window: "1m" },
  });

  // ── Influencers ─────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/influencers",
    method: "GET",
    summary: "Search influencers",
    description:
      "Search and filter influencers by niche, follower count, tier, and location.",
    tags: ["Influencers"],
    auth: true,
    parameters: [
      {
        name: "niche",
        in: "query",
        required: false,
        description: "Filter by niche",
        schema: { type: "string", example: "food" },
      },
      {
        name: "minFollowers",
        in: "query",
        required: false,
        description: "Minimum follower count",
        schema: { type: "integer", example: 5000 },
      },
      {
        name: "tier",
        in: "query",
        required: false,
        description: "Influencer tier",
        schema: { type: "string", enum: ["micro", "mid", "macro", "mega"] },
      },
      {
        name: "location",
        in: "query",
        required: false,
        description: "Location filter",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of matching influencers",
        schema: {
          type: "object",
          properties: {
            data: {
              type: "array",
              items: { type: "object", description: "Influencer profile" },
            },
            total: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  gen.addEndpoint({
    path: "/influencers",
    method: "POST",
    summary: "Register influencer",
    description: "Register a new influencer profile on the platform.",
    tags: ["Influencers"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["displayName", "email", "niches"],
      properties: {
        displayName: { type: "string", description: "Display name" },
        email: { type: "string", format: "email", description: "Email address" },
        bio: { type: "string", description: "Bio" },
        niches: {
          type: "array",
          items: { type: "string" },
          description: "Content niches",
        },
        location: { type: "string", description: "Location" },
      },
    },
    responses: {
      "201": {
        description: "Influencer registered",
        schema: { type: "object", description: "Influencer profile" },
      },
      "400": { description: "Invalid request body" },
    },
    rateLimit: { requests: 20, window: "1m" },
  });

  // ── Submissions ─────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/submissions",
    method: "GET",
    summary: "List submissions",
    description:
      "Retrieve campaign submissions with optional filtering by campaign, status, or influencer.",
    tags: ["Submissions"],
    auth: true,
    parameters: [
      {
        name: "campaignId",
        in: "query",
        required: false,
        description: "Filter by campaign ID",
        schema: { type: "string" },
      },
      {
        name: "status",
        in: "query",
        required: false,
        description: "Submission status",
        schema: {
          type: "string",
          enum: ["pending", "approved", "rejected", "expired"],
        },
      },
      {
        name: "influencerId",
        in: "query",
        required: false,
        description: "Filter by influencer ID",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of submissions",
        schema: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" } },
            total: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  gen.addEndpoint({
    path: "/submissions",
    method: "POST",
    summary: "Create submission",
    description:
      "Submit proof of completing a campaign action. Attach screenshots, URLs, or video links.",
    tags: ["Submissions"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["campaignId", "actionId", "proofType", "proofUrl"],
      properties: {
        campaignId: { type: "string", description: "Campaign ID" },
        actionId: { type: "string", description: "Action ID" },
        influencerId: { type: "string", description: "Influencer ID" },
        proofType: {
          type: "string",
          enum: ["screenshot", "url", "video", "api_verified"],
        },
        proofUrl: { type: "string", format: "uri", description: "Proof URL" },
        notes: { type: "string", description: "Additional notes" },
      },
    },
    responses: {
      "201": {
        description: "Submission created",
        schema: { type: "object", description: "Submission object" },
      },
      "400": { description: "Invalid submission" },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 30, window: "1m" },
  });

  gen.addEndpoint({
    path: "/submissions/review",
    method: "POST",
    summary: "Review a submission",
    description: "Approve or reject a campaign submission.",
    tags: ["Submissions"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["submissionId", "decision"],
      properties: {
        submissionId: { type: "string", description: "Submission ID" },
        decision: {
          type: "string",
          enum: ["approved", "rejected"],
          description: "Review decision",
        },
        reason: { type: "string", description: "Reason for decision" },
      },
    },
    responses: {
      "200": {
        description: "Submission reviewed",
        schema: { type: "object" },
      },
      "400": { description: "Invalid review" },
      "401": { description: "Unauthorized" },
      "404": { description: "Submission not found" },
    },
    rateLimit: { requests: 50, window: "1m" },
  });

  // ── Pricing ─────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/pricing",
    method: "GET",
    summary: "Get pricing",
    description:
      "Query the pricing oracle for recommended perk values by action and business type.",
    tags: ["Pricing"],
    auth: false,
    parameters: [
      {
        name: "actionId",
        in: "query",
        required: true,
        description: "Action ID to price",
        schema: { type: "string", example: "ig_rl" },
      },
      {
        name: "businessType",
        in: "query",
        required: false,
        description: "Business type for context",
        schema: { type: "string", example: "Restaurant" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Pricing recommendation",
        schema: {
          type: "object",
          properties: {
            actionId: { type: "string" },
            baseValue: { type: "number" },
            recommendedPerk: { type: "number" },
            confidence: { type: "number" },
          },
        },
      },
    },
    rateLimit: { requests: 200, window: "1m" },
  });

  // ── Actions ─────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/actions",
    method: "GET",
    summary: "List marketing actions",
    description:
      "Get the full action library, optionally filtered by platform and type.",
    tags: ["Actions"],
    auth: false,
    parameters: [
      {
        name: "platformId",
        in: "query",
        required: false,
        description: "Filter by platform ID",
        schema: { type: "string", example: "ig" },
      },
      {
        name: "type",
        in: "query",
        required: false,
        description: "Filter by action type",
        schema: {
          type: "string",
          enum: ["content", "review", "engage", "share", "referral"],
        },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of actions",
        schema: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" } },
          },
        },
      },
    },
    rateLimit: { requests: 200, window: "1m" },
  });

  // ── Benchmarks ──────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/benchmarks",
    method: "GET",
    summary: "Get industry benchmarks",
    description:
      "Retrieve industry-specific benchmarks for campaign performance.",
    tags: ["Benchmarks"],
    auth: false,
    parameters: [
      {
        name: "businessType",
        in: "query",
        required: true,
        description: "Business type",
        schema: { type: "string", example: "Coffee Shop" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Benchmark data",
        schema: {
          type: "object",
          properties: {
            businessType: { type: "string" },
            avgCampaigns: { type: "number" },
            avgPerkValue: { type: "number" },
            topActions: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  // ── Auth ────────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/auth",
    method: "POST",
    summary: "Authenticate",
    description: "Authenticate with email and PIN. Returns a session token.",
    tags: ["Auth"],
    auth: false,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["email", "pin"],
      properties: {
        email: { type: "string", format: "email", description: "Email address" },
        pin: { type: "string", description: "PIN code" },
      },
    },
    responses: {
      "200": {
        description: "Authentication successful",
        schema: {
          type: "object",
          properties: {
            token: { type: "string" },
            user: { type: "object" },
            expiresAt: { type: "string", format: "date-time" },
          },
        },
      },
      "401": { description: "Invalid credentials" },
    },
    rateLimit: { requests: 10, window: "1m" },
  });

  // ── AI Generate ─────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/ai/generate",
    method: "POST",
    summary: "Generate campaign suggestions",
    description:
      "Use the AI engine to generate campaign suggestions for a business based on type, goals, and platform preferences.",
    tags: ["AI"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["businessType"],
      properties: {
        businessType: { type: "string", description: "Business type" },
        goals: {
          type: "array",
          items: { type: "string" },
          description: "Marketing goals",
        },
        platforms: {
          type: "array",
          items: { type: "string" },
          description: "Preferred platform IDs",
        },
        budget: { type: "number", description: "Monthly budget" },
      },
    },
    responses: {
      "200": {
        description: "Generated campaign suggestions",
        schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: { type: "object", description: "Campaign suggestion" },
            },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 20, window: "1m" },
  });

  // ── AI Recommend ────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/ai/recommend",
    method: "POST",
    summary: "Get AI recommendations",
    description:
      "Get optimization recommendations for existing campaigns based on performance data.",
    tags: ["AI"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      required: ["campaignId"],
      properties: {
        campaignId: { type: "string", description: "Campaign to optimize" },
        metrics: { type: "object", description: "Current performance metrics" },
      },
    },
    responses: {
      "200": {
        description: "Optimization recommendations",
        schema: {
          type: "object",
          properties: {
            recommendations: { type: "array", items: { type: "object" } },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 20, window: "1m" },
  });

  // ── Billing ─────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/billing",
    method: "GET",
    summary: "Get billing info",
    description: "Retrieve current billing information and subscription status.",
    tags: ["Billing"],
    auth: true,
    parameters: [
      {
        name: "businessId",
        in: "query",
        required: true,
        description: "Business ID",
        schema: { type: "string" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Billing information",
        schema: {
          type: "object",
          properties: {
            plan: { type: "string" },
            status: { type: "string" },
            currentPeriodEnd: { type: "string", format: "date-time" },
            usage: { type: "object" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 50, window: "1m" },
  });

  gen.addEndpoint({
    path: "/billing",
    method: "POST",
    summary: "Update billing",
    description: "Update subscription plan or payment method.",
    tags: ["Billing"],
    auth: true,
    parameters: [],
    requestBody: {
      type: "object",
      properties: {
        businessId: { type: "string", description: "Business ID" },
        plan: {
          type: "string",
          enum: ["free", "starter", "pro", "enterprise"],
          description: "New plan",
        },
        paymentMethodId: { type: "string", description: "Payment method ID" },
      },
    },
    responses: {
      "200": {
        description: "Billing updated",
        schema: { type: "object" },
      },
      "400": { description: "Invalid request" },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 10, window: "1m" },
  });

  // ── Billing Webhook ─────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/billing/webhook",
    method: "POST",
    summary: "Billing webhook",
    description: "Receive billing events from the payment provider.",
    tags: ["Billing"],
    auth: false,
    parameters: [],
    requestBody: {
      type: "object",
      properties: {
        event: { type: "string", description: "Event type" },
        data: { type: "object", description: "Event payload" },
      },
    },
    responses: {
      "200": { description: "Webhook processed" },
      "400": { description: "Invalid payload" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  // ── Events ──────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/events",
    method: "GET",
    summary: "List events",
    description: "Retrieve platform events for analytics and audit trails.",
    tags: ["Events"],
    auth: true,
    parameters: [
      {
        name: "entityType",
        in: "query",
        required: false,
        description: "Filter by entity type",
        schema: { type: "string" },
      },
      {
        name: "entityId",
        in: "query",
        required: false,
        description: "Filter by entity ID",
        schema: { type: "string" },
      },
      {
        name: "since",
        in: "query",
        required: false,
        description: "Events after this ISO timestamp",
        schema: { type: "string", format: "date-time" },
      },
    ],
    requestBody: undefined,
    responses: {
      "200": {
        description: "List of events",
        schema: {
          type: "object",
          properties: {
            data: { type: "array", items: { type: "object" } },
            total: { type: "integer" },
          },
        },
      },
      "401": { description: "Unauthorized" },
    },
    rateLimit: { requests: 100, window: "1m" },
  });

  // ── Health ──────────────────────────────────────────────────────────────

  gen.addEndpoint({
    path: "/health",
    method: "GET",
    summary: "Health check",
    description: "Check API health and uptime status.",
    tags: ["System"],
    auth: false,
    parameters: [],
    requestBody: undefined,
    responses: {
      "200": {
        description: "Service healthy",
        schema: {
          type: "object",
          properties: {
            status: { type: "string", example: "ok" },
            version: { type: "string" },
            uptime: { type: "number" },
          },
        },
      },
    },
    rateLimit: { requests: 300, window: "1m" },
  });

  return gen;
}

// ═══════════════════════════════════════════════════════════════════════════════
// Pre-configured Versions
// ═══════════════════════════════════════════════════════════════════════════════

export function createVersionManager(): APIVersionManager {
  const mgr = new APIVersionManager();

  mgr.registerVersion("1.0.0", {
    releaseDate: "2025-01-01",
    routes: [
      { path: "/campaigns", method: "GET", handler: "campaigns.list", addedIn: "1.0.0" },
      { path: "/campaigns", method: "POST", handler: "campaigns.create", addedIn: "1.0.0" },
      { path: "/influencers", method: "GET", handler: "influencers.search", addedIn: "1.0.0" },
      { path: "/influencers", method: "POST", handler: "influencers.register", addedIn: "1.0.0" },
      { path: "/submissions", method: "GET", handler: "submissions.list", addedIn: "1.0.0" },
      { path: "/submissions", method: "POST", handler: "submissions.create", addedIn: "1.0.0" },
      { path: "/pricing", method: "GET", handler: "pricing.query", addedIn: "1.0.0" },
      { path: "/actions", method: "GET", handler: "actions.list", addedIn: "1.0.0" },
      { path: "/benchmarks", method: "GET", handler: "benchmarks.query", addedIn: "1.0.0" },
      { path: "/auth", method: "POST", handler: "auth.login", addedIn: "1.0.0" },
      { path: "/ai/generate", method: "POST", handler: "ai.generate", addedIn: "1.0.0" },
      { path: "/ai/recommend", method: "POST", handler: "ai.recommend", addedIn: "1.0.0" },
      { path: "/billing", method: "GET", handler: "billing.get", addedIn: "1.0.0" },
      { path: "/billing", method: "POST", handler: "billing.update", addedIn: "1.0.0" },
      { path: "/events", method: "GET", handler: "events.list", addedIn: "1.0.0" },
      { path: "/health", method: "GET", handler: "health.check", addedIn: "1.0.0" },
    ],
  });

  mgr.registerVersion("2.0.0", {
    releaseDate: "2025-07-01",
    routes: [
      { path: "/campaigns", method: "GET", handler: "campaigns.list.v2", addedIn: "1.0.0", changelog: "Added cursor-based pagination" },
      { path: "/campaigns", method: "POST", handler: "campaigns.create.v2", addedIn: "1.0.0", changelog: "Added multi-platform campaign support" },
      { path: "/campaigns/{id}", method: "GET", handler: "campaigns.get", addedIn: "2.0.0", changelog: "New: Get single campaign by ID" },
      { path: "/campaigns/{id}", method: "PUT", handler: "campaigns.update", addedIn: "2.0.0", changelog: "New: Update campaign" },
      { path: "/campaigns/{id}", method: "DELETE", handler: "campaigns.delete", addedIn: "2.0.0", changelog: "New: Delete campaign" },
      { path: "/influencers", method: "GET", handler: "influencers.search.v2", addedIn: "1.0.0", changelog: "Added geo-search support" },
      { path: "/influencers", method: "POST", handler: "influencers.register", addedIn: "1.0.0" },
      { path: "/influencers/{id}", method: "GET", handler: "influencers.get", addedIn: "2.0.0", changelog: "New: Get influencer by ID" },
      { path: "/submissions", method: "GET", handler: "submissions.list", addedIn: "1.0.0" },
      { path: "/submissions", method: "POST", handler: "submissions.create", addedIn: "1.0.0" },
      { path: "/submissions/review", method: "POST", handler: "submissions.review", addedIn: "2.0.0", changelog: "New: Review submissions endpoint" },
      { path: "/pricing", method: "GET", handler: "pricing.query", addedIn: "1.0.0" },
      { path: "/actions", method: "GET", handler: "actions.list", addedIn: "1.0.0" },
      { path: "/benchmarks", method: "GET", handler: "benchmarks.query", addedIn: "1.0.0" },
      { path: "/auth", method: "POST", handler: "auth.login.v2", addedIn: "1.0.0", changelog: "Added OAuth2 support" },
      { path: "/ai/generate", method: "POST", handler: "ai.generate", addedIn: "1.0.0" },
      { path: "/ai/recommend", method: "POST", handler: "ai.recommend", addedIn: "1.0.0" },
      { path: "/ai/review", method: "POST", handler: "ai.review", addedIn: "2.0.0", changelog: "New: AI submission review" },
      { path: "/billing", method: "GET", handler: "billing.get", addedIn: "1.0.0" },
      { path: "/billing", method: "POST", handler: "billing.update", addedIn: "1.0.0" },
      { path: "/billing/webhook", method: "POST", handler: "billing.webhook", addedIn: "2.0.0", changelog: "New: Billing webhook handler" },
      { path: "/events", method: "GET", handler: "events.list", addedIn: "1.0.0" },
      { path: "/health", method: "GET", handler: "health.check", addedIn: "1.0.0" },
      { path: "/exchange/market", method: "GET", handler: "exchange.market", addedIn: "2.0.0", changelog: "New: Perk exchange market" },
      { path: "/exchange/trades", method: "POST", handler: "exchange.trades", addedIn: "2.0.0", changelog: "New: Execute perk trades" },
    ],
  });

  return mgr;
}
