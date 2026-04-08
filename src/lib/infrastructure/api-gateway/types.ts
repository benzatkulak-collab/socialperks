// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — API Gateway Types
// Shared type definitions for the API gateway, OpenAPI spec generation,
// versioning, rate limiting, usage metering, and SDK generation.
// ══════════════════════════════════════════════════════════════════════════════

// ─── Schema & Parameter Types ──────────────────────────────────────────────

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

// ─── OpenAPI Spec Types ────────────────────────────────────────────────────

export interface OpenAPISpec {
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

// ─── Versioning Types ──────────────────────────────────────────────────────

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

// ─── Rate Limiting Types ───────────────────────────────────────────────────

export type RateLimitPlan = "starter" | "professional" | "enterprise";

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  limit: number;
  resetAt: string; // ISO timestamp
}

// ─── Usage Metering Types ──────────────────────────────────────────────────

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
