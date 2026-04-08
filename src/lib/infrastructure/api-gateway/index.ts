// ══════════════════════════════════════════════════════════════════════════════
// Social Perks — API Gateway & Developer Platform
// Barrel export for all API gateway sub-modules: OpenAPI spec generation,
// versioning, rate limiting, usage metering, and SDK generation.
// ══════════════════════════════════════════════════════════════════════════════

export type {
  ParameterSpec,
  SchemaSpec,
  ResponseSpec,
  EndpointSpec,
  OpenAPISpec,
  VersionedRoute,
  APIVersion,
  VersionChangeEntry,
  RateLimitPlan,
  RateLimitResult,
  APICallRecord,
  UsageReport,
  BillingMetrics,
} from "./types";

export { OpenAPIGenerator } from "./openapi-generator";
export { APIVersionManager } from "./version-manager";
export { APIKeyRateLimiter } from "./rate-limiter";
export { UsageMeter } from "./usage-meter";
export { SDKGenerator } from "./sdk-generator";
export { createSocialPerksOpenAPISpec } from "./endpoint-registry";
export { createVersionManager } from "./version-registry";
